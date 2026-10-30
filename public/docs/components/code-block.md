# CodeBlock

> Code or a command in a panel, with a title bar that names the file or language and a button that copies the text. Long lines scroll sideways inside it, and code longer than one line gets line numbers.

- **Best for:** Showing code or a command someone will read or copy: an install step, a config file, an example.
- **Not for:** A word of code inside a sentence: use a code element. A key to press: use Kbd.
- Molecule. Source: `src/components/molecules/code-block/CodeBlock.tsx`
- Rendered docs page: `/components/code-block`

## Import

```tsx
import { CodeBlock } from 'src/components/molecules/code-block/CodeBlock'
```

Paths are from the Division DS repository root. Installed with shadcn they start `src/division-ds/` instead of `src/` (`src/division-ds/components/...`); import them relative to your file. An install has no index barrels: import each component from its own file, never from `components/molecules`.

## Requires

- The app’s one Toaster at the root: the copy is confirmed with a toast.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `code` | `string` |  | The text shown and copied, exactly. |
| `label` | `string` |  | What the code is, in a few words ("the theme CSS"). Names the region and the copy button ("Copy the theme CSS"). |
| `title` | `string` |  | Shown in the title bar: a file name ("index.css") or a language ("bash"). |
| `language` | `'css' \| 'text'` | `'text'` | css colours comments, at-rules, selectors and property names; text is plain. |
| `lineNumbers` | `boolean` |  | Line numbers in a gutter. Unset, they show when the code has more than one line. |
| `copyable` | `boolean` | `true` | The copy button. Turn it off for code nobody should paste, such as a wrong example. |
| `wrap` | `boolean` | `false` | Wraps long lines instead of scrolling them sideways. For prose, such as a prompt; leave code unwrapped. |
| `className` | `string` |  | Merged onto the frame. Use it for width (max-w-3xl) and spacing. |
| `ref` | `Ref<HTMLDivElement>` |  | Passed through to the frame. |

## Examples

Each is compiled and rendered on the docs page. Imports are omitted; see above.

### A command

```tsx
<CodeBlock title="bash" label="the check command" code="npx division-ds check src" className="max-w-3xl" />
```

### A file, with CSS colours and line numbers

```tsx
<CodeBlock
  title="index.css"
  language="css"
  label="the theme CSS"
  className="max-w-3xl"
  code={'@import "./division-ds/styles/division-ds.css";\n\n/* Square corners */\n:root {\n  --shape-bevel: 0;\n  --shape-radius: 4px;\n}\n'}
/>
```

### Not copyable, for code nobody should paste

```tsx
<CodeBlock title="Wrong" label="a bare pre" copyable={false} code={'<pre>{command}</pre>'} className="max-w-3xl" />
```

## Keyboard

| Keys | Result |
|---|---|
| `Tab` | Moves to the copy button, then to the code region. |
| `←` `→` | In the focused code region: scrolls a long line sideways. |
| `Enter` | On the copy button: copies the code. |

## Do

- Write a label that says what the code is, so the copy button reads "Copy the install command".
- Give it a title: the file name it belongs in, or the language.
- Set a max width with className; long lines scroll inside it, so it never widens the page.

## Don't

- Don’t put several unrelated commands in one block. One block per thing to copy.
- Don’t set copyable on an example of what not to write.
- Don’t wrap it in another bordered panel; it brings its own frame.

## Common mistakes

Wrong:

```tsx
<pre className="font-mono text-sm">{command}</pre>
```

Right:

```tsx
<CodeBlock code={command} label="the install command" title="bash" />
```

A bare pre has no copy button, no name, and cannot be scrolled with a keyboard when a line runs past the edge.

## Anatomy

- **Frame**: A thin border around a surface.base fill. The syntax colours are measured for contrast on surface.base.
- **Title bar**: The title on the left, in 12px uppercase mono, and the copy button on the right, above a thin line.
- **Code region**: A pre with role region, named by the title and the label, focusable so a keyboard can scroll it. Up to 32rem tall, then it scrolls.
- **Line numbers**: A gutter in text.muted, hidden from screen readers and from text selection.
- **Copy button**: An IconButton named "Copy" plus the label. After copying, its icon turns into a tick for a moment and a toast confirms it.
