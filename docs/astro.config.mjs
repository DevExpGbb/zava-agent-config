// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

const REPO = 'DevExpGbb/zava-agent-config';

export default defineConfig({
  site: 'https://devexpgbb.github.io',
  base: '/zava-agent-config',
  trailingSlash: 'always',
  integrations: [
    starlight({
      title: 'Zava IDP',
      description:
        'Internal Developer Portal for the Zava Agentic SDLC — the marketplace of skills, personas and instructions every Zava service repo pins via apm.yml.',
      logo: { src: './src/assets/zava.svg' },
      favicon: '/favicon.svg',
      social: [
        { icon: 'github', label: 'GitHub', href: `https://github.com/${REPO}` },
      ],
      customCss: ['./src/styles/custom.css'],
      editLink: {
        baseUrl: `https://github.com/${REPO}/edit/main/docs/`,
      },
      lastUpdated: true,
      sidebar: [
        {
          label: 'Start here',
          items: [
            { label: 'Welcome', link: '/' },
            { label: 'Provision a service', link: '/provision/', badge: 'Golden path' },
            { label: 'Quick start', link: '/quick-start/' },
            { label: 'Install patterns', link: '/install/' },
          ],
        },
        {
          label: 'Catalog',
          items: [{ label: 'Browse all plugins', link: '/catalog/' }],
        },
        {
          label: 'SDLC phases',
          collapsed: false,
          items: [
            { label: 'Ideate', link: '/sdlc/ideate/' },
            { label: 'Plan',   link: '/sdlc/plan/' },
            { label: 'Code',   link: '/sdlc/code/' },
            { label: 'Build',  link: '/sdlc/build/' },
            { label: 'Test',   link: '/sdlc/test/' },
            { label: 'Review', link: '/sdlc/review/' },
            { label: 'Release',link: '/sdlc/release/' },
            { label: 'Operate',link: '/sdlc/operate/' },
          ],
        },
        {
          label: 'Tiers',
          collapsed: true,
          items: [
            { label: 'Foundation',   link: '/tiers/foundation/' },
            { label: 'Phase kits',   link: '/tiers/phase-kits/' },
            { label: 'Accelerators', link: '/tiers/accelerators/' },
          ],
        },
        {
          label: 'Plugins',
          collapsed: true,
          items: [
            { label: 'secure-baseline', link: '/catalog/secure-baseline/' },
            { label: 'provision-kit',   link: '/catalog/provision-kit/' },
            { label: 'ideate-kit',      link: '/catalog/ideate-kit/' },
            { label: 'code-kit',        link: '/catalog/code-kit/' },
            { label: 'review-kit',      link: '/catalog/review-kit/' },
            { label: 'release-kit',     link: '/catalog/release-kit/' },
            { label: 'operate-kit',     link: '/catalog/operate-kit/' },
            { label: 'modernize-kit',   link: '/catalog/modernize-kit/' },
          ],
        },
        {
          label: 'Governance',
          items: [
            { label: 'Consumption patterns', link: '/governance/consumption-patterns/' },
            { label: 'Policy in force',      link: '/governance/policy/' },
          ],
        },
      ],
    }),
  ],
});
