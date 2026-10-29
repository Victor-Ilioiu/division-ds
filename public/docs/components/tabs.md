# Tabs

> Sections of one view, with only one visible at a time. The active tab is filled with the signal colour, the same way every other selection in the system is.

- **Best for:** Switching between equally important sections of one view.
- **Not for:** Steps in a sequence: use Stepper. Moving between pages: use links (Navbar, Sidebar).
- Molecule. Source: `src/components/molecules/tabs/Tabs.tsx`
- Rendered docs page: `/components/tabs`

## Import

```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from 'src/components/molecules/tabs/Tabs'
```

Paths are from the Division DS repository root. Installed with shadcn they start `src/division-ds/` instead of `src/` (`src/division-ds/components/...`); import them relative to your file.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `value (Root)` | `string` |  | The active tab, when the page controls it. |
| `variant` | `'fill' \| 'line'` | `'fill'` | How the active tab is shown (Root). 'line' underlines it, for a row inside a panel that already has lots of fills. |
| `defaultValue` | `string` |  | The tab that starts active, when the component manages it (Root). |
| `onValueChange` | `(value: string) => void` |  | Called when the active tab changes (Root). |
| `orientation` | `'horizontal' \| 'vertical'` | `'horizontal'` | Which arrow keys move between tabs (Root). Vertical also puts the list beside the panels. |
| `activationMode` | `'automatic' \| 'manual'` | `'automatic'` | 'manual' waits for Enter or Space before switching, for panels that are slow to draw (Root). |
| `value (Trigger)` | `string` |  | This tab's own value. |
| `disabled` | `boolean` | `false` | Turns off one tab (Trigger). |
| `icon (Trigger)` | `ReactNode` |  | A small symbol before the label, hidden from screen readers (aria-hidden). |
| `count (Trigger)` | `number` |  | A number after the label, included in the name screen readers announce. |
| `className` | `string` |  | Merged with the root classes. If two Tailwind utilities clash, the later one wins. Available on every part. |
| `ref` | `Ref<HTMLElement>` |  | Passed through to the underlying page element. Available on every part. |

## Examples

Each is compiled and rendered on the docs page. Imports are omitted; see above.

### Default

```tsx
<div className="max-w-sm w-full">
  <Tabs defaultValue="replica">
    <TabsList aria-label="Kit sections">
      <TabsTrigger value="replica">Replica</TabsTrigger>
      <TabsTrigger value="optics">Optics</TabsTrigger>
      <TabsTrigger value="parts">Parts</TabsTrigger>
    </TabsList>
    <TabsContent value="replica">Electric carbine replica.</TabsContent>
    <TabsContent value="optics">Tube sight and holo sight.</TabsContent>
    <TabsContent value="parts">Magazines, a battery and a charger.</TabsContent>
  </Tabs>
</div>
```

### With a disabled tab

```tsx
<div className="max-w-sm w-full">
  <Tabs defaultValue="replica">
    <TabsList aria-label="Kit sections">
      <TabsTrigger value="replica">Replica</TabsTrigger>
      <TabsTrigger value="optics">Optics</TabsTrigger>
      <TabsTrigger value="parts" disabled>
        Parts
      </TabsTrigger>
    </TabsList>
    <TabsContent value="replica">Electric carbine replica.</TabsContent>
    <TabsContent value="optics">Tube sight and holo sight.</TabsContent>
    <TabsContent value="parts">Magazines, a battery and a charger.</TabsContent>
  </Tabs>
</div>
```

### Line, with icons and counts

```tsx
<div className="max-w-md w-full">
  <Tabs defaultValue="open" variant="line">
    <TabsList aria-label="Orders">
      <TabsTrigger value="open" icon={<Inbox />} count={12}>
        Open
      </TabsTrigger>
      <TabsTrigger value="packed" icon={<Package />} count={4}>
        Packed
      </TabsTrigger>
      <TabsTrigger value="archived" icon={<Archive />} count={0}>
        Archived
      </TabsTrigger>
    </TabsList>
    <TabsContent value="open">Twelve orders waiting to be packed.</TabsContent>
    <TabsContent value="packed">Four orders packed, waiting for the courier.</TabsContent>
    <TabsContent value="archived">No archived orders yet.</TabsContent>
  </Tabs>
</div>
```

### Vertical, line

```tsx
<div className="max-w-md w-full">
  <Tabs defaultValue="profile" orientation="vertical" variant="line">
    <TabsList aria-label="Settings">
      <TabsTrigger value="profile" icon={<User />}>
        Profile
      </TabsTrigger>
      <TabsTrigger value="security" icon={<Shield />}>
        Security
      </TabsTrigger>
    </TabsList>
    <TabsContent value="profile">Callsign, squad and home field.</TabsContent>
    <TabsContent value="security">Password and signed-in devices.</TabsContent>
  </Tabs>
</div>
```

### Controlled: the page keeps track of which tab is open

```tsx
function ControlledExample() {
  const [value, setValue] = useState('replica')

  return (
    <div className="max-w-sm w-full">
      <div className="flex gap-2 mb-4">
        <Button size="sm" variant="secondary" onClick={() => setValue('replica')}>
          Show replica
        </Button>
        <Button size="sm" variant="secondary" onClick={() => setValue('optics')}>
          Show optics
        </Button>
      </div>
      <Tabs value={value} onValueChange={setValue}>
        <TabsList aria-label="Kit sections">
          <TabsTrigger value="replica">Replica</TabsTrigger>
          <TabsTrigger value="optics">Optics</TabsTrigger>
        </TabsList>
        <TabsContent value="replica">Electric carbine replica.</TabsContent>
        <TabsContent value="optics">Tube sight and holo sight.</TabsContent>
      </Tabs>
    </div>
  )
}

<ControlledExample />
```

## Keyboard

| Keys | Result |
|---|---|
| `Tab` | Moves into the tab row, onto the active tab. Pressing Tab again moves into the panel. |
| `ArrowLeft` `ArrowRight` | Previous or next tab. It wraps round at the ends and skips turned-off tabs. |
| `ArrowUp` `ArrowDown` | The same, when orientation is vertical. |
| `Home` `End` | First or last tab. |

## Do

- Keep tab labels to one or two words.
- Use tabs for equals: sections a person would move between freely.
- Give the tab row an aria-label that names the whole set.
- Use the line variant inside a card or settings panel, and the fill variant at the top of a view.
- Use a count for something a person would act on, like open orders or unread reports.

## Don't

- Don't use tabs for steps in a sequence. That's what Stepper is for.
- Don't put a second row of tabs inside a panel.
- Don't mix fill and line tabs on one page.
- Don't give every tab an icon just because one has one. Icons go on all of them or none.
- Don't use tabs to move between pages. A tab changes what's shown, not where you are.

## Anatomy

- **Tabs**: The root. Holds which tab is active, whether the page controls that or the component does.
- **TabsList**: The tablist, the row of tabs. It needs an aria-label (a name read out by screen readers). On a narrow screen it scrolls sideways inside itself.
- **TabsTrigger**: A single tab. Fill variant: the active tab is the signal fill with ink-coloured text, and hovering adds a 12% signal tint. Line variant: the active tab is primary text over a 2px (pixel) signal bar, which moves to the inline end (the side text runs towards) when the tabs are vertical.
- **Icon**: Optional, before the label. aria-hidden, so screen readers skip it.
- **Count**: Optional, after the label. You see it as a number, and screen readers read it as part of the name: Open (12).
- **TabsContent**: A tabpanel, the area a tab shows. It's labelled by its tab and can take focus, so a keyboard user can reach panels that hold only text.
