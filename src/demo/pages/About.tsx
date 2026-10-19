import type { ReactNode } from 'react'
import { Link, linkVariants } from '../../components/atoms/link/Link'
import { Link as RouterLink } from 'react-router-dom'
import { Card, CardBody, CardTitle } from '../../components/molecules/card/Card'
import { PageHeader } from '../../components/molecules/page-header/PageHeader'
import { SectionHeading } from '../../components/molecules/section-heading/SectionHeading'
import { DEFAULT_PAGE } from '../DefaultPage'
import { REPO, SKILL_INSTALL } from '../../links'

/** The case study this page points to. An ordinary external link: it opens in the same tab. */
export const CASE_STUDY_URL = 'https://victor-ilioiu.vercel.app/work/division-ds'

/** Every Division DS component Hexline imports, counted from the import lines under src/demo
 *  (named imports matched against public/manifest/components.json). Recount when a page starts or
 *  stops using one. */
export const HEXLINE_COMPONENTS = [
  'Alert', 'AlertDialog', 'AuthForm', 'Avatar', 'AvatarGroup', 'Badge', 'Breadcrumbs', 'Button', 'Card',
  'Carousel', 'Cart', 'ChartPanel', 'Checkbox', 'CheckoutForm', 'DataTable', 'DropdownMenu', 'EmptyState',
  'Footer', 'FormField', 'IconButton', 'Input', 'Link', 'ListItem', 'LoadingAnimation', 'MultiSelect',
  'Navbar', 'NewsletterForm', 'PageHeader', 'Pagination', 'ProductCard', 'QuantityStepper', 'Radio',
  'Rating', 'Search', 'SectionHeading', 'Select', 'Sheet', 'Sidebar', 'Skeleton', 'Slider', 'Spinner',
  'Stat', 'Stepper', 'Switch', 'Tabs', 'Tag', 'Textarea', 'Toast', 'Tooltip',
]

const PROMPTS = [
  {
    title: 'A shop page with filters',
    text: 'Using the division-ds skill, build a shop page for an airsoft store. Start with commands/build.md and list the regions and their states first. Use PageHeader for the title, Search and Select for the filters, a grid of ProductCard for the results, Pagination under the grid, and EmptyState when the filters match nothing. Keep the chosen filters in the address bar so a shared link opens the same results.',
  },
  {
    title: 'A cart that opens from the top bar',
    text: 'Add a cart button to the Navbar with IconButton. Its accessible name must say how many items are in the cart, for example "Cart, 2 items". It opens a Sheet that holds the Cart component. Removing an item shows a Toast. Use only colour tokens from public/llms-tokens.txt.',
  },
  {
    title: 'A checkout form that explains its errors',
    text: 'Build a checkout page with CheckoutForm. Every field sits in a FormField with a visible label. When the form is sent with mistakes, show an ErrorSummary at the top that links to each field, and keep the buttons apart by the gap the forms topic asks for. Run the division-ds check on the file when you are done.',
  },
  {
    title: 'A back-office stock table',
    text: 'Build an inventory screen for the shop staff: a row of Stat figures at the top, then a DataTable of products with sorting and row selection, and an action for the selected rows. Plan the empty, loading and error states before writing code, and go through commands/review.md before saying it is done.',
  },
]

const P = 'font-body text-base text-[var(--color-text-primary)] max-w-3xl'

function Command({ children }: { children: ReactNode }) {
  return (
    <pre className="whitespace-pre-wrap break-all font-mono text-sm text-[var(--color-text-primary)] bg-[var(--color-surface-sunken)] border border-[var(--color-border-hairline)] px-4 py-3 max-w-3xl">
      <code>{children}</code>
    </pre>
  )
}

function Step({ title, children }: { title: string; children: ReactNode }) {
  return (
    <li className="flex flex-col gap-2 pl-1">
      <p className="font-body text-base font-semibold text-[var(--color-text-primary)]">{title}</p>
      {children}
    </li>
  )
}

export function About() {
  return (
    <div className={`${DEFAULT_PAGE} py-12 flex flex-col gap-12`}>
      <PageHeader
        eyebrow="Hexline"
        title="About this demo"
        description="What Hexline is, how it was built with the Division DS design system, and how you could build something like it yourself."
      />

      <section className="flex flex-col gap-4" aria-labelledby="about-what">
        <SectionHeading level={2} id="about-what" title="What Hexline is" />
        <p className={P}>
          Hexline is a made-up online shop for airsoft, the team sport played with replicas that fire small plastic
          pellets. Nothing here is for sale and no order is ever sent anywhere. It's a demo: a realistic place to put the
          design system to work.
        </p>
        <p className={P}>
          It's written for people shopping for airsoft kit, and for the shop's own staff. As a shopper you can browse the shop
          and filter it, open a product page, add items to the cart, go through checkout and see an order confirmation.
          You can create an account, sign in, set up your profile and look at your orders and settings. There are Field
          notes (short care guides) and Hexline Care, a made-up service plan with monthly and yearly prices. The staff
          side, linked from the footer, has a dashboard, an inventory table and settings.
        </p>
      </section>

      <section className="flex flex-col gap-4" aria-labelledby="about-built">
        <SectionHeading level={2} id="about-built" title="How it was built with Division DS" />
        <p className={P}>
          Division DS is a design system: a shared kit of ready-made interface parts, called components (a button, a
          form field, a table), plus the rules for using them. Every screen in Hexline is put together from those
          components. Hexline uses {HEXLINE_COMPONENTS.length} of them:
        </p>
        <p className={`${P} text-[var(--color-text-secondary)]`}>{HEXLINE_COMPONENTS.join(', ')}.</p>
        <p className={P}>
          It follows the system's rules. Every colour is a token, a named value such as{' '}
          <code>--color-text-primary</code> that stands for a colour in both the light and the dark theme, so the code
          never contains a raw colour value. Buttons never touch each other. Scripts called gates check these rules
          automatically, and the project won't pass its checks if one fails.
        </p>
        <p className={P}>
          Hexline was built AI-natively, which means an AI (artificial intelligence) coding assistant wrote the code
          while a designer directed and reviewed it. The assistant was Claude Code, a tool from Anthropic that reads and
          edits a project from the terminal (the text window where you type commands). Hexline came first, before the
          division-ds skill existed. It was built under the rules that now live in the project's <code>AGENTS.md</code>{' '}
          file, and the skill was later generated from those same rules. A skill is a folder of instructions an AI
          assistant loads when a task needs it; this one is in <code>skills/division-ds</code>.
        </p>
      </section>

      <section className="flex flex-col gap-6" aria-labelledby="about-prompts">
        <SectionHeading
          level={2}
          id="about-prompts"
          title="Example prompts"
          description="A prompt is the instruction you type to an AI coding assistant. These would get you screens like Hexline's."
        />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {PROMPTS.map(prompt => (
            <Card key={prompt.title}>
              <CardBody className="flex flex-col gap-3">
                <CardTitle level={3}>{prompt.title}</CardTitle>
                <p className="font-body text-sm text-[var(--color-text-secondary)]">{prompt.text}</p>
              </CardBody>
            </Card>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-6" aria-labelledby="about-guide">
        <SectionHeading
          level={2}
          id="about-guide"
          title="Build a similar project, step by step"
          description="From a copy of the project to a finished, checked product. Type each command in a terminal, inside the project's folder."
        />
        <ol className="flex flex-col gap-6 list-decimal pl-6 max-w-3xl marker:font-mono marker:text-[var(--color-text-secondary)]">
          <Step title="Get the tools">
            <p className={P}>
              Install Git, the tool that keeps a project's files and their history, and Node.js 22 or newer, which runs
              the project's scripts. Node.js comes with npm (Node Package Manager), which downloads the code libraries a
              project needs.
            </p>
          </Step>
          <Step title="Copy the project">
            <p className={P}>
              Copy the project from its Git repository (the online home of its files and history), then move into the
              folder it creates:
            </p>
            <Command>{`git clone ${REPO}.git
cd division-ds`}</Command>
          </Step>
          <Step title="Install what it needs">
            <Command>npm install</Command>
          </Step>
          <Step title="Start it on your computer">
            <Command>npm run dev</Command>
            <p className={P}>
              Open the local address it prints in a browser. Hexline is at <code>/demo</code>.
            </p>
          </Step>
          <Step title="Load the skill">
            <Command>{SKILL_INSTALL}</Command>
            <p className={P}>
              This gives your AI coding assistant the division-ds skill. The{' '}
              <RouterLink to="/guidelines/install" className={linkVariants()}>Install page</RouterLink> has the other ways, including a Claude Code plugin,
              and how to add single components to a project you already have. Inside this repository, Claude Code also
              reads <code>CLAUDE.md</code>, which sends it to <code>AGENTS.md</code> and its rules.
            </p>
          </Step>
          <Step title="Plan the screen before any code">
            <p className={P}>
              Follow <code>skills/division-ds/commands/build.md</code>. List the screen's regions from top to bottom, and
              for each one write what it shows when it's empty, loading, failed, successful, or not allowed. Then pick a
              component for each from <code>public/llms.txt</code>.
            </p>
          </Step>
          <Step title="Build it with prompts">
            <p className={P}>
              Ask for one screen at a time, naming the components and states from your plan, like the example prompts
              above.
            </p>
          </Step>
          <Step title="Check the files you wrote">
            <Command>node scripts/division-ds.mjs check src/demo</Command>
            <p className={P}>
              It flags a raw colour, a made-up token, buttons that touch, and a property a component doesn't have. In a different project, run the same script from your copy of this repository:{' '}
              <code>node path/to/division-ds/scripts/division-ds.mjs check</code> followed by your files or folders.
            </p>
          </Step>
          <Step title="Run every check and the unit tests">
            <Command>npm run verify</Command>
            <p className={P}>
              This checks the types, runs every gate and runs the unit tests (small automated tests of one piece at a
              time). It changes no files.
            </p>
          </Step>
          <Step title="Run the end-to-end tests">
            <Command>npm run test:e2e</Command>
            <p className={P}>
              End-to-end (e2e) tests open the real pages in a browser and use them the way a person would, including an
              accessibility scan of every page in both themes.
            </p>
          </Step>
          <Step title="Build the finished site">
            <Command>npm run build</Command>
            <p className={P}>
              This runs the gates again, then produces the files you'd put on a web server.
            </p>
          </Step>
        </ol>
      </section>

      <section className="flex flex-col gap-4" aria-labelledby="about-case-study">
        <SectionHeading level={2} id="about-case-study" title="The case study" />
        <p className={P}>
          The full story of Division DS, why it was made and how it was built for AI assistants as well as people, is in
          the{' '}
          <Link href={CASE_STUDY_URL}>Division design system case study</Link>.
        </p>
      </section>
    </div>
  )
}
