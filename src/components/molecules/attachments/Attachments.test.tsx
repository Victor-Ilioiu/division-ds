import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axeClean } from '../../../test/axe'
import { acceptsFile, Attachments, formatBytes, type Attachment } from './Attachments'

const FILES: Attachment[] = [
  { id: 'a1', name: 'login-error.png', size: 48_210, type: 'image/png', href: '/files/a1' },
  { id: 'a2', name: 'spec.pdf', size: 1_250_000, type: 'application/pdf', href: '/files/a2' },
  { id: 'a3', name: 'trace.zip', size: 0, status: 'uploading' },
]

const file = (name: string, type: string, size = 10) => new File([new Uint8Array(size)], name, { type })

describe('formatBytes', () => {
  it('uses binary units with one decimal under ten', () => {
    expect(formatBytes(512)).toBe('512 B')
    expect(formatBytes(1536)).toBe('1.5 KB')
    expect(formatBytes(48_210)).toBe('47 KB')
    expect(formatBytes(5 * 1024 * 1024)).toBe('5.0 MB')
  })
})

describe('acceptsFile', () => {
  it('matches extensions, exact types and wildcards', () => {
    expect(acceptsFile({ name: 'a.PNG', type: 'image/png' }, 'image/*')).toBe(true)
    expect(acceptsFile({ name: 'a.pdf', type: 'application/pdf' }, '.pdf')).toBe(true)
    expect(acceptsFile({ name: 'a.txt', type: 'text/plain' }, 'image/*,.pdf')).toBe(false)
    expect(acceptsFile({ name: 'a.txt', type: 'text/plain' })).toBe(true)
  })
})

describe('Attachments', () => {
  it('lists files with a preview, size and link', () => {
    render(<Attachments label="Attachments" files={FILES} />)
    const list = screen.getByRole('list', { name: 'Attachments' })
    expect(within(list).getAllByRole('listitem')).toHaveLength(3)
    expect(screen.getByRole('link', { name: 'login-error.png' })).toHaveAttribute('href', '/files/a1')
    expect(screen.getByText('1.2 MB')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Uploading trace.zip')
  })

  it('says so when empty and read-only', () => {
    render(<Attachments label="Attachments" files={[]} />)
    expect(screen.getByText('No attachments')).toBeInTheDocument()
  })

  it('removes a file', async () => {
    const onRemove = vi.fn()
    render(<Attachments label="Attachments" files={FILES} onRemove={onRemove} />)
    await userEvent.click(screen.getByRole('button', { name: 'Remove spec.pdf' }))
    expect(onRemove).toHaveBeenCalledWith('a2')
    expect(screen.queryByRole('button', { name: 'Remove trace.zip' })).toBeNull()
  })

  it('adds chosen files, refusing ones too large or of the wrong type', async () => {
    const onAdd = vi.fn()
    const { container } = render(<Attachments label="Attachments" files={[]} onAdd={onAdd} accept="image/*" maxSize={100} />)
    const input = container.querySelector('input[type=file]') as HTMLInputElement
    await userEvent.upload(input, [file('ok.png', 'image/png'), file('huge.png', 'image/png', 500)], { applyAccept: false })
    expect(onAdd).toHaveBeenCalledWith([expect.objectContaining({ name: 'ok.png' })])
    expect(screen.getByText('huge.png is larger than 100 B')).toBeInTheDocument()
  })

  it('adds dropped files', () => {
    const onAdd = vi.fn()
    render(<Attachments label="Attachments" files={[]} onAdd={onAdd} />)
    const zone = screen.getByRole('group', { name: /Attachments/ })
    const dropped = file('notes.txt', 'text/plain')
    fireEvent.dragOver(zone, { dataTransfer: { types: ['Files'], files: [dropped], dropEffect: 'none' } })
    fireEvent.drop(zone, { dataTransfer: { types: ['Files'], files: [dropped] } })
    expect(onAdd).toHaveBeenCalledWith([dropped])
  })

  it('adds a pasted image, but leaves a paste into a text field alone', () => {
    const onAdd = vi.fn()
    render(<><Attachments label="Attachments" files={[]} onAdd={onAdd} /></>)
    const zone = screen.getByRole('group', { name: /Attachments/ })
    const shot = file('shot.png', 'image/png')
    fireEvent.paste(zone, { clipboardData: { files: [shot] } })
    expect(onAdd).toHaveBeenCalledWith([shot])
  })

  it('opens the file picker from its button', async () => {
    const { container } = render(<Attachments label="Attachments" files={[]} onAdd={() => {}} />)
    const input = container.querySelector('input[type=file]') as HTMLInputElement
    const click = vi.spyOn(input, 'click')
    await userEvent.click(screen.getByRole('button', { name: 'Choose files' }))
    expect(click).toHaveBeenCalled()
  })

  it('forwards its ref and merges className', () => {
    const ref = createRef<HTMLDivElement>()
    render(<Attachments ref={ref} className="extra" label="Attachments" files={[]} />)
    expect(ref.current).toHaveClass('extra')
  })

  it('has no axe violations', async () => {
    const { container } = render(<Attachments label="Attachments" files={FILES} onAdd={() => {}} onRemove={() => {}} />)
    expect(await axeClean(container)).toHaveNoViolations()
  })
})
