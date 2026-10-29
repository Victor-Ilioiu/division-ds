import type { ComponentMeta } from '../../docs/meta'

export const meta: ComponentMeta = {
  name: 'Switch',
  title: 'Switch',
  tier: 'atoms',
  slug: 'switch',
  summary:
    "An on/off control that acts right away. The thumb's position shows the state, so the meaning still comes through with colour turned off. It takes effect the moment it's flipped.",
  requires: [
    "Its own label. A Switch isn't a FormField child (FormField takes Input, Textarea, Select or QuantityStepper). Give it an id and put a <label htmlFor> beside it.",
  ],
  pitfalls: [
    {
      wrong: `<FormField label="Email notifications">
  <Switch />
</FormField>`,
      right: `<div className="flex items-center gap-3">
  <Switch id="notify" checked={on} onCheckedChange={setOn} />
  <label htmlFor="notify">Email notifications</label>
</div>`,
      why: "FormField passes its child an invalid prop, and Switch doesn't take one. A switch acts at once, so it has no error state to show.",
    },
  ],
  anatomy: [
    { part: 'Root', description: "role=switch, which tells screen readers (software that reads the page aloud) what it is. A 44×24 track." },
    {
      part: 'Thumb',
      description:
        "A 16px (pixel) square, 3px from the track edge in both states, travelling 22px. Its position is the state signal. It's text.primary when off and accent.signal.indicator when on. Held down, it stretches 4px away from the edge it rests on: to the right when off, to the left when on, so it never leaves the track. Flipped, it speeds up across the track, gets a little longer in flight and a little shorter against the far edge, then goes back to its own shape. One give, no bounce.",
    },
    {
      part: 'Track fill',
      description:
        "The control fill, on and off. When it's on, only the border turns to accent.signal.indicator. The track doesn't fill with the accent, so the thumb is the one thing that changes colour during a flip.",
    },
  ],
  props: [
    { name: 'checked', type: 'boolean', description: "The checked state, when your code controls it." },
    { name: 'defaultChecked', type: 'boolean', description: "The starting state, when the switch manages itself." },
    {
      name: 'onCheckedChange',
      type: '(checked: boolean) => void',
      description: "Fires the moment it's flipped.",
    },
    { name: 'disabled', type: 'boolean', description: "Takes it out of the tab order and blocks toggling." },
    { name: 'required', type: 'boolean', description: "The browser's own form validation." },
    { name: 'name', type: 'string', description: "The browser's own form field name." },
    { name: 'value', type: 'string', description: "The browser's own form field value." },
    { name: 'id', type: 'string', description: 'Pair it with a real label through htmlFor.' },
    { name: 'className', type: 'string', description: "Merged with the control's classes. Later Tailwind utilities (the small styling classes this system uses) win." },
    { name: 'ref', type: 'Ref<HTMLButtonElement>', description: "Forwarded to the root button from Radix, the open-source library this switch is built on." },
    {
      name: '...rest',
      type: 'ButtonHTMLAttributes<HTMLButtonElement>',
      description: "Every other Radix Switch.Root prop, which means every native button attribute, spread onto the root button. For example aria-describedby, or aria-label when no label element points at it. aria-* attributes are ARIA (Accessible Rich Internet Applications) settings that give screen readers extra information.",
    },
  ],
  keyboard: [
    { keys: ['Tab'], does: 'Moves focus to it.' },
    { keys: ['Space'], does: 'Toggles it.' },
    { keys: ['Enter'], does: "Toggles it. Radix allows this on a switch, though not on a checkbox." },
  ],
  useWhen: "An on/off setting that takes effect the moment it's flipped.",
  notFor: 'A choice in a form that needs a Save. Use Checkbox.',
  dos: [
    'Use it only when flipping it takes effect right away.',
    "Label it with the thing being switched, not with ‘on’ or ‘off’.",
    "Show the result of the switch near it if the effect isn't visible.",
  ],
  donts: [
    "Don't put a switch in a form that needs a Save. Use a Checkbox.",
    "Don't put ‘on’/‘off’ text inside the track. The position already says it, and the text won't fit at 24px.",
    "Don't make the thumb take longer than --duration-base (a timing token) to arrive. A slow switch feels broken. The settle after it arrives only changes its shape, and it ends within --duration-slow, because the state is already readable.",
    "Don't use the squash on anything that isn't a small physical object under the user's finger. On a panel or a page it looks like a wobble.",
    "Don't add a rebound to the thumb. It gives once against the edge and stops. A switch that keeps moving after the state has landed looks unsure.",
    "Don't fill the track with the accent when it's on. Thumb and track changing colour together, mid-flight, is what made the flip look like a twitch.",
  ],
}
