# Developer guide

This guide has the details for working on the panzea.org website. For a quick
start, see [README.md](README.md).

The old Wix site depended on 57 people, 301 publications, 160 PDFs and 79 images
stored on the Wix servers. All of that now lives in this repository, so the site
keeps working after the Wix subscription is canceled.

## Scripts

| Command              | What it does                                              |
| -------------------- | --------------------------------------------------------- |
| `npm run dev`        | Start a local server that reloads on changes              |
| `npm run build`      | Build the site into `dist/`                               |
| `npm run preview`    | Serve the built `dist/` folder locally                    |
| `npm run check`      | Run Astro and TypeScript checks                           |
| `npm run verify`     | Check that every old URL, internal link and PDF works     |
| `npm run a11y`       | Run an accessibility check (WCAG 2.1 AA) on desktop and mobile |
| `npm run screenshot` | Save screenshots of key pages into `.screenshots/`        |

`verify`, `a11y` and `screenshot` all use the `dist/` folder, so run
`npm run build` first.

## Editing content

### Add a person

Create `src/content/people/<url-slug>.md`. The file name becomes the page URL.

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

Bio text in Markdown. Everything here shows on the profile page.
```

Put the photo in `src/assets/people/`. A square photo about 900 px wide is
enough. The person shows up automatically on `/allpeople`, on each `groups`
page and on each `labs` page. If you leave out `photo`, the card shows without
an image.

### Add a publication

Add an entry to `src/content/publications/<year>.yaml`. If the year is new,
create the file.

```yaml
year: 2026
entries:
  - authors: 'Maize J, Buckler ES'
    title: 'A new look at rare alleles.'
    citation: 'Genetics 231 (2): 101-118.'
    doi: '10.1534/genetics.126.300001'
    pdf: 'maize-2026.pdf' # optional; put the file in public/files/publications/
    links: # optional
      - label: 'Link'
        href: 'https://example.org/article'
```

Years 2009 and later show on `/publications`. Earlier years show on
`/publications-2002-earlier`.

### Add or edit a page

Create `src/content/pages/<url-slug>.md`. Only `title` is required.

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

Body text in Markdown.
```

To add the page to the header menu, edit `src/data/nav.json`.

## Deploying

`.github/workflows/deploy.yml` builds and publishes the site on every push to
`main`. It runs `npm run verify` first, so a broken old URL or dead internal
link stops the deploy.

### Repository visibility

**GitHub Pages does not work on private repositories for organizations on the
free plan.** `maize-genetics` is on the free plan, so the repository must be
public. That is fine for a public website. Nothing in here is sensitive.

```bash
gh repo edit maize-genetics/panzea_landing_page --visibility public --accept-visibility-change-consequences
gh api -X POST repos/maize-genetics/panzea_landing_page/pages -f 'build_type=workflow'
```

### Preview before switching DNS

Set the repository variable `PANZEA_BASE` so the site builds for the project
page URL. The workflow then leaves out `public/CNAME` so it does not claim the
custom domain too early.

```bash
gh variable set PANZEA_BASE --body '/panzea_landing_page'
gh variable set PANZEA_SITE --body 'https://maize-genetics.github.io'
```

The preview is at `https://maize-genetics.github.io/panzea_landing_page/`.

### DNS switch steps

1. **Preview and approve.** With `PANZEA_BASE` set, check that the preview URL
   looks right and that `npm run verify` passes in CI.
2. **Lower the Wix DNS TTL** to 300 seconds one day ahead, so you can roll back
   quickly.
3. **Remove the preview variables** so the production build uses the root path
   and includes `CNAME`:
   ```bash
   gh variable delete PANZEA_BASE
   gh variable delete PANZEA_SITE
   ```
   Then re-run the deploy workflow.
4. **Point DNS at GitHub Pages.** At the registrar for `panzea.org`:
   - `www`: a `CNAME` record pointing to `maize-genetics.github.io`
   - `panzea.org`: four `A` records: `185.199.108.153`, `185.199.109.153`,
     `185.199.110.153`, `185.199.111.153`
   - `panzea.org`: four `AAAA` records: `2606:50c0:8000::153`,
     `2606:50c0:8001::153`, `2606:50c0:8002::153`, `2606:50c0:8003::153`

   Check these against
   [GitHub's current IP addresses](https://docs.github.com/pages/configuring-a-custom-domain-for-your-github-pages-site)
   on the day. GitHub does change them.
5. **Set the custom domain** to `www.panzea.org` in the repository's Pages
   settings. Wait for the DNS check to pass. Once the certificate is ready
   (usually under an hour), check **Enforce HTTPS**.
6. **Test** that `https://www.panzea.org/edward-buckler`, `/publications`, a PDF
   under `/files/publications/`, and `/people2` (which should redirect to
   `/allpeople`) all work.
7. **Cancel Wix** only after the site has worked on GitHub Pages for a few days.

## What changed from the Wix site

- **Genotype search tools removed.** `/genotype-search`,
  `/gbs-genotype-search` and `/enabling-genotype-searches` still have their
  text, but the search tool ran on `cbsuss05.tc.cornell.edu`, which no longer
  works. These pages now point to the file downloads instead.
- **Wix store pages removed.** `/shop` and twelve `/product-page/i-m-a-product*`
  URLs were unused Wix template pages, so they were not moved over.
- **`/people2` redirects to `/allpeople`** because they were duplicates.
- **iPlant links now point to CyVerse**, which is where they redirected anyway.
- **A few links that went to the home page by mistake** (for example "see all
  our Publications") now go where their text says.
- **Files are stored here.** Images and publication PDFs are served from this
  repository instead of the Wix servers.

External data is still on Cornell's file server at `cbsusrv04.tc.cornell.edu`.
Those links have not changed.

## Re-running the migration

The one-time scripts that pulled content from the old Wix site are not kept in
this repository. The content they produced is what matters, and it is now
edited by hand.
