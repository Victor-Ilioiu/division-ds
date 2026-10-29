import type { ComponentMeta } from '../../docs/meta'

export const meta: ComponentMeta = {
  name: 'Slider',
  title: 'Slider',
  tier: 'atoms',
  slug: 'slider',
  summary:
    'A value or a range picked on a track. Each thumb (the handle you drag) gets its own name. If a range slider shared one name, a screen-reader user (someone using software that reads the page aloud) would get two controls called the same thing.',
  anatomy: [
    { part: 'Label and readout', description: 'An 11px (pixel) mono label, in a monospaced font, and a 24px Oxanium readout with tabular figures, digits that all take the same width. Unlike Progress, there are no dimmed leading zeros. min and max belong to the caller and formatValue can return anything, so a fixed digit width would be one the value doesn’t actually have.' },
    { part: 'Track', description: '4px tall, sunken, no border.' },
    { part: 'Range', description: 'The filled span, in accent.signal.indicator.' },
    { part: 'Thumb', description: 'A 20px square inside a 24px hit area, the region that responds to a click or tap. There’s one per value.' },
  ],
  props: [
    { name: 'label', type: 'string', description: 'Required. Applied to each thumb. A single thumb gets it as-is, and a range adds "minimum" / "maximum" to the end.' },
    { name: 'value', type: 'number[]', description: 'The value(s), when you control them from outside. One number makes a single slider; two make a range.' },
    { name: 'defaultValue', type: 'number[]', description: 'The starting value(s), when the slider manages them itself (uncontrolled).' },
    { name: 'onValueChange', type: '(value: number[]) => void', description: 'Fires as the thumb moves.' },
    { name: 'min', type: 'number', default: '0', description: 'The lowest value.' },
    { name: 'max', type: 'number', default: '100', description: 'The highest value.' },
    { name: 'step', type: 'number', default: '1', description: 'The increment for both snapping while dragging and the arrow keys.' },
    { name: 'disabled', type: 'boolean', description: 'Takes it out of the tab order and blocks input.' },
    {
      name: 'formatValue',
      type: '(value: number) => string',
      description: 'One function feeds both the readout and aria-valuetext (the ARIA, or Accessible Rich Internet Applications, attribute a screen reader speaks as the value). So the spoken value and the printed one can’t drift apart, whether the slider is controlled or not.',
    },
    { name: 'showValue', type: 'boolean', default: 'false', description: 'Shows the current value(s) as a readout.' },
    { name: 'className', type: 'string', description: "Merged with the outer wrapper's classes. Later Tailwind utilities (Tailwind is the CSS framework the system uses) win." },
    { name: 'ref', type: 'Ref<HTMLSpanElement>', description: 'Passed through to the Radix Slider root. Radix is the library of accessible building blocks this sits on.' },
    {
      name: '...rest',
      type: "Omit<Slider.Root props, 'aria-label' | 'aria-labelledby' | 'children'>",
      description:
        'Every Radix Slider.Root prop except those three, spread onto the root. aria-label and aria-labelledby are left out because the accessible name lives on each thumb, where label puts it. One on the root would do nothing at all, not override anything. children is typed away because this component draws its own Track/Range/Thumbs, and a children prop would be thrown away without any warning.',
    },
  ],
  keyboard: [
    { keys: ['→', '↑'], does: 'Goes up by one step.' },
    { keys: ['←', '↓'], does: 'Goes down by one step.' },
    { keys: ['Page Up'], does: 'Goes up by a bigger jump.' },
    { keys: ['Page Down'], does: 'Goes down by a bigger jump.' },
    { keys: ['Home'], does: 'Jumps to the minimum.' },
    { keys: ['End'], does: 'Jumps to the maximum.' },
  ],
  useWhen: 'A value or range on a track, where the rough position matters and the value is shown.',
  notFor: 'A precise value with no other way to enter it. Use Input.',
  dos: [
    'Use formatValue whenever the number has a unit.',
    'Show the value. A slider with no readout asks people to guess.',
    'Put a number input beside it when the exact value matters.',
  ],
  donts: [
    "Don't use a slider where a precise value is required and nothing else lets people enter one.",
    "Don't shrink the thumb below 24×24 of hit area.",
    "Don't rely on dragging alone. Every slider here works fully from the keyboard, and it should stay that way.",
  ],
}
