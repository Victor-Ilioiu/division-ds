# Changelog

## 0.14.0 — 2026-11-21

### Changed
- **Dialog: responsive sizes, after Carbon's modal scale.** `size` is now `'xs' | 'sm' | 'md' | 'lg'` and defaults to `'sm'`. Wide screen: xs 20rem, sm 32rem (the old default width, so a dialog with no `size` looks the same), md 42rem, lg 90% of the window. Below 640px, xs and sm stay floating cards, md fills the width inside a 16px margin and lg goes full screen. Header and body padding is 20px on phones. **Migration:** `size="md"` used to mean 32rem; pass `sm` to keep it. `size="sm"` used to be 24rem and is now 32rem; pass `xs` for a compact confirm.

### Docs site
- **Readable by crawlers and AI assistants.** `npm run prerender` (after the build) writes every route as its own HTML file: its own title, description, canonical, JSON-LD (SoftwareSourceCode, TechArticle, breadcrumbs) and the page as it renders. Before, crawlers that don't run JavaScript got about six words and one shared title on every route. Demo screens like cart and checkout are `noindex`, and a `sitemap.xml` lists the 101 indexable routes. React takes over the snapshot without a flash. The prerender code runs only on the docs site; nothing new ships in the package or the registry.
- **Link previews:** Open Graph tags and a 1200x630 card, so a shared link shows a preview on LinkedIn, Slack and X.

## 0.13.0 — 2026-11-18

### Changed
- **Tabs: overflow without a scrollbar.** A horizontal row that does not fit hides its scrollbar and fades the edge that still hides tabs (a CSS mask with animated widths). On touch, a swipe glides and snaps the leftmost tab to the start. With a mouse, a chevron button sits over each fade, fades in and out instead of mounting, and scrolls about one width. At the end of the row a button the pointer is still on stays put, dimmed and disabled, until the pointer leaves, so a repeat click doesn't land on whatever is underneath. Keyboard focus is kept clear of both through `scroll-padding`. The chevrons are out of the tab order and hidden from screen readers. The hairline moved from the list to a new wrapper (`data-tabs-scroller`) so the mask doesn't fade it. Vertical tabs are unchanged.

## 0.12.0 — 2026-11-16

Readability for dense, data-heavy screens, ported from Command Center's prototype: a data font, a brightness ladder for row state, six components and small additions to six more. Signal orange stays the only accent; the display and body faces do not change.

### Added
- **Tokens.** `--font-data` (the JetBrains Mono stack) and a `.font-data` class (mono with tabular figures) for numbers, values, counts, ids, meta and logs, never prose. `--color-text-active` / `--color-text-rest` / `--color-text-pending`, a state ladder that changes brightness, never size (pending is #7b8592 dark, #4f5a69 light; 4.66:1 or more on base, raised and sunken in both themes). `--color-surface-overlay`, surface.sunken at 85%, for a panel floating over a canvas.
- **KnowledgeGraph** (organism): a 3D map of linked notes with glowing points, dust and folder pills. A click makes a note active in place: a glow flows out along its links at a steady speed, the note is held in a crosshair ring, and a callout sits on a leader line. A crosshair cursor, an AZ/EL readout, and Reset view (top right, and the centre dot) to clear the pick and fly back to the overview; `focusId` from outside the map flies the camera to the note, and any drag or zoom takes the camera back at once. `highlight`, `hideOrphans`, `focusId`, `previewId`, `aside`, `onSelect(id | null)`, `onOpen`. three.js loads in its own chunk; without WebGL 2 the note list is shown instead; nothing moves on its own.
- **PanelHeader**: a numbered accent tag, a tracked display title and a data readout.
- **MeterRow**, with **MeterBar** and **MeterAxis**: label, data value and a 2px category bar, linear or log.
- **SegmentedMeter**: a count out of a small total as squares, filled, empty or struck.
- **StatusChip**: one uppercase word on a solid Badge tone.
- **LogFeed**: a short numbered event list in the data font, newest line bright.

### Changed
- **Stat** `variant="kpi"` (a compact tile) and `accent` (kpi only: one signal-fill tile).
- **ListItem** `bar` (a MeterBar under the row); `meta` is in the data font.
- **Sidebar** item `bar`, group `count`, `onOpenChange` and a controlled `open`; item counts in the data font; labels truncate in a narrow column instead of pushing the count out.
- **DataTable** numeric cells, **Stepper** step numbers and the **StatusTracker** summary use the data font.

## 0.11.0 — 2026-11-14

The first change written by the agent runner: Victor approved issue #6, the runner opened the pull request as division-ds-agent, Victor reviewed and merged it.

### Added
- **Progress `shape="ring"`** (issue #6). A circular indicator with the readout in its centre and the label beneath, for a countdown or session timer. Same `value`/`max`/`tone`/`showValue` contract as the bar; `allowOverMax` does not apply (the value is clamped). It is not a live region, so a timer that ticks every second stays quiet; announce milestones from the app's own status message. The default is still `bar`, so existing screens do not change.

## 0.10.0 — 2026-11-12

Four fixes that came out of the stress-test apps, each filed through `request_change` as a public issue first.

### Added
- **Progress `allowOverMax`** (issue #4). A value above max shows as it is instead of clamping: a budget at 112% reads "112%" in the hostile text colour, the track rescales to span the value, a marker shows where max sits and the part past it paints hostile. `aria-valuenow` is the real value and `aria-valuetext` reads "112%, 12% over". Off by default, so existing screens do not change.
- **A six-step severity scale** (issue #5): 18 semantic tokens, `--color-severity-1…6-text|fill|ink`, light and dark, built from existing primitives. Every pair passes 4.5:1 in both themes. **Badge `severity` (1–6)** uses it, for ordered levels such as air quality; the types reject it together with `tone` or `color`. The scale is in Figma (Color collection) and on the Color guideline page.
- **Select `iconInTrigger`** (issue #2). Shows the chosen option's icon in the closed field too, for options people recognise by their icon. New docs example: countries with flags.
- **The Color guideline page lists the category colours and the severity scale**; the tokens browser lists every semantic token, not only primitives.

### Changed
- **ChartPanel: the y-axis sizes itself to its widest tick label** (issue #3). "€2,200" no longer renders as ":2,200" at the default width. `axisWidth` still overrides it.
- **Search understands intent better** (issue #2), in the MCP `search` tool and on the docs site: filler words are ignored, pick / choose / select / choice / option count as one intent, and an exact name match wins. "pick a country" now returns Select first.

## 0.9.1 — 2026-11-11

### Changed
- The first release published by the GitHub release workflow (npm trusted publishing). No change to the components.

## 0.9.0 — 2026-11-11

### Added
- **MultiSelect `createHint`.** In creatable mode, a line at the top of the open panel tells people that typing creates a new option. It came from Command Center's label picker, through `request_change`.

### Changed
- The portfolio and docs links point to victorilioiu.com.

## 0.8.0 — 2026-11-06

### Added
- **Two MCP tools that report back: `request_change` and `report_drift`.** A project's agent asks for a missing prop, variant, token or component, or reports a rule it keeps failing, and the request becomes an issue on the public repository instead of a patch to the installed copy. Duplicates are added as a comment on the existing issue. Without `DIVISION_DS_GITHUB_TOKEN` the request is saved as JSON in `./division-ds-requests/`. Invisible characters are removed and each issue is marked as a report, not instructions. The MCP server now has 10 tools.

## 0.7.1 — 2026-11-06

### Fixed
- **Select: a long list scrolls.** The list is capped at 24rem or the room left on screen, whichever is smaller, keeps 16px from the window edges (`collisionPadding`), and scrolls inside the Viewport, so the crosshair stays on the frame's corners and there is no horizontal scrollbar. New docs example: "Long list" (30 months).
- **DropdownMenu: the same fix** for `DropdownMenuContent` and `DropdownMenuSubContent`: an inner scroll wrapper capped by `--radix-dropdown-menu-content-available-height`, plus `collisionPadding={16}`. Before, a long menu ran off the screen.
- **Toast: removal timers are cleared on unmount.**

## 0.7.0 — 2026-11-03

### Added
- **KanbanBoard `renderCardMenu(item, moveTo, columnId)`.** Replaces the content of the card's Move control menu with your own DropdownMenu items (View, Edit, a Labels submenu, Delete). `moveTo(columnId)` is the built-in menu move: the card goes to the end of that column, `onMove` runs, the status region announces it and focus returns to the Move control, so a custom "Move to" submenu keeps the no-drag path (WCAG 2.5.7). Without the prop the menu is unchanged.
- **Badge `color`: ten category colours** (gray, brown, orange, yellow, green, teal, blue, purple, pink, red) for labels people make. The types reject `color` and `tone` together. Works with both emphases and sizes. A colour is a group, not a status; status stays `tone`.
- **`CATEGORY_COLORS` and `CategoryColor`**, exported so an app can give each new label a colour (for example at random) and store it with the label.
- **30 semantic tokens, `--color-category-<colour>-text|fill|ink`**, light and dark. The contrast gate measures text on surface.base, sunken and raised, and ink on fill. All are at least 4.5:1; the lowest is 4.82:1.
- **Button `variant="link"` and Link: `tone="neutral"`.** Primary text with no underline until hover or keyboard focus, for clickable kanban card and list-row titles. The default `signal` tone is unchanged.
- **MultiSelect creatable mode:** `creatable`, `onCreate(text)` and `createLabel(text)`. When the typed text matches no option (ignoring case), the list ends with a `Create "<text>"` row, which is an ordinary option for the keyboard and screen readers. Enter or a click calls `onCreate` with the trimmed text and clears the field; the parent adds the option and its value.
- **Terminal `shiftEnter: 'newline' | 'default'`.** With `newline`, Shift+Enter sends ESC CR (`\x1b\r`), so chat programs such as Claude Code start a new line instead of submitting. Nothing is sent while `readOnly` is set, while an input method is composing, or when Ctrl, Alt or Meta is held.

### Changed
- **Button `variant="link"` now wraps long labels** (`whitespace-normal`, `break-words`, left-aligned) and its focus wrapper is `max-w-full min-w-0`, so a long title in a flex row wraps instead of sliding under nearby controls. Inline links in a sentence stay inline.

### Known
- The Figma sync check (`check:figma` and `figma-sync.test.mjs`) fails until the 30 category variables exist in Figma. Figma work is paused.
