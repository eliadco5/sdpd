#!/usr/bin/env node
// Adapts .sdpd/resolved.json (stack-neutral, written by sdpd-resolve) into a
// Vite server.proxy config. This is the only place that knows about Vite —
// other stacks read resolved.json directly and adapt it their own way.
//
// Usage: node scripts/adapters/vite-proxy.mjs [--in <path>] [--out <path>]

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const args = process.argv.slice(2);
const inIdx = args.indexOf('--in');
const inPath = inIdx !== -1 ? args[inIdx + 1] : '.sdpd/resolved.json';
const outIdx = args.indexOf('--out');
const outPath = outIdx !== -1 ? args[outIdx + 1] : '.sdpd/generated.proxy.json';

function pathToProxyKey(path) {
  // {param} -> [^/]+, anchored, so more specific (longer/templated) paths
  // can be ordered before their prefixes — Vite proxy takes first match.
  const pattern = path.replace(/\{[^}]+\}/g, '[^/]+').replace(/\//g, '\\/');
  return `^${pattern}$`;
}

const resolved = JSON.parse(readFileSync(inPath, 'utf8'));

const proxy = {};
for (const op of resolved.operations) {
  proxy[pathToProxyKey(op.path)] = { target: op.target, changeOrigin: true };
}

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(proxy, null, 2) + '\n');

console.log(`Wrote ${resolved.operations.length} routes -> ${outPath}`);
