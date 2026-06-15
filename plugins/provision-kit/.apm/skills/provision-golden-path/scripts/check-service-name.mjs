#!/usr/bin/env node
// ----------------------------------------------------------------------------
// check-service-name.mjs
//
// Pre-validate a requested Zava service name (and optional region) BEFORE the
// skill files a provisioning issue. Mirrors the authoritative CI parser in
// platform/provision/parse-issue-form.mjs so the developer gets the same
// verdict the workflow would, without a round-trip.
//
// NON-INTERACTIVE. Emits a single JSON object on stdout; diagnostics on stderr.
//
// Usage:
//   node check-service-name.mjs <raw-name> [region]
//   node check-service-name.mjs --help
//
// Output (stdout, JSON):
//   { "valid": true,  "name": "zava-orders", "region": "eastus" }
//   { "valid": false, "name": "zava-", "region": "eastus",
//     "error": "Could not read a valid service name. ..." }
//
// Exit code: 0 when valid, 1 when invalid (so callers can branch on $?).
//
// DRIFT NOTE: the regex / region allowlist / normalization below MUST stay in
// lockstep with platform/provision/parse-issue-form.mjs. If that parser
// changes, update this script (or extract a shared module).
// ----------------------------------------------------------------------------

const REGIONS = ['eastus', 'eastus2', 'westus3', 'westeurope', 'northeurope'];
const NAME_RE = /^zava-[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;
const DEFAULT_REGION = 'eastus';
const MAX_LEN = 40;

function normaliseName(raw) {
  let name = (raw || '').toLowerCase().trim();
  name = name.replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '');
  if (!name) return '';
  if (!name.startsWith('zava-')) name = `zava-${name}`;
  return name;
}

function help() {
  process.stderr.write(
    'check-service-name.mjs - pre-validate a Zava service name + region\n\n' +
    'Usage:\n' +
    '  node check-service-name.mjs <raw-name> [region]\n' +
    '  node check-service-name.mjs --help\n\n' +
    'Prints a JSON verdict on stdout. Exit 0 = valid, 1 = invalid.\n' +
    `Regions: ${REGIONS.join(', ')} (default ${DEFAULT_REGION}).\n` +
    'Name rule: lowercase kebab-case, zava- prefix (added if omitted), <= ' +
    `${MAX_LEN} chars.\n`,
  );
}

function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    help();
    process.exit(args.length === 0 ? 1 : 0);
  }

  const rawName = args[0];
  const rawRegion = (args[1] || '').toLowerCase().trim();
  const name = normaliseName(rawName);
  const region = rawRegion || DEFAULT_REGION;

  let result;
  if (!name || name === 'zava-' || !NAME_RE.test(name) || name.length > MAX_LEN) {
    result = {
      valid: false,
      name,
      region,
      error:
        'Could not read a valid service name. Provide a lowercase kebab-case ' +
        `name (e.g. zava-orders); got "${name || '(empty)'}". Max ${MAX_LEN} chars.`,
    };
  } else if (!REGIONS.includes(region)) {
    result = {
      valid: false,
      name,
      region,
      error: `Unsupported region "${region}". Choose one of: ${REGIONS.join(', ')}.`,
    };
  } else {
    result = { valid: true, name, region };
  }

  process.stdout.write(`${JSON.stringify(result)}\n`);
  process.exit(result.valid ? 0 : 1);
}

main();
