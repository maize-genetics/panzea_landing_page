const BASE = import.meta.env.BASE_URL;

/** Prefix a site-root path with the configured base, if any. */
export function url(path: string): string {
  if (!path) return path;
  if (/^(https?:)?\/\/|^(mailto|tel):|^#/.test(path)) return path;
  const clean = path.startsWith('/') ? path : `/${path}`;
  const base = BASE.endsWith('/') ? BASE.slice(0, -1) : BASE;
  return `${base}${clean}` || '/';
}

export function isExternal(href: string): boolean {
  return /^(https?:)?\/\//.test(href);
}

/** True when `href` points at the page currently being rendered. */
export function isCurrent(href: string, pathname: string): boolean {
  const norm = (p: string) => {
    const stripped = p.replace(/\/+$/, '') || '/';
    const base = BASE.replace(/\/+$/, '');
    return base && stripped.startsWith(base) ? stripped.slice(base.length) || '/' : stripped;
  };
  return norm(href) === norm(pathname);
}
