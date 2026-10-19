import { ComponentDocs } from '../../docs/ComponentDocs'
import { meta } from './Skeleton.meta'
import { Example } from '../../docs/Example'
import { Card, CardBody } from '../../molecules/card/Card'
import { Skeleton, SkeletonGroup } from './Skeleton'

export function SkeletonDocs() {
  return (
    <ComponentDocs meta={meta}>
      <Example caption="Shapes: text lines, a block, the Avatar footprints">
        <div className="flex w-full flex-col gap-6">
          <Skeleton shape="text" lines={3} className="max-w-md" />
          <Skeleton shape="block" className="h-24 w-full max-w-md" />
          <div className="flex items-center gap-3">
            <Skeleton shape="avatar" size="sm" />
            <Skeleton shape="avatar" size="md" />
            <Skeleton shape="avatar" size="lg" />
          </div>
        </div>
      </Example>

      <Example caption="A card loading: image, title, two lines of copy">
        <SkeletonGroup label="Loading replicas" className="grid w-full max-w-md gap-4 sm:grid-cols-2">
          {[0, 1].map(i => (
            <Card key={i}>
              <CardBody className="flex flex-col gap-4">
                <Skeleton shape="block" className="aspect-[4/3] w-full" />
                <Skeleton shape="text" className="w-2/3" />
                <Skeleton shape="text" lines={2} />
              </CardBody>
            </Card>
          ))}
        </SkeletonGroup>
      </Example>

      <Example caption="Table rows loading">
        <SkeletonGroup label="Loading orders" className="w-full max-w-xl">
          <div className="flex flex-col divide-y divide-[var(--color-border-hairline)]">
            {[0, 1, 2].map(i => (
              <div key={i} className="grid grid-cols-[1fr_2fr_1fr] items-center gap-4 py-3">
                <Skeleton shape="text" />
                <Skeleton shape="text" className="w-4/5" />
                <Skeleton shape="text" className="w-1/2 justify-self-end" />
              </div>
            ))}
          </div>
        </SkeletonGroup>
      </Example>

      <Example caption="A profile row loading">
        <SkeletonGroup label="Loading the squad roster" className="flex w-full max-w-sm items-center gap-3">
          <Skeleton shape="avatar" size="md" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton shape="text" className="w-1/2" />
            <Skeleton shape="text" className="w-1/3" />
          </div>
        </SkeletonGroup>
      </Example>
    </ComponentDocs>
  )
}
