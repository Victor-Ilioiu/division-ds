import type { ComponentMeta } from '../../docs/meta'

export const meta: ComponentMeta = {
  name: 'AuthForm',
  title: 'Auth form',
  tier: 'organisms',
  slug: 'auth-form',
  summary:
    "One form with four modes: sign in, create an account, reset a password, or enter a two-step code. It's built so password managers, pasting and keyboards all just work.",
  anatomy: [
    { part: 'Heading', description: "Names the form. Focus (the place your keyboard typing goes) moves here after a mode switch." },
    {
      part: 'Error summary',
      description:
        "Shows up when a submit fails and takes focus. Each entry jumps to its field. It waits for a real submit attempt: leaving a field (a blur) never brings it up, so it can't shove aside a field someone's about to click.",
    },
    { part: 'Fields', description: 'A FormField around each Input, with its help and error text connected to it.' },
    {
      part: 'Show password',
      description:
        "An icon button inside the password field that shows the typed text. It uses Input's revealable option, reports on or off through aria-pressed (ARIA, Accessible Rich Internet Applications, is a set of attributes that tell screen readers what a control is doing), and keeps the same name either way. The text hides again on submit and on a mode switch.",
    },
    { part: 'Submit', description: "A Button that stays focusable and shows it's busy while the caller works." },
    { part: 'Confirmation', description: "A status line that's always on the page. Reset mode uses it." },
    { part: 'Submit error', description: "An alert that's always present and gets its text when onSubmit rejects (the visible copy only appears then). It clears on the next submit and on a mode switch." },
    { part: 'Mode links', description: "Shown when onModeChange is given: forgot password, create an account, back to sign in. They're buttons, since they change the form in place, but they look exactly like Link: signal text, an underline that thickens on hover, a pointer cursor and a focus ring." },
  ],
  props: [
    { name: 'mode', type: "'sign-in' | 'create-account' | 'reset-password' | 'verify-code'", description: 'Required. Which form shows.' },
    {
      name: 'onSubmit',
      type: '(values: AuthValues, mode: AuthMode) => void | AuthErrors | Promise<void | AuthErrors>',
      description:
        "Required. Runs once every field passes its checks. Resolve with errors keyed by field name to show them. If it rejects, a general alert for the whole form appears, so the failure isn't lost.",
    },
    { name: 'onModeChange', type: '(mode: AuthMode) => void', description: 'Offers the other modes and reports when someone switches.' },
    {
      name: 'headingLevel',
      type: '2 | 3 | 4',
      default: '2',
      description:
        "Match the page's heading outline. The error summary sits one level below. The exception is 4, the lowest heading this system uses: there the summary stays an h4 (a level-4 heading) too.",
    },
    { name: 'className', type: 'string', description: 'Merged with the root classes. Later Tailwind utilities win.' },
    { name: 'ref', type: 'Ref<HTMLFormElement>', description: 'The form.' },
  ],
  keyboard: [
    { keys: ['Tab'], does: 'Moves through the fields (the password field, then its Show password button), the submit button and the mode links.' },
    { keys: ['Enter'], does: 'In a field, submits. On an error summary entry or a mode link, activates it.' },
    { keys: ['Space'], does: 'On Show password, toggles it. On a mode link, activates it.' },
  ],
  useWhen: 'Sign in, create an account, reset a password or enter a two-step code.',
  notFor: 'A newsletter sign-up: use NewsletterForm. Any other form: build it from FormField controls.',
  dos: [
    "Let password managers work. Every field has its autocomplete token, and pasting is never blocked.",
    'Resolve onSubmit with errors keyed by field (a wrong password, say), so they show in the summary and at the field.',
    "Expect a rejected onSubmit to show up as its own alert instead of failing silently. There's no field to attach it to.",
    "Keep the reset confirmation neutral. It never says whether an account exists.",
  ],
  donts: [
    "Don't add a CAPTCHA, a puzzle or a copy-paste block. Signing in mustn't test memory or copying by hand (WCAG success criterion 3.3.8; WCAG is the Web Content Accessibility Guidelines, the public rulebook for usable websites).",
    "Don't disable the submit button while fields are empty. The error summary says what's missing.",
    "Don't validate on every keystroke.",
    "Don't count on an error keyed to a field the current mode doesn't show (name while signing in, for example) landing where you'd expect. It's moved onto email, and a console.warn that only shows in development names it. Key it to a field the mode actually shows instead.",
  ],
}
