# Install Division DS

The same steps as https://victor-ilioiu.vercel.app/systems/division-ds/guidelines/install, in plain text.

## 1. The skill for your AI coding assistant

```bash
npx skills add https://github.com/Victor-Ilioiu/division-ds --skill division-ds
```

It asks which of your assistants should get the skill, and whether for this project or every
project. An AI assistant or a script cannot answer prompts: add `-y` to skip them (it installs for
this project when run inside one), `-a <agent>` to name the assistants yourself, or `-g` for every
project.

## 2. The components

Your project needs React 19 and Tailwind CSS 4. No `components.json` is needed.

A new Vite app has no Tailwind yet. Add it first (other bundlers: https://tailwindcss.com/docs/installation):

```bash
npm install tailwindcss @tailwindcss/vite
```

In `vite.config.ts`, add the plugin: `import tailwindcss from '@tailwindcss/vite'`, then
`plugins: [react(), tailwindcss()]`. Replace the contents of `src/index.css` with
`@import "tailwindcss";`.

Every component at once:

```bash
npx shadcn@latest add https://raw.githubusercontent.com/Victor-Ilioiu/division-ds/main/public/r/division-ds-all.json
```

Or one at a time (the slug is the name in lowercase with hyphens; `registry.json` in the same folder lists them all):

```bash
npx shadcn@latest add https://raw.githubusercontent.com/Victor-Ilioiu/division-ds/main/public/r/button.json
```

Files land in `src/division-ds/`. Then, once:

1. In your main CSS file, on the line after `@import "tailwindcss";`:
   ```css
   @import "./division-ds/styles/division-ds.css";
   ```
2. In the `<head>` of `index.html`:
   ```html
   <link rel="preconnect" href="https://fonts.googleapis.com" />
   <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
   <link href="https://fonts.googleapis.com/css2?family=Oxanium:wght@300;400;600;700&family=Saira:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet" />
   ```
3. Dark is the default theme. For light, set `data-theme="light"` on `<html>`.
4. Give your app a root that does what this repository's shell does: mount the two providers once,
   set the page gutter, paint the background and set the body font. Toasts and tooltips need the
   providers; Navbar, Footer and the `px-gutter` utility read `--page-gutter` (the page's side
   margin: 16px, and 64px from 1024px wide).
   ```tsx
   import { TooltipProvider } from './division-ds/components/atoms/tooltip/Tooltip'
   import { Toaster } from './division-ds/components/molecules/toast/Toast'

   <TooltipProvider>
     <Toaster>
       <div className="[--page-gutter:1rem] lg:[--page-gutter:4rem] min-h-screen bg-[var(--color-surface-base)] text-[var(--color-text-primary)] font-body">
         {/* your routes */}
       </div>
     </Toaster>
   </TooltipProvider>
   ```

Your linter may warn "only export components" on a few installed files (`Toast.tsx` exports
`useToast`, `DataTable.tsx` exports `sortRows`, and so on). It is a hot-reload hint, not a bug:
editing those files reloads the page instead of patching it in place.

## 3. Check your screens

From your project (Node 22 or newer):

```bash
npx division-ds check src
```

It flags a raw colour, an invented token, touching buttons, an unknown prop and a value outside a prop's union, and says what to write instead.

It reads the code, not the running page: how the screen behaves is still yours to try in a browser.

## 4. Connect your assistant to the system (MCP)

An MCP server gives your assistant the documentation and the same checks as tools it calls while it
works. In Claude Code, once:

```bash
claude mcp add division-ds -- npx -y division-ds@0.4.0 mcp
```

The version is pinned so the tools do not change under you; raise it when you update the
components. A server added while a Claude Code session is running loads in the next session:
restart it (or start a new one) before calling the tools.

In Cursor (`.cursor/mcp.json`) and other assistants' MCP settings:

```json
{
  "mcpServers": {
    "division-ds": { "command": "npx", "args": ["-y", "division-ds@0.4.0", "mcp"] }
  }
}
```

The tools:

- `list_components`: every component, with when to use it.
- `get_component`: one component's page: the import, props, keyboard, do and don't, examples.
- `search`: components and tokens by what they are for ("page background", "confirm delete").
- `get_tokens`: token values, in both themes, and when to use each.
- `validate_code`: the checks from step 3, on code the assistant has just written.
- `check_contrast`: whether two colours or tokens are readable together, in both themes (WCAG 2.2 AA).
- `get_add_command`: the command that installs a component.
- `get_review_checklist`: what to check in the browser before a screen is done.
