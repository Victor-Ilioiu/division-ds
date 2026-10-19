import { createRef } from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { axeClean } from '../../../test/axe'
import { Breadcrumbs, collapseCrumbs } from './Breadcrumbs'

const TRAIL = [
  { label: 'Catalogue', href: '/catalogue' },
  { label: 'Optics', href: '/catalogue/optics' },
  { label: 'Holo sights', href: '/catalogue/optics/holo-sights' },
  { label: 'Prism holo sight' },
]

describe('collapseCrumbs', () => {
  it('returns the items unchanged without a limit or under it', () => {
    expect(collapseCrumbs(TRAIL)).toEqual(TRAIL)
    expect(collapseCrumbs(TRAIL, 4)).toEqual(TRAIL)
  })

  it('keeps the first item and the last maxItems - 1, with one gap', () => {
    expect(collapseCrumbs(TRAIL, 3)).toEqual([TRAIL[0], 'gap', TRAIL[2], TRAIL[3]])
  })

  it('never collapses below three', () => {
    expect(collapseCrumbs(TRAIL, 1)).toEqual([TRAIL[0], 'gap', TRAIL[2], TRAIL[3]])
  })
})

describe('Breadcrumbs', () => {
  it('is a named navigation landmark holding an ordered list', () => {
    render(<Breadcrumbs items={TRAIL} />)
    const nav = screen.getByRole('navigation', { name: 'Breadcrumb' })
    expect(within(nav).getByRole('list').tagName).toBe('OL')
    expect(within(nav).getAllByRole('listitem')).toHaveLength(4)
  })

  it('links every level but the last, which is the current page', () => {
    render(<Breadcrumbs items={TRAIL} />)
    expect(screen.getAllByRole('link')).toHaveLength(3)
    const current = screen.getByText('Prism holo sight')
    expect(current).toHaveAttribute('aria-current', 'page')
    expect(current.closest('a')).toBeNull()
  })

  it('hides the separators from assistive tech', () => {
    const { container } = render(<Breadcrumbs items={TRAIL} />)
    const separators = container.querySelectorAll('[data-separator]')
    expect(separators).toHaveLength(3)
    separators.forEach(s => expect(s).toHaveAttribute('aria-hidden', 'true'))
  })

  it('collapses the middle and says so to a screen reader', () => {
    render(<Breadcrumbs items={TRAIL} maxItems={3} />)
    expect(screen.queryByRole('link', { name: 'Optics' })).toBeNull()
    expect(screen.getByText('more levels')).toHaveClass('sr-only')
  })

  it('forwards a ref to the nav', () => {
    const ref = createRef<HTMLElement>()
    render(<Breadcrumbs ref={ref} items={TRAIL} />)
    expect(ref.current?.tagName).toBe('NAV')
  })

  it('draws each linked level through a custom renderLink, with the href and className passed through', () => {
    render(
      <Breadcrumbs
        items={TRAIL}
        renderLink={({ href, className, children }) => (
          <a data-testid="custom-link" href={href} className={className}>
            {children}
          </a>
        )}
      />
    )
    const links = screen.getAllByTestId('custom-link')
    expect(links.map(link => link.getAttribute('href'))).toEqual([
      '/catalogue',
      '/catalogue/optics',
      '/catalogue/optics/holo-sights',
    ])
    links.forEach(link => expect(link).toHaveClass('min-h-6', 'no-underline'))
    expect(screen.getByText('Prism holo sight').closest('[data-testid="custom-link"]')).toBeNull()
  })

  it('is axe clean, collapsed and not', async () => {
    const { container } = render(
      <>
        <Breadcrumbs items={TRAIL} />
        <Breadcrumbs items={TRAIL} maxItems={3} label="Breadcrumb, collapsed" />
      </>
    )
    expect(await axeClean(container)).toHaveNoViolations()
  })
})
