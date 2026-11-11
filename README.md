# @tickerbot/mcp-server

Model Context Protocol server for [Tickerbot](https://tickerbot.io) — the stock market, in SQL. Install in Claude, Cursor, VS Code Copilot, and other MCP-compatible clients to scan ~14,500 US-listed equities plus a curated set of rates, FX and crypto series, replay any day, or subscribe a query — across 421+ signal columns.

## Install

You need a Tickerbot API key. Get one from your [dashboard](https://tickerbot.io/dashboard).

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%/Claude/claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "tickerbot": {
      "command": "npx",
      "args": ["-y", "@tickerbot/mcp-server"],
      "env": {
        "TICKERBOT_API_KEY": "tb_live_..."
      }
    }
  }
}
```

Restart Claude Desktop.

### Claude Code

```bash
claude mcp add tickerbot --env TICKERBOT_API_KEY=tb_live_... -- npx -y @tickerbot/mcp-server
```

### Cursor

Add to `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "tickerbot": {
      "command": "npx",
      "args": ["-y", "@tickerbot/mcp-server"],
      "env": { "TICKERBOT_API_KEY": "tb_live_..." }
    }
  }
}
```

### VS Code (Copilot)

Add to `.vscode/mcp.json` in your workspace:

```json
{
  "servers": {
    "tickerbot": {
      "command": "npx",
      "args": ["-y", "@tickerbot/mcp-server"],
      "env": { "TICKERBOT_API_KEY": "tb_live_..." }
    }
  }
}
```

## Tools

30 tools covering scans, signals, tickers (state, history, bars, coverage, ETF holdings), events, news, universes and webhook subscriptions. Bars and History answer `data`: one symbol gives its rows, a comma list gives them keyed by symbol.

| Tool | Endpoint |
| --- | --- |
| `tickerbot_scan` | `POST /v2/scan` |
| `tickerbot_subscribe_scan` | `POST /v2/scan/subscribe` |
| `tickerbot_list_signals` | `GET /v2/signals` |
| `tickerbot_create_custom_signal` | `POST /v2/signals` |
| `tickerbot_get_signal` | `GET /v2/signals/{signal}` |
| `tickerbot_update_custom_signal` | `PATCH /v2/signals/{signal}` |
| `tickerbot_delete_custom_signal` | `DELETE /v2/signals/{signal}` |
| `tickerbot_list_tickers` | `GET /v2/tickers` |
| `tickerbot_get_ticker` | `GET /v2/tickers/{ticker}` |
| `tickerbot_get_history` | `GET /v2/tickers/{ticker}/history` |
| `tickerbot_subscribe_ticker` | `POST /v2/tickers/{ticker}/subscribe` |
| `tickerbot_get_bars` | `GET /v2/tickers/{ticker}/bars/{interval}` |
| `tickerbot_get_ticker_coverage` | `GET /v2/tickers/{ticker}/coverage` |
| `tickerbot_get_etf_holdings` | `GET /v2/tickers/{ticker}/holdings` |
| `tickerbot_list_events` | `GET /v2/events` |
| `tickerbot_subscribe_events` | `POST /v2/events/subscribe` |
| `tickerbot_search_news` | `GET /v2/news` |
| `tickerbot_list_universes` | `GET /v2/universes` |
| `tickerbot_create_universe` | `POST /v2/universes` |
| `tickerbot_get_universe` | `GET /v2/universes/{id}` |
| `tickerbot_update_universe` | `PATCH /v2/universes/{id}` |
| `tickerbot_delete_universe` | `DELETE /v2/universes/{id}` |
| `tickerbot_list_webhooks` | `GET /v2/webhooks` |
| `tickerbot_get_webhook` | `GET /v2/webhooks/{id}` |
| `tickerbot_update_webhook` | `PATCH /v2/webhooks/{id}` |
| `tickerbot_delete_webhook` | `DELETE /v2/webhooks/{id}` |
| `tickerbot_list_webhook_deliveries` | `GET /v2/webhooks/{id}/deliveries` |
| `tickerbot_redeliver_webhook_delivery` | `POST /v2/webhooks/{id}/deliveries/{delivery_id}/redeliver` |
| `tickerbot_enable_webhook` | `POST /v2/webhooks/{id}/enable` |
| `tickerbot_test_webhook` | `POST /v2/webhooks/{id}/test` |

Strategies are not exposed via MCP — see the [REST API docs](https://tickerbot.io/api) for those.

## Examples

Open Claude and try:

> *"Find oversold semiconductor stocks bouncing on volume."*

> *"What's NVDA's RSI and short interest right now?"*

> *"How often has the gap-up + small-cap + high-RVOL setup hit over the last 30 days?"*

> *"Save a signal called `oversold_with_volume` defined as `rsi_14 < 30 AND volume_ratio_20d > 2`."*

## Configuration

| Env var | Default | Purpose |
| --- | --- | --- |
| `TICKERBOT_API_KEY` | *(required)* | Your API key. Sent as `Authorization: Bearer <key>` on every call. |
| `TICKERBOT_API_URL` | `https://api.tickerbot.io` | Override the API base URL (for staging or self-hosted). |

## Remote install

For consumer chat apps (Claude.ai web/mobile, ChatGPT) that don't run subprocesses, use the hosted remote MCP endpoint at `https://mcp.tickerbot.io` instead. See [tickerbot.io/mcp-server](https://tickerbot.io/mcp-server) for setup.

## License

MIT
