import { ComponentDocs } from '../../docs/ComponentDocs'
import { meta } from './Card.meta'
import { Example } from '../../docs/Example'
import { Button } from '../../atoms'
import { Card, CardActions, CardBody, CardDescription, CardFooter, CardHeader, CardMedia, CardTitle } from './Card'

/** The stretched link an interactive card needs: the link is the name's own, its `::after` covers
 *  the card, and the focus ring is drawn there, around the whole card. The shape ProductCard uses. */
const STRETCHED =
  "outline-none hover:underline underline-offset-2 after:absolute after:inset-0 after:content-[''] focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-[var(--color-focus-ring)]"

function DepotLink({ title, note, href }: { title: string; note: string; href: string }) {
  return (
    <Card interactive className="h-full">
      <CardBody className="flex flex-col gap-1">
        <CardTitle>
          <a href={href} className={STRETCHED}>
            {title}
          </a>
        </CardTitle>
        <CardDescription>{note}</CardDescription>
      </CardBody>
    </Card>
  )
}

function Depot({ title = 'North field depot' }: { title?: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>Open until 18:00.</CardDescription>
      </CardHeader>
      <CardBody>Twelve kits ready for collection.</CardBody>
      <CardFooter>
        <Button size="sm" variant="ghost">
          Details
        </Button>
        <Button size="sm">Collect</Button>
      </CardFooter>
    </Card>
  )
}

export function CardDocs() {
  return (
    <ComponentDocs meta={meta}>
      <Example caption="Depot">
        <div className="max-w-sm w-full">
          <Depot />
        </div>
      </Example>

      <Example caption="With an image: edge to edge, no padding around it. The title already names the picture, so its alt text (the description a screen reader reads out) is empty">
        <div className="max-w-sm w-full">
          <Card>
            <CardMedia src="/media/hero-poster-960.webp" aspect="16/9" />
            <CardHeader className="pt-5">
              <CardTitle>Range hall depot</CardTitle>
              <CardDescription>Open until 18:00.</CardDescription>
            </CardHeader>
            <CardBody>Twelve kits ready for collection.</CardBody>
          </Card>
        </div>
      </Example>

      <Example caption="A row of three">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
          <Depot title="West site depot" />
          <Card>
            <CardHeader>
              <CardTitle>South gate depot</CardTitle>
              <CardDescription>Open until 20:00.</CardDescription>
            </CardHeader>
            <CardBody>Four kits ready for collection, three on order.</CardBody>
            <CardFooter>
              <Button size="sm" variant="ghost">
                Details
              </Button>
              <Button size="sm">Collect</Button>
            </CardFooter>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Harbour depot</CardTitle>
              <CardDescription>Closed today.</CardDescription>
            </CardHeader>
            <CardBody>Nothing ready. Next opening tomorrow, 08:00.</CardBody>
            <CardFooter>
              <Button size="sm" variant="secondary">
                Notify me
              </Button>
            </CardFooter>
          </Card>
        </div>
      </Example>

      <Example caption="Actions inside the content, no action bar: left-aligned, primary first, secondary after">
        <div className="max-w-sm w-full">
          <Card>
            <CardHeader>
              <CardTitle>Marsh depot</CardTitle>
              <CardDescription>Open until 17:00.</CardDescription>
            </CardHeader>
            <CardBody>
              Twelve kits ready for collection. Bring your booking number.
              <CardActions>
                <Button size="sm">Collect</Button>
                <Button size="sm" variant="secondary">
                  Details
                </Button>
              </CardActions>
            </CardBody>
          </Card>
        </div>
      </Example>

      <Example caption="Interactive: the whole card is one link. Hover over it, or press Tab to reach it">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
          <DepotLink title="Ridge depot" note="Open until 18:00. Twelve kits ready." href="#ridge-depot" />
          <DepotLink title="Quarry depot" note="Open until 20:00. Four kits ready." href="#quarry-depot" />
          <DepotLink title="Mill depot" note="Closed today. Opens tomorrow, 08:00." href="#mill-depot" />
        </div>
      </Example>

      <Example caption="As a section">
        <div className="max-w-sm w-full">
          <Card as="section">
            <CardHeader>
              <CardTitle level={2}>Totals</CardTitle>
              <CardDescription>This week, all depots.</CardDescription>
            </CardHeader>
            <CardBody>128 kits collected, 6 outstanding.</CardBody>
          </Card>
        </div>
      </Example>
    </ComponentDocs>
  )
}
