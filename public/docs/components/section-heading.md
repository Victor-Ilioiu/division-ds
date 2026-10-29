# SectionHeading

> The heading that opens a section of a page: a title under a hairline, with an optional description and an optional action. The page tells it which heading level to use, because only the page knows its own outline.

- **Best for:** Opening a section of a page, at the level that carries on the outline.
- **Not for:** The page title: use PageHeader.
- Molecule. Source: `src/components/molecules/section-heading/SectionHeading.tsx`
- Rendered docs page: `/components/section-heading`

## Import

```tsx
import { SectionHeading } from 'src/components/molecules/section-heading/SectionHeading'
```

Paths are from the Division DS repository root. Installed with shadcn they start `src/division-ds/` instead of `src/` (`src/division-ds/components/...`); import them relative to your file. An install has no index barrels: import each component from its own file, never from `components/molecules`.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `title` | `string` |  | Required. The heading text. |
| `level` | `2 \| 3 \| 4` |  | Required, with no default. The heading level the page outline needs at this point. Leave it out and the code won't compile. |
| `description` | `ReactNode` |  | One or two sentences under the title. |
| `action` | `ReactNode` |  | A single control at the end of the row, usually a link to the full list. |
| `index` | `number` |  | The section's position in a numbered run of sections, drawn above the title. It's decoration and never part of the heading's name. |
| `id` | `string` |  | Goes on the heading element, not the wrapper, so a section can point aria-labelledby at it (that's how the section gets its name for screen readers). |
| `className` | `string` |  | Added to the root. Where Tailwind utility classes clash, the later one wins. |
| `ref` | `Ref<HTMLDivElement>` |  | Passed through to the root element. |

## Examples

Each is compiled and rendered on the docs page. Imports are omitted; see above.

### Title only

```tsx
<SectionHeading level={4} title="Top-rated replicas" />
```

### With a description and an action

```tsx
<SectionHeading
  level={4}
  title="Top-rated accessories"
  description="Optics and parts, ordered by what the reviews say."
  action={<Link href="#accessories">All accessories</Link>}
/>
```

### Numbered, in a run

```tsx
<div className="flex flex-col gap-10">
  <SectionHeading level={4} index={1} title="Replicas" description="Three lengths on one receiver." />
  <SectionHeading level={4} index={2} title="Optics" description="A tube sight and a holo sight." />
  <SectionHeading
    level={4}
    index={3}
    title="Parts and accessories"
    action={
      <Button asChild variant="secondary" size="sm">
        <a href="#parts">All parts</a>
      </Button>
    }
  />
</div>
```

### Naming its section

```tsx
<section aria-labelledby="section-heading-docs-care">
  <SectionHeading
    level={4}
    id="section-heading-docs-care"
    title="Care plans"
    description="The section below is a region named “Care plans”. It takes that name from this heading, which carries the id."
  />
  <p className="mt-4 font-body text-sm text-[var(--color-text-primary)]">
    A chrono check, a tune and upgrade fitting, billed monthly.
  </p>
</section>
```

## Keyboard

| Keys | Result |
|---|---|
| `Tab` | Moves to the action, if there is one. The heading itself isn't a Tab stop. |

## Do

- Pass the level that carries on the page outline: h2 under the page h1, h3 inside an h2 section.
- Give the heading an id and point the section at it with aria-labelledby, so the region has a name.
- Name the action after where it goes: "All replicas", not "View all" four times on one page.
- Number every section in a run, or none of them.

## Don't

- Don't use it as the page title. A page has one h1, and that isn't a section opener.
- Don't pick a level for its size. The size is the same at every level; the level is about the outline.
- Don't put more than one control in the action slot. A second one belongs in the section body.
- Don't stack one straight under another. A section heading opens content, not a second heading.

## Anatomy

- **Rule**: A hairline along the top, in border.hairline-strong. It marks where the section starts.
- **Index**: Optional. A two-digit number in monospace type, on its own line above the title, and aria-hidden so screen readers skip it. The leading zero is in numeral.pad and the digit in accent.signal.text. It sits above the title, not in front, so the title keeps the same left edge as its description and its section.
- **Title**: The heading element, h2 to h4 (heading levels 2 to 4). Oxanium, uppercase, 20px (pixels), going up to 24px when the heading has 42rem or more of width.
- **Description**: Optional. Body text in text.secondary, at most 60 characters a line.
- **Action**: Optional. One control at the far end of the row. It drops under the text when there isn't room.
