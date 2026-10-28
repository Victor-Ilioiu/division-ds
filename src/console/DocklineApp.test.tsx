import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { DocklineApp } from './DocklineApp'

const schedule = {
  app: 'Dockline',
  dock: 'Brennick, dock 2',
  deliveries: [
    { time: '11:30', load: 'Dairy, 6 pallets' },
    { time: '14:15', load: 'Fresh produce, 9 pallets' },
  ],
}

describe('DocklineApp', () => {
  it('is named as an app, under the host adapter, with an inline card', () => {
    render(<DocklineApp schedule={schedule} />)
    const app = screen.getByRole('region', { name: 'Dockline app' })
    expect(app).toHaveAttribute('data-host', 'mcp')
    expect(app.querySelector('[data-host-mode="inline"]')).not.toBeNull()
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
  })

  it('sets the reminders and says so', async () => {
    render(<DocklineApp schedule={schedule} />)
    await userEvent.click(screen.getByRole('button', { name: 'Remind the dock team at each delivery' }))
    expect(screen.getByRole('status')).toHaveTextContent('Reminders set for 2 deliveries')
    expect(screen.queryByRole('button')).toBeNull()
    expect(screen.getByRole('status')).toHaveFocus()
  })
})
