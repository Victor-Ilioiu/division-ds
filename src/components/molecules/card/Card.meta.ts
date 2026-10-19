import type { ComponentMeta } from '../../docs/meta'

export const meta: ComponentMeta = {
  name: 'Card',
  title: 'Card',
  tier: 'molecules',
  slug: 'card',
  summary:
    "A surface that groups related content. It gets the crosshair corners, the visual mark this system uses for a frame around several things. It never gets the cut corner, because cards hold buttons.",
  pitfalls: [
    {
      wrong: `<Card className="border-2 border-[var(--color-accent-signal-fill)]">`,
      right: `<Card style={{ border: '2px solid var(--color-accent-signal-fill)' }}>`,
      why: "The panel sets its own border outside any CSS cascade layer, so a border utility class never wins. To highlight or select a card, set the border inline, using a token (one of the system's named design values).",
    },
  ],
  anatomy: [
    {
      part: 'Card',
      description: 'The root. An article element by default, named by its title. Uses the .panel and .crosshair classes.',
    },
    {
      part: 'Interactive state',
      description:
        "Only with interactive. On hover, and while anything inside has keyboard focus, the thin border turns accent.signal.fill and the whole card slides up 4px (four pixels). It slides back down when the pointer leaves or focus moves on. It's a CSS transform, so nothing around it moves. When someone has turned on reduced motion (prefers-reduced-motion), the border still changes but the card doesn't move.",
    },
    {
      part: 'CardMedia',
      description:
        "A picture across the full width of the card, flush with the top and side edges inside the border, cropped to an aspect ratio. It's the first child, before CardHeader or CardBody. Without a src, its children fill the box instead (a placeholder).",
    },
    { part: 'CardHeader', description: 'Groups the title and description.' },
    {
      part: 'CardTitle',
      description: 'A heading at whatever level the page needs, 3 by default.',
    },
    { part: 'CardDescription', description: 'A short secondary line under the title.' },
    {
      part: 'CardBody',
      description: "Grows to fill the space, so the footers in a row of cards line up.",
    },
    {
      part: 'CardFooter',
      description:
        "The action bar: right-aligned, with the primary button last (rightmost), above a thin line that runs edge to edge. It's where a task ends, the same position as DialogFooter.",
    },
    {
      part: 'CardActions',
      description:
        "Actions inside the content, placed in CardBody after the text. A row that wraps, left-aligned, primary first and secondary after it, with no line and no bar. It's on the left because people read a body down its left edge, so the button stays next to the text it acts on at any card width.",
    },
  ],
  props: [
    {
      name: 'as',
      type: "'article' | 'section' | 'div'",
      default: "'article'",
      description:
        'article for an item that stands on its own, section for a group inside a page, div for neither.',
    },
    {
      name: 'interactive',
      type: 'boolean',
      default: 'false',
      description:
        "Says the whole card is one click target, through a link or button stretched over it. Adds the hover and focus border and a 4px lift. It adds no role and no Tab stop: the link inside is still the control.",
    },
    {
      name: 'level (CardTitle)',
      type: '2 | 3 | 4',
      default: '3',
      description: "The heading level, set on CardTitle only. Card itself takes no level. The page decides its own outline.",
    },
    {
      name: 'src (CardMedia)',
      type: 'string',
      description: "The picture, drawn with object-cover (it fills the box and crops the overflow) and loaded lazily (only when it's about to scroll into view). Leave it out to show CardMedia's children instead, such as a placeholder.",
    },
    {
      name: 'alt (CardMedia)',
      type: 'string',
      default: "''",
      description: "The alt text screen readers read for the picture. Empty by default: the picture is decorative because the card title already names it. Write real text only when the picture says something the title doesn't.",
    },
    {
      name: 'aspect (CardMedia)',
      type: "'16/9' | '4/3' | '1/1'",
      default: "'16/9'",
      description: 'The shape of the box the picture is cropped to.',
    },
    {
      name: 'className',
      type: 'string',
      description: 'Merged onto any part.',
    },
    {
      name: '...rest',
      type: 'HTMLAttributes<...>',
      description:
        "Standard HTML attributes on every part, except aria-labelledby on Card: the Card points that at its CardTitle itself, and the types won't accept one passed in. Give CardTitle an id only if something else needs it.",
    },
    {
      name: 'ref',
      type: 'Ref<HTMLElement>',
      description: 'Passed through to the Card root DOM element.',
    },
  ],
  keyboard: [
    {
      keys: ['Tab'],
      does: "Moves through the card's own buttons and links. The card itself isn't a stop, interactive or not. Focus on anything inside an interactive card lights its border and lifts it 4px.",
    },
  ],
  useWhen: 'Grouping related content on one surface, or one item in a grid whose whole surface is one link.',
  notFor: "A card inside another card: cards don't nest.",
  dos: [
    "Put actions in CardFooter when the card ends in an action bar. It's a right-aligned row with the gap between buttons already set and the primary last. A fullWidth button fills it.",
    'Put actions in CardActions, inside CardBody, when the button belongs to the text above it and there should be no bar. Primary first, then the secondary.',
    'Wherever a card has a primary button, put a secondary or ghost button beside it (Details, Cancel), unless the card really has only one action.',
    "Give every card a title, even a short one. It names the card for screen readers.",
    'Put CardMedia first in the card, and give a row of cards the same aspect, so the titles line up.',
    'Give every card in a row the same parts, so they line up.',
    'Use section for a group inside a page and article for an item that stands on its own.',
    'Set interactive on a card whose whole surface is one link, and only on those: a product, a category tile.',
    "Make the click target a real link stretched over the card from its title, so the name, the focus ring and middle-click all belong to the link.",
  ],
  donts: [
    "Don't make the whole card a link by wrapping it in an a element. That puts clickable things inside a clickable thing. Stretch the title's link over the card and set interactive.",
    "Don't set interactive on a card that only holds a button or a link somewhere inside it. The lit border promises that a click anywhere does something.",
    "Don't add your own hover border, lift or glow to a card. There's one prop and one treatment, so every clickable card responds the same way.",
    "Don't clip an interactive card: it lifts 4px and its crosshair arms reach 5px outside it. Carousel leaves that room by itself.",
    "Don't put CardActions and CardFooter in the same card. Two places to act, with opposite alignment and order, read as two different decisions.",
    "Don't right-align CardActions or put the primary last in it. The two parts differ on purpose: the bar is on the right with the primary last, the inline row is on the left with the primary first.",
    "Don't pad around a picture to fake CardMedia, or wrap it in CardBody. The picture runs edge to edge, so it goes directly in the Card.",
    "Don't bevel a card.",
    "Don't nest cards.",
  ],
}
