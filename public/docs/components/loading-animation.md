# LoadingAnimation

> A loading state that fills a whole panel, drawn as an animated instrument dial in WebGL (the browser's graphics engine for drawing with the graphics card). The three dials follow the same rules. They draw themselves from the outside in, and their structure drifts. One mechanism clicks to its next detent using the system's snap easing (the motion where things arrive a little large and settle), and the signal accent colour only appears on the part that shows progress.

- **Best for:** A wait that takes over a whole panel or page, like a route loading, a report building or a first sync.
- **Not for:** A wait inside a button or a line of text: use Spinner. A wait with a known end: use Progress.
- Atom. Source: `src/components/atoms/loading-animation/LoadingAnimation.tsx`
- Rendered docs page: `/components/loading-animation`

## Import

```tsx
import { LoadingAnimation } from 'src/components/atoms/loading-animation/LoadingAnimation'
```

Paths are from the Division DS repository root. Installed with shadcn they start `src/division-ds/` instead of `src/` (`src/division-ds/components/...`); import them relative to your file. An install has no index barrels: import each component from its own file, never from `components/molecules`.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `variant` | `'aperture' \| 'gyro' \| 'reticle'` | `'aperture'` | Aperture: shaded blades stepping round a spinning core. Gyro: nested rings turning against each other. Reticle: a progress ring filling up from a marker at 12 o’clock. |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | A 96px, 160px or 240px square (px means pixels). It shrinks with its container below that size, but never grows. |
| `label` | `string` |  | Status text that is hidden on screen. Passing it turns the loader into a live region, an area screen readers announce when it changes. |
| `className` | `string` |  | Merged with the component classes. If two clash, the later Tailwind utility wins (Tailwind is the CSS framework this system styles with). |
| `ref` | `Ref<HTMLDivElement>` |  | Passed through to the root div. |
| `...rest` | `Omit<HTMLAttributes<HTMLDivElement>, 'role'>` |  | Every native div prop except role, for the same reason as Spinner: label is the only thing that sets role="status". |

## Examples

Each is compiled and rendered on the docs page. Imports are omitted; see above.

### Three dials, md

```tsx
<LoadingAnimation variant="aperture" label="Loading field kits" />
<LoadingAnimation variant="gyro" label="Syncing manifest" />
<LoadingAnimation variant="reticle" label="Acquiring position" />
```

### Aperture, three sizes

```tsx
<LoadingAnimation variant="aperture" size="sm" label="Loading field kits" />
<LoadingAnimation variant="aperture" size="md" label="Loading field kits" />
<LoadingAnimation variant="aperture" size="lg" label="Loading field kits" />
```

## Keyboard

Not focusable. No keyboard behaviour of its own.

## Do

- Use it for a wait that takes over a panel or a page, like a route loading, a report building or a first sync.
- Pass label, and say what is loading: ‘Loading field kits’, not ‘Loading’.
- Pick one dial for each product surface and stick with it. The three are a family. They aren't meant to rotate.

## Don't

- Don't put it in a button or a line of text. That's Spinner, which doesn't use up a WebGL context.
- Don't show more than a handful at once. Each one uses a WebGL context (one slot of the browser's graphics engine), and browsers cap how many you get.
- Don't rely on the motion. When someone has reduced motion turned on, it shows one still frame, so the label has to carry the meaning.
- Don't use it for a wait with a known end. That's Progress.

## Anatomy

- **div**: The root: a square box at the size you pick. It gets role="status", which makes screen readers announce it, only when it has a label.
- **Stage**: A layer that holds the WebGL canvas, hidden from screen readers with aria-hidden (an ARIA attribute, from Accessible Rich Internet Applications). It fades in once the first frame is drawn.
- **Dial**: Rings, tick crowns and arcs in text.primary, text.secondary, border.control and border.hairline.strong. One moving part is in accent.signal.fill.
- **Fallback**: If WebGL isn't available, the Conveyor spinner shows in the same box. It's aria-hidden, so the label is still read only once.
- **sr-only label**: The text screen readers announce (sr-only means it's for screen readers only). It's only there when you pass label.
