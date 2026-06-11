# ChatGPT Custom GPT — Setup packet

Submit a Custom GPT in ChatGPT (`chatgpt.com` → top-left menu → "My GPTs"
→ Create a GPT). Lives in the GPT Store; accessible by every
Plus/Pro/Team user. Approval is automatic — anyone can publish a GPT.

This is the fastest consumer-chat distribution. Does NOT require the
remote MCP endpoint or OAuth — Custom GPTs use the existing REST API
+ OpenAPI spec directly.

## What goes in each field

### Name
```
Tickerbot — the stock market, in SQL
```

### Description (short)
```
Scan, replay, or subscribe across ~12,000 US tickers and the top 100 cryptos in plain English. SQL on every row, every column, every minute.
```

### Profile picture
**TODO** — square 512×512 PNG. Use the Tickerbot wordmark/monogram. Same asset that will be reused for the Anthropic Connector + MCPB icon.

### Instructions
(Paste verbatim into the "Instructions" field. See `instructions.md`.)

### Conversation starters
```
Find oversold semiconductor stocks bouncing on volume.
What's NVDA's RSI and short interest right now?
How often has the gap-up + small-cap + high-RVOL setup hit over the last 30 days?
Show me every AAPL dividend and analyst rating change since Jan 2024.
```

### Capabilities
- **Web Browsing**: off (model should use Actions, not browse)
- **DALL·E Image Generation**: off
- **Code Interpreter & Data Analysis**: on (lets the model crunch returned rows / make charts)

### Actions

Custom GPTs cap each Action at 30 operations. We serve a pre-filtered
spec at `/openapi-gpt.yaml` (25 ops — scan, ticker reads, signal
reads, custom-signal create, news, universes, webhook subscribe/
list/delete). Strategies, write-duplicates, and webhook plumbing
endpoints are excluded.

In the GPT builder: click "Create new action" → "Import from URL" →
paste:
```
https://tickerbot.io/openapi-gpt.yaml
```

(Runtime authors who want the full 42-operation surface still use
`/openapi.yaml` — see /api/agents.)

**Authentication:**
- Type: **API Key**
- Auth Type: **Bearer**
- Custom Header Name: (leave blank — Bearer goes in `Authorization`)
- API Key: leave blank in the GPT itself; *each user* pastes their own
  `tb_live_…` key on first call (ChatGPT pops up an auth dialog).

### Privacy policy URL
```
https://tickerbot.io/privacy
```

### Categorization
- **Category**: Productivity (no Finance category exists in the GPT Store as of mid-2026; revisit on Store updates)
- **Tags**: `stocks`, `crypto`, `sql`, `finance`, `trading`, `api`, `market-data`

## Verification flow

After creating, click "Preview" and try:
> *"What's NVDA's RSI right now?"*

If you haven't entered an API key yet, ChatGPT will prompt for one.
Enter a `tb_live_…` key. The model should call `getTicker` and return
a real row with current price, change, and indicators.

## Submission

After preview works, click **Publish → Everyone** in the top-right.
The GPT appears in the GPT Store within minutes (no review queue for
public GPTs). URL pattern: `chatgpt.com/g/g-XXXXX-tickerbot`.

## What this unlocks on `/mcp-server`

Once the GPT is live, flip the **Tier 1 → ChatGPT · GPT Store** row
status from "Coming soon" → "Available now" with the GPT's
`chatgpt.com/g/g-…` URL as the install link.

## Why we're not using MCP here yet

ChatGPT consumer chat doesn't speak MCP from a Custom GPT directly —
it uses OpenAPI Actions. When OpenAI's MCP Connector program opens to
non-partners (or when ChatGPT Custom Connectors accept bearer-token
URL paste like we already support), that becomes the cleaner path.
File the application separately when ready.
