# Division DS: overlays

> Load when adding a Dialog, an AlertDialog or a Sheet. Generated from AGENTS.md by `npm run agent-docs`. Edit the rules there, not here.

**Overlays.** A task on top of the page is a `Dialog`; a destructive confirm is `AlertDialog`,
not `Dialog`; filters, navigation on a narrow screen or one item's detail beside a list is a
`Sheet`. Never open a dialog from a dialog or a sheet from a sheet. Never open one from a
`DropdownMenu` item: the item is gone by the time the overlay closes, so focus has nowhere to go.
Put a dialog's actions in `DialogFooter`.
