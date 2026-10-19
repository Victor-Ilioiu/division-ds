import { Check, Clock, Truck, Zap } from 'lucide-react'
import { ComponentDocs } from '../../docs/ComponentDocs'
import { meta } from './Badge.meta'
import { Example } from '../../docs/Example'
import { Badge } from './Badge'

const TONES = ['neutral', 'signal', 'ok', 'warning', 'hostile', 'info'] as const

export function BadgeDocs() {
  return (
    <ComponentDocs meta={meta}>
      <Example caption="Tones, subtle (the outline badge)">
        {TONES.map(tone => (
          <Badge key={tone} tone={tone} emphasis="subtle">
            {tone}
          </Badge>
        ))}
      </Example>

      <Example caption="Tones, solid">
        {TONES.map(tone => (
          <Badge key={tone} tone={tone} emphasis="solid">
            {tone}
          </Badge>
        ))}
      </Example>

      <Example caption="With a dot">
        <Badge tone="ok" dot>
          Nominal
        </Badge>
        <Badge tone="warning" dot>
          Degraded
        </Badge>
        <Badge tone="hostile" dot>
          Offline
        </Badge>
      </Example>

      <Example caption="With an icon">
        <Badge tone="ok" icon={<Check />}>
          In stock
        </Badge>
        <Badge tone="warning" icon={<Clock />}>
          Backorder
        </Badge>
        <Badge tone="signal" emphasis="solid" icon={<Zap />}>
          New
        </Badge>
        <Badge tone="info" size="md" icon={<Truck />}>
          Ships today
        </Badge>
      </Example>

      <Example caption="Sizes">
        <Badge tone="signal" emphasis="solid">
          Sale
        </Badge>
        <Badge tone="signal" emphasis="solid" size="md">
          Sale
        </Badge>
        <Badge tone="ok" dot>
          In stock
        </Badge>
        <Badge tone="ok" dot size="md">
          In stock
        </Badge>
      </Example>

      <Example caption="Size md, beside a price">
        <p className="flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-4xl tabular-nums text-[var(--color-text-primary)]">
          <span>€189.00</span>
          <Badge tone="signal" emphasis="solid" size="md">
            −39%
          </Badge>
        </p>
      </Example>

      <Example caption="In a row">
        <div className="flex flex-col gap-2 w-full max-w-xs">
          <div className="flex items-center justify-between">
            <span className="text-sm">Depot Relay</span>
            <Badge tone="ok" emphasis="subtle">
              Nominal
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">North Sensor Array</span>
            <Badge tone="warning" emphasis="subtle">
              Degraded
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Northgate Beacon</span>
            <Badge tone="hostile" emphasis="solid">
              Offline
            </Badge>
          </div>
        </div>
      </Example>
    </ComponentDocs>
  )
}
