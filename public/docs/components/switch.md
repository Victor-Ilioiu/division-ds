# Switch

> An on/off control that acts right away. The thumb's position shows the state, so the meaning still comes through with colour turned off. It takes effect the moment it's flipped.

- **Best for:** An on/off setting that takes effect the moment it's flipped.
- **Not for:** A choice in a form that needs a Save. Use Checkbox.
- Atom. Source: `src/components/atoms/switch/Switch.tsx`
- Rendered docs page: `/components/switch`

## Import

```tsx
import { Switch } from 'src/components/atoms/switch/Switch'
```

## Requires

- Its own label. A Switch isn't a FormField child (FormField takes Input, Textarea, Select or QuantityStepper). Give it an id and put a <label htmlFor> beside it.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `checked` | `boolean` |  | The checked state, when your code controls it. |
| `defaultChecked` | `boolean` |  | The starting state, when the switch manages itself. |
| `onCheckedChange` | `(checked: boolean) => void` |  | Fires the moment it's flipped. |
| `disabled` | `boolean` |  | Takes it out of the tab order and blocks toggling. |
| `required` | `boolean` |  | The browser's own form validation. |
| `name` | `string` |  | The browser's own form field name. |
| `value` | `string` |  | The browser's own form field value. |
| `id` | `string` |  | Pair it with a real label through htmlFor. |
| `className` | `string` |  | Merged with the control's classes. Later Tailwind utilities (the small styling classes this system uses) win. |
| `ref` | `Ref<HTMLButtonElement>` |  | Forwarded to the root button from Radix, the open-source library this switch is built on. |
| `...rest` | `ButtonHTMLAttributes<HTMLButtonElement>` |  | Every other Radix Switch.Root prop, which means every native button attribute, spread onto the root button. For example aria-describedby, or aria-label when no label element points at it. aria-* attributes are ARIA (Accessible Rich Internet Applications) settings that give screen readers extra information. |

## Examples

Each is compiled and rendered on the docs page. Imports are omitted; see above.

### Off and on

```tsx
<div className="flex items-center gap-3">
  <Switch id="state-off" />
  <label htmlFor="state-off">Off</label>
</div>
<div className="flex items-center gap-3">
  <Switch id="state-on" defaultChecked />
  <label htmlFor="state-on">On</label>
</div>
```

### Live

```tsx
function LiveExample() {
  const [on, setOn] = useState(false)
  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-3">
        <Switch id="live-beacon" checked={on} onCheckedChange={setOn} />
        <label htmlFor="live-beacon">Field beacon</label>
      </div>
      <p className="text-sm text-[var(--color-text-secondary)]">
        {on ? 'Broadcasting position.' : 'Beacon is off.'}
      </p>
    </div>
  )
}

<LiveExample />
```

### Disabled

```tsx
<div className="flex items-center gap-3">
  <Switch id="state-disabled-off" disabled />
  <label htmlFor="state-disabled-off">Disabled, off</label>
</div>
<div className="flex items-center gap-3">
  <Switch id="state-disabled-on" disabled defaultChecked />
  <label htmlFor="state-disabled-on">Disabled, on</label>
</div>
```

### A settings row

```tsx
<div className="flex w-full items-start justify-between gap-4">
  <div>
    <label htmlFor="settings-offline-maps" className="font-medium">
      Offline maps
    </label>
    <p className="text-sm text-[var(--color-text-secondary)]">
      Download the current route area before you lose signal.
    </p>
  </div>
  <Switch id="settings-offline-maps" defaultChecked />
</div>
```

## Keyboard

| Keys | Result |
|---|---|
| `Tab` | Moves focus to it. |
| `Space` | Toggles it. |
| `Enter` | Toggles it. Radix allows this on a switch, though not on a checkbox. |

## Do

- Use it only when flipping it takes effect right away.
- Label it with the thing being switched, not with ‘on’ or ‘off’.
- Show the result of the switch near it if the effect isn't visible.

## Don't

- Don't put a switch in a form that needs a Save. Use a Checkbox.
- Don't put ‘on’/‘off’ text inside the track. The position already says it, and the text won't fit at 24px.
- Don't make the thumb take longer than --duration-base (a timing token) to arrive. A slow switch feels broken. The settle after it arrives only changes its shape, and it ends within --duration-slow, because the state is already readable.
- Don't use the squash on anything that isn't a small physical object under the user's finger. On a panel or a page it looks like a wobble.
- Don't add a rebound to the thumb. It gives once against the edge and stops. A switch that keeps moving after the state has landed looks unsure.
- Don't fill the track with the accent when it's on. Thumb and track changing colour together, mid-flight, is what made the flip look like a twitch.

## Common mistakes

Wrong:

```tsx
<FormField label="Email notifications">
  <Switch />
</FormField>
```

Right:

```tsx
<div className="flex items-center gap-3">
  <Switch id="notify" checked={on} onCheckedChange={setOn} />
  <label htmlFor="notify">Email notifications</label>
</div>
```

FormField passes its child an invalid prop, and Switch doesn't take one. A switch acts at once, so it has no error state to show.

## Anatomy

- **Root**: role=switch, which tells screen readers (software that reads the page aloud) what it is. A 44×24 track.
- **Thumb**: A 16px (pixel) square, 3px from the track edge in both states, travelling 22px. Its position is the state signal. It's text.primary when off and accent.signal.fill when on. Held down, it stretches 4px away from the edge it rests on: to the right when off, to the left when on, so it never leaves the track. Flipped, it speeds up across the track, gets a little longer in flight and a little shorter against the far edge, then goes back to its own shape. One give, no bounce.
- **Track fill**: The control fill, on and off. When it's on, only the border turns to signal.fill. The track doesn't fill with the accent, so the thumb is the one thing that changes colour during a flip.
