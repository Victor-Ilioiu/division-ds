import { defineConfig, devices } from '@playwright/test'

// Configurable so later milestones can run e2e from more than one git worktree at once, each
// against its own dev server: a hard-coded 5474 would make a second worktree's run either fail
// to bind (`--strictPort`) or, worse, silently attach to the FIRST worktree's server and test the
// wrong checkout. Every reference to the port below reads this one constant; nothing else in this
// file names 5474 directly. `E2E_PORT` unset keeps today's default.
const port = Number(process.env.E2E_PORT ?? 5474)

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  // Capped, not unbounded: all tests hit one shared dev server (the webServer below), and too
  // many concurrent navigations against a single Vite instance caused intermittent
  // "Execution context was destroyed" flakes, not real accessibility violations. Lowered from 4
  // to 3 (Milestone G4c): the same dev server also intermittently hit Windows' own per-process
  // ephemeral-port ceiling under 4 concurrent workers (ERR_NO_BUFFER_SPACE on a fresh navigation,
  // not a real defect), and 3 gave the same wall-clock time within noise while removing it.
  workers: 3,
  reporter: 'list',
  use: {
    baseURL: `http://127.0.0.1:${port}`,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // A dedicated port, dedicated to this run: 5473 is `npm run dev`'s port, and a developer often
    // has it open with edits in flight. Sharing it meant e2e took that server's HMR reloads and
    // dep re-optimizations mid-run — a real edit landing between a page load and an assertion, not
    // a real accessibility violation, but the axe check and the console-error fixture couldn't
    // tell the difference. `DIVISION_E2E=1` (read in vite.config.ts) turns HMR off for this
    // server's lifetime; `reuseExistingServer: false` means every run gets a clean one.
    // `--host 127.0.0.1` pins the server to IPv4 only: Vite's default host resolves `localhost` to
    // whatever the OS prefers, and on a dual-stack machine that can be `::1` while Chrome tries
    // `127.0.0.1` (or the reverse), so a request that lands on the address the server isn't
    // listening on comes back `ERR_CONNECTION_REFUSED` instead of connecting. Pinning both the
    // server and the URLs below to the same literal IPv4 address is a precaution against a
    // possible cause of an intermittent refusal, not a confirmed fix.
    command: `npx vite --port ${port} --strictPort --host 127.0.0.1`,
    url: `http://127.0.0.1:${port}`,
    env: { DIVISION_E2E: '1' },
    reuseExistingServer: false,
  },
})
