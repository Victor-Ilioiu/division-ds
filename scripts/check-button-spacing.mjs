import { sourceFiles } from './lib/read-source-files.mjs'
import { findViolations, formatViolation } from './lib/button-spacing.mjs'

// The touching-buttons gate. Two or more Button/IconButton siblings (including one wrapped in an
// asChild trigger/close component, like SheetClose) with no gap-carrying flex/grid parent land
// flush against each other -- Button and IconButton both render inline-flex, and JSX drops a
// whitespace-only line between elements entirely, so there is no rendered space either. That
// shipped for real in src/components/organisms/sheet/SheetDocs.tsx's "Filters on the right"
// example. The scan, the button-like/asChild-wrapper definition and the gap check live in
// scripts/lib/button-spacing.mjs so they are unit-testable without a filesystem, the same split
// check-contrast.mjs and check-vocabulary.mjs both use. This file is the runner and the exit code.

const files = sourceFiles(['src'], /\.tsx$/)
const violations = files.flatMap(({ path, text }) => findViolations(text, path))

if (violations.length > 0) {
  console.error(`\nButton-spacing gate FAILED: ${violations.length} violation(s) in src/.\n`)
  for (const violation of violations) console.error('  ' + formatViolation(violation))
  console.error(
    '\nTwo or more Button/IconButton controls (directly, or one level through an asChild wrapper\n' +
      'like SheetClose/DialogClose/SheetTrigger) as siblings need a shared flex/grid parent carrying\n' +
      'a gap- utility -- Button and IconButton render inline-flex, so with no gap they land flush\n' +
      'against each other. Wrap them and move any margin from the individual controls onto the\n' +
      'wrapper, the way src/components/organisms/checkout-form/CheckoutForm.tsx and\n' +
      'src/components/organisms/cart/Cart.tsx already do (flex flex-wrap ... gap-3).\n'
  )
  process.exit(1)
}

console.log(`Button-spacing gate passed: ${files.length} files, 0 matches.`)
