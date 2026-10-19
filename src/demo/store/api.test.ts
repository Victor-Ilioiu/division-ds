import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { CheckoutOrder } from '../../components/organisms/checkout-form/CheckoutForm'
import { CATALOG, findProduct } from './catalog'
import {
  ApiError,
  setLatency,
  signIn,
  verifyCode,
  requestPasswordReset,
  createAccount,
  saveOnboarding,
  saveProfile,
  placeOrder,
  subscribeToNewsletter,
  type HexlineProfile,
  type OnboardingPrefs,
} from './api'

beforeEach(() => setLatency(0))

const PREFS: OnboardingPrefs = { activities: ['woodland'], size: 'M', newsletter: false, serviceReminders: true }
const PROFILE: HexlineProfile = { name: 'Rae Fielding', defaultSize: 'M', newsletter: false, serviceReminders: true, bio: '' }

function orderWith(postalCode: string, email = 'rae@hexline.test'): CheckoutOrder {
  return {
    email,
    name: 'Rae Fielding',
    phone: '+353 1 234 5678',
    shipping: { line1: '1 Trailhead Road', line2: '', city: 'Brasov', postalCode, country: 'RO' },
    deliveryId: 'standard',
    billing: 'same-as-shipping',
    total: 6900,
  }
}

describe('catalog', () => {
  it('has 22 products with unique ids, each href matching /demo/shop/:id', () => {
    expect(CATALOG).toHaveLength(22)
    expect(new Set(CATALOG.map(product => product.id)).size).toBe(22)
    CATALOG.forEach(product => {
      expect(product.href).toBe(`/demo/shop/${product.id}`)
    })
  })

  it('pins the bump helmet variants, a sold-out product, a compareAtPrice product, optics >= 2, soldOut consistent with stock', () => {
    const helmet = findProduct('bump-helmet')
    expect(helmet).toBeDefined()
    expect(helmet?.sizes).toEqual(['S/M', 'M/L'])
    expect(helmet?.colours.length).toBeGreaterThanOrEqual(2)

    expect(CATALOG.some(product => product.stock === 0)).toBe(true)
    expect(CATALOG.some(product => product.compareAtPrice !== undefined)).toBe(true)
    expect(CATALOG.filter(product => product.category === 'optics').length).toBeGreaterThanOrEqual(2)

    CATALOG.forEach(product => {
      // A choice of finish is a choice: one colour would ask for a pick nobody can make.
      expect(product.colours.length === 0 || product.colours.length >= 2).toBe(true)
      expect(product.soldOut).toBe(product.stock === 0)
    })
  })
})
describe('signIn', () => {
  it('needs a code for the right password', async () => {
    await expect(signIn('rae@hexline.test', 'hexline')).resolves.toEqual({ needsCode: true })
  })

  it('returns a field error for any other password', async () => {
    await expect(signIn('rae@hexline.test', 'wrong')).resolves.toEqual({
      errors: { password: expect.any(String) },
    })
  })

  it('rejects for the offline trigger email', async () => {
    await expect(signIn('offline@hexline.test', 'hexline')).rejects.toBeInstanceOf(ApiError)
  })

  it('matches the offline trigger regardless of case or surrounding whitespace', async () => {
    await expect(signIn('  Offline@HexLine.TEST  ', 'hexline')).rejects.toBeInstanceOf(ApiError)
  })
})

describe('verifyCode', () => {
  it('succeeds only for 123456, naming the user from the email local-part', async () => {
    await expect(verifyCode('rae@hexline.test', '123456')).resolves.toEqual({
      user: { name: 'Rae', email: 'rae@hexline.test' },
    })
  })

  it('rejects every other code with the same message', async () => {
    await expect(verifyCode('rae@hexline.test', '000000')).resolves.toEqual({
      errors: { code: 'That code is not right. Check your app and try again.' },
    })
    await expect(verifyCode('rae@hexline.test', '111111')).resolves.toEqual({
      errors: { code: 'That code is not right. Check your app and try again.' },
    })
  })

  it('rejects for the offline trigger email', async () => {
    await expect(verifyCode('offline@hexline.test', '123456')).rejects.toBeInstanceOf(ApiError)
  })
})

describe('requestPasswordReset', () => {
  it('resolves the same way for a used and an unused address', async () => {
    await expect(requestPasswordReset('rae@hexline.test')).resolves.toBeUndefined()
    await expect(requestPasswordReset('nobody@hexline.test')).resolves.toBeUndefined()
  })

  it('still rejects for the offline trigger email', async () => {
    await expect(requestPasswordReset('offline@hexline.test')).rejects.toBeInstanceOf(ApiError)
  })
})

describe('createAccount', () => {
  it('creates the account with the name the form collected', async () => {
    await expect(
      createAccount({ name: 'Rae Fielding', email: 'rae@hexline.test', password: 'hexline' })
    ).resolves.toEqual({ user: { name: 'Rae Fielding', email: 'rae@hexline.test' } })
  })

  it('rejects an already-registered email', async () => {
    await expect(
      createAccount({ name: 'Rae Fielding', email: 'taken@hexline.test', password: 'hexline' })
    ).resolves.toEqual({ errors: { email: expect.any(String) } })
  })

  it('rejects for the offline trigger email', async () => {
    await expect(
      createAccount({ name: 'Rae Fielding', email: 'offline@hexline.test', password: 'hexline' })
    ).rejects.toBeInstanceOf(ApiError)
  })

  it('matches the already-registered trigger regardless of case or surrounding whitespace', async () => {
    await expect(
      createAccount({ name: 'Rae Fielding', email: '  Taken@HexLine.TEST  ', password: 'hexline' })
    ).resolves.toEqual({ errors: { email: expect.any(String) } })
  })
})

describe('saveOnboarding', () => {
  it('resolves for a normal email', async () => {
    await expect(saveOnboarding('rae@hexline.test', PREFS)).resolves.toBeUndefined()
  })

  it('rejects for the onboarding-fails trigger even though account creation succeeded', async () => {
    await expect(saveOnboarding('onboarding-fails@hexline.test', PREFS)).rejects.toBeInstanceOf(ApiError)
  })

  it('rejects for the offline trigger email', async () => {
    await expect(saveOnboarding('offline@hexline.test', PREFS)).rejects.toBeInstanceOf(ApiError)
  })
})

describe('saveProfile', () => {
  it('resolves for a normal email', async () => {
    await expect(saveProfile('rae@hexline.test', PROFILE)).resolves.toBeUndefined()
  })

  it('rejects for the profile-fails trigger email', async () => {
    await expect(saveProfile('profile-fails@hexline.test', PROFILE)).rejects.toBeInstanceOf(ApiError)
  })

  it('rejects for the offline trigger email', async () => {
    await expect(saveProfile('offline@hexline.test', PROFILE)).rejects.toBeInstanceOf(ApiError)
  })
})

describe('placeOrder', () => {
  it('resolves an order number and advances the counter by one on success', async () => {
    const first = await placeOrder(orderWith('D02 X285'))
    const second = await placeOrder(orderWith('D02 X285'))
    const n1 = Number(first.orderNumber.replace('HX-', ''))
    const n2 = Number(second.orderNumber.replace('HX-', ''))
    expect(first.orderNumber).toMatch(/^HX-\d{6}$/)
    expect(n2).toBe(n1 + 1)
  })

  it('rejects the reserved postal code and does not advance the counter', async () => {
    const before = await placeOrder(orderWith('D02 X285'))
    const n1 = Number(before.orderNumber.replace('HX-', ''))
    await expect(placeOrder(orderWith('00000'))).rejects.toBeInstanceOf(ApiError)
    const after = await placeOrder(orderWith('D02 X285'))
    const n2 = Number(after.orderNumber.replace('HX-', ''))
    expect(n2).toBe(n1 + 1)
  })

  it('rejects for the offline trigger email', async () => {
    await expect(placeOrder(orderWith('D02 X285', 'offline@hexline.test'))).rejects.toBeInstanceOf(ApiError)
  })
})

describe('setLatency', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    setLatency(0)
  })

  it('falls back to 400ms for a non-finite value', async () => {
    setLatency(Number.NaN)
    let settled = false
    void signIn('rae@hexline.test', 'hexline').then(() => {
      settled = true
    })
    await vi.advanceTimersByTimeAsync(399)
    expect(settled).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    expect(settled).toBe(true)
  })

  it('clamps into the 0-5000 range', async () => {
    setLatency(-5)
    let settledLow = false
    void signIn('rae@hexline.test', 'hexline').then(() => {
      settledLow = true
    })
    await vi.advanceTimersByTimeAsync(0)
    expect(settledLow).toBe(true)

    setLatency(9999)
    let settledHigh = false
    void signIn('rae@hexline.test', 'hexline').then(() => {
      settledHigh = true
    })
    await vi.advanceTimersByTimeAsync(4999)
    expect(settledHigh).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    expect(settledHigh).toBe(true)
  })
})

describe('window.__hexlineLatency override', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    setLatency(0)
  })

  afterEach(() => {
    vi.useRealTimers()
    delete window.__hexlineLatency
    setLatency(0)
  })

  it('falls back to the module latency when the override is NaN', async () => {
    setLatency(50)
    window.__hexlineLatency = Number.NaN
    let settled = false
    void signIn('rae@hexline.test', 'hexline').then(() => {
      settled = true
    })
    await vi.advanceTimersByTimeAsync(49)
    expect(settled).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    expect(settled).toBe(true)
  })

  it('clamps a negative override to 0', async () => {
    window.__hexlineLatency = -5
    let settled = false
    void signIn('rae@hexline.test', 'hexline').then(() => {
      settled = true
    })
    await vi.advanceTimersByTimeAsync(0)
    expect(settled).toBe(true)
  })

  it('clamps an override above 5000 down to 5000', async () => {
    window.__hexlineLatency = 9999
    let settled = false
    void signIn('rae@hexline.test', 'hexline').then(() => {
      settled = true
    })
    await vi.advanceTimersByTimeAsync(4999)
    expect(settled).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    expect(settled).toBe(true)
  })
})

describe('subscribeToNewsletter', () => {
  it('accepts any address', async () => {
    await expect(subscribeToNewsletter('rae@hexline.test')).resolves.toBeUndefined()
  })

  it('rejects for the offline trigger email, whatever its case or padding', async () => {
    await expect(subscribeToNewsletter('offline@hexline.test')).rejects.toBeInstanceOf(ApiError)
    await expect(subscribeToNewsletter('  Offline@HexLine.TEST ')).rejects.toBeInstanceOf(ApiError)
  })
})
