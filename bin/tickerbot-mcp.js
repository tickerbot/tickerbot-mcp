#!/usr/bin/env node
// Thin shim so `npx -y @tickerbot/mcp-server` works without users needing
// to know the dist path. Just hands off to the compiled entrypoint.
import('../dist/index.js')
