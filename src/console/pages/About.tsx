import type { ReactNode } from 'react'
import { Link, linkVariants } from '../../components/atoms/link/Link'
import { Link as RouterLink } from 'react-router-dom'
import { Card, CardBody, CardTitle } from '../../components/molecules/card/Card'
import { PageHeader } from '../../components/molecules/page-header/PageHeader'
import { SectionHeading } from '../../components/molecules/section-heading/SectionHeading'
import { WORKSPACE } from '../data'
import { REPO, SKILL_INSTALL } from '../../links'

/** The case study this page points to. An ordinary external link: it opens in the same tab. */
export const CASE_STUDY_URL = 'https://victor-ilioiu.vercel.app/work/division-ds'

/** Every Division DS component Halden Console imports, counted from the import lines under
 *  src/console (named imports matched against public/manifest/components.json), this page's Card
 *  included. Recount when a page starts or stops using one. */
export const CONSOLE_COMPONENTS = [
  'Alert', 'ApprovalRequest', 'Avatar', 'Badge', 'Breadcrumbs', 'Button', 'Card', 'ChartPanel', 'ChatMessage',
  'ChatThread', 'CommandPalette', 'DataTable', 'DescriptionList', 'EmptyState', 'FormField', 'IconButton', 'Kbd',
  'Link', 'ListItem', 'PageHeader', 'PromptInput', 'SectionHeading', 'SegmentedControl', 'Select', 'Sheet',
  'Sidebar', 'Skeleton', 'Sparkline', 'Spinner', 'Stat', 'StatusTracker', 'Textarea', 'Timeline', 'Toast',
  'ToolCall', 'Tooltip',
]

const PROMPTS = [
  {
    title: 'A live overview',
    text: 'Using the division-ds skill, build a monitoring overview for warehouse sensors: Stat figures for open alerts, and one card per site with a Sparkline of the last readings and its safe range. Readings update every five seconds. Add a Live and Paused SegmentedControl in the top bar so people can stop the updates, and never announce a changing reading to screen readers.',
  },
  {
    title: 'An alerts table with bulk actions',
    text: 'Build an alerts page with a DataTable of alerts, a SegmentedControl to filter by open, acknowledged or resolved, and a Select for severity. People can select several rows and acknowledge them at once, with a Toast that has an Undo button. Plan the empty, loading and error states with commands/build.md first.',
  },
  {
    title: 'A site page with 30 days of status',
    text: 'Build a page for one warehouse site: PageHeader with Breadcrumbs back to the site list, a DescriptionList of the site facts, a StatusTracker of the last 30 days, a ChartPanel of the cold-room temperature, and a Timeline of the site alerts. Load the chart only when the page opens.',
  },
  {
    title: 'An assistant that asks before acting',
    text: 'Build an assistant panel with ChatThread, ChatMessage and PromptInput. It investigates an alert step by step, showing each step as a ToolCall, with Stop and Retry. Before anything leaves the conversation, such as an email, it shows an ApprovalRequest with a preview and waits for Approve or Reject. Label it clearly when no real AI model is called. Go through commands/review.md before saying it is done.',
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
    <div className="flex max-w-screen-xl flex-col gap-12">
      <PageHeader
        eyebrow={WORKSPACE}
        title="About this demo"
        description="What Halden Console is, how it was built with the Division DS design system, and how you could build something like it yourself."
      />

      <section className="flex flex-col gap-4" aria-labelledby="about-what">
        <SectionHeading level={2} id="about-what" title="What Halden Console is" />
        <p className={P}>
          Halden Console is a made-up monitoring app. Halden Systems, an invented company, sells sensors that watch
          temperature, humidity, doors and power in its customers' warehouses, and this is the screen its operations team watches them
          from. Every site, sensor and reading is invented, the live feed is simulated, and your changes reset when the
          page reloads.
        </p>
        <p className={P}>
          You're signed in as Noor Aziz, an operations engineer. Overview shows every monitored site as it reads now,
          with new readings every five seconds and a Live and Paused switch to stop them. Sites lists the warehouses, one
          row per site, and each site has its own page with its facts, its sensors and a temperature chart. Alerts lists
          every alert from the last seven days and the ones raised live, which you can acknowledge one at a time or
          several at once. The Assistant investigates an alert from the readings, the door log and the equipment, and
          asks before it acts. It's a scripted demo: no AI model is called.
        </p>
      </section>

      <section className="flex flex-col gap-4" aria-labelledby="about-built">
        <SectionHeading level={2} id="about-built" title="How it was built with Division DS" />
        <p className={P}>
          Division DS is a design system: a shared kit of ready-made interface parts, called components (a button, a
          form field, a table), plus the rules for using them. Every screen in Halden Console is put together from
          those components. It uses {CONSOLE_COMPONENTS.length} of them:
        </p>
        <p className={`${P} text-[var(--color-text-secondary)]`}>{CONSOLE_COMPONENTS.join(', ')}.</p>
        <p className={P}>
          It follows the system's rules. Every colour is a token, a named value such as{' '}
          <code>--color-text-primary</code> that stands for a colour in both the light and the dark theme, so the code
          never contains a raw colour value. Buttons never touch each other. Scripts called gates check these rules
          automatically, and the project won't pass its checks if one fails. Halden Console shares no code with the
          other two demos: it has its own layout, its own data and its own tests.
        </p>
        <p className={P}>
          Halden Console was built AI-natively, which means an AI (artificial intelligence) coding assistant wrote the
          code while a designer directed and reviewed it. The assistant was Claude Code, a tool from Anthropic that reads
          and edits a project from the terminal (the text window where you type commands). It was built with the
          division-ds skill and the project's <code>AGENTS.md</code> rules already in the repository. A skill is a
          folder of instructions an AI assistant loads when a task needs it; this one is in{' '}
          <code>skills/division-ds</code>. Building the console also added nine components to the system: Sparkline,
          StatusTracker, SegmentedControl, DescriptionList, ChatMessage, ChatThread, PromptInput, ToolCall and
          ApprovalRequest.
        </p>
      </section>

      <section className="flex flex-col gap-6" aria-labelledby="about-prompts">
        <SectionHeading
          level={2}
          id="about-prompts"
          title="Example prompts"
          description="A prompt is the instruction you type to an AI coding assistant. These would get you screens like Halden Console's."
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
              Open the local address it prints in a browser. Halden Console is at <code>/console</code>.
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
            <Command>node scripts/division-ds.mjs check src/console</Command>
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
              accessibility scan of every page.
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
