import type { ComponentMeta } from '../../docs/meta'

export const meta: ComponentMeta = {
  name: 'DropdownMenu',
  title: 'Dropdown menu',
  tier: 'molecules',
  slug: 'dropdown-menu',
  summary:
    "A short list of actions behind a button. It uses the same background as Select, so the system's two pop-ups look like one family. The highlighted item gets a fill, as it does everywhere else.",
  anatomy: [
    {
      part: 'Trigger',
      description: 'A Button or IconButton, passed in through asChild. Radix (the library underneath) adds aria-haspopup and aria-expanded. These are ARIA (Accessible Rich Internet Applications) attributes that tell screen readers the button opens a menu and whether it\'s open.',
    },
    {
      part: 'Content',
      description: 'Rendered in a portal, at the end of the page, so nothing clips it. Sunken surface, a strong thin border, crosshair corners. M7: it slides down out of the trigger to open and back up into it to close (the other way round when it opens above).',
    },
    { part: 'Item', description: '36px (pixels) tall. When highlighted: the signal fill with ink-coloured text.' },
    {
      part: 'Hostile item',
      description: 'For a destructive action. Hostile-coloured text at rest, and the hostile fill with ink text when highlighted.',
    },
    {
      part: 'Checkbox item',
      description: 'Shows a tick when on. Screen readers get it as a menuitemcheckbox with aria-checked.',
    },
    {
      part: 'Label',
      description:
        "Uses text.secondary, so it reads as a heading over the items. It doesn't use text.label: on this background (surface.sunken) that token fails SC 1.4.3, the contrast rule in WCAG (the Web Content Accessibility Guidelines).",
    },
    { part: 'Separator', description: 'A thin line.' },
    {
      part: 'Radio item',
      description: 'One choice in a RadioGroup. Screen readers get it as a menuitemradio with aria-checked. Its mark is a small filled square, never a dot.',
    },
    {
      part: 'Sub trigger',
      description: 'An item with a chevron that opens a submenu. While the highlight is inside the submenu, the sub trigger keeps a 1px strong line just inside its edge.',
    },
    {
      part: 'Sub content',
      description: 'The submenu: the same surface and M7 slide as Content, aligned so its first row sits level with its trigger.',
    },
    {
      part: 'Shortcut',
      description: 'Text on the right that screen readers skip (aria-hidden), plus aria-keyshortcuts on the item so they announce it once. It only displays the key: the page has to make the key work.',
    },
  ],
  props: [
    { name: 'open (Root)', type: 'boolean', description: 'Whether the menu is open, when the page keeps track of it (controlled).' },
    { name: 'defaultOpen (Root)', type: 'boolean', description: 'Whether it starts open, when the menu keeps track itself (uncontrolled).' },
    {
      name: 'onOpenChange (Root)',
      type: '(open: boolean) => void',
      description: 'Called when the menu opens or closes.',
    },
    { name: 'modal (Root)', type: 'boolean', default: 'true', description: 'While open, keyboard focus stays inside the menu and the page behind can\'t scroll.' },
    {
      name: 'align (Content)',
      type: "'start' | 'center' | 'end'",
      default: "'center'",
      description: 'Alignment against the trigger.',
    },
    { name: 'side (Content)', type: "'top' | 'right' | 'bottom' | 'left'", description: 'Preferred side of the trigger.' },
    { name: 'sideOffset (Content)', type: 'number', default: '4', description: 'Gap between trigger and content, in pixels.' },
    { name: 'onSelect (Item)', type: '(event: Event) => void', description: 'Called when the item is chosen.' },
    { name: 'disabled (Item)', type: 'boolean', default: 'false', description: 'The item can\'t be chosen, and typing letters (typeahead) skips it.' },
    {
      name: 'tone (Item)',
      type: "'default' | 'hostile'",
      default: "'default'",
      description: 'Use hostile for a destructive action: hostile-coloured text at rest, the hostile fill with ink text when highlighted.',
    },
    { name: 'asChild (Item)', type: 'boolean', default: 'false', description: 'Makes the one child (a link) the item, for a menu of links. icon and shortcut are ignored then; put the content inside the link.' },
    { name: 'icon (Item)', type: 'ReactNode', description: 'A small icon before the text, hidden from screen readers (aria-hidden).' },
    {
      name: 'shortcut (Item)',
      type: 'string',
      description: 'Shown on the right and passed to screen readers as aria-keyshortcuts. It only displays the key: the menu never makes the key work.',
    },
    { name: 'checked (Checkbox item)', type: 'boolean', description: 'Whether the tick shows.' },
    {
      name: 'onCheckedChange (Checkbox item)',
      type: '(checked: boolean) => void',
      description: 'Called when the checkbox item is toggled.',
    },
    { name: 'value (RadioGroup)', type: 'string', description: 'The checked radio item.' },
    {
      name: 'onValueChange (RadioGroup)',
      type: '(value: string) => void',
      description: 'Called with the chosen radio item value.',
    },
    { name: 'value (RadioItem)', type: 'string', description: "This radio item's own value." },
    { name: 'icon (SubTrigger)', type: 'ReactNode', description: 'A small icon before the text, hidden from screen readers, as on Item.' },
    { name: 'open / defaultOpen / onOpenChange (Sub)', type: 'boolean / boolean / (open: boolean) => void', description: 'Whether the submenu is open, tracked by the page (controlled) or by the submenu (uncontrolled). You\'ll usually leave these alone.' },
    { name: 'alignOffset (SubContent)', type: 'number', default: '-5', description: 'Shifts the submenu so its first row lines up with its trigger.' },
    { name: 'className', type: 'string', description: 'Extra CSS classes, merged with the part\'s own. When two Tailwind classes clash, the later one wins. Every part takes it.' },
    { name: 'ref', type: 'Ref<HTMLDivElement>', description: 'Passed through to the rendered element (the DOM node). On Content, Item, Checkbox item, Radio item, Sub trigger and Sub content.' },
  ],
  keyboard: [
    {
      keys: ['Enter', 'Space', 'ArrowDown'],
      does: 'On the trigger: opens, highlighting the first item.',
    },
    { keys: ['ArrowUp', 'ArrowDown'], does: 'Moves the highlight.' },
    { keys: ['Home', 'End'], does: 'Jumps to the first or last item.' },
    { keys: ['Enter', 'Space'], does: 'Runs the highlighted item.' },
    { keys: ['Escape'], does: 'Closes the menu and puts focus back on the trigger.' },
    { keys: ['ArrowRight'], does: 'On a sub trigger: opens the submenu, highlighting its first item.' },
    { keys: ['ArrowLeft'], does: 'In a submenu: closes it, and you\'re back on its trigger.' },
    { keys: ['A–Z'], does: 'Typeahead: jumps to the next item that starts with the letters you type.' },
  ],
  useWhen: 'A short list of actions, under about eight, behind a button.',
  notFor: 'Picking a value for a form: use Select.',
  dos: [
    'Keep menus under about eight items.',
    'Put the destructive item last, after a separator, with the hostile tone.',
    "Name an icon-only trigger for what the menu holds: 'Manifest actions', not 'More'.",
    'Use a radio group for a setting the menu shows the current value of: sort order, density.',
    "Name a sub trigger for what it holds: 'Move to', 'Export as'.",
  ],
  donts: [
    "Don't use a menu to pick a value for a form. That's what Select is for.",
    "Don't put a submenu inside a submenu. One level at most.",
    "Don't use radio items to run actions. A radio item sets a value, and the menu keeps showing it.",
    "Don't make every item hostile to add weight. Hostile means it destroys something.",
  ],
}
