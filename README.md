# panzea.org

The Panzea (Maize Diversity Project) website, rebuilt as a static [Astro](https://astro.build)
site and deployed to GitHub Pages. It replaces the Wix site that served
`www.panzea.org` and keeps every published URL working.

Everything the old site depended on — 57 people, 301 publications, 160 PDFs and
79 images that lived on the Wix CDN — now lives in this repository, so the site
survives cancelling the Wix subscription.

## Quick start

```bash
npm ci
npm run dev      # http://localhost:4321
```

| Script               | What it does                                                    |
| -------------------- | --------------------------------------------------------------- |
| `npm run dev`        | Dev server with hot reload                                        |
| `npm run build`      | Static build into `dist/`                                         |
| `npm run preview`    | Serve the built `dist/` locally                                   |
| `npm run check`      | Astro + TypeScript diagnostics                                    |
| `npm run verify`     | Checks every legacy URL, internal link and PDF still resolves     |
| `npm run a11y`       | axe-core WCAG 2.1 AA audit at desktop and mobile widths           |
| `npm run screenshot` | Screenshots key pages into `.screenshots/` for visual review      |

`verify`, `a11y` and `screenshot` all run against `dist/`, so build first.

## How the content is organised

```
src/content/
  pages/<slug>.md          prose pages; the file name is the URL
  people/<slug>.md         one file per person; the file name is the URL
  publications/<year>.yaml one file per year, newest entries first
  faqs.yaml                the FAQ list, in display order
  glossary.yaml            the glossary, in display order
src/data/
  nav.json                 the header menu tree
  site.json                site title, logo, footer notes
  labs.json                lab names and members without profile pages
src/assets/                images, optimised at build time by astro:assets
public/files/publications/ publication PDFs, served as-is
```

Routing mirrors the old site: `src/pages/[slug].astro` serves prose pages,
people profiles and the role/lab roster pages from the site root, so
`/about_us`, `/edward-buckler` and `/pis` all keep the addresses they had on
Wix. `scripts/legacy-urls.txt` is the list `npm run verify` enforces.

### Add a person

Create `src/content/people/<url-slug>.md`:

```markdown
---
name: 'Jane Maize'
role: 'Postdoctoral Associate'
affiliation:
  - 'Cornell University'
location: 'Ithaca, NY'
email: 'jm123@cornell.edu'
photo: '../../assets/people/jane-maize.jpg'
groups: ['postdoc'] # pi | postdoc | grad | staff | former
labs: ['buckler'] # buckler | doebley | flint-garcia | ware
contact:
  - 'Institute for Genomic Diversity'
  - '175 Biotechnology Building'
---

Bio text in Markdown. Everything here renders on the profile page.
```

Put the photo in `src/assets/people/` (roughly square, ~900 px wide is plenty).
The person appears automatically on `/allpeople`, on each `groups` page and on
each `labs` page. Omit `photo` and a card without an image is rendered.

### Add a publication

Append an entry to `src/content/publications/<year>.yaml`, creating the file if
the year is new:

```yaml
year: 2026
entries:
  - authors: 'Maize J, Buckler ES'
    title: 'A new look at rare alleles.'
    citation: 'Genetics 231 (2): 101-118.'
    doi: '10.1534/genetics.126.300001'
    pdf: 'maize-2026.pdf' # optional; file goes in public/files/publications/
    links: # optional
      - label: 'Link'
        href: 'https://example.org/article'
```

Years from 2009 onwards show on `/publications`; earlier years show on
`/publications-2002-earlier`.

### Add or edit a page

Create `src/content/pages/<url-slug>.md`. Only `title` is required:

```markdown
---
title: 'New page'
description: 'Shown in search results and link previews.'
navGroup: 'Data' # optional, for grouping
hero: '../../assets/pages/new-page-hero.jpg' # optional
cards: # optional grid of linked cards
  - title: 'Genotypes'
    href: '/genotypes'
    text: 'Short description.'
    image: '../../assets/pages/new-page-card-1.jpg'
---

Body copy in Markdown.
```

To show it in the header, add it to `src/data/nav.json`.

## Deploying

`.github/workflows/deploy.yml` builds and publishes on every push to `main`.
It runs `npm run verify` before deploying, so a broken legacy URL or dead
internal link fails the build rather than shipping.

### Repository visibility

**GitHub Pages does not work on private repositories for organisations on the
free plan**, and `maize-genetics` is on the free plan. The repository must be
public before Pages can serve the site. That is normal for a public-facing
site; there is nothing sensitive in here.

```bash
gh repo edit maize-genetics/panzea_landing_page --visibility public --accept-visibility-change-consequences
gh api -X POST repos/maize-genetics/panzea_landing_page/pages -f 'build_type=workflow'
```

### Previewing before DNS cutover

Set the repository variable `PANZEA_BASE` so the build works from the project
page URL, and the workflow will drop `public/CNAME` from the artifact so it does
not claim the custom domain early:

```bash
gh variable set PANZEA_BASE --body '/panzea_landing_page'
gh variable set PANZEA_SITE --body 'https://maize-genetics.github.io'
```

The preview then lives at `https://maize-genetics.github.io/panzea_landing_page/`.

### DNS cutover runbook

1. **Preview and sign off.** With `PANZEA_BASE` set, confirm the project page
   URL looks right and `npm run verify` passes in CI.
2. **Lower the Wix DNS TTL** to 300 seconds a day ahead, so a rollback is quick.
3. **Remove the preview variables** so the production build uses the root base
   and ships `CNAME`:
   ```bash
   gh variable delete PANZEA_BASE
   gh variable delete PANZEA_SITE
   ```
   Re-run the deploy workflow.
4. **Point DNS at GitHub Pages.** At the registrar that holds `panzea.org`:
   - `www` → `CNAME` → `maize-genetics.github.io`
   - apex `panzea.org` → four `A` records: `185.199.108.153`, `185.199.109.153`,
     `185.199.110.153`, `185.199.111.153`
   - apex `panzea.org` → four `AAAA` records: `2606:50c0:8000::153`,
     `2606:50c0:8001::153`, `2606:50c0:8002::153`, `2606:50c0:8003::153`
   (Confirm these against
   [GitHub's current apex IPs](https://docs.github.com/pages/configuring-a-custom-domain-for-your-github-pages-site)
   on the day; GitHub does change them.)
5. **Set the custom domain** in the repository's Pages settings to
   `www.panzea.org`, wait for the DNS check to pass, then tick **Enforce HTTPS**
   once the certificate is issued (usually under an hour).
6. **Verify** that `https://www.panzea.org/edward-buckler`,
   `/publications`, a PDF under `/files/publications/`, and `/people2`
   (which should redirect to `/allpeople`) all work.
7. **Cancel Wix** only after the site has served correctly from Pages for a few
   days.

## What changed from the Wix site

- **Genotype search tools retired.** `/genotype-search`,
  `/gbs-genotype-search` and `/enabling-genotype-searches` kept their
  explanatory text, but the embedded search ran on
  `cbsuss05.tc.cornell.edu`, which no longer responds. Those pages now carry a
  notice pointing at the flat-file downloads instead.
- **Wix store pages dropped.** `/shop` and twelve `/product-page/i-m-a-product*`
  URLs were unmodified Wix template placeholders and were not migrated.
- **`/people2` redirects to `/allpeople`** — they were duplicates.
- **iPlant mirror links now point at CyVerse**, which is where they redirected.
- **A handful of links that pointed at the home page by mistake** (for example
  "see all our Publications") now go where their text says.
- **Assets are local.** Images and publication PDFs are served from this
  repository rather than the Wix CDN.

External data still lives on Cornell's file gateway at
`cbsusrv04.tc.cornell.edu`; those links are unchanged.

## Re-running the migration

The one-off extraction scripts that read the crawled Wix HTML are not kept in
this repository — the content they produced is what matters, and it is now
edited by hand. If the Wix site ever needs to be re-read, everything needed is
described above in the content layout.
