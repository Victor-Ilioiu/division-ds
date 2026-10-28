import { useEffect, useRef, useState } from 'react'
import { Button } from '../components/atoms/button/Button'
import { Card, CardBody, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/molecules/card/Card'
import type { DockSchedule } from './assistant'

/**
 * An MCP app inside the assistant's reply: a card from another product (Dockline, invented), shown
 * inline the way Claude or ChatGPT show one. The host names the app above it; the app keeps to the
 * inline limits (two actions at most, no scrolling, no menus), which `data-host-mode="inline"` puts
 * under `division-ds check`.
 *
 * Simulated, like the rest of this assistant: a real MCP app is a page an MCP server sends and the
 * host renders in a sandboxed frame, passing its style variables. Halden is built on Division DS
 * too, so the `data-host="mcp"` adapter falls back to Division's own values and the card looks
 * native; the Host apps guideline page shows it under another host's look.
 */
export function DocklineApp({ schedule }: { schedule: DockSchedule }) {
  const [reminded, setReminded] = useState(false)
  const status = useRef<HTMLParagraphElement>(null)
  // The button removes itself, so focus moves to what replaced it instead of dropping to the page.
  useEffect(() => {
    if (reminded) status.current?.focus()
  }, [reminded])
  return (
    <section data-host="mcp" aria-label={`${schedule.app} app`} className="flex flex-col gap-2">
      <p className="font-mono text-xs uppercase tracking-wider text-[var(--color-text-secondary)]">App · {schedule.app}</p>
      <Card data-host-mode="inline">
        <CardHeader>
          <CardTitle>{schedule.dock}: deliveries today</CardTitle>
          <CardDescription>Cold room 2 opens onto this dock.</CardDescription>
        </CardHeader>
        <CardBody>
          <ol className="flex flex-col gap-1 font-body text-sm">
            {schedule.deliveries.map(delivery => (
              <li key={delivery.time} className="flex gap-3">
                <span className="font-mono tabular-nums text-[var(--color-text-secondary)]">{delivery.time}</span>
                <span>{delivery.load}</span>
              </li>
            ))}
          </ol>
        </CardBody>
        <CardFooter className="flex flex-wrap items-center gap-3">
          {reminded ? null : (
            <Button size="sm" onClick={() => setReminded(true)}>
              Remind the dock team at each delivery
            </Button>
          )}
          <p ref={status} tabIndex={-1} role="status" className="outline-none font-body text-sm text-[var(--color-text-secondary)]">
            {reminded ? `Reminders set for ${schedule.deliveries.length} deliveries: close the door between pallets.` : ''}
          </p>
        </CardFooter>
      </Card>
    </section>
  )
}
