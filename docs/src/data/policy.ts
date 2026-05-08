/**
 * Build-time loader for the org-wide APM policy that governs every Zava repo.
 *
 * The canonical source is DevExpGbb/.github/apm-policy.yml (auto-discovered
 * by `apm install` and `apm audit --ci` via GitHub's `.github` default-config
 * pattern). We fetch the live file at build time so this site re-renders the
 * current policy whenever the docs site rebuilds (the deploy workflow runs on
 * any change to docs/, plugins/, .claude-plugin/ or apm.yml — and on a daily
 * cron so policy drift on the org repo also gets picked up).
 *
 * If the live fetch fails (offline dev, GitHub blip), we fall back to the
 * last-known snapshot at src/data/policy-snapshot.yml so builds stay hermetic.
 */

import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';

export const POLICY_REPO = 'DevExpGbb/.github';
export const POLICY_FILE_PATH = 'apm-policy.yml';
export const POLICY_BLOB_URL = `https://github.com/${POLICY_REPO}/blob/main/${POLICY_FILE_PATH}`;
export const POLICY_RAW_URL = `https://raw.githubusercontent.com/${POLICY_REPO}/main/${POLICY_FILE_PATH}`;
export const POLICY_REFERENCE_URL =
  'https://microsoft.github.io/apm/enterprise/policy-reference/';
export const POLICY_CI_GUIDE_URL =
  'https://microsoft.github.io/apm/guides/ci-policy-setup/';
export const POLICY_EXCEPTION_NEW_ISSUE_URL = `https://github.com/${POLICY_REPO}/issues/new?labels=apm-policy-exception&title=Policy+exception+request&body=${encodeURIComponent(
  [
    '### Repo requesting the exception',
    '',
    '`<owner>/<repo>`',
    '',
    '### Rule the policy is blocking',
    '',
    '- [ ] `dependency-allowlist` (a package outside `DevExpGbb/**`/`microsoft/**`/`github/**`)',
    '- [ ] `dependency-denylist` (an explicitly blocked package)',
    '- [ ] `required-packages` (you cannot pin `secure-baseline`)',
    '- [ ] `mcp-allowlist` / `mcp-denylist`',
    '- [ ] `mcp-self-defined`',
    '- [ ] `compilation-target` / `compilation-strategy`',
    '- [ ] `manifest.scripts` / `required-manifest-fields`',
    '- [ ] `unmanaged-files`',
    '- [ ] Other (describe below)',
    '',
    '### Audit output',
    '',
    'Paste the failing `apm audit --ci` output here.',
    '',
    '```',
    '',
    '```',
    '',
    '### Business justification',
    '',
    'Why does Zava need this? What is the security/compliance trade-off?',
    '',
    '### Proposed scope',
    '',
    '- [ ] Permanent (update `apm-policy.yml`)',
    '- [ ] Time-boxed (until: YYYY-MM-DD)',
    '- [ ] Per-repo bypass via `apm install --no-policy` (one-shot)',
    '',
    '### Mitigations',
    '',
    'What controls offset the risk? (review burden, alerting, manual approval, etc.)',
    '',
    '/cc @DevExpGbb/platform-governance',
  ].join('\n'),
)}`;

export type Enforcement = 'off' | 'warn' | 'block';
export type Severity = 'allow' | 'warn' | 'deny';

export interface RawPolicy {
  name?: string;
  version?: string;
  enforcement?: Enforcement;
  fetch_failure?: 'warn' | 'block';
  cache?: { ttl?: number };
  dependencies?: {
    allow?: string[];
    deny?: string[];
    require?: string[];
    require_resolution?: 'project-wins' | 'policy-wins' | 'block';
    max_depth?: number;
  };
  mcp?: {
    allow?: string[];
    deny?: string[];
    transport?: { allow?: string[] };
    self_defined?: Severity;
    trust_transitive?: boolean;
  };
  compilation?: {
    target?: { allow?: string[]; enforce?: string };
    strategy?: { enforce?: 'distributed' | 'single-file' | null };
    source_attribution?: boolean;
  };
  manifest?: {
    required_fields?: string[];
    scripts?: 'allow' | 'deny';
    content_types?: { allow?: string[] };
  };
  unmanaged_files?: {
    action?: 'ignore' | 'warn' | 'deny';
    directories?: string[];
  };
}

const SNAPSHOT_PATH = path.join(
  process.cwd(),
  'src',
  'data',
  'policy-snapshot.yml',
);

async function fetchLive(): Promise<string | null> {
  try {
    const res = await fetch(POLICY_RAW_URL, {
      headers: { Accept: 'text/plain' },
    });
    if (!res.ok) {
      console.warn(`[policy] ${POLICY_RAW_URL} -> HTTP ${res.status}`);
      return null;
    }
    return await res.text();
  } catch (err) {
    console.warn(`[policy] live fetch failed: ${err}`);
    return null;
  }
}

async function loadPolicy(): Promise<{ raw: RawPolicy; source: 'live' | 'snapshot'; text: string }> {
  const live = await fetchLive();
  if (live) {
    try {
      fs.mkdirSync(path.dirname(SNAPSHOT_PATH), { recursive: true });
      fs.writeFileSync(SNAPSHOT_PATH, live);
    } catch {
      /* non-fatal */
    }
    return { raw: yaml.load(live) as RawPolicy, source: 'live', text: live };
  }
  if (fs.existsSync(SNAPSHOT_PATH)) {
    const text = fs.readFileSync(SNAPSHOT_PATH, 'utf8');
    console.warn(`[policy] using cached snapshot at ${SNAPSHOT_PATH}`);
    return { raw: yaml.load(text) as RawPolicy, source: 'snapshot', text };
  }
  throw new Error(
    `Could not load APM policy from ${POLICY_RAW_URL} and no snapshot at ${SNAPSHOT_PATH}.`,
  );
}

const loaded = await loadPolicy();

export const policy: RawPolicy = loaded.raw;
export const policySource: 'live' | 'snapshot' = loaded.source;
export const policyYaml: string = loaded.text;

/* ------------------------------------------------------------------ *
 *  Derived, dev-friendly views — used by the policy page to answer   *
 *  "so what does this mean for me?" rather than dumping raw YAML.    *
 * ------------------------------------------------------------------ */

export interface PolicyImpact {
  /** Short human label, e.g. "Where you can pull packages from" */
  area: string;
  /** What the rule says, in one line. */
  rule: string;
  /** Concrete dev-facing impact — what happens if you violate it. */
  impact: string;
  /** Severity level for visual cue. */
  severity: 'block' | 'warn' | 'info';
}

export const ENFORCEMENT: Enforcement = policy.enforcement ?? 'warn';

function fmt(list?: string[] | null): string {
  if (!list || list.length === 0) return '_(none)_';
  return list.map((p) => `\`${p}\``).join(', ');
}

export const POLICY_IMPACTS: PolicyImpact[] = [
  {
    area: 'Where you can pull packages from',
    rule: `Allowed sources: ${fmt(policy.dependencies?.allow)}.`,
    impact:
      'Any dependency in `apm.yml` outside the allow list is blocked at install time. Use the exception request flow if you need a third-party package.',
    severity: ENFORCEMENT === 'block' ? 'block' : 'warn',
  },
  {
    area: 'Explicitly blocked packages',
    rule: `Blocked: ${fmt(policy.dependencies?.deny)}.`,
    impact:
      'These packages will never resolve — even if they sit inside an allowed org. Deny always wins over allow.',
    severity: 'block',
  },
  {
    area: 'Required baseline',
    rule: `Every repo must depend on: ${fmt(policy.dependencies?.require)}.`,
    impact:
      'Drop `secure-baseline` from your `apm.yml` and CI fails on the `required-packages` check. The site catalogues it as the **Foundation** tier for that reason.',
    severity: 'block',
  },
  {
    area: 'Version conflicts on required packages',
    rule: `Resolution mode: \`${policy.dependencies?.require_resolution ?? 'project-wins'}\`.`,
    impact:
      policy.dependencies?.require_resolution === 'project-wins'
        ? 'You can pin a newer version of `secure-baseline` than the policy mandates — your pin wins. Useful for canarying.'
        : policy.dependencies?.require_resolution === 'policy-wins'
        ? 'The policy version overrides any pin you put in `apm.yml` for required packages.'
        : 'Any version mismatch on a required package fails CI.',
    severity: 'info',
  },
  {
    area: 'MCP servers you can use',
    rule: `Allowed: ${fmt(policy.mcp?.allow)}.`,
    impact:
      'MCP servers from packages or your `mcp_servers:` block must match this allow list. Anything else is rejected at install time.',
    severity: ENFORCEMENT === 'block' ? 'block' : 'warn',
  },
  {
    area: 'MCP transports',
    rule: `Allowed transports: ${fmt(policy.mcp?.transport?.allow)}.`,
    impact:
      'Servers using disallowed transports (e.g. raw `sse`) fail audit even if their name is on the allow list.',
    severity: 'block',
  },
  {
    area: 'Self-defined MCP servers (in your repo, not from a package)',
    rule: `Severity: \`${policy.mcp?.self_defined ?? 'warn'}\`.`,
    impact:
      policy.mcp?.self_defined === 'deny'
        ? 'You cannot declare ad-hoc MCP servers in `apm.yml` — they must come from an approved package.'
        : policy.mcp?.self_defined === 'warn'
        ? 'Declaring ad-hoc MCP servers in `apm.yml` produces a warning. Prefer publishing them as a vendored plugin under this marketplace.'
        : 'Self-defined MCP servers are permitted.',
    severity: policy.mcp?.self_defined === 'deny' ? 'block' : 'warn',
  },
  {
    area: 'Trusting MCP servers from transitive deps',
    rule: `\`trust_transitive: ${policy.mcp?.trust_transitive ?? false}\`.`,
    impact:
      policy.mcp?.trust_transitive
        ? 'MCP servers declared by transitive packages are inherited automatically.'
        : 'Only MCP servers declared by your **direct** dependencies activate. Anything deeper is ignored — supply-chain protection.',
    severity: 'info',
  },
  {
    area: 'Compilation targets',
    rule: `Allowed: ${fmt(policy.compilation?.target?.allow)}.`,
    impact:
      'Your `apm.yml` `target:` list must be a subset of the allow list. Targeting an unsupported runtime (e.g. a non-approved IDE) fails audit.',
    severity: 'block',
  },
  {
    area: 'Compilation strategy',
    rule: `Enforced: \`${policy.compilation?.strategy?.enforce ?? 'any'}\`.`,
    impact:
      policy.compilation?.strategy?.enforce === 'distributed'
        ? 'You must compile to per-target directories, not a monolithic single-file output. Keeps personas/skills hot-reloadable per IDE.'
        : policy.compilation?.strategy?.enforce === 'single-file'
        ? 'You must compile to a single combined file — the org has chosen monolithic distribution.'
        : 'Either compilation strategy is permitted.',
    severity: 'info',
  },
  {
    area: 'Source attribution',
    rule: `Required: \`${policy.compilation?.source_attribution ?? false}\`.`,
    impact:
      policy.compilation?.source_attribution
        ? 'Compiled output must annotate where each primitive came from. Your build will refuse to emit untraceable artefacts — protects audit trails.'
        : 'Source attribution comments are optional.',
    severity: 'info',
  },
  {
    area: 'Required `apm.yml` fields',
    rule: `Required: ${fmt(policy.manifest?.required_fields)}.`,
    impact:
      'Missing or empty fields fail CI. Set them once when you scaffold; the audit only re-checks on change.',
    severity: 'block',
  },
  {
    area: '`scripts:` section in `apm.yml`',
    rule: `\`${policy.manifest?.scripts ?? 'allow'}\`.`,
    impact:
      policy.manifest?.scripts === 'deny'
        ? 'You cannot ship arbitrary lifecycle scripts in `apm.yml`. Move automation into your CI workflow.'
        : 'Lifecycle scripts in `apm.yml` are permitted.',
    severity: policy.manifest?.scripts === 'deny' ? 'block' : 'info',
  },
  {
    area: 'Allowed content types in packages',
    rule: `Allowed: ${fmt(policy.manifest?.content_types?.allow)}.`,
    impact:
      'A package whose `content_types:` includes anything not on this list (e.g. an experimental `agent-binary` type) fails audit at consumer side.',
    severity: 'warn',
  },
  {
    area: 'Hand-edited governance directories',
    rule: `Action: \`${policy.unmanaged_files?.action ?? 'ignore'}\` for ${fmt(
      policy.unmanaged_files?.directories,
    )}.`,
    impact:
      policy.unmanaged_files?.action === 'deny'
        ? 'Files in those paths that APM did not deploy fail CI. Treat the directories as APM-managed only — put hand-written content elsewhere or wrap it in a plugin.'
        : policy.unmanaged_files?.action === 'warn'
        ? 'Hand-edited files in those paths trigger a warning on every audit. Long-term: package them.'
        : 'No check is performed.',
    severity:
      policy.unmanaged_files?.action === 'deny'
        ? 'block'
        : policy.unmanaged_files?.action === 'warn'
        ? 'warn'
        : 'info',
  },
];

/** A short headline for the chip / banner: "Org policy v2 (block) — N rules". */
export const POLICY_HEADLINE = `${policy.name ?? 'Org APM policy'} · v${
  policy.version ?? '?'
} · enforcement: ${ENFORCEMENT}`;
