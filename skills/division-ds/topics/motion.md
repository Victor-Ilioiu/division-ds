# Division DS: motion

> Load when animating anything yourself. Generated from AGENTS.md by `npm run agent-docs`. Edit the rules there, not here.

**Motion.** The components animate themselves, and the shell animates a route change. A screen
adds no keyframes of its own: use the classes in `src/styles/motion.css` (`anim-snap-in` for an
element arriving, `anim-draw-on` for a hairline) and the motion tokens (`--duration-fast` for
hover, `--duration-base` by default, `--duration-slow` for a larger change, `--ease-snap`).
Anything you animate yourself stops under `prefers-reduced-motion` (`motion-reduce:` in
Tailwind), and nothing moves on its own: no autoplay.
