# @tickerbot/mcp-server

Model Context Protocol server for [Tickerbot](https://tickerbot.io) — the stock market, in SQL. Install in Claude, Cursor, VS Code Copilot, and other MCP-compatible clients to scan ~12,000 US tickers and top 100 cryptos, replay any day, or subscribe a query — across 338+ signal columns.

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

19 tools covering tickers, signals, scans, universes, news, and webhook subscriptions.

| Tool | Endpoint |
| --- | --- |
| `tickerbot_list_tickers` | `GET /v2/tickers` |
| `tickerbot_get_ticker` | `GET /v2/tickers/{ticker}` |
| `tickerbot_get_ticker_history` | `GET /v2/tickers/{ticker}/history` |
| `tickerbot_get_ticker_events` | `GET /v2/tickers/{ticker}/events` |
| `tickerbot_list_signals_catalog` | `GET /v2/signals` |
| `tickerbot_get_signals_match` | `GET /v2/signals/{signal}` |
| `tickerbot_get_signal_history` | `GET /v2/signals/{signal}/{ticker}/history/{interval}` |
| `tickerbot_list_signal_events` | `GET /v2/signals/{signal}/{ticker}/events` |
| `tickerbot_scan` | `GET /v2/scan` (live or `asof`) |
| `tickerbot_list_universes` | `GET /v2/universes` |
| `tickerbot_get_universe` | `GET /v2/universes/{id}` |
| `tickerbot_create_universe` | `POST /v2/universes` |
| `tickerbot_create_custom_signal` | `POST /v2/signals` |
| `tickerbot_search_news` | `GET /v2/news/scan` |
| `tickerbot_subscribe_scan` | `POST /v2/scan/subscribe` |
| `tickerbot_subscribe_signal` | `POST /v2/signals/{signal}/subscribe` |
| `tickerbot_subscribe_ticker` | `POST /v2/tickers/{ticker}/subscribe` |
| `tickerbot_list_webhooks` | `GET /v2/webhooks` |
| `tickerbot_delete_webhook` | `DELETE /v2/webhooks/{id}` |

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
