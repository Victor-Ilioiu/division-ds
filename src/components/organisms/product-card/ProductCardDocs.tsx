import { ComponentDocs } from '../../docs/ComponentDocs'
import { meta } from './ProductCard.meta'
import { Example } from '../../docs/Example'
import { useToast } from '../../molecules'
import { ProductCard, ProductGrid, type Product } from './ProductCard'

const REPLICA: Product = {
  id: 'kestrel-k',
  name: 'Kestrel K compact replica',
  href: '#kestrel-k',
  price: 12900,
  compareAtPrice: 14900,
  rating: { value: 4.5, count: 128 },
  badge: 'Sale',
}

// A product no other example on this page shows, so each card's name stays unique on the page.
const STAGED: Product = { id: 'harrier-lr', name: 'Harrier LR bolt-action replica', href: '#harrier-lr', price: 17900, rating: { value: 4.5, count: 37 } }

const RANGE: Product[] = [
  { id: 'kestrel-c', name: 'Kestrel C carbine replica', href: '#kestrel-c', price: 13900, rating: { value: 4.5, count: 212 } },
  { id: 'prism-holo-sight', name: 'Prism holo sight', href: '#prism-holo-sight', price: 4900, badge: 'New' },
  { id: 'speed-loader', name: 'Speed loader, 150 BBs', href: '#speed-loader', price: 790, rating: { value: 4, count: 87 } },
  { id: 'kestrel-l', name: 'Kestrel L rifle replica', href: '#kestrel-l', price: 15900, soldOut: true },
  { id: 'bbs-028', name: 'Precision BBs 0.28 g, 2,700', href: '#bbs-028', price: 590 },
  { id: 'field-goggles', name: 'Field goggles', href: '#field-goggles', price: 3400, compareAtPrice: 3900, badge: 'Sale' },
]

function OneProductExample() {
  const { toast } = useToast()
  return (
    <div className="max-w-xs">
      <ProductCard
        product={REPLICA}
        headingLevel={4}
        onAddToCart={product => toast({ title: 'Added to cart', description: product.name, tone: 'ok' })}
      />
    </div>
  )
}

function AGridExample() {
  const { toast } = useToast()
  return (
    <ProductGrid
      label="Hexline range"
      products={RANGE}
      headingLevel={4}
      onAddToCart={product => toast({ title: 'Added to cart', description: product.name, tone: 'ok' })}
    />
  )
}

export function ProductCardDocs() {
  return (
    <ComponentDocs meta={meta}>
      <Example caption="One product" className="block">
        <OneProductExample />
      </Example>

      <Example caption="A grid" className="block">
        <AGridExample />
      </Example>

      <Example caption="A custom picture through renderMedia" className="block">
        <div className="max-w-xs">
          <ProductCard
            product={STAGED}
            headingLevel={4}
            renderMedia={product => (
              <div aria-hidden="true" className="flex aspect-[4/3] items-center justify-center bg-[var(--color-surface-sunken)] p-4">
                <img src={`/media/products/cutout/${product.id}-640.webp`} alt="" loading="lazy" className="max-h-full w-full object-contain" />
              </div>
            )}
          />
        </div>
      </Example>

      <Example caption="Nothing matches" className="block">
        <ProductGrid label="Hexline range, filtered" products={[]} emptyMessage="No products match these filters." />
      </Example>
    </ComponentDocs>
  )
}
