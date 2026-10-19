import { useState } from 'react'
import { Copy, CopyPlus, Download, FolderInput, MoreHorizontal } from 'lucide-react'
import { ComponentDocs } from '../../docs/ComponentDocs'
import { meta } from './DropdownMenu.meta'
import { Example } from '../../docs/Example'
import { Button, IconButton } from '../../atoms'
import { docsProse } from '../../docs/PageChrome'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from './DropdownMenu'

/** The live line under the menu proves `onSelect` and `onCheckedChange` actually run, rather
 *  than just rendering a menu that looks wired up. */
function ActionsExample() {
  const [lastAction, setLastAction] = useState('No action yet.')
  const [pinned, setPinned] = useState(false)

  return (
    <div className="flex flex-col items-start gap-3">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary">Manifest actions</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuLabel>Manifest</DropdownMenuLabel>
          <DropdownMenuItem shortcut="D" onSelect={() => setLastAction('Duplicated.')}>
            Duplicate
          </DropdownMenuItem>
          <DropdownMenuCheckboxItem
            checked={pinned}
            onCheckedChange={checked => {
              setPinned(checked)
              setLastAction(checked ? 'Pinned to top.' : 'Unpinned.')
            }}
          >
            Pin to top
          </DropdownMenuCheckboxItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem tone="hostile" onSelect={() => setLastAction('Archived.')}>
            Archive
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <p className={docsProse}>{lastAction}</p>
    </div>
  )
}

function IconsAndShortcutsExample() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary">Depot manifest</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem icon={<Copy />} shortcut="⌘C">
          Copy
        </DropdownMenuItem>
        <DropdownMenuItem icon={<CopyPlus />} shortcut="⌘D">
          Duplicate
        </DropdownMenuItem>
        <DropdownMenuItem icon={<Download />} shortcut="⌘E">
          Export
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function IconButtonTriggerExample() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <IconButton label="Depot actions" variant="secondary">
          <MoreHorizontal aria-hidden="true" />
        </IconButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem>View manifest</DropdownMenuItem>
        <DropdownMenuItem>Reassign</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem tone="hostile">Decommission</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** A radio group that sets the sort order the line below reports, and a one-level submenu. */
function RadioAndSubmenuExample() {
  const [sort, setSort] = useState('newest')
  const [moved, setMoved] = useState('Not moved.')

  return (
    <div className="flex flex-col items-start gap-3">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary">Replica options</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuLabel>Sort by</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={sort} onValueChange={setSort}>
            <DropdownMenuRadioItem value="newest">Newest</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="price">Price</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="weight">Weight</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator />
          <DropdownMenuSub>
            <DropdownMenuSubTrigger icon={<FolderInput />}>Move to</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem onSelect={() => setMoved('Moved to the armoury.')}>Armoury</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setMoved('Moved to the workshop.')}>Workshop</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setMoved('Moved to the depot.')}>Depot</DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>
      <p className={docsProse}>
        Sorted by {sort}. {moved}
      </p>
    </div>
  )
}

export function DropdownMenuDocs() {
  return (
    <ComponentDocs meta={meta}>
      <Example caption="Actions">
        <ActionsExample />
      </Example>

      <Example caption="With icons and shortcuts">
        <IconsAndShortcutsExample />
      </Example>

      <Example caption="Radio items and a submenu">
        <RadioAndSubmenuExample />
      </Example>

      <Example caption="From an icon button">
        <IconButtonTriggerExample />
      </Example>
    </ComponentDocs>
  )
}
