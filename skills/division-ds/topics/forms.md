# Division DS: forms and actions

> Load when a screen has a field, a form or more than one button. Generated from AGENTS.md by `npm run agent-docs`. Edit the rules there, not here.

**Forms.** In a form, `Input`, `Textarea`, `Select`, `MultiSelect` and `QuantityStepper` go inside a `FormField`,
which supplies the label, help and error and keeps an `id` you pass to the control. The one
exception is a control repeated per row of a list (a role `Select` on each member): leave it
bare and name it through its own `label` prop ("Role for Ilse Varga"). `Switch`, `Checkbox` and
`Radio` are not `FormField` children: give them an `id` and a `<label htmlFor>`. A failed submit
renders `ErrorSummary` at the top and focuses it; `useFieldErrors` holds the state (signature in
`public/docs/helpers.md`).

**Buttons.** Two or more buttons side by side need a parent with a gap
(`flex flex-wrap gap-3`); `DialogFooter` and `CardFooter` already are one. A `Button` is
`type="button"` unless you say `type="submit"`. A busy button takes `loading`, not `disabled`.
`disabled` is for an action that is not available; say why in text nearby.

**Icon-only buttons** are `IconButton` with a required `label`. A `Tooltip` adds detail; it does
not replace the label.
