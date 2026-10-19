import { useId, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { RotateCcw, X } from 'lucide-react'
import { Badge } from '../components/atoms/badge/Badge'
import { Button } from '../components/atoms/button/Button'
import { IconButton } from '../components/atoms/icon-button/IconButton'
import { linkVariants } from '../components/atoms/link/Link'
import { Sparkline } from '../components/atoms/sparkline/Sparkline'
import { ApprovalRequest } from '../components/molecules/approval-request/ApprovalRequest'
import { ChatMessage } from '../components/molecules/chat-message/ChatMessage'
import { DescriptionList } from '../components/molecules/description-list/DescriptionList'
import { PromptInput } from '../components/molecules/prompt-input/PromptInput'
import { ToolCall } from '../components/molecules/tool-call/ToolCall'
import { ChatThread } from '../components/organisms/chat-thread/ChatThread'
import { DataTable, type DataTableColumn } from '../components/organisms/data-table/DataTable'
import { ASSISTANT_NAME, scriptFor, SUGGESTIONS, type Message, type Part, type ToolOutput } from './assistant'
import { sparkLabel } from './bits'
import { sensorById } from './data'
import { clockOf, useConsole } from './store'

/** Said on every view of the assistant, beside its name: nothing here is a model. */
export const SCRIPTED_NOTE = 'Scripted demo: no model is called.'

type CountRow = Extract<ToolOutput, { type: 'counts' }>['rows'][number]
type HourRow = Extract<ToolOutput, { type: 'history' }>['rows'][number]

const COUNT_COLUMNS: DataTableColumn<CountRow>[] = [
  { key: 'site', header: 'Site', cell: r => r.site },
  { key: 'total', header: 'Alerts', numeric: true, cell: r => String(r.total) },
  { key: 'critical', header: 'Critical', numeric: true, cell: r => String(r.critical) },
]

const HOUR_COLUMNS: DataTableColumn<HourRow>[] = [
  { key: 'time', header: 'Time', cell: r => r.time },
  { key: 'value', header: 'Reading', numeric: true, cell: r => r.value },
]

function Output({ output }: { output: ToolOutput }) {
  switch (output.type) {
    case 'history': {
      const sensor = sensorById(output.sensorId)
      return (
        <div className="flex flex-col gap-3">
          {sensor ? (
            <Sparkline
              values={output.values}
              band={sensor.band}
              tone="hostile"
              showLast
              height={40}
              className="w-full"
              label={sparkLabel(sensor, output.values, 'last 6 hours')}
            />
          ) : null}
          <DataTable caption="Cold room 2, hourly readings" hideCaption columns={HOUR_COLUMNS} rows={output.rows} getRowId={r => r.time} rowHeader="time" />
        </div>
      )
    }
    case 'doors':
      return (
        <ol className="flex flex-col gap-1 font-body text-sm">
          {output.events.map(event => (
            <li key={event.time} className="flex gap-3">
              <span className="font-mono tabular-nums text-[var(--color-text-secondary)]">{event.time}</span>
              <span>{event.text}</span>
            </li>
          ))}
        </ol>
      )
    case 'facts':
      return <DescriptionList items={output.items} />
    case 'email':
      return <p className="font-body text-sm">Sent to {output.to}{output.at ? ` at ${output.at}` : ''}.</p>
    case 'counts':
      return <DataTable caption="Alerts by site since Monday" hideCaption columns={COUNT_COLUMNS} rows={output.rows} getRowId={r => r.siteId} rowHeader="site" />
  }
}

function PartView({ part, onDecide }: { part: Part; onDecide: (approved: boolean) => void }) {
  switch (part.kind) {
    case 'text':
      return <p className="whitespace-pre-wrap font-body text-sm">{part.text}</p>
    case 'tool':
      return (
        <ToolCall
          name={part.name}
          title={part.title}
          status={part.status}
          duration={part.duration}
          input={<pre className="whitespace-pre-wrap font-mono text-sm">{part.input}</pre>}
          output={part.status === 'done' ? <Output output={part.output} /> : undefined}
        />
      )
    case 'links':
      return (
        <ul className="flex flex-col gap-1 font-body text-sm" aria-label="Evidence">
          {part.links.map(link => (
            <li key={link.href}>
              <RouterLink to={link.href} className={linkVariants()}>
                {link.label}
              </RouterLink>
            </li>
          ))}
        </ul>
      )
    case 'approval':
      return (
        <ApprovalRequest
          title={part.title}
          state={part.state}
          onApprove={() => onDecide(true)}
          onReject={() => onDecide(false)}
          approveLabel="Approve and send"
          rejectLabel="Don’t send"
          approvedLabel="Approved by you: sent and acknowledged"
          rejectedLabel="Rejected: nothing sent"
        >
          <DescriptionList
            items={[
              { term: 'Alert note', description: part.draft.note },
              { term: 'Email to', description: `${part.draft.toName} <${part.draft.to}>` },
              { term: 'Subject', description: part.draft.subject },
              {
                term: 'Message',
                description: <span className="whitespace-pre-wrap">{part.draft.body}</span>,
              },
            ]}
          />
        </ApprovalRequest>
      )
  }
}

function MessageView({ message, onDecide }: { message: Message; onDecide: (approved: boolean) => void }) {
  const author = message.role === 'user' ? 'You' : ASSISTANT_NAME
  return (
    <ChatMessage
      role={message.role}
      author={author}
      time={`2026-10-15T${message.time}`}
      timeLabel={message.time}
      streaming={message.streaming}
    >
      {message.role === 'system' ? (
        message.parts.map(part => (part.kind === 'text' ? part.text : null))
      ) : (
        <div className="flex flex-col gap-3">
          {message.parts.map(part => (
            <PartView key={part.id} part={part} onDecide={onDecide} />
          ))}
        </div>
      )}
    </ChatMessage>
  )
}

/**
 * The assistant: a ChatThread of the scripted conversation, Retry after a stop, and the
 * PromptInput with the two suggestions. The same view docks beside any page from `lg` up (the
 * `panel` variant, with its own heading and a close button) and fills `/console/assistant`.
 * The conversation lives in the store, so the two never disagree.
 */
export function AssistantView({ variant, onClose }: { variant: 'panel' | 'page'; onClose?: () => void }) {
  const { state, run, startScript } = useConsole()
  const [draft, setDraft] = useState('')
  const headingId = useId()
  const conv = state.conversation
  const status = conv.run?.status
  const running = status === 'running'
  const awaiting = status === 'awaiting'

  const decide = (approved: boolean) => run({ type: 'assistant', action: { type: 'decide', approved } })

  return (
    <section
      aria-labelledby={variant === 'panel' ? headingId : undefined}
      aria-label={variant === 'page' ? 'Assistant' : undefined}
      className="flex h-full min-h-0 flex-col gap-3"
      data-assistant={variant}
    >
      <div className="flex items-start gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          {variant === 'panel' ? (
            <h2 id={headingId} className="font-display text-lg font-semibold">
              Assistant
            </h2>
          ) : null}
          <p className="flex flex-wrap items-center gap-2 font-body text-sm text-[var(--color-text-secondary)]">
            <Badge emphasis="subtle" tone="info">
              Scripted
            </Badge>
            {SCRIPTED_NOTE}
          </p>
        </div>
        {variant === 'panel' && onClose ? (
          <IconButton label="Close assistant" variant="ghost" size="sm" onClick={onClose}>
            <X aria-hidden="true" />
          </IconButton>
        ) : null}
      </div>
      <ChatThread
        label="Conversation with the assistant"
        busy={running}
        // A hairline edge: the thread scrolls, and without one a message cut by its top reads as broken.
        className="min-h-0 flex-1 border border-[var(--color-border-hairline)]"
      >
        <ChatMessage role="assistant" author={ASSISTANT_NAME}>
          <p className="font-body text-sm">
            I can investigate an alert or sum up the week. I only follow two scripts: start from a suggestion below, or
            from “Investigate with Assistant” on the Cold room 2 alert.
          </p>
        </ChatMessage>
        {conv.messages.map(message => (
          <MessageView key={message.id} message={message} onDecide={decide} />
        ))}
      </ChatThread>
      {status === 'stopped' ? (
        <div className="flex flex-wrap items-center gap-3">
          <Button
            size="sm"
            variant="secondary"
            iconStart={<RotateCcw />}
            onClick={() => run({ type: 'assistant', action: { type: 'retry' } })}
          >
            Retry
          </Button>
          <span className="font-body text-sm text-[var(--color-text-secondary)]">Runs the step that was stopped again.</span>
        </div>
      ) : null}
      <PromptInput
        label="Message the assistant"
        value={draft}
        onValueChange={setDraft}
        onSubmit={text => {
          startScript(scriptFor(text, state.readings, state.alerts))
          setDraft('')
        }}
        busy={running}
        onStop={() => run({ type: 'assistant', action: { type: 'stop', time: clockOf(state).label.slice(0, 5) } })}
        suggestions={SUGGESTIONS}
        placeholder="Ask about a site or an alert"
        disabled={awaiting}
        hint={awaiting ? 'Approve or reject the proposal above to go on.' : undefined}
      />
    </section>
  )
}
