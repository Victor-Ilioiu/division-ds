import { PageHeader, SectionHeading, docsLabel, docsProse } from '../../components/docs/PageChrome'
import { Badge } from '../../components/atoms/badge/Badge'
import { Button } from '../../components/atoms/button/Button'
import { Input } from '../../components/atoms/input/Input'
import { Card, CardBody, CardDescription, CardFooter, CardHeader, CardTitle } from '../../components/molecules/card/Card'
import './host-sim.css'

/** An inline card inside the limits: two data points, two actions, nothing that scrolls or pops. */
function OrderCard() {
  return (
    <Card data-host-mode="inline">
      <CardHeader>
        <CardTitle>Order 4021</CardTitle>
        <CardDescription>Two replicas, ships from the north depot.</CardDescription>
      </CardHeader>
      <CardBody className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="ok">Paid</Badge>
          <Badge tone="warning">Awaiting stock</Badge>
        </div>
        <Input aria-label="Delivery note" placeholder="Delivery note" />
      </CardBody>
      <CardFooter>
        <Button size="sm" variant="ghost">
          Details
        </Button>
        <Button size="sm">Confirm</Button>
      </CardFooter>
    </Card>
  )
}

const code = 'font-mono text-xs'

export function HostAppsGuideline() {
  return (
    <div className="max-w-4xl">
      <PageHeader
        eyebrow={
          <>
            Guidelines <span className="text-[var(--color-accent-signal-text)]">· Host apps</span>
          </>
        }
        title="Inside Claude and ChatGPT"
        lede="An MCP App is a screen that a chat host shows inside the conversation, in a sandboxed frame. The host sends its own colours and font. One attribute makes the components take them."
      />

      <section>
        <SectionHeading>The same card, two looks</SectionHeading>
        <p className={`${docsProse} mb-6 max-w-2xl`}>
          On the left, Division as it ships. On the right, the same card under{' '}
          <code className={code}>data-host="mcp"</code>, inside a wrapper that sets the colour
          variables Claude publishes. Surfaces, borders, quiet text, status text, the focus ring
          and the font come from the host. The orange primary button stays: the host guidelines
          leave accent colour to the app.
        </p>
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <p className={`${docsLabel} mb-3 text-[var(--color-text-muted)]`}>Division</p>
            <OrderCard />
          </div>
          <div>
            <p className={`${docsLabel} mb-3 text-[var(--color-text-muted)]`}>Simulated host</p>
            <div className="host-sim p-4 font-body" data-host="mcp">
              <OrderCard />
            </div>
          </div>
        </div>
      </section>

      <section>
        <SectionHeading>Turn it on</SectionHeading>
        <ol className={`${docsProse} list-decimal pl-5 space-y-2 max-w-2xl`}>
          <li>
            Put <code className={code}>data-host="mcp"</code> on <code className={code}>&lt;html&gt;</code>{' '}
            in the app's page. Nothing changes outside an element that carries it.
          </li>
          <li>
            Apply the host's variables with <code className={code}>useHostStyles</code> from{' '}
            <code className={code}>@modelcontextprotocol/ext-apps/react</code>. It also sets{' '}
            <code className={code}>data-theme</code>, the same attribute Division's themes read, so
            the theme follows the host.
          </li>
          <li>
            Leave <code className={code}>html</code> and <code className={code}>body</code>{' '}
            transparent and add <code className={code}>&lt;meta name="color-scheme" content="light dark"&gt;</code>,
            so the conversation shows through.
          </li>
        </ol>
        <p className={`${docsProse} mt-4 max-w-2xl`}>
          A variable the host does not send falls back to Division's own value. Primary and
          secondary text need no mapping: the host's variables have the same names, so inside a host
          they change with or without the attribute. That is why the attribute matters: without it,
          the host's text colour lands on Division's surfaces.
        </p>
      </section>

      <section>
        <SectionHeading>Inline cards</SectionHeading>
        <p className={`${docsProse} max-w-2xl`}>
          Both hosts show a compact card in the conversation that grows to its content. Mark it{' '}
          <code className={code}>&lt;Card data-host-mode="inline"&gt;</code> and{' '}
          <code className={code}>division-ds check</code> holds it to their limits: at most two
          actions, nothing inside that scrolls, and no menu, select, tooltip or dialog, which the
          frame would clip. A task that needs more goes fullscreen.
        </p>
      </section>
    </div>
  )
}
