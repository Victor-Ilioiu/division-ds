import type { ComponentMeta } from '../../docs/meta'

export const meta: ComponentMeta = {
  name: 'Toast',
  title: 'Toast',
  tier: 'molecules',
  slug: 'toast',
  summary:
    'A short message that pops up, stays a few seconds and goes away. Hostile toasts (errors) interrupt and stay longer. Everything else waits its turn.',
  requires: [
    'One <Toaster> near the root of the app, wrapped around everything that calls useToast(). AppShell and the demo layout each mount one. Outside it, useToast() throws an error.',
  ],
  pitfalls: [
    {
      wrong: `function SettingsForm() {
  return (
    <Toaster>
      <Form />
    </Toaster>
  )
}`,
      right: `// once, at the root
<Toaster>
  <App />
</Toaster>

// anywhere below it
const { toast } = useToast()
toast({ title: 'Settings saved', tone: 'ok' })`,
      why: 'A screen that mounts its own Toaster gets a second viewport (the corner where toasts appear) and a second live region (the area screen readers listen to for announcements). Rely on the one at the root and call useToast().',
    },
  ],
  anatomy: [
    { part: 'Toaster', description: 'The provider and the viewport, mounted once in the app shell.' },
    {
      part: 'Viewport',
      description: 'The area where toasts appear: bottom right, 360px (pixels) wide, full width on a phone. Pressing F8 moves focus into it.',
    },
    {
      part: 'Toast',
      description:
        "Built like Alert, on the sunken surface: icon, tone word, title, description, action and a close button. Hovering over it pauses its timer too.",
    },
    { part: 'Action', description: 'Optional. Needs altText, which says how to do the same thing somewhere else.' },
  ],
  props: [
    { name: 'title (ToastOptions)', type: 'string', description: 'Required. Screen readers hear the tone word before it.' },
    { name: 'description (ToastOptions)', type: 'string', description: 'Optional body text.' },
    {
      name: 'tone (ToastOptions)',
      type: "'info' | 'ok' | 'warning' | 'hostile'",
      default: "'info'",
      description: 'Which colour, icon and word the toast has.',
    },
    {
      name: 'duration (ToastOptions)',
      type: 'number',
      default: '5000',
      description: 'How many milliseconds before it goes away on its own. 8000 for hostile.',
    },
    {
      name: 'action (ToastOptions)',
      type: '{ label: string; altText: string; onAction: () => void }',
      description: "Optional. Radix (the library the toast is built on) requires altText: what to do somewhere else if someone can't reach the toast in time.",
    },
    {
      name: 'replace (ToastOptions)',
      type: 'string',
      description: 'Optional. Closes any open toast raised with the same string as this one opens, so an action repeated quickly ("Alert acknowledged" three times) shows one toast instead of a stack.',
    },
    {
      name: 'useToast()',
      type: '{ toast: (options: ToastOptions) => string; dismiss: (id: string) => void }',
      description: 'Shows a toast (and returns its id) or closes one. Throws an error outside a Toaster.',
    },
  ],
  keyboard: [
    { keys: ['F8'], does: 'Moves focus into the notification region.' },
    {
      keys: ['Tab'],
      does: "Moves through the toast's action and close button. A toast with focus pauses its timer.",
    },
    { keys: ['Escape'], does: 'Closes the toast that has focus.' },
  ],
  useWhen: 'Confirming something the person just did, for a few seconds.',
  notFor: 'The only copy of important information: use Alert. Also not for a change the page already shows.',
  dos: [
    'Use a toast to confirm something the person just did.',
    'Give every action an altText that says where else it can be done.',
    'Keep the title under about six words.',
    "After an action runs, focus goes back to where it was before it entered the toast. If the action changes the page (Undo puts a row back), move focus to what changed yourself.",
    'A toast follows the innermost open overlay (a dialog or panel on top of the page). If it\'s raised while one is open, or is already showing when one opens, it shows inside that overlay, and it moves back to the page corner when the overlay closes. AlertDialog is the exception: its toasts always show in the page corner, above the scrim (the dimmed layer behind the dialog).',
  ],
  donts: [
    "Don't put the only copy of important information in a toast. It goes away.",
    "Don't show a toast for a change the page already shows.",
    "Don't line up more than three at once.",
  ],
}
