# Toast

> A short message that pops up, stays a few seconds and goes away. Hostile toasts (errors) interrupt and stay longer. Everything else waits its turn.

- **Best for:** Confirming something the person just did, for a few seconds.
- **Not for:** The only copy of important information: use Alert. Also not for a change the page already shows.
- Molecule. Source: `src/components/molecules/toast/Toast.tsx`
- Rendered docs page: `/components/toast`

## Import

```tsx
import { Toaster, useToast } from 'src/components/molecules/toast/Toast'
```

## Requires

- One <Toaster> near the root of the app, wrapped around everything that calls useToast(). AppShell and the demo layout each mount one. Outside it, useToast() throws an error.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `title (ToastOptions)` | `string` |  | Required. Screen readers hear the tone word before it. |
| `description (ToastOptions)` | `string` |  | Optional body text. |
| `tone (ToastOptions)` | `'info' \| 'ok' \| 'warning' \| 'hostile'` | `'info'` | Which colour, icon and word the toast has. |
| `duration (ToastOptions)` | `number` | `5000` | How many milliseconds before it goes away on its own. 8000 for hostile. |
| `action (ToastOptions)` | `{ label: string; altText: string; onAction: () => void }` |  | Optional. Radix (the library the toast is built on) requires altText: what to do somewhere else if someone can't reach the toast in time. |
| `replace (ToastOptions)` | `string` |  | Optional. Closes any open toast raised with the same string as this one opens, so an action repeated quickly ("Alert acknowledged" three times) shows one toast instead of a stack. |
| `useToast()` | `{ toast: (options: ToastOptions) => string; dismiss: (id: string) => void }` |  | Shows a toast (and returns its id) or closes one. Throws an error outside a Toaster. |

## Types and helpers

Exported beside the component, from the same file. Import a type with `import type { ... }`.

```ts
export type ToastOptions = {
  title: string
  description?: string
  tone?: Tone
  /** ms before it leaves on its own. Default 5000; 8000 for hostile. */
  duration?: number
  /** Radix requires altText: the way to do the same thing for someone who cannot reach the toast
   *  before it leaves. */
  action?: { label: string; altText: string; onAction: () => void }
  /** Any open toast raised with the same string closes as this one opens, so a repeated action
   *  ("Alert acknowledged" three times) shows one toast, not a stack over the page. */
  replace?: string
}
```

```ts
export function useToast(): ToastApi
```

## Examples

Each is compiled and rendered on the docs page. Imports are omitted; see above.

### Tones

```tsx
function TonesExample() {
  const { toast } = useToast()

  return (
    <div className="flex flex-wrap gap-3">
      <Button variant="secondary" size="sm" onClick={() => toast({ title: 'Depot hours changed', tone: 'info' })}>
        Info
      </Button>
      <Button variant="secondary" size="sm" onClick={() => toast({ title: 'Manifest saved', tone: 'ok' })}>
        Ok
      </Button>
      <Button variant="secondary" size="sm" onClick={() => toast({ title: 'Depot closes early', tone: 'warning' })}>
        Warning
      </Button>
      <Button variant="secondary" size="sm" onClick={() => toast({ title: 'Sync failed', tone: 'hostile' })}>
        Hostile
      </Button>
    </div>
  )
}

<TonesExample />
```

### With a description

```tsx
function WithDescriptionExample() {
  const { toast } = useToast()

  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={() => toast({ title: 'Manifest saved', description: 'Twelve items, filed to Brasov north.', tone: 'ok' })}
    >
      Save manifest
    </Button>
  )
}

<WithDescriptionExample />
```

### With an action

```tsx
function WithActionExample() {
  const { toast } = useToast()

  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={() =>
        toast({
          title: 'Item removed',
          action: {
            label: 'Undo',
            altText: 'Undo from the manifest history',
            onAction: () => toast({ title: 'Item restored', tone: 'ok' }),
          },
        })
      }
    >
      Remove item
    </Button>
  )
}

<WithActionExample />
```

## Keyboard

| Keys | Result |
|---|---|
| `F8` | Moves focus into the notification region. |
| `Tab` | Moves through the toast's action and close button. A toast with focus pauses its timer. |
| `Escape` | Closes the toast that has focus. |

## Do

- Use a toast to confirm something the person just did.
- Give every action an altText that says where else it can be done.
- Keep the title under about six words.
- After an action runs, focus goes back to where it was before it entered the toast. If the action changes the page (Undo puts a row back), move focus to what changed yourself.
- A toast follows the innermost open overlay (a dialog or panel on top of the page). If it's raised while one is open, or is already showing when one opens, it shows inside that overlay, and it moves back to the page corner when the overlay closes. AlertDialog is the exception: its toasts always show in the page corner, above the scrim (the dimmed layer behind the dialog).

## Don't

- Don't put the only copy of important information in a toast. It goes away.
- Don't show a toast for a change the page already shows.
- Don't line up more than three at once.

## Common mistakes

Wrong:

```tsx
function SettingsForm() {
  return (
    <Toaster>
      <Form />
    </Toaster>
  )
}
```

Right:

```tsx
// once, at the root
<Toaster>
  <App />
</Toaster>

// anywhere below it
const { toast } = useToast()
toast({ title: 'Settings saved', tone: 'ok' })
```

A screen that mounts its own Toaster gets a second viewport (the corner where toasts appear) and a second live region (the area screen readers listen to for announcements). Rely on the one at the root and call useToast().

## Anatomy

- **Toaster**: The provider and the viewport, mounted once in the app shell.
- **Viewport**: The area where toasts appear: bottom right, 360px (pixels) wide, full width on a phone. Pressing F8 moves focus into it.
- **Toast**: Built like Alert, on the sunken surface: icon, tone word, title, description, action and a close button. Hovering over it pauses its timer too.
- **Action**: Optional. Needs altText, which says how to do the same thing somewhere else.
