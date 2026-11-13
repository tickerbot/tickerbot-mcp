// Fallback runner tests (src/handler.ts): what buildRequest sends to REST,
// against a stub that records each request.
//
// Run: npm test   (builds first)
import { test, after, before } from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import { runTool } from '../dist/handler.js'
import { findTool } from '../dist/tools.js'

const KEY = 'tb_live_testkey'
let server
let baseUrl
const seen = []

before(async () => {
  server = http.createServer((req, res) => {
    let raw = ''
    req.on('data', (c) => (raw += c))
    req.on('end', () => {
      seen.push({ method: req.method, url: req.url, body: raw ? JSON.parse(raw) : undefined })
      res.writeHead(200, { 'Content-Type': 'application/json' }).end('{"ok":true}')
    })
  })
  await new Promise((ok) => server.listen(0, '127.0.0.1', ok))
  baseUrl = `http://127.0.0.1:${server.address().port}`
})
after(() => server.close())

async function call(name, args) {
  seen.length = 0
  await runTool(name, args, KEY, { baseUrl })
  assert.equal(seen.length, 1)
  return seen[0]
}

function queryOf(url) {
  return Object.fromEntries(new URL(url, 'http://x').searchParams)
}

test('get_history and get_bars send no api_version (removed; the API answers 400)', async () => {
  for (const name of ['tickerbot_get_history', 'tickerbot_get_bars']) {
    assert.equal(findTool(name).endpoint.fixedQuery, undefined)
    const req = await call(name, name === 'tickerbot_get_bars' ? { ticker: 'AAPL', interval: '1d' } : { ticker: 'AAPL' })
    assert.ok(!('api_version' in queryOf(req.url)), `${name}: ${req.url}`)
  }
})

test('the snapshot carries the renamed tools and keeps the old names', () => {
  for (const name of ['tickerbot_query_events', 'tickerbot_query_news', 'tickerbot_list_events', 'tickerbot_search_news']) {
    assert.ok(findTool(name), name)
  }
  assert.match(findTool('tickerbot_list_events').description, /^Deprecated: works until 2027-01-12/)
  assert.match(findTool('tickerbot_search_news').description, /^Deprecated: works until 2027-01-12/)
})

test('GET: an unknown argument is forwarded as a query param, blank included', async () => {
  const req = await call('tickerbot_get_ticker', { ticker: 'AAPL', symbols: 'MSFT', foo: '', bar: null })
  assert.equal(req.method, 'GET')
  assert.match(req.url, /^\/v2\/tickers\/AAPL\?/)
  assert.deepEqual(queryOf(req.url), { symbols: 'MSFT', foo: '', bar: '' })
})

test('GET: a blank declared argument is still not sent', async () => {
  const req = await call('tickerbot_get_history', { ticker: 'AAPL', select: '', cursor: null, limit: undefined })
  assert.equal(req.url, '/v2/tickers/AAPL/history')
})

test('non-GET: an unknown argument is forwarded as a body field, blank included', async () => {
  const req = await call('tickerbot_update_universe', { universe: 'u1', name: 'Mine', foo: '', bar: null, baz: 3 })
  assert.equal(req.method, 'PATCH')
  assert.equal(req.url, '/v2/universes/u1')
  assert.deepEqual(req.body, { name: 'Mine', foo: '', bar: null, baz: 3 })
})

test('non-GET: a blank declared argument is still not sent', async () => {
  const req = await call('tickerbot_update_universe', { universe: 'u1', name: 'Mine', description: '' })
  assert.deepEqual(req.body, { name: 'Mine' })
})

test('an older accepted name still goes where the route reads it', async () => {
  const req = await call('tickerbot_update_universe', { id: 'u2', name: 'X' })
  assert.equal(req.url, '/v2/universes/u2')
  assert.deepEqual(req.body, { name: 'X' })
})
