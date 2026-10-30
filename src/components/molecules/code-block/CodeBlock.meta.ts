import type { ComponentMeta } from '../../docs/meta'

export const meta: ComponentMeta = {
  name: 'CodeBlock',
  title: 'Code block',
  tier: 'molecules',
  slug: 'code-block',
  summary:
    'Code or a command in a panel, with a title bar that names the file or language and a button that copies the text. Long lines scroll sideways inside it, and code longer than one line gets line numbers.',
  requires: ['The app’s one Toaster at the root: the copy is confirmed with a toast.'],
  pitfalls: [
    {
      wrong: `<pre className="font-mono text-sm">{command}</pre>`,
      right: `<CodeBlock code={command} label="the install command" title="bash" />`,
      why: 'A bare pre has no copy button, no name, and cannot be scrolled with a keyboard when a line runs past the edge.',
    },
  ],
  anatomy: [
    { part: 'Frame', description: 'A thin border around a surface.base fill. The syntax colours are measured for contrast on surface.base.' },
    { part: 'Title bar', description: 'The title on the left, in 12px uppercase mono, and the copy button on the right, above a thin line.' },
    { part: 'Code region', description: 'A pre with role region, named by the title and the label, focusable so a keyboard can scroll it. Up to 32rem tall, then it scrolls.' },
    { part: 'Line numbers', description: 'A gutter in text.muted, hidden from screen readers and from text selection.' },
    { part: 'Copy button', description: 'An IconButton named "Copy" plus the label. After copying, its icon turns into a tick for a moment and a toast confirms it.' },
  ],
  props: [
    { name: 'code', type: 'string', description: 'The text shown and copied, exactly.' },
    { name: 'label', type: 'string', description: 'What the code is, in a few words ("the theme CSS"). Names the region and the copy button ("Copy the theme CSS").' },
    { name: 'title', type: 'string', description: 'Shown in the title bar: a file name ("index.css") or a language ("bash").' },
    { name: 'language', type: "'css' | 'text'", default: "'text'", description: 'css colours comments, at-rules, selectors and property names; text is plain.' },
    { name: 'lineNumbers', type: 'boolean', description: 'Line numbers in a gutter. Unset, they show when the code has more than one line.' },
    { name: 'copyable', type: 'boolean', default: 'true', description: 'The copy button. Turn it off for code nobody should paste, such as a wrong example.' },
    { name: 'wrap', type: 'boolean', default: 'false', description: 'Wraps long lines instead of scrolling them sideways. For prose, such as a prompt; leave code unwrapped.' },
    { name: 'className', type: 'string', description: "Merged onto the frame. Use it for width (max-w-3xl) and spacing." },
    { name: 'ref', type: 'Ref<HTMLDivElement>', description: 'Passed through to the frame.' },
  ],
  keyboard: [
    { keys: ['Tab'], does: 'Moves to the copy button, then to the code region.' },
    { keys: ['←', '→'], does: 'In the focused code region: scrolls a long line sideways.' },
    { keys: ['Enter'], does: 'On the copy button: copies the code.' },
  ],
  useWhen: 'Showing code or a command someone will read or copy: an install step, a config file, an example.',
  notFor: 'A word of code inside a sentence: use a code element. A key to press: use Kbd.',
  dos: [
    'Write a label that says what the code is, so the copy button reads "Copy the install command".',
    'Give it a title: the file name it belongs in, or the language.',
    'Set a max width with className; long lines scroll inside it, so it never widens the page.',
  ],
  donts: [
    'Don’t put several unrelated commands in one block. One block per thing to copy.',
    'Don’t set copyable on an example of what not to write.',
    'Don’t wrap it in another bordered panel; it brings its own frame.',
  ],
}
