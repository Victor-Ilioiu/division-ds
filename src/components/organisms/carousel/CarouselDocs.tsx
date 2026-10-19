import { ComponentDocs } from '../../docs/ComponentDocs'
import { meta } from './Carousel.meta'
import { Example } from '../../docs/Example'
import { useToast } from '../../molecules'
import { ProductCard, type Product } from '../product-card/ProductCard'
import { Carousel } from './Carousel'

/** Each product's photo is the one the demo store shows, at the path its id derives. */
const photo = (id: string) => ({ src: `/media/products/${id}.webp` })

const OFFERS: Product[] = [
  { id: 'kestrel-k', name: 'Kestrel K compact replica', href: '#kestrel-k', price: 12900, compareAtPrice: 14900, badge: 'Sale' },
  { id: 'field-goggles', name: 'Field goggles', href: '#field-goggles', price: 3400, compareAtPrice: 3900, badge: 'Sale' },
  { id: 'beam-600', name: 'Beam 600 rail light', href: '#beam-600', price: 2400, compareAtPrice: 2900 },
  { id: 'speed-loader', name: 'Speed loader, 150 BBs', href: '#speed-loader', price: 790, compareAtPrice: 990 },
  { id: 'magazine-amber', name: 'Amber magazine, 48 BBs', href: '#magazine-amber', price: 890, compareAtPrice: 1090 },
  { id: 'knee-pads', name: 'Knee pads, pair', href: '#knee-pads', price: 2400, compareAtPrice: 2900 },
].map(product => ({ ...product, image: photo(product.id) }))

const STEPS = ['Unload', 'Disconnect', 'Wipe down', 'Clean the barrel', 'Check the hop-up', 'Store']

function ProductCardsExample() {
  const { toast } = useToast()
  return (
    <Carousel label="Offers" itemWidth="min(16rem, 80%)">
      {OFFERS.map(product => (
        <ProductCard
          key={product.id}
          product={product}
          headingLevel={4}
          onAddToCart={added => toast({ title: 'Added to cart', description: added.name, tone: 'ok' })}
        />
      ))}
    </Carousel>
  )
}

export function CarouselDocs() {
  return (
    <ComponentDocs meta={meta}>
      <Example caption="Product cards" className="block">
        <ProductCardsExample />
      </Example>

      <Example caption="Nothing inside takes keyboard focus, so the Tab key stops on the track itself" className="block">
        <Carousel label="Cleaning steps" itemWidth="12rem">
          {STEPS.map((step, index) => (
            <div
              key={step}
              className="flex h-28 flex-col justify-between border border-[var(--color-border-hairline-strong)] p-4"
            >
              <span className="font-mono text-xs tabular-nums text-[var(--color-text-secondary)]">
                {String(index + 1).padStart(2, '0')}
              </span>
              <span className="font-display font-semibold text-[var(--color-text-primary)]">{step}</span>
            </div>
          ))}
        </Carousel>
      </Example>

      <Example caption="Three short items: both buttons do nothing while everything fits" className="block">
        <Carousel label="Kestrel lengths" itemWidth="8rem">
          {['Kestrel K', 'Kestrel C', 'Kestrel L'].map(name => (
            <div
              key={name}
              className="flex h-20 items-center justify-center border border-[var(--color-border-hairline-strong)] font-display font-semibold text-[var(--color-text-primary)]"
            >
              {name}
            </div>
          ))}
        </Carousel>
      </Example>
    </ComponentDocs>
  )
}
