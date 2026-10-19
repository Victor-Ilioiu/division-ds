import type { ComponentMeta } from '../../docs/meta'

export const meta: ComponentMeta = {
  name: 'Accordion',
  title: 'Accordion',
  tier: 'molecules',
  slug: 'accordion',
  summary:
    'Sections that open and close in place, each under its own heading. You can allow one open at a time or several, and draw them as plain rows split by thin lines or as a panel per section.',
  pitfalls: [
    {
      wrong: '<Accordion type="single">',
      right: '<Accordion type="single" collapsible>',
      why: "Without collapsible, a single-mode accordion can never be fully closed again once a section is open. That surprises people.",
    },
    {
      wrong: '<AccordionTrigger>Shipping</AccordionTrigger> // under an h3 section title',
      right: '<AccordionTrigger level={4}>Shipping</AccordionTrigger>',
      why: 'Every trigger (the clickable section header) sits inside a heading, h3 (a level-3 heading) by default. Set level so the triggers nest one level below the heading they appear under.',
    },
  ],
  anatomy: [
    { part: 'Accordion', description: 'The root. It holds which sections are open and the variant, and every part below reads both.' },
    {
      part: 'AccordionItem',
      description:
        "One section. plain: a thin line under it. boxed: its own raised panel with the cut corner. The panel is drawn on a backing layer marked aria-hidden (hidden from screen readers), so the item itself is never clipped.",
    },
    {
      part: 'AccordionTrigger',
      description:
        'A button inside a heading of the level you choose. It uses the display typeface, has a chevron that turns half a revolution when the section is open, and is underlined on hover.',
    },
    {
      part: 'AccordionContent',
      description:
        "A region labelled by its trigger, in secondary text. It grows open over the base duration and shrinks shut faster (M7). When someone has asked their device for reduced motion, it snaps open and shut instead.",
    },
  ],
  props: [
    {
      name: 'type',
      type: "'single' | 'multiple'",
      description: 'Required on the root. single: opening one section closes the other. multiple: any number can be open.',
    },
    {
      name: 'collapsible',
      type: 'boolean',
      default: 'false',
      description: "single mode only. Lets the open section be closed again by its own trigger. You'll want it almost always.",
    },
    {
      name: 'variant',
      type: "'plain' | 'boxed'",
      default: "'plain'",
      description: 'plain: thin separator lines, for a long run of questions. boxed: a panel per section, for a few sections that each stand alone.',
    },
    {
      name: 'value (Root)',
      type: 'string | string[]',
      description: 'The open section when the page controls it: a string in single mode, an array in multiple mode.',
    },
    {
      name: 'defaultValue',
      type: 'string | string[]',
      description: 'The section or sections open at first, when the accordion keeps track itself (uncontrolled). Set on the root.',
    },
    {
      name: 'onValueChange',
      type: '(value: string | string[]) => void',
      description: 'Called when a section opens or closes (on the root). The argument has the same shape as type.',
    },
    { name: 'value (Item)', type: 'string', description: 'Required. The section’s own value.' },
    { name: 'disabled (Item)', type: 'boolean', default: 'false', description: "The section can't be opened or closed." },
    {
      name: 'level (Trigger)',
      type: '2 | 3 | 4 | 5 | 6',
      default: '3',
      description: 'The level of the heading the trigger sits in. Pick one below the heading the accordion appears under.',
    },
    {
      name: 'forceMount (Content)',
      type: 'true',
      description: "Keeps a closed panel in the page's code (the DOM, the browser's live model of the page), so the browser's find-in-page search can reach its content. It then skips the closing animation.",
    },
    {
      name: 'className',
      type: 'string',
      description: "Merged with each part’s classes. On AccordionContent it goes on the inner padded box, not the animated clipping box around it.",
    },
    { name: 'ref', type: 'Ref<HTMLElement>', description: "Passed through to the DOM element. Every part has one; the trigger’s is the button." },
  ],
  keyboard: [
    { keys: ['Tab'], does: "Moves between triggers, and into an open section’s content." },
    { keys: ['Enter', 'Space'], does: 'Opens or closes the focused section.' },
    { keys: ['↓', '↑'], does: 'Goes to the next or previous trigger, wrapping round at the ends and skipping disabled ones.' },
    { keys: ['Home', 'End'], does: 'Goes to the first or last trigger.' },
  ],
  useWhen: 'Sections people scan by heading and open one or two of: frequently asked questions (FAQ), grouped settings, long specifications.',
  notFor: 'Steps in a sequence: use Stepper. Equal views of the same thing: use Tabs.',
  dos: [
    'Use it for content people scan by its headings and open one or two of: an FAQ, a group of settings, long specifications.',
    'Write each trigger as the question or the section name, so the closed list reads like a table of contents.',
    'Set collapsible in single mode.',
    'Use boxed for a few sections that each hold controls, and plain for a long list of text answers.',
  ],
  donts: [
    "Don't hide the one thing everyone needs inside a closed section. Show it.",
    "Don't use it for steps in a sequence. That's Stepper.",
    "Don't use it to switch between equal views of the same thing. That's Tabs.",
    "Don't nest an accordion inside another accordion's content.",
  ],
}
