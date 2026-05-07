#!/usr/bin/env node
/* eslint-disable */
/**
 * Eval runner for framework-modernizer.
 *
 * Validates the catalog regexes against the deliberate fixture by:
 *   1. Running each BC-NNN regex from the catalog over every JS file in the fixture
 *   2. Emitting actual findings as: BC-ID<TAB>file<TAB>line
 *   3. Diffing against evals/expected/findings.txt
 *
 * Exit 0 on match, 1 on mismatch. CI-friendly. Pure Node, no deps.
 */

const fs = require('node:fs');
const path = require('node:path');

const SKILL_DIR = path.resolve(__dirname, '..');
const FIXTURE_DIR = path.join(SKILL_DIR, 'evals/fixtures/express4-app');
const EXPECTED_FILE = path.join(SKILL_DIR, 'evals/expected/findings.txt');

// Catalog patterns. Must stay in sync with
// references/express-4-to-5-breaking-changes.md.
// Detection regexes are line-by-line (the skill scans similarly).
const PATTERNS = [
  ['BC-001', /\bapp\.del\s*\(/],
  ['BC-002', /\bres\.send\s*\(\s*\d{3}\s*\)/],
  ['BC-006', /\bres\.redirect\s*\(\s*['"]back['"]\s*\)/],
  ['BC-007', /\bres\.sendfile\s*\(/],
  ['BC-101', /\.(?:get|post|put|patch|delete|all|use)\s*\(\s*['"][^'"]*\*(?![a-zA-Z_])[^'"]*['"]/],
  ['BC-102', /\.(?:get|post|put|patch|delete|all|use)\s*\(\s*['"][^'"]*:[a-zA-Z_]\w*\?[^'"]*['"]/],
  ['BC-201', /express\.urlencoded\s*\(\s*\)/],
  ['BC-202', /express\.static\s*\(/],
];

const SOURCE_EXTS = new Set(['.js', '.mjs', '.cjs', '.ts']);

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules') continue;
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
  console.log(`✅ framework-modernizer eval PASSED (${count} findings match expected)`);
  process.exit(0);
}

console.log('❌ framework-modernizer eval FAILED');
console.log('--- expected ---');
console.log(expected);
console.log('--- actual ---');
console.log(actual);
process.exit(1);
