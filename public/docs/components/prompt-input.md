# PromptInput

> The box where a person writes to an assistant. It grows to fit the text, has one Send/Stop button and can show suggestions. Enter sends, and Shift+Enter starts a new line.

- **Best for:** The message box under a ChatThread.
- **Not for:** A long field in a form: use Textarea inside a FormField.
- Molecule. Source: `src/components/molecules/prompt-input/PromptInput.tsx`
- Rendered docs page: `/components/prompt-input`

## Import

```tsx
import { PromptInput } from 'src/components/molecules/prompt-input/PromptInput'
```

## Requires

- A parent that keeps the draft in state and clears it in onSubmit.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `label` | `string` |  | Required. Names the box. It's hidden on screen. |
| `value` | `string` |  | Required. The draft. Controlled, meaning your page holds it. |
| `onValueChange` | `(value: string) => void` |  | Required. |
| `onSubmit` | `(value: string) => void` |  | Required. Fires on Enter, Send or a suggestion, and never with a blank draft. Clear the draft here. |
| `busy` | `boolean` | `false` | Send turns into Stop, and Enter sends nothing. |
| `onStop` | `() => void` |  | Runs on Stop, and on Escape in the box while busy. |
| `suggestions` | `readonly string[]` |  | Ready-made prompts shown as chips. Clicking one submits it. |
| `placeholder` | `string` |  | Shown in the empty box. |
| `disabled` | `boolean` | `false` | Nothing can be typed or sent. Say why somewhere nearby. |
| `hint` | `string` | `'Enter to send, Shift+Enter for a new line'` | The line under the box, which is also its description. |
| `className` | `string` |  | Added to the form. |

## Examples

Each is compiled and rendered on the docs page. Imports are omitted; see above.

### With suggestions

```tsx
function DraftExample() {
  const [value, setValue] = useState('')
  const [sent, setSent] = useState<string | null>(null)
  return (
    <div className="flex w-full max-w-xl flex-col gap-3">
      <PromptInput
        label="Message the assistant"
        placeholder="Ask about stock, orders or depots"
        value={value}
        onValueChange={setValue}
        onSubmit={text => {
          setSent(text)
          setValue('')
        }}
        suggestions={['Summarise stock at Depot 4', 'Which replicas are running low?']}
      />
      <p className="font-body text-sm text-[var(--color-text-secondary)]" aria-live="polite">
        {sent === null ? 'Nothing sent yet.' : `Sent: ${sent}`}
      </p>
    </div>
  )
}

<DraftExample />
```

### Busy: a Stop button takes the place of Send, and pressing Escape stops it too

```tsx
function BusyExample() {
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(true)
  return (
    <div className="flex w-full max-w-xl flex-col gap-3">
      <PromptInput
        label="Message the assistant, while it works"
        value={value}
        onValueChange={setValue}
        onSubmit={() => setValue('')}
        busy={busy}
        onStop={() => setBusy(false)}
      />
      {busy ? null : (
        <Button size="sm" variant="ghost" wrapperClassName="self-start" onClick={() => setBusy(true)}>
          Make it busy again
        </Button>
      )}
    </div>
  )
}

<BusyExample />
```

### Disabled

```tsx
<div className="flex w-full max-w-xl flex-col gap-2">
  <PromptInput label="Message the assistant (disabled)" value="" onValueChange={() => {}} onSubmit={() => {}} disabled />
  <p className="font-body text-sm text-[var(--color-text-secondary)]">The assistant is offline until 14:00.</p>
</div>
```

## Keyboard

| Keys | Result |
|---|---|
| `Enter` | Sends the draft. Does nothing while busy, or while someone's composing characters with an IME (Input Method Editor, the tool used to type languages like Chinese or Japanese). |
| `Shift` `Enter` | Starts a new line. |
| `Escape` | While busy, stops the reply. |

## Do

- Clear the draft in onSubmit, and set busy as soon as the request starts.
- Wire up onStop whenever the reply can be stopped. A reply that streams in with no Stop is a wait with no way out.
- Offer two to four suggestions in an empty thread, and drop them once the conversation has started.

## Don't

- Don't disable the box while busy; a person may be writing the next message while the reply arrives.
- Don't wrap it in a FormField. Its label is hidden on purpose, and it brings its own hint.
- Don't move focus into it when the reply finishes. It never left, unless the person moved it.

## Common mistakes

Wrong:

```tsx
{busy ? <Button onClick={stop}>Stop</Button> : <Button type="submit">Send</Button>}
```

Right:

```tsx
<PromptInput busy={busy} onStop={stop} ... />
```

Swapping two buttons drops keyboard focus to the page at the moment they switch. PromptInput keeps one button and changes its label and what it does.

## Anatomy

- **Form**: Paints surface.base itself, as every form does.
- **Suggestions**: A group of chips above the box. Clicking one submits its text. They're disabled while busy.
- **Box**: A Textarea with a label that's hidden on screen but read by screen readers. It grows from one line to about eight, then scrolls inside.
- **Send / Stop**: One button: a primary Send with an arrow, or, while busy, a secondary Stop with a square.
- **Hint**: One line under the box, which is also the box's description: "Enter to send, Shift+Enter for a new line".
