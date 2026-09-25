// @ts-check
import { rm } from 'node:fs/promises';
import { satteri } from '@astrojs/markdown-satteri';
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';

// Until DNS is cut over, the site previews from the project page URL, which is
// served from a subdirectory. Set PANZEA_BASE=/panzea_landing_page for that
// build; the production build at www.panzea.org needs no base.
const base = process.env.PANZEA_BASE || undefined;
const site = process.env.PANZEA_SITE || 'https://www.panzea.org';

/**
 * public/CNAME claims the custom domain. Shipping it in a preview build would
 * point Pages at www.panzea.org before DNS is ready, so drop it when a base
 * path is set.
 * @type {import('astro').AstroIntegration}
 */
const cnameOnlyInProduction = {
  name: 'panzea:cname-only-in-production',
  hooks: {
    'astro:build:done': async ({ dir, logger }) => {
      if (!base) return;
      await rm(new URL('CNAME', dir), { force: true });
      logger.info('preview build: removed CNAME so the custom domain is not claimed');
    },
  },
};

const basePrefix = (base ?? '').replace(/\/+$/, '');

/**
 * Site-root links in Markdown content collections bypass src/lib/url.ts, so
 * prefix them with the base here. Mirrors withBase() in src/lib/markdown.ts.
 */
const baseLinks = basePrefix ? {
  name: 'panzea:base-links',
  element: {
    filter: [],
    /** @param {any} node @param {import('satteri').HastVisitorContext} ctx */
    visit(node, ctx) {
      for (const attr of ['href', 'src']) {
        const value = node.properties?.[attr];
        if (typeof value === 'string' && value.startsWith('/') && !value.startsWith('//')) {
          ctx.setProperty(node, attr, `${basePrefix}${value}`);
        }
      }
    },
  },
} : null;

export default defineConfig({
  site,
  base,
  trailingSlash: 'ignore',
  build: { format: 'file' },
  integrations: [sitemap(), cnameOnlyInProduction],
  markdown: { processor: satteri({ hastPlugins: [baseLinks] }) },
  redirects: {
    // The old site shipped the people directory under two URLs.
    '/people2': `${basePrefix}/allpeople`,
  },
});
