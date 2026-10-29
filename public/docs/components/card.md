# Card

> A surface that groups related content. It gets the crosshair corners, the visual mark this system uses for a frame around several things. It never gets the cut corner, because cards hold buttons.

- **Best for:** Grouping related content on one surface, or one item in a grid whose whole surface is one link.
- **Not for:** A card inside another card: cards don't nest.
- Molecule. Source: `src/components/molecules/card/Card.tsx`
- Rendered docs page: `/components/card`

## Import

```tsx
import { Card, CardActions, CardBody, CardDescription, CardFooter, CardHeader, CardMedia, CardTitle, cardLinkClass } from 'src/components/molecules/card/Card'
```

Paths are from the Division DS repository root. Installed with shadcn they start `src/division-ds/` instead of `src/` (`src/division-ds/components/...`); import them relative to your file. An install has no index barrels: import each component from its own file, never from `components/molecules`.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `as` | `'article' \| 'section' \| 'div'` | `'article'` | article for an item that stands on its own, section for a group inside a page, div for neither. |
| `interactive` | `boolean` | `false` | Says the whole card is one click target, through a link or button stretched over it. Adds the hover and focus border and a 4px lift. It adds no role and no Tab stop: the link inside is still the control. |
| `level (CardTitle)` | `2 \| 3 \| 4` | `3` | The heading level, set on CardTitle only. Card itself takes no level. The page decides its own outline. |
| `src (CardMedia)` | `string` |  | The picture, drawn with object-cover (it fills the box and crops the overflow) and loaded lazily (only when it's about to scroll into view). Leave it out to show CardMedia's children instead, such as a placeholder. |
| `alt (CardMedia)` | `string` | `''` | The alt text screen readers read for the picture. Empty by default: the picture is decorative because the card title already names it. Write real text only when the picture says something the title doesn't. |
| `aspect (CardMedia)` | `'16/9' \| '4/3' \| '1/1'` | `'16/9'` | The shape of the box the picture is cropped to. |
| `className` | `string` |  | Merged onto any part. |
| `...rest` | `HTMLAttributes<...>` |  | Standard HTML attributes on every part, except aria-labelledby on Card: the Card points that at its CardTitle itself, and the types won't accept one passed in. Give CardTitle an id only if something else needs it. |
| `ref` | `Ref<HTMLElement>` |  | Passed through to the Card root DOM element. |

## Types and helpers

Exported beside the component, from the same file. Import a type with `import type { ... }`.

```ts
/** The stretched link an interactive card needs, for the `a` (or button) in its title: the link
 *  is the name's own, its `::after` covers the card, and the focus ring is drawn there, around the
 *  whole card. The shape ProductCard uses. Exported so a consumer never copies the string. */
export const cardLinkClass =
  "outline-none hover:underline underline-offset-2 after:absolute after:inset-0 after:content-[''] focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-[var(--color-focus-ring)]"
```

## Examples

Each is compiled and rendered on the docs page. Imports are omitted; see above.

### Depot

```tsx
function Depot({ title = 'North field depot' }: { title?: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>Open until 18:00.</CardDescription>
      </CardHeader>
      <CardBody>Twelve kits ready for collection.</CardBody>
      <CardFooter>
        <Button size="sm" variant="ghost">
          Details
        </Button>
        <Button size="sm">Collect</Button>
      </CardFooter>
    </Card>
  )
}

<div className="max-w-sm w-full">
  <Depot />
</div>
```

### With an image: edge to edge, no padding around it. The title already names the picture, so its alt text (the description a screen reader reads out) is empty

```tsx
<div className="max-w-sm w-full">
  <Card>
    <CardMedia src="/media/hero-poster-960.webp" aspect="16/9" />
    <CardHeader className="pt-5">
      <CardTitle>Range hall depot</CardTitle>
      <CardDescription>Open until 18:00.</CardDescription>
    </CardHeader>
    <CardBody>Twelve kits ready for collection.</CardBody>
  </Card>
</div>
```

### A row of three

```tsx
function Depot({ title = 'North field depot' }: { title?: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>Open until 18:00.</CardDescription>
      </CardHeader>
      <CardBody>Twelve kits ready for collection.</CardBody>
      <CardFooter>
        <Button size="sm" variant="ghost">
          Details
        </Button>
        <Button size="sm">Collect</Button>
      </CardFooter>
    </Card>
  )
}

<div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
  <Depot title="West site depot" />
  <Card>
    <CardHeader>
      <CardTitle>South gate depot</CardTitle>
      <CardDescription>Open until 20:00.</CardDescription>
    </CardHeader>
    <CardBody>Four kits ready for collection, three on order.</CardBody>
    <CardFooter>
      <Button size="sm" variant="ghost">
        Details
      </Button>
      <Button size="sm">Collect</Button>
    </CardFooter>
  </Card>
  <Card>
    <CardHeader>
      <CardTitle>Harbour depot</CardTitle>
      <CardDescription>Closed today.</CardDescription>
    </CardHeader>
    <CardBody>Nothing ready. Next opening tomorrow, 08:00.</CardBody>
    <CardFooter>
      <Button size="sm" variant="secondary">
        Notify me
      </Button>
    </CardFooter>
  </Card>
</div>
```

### Actions inside the content, no action bar: left-aligned, primary first, secondary after

```tsx
<div className="max-w-sm w-full">
  <Card>
    <CardHeader>
      <CardTitle>Marsh depot</CardTitle>
      <CardDescription>Open until 17:00.</CardDescription>
    </CardHeader>
    <CardBody>
      Twelve kits ready for collection. Bring your booking number.
      <CardActions>
        <Button size="sm">Collect</Button>
        <Button size="sm" variant="secondary">
          Details
        </Button>
      </CardActions>
    </CardBody>
  </Card>
</div>
```

### Interactive: the whole card is one link. Hover over it, or press Tab to reach it

```tsx
function DepotLink({ title, note, href }: { title: string; note: string; href: string }) {
  return (
    <Card interactive className="h-full">
      <CardBody className="flex flex-col gap-1">
        <CardTitle>
          <a href={href} className={cardLinkClass}>
            {title}
          </a>
        </CardTitle>
        <CardDescription>{note}</CardDescription>
      </CardBody>
    </Card>
  )
}

<div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
  <DepotLink title="Ridge depot" note="Open until 18:00. Twelve kits ready." href="#ridge-depot" />
  <DepotLink title="Quarry depot" note="Open until 20:00. Four kits ready." href="#quarry-depot" />
  <DepotLink title="Mill depot" note="Closed today. Opens tomorrow, 08:00." href="#mill-depot" />
</div>
```

### As a section

```tsx
<div className="max-w-sm w-full">
  <Card as="section">
    <CardHeader>
      <CardTitle level={2}>Totals</CardTitle>
      <CardDescription>This week, all depots.</CardDescription>
    </CardHeader>
    <CardBody>128 kits collected, 6 outstanding.</CardBody>
  </Card>
</div>
```

## Keyboard

| Keys | Result |
|---|---|
| `Tab` | Moves through the card's own buttons and links. The card itself isn't a stop, interactive or not. Focus on anything inside an interactive card lights its border and lifts it 4px. |

## Do

- Put actions in CardFooter when the card ends in an action bar. It's a right-aligned row with the gap between buttons already set and the primary last. A fullWidth button fills it.
- Put actions in CardActions, inside CardBody, when the button belongs to the text above it and there should be no bar. Primary first, then the secondary.
- Wherever a card has a primary button, put a secondary or ghost button beside it (Details, Cancel), unless the card really has only one action.
- Give every card a title, even a short one. It names the card for screen readers.
- Put CardMedia first in the card, and give a row of cards the same aspect, so the titles line up.
- Give every card in a row the same parts, so they line up.
- Use section for a group inside a page and article for an item that stands on its own.
- Set interactive on a card whose whole surface is one link, and only on those: a product, a category tile.
- Make the click target a real link stretched over the card from its title, so the name, the focus ring and middle-click all belong to the link.

## Don't

- Don't make the whole card a link by wrapping it in an a element. That puts clickable things inside a clickable thing. Stretch the title's link over the card and set interactive.
- Don't set interactive on a card that only holds a button or a link somewhere inside it. The lit border promises that a click anywhere does something.
- Don't add your own hover border, lift or glow to a card. There's one prop and one treatment, so every clickable card responds the same way.
- Don't clip an interactive card: it lifts 4px and its crosshair arms reach 5px outside it. Carousel leaves that room by itself.
- Don't put CardActions and CardFooter in the same card. Two places to act, with opposite alignment and order, read as two different decisions.
- Don't right-align CardActions or put the primary last in it. The two parts differ on purpose: the bar is on the right with the primary last, the inline row is on the left with the primary first.
- Don't pad around a picture to fake CardMedia, or wrap it in CardBody. The picture runs edge to edge, so it goes directly in the Card.
- Don't bevel a card.
- Don't nest cards.

## Common mistakes

Wrong:

```tsx
<Card className="border-2 border-[var(--color-accent-signal-fill)]">
```

Right:

```tsx
<Card style={{ border: '2px solid var(--color-accent-signal-fill)' }}>
```

The panel sets its own border outside any CSS cascade layer, so a border utility class never wins. To highlight or select a card, set the border inline, using a token (one of the system's named design values).

## Anatomy

- **Card**: The root. An article element by default, named by its title. Uses the .panel and .crosshair classes.
- **Interactive state**: Only with interactive. On hover, and while anything inside has keyboard focus, the thin border turns accent.signal.fill and the whole card slides up 4px (four pixels). It slides back down when the pointer leaves or focus moves on. It's a CSS transform, so nothing around it moves. When someone has turned on reduced motion (prefers-reduced-motion), the border still changes but the card doesn't move.
- **CardMedia**: A picture across the full width of the card, flush with the top and side edges inside the border, cropped to an aspect ratio. It's the first child, before CardHeader or CardBody. Without a src, its children fill the box instead (a placeholder).
- **CardHeader**: Groups the title and description.
- **CardTitle**: A heading at whatever level the page needs, 3 by default.
- **CardDescription**: A short secondary line under the title.
- **CardBody**: Grows to fill the space, so the footers in a row of cards line up.
- **CardFooter**: The action bar: right-aligned, with the primary button last (rightmost), above a thin line that runs edge to edge. It's where a task ends, the same position as DialogFooter.
- **CardActions**: Actions inside the content, placed in CardBody after the text. A row that wraps, left-aligned, primary first and secondary after it, with no line and no bar. It's on the left because people read a body down its left edge, so the button stays next to the text it acts on at any card width.
