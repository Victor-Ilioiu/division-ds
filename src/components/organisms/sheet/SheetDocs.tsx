import { ComponentDocs } from '../../docs/ComponentDocs'
import { meta } from './Sheet.meta'
import { Example } from '../../docs/Example'
import { Button, Checkbox } from '../../atoms'
import { useToast } from '../../molecules'
import { Sheet, SheetClose, SheetContent, SheetTrigger } from './Sheet'

function FiltersOnTheRightExample() {
  const { toast } = useToast()
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="secondary">Filter depots</Button>
      </SheetTrigger>
      <SheetContent title="Filters" description="Narrow the depot list.">
        <fieldset className="flex flex-col gap-3">
          <legend className="font-mono text-xs uppercase tracking-[0.12em] text-[var(--color-text-label)] mb-2">
            Region
          </legend>
          <label className="flex items-center gap-2 min-h-6">
            <Checkbox /> North
          </label>
          <label className="flex items-center gap-2 min-h-6">
            <Checkbox /> South
          </label>
          <label className="flex items-center gap-2 min-h-6">
            <Checkbox /> East
          </label>
          <label className="flex items-center gap-2 min-h-6">
            <Checkbox /> West
          </label>
        </fieldset>
        <div className="flex flex-wrap gap-3 mt-6">
          <Button
            variant="secondary"
            onClick={() =>
              toast({
                title: 'Filters saved',
                description: 'New depot lists open with these regions.',
                tone: 'ok',
              })
            }
          >
            Save as default
          </Button>
          <SheetClose asChild>
            <Button>Apply</Button>
          </SheetClose>
        </div>
      </SheetContent>
    </Sheet>
  )
}

const DEPOTS = ['Brasov north', 'Brasov south', 'Sibiu', 'Cluj', 'Timisoara', 'Oradea']

function FromTheLeftExample() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="secondary">Open depot list</Button>
      </SheetTrigger>
      <SheetContent side="left" title="Depots">
        <ul role="list" className="flex flex-col gap-2">
          {DEPOTS.map(depot => (
            <li key={depot}>{depot}</li>
          ))}
        </ul>
      </SheetContent>
    </Sheet>
  )
}

export function SheetDocs() {
  return (
    <ComponentDocs meta={meta}>
      <Example caption="Filters on the right">
        <FiltersOnTheRightExample />
      </Example>

      <Example caption="From the left">
        <FromTheLeftExample />
      </Example>
    </ComponentDocs>
  )
}
