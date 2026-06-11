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

⚠️ **Heads up — Custom GPTs cap each Action at 30 operations.** The
full `tickerbot.io/openapi.yaml` exposes 42 operations across `/v2/*`.
Two ways to handle:

**Option A (recommended — quick)**: import the full spec; if the GPT
builder rejects, prune the spec down to the ~25 most useful ops
before importing. Drop these to get under the cap:
- `/v2/scan` POST (keep GET form, drop POST mirror)
- `/v2/webhooks/{id}/enable` (admin-y, rarely needed in chat)
- `/v2/webhooks/{id}/test` (admin-y)
- `/v2/webhooks/{id}/deliveries` (admin-y)
- `/v2/news/scan` POST (keep GET form)
- `/v2/signals` PATCH and DELETE (chat shouldn't mutate custom signals here)
- `/v2/universes` PATCH and DELETE (same)

**Option B (clean)**: serve a separate GPT-tuned spec at
`tickerbot.io/openapi-gpt.yaml` that filters to ~25 chat-friendly
operations. Cleaner for the GPT builder but is a separate piece of
work in `tickerbot-client/app/openapi.yaml/route.ts`.

In the GPT builder: click "Create new action" → "Import from URL" →
paste:
```
https://tickerbot.io/openapi.yaml
```

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
