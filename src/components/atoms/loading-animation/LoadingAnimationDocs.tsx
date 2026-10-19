import { ComponentDocs } from '../../docs/ComponentDocs'
import { meta } from './LoadingAnimation.meta'
import { Example } from '../../docs/Example'
import { LoadingAnimation } from './LoadingAnimation'

export function LoadingAnimationDocs() {
  return (
    <ComponentDocs meta={meta}>
      <Example caption="Three dials, md">
        <LoadingAnimation variant="aperture" label="Loading field kits" />
        <LoadingAnimation variant="gyro" label="Syncing manifest" />
        <LoadingAnimation variant="reticle" label="Acquiring position" />
      </Example>

      <Example caption="Aperture, three sizes">
        <LoadingAnimation variant="aperture" size="sm" label="Loading field kits" />
        <LoadingAnimation variant="aperture" size="md" label="Loading field kits" />
        <LoadingAnimation variant="aperture" size="lg" label="Loading field kits" />
      </Example>
    </ComponentDocs>
  )
}
