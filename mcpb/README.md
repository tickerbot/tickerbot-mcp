# Tickerbot Desktop Extension (MCPB)

Drag-and-drop installer for Claude Desktop. End users double-click
`tickerbot.mcpb`, Claude Desktop shows a native install dialog with a
"Tickerbot API key" prompt, and Tickerbot is wired in — no editing
`claude_desktop_config.json`.

This is Anthropic's [MCPB format][mcpb] (formerly called DXT — same
thing, renamed mid-2025). One file, click to install, runs as a
sandboxed subprocess inside Claude Desktop.

[mcpb]: https://github.com/modelcontextprotocol/mcpb

## What's here

- `manifest.json` — extension metadata + runtime config + user_config
  (renders the API-key prompt at install time)
- `icon.png` — 512×512 PNG shown in the install dialog and Extensions
  list. **TODO: add the real Tickerbot icon before submission.**
- `server/index.cjs` — generated at build time; the entire npm package
  + all runtime deps bundled into one self-contained Node file via
  esbuild. Excluded from git (see `.gitignore`).

## Build

```bash
npm install        # picks up esbuild + @anthropic-ai/mcpb devDeps
npm run build:mcpb
```

Output: `../dist-mcpb/tickerbot.mcpb` (a zip with `manifest.json` +
`icon.png` + `server/index.cjs` at the root).

## Test locally

Double-click `dist-mcpb/tickerbot.mcpb`. Claude Desktop opens an
install dialog. Paste a `tb_live_...` key. Restart Claude, the
"tickerbot" connector should appear with 19 tools.

## Distribute

Two paths, do both:

1. **Self-host**: upload the .mcpb to `tickerbot.io/tickerbot.mcpb` so
   the `/mcp-server` landing-page Tier 2 row links directly to the
   download.
2. **Anthropic Extensions catalog**: submit at
   <https://www.anthropic.com/desktop-extensions> so Tickerbot shows
   up in Claude Desktop's built-in Extensions browser.

## Versioning

Bump `manifest.json` `version` in lockstep with `package.json`. The
release workflow can produce the .mcpb as a tag artifact (see
`.github/workflows/publish.yml` — TODO once stable).
