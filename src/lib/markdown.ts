import { Marked } from 'marked';

const marked = new Marked({ gfm: true, breaks: false });

/** Site-root links in migrated content need the configured base prefix. */
function withBase(html: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/+$/, '');
  if (!base) return html;
  return html.replace(/(href|src)="\/(?!\/)/g, `$1="${base}/`);
}

/** Render a Markdown string that came from migrated content. */
export function md(text: string | undefined): string {
  if (!text) return '';
  return withBase(marked.parse(text) as string);
}

/** Render Markdown without wrapping it in a paragraph. */
export function mdInline(text: string | undefined): string {
  if (!text) return '';
  return withBase(marked.parseInline(text) as string);
}
