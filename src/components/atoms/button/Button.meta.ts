import type { ComponentMeta } from '../../docs/meta'

export const meta: ComponentMeta = {
  name: 'Button',
  title: 'Button',
  tier: 'atoms',
  slug: 'button',
  summary:
    "The main control for taking an action. It comes in five variants (one of them a button that looks like a text link) and four sizes, with optional icons on either side of the label. It also draws its own focus ring, the outline that shows which control the keyboard is on. The component places that ring for you, because the bevel (the cut corners) would clip one placed anywhere else.",
  pitfalls: [
    {
      wrong: `<div>
  <Button variant="secondary">Cancel</Button>
  <Button>Save</Button>
</div>`,
      right: `<div className="flex flex-wrap gap-3">
  <Button variant="secondary">Cancel</Button>
  <Button>Save</Button>
</div>`,
      why: "Buttons render inline-flex, and JSX (the HTML-like syntax React components are written in) drops the whitespace between them, so buttons placed side by side touch. The parent sets the gap. npm run check:button-spacing fails if there isn't one.",
    },
    {
      wrong: `<Button disabled={saving}>Save</Button>`,
      right: `<Button loading={saving}>Save</Button>`,
      why: "A busy button stays focusable and tells people it's busy through loading. Native disabled is for an action that isn't available, and it takes the button out of the tab order, so the Tab key skips it.",
    },
  ],
  anatomy: [
    {
      part: 'Focus wrapper',
      description:
        "A span that isn't clipped, carrying .bevel-focus-wrap. It draws the ring on :has(:focus-visible), so a mouse click doesn't show it, plus the reticle brackets (corner marks like a targeting sight) that close in on hover. It's always there and never optional.",
    },
    { part: 'Button', description: "The clipped, bevelled control. It never carries its own outline." },
    {
      part: 'Spinner',
      description: "Decoration only, shown while loading. The hidden label is what screen readers announce.",
    },
    {
      part: 'Label',
      description:
        'Oxanium semibold, uppercase: the display type role. The link variant switches to the body role, in the signal text colour, underlined.',
    },
    {
      part: 'Icons',
      description:
        "Optional, before and after the label. Each sits in an aria-hidden slot sized to the button (14px at xs and sm, 16px at md, 20px at lg). aria-hidden is an ARIA attribute (Accessible Rich Internet Applications, the labels that tell screen readers what things are) that hides the icon from screen readers. While loading, the spinner takes the leading slot.",
    },
  ],
  props: [
    {
      name: 'variant',
      type: "'primary' | 'secondary' | 'danger' | 'ghost' | 'link'",
      default: "'primary'",
      description:
        "Which fill/border treatment to use. link looks like a Link (signal text, underline, no fill, no bevel, no fixed height) but it's still a button. Use it for an action inside a sentence, not for going to another page.",
    },
    {
      name: 'size',
      type: "'xs' | 'sm' | 'md' | 'lg'",
      default: "'md'",
      description:
        "24 / 32 / 40 / 48px (pixels). xs is exactly the 24px minimum target, the smallest area people can reliably click or tap. It isn't a token step (there is no xs control-height token) and it's meant for dense toolbars and table rows. Size has no effect on the link variant, which takes the size of the text around it.",
    },
    {
      name: 'fullWidth',
      type: 'boolean',
      default: 'false',
      description: 'Stretches the wrapper as well as the button.',
    },
    {
      name: 'loading',
      type: 'boolean',
      default: 'false',
      description:
        "Sets aria-busy and aria-disabled, blocks the click and the form submit, and shows the spinner. The button stays focusable.",
    },
    { name: 'loadingLabel', type: 'string', default: "'Working'", description: "Text that's hidden on screen but read aloud while loading." },
    {
      name: 'iconStart',
      type: 'ReactNode',
      description:
        "An icon before the label, rendered aria-hidden and sized to the button. The spinner replaces it while loading. It isn't available with asChild: put the icon inside the child element instead.",
    },
    {
      name: 'iconEnd',
      type: 'ReactNode',
      description: "An icon after the label, rendered aria-hidden. It stays while loading. Not available with asChild.",
    },
    {
      name: 'asChild',
      type: 'boolean',
      default: 'false',
      description:
        "Renders the child element with the button's classes. Use it for links that look like buttons. Combining it with disabled, loading or loadingLabel is a type error, so the code won't compile, instead of quietly doing nothing. A link can't really be disabled or made busy, so those props are removed from the types rather than ignored when the page runs.",
    },
    { name: 'wrapperClassName', type: 'string', description: 'Classes for the focus wrapper, not the button.' },
    { name: 'className', type: 'string', description: "Merged with the component's classes. When Tailwind utility classes clash, the later one wins." },
    { name: 'ref', type: 'Ref<HTMLButtonElement>', description: 'Passed through to the button element.' },
    {
      name: 'type',
      type: "'button' | 'submit' | 'reset'",
      default: "'button'",
      description: "A Button never submits a form by accident. Ask for submit on the one that should.",
    },
    {
      name: '...rest',
      type: "Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-busy' | 'children'>",
      description:
        'Every native button prop except aria-busy. aria-busy is removed from the types rather than quietly overwritten when the page runs. loading is the only thing that sets it, and a loading button saying aria-busy="false" would be a spinning, aria-disabled control telling assistive tech (screen readers and other tools people with disabilities use) that it\'s idle. children is its own declared prop above, not part of rest.',
    },
  ],
  keyboard: [
    { keys: ['Tab'], does: 'Moves focus to the button. The ring appears on the wrapper.' },
    { keys: ['Enter'], does: "Activates it. While loading it does nothing, and the caller's onClick doesn't run." },
    { keys: ['Space'], does: "Activates it. While loading it does nothing, and the caller's onClick doesn't run." },
  ],
  useWhen: 'An action on this page, like submit, save or open a dialog.',
  notFor: "Going somewhere (use Link, or Button asChild around an anchor), or an action with no visible word (use IconButton).",
  dos: [
    "One primary button per view. The signal colour only means something if it's rare.",
    'Use asChild for a link that should look like a button, so it stays a real link.',
    'Say what the button does: ‘Dispatch team’, not ‘Submit’.',
    'Use loading instead of disabling the button and swapping the label yourself.',
    "Use loading on a submit button. It keeps focus while the form works, so a keyboard user is never thrown back to the top of the page.",
    'Pass icons through iconStart and iconEnd, not as children. That way they stay hidden from assistive tech and get sized with the button.',
    'Use the link variant for an action that sits in running text or next to a heading (‘Reset filters’). Use Link for anything that goes somewhere.',
  ],
  donts: [
    "Don't add bevel-* or an outline class yourself. You'll clip the ring off.",
    "Don't use danger for anything that can be undone.",
    "Don't put a ghost button next to a secondary one. People can't tell which matters more any more.",
    "Don't disable a button without saying somewhere why it's disabled.",
    "Don't use the link variant to go to another page. A control that goes somewhere is a Link, or a Button with asChild around an anchor.",
    "Don't make an icon-only button by passing iconStart with no label. That's IconButton, which requires a name.",
    "Don't use xs for a page's main actions. It's the minimum target size, for dense rows only.",
    "Don't try to disable a link (asChild) or give it a loading state. Render the state you want directly instead (a plain span, or a real disabled button) rather than fighting the type error.",
  ],
}
