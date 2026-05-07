#!/usr/bin/env node
/* eslint-disable */
/**
 * Eval runner for nextjs-modernizer.
 *
 * Validates the catalog regexes against the deliberate fixture by:
 *   1. Running each BC-NNN regex from the catalog over every relevant file in the fixture
 *   2. Emitting actual findings as: BC-ID<TAB>file<TAB>line
 *   3. Diffing against evals/expected/findings.txt
 *
 * Exit 0 on match, 1 on mismatch. CI-friendly. Pure Node, no deps.
 */

const fs = require('node:fs');
const path = require('node:path');

const SKILL_DIR = path.resolve(__dirname, '..');
const FIXTURE_DIR = path.join(SKILL_DIR, 'evals/fixtures/next14-app');
const EXPECTED_FILE = path.join(SKILL_DIR, 'evals/expected/findings.txt');

// Catalog patterns. Must stay in sync with
// references/next-14-to-15-breaking-changes.md.
// Detection regexes are line-by-line (the skill scans similarly).
const PATTERNS = [
  ['BC-001', /\bcookies\s*\(\s*\)\s*\.(get|getAll|has|set|delete)/],
  ['BC-002', /\bheaders\s*\(\s*\)\s*\.(get|has|forEach|entries|keys|values)/],
  ['BC-003', /\bdraftMode\s*\(\s*\)\s*\.(isEnabled|enable|disable)/],
  ['BC-004', /\b(?:params|searchParams)\s*:\s*\{\s*[a-zA-Z_$][\w$]*\s*[:,}]/],
  ['BC-101', /\bfetch\s*\(\s*['"`][^'"`]+['"`]\s*\)/],
  ['BC-102', /^\s*export\s+(?:async\s+)?function\s+GET\s*\(/],
  ['BC-201', /\bbundlePagesExternals\s*:/],
  ['BC-202', /\bserverComponentsExternalPackages\s*:/],
  ['BC-203', /\bruntime\s*[:=]\s*['"]experimental-edge['"]/],
  ['BC-301', /\b(?:request|req)\s*\.\s*(?:geo|ip)\b/],
  ['BC-302', /\bdomains\s*:\s*\[/],
];

const SOURCE_EXTS = new Set(['.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx']);
// next.config.{js,mjs,ts} is included via the same extension set above.

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.next') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (SOURCE_EXTS.has(path.extname(entry.name))) out.push(full);
  }
  return out;
}

function scan() {
  const findings = [];
  for (const file of walk(FIXTURE_DIR)) {
    const rel = path.relative(FIXTURE_DIR, file);
    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      for (const [id, regex] of PATTERNS) {
        if (regex.test(line)) findings.push({ id, file: rel, line: i + 1 });
      }
    }
  }
  return findings;
}

function serialize(findings) {
  return findings
    .slice()
    .sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line || a.id.localeCompare(b.id))
    .map((f) => `${f.id}\t${f.file}\t${f.line}`)
    .join('\n');
}

function loadExpected() {
  return fs
    .readFileSync(EXPECTED_FILE, 'utf8')
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith('#'))
    .sort((a, b) => {
      const [, fa, la] = a.split('\t');
      const [, fb, lb] = b.split('\t');
      return fa.localeCompare(fb) || Number(la) - Number(lb);
    })
    .join('\n');
}

const actual = serialize(scan());
const expected = loadExpected();

if (actual === expected) {
  const count = actual.split('\n').filter(Boolean).length;
  console.log(`✅ nextjs-modernizer eval PASSED (${count} findings match expected)`);
  process.exit(0);
}

console.log('❌ nextjs-modernizer eval FAILED');
console.log('--- expected ---');
console.log(expected);
console.log('--- actual ---');
console.log(actual);
process.exit(1);
