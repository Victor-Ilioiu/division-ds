// The addresses the Install page and the demos' About pages print. One place, so a command shown
// in two pages cannot drift. The registry URL is where shadcn downloads each component's JSON
// from; where the files land in a project is fixed inside each item (src/division-ds/), so the
// sub-path this site is served from never reaches a consumer's paths.
export const REPO = 'https://github.com/Victor-Ilioiu/division-ds'
export const REPO_SLUG = 'Victor-Ilioiu/division-ds'
export const REGISTRY = 'https://raw.githubusercontent.com/Victor-Ilioiu/division-ds/main/public/r'
export const SKILL_INSTALL = `npx skills add ${REPO} --skill division-ds`
