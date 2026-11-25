import { useState } from 'react'
import { ComponentDocs } from '../../docs/ComponentDocs'
import { Example } from '../../docs/Example'
import { meta } from './Attachments.meta'
import { Attachments, type Attachment } from './Attachments'

const START: Attachment[] = [
  { id: 'a1', name: 'gate-2-error.pdf', size: 184_320, type: 'application/pdf' },
  { id: 'a2', name: 'firmware-notes.txt', size: 2_140, type: 'text/plain' },
]

function LiveAttachmentsExample() {
  const [files, setFiles] = useState(START)
  return (
    <Attachments
      className="max-w-2xl"
      label="Attachments"
      files={files}
      maxSize={10 * 1024 * 1024}
      onAdd={added => setFiles(current => [
        ...current,
        ...added.map(file => ({
          id: `${file.name}-${file.lastModified}`,
          name: file.name,
          size: file.size,
          type: file.type,
          href: URL.createObjectURL(file),
        })),
      ])}
      onRemove={id => setFiles(current => current.filter(file => file.id !== id))}
    />
  )
}

export function AttachmentsDocs() {
  return (
    <ComponentDocs meta={meta}>
      <Example caption="Add by dropping, choosing or pasting; remove from the tile">
        <LiveAttachmentsExample />
      </Example>
      <Example caption="Uploading, failed and read-only">
        <Attachments
          className="max-w-2xl"
          label="Attachments on R-1042"
          files={[
            { id: 'u1', name: 'depot-count.csv', size: 0, status: 'uploading' },
            { id: 'u2', name: 'shelf-photo.heic', size: 3_400_000, status: 'error', error: 'This type cannot be previewed or opened here.' },
          ]}
        />
      </Example>
    </ComponentDocs>
  )
}
