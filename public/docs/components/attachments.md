# Attachments

> The files attached to one item: a grid of tiles, each with a preview for an image, the name as a link, the size and a Remove button, and a drop zone with a Choose files button. An image pasted while focus is in the component is added too. It never uploads anything itself: it hands you the files, and you pass back what is attached.

- **Best for:** Files attached to one record: screenshots on a ticket, a contract on a deal, receipts on an expense.
- **Not for:** A file that is one field of a form with a Save (a profile photo): use a labelled file input in a FormField.
- Molecule. Source: `src/components/molecules/attachments/Attachments.tsx`
- Rendered docs page: `/components/attachments`

## Import

```tsx
import { acceptsFile, Attachments, formatBytes } from 'src/components/molecules/attachments/Attachments'
```

Paths are from the Division DS repository root. Installed with shadcn they start `src/division-ds/` instead of `src/` (`src/division-ds/components/...`); import them relative to your file. An install has no index barrels: import each component from its own file, never from `components/molecules`.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `label` | `string` |  | Required. Names the list and the drop zone: "Attachments". |
| `files` | `readonly Attachment[]` |  | Required. { id, name, size, type?, href?, previewSrc?, status?, error? }. size is in bytes; status is 'uploading' or 'error'. An image type previews from previewSrc, or from href. |
| `onAdd` | `(files: File[]) => void` |  | Turns on the drop zone, Choose files and paste. Gets only the files that passed accept and maxSize. Upload them, and add them to files. |
| `onRemove` | `(id: string) => void` |  | Turns on a Remove button on each file. |
| `accept` | `string` |  | The file types it takes, as the accept attribute: "image/*,.pdf". Also checked on dropped and pasted files. |
| `maxSize` | `number` |  | The largest file it takes, in bytes. A larger one is refused with a message. |
| `dropLabel` | `string` | `'Drop files here, paste an image, or'` | The words in the drop zone, before the button. |
| `browseLabel` | `string` | `'Choose files'` | The button's words. |
| `emptyMessage` | `string` | `'No attachments'` | Shown when nothing is attached and nothing can be added (no onAdd). |
| `renderLink` | `(props: { href, className, children }) => ReactNode` | `an anchor that opens a new tab` | How a file's name links to it. |
| `className` | `string` |  | Merged with the root classes. When Tailwind utility classes clash, the later one wins. |
| `ref` | `Ref<HTMLDivElement>` |  | The root div. |
| `formatBytes()` | `(bytes: number) => string` |  | 1536 becomes "1.5 KB". Binary units, one decimal under 10. |
| `acceptsFile()` | `(file: { name, type }, accept?: string) => boolean` |  | Whether a file matches an accept string: extensions, exact types and type/* wildcards. |

## Types and helpers

Exported beside the component, from the same file. Import a type with `import type { ... }`.

```ts
/**
 * Files attached to one item: a drop zone with a Choose files button, and the list of what is
 * attached, each with a preview for images, its size, a link to open it and a Remove button.
 * Images pasted while focus is inside the component are added too, so a screenshot goes straight
 * from the clipboard onto a ticket.
 *
 * Controlled: the component never uploads. onAdd gets the File objects; the parent uploads them and
 * passes the results back in `files` (with `status: 'uploading'` while that runs).
 *
 * Contrast: the zone is surface.base with a dashed hairline.strong border, accent.signal.indicator
 * while a file is dragged over it (the board's drop colour). Names are "text.primary on
 * surface.base", sizes and the zone's text "text.secondary on surface.base", an error line
 * "accent.hostile.text on surface.base". A preview tile is surface.sunken behind the image.
 */

export type Attachment = {
  id: string
  name: string
  /** In bytes. */
  size: number
  /** The MIME type. Images get a preview. */
  type?: string
  /** Where the file opens. Without it the name is plain text. */
  href?: string
  /** An image URL for the preview. Defaults to href for an image type. */
  previewSrc?: string
  status?: 'uploading' | 'error'
  /** Why it failed, shown under the name with status 'error'. */
  error?: string
}
```

```ts
/** 1536 -> "1.5 KB". Binary units, one decimal under 10. */
export function formatBytes(bytes: number): string
```

```ts
/** Whether a file matches an accept string: extensions, exact types and type/* wildcards. */
export function acceptsFile(file: { name: string; type: string }, accept?: string): boolean
```

## Examples

Each is compiled and rendered on the docs page. Imports are omitted; see above.

### Add by dropping, choosing or pasting; remove from the tile

```tsx
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

<LiveAttachmentsExample />
```

### Uploading, failed and read-only

```tsx
<Attachments
  className="max-w-2xl"
  label="Attachments on R-1042"
  files={[
    { id: 'u1', name: 'depot-count.csv', size: 0, status: 'uploading' },
    { id: 'u2', name: 'shelf-photo.heic', size: 3_400_000, status: 'error', error: 'This type cannot be previewed or opened here.' },
  ]}
/>
```

## Keyboard

| Keys | Result |
|---|---|
| `Tab` | Moves through each file's link and Remove button, then Choose files. |
| `Ctrl` `V` | With focus in the component but not in a text field, adds the pasted images. |

## Do

- Show an upload in progress as a file with status 'uploading', so it has its place in the grid at once.
- Set maxSize to what your server takes, so a refusal happens before the upload.
- Say in the page what happens to attached files, if someone other than the person reads them (an agent, a reviewer).

## Don't

- Don't use it for a single field in a form with a Save. That is a file input in a FormField.
- Don't remove a file without a way back if it was the only copy. Keep it until the person saves, or offer Undo in a Toast.

## Anatomy

- **List**: A ul named by label, laid out as a grid of tiles at least 11rem wide.
- **Tile**: A preview area on surface.sunken (the image, a file icon, or a Spinner while uploading), then the name, the size in the data font, and any error in accent.hostile.text.
- **Remove**: A ghost icon button on each tile, named "Remove <file name>".
- **Drop zone**: A dashed area with the Choose files button. Its border turns accent.signal.indicator while files are dragged over it.
- **Refusals**: A polite live region under the zone that names each file it refused, and why: the wrong type, or too large.
