#!/usr/bin/env node
// Resolves, per operation, where a dev's local gateway should route requests:
//   local override -> branch preview -> shared env -> mock (always available).
// An operation that isn't "live" in readiness.json always resolves to mock,
// regardless of what's reachable.
//
// Output is stack-neutral: .sdpd/resolved.json, an array of resolved
// operations with method/path/target/via. This file is written by
// sdpd-resolve/sdpd-fetch, never hand-edited. Stack-specific formats (e.g.
// a Vite server.proxy config) are generated FROM this file by an adapter —
// see scripts/adapters/vite-proxy.mjs — not by this script directly.
//
// Usage: node scripts/sdpd-resolve.mjs <vault-dir> [--out <path>]

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';

const args = process.argv.slice(2);
const vaultDir = args[0];
const outIdx = args.indexOf('--out');
const outPath = outIdx !== -1 ? args[outIdx + 1] : '.sdpd/resolved.json';
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

// Minimal OpenAPI path/method/operationId extraction — sufficient for
// routing, not a full YAML parser (doesn't follow $ref, single file only).
// See scripts/check-coverage.mjs for the same approach, and README §12 for
// the documented limits of this.
const HTTP_METHODS = new Set(['get', 'post', 'put', 'patch', 'delete', 'head', 'options']);

function extractOperations(yamlText) {
  const operations = [];
  let currentPath = null;
  let currentMethod = null;
  for (const rawLine of yamlText.split('\n')) {
    const pathMatch = rawLine.match(/^ {2}(\/\S*):\s*$/);
    if (pathMatch) {
      currentPath = pathMatch[1];
      currentMethod = null;
      continue;
    }
    const methodMatch = rawLine.match(/^ {4}([a-zA-Z]+):\s*$/);
    if (methodMatch && currentPath && HTTP_METHODS.has(methodMatch[1].toLowerCase())) {
      currentMethod = methodMatch[1].toLowerCase();
      continue;
    }
    const opMatch = rawLine.match(/^\s*operationId:\s*(\S+)\s*$/);
    if (opMatch && currentPath) {
      operations.push({ operationId: opMatch[1], path: currentPath, method: currentMethod ?? 'get' });
    }
  }
  return operations;
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
// before the /orders/{id} and /orders prefixes it would otherwise collide
// with — adapters that build prefix-matched routers depend on this order.
resolved.sort((a, b) => b.path.length - a.path.length);

const output = {
  generatedAt: new Date().toISOString(),
  mockBaseUrl,
  operations: resolved,
};

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(output, null, 2) + '\n');

console.log(`Resolved ${resolved.length} operations -> ${outPath}`);
for (const op of resolved) {
  console.log(`  ${op.method.toUpperCase().padEnd(6)} ${op.operationId.padEnd(20)} ${op.via.padEnd(6)} ${op.target}${op.reason ? `  (${op.reason})` : ''}`);
}
