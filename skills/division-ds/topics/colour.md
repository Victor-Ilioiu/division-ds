# Division DS: colour roles

> Load when choosing an accent, the text on a fill, or a status colour. Generated from AGENTS.md by `npm run agent-docs`. Edit the rules there, not here.

**Fill, text, ink.** Each accent has three roles. `accent.<state>.fill` is a solid block;
`accent.<state>.ink` is the text on that block; `accent.<state>.text` is coloured text on a
normal surface. Never put `text.primary` on a fill.

**Status tones.** `ok` done or healthy; `warning` degraded or needs attention; `hostile` failed
or destructive; `info` in progress or neutral news; `signal` brand emphasis (a sale, the
selected thing); `neutral` inactive. Always with a word: colour alone is not a status.
