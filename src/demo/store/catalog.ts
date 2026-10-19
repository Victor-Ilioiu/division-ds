import type { Product } from '../../components/organisms/product-card/ProductCard'
import { publicPath } from '../../base-path'

export type Category = {
  id: 'replicas' | 'optics' | 'ammo' | 'parts' | 'tactical'
  label: string
}

export const CATEGORIES: Category[] = [
  { id: 'replicas', label: 'Replicas' },
  { id: 'optics', label: 'Optics' },
  { id: 'ammo', label: 'Ammo' },
  { id: 'parts', label: 'Parts and accessories' },
  { id: 'tactical', label: 'Tactical equipment' },
]

/**
 * One Hexline product. Every name here is invented (see the catalogue document under
 * `docs/superpowers/plans/`), and every product in the `replicas` category says "replica" in its
 * name: `catalog.test.ts` fails the build on either rule.
 *
 * `sizes` and `colours` list a choice only where the product really offers one. Most products
 * here come one way, so both are usually empty and the product page shows neither fieldset; the
 * bump helmet is the one product with both.
 *
 * `compareAtPrice` is the usual price of a product that is on offer. Seven products carry one
 * besides the kit, so the homepage's offers slider has a row to show (`selections.ts`); a kit
 * part's own `price` is what the kit's arithmetic reads, and a compare price changes none of it.
 */
export type CatalogProduct = Product & {
  category: Category['id']
  /** [] for a one-size item. */
  sizes: string[]
  /** The finishes on offer. [] for a product that comes in one finish only. */
  colours: { id: string; label: string }[]
  description: string
  /** What arrives in the package, one line per item. */
  inTheBox: string[]
  /** 0 = sold out. Kept consistent with Product.soldOut by construction, see toEntry below. */
  stock: number
}

/** What each catalogue entry supplies by hand: `href`, `soldOut` and `image` are derived, never
 *  typed in. */
type CatalogSource = Omit<CatalogProduct, 'href' | 'soldOut' | 'image'>

/**
 * `image` is the product's photo, rendered from its own 3D model by `spike/tools/renders.mjs` to
 * `public/media/products/<id>.webp`: one file per product id, so the path is derived here and a
 * product can never point at another product's picture. Which model that is, and from where it is
 * shot, is the product's row in `../scene/products.js`, the same row the product page's live 3D
 * viewer builds the model from. `catalog.test.ts` fails when a file is
 * missing. `alt` is the empty string on purpose, the policy `ProductCard` already states: the
 * picture sits next to the product's name, which is the text that names it, and a second copy of
 * the name in `alt` is read out twice.
 */
function toEntry(source: CatalogSource): CatalogProduct {
  return {
    ...source,
    href: `/demo/shop/${source.id}`,
    soldOut: source.stock === 0,
    image: { src: publicPath(`/media/products/${source.id}.webp`), alt: '' },
  }
}

const BLACK_OR_TAN = [
  { id: 'black', label: 'Black' },
  { id: 'tan', label: 'Tan' },
]

const SOURCE: CatalogSource[] = [
  {
    id: 'kestrel-c',
    name: 'Kestrel C carbine replica',
    category: 'replicas',
    price: 13900,
    rating: { value: 4.7, count: 212 },
    sizes: [],
    colours: BLACK_OR_TAN,
    description:
      'An electric airsoft carbine replica for field days and skirmishes: 720 mm long with the stock folded out, and short enough for indoor sites with it folded. Takes 6 mm BBs from a 48-BB magazine at 1.0 J of muzzle energy, measured with 0.20 g BBs, which sits under the limit at most sites. Runs on an 11.1 V stick battery, sold separately.',
    inTheBox: ['Kestrel C replica', 'Halo tube sight', 'Smoke magazine, 48 BBs', 'Barrel cleaning rod', 'Manual'],
    stock: 8,
  },
  {
    id: 'kestrel-l',
    name: 'Kestrel L rifle replica',
    category: 'replicas',
    price: 15900,
    badge: 'New',
    rating: { value: 4.8, count: 41 },
    sizes: [],
    colours: BLACK_OR_TAN,
    description:
      'The Kestrel with a long barrel and a full-length handguard, on the same receiver as the C. A steadier replica for woodland field days, where the extra rail carries a foregrip and a light with room to spare. Takes 6 mm BBs at 1.3 J of muzzle energy, measured with 0.20 g BBs: check your site allows it before you order.',
    inTheBox: ['Kestrel L replica', 'Halo tube sight', 'Smoke magazine, 48 BBs', 'Barrel cleaning rod', 'Manual'],
    stock: 0,
  },
  {
    id: 'kestrel-k',
    name: 'Kestrel K compact replica',
    category: 'replicas',
    price: 12900,
    compareAtPrice: 14900,
    badge: 'Sale',
    rating: { value: 4.3, count: 59 },
    sizes: [],
    colours: [],
    description:
      'The shortest Kestrel: a stubby handguard and barrel, with the stock folded or taken off altogether. Built for indoor sites and tight corners. Takes 6 mm BBs at 0.9 J of muzzle energy, measured with 0.20 g BBs. Same magazine, same battery and same rail as the rest of the family. Black only.',
    inTheBox: ['Kestrel K replica', 'Halo tube sight', 'Smoke magazine, 48 BBs', 'Barrel cleaning rod', 'Manual'],
    stock: 6,
  },
  {
    id: 'harrier-lr',
    name: 'Harrier LR bolt-action replica',
    category: 'replicas',
    price: 17900,
    rating: { value: 4.5, count: 37 },
    sizes: [],
    colours: [],
    description:
      'A spring-powered, bolt-action long-range replica: 1,158 mm from muzzle to butt pad, with a fluted barrel, a thumbhole stock and an adjustable cheek rest. No battery and no gas: each BB is loaded by working the bolt. Takes 6 mm BBs from a 30-BB magazine at 1.8 J of muzzle energy, measured with 0.20 g BBs. That is above the limit many sites set for electric replicas and inside the one most set for bolt-action ones: check your site allows it before you order. The scope and the folding bipod are in the box. Black only.',
    inTheBox: ['Harrier LR replica', 'Scope with lens covers', 'Folding bipod', 'Magazine, 30 BBs', 'Barrel cleaning rod', 'Manual'],
    stock: 4,
  },
  {
    id: 'halo-tube-sight',
    name: 'Halo tube sight',
    category: 'optics',
    price: 3900,
    rating: { value: 4.4, count: 145 },
    sizes: [],
    colours: [],
    description:
      'A 30 mm tube sight with a single red dot and eleven brightness steps. The lens is rated for 6 mm BB impacts at field energies. Clamps to any 20 mm rail and ships fitted on every Kestrel, so this listing is the spare.',
    inTheBox: ['Halo tube sight', 'Rail mount', 'Lens covers', 'CR2032 cell'],
    stock: 0,
  },
  {
    id: 'prism-holo-sight',
    name: 'Prism holo sight',
    category: 'optics',
    price: 4900,
    rating: { value: 4.6, count: 88 },
    sizes: [],
    colours: BLACK_OR_TAN,
    description:
      'A window sight with a ring-and-dot reticle, for keeping both eyes open on a busy skirmish field. A replaceable polycarbonate shield sits in front of the lens and takes the BB strikes. Clamps to any 20 mm rail with one thumb screw.',
    inTheBox: ['Prism holo sight', 'Spare lens shield', 'Hex key', 'CR123A cell'],
    stock: 9,
  },
  {
    id: 'bbs-028',
    name: 'Precision BBs 0.28 g, 2,700',
    category: 'ammo',
    price: 590,
    rating: { value: 4.6, count: 210 },
    sizes: [],
    colours: [],
    description:
      'A bottle of 2,700 polished 6 mm BBs at 0.28 g, biodegradable, for outdoor sites that require it. The heavier weight holds its line better in wind than a 0.25 g and suits the longer Kestrel barrels.',
    inTheBox: ['One bottle, 2,700 BBs', 'Pouring spout cap'],
    stock: 20,
  },
  {
    id: 'bbs-025',
    name: 'Precision BBs 0.25 g, 2,700',
    category: 'ammo',
    price: 550,
    rating: { value: 4.5, count: 176 },
    sizes: [],
    colours: [],
    description:
      'A bottle of 2,700 polished 6 mm BBs at 0.25 g, biodegradable. The all-round weight for a replica at about 1 J, and the one to start with if you have not chosen a weight yet.',
    inTheBox: ['One bottle, 2,700 BBs', 'Pouring spout cap'],
    stock: 20,
  },
  {
    id: 'green-gas',
    name: 'Green gas, 600 ml',
    category: 'ammo',
    price: 990,
    compareAtPrice: 1190,
    rating: { value: 4.2, count: 34 },
    sizes: [],
    colours: [],
    description:
      'A 600 ml can of green gas with silicone lubricant mixed in, for gas-powered replicas and gas magazines. Works best above 15 °C. The Kestrel family is electric and does not use it.',
    inTheBox: ['One 600 ml can', 'Fill nozzle adaptor'],
    stock: 12,
  },
  {
    id: 'mute-235',
    name: 'Mute 235 mock suppressor',
    category: 'parts',
    price: 1900,
    rating: { value: 4.1, count: 67 },
    sizes: [],
    colours: [],
    description:
      'A 235 mm barrel extension for a 14 mm counter-clockwise thread. It is a hollow tube: it changes how the replica looks and balances and does nothing to the sound. Foam inserts are included for anyone who wants to dull the piston noise a little.',
    inTheBox: ['Mute 235 tube', 'Two foam inserts', 'Thread protector'],
    stock: 7,
  },
  {
    id: 'camo-foregrip',
    name: 'Camo foregrip',
    category: 'parts',
    price: 1490,
    rating: { value: 4.0, count: 22 },
    sizes: [],
    colours: [],
    description:
      'A polymer vertical grip in a woodland pattern, with a storage space in the base that holds a spare sight cell. Slides onto a 20 mm rail and locks with one lever, no tools.',
    inTheBox: ['Camo foregrip', 'Base cap'],
    stock: 9,
  },
  {
    id: 'beam-600',
    name: 'Beam 600 rail light',
    category: 'parts',
    price: 2400,
    compareAtPrice: 2900,
    badge: 'Sale',
    rating: { value: 4.3, count: 52 },
    sizes: [],
    colours: [],
    description:
      'A 600 lumen light for indoor sites and dusk field days, with a steady mode and a momentary tail switch. Clamps to a 20 mm rail. The lens is polycarbonate and rated for BB strikes at field energies.',
    inTheBox: ['Beam 600 light', 'Rail clamp', 'Two CR123A cells'],
    stock: 10,
  },
  {
    id: 'magazine-smoke',
    name: 'Smoke magazine, 48 BBs',
    category: 'parts',
    price: 890,
    rating: { value: 4.5, count: 133 },
    sizes: [],
    colours: [],
    description:
      'A translucent smoke-grey magazine for the Kestrel family, holding 48 BBs you can count through the side. Spring fed, with no winding wheel to rattle. One ships with every Kestrel.',
    inTheBox: ['One magazine'],
    stock: 15,
  },
  {
    id: 'magazine-amber',
    name: 'Amber magazine, 48 BBs',
    category: 'parts',
    price: 890,
    compareAtPrice: 1090,
    rating: { value: 4.4, count: 48 },
    sizes: [],
    colours: [],
    description:
      'The same 48-BB Kestrel magazine in translucent amber, easy to tell from a team-mate’s smoke ones at the end of a field day. Spring fed, with no winding wheel.',
    inTheBox: ['One magazine'],
    stock: 11,
  },
  {
    id: 'stick-battery',
    name: 'Stick battery 11.1 V, 1300 mAh',
    category: 'parts',
    price: 1950,
    rating: { value: 4.4, count: 97 },
    sizes: [],
    colours: [],
    description:
      'A three-cell lithium polymer stick that fits the handguard of every Kestrel. Enough for a full field day at a normal pace. Charge it only on a balance charger, and store it at 3.8 V per cell.',
    inTheBox: ['One battery', 'Storage voltage card'],
    stock: 14,
  },
  {
    id: 'balance-charger',
    name: 'Balance charger',
    category: 'parts',
    price: 2900,
    rating: { value: 4.6, count: 71 },
    sizes: [],
    colours: [],
    description:
      'A mains charger for two- and three-cell lithium polymer packs, with a storage mode that brings a battery to 3.8 V per cell. It balances the cells on every charge and stops on its own when they are full.',
    inTheBox: ['Balance charger', 'Mains lead', 'Charge lead with balance board'],
    stock: 5,
  },
  {
    id: 'speed-loader',
    name: 'Speed loader, 150 BBs',
    category: 'parts',
    price: 790,
    compareAtPrice: 990,
    rating: { value: 4.2, count: 64 },
    sizes: [],
    colours: [],
    description:
      'A hand loader that holds 150 BBs and fills a 48-BB magazine in about a dozen pushes. Saves thumbs and saves BBs from the grass between skirmishes.',
    inTheBox: ['Speed loader', 'Magazine adaptor'],
    stock: 16,
  },
  {
    id: 'field-goggles',
    name: 'Field goggles',
    category: 'tactical',
    price: 3400,
    compareAtPrice: 3900,
    badge: 'Sale',
    rating: { value: 4.7, count: 93 },
    sizes: [],
    colours: [
      { id: 'clear', label: 'Clear lens' },
      { id: 'smoke', label: 'Smoke lens' },
    ],
    description:
      'Full-seal eye protection with a double-pane lens that resists fogging, rated for 6 mm BB impacts. Eye protection is the one piece of kit every site requires before you step onto the field.',
    inTheBox: ['Field goggles', 'Microfibre bag', 'Spare strap'],
    stock: 12,
  },
  {
    id: 'bump-helmet',
    name: 'Bump helmet',
    category: 'tactical',
    price: 6900,
    rating: { value: 4.6, count: 128 },
    sizes: ['S/M', 'M/L'],
    colours: BLACK_OR_TAN,
    description:
      'A light polymer shell with padded liner, side rails and a dial fit at the back. It keeps branches, door frames and stray BBs off your head on a field day. Not a safety helmet for work, cycling or climbing.',
    inTheBox: ['Bump helmet', 'Spare liner pads', 'Rail adaptors'],
    stock: 8,
  },
  {
    id: 'knee-pads',
    name: 'Knee pads, pair',
    category: 'tactical',
    price: 2400,
    compareAtPrice: 2900,
    rating: { value: 4.1, count: 18 },
    sizes: [],
    colours: BLACK_OR_TAN,
    description:
      'A pair of hard-cap knee pads with two elastic straps each. Made for kneeling on gravel and forest floor through a long skirmish, and thin enough to wear under loose trousers.',
    inTheBox: ['Two knee pads'],
    stock: 9,
  },
  {
    id: 'dummy-radio',
    name: 'Dummy radio',
    category: 'tactical',
    price: 1900,
    rating: { value: 3.9, count: 15 },
    sizes: [],
    colours: [],
    description:
      'A prop: a hollow box with a flexible antenna, sized to fill a radio pouch. It has no electronics and sends nothing. The lid opens, so it doubles as a dry box for a phone or spare cells.',
    inTheBox: ['Dummy radio box', 'Flexible antenna'],
    stock: 6,
  },
]

/**
 * The Kestrel C operator kit, the homepage's offer. Its parts are catalogue products, so the
 * "bought separately" figure is a sum over real prices (`kitSeparatePrice`), never a second
 * number typed next to them. `catalog.test.ts` pins both figures and the saving.
 *
 * The magazines are one smoke and two amber because that is what the hero shows: the smoke one
 * the Kestrel ships with, the amber one Assemble fits, and a second amber one on the floor. Both
 * cost the same, so the sum does not care which is which; the picture does.
 */
export const KIT = {
  id: 'kestrel-c-kit',
  name: 'Kestrel C operator kit, carbine replica',
  /** In cents. */
  price: 18900,
  parts: [
    { productId: 'kestrel-c', quantity: 1 },
    { productId: 'prism-holo-sight', quantity: 1 },
    { productId: 'mute-235', quantity: 1 },
    { productId: 'camo-foregrip', quantity: 1 },
    { productId: 'beam-600', quantity: 1 },
    { productId: 'magazine-smoke', quantity: 1 },
    { productId: 'magazine-amber', quantity: 2 },
    { productId: 'bbs-028', quantity: 3 },
    { productId: 'stick-battery', quantity: 1 },
  ],
} as const

/** A kit part's own catalogue entry. Throws on a part the catalogue does not have, so a renamed
 *  product id cannot silently drop out of the kit's price or its box list. Reads `SOURCE`, not
 *  `CATALOG`: the kit is itself a catalogue product (below), built from these. */
function kitPart(productId: string): CatalogSource {
  const product = SOURCE.find(item => item.id === productId)
  if (!product) throw new Error(`Kit part "${productId}" is not in the catalogue.`)
  return product
}

/** What the kit's parts cost bought one by one, in cents. */
export function kitSeparatePrice(): number {
  return KIT.parts.reduce((sum, part) => sum + kitPart(part.productId).price * part.quantity, 0)
}

/** How much less the kit costs than its parts, as a whole percentage (39 for 39%). */
export function kitSaving(): number {
  return Math.round((1 - KIT.price / kitSeparatePrice()) * 100)
}

/**
 * The kit as a product you can open and put in a cart, which is what makes the hero's "Buy kit"
 * a real action. Everything about it that the parts already state is read from them: the compare
 * price is `kitSeparatePrice()`, and the box list is the parts by name. It is a replica (the
 * Kestrel C is in the box), so it sits in `replicas` and its name and description follow that
 * category's rules. One finish: the kit is assembled from black parts.
 */
const KIT_PRODUCT: CatalogSource = {
  id: KIT.id,
  name: KIT.name,
  category: 'replicas',
  price: KIT.price,
  compareAtPrice: kitSeparatePrice(),
  rating: { value: 4.8, count: 36 },
  sizes: [],
  colours: [],
  description:
    'The Kestrel C carbine replica with everything most people add in their first season, in one box: a holo sight, a mock suppressor, a foregrip, a rail light, three magazines, three bottles of BBs and a spare battery. The replica takes 6 mm BBs at 1.0 J of muzzle energy, measured with 0.20 g BBs. Every part is the catalogue part, at less than the parts cost one by one. A balance charger is sold separately.',
  inTheBox: KIT.parts.map(part => {
    const { name } = kitPart(part.productId)
    return part.quantity > 1 ? `${part.quantity} × ${name}` : name
  }),
  stock: 5,
}

/** The twenty-one products, then the kit built from nine of them. */
export const CATALOG: CatalogProduct[] = [...SOURCE, KIT_PRODUCT].map(toEntry)

export function findProduct(id: string): CatalogProduct | undefined {
  return CATALOG.find(product => product.id === id)
}
