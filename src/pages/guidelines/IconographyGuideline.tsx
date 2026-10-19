import { PageHeader, SectionHeading, docsProse } from '../../components/docs/PageChrome'
import {
  Target, Crosshair, ShieldAlert, ShieldCheck, Lock, Unlock, MapPin, Compass, Radio,
  Package, Wrench, Gauge, Wind, Thermometer, Battery, Wifi, Settings, Bell, Search,
  AlertTriangle,
} from 'lucide-react'

const ICONS = [
  Target, Crosshair, ShieldAlert, ShieldCheck, Lock, Unlock, MapPin, Compass, Radio,
  Package, Wrench, Gauge, Wind, Thermometer, Battery, Wifi, Settings, Bell, Search,
  AlertTriangle,
]

const SIZES = [16, 20, 24]

export function IconographyGuideline() {
  return (
    <div className="max-w-4xl">
      <PageHeader
        eyebrow={
          <>
            Guidelines <span className="text-[var(--color-accent-signal-text)]">· Iconography</span>
          </>
        }
        title="A neutral set, on purpose"
        lede={
          <>
            The icons come from{' '}
            <a href="https://lucide.dev" className="underline">lucide-react</a>, a free icon set
            under the MIT licence (a permissive open-source licence). It&apos;s actively
            maintained, and every icon is drawn on the same 24px (pixel) grid with the same line
            thickness. Using a published set means the icons carry meaning, while type, colour and
            shape carry the personality. It also means nobody has to draw a custom library, name
            it, redraw it at three sizes and keep it consistent for the life of the system.
          </>
        }
      />

      <section>
        <SectionHeading>Sizes</SectionHeading>
        <div className="flex gap-8 items-end">
          {SIZES.map(size => (
            <div key={size} className="flex flex-col items-center gap-2">
              <Target size={size} aria-hidden="true" />
              <span className="font-mono text-xs text-[var(--color-text-secondary)]">{size}px</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <SectionHeading>Set</SectionHeading>
        <div className="grid grid-cols-5 sm:grid-cols-10 gap-4">
          {ICONS.map((Icon, i) => (
            <div key={i} className="border border-[var(--color-border-hairline)] p-3 flex items-center justify-center">
              <Icon size={20} aria-hidden="true" />
            </div>
          ))}
        </div>
      </section>

      <section>
        <SectionHeading>Decorative vs. meaningful</SectionHeading>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="border border-[var(--color-border-hairline)] p-4">
            <div className="flex items-center gap-2">
              <ShieldAlert size={20} aria-hidden="true" />
              <span>Locked</span>
            </div>
            <p className={`${docsProse} mt-2`}>
              <b>Decorative:</b> the icon repeats text that&apos;s already visible, so screen
              readers (software that reads the page aloud) are told to skip it with{' '}
              <code className="font-mono text-xs">aria-hidden</code>. ARIA (Accessible Rich
              Internet Applications) is a set of attributes that describe a page to assistive
              technology.
              <code className="font-mono text-xs block mt-1">{'<ShieldAlert aria-hidden="true" /> Locked'}</code>
            </p>
          </div>
          <div className="border border-[var(--color-border-hairline)] p-4">
            <div className="flex items-center gap-2">
              {/* Left as a bare <button> on purpose: the point of this demo is the raw
                  aria-label pattern in the snippet below it. The system focus ring is not
                  optional, though, so it is added here rather than left to the UA default. */}
              <button
                type="button"
                aria-label="Search"
                className="p-2 border border-[var(--color-border-control)] min-h-[36px] min-w-[36px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
              >
                <Search size={20} aria-hidden="true" />
              </button>
            </div>
            <p className={`${docsProse} mt-2`}>
              <b>Meaningful:</b> the icon is the only content, so the button around it carries the
              label (<code className="font-mono text-xs">aria-label</code>) that a screen reader
              announces.
              <code className="font-mono text-xs block mt-1">{'<button aria-label="Search"><Search aria-hidden /></button>'}</code>
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
