# AuthForm

> One form with four modes: sign in, create an account, reset a password, or enter a two-step code. It's built so password managers, pasting and keyboards all just work.

- **Best for:** Sign in, create an account, reset a password or enter a two-step code.
- **Not for:** A newsletter sign-up: use NewsletterForm. Any other form: build it from FormField controls.
- Organism. Source: `src/components/organisms/auth-form/AuthForm.tsx`
- Rendered docs page: `/components/auth-form`

## Import

```tsx
import { AuthForm } from 'src/components/organisms/auth-form/AuthForm'
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `mode` | `'sign-in' \| 'create-account' \| 'reset-password' \| 'verify-code'` |  | Required. Which form shows. |
| `onSubmit` | `(values: AuthValues, mode: AuthMode) => void \| AuthErrors \| Promise<void \| AuthErrors>` |  | Required. Runs once every field passes its checks. Resolve with errors keyed by field name to show them. If it rejects, a general alert for the whole form appears, so the failure isn't lost. |
| `onModeChange` | `(mode: AuthMode) => void` |  | Offers the other modes and reports when someone switches. |
| `headingLevel` | `2 \| 3 \| 4` | `2` | Match the page's heading outline. The error summary sits one level below. The exception is 4, the lowest heading this system uses: there the summary stays an h4 (a level-4 heading) too. |
| `className` | `string` |  | Merged with the root classes. Later Tailwind utilities win. |
| `ref` | `Ref<HTMLFormElement>` |  | The form. |

## Types and helpers

Exported beside the component, from the same file. Import a type with `import type { ... }`.

```ts
export type AuthMode = 'sign-in' | 'create-account' | 'reset-password' | 'verify-code'
```

```ts
export type AuthField = 'name' | 'email' | 'password' | 'code'
```

```ts
export type AuthValues = Record<AuthField, string>
```

```ts
export type AuthErrors = FieldErrors<AuthField>
```

## Examples

Each is compiled and rendered on the docs page. Imports are omitted; see above.

### Sign in, with a server error, and the other modes

```tsx
const wait = (ms: number) => new Promise(resolve => window.setTimeout(resolve, ms))

function AccountExample() {
  const [mode, setMode] = useState<AuthMode>('sign-in')
  const [signedIn, setSignedIn] = useState('')
  const submit = async (values: AuthValues, current: AuthMode) => {
    await wait(600)
    if (current === 'sign-in' && values.password !== 'hexline') {
      return { password: 'That email and password do not match.' }
    }
    if (current === 'sign-in' || current === 'create-account') setSignedIn(`Signed in as ${values.email}. This is a demo.`)
    return undefined
  }
  return (
    <div className="flex flex-col gap-3 w-full max-w-sm">
      <p className="font-body text-sm text-[var(--color-text-secondary)]">
        Demo: any email works, and the password <code className="font-mono">hexline</code> signs in.
      </p>
      <AuthForm
        mode={mode}
        onModeChange={next => {
          setMode(next)
          setSignedIn('')
        }}
        onSubmit={submit}
        headingLevel={4}
      />
      <p role="status" className="font-body text-sm text-[var(--color-text-primary)]">
        {signedIn}
      </p>
    </div>
  )
}

<AccountExample />
```

### Two-step sign-in with a code

```tsx
const wait = (ms: number) => new Promise(resolve => window.setTimeout(resolve, ms))

<AuthForm mode="verify-code" onSubmit={() => wait(600).then(() => undefined)} headingLevel={4} />
```

## Keyboard

| Keys | Result |
|---|---|
| `Tab` | Moves through the fields (the password field, then its Show password button), the submit button and the mode links. |
| `Enter` | In a field, submits. On an error summary entry or a mode link, activates it. |
| `Space` | On Show password, toggles it. On a mode link, activates it. |

## Do

- Let password managers work. Every field has its autocomplete token, and pasting is never blocked.
- Resolve onSubmit with errors keyed by field (a wrong password, say), so they show in the summary and at the field.
- Expect a rejected onSubmit to show up as its own alert instead of failing silently. There's no field to attach it to.
- Keep the reset confirmation neutral. It never says whether an account exists.

## Don't

- Don't add a CAPTCHA, a puzzle or a copy-paste block. Signing in mustn't test memory or copying by hand (WCAG success criterion 3.3.8; WCAG is the Web Content Accessibility Guidelines, the public rulebook for usable websites).
- Don't disable the submit button while fields are empty. The error summary says what's missing.
- Don't validate on every keystroke.
- Don't count on an error keyed to a field the current mode doesn't show (name while signing in, for example) landing where you'd expect. It's moved onto email, and a console.warn that only shows in development names it. Key it to a field the mode actually shows instead.

## Anatomy

- **Heading**: Names the form. Focus (the place your keyboard typing goes) moves here after a mode switch.
- **Error summary**: Shows up when a submit fails and takes focus. Each entry jumps to its field. It waits for a real submit attempt: leaving a field (a blur) never brings it up, so it can't shove aside a field someone's about to click.
- **Fields**: A FormField around each Input, with its help and error text connected to it.
- **Show password**: An icon button inside the password field that shows the typed text. It uses Input's revealable option, reports on or off through aria-pressed (ARIA, Accessible Rich Internet Applications, is a set of attributes that tell screen readers what a control is doing), and keeps the same name either way. The text hides again on submit and on a mode switch.
- **Submit**: A Button that stays focusable and shows it's busy while the caller works.
- **Confirmation**: A status line that's always on the page. Reset mode uses it.
- **Submit error**: An alert that's always present and gets its text when onSubmit rejects (the visible copy only appears then). It clears on the next submit and on a mode switch.
- **Mode links**: Shown when onModeChange is given: forgot password, create an account, back to sign in. They're buttons, since they change the form in place, but they look exactly like Link: signal text, an underline that thickens on hover, a pointer cursor and a focus ring.
