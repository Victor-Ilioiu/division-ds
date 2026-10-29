import { useState, type ReactNode } from 'react'
import { Check, Copy } from 'lucide-react'
import { PageHeader } from '../../components/docs/PageChrome'
import { IconButton } from '../../components/atoms/icon-button/IconButton'
import { Link } from '../../components/atoms/link/Link'
import { SectionHeading } from '../../components/molecules/section-heading/SectionHeading'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/molecules/tabs/Tabs'
import { useToast } from '../../components/molecules/toast/Toast'
import { REGISTRY, REPO, REPO_SLUG, SKILL_INSTALL } from '../../links'

const FONTS =
  '<link href="https://fonts.googleapis.com/css2?family=Oxanium:wght@300;400;600;700&family=Saira:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet" />'

const APP_ROOT = `<TooltipProvider>
  <Toaster>
    <div className="[--page-gutter:1rem] lg:[--page-gutter:4rem] min-h-screen bg-[var(--color-surface-base)] text-[var(--color-text-primary)] font-body">
      {/* your routes */}
    </div>
  </Toaster>
</TooltipProvider>`

/** A command in a box, with a button that copies it. The copy is confirmed twice: the icon turns
 *  into a tick, and a toast says so for anyone who cannot see the icon change. */
/** Copies `text` and confirms with a toast; `copied` flips back after a moment. */
export function useCopy(text: string, label: string) {
  const { toast } = useToast()
  const [copied, setCopied] = useState(false)
  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      toast({ title: `Copied: ${label}` })
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      toast({ tone: 'warning', title: 'Copying is blocked here. Select the text and copy it yourself.' })
    }
  }
  return { copied, copy }
}

export function CopyCommand({ command, label }: { command: string; label: string }) {
  const { copied, copy } = useCopy(command, label)
  return (
    <div className="flex max-w-3xl items-start gap-2 border border-[var(--color-border-hairline)] bg-[var(--color-surface-sunken)] py-2 pl-4 pr-2">
      <pre className="min-w-0 flex-1 whitespace-pre-wrap break-all py-1 font-mono text-sm text-[var(--color-text-primary)]">
        <code>{command}</code>
      </pre>
      <IconButton label={`Copy ${label}`} variant="ghost" size="sm" onClick={copy}>
        {copied ? <Check /> : <Copy />}
      </IconButton>
    </div>
  )
}

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <li className="flex flex-col gap-3">
      <p className="font-body text-base font-semibold text-[var(--color-text-primary)]">
        <span className="mr-2 font-mono text-[var(--color-accent-signal-text)]">{String(n).padStart(2, '0')}</span>
        {title}
      </p>
      {children}
    </li>
  )
}

const MCP_CONFIG = `{
  "mcpServers": {
    "division-ds": { "command": "npx", "args": ["-y", "division-ds@0.3.1", "mcp"] }
  }
}`

// The eight tools `division-ds mcp` serves (scripts/lib/mcp-tools.mjs), in the order it lists them.
// Not a DescriptionList: its terms render in capitals, and a tool name is case-sensitive.
const MCP_TOOLS = [
  { term: 'list_components', description: 'Every component, with when to use it.' },
  { term: 'get_component', description: 'One component’s page: the import, props, keyboard, do and don’t, examples.' },
  { term: 'search', description: 'Components and tokens by what they are for: “page background”, “confirm delete”.' },
  { term: 'get_tokens', description: 'Token values, in both themes, and when to use each.' },
  { term: 'validate_code', description: 'The checks from step 3, on code the assistant has just written.' },
  { term: 'check_contrast', description: 'Whether two colours or tokens are readable together, in both themes (WCAG 2.2 AA).' },
  { term: 'get_add_command', description: 'The command that installs a component.' },
  { term: 'get_review_checklist', description: 'What to check in the browser before a screen is done.' },
] as const

// The five ways in, in page order. `id` is the <section>'s, not the heading's: the section takes
// focus on arrival (tabIndex -1), so a keyboard reader who follows a link continues from there
// instead of from the top of the page.
const PATHS = [
  { id: 'skill', title: 'Give your assistant the skill', summary: 'One command, and your AI assistant knows the components and the rules.' },
  { id: 'components', title: 'Add components to your project', summary: 'Copy the code into a React 19 and Tailwind 4 app, then four one-time steps.' },
  { id: 'check', title: 'Check your screens', summary: 'Find raw colours, invented tokens and wrong props before you ship.' },
  { id: 'mcp', title: 'Connect your assistant to the system', summary: 'The docs and the checks as tools your assistant calls while it works.' },
  { id: 'local', title: 'Run the whole system locally', summary: 'The docs, the three demos and every check, on your computer.' },
] as const

const SECTION = 'flex scroll-mt-8 flex-col gap-6 outline-none'

const prose = 'max-w-3xl font-body text-base text-[var(--color-text-secondary)]'

export function InstallGuideline() {
  return (
    <div className="max-w-4xl">
      <PageHeader
        eyebrow={
          <>
            Guidelines <span className="text-[var(--color-accent-signal-text)]">· Install</span>
          </>
        }
        title="Install it your way"
        lede="Give your AI coding assistant the skill, add components to a project you already have, let the assistant check its own work, or run the whole system on your own computer. Each command below has a copy button."
      />

      <nav aria-label="Ways to install" className="mt-10">
        <p className="mb-4 font-mono text-xs uppercase tracking-wider text-[var(--color-text-secondary)]">Pick what you need</p>
        <ol role="list" className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {PATHS.map((path, i) => (
            <li key={path.id} className="flex">
              {/* A plain anchor, not a router Link: a jump within this page, not a route change. */}
              <a
                href={`#${path.id}`}
                className="group flex flex-1 flex-col gap-1 border border-[var(--color-border-hairline)] bg-[var(--color-surface-raised)] p-4 transition-control hover:border-[var(--color-accent-signal-text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
              >
                <span className="font-body text-base font-semibold text-[var(--color-text-primary)]">
                  <span className="mr-2 font-mono text-[var(--color-accent-signal-text)]">{String(i + 1).padStart(2, '0')}</span>
                  {path.title}
                </span>
                <span className="font-body text-sm text-[var(--color-text-secondary)]">{path.summary}</span>
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="mt-16 flex flex-col gap-16">
        <section id="skill" tabIndex={-1} className={SECTION} aria-labelledby="install-skill">
          <SectionHeading
            id="install-skill"
            level={2}
            index={1}
            title="Give your assistant the skill"
            description="The skill teaches an AI coding assistant which component and token to use, the rules the prop types cannot express, and how to check its own work. Install it once per project, or for every project."
          />
          <Tabs defaultValue="any">
            <TabsList aria-label="Your assistant">
              <TabsTrigger value="any">Any assistant</TabsTrigger>
              <TabsTrigger value="claude">Claude Code plugin</TabsTrigger>
              <TabsTrigger value="manual">By hand</TabsTrigger>
            </TabsList>
            <TabsContent value="any" className="flex flex-col gap-4 pt-6">
              <p className={prose}>
                Works with Claude Code, Cursor, Codex and other assistants that read skills. It asks which of the
                assistants on your computer should get it. Add <code className="font-mono text-sm">-g</code> to
                install it for every project instead of this one.
              </p>
              <CopyCommand label="the skill install command" command={SKILL_INSTALL} />
              <p className={prose}>
                An AI assistant or a script cannot answer its questions: add{' '}
                <code className="font-mono text-sm">-y</code> to skip them, or{' '}
                <code className="font-mono text-sm">-a</code> followed by an assistant&apos;s name to choose it yourself.
              </p>
            </TabsContent>
            <TabsContent value="claude" className="flex flex-col gap-4 pt-6">
              <p className={prose}>Type these two lines into Claude Code, one after the other.</p>
              <CopyCommand label="the add marketplace command" command={`/plugin marketplace add ${REPO_SLUG}`} />
              <CopyCommand label="the plugin install command" command="/plugin install division-ds@division-ds" />
            </TabsContent>
            <TabsContent value="manual" className="flex flex-col gap-4 pt-6">
              <p className={prose}>
                Copy the <code className="font-mono text-sm">skills/division-ds</code> folder from the{' '}
                <Link href={REPO}>repository</Link> into your assistant&apos;s skills folder. For Claude Code that is{' '}
                <code className="font-mono text-sm">.claude/skills/</code> in your project, or{' '}
                <code className="font-mono text-sm">~/.claude/skills/</code> for every project.
              </p>
            </TabsContent>
          </Tabs>
        </section>

        <section id="components" tabIndex={-1} className={SECTION} aria-labelledby="install-components">
          <SectionHeading
            id="install-components"
            level={2}
            index={2}
            title="Add components to your project"
            description="Each component installs on its own. The code is copied into src/division-ds/ in your project, where it is yours to change, and whatever it needs comes with it: other components, the tokens, the helpers."
          />
          <ol className="flex flex-col gap-8">
            <Step n={1} title="Add a component">
              <p className={prose}>
                Swap <code className="font-mono text-sm">button</code> for any component&apos;s name in lowercase with
                hyphens, such as <code className="font-mono text-sm">data-table</code>. The{' '}
                <Link href={`${REGISTRY}/registry.json`}>registry index</Link> lists all 67. No{' '}
                <code className="font-mono text-sm">components.json</code> is needed.
              </p>
              <CopyCommand label="the add Button command" command={`npx shadcn@latest add ${REGISTRY}/button.json`} />
              <p className={prose}>Or every component at once:</p>
              <CopyCommand label="the add everything command" command={`npx shadcn@latest add ${REGISTRY}/division-ds-all.json`} />
            </Step>
            <Step n={2} title="Import the styles, once">
              <p className={prose}>
                In your main CSS file, on the line after <code className="font-mono text-sm">@import &quot;tailwindcss&quot;;</code>.
                Adjust the path if that file is not in <code className="font-mono text-sm">src/</code>.
              </p>
              <CopyCommand label="the styles import" command={'@import "./division-ds/styles/division-ds.css";'} />
            </Step>
            <Step n={3} title="Load the typefaces, once">
              <p className={prose}>
                In the <code className="font-mono text-sm">&lt;head&gt;</code> of your{' '}
                <code className="font-mono text-sm">index.html</code>. Without them the text falls back to a system font.
              </p>
              <CopyCommand label="the font link" command={FONTS} />
            </Step>
            <Step n={4} title="Give your app a root, once">
              <p className={prose}>
                The two providers toasts and tooltips need, the page gutter, the background and the body font. Navbar,
                Footer and the <code className="font-mono text-sm">px-gutter</code> utility read{' '}
                <code className="font-mono text-sm">--page-gutter</code>, the page&apos;s side margin: 16px, and 64px from
                1024px wide. Import <code className="font-mono text-sm">TooltipProvider</code> and{' '}
                <code className="font-mono text-sm">Toaster</code> from their files under{' '}
                <code className="font-mono text-sm">src/division-ds/components/</code>.
              </p>
              <CopyCommand label="the app root" command={APP_ROOT} />
            </Step>
          </ol>
          <p className={prose}>
            Your project needs React 19 and Tailwind CSS 4. A new Vite app has no Tailwind yet:{' '}
            <Link href="https://tailwindcss.com/docs/installation/using-vite">add it first</Link>, so your CSS file
            has the <code className="font-mono text-sm">@import &quot;tailwindcss&quot;;</code> line step 2 goes after. Dark is the default theme; for light, set{' '}
            <code className="font-mono text-sm">data-theme=&quot;light&quot;</code> on{' '}
            <code className="font-mono text-sm">&lt;html&gt;</code>.
          </p>
        </section>

        <section id="check" tabIndex={-1} className={SECTION} aria-labelledby="install-check">
          <SectionHeading
            id="install-check"
            level={2}
            index={3}
            title="Check your screens"
            description="Run it from your project before you call a screen done. It finds a raw colour, a token name that does not exist, two buttons with no space between them, a prop the component does not take and a value it does not accept, and says what to write instead. You need Node.js 22 or newer."
          />
          <CopyCommand label="the check command" command="npx division-ds check src" />
          <p className={prose}>
            It reads the code, not the running page. How the screen behaves is still yours to try in a browser.
          </p>
        </section>

        <section id="mcp" tabIndex={-1} className={SECTION} aria-labelledby="install-mcp">
          <SectionHeading
            id="install-mcp"
            level={2}
            index={4}
            title="Connect your assistant to the system"
            description="An MCP server (Model Context Protocol: the way AI assistants plug into outside tools) gives your assistant the documentation and the checks as tools it calls by itself while it works. It looks a component up before using it, and checks each screen before it says it is done."
          />
          <Tabs defaultValue="claude">
            <TabsList aria-label="Your assistant">
              <TabsTrigger value="claude">Claude Code</TabsTrigger>
              <TabsTrigger value="other">Cursor and others</TabsTrigger>
            </TabsList>
            <TabsContent value="claude" className="flex flex-col gap-4 pt-6">
              <p className={prose}>Run this once in a terminal. It is ready the next time you start Claude Code.</p>
              <CopyCommand label="the MCP add command" command="claude mcp add division-ds -- npx -y division-ds@0.3.1 mcp" />
            </TabsContent>
            <TabsContent value="other" className="flex flex-col gap-4 pt-6">
              <p className={prose}>
                Add this to your assistant&apos;s MCP settings. For Cursor that is{' '}
                <code className="font-mono text-sm">.cursor/mcp.json</code> in your project.
              </p>
              <CopyCommand label="the MCP settings" command={MCP_CONFIG} />
            </TabsContent>
          </Tabs>
          <p className={prose}>The tools it gets:</p>
          <ul className="flex max-w-3xl flex-col gap-3">
            {MCP_TOOLS.map(tool => (
              <li key={tool.term} className={prose}>
                <code className="font-mono text-sm text-[var(--color-text-primary)]">{tool.term}</code>: {tool.description}
              </li>
            ))}
          </ul>
        </section>

        <section id="local" tabIndex={-1} className={SECTION} aria-labelledby="install-local">
          <SectionHeading
            id="install-local"
            level={2}
            index={5}
            title="Run the whole system locally"
            description="The documentation, the three demos and every check, on your own computer. You need Git and Node.js 22 or newer."
          />
          <ol className="flex flex-col gap-8">
            <Step n={1} title="Copy the repository and install it">
              <CopyCommand label="the clone and install commands" command={`git clone ${REPO}.git\ncd division-ds\nnpm install`} />
            </Step>
            <Step n={2} title="Start it">
              <p className={prose}>Open the address it prints. The demos are at /demo, /crm and /console.</p>
              <CopyCommand label="the start command" command="npm run dev" />
            </Step>
            <Step n={3} title="Check everything">
              <p className={prose}>Types, every build gate and the unit tests, in one command.</p>
              <CopyCommand label="the check command" command="npm run verify" />
            </Step>
          </ol>
        </section>
      </div>
    </div>
  )
}
