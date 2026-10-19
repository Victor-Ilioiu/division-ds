import type { ComponentMeta } from '../../docs/meta'

export const meta: ComponentMeta = {
  name: 'Link',
  title: 'Link',
  tier: 'atoms',
  slug: 'link',
  summary:
    "A link inside text. It's underlined, because in a paragraph colour alone isn't enough to show that something is a link.",
  anatomy: [
    { part: 'Anchor', description: "The browser's own <a> element. You can focus it and use it from the keyboard without any extra work." },
    {
      part: 'Underline',
      description: '1px (pixel) thick, sitting 2px below the text. It gets thicker on hover in the signal tone.',
    },
    {
      part: 'External icon',
      description:
        "Hidden from screen readers with aria-hidden (an ARIA attribute, from Accessible Rich Internet Applications). It only shows when external is set.",
    },
    {
      part: 'Hidden warning',
      description:
        '‘(opens in a new tab)’, added to the accessible name, which is what screen readers announce for the link.',
    },
  ],
  props: [
    { name: 'tone', type: "'signal' | 'quiet'", default: "'signal'", description: 'Which colour treatment to use.' },
    {
      name: 'external',
      type: 'boolean',
      default: 'false',
      description:
        "Opens the link in a new tab. It adds target=\"_blank\", the rel hardening (attributes that stop the new page reaching back into yours), a trailing icon and the hidden \"(opens in a new tab)\" warning. Using it together with target or rel is a type error, so it can't fail silently. external already sets those values, so those props are removed from the type instead of being quietly overwritten while the page runs.",
    },
    { name: 'href', type: 'string', description: 'Where the link goes.' },
    {
      name: 'className',
      type: 'string',
      description:
        'Merged with the component classes. If two clash, the later Tailwind utility wins (Tailwind is the CSS framework this system styles with).',
    },
    { name: 'ref', type: 'Ref<HTMLAnchorElement>', description: 'Passed through to the anchor element.' },
    { name: '...rest', type: 'AnchorHTMLAttributes<HTMLAnchorElement>', description: 'Every native anchor prop.' },
  ],
  keyboard: [
    {
      keys: ['Tab'],
      does: "Moves focus to it. The focus ring (the outline that shows which element the keyboard is on) is drawn on the link itself, and nothing clips it here.",
    },
    { keys: ['Enter'], does: 'Follows the link.' },
  ],
  useWhen: 'Text that takes you somewhere: another page, a section or another site.',
  notFor: "Something that does an action. Use Button for that (its link variant if it's inside running text).",
  dos: [
    'Keep the underline on links inside running text.',
    "Put the destination in the link text: 'the field kit index', not 'click here'.",
    'Set external on anything that leaves the app, so screen readers announce the new tab.',
    'Use quiet in dense lists where every row is a link anyway.',
  ],
  donts: [
    "Don't use a link for something that does an action. That's a Button.",
    "Don't open a new tab without external. The rel hardening and the warning both come with it.",
    "Don't remove the underline to make a paragraph look tidier.",
    "Don't pass target or rel together with external. Those props are removed from the type, so you can't override them. If you need different values, render a plain anchor yourself.",
  ],
}
