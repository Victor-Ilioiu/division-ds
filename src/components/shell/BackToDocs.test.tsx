import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { BackToDocs } from './BackToDocs'

describe('BackToDocs', () => {
  it('is a link named "Design system" to the docs home', () => {
    render(
      <MemoryRouter>
        <BackToDocs />
      </MemoryRouter>
    )
    const link = screen.getByRole('link', { name: 'Design system' })
    expect(link).toHaveAttribute('href', '/')
    expect(link.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })
})
