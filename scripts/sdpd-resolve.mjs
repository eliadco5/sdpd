#!/usr/bin/env node
// Resolves, per operation, where a dev's local gateway should route requests:
//   local override -> branch preview -> shared env -> mock (always available).
// An operation that isn't "live" in readiness.json always resolves to mock,
// regardless of what's reachable. Emits generated Vite server.proxy config —
// this file is written by sdpd-resolve/sdpd-fetch, never hand-edited.
//
// Usage: node scripts/sdpd-resolve.mjs <vault-dir> [--out <path>]

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';

const args = process.argv.slice(2);
const vaultDir = args[0];
const outIdx = args.indexOf('--out');
const outPath = outIdx !== -1 ? args[outIdx + 1] : '.sdpd/generated.proxy.json';
const mockBaseUrl = process.env.SDPD_MOCK_URL ?? 'http://localhost:4010';
const probeTimeoutMs = 800;

if (!vaultDir) {
  console.error('Usage: node scripts/sdpd-resolve.mjs <vault-dir> [--out <path>]');
  process.exit(2);
}

function readJson(path, fallback) {
  if (!existsSync(path)) return fallback;
  return JSON.parse(readFileSync(path, 'utf8'));
}

// Minimal OpenAPI path/operationId extraction — sufficient for routing,
// not a full YAML parser. See scripts/check-coverage.mjs for the same approach.
function extractOperations(yamlText) {
  const operations = [];
  let currentPath = null;
  for (const rawLine of yamlText.split('\n')) {
    const pathMatch = rawLine.match(/^ {2}(\/\S*):\s*$/);
    if (pathMatch) {
      currentPath = pathMatch[1];
      continue;
    }
    const opMatch = rawLine.match(/^\s*operationId:\s*(\S+)\s*$/);
    if (opMatch && currentPath) {
      operations.push({ operationId: opMatch[1], path: currentPath });
    }
  }
  return operations;
}

function pathToProxyKey(path) {
  // {param} -> [^/]+, anchored, so more specific (longer/templated) paths
  // can be ordered before their prefixes — Vite proxy takes first match.
  const pattern = path.replace(/\{[^}]+\}/g, '[^/]+').replace(/\//g, '\\/');
  return `^${pattern}$`;
}

async function isReachable(baseUrl) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), probeTimeoutMs);
    await fetch(baseUrl, { signal: controller.signal });
    clearTimeout(timer);
    return true;
  } catch {
    return false;
  }
}

const contractText = readFileSync(join(vaultDir, 'sources', 'contracts', 'openapi.yaml'), 'utf8');
const operations = extractOperations(contractText);
const readiness = readJson(join(vaultDir, 'sources', 'contracts', 'readiness.json'), {});
const environments = readJson(join(vaultDir, 'sources', 'contracts', 'environments.json'), {});
const local = readJson('.sdpd/local.json', {
  prefer: ['local', 'branch', 'shared', 'mock'],
  local: {},
  branchPreviewUrl: null,
  offline: false,
});

async function resolveOperation(op) {
  const state = readiness[op.operationId]?.state ?? 'mocked';
  if (state !== 'live') return { ...op, target: mockBaseUrl, via: 'mock', reason: `state=${state}` };
  if (local.offline) return { ...op, target: mockBaseUrl, via: 'mock', reason: 'offline' };

  const candidates = {
    local: local.local?.[op.operationId] ?? null,
    branch: local.branchPreviewUrl ?? null,
    shared: environments.dev ?? environments.staging ?? null,
  };

  for (const source of local.prefer ?? ['local', 'branch', 'shared', 'mock']) {
    if (source === 'mock') break; // mock is always the terminal fallback, tried last
    const candidate = candidates[source];
    if (!candidate) continue;
    if (await isReachable(candidate)) return { ...op, target: candidate, via: source };
  }
  return { ...op, target: mockBaseUrl, via: 'mock', reason: 'no candidate reachable' };
}

const resolved = await Promise.all(operations.map(resolveOperation));

// Order longer/templated paths first so e.g. /orders/{id}/cancel is matched
// before the /orders/{id} and /orders prefixes it would otherwise collide with.
resolved.sort((a, b) => b.path.length - a.path.length);

const proxy = {};
for (const op of resolved) {
  proxy[pathToProxyKey(op.path)] = { target: op.target, changeOrigin: true };
}

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(proxy, null, 2) + '\n');

console.log(`Resolved ${resolved.length} operations -> ${outPath}`);
for (const op of resolved) {
  console.log(`  ${op.operationId.padEnd(20)} ${op.via.padEnd(6)} ${op.target}${op.reason ? `  (${op.reason})` : ''}`);
}
