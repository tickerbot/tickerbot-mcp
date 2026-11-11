// Bridge tests (TB-740): the built binary, driven over stdio by the SDK
// client, against a stub of the hosted MCP server (POST /mcp, single-JSON
// Streamable HTTP, as main_service/endpoints/mcp.js serves it).
//
// Run: npm test   (builds first)
import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'

const BIN = resolve(dirname(fileURLToPath(import.meta.url)), '../bin/tickerbot-mcp.js')
const KEY = 'tb_live_testkey'

// Tools the snapshot does not carry, so a list that has them came from the server.
const HOSTED_TOOLS = [
  {
    name: 'tickerbot_brand_new_tool',
    description: 'Added on the server after the package was published.',
    inputSchema: { type: 'object', properties: { ticker: { type: 'string', description: 'Symbol.' } }, required: ['ticker'] },
  },
  {
    name: 'tickerbot_get_ticker',
    description: 'Server copy.',
    inputSchema: { type: 'object', properties: { ticker: { type: 'string', description: 'Symbol.' } }, required: ['ticker'] },
  },
]

// A stub of the hosted server. `mode`: 'up' answers MCP; 'down' answers 503
// on /mcp. REST /v2/tickers/:t answers in both, for the fallback runner.
function startStub(mode) {
  const seen = { mcp: [], rest: [] }
  const server = http.createServer((req, res) => {
    let raw = ''
    req.on('data', (c) => (raw += c))
    req.on('end', () => {
      if (req.url === '/mcp' && req.method === 'POST') {
        const msg = JSON.parse(raw)
        seen.mcp.push({ auth: req.headers.authorization, accept: req.headers.accept, msg })
        if (mode === 'down') return res.writeHead(503).end('down')
        if (!req.headers.authorization) return res.writeHead(401, { 'Content-Type': 'application/json' }).end('{"error":"unauthorized"}')
        if (msg.id === undefined) return res.writeHead(202).end()
        const reply = (result) => res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ jsonrpc: '2.0', id: msg.id, result }))
        if (msg.method === 'initialize') return reply({ protocolVersion: msg.params.protocolVersion, capabilities: { tools: {} }, serverInfo: { name: 'stub', version: '0' } })
        if (msg.method === 'tools/list') return reply({ tools: HOSTED_TOOLS })
        if (msg.method === 'tools/call') {
          if (msg.params.name === 'tickerbot_rpc_error') {
            return res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ jsonrpc: '2.0', id: msg.id, error: { code: -32602, message: 'bad params' } }))
          }
          if (req.headers.authorization === 'Bearer tb_live_bad') {
            return reply({ content: [{ type: 'text', text: 'Tickerbot GET /v2/tickers/{ticker} failed: 401 Unauthorized\n{"error":"unauthenticated"}' }], isError: true })
          }
          return reply({
            content: [{ type: 'text', text: JSON.stringify({ via: 'hosted', name: msg.params.name, arguments: msg.params.arguments }) }],
            structuredContent: { via: 'hosted', name: msg.params.name, arguments: msg.params.arguments },
          })
        }
        return res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ jsonrpc: '2.0', id: msg.id, error: { code: -32601, message: 'nope' } }))
      }
      const m = req.url.match(/^\/v2\/tickers\/([^/?]+)/)
      if (m) {
        seen.rest.push({ auth: req.headers.authorization, url: req.url })
        return res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ via: 'rest', ticker: m[1] }))
      }
      res.writeHead(404).end()
    })
  })
  return new Promise((ok) => server.listen(0, '127.0.0.1', () => ok({ server, seen, url: `http://127.0.0.1:${server.address().port}` })))
}

const open = []
after(async () => {
  for (const c of open) await c.close().catch(() => {})
})

async function connect(env) {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [BIN],
    env: { PATH: process.env.PATH ?? '', TICKERBOT_MCP_CONNECT_TIMEOUT_MS: '1500', ...env },
    stderr: 'pipe',
  })
  let stderr = ''
  transport.stderr?.on('data', (d) => (stderr += d))
  const client = new Client({ name: 'test', version: '1' })
  await client.connect(transport)
  open.push(client)
  return { client, stderr: () => stderr }
}

test('tools come from the hosted server', async () => {
  const stub = await startStub('up')
  try {
    const { client, stderr } = await connect({ TICKERBOT_API_KEY: KEY, TICKERBOT_API_URL: stub.url })
    const { tools } = await client.listTools()
    assert.deepEqual(tools.map((t) => t.name), HOSTED_TOOLS.map((t) => t.name))
    assert.equal(tools[1].description, 'Server copy.')
    const init = stub.seen.mcp.find((s) => s.msg.method === 'initialize')
    assert.equal(init.auth, `Bearer ${KEY}`)
    assert.match(init.accept, /application\/json/)
    assert.match(init.accept, /text\/event-stream/)
    assert.ok(stub.seen.mcp.some((s) => s.msg.method === 'notifications/initialized'))
    assert.doesNotMatch(stderr(), /WARNING/)
    await client.close()
  } finally {
    stub.server.close()
  }
})

test('tools/call is forwarded and its result returned unchanged', async () => {
  const stub = await startStub('up')
  try {
    const { client } = await connect({ TICKERBOT_API_KEY: KEY, TICKERBOT_API_URL: stub.url })
    await client.listTools()
    const res = await client.callTool({ name: 'tickerbot_brand_new_tool', arguments: { ticker: 'AAPL' } })
    assert.equal(res.isError, undefined)
    assert.deepEqual(res.structuredContent, { via: 'hosted', name: 'tickerbot_brand_new_tool', arguments: { ticker: 'AAPL' } })
    const call = stub.seen.mcp.find((s) => s.msg.method === 'tools/call')
    assert.equal(call.auth, `Bearer ${KEY}`)
    assert.deepEqual(call.msg.params, { name: 'tickerbot_brand_new_tool', arguments: { ticker: 'AAPL' } })
    assert.equal(stub.seen.rest.length, 0, 'no REST call from the bridge itself')
    await client.close()
  } finally {
    stub.server.close()
  }
})

test('a JSON-RPC error from the server comes back as a JSON-RPC error', async () => {
  const stub = await startStub('up')
  try {
    const { client } = await connect({ TICKERBOT_API_KEY: KEY, TICKERBOT_API_URL: stub.url })
    await assert.rejects(client.callTool({ name: 'tickerbot_rpc_error', arguments: {} }), /bad params/)
    await client.close()
  } finally {
    stub.server.close()
  }
})

test('a bad key answers the same isError text as before', async () => {
  const stub = await startStub('up')
  try {
    const { client } = await connect({ TICKERBOT_API_KEY: 'tb_live_bad', TICKERBOT_API_URL: stub.url })
    const res = await client.callTool({ name: 'tickerbot_get_ticker', arguments: { ticker: 'AAPL' } })
    assert.equal(res.isError, true)
    assert.match(res.content[0].text, /^Tickerbot GET \/v2\/tickers\/\{ticker\} failed: 401 Unauthorized\n/)
    await client.close()
  } finally {
    stub.server.close()
  }
})

test('server down: the snapshot is served, with a stderr warning, and calls run against REST', async () => {
  const stub = await startStub('down')
  try {
    const { client, stderr } = await connect({ TICKERBOT_API_KEY: KEY, TICKERBOT_API_URL: stub.url })
    const { tools } = await client.listTools()
    const { tools: snapshot } = await import('../dist/tools.js')
    assert.deepEqual(tools.map((t) => t.name), snapshot.map((t) => t.name))
    assert.ok(!tools.some((t) => t.name === 'tickerbot_brand_new_tool'))
    assert.match(stderr(), /WARNING: hosted MCP server unreachable \(.*503.*\)\. Serving the bundled snapshot/)
    const res = await client.callTool({ name: 'tickerbot_get_ticker', arguments: { ticker: 'AAPL' } })
    assert.equal(res.isError, undefined)
    assert.deepEqual(JSON.parse(res.content[0].text), { via: 'rest', ticker: 'AAPL' })
    assert.equal(stub.seen.rest[0].auth, `Bearer ${KEY}`)
    await client.close()
  } finally {
    stub.server.close()
  }
})

test('server unreachable (connection refused): the snapshot is served, with a stderr warning', async () => {
  const { client, stderr } = await connect({ TICKERBOT_API_KEY: KEY, TICKERBOT_API_URL: 'http://127.0.0.1:1' })
  const { tools } = await client.listTools()
  assert.ok(tools.length > 0)
  assert.match(stderr(), /WARNING: hosted MCP server unreachable/)
  await client.close()
})

test('no key: the hosted server is not contacted and calls answer the missing-key message', async () => {
  const stub = await startStub('up')
  try {
    const { client, stderr } = await connect({ TICKERBOT_API_URL: stub.url })
    const { tools } = await client.listTools()
    assert.ok(tools.length > 0)
    assert.match(stderr(), /TICKERBOT_API_KEY is not set/)
    const res = await client.callTool({ name: 'tickerbot_get_ticker', arguments: { ticker: 'AAPL' } })
    assert.equal(res.isError, true)
    assert.match(res.content[0].text, /^Missing TICKERBOT_API_KEY\. Get a key from https:\/\/tickerbot\.io\/dashboard/)
    assert.equal(stub.seen.mcp.length, 0)
    assert.equal(stub.seen.rest.length, 0)
    await client.close()
  } finally {
    stub.server.close()
  }
})
