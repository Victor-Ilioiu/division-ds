/**
 * The store's disclaimer, in its one exact form. Every page that shows a product states it, and
 * the vocabulary gate (`scripts/lib/vocabulary.mjs`) lets the real-world word through only inside
 * this wording, so a reworded copy of the sentence fails the build.
 */
export const DISCLAIMER = 'Airsoft replicas for sport. Not firearms.'

/**
 * Hexline's own copy for the homepage: the hero's offer, then one entry per section under it, in
 * page order. These are fictional store claims for a concept store -- the fourth house rule
 * states plainly that nothing here is for sale. Which products a section shows is not copy and is not here: it
 * is a rule over the catalogue, in `store/selections.ts`.
 */
export const HOME = {
  /**
   * The hero's own words: the offer on the Kestrel C operator kit. What is NOT here is anything
   * the catalogue already states, because a second copy drifts: the replica's name, the kit's
   * price, the bought-separately price and the saving all come from `store/catalog.ts`
   * (`findProduct`, `KIT`, `kitSeparatePrice`, `kitSaving`), and `HomeHero.tsx` puts the computed
   * saving between `savingLead` and `savingTail`. `catalog.test.ts` checks the two counts this
   * sentence does state (magazines, bottles) against the kit's parts.
   */
  hero: {
    offer: 'Premium offer',
    kitLabel: 'Operator kit',
    savingLead: 'The complete kit is',
    savingTail:
      'than buying each part on its own: Prism holo sight, Mute 235 mock suppressor, 3 magazines, 3 bottles of 2,700 BBs, camo foregrip, rail light and a spare battery.',
    specs: 'Electric replica · 720 mm · 20 mm rails on four sides · 1.0 J with 0.20 g BBs · 48-BB magazine',
    dragHint: 'Drag the replica to rotate',
    assemble: 'Assemble',
    disassemble: 'Disassemble',
    /** The busy label a screen reader hears while the sequence runs. */
    working: 'Working',
    buy: 'Buy kit',
    /** Replaces Assemble wherever the live scene does not run (see `HomeHero.tsx`). */
    seeKit: 'See the kit',
    loading: 'Loading the 3D scene',
  },
  replicas: {
    title: 'Top-rated replicas',
    description: 'Ranked by rating, then by how many people rated them.',
    action: 'All replicas',
  },
  offers: {
    title: 'Offers',
    description: 'Under their usual price while stock lasts. The usual price is struck through on each card.',
  },
  categories: {
    title: 'Shop by category',
    description: 'Five categories. The count on each is what the shop lists behind it.',
    action: 'All products',
  },
  accessories: {
    title: 'Top-rated accessories',
    description: 'Optics and parts, ranked by rating.',
    action: 'All accessories',
  },
  rules: {
    title: 'House rules',
    description: 'What the store holds itself to, and what it is.',
    action: { label: 'Read the field guides', href: '/demo/journal' },
    /** `link` is optional: a rule that points somewhere says where, in `label`, and `note` is the
     *  sentence beside the link. Only the fourth has one. */
    items: [
      {
        heading: 'Replicas, stated as replicas',
        body: 'Every Kestrel takes 6 mm BBs and lists its muzzle energy in joules, so you know it passes your site before you order.',
      },
      {
        heading: 'One rail, one battery, one magazine',
        body: 'Sights, grips and lights clamp to every Kestrel rail, and the same magazine and stick battery run all three.',
      },
      {
        heading: 'Serviced, not replaced',
        body: 'A Care plan covers a chrono check, a tune, and a loaner replica while yours is on the bench.',
      },
      {
        // The fourth card is about the store itself (Victor, 2026-10-02). The case study it
        // links to is not written yet: the address is the portfolio it will be published on,
        // and `note` says so, so the link makes no promise the page behind it does not keep.
        heading: 'A concept, stated as one',
        body: 'Hexline is a concept store, built to show the Division design system at work. Nothing here is for sale.',
        link: {
          label: 'Read the case study',
          href: 'https://victor-ilioiu.vercel.app',
          note: 'Coming soon: until it is published, the link opens the portfolio it will be on.',
        },
      },
    ] as { heading: string; body: string; link?: { label: string; href: string; note: string } }[],
  },
}

/**
 * The newsletter sign-up, which the Footer carries on every page (it was the homepage's sixth
 * section until 2026-10-02): the heading over it, and the words `NewsletterForm` is given.
 */
export const NEWSLETTER = {
  title: 'Field notes by email',
  description: 'One email a month: the new field guide, and which sold-out replicas are back.',
  /** The form's accessible name. */
  label: 'Newsletter sign-up',
  /** The field's label. Not plain "Email": the Footer is on the sign-in, create-account, reset
   *  and checkout pages too, each of which has an "Email" field of its own. */
  field: 'Email for field notes',
  consent: 'One email a month, and an unsubscribe link in every one. This is a demo store: nothing is sent.',
  submit: 'Subscribe',
  busy: 'Subscribing',
  successTitle: 'You are subscribed',
}

/**
 * Hexline Care: a fictional tech-service plan for the concept store, read by `Pricing.tsx`. A
 * feature's `tiers` map is the one source both the comparison table and each tier card's own
 * feature list read from, so a plan's coverage can never drift between the two views of the same
 * data.
 */
export type CareFeature = { name: string; tiers: Record<CareTierId, boolean> }
export type CareTierId = 'basic' | 'field' | 'squad'
export type CareTier = {
  id: CareTierId
  name: string
  /** In cents. The monthly rate; the annual rate is ten of these (two months free). */
  monthlyPrice: number
  supportChannel: string
  recommended?: boolean
}

export const CARE = {
  title: 'Hexline Care',
  lede: 'A tech-service plan for the replicas you already own: a chrono check, a tune and upgrade fitting, billed monthly or annually.',
  billingLabel: 'Bill annually (2 months free)',
  tiers: [
    { id: 'basic', name: 'Basic', monthlyPrice: 400, supportChannel: 'Email support' },
    { id: 'field', name: 'Field', monthlyPrice: 900, supportChannel: 'Chat support', recommended: true },
    { id: 'squad', name: 'Squad', monthlyPrice: 1500, supportChannel: 'Phone support' },
  ] satisfies CareTier[],
  features: [
    { name: 'Chrono check with every service', tiers: { basic: true, field: true, squad: true } },
    { name: 'Field guides library', tiers: { basic: true, field: true, squad: true } },
    { name: 'Priority restock alerts', tiers: { basic: false, field: true, squad: true } },
    { name: 'One annual tune and maintenance service', tiers: { basic: false, field: true, squad: true } },
    { name: 'Loaner replica while yours is in service', tiers: { basic: false, field: false, squad: true } },
    { name: 'Upgrade fitting, 48-hour turnaround', tiers: { basic: false, field: false, squad: true } },
  ] satisfies CareFeature[],
  faq: [
    {
      question: 'What does Care actually cover?',
      answer: 'Workshop time on the replicas you own: a chrono check in joules, cleaning, a gearbox and hop-up tune, and fitting the upgrade parts you buy. Parts themselves are charged at shop price.',
    },
    {
      question: 'Can I cancel any time?',
      answer: 'A monthly plan ends at the close of the current billing month. An annual plan is billed once a year and does not refund early.',
    },
    {
      question: 'How fast is a service turned around?',
      answer: 'Basic and Field are serviced in the order they arrive. Squad guarantees upgrade fitting inside 48 hours and a loaner replica while yours is away.',
    },
    {
      question: 'Does Care cover loss or theft?',
      answer: 'No -- Care is a service plan, not insurance. It covers the upkeep of the replicas you still have.',
    },
    {
      question: 'Can I change tiers later?',
      answer: 'Yes. An upgrade or downgrade takes effect from your next billing date, whichever plan you started on.',
    },
  ],
}

/**
 * The product page's 3D viewer: every word a visitor reads or hears about it. The viewer opens by
 * itself over the product's cutout where it can work (`ProductMedia.tsx`).
 *
 * `label` is the text alternative of the viewer itself: the canvas inside it is decoration, so
 * the product's name and what can be done with the model are stated here. `instructions` is the
 * same help, visible under the viewer, for everyone. It names every way in: the pointer, the
 * keyboard, and the one wheel gesture that zooms (a plain wheel scrolls the page, as it should).
 */
export const PRODUCT_VIEWER = {
  loading: 'Loading the 3D model',
  label: (productName: string) => `${productName}: 3D model, drag or use arrow keys to rotate`,
  instructions:
    'Drag to rotate. With the model focused: arrow keys rotate, plus and minus zoom, Home resets the view. Hold Ctrl and scroll, or pinch, to zoom.',
  /** Added where the product is sold in more than one colour: the model has one finish. */
  oneFinish: 'The model shows one finish, whichever colour you choose.',
  unavailable: 'The 3D view is unavailable. The picture above is a still.',
  controls: 'View controls',
  rotateLeft: 'Rotate left',
  rotateRight: 'Rotate right',
  zoomIn: 'Zoom in',
  zoomOut: 'Zoom out',
  reset: 'Reset view',
}
