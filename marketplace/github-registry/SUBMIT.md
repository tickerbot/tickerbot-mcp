# GitHub MCP Registry submission

Catalog entry will live at `https://github.com/mcp/io.tickerbot/mcp`.

## What this gets you

- Discovery surface — users browsing the registry find Tickerbot
- Install snippets are auto-rendered from `server.json` for every MCP-aware client
- No vetting. Submission turnaround is hours (or whatever the registry merge queue is)

## How to submit

The registry is operated out of the `modelcontextprotocol/registry`
repo on GitHub. As of 2026 the submission flow is one of:

1. **Open a PR** to `modelcontextprotocol/registry` adding
   `servers/io.tickerbot/mcp/server.json` (copy this file).
2. **Use the `mcp-publisher` CLI** if available:
   ```bash
   npx mcp-publisher publish --file server.json
   ```
   (Requires GitHub OAuth — they verify domain ownership of `tickerbot.io`.)

Check `https://github.com/modelcontextprotocol/registry/blob/main/CONTRIBUTING.md` for the current canonical instructions before submitting; the exact mechanism has been iterating.

## Prereqs before submission

- [ ] `@tickerbot/mcp-server` published to npm with the version in `server.json`
- [ ] `mcp.tickerbot.io` resolves and serves `200` on `GET /info`
- [ ] `tickerbot/tickerbot-mcp` GitHub repo is public
- [ ] Domain verification on `tickerbot.io` if the registry asks (TXT record)

## Verify `server.json`

The schema URL at the top of the file points at the live JSON Schema.
Validate locally before submitting:

```bash
npx ajv-cli validate \
  -s https://raw.githubusercontent.com/modelcontextprotocol/registry/main/docs/server-json/server.schema.json \
  -d server.json
```

## Fields to revisit before submit

- `version` — bump to whatever's published on npm at submission time
- `description` — final marketing copy from `/mcp-server` landing
- `remotes` — only include if `mcp.tickerbot.io` is live. If not, drop the `remotes` array and resubmit later.
