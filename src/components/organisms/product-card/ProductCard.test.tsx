import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axeClean } from '../../../test/axe'
import { ProductCard, ProductGrid, type Product } from './ProductCard'

const KESTREL_K: Product = {
  id: 'kestrel-k',
  name: 'Kestrel K compact replica',
  href: '#kestrel-k',
  price: 12900,
  compareAtPrice: 14900,
  rating: { value: 4.5, count: 128 },
  badge: 'Sale',
}
const KESTREL_L: Product = { id: 'kestrel-l', name: 'Kestrel L rifle replica', href: '#kestrel-l', price: 15900, soldOut: true }

describe('ProductCard', () => {
  it('is an article named by the product, whose name links to it', () => {
    render(<ProductCard product={KESTREL_K} />)
    const card = screen.getByRole('article', { name: 'Kestrel K compact replica' })
    expect(within(card).getByRole('link', { name: 'Kestrel K compact replica' })).toHaveAttribute('href', '#kestrel-k')
  })

  it('reads a sale price as a sentence, the old price struck through', () => {
    render(<ProductCard product={KESTREL_K} />)
    const price = screen.getByText('€129.00', { exact: false })
    expect(price).toHaveTextContent('Price: €129.00 was €149.00')
    expect(screen.getByText('€149.00', { exact: false }).closest('s')).not.toBeNull()
  })

  // Mutation: render the Badge inside CardBody again -> it is no longer in the media block, and a
  // badged card's name sits a line lower than an unbadged neighbour's.
  it('draws the badge over the picture, out of the text flow, and ahead of the name in the DOM', () => {
    const { container } = render(<ProductCard product={KESTREL_K} />)
    const badge = screen.getByText('Sale')
    const media = container.querySelector('[data-product-media]')!
    expect(media).toContainElement(badge)
    expect(badge).toHaveClass('absolute')
    const name = screen.getByRole('link', { name: 'Kestrel K compact replica' })
    expect(badge.compareDocumentPosition(name) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('shows the rating as a named image and the review count as text', () => {
    render(<ProductCard product={KESTREL_K} />)
    expect(screen.getByRole('img', { name: 'Kestrel K compact replica rated 4.5 out of 5' })).toBeInTheDocument()
    expect(screen.getByText('128 reviews')).toBeInTheDocument()
  })

  it('adds to the cart from a button named after the product, visible text first', async () => {
    const onAddToCart = vi.fn()
    render(<ProductCard product={KESTREL_K} onAddToCart={onAddToCart} />)
    await userEvent.click(screen.getByRole('button', { name: 'Add to cart: Kestrel K compact replica' }))
    expect(onAddToCart).toHaveBeenCalledWith(KESTREL_K)
  })

  it('shows sold out as a disabled button and never adds', async () => {
    const onAddToCart = vi.fn()
    render(<ProductCard product={KESTREL_L} onAddToCart={onAddToCart} />)
    expect(screen.getByRole('button', { name: 'Sold out' })).toBeDisabled()
    expect(screen.queryByRole('button', { name: /^Add to cart/ })).toBeNull()
  })

  it('draws a decorative placeholder without an image, and an empty alt with one', () => {
    const { rerender, container } = render(<ProductCard product={KESTREL_L} />)
    expect(container.querySelector('[aria-hidden="true"] svg')).not.toBeNull()
    rerender(<ProductCard product={{ ...KESTREL_L, image: { src: '/kestrel-l.webp' } }} />)
    expect(container.querySelector('[aria-hidden="true"] svg'), 'the placeholder is gone once a real image renders').toBeNull()
    expect(container.querySelector('img')).toHaveAttribute('alt', '')
  })

  // Mutation: ignore renderMedia -> the default <img> renders and the staged picture never does.
  it('draws renderMedia in place of the image, still under the badge', () => {
    const renderMedia = vi.fn((product: Product) => <div data-testid="staged">{product.id}</div>)
    const { container } = render(
      <ProductCard product={{ ...KESTREL_K, image: { src: '/kestrel-k.webp' } }} renderMedia={renderMedia} />
    )
    expect(renderMedia).toHaveBeenCalledWith(expect.objectContaining({ id: 'kestrel-k' }))
    const media = container.querySelector('[data-product-media]')!
    expect(media).toContainElement(screen.getByTestId('staged'))
    expect(media).toContainElement(screen.getByText('Sale'))
    expect(container.querySelector('img'), 'the default image is not drawn as well').toBeNull()
  })

  it('passes renderMedia from the grid to every card', () => {
    render(
      <ProductGrid
        label="Replicas"
        products={[KESTREL_K, KESTREL_L]}
        renderMedia={product => <div data-testid={`staged-${product.id}`} />}
      />
    )
    expect(screen.getByTestId('staged-kestrel-k')).toBeInTheDocument()
    expect(screen.getByTestId('staged-kestrel-l')).toBeInTheDocument()
  })

  it('forwards a ref to the article', () => {
    const ref = createRef<HTMLElement>()
    render(<ProductCard ref={ref} product={KESTREL_K} />)
    expect(ref.current).toBe(screen.getByRole('article'))
  })

  it('is axe clean', async () => {
    const { container } = render(<ProductCard product={KESTREL_K} onAddToCart={() => {}} />)
    expect(await axeClean(container)).toHaveNoViolations()
  })
})

describe('ProductGrid', () => {
  it('is a named list with one item per product, at the heading level asked for', () => {
    const ref = createRef<HTMLUListElement>()
    render(<ProductGrid ref={ref} label="Replicas" products={[KESTREL_K, KESTREL_L]} headingLevel={2} />)
    const list = screen.getByRole('list', { name: 'Replicas' })
    expect(ref.current).toBe(list)
    expect(within(list).getAllByRole('listitem')).toHaveLength(2)
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(2)
  })

  it('announces its empty message when nothing matches', () => {
    render(<ProductGrid label="Replicas" products={[]} emptyMessage="No products match these filters." />)
    expect(screen.getByRole('status')).toHaveTextContent('No products match these filters.')
  })

  it('keeps the same status node across a rerender from products to empty, changing only its text', () => {
    const { rerender } = render(<ProductGrid label="Replicas" products={[KESTREL_K, KESTREL_L]} />)
    const status = screen.getByRole('status')
    expect(status).toHaveTextContent('')
    rerender(<ProductGrid label="Replicas" products={[]} emptyMessage="No products match these filters." />)
    expect(screen.getByRole('status')).toBe(status)
    expect(status).toHaveTextContent('No products match these filters.')
  })

  it('is axe clean', async () => {
    const { container } = render(<ProductGrid label="Replicas" products={[KESTREL_K, KESTREL_L]} />)
    expect(await axeClean(container)).toHaveNoViolations()
  })

  it('hides the list once it is empty, so it is not read as a list with nothing in it', () => {
    const ref = createRef<HTMLUListElement>()
    const { rerender } = render(<ProductGrid ref={ref} label="Replicas" products={[KESTREL_K, KESTREL_L]} />)
    expect(ref.current).not.toHaveAttribute('hidden')
    rerender(<ProductGrid ref={ref} label="Replicas" products={[]} />)
    expect(ref.current).toBe(screen.getByRole('list', { hidden: true }))
    expect(ref.current).toHaveAttribute('hidden')
  })
})
