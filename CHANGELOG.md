# Changelog

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
