# Claude Connector — paste-ready field copy

Use these strings to fill the Anthropic Connector application form.

## Product name
```
Tickerbot
```

## One-line description (≤80 chars)
```
SQL signals + scans across the US stock market and top 100 cryptos.
```

## Detailed description (~250 words)
```
Tickerbot is the stock market, in SQL. Every US-listed equity plus the top 100 cryptos by market cap, refreshed every minute. Every notable condition — price, volume, momentum, gaps, patterns, fundamentals — becomes a named signal you can scan, replay, or subscribe to. The Tickerbot Connector turns every endpoint into a tool Claude can call directly — no code, no curl.

What you can ask:

• "Find oversold semiconductor stocks bouncing on volume." → Claude composes a SQL scan against ~12,000 tracked tickers and returns matches.
• "What's NVDA's RSI and short interest right now?" → fetches the full current row, including ~100 numeric indicators and ~120 pre-thresholded boolean flags.
• "How often has the gap-up + high-RVOL setup hit over the last 30 days?" → runs the same scan against historical close-of-day state, day by day.
• "Save a signal called 'oversold_with_volume' as rsi_14 < 30 AND volume_ratio_20d > 2." → creates a named, persistent custom signal the user can reference in future scans.

Behind the connector is the same SQL surface that powers Tickerbot's REST API: a flat WHERE-clause grammar over named columns, no JOINs, no GROUP BY. The schema is small enough to fit in a prompt, which is why Claude can compose queries reliably without round-tripping the docs.

Authentication is bearer-token. The user supplies their own Tickerbot API key (minted from tickerbot.io/dashboard) and pastes it into the connector setup once. Free tier and 14-day trial available; paid plans start at $29/mo.

Tickerbot returns market data; it does not place trades or give investment advice. The connector exposes read-only access to market data and the user's own saved scans and universes. Strategies and webhook configuration remain in the dashboard, intentionally outside the LLM's reach.
```

## Categories
```
Finance, Developer Tools, Data
```

## Connector URL
```
https://mcp.tickerbot.io
```

## Auth method
```
API key (Bearer token)
```

## How users get a key
```
Sign up at tickerbot.io and visit /dashboard to mint a key. 14-day free trial; no credit card required.
```

## Privacy policy URL
```
https://tickerbot.io/privacy
```

## Terms of service URL
```
https://tickerbot.io/terms
```

## Support contact
```
support@tickerbot.io
```
TODO confirm this address is live and monitored. If not, swap to whatever
inbox you watch (e.g. david@tickerbot.io).

## Demo URL or video
```
TODO — record 60-90 seconds:
  1. Open Claude.ai → Settings → Connectors → Add custom connector
  2. Paste https://mcp.tickerbot.io + API key
  3. New chat: "Find oversold semiconductor stocks bouncing on volume"
  4. Show Claude composing the q= clause and returning ranked matches
  5. Follow-up: "Backtest that across the last 30 days"
  6. Show the asof scan returning hit rate

Host on Loom or upload to YouTube unlisted. Link here.
```

## Logo / icon
```
TODO — 512×512 PNG with transparent background.
Use the existing Tickerbot wordmark or the candle-chart symbol from
tickerbot.io/opengraph-image. Keep margin around the mark.
```

## Tagline shown in the Connector card
```
Stock market data + signals, on tap.
```

## Tools the connector exposes (paste verbatim if asked for the tool inventory)
```
scan, get_ticker, list_tickers, get_ticker_history, get_ticker_events,
list_signals_catalog, get_signals_match, get_signal_history,
list_signal_events, list_universes, get_universe, create_universe,
create_custom_signal, search_news, subscribe_scan, subscribe_signal,
subscribe_ticker, list_webhooks, delete_webhook
```

## "What happens to my data" answer (privacy reviewer question)
```
The connector forwards the user's API key as a Bearer token on every tool call to api.tickerbot.io. Tickerbot logs the API call (endpoint, status, latency, user ID) for billing and abuse detection — same as the REST API — and does not log the chat messages themselves. The chat client (Claude) sees the JSON responses; Tickerbot does not see what Claude does with them.
```
