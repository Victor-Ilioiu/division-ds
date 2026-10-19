import { ComponentDocs } from '../../docs/ComponentDocs'
import { meta } from './Avatar.meta'
import { Example } from '../../docs/Example'
import { Avatar } from './Avatar'

/** Two token-coloured blocks, not a photograph — nothing here should imply a real person's
 *  likeness. Built as an inline SVG data URI so the docs page ships no binary asset. */
const DEMO_IMAGE =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64">' +
      '<rect width="64" height="32" fill="#7c9c6b"/>' + // token-discipline: allow, pixels of a sample photo, not interface colour
      '<rect y="32" width="64" height="32" fill="#3f5a49"/>' +
      '</svg>'
  )

const FIELD_TEAM = [
  { name: 'Dana Iverson', role: 'Route Lead' },
  { name: 'Ravi Okonkwo', role: 'Comms' },
  { name: 'Mei Tanaka', role: 'Medic' },
  { name: 'Sana Idrissi', role: 'Logistics' },
]

const STATUS_TEAM = [
  { name: 'Ilse Varga', status: 'online' },
  { name: 'Ravi Okonkwo', status: 'away' },
  { name: 'Mei Tanaka', status: 'busy' },
  { name: 'Sana Idrissi', status: 'offline' },
] as const

export function AvatarDocs() {
  return (
    <ComponentDocs meta={meta}>
      <Example caption="Sizes">
        <Avatar name="Dana Iverson" size="sm" />
        <Avatar name="Dana Iverson" size="md" />
        <Avatar name="Dana Iverson" size="lg" />
      </Example>

      <Example caption="With an image">
        <Avatar name="Dana Iverson" src={DEMO_IMAGE} size="lg" />
      </Example>

      <Example caption="Fallback initials">
        <Avatar name="Dana Iverson" size="lg" />
        <Avatar name="Ravi Okonkwo" size="lg" />
        <Avatar name="Lin" size="lg" />
      </Example>

      <Example caption="Status: the dot is decoration, and the status word is part of the avatar's name">
        <div className="flex flex-col gap-3">
          {STATUS_TEAM.map(member => (
            <div key={member.name} className="flex items-center gap-3">
              <Avatar name={member.name} status={member.status} size="md" />
              <div>
                <p className="text-sm">{member.name}</p>
                {/* Shown as text too, so a sighted user never has to decode the colour. Hidden
                    from assistive tech, which already heard it in the avatar's name. */}
                <p aria-hidden="true" className="text-sm text-[var(--color-text-secondary)] capitalize">
                  {member.status}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Example>

      <Example caption="A row">
        <div className="flex flex-col gap-3">
          {FIELD_TEAM.map(member => (
            <div key={member.name} className="flex items-center gap-3">
              <Avatar name={member.name} size="md" />
              <div>
                <p className="text-sm">{member.name}</p>
                <p className="text-xs text-[var(--color-text-muted)]">{member.role}</p>
              </div>
            </div>
          ))}
        </div>
      </Example>
    </ComponentDocs>
  )
}
