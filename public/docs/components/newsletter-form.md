# NewsletterForm

> An email field, a line saying what you're agreeing to, and a button. It checks input the same way every form here does, is honest about waiting while it sends, and tells you when it worked.

- **Best for:** Collecting one email address for a newsletter, with a consent line.
- **Not for:** Creating an account: use AuthForm.
- Organism. Source: `src/components/organisms/newsletter-form/NewsletterForm.tsx`
- Rendered docs page: `/components/newsletter-form`

## Import

```tsx
import { NewsletterForm } from 'src/components/organisms/newsletter-form/NewsletterForm'
```

Paths are from the Division DS repository root. Installed with shadcn they start `src/division-ds/` instead of `src/` (`src/division-ds/components/...`); import them relative to your file. An install has no index barrels: import each component from its own file, never from `components/molecules`.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `label` | `string` |  | Required. The form's accessible name, the name screen readers say, e.g. "Newsletter sign-up". Leaving it out is a compile error. |
| `onSubmit` | `(email: string) => void \| Promise<void>` |  | Required. Called with the trimmed address once it passes validation. Resolve (finish successfully) to show the success state. Reject (fail) to show the alert, and what was typed stays in the field. |
| `consent` | `ReactNode` |  | Required. The consent line. Leaving it out is a compile error. |
| `fieldLabel` | `string` | `'Email'` | The field's label and the name screen readers say for it, as one string. Say what the address is for when the page might have another email field, such as a footer under a sign-in form. |
| `submitLabel` | `string` | `'Subscribe'` | The button text. |
| `busyLabel` | `string` | `'Subscribing'` | What a screen reader hears while onSubmit is pending. |
| `successTitle` | `string` | `'You are subscribed'` | The success heading. |
| `successBody` | `(email: string) => ReactNode` | `email => `Updates go to ${email}.`` | The line under the success heading. It receives the subscribed address. |
| `headingLevel` | `2 \| 3 \| 4` | `3` | The level of the error summary heading and the success heading. Make it one below the heading of the section the form sits in. |
| `className` | `string` |  | Added to the root element. |
| `ref` | `Ref<HTMLDivElement>` |  | Passed to the root element, which stays on the page when the success message replaces the form. |

## Examples

Each is compiled and rendered on the docs page. Imports are omitted; see above.

### A sign-up that succeeds

```tsx
const wait = (ms: number) => new Promise(resolve => window.setTimeout(resolve, ms))

const CONSENT = 'One email a month. Every one has an unsubscribe link.'

async function accept() {
  await wait(700)
}

<div className="flex w-full flex-col gap-3">
  <p className="font-body text-sm text-[var(--color-text-secondary)]">
    Demo: any address is accepted after a short wait. Nothing is sent.
  </p>
  <NewsletterForm label="Field notes by email" consent={CONSENT} onSubmit={accept} headingLevel={4} />
</div>
```

### A sign-up that fails

```tsx
const wait = (ms: number) => new Promise(resolve => window.setTimeout(resolve, ms))

async function refuse() {
  await wait(700)
  throw new Error('The demo server is switched off.')
}

<div className="flex w-full flex-col gap-3">
  <p className="font-body text-sm text-[var(--color-text-secondary)]">
    Demo: this one rejects every address, so you can see the alert, and the address you typed stays in the field.
  </p>
  <NewsletterForm
    label="Restock alerts by email"
    consent="An email when a sold-out replica is back. Nothing else."
    submitLabel="Notify me"
    busyLabel="Signing you up"
    onSubmit={refuse}
    headingLevel={4}
  />
</div>
```

## Keyboard

| Keys | Result |
|---|---|
| `Tab` | Moves to the field, then the button. Screen readers read the consent line with the button. |
| `Enter` | In the field or on the button, it submits, and it does nothing while a submit is pending. On the error summary entry, it moves focus to the field. |

## Do

- Say in the consent line how often you write and how to stop.
- Start the section it sits in with a heading that says what the emails are about.
- Reject onSubmit when the request fails. The form shows the alert and keeps the address.
- Set headingLevel to one below the section heading above it.

## Don't

- Don't pre-tick anything, or sign people up as a side effect of another form.
- Don't put network code in it. onSubmit belongs to you; the form handles busy, failure and success.
- Don't place it on a raised panel and remove its fill. Field errors sit on surface.base.
- Don't ask for a name. Having just one field is the point.

## Anatomy

- **Form**: Screen readers name it by the label prop. It sits on opaque surface.base, in a hairline frame with the corner crosshair.
- **Error summary**: Appears when a submit fails and takes focus. Its entry moves focus to the field. It waits for someone to try submitting: leaving the field (a blur) never brings it up on its own.
- **Email**: A FormField wrapped around an Input, set to type email, autocomplete email and required.
- **Consent**: Required. What subscribing means and how to stop. Screen readers read it as the submit button's description.
- **Submit**: A Button that keeps focus and shows it's busy while onSubmit is pending. aria-busy and aria-disabled, two ARIA attributes (Accessible Rich Internet Applications, the labels screen readers rely on), tell screen readers the same.
- **Submit error**: An alert region that is always there and gets its text when onSubmit fails. The visible message only appears then. It clears before the next try.
- **Success**: Takes the place of the form: a check icon, a heading that takes focus, and the address that was subscribed.
- **Status**: Hidden from view and present from the start. It announces the success only if focus had already left the form.
