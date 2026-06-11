// OFFLINE FALLBACK tool registry for the Tickerbot MCP server.
//
// The canonical tool list lives in main_service/mcp/tools.js on the
// server. At startup, this package fetches `${baseUrl}/mcp/tools` and
// uses the live catalog — see src/index.ts. This file is the snapshot
// we fall back to if the fetch fails (offline, server down, network
// blip), and it's also what gets bundled at npm-publish time for
// freshness in cold-start scenarios.
//
// Staleness here is fine. Updating this file does NOT change behavior
// for online users — they always see whatever main_service is serving.
// Refresh this snapshot by running the regen script when the live
// catalog has drifted enough that you want offline users to see the
// newer version. No need to republish for every catalog tweak.

export type ParamLocation = 'path' | 'query' | 'body'

export interface ToolDef {
  name: string
  description: string
  inputSchema: {
    type: 'object'
    properties: Record<string, JsonSchemaProp>
    required?: string[]
  }
  endpoint: {
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE'
    /** Path template. Path params appear as `{name}` placeholders. */
    path: string
    /** Where each declared input param goes. */
    paramLocation: Record<string, ParamLocation>
  }
}

interface JsonSchemaProp {
  type: 'string' | 'integer' | 'number' | 'boolean' | 'array' | 'object'
  description: string
  enum?: readonly string[]
  default?: unknown
  items?: { type: string }
}

export const tools: readonly ToolDef[] = [
  // ── Tickers ──────────────────────────────────────────────────────────
  {
    name: 'tickerbot_list_tickers',
    description:
      'List active tickers from the Tickerbot universe (~12,000 US equities + top 100 crypto). Use `tickers` for bulk lookup of named symbols (returns full rows); otherwise walks the universe alphabetically with `cursor` pagination. Supports filters: search, asset_type, exchange, sector, min_market_cap.',
    inputSchema: {
      type: 'object',
      properties: {
        tickers: { type: 'string', description: 'Comma-separated symbols (max 50). When set, returns full rows for these symbols and pagination params are ignored.' },
        limit: { type: 'integer', description: 'Page size. Max 1000. Default 50.' },
        cursor: { type: 'string', description: 'Opaque cursor from a prior response.' },
        search: { type: 'string', description: 'Case-insensitive substring filter on ticker/name. Orders results by market_cap desc.' },
        asset_type: { type: 'string', description: 'Filter by asset type (e.g. "equity", "crypto").' },
        exchange: { type: 'string', description: 'Filter by exchange (e.g. "XNYS", "XNAS", "BATS").' },
        sector: { type: 'string', description: 'Exact-match sector filter (e.g. "Technology").' },
        min_market_cap: { type: 'number', description: 'Minimum market cap in USD. Orders results by market_cap desc.' },
      },
    },
    endpoint: {
      method: 'GET',
      path: '/v2/tickers',
      paramLocation: {
        tickers: 'query', limit: 'query', cursor: 'query', search: 'query',
        asset_type: 'query', exchange: 'query', sector: 'query', min_market_cap: 'query',
      },
    },
  },
  {
    name: 'tickerbot_get_ticker',
    description:
      'Get the full current row for one ticker — every column on the schema (price, change, indicators like rsi_14, every boolean flag like above_sma_50, fundamentals like pe_ratio). Pass `asof` (YYYY-MM-DD) for the row as it stood at the close of a past trading day.',
    inputSchema: {
      type: 'object',
      properties: {
        ticker: { type: 'string', description: 'Symbol. Case-insensitive. Equities: bare symbol (AAPL). Crypto: bare symbol (BTC).' },
        asof: { type: 'string', description: 'Optional YYYY-MM-DD. Returns the row at close of that day.' },
      },
      required: ['ticker'],
    },
    endpoint: {
      method: 'GET',
      path: '/v2/tickers/{ticker}',
      paramLocation: { ticker: 'path', asof: 'query' },
    },
  },
  {
    name: 'tickerbot_get_ticker_history',
    description:
      'Time-travel: get the full wide row for one ticker as it stood at a past date. Returns indicators, boolean flags, and the most-recent fundamentals known on that date. Use for backtests and reconstructions.',
    inputSchema: {
      type: 'object',
      properties: {
        ticker: { type: 'string', description: 'Symbol.' },
        asof: { type: 'string', description: 'Target date as YYYY-MM-DD or full ISO timestamp. Returns the most-recent daily snapshot on or before this date.' },
      },
      required: ['ticker', 'asof'],
    },
    endpoint: {
      method: 'GET',
      path: '/v2/tickers/{ticker}/history',
      paramLocation: { ticker: 'path', asof: 'query' },
    },
  },
  {
    name: 'tickerbot_get_ticker_events',
    description:
      'Get the discrete event log for one ticker (splits, dividends, analyst rating changes), newest-first. Optional date window and event-kind filter.',
    inputSchema: {
      type: 'object',
      properties: {
        ticker: { type: 'string', description: 'Symbol.' },
        from: { type: 'string', description: 'Earliest event timestamp (inclusive). YYYY-MM-DD or ISO.' },
        to: { type: 'string', description: 'Latest event timestamp (inclusive). YYYY-MM-DD or ISO.' },
        kind: { type: 'string', description: 'Filter by event kind.', enum: ['split', 'dividend', 'rating_change'] },
        limit: { type: 'integer', description: 'Page size. Max 1000. Default 100.' },
        cursor: { type: 'string', description: 'Opaque cursor.' },
      },
      required: ['ticker'],
    },
    endpoint: {
      method: 'GET',
      path: '/v2/tickers/{ticker}/events',
      paramLocation: { ticker: 'path', from: 'query', to: 'query', kind: 'query', limit: 'query', cursor: 'query' },
    },
  },

  // ── Signals catalog ──────────────────────────────────────────────────
  {
    name: 'tickerbot_list_signals_catalog',
    description:
      'List the unified signal catalog: every built-in column on the schema (`kind: builtin`) plus the caller\'s custom signals (`kind: expression`). Use to discover what `q=` clauses and signal names are available before composing a scan.',
    inputSchema: {
      type: 'object',
      properties: {
        kind: { type: 'string', description: 'Filter by kind. Omit for both.', enum: ['builtin', 'custom'] },
        limit: { type: 'integer', description: 'Page size for custom slice. Max 200. Default 50.' },
        cursor: { type: 'string', description: 'Opaque cursor.' },
      },
    },
    endpoint: {
      method: 'GET',
      path: '/v2/signals',
      paramLocation: { kind: 'query', limit: 'query', cursor: 'query' },
    },
  },
  {
    name: 'tickerbot_get_signals_match',
    description:
      'Find tickers that match a single signal right now (or at a past date with `asof`). Booleans need no condition (returns tickers where flag is true). Numerics need a `condition` like ">70" or "<=200". Sorted by signal value desc for numerics.',
    inputSchema: {
      type: 'object',
      properties: {
        signal: { type: 'string', description: 'Column name on ticker. E.g. golden_cross_today, above_sma_50, rsi_14, market_cap, pe_ratio.' },
        condition: { type: 'string', description: 'Required for numerics. Single bound: <op><value>, ops in (>, >=, =, !=, <, <=). E.g. ">70".' },
        asof: { type: 'string', description: 'Optional YYYY-MM-DD. Match against historical daily state.' },
        universe: { type: 'string', description: 'Optional universe slug.' },
        limit: { type: 'integer', description: 'Page size. Max 200. Default 50.' },
        cursor: { type: 'string', description: 'Opaque cursor.' },
      },
      required: ['signal'],
    },
    endpoint: {
      method: 'GET',
      path: '/v2/signals/{signal}',
      paramLocation: { signal: 'path', condition: 'query', asof: 'query', universe: 'query', limit: 'query', cursor: 'query' },
    },
  },
  {
    name: 'tickerbot_get_signal_history',
    description:
      'Get the time series of one signal for one ticker at a chosen interval (1m, 1h, 1d, 1w). Use for charting a numeric signal\'s evolution or seeing when a boolean flag was on/off across time.',
    inputSchema: {
      type: 'object',
      properties: {
        signal: { type: 'string', description: 'Column name.' },
        ticker: { type: 'string', description: 'Symbol.' },
        interval: { type: 'string', description: 'Bar interval.', enum: ['1m', '1h', '1d', '1w'] },
        from: { type: 'string', description: 'Earliest bar timestamp. YYYY-MM-DD or ISO.' },
        to: { type: 'string', description: 'Latest bar timestamp. YYYY-MM-DD or ISO.' },
        limit: { type: 'integer', description: 'Page size.' },
        cursor: { type: 'string', description: 'Opaque cursor.' },
      },
      required: ['signal', 'ticker', 'interval'],
    },
    endpoint: {
      method: 'GET',
      path: '/v2/signals/{signal}/{ticker}/history/{interval}',
      paramLocation: { signal: 'path', ticker: 'path', interval: 'path', from: 'query', to: 'query', limit: 'query', cursor: 'query' },
    },
  },
  {
    name: 'tickerbot_list_signal_events',
    description:
      'Get the list of discrete firings of a boolean signal for one ticker (each time the flag went true). Newest-first, paginated.',
    inputSchema: {
      type: 'object',
      properties: {
        signal: { type: 'string', description: 'Boolean signal column.' },
        ticker: { type: 'string', description: 'Symbol.' },
        from: { type: 'string', description: 'Earliest event timestamp.' },
        to: { type: 'string', description: 'Latest event timestamp.' },
        limit: { type: 'integer', description: 'Page size.' },
        cursor: { type: 'string', description: 'Opaque cursor.' },
      },
      required: ['signal', 'ticker'],
    },
    endpoint: {
      method: 'GET',
      path: '/v2/signals/{signal}/{ticker}/events',
      paramLocation: { signal: 'path', ticker: 'path', from: 'query', to: 'query', limit: 'query', cursor: 'query' },
    },
  },

  // ── Scan ─────────────────────────────────────────────────────────────
  {
    name: 'tickerbot_scan',
    description:
      'Run a SQL WHERE clause against the live ticker universe (or against a past trading day with `asof`). Returns matching tickers sorted by chosen column. The `q` grammar is a flat WHERE: column names from the schema, AND/OR/NOT, comparison operators, numeric/string literals. No JOIN, GROUP BY, or subqueries. Example: `gap_up AND market_cap < 2000000000 AND NOT earnings_this_week`.',
    inputSchema: {
      type: 'object',
      properties: {
        q: { type: 'string', description: 'SQL WHERE expression. Max 4000 chars. Identifiers are bare column names from the schema (e.g. above_sma_50, rsi_14, market_cap). Numeric literals fully specified (no 1.5B shorthand).' },
        universe: { type: 'string', description: 'Optional universe slug (top_10, top_100, or your own).' },
        asof: { type: 'string', description: 'Optional YYYY-MM-DD. Run the WHERE against historical close-of-day snapshot for this date.' },
        order: { type: 'string', description: 'Sort column. Default day_change_pct.' },
        dir: { type: 'string', description: 'Sort direction.', enum: ['asc', 'desc'] },
        fields: { type: 'string', description: 'Comma-separated extra columns to include in each result row beyond the default set.' },
        limit: { type: 'integer', description: 'Page size. Max 100. Default 50.' },
        cursor: { type: 'string', description: 'Opaque cursor.' },
      },
      required: ['q'],
    },
    endpoint: {
      method: 'GET',
      path: '/v2/scan',
      paramLocation: {
        q: 'query', universe: 'query', asof: 'query',
        order: 'query', dir: 'query', fields: 'query',
        limit: 'query', cursor: 'query',
      },
    },
  },

  // ── Universes ────────────────────────────────────────────────────────
  {
    name: 'tickerbot_list_universes',
    description:
      'List the caller\'s saved universes (named ticker sets to scope scans). Each universe has a slug, name, and ticker count.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'integer', description: 'Page size.' },
        cursor: { type: 'string', description: 'Opaque cursor.' },
      },
    },
    endpoint: {
      method: 'GET',
      path: '/v2/universes',
      paramLocation: { limit: 'query', cursor: 'query' },
    },
  },
  {
    name: 'tickerbot_get_universe',
    description: 'Get one universe by slug, including its ticker list.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Universe slug.' },
      },
      required: ['id'],
    },
    endpoint: {
      method: 'GET',
      path: '/v2/universes/{id}',
      paramLocation: { id: 'path' },
    },
  },
  {
    name: 'tickerbot_create_universe',
    description:
      'Create a new universe (named set of tickers) for scoping future scans. Returns the new universe with its assigned slug.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Human-readable name.' },
        tickers: { type: 'array', description: 'List of ticker symbols.', items: { type: 'string' } },
      },
      required: ['name', 'tickers'],
    },
    endpoint: {
      method: 'POST',
      path: '/v2/universes',
      paramLocation: { name: 'body', tickers: 'body' },
    },
  },

  // ── Custom signals (write) ───────────────────────────────────────────
  {
    name: 'tickerbot_create_custom_signal',
    description:
      'Save a SQL WHERE expression as a named custom signal the caller can reference by name in future scans. E.g. name="oversold_with_volume", expr="rsi_14 < 30 AND volume_ratio_20d > 2".',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Snake_case identifier for the signal (lowercase letters, digits, underscore).' },
        expr: { type: 'string', description: 'SQL WHERE expression. Same grammar as scan `q`.' },
        description: { type: 'string', description: 'Optional human description.' },
      },
      required: ['name', 'expr'],
    },
    endpoint: {
      method: 'POST',
      path: '/v2/signals',
      paramLocation: { name: 'body', expr: 'body', description: 'body' },
    },
  },

  // ── News ─────────────────────────────────────────────────────────────
  {
    name: 'tickerbot_search_news',
    description:
      'Search the news archive (back to 2015) with a SQL WHERE clause. Plan-gated: Scale+ required for the archive. Columns on news_article include `time_published`, `title`, `summary`, `source`, `source_domain`, `category`, `authors`, `topics`, `tickers` (array), `overall_sentiment_score`, `overall_sentiment_label`, `url`. To filter to one ticker use `\'NVDA\' = ANY(tickers)` or the auto-unnest alias `tk = \'NVDA\'`. Example: `q=tk=\'NVDA\' AND time_published >= NOW() - INTERVAL \'1 day\'`. Supports group_by + having for aggregation (e.g. count of articles per day).',
    inputSchema: {
      type: 'object',
      properties: {
        q:        { type: 'string',  description: 'SQL WHERE on news_article. Required.' },
        select:   { type: 'string',  description: 'Comma-separated columns to include. Defaults to a slim set.' },
        group_by: { type: 'string',  description: 'Comma-separated columns for aggregation (e.g. `date_trunc(\'day\', time_published)`).' },
        having:   { type: 'string',  description: 'WHERE-style filter on aggregates. Requires group_by.' },
        order:    { type: 'string',  description: 'Sort column or SELECT alias. Default time_published (non-aggregate) or volume (aggregate).' },
        dir:      { type: 'string',  description: 'Sort direction.', enum: ['asc', 'desc'] },
        limit:    { type: 'integer', description: 'Page size.' },
        cursor:   { type: 'string',  description: 'Opaque cursor.' },
      },
      required: ['q'],
    },
    endpoint: {
      method: 'GET',
      path: '/v2/news/scan',
      paramLocation: {
        q: 'query', select: 'query', group_by: 'query', having: 'query',
        order: 'query', dir: 'query', limit: 'query', cursor: 'query',
      },
    },
  },

  // ── Webhooks / subscribe (alert provisioning) ───────────────────────
  // Subscribe tools let the caller wire a webhook end-to-end in chat:
  // pass `target_url` to deliver to Discord/Slack/their own server;
  // omit it for in-app delivery (visible in the Tickerbot dashboard).
  // `cadence` is plan-gated — Hobby caps at 5m, Pro+ at 1m.
  {
    name: 'tickerbot_subscribe_scan',
    description:
      'Register a webhook that fires when matches for a scan query change. Pass `target_url` to deliver to your own URL (Discord, Slack, server endpoint); omit for in-app delivery in the dashboard. `cadence` is plan-gated (Hobby max 5m, Pro+ 1m). Use to satisfy "alert me when this happens" prompts.',
    inputSchema: {
      type: 'object',
      properties: {
        q:          { type: 'string', description: 'SQL WHERE expression — same grammar as scan.' },
        name:       { type: 'string', description: 'Human-readable label. Defaults to a truncated version of the query.' },
        universe:   { type: 'string', description: 'Optional universe slug to scope the watch.' },
        target_url: { type: 'string', description: 'Optional https URL to POST matches to. Omit for in-app delivery.' },
        cadence:    { type: 'string', description: 'Evaluation cadence.', enum: ['1m', '5m', '15m', 'hourly', 'nyse_open'] },
      },
      required: ['q'],
    },
    endpoint: {
      method: 'POST',
      path: '/v2/scan/subscribe',
      paramLocation: { q: 'body', name: 'body', universe: 'body', target_url: 'body', cadence: 'body' },
    },
  },
  {
    name: 'tickerbot_subscribe_signal',
    description:
      'Register a webhook that fires when a signal turns true (booleans) or its value crosses a condition (numerics). Optional `ticker` restricts to one symbol; omit to watch the whole universe. Pass `target_url` for outbound delivery or omit for in-app.',
    inputSchema: {
      type: 'object',
      properties: {
        signal:     { type: 'string', description: 'Column name (e.g. golden_cross_today, rsi_14).' },
        ticker:     { type: 'string', description: 'Optional ticker to restrict the watch to one symbol.' },
        universe:   { type: 'string', description: 'Optional universe slug.' },
        condition:  { type: 'string', description: 'Required for numerics: single bound like ">70" or "<=200". Ignored for booleans.' },
        name:       { type: 'string', description: 'Human-readable label.' },
        target_url: { type: 'string', description: 'Optional https URL for delivery; omit for in-app.' },
        cadence:    { type: 'string', description: 'Evaluation cadence.', enum: ['1m', '5m', '15m', 'hourly', 'nyse_open'] },
      },
      required: ['signal'],
    },
    endpoint: {
      method: 'POST',
      path: '/v2/signals/{signal}/subscribe',
      paramLocation: { signal: 'path', ticker: 'body', universe: 'body', condition: 'body', name: 'body', target_url: 'body', cadence: 'body' },
    },
  },
  {
    name: 'tickerbot_subscribe_ticker',
    description:
      'Register a webhook that fires when one ticker matches a condition. `condition` is a SQL WHERE-clause fragment scoped to that ticker (e.g. "rsi_14 > 70 AND relative_volume > 2"). Pass `target_url` for outbound delivery or omit for in-app.',
    inputSchema: {
      type: 'object',
      properties: {
        ticker:     { type: 'string', description: 'Symbol.' },
        condition:  { type: 'string', description: 'SQL WHERE fragment evaluated for this ticker (e.g. "rsi_14 > 70 AND gap_up").' },
        name:       { type: 'string', description: 'Human-readable label.' },
        target_url: { type: 'string', description: 'Optional https URL for delivery; omit for in-app.' },
        cadence:    { type: 'string', description: 'Evaluation cadence.', enum: ['1m', '5m', '15m', 'hourly', 'nyse_open'] },
      },
      required: ['ticker', 'condition'],
    },
    endpoint: {
      method: 'POST',
      path: '/v2/tickers/{ticker}/subscribe',
      paramLocation: { ticker: 'path', condition: 'body', name: 'body', target_url: 'body', cadence: 'body' },
    },
  },
  {
    name: 'tickerbot_list_webhooks',
    description: 'List the caller\'s active webhook subscriptions (rules created via the subscribe tools).',
    inputSchema: {
      type: 'object',
      properties: {
        limit:  { type: 'integer', description: 'Page size.' },
        cursor: { type: 'string',  description: 'Opaque cursor.' },
      },
    },
    endpoint: { method: 'GET', path: '/v2/webhooks', paramLocation: { limit: 'query', cursor: 'query' } },
  },
  {
    name: 'tickerbot_delete_webhook',
    description:
      'Delete a webhook subscription by id. Use after listing webhooks when the user wants to remove an alert.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Webhook id (looks like `wh_…`).' },
      },
      required: ['id'],
    },
    endpoint: { method: 'DELETE', path: '/v2/webhooks/{id}', paramLocation: { id: 'path' } },
  },
] as const

export function findTool(name: string): ToolDef | undefined {
  return tools.find((t) => t.name === name)
}
