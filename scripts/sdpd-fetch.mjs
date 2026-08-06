#!/usr/bin/env node
// Pulls the vault, diffs readiness.json against the last-seen snapshot,
// prints the human-readable delta, and re-runs sdpd-resolve so local routing
// reflects what just changed. Nothing auto-switches mid-session — this
// prints what changed and regenerates config; you still restart your
// dev server yourself.
//
// Usage: node scripts/sdpd-fetch.mjs <vault-dir>

import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const vaultDir = process.argv[2];
if (!vaultDir) {
  console.error('Usage: node scripts/sdpd-fetch.mjs <vault-dir>');
  process.exit(2);
}

const snapshotPath = '.sdpd/last-seen-readiness.json';
const readinessPath = join(vaultDir, 'sources', 'contracts', 'readiness.json');

try {
  execSync('git pull', { cwd: vaultDir, stdio: 'inherit' });
} catch {
  console.warn(`Could not run "git pull" in ${vaultDir} — continuing with the vault as it is on disk.`);
}

const current = JSON.parse(readFileSync(readinessPath, 'utf8'));
const previous = existsSync(snapshotPath) ? JSON.parse(readFileSync(snapshotPath, 'utf8')) : {};

const allOps = new Set([...Object.keys(previous), ...Object.keys(current)]);
const changes = [];
for (const op of allOps) {
  const before = previous[op]?.state ?? '(new)';
  const after = current[op]?.state ?? '(removed)';
  if (before !== after) changes.push(`  ${op}: ${before} -> ${after}`);
}

if (changes.length === 0) {
  console.log('No readiness changes since last fetch.');
} else {
  console.log('Readiness changes:');
  console.log(changes.join('\n'));
}

mkdirSync(dirname(snapshotPath), { recursive: true });
writeFileSync(snapshotPath, JSON.stringify(current, null, 2) + '\n');

if (changes.length > 0) {
  console.log('\nRegenerating local routing...');
  const resolveScript = join(dirname(fileURLToPath(import.meta.url)), 'sdpd-resolve.mjs');
  execSync(`node "${resolveScript}" "${vaultDir}"`, { stdio: 'inherit' });
  console.log('\nRouting regenerated. Restart your dev server to pick up the change.');
}
