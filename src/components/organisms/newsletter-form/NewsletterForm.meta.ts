import type { ComponentMeta } from '../../docs/meta'

export const meta: ComponentMeta = {
  name: 'NewsletterForm',
  title: 'Newsletter form',
  tier: 'organisms',
  slug: 'newsletter-form',
  summary:
    "An email field, a line saying what you're agreeing to, and a button. It checks input the same way every form here does, is honest about waiting while it sends, and tells you when it worked.",
  anatomy: [
    {
      part: 'Form',
      description:
        'Screen readers name it by the label prop. It sits on opaque surface.base, in a hairline frame with the corner crosshair.',
    },
    {
      part: 'Error summary',
      description:
        "Appears when a submit fails and takes focus. Its entry moves focus to the field. It waits for someone to try submitting: leaving the field (a blur) never brings it up on its own.",
    },
    {
      part: 'Email',
      description: 'A FormField wrapped around an Input, set to type email, autocomplete email and required.',
    },
    {
      part: 'Consent',
      description:
        "Required. What subscribing means and how to stop. Screen readers read it as the submit button's description.",
    },
    {
      part: 'Submit',
      description:
        "A Button that keeps focus and shows it's busy while onSubmit is pending. aria-busy and aria-disabled, two ARIA attributes (Accessible Rich Internet Applications, the labels screen readers rely on), tell screen readers the same.",
    },
    {
      part: 'Submit error',
      description:
        'An alert region that is always there and gets its text when onSubmit fails. The visible message only appears then. It clears before the next try.',
    },
    {
      part: 'Success',
      description:
        'Takes the place of the form: a check icon, a heading that takes focus, and the address that was subscribed.',
    },
    {
      part: 'Status',
      description:
        "Hidden from view and present from the start. It announces the success only if focus had already left the form.",
    },
  ],
  props: [
    {
      name: 'label',
      type: 'string',
      description:
        "Required. The form's accessible name, the name screen readers say, e.g. \"Newsletter sign-up\". Leaving it out is a compile error.",
    },
    {
      name: 'onSubmit',
      type: '(email: string) => void | Promise<void>',
      description:
        "Required. Called with the trimmed address once it passes validation. Resolve (finish successfully) to show the success state. Reject (fail) to show the alert, and what was typed stays in the field.",
    },
    {
      name: 'consent',
      type: 'ReactNode',
      description: 'Required. The consent line. Leaving it out is a compile error.',
    },
    {
      name: 'fieldLabel',
      type: 'string',
      default: "'Email'",
      description:
        "The field's label and the name screen readers say for it, as one string. Say what the address is for when the page might have another email field, such as a footer under a sign-in form.",
    },
    { name: 'submitLabel', type: 'string', default: "'Subscribe'", description: 'The button text.' },
    {
      name: 'busyLabel',
      type: 'string',
      default: "'Subscribing'",
      description: 'What a screen reader hears while onSubmit is pending.',
    },
    { name: 'successTitle', type: 'string', default: "'You are subscribed'", description: 'The success heading.' },
    {
      name: 'successBody',
      type: '(email: string) => ReactNode',
      default: 'email => `Updates go to ${email}.`',
      description: 'The line under the success heading. It receives the subscribed address.',
    },
    {
      name: 'headingLevel',
      type: '2 | 3 | 4',
      default: '3',
      description:
        'The level of the error summary heading and the success heading. Make it one below the heading of the section the form sits in.',
    },
    { name: 'className', type: 'string', description: 'Added to the root element.' },
    {
      name: 'ref',
      type: 'Ref<HTMLDivElement>',
      description: 'Passed to the root element, which stays on the page when the success message replaces the form.',
    },
  ],
  keyboard: [
    { keys: ['Tab'], does: 'Moves to the field, then the button. Screen readers read the consent line with the button.' },
    {
      keys: ['Enter'],
      does: "In the field or on the button, it submits, and it does nothing while a submit is pending. On the error summary entry, it moves focus to the field.",
    },
  ],
  useWhen: 'Collecting one email address for a newsletter, with a consent line.',
  notFor: 'Creating an account: use AuthForm.',
  dos: [
    'Say in the consent line how often you write and how to stop.',
    'Start the section it sits in with a heading that says what the emails are about.',
    'Reject onSubmit when the request fails. The form shows the alert and keeps the address.',
    'Set headingLevel to one below the section heading above it.',
  ],
  donts: [
    "Don't pre-tick anything, or sign people up as a side effect of another form.",
    "Don't put network code in it. onSubmit belongs to you; the form handles busy, failure and success.",
    "Don't place it on a raised panel and remove its fill. Field errors sit on surface.base.",
    "Don't ask for a name. Having just one field is the point.",
  ],
}
