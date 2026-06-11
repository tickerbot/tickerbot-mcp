# ChatGPT Custom GPT — Setup packet

Submit a Custom GPT in ChatGPT (`chatgpt.com` → top-left menu → "My GPTs"
→ Create a GPT). Lives in the GPT Store; accessible by every
Plus/Pro/Team user. Approval is automatic — anyone can publish a GPT.

This is the fastest consumer-chat distribution. Does NOT require the
remote MCP endpoint to be deployed — Custom GPTs use the existing REST
API + OpenAPI spec directly.

## What goes in each field

### Name
```
Tickerbot Stock Signals
```

### Description (short)
```
SQL access to the live US stock market and top 100 cryptos. Run scans, fetch ticker data, query technical and fundamental signals in plain English.
```

### Profile picture
TODO — square logo. 512×512 PNG. Use the Tickerbot wordmark with the gradient background that matches `tickerbot.io/opengraph-image`.

### Instructions
(Paste verbatim into the "Instructions" field. See `instructions.md`.)

### Conversation starters
```
Find oversold semiconductor stocks bouncing on volume.
What's NVDA's RSI and short interest right now?
List the top 10 tech stocks by market cap.
Save a custom signal called "oversold_with_volume": rsi_14 < 30 AND volume_ratio_20d > 2.
```

### Capabilities
- Web Browsing: **off** (model should use Actions, not browse)
- DALL·E Image Generation: **off**
- Code Interpreter & Data Analysis: **on** (lets the model crunch returned rows)

### Actions

Click "Create new action". For schema, use:
```
https://tickerbot.io/openapi.yaml
```
(Or paste the full YAML if the GPT builder can't fetch a URL.)

**Authentication:**
- Type: **API Key**
- Auth Type: **Bearer**
- Custom Header Name: (leave blank — Bearer goes in `Authorization`)
- API Key: leave blank in the GPT itself; *each user* sets their own key when they first chat with the GPT (ChatGPT pops up an auth dialog).

**Privacy policy URL:**
```
https://tickerbot.io/privacy
```

### Categorization
- Category: **Productivity** (no Finance category exists in the GPT Store as of this writing)
- Tags: `stocks`, `signals`, `finance`, `trading`, `api`

## Verification flow

After creating, click "Preview" and try:
> *"Get the current row for AAPL."*

If you haven't entered an API key yet, ChatGPT will prompt for one.
Enter a `tb_live_...` key. The model should call `get_ticker` and
return the row.

## Why we can't use MCP here yet

ChatGPT consumer chat doesn't speak MCP from a Custom GPT directly.
The Custom GPT route uses OpenAPI Actions. (When OpenAI's MCP Connector
program opens to non-partners, that becomes the cleaner path — file
the application separately, see `../claude-connector/SUBMIT.md` for
the equivalent flow.)
