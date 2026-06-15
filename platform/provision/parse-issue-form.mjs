#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Parse a rendered GitHub Issue Form body (from the "Provision a new service"
// template) into provisioning inputs. No third-party action — keeps the APM
// supply-chain story clean.
//
// Reads the issue body from $ISSUE_BODY, writes GITHUB_OUTPUT-style key/value
// lines to stdout (heredoc-delimited so values are injection-safe):
//   valid=true|false
//   name=<zava-...>        (normalised, zava- prefix enforced)
//   region=<allowlisted>   (defaults to eastus)
//   owner=<single line>
//   error=<message>        (only when valid=false)
//
// Usage in CI:  node platform/provision/parse-issue-form.mjs >> "$GITHUB_OUTPUT"
// ─────────────────────────────────────────────────────────────────────────────

const REGIONS = ['eastus', 'eastus2', 'westus3', 'westeurope', 'northeurope'];
const NAME_RE = /^zava-[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;

function out(key, value) {
  const delim = `__EOF_${Math.random().toString(36).slice(2)}__`;
  process.stdout.write(`${key}<<${delim}\n${String(value)}\n${delim}\n`);
}

function sectionsFromBody(body) {
  const lines = body.replace(/\r\n/g, '\n').split('\n');
  const map = {};
  let key = null;
  let buf = [];
  const flush = () => {
    if (key !== null) map[key] = buf.join('\n').trim();
  };
  for (const line of lines) {
    const m = line.match(/^###\s+(.+?)\s*$/);
    if (m) {
      flush();
      key = m[1].toLowerCase().replace(/\s+/g, ' ').trim();
      buf = [];
    } else if (key !== null) {
      buf.push(line);
    }
  }
  flush();
  return map;
}

function value(map, heading) {
  const v = map[heading];
  if (!v || v === '_No response_') return '';
  return v;
}

function normaliseName(raw) {
  let name = (raw || '').toLowerCase().trim();
  name = name.replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '');
  if (!name) return '';
  if (!name.startsWith('zava-')) name = `zava-${name}`;
  return name;
}

function main() {
  const body = process.env.ISSUE_BODY || '';
  const map = sectionsFromBody(body);

  const name = normaliseName(value(map, 'service name'));
  const owner = value(map, 'owning team / contact').split('\n')[0].slice(0, 200);

  let region = value(map, 'azure region').toLowerCase().trim();
  if (!region) region = 'eastus';

  if (!name || name === 'zava-' || !NAME_RE.test(name) || name.length > 40) {
    out('valid', 'false');
    out('error', `Could not read a valid service name. Provide a lowercase kebab-case name (e.g. \`zava-orders\`); got \`${name || '(empty)'}\`.`);
    return;
  }
  if (!REGIONS.includes(region)) {
    out('valid', 'false');
    out('error', `Unsupported region \`${region}\`. Choose one of: ${REGIONS.join(', ')}.`);
    return;
  }

  out('valid', 'true');
  out('name', name);
  out('region', region);
  out('owner', owner);
}

main();
