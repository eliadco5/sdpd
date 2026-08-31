#!/usr/bin/env node
// Dispatcher so the command the docs describe ("sdpd fetch", "sdpd resolve",
// ...) is a real command, not shorthand for "node scripts/sdpd-fetch.mjs".
// Thin by design: forwards to the individual scripts, no logic of its own.
//
// Usage: node scripts/sdpd.mjs <resolve|fetch|coverage|readiness> [...args]
// Or, via package.json: npm run sdpd -- <command> [...args]

import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const COMMANDS = {
  resolve: 'sdpd-resolve.mjs',
  fetch: 'sdpd-fetch.mjs',
  coverage: 'check-coverage.mjs',
  readiness: 'sdpd-readiness.mjs',
};

const [command, ...rest] = process.argv.slice(2);
const scriptName = COMMANDS[command];

if (!scriptName) {
  console.error(`Usage: node scripts/sdpd.mjs <${Object.keys(COMMANDS).join('|')}> [...args]`);
  process.exit(2);
}

const scriptPath = join(dirname(fileURLToPath(import.meta.url)), scriptName);

try {
  execFileSync(process.execPath, [scriptPath, ...rest], { stdio: 'inherit' });
} catch (err) {
  process.exit(err.status ?? 1);
}
