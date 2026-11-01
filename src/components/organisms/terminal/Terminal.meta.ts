import type { ComponentMeta } from '../../docs/meta'

export const meta: ComponentMeta = {
  name: 'Terminal',
  title: 'Terminal',
  tier: 'organisms',
  slug: 'terminal',
  summary:
    'A live terminal session in the page, built on xterm.js. It renders the output you write to it and reports what the person types. It knows nothing about the connection: your app owns that.',
  useWhen: 'A live, interactive process that needs real terminal behaviour: colour, cursor movement, full-screen programs.',
  notFor: 'Static code or a finished log: use CodeBlock. A conversation shown as messages: use ChatThread.',
  requires: [
    'Import it from its own file and load the screen that uses it with React.lazy. It adds about 100 kB of JavaScript after gzip (about 380 kB before) and 1 kB of CSS, so it is not in the organisms barrel.',
    'A height. It is 24rem by default; set another with className (h-[32rem]), or flex-1 inside a column.',
  ],
  pitfalls: [
    {
      wrong: `<Terminal label="Agent" status="live" output={text} />`,
      right: `const term = useRef<TerminalHandle>(null)
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
/>`,
      why: 'Output goes through the ref, so a fast stream never re-renders React. The connection lives in your app, not in the component.',
    },
    {
      wrong: `<Suspense fallback={null}><LazyTerminal ref={term} ... /></Suspense>  // with the socket in this component's effect`,
      right: `const Screen = lazy(() => import('./AgentScreen'))  // AgentScreen imports Terminal directly and owns the socket`,
      why: 'If only the Terminal is lazy, your effect runs while the ref is still empty and the first output is lost. Lazy-load the screen that holds both.',
    },
  ],
  anatomy: [
    { part: 'Frame', description: 'A Panel on surface.base, which is the surface all sixteen ANSI colours are measured on. It shows the focus ring while the terminal has focus.' },
    { part: 'Title bar', description: 'The label, the status Badge with a word and a tone, a Read only Badge when set, statusMessage, and the shortcut that leaves the terminal.' },
    { part: 'Status announcement', description: 'A visually hidden status region. It says only the label and the status, so a screen reader hears changes and not output.' },
    { part: 'Grid', description: 'xterm.js in the mono font, fitted to the frame. Colours are read from tokens at runtime and updated when the theme changes, keeping the buffer.' },
    { part: 'Screen reader rows', description: 'xterm’s accessibility tree: the visible rows as a list a screen reader can browse. Scrolling the terminal changes which rows it holds.' },
  ],
  props: [
    { name: 'label', type: 'string', description: 'Required. What this session is ("Build agent"). Names the terminal, its input and its status announcements.' },
    { name: 'status', type: "'connecting' | 'live' | 'reconnecting' | 'exited' | 'error'", description: 'Required. connecting and reconnecting are info, live is ok, exited is neutral for code 0 and hostile otherwise, error is hostile. Buffered output stays visible in all of them.' },
    { name: 'exitCode', type: 'number', description: 'With status exited: shown beside the word, and a non-zero code turns it hostile.' },
    { name: 'statusMessage', type: 'string', description: 'Detail beside the status, and announced with it: the reason for an error, the attempt while reconnecting.' },
    { name: 'readOnly', type: 'boolean', default: 'false', description: 'Blocks input and never fires onData. Selecting and copying keep working, and Tab and Escape leave the terminal as they do anywhere else.' },
    { name: 'announceOutput', type: 'boolean', default: 'false', description: 'Reads output aloud through xterm’s live region, up to 20 lines at a time. For a single session a screen reader user is working in. Leave it off when several terminals share a page.' },
    { name: 'onData', type: '(data: string) => void', description: 'What the person typed or pasted, plus the replies a program asks the terminal for. Send it to the process.' },
    { name: 'onResize', type: '(size: { cols: number; rows: number }) => void', description: 'The new grid size, debounced by 100ms and only when cols or rows changed. It fires once after mounting.' },
    { name: 'scrollback', type: 'number', default: '5000', description: 'Lines kept above the screen. xterm’s own default is 1000, which a busy agent passes in seconds.' },
    { name: 'className', type: 'string', description: 'Merged onto the frame. Set the height here.' },
    { name: 'ref', type: 'Ref<TerminalHandle>', description: 'The handle with the four methods below.' },
    { name: 'write (TerminalHandle)', type: '(data: string | Uint8Array, callback?: () => void) => void', description: 'Sends output to the terminal, without a React render. The callback runs when it has been parsed: use it for flow control, because xterm throws data away past 50 MB waiting.' },
    { name: 'clear (TerminalHandle)', type: '() => void', description: 'Clears the screen and the scrollback, keeping the line the cursor is on.' },
    { name: 'focus (TerminalHandle)', type: '() => void', description: 'Moves keyboard focus into the terminal.' },
    { name: 'fit (TerminalHandle)', type: '() => void', description: 'Fits the grid to the frame now. Resizing already does this.' },
  ],
  keyboard: [
    { keys: ['Tab'], does: 'From the page, moves into the terminal. Inside it, goes to the program, unless readOnly is set, when it moves on.' },
    { keys: ['Ctrl', 'Shift', 'L'], does: 'Moves focus out of the terminal to the next tab stop. Tab and Escape belong to the program, so this is the way out.' },
    { keys: ['Ctrl', 'C'], does: 'With text selected, copies it and clears the selection. With nothing selected, goes to the program as an interrupt.' },
    { keys: ['Ctrl', 'Shift', 'C'], does: 'Copies the selection and keeps it.' },
    { keys: ['Ctrl', 'V'], does: 'Pastes. Ctrl+Shift+V does the same. A program that wants a literal Ctrl+V does not get it.' },
  ],
  dos: [
    'Give each terminal a label that says which session it is, so a page of them can be told apart.',
    'Set readOnly when nobody can usefully type: a finished process, a session someone else owns.',
    'Say why in statusMessage when status is error.',
    'Use write’s callback to pause the source when output arrives faster than the page can draw it.',
  ],
  donts: [
    'Don’t import it from the organisms barrel, and don’t load it on a screen that does not show it.',
    'Don’t put a terminal inside another bordered panel; it brings its own frame.',
    'Don’t keep output in React state to pass down. Write it through the ref.',
    'Don’t expect the status to block input by itself: set readOnly when a process has exited.',
  ],
}
