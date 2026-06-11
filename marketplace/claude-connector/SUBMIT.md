# Anthropic Claude Connector — Submission packet

Target: the "Connectors" library inside `claude.ai` (Settings → Connectors).
Stripe, Notion, Asana, Linear etc. live here. Listing makes Tickerbot a
one-click install for any Claude Pro/Team/Enterprise user.

## Prereqs (must be live BEFORE submitting)

- [ ] `mcp.tickerbot.io` reachable and responds 200 to `GET /info`
- [ ] `tools/list` returns 19 tools over JSON-RPC (Anthropic will hit this during vetting)
- [ ] `tickerbot.io/mcp-server` landing page is live
- [ ] Public GitHub repo at `github.com/tickerbot/tickerbot-mcp`
- [ ] Privacy + Terms pages reachable at `tickerbot.io/privacy` and `tickerbot.io/terms`
- [ ] Support email monitored: `support@tickerbot.io` (or whatever — see TODO)
- [ ] Demo recording: 60-90s screen capture showing install → first scan → result

## Submission flow

As of mid-2026, Anthropic accepts Connector submissions through:
- The partner application at `https://www.anthropic.com/connectors-program` (canonical, may have changed name)
- Or via direct partner-team contact for fast-track requests

If a public submission form doesn't exist when you go to file, email
`partners@anthropic.com` referencing this packet and the live
`mcp.tickerbot.io` endpoint.

Vetting is typically 2-6 weeks. Anthropic reviews:
- Auth model (we use bearer; OAuth preferred but not required)
- Tool descriptions (LLM-friendly, accurate, no hallucination risk)
- Privacy/data handling
- Stability/uptime of the remote endpoint
- Whether the product is a real third-party service, not a hobby

Tickerbot fits the bar. Don't oversell — describe what it does plainly.

## Field-by-field copy

See `copy.md` for paste-ready strings for every field they'll ask for.

## Why API key auth is fine (vs OAuth)

The Stripe and Linear connectors use OAuth. Some smaller connectors use
API key paste. Both pass vetting. Tickerbot keys are scoped, revocable,
and minted by the user from their own dashboard — same risk profile as
the REST API path. If Anthropic pushes back during vetting, plan B is
to add an OAuth2 client-credentials flow on top (~2 days of work,
mostly token-introspection plumbing).

## What happens if you wait

The local install + the chat-app "paste URL" install both work today
with zero involvement from Anthropic. The Connector marketplace
listing adds discoverability and a one-click install button, nothing
else. It's worth pursuing because it's the only way non-dev consumers
in `claude.ai` will ever find Tickerbot — but it doesn't block the
rest of the launch.
