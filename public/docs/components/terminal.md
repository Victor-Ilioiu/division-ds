# Terminal

> A live terminal session in the page, built on xterm.js. It renders the output you write to it and reports what the person types. It knows nothing about the connection: your app owns that.

- **Best for:** A live, interactive process that needs real terminal behaviour: colour, cursor movement, full-screen programs.
- **Not for:** Static code or a finished log: use CodeBlock. A conversation shown as messages: use ChatThread.
- Organism. Source: `src/components/organisms/terminal/Terminal.tsx`
- Rendered docs page: `/components/terminal`

## Import

```tsx
import { Terminal } from 'src/components/organisms/terminal/Terminal'
```

Paths are from the Division DS repository root. Installed with shadcn they start `src/division-ds/` instead of `src/` (`src/division-ds/components/...`); import them relative to your file. An install has no index barrels: import each component from its own file, never from `components/molecules`.

## Requires

- Import it from its own file and load the screen that uses it with React.lazy. It adds about 100 kB of JavaScript after gzip (about 380 kB before) and 1 kB of CSS, so it is not in the organisms barrel.
- A height. It is 24rem by default; set another with className (h-[32rem]), or flex-1 inside a column.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `label` | `string` |  | Required. What this session is ("Build agent"). Names the terminal, its input and its status announcements. |
| `status` | `'connecting' \| 'live' \| 'reconnecting' \| 'exited' \| 'error'` |  | Required. connecting and reconnecting are info, live is ok, exited is neutral for code 0 and hostile otherwise, error is hostile. Buffered output stays visible in all of them. |
| `exitCode` | `number` |  | With status exited: shown beside the word, and a non-zero code turns it hostile. |
| `statusMessage` | `string` |  | Detail beside the status, and announced with it: the reason for an error, the attempt while reconnecting. |
| `readOnly` | `boolean` | `false` | Blocks input and never fires onData. Selecting and copying keep working, and Tab and Escape leave the terminal as they do anywhere else. |
| `shiftEnter` | `'newline' \| 'default'` | `'default'` | What Shift+Enter sends. xterm sends the same carriage return as Enter, so a chat program inside submits. newline sends ESC then carriage return instead, which Claude Code and similar programs read as a new line. Not sent while readOnly or composing with an input method. |
| `announceOutput` | `boolean` | `false` | Reads output aloud through xterm’s live region, up to 20 lines at a time. For a single session a screen reader user is working in. Leave it off when several terminals share a page. |
| `onData` | `(data: string) => void` |  | What the person typed or pasted, plus the replies a program asks the terminal for. Send it to the process. |
| `onResize` | `(size: { cols: number; rows: number }) => void` |  | The new grid size, debounced by 100ms and only when cols or rows changed. It fires once after mounting. |
| `scrollback` | `number` | `5000` | Lines kept above the screen. xterm’s own default is 1000, which a busy agent passes in seconds. |
| `className` | `string` |  | Merged onto the frame. Set the height here. |
| `ref` | `Ref<TerminalHandle>` |  | The handle with the four methods below. |
| `write (TerminalHandle)` | `(data: string \| Uint8Array, callback?: () => void) => void` |  | Sends output to the terminal, without a React render. The callback runs when it has been parsed: use it for flow control, because xterm throws data away past 50 MB waiting. |
| `clear (TerminalHandle)` | `() => void` |  | Clears the screen and the scrollback, keeping the line the cursor is on. |
| `focus (TerminalHandle)` | `() => void` |  | Moves keyboard focus into the terminal. |
| `fit (TerminalHandle)` | `() => void` |  | Fits the grid to the frame now. Resizing already does this. |

## Types and helpers

Exported beside the component, from the same file. Import a type with `import type { ... }`.

```ts
export type TerminalStatus = 'connecting' | 'live' | 'reconnecting' | 'exited' | 'error'
```

```ts
export type TerminalHandle = {
  /** Sends output to the terminal, without a React render. The callback runs once it is parsed: use it for flow control. */
  write(data: string | Uint8Array, callback?: () => void): void
  /** Clears the screen and the scrollback, keeping the cursor's line. */
  clear(): void
  /** Moves keyboard focus into the terminal. */
  focus(): void
  /** Fits the grid to the container now. Resizing already does this; use it after a change no resize reports. */
  fit(): void
}
```

## Examples

Each is compiled and rendered on the docs page. Imports are omitted; see above.

### Connecting

```tsx
<Terminal label="Build agent" status="connecting" className="h-40 max-w-3xl" />
```

### Live, with a simulated stream

```tsx
const ESC = '\u001b'

const paint = (code: number, text: string) => `${ESC}[${code}m${text}${ESC}[0m`

const COLOURS = [31, 32, 33, 34, 35, 36, 37, 90, 91, 92, 93, 94, 95, 96, 97]
  .map(code => paint(code, `${code} `.padEnd(4)))
  .join('')

const TRANSCRIPT = [
  paint(1, 'Sample session, written by this page'),
  '┌──────────────────────────────┐',
  `│ ${paint(32, '✔')} tests passed   宽字符 🚀   │`,
  '└──────────────────────────────┘',
  COLOURS,
  'Docs at https://example.com/terminal',
  '',
].join('\r\n')

const STREAM = ['compiling', 'linking', 'checking types', 'running tests', 'writing bundle']

function LiveDemo() {
  const term = useRef<TerminalHandle>(null)
  const [streaming, setStreaming] = useState(false)

  useEffect(() => {
    term.current?.write(`${TRANSCRIPT}Type here, or start the stream.\r\n$ `)
  }, [])

  useEffect(() => {
    if (!streaming) return
    let line = 0
    const timer = window.setInterval(() => {
      const step = STREAM[line % STREAM.length]
      const code = 31 + (line % 6)
      term.current?.write(`${paint(code, `[${String(line + 1).padStart(3, '0')}]`)} ${step}\r\n`)
      line += 1
      if (line === 40) setStreaming(false)
    }, 120)
    return () => window.clearInterval(timer)
  }, [streaming])

  return (
    <div className="flex max-w-3xl flex-col gap-3">
      <Terminal
        ref={term}
        label="Sample build"
        status="live"
        className="h-80"
        onData={data => term.current?.write(data === '\r' ? '\r\n$ ' : data)}
      />
      <div className="flex flex-wrap gap-3">
        <Button variant="secondary" onClick={() => setStreaming(on => !on)}>{streaming ? 'Stop the stream' : 'Start the stream'}</Button>
        <Button variant="secondary" onClick={() => term.current?.clear()}>Clear</Button>
      </div>
    </div>
  )
}

<LiveDemo />
```

### Read only: select and copy, but no typing

```tsx
const ESC = '\u001b'

const paint = (code: number, text: string) => `${ESC}[${code}m${text}${ESC}[0m`

const COLOURS = [31, 32, 33, 34, 35, 36, 37, 90, 91, 92, 93, 94, 95, 96, 97]
  .map(code => paint(code, `${code} `.padEnd(4)))
  .join('')

const TRANSCRIPT = [
  paint(1, 'Sample session, written by this page'),
  '┌──────────────────────────────┐',
  `│ ${paint(32, '✔')} tests passed   宽字符 🚀   │`,
  '└──────────────────────────────┘',
  COLOURS,
  'Docs at https://example.com/terminal',
  '',
].join('\r\n')

function SampleTerminal(props: Omit<TerminalProps, 'ref'>) {
  const term = useRef<TerminalHandle>(null)
  useEffect(() => term.current?.write(TRANSCRIPT), [])
  return <Terminal ref={term} className="h-64 max-w-3xl" {...props} />
}

<SampleTerminal label="Deploy log" status="live" readOnly />
```

### Reconnecting, with the output kept

```tsx
const ESC = '\u001b'

const paint = (code: number, text: string) => `${ESC}[${code}m${text}${ESC}[0m`

const COLOURS = [31, 32, 33, 34, 35, 36, 37, 90, 91, 92, 93, 94, 95, 96, 97]
  .map(code => paint(code, `${code} `.padEnd(4)))
  .join('')

const TRANSCRIPT = [
  paint(1, 'Sample session, written by this page'),
  '┌──────────────────────────────┐',
  `│ ${paint(32, '✔')} tests passed   宽字符 🚀   │`,
  '└──────────────────────────────┘',
  COLOURS,
  'Docs at https://example.com/terminal',
  '',
].join('\r\n')

function SampleTerminal(props: Omit<TerminalProps, 'ref'>) {
  const term = useRef<TerminalHandle>(null)
  useEffect(() => term.current?.write(TRANSCRIPT), [])
  return <Terminal ref={term} className="h-64 max-w-3xl" {...props} />
}

<SampleTerminal label="Test agent" status="reconnecting" statusMessage="Attempt 2 of 5" />
```

### Exited with code 0

```tsx
const ESC = '\u001b'

const paint = (code: number, text: string) => `${ESC}[${code}m${text}${ESC}[0m`

const COLOURS = [31, 32, 33, 34, 35, 36, 37, 90, 91, 92, 93, 94, 95, 96, 97]
  .map(code => paint(code, `${code} `.padEnd(4)))
  .join('')

const TRANSCRIPT = [
  paint(1, 'Sample session, written by this page'),
  '┌──────────────────────────────┐',
  `│ ${paint(32, '✔')} tests passed   宽字符 🚀   │`,
  '└──────────────────────────────┘',
  COLOURS,
  'Docs at https://example.com/terminal',
  '',
].join('\r\n')

function SampleTerminal(props: Omit<TerminalProps, 'ref'>) {
  const term = useRef<TerminalHandle>(null)
  useEffect(() => term.current?.write(TRANSCRIPT), [])
  return <Terminal ref={term} className="h-64 max-w-3xl" {...props} />
}

<SampleTerminal label="Migration" status="exited" exitCode={0} readOnly />
```

### Exited with an error code

```tsx
const ESC = '\u001b'

const paint = (code: number, text: string) => `${ESC}[${code}m${text}${ESC}[0m`

const COLOURS = [31, 32, 33, 34, 35, 36, 37, 90, 91, 92, 93, 94, 95, 96, 97]
  .map(code => paint(code, `${code} `.padEnd(4)))
  .join('')

const TRANSCRIPT = [
  paint(1, 'Sample session, written by this page'),
  '┌──────────────────────────────┐',
  `│ ${paint(32, '✔')} tests passed   宽字符 🚀   │`,
  '└──────────────────────────────┘',
  COLOURS,
  'Docs at https://example.com/terminal',
  '',
].join('\r\n')

function SampleTerminal(props: Omit<TerminalProps, 'ref'>) {
  const term = useRef<TerminalHandle>(null)
  useEffect(() => term.current?.write(TRANSCRIPT), [])
  return <Terminal ref={term} className="h-64 max-w-3xl" {...props} />
}

<SampleTerminal label="Type check" status="exited" exitCode={2} readOnly />
```

### Connection error

```tsx
const ESC = '\u001b'

const paint = (code: number, text: string) => `${ESC}[${code}m${text}${ESC}[0m`

const COLOURS = [31, 32, 33, 34, 35, 36, 37, 90, 91, 92, 93, 94, 95, 96, 97]
  .map(code => paint(code, `${code} `.padEnd(4)))
  .join('')

const TRANSCRIPT = [
  paint(1, 'Sample session, written by this page'),
  '┌──────────────────────────────┐',
  `│ ${paint(32, '✔')} tests passed   宽字符 🚀   │`,
  '└──────────────────────────────┘',
  COLOURS,
  'Docs at https://example.com/terminal',
  '',
].join('\r\n')

function SampleTerminal(props: Omit<TerminalProps, 'ref'>) {
  const term = useRef<TerminalHandle>(null)
  useEffect(() => term.current?.write(TRANSCRIPT), [])
  return <Terminal ref={term} className="h-64 max-w-3xl" {...props} />
}

<SampleTerminal label="Review agent" status="error" statusMessage="The connection was refused." readOnly />
```

### Switching theme updates the colours and keeps the buffer

```tsx
const ESC = '\u001b'

const paint = (code: number, text: string) => `${ESC}[${code}m${text}${ESC}[0m`

const COLOURS = [31, 32, 33, 34, 35, 36, 37, 90, 91, 92, 93, 94, 95, 96, 97]
  .map(code => paint(code, `${code} `.padEnd(4)))
  .join('')

const TRANSCRIPT = [
  paint(1, 'Sample session, written by this page'),
  '┌──────────────────────────────┐',
  `│ ${paint(32, '✔')} tests passed   宽字符 🚀   │`,
  '└──────────────────────────────┘',
  COLOURS,
  'Docs at https://example.com/terminal',
  '',
].join('\r\n')

function SampleTerminal(props: Omit<TerminalProps, 'ref'>) {
  const term = useRef<TerminalHandle>(null)
  useEffect(() => term.current?.write(TRANSCRIPT), [])
  return <Terminal ref={term} className="h-64 max-w-3xl" {...props} />
}

<div className="flex max-w-3xl flex-col gap-3">
  <SampleTerminal label="Theme check" status="live" readOnly />
  <div className="flex flex-wrap gap-3">
    <Button variant="secondary" onClick={() => setTheme('light')}>Light theme</Button>
    <Button variant="secondary" onClick={() => setTheme('dark')}>Dark theme</Button>
  </div>
</div>
```

## Keyboard

| Keys | Result |
|---|---|
| `Tab` | From the page, moves into the terminal. Inside it, goes to the program, unless readOnly is set, when it moves on. |
| `Ctrl` `Shift` `L` | Moves focus out of the terminal to the next tab stop. Tab and Escape belong to the program, so this is the way out. |
| `Ctrl` `C` | With text selected, copies it and clears the selection. With nothing selected, goes to the program as an interrupt. |
| `Ctrl` `Shift` `C` | Copies the selection and keeps it. |
| `Shift` `Enter` | Sends Enter to the program, unless shiftEnter is newline, when it sends ESC then Enter: a new line in chat programs such as Claude Code. |
| `Ctrl` `V` | Pastes. Ctrl+Shift+V does the same. A program that wants a literal Ctrl+V does not get it. |

## Do

- Give each terminal a label that says which session it is, so a page of them can be told apart.
- Set readOnly when nobody can usefully type: a finished process, a session someone else owns.
- Say why in statusMessage when status is error.
- Set shiftEnter="newline" when the session runs a chat program, such as Claude Code, where Shift+Enter should start a new line.
- Use write’s callback to pause the source when output arrives faster than the page can draw it.

## Don't

- Don’t import it from the organisms barrel, and don’t load it on a screen that does not show it.
- Don’t put a terminal inside another bordered panel; it brings its own frame.
- Don’t keep output in React state to pass down. Write it through the ref.
- Don’t expect the status to block input by itself: set readOnly when a process has exited.

## Common mistakes

Wrong:

```tsx
<Terminal label="Agent" status="live" output={text} />
```

Right:

```tsx
const term = useRef<TerminalHandle>(null)
const socket = useRef<WebSocket>(null)
const [status, setStatus] = useState<TerminalStatus>('connecting')

useEffect(() => {
  const ws = new WebSocket(url)
  ws.binaryType = 'arraybuffer'
  socket.current = ws
  ws.onopen = () => setStatus('live')
  ws.onmessage = event =>
    term.current?.write(typeof event.data === 'string' ? event.data : new Uint8Array(event.data))
  ws.onclose = () => setStatus('reconnecting')
  return () => ws.close()
}, [url])

<Terminal
  ref={term}
  label="Build agent"
  status={status}
  onData={data => socket.current?.send(data)}
  onResize={size => socket.current?.send(JSON.stringify({ type: 'resize', ...size }))}
/>
```

Output goes through the ref, so a fast stream never re-renders React. The connection lives in your app, not in the component.

Wrong:

```tsx
<Suspense fallback={null}><LazyTerminal ref={term} ... /></Suspense>  // with the socket in this component's effect
```

Right:

```tsx
const Screen = lazy(() => import('./AgentScreen'))  // AgentScreen imports Terminal directly and owns the socket
```

If only the Terminal is lazy, your effect runs while the ref is still empty and the first output is lost. Lazy-load the screen that holds both.

## Anatomy

- **Frame**: A Panel on surface.base, which is the surface all sixteen ANSI colours are measured on. It shows the focus ring while the terminal has focus.
- **Title bar**: The label, the status Badge with a word and a tone, a Read only Badge when set, statusMessage, and the shortcut that leaves the terminal.
- **Status announcement**: A visually hidden status region. It says only the label and the status, so a screen reader hears changes and not output.
- **Grid**: xterm.js in the mono font, fitted to the frame. Colours are read from tokens at runtime and updated when the theme changes, keeping the buffer.
- **Screen reader rows**: xterm’s accessibility tree: the visible rows as a list a screen reader can browse. Scrolling the terminal changes which rows it holds.
