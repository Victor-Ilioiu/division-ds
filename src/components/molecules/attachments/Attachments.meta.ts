import type { ComponentMeta } from '../../docs/meta'

export const meta: ComponentMeta = {
  name: 'Attachments',
  title: 'Attachments',
  tier: 'molecules',
  slug: 'attachments',
  summary:
    "The files attached to one item: a grid of tiles, each with a preview for an image, the name as a link, the size and a Remove button, and a drop zone with a Choose files button. An image pasted while focus is in the component is added too. It never uploads anything itself: it hands you the files, and you pass back what is attached.",
  useWhen: 'Files attached to one record: screenshots on a ticket, a contract on a deal, receipts on an expense.',
  notFor: 'A file that is one field of a form with a Save (a profile photo): use a labelled file input in a FormField.',
  anatomy: [
    { part: 'List', description: 'A ul named by label, laid out as a grid of tiles at least 11rem wide.' },
    { part: 'Tile', description: 'A preview area on surface.sunken (the image, a file icon, or a Spinner while uploading), then the name, the size in the data font, and any error in accent.hostile.text.' },
    { part: 'Remove', description: 'A ghost icon button on each tile, named "Remove <file name>".' },
    { part: 'Drop zone', description: 'A dashed area with the Choose files button. Its border turns accent.signal.indicator while files are dragged over it.' },
    { part: 'Refusals', description: 'A polite live region under the zone that names each file it refused, and why: the wrong type, or too large.' },
  ],
  props: [
    { name: 'label', type: 'string', description: 'Required. Names the list and the drop zone: "Attachments".' },
    { name: 'files', type: 'readonly Attachment[]', description: "Required. { id, name, size, type?, href?, previewSrc?, status?, error? }. size is in bytes; status is 'uploading' or 'error'. An image type previews from previewSrc, or from href." },
    { name: 'onAdd', type: '(files: File[]) => void', description: 'Turns on the drop zone, Choose files and paste. Gets only the files that passed accept and maxSize. Upload them, and add them to files.' },
    { name: 'onRemove', type: '(id: string) => void', description: 'Turns on a Remove button on each file.' },
    { name: 'accept', type: 'string', description: 'The file types it takes, as the accept attribute: "image/*,.pdf". Also checked on dropped and pasted files.' },
    { name: 'maxSize', type: 'number', description: 'The largest file it takes, in bytes. A larger one is refused with a message.' },
    { name: 'dropLabel', type: 'string', default: "'Drop files here, paste an image, or'", description: 'The words in the drop zone, before the button.' },
    { name: 'browseLabel', type: 'string', default: "'Choose files'", description: "The button's words." },
    { name: 'emptyMessage', type: 'string', default: "'No attachments'", description: 'Shown when nothing is attached and nothing can be added (no onAdd).' },
    { name: 'renderLink', type: '(props: { href, className, children }) => ReactNode', default: 'an anchor that opens a new tab', description: "How a file's name links to it." },
    { name: 'className', type: 'string', description: 'Merged with the root classes. When Tailwind utility classes clash, the later one wins.' },
    { name: 'ref', type: 'Ref<HTMLDivElement>', description: 'The root div.' },
    { name: 'formatBytes()', type: '(bytes: number) => string', description: '1536 becomes "1.5 KB". Binary units, one decimal under 10.' },
    { name: 'acceptsFile()', type: '(file: { name, type }, accept?: string) => boolean', description: 'Whether a file matches an accept string: extensions, exact types and type/* wildcards.' },
  ],
  keyboard: [
    { keys: ['Tab'], does: "Moves through each file's link and Remove button, then Choose files." },
    { keys: ['Ctrl', 'V'], does: 'With focus in the component but not in a text field, adds the pasted images.' },
  ],
  dos: [
    "Show an upload in progress as a file with status 'uploading', so it has its place in the grid at once.",
    'Set maxSize to what your server takes, so a refusal happens before the upload.',
    'Say in the page what happens to attached files, if someone other than the person reads them (an agent, a reviewer).',
  ],
  donts: [
    "Don't use it for a single field in a form with a Save. That is a file input in a FormField.",
    "Don't remove a file without a way back if it was the only copy. Keep it until the person saves, or offer Undo in a Toast.",
  ],
}
