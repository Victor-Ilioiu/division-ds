import { ComponentDocs } from '../../docs/ComponentDocs'
import { meta } from './AvatarGroup.meta'
import { Example } from '../../docs/Example'
import { AvatarGroup, type AvatarGroupPerson } from './AvatarGroup'

const ALPHA: AvatarGroupPerson[] = [
  { name: 'Ilse Varga', status: 'online' },
  { name: 'Ravi Okonkwo', status: 'away' },
  { name: 'Mei Tanaka', status: 'busy' },
  { name: 'Sana Idrissi', status: 'online' },
  { name: 'Dana Iverson', status: 'offline' },
  { name: 'Lin Moreau', status: 'online' },
  { name: 'Tomas Reyes', status: 'offline' },
]

const BRAVO: AvatarGroupPerson[] = [{ name: 'Noor Haddad' }, { name: 'Kai Lindqvist' }, { name: 'Ada Brennan' }]

export function AvatarGroupDocs() {
  return (
    <ComponentDocs meta={meta}>
      <Example caption="Sizes: four people shown, and the rest counted in a small chip">
        <div className="flex flex-col gap-4">
          <AvatarGroup people={ALPHA} size="sm" label="Alpha squad" />
          <AvatarGroup people={ALPHA} size="md" label="Alpha squad" />
          <AvatarGroup people={ALPHA} size="lg" label="Alpha squad" />
        </div>
      </Example>

      <Example caption="Everyone fits: no chip">
        <AvatarGroup people={BRAVO} label="Bravo squad" />
      </Example>

      <Example caption="The hidden names in a tooltip (press Tab to reach the chip)">
        <AvatarGroup people={ALPHA} max={3} label="Alpha squad" overflowTooltip />
      </Example>

      <Example caption="In a row, beside the words it summarises">
        <div className="flex items-center gap-3">
          <AvatarGroup people={ALPHA} max={3} size="sm" label="Watching this replica" />
          <p className="text-sm text-[var(--color-text-secondary)]">7 people are watching this replica</p>
        </div>
      </Example>
    </ComponentDocs>
  )
}
