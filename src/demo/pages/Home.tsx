import type { ReactNode } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { Button, Link } from '../../components/atoms'
import { Card, CardBody, CardDescription, CardTitle, SectionHeading, useToast } from '../../components/molecules'
import { Carousel } from '../../components/organisms/carousel/Carousel'
import { ProductCard, ProductGrid, type Product } from '../../components/organisms/product-card/ProductCard'
import { HOME } from '../content'
import { routerLink } from '../routerLink'
import { useCart } from '../store/cart'
import { quickAddToCart } from '../store/quickAdd'
import {
  ACCESSORY_CATEGORIES,
  categoryTiles,
  otherOffers,
  shopHref,
  topRatedAccessories,
  topRatedReplicas,
  type CategoryTile,
} from '../store/selections'
import { HomeHero } from './HomeHero'
import { ProductStage, stagedMedia } from './shop/ProductStage'

/** One card's width in a slider: about four to a wide screen, and never more than four fifths of
 *  the track, so the next card always shows its edge. */
const SLIDE_WIDTH = 'min(18rem, 78%)'

/** The page gutter as a slider takes it: the property the demo shell sets (`DemoLayout.tsx`) and
 *  `px-gutter` reads, so a slider's first card starts where the headings and the Navbar brand do.
 *  The 1rem is what it is outside a shell, the fallback `px-gutter` has too. */
const GUTTER = 'var(--page-gutter, 1rem)'

/**
 * One section of the homepage, opened by a `SectionHeading`.
 *
 * The heading always sits in the page gutter. The body does too, unless it is `bleed`: a slider
 * runs the full width of the page and carries the gutter itself (Carousel's `gutter`), so its
 * first card lines up with the heading while the rest scroll out under the page's edge.
 *
 * A plain section is a region named by its heading. A `bleed` one is not: its Carousel is already
 * a region with that name, and a second region of the same name around it would be announced
 * twice on the way in.
 */
function Section({
  id,
  index,
  title,
  description,
  action,
  bleed = false,
  children,
}: {
  id: string
  index: number
  title: string
  description?: string
  action?: { label: string; href: string }
  bleed?: boolean
  children: ReactNode
}) {
  const Wrapper = bleed ? 'div' : 'section'
  return (
    <Wrapper aria-labelledby={bleed ? undefined : id} className="flex flex-col gap-6">
      <SectionHeading
        className="mx-gutter"
        level={2}
        id={id}
        index={index}
        title={title}
        description={description}
        action={
          action ? (
            <Button asChild variant="secondary" size="sm">
              <RouterLink to={action.href}>{action.label}</RouterLink>
            </Button>
          ) : undefined
        }
      />
      <div className={bleed ? undefined : 'px-gutter'}>{children}</div>
    </Wrapper>
  )
}

/** The whole tile is one link, through the name's own `::after`, which is also where its focus
 *  ring is drawn: the shape `ProductCard` uses for the same reason. */
const TILE_LINK =
  "outline-none hover:underline underline-offset-2 after:absolute after:inset-0 after:content-[''] focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-[var(--color-focus-ring)]"

/**
 * One category as one link into the filtered shop: the photo of its best-rated product, its name
 * and how many products the shop lists under it. Built from Card's own parts and kept here
 * rather than in the system: it is one use, on one page. `interactive`, because the whole tile is
 * one click target: the border and the lift are Card's (see Card's own comment).
 *
 * The photo's `alt` is empty, the policy `ProductCard` states: the name beside it is the text.
 * Count: "alert body and ghost dismiss (text.secondary) on surface.raised (over surface.base)".
 */
function CategoryTileCard({ tile }: { tile: CategoryTile }) {
  return (
    <Card interactive className="h-full">
      <ProductStage id={tile.product.id} />
      <CardBody className="flex flex-col gap-1">
        <CardTitle level={3} className="text-base">
          <RouterLink to={tile.href} className={TILE_LINK}>
            {tile.category.label}
          </RouterLink>
        </CardTitle>
        <p className="font-mono text-xs tabular-nums text-[var(--color-text-secondary)]">
          {tile.count} {tile.count === 1 ? 'product' : 'products'}
        </p>
      </CardBody>
    </Card>
  )
}

/**
 * The `/demo` homepage: the hero (`HomeHero.tsx`: the kit offer over the three.js scene, or its
 * still), then five sections, each opened by a `SectionHeading`: a grid of the top-rated replicas,
 * a slider of the other offers, the categories, a slider of the top-rated accessories and the
 * house rules as four cards (the fourth says what this store is). The Footer follows, from
 * `DemoLayout`, and carries the newsletter sign-up that was this page's sixth section.
 *
 * What each section shows is a rule over the catalogue (`store/selections.ts`), never a list of
 * ids, and every "All ..." link is built by the function the shop writes its own URL with. The
 * copy is `HOME` in `content.ts`.
 *
 * This file stays in the main chunk (the route is eager, see routes.ts); the scene does not,
 * `HomeHero` reaches it through `import()`. Everything under the hero is below the fold on a
 * first load and every photo in it is `loading="lazy"`, so the sections add no request to it.
 */
export function Home() {
  const { add } = useCart()
  const { toast } = useToast()
  const addToCart = (product: Product) => quickAddToCart(add, toast, product.id)
  const card = (product: Product) => (
    <ProductCard key={product.id} product={product} headingLevel={3} renderLink={routerLink} renderMedia={stagedMedia} onAddToCart={addToCart} />
  )

  return (
    <>
      <HomeHero />
      <div className="flex flex-col gap-16 bg-[var(--color-surface-base)] py-16">
        <Section
          id="home-replicas"
          index={1}
          title={HOME.replicas.title}
          description={HOME.replicas.description}
          action={{ label: HOME.replicas.action, href: shopHref({ categories: ['replicas'], sort: 'rating' }) }}
        >
          <ProductGrid
            label={HOME.replicas.title}
            products={topRatedReplicas()}
            // Four replicas: one column, then two by two, then all four across. Never three,
            // which would leave the fourth card alone on a second row. The grid's own steps are
            // container queries, so these are too: two from 36rem (its default), four from 64rem.
            className="@3xl:grid-cols-2 @5xl:grid-cols-4"
            headingLevel={3}
            renderLink={routerLink}
            renderMedia={stagedMedia}
            onAddToCart={addToCart}
          />
        </Section>

        <Section id="home-offers" index={2} title={HOME.offers.title} description={HOME.offers.description} bleed>
          <Carousel label={HOME.offers.title} itemWidth={SLIDE_WIDTH} gutter={GUTTER}>
            {otherOffers().map(card)}
          </Carousel>
        </Section>

        <Section
          id="home-categories"
          index={3}
          title={HOME.categories.title}
          description={HOME.categories.description}
          action={{ label: HOME.categories.action, href: shopHref() }}
        >
          <ul role="list" aria-label={HOME.categories.title} className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
            {categoryTiles().map(tile => (
              <li key={tile.category.id}>
                <CategoryTileCard tile={tile} />
              </li>
            ))}
          </ul>
        </Section>

        <Section
          id="home-accessories"
          index={4}
          title={HOME.accessories.title}
          description={HOME.accessories.description}
          action={{
            label: HOME.accessories.action,
            href: shopHref({ categories: ACCESSORY_CATEGORIES, sort: 'rating' }),
          }}
          bleed
        >
          <Carousel label={HOME.accessories.title} itemWidth={SLIDE_WIDTH} gutter={GUTTER}>
            {topRatedAccessories().map(card)}
          </Carousel>
        </Section>

        <Section
          id="home-rules"
          index={5}
          title={HOME.rules.title}
          description={HOME.rules.description}
          action={HOME.rules.action}
        >
          {/* Four cards, none of them `interactive`: a rule is something to read, not a click
              target, so these cards do not light up or lift under the pointer. The fourth holds a
              link, and the link is the control. One, two, then four across; the cards in a row
              are one height (the grid stretches the items, the Card fills its item). */}
          <ul role="list" aria-label={HOME.rules.title} className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {HOME.rules.items.map(rule => (
              <li key={rule.heading}>
                <Card className="h-full">
                  <CardBody className="flex flex-col gap-2">
                    <CardTitle level={3}>{rule.heading}</CardTitle>
                    <CardDescription>{rule.body}</CardDescription>
                    {rule.link ? (
                      // The case study is not written yet, and the copy says so next to the
                      // link: the link is honest about where it goes today.
                      <p className="mt-auto pt-2 font-body text-sm text-[var(--color-text-secondary)]">
                        <Link href={rule.link.href} external>
                          {rule.link.label}
                        </Link>
                        <span className="mt-1 block text-xs">{rule.link.note}</span>
                      </p>
                    ) : null}
                  </CardBody>
                </Card>
              </li>
            ))}
          </ul>
        </Section>
      </div>
    </>
  )
}
