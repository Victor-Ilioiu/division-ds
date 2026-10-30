import { useState } from 'react'
import { Badge } from '../../components/atoms/badge/Badge'
import { Button } from '../../components/atoms/button/Button'
import { Checkbox } from '../../components/atoms/checkbox/Checkbox'
import { Input } from '../../components/atoms/input/Input'
import { Progress } from '../../components/atoms/progress/Progress'
import { Select } from '../../components/atoms/select/Select'
import { Slider } from '../../components/atoms/slider/Slider'
import { Switch } from '../../components/atoms/switch/Switch'
import { Tag } from '../../components/atoms/tag/Tag'
import { Panel } from '../../components/atoms/panel/Panel'
import { Alert } from '../../components/molecules/alert/Alert'
import { Card, CardBody, CardDescription, CardFooter, CardHeader, CardTitle } from '../../components/molecules/card/Card'
import { FormField } from '../../components/molecules/form-field/FormField'
import { SegmentedControl } from '../../components/molecules/segmented-control/SegmentedControl'
import { Stat } from '../../components/molecules/stat/Stat'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/molecules/tabs/Tabs'
import { ChartPanel } from '../../components/organisms/chart-panel/ChartPanel'
import { DataTable, type DataTableColumn } from '../../components/organisms/data-table/DataTable'

type Week = { week: string; online: number; depot: number }
const WEEKS: Week[] = [
  { week: 'W1', online: 118, depot: 150 },
  { week: 'W2', online: 149, depot: 172 },
  { week: 'W3', online: 168, depot: 158 },
  { week: 'W4', online: 141, depot: 131 },
  { week: 'W5', online: 126, depot: 128 },
  { week: 'W6', online: 174, depot: 150 },
  { week: 'W7', online: 231, depot: 141 },
  { week: 'W8', online: 183, depot: 122 },
  { week: 'W9', online: 139, depot: 149 },
  { week: 'W10', online: 162, depot: 185 },
  { week: 'W11', online: 196, depot: 163 },
  { week: 'W12', online: 170, depot: 140 },
]

type Status = 'In transit' | 'Delivered' | 'Held'
type Shipment = { ref: string; destination: string; items: number; status: Status }
const SHIPMENTS: Shipment[] = [
  { ref: 'SHP-201', destination: 'Cluj depot', items: 5, status: 'In transit' },
  { ref: 'SHP-202', destination: 'Arad depot', items: 12, status: 'Delivered' },
  { ref: 'SHP-203', destination: 'Brasov depot', items: 2, status: 'Held' },
  { ref: 'SHP-204', destination: 'Sibiu depot', items: 9, status: 'In transit' },
]
const STATUS_TONE: Record<Status, 'info' | 'ok' | 'warning'> = { 'In transit': 'info', Delivered: 'ok', Held: 'warning' }
const COLUMNS: DataTableColumn<Shipment>[] = [
  { key: 'ref', header: 'Reference', cell: s => s.ref, sortValue: s => s.ref },
  { key: 'destination', header: 'Destination', cell: s => s.destination },
  { key: 'items', header: 'Items', cell: s => String(s.items), sortValue: s => s.items, numeric: true },
  { key: 'status', header: 'Status', cell: s => <Badge tone={STATUS_TONE[s.status]}>{s.status}</Badge> },
]

/**
 * The Themes page's live preview: a small dashboard and a form made of real components. It sits
 * inside the themed wrapper, so every token it reads is the one the controls just built. Ids are
 * prefixed so the preview never collides with the controls beside it.
 */
export function ThemePreview() {
  const [range, setRange] = useState('8w')
  const [weight, setWeight] = useState([8])
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-display text-xl font-semibold">Depot operations</p>
          <p className="text-sm text-[var(--color-text-secondary)]">Orders and shipments, last eight weeks.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <SegmentedControl
            label="Range"
            size="sm"
            value={range}
            onValueChange={setRange}
            options={[
              { value: '4w', label: '4 weeks' },
              { value: '8w', label: '8 weeks' },
              { value: 'q', label: 'Quarter' },
            ]}
          />
          <Button size="sm">New shipment</Button>
        </div>
      </div>

      <Panel tone="raised" padding="md" crosshair>
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
          <Stat label="Orders" value={214} delta={{ value: '9%', direction: 'up', sentiment: 'positive', period: 'last week' }} />
          <Stat label="Held" value={3} delta={{ value: '1', direction: 'up', sentiment: 'negative', period: 'last week' }} />
          <Stat label="On time" value="96%" />
          <Stat label="Payload" value={24} unit="kg" />
        </div>
      </Panel>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <ChartPanel<Week>
          title="Weekly orders"
          summary="Online orders peaked three times in twelve weeks, highest at 231 in week 7; depot orders peaked highest at 185 in week 10."
          kind="line"
          area
          curve="smooth"
          data={WEEKS}
          xKey="week"
          xLabel="Week"
          series={[
            { key: 'online', label: 'Online' },
            { key: 'depot', label: 'Depot' },
          ]}
          headingLevel={3}
        />

        <Card>
          <CardHeader>
            <CardTitle>Schedule a pickup</CardTitle>
            <CardDescription>Every field here takes the theme.</CardDescription>
          </CardHeader>
          <CardBody className="flex flex-col gap-4">
            <FormField label="Contact name" help="As it should appear on the label.">
              <Input placeholder="Ana Popescu" />
            </FormField>
            <FormField label="Depot">
              <Select
                defaultValue="cluj"
                options={[
                  { value: 'cluj', label: 'Cluj depot' },
                  { value: 'arad', label: 'Arad depot' },
                  { value: 'sibiu', label: 'Sibiu depot' },
                ]}
              />
            </FormField>
            <Slider label="Parcel weight" value={weight} onValueChange={setWeight} max={20} formatValue={v => `${v} kg`} showValue />
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              <div className="flex items-center gap-3">
                <Checkbox id="preview-fragile" defaultChecked />
                <label htmlFor="preview-fragile">Fragile</label>
              </div>
              <div className="flex items-center gap-3">
                <Switch id="preview-notify" defaultChecked />
                <label htmlFor="preview-notify">Text me updates</label>
              </div>
            </div>
          </CardBody>
          <CardFooter>
            <Button size="sm" variant="ghost">
              Cancel
            </Button>
            <Button size="sm">Book pickup</Button>
          </CardFooter>
        </Card>
      </div>

      <Tabs defaultValue="shipments">
        <TabsList aria-label="Depot views">
          <TabsTrigger value="shipments">Shipments</TabsTrigger>
          <TabsTrigger value="capacity">Capacity</TabsTrigger>
          <TabsTrigger value="buttons">Buttons</TabsTrigger>
        </TabsList>
        <TabsContent value="shipments">
          <DataTable caption="Recent shipments" columns={COLUMNS} rows={SHIPMENTS} getRowId={s => s.ref} rowHeader="ref" defaultSort={{ key: 'ref', direction: 'ascending' }} />
        </TabsContent>
        <TabsContent value="capacity">
          <div className="flex max-w-md flex-col gap-4 py-2">
            <Progress label="Cluj depot" value={72} tone="signal" showValue />
            <Progress label="Arad depot" value={40} tone="ok" showValue />
            <Progress label="Sibiu depot" value={91} tone="warning" showValue />
          </div>
        </TabsContent>
        <TabsContent value="buttons">
          <div className="flex flex-wrap items-center gap-3 py-2">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Delete</Button>
            <Button variant="link">Link</Button>
          </div>
        </TabsContent>
      </Tabs>

      <div className="grid gap-4 md:grid-cols-2">
        <Alert tone="info" title="Two shipments arrive today">
          Cluj and Sibiu, both before noon.
        </Alert>
        <Alert tone="ok" title="All depots synced">
          The last sync finished two minutes ago.
        </Alert>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="signal" emphasis="solid">
          Live
        </Badge>
        <Badge tone="signal">Queued</Badge>
        <Badge tone="ok" dot>
          Healthy
        </Badge>
        <Badge tone="warning">Degraded</Badge>
        <Badge tone="hostile">Failed</Badge>
        <Tag>Priority</Tag>
        <Tag>Fragile</Tag>
      </div>
    </div>
  )
}
