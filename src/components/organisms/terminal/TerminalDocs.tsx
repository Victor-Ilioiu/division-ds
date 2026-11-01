import { useEffect, useRef, useState } from 'react'
import { ComponentDocs } from '../../docs/ComponentDocs'
import { Example } from '../../docs/Example'
import { Button } from '../../atoms/button/Button'
import { setTheme } from '../../../lib/theme'
import { meta } from './Terminal.meta'
import { Terminal, type TerminalHandle, type TerminalProps } from './Terminal'

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

/** A terminal with a sample transcript already written: there is no real process behind any demo. */
function SampleTerminal(props: Omit<TerminalProps, 'ref'>) {
  const term = useRef<TerminalHandle>(null)
  useEffect(() => term.current?.write(TRANSCRIPT), [])
  return <Terminal ref={term} className="h-64 max-w-3xl" {...props} />
}

/** Streams on request (nothing on a docs page moves by itself) and echoes what is typed. */
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

export function TerminalDocs() {
  return (
    <ComponentDocs meta={meta}>
      <Example caption="Connecting" className="block">
        <Terminal label="Build agent" status="connecting" className="h-40 max-w-3xl" />
      </Example>

      <Example caption="Live, with a simulated stream" className="block">
        <LiveDemo />
      </Example>

      <Example caption="Read only: select and copy, but no typing" className="block">
        <SampleTerminal label="Deploy log" status="live" readOnly />
      </Example>

      <Example caption="Reconnecting, with the output kept" className="block">
        <SampleTerminal label="Test agent" status="reconnecting" statusMessage="Attempt 2 of 5" />
      </Example>

      <Example caption="Exited with code 0" className="block">
        <SampleTerminal label="Migration" status="exited" exitCode={0} readOnly />
      </Example>

      <Example caption="Exited with an error code" className="block">
        <SampleTerminal label="Type check" status="exited" exitCode={2} readOnly />
      </Example>

      <Example caption="Connection error" className="block">
        <SampleTerminal label="Review agent" status="error" statusMessage="The connection was refused." readOnly />
      </Example>

      <Example caption="Switching theme updates the colours and keeps the buffer" className="block">
        <div className="flex max-w-3xl flex-col gap-3">
          <SampleTerminal label="Theme check" status="live" readOnly />
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" onClick={() => setTheme('light')}>Light theme</Button>
            <Button variant="secondary" onClick={() => setTheme('dark')}>Dark theme</Button>
          </div>
        </div>
      </Example>
    </ComponentDocs>
  )
}
