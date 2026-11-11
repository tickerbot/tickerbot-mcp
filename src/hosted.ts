// Client for the hosted Tickerbot MCP server ({baseUrl}/mcp, served by
// main_service/endpoints/mcp.js).
//
// The hosted server speaks MCP over Streamable HTTP in its single-JSON form:
// every JSON-RPC message is one POST to /mcp with `Authorization: Bearer
// <key>`, and the answer is one JSON body (a notification gets 202 and no
// body). It keeps no session and never streams, so this client is a plain
// fetch per message. It still behaves as a spec client (Accept lists
// text/event-stream, an mcp-session-id is echoed back if one is issued, an
// SSE answer is read) so a later server change does not break old installs.
//
// No key, or a key the server refuses outright, answers HTTP 401 on every
// request. A key the server accepts at the door but the REST API refuses
// (malformed, revoked) passes initialize and tools/list; its tools/call
// comes back as an isError result carrying the REST 401 text, which the
// bridge returns unchanged.

export interface HostedTool {
  name: string
  description?: string
  inputSchema: { type: 'object'; [k: string]: unknown }
  outputSchema?: { type: 'object'; [k: string]: unknown }
  [k: string]: unknown
}

export interface HostedCallResult {
  content: unknown[]
  structuredContent?: Record<string, unknown>
  isError?: boolean
  [k: string]: unknown
}

/** The server could not be reached or did not answer with JSON-RPC. */
export class HostedUnavailable extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message)
    this.name = 'HostedUnavailable'
  }
}

/** The server answered with a JSON-RPC error object. */
export class HostedRpcError extends Error {
  constructor(public readonly code: number, message: string, public readonly data?: unknown) {
    super(message)
    this.name = 'HostedRpcError'
  }
}

export interface HostedClientOptions {
  url: string
  apiKey: string
  userAgent: string
  clientVersion: string
}

const CLIENT_PROTOCOL_VERSION = '2025-06-18'

export class HostedClient {
  private nextId = 1
  private sessionId: string | undefined
  private protocolVersion: string | undefined

  constructor(private readonly opts: HostedClientOptions) {}

  /** initialize + notifications/initialized + tools/list. */
  async connect(timeoutMs: number): Promise<HostedTool[]> {
    const init = (await this.request(
      'initialize',
      {
        protocolVersion: CLIENT_PROTOCOL_VERSION,
        capabilities: {},
        clientInfo: { name: this.opts.userAgent, version: this.opts.clientVersion },
      },
      timeoutMs,
    )) as { protocolVersion?: string }
    if (init && typeof init.protocolVersion === 'string') this.protocolVersion = init.protocolVersion
    await this.notify('notifications/initialized', timeoutMs)
    return this.listTools(timeoutMs)
  }

  async listTools(timeoutMs: number): Promise<HostedTool[]> {
    const result = (await this.request('tools/list', {}, timeoutMs)) as { tools?: unknown }
    if (!result || !Array.isArray(result.tools) || result.tools.length === 0) {
      throw new HostedUnavailable('tools/list returned no tools')
    }
    return result.tools as HostedTool[]
  }

  async callTool(name: string, args: Record<string, unknown>, timeoutMs: number): Promise<HostedCallResult> {
    const result = (await this.request('tools/call', { name, arguments: args }, timeoutMs)) as HostedCallResult
    if (!result || !Array.isArray(result.content)) {
      throw new HostedUnavailable('tools/call returned no content')
    }
    return result
  }

  private async notify(method: string, timeoutMs: number): Promise<void> {
    await this.post({ jsonrpc: '2.0', method }, timeoutMs)
  }

  private async request(method: string, params: unknown, timeoutMs: number): Promise<unknown> {
    const id = this.nextId++
    const message = await this.post({ jsonrpc: '2.0', id, method, params }, timeoutMs, id)
    if (!message) throw new HostedUnavailable(`${method}: no response`)
    if (message.error) {
      const e = message.error as { code?: number; message?: string; data?: unknown }
      throw new HostedRpcError(typeof e.code === 'number' ? e.code : -32603, e.message ?? 'Unknown error', e.data)
    }
    return message.result
  }

  private async post(
    body: Record<string, unknown>,
    timeoutMs: number,
    id?: number,
  ): Promise<Record<string, unknown> | null> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.opts.apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
      'User-Agent': this.opts.userAgent,
    }
    if (this.sessionId) headers['mcp-session-id'] = this.sessionId
    if (this.protocolVersion) headers['mcp-protocol-version'] = this.protocolVersion

    let res: Response
    try {
      res = await fetch(this.opts.url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      })
    } catch (err) {
      const reason = err instanceof Error ? (err.name === 'TimeoutError' ? `timed out after ${timeoutMs} ms` : err.message) : String(err)
      throw new HostedUnavailable(`${this.opts.url}: ${reason}`)
    }

    const session = res.headers.get('mcp-session-id')
    if (session) this.sessionId = session

    if (res.status === 202) return null
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new HostedUnavailable(`${this.opts.url} answered ${res.status}${text ? `: ${text.slice(0, 300)}` : ''}`, res.status)
    }
    if (id === undefined) {
      await res.body?.cancel().catch(() => {})
      return null
    }

    const type = res.headers.get('content-type') ?? ''
    const text = await res.text()
    const candidates = type.includes('text/event-stream') ? parseSse(text) : [parseJson(text)]
    for (const c of candidates.flatMap((m) => (Array.isArray(m) ? m : [m]))) {
      if (c && typeof c === 'object' && (c as { id?: unknown }).id === id) return c as Record<string, unknown>
    }
    throw new HostedUnavailable(`${this.opts.url}: no JSON-RPC response for id ${id}`)
  }
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

// Each SSE event's data lines joined, parsed as JSON.
function parseSse(text: string): unknown[] {
  const out: unknown[] = []
  for (const event of text.split(/\r?\n\r?\n/)) {
    const data = event
      .split(/\r?\n/)
      .filter((l) => l.startsWith('data:'))
      .map((l) => l.slice(5).replace(/^ /, ''))
      .join('\n')
    if (data) out.push(parseJson(data))
  }
  return out
}
