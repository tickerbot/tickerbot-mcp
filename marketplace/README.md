# Marketplace submission packets

Three distribution channels for the Tickerbot MCP server beyond direct
install. Order of fire (fastest payoff first):

| # | Channel | Vetting | Reach | Status |
|---|---------|---------|-------|--------|
| 1 | **GitHub MCP Registry** (`io.tickerbot/mcp`) | None | Anyone browsing the registry; auto-rendered install snippets for every MCP client | [`github-registry/`](./github-registry/) |
| 2 | **ChatGPT Custom GPT** | None — anyone can publish | Every ChatGPT Plus/Pro/Team user via the GPT Store | [`chatgpt-gpt/`](./chatgpt-gpt/) |
| 3 | **Anthropic Claude Connector** | 2-6 weeks | Every claude.ai Pro/Team/Enterprise user, one-click install | [`claude-connector/`](./claude-connector/) |

Each subfolder has a `SUBMIT.md` (the process) and copy/manifest files
(paste-ready content for the submission forms).

## Prereqs across all three

Before submitting any of them, these must be true:

- [ ] `@tickerbot/mcp-server` published to npm (for #1)
- [ ] `mcp.tickerbot.io` live, returning 200 on `GET /info` (for #1 remote slot and #3)
- [ ] `tickerbot/tickerbot-mcp` GitHub repo public
- [ ] `tickerbot.io/mcp-server` landing page live
- [ ] `tickerbot.io/privacy` and `tickerbot.io/terms` reachable

For #2 only: nothing else — uses the existing REST API + `/openapi.yaml`.

## Recommended order on the day

1. Publish to npm
2. Submit GitHub MCP Registry (instant)
3. Create the ChatGPT Custom GPT (~30 min in the GPT builder UI)
4. Deploy the remote endpoint + DNS
5. File the Anthropic Connector application (the long pole)
