import { X, Search, Settings, Trash2, ChevronRight, ShoppingCart, Bell } from 'lucide-react'
import { ComponentDocs } from '../../docs/ComponentDocs'
import { meta } from './IconButton.meta'
import { Example } from '../../docs/Example'
import { IconButton } from './IconButton'

export function IconButtonDocs() {
  return (
    <ComponentDocs meta={meta}>
      <Example caption="Variants">
        <IconButton label="Dismiss" variant="primary"><X aria-hidden="true" /></IconButton>
        <IconButton label="Save" variant="secondary"><Settings aria-hidden="true" /></IconButton>
        <IconButton label="Delete" variant="danger"><Trash2 aria-hidden="true" /></IconButton>
        <IconButton label="Search" variant="ghost"><Search aria-hidden="true" /></IconButton>
      </Example>

      <Example caption="Sizes">
        <IconButton label="Dismiss" size="sm"><X aria-hidden="true" /></IconButton>
        <IconButton label="Dismiss" size="md"><X aria-hidden="true" /></IconButton>
        <IconButton label="Dismiss" size="lg"><X aria-hidden="true" /></IconButton>
      </Example>

      <Example caption="In context">
        <div className="flex items-center justify-between w-full max-w-sm">
          <p className="font-display text-sm font-semibold uppercase tracking-wide">
            Field kit checklist
          </p>
          <IconButton label="Dismiss panel" variant="ghost" size="sm">
            <X aria-hidden="true" />
          </IconButton>
        </div>
      </Example>

      <Example caption="With a count">
        <div className="flex flex-wrap items-center gap-6">
          <IconButton label="Cart" variant="secondary" count={3} countLabel={n => `${n} replicas`}>
            <ShoppingCart aria-hidden="true" />
          </IconButton>
          <IconButton label="Notifications" variant="ghost" count={128} countLabel={n => `${n} unread`}>
            <Bell aria-hidden="true" />
          </IconButton>
          <IconButton label="Notifications" variant="primary" count={7} countLabel={n => `${n} unread`}>
            <Bell aria-hidden="true" />
          </IconButton>
          <IconButton label="Cart" variant="secondary" count={0} showZero>
            <ShoppingCart aria-hidden="true" />
          </IconButton>
        </div>
      </Example>

      <Example caption="Disabled">
        <IconButton label="Next step" disabled>
          <ChevronRight aria-hidden="true" />
        </IconButton>
      </Example>
    </ComponentDocs>
  )
}
