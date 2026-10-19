import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { axeClean } from './axe'

describe('test harness', () => {
  it('has jest-dom matchers', () => {
    const { container } = render(<button type="button">Deploy kit</button>)
    expect(container.querySelector('button')).toBeInTheDocument()
  })

  it('has an axe matcher that passes on clean markup', async () => {
    const { container } = render(<button type="button">Deploy kit</button>)
    expect(await axeClean(container)).toHaveNoViolations()
  })

  it('has an axe matcher that actually catches a real violation', async () => {
    const { container } = render(<img src="/x.png" />)
    const results = await axeClean(container)
    expect(results).not.toHaveNoViolations()
    expect(results.violations.map(v => v.id)).toContain('image-alt')
  })
})
