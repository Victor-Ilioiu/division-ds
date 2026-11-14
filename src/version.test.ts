import { describe, expect, it } from 'vitest'
import changelog from '../CHANGELOG.md?raw'
import { DS_VERSION } from './version'

describe('DS_VERSION', () => {
  it('matches the newest release heading in CHANGELOG.md', () => {
    const top = changelog.match(/^## (\d+\.\d+\.\d+(?:-[\w.]+)?)/m)?.[1]
    expect(DS_VERSION).toBe(top)
  })
})
