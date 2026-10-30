import type { ReactNode } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import {
  ArrowRight,
  Blocks,
  Bot,
  Contrast,
  Layers,
  Moon,
  PackageCheck,
  ScanSearch,
  Server,
} from 'lucide-react'
import { FloorGrid } from '../hero/FloorGrid'
import { Badge } from '../../components/atoms/badge/Badge'
import { Button } from '../../components/atoms/button/Button'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../../components/molecules/accordion/Accordion'
import { ChatMessage } from '../../components/molecules/chat-message/ChatMessage'
import { SectionHeading } from '../../components/molecules/section-heading/SectionHeading'
import { Stat } from '../../components/molecules/stat/Stat'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/molecules/tabs/Tabs'
import { ToolCall } from '../../components/molecules/tool-call/ToolCall'
import { ChatThread } from '../../components/organisms/chat-thread/ChatThread'
import { cn } from '../../lib/cn'
import { CodeBlock } from '../../components/molecules/code-block/CodeBlock'
import { Panel } from '../../components/atoms/panel/Panel'
import { CabinetHero } from '../hero/CabinetHero'

// Every figure here is read from the repository: 74 components in public/manifest/components.json;
// the token layers from public/manifest/tokens.json (66 primitive colours plus 8 spacing and
// 6 motion steps, 39 semantic, 26 component); 8 MCP tools listed in AGENTS.md.
const FIGURES = [
  { label: 'Components', value: 74 },
  { label: 'Semantic tokens', value: 39 },
  { label: 'Component tokens', value: 26 },
  { label: 'MCP tools', value: 8 },
]

type Feature = { icon: ReactNode; title: string; body: string; span: string; tone?: 'signal' | 'raised' | 'base' }

// A bento of eight: two wide cells for what sets the system apart, six narrow ones. Rows add up to
// six columns at lg (4+2, 2+2+2, 2+2+2), two at sm, one on a phone.
const FEATURES: Feature[] = [
  {
    icon: <Bot aria-hidden="true" />,
    title: 'Docs written for agents',
    body: 'llms.txt, a page per component with props and examples, a single DESIGN.md and a skill for coding assistants. All of it is generated from the component code, so it does not drift.',
    span: 'lg:col-span-4',
    tone: 'signal',
  },
  {
    icon: <Blocks aria-hidden="true" />,
    title: '74 components',
    body: 'From Button to DataTable, CheckoutForm and a chat thread with tool calls. React 19, Tailwind 4 and Radix underneath.',
    span: 'lg:col-span-2',
  },
  {
    icon: <Layers aria-hidden="true" />,
    title: 'Tokens in three layers',
    body: 'Primitive ramps feed 39 semantic tokens, which feed 26 component tokens. A gate fails the build when a screen skips a layer.',
    span: 'lg:col-span-2',
  },
  {
    icon: <Moon aria-hidden="true" />,
    title: 'Light and dark',
    body: 'One attribute on the html element switches the theme. A screen built from tokens needs no theme code. Try the toggle in the top bar.',
    span: 'lg:col-span-2',
  },
  {
    icon: <Contrast aria-hidden="true" />,
    title: 'WCAG 2.2 AA',
    body: 'Every colour pair is checked for contrast on each build. Focus rings, target sizes, labels and keyboard behaviour live in the components.',
    span: 'lg:col-span-2',
    tone: 'raised',
  },
  {
    icon: <PackageCheck aria-hidden="true" />,
    title: 'Install with shadcn',
    body: 'The components are source code you own. The shadcn CLI copies all of them, or one at a time, into src/division-ds/.',
    span: 'lg:col-span-2',
  },
  {
    icon: <Server aria-hidden="true" />,
    title: 'An MCP server',
    body: 'An agent can look up a component, search the docs, read the tokens, check contrast and validate the code it just wrote, through eight tools.',
    span: 'lg:col-span-2',
  },
  {
    icon: <ScanSearch aria-hidden="true" />,
    title: 'A checker on npm',
    body: 'npx division-ds check runs the colour, button-spacing and copy gates and checks props against the manifest. Each finding says what to write instead.',
    span: 'lg:col-span-2',
    tone: 'raised',
  },
]

const INSTALL_STEPS = [
  {
    value: 'skill',
    label: 'Skill',
    intro: 'Give your coding assistant the rules and the procedures for building, fixing and reviewing screens.',
    code: 'npx skills add https://github.com/Victor-Ilioiu/division-ds --skill division-ds',
    title: 'Terminal',
  },
  {
    value: 'components',
    label: 'Components',
    intro: 'Copy every component into your project with the shadcn CLI. Your project needs React 19 and Tailwind CSS 4.',
    code: 'npx shadcn@latest add https://raw.githubusercontent.com/Victor-Ilioiu/division-ds/main/public/r/division-ds-all.json',
    title: 'Terminal',
  },
  {
    value: 'mcp',
    label: 'MCP server',
    intro: 'Register the docs and the checks as tools in Claude Code. Any agent that speaks MCP can run the same command.',
    code: 'claude mcp add division-ds -- npx -y division-ds@0.4.0 mcp',
    title: 'Claude Code',
  },
  {
    value: 'check',
    label: 'Checker',
    intro: 'Check the screens you or your agent wrote. Exit code 1 means a finding. Needs Node 22 or newer.',
    code: 'npx division-ds check src/',
    title: 'Terminal',
  },
]

const LOOP = [
  { verb: 'Read', body: 'The agent reads the component page before it writes code.' },
  { verb: 'Write', body: 'It builds the screen from components and tokens only.' },
  { verb: 'Check', body: 'validate_code, or npx division-ds check, says what to change.' },
]

const EXAMPLES = [
  {
    title: 'Corvane CRM',
    body: 'A sales pipeline with deals, contacts, an activity timeline, sheets and dialogs.',
    to: '/crm',
    cta: 'Open the CRM',
  },
  {
    title: 'Hexline store',
    body: 'An airsoft replica shop with a three.js scene: press Assemble on its home page and a rifle replica fits together from its parts, and each product page has a 3D model you can turn and zoom. Also a catalogue, a cart and a checkout that never takes payment.',
    to: '/store',
    cta: 'Open the store',
  },
  {
    title: 'Halden Console',
    body: 'Live sensor monitoring: a simulated feed you can pause, alerts you acknowledge in bulk, sites charted over time and an assistant that waits for approval.',
    to: '/console',
    cta: 'Open the console',
  },
]

const FAQ = [
  {
    q: 'Is it a package I install from npm?',
    a: 'The components are not. They are source files that the shadcn CLI copies into your project, and you change them as you like. The npm package called division-ds holds the checker and the MCP server.',
  },
  {
    q: 'Which agents does it work with?',
    a: 'Anything that reads files can use llms.txt and the component pages. The skill installs for Claude Code, Codex and Cursor. The MCP server works with any client that supports MCP.',
  },
  {
    q: 'What does the checker look at?',
    a: 'Colours that are not tokens, buttons placed side by side with no gap, a list of words that read like generated copy, and props that a component does not have or values outside a prop\'s allowed set.',
  },
  {
    q: 'Are the store, the CRM and the console real?',
    a: 'No. Hexline, Corvane and Halden are made up, and so are their products, people, deals, sensors and numbers. They exist to show the components working together on realistic screens.',
  },
]

export function Home() {
  return (
    <div className="pb-24">
      {/* Hero: full width, copy on the left, the cabinet on the right */}
      <section
        aria-labelledby="hero-title"
        className="relative isolate overflow-hidden border-b border-[var(--color-border-hairline)] bg-[var(--color-surface-sunken)] [[data-theme=light]_&]:bg-[var(--color-surface-base)]"
      >
        <FloorGrid className="pointer-events-none absolute inset-0 -z-10 size-full opacity-80 [[data-theme=light]_&]:opacity-60" />
        <div className="mx-auto grid max-w-[90rem] grid-cols-1 items-center gap-10 px-gutter pt-12 pb-14 lg:grid-cols-2 lg:pt-20 lg:pb-20">
          <div className="anim-snap-in">
            <Badge tone="signal" emphasis="subtle">
              React 19, Tailwind 4, Radix
            </Badge>
            <h1 id="hero-title" className="mt-6 max-w-2xl font-display text-4xl font-semibold leading-[1.05] tracking-tight md:text-5xl">
              The design system your coding agent can read, use and check.
            </h1>
            <p className="mt-6 max-w-[34rem] text-lg leading-relaxed text-[var(--color-text-secondary)]">
              74 accessible components with docs, a skill and an MCP server, so AI builds screens that follow the rules.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <RouterLink to="/guidelines/install">Install it</RouterLink>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <RouterLink to="/components">Browse components</RouterLink>
              </Button>
            </div>
          </div>
          <CabinetHero className="mx-auto w-full max-w-[60rem] lg:-mr-16" />
        </div>
      </section>

      {/* The figures, in a plain band under the hero */}
      <section aria-label="Division DS in numbers" className="border-b border-[var(--color-border-hairline)]">
        {/* The hairlines are the 1px gaps showing the band's colour through, so a 2 x 2 grid on a phone
            and a single row of four both get even rules with no doubled or missing edge */}
        <div className="mx-auto grid max-w-[90rem] grid-cols-2 gap-px bg-[var(--color-border-hairline)] md:grid-cols-4">
          {FIGURES.map(f => (
            <div key={f.label} className="bg-[var(--color-surface-base)] px-gutter py-8 md:px-6 md:first:pl-gutter">
              <Stat label={f.label} value={f.value} />
            </div>
          ))}
        </div>
      </section>

      <div className="px-gutter">
        {/* Features: a bento */}
        <section aria-labelledby="features" className="mx-auto max-w-6xl pt-20 pb-12">
          <SectionHeading id="features" level={2} title="What is in it" description="Everything below ships in the repository today." />
          <ul role="list" className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
            {FEATURES.map(f => (
              <li key={f.title} className={cn('flex', f.span)}>
                <Panel tone={f.tone ?? 'base'} cut padding="lg" className="flex w-full flex-col gap-4">
                  <span className="text-[var(--color-accent-signal-text)] [&>svg]:size-6">{f.icon}</span>
                  <h3 className={cn('font-display font-semibold', f.tone === 'signal' ? 'text-2xl' : 'text-lg')}>{f.title}</h3>
                  <p className={cn('text-[var(--color-text-secondary)]', f.tone === 'signal' ? 'max-w-xl text-base' : 'text-sm')}>{f.body}</p>
                </Panel>
              </li>
            ))}
          </ul>
        </section>

        {/* Install: tabs beside a short pitch */}
        <section aria-labelledby="install" className="mx-auto grid max-w-6xl grid-cols-1 gap-10 py-16 lg:grid-cols-[18rem_minmax(0,1fr)]">
          <div>
            <h2 id="install" className="font-display text-3xl font-semibold tracking-tight">Set up in four commands</h2>
            <p className="mt-4 text-base text-[var(--color-text-secondary)]">
              Copied from the install guide and the checker's own help. Run them in your project's folder.
            </p>
          </div>
          <Tabs defaultValue="skill">
            <TabsList aria-label="Install steps" className="flex-wrap">
              {INSTALL_STEPS.map(step => (
                <TabsTrigger key={step.value} value={step.value}>
                  {step.label}
                </TabsTrigger>
              ))}
            </TabsList>
            {INSTALL_STEPS.map(step => (
              <TabsContent key={step.value} value={step.value} className="mt-4 space-y-3">
                <p className="max-w-2xl text-base text-[var(--color-text-secondary)]">{step.intro}</p>
                <CodeBlock code={step.code} label={`${step.label} command`} title={step.title} />
              </TabsContent>
            ))}
          </Tabs>
        </section>

        {/* The agent loop: three verbs across, the session under them */}
        <section aria-labelledby="agent" className="mx-auto max-w-6xl py-16">
          <SectionHeading
            id="agent"
            level={2}
            title="What a session with an agent looks like"
            description="An example written for this page. The tool names are the ones the MCP server exposes; the prompt and the replies are illustrative."
          />
          <ol className="mt-10 grid grid-cols-1 gap-px overflow-hidden border border-[var(--color-border-hairline)] bg-[var(--color-border-hairline)] md:grid-cols-3">
            {LOOP.map(step => (
              <li key={step.verb} className="bg-[var(--color-surface-base)] p-6">
                <p className="font-display text-2xl font-semibold text-[var(--color-accent-signal-text)]">{step.verb}</p>
                <p className="mt-2 text-base text-[var(--color-text-secondary)]">{step.body}</p>
              </li>
            ))}
          </ol>
          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <ChatThread label="Example agent session" className="h-[34rem] border border-[var(--color-border-hairline)]">
              <ChatMessage role="user" author="You">
                Build a settings screen for notification preferences with Division DS. Email and push on separate
                switches, a digest frequency, and a Save button.
              </ChatMessage>
              <ChatMessage role="assistant" author="Assistant">
                <p>I'll look up the components first so the props are right.</p>
                <div className="mt-3 space-y-2">
                  <ToolCall
                    name="get_component"
                    title="Read the Switch page"
                    status="done"
                    input={<code className="font-mono text-sm">{'{ "name": "Switch" }'}</code>}
                    output="Switch is not a FormField child: give it an id and a label with htmlFor. It acts right away; for a choice saved with the form, use Checkbox."
                  />
                  <ToolCall
                    name="get_component"
                    title="Read the Select page"
                    status="done"
                    input={<code className="font-mono text-sm">{'{ "name": "Select" }'}</code>}
                    output="Select goes inside a FormField, which supplies its label, help and error."
                  />
                </div>
                <p className="mt-3">
                  Since the screen has a Save button, the two channels are Checkboxes, not Switches. Writing the screen now,
                  then I'll validate it.
                </p>
              </ChatMessage>
              <ChatMessage role="assistant" author="Assistant">
                <ToolCall
                  name="validate_code"
                  title="Check NotificationSettings.tsx"
                  status="done"
                  input={<code className="font-mono text-sm">src/pages/NotificationSettings.tsx</code>}
                  output="1 finding: line 42 uses a Tailwind palette class for the text on a fill. Use the fill's ink token instead."
                />
                <p className="mt-3">
                  One finding: I put a palette class on the button text. Fixed it to the ink token and ran the check again;
                  it passes.
                </p>
              </ChatMessage>
            </ChatThread>
            <div className="space-y-4 self-end">
              <h3 className="font-display text-lg font-semibold">Put the rules in your repo</h3>
              <CodeBlock code="npx division-ds rules --target ." label="Install the rules into AGENTS.md" title="Terminal" />
              <p className="text-sm text-[var(--color-text-secondary)]">
                Writes the same rules into your project's AGENTS.md, GEMINI.md and Cursor rules.
              </p>
            </div>
          </div>
        </section>

        {/* Examples: one link panel per demo, in a row of three */}
        <section aria-labelledby="examples" className="mx-auto max-w-6xl py-16">
          <h2 id="examples" className="font-display text-3xl font-semibold tracking-tight">Built with it</h2>
          <div className="mt-8 grid grid-cols-1 gap-3 md:grid-cols-3">
            {EXAMPLES.map(ex => (
              <Panel key={ex.to} interactive cut padding="lg" asChild>
                <RouterLink to={ex.to} className="group flex min-h-56 flex-col justify-between">
                  <div>
                    <h3 className="font-display text-2xl font-semibold">{ex.title}</h3>
                    <p className="mt-3 max-w-md text-base text-[var(--color-text-secondary)]">{ex.body}</p>
                  </div>
                  <span className="mt-8 inline-flex items-center gap-2 font-semibold text-[var(--color-accent-signal-text)]">
                    {ex.cta}
                    <ArrowRight aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-1 motion-reduce:transition-none" />
                  </span>
                </RouterLink>
              </Panel>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section aria-labelledby="faq" className="mx-auto max-w-3xl py-16">
          <SectionHeading id="faq" level={2} title="Questions" />
          <Accordion type="single" collapsible className="mt-6">
            {FAQ.map(item => (
              <AccordionItem key={item.q} value={item.q}>
                <AccordionTrigger level={3}>{item.q}</AccordionTrigger>
                <AccordionContent>
                  <p className="text-base text-[var(--color-text-secondary)]">{item.a}</p>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>
      </div>
    </div>
  )
}
