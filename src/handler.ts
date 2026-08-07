// Dispatches an MCP tool call to the Tickerbot REST API.
//
// Same handler is used by both transports:
//   - the stdio binary (src/index.ts) for local desktop/IDE clients
//   - the HTTP endpoint on main_service for remote chat clients
//
// One source of truth for path substitution, query/body assembly, auth.

import { findTool as bakedFindTool, type ToolDef } from './tools.js'

const DEFAULT_BASE_URL = 'https://api.tickerbot.io'

export interface RunToolOptions {
  /** Base URL for the API. Defaults to https://api.tickerbot.io. */
  baseUrl?: string
  /** Optional user-agent appended to identify the MCP server. */
  userAgent?: string
  /** Override the tool lookup. Used when index.ts has fetched the live
   *  catalog from /mcp/tools — we dispatch against the server's
   *  current tool definitions, not the baked snapshot. */
  findTool?: (name: string) => ToolDef | undefined
}

export class ToolError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly body?: unknown,
  ) {
    super(message)
    this.name = 'ToolError'
  }
}

export async function runTool(
  name: string,
  args: Record<string, unknown>,
  apiKey: string,
  options: RunToolOptions = {},
): Promise<unknown> {
  if (!apiKey) {
    throw new ToolError(
      'Missing TICKERBOT_API_KEY. Get a key from https://tickerbot.io/dashboard and set it in your MCP client config.',
    )
  }

  const lookup = options.findTool ?? bakedFindTool
  const tool = lookup(name)
  if (!tool) {
    throw new ToolError(`Unknown tool: ${name}`)
  }

  const { url, body } = buildRequest(tool, args, options.baseUrl ?? DEFAULT_BASE_URL)

  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    Accept: 'application/json',
    'User-Agent': options.userAgent ?? '@tickerbot/mcp-server',
  }
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }

  const res = await fetch(url, {
    method: tool.endpoint.method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  const text = await res.text()
  let parsed: unknown = text
  try {
    parsed = text ? JSON.parse(text) : null
  } catch {
    // non-JSON response — fall through with text body
  }

  // Surface advisory headers instead of discarding them (TB-188): the agent
  // should learn when a route is deprecated/sunsetting, when it is being
  // throttled, or when the Free monthly quota is nearly gone. Mirrors
  // main_service/mcp/handler.js — keep the two in step.
  const advisories = collectAdvisories(res.headers)

  if (!res.ok) {
    const err = new ToolError(
      `Tickerbot ${tool.endpoint.method} ${tool.endpoint.path} failed: ${res.status} ${res.statusText}`,
      res.status,
      parsed,
    )
    if (advisories) (err as ToolError & { advisories?: unknown }).advisories = advisories
    throw err
  }
  if (advisories && parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    ;(parsed as Record<string, unknown>)._advisories = advisories
  }

  return parsed
}

// The advisory subset of the response-header contract. Deliberately
// selective: always-on X-RateLimit-*/X-Quota-* counters would add noise to
// every call, so rate/quota numbers ride along only when the server is
// actually warning (throttled, near-limit, or low quota).
function collectAdvisories(headers: Headers): Record<string, unknown> | null {
  const out: Record<string, unknown> = {}
  const dep = headers.get('deprecation')
  const sunset = headers.get('sunset')
  if (dep || sunset) {
    const link = headers.get('link') ?? ''
    const succ = link.match(/<([^>]+)>\s*;\s*rel="successor-version"/)
    out.deprecated = {
      ...(dep ? { since: dep } : {}),
      ...(sunset ? { sunset_on: sunset, warning: `This route stops serving on ${sunset}.` } : {}),
      ...(succ ? { successor: succ[1] } : {}),
    }
  }
  const retryAfter = headers.get('retry-after')
  const rlWarning = headers.get('x-ratelimit-warning')
  if (retryAfter || rlWarning) {
    const remaining = headers.get('x-ratelimit-remaining')
    out.rate_limit = {
      ...(rlWarning ? { warning: rlWarning } : {}),
      ...(retryAfter ? { retry_after_seconds: Number(retryAfter) || retryAfter } : {}),
      ...(headers.get('x-ratelimit-limit') ? { limit: Number(headers.get('x-ratelimit-limit')) } : {}),
      ...(remaining != null && remaining !== '' ? { remaining: Number(remaining) } : {}),
      ...(headers.get('x-ratelimit-reset') ? { reset_epoch_s: Number(headers.get('x-ratelimit-reset')) } : {}),
    }
  }
  const quotaLimit = Number(headers.get('x-quota-limit'))
  const quotaRemaining = Number(headers.get('x-quota-remaining'))
  if (headers.get('x-quota-limit') && Number.isFinite(quotaLimit) && Number.isFinite(quotaRemaining)
      && quotaLimit > 0 && quotaRemaining <= quotaLimit * 0.1) {
    out.monthly_quota = {
      warning: `Free-plan monthly quota nearly exhausted: ${quotaRemaining} of ${quotaLimit} calls left this month.`,
      limit: quotaLimit,
      remaining: quotaRemaining,
      ...(headers.get('x-quota-reset') ? { reset_epoch_s: Number(headers.get('x-quota-reset')) } : {}),
    }
  }
  return Object.keys(out).length ? out : null
}

function buildRequest(
  tool: ToolDef,
  args: Record<string, unknown>,
  baseUrl: string,
): { url: string; body: Record<string, unknown> | undefined } {
  let path = tool.endpoint.path
  const query = new URLSearchParams()
  const body: Record<string, unknown> = {}
  let bodyHasContent = false

  for (const [key, value] of Object.entries(args)) {
    if (value === undefined || value === null || value === '') continue
    const where = tool.endpoint.paramLocation[key]
    if (!where) continue // unknown param, ignore

    if (where === 'path') {
      const token = `{${key}}`
      if (!path.includes(token)) {
        throw new ToolError(
          `Tool ${tool.name} declares path param "${key}" but path template "${tool.endpoint.path}" has no {${key}} placeholder.`,
        )
      }
      path = path.replace(token, encodeURIComponent(String(value)))
    } else if (where === 'query') {
      query.append(key, String(value))
    } else if (where === 'body') {
      body[key] = value
      bodyHasContent = true
    }
  }

  // Verify no path placeholders left unfilled
  const unfilled = path.match(/\{([a-zA-Z_]+)\}/)
  if (unfilled) {
    throw new ToolError(
      `Tool ${tool.name} missing required path param "${unfilled[1]}".`,
    )
  }

  const qs = query.toString()
  const url = `${baseUrl}${path}${qs ? `?${qs}` : ''}`
  return { url, body: bodyHasContent ? body : undefined }
}
