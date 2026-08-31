// Shared by check-coverage.mjs and sdpd-readiness.mjs: turn a test report
// into a set of passing test names/ids. Accepts either JUnit XML
// (<testcase name="..."/> without a nested <failure>/<error>) or a plain
// JSON array/object of passing test names — deliberately permissive since
// "what CI produces" varies per stack. No external deps.

export function extractPassingIds(reportText) {
  const passing = new Set();
  // The attribute-tail segment excludes "/" as well as ">" — otherwise its
  // greedy [^>]* can consume a self-closing tag's "/", forcing the "/>"
  // alternative to fail and falling through to the "open tag ... </testcase>"
  // branch, which then gobbles forward to the next *unrelated* </testcase>
  // in the document.
  const testcaseRe = /<testcase\b[^>]*\bname="([^"]+)"[^/>]*(\/>|>[\s\S]*?<\/testcase>)/g;
  let match;
  let sawXml = false;
  while ((match = testcaseRe.exec(reportText))) {
    sawXml = true;
    const [, name, rest] = match;
    const failed = /<(failure|error)\b/.test(rest);
    if (!failed) passing.add(name);
  }
  if (!sawXml) {
    try {
      const json = JSON.parse(reportText);
      const entries = Array.isArray(json) ? json : Object.values(json);
      for (const entry of entries) {
        if (typeof entry === 'string') passing.add(entry);
        else if (entry && (entry.status === 'passed' || entry.passed === true)) passing.add(entry.name ?? entry.id);
      }
    } catch {
      // Not JSON either — treated as zero passing tests, which surfaces as
      // every scenario ID uncovered rather than a silent pass.
    }
  }
  return passing;
}

// Scenario IDs look like STD-101-createCheckout-01 — epic number, operation,
// ordinal. See vault-template/sources/testing-specs/**/std.md.
export function extractScenarioIds(stdText) {
  const ids = new Set();
  for (const match of stdText.matchAll(/\bSTD-[A-Za-z0-9]+-[A-Za-z0-9]+-\d+\b/g)) {
    ids.add(match[0]);
  }
  return [...ids];
}

export function isPassing(passing, scenarioId) {
  for (const name of passing) if (name.includes(scenarioId)) return true;
  return false;
}
