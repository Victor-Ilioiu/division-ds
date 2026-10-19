# Division DS

A design system for dense, dark interfaces: one loud orange, hairline panels, cut corners, big
numbers. 67 React components in a light and a dark theme, 140 design tokens, and a build that
fails when a rule is broken.

**Documentation and live demos:** https://victor-ilioiu.vercel.app/systems/division-ds/

Built with React 19, Tailwind CSS 4 and Radix. The components meet WCAG 2.2 AA, the web's
accessibility standard: 82 colour pairs are measured in both themes on every build, and each
component has an automated accessibility test.

## Install

There are three ways in. Use the one that fits what you are doing.

### 1. Give your AI coding assistant the skill

The skill teaches an assistant (Claude Code, Cursor, Codex and others) which component and token
to use, the rules the prop types cannot express, and how to check its work.

```bash
npx skills add https://github.com/Victor-Ilioiu/division-ds --skill division-ds
```

In Claude Code you can also install it as a plugin:

```text
/plugin marketplace add Victor-Ilioiu/division-ds
/plugin install division-ds@division-ds
```

### 2. Add components to your own project

Each component installs on its own with the shadcn command line tool. The code is copied into
`src/division-ds/` in your project, where it is yours to change. Anything a component needs, such
as other components, the tokens and the helpers, comes with it.

```bash
npx shadcn@latest add https://raw.githubusercontent.com/Victor-Ilioiu/division-ds/main/public/r/button.json
```

Swap `button` for any component's name in lowercase, with hyphens: `data-table`, `alert-dialog`.
For the whole library in one command, use `division-ds-all`. No `components.json` is needed.
[`registry.json`](https://raw.githubusercontent.com/Victor-Ilioiu/division-ds/main/public/r/registry.json) lists
them all.

Your project needs React 19 and Tailwind CSS 4. Then, once:

1. In your main CSS file, after `@import "tailwindcss";`, add:
   ```css
   @import "./division-ds/styles/division-ds.css";
   ```
   (Adjust the path if your CSS file is not in `src/`.)
2. Load the three typefaces in your `index.html` `<head>`:
   ```html
   <link rel="preconnect" href="https://fonts.googleapis.com" />
   <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
   <link href="https://fonts.googleapis.com/css2?family=Oxanium:wght@300;400;600;700&family=Saira:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet" />
   ```
3. Dark is the default theme. For light, set `data-theme="light"` on `<html>`.

Check your screens against the system's rules (raw colours, invented tokens, touching buttons,
unknown props) with `npx division-ds check src`. Node 22 or newer.

### 3. Run the whole thing locally

You need [Git](https://git-scm.com/) and [Node.js](https://nodejs.org/) 22 or newer.

```bash
git clone https://github.com/Victor-Ilioiu/division-ds.git
cd division-ds
npm install
npm run dev
```

Open the address it prints. The documentation is at `/`, and the demos are at `/demo`, `/crm`
and `/console`.

| You want to | Run |
|---|---|
| Check everything: types, every build gate, the unit tests | `npm run verify` |
| Run the browser tests | `npm run test:e2e` |
| Build the site | `npm run build` |

## For AI agents

Start with [`AGENTS.md`](AGENTS.md). Every component also has a plain-text page under
`public/docs/components/`, and [`public/llms.txt`](public/llms.txt) indexes them.

## Licence

See [LICENSE](LICENSE).
