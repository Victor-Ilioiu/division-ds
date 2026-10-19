import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { CircleAlert } from 'lucide-react'
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom'
import { Button, Radio, RadioGroup, linkVariants } from '../../../components/atoms'
import {
  Breadcrumbs,
  ErrorSummary,
  FormField,
  QuantityStepper,
  Rating,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  useToast,
} from '../../../components/molecules'
import { ProductGrid, type Product as ProductCardData } from '../../../components/organisms/product-card/ProductCard'
import { hasErrors, summarize, useFieldErrors } from '../../../lib/field-errors'
import { formatMoney } from '../../../lib/money'
import { DEMO_HOME } from '../../routes'
import { routerLink } from '../../routerLink'
import { DEFAULT_PAGE } from '../../DefaultPage'
import { guideForCategory } from '../../content/journal'
import { CATALOG, CATEGORIES, findProduct } from '../../store/catalog'
import { detailFor, maxQuantityFor, useCart } from '../../store/cart'
import { addedTitle, quickAddToCart } from '../../store/quickAdd'
import { Disclaimer } from '../../Disclaimer'
import { ProductMedia } from './ProductMedia'
import { stagedMedia } from './ProductStage'

type Field = 'size' | 'colour'

const LABEL = 'font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-primary)]'
const FIELD_ERROR = 'flex items-start gap-1.5 font-body text-xs text-[var(--color-accent-hostile-text)]'

const REQUIRED: Record<Field, string> = {
  size: 'Choose a size.',
  colour: 'Choose a colour.',
}

function validate(field: Field, value: string): string | undefined {
  return value ? undefined : REQUIRED[field]
}

/**
 * A single Hexline product: its picture (the cutout on the shop's plinth stage, with the live
 * 3D model over it where it can work, both in `ProductMedia.tsx`), a size and colour choice (each a required radio group when the
 * product offers one, and absent when it does not -- most products here come one way), a
 * quantity, Add to cart, and Details/In the box/Guide tabs. Reached from
 * the shop grid or a direct link -- `useParams().id` looks the product up in the catalogue
 * itself, so there is no loading state to show.
 *
 * The page owns its own `document.title` (`DemoLayout`'s title effect skips any route with
 * `titleFromPage`, see routes.ts) because the real title needs the product's name, which the
 * route registry doesn't have. An id that doesn't resolve renders its own "Product not found"
 * heading and a link back to the shop, rather than redirecting or reusing the shell's generic
 * 404 -- a person followed a real link to a real product id; the shop is still one click away.
 *
 * Every hook below is declared before that not-found check (never after a conditional early
 * return) so the hook order never depends on whether the id resolved. Switching to a different
 * product (the related grid, or a direct link) reuses this same mounted component -- the effect
 * keyed on `id` clears whatever size/colour/quantity was chosen for the last product, so a
 * leftover selection from product A never carries into product B's Add to cart.
 */
export function Product() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { add, lines } = useCart()
  const { toast } = useToast()
  const product = id ? findProduct(id) : undefined

  const uid = useId()
  const idOf = (field: Field) => `${uid}-${field}`
  const [size, setSize] = useState('')
  const [colourId, setColourId] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [attempt, setAttempt] = useState(0)
  const errors = useFieldErrors<Field>(validate)
  const summary = useRef<HTMLDivElement>(null)

  useEffect(() => {
    document.title = product ? `Hexline — ${product.name}` : 'Hexline — product not found'
  }, [product])

  useEffect(() => {
    if (attempt > 0) summary.current?.focus()
  }, [attempt])

  // A fresh product gets a fresh form: nothing chosen for product A should still read as chosen
  // once the id changes to product B. Keyed on `id` alone, never on `errors` itself -- `errors` is
  // a plain object literal rebuilt on every render (see `useFieldErrors`), so depending on it would
  // fire this effect, and so `errors.replace({})`, on every render rather than only when the
  // product actually changes.
  useEffect(() => {
    setSize('')
    setColourId('')
    setQuantity(1)
    errors.replace({})
  }, [id])

  if (!product) {
    return (
      <div className="px-gutter py-12 flex flex-col gap-4">
        <h1 className="font-display font-semibold text-2xl text-[var(--color-text-primary)]">Product not found</h1>
        <p className="font-body text-sm text-[var(--color-text-secondary)]">
          <RouterLink to="/demo/shop" className={linkVariants()}>
            Back to the shop
          </RouterLink>
        </p>
      </div>
    )
  }

  const money = (minorUnits: number) => formatMoney(minorUnits)
  const categoryLabel = CATEGORIES.find(category => category.id === product.category)?.label ?? product.category
  const related = CATALOG.filter(item => item.category === product.category && item.id !== product.id).slice(0, 3)
  // The Guide tab's own link: the first Field notes guide that covers this product's category,
  // or the Field notes index itself when none does yet -- see guideForCategory's own comment.
  const guide = guideForCategory(product.category)

  // Only the choices this product really offers: a size where it has sizes, a colour where it
  // has more than one finish. A product with neither validates nothing and adds straight away.
  const fieldsFor = (): readonly Field[] => [
    ...(product.sizes.length > 0 ? (['size'] as const) : []),
    ...(product.colours.length > 0 ? (['colour'] as const) : []),
  ]
  const valueOf = (field: Field): string => (field === 'size' ? size : colourId)

  // The size this product actually asks for -- `undefined` for a one-size product, the same rule
  // `submit` below applies when it calls `add`. Read here too so the stepper's own bound can find
  // the exact line this selection would add to, rather than only deciding it at submit time.
  const chosenSize = product.sizes.length > 0 ? size : undefined
  // The same rule for colour: `undefined`, never the empty string, for a product with no finish
  // to choose, so the line id matches the one a quick add from a grid builds for it.
  const chosenColourId = product.colours.length > 0 ? colourId : undefined
  const existingLine = lines.find(
    line => line.productId === product.id && line.size === chosenSize && line.colourId === chosenColourId
  )
  // The most this exact line could still hold: the product's own remaining stock, never a flat 10
  // that ignores it and never below 1, since the stepper itself always needs a reachable floor --
  // whether anything is actually left to add is `add`'s own call once Add to cart is pressed.
  const stepperMax = Math.max(1, maxQuantityFor(product) - (existingLine?.quantity ?? 0))

  const chooseSize = (value: string) => {
    setSize(value)
    errors.blur('size', value)
  }

  const chooseColour = (value: string) => {
    setColourId(value)
    errors.blur('colour', value)
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    // The Sold out button is inert by `aria-disabled` alone (see its own comment below), which
    // carries no browser-enforced behaviour: pressing Enter inside Quantity submits the form the
    // normal way regardless of which button on it is disabled. Nothing upstream of this line
    // knows the product is sold out, so it has to be checked here, first.
    if (product.soldOut) return
    const found = errors.validateAll(fieldsFor(), valueOf)
    if (hasErrors(found)) {
      setAttempt(count => count + 1)
      return
    }
    const colourLabel = product.colours.find(colour => colour.id === chosenColourId)?.label
    const outcome = add(product, { size: chosenSize, colourId: chosenColourId, quantity })
    if (outcome === 'at-max') {
      toast({ title: `You already have the most we can sell of ${product.name}.` })
      return
    }
    toast({
      title: addedTitle(product.name, detailFor(chosenSize, colourLabel)),
      action: {
        label: 'View cart',
        altText: 'Open your cart with the Cart button in the header.',
        onAction: () => navigate('/demo/cart'),
      },
    })
  }

  function handleRelatedAdd(item: ProductCardData) {
    quickAddToCart(add, toast, item.id)
  }

  const sizeError = errors.errors.size
  const sizeErrorId = `${uid}-size-error`
  const colourError = errors.errors.colour
  const colourErrorId = `${uid}-colour-error`
  const soldOutId = `${uid}-sold-out`

  return (
    <div className={`${DEFAULT_PAGE} py-12 flex flex-col gap-10`}>
      <Breadcrumbs
        items={[
          { label: 'Home', href: DEMO_HOME },
          { label: 'Shop', href: '/demo/shop' },
          { label: categoryLabel, href: `/demo/shop?category=${product.category}` },
          { label: product.name },
        ]}
        renderLink={routerLink}
      />

      <div className="grid gap-8 md:grid-cols-2">
        {/* The cutout on its stage, and the live 3D model over it (ProductMedia.tsx). Keyed on
            the product: going to another product unmounts it, which disposes the viewer and
            gives its WebGL context back before the next product starts one. */}
        <ProductMedia key={product.id} product={product} />

        <div className="flex flex-col gap-6 min-w-0">
          <div className="flex flex-col gap-2">
            <h1 className="font-display font-semibold text-3xl text-[var(--color-text-primary)]">{product.name}</h1>
            {product.rating ? (
              <p className="flex items-center gap-2">
                <Rating value={product.rating.value} label={product.name} />
                <span className="font-mono text-sm tabular-nums text-[var(--color-text-secondary)]">
                  {product.rating.count} reviews
                </span>
              </p>
            ) : null}
            <p className="font-mono text-xl tabular-nums text-[var(--color-text-primary)]">
              <span className="sr-only">Price: </span>
              {money(product.price)}
              {product.compareAtPrice !== undefined ? (
                <>
                  {' '}
                  <s className="ml-1 text-base text-[var(--color-text-secondary)]">
                    <span className="sr-only">was </span>
                    {money(product.compareAtPrice)}
                  </s>
                </>
              ) : null}
            </p>
            <Disclaimer />
          </div>

          <form noValidate onSubmit={submit} className="flex flex-col gap-6">
            <ErrorSummary ref={summary} errors={summarize(errors.errors, fieldsFor(), idOf)} />

            {product.sizes.length > 0 ? (
              <fieldset
                aria-describedby={sizeError ? sizeErrorId : undefined}
                aria-invalid={sizeError ? true : undefined}
                className="flex flex-col gap-3 border-0 p-0 m-0 min-w-0"
              >
                <legend className={LABEL}>
                  Size
                  <span aria-hidden="true" className="ml-1 text-[var(--color-accent-signal-text)]">
                    *
                  </span>
                </legend>
                <RadioGroup value={size} onValueChange={chooseSize} className="flex flex-row flex-wrap gap-3">
                  {product.sizes.map((s, index) => {
                    const optionId = index === 0 ? idOf('size') : `${idOf('size')}-${index}`
                    return (
                      <div key={s} className="flex items-center gap-2">
                        <Radio id={optionId} value={s} invalid={Boolean(sizeError)} />
                        <label htmlFor={optionId} className="font-body text-sm text-[var(--color-text-primary)]">
                          {s}
                        </label>
                      </div>
                    )
                  })}
                </RadioGroup>
                {sizeError ? (
                  <p id={sizeErrorId} className={FIELD_ERROR}>
                    <CircleAlert aria-hidden="true" className="w-3.5 h-3.5 mt-px shrink-0" />
                    {sizeError}
                  </p>
                ) : null}
              </fieldset>
            ) : null}

            {product.colours.length > 0 ? (
              <fieldset
                aria-describedby={colourError ? colourErrorId : undefined}
                aria-invalid={colourError ? true : undefined}
                className="flex flex-col gap-3 border-0 p-0 m-0 min-w-0"
              >
                <legend className={LABEL}>
                  Colour
                  <span aria-hidden="true" className="ml-1 text-[var(--color-accent-signal-text)]">
                    *
                  </span>
                </legend>
                <RadioGroup value={colourId} onValueChange={chooseColour} className="flex flex-row flex-wrap gap-3">
                  {product.colours.map((colour, index) => {
                    const optionId = index === 0 ? idOf('colour') : `${idOf('colour')}-${index}`
                    return (
                      <div key={colour.id} className="flex items-center gap-2">
                        <Radio id={optionId} value={colour.id} invalid={Boolean(colourError)} />
                        <label htmlFor={optionId} className="font-body text-sm text-[var(--color-text-primary)]">
                          {colour.label}
                        </label>
                      </div>
                    )
                  })}
                </RadioGroup>
                {colourError ? (
                  <p id={colourErrorId} className={FIELD_ERROR}>
                    <CircleAlert aria-hidden="true" className="w-3.5 h-3.5 mt-px shrink-0" />
                    {colourError}
                  </p>
                ) : null}
              </fieldset>
            ) : null}

            <FormField label="Quantity">
              <QuantityStepper label="Quantity" value={quantity} onValueChange={setQuantity} min={1} max={stepperMax} />
            </FormField>

            {product.soldOut ? (
              <div className="flex flex-col gap-2">
                {/* aria-disabled, never native `disabled`: a native-disabled button drops out of
                    the tab order, taking the reason it's disabled with it. This one stays
                    reachable and its explanatory line stays announced (aria-describedby), the
                    same shape Button's own `loading` state uses for a control that must stay
                    focusable while inert (see its own `WHILE_LOADING`). The click itself is a
                    no-op -- aria-disabled carries no browser-enforced behaviour, so it still needs
                    one. */}
                <Button
                  type="button"
                  variant="secondary"
                  aria-disabled
                  aria-describedby={soldOutId}
                  onClick={event => event.preventDefault()}
                  className="self-start"
                >
                  Sold out
                </Button>
                <p id={soldOutId} className="font-body text-sm text-[var(--color-text-secondary)]">
                  This item is out of stock and can't be added to your cart right now.
                </p>
              </div>
            ) : (
              <Button type="submit" className="self-start">
                Add to cart
              </Button>
            )}
          </form>
        </div>
      </div>

      <Tabs defaultValue="details">
        <TabsList aria-label="Product information">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="in-the-box">In the box</TabsTrigger>
          <TabsTrigger value="guide">Guide</TabsTrigger>
        </TabsList>
        <TabsContent value="details">
          <p className="font-body text-sm text-[var(--color-text-primary)]">{product.description}</p>
        </TabsContent>
        <TabsContent value="in-the-box">
          <ul role="list" className="flex flex-col gap-2 font-body text-sm text-[var(--color-text-primary)]">
            {product.inTheBox.map(item => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </TabsContent>
        <TabsContent value="guide">
          <div className="flex flex-col gap-3">
            <p className="font-body text-sm text-[var(--color-text-primary)]">
              Every Hexline product is made to be looked after, not thrown out. Field guides cover the setup and
              the upkeep, step by step.
            </p>
            <p>
              {guide ? (
                <RouterLink to={`/demo/journal/${guide.slug}`} className={linkVariants()}>
                  Read the field guide: {guide.title}
                </RouterLink>
              ) : (
                <RouterLink to="/demo/journal" className={linkVariants()}>
                  Read the field guides
                </RouterLink>
              )}
            </p>
          </div>
        </TabsContent>
      </Tabs>

      {related.length > 0 ? (
        <div className="flex flex-col gap-4">
          <h2 className="font-display font-semibold text-lg text-[var(--color-text-primary)]">
            More {categoryLabel}
          </h2>
          <ProductGrid
            products={related}
            label={`More ${categoryLabel}`}
            renderLink={routerLink}
            renderMedia={stagedMedia}
            onAddToCart={handleRelatedAdd}
          />
        </div>
      ) : null}
    </div>
  )
}
