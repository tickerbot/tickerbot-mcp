// Stdio MCP server entrypoint.
//
// Local install target. Launched by the user's MCP client (Claude Desktop,
// Claude Code, Cursor, VS Code Copilot, etc.) as a subprocess that talks
// JSON-RPC over stdin/stdout.
//
// Reads the API key from TICKERBOT_API_KEY and forwards every tool call
// through src/handler.ts → api.tickerbot.io.
//
// Tool catalog: at startup, this subprocess fetches the live catalog from
// {baseUrl}/mcp/tools. main_service is the single source of truth — any
// add/rename/description-tweak on the server side shows up here on the
// next subprocess spawn (which means the next Claude Desktop relaunch).
// If the fetch fails (offline, server down, network error), we fall back
// to the baked snapshot in tools.ts so the package still works.

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'

import { tools as bakedTools, type ToolDef } from './tools.js'
import { runTool, ToolError } from './handler.js'

const SERVER_NAME = '@tickerbot/mcp-server'
const SERVER_VERSION = '0.1.0'
const DEFAULT_BASE_URL = 'https://api.tickerbot.io'
const DISCOVERY_TIMEOUT_MS = 3000

interface CatalogResponse {
  asOf?: string
  serverInfo?: { name?: string; version?: string }
  protocolVersion?: string
  tools?: ToolDef[]
}

async function fetchLiveCatalog(baseUrl: string): Promise<ToolDef[] | null> {
  const url = `${baseUrl}/mcp/tools`
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), DISCOVERY_TIMEOUT_MS)
    const res = await fetch(url, {
      headers: { Accept: 'application/json', 'User-Agent': '@tickerbot/mcp-server' },
      signal: controller.signal,
    })
    clearTimeout(timer)
    if (!res.ok) {
      process.stderr.write(`[tickerbot-mcp] discovery: ${url} returned ${res.status}; using baked snapshot\n`)
      return null
    }
    const body = (await res.json()) as CatalogResponse
    if (!Array.isArray(body.tools) || body.tools.length === 0) {
      process.stderr.write(`[tickerbot-mcp] discovery: malformed response from ${url}; using baked snapshot\n`)
      return null
    }
    return body.tools
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    process.stderr.write(`[tickerbot-mcp] discovery: ${url} failed (${message}); using baked snapshot\n`)
    return null
  }
}

async function main() {
  const apiKey = process.env.TICKERBOT_API_KEY
  if (!apiKey) {
    process.stderr.write(
      `[tickerbot-mcp] TICKERBOT_API_KEY is not set. Get a key from https://tickerbot.io/dashboard and add it to your MCP client config (env block).\n`,
    )
  }
  const baseUrl = process.env.TICKERBOT_API_URL || DEFAULT_BASE_URL

  // Fetch the live catalog before announcing tools. The handshake (`initialize`
  // + `tools/list`) happens after server.connect(), so we have a window to
  // populate `activeTools` with the server's current view.
  const live = await fetchLiveCatalog(baseUrl)
  const activeTools: ToolDef[] = live ?? (bakedTools as readonly ToolDef[] as ToolDef[])
  const catalogSource = live ? 'live' : 'snapshot'

  const toolMap = new Map<string, ToolDef>(activeTools.map((t) => [t.name, t]))
  const findTool = (name: string) => toolMap.get(name)

  const server = new Server(
    { name: SERVER_NAME, version: SERVER_VERSION },
    { capabilities: { tools: {} } },
  )

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: activeTools.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
    })),
  }))

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const { name, arguments: args } = req.params
    try {
      const result = await runTool(
        name,
        (args ?? {}) as Record<string, unknown>,
        apiKey ?? '',
        { baseUrl, findTool },
      )
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
  process.stderr.write(
    `[tickerbot-mcp] ${SERVER_NAME} v${SERVER_VERSION} ready (${activeTools.length} tools, catalog: ${catalogSource})\n`,
  )
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
  process.stderr.write(`[tickerbot-mcp] fatal: ${err instanceof Error ? err.stack ?? err.message : String(err)}\n`)
  process.exit(1)
})
