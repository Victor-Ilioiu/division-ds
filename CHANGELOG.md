# Changelog

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
