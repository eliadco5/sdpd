#!/usr/bin/env node
// Contract <-> STD coverage lint. No LLM, no required deps: every operationId
// in the contract must (1) appear as a heading in at least one
// testing-specs/**/*.md file (testing-specs is epic-scoped:
// testing-specs/<EPIC-KEY-slug>/std.md) and (2) have a readiness.json seed —
// README §5 Step 2 requires every new/changed operation to be seeded at
// `mocked`, and nothing else enforces that.
//
// Optional --tests <report> mode additionally requires that every
// STD-<epic>-<operation>-<n> scenario ID referenced in the STD files appears
// as a passing test name/id in the given JUnit-XML or JSON test report —
// this is what makes derived readiness (scripts/sdpd-readiness.mjs)
// trustworthy rather than aspirational. See README §12 for what this can
// and can't prove.
//
// Usage: node scripts/check-coverage.mjs <vault-dir> [--tests <report-path>]

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { extractPassingIds, extractScenarioIds, isPassing } from './lib/test-report.mjs';

const rawArgs = process.argv.slice(2);
const testsIdx = rawArgs.indexOf('--tests');
const testsReportPath = testsIdx !== -1 ? rawArgs[testsIdx + 1] : null;
const vaultDir = rawArgs.filter((a, i) => a !== '--tests' && rawArgs[i - 1] !== '--tests')[0];

if (!vaultDir) {
  console.error('Usage: node scripts/check-coverage.mjs <vault-dir> [--tests <report-path>]');
  process.exit(2);
}

const contractPath = join(vaultDir, 'sources', 'contracts', 'openapi.yaml');
const stdDir = join(vaultDir, 'sources', 'testing-specs');
const readinessPath = join(vaultDir, 'sources', 'contracts', 'readiness.json');

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

const contractText = readFileSync(contractPath, 'utf8');
const operationIds = extractOperationIds(contractText);
const stdText = readStdText(stdDir);
const readiness = JSON.parse(readFileSync(readinessPath, 'utf8'));

const uncoveredByStd = operationIds.filter((id) => {
  // A scenario section is a markdown heading containing the operationId,
  // e.g. "## createCheckout" — matches the convention in std.md.
  const headingPattern = new RegExp(`^#{1,6}\\s*${id}\\b`, 'm');
  return !headingPattern.test(stdText);
});

const uncoveredByReadiness = operationIds.filter((id) => !(id in readiness));

let exitCode = 0;

if (uncoveredByStd.length > 0) {
  console.error(`Uncovered operations (no STD scenario found): ${uncoveredByStd.join(', ')}`);
  exitCode = 1;
}

if (uncoveredByReadiness.length > 0) {
  console.error(`Unseeded operations (no readiness.json entry — see README §5 Step 2): ${uncoveredByReadiness.join(', ')}`);
  exitCode = 1;
}

if (testsReportPath) {
  const scenarioIds = extractScenarioIds(stdText);
  const passing = extractPassingIds(readFileSync(testsReportPath, 'utf8'));
  const uncoveredScenarios = scenarioIds.filter((id) => !isPassing(passing, id));
  if (uncoveredScenarios.length > 0) {
    console.error(`STD scenarios with no passing test in ${testsReportPath}: ${uncoveredScenarios.join(', ')}`);
    exitCode = 1;
  } else {
    console.log(`All ${scenarioIds.length} STD scenario IDs have a passing test in ${testsReportPath}.`);
  }
}

if (exitCode === 0) {
  console.log(`All ${operationIds.length} contract operations have an STD scenario and a readiness seed.`);
}

process.exit(exitCode);
