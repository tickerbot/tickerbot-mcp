// Stdio MCP server entrypoint: a thin bridge to the hosted Tickerbot MCP
// server (TB-740).
//
// Launched by the user's MCP client (Claude Desktop, Claude Code, Cursor,
// VS Code Copilot, etc.) as a subprocess that talks JSON-RPC over
// stdin/stdout. The key comes from TICKERBOT_API_KEY.
//
// On start it connects to {baseUrl}/mcp (https://api.tickerbot.io/mcp) with
// the key, and the tool list it serves is the hosted server's tools/list,
// verbatim. Every tools/call is forwarded there and its result returned
// unchanged. So a tool added or changed on main_service reaches npm users on
// their client's next launch, with no npm publish.
//
// Fallback: if the hosted server cannot be reached at start, the bridge
// serves the bundled snapshot (src/tools.ts) and runs calls itself against
// the REST API (src/handler.ts), and says so on stderr. While in fallback it
// retries the hosted server on tools/list, at most once a minute, and
// switches over when it answers.
//
// With no key the bridge does not contact the server (it would answer 401):
// it serves the snapshot, and every call answers the missing-key message.

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js'

import { tools as bakedTools } from './tools.js'
import { runTool, ToolError } from './handler.js'
import { HostedClient, HostedRpcError, type HostedTool } from './hosted.js'

import { createRequire } from 'node:module'
// package.json is the one place the version lives; the hardcoded '0.1.0'
// this replaced was reported to every client through 0.2.1. The mcpb bundle
// is CJS with no import.meta.url and no package.json beside it, so
// scripts/build-mcpb.sh inlines the two fields as TICKERBOT_MCP_PACKAGE.
const { name: SERVER_NAME, version: SERVER_VERSION } = (
  process.env.TICKERBOT_MCP_PACKAGE
    ? JSON.parse(process.env.TICKERBOT_MCP_PACKAGE)
    : createRequire(import.meta.url)('../package.json')
) as { name: string; version: string }
const DEFAULT_BASE_URL = 'https://api.tickerbot.io'
const CONNECT_TIMEOUT_MS = Number(process.env.TICKERBOT_MCP_CONNECT_TIMEOUT_MS) || 5000
const CALL_TIMEOUT_MS = 120_000
const RETRY_INTERVAL_MS = 60_000
const USER_AGENT = `${SERVER_NAME}/${SERVER_VERSION}`

function log(line: string) {
  process.stderr.write(`[tickerbot-mcp] ${line}\n`)
}

function snapshotTools(): HostedTool[] {
  return bakedTools.map((t) => ({
    name: t.name,
    description: t.description,
    inputSchema: t.inputSchema as HostedTool['inputSchema'],
  }))
}

async function main() {
  const apiKey = process.env.TICKERBOT_API_KEY
  if (!apiKey) {
    log(`TICKERBOT_API_KEY is not set. Get a key from https://tickerbot.io/dashboard and add it to your MCP client config (env block).`)
  }
  const baseUrl = (process.env.TICKERBOT_API_URL || DEFAULT_BASE_URL).replace(/\/+$/, '')
  const hostedUrl = `${baseUrl}/mcp`

  const hosted = apiKey
    ? new HostedClient({ url: hostedUrl, apiKey, userAgent: USER_AGENT, clientVersion: SERVER_VERSION })
    : null

  // 'hosted': tools and calls go to {baseUrl}/mcp. 'snapshot': the bundled
  // fallback, calls run here against the REST API.
  let mode = 'snapshot' as 'hosted' | 'snapshot'
  let activeTools: HostedTool[] = snapshotTools()
  let lastAttempt = 0

  async function tryHosted(): Promise<boolean> {
    if (!hosted) return false
    lastAttempt = Date.now()
    try {
      activeTools = await hosted.connect(CONNECT_TIMEOUT_MS)
      mode = 'hosted'
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      log(`WARNING: hosted MCP server unreachable (${message}). Serving the bundled snapshot of ${bakedTools.length} tools, which may be out of date; retrying at most once a minute.`)
      return false
    }
  }

  // Connect before announcing tools. The client's initialize + tools/list
  // arrive after server.connect(), so they always see the result.
  await tryHosted()

  const server = new Server(
    { name: SERVER_NAME, version: SERVER_VERSION },
    { capabilities: { tools: {} } },
  )

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    if (mode === 'snapshot' && hosted && Date.now() - lastAttempt >= RETRY_INTERVAL_MS) {
      if (await tryHosted()) log(`hosted MCP server reachable again; serving its ${activeTools.length} tools`)
    }
    return { tools: activeTools }
  })

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const { name, arguments: args } = req.params
    if (mode === 'hosted' && hosted) {
      try {
        return await hosted.callTool(name, (args ?? {}) as Record<string, unknown>, CALL_TIMEOUT_MS)
      } catch (err) {
        if (err instanceof HostedRpcError) throw new McpError(err.code, err.message, err.data)
        // Not retried locally: the call may have reached the server (a POST
        // that creates a webhook must not run twice).
        const message = err instanceof Error ? err.message : String(err)
        return {
          content: [{ type: 'text', text: `Tickerbot MCP server unreachable: ${message}` }],
          isError: true,
        }
      }
    }
    try {
      const result = await runTool(name, (args ?? {}) as Record<string, unknown>, apiKey ?? '', {
        baseUrl,
        userAgent: USER_AGENT,
      })
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
    } catch (err) {
      const message = err instanceof ToolError
        ? formatToolError(err)
        : err instanceof Error
        ? err.message
        : String(err)
      return {
        content: [{ type: 'text', text: message }],
        isError: true,
      }
    }
  })

  const transport = new StdioServerTransport()
  await server.connect(transport)
  log(`${SERVER_NAME} v${SERVER_VERSION} ready (${activeTools.length} tools, catalog: ${mode === 'hosted' ? hostedUrl : 'bundled snapshot'})`)
}

function formatToolError(err: ToolError): string {
  const parts = [err.message]
  if (err.body !== undefined) {
    try {
      parts.push(typeof err.body === 'string' ? err.body : JSON.stringify(err.body, null, 2))
    } catch {
      // ignore
    }
  }
  return parts.join('\n')
}

main().catch((err) => {
  log(`fatal: ${err instanceof Error ? err.stack ?? err.message : String(err)}`)
  process.exit(1)
})
