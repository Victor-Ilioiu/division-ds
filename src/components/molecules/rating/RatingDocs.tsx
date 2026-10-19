import { useState } from 'react'
import { ComponentDocs } from '../../docs/ComponentDocs'
import { meta } from './Rating.meta'
import { Example } from '../../docs/Example'
import { Rating, RatingInput } from './Rating'

function LiveInput() {
  const [value, setValue] = useState(4)
  return (
    <div className="flex items-center gap-3">
      <RatingInput label="Rate the Prism holo sight" value={value} onValueChange={setValue} />
      <span className="font-mono text-xs text-[var(--color-text-secondary)]">
        You rated it {value} {value === 1 ? 'star' : 'stars'}
      </span>
    </div>
  )
}

export function RatingDocs() {
  return (
    <ComponentDocs meta={meta}>
      <Example caption="Display">
        <div className="flex flex-col gap-3">
          <Rating value={4.5} label="Prism holo sight" showValue />
          <Rating value={3} label="Bump helmet" showValue />
          <Rating value={5} label="Field goggles" showValue />
          <Rating value={0.5} label="Dummy radio" showValue />
        </div>
      </Example>

      <Example caption="Small, beside a price">
        <div className="flex items-center gap-2">
          <span className="font-display font-semibold">€128</span>
          <Rating value={4} size="sm" label="Prism holo sight" />
        </div>
      </Example>

      <Example caption="Input">
        <LiveInput />
      </Example>
    </ComponentDocs>
  )
}
