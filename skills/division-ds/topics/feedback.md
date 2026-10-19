# Division DS: feedback

> Load when a screen reports a result or a wait: a toast, an alert, progress, a spinner. Generated from AGENTS.md by `npm run agent-docs`. Edit the rules there, not here.

**Feedback.** A `Toast` confirms something the person just did and then leaves, so it never holds
the only copy of anything; a message that must stay is an `Alert` in the page. A failed load is
an `Alert` in the `hostile` tone with a retry, not an `EmptyState`. Measurable work is
`Progress`; a short wait inside a control or a line of text is `Spinner`; a busy `Button` takes
`loading`.
