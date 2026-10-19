import { ComponentDocs } from '../../docs/ComponentDocs'
import { meta } from './Breadcrumbs.meta'
import { Example } from '../../docs/Example'
import { Breadcrumbs } from './Breadcrumbs'

const TRAIL = [
  { label: 'Catalogue', href: '/catalogue' },
  { label: 'Optics', href: '/catalogue/optics' },
  { label: 'Holo sights', href: '/catalogue/optics/holo-sights' },
  { label: 'Prism holo sight' },
]

const DEPOT_TRAIL = [
  { label: 'Depot', href: '/depot' },
  { label: 'Region: North', href: '/depot/north' },
  { label: 'Site: Fell Beck', href: '/depot/north/fell-beck' },
  { label: 'Building: Stores', href: '/depot/north/fell-beck/stores' },
  { label: 'Bay 4', href: '/depot/north/fell-beck/stores/bay-4' },
  { label: 'Crate 118' },
]

const MID_LEVEL_TRAIL = [
  { label: 'Catalogue', href: '/catalogue' },
  { label: 'Optics' },
  { label: 'Holo sights', href: '/catalogue/optics/holo-sights' },
]

export function BreadcrumbsDocs() {
  return (
    <ComponentDocs meta={meta}>
      <Example caption="Default">
        <Breadcrumbs items={TRAIL} label="Breadcrumb, default example" />
      </Example>

      <Example caption="Collapsed">
        <Breadcrumbs items={DEPOT_TRAIL} maxItems={3} label="Breadcrumb, collapsed" />
      </Example>

      <Example caption="A level that is not a page">
        <Breadcrumbs items={MID_LEVEL_TRAIL} label="Breadcrumb, mid-level example" />
      </Example>
    </ComponentDocs>
  )
}
