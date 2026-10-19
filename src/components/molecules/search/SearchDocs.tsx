import { useState } from 'react'
import { ComponentDocs } from '../../docs/ComponentDocs'
import { meta } from './Search.meta'
import { Example } from '../../docs/Example'
import { Search } from './Search'

/** A live example: prints what was searched for under the field on Enter, so the "submits on
 *  Enter, not on every keystroke" behaviour is visible rather than asserted. */
function SubmittingExample() {
  const [result, setResult] = useState<string | null>(null)

  return (
    <div className="max-w-xs w-full">
      <Search label="Search the depot list" onSearch={query => setResult(query)} />
      <p className="font-body text-xs text-[var(--color-text-secondary)] mt-3">
        {result ? `Searched for: ${result}` : 'Press Enter to search.'}
      </p>
    </div>
  )
}

export function SearchDocs() {
  return (
    <ComponentDocs meta={meta}>
      <Example caption="Default">
        <div className="max-w-xs w-full">
          <Search label="Search the catalogue" />
        </div>
      </Example>

      <Example caption="With a shortcut">
        <div className="max-w-xs w-full">
          <Search label="Search the manifest" shortcut="/" />
          <p className="font-body text-xs text-[var(--color-text-secondary)] mt-3">
            Press / anywhere on this page to focus it.
          </p>
        </div>
      </Example>

      <Example caption="Submitting">
        <SubmittingExample />
      </Example>

      <Example caption="Sizes" className="flex-col items-start gap-4">
        <div className="max-w-xs w-full">
          <Search label="Search, small" placeholder="Small" inputSize="sm" />
        </div>
        <div className="max-w-xs w-full">
          <Search label="Search, medium" placeholder="Medium" inputSize="md" />
        </div>
        <div className="max-w-xs w-full">
          <Search label="Search, large" placeholder="Large" inputSize="lg" />
        </div>
      </Example>
    </ComponentDocs>
  )
}
