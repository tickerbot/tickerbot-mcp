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

  if (!res.ok) {
    throw new ToolError(
      `Tickerbot ${tool.endpoint.method} ${tool.endpoint.path} failed: ${res.status} ${res.statusText}`,
      res.status,
      parsed,
    )
  }

  return parsed
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
