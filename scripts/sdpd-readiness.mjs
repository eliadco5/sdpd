#!/usr/bin/env node
// Computes readiness.json from a test report instead of a human hand-editing
// it — the "derived" mode described in README §7. Per operation: every one
// of its STD scenario IDs passing -> live; some passing -> implemented; none
// passing -> mocked. An operation with no tagged STD scenario IDs at all
// (the STD predates the ID convention) is left at whatever state it already
// has — this script only ever speaks for operations it has evidence about.
//
// Usage:
//   node scripts/sdpd-readiness.mjs <vault-dir> --tests <report> --check
//   node scripts/sdpd-readiness.mjs <vault-dir> --tests <report> --write
//
// --check prints the diff against the committed readiness.json and exits
// non-zero if applying it would change anything (the PR gate). --write
// applies and writes the file (the main-branch step). Exactly one of
// --check/--write is required.

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join } from 'node:path';
import { extractPassingIds, extractScenarioIds, isPassing } from './lib/test-report.mjs';

const args = process.argv.slice(2);
const vaultDir = args[0];
const testsIdx = args.indexOf('--tests');
const testsReportPath = testsIdx !== -1 ? args[testsIdx + 1] : null;
const mode = args.includes('--write') ? 'write' : args.includes('--check') ? 'check' : null;

if (!vaultDir || !testsReportPath || !mode) {
  console.error('Usage: node scripts/sdpd-readiness.mjs <vault-dir> --tests <report> --check|--write');
  process.exit(2);
}

function extractOperationIds(yamlText) {
  const ids = [];
  for (const line of yamlText.split('\n')) {
    const match = line.match(/^\s*operationId:\s*(\S+)\s*$/);
    if (match) ids.push(match[1]);
  }
  return ids;
}

function readStdText(dir) {
  const mdFiles = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const entryPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      mdFiles.push(...readdirSync(entryPath).filter((f) => f.endsWith('.md')).map((f) => join(entryPath, f)));
    } else if (entry.name.endsWith('.md')) {
      mdFiles.push(entryPath);
    }
  }
  return mdFiles.map((f) => readFileSync(f, 'utf8')).join('\n');
}

function gitCommit() {
  try {
    return execSync('git rev-parse --short HEAD', { cwd: vaultDir }).toString().trim();
  } catch {
    return 'unknown';
  }
}

const contractPath = join(vaultDir, 'sources', 'contracts', 'openapi.yaml');
const readinessPath = join(vaultDir, 'sources', 'contracts', 'readiness.json');
const stdDir = join(vaultDir, 'sources', 'testing-specs');

const operationIds = extractOperationIds(readFileSync(contractPath, 'utf8'));
const stdText = readStdText(stdDir);
const scenarioIds = extractScenarioIds(stdText);
const passing = extractPassingIds(readFileSync(testsReportPath, 'utf8'));
const currentReadiness = JSON.parse(readFileSync(readinessPath, 'utf8'));

const evidence = {
  commit: gitCommit(),
  run: process.env.GITHUB_RUN_ID ?? process.env.CI_RUN_ID ?? 'local',
  at: new Date().toISOString().slice(0, 10),
};

const computed = {};
for (const operationId of operationIds) {
  const ownScenarios = scenarioIds.filter((id) => id.includes(`-${operationId}-`));
  const passingOwn = ownScenarios.filter((id) => isPassing(passing, id));

  let state;
  if (ownScenarios.length === 0) state = currentReadiness[operationId]?.state ?? 'mocked';
  else if (passingOwn.length === ownScenarios.length) state = 'live';
  else if (passingOwn.length > 0) state = 'implemented';
  else state = 'mocked';

  computed[operationId] = { state, evidence };
}

const changes = [];
for (const operationId of operationIds) {
  const before = currentReadiness[operationId]?.state ?? '(none)';
  const after = computed[operationId].state;
  if (before !== after) changes.push(`  ${operationId}: ${before} -> ${after}`);
}

if (changes.length === 0) {
  console.log('No readiness changes computed from the test report.');
} else {
  console.log('Computed readiness changes:');
  console.log(changes.join('\n'));
}

if (mode === 'check') {
  process.exit(changes.length > 0 ? 1 : 0);
}

// --write: merge, preserving any manual "verified" annotation already on an
// entry, never dropping an operation the contract no longer lists.
const next = { ...currentReadiness };
for (const operationId of operationIds) {
  next[operationId] = { ...currentReadiness[operationId], ...computed[operationId] };
}
writeFileSync(readinessPath, JSON.stringify(next, null, 2) + '\n');
console.log(`Wrote ${readinessPath}.`);
