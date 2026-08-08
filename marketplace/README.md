# Marketplace submission packets

Distribution channels for the Tickerbot MCP server beyond direct
install. Order of fire (fastest payoff first):

| # | Channel | Vetting | Reach | Status |
|---|---------|---------|-------|--------|
| 1 | **GitHub MCP Registry** (`io.tickerbot/mcp`) | None | Anyone browsing the registry; auto-rendered install snippets for every MCP client | [`github-registry/`](./github-registry/) |
| 2 | **Anthropic Claude Connector** | 2-6 weeks | Every claude.ai Pro/Team/Enterprise user, one-click install | [`claude-connector/`](./claude-connector/) |

> The **ChatGPT Custom GPT** packet (`chatgpt-gpt/`) was removed — the GPT
> Store path was retired 2026-06-12 (Actions support only shared-key auth).
> ChatGPT users install the MCP server as a connector with per-user OAuth
> instead; that path needs no marketplace packet.

Each subfolder has a `SUBMIT.md` (the process) and copy/manifest files
(paste-ready content for the submission forms).

## Prereqs across both

Before submitting either of them, these must be true:

- [ ] `@tickerbot/mcp-server` published to npm (for #1)
- [ ] `mcp.tickerbot.io` live, returning 200 on `GET /info` (for #1 remote slot and #2)
- [ ] `tickerbot/tickerbot-mcp` GitHub repo public
- [ ] `tickerbot.io/mcp-server` landing page live
- [ ] `tickerbot.io/privacy` and `tickerbot.io/terms` reachable

## Recommended order on the day

1. Publish to npm
2. Submit GitHub MCP Registry (instant)
3. Deploy the remote endpoint + DNS
4. File the Anthropic Connector application (the long pole)
