import type { CheckoutOrder } from '../../components/organisms/checkout-form/CheckoutForm'

declare global {
  interface Window {
    /** Set by e2e (`page.addInitScript`) to override the demo's own latency for that page. */
    __hexlineLatency?: number
  }
}

/** Rejected requests carry this so callers can tell a simulated failure from a bug. */
export class ApiError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

export type OnboardingPrefs = {
  activities: string[]
  size: string
  newsletter: boolean
  serviceReminders: boolean
}

export type HexlineProfile = {
  name: string
  defaultSize: string
  newsletter: boolean
  serviceReminders: boolean
  bio: string
}

const OFFLINE_EMAIL = 'offline@hexline.test'
const TAKEN_EMAIL = 'taken@hexline.test'
const ONBOARDING_FAILS_EMAIL = 'onboarding-fails@hexline.test'
const PROFILE_FAILS_EMAIL = 'profile-fails@hexline.test'
/** Exported so the demo's own Checkout page can tell this rejection apart from any other
 *  `ApiError` `placeOrder` might throw (an offline trigger, say) and give it a message that says
 *  how to fix it, rather than matching on `error.message` text. */
export const REJECTED_POSTAL_CODE = '00000'
const VALID_PASSWORD = 'hexline'
const VALID_CODE = '123456'
const CODE_ERROR = 'That code is not right. Check your app and try again.'

let latencyMs = 400

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

/** How long the next call waits before resolving or rejecting. Tests set it to 0. A non-finite
 *  value (NaN, Infinity -- e.g. a stray `Number(input)` upstream) falls back to the module's own
 *  default instead of feeding `setTimeout` a value it would silently coerce into something else. */
export function setLatency(ms: number): void {
  latencyMs = Number.isFinite(ms) ? clamp(ms, 0, 5000) : 400
}

/** A page can widen or shrink latency without touching the module's own state, so e2e specs
 *  set it per navigation instead of racing setLatency across pages. */
function effectiveLatency(): number {
  const override = typeof window === 'undefined' ? undefined : window.__hexlineLatency
  return Number.isFinite(override) ? clamp(override as number, 0, 5000) : latencyMs
}

function delay(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, effectiveLatency()))
}

/** Every trigger email is matched this way, never with a bare `===`: a demo input that differs
 *  only by case or surrounding whitespace ("Offline@Hexline.test ", pasted from somewhere) is
 *  still the same address to a person, and should still hit the same simulated failure. */
function isTrigger(email: string, trigger: string): boolean {
  return email.trim().toLowerCase() === trigger
}

/** The email local-part, first letter capitalised: what sign-in shows for a user it never
 *  collected a name from. */
function nameFromEmail(email: string): string {
  const local = email.split('@')[0] ?? email
  return local.charAt(0).toUpperCase() + local.slice(1)
}

export async function signIn(
  email: string,
  password: string
): Promise<{ needsCode: true } | { errors: { password: string } }> {
  await delay()
  if (isTrigger(email, OFFLINE_EMAIL)) throw new ApiError('Network unavailable')
  if (password !== VALID_PASSWORD) {
    return { errors: { password: 'That password is not right.' } }
  }
  return { needsCode: true }
}

export async function verifyCode(
  email: string,
  code: string
): Promise<{ user: { name: string; email: string } } | { errors: { code: string } }> {
  await delay()
  if (isTrigger(email, OFFLINE_EMAIL)) throw new ApiError('Network unavailable')
  if (code !== VALID_CODE) {
    return { errors: { code: CODE_ERROR } }
  }
  return { user: { name: nameFromEmail(email), email } }
}

/** Never reveals whether the address exists: it resolves the same way whether or not anyone is
 *  actually behind that inbox. `offline@hexline.test` is not an exception to that promise; it
 *  simulates the request never reaching the server at all. */
export async function requestPasswordReset(email: string): Promise<void> {
  await delay()
  if (isTrigger(email, OFFLINE_EMAIL)) throw new ApiError('Network unavailable')
}

export async function createAccount(v: {
  name: string
  email: string
  password: string
}): Promise<{ user: { name: string; email: string } } | { errors: { email: string } }> {
  await delay()
  if (isTrigger(v.email, OFFLINE_EMAIL)) throw new ApiError('Network unavailable')
  if (isTrigger(v.email, TAKEN_EMAIL)) {
    return { errors: { email: 'That email is already registered.' } }
  }
  return { user: { name: v.name, email: v.email } }
}

export async function saveOnboarding(email: string, _prefs: OnboardingPrefs): Promise<void> {
  await delay()
  if (isTrigger(email, OFFLINE_EMAIL)) throw new ApiError('Network unavailable')
  if (isTrigger(email, ONBOARDING_FAILS_EMAIL)) throw new ApiError('Could not save your preferences.')
}

/** Settings' own Save. Never persists anything itself -- it only simulates the network round
 *  trip, the same shape `saveOnboarding` already has; the page decides what "saved" means
 *  locally (`hexline-profile`, and the session's own display name through `updateName`). */
export async function saveProfile(email: string, _profile: HexlineProfile): Promise<void> {
  await delay()
  if (isTrigger(email, OFFLINE_EMAIL)) throw new ApiError('Network unavailable')
  if (isTrigger(email, PROFILE_FAILS_EMAIL)) throw new ApiError('Could not save your profile.')
}

/** The Footer's newsletter sign-up. Stores nothing and sends nothing: it waits the way a
 *  request would, then accepts any address except the offline trigger, which rejects so the
 *  form's failure state is reachable on demand. */
export async function subscribeToNewsletter(email: string): Promise<void> {
  await delay()
  if (isTrigger(email, OFFLINE_EMAIL)) throw new ApiError('Network unavailable')
}

let orderCounter = 100231

export async function placeOrder(order: CheckoutOrder): Promise<{ orderNumber: string }> {
  await delay()
  if (isTrigger(order.email, OFFLINE_EMAIL)) throw new ApiError('Network unavailable')
  if (order.shipping.postalCode === REJECTED_POSTAL_CODE) {
    throw new ApiError('We could not place your order. Check your shipping address and try again.')
  }
  const orderNumber = `HX-${orderCounter}`
  orderCounter += 1
  return { orderNumber }
}
