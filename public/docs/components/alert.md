# Alert

> A message that sits in the page. It shows its tone three ways, as an icon, a word and a colour, so it still reads on a greyscale screen and through a screen reader.

- **Best for:** A message that sits in the page and stays there: a warning about this screen, or a failed load with a retry.
- **Not for:** Something that will go away on its own: use Toast.
- Molecule. Source: `src/components/molecules/alert/Alert.tsx`
- Rendered docs page: `/components/alert`

## Import

```tsx
import { Alert } from 'src/components/molecules/alert/Alert'
```

Paths are from the Division DS repository root. Installed with shadcn they start `src/division-ds/` instead of `src/` (`src/division-ds/components/...`); import them relative to your file.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `tone` | `'info' \| 'ok' \| 'warning' \| 'hostile'` | `'info'` | Which colour, icon and word the alert carries. |
| `title` | `string` |  | Required. Screen readers hear the tone word in front of it. |
| `children` | `ReactNode` |  | The body text. |
| `live` | `boolean` | `false` | Only for an alert added after the page has loaded. It sets the role screen readers use to announce it: hostile and warning get role=alert (announced at once), info and ok get role=status (announced politely). |
| `onDismiss` | `() => void` |  | Adds the dismiss button. It runs once the alert has faded and its height has collapsed (M7), not on the click itself, so remove the alert from the page here. With reduced motion it runs straight away. |
| `dismissLabel` | `string` | `'Dismiss'` | The name screen readers give the dismiss button. |
| `action` | `ReactNode` |  | For example, a small Button. |
| `compact` | `boolean` | `false` | One line, for a toolbar, table header or card. The body sits inside the title paragraph, so pass plain inline text, not blocks. |
| `className` | `string` |  | Merged onto the root. |
| `ref` | `Ref<HTMLDivElement>` |  | Passed through to the root DOM element. |
| `...rest` | `Omit<HTMLAttributes<HTMLDivElement>, 'title' \| 'role'>` |  | You can't set role yourself: live decides it. |

## Examples

Each is compiled and rendered on the docs page. Imports are omitted; see above.

### Tones

```tsx
<div className="flex flex-col gap-4 w-full">
  <Alert tone="info" title="Depot hours changed">
    Weekend pickup now opens at 8am.
  </Alert>
  <Alert tone="ok" title="Manifest saved" />
  <Alert tone="warning" title="Depot closes early">
    The Brasov depot closes at 4pm today for maintenance.
  </Alert>
  <Alert tone="hostile" title="Sync failed">
    The last manifest sync could not reach the server.
  </Alert>
</div>
```

### With body and action

```tsx
<Alert
  title="Offline"
  action={
    <Button variant="secondary" size="sm">
      Retry
    </Button>
  }
>
  Changes are kept on this device.
</Alert>
```

### Compact

```tsx
<div className="flex flex-col gap-3 w-full">
  <Alert compact tone="info" title="Depot hours changed">
    Weekend pickup opens at 8am.
  </Alert>
  <Alert
    compact
    tone="warning"
    title="Low stock"
    action={
      <Button variant="secondary" size="sm">
        Reorder
      </Button>
    }
  >
    Three replicas left.
  </Alert>
</div>
```

### Dismissible (it has a close button), without the live prop, because it was on the page from the start

```tsx
function DismissibleExample() {
  const [dismissed, setDismissed] = useState(false)

  return dismissed ? (
    <Button variant="secondary" size="sm" onClick={() => setDismissed(false)}>
      Restore alert
    </Button>
  ) : (
    <Alert
      tone="warning"
      title="Depot closes early"
      onDismiss={() => setDismissed(true)}
      dismissLabel="Dismiss depot notice"
    >
      The Brasov depot closes at 4pm today for maintenance.
    </Alert>
  )
}

<DismissibleExample />
```

### Live: it appears after a click, and a screen reader announces it straight away

```tsx
function LiveExample() {
  const [shown, setShown] = useState(false)

  return (
    <div className="flex flex-col gap-3 w-full">
      <Button
        variant="secondary"
        size="sm"
        wrapperClassName="self-start"
        onClick={() => setShown(true)}
      >
        Trigger a live alert
      </Button>
      {shown ? (
        <Alert live tone="hostile" title="Sync failed" onDismiss={() => setShown(false)}>
          The last manifest sync could not reach the server.
        </Alert>
      ) : null}
    </div>
  )
}

<LiveExample />
```

## Keyboard

| Keys | Result |
|---|---|
| `Tab` | Reaches the action, then the dismiss button. The alert itself isn't a stop. |

## Do

- Start the title with what happened, and the body with what to do.
- Use live only when the alert appears in response to something the person did.
- Name the dismiss button for what it closes when there's more than one alert on a page.
- Use compact where a full alert would push the content it describes out of view, and keep the body to a short phrase.
- After dismiss, move keyboard focus to the next sensible control. The alert's own dismiss button disappears with it, and focus would otherwise drop back to the top of the page.

## Don't

- Don't use an alert for something that will go away on its own. That's a Toast.
- Don't colour the body text in the tone.
- Don't put paragraphs or lists inside a compact alert. It's one line of text.
- Don't stack more than two alerts. The second one is usually detail for the first.

## Anatomy

- **Container**: A raised surface with a 1px (one pixel) border in the tone's text colour on all four sides. There's no stripe down one side.
- **Icon**: Shows the tone without relying on colour. Marked aria-hidden, so screen readers skip it.
- **Tone word**: 'Warning:' before the title. It's hidden on screen and read out by screen readers.
- **Title**: Required.
- **Body**: In secondary text, not in the tone colour.
- **Action**: Optional, usually a small Button.
- **Dismiss**: Optional. A ghost IconButton (an icon-only button with no fill).
- **Compact layout**: One line: a 16px icon, then the title and body as one sentence, then the action and dismiss button. Long text wraps onto a new line instead of being cut off.
