import { useEffect, useId, useState, type CSSProperties, type Ref } from 'react'
import { ChevronDown } from 'lucide-react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  ReferenceArea,
  ReferenceLine,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type DataKey,
  type TooltipContentProps,
} from 'recharts'
import { cn } from '../../../lib/cn'
import { Button } from '../../atoms'
import { Card, CardBody, CardHeader, CardTitle } from '../../molecules'
import { DataTable, type DataTableColumn } from '../data-table/DataTable'

/** Row keys whose value is a number: a series measures something, so a string column (the x-axis
 *  category, say) is never a valid series key. */
type NumericKey<Row> = { [K in keyof Row]: Row[K] extends number ? K : never }[keyof Row] & string

export type ChartSeries<Row> = { key: NumericKey<Row>; label: string }

/** A shaded stretch of the x-axis: night hours, a sale, an outage. `from` and `to` are x-axis
 *  values (values of `xKey`), both included. */
export type ChartBand = { from: string | number; to: string | number; label?: string }
export type ChartLimit = { value: number; label?: string }

export type ChartKind = 'line' | 'bar' | 'donut' | 'radar'

export type ChartPanelProps<Row extends Record<string, string | number>> = {
  /** The panel's heading and its accessible name. */
  title: string
  /** One sentence saying what the chart shows. It is the figure's caption, and the chart's text
   *  alternative together with the table. */
  summary: string
  /** line: change over time. bar: compare categories. donut: parts of one whole (one series; each
   *  row is a slice). radar: several measures of one or two things (each row is an axis). */
  kind: ChartKind
  data: Row[]
  /** The category on the x-axis (a donut's slice, a radar's axis). Its values name the table's
   *  rows, so they must be unique. */
  xKey: keyof Row & string
  /** The table's first column header. */
  xLabel: string
  /** One or two, coloured in order by chart.series-1 and chart.series-2. There is no third. A
   *  donut reads only the first. */
  series: [ChartSeries<Row>] | [ChartSeries<Row>, ChartSeries<Row>]
  /** Line only: fill the area under each line with a gradient of its colour fading to nothing.
   *  @default false */
  area?: boolean
  /** Line only: `smooth` is a monotone curve, which never overshoots a data point the way a
   *  plain spline does. @default 'linear' */
  curve?: 'linear' | 'smooth'
  /** Horizontal grid lines (a radar's web). `false` also drops the axis lines, keeping only the
   *  tick labels. @default true */
  grid?: boolean
  /** `sm` is the stat-card size: a short sparkline with no axes and no grid, for a card about
   *  240px wide. Pair it with `headline`. @default 'md' */
  size?: 'md' | 'sm'
  /** A formatted figure printed large under the title: the number the chart is about. */
  headline?: string
  /** Donut only: the caption under the total in the ring's centre. */
  centerLabel?: string
  /** @default Intl.NumberFormat('en-IE') */
  formatValue?: (value: number) => string
  /** The y-axis's own tick labels specifically. @default `formatValue` -- most panels want the
   *  axis, the tooltip and the table all reading the same way, but a fixed-width axis can clip a
   *  full `formatValue` output ("€1,234.00") where a shorter, compact one ("€1.2K") fits; SpendChart
   *  is why this exists. */
  formatAxisValue?: (value: number) => string
  /** The y-axis's own reserved width, in px. @default 48 -- Recharts' own YAxis default, named
   *  here (rather than left to Recharts) so a panel whose tick labels run wider than two figures
   *  can grow it without the labels clipping. */
  axisWidth?: number
  /** Line and bar only: shade stretches of the x-axis, such as night hours on a 24-hour chart.
   *  `from` and `to` are values of `xKey`, both included. A band whose `from` comes after its `to`
   *  in the data wraps past the end (22:00 to 06:00 shades 22:00 to the last point, and the first
   *  point to 06:00). A band naming a value that is not in the data is skipped. Each band is listed
   *  under the chart, so a screen reader hears it too. */
  bands?: ChartBand[]
  /** Line and bar only: a dashed horizontal line at a y value, such as an alert limit. The y-axis
   *  grows to include it. Each limit is listed under the chart, formatted with `formatValue`. */
  limits?: ChartLimit[]
  /** @default 3 */
  headingLevel?: 2 | 3 | 4
  className?: string
  ref?: Ref<HTMLElement>
}

const SERIES_COLOURS = ['var(--color-chart-series-1)', 'var(--color-chart-series-2)'] as const
/** Series 2's line is dashed, series 1's solid: two lines can sit close together or cross, so
 *  colour alone (SC 1.4.1) is not enough to tell them apart once printed in greyscale or seen by a
 *  colour-blind reader. Two bars in a group don't share the hazard -- series 1 is always the left
 *  bar, series 2 always the right, a positional cue that never depends on colour -- so only Line
 *  (and Radar, whose two outlines cross the same way) gets a dash. */
const SERIES_DASH = [undefined, '6 3'] as const
/** The area gradient's top opacity per series: the second series fills fainter, so where the two
 *  areas overlap the first still reads as the one in front. */
const AREA_OPACITY = [0.4, 0.22] as const
/** Under a line the gradient starts fainter still and is gone by 85% of the way down: a tint
 *  that says "area", never a fill competing with the line. */
const LINE_AREA_OPACITY = [0.16, 0.09] as const
const TICK = { fill: 'var(--color-text-secondary)', fontSize: 12, fontFamily: 'var(--font-mono)' }
const NUMBER = new Intl.NumberFormat('en-IE')
const formatNumber = (value: number) => NUMBER.format(value)

/** A donut has as many slices as rows, and the system has two chart colours. So the third slice
 *  on reuses them as a stripe, then a dot, pattern: six fills that differ from their neighbours
 *  by more than colour (SC 1.4.1), each outlined in its solid colour so the slice edge still
 *  measures as the series colour does. A seventh row cycles back to the first fill; fold the tail
 *  into an "Other" row instead. */
type SliceFill = { colour: string; pattern: 'solid' | 'stripe' | 'dots' }
const SLICE_FILLS: SliceFill[] = [
  { colour: SERIES_COLOURS[0], pattern: 'solid' },
  { colour: SERIES_COLOURS[1], pattern: 'solid' },
  { colour: SERIES_COLOURS[0], pattern: 'stripe' },
  { colour: SERIES_COLOURS[1], pattern: 'stripe' },
  { colour: SERIES_COLOURS[0], pattern: 'dots' },
  { colour: SERIES_COLOURS[1], pattern: 'dots' },
]

/** The CSS twin of each SVG pattern, for the legend and tooltip swatches. */
function sliceSwatch({ colour, pattern }: SliceFill): CSSProperties {
  if (pattern === 'solid') return { background: colour }
  const edge = `inset 0 0 0 1px ${colour}`
  if (pattern === 'stripe') {
    return { backgroundImage: `repeating-linear-gradient(45deg, ${colour} 0 2px, transparent 2px 4px)`, boxShadow: edge }
  }
  return { backgroundImage: `radial-gradient(${colour} 1px, transparent 1.5px)`, backgroundSize: '4px 4px', boxShadow: edge }
}

/** A CSS `repeating-linear-gradient` swatch matching an SVG `stroke-dasharray` string ("N M")
 *  exactly -- reads the same two numbers `SERIES_DASH` hands the SVG `Line`, so the legend swatch
 *  and the line it stands for can never drift out of proportion with each other. */
function dashSwatch(colour: string, dasharray: string): string {
  const [on, off] = dasharray.split(' ').map(Number)
  return `repeating-linear-gradient(to right, ${colour} 0 ${on}px, transparent ${on}px ${on + off}px)`
}

/** Square markers, not Recharts' round dots: the system's shape language is square, and a square
 *  reads as a deliberate mark rather than a default. */
function squareDot(colour: string, size: number) {
  return function SquareDot(props: { cx?: number; cy?: number }) {
    const { cx, cy } = props
    if (cx == null || cy == null) return <g />
    return (
      <rect
        x={cx - size / 2}
        y={cy - size / 2}
        width={size}
        height={size}
        fill={colour}
        stroke="var(--color-surface-base)"
        strokeWidth={2}
      />
    )
  }
}

/** The chart's right margin at size md, in px; the last x label may overhang the plot by this much. */
const RIGHT_MARGIN = 16

/** An x-axis label, centred on its point like Recharts' own, except the last: centred, a label
 *  wider than twice the right margin ("22:00" in 12px mono is about 36px) would hang past the
 *  SVG's edge and be clipped ("22:0", the 2026-10-20 outside test). That one slides left just far
 *  enough to fit. Monospace glyphs are 0.6em wide, so the width is known without measuring. */
function XTick(props: { x?: number | string; y?: number | string; index?: number; visibleTicksCount?: number; payload?: { value?: unknown } }) {
  const text = String(props.payload?.value ?? '')
  const last = props.index !== undefined && props.index === (props.visibleTicksCount ?? 0) - 1
  const overhang = (text.length * TICK.fontSize * 0.6) / 2 - RIGHT_MARGIN + 2
  const x = Number(props.x ?? 0) - (last ? Math.max(0, overhang) : 0)
  return (
    <text x={x} y={Number(props.y ?? 0)} dy="0.71em" textAnchor="middle" fill={TICK.fill} fontSize={TICK.fontSize} fontFamily={TICK.fontFamily}>
      {text}
    </text>
  )
}

/** A radar's axis label, kept inside the chart. Recharts places each label just outside the web
 *  and lets it run off the SVG edge, which at 320px clips "Reliability" to "lity". Mono figures
 *  are 0.6em wide, so the label's width is known without measuring: anchor it to whichever side it
 *  sits on, then slide it back inside the frame if it would cross the edge. */
function radarTick(width: number) {
  return function RadarTick(props: { x?: number | string; y?: number | string; payload?: { value?: unknown } }) {
    const x = Number(props.x ?? 0)
    const y = Number(props.y ?? 0)
    const text = String(props.payload?.value ?? '')
    const textWidth = text.length * TICK.fontSize * 0.6
    const centre = width / 2
    const anchor = Math.abs(x - centre) < 4 ? 'middle' : x > centre ? 'start' : 'end'
    let left = anchor === 'start' ? x + 4 : anchor === 'end' ? x - 4 - textWidth : x - textWidth / 2
    left = Math.max(2, Math.min(left, width - textWidth - 2))
    return (
      <text x={left} y={y} dy="0.35em" textAnchor="start" fill={TICK.fill} fontSize={TICK.fontSize} fontFamily={TICK.fontFamily}>
        {text}
      </text>
    )
  }
}

type TooltipEntry = { color?: string; name?: string | number; value?: unknown; payload?: { __swatch?: CSSProperties } }

function ChartTooltip({
  active,
  payload,
  label,
  format,
}: Partial<TooltipContentProps<number, string>> & { format: (value: number) => string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="flex flex-col gap-1 px-3 py-2 border border-[var(--color-border-hairline-strong)] bg-[var(--color-surface-sunken)] font-body text-xs">
      {label !== undefined && label !== '' ? <p className="font-mono text-[var(--color-text-primary)]">{label}</p> : null}
      {(payload as unknown as TooltipEntry[]).map((entry, index) => (
        <p key={index} className="flex items-center gap-2 text-[var(--color-text-secondary)]">
          <span
            aria-hidden="true"
            className="w-2.5 h-2.5 shrink-0"
            style={entry.payload?.__swatch ?? { background: entry.color }}
          />
          {entry.name}
          <span className="ml-auto pl-3 font-mono tabular-nums text-[var(--color-text-primary)]">
            {typeof entry.value === 'number' ? format(entry.value) : String(entry.value)}
          </span>
        </p>
      ))}
    </div>
  )
}

const HEIGHT = {
  md: { line: 'h-60', bar: 'h-60', donut: 'h-56', radar: 'h-72' },
  sm: { line: 'h-16', bar: 'h-16', donut: 'h-40', radar: 'h-44' },
} as const

/** How long the first draw-in runs; after it, data changes render without animation. */
const DRAW_MS = 800

/**
 * A chart in a Card: a title, a one-sentence summary as the figure's caption, a line, bar, donut
 * or radar chart of one or two series, and a "Show as table" disclosure with the same rows.
 *
 * The chart is for sighted pointer users and is hidden from assistive tech: its wrapper is
 * aria-hidden, and accessibilityLayer is off, because with it on Recharts puts role="application"
 * and a tab stop on the SVG. The summary and the table are the text alternative. Colour follows a
 * series' position, never its rank; a legend names two series, the title names one. A donut's
 * legend names every slice with its value and share, and its table gains a Share column.
 *
 * The 2026-10-14 look (Victor: "more modern", after reui's chart page): dashed hairline grid with
 * no vertical lines, no tick marks, square active dots, an optional gradient area and monotone
 * curve, a gridless variant, and a `sm` stat-card size. The circular gauge for a single 0-100
 * score is not a kind here: it is one bounded value with no table to fall back to, so it is the
 * ScoreRing atom (a meter), not a chart panel.
 *
 * Contrast rows, by exact name: title "text.primary on surface.raised (over surface.base)"; caption,
 * legend, ticks and the ghost button "alert body and ghost dismiss (text.secondary) on
 * surface.raised (over surface.base)"; series "chart series N (chart.series-N) on surface.raised
 * (over surface.base)" -- also every donut slice, whose patterned fills are outlined in the same
 * solid series colour; ring "focus ring (focus.ring) on surface.raised (over surface.base)"; in a
 * raised panel, the matching "nested in surface.raised" rows. Tooltip: "toast title (text.primary)
 * on surface.sunken" and "dropdown menu label (text.secondary) on surface.sunken". Gridlines and
 * the area gradient are decorative: the line on top of the gradient carries the value.
 */
export function ChartPanel<Row extends Record<string, string | number>>({
  title,
  summary,
  kind,
  data,
  xKey,
  xLabel,
  series,
  area = false,
  curve = 'linear',
  grid = true,
  size = 'md',
  headline,
  centerLabel,
  formatValue = formatNumber,
  formatAxisValue = formatValue,
  axisWidth = 48,
  bands = [],
  limits = [],
  headingLevel = 3,
  className,
  ref,
}: ChartPanelProps<Row>) {
  const uid = useId()
  // useId's colons and guillemets are not safe inside an SVG `url(#...)` reference.
  const svgId = `chart${uid.replace(/[^a-zA-Z0-9_-]/g, '')}`
  const [open, setOpen] = useState(false)
  const [width, setWidth] = useState(0)
  // The draw-in plays once, on mount. A live page that rebuilds its data array on every render
  // would otherwise restart the animation before it ends, and the chart would never finish
  // drawing (the 2026-10-20 outside test). After the first draw, new data swaps in place.
  // Under reduced motion there is no draw-in at all: Recharts does not check the setting itself.
  const [firstDraw, setFirstDraw] = useState(
    () => typeof window === 'undefined' || !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  )
  useEffect(() => {
    const timer = setTimeout(() => setFirstDraw(false), DRAW_MS)
    return () => clearTimeout(timer)
  }, [])
  const small = size === 'sm'
  const showGrid = grid && !small
  const curveType = curve === 'smooth' ? 'monotone' : 'linear'

  const donutKey = series[0].key
  const total = kind === 'donut' ? data.reduce((sum, row) => sum + Number(row[donutKey]), 0) : 0
  const share = (row: Row) => (total > 0 ? `${Math.round((Number(row[donutKey]) / total) * 100)}%` : '0%')

  const columns: DataTableColumn<Row>[] = [
    { key: xKey, header: xLabel, cell: row => String(row[xKey]) },
    ...(kind === 'donut' ? series.slice(0, 1) : series).map(entry => ({
      key: entry.key,
      header: entry.label,
      numeric: true,
      cell: (row: Row) => formatValue(Number(row[entry.key])),
    })),
    ...(kind === 'donut' ? [{ key: '__share', header: 'Share', numeric: true, cell: share }] : []),
  ]

  // A band is two x-axis values; one whose `from` sits after its `to` wraps, so it is drawn as
  // two areas, its start to the last point and the first point to its end.
  const keys: (string | number)[] = data.map(row => row[xKey])
  const shownBands = kind === 'line' || kind === 'bar' ? bands.filter(band => keys.includes(band.from) && keys.includes(band.to)) : []
  const bandAreas = shownBands.flatMap((band, index) => {
    const wraps = keys.indexOf(band.from) > keys.indexOf(band.to)
    const spans = wraps
      ? [
          [band.from, keys[keys.length - 1]],
          [keys[0], band.to],
        ]
      : [[band.from, band.to]]
    // Hairline as a fill: a quiet, translucent wash that reads in both themes and never competes
    // with the series colours. No accent: a band is context, not data.
    return spans.map(([x1, x2], part) => (
      <ReferenceArea
        key={`band-${index}-${part}`}
        x1={x1}
        x2={x2}
        fill="var(--color-border-hairline)"
        fillOpacity={1}
        stroke="none"
      />
    ))
  })

  // Drawn in text.secondary, dashed: a limit is a threshold to read against, stronger than the
  // hairline grid, never a series colour. extendDomain keeps a limit above the data in view.
  const shownLimits = (kind === 'line' || kind === 'bar') && !small ? limits : []
  const limitLines = shownLimits.map((limit, index) => (
    <ReferenceLine
      key={`limit-${index}`}
      y={limit.value}
      stroke="var(--color-text-secondary)"
      strokeWidth={1}
      strokeDasharray="6 4"
      ifOverflow="extendDomain"
    />
  ))

  const tooltip = (cursor: false | object) => (
    <Tooltip content={<ChartTooltip format={formatValue} />} cursor={cursor} isAnimationActive={false} wrapperStyle={{ zIndex: 10 }} />
  )

  // A sparkline has no axis to read a zero from, so a line fills its own height (min to max), the
  // way every stat-card sparkline does; bars keep their zero, because a bar's length is its value.
  const axes = small ? (
    kind === 'line' ? <YAxis hide domain={['dataMin', 'dataMax']} /> : null
  ) : (
    <>
      {showGrid ? <CartesianGrid vertical={false} stroke="var(--color-border-hairline)" strokeDasharray="3 4" /> : null}
      <XAxis
        dataKey={xKey as DataKey<Row>}
        tick={XTick}
        tickLine={false}
        tickMargin={8}
        // Many points at 320px: keep the first and last label and drop the ones between that
        // would sit closer than 16px, so labels never overlap and no data point is lost.
        interval="preserveStartEnd"
        minTickGap={16}
        axisLine={showGrid ? { stroke: 'var(--color-border-hairline-strong)' } : false}
      />
      <YAxis
        tick={TICK}
        tickLine={false}
        axisLine={false}
        width={axisWidth}
        tickFormatter={(value: number) => formatAxisValue(value)}
      />
    </>
  )

  const margin = small ? { top: 4, right: 2, bottom: 2, left: 2 } : { top: 8, right: RIGHT_MARGIN, bottom: 0, left: 0 }
  const lineCursor = { stroke: 'var(--color-border-hairline-strong)', strokeDasharray: '3 3' }

  function renderChart() {
    if (kind === 'line' && area) {
      return (
        <AreaChart data={data} accessibilityLayer={false} margin={margin}>
          <defs>
            {series.map((_, index) => (
              <linearGradient key={index} id={`${svgId}-area-${index}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={SERIES_COLOURS[index]} stopOpacity={LINE_AREA_OPACITY[index]} />
                <stop offset="85%" stopColor={SERIES_COLOURS[index]} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          {axes}
          {bandAreas}
          {limitLines}
          {tooltip(lineCursor)}
          {series.map((entry, index) => (
            <Area
              key={index}
              type={curveType}
              dataKey={entry.key as keyof Row & string as DataKey<Row>}
              name={entry.label}
              stroke={SERIES_COLOURS[index]}
              strokeWidth={2}
              strokeDasharray={SERIES_DASH[index]}
              fill={`url(#${svgId}-area-${index})`}
              dot={false}
              activeDot={squareDot(SERIES_COLOURS[index], 8)}
              isAnimationActive={firstDraw}
              animationDuration={DRAW_MS}
            />
          ))}
        </AreaChart>
      )
    }
    if (kind === 'line') {
      return (
        <LineChart data={data} accessibilityLayer={false} margin={margin}>
          {axes}
          {bandAreas}
          {limitLines}
          {tooltip(lineCursor)}
          {series.map((entry, index) => (
            <Line
              key={index}
              type={curveType}
              dataKey={entry.key}
              name={entry.label}
              stroke={SERIES_COLOURS[index]}
              strokeWidth={2}
              strokeDasharray={SERIES_DASH[index]}
              dot={false}
              activeDot={squareDot(SERIES_COLOURS[index], 8)}
              isAnimationActive={firstDraw}
              animationDuration={DRAW_MS}
            />
          ))}
        </LineChart>
      )
    }
    if (kind === 'bar') {
      return (
        <BarChart data={data} accessibilityLayer={false} barGap={2} margin={margin}>
          {axes}
          {bandAreas}
          {limitLines}
          {tooltip({ fill: 'var(--color-border-hairline)' })}
          {/* No dash or pattern here (see SERIES_DASH above): a grouped bar's own position
              -- series 1 always left, series 2 always right, at every category -- is a
              non-colour cue a line chart doesn't have. */}
          {series.map((entry, index) => (
            <Bar
              key={index}
              // Two casts, not one: entry.key is NumericKey<Row>, provably a subset of
              // `keyof Row & string` but not one tsc reduces through the mapped-then-
              // indexed type in this generic body. Widen to the type Recharts' own
              // DataKey<Row> was already proven to overlap, then cast to it.
              dataKey={entry.key as keyof Row & string as DataKey<Row>}
              name={entry.label}
              fill={SERIES_COLOURS[index]}
              radius={[2, 2, 0, 0]}
              maxBarSize={small ? 12 : 32}
              isAnimationActive={firstDraw}
              animationDuration={DRAW_MS}
            />
          ))}
        </BarChart>
      )
    }
    if (kind === 'donut') {
      const slices = data.map((row, index) => ({ row, fill: SLICE_FILLS[index % SLICE_FILLS.length] }))
      return (
        <PieChart accessibilityLayer={false} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
          <defs>
            {SERIES_COLOURS.map((colour, index) => (
              <pattern
                key={`stripe-${index}`}
                id={`${svgId}-stripe-${index}`}
                width="6"
                height="6"
                patternUnits="userSpaceOnUse"
                patternTransform="rotate(45)"
              >
                <rect width="3" height="6" fill={colour} />
              </pattern>
            ))}
            {SERIES_COLOURS.map((colour, index) => (
              <pattern key={`dots-${index}`} id={`${svgId}-dots-${index}`} width="5" height="5" patternUnits="userSpaceOnUse">
                <rect x="1" y="1" width="3" height="3" fill={colour} />
              </pattern>
            ))}
          </defs>
          {tooltip(false)}
          <Pie
            // Recharts makes the pie layer a tab stop by default; the chart is aria-hidden, the
            // legend and the table carry the data, so it gets none.
            rootTabIndex={-1}
            data={slices.map(({ row, fill }) => ({ ...row, __swatch: sliceSwatch(fill) }))}
            dataKey={donutKey as string}
            nameKey={xKey}
            innerRadius="64%"
            outerRadius="94%"
            paddingAngle={2}
            startAngle={90}
            endAngle={-270}
            isAnimationActive={false}
          >
            {slices.map(({ fill }, index) => {
              const colourIndex = fill.colour === SERIES_COLOURS[0] ? 0 : 1
              return (
                <Cell
                  key={index}
                  fill={fill.pattern === 'solid' ? fill.colour : `url(#${svgId}-${fill.pattern}-${colourIndex})`}
                  stroke={fill.pattern === 'solid' ? 'none' : fill.colour}
                  strokeWidth={1}
                />
              )
            })}
          </Pie>
        </PieChart>
      )
    }
    return (
      <RadarChart data={data} accessibilityLayer={false} outerRadius={small ? '72%' : width && width < 360 ? '62%' : '80%'} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
        <defs>
          {series.map((_, index) => (
            <radialGradient key={index} id={`${svgId}-radar-${index}`}>
              <stop offset="0%" stopColor={SERIES_COLOURS[index]} stopOpacity={0.06} />
              <stop offset="100%" stopColor={SERIES_COLOURS[index]} stopOpacity={AREA_OPACITY[index]} />
            </radialGradient>
          ))}
        </defs>
        {grid ? <PolarGrid gridType="polygon" stroke="var(--color-border-hairline)" /> : null}
        <PolarAngleAxis dataKey={xKey as DataKey<Row>} tick={small ? false : radarTick(width)} tickLine={false} axisLine={false} />
        <PolarRadiusAxis tick={false} axisLine={false} />
        {tooltip(false)}
        {series.map((entry, index) => (
          <Radar
            key={index}
            dataKey={entry.key as keyof Row & string as DataKey<Row>}
            name={entry.label}
            stroke={SERIES_COLOURS[index]}
            strokeWidth={2}
            strokeDasharray={SERIES_DASH[index]}
            fill={`url(#${svgId}-radar-${index})`}
            fillOpacity={1}
            dot={squareDot(SERIES_COLOURS[index], 4)}
            isAnimationActive={false}
          />
        ))}
      </RadarChart>
    )
  }

  const legend =
    kind === 'donut' ? (
      <ul role="list" aria-label="Slices" className="flex flex-col gap-1.5 min-w-0 w-full">
        {data.map((row, index) => (
          <li key={index} className="flex items-center gap-2 font-body text-sm text-[var(--color-text-secondary)]">
            <span aria-hidden="true" className="w-2.5 h-2.5 shrink-0" style={sliceSwatch(SLICE_FILLS[index % SLICE_FILLS.length])} />
            <span className="min-w-0 truncate">{String(row[xKey])}</span>
            <span className="ml-auto font-mono tabular-nums text-[var(--color-text-primary)]">{formatValue(Number(row[donutKey]))}</span>
            <span className="w-10 text-right font-mono tabular-nums">{share(row)}</span>
          </li>
        ))}
      </ul>
    ) : series.length > 1 ? (
      <ul role="list" aria-label="Series" className="flex flex-wrap gap-x-4 gap-y-1">
        {series.map((entry, index) => {
          const lined = kind === 'line' || kind === 'radar'
          return (
            <li key={index} className="flex items-center gap-2 font-body text-xs text-[var(--color-text-secondary)]">
              <span
                aria-hidden="true"
                className={cn('shrink-0', lined ? 'w-4 h-0.5' : 'w-2.5 h-2.5')}
                style={
                  lined && SERIES_DASH[index]
                    ? { backgroundImage: dashSwatch(SERIES_COLOURS[index], SERIES_DASH[index]) }
                    : { background: SERIES_COLOURS[index] }
                }
              />
              {entry.label}
            </li>
          )
        })}
      </ul>
    ) : null

  // Visible and read aloud: the chart itself is aria-hidden, so the bands it shades are named here.
  const bandList = shownBands.length ? (
    <ul role="list" aria-label="Shaded ranges" className="flex flex-wrap gap-x-4 gap-y-1">
      {shownBands.map((band, index) => (
        <li key={index} className="flex items-center gap-2 font-body text-xs text-[var(--color-text-secondary)]">
          <span
            aria-hidden="true"
            className="w-2.5 h-2.5 shrink-0 bg-[var(--color-border-hairline-strong)]"
          />
          {band.label ? `${band.label}: ` : 'Shaded: '}
          {String(band.from)} to {String(band.to)}
        </li>
      ))}
    </ul>
  ) : null

  const limitList = shownLimits.length ? (
    <ul role="list" aria-label="Limits" className="flex flex-wrap gap-x-4 gap-y-1">
      {shownLimits.map((limit, index) => (
        <li key={index} className="flex items-center gap-2 font-body text-xs text-[var(--color-text-secondary)]">
          <span aria-hidden="true" className="w-3 shrink-0 border-t border-dashed border-[var(--color-text-secondary)]" />
          {limit.label ? `${limit.label}: ` : 'Limit: '}
          {formatValue(limit.value)}
        </li>
      ))}
    </ul>
  ) : null

  // Hidden from assistive tech, and accessibilityLayer off so the SVG has no role and no tab
  // stop: the caption and the table are the text alternative.
  const chart = (
    <div aria-hidden="true" className={cn('relative w-full min-w-0', HEIGHT[size][kind], kind === 'donut' && !small && '@md:w-1/2 @md:shrink-0')}>
      <ResponsiveContainer width="100%" height="100%" onResize={kind === 'radar' ? next => setWidth(next) : undefined}>
        {renderChart()}
      </ResponsiveContainer>
      {kind === 'donut' ? (
        <div data-part="centre" className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1">
          <span className={cn('font-display font-bold leading-none tabular-nums text-[var(--color-text-primary)]', small ? 'text-xl' : 'text-3xl')}>
            {formatValue(total)}
          </span>
          {centerLabel ? (
            <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-text-secondary)]">
              {centerLabel}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  )

  return (
    <Card as="section" ref={ref} className={cn('@container', className)}>
      <CardHeader className={small ? 'p-4 pb-0' : undefined}>
        <CardTitle
          level={headingLevel}
          className={small ? 'font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-text-secondary)]' : undefined}
        >
          {title}
        </CardTitle>
        {headline ? (
          <p
            data-part="headline"
            className={cn(
              'font-display font-bold leading-none tabular-nums text-[var(--color-text-primary)]',
              small ? 'mt-1 text-[2rem]' : 'mt-1 text-[2.25rem]'
            )}
          >
            {headline}
          </p>
        ) : null}
      </CardHeader>
      <CardBody className={cn('flex flex-col', small ? 'gap-3 p-4' : 'gap-4')}>
        <figure aria-labelledby={`${uid}-summary`} className="flex flex-col gap-3 min-w-0">
          {small ? null : (
            <figcaption id={`${uid}-summary`} className="font-body text-sm text-[var(--color-text-secondary)]">
              {summary}
            </figcaption>
          )}
          {kind === 'donut' ? (
            <div className={cn('flex flex-col items-center gap-4', !small && '@md:flex-row @md:gap-6')}>
              {chart}
              {legend}
            </div>
          ) : (
            <>
              {legend}
              {chart}
              {bandList}
              {limitList}
            </>
          )}
          {/* At sm the caption follows the sparkline: the headline and the line are what the card
              is for, and the sentence reads as their footnote. Still the figure's name. */}
          {small ? (
            <figcaption id={`${uid}-summary`} className="font-body text-sm text-[var(--color-text-secondary)]">
              {summary}
            </figcaption>
          ) : null}
        </figure>
        <div className="flex flex-col gap-3">
          <div>
            <Button
              variant="ghost"
              size="sm"
              aria-expanded={open}
              aria-controls={`${uid}-table`}
              onClick={() => setOpen(shown => !shown)}
            >
              <ChevronDown aria-hidden="true" className={cn('w-4 h-4', open && 'rotate-180')} />
              Show as table
            </Button>
          </div>
          <div id={`${uid}-table`} hidden={!open}>
            <DataTable
              caption={`${title}, as a table`}
              hideCaption
              columns={columns}
              rows={data}
              getRowId={row => String(row[xKey])}
              rowHeader={xKey}
            />
          </div>
        </div>
      </CardBody>
    </Card>
  )
}
