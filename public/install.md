# Install Division DS

The same steps as https://victor-ilioiu.vercel.app/systems/division-ds/guidelines/install, in plain text.

## 1. The skill for your AI coding assistant

```bash
npx skills add https://github.com/Victor-Ilioiu/division-ds --skill division-ds
```

## 2. The components

Your project needs React 19 and Tailwind CSS 4. No `components.json` is needed.

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

## 3. Check your screens

The checker is not on npm yet. Clone the repository once and install it:

```bash
git clone https://github.com/Victor-Ilioiu/division-ds.git
cd division-ds && npm install
```

Then, from your project:

```bash
node <path-to-the-clone>/scripts/division-ds.mjs check src
```
