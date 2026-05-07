/**
 * Build-time loader for the Zava marketplace catalog.
 *
 * Source of truth (in priority order):
 *   1. ../.claude-plugin/marketplace.json   — the plugin list & order
 *   2. ../apm.yml                            — top-level marketplace version
 *   3. ../plugins/<id>/apm.yml               — per-plugin version + description
 *   4. ../plugins/<id>/.claude-plugin/plugin.json  — keywords (drive tier/phase)
 *   5. ../plugins/<id>/.apm/{agents,skills,instructions,commands,hooks}
 *                                            — primitive inventory
 *
 * Editorial overrides for "Pin if you…" + "Pairs with" live in PLUGIN_NOTES
 * below; everything else is derived. Add a new plugin to the marketplace and
 * tag its keywords correctly and it will appear in the site automatically.
 */

import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';

/* The site lives under <repo>/docs and Astro always runs from that directory,
 * so the marketplace lives one level up. We walk a couple of levels just in
 * case (e.g. someone runs `astro` from the repo root via `npm --prefix`).    */
function findRepoRoot(): string {
  let cur = process.cwd();
  for (let i = 0; i < 4; i++) {
    if (fs.existsSync(path.join(cur, '.claude-plugin', 'marketplace.json'))) {
      return cur;
    }
    cur = path.dirname(cur);
  }
  throw new Error(
    'Could not locate .claude-plugin/marketplace.json walking up from ' +
      process.cwd(),
  );
}

const REPO_ROOT = findRepoRoot();

export const REPO = 'DevExpGbb/zava-agent-config';
export const REPO_URL = `https://github.com/${REPO}`;
export const POLICY_REPO = 'DevExpGbb/.github';
export const POLICY_FILE_URL =
  'https://github.com/DevExpGbb/.github/blob/main/apm-policy.yml';
export const POLICY_DOCS_URL =
  'https://microsoft.github.io/apm/guides/ci-policy-setup/';
export const APM_MARKETPLACE_DOCS_URL =
  'https://microsoft.github.io/apm/guides/marketplaces/';
export const APM_QUICKSTART_URL =
  'https://microsoft.github.io/apm/getting-started/quick-start/';

export type Tier = 'foundation' | 'phase' | 'accelerator';
export type Phase =
  | 'IDEATE'
  | 'PLAN'
  | 'CODE'
  | 'BUILD'
  | 'TEST'
  | 'REVIEW'
  | 'RELEASE'
  | 'OPERATE';

export interface Primitive {
  name: string;
  kind: 'persona' | 'skill' | 'instructions' | 'command' | 'hook';
  /** Repo-relative path. */
  path: string;
}

export interface Plugin {
  id: string;
  name: string;
  version: string;
  tier: Tier;
  phase?: Phase;
  description: string;
  /** Marketplace-level description (often shorter than apm.yml's). */
  marketplaceDescription: string;
  keywords: string[];
  /** Repo-relative source path. */
  source: string;
  primitives: Primitive[];
  pinIf: string;
  pairsWith: string[];
}

const PHASES_LIST: Phase[] = [
  'IDEATE', 'PLAN', 'CODE', 'BUILD', 'TEST', 'REVIEW', 'RELEASE', 'OPERATE',
];

export const PHASES: { id: Phase; label: string }[] = PHASES_LIST.map((p) => ({
  id: p,
  label: p[0] + p.slice(1).toLowerCase(),
}));

export const TIER_LABEL: Record<Tier, string> = {
  foundation: 'Foundation',
  phase: 'Phase kit',
  accelerator: 'Accelerator',
};

/* --------------------------------------------------------------------------
 * Editorial overrides — kept tiny so most of the catalog stays auto-derived.
 * Add an entry only when "Pin if you…" / "Pairs with" can't be inferred.
 * -------------------------------------------------------------------------- */
const PLUGIN_NOTES: Record<
  string,
  { pinIf?: string; pairsWith?: string[] }
> = {
  'secure-baseline': {
    pinIf:
      'You ship anything. Mandatory explicit pin for every Zava service — never satisfied transitively.',
    pairsWith: ['code-kit', 'review-kit', 'release-kit'],
  },
  'ideate-kit': {
    pinIf:
      'Your repo receives unstructured input (transcripts, voice notes, tickets) that should become tracked work.',
    pairsWith: ['secure-baseline'],
  },
  'code-kit': {
    pinIf: 'You want design-intent guidance during local authoring.',
    pairsWith: ['secure-baseline', 'review-kit'],
  },
  'review-kit': {
    pinIf:
      'You want a multi-perspective self-review of staged changes before push.',
    pairsWith: ['secure-baseline', 'code-kit'],
  },
  'release-kit': {
    pinIf:
      'You operate any CI/CD pipeline — reusable workflows, deploy gates, env promotion.',
    pairsWith: ['secure-baseline'],
  },
  'operate-kit': {
    pinIf:
      'You wire Azure SRE Agent findings into remediation pull requests.',
    pairsWith: ['secure-baseline'],
  },
  'modernize-kit': {
    pinIf:
      'You have a planned framework migration. Episodic — remove the pin once the migration completes.',
    pairsWith: ['secure-baseline'],
  },
};

/* --------------------------------------------------------------------------
 * Loaders
 * -------------------------------------------------------------------------- */

interface MarketplaceManifest {
  name: string;
  owner: { name: string; url?: string };
  plugins: { name: string; description: string; source: string }[];
}

function readJSON<T>(rel: string): T {
  return JSON.parse(
    fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8'),
  ) as T;
}

function readYAML<T>(rel: string): T {
  return yaml.load(
    fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8'),
  ) as T;
}

function tryReadJSON<T>(rel: string): T | undefined {
  const abs = path.join(REPO_ROOT, rel);
  if (!fs.existsSync(abs)) return undefined;
  return JSON.parse(fs.readFileSync(abs, 'utf8')) as T;
}

function inferTierAndPhase(
  keywords: string[],
): { tier: Tier; phase?: Phase } {
  const kw = keywords.map((k) => k.toLowerCase());
  if (kw.includes('accelerator')) return { tier: 'accelerator' };
  if (kw.includes('cross-cutting')) return { tier: 'foundation' };
  for (const phase of PHASES_LIST) {
    if (kw.includes(phase.toLowerCase())) return { tier: 'phase', phase };
  }
  return { tier: 'foundation' };
}

function listPrimitives(pluginRelPath: string): Primitive[] {
  const apmDir = path.join(REPO_ROOT, pluginRelPath, '.apm');
  if (!fs.existsSync(apmDir)) return [];
  const out: Primitive[] = [];

  const buckets: { dir: string; kind: Primitive['kind'] }[] = [
    { dir: 'agents',       kind: 'persona' },
    { dir: 'skills',       kind: 'skill' },
    { dir: 'instructions', kind: 'instructions' },
    { dir: 'commands',     kind: 'command' },
    { dir: 'hooks',        kind: 'hook' },
  ];

  for (const { dir, kind } of buckets) {
    const bucketPath = path.join(apmDir, dir);
    if (!fs.existsSync(bucketPath)) continue;
    for (const entry of fs.readdirSync(bucketPath, { withFileTypes: true })) {
      let name = entry.name;
      if (entry.isFile()) {
        // architect.agent.md → architect ; foo.instructions.md → foo
        name = name.replace(/\.(agent|instructions|command|hook)\.md$/, '');
        name = name.replace(/\.md$/, '');
      }
      out.push({
        name,
        kind,
        path: path.posix.join(pluginRelPath, '.apm', dir, entry.name),
      });
    }
  }

  return out;
}

/* --------------------------------------------------------------------------
 * Build the catalog
 * -------------------------------------------------------------------------- */

const marketplace = readJSON<MarketplaceManifest>(
  '.claude-plugin/marketplace.json',
);
const topLevelApm = readYAML<{ version: string }>('apm.yml');

export const VERSION = topLevelApm.version;
export const TAG = `v${VERSION}`;
export const MARKETPLACE_OWNER = marketplace.owner;

export const plugins: Plugin[] = marketplace.plugins.map((entry) => {
  const id = entry.name;
  const sourceRel = entry.source.replace(/^\.\//, '');

  const pluginApm = readYAML<{
    name: string;
    version: string;
    description: string;
  }>(path.posix.join(sourceRel, 'apm.yml'));

  const pluginJson = tryReadJSON<{ keywords?: string[] }>(
    path.posix.join(sourceRel, '.claude-plugin', 'plugin.json'),
  );
  const keywords = pluginJson?.keywords ?? [];

  const { tier, phase } = inferTierAndPhase(keywords);
  const notes = PLUGIN_NOTES[id] ?? {};

  return {
    id,
    name: pluginApm.name,
    version: pluginApm.version,
    description: pluginApm.description,
    marketplaceDescription: entry.description,
    keywords,
    tier,
    phase,
    source: sourceRel,
    primitives: listPrimitives(sourceRel),
    pinIf: notes.pinIf ?? entry.description,
    pairsWith: notes.pairsWith ?? [],
  };
});

/* --------------------------------------------------------------------------
 * Convenience selectors
 * -------------------------------------------------------------------------- */

export function getPlugin(id: string): Plugin {
  const p = plugins.find((x) => x.id === id);
  if (!p) throw new Error(`Unknown plugin: ${id}`);
  return p;
}

export function pluginsByPhase(phase: Phase): Plugin[] {
  return plugins.filter((p) => p.phase === phase);
}

export function pluginsByTier(tier: Tier): Plugin[] {
  return plugins.filter((p) => p.tier === tier);
}

export function phaseStatus(phase: Phase): 'covered' | 'roadmap' {
  return pluginsByPhase(phase).length > 0 ? 'covered' : 'roadmap';
}
