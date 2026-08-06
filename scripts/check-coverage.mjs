#!/usr/bin/env node
// Contract <-> STD coverage lint. No LLM, no deps: every operationId in the
// contract must appear as a heading in at least one testing-specs/**/*.md file
// (testing-specs is epic-scoped: testing-specs/<EPIC-KEY-slug>/std.md).
// Usage: node scripts/check-coverage.mjs <vault-dir>

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const vaultDir = process.argv[2];
if (!vaultDir) {
  console.error('Usage: node scripts/check-coverage.mjs <vault-dir>');
  process.exit(2);
}

const contractPath = join(vaultDir, 'sources', 'contracts', 'openapi.yaml');
const stdDir = join(vaultDir, 'sources', 'testing-specs');

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

const uncovered = operationIds.filter((id) => {
  // A scenario section is a markdown heading containing the operationId,
  // e.g. "## createCheckout" — matches the convention in std-checkout.md.
  const headingPattern = new RegExp(`^#{1,6}\\s*${id}\\b`, 'm');
  return !headingPattern.test(stdText);
});

if (uncovered.length > 0) {
  console.error(`Uncovered operations (no STD scenario found): ${uncovered.join(', ')}`);
  process.exit(1);
}

console.log(`All ${operationIds.length} contract operations have at least one STD scenario.`);
