import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axeClean } from '../../test/axe'
import { ComponentDocs } from './ComponentDocs'
import { Example } from './Example'
import type { ComponentMeta } from './meta'

const meta: ComponentMeta = {
  name: 'Thing',
  title: 'Thing',
  tier: 'atoms',
  slug: 'thing',
  summary: 'A thing.',
  useWhen: 'Naming a thing.',
  notFor: 'Several things: use Things.',
  requires: ['One provider at the root.'],
  pitfalls: [
    { wrong: '<Thing />', right: '<Thing label="Go" />', why: 'It needs a name.' },
    { wrong: '<Thing a />', right: '<Thing b />', why: 'Use b.' },
  ],
  anatomy: [{ part: 'Box', description: 'The box.' }],
  props: [{ name: 'label', type: 'string', description: 'Its name.' }],
  keyboard: [],
  dos: ['Name it.'],
  donts: ['Leave it bare.'],
}

describe('Example', () => {
  it('shows no code panel without a source', () => {
    render(<Example caption="Plain">content</Example>)
    expect(screen.queryByText('Code')).not.toBeInTheDocument()
  })

  it('shows the source it is given, in a named region, behind a disclosure', () => {
    render(
      <Example caption="Plain" source={'<Thing label="Go" />'}>
        content
      </Example>
    )
    expect(screen.getByText('Code').closest('details')).not.toHaveAttribute('open')
    expect(screen.getByRole('region', { name: 'Plain, source', hidden: true })).toHaveTextContent('<Thing label="Go" />')
  })

  it('copies the source and says so', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    const user = userEvent.setup()
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    render(
      <Example caption="Plain" source="<Thing />">
        content
      </Example>
    )
    await user.click(screen.getByText('Code'))
    await user.click(screen.getByRole('button', { name: 'Copy', hidden: true }))
    expect(writeText).toHaveBeenCalledWith('<Thing />')
    expect(await screen.findByText('Copied')).toBeInTheDocument()
  })
})

describe('ComponentDocs, from metadata', () => {
  const page = () =>
    render(
      <ComponentDocs meta={meta}>
        <Example caption="Plain">content</Example>
      </ComponentDocs>
    )

  it('links its markdown twin', () => {
    page()
    expect(screen.getByRole('link', { name: 'This page as Markdown'})).toHaveAttribute('href', '/docs/components/thing.md')
    expect(document.head.querySelector('link[rel="alternate"][type="text/markdown"]')).toHaveAttribute(
      'href',
      '/docs/components/thing.md'
    )
  })

  it('says what it is best for and not for, under the summary', () => {
    page()
    const best = screen.getByText('Naming a thing.')
    expect(best.tagName).toBe('DD')
    expect(best.previousElementSibling).toHaveTextContent('Best for')
    const not = screen.getByText('Several things: use Things.')
    expect(not.previousElementSibling).toHaveTextContent('Not for')
    expect(best.compareDocumentPosition(screen.getByRole('heading', { level: 1 }))).toBe(Node.DOCUMENT_POSITION_PRECEDING)
  })

  it('states what the component requires', () => {
    page()
    expect(screen.getByRole('heading', { name: 'Requires' })).toBeInTheDocument()
    expect(screen.getByText('One provider at the root.')).toBeInTheDocument()
  })

  it('shows each mistake as wrong beside right, each region named once', () => {
    page()
    expect(screen.getByRole('region', { name: 'Mistake 1, wrong' })).toHaveTextContent('<Thing />')
    expect(screen.getByRole('region', { name: 'Mistake 1, right' })).toHaveTextContent('<Thing label="Go" />')
    expect(screen.getByRole('region', { name: 'Mistake 2, right' })).toHaveTextContent('<Thing b />')
    expect(screen.getByText('It needs a name.')).toBeInTheDocument()
  })

  it('is axe clean', async () => {
    const { container } = page()
    expect(await axeClean(container)).toHaveNoViolations()
  })
})
