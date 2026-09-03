#!/usr/bin/env node
// Computes readiness.json from a test report instead of a human hand-editing
// it — the "Auto" mode described in README §7, the default. Per operation:
// every one of its STD scenario IDs passing -> live; some passing ->
// implemented; none passing -> mocked. An operation with no tagged STD
// scenario IDs at all (the STD predates the ID convention) is left at
// whatever state it already has — this script only ever speaks for
// operations it has evidence about.
//
// --source agent|ci controls who's allowed to claim what:
//   agent   an agent's own local run. Hard-capped at "implemented" — even a
//           fully green local run can never write "live" itself, and it can
//           never downgrade an operation already at "live" (an agent
//           shouldn't be able to un-verify something by running a partial
//           local suite). This is the low-stakes, everyday promotion.
//   ci      an independent run (e.g. against main). Full tri-state,
//           including "live" — this is the only writer allowed to make that
//           claim, so it stays a genuinely independent signal, not
//           self-certification.
// If --source is omitted, it's inferred from CI/GITHUB_ACTIONS env vars,
// defaulting to "agent" if neither is set — an inverted-safety default: a
// stray manual invocation should never accidentally mint a "live".
//
// Usage:
//   node scripts/sdpd-readiness.mjs <vault-dir> --tests <report> [--source agent|ci] --check
//   node scripts/sdpd-readiness.mjs <vault-dir> --tests <report> [--source agent|ci] --write
//
// --check prints the diff against the committed readiness.json and exits
// non-zero if applying it would change anything (the PR gate, or an agent's
// own pre-flight). --write applies and writes the file. Exactly one of
// --check/--write is required.

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join } from 'node:path';
import { extractPassingIds, extractScenarioIds, isPassing } from './lib/test-report.mjs';

const args = process.argv.slice(2);
const vaultDir = args[0];
const testsIdx = args.indexOf('--tests');
const testsReportPath = testsIdx !== -1 ? args[testsIdx + 1] : null;
const sourceIdx = args.indexOf('--source');
const source = sourceIdx !== -1 ? args[sourceIdx + 1] : (process.env.CI || process.env.GITHUB_ACTIONS ? 'ci' : 'agent');
const mode = args.includes('--write') ? 'write' : args.includes('--check') ? 'check' : null;

if (!vaultDir || !testsReportPath || !mode || !['agent', 'ci'].includes(source)) {
  console.error('Usage: node scripts/sdpd-readiness.mjs <vault-dir> --tests <report> [--source agent|ci] --check|--write');
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

const baseEvidence = {
  source,
  commit: gitCommit(),
  run: process.env.GITHUB_RUN_ID ?? process.env.CI_RUN_ID ?? 'local',
  at: new Date().toISOString().slice(0, 10),
};

const computed = {};
for (const operationId of operationIds) {
  const existing = currentReadiness[operationId];

  // An agent's own run can never touch an operation already confirmed live —
  // that would let a partial local suite silently un-verify something real.
  if (source === 'agent' && existing?.state === 'live') {
    computed[operationId] = existing;
    continue;
  }

  const ownScenarios = scenarioIds.filter((id) => id.includes(`-${operationId}-`));
  const passingOwn = ownScenarios.filter((id) => isPassing(passing, id));

  let state;
  if (ownScenarios.length === 0) state = existing?.state ?? 'mocked';
  else if (passingOwn.length === ownScenarios.length) state = 'live';
  else if (passingOwn.length > 0) state = 'implemented';
  else state = 'mocked';

  let evidence = baseEvidence;
  if (source === 'agent' && state === 'live') {
    // Capped by who ran it, not by the result: a fully green local run is
    // still only a claim of "implemented" until something independent (CI
    // on main, or a human) confirms it.
    state = 'implemented';
    evidence = { ...baseEvidence, note: 'all scenarios passing locally; awaiting independent confirmation for live' };
  }

  computed[operationId] = { state, evidence };
}

const changes = [];
for (const operationId of operationIds) {
  const before = currentReadiness[operationId]?.state ?? '(none)';
  const after = computed[operationId].state;
  if (before !== after) changes.push(`  ${operationId}: ${before} -> ${after}`);
}

if (changes.length === 0) {
  console.log(`No readiness changes computed from the test report (source: ${source}).`);
} else {
  console.log(`Computed readiness changes (source: ${source}):`);
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
