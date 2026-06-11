#!/usr/bin/env bash
# Bundles @tickerbot/mcp-server into a single .mcpb (formerly .dxt)
# Desktop Extensions installer for Claude Desktop. End users
# double-click the resulting tickerbot.mcpb; Claude Desktop shows a
# native install dialog with a "Tickerbot API key" prompt and wires
# everything up — no claude_desktop_config.json editing.
#
# Output: <repo-root>/dist-mcpb/tickerbot.mcpb
#
# Run with:  npm run build:mcpb
# Prereqs:   npm install (devDeps include esbuild + @anthropic-ai/mcpb)

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "→ Building TypeScript package…"
npm run build

echo "→ Bundling all runtime deps into server/index.cjs via esbuild…"
mkdir -p mcpb/server
npx esbuild dist/index.js \
  --bundle \
  --platform=node \
  --target=node18 \
  --format=cjs \
  --outfile=mcpb/server/index.cjs \
  --banner:js='#!/usr/bin/env node'

echo "→ Verifying manifest references the bundled file…"
node -e "
  const fs = require('fs');
  const m = JSON.parse(fs.readFileSync('mcpb/manifest.json','utf8'));
  if (m.server.entry_point !== 'server/index.cjs') {
    console.error('::error::manifest.server.entry_point must be server/index.cjs');
    process.exit(1);
  }
  if (!fs.existsSync('mcpb/icon.png')) {
    console.warn('⚠️  mcpb/icon.png is missing. The bundle will build but the install dialog uses a default icon. Before catalog submission: add a 512×512 PNG and restore the \"icon\": \"icon.png\" field in manifest.json.');
  }
"

echo "→ Packing into .mcpb…"
mkdir -p dist-mcpb
( cd mcpb && npx --yes @anthropic-ai/mcpb pack . "$ROOT/dist-mcpb/tickerbot.mcpb" )

SIZE=$(du -h "$ROOT/dist-mcpb/tickerbot.mcpb" | cut -f1)
echo ""
echo "✅ Built dist-mcpb/tickerbot.mcpb ($SIZE)"
echo ""
echo "Next steps:"
echo "  • Local test: double-click dist-mcpb/tickerbot.mcpb"
echo "  • Distribute: host at tickerbot.io/tickerbot.mcpb"
echo "  • Submit: https://www.anthropic.com/desktop-extensions"
