import { useRef, type ComponentPropsWithoutRef, type Ref } from 'react'
import { Switch as RadixSwitch } from 'radix-ui'
import { cn } from '../../../lib/cn'
import { disabledObject } from '../../../lib/disabled'
import { playSquash } from './squash'

// (Written before the squash and stretch: Switch now wraps `onCheckedChange` to start it, and
// still computes no attribute of its own, which is what the paragraphs below are about.)
//
// Unlike Checkbox/Radio, Switch computes nothing of its own onto the rendered element — no
// `invalid`-derived aria attribute, no narrowed `defaultChecked`. It only merges `className`
// through `cn()` (which already resolves conflicting Tailwind utilities correctly) and spreads
// `{...rest}` straight onto RadixSwitch.Root with nothing precomputed ahead of it. So there is no
// caller-suppliable value in `rest` that could silently defeat a guarantee THIS component makes —
// same as RadioGroup, not the aria-invalid precedent set by Input/Textarea/Checkbox/Radio. No
// Omit/`never` exclusion is needed here.
//
// A separate, deeper risk was checked and found NOT to be a precedent to extend: Radix's own
// SwitchTrigger (node_modules/@radix-ui/react-switch/dist/index.mjs) computes `role="switch"`,
// `aria-checked`, `data-state` and `disabled` and then spreads its caller's rest props (exactly
// what reaches it as `rest` here) AFTER them — so a consumer could in principle pass a literal
// `role`/`aria-checked` and silently override Radix's own computed semantics. But
// @radix-ui/react-checkbox's CheckboxTrigger has the identical spread order, and this codebase's
// existing Checkbox/Radio wrappers do not guard against it either. It is a pre-existing, shared
// risk across every Radix-based atom here, not something Switch introduces or that has an
// established fix to copy — reported, not acted on.
export type SwitchProps = ComponentPropsWithoutRef<typeof RadixSwitch.Root> & {
  ref?: Ref<HTMLButtonElement>
}

export function Switch({ className, ref, onCheckedChange, ...rest }: SwitchProps) {
  const body = useRef<HTMLSpanElement>(null)

  // The one thing Switch does on its own account: start the thumb's squash and stretch when the
  // state changes because someone flipped it. `onCheckedChange` fires in controlled and
  // uncontrolled use alike, and only for a user's flip, which is the right scope: a switch whose
  // state is set from elsewhere moves to its new place and keeps its shape.
  const handleCheckedChange = (checked: boolean) => {
    playSquash(body.current, checked)
    onCheckedChange?.(checked)
  }

  return (
    <RadixSwitch.Root
      ref={ref}
      onCheckedChange={handleCheckedChange}
      className={cn(
        // 44x24 track — clears the 24x24 minimum target size on its own, no ::before needed.
        // `group`: the thumb reads the root's state and its pressed state (see below).
        'group relative inline-flex shrink-0 items-center w-11 h-6 p-0.5',
        // With the cut off (the theme builder's shape) the track takes the radius and the thumb a
        // concentric one, 3px smaller: the gap between them.
        'rounded-[var(--shape-radius,0px)]',
        // The track keeps the control fill on and off. What says "on" is the thumb's position,
        // the thumb's colour and the border's colour; the track itself does not change.
        'border bg-[var(--component-control-fill-rest)]',
        'border-[var(--component-control-border-selection)] enabled:hover:border-[var(--component-control-border-selection-hover)]',
        // `transition-control`, not `transition-colors`: Tailwind v4's colour transition
        // includes `outline-color`, which made the focus ring animate in from currentColor
        // (near-white) instead of painting the ring token at the instant of focus. See
        // control.css, which also owns the reduced-motion case.
        'transition-control',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]',
        // On, the border is the accent, and stays the accent under the pointer: the hover rule
        // above is more specific than a bare data-state rule and would otherwise turn an on
        // switch's border grey for as long as it was hovered.
        'data-[state=checked]:border-[var(--color-accent-signal-indicator)]',
        'data-[state=checked]:enabled:hover:border-[var(--color-accent-signal-indicator)]',
        // Object half of the one disabled-state rule (src/lib/disabled.ts, design.md): the whole
        // control — checked or not — dims to 50% opacity.
        disabledObject,
        className
      )}
      {...rest}
    >
      {/* Position, not colour, is what says on or off — the thumb travels, and its colour and the
          border's are supporting evidence only.

          SIZE AND TRAVEL. 16px in both states, travelling 22px, which is the whole of the room:
          the track is 44px, less a 1px border and 2px of padding each side, less the thumb. Both
          states sit 3px from the outer edge and 2px inside a border that is visible in both. The
          track used to fill with the accent when on, which hid the border, and a dark thumb in a
          borderless bright field read as a smaller one; a thumb grown to 18px to compensate was
          tried and replaced by this, which needs no compensation.

          COLOUR. text.primary off, accent.signal.indicator on, on the same dark track. It was
          accent.signal.indicator-ink on an accent track: thumb and track both changed colour at the
          instant of the flip, mid-flight, and the motion read as a twitch. Now one thing changes
          colour, and it fades over the travel. On the control fill the accent measures 5.51:1 in
          the dark theme and 2.80:1 in the light one, under SC 1.4.11's 3:1; that is the pair
          Radio's indicator already carries, accepted and gated at a 2:1 floor
          (scripts/lib/contrast-pairs.mjs).

          PRESS. Held down, the thumb stretches 4px along the track from the edge it rests on.
          On, the travel drops by the same 4px so it grows to the LEFT. Width and position are
          transitioned over one duration on one curve, at all times, and that is not tidiness:
          the right edge is position plus width, and it only stays where it is if the two move
          in step. With a curve each, the on thumb's right edge wandered out past the track for
          a few frames of every press. `:active` covers a pointer and the Space key alike;
          `enabled` keeps a disabled switch still.

          RELEASE. The Thumb carries position and size, as transitions. Its body, the span
          inside, carries the colour and the squash and stretch (./squash.ts), so the two never
          compete for one `transform`. The Thumb itself has no fill: if it had, the body
          compressing would uncover it and nothing would appear to change.

          Under reduced motion nothing tweens and the body keeps its shape; the thumb still
          moves and still stretches while held, as states. */}
      <RadixSwitch.Thumb
        className={cn(
          'block w-4 h-4 translate-x-0 data-[state=checked]:translate-x-[22px]',
          'group-enabled:group-active:w-5',
          'group-enabled:group-active:data-[state=checked]:translate-x-[18px]',
          // `translate`, not `transform`: Tailwind 4 moves an element with the `translate`
          // property, so a transition that names `transform` watches a property that never
          // changes. Travelling, both ride the accelerate curve: the thumb gathers speed and
          // stops at the far edge, which is what the squash is the result of.
          '[transition-property:translate,width] [transition-duration:var(--duration-base)]',
          '[transition-timing-function:var(--ease-accelerate)]',
          // Being pressed is feedback, so it answers at once: the snap curve, for both.
          'group-active:[transition-timing-function:var(--ease-snap)]',
          'motion-reduce:[transition-property:none]'
        )}
      >
        <span
          ref={body}
          className={cn(
            'block h-full w-full bg-[var(--color-text-primary)] rounded-[max(0px,calc(var(--shape-radius,0px)-3px))]',
            'group-data-[state=checked]:bg-[var(--color-accent-signal-indicator)]',
            'transition-[background-color] [transition-duration:var(--duration-base)] motion-reduce:transition-none'
          )}
        />
      </RadixSwitch.Thumb>
    </RadixSwitch.Root>
  )
}
