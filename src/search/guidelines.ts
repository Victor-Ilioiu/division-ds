// What each guideline page is for, in the words a reader would search with. The docs search ranks
// these with the same scorer as components and tokens. guidelines.test.ts fails when a Guidelines
// page in the sidebar has no entry here, so a new page cannot be unsearchable.
export const GUIDELINE_SEARCH: Record<string, { description: string; keywords: string }> = {
  '/': {
    description: 'What Division DS is, how many components it has, and the build gates that enforce its rules.',
    keywords: 'overview home start introduction gates counts',
  },
  '/guidelines/install': {
    description: 'Install the agent skill, add components with shadcn, run the checker and the MCP server.',
    keywords: 'install setup npm npx shadcn registry skill mcp server checker cli getting started',
  },
  '/guidelines/color': {
    description: 'Every colour grouped by its job, with its token name and contrast ratio.',
    keywords: 'color colour palette tokens contrast surface text accent signal hostile ok info warning ai dark light theme',
  },
  '/guidelines/theme': {
    description: 'Pick an accent and a neutral; both themes are rebuilt and contrast-checked before you get the CSS.',
    keywords: 'theme builder customize brand colour accent neutral preset fonts radius css',
  },
  '/guidelines/typography': {
    description: 'Typefaces, the type scale and how numerals are set.',
    keywords: 'typography type font typeface scale heading body mono numerals text size',
  },
  '/guidelines/spacing': {
    description: 'The eight spacing steps, layout grid and the padding and gap utilities.',
    keywords: 'spacing space layout grid padding gap margin scale',
  },
  '/guidelines/shape': {
    description: 'Cut corners (bevels) instead of rounded ones, and where each size goes.',
    keywords: 'shape bevel corners radius cut border',
  },
  '/guidelines/elevation': {
    description: 'Glass surfaces, the hero tilt and the lift on clickable cards.',
    keywords: 'elevation shadow glass blur depth card hover lift surface raised',
  },
  '/guidelines/iconography': {
    description: 'The lucide-react icon set, sizes and how icons are labelled.',
    keywords: 'icons iconography lucide svg glyph',
  },
  '/guidelines/motion': {
    description: 'Durations, easing and how every animation behaves under reduced motion.',
    keywords: 'motion animation transition duration easing reduced motion',
  },
  '/guidelines/tokens': {
    description: 'Every primitive token, live: colour ramps, spacing and motion values.',
    keywords: 'tokens browser primitives ramps values variables css',
  },
  '/guidelines/accessibility': {
    description: 'The WCAG 2.2 rules the system meets and how each one is checked.',
    keywords: 'accessibility a11y wcag aa keyboard focus screen reader contrast target size',
  },
  '/guidelines/host-apps': {
    description: 'Screens shown inside Claude and ChatGPT that take the host’s colours and font.',
    keywords: 'host apps mcp apps claude chatgpt iframe adapter data-host',
  },
}
