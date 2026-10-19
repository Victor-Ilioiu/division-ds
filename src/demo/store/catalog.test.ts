import { describe, expect, it } from 'vitest'
import { sourceFiles } from '../../../scripts/lib/read-source-files.mjs'
import { REPLICA_TERMS, SOURCE_TERMS, TRADEMARK_TERMS, findViolations } from '../../../scripts/lib/vocabulary.mjs'
import { JOURNAL_POSTS, guideForCategory } from '../content/journal'
import { CARE, DISCLAIMER, HOME } from '../content'
import { CATALOG, CATEGORIES, KIT, findProduct, kitSaving, kitSeparatePrice } from './catalog'

/**
 * The replica rule, in data. PRODUCT.md and design.md state it as a rule; this file is what makes
 * it a gate: `npm test` fails when a replica is not called a replica, when any store copy trips
 * the vocabulary matcher, or when the kit's arithmetic stops being a sum of real prices.
 *
 * The vocabulary gate (`npm run check:vocabulary`) already scans this folder's source text. The
 * checks below run the same matcher over the DATA, field by field, so a failure names the product
 * and the field rather than a line number in a 300-line file.
 */

/** Every violation in `text`, as "term" strings, for a readable failure message. */
function banned(text: string): string[] {
  return findViolations(text).map(violation => violation.term)
}

describe('the catalogue', () => {
  it('has the five categories, and twenty-two products: the twenty-one the catalogue document lists and the kit', () => {
    expect(CATEGORIES.map(category => category.id)).toEqual(['replicas', 'optics', 'ammo', 'parts', 'tactical'])
    expect(CATALOG).toHaveLength(22)
    expect(new Set(CATALOG.map(product => product.id)).size).toBe(22)
    expect(CATALOG.filter(product => product.id !== KIT.id)).toHaveLength(21)
    for (const category of CATEGORIES) {
      expect(CATALOG.some(product => product.category === category.id), category.id).toBe(true)
    }
  })

  // Mutation: rename "Kestrel K compact replica" to "Kestrel K compact" in catalog.ts -> fails,
  // naming that product.
  it('calls every product in the replicas category a replica, in its name', () => {
    const replicas = CATALOG.filter(product => product.category === 'replicas')
    expect(replicas.length).toBeGreaterThan(0)
    for (const product of replicas) {
      expect(product.name, `${product.id} is in "replicas" and its name does not say so`).toMatch(/\breplica\b/i)
    }
  })

  // Mutation: put any term from scripts/lib/vocabulary.mjs's three lists into a product's name,
  // description or `inTheBox` -> fails, naming the product, the field and the term.
  it('has no product name, description or box contents that trip the vocabulary matcher', () => {
    for (const product of CATALOG) {
      expect(banned(product.name), `${product.id} name`).toEqual([])
      expect(banned(product.description), `${product.id} description`).toEqual([])
      expect(banned(product.inTheBox.join('\n')), `${product.id} inTheBox`).toEqual([])
      expect(banned(product.colours.map(colour => colour.label).join('\n')), `${product.id} colours`).toEqual([])
    }
    expect(banned(CATEGORIES.map(category => category.label).join('\n')), 'category labels').toEqual([])
    expect(banned(KIT.name), 'kit name').toEqual([])
  })

  // The matcher itself has to be live for the test above to mean anything: the same call that
  // returns [] for the catalogue returns a hit for a term taken from each of the three lists.
  it('uses a matcher that does fail on a term from each list, and passes the disclaimer', () => {
    for (const list of [SOURCE_TERMS, REPLICA_TERMS, TRADEMARK_TERMS]) {
      expect(banned(`A sentence with ${list[0]} in it.`)).toEqual([list[0]])
    }
    expect(banned(DISCLAIMER)).toEqual([])
  })

  it('says what every replica takes and how much energy it has, in the units a site checks', () => {
    for (const product of CATALOG.filter(item => item.category === 'replicas')) {
      expect(product.description, `${product.id} names 6 mm BBs`).toMatch(/6 mm BBs/)
      expect(product.description, `${product.id} gives its energy in joules`).toMatch(/\d\.\d J\b/)
    }
  })

  // The wording half of the imagery rule, as far as a word list can hold it: no description
  // talks about pointing a replica at anyone or anything.
  it('describes no product in terms of use against people or things', () => {
    const forbidden = /\b(aim|aims|aimed|aiming|shoot|shoots|shooting|shot|shots|target|targets|enemy|enemies|opponent|opponents|kill|kills|wound|hurt)\b/i
    for (const product of CATALOG) {
      expect(product.description, product.id).not.toMatch(forbidden)
      expect(product.name, product.id).not.toMatch(forbidden)
    }
  })

  it('offers a choice of finish only where there is one: no product lists a single colour', () => {
    for (const product of CATALOG) {
      expect(product.colours.length === 0 || product.colours.length >= 2, product.id).toBe(true)
    }
  })

  it('keeps the states the shop exercises: sold out, a Sale price and a New badge', () => {
    expect(CATALOG.filter(product => product.soldOut).length).toBeGreaterThanOrEqual(1)
    expect(CATALOG.some(product => product.badge === 'New')).toBe(true)
    expect(CATALOG.some(product => product.compareAtPrice !== undefined && product.compareAtPrice > product.price)).toBe(true)
  })

  // Every product's photo is a file rendered from its 3D model (`node tools/renders.mjs` in
  // spike/), at a path derived from the product id. A product added to the catalogue with no row
  // in the model table (`scene/products.js`, held by `scene/products.test.ts`), or with a row
  // and no render run, would otherwise show a broken image on its card and its page.
  // Mutation: add a product to SOURCE in catalog.ts and render nothing -> fails, naming its id.
  it('gives every product a photo that exists on disk, at the path its id derives', () => {
    // A real directory read (the same helper the Overview's source scan uses), so this is the
    // files on disk and not a list somebody keeps.
    const onDisk = sourceFiles(['public/media/products'], /\.webp$/).map(file => file.path)
    for (const product of CATALOG) {
      expect(product.image?.src, product.id).toBe(`/media/products/${product.id}.webp`)
      expect(onDisk, `${product.id}: public${product.image!.src} is missing`).toContain(`public${product.image!.src}`)
    }
  })

  // The picture sits beside the product's name, which is the text that names it (ProductCard's
  // own stated policy): a second copy of the name in `alt` would be read out twice.
  it('marks every product photo decorative, with an empty alt', () => {
    for (const product of CATALOG) expect(product.image?.alt, product.id).toBe('')
  })
})

describe('the Kestrel C operator kit', () => {
  it('is made only of products the catalogue has', () => {
    for (const part of KIT.parts) {
      expect(findProduct(part.productId), part.productId).toBeDefined()
      expect(part.quantity).toBeGreaterThan(0)
    }
  })

  // The catalogue document's figures: EUR 189.00 for the kit against EUR 309.80 bought
  // separately, 39% less. The second number is a sum over the parts' own prices, never typed.
  // Mutation: change any kit part's price in catalog.ts by one cent -> fails on 30980.
  it('costs 189.00 against 309.80 bought separately, which is 39% less', () => {
    expect(KIT.price).toBe(18900)
    expect(kitSeparatePrice()).toBe(30980)
    expect(kitSaving()).toBe(39)
  })

  // "Buy kit" on the homepage puts this product in the cart, so it has to be a real one.
  // Mutation: type `compareAtPrice: 30000` into KIT_PRODUCT in catalog.ts -> fails on the sum.
  it('is itself a catalogue product, priced and described from its parts', () => {
    const kit = findProduct(KIT.id)
    expect(kit).toBeDefined()
    expect(kit!.id).toBe('kestrel-c-kit')
    expect(kit!.name).toBe('Kestrel C operator kit, carbine replica')
    expect(kit!.category).toBe('replicas')
    expect(kit!.price).toBe(KIT.price)
    expect(kit!.compareAtPrice).toBe(kitSeparatePrice())
    expect(kit!.soldOut).toBe(false)
    // One line per part, named as the catalogue names it, with the count where there is one.
    expect(kit!.inTheBox).toHaveLength(KIT.parts.length)
    expect(kit!.inTheBox).toContain('Kestrel C carbine replica')
    expect(kit!.inTheBox).toContain('2 × Amber magazine, 48 BBs')
    expect(kit!.inTheBox).toContain('3 × Precision BBs 0.28 g, 2,700')
  })

  it('does not contain itself', () => {
    expect(KIT.parts.map(part => part.productId)).not.toContain(KIT.id)
  })

  // The hero's sentence states two counts in words. They are checked against the parts here
  // because nothing else would notice the sentence and the kit drifting apart.
  // Mutation: change `magazine-amber`'s quantity to 3 in KIT.parts -> fails on "3 magazines"
  // (and the price test above fails with it).
  it('has the three magazines and three bottles the homepage sentence promises', () => {
    const quantity = (prefix: string) =>
      KIT.parts.filter(part => part.productId.startsWith(prefix)).reduce((sum, part) => sum + part.quantity, 0)
    expect(HOME.hero.savingTail).toContain(`${quantity('magazine-')} magazines`)
    expect(HOME.hero.savingTail).toContain(`${quantity('bbs-')} bottles`)
    expect(quantity('magazine-')).toBe(3)
    expect(quantity('bbs-')).toBe(3)
  })
})

describe('the store copy outside the catalogue', () => {
  it('has no homepage, Care or field-guide copy that trips the vocabulary matcher', () => {
    expect(banned(JSON.stringify(HOME)), 'HOME').toEqual([])
    expect(banned(JSON.stringify(CARE)), 'CARE').toEqual([])
    for (const post of JOURNAL_POSTS) {
      expect(banned(JSON.stringify(post)), post.slug).toEqual([])
    }
  })

  it('has four field guides, and a guide for every category but tactical', () => {
    expect(JOURNAL_POSTS).toHaveLength(4)
    expect(guideForCategory('replicas')?.slug).toBe('cleaning-after-a-field-day')
    expect(guideForCategory('optics')?.slug).toBe('fitting-an-optic-to-a-rail')
    expect(guideForCategory('ammo')?.slug).toBe('choosing-bb-weight')
    expect(guideForCategory('parts')?.slug).toBe('battery-care-and-storage')
    expect(guideForCategory('tactical')).toBeUndefined()
  })
})
