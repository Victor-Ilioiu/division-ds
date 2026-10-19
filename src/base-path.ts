// The site can be served from a sub-path (the portfolio hosts it under /systems/division-ds/).
// Vite's `base` covers bundled assets; this covers the paths written as strings in source, which
// Vite never sees: files in public/ and the router's basename. With the default base '/' every
// path comes out unchanged, so dev, unit and e2e runs see exactly what they always did.
// `?.` and the '/' fallback: Playwright specs import source (the catalog) straight into Node,
// where Vite has not defined import.meta.env.
const BASE = import.meta.env?.BASE_URL ?? '/'

/** A root-relative public path ("/media/x.webp") resolved against the deploy base. */
export const publicPath = (path: string) => BASE + path.replace(/^\/+/, '')

/** The router basename: the base without its trailing slash, or undefined at the root. */
export const routerBasename = BASE === '/' ? undefined : BASE.replace(/\/+$/, '')
