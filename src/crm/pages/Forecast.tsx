import type { ReactNode } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { CalendarX2, CircleSlash, Hourglass } from 'lucide-react'
import { linkVariants } from '../../components/atoms/link/Link'
import { Card, CardBody, CardTitle } from '../../components/molecules/card/Card'
import { PageHeader } from '../../components/molecules/page-header/PageHeader'
import { SectionHeading } from '../../components/molecules/section-heading/SectionHeading'
import { Stat } from '../../components/molecules/stat/Stat'
import { ChartPanel } from '../../components/organisms/chart-panel/ChartPanel'
import { DataTable, type DataTableColumn } from '../../components/organisms/data-table/DataTable'
import { cn } from '../../lib/cn'
import { formatEuros } from '../money'
import { QUARTER_GOAL, REPS, WORKSPACE } from '../data'
import { daysBetween, inRange, quarterOf, TODAY } from '../dates'
import { dealValue, hasSlipped, isOpen, isStalled, OPEN_STAGES, PROBABILITY, STAGE_LABEL, weightedValue, type Activity, type Deal, type Stage } from '../model'
import { useCrm } from '../store'

export type RepRollup = { id: string; rep: string; won: number; commit: number; bestCase: number; pipeline: number }

/** The quarter by rep. Won: closed won this quarter. Commit: Negotiation, weighted by its 75%.
 *  Best case: Proposal and Negotiation at full value. Pipeline: every open deal at full value. */
export function forecastRollup(deals: readonly Deal[], today = TODAY): RepRollup[] {
  const quarter = quarterOf(today)
  return REPS.map(rep => {
    const mine = deals.filter(d => d.ownerId === rep.id)
    const open = mine.filter(isOpen)
    return {
      id: rep.id,
      rep: rep.name,
      won: mine
        .filter(d => d.stage === 'won' && inRange(d.closeDate, quarter.start, quarter.end))
        .reduce((sum, d) => sum + dealValue(d), 0),
      commit: open.filter(d => d.stage === 'negotiation').reduce((sum, d) => sum + weightedValue(d), 0),
      bestCase: open
        .filter(d => d.stage === 'negotiation' || d.stage === 'proposal')
        .reduce((sum, d) => sum + dealValue(d), 0),
      pipeline: open.reduce((sum, d) => sum + dealValue(d), 0),
    }
  })
}

export function hygiene(deals: readonly Deal[], activities: readonly Activity[]) {
  return {
    slipped: deals.filter(d => hasSlipped(d)).length,
    noNext: deals.filter(d => isOpen(d) && !d.nextStep).length,
    stalled: deals.filter(d => isStalled(d, activities)).length,
  }
}

export type StageRollup = { stage: Stage; count: number; value: number; weighted: number }

/** Open deals by stage: how many, their full value, and their value at the stage's probability. */
export function stageRollup(deals: readonly Deal[]): StageRollup[] {
  return OPEN_STAGES.map(stage => {
    const inStage = deals.filter(d => d.stage === stage)
    return {
      stage,
      count: inStage.length,
      value: inStage.reduce((sum, d) => sum + dealValue(d), 0),
      weighted: inStage.reduce((sum, d) => sum + weightedValue(d), 0),
    }
  })
}

const axisEuro = new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', notation: 'compact', maximumFractionDigits: 0 })

const COLUMNS: DataTableColumn<RepRollup>[] = [
  { key: 'rep', header: 'Rep', sortValue: r => r.rep, cell: r => r.rep },
  { key: 'won', header: 'Won', numeric: true, sortValue: r => r.won, cell: r => formatEuros(r.won) },
  { key: 'commit', header: 'Commit', numeric: true, sortValue: r => r.commit, cell: r => formatEuros(r.commit) },
  { key: 'best', header: 'Best case', numeric: true, sortValue: r => r.bestCase, cell: r => formatEuros(r.bestCase) },
  { key: 'pipeline', header: 'Pipeline', numeric: true, sortValue: r => r.pipeline, cell: r => formatEuros(r.pipeline) },
]

function deals(n: number) {
  return `${n} ${n === 1 ? 'deal' : 'deals'}`
}

/* The chart's own two series colours, so won and commit are the same colour everywhere on the
   page. Commit is also hatched, because it is money not yet in: the pattern tells the two apart
   without colour (SC 1.4.1). */
const WON_FILL = 'var(--color-chart-series-1)'
const COMMIT_FILL = 'repeating-linear-gradient(135deg, var(--color-chart-series-2) 0 2px, transparent 2px 6px)'

/* The bento grid. Cells draw their own right and bottom hairlines and the grid is pulled 1px
   past its clipping wrapper, so only the lines between cells show at any column count. The clip
   sits on a wrapper because `.crosshair` draws its corner marks outside the panel. */
function Bento({ className, children, ...rest }: { className?: string; children: ReactNode; 'aria-label'?: string }) {
  return (
    <section className="panel crosshair" {...rest}>
      <div className="overflow-hidden">
        <div className={cn('-mr-px -mb-px grid grid-cols-1', className)}>{children}</div>
      </div>
    </section>
  )
}

function Cell({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('flex min-w-0 flex-col gap-3 border-r border-b border-[var(--color-border-hairline)] p-5', className)}>{children}</div>
}

function Swatch({ fill, outline = false }: { fill?: string; outline?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn('inline-block h-3 w-3 shrink-0', outline && 'border border-[var(--color-border-hairline-strong)]')}
      style={fill ? { background: fill } : undefined}
    />
  )
}

/** The goal as one track: won, then commit, then the gap, against a tick for how much of the
 *  quarter has gone. Named with the same sentence a reader gets from the figures beside it. The
 *  two filled parts draw on once when the page arrives (M2), not at all under reduced motion. */
function GoalTrack({ won, commit, elapsed, day, days }: { won: number; commit: number; elapsed: number; day: number; days: number }) {
  const wonShare = Math.min(won / QUARTER_GOAL, 1) * 100
  const commitShare = Math.min(commit / QUARTER_GOAL, 1 - wonShare / 100) * 100
  return (
    <div className="flex flex-col gap-2">
      <div
        role="img"
        aria-label={`${Math.round(wonShare)}% of the goal won and ${Math.round(commitShare)}% in commit, on day ${day} of ${days} of the quarter.`}
        className="relative h-10 border border-[var(--color-border-hairline-strong)]"
      >
        <div className="anim-draw-on absolute inset-y-0 left-0 flex" style={{ width: `${wonShare + commitShare}%` }}>
          <span className="block h-full" style={{ flexGrow: wonShare, background: WON_FILL }} />
          <span className="block h-full" style={{ flexGrow: commitShare, background: COMMIT_FILL }} />
        </div>
        {[25, 50, 75].map(at => (
          <span key={at} aria-hidden="true" className="absolute bottom-0 h-2 w-px bg-[var(--color-border-hairline-strong)]" style={{ left: `${at}%` }} />
        ))}
        <span aria-hidden="true" className="absolute -inset-y-2 w-0.5 bg-[var(--color-text-primary)]" style={{ left: `${elapsed}%` }} />
      </div>
      <div aria-hidden="true" className="relative h-4 font-mono text-xs text-[var(--color-text-secondary)]">
        <span className="absolute -translate-x-1/2 whitespace-nowrap" style={{ left: `clamp(3rem, ${elapsed}%, calc(100% - 3rem))` }}>
          Day {day} of {days}
        </span>
      </div>
    </div>
  )
}

/** Open deals by stage, a row each: count, full value, and value at the stage's probability.
 *  The bar is the full value against the largest stage, a picture of the figure beside it. */
function StageLadder({ stages }: { stages: StageRollup[] }) {
  const max = Math.max(...stages.map(s => s.value), 1)
  return (
    <ol className="flex flex-col">
      {stages.map(s => (
        <li key={s.stage} className="flex flex-col gap-2 border-t border-[var(--color-border-hairline)] py-3 first:border-t-0 first:pt-0">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <span className="font-body text-sm font-semibold text-[var(--color-text-primary)]">
              {STAGE_LABEL[s.stage]} <span className="font-mono text-xs font-normal text-[var(--color-text-secondary)]">{PROBABILITY[s.stage]}%</span>
            </span>
            <span className="font-mono text-sm tabular-nums text-[var(--color-text-primary)]">{formatEuros(s.value)}</span>
          </div>
          <div aria-hidden="true" className="anim-draw-on h-1.5 bg-[var(--color-accent-signal-fill)]" style={{ width: `${(s.value / max) * 100}%` }} />
          <p className="font-body text-sm text-[var(--color-text-secondary)]">
            {deals(s.count)}, {formatEuros(s.weighted)} weighted
          </p>
        </li>
      ))}
    </ol>
  )
}

function HygieneCard({ icon, title, description, count, href }: { icon: ReactNode; title: string; description: string; count: number; href: string }) {
  return (
    <Card interactive className="h-full">
      <CardBody className="flex items-start gap-4">
        <span aria-hidden="true" className="mt-1 text-[var(--color-text-secondary)] [&_svg]:h-5 [&_svg]:w-5">
          {icon}
        </span>
        <div className="flex min-w-0 grow flex-col gap-1">
          <CardTitle level={3} className="text-base">
            {/* The link stretches over the whole card, so the card is one target with one name. */}
            <RouterLink to={href} className="after:absolute after:inset-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]">
              {title}
            </RouterLink>
          </CardTitle>
          <p className="font-body text-sm text-[var(--color-text-secondary)]">{description}</p>
        </div>
        <p className="shrink-0 text-right">
          <span className="block font-display text-3xl font-semibold tabular-nums">{count}</span>
          <span className="block font-mono text-xs text-[var(--color-text-secondary)]">{count === 1 ? 'deal' : 'deals'}</span>
        </p>
      </CardBody>
    </Card>
  )
}

/**
 * The quarter against its goal, as a bento: one track for won, commit and the gap with a tick
 * for the day of the quarter, and the four figures under it. Then the reps as a chart beside the
 * three pipeline-hygiene counts (each opens the pipeline filtered to the deals behind it), then
 * open deals by stage beside the table by rep.
 */
export function Forecast() {
  const { state } = useCrm()
  const quarter = quarterOf(TODAY)
  const rollup = forecastRollup(state.deals)
  const stages = stageRollup(state.deals)
  const won = rollup.reduce((sum, r) => sum + r.won, 0)
  const commit = rollup.reduce((sum, r) => sum + r.commit, 0)
  const gap = Math.max(0, QUARTER_GOAL - won - commit)
  const checks = hygiene(state.deals, state.activities)
  const days = daysBetween(quarter.start, quarter.end) + 1
  const day = daysBetween(quarter.start, TODAY) + 1
  const covered = Math.round(((won + commit) / QUARTER_GOAL) * 100)

  return (
    <div className="@container flex max-w-screen-xl flex-col gap-10">
      <PageHeader eyebrow={WORKSPACE} title="Forecast" description={`${quarter.label}, against the team's goal of ${formatEuros(QUARTER_GOAL)}.`} />

      <Bento aria-label="The quarter so far" className="@3xl:grid-cols-4">
        <Cell className="gap-6 @3xl:col-span-4">
          <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="font-display text-5xl font-semibold tabular-nums">{covered}%</span>
            <span className="font-body text-base text-[var(--color-text-secondary)]">of the goal is won or in commit.</span>
          </p>
          <GoalTrack won={won} commit={commit} elapsed={(day / days) * 100} day={day} days={days} />
        </Cell>
        <Cell>
          <Stat label="Quarter goal" value={formatEuros(QUARTER_GOAL)} />
          <p className="flex items-center gap-2 font-body text-sm text-[var(--color-text-secondary)]">
            <span aria-hidden="true" className="inline-block h-3 w-0.5 bg-[var(--color-text-primary)]" />
            Day {day} of {days}
          </p>
        </Cell>
        <Cell>
          <Stat label="Won" value={formatEuros(won)} />
          <p className="flex items-center gap-2 font-body text-sm text-[var(--color-text-secondary)]">
            <Swatch fill={WON_FILL} /> Closed won this quarter
          </p>
        </Cell>
        <Cell>
          <Stat label="Commit" value={formatEuros(commit)} />
          <p className="flex items-center gap-2 font-body text-sm text-[var(--color-text-secondary)]">
            <Swatch fill={COMMIT_FILL} /> Negotiation, at 75%
          </p>
        </Cell>
        <Cell>
          <Stat label="Gap to goal" value={formatEuros(gap)} />
          <p className="flex items-center gap-2 font-body text-sm text-[var(--color-text-secondary)]">
            <Swatch outline /> Still to find
          </p>
        </Cell>
      </Bento>

      <div className="grid grid-cols-1 gap-6 @5xl:grid-cols-12">
        <ChartPanel<RepRollup>
          className="@5xl:col-span-8 @5xl:self-start"
          title="Won and commit by rep"
          headingLevel={2}
          summary={`What each rep has won in ${quarter.label} beside what they have in Negotiation, weighted at 75%.`}
          kind="bar"
          data={rollup}
          xKey="rep"
          xLabel="Rep"
          series={[
            { key: 'won', label: 'Won' },
            { key: 'commit', label: 'Commit' },
          ]}
          formatValue={formatEuros}
          formatAxisValue={value => axisEuro.format(value / 100)}
          axisWidth={56}
        />

        <section aria-labelledby="hygiene-heading" className="flex flex-col gap-4 @5xl:col-span-4">
          <SectionHeading id="hygiene-heading" level={2} title="Pipeline hygiene" description="Each opens the pipeline, filtered to the deals behind the count." />
          <ul role="list" className="flex flex-col gap-4">
            <li>
              <HygieneCard icon={<CalendarX2 />} title="Close date passed" description="Expected close is already behind them." count={checks.slipped} href="/crm?view=table&slipped=1" />
            </li>
            <li>
              <HygieneCard icon={<CircleSlash />} title="No next step" description="Nothing agreed for what happens next." count={checks.noNext} href="/crm?view=table&nonext=1" />
            </li>
            <li>
              <HygieneCard icon={<Hourglass />} title="Stalled" description="No activity for more than 14 days." count={checks.stalled} href="/crm?view=table&stalled=1" />
            </li>
          </ul>
          <p className="font-body text-sm text-[var(--color-text-secondary)]">
            Or see <RouterLink to="/crm/activity" className={linkVariants()}>
              what the team did this week
            </RouterLink>.
          </p>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-10 @5xl:grid-cols-12 @5xl:gap-6">
        <section aria-labelledby="stages-heading" className="flex flex-col gap-4 @5xl:col-span-4">
          <SectionHeading id="stages-heading" level={2} title="By stage" description="Open deals at full value, and at each stage's probability." />
          <div className="panel crosshair p-5">
            <StageLadder stages={stages} />
          </div>
        </section>

        <section aria-labelledby="rollup-heading" className="flex min-w-0 flex-col gap-4 @5xl:col-span-8">
          <SectionHeading id="rollup-heading" level={2} title="By rep" description="Best case is Proposal and Negotiation at full value." />
          <DataTable caption="Forecast by rep" hideCaption columns={COLUMNS} rows={rollup} getRowId={r => r.id} rowHeader="rep" defaultSort={{ key: 'won', direction: 'descending' }} />
        </section>
      </div>
    </div>
  )
}
