import { describe, it, expect } from 'vitest'
import { findViolations, formatViolation } from './button-spacing.mjs'

/**
 * The scan behind the touching-buttons gate. What is asserted here is the part that decides
 * whether the gate is trustworthy: that it catches the exact shape that shipped broken in
 * SheetDocs.tsx (a plain Button and a `SheetClose asChild`-wrapped Button as bare siblings), that
 * the asChild-unwrapping is what does the catching -- not just literal `<Button>` siblings -- that
 * the fixed, wrapped shape is clean, and that it does not fire on the design system's own
 * deliberately-fused controls or on components that already carry their own internal gap.
 */

describe('findViolations', () => {
  it('flags the exact shape that shipped broken: a plain Button and a SheetClose-asChild Button as bare siblings', () => {
    const source = `
      <SheetContent title="Filters" description="Narrow the depot list.">
        <fieldset className="flex flex-col gap-3">
          <legend>Region</legend>
        </fieldset>
        <Button variant="secondary" className="mt-6" onClick={save}>
          Save as default
        </Button>
        <SheetClose asChild>
          <Button className="mt-6">Apply</Button>
        </SheetClose>
      </SheetContent>
    `
    const hits = findViolations(source, 'src/components/organisms/sheet/SheetDocs.tsx')
    expect(hits).toHaveLength(1)
    expect(hits[0]).toMatchObject({ tag: 'SheetContent', count: 2 })
  })

  it('does not flag the fixed shape: both buttons wrapped in a flex row carrying gap-', () => {
    const source = `
      <SheetContent title="Filters" description="Narrow the depot list.">
        <fieldset className="flex flex-col gap-3">
          <legend>Region</legend>
        </fieldset>
        <div className="flex flex-wrap gap-3 mt-6">
          <Button variant="secondary" onClick={save}>
            Save as default
          </Button>
          <SheetClose asChild>
            <Button>Apply</Button>
          </SheetClose>
        </div>
      </SheetContent>
    `
    expect(findViolations(source)).toEqual([])
  })

  it('catches the asChild-wrapper case specifically, not only literal <Button> siblings', () => {
    // Neither direct child of <div> is literally <Button> or <IconButton> -- both are one level
    // behind an asChild wrapper (SheetClose, DialogClose). A checker that only matched the literal
    // tag name would see zero button-like children here and miss it entirely.
    const source = `
      <div>
        <SheetClose asChild>
          <Button variant="secondary">Cancel</Button>
        </SheetClose>
        <DialogClose asChild>
          <Button>Confirm</Button>
        </DialogClose>
      </div>
    `
    const hits = findViolations(source, 'x.tsx')
    expect(hits).toHaveLength(1)
    expect(hits[0]).toMatchObject({ tag: 'div', count: 2 })
  })

  it('does not unwrap an asChild wrapper whose single child is not a Button/IconButton', () => {
    const source = `
      <div>
        <SheetClose asChild>
          <a href="/cancel">Cancel</a>
        </SheetClose>
        <Button>Confirm</Button>
      </div>
    `
    expect(findViolations(source)).toEqual([])
  })

  it('does not chase an asChild wrapper more than one level deep', () => {
    // Outer has one child, Inner: asChild wrapper -> asChild wrapper -> Button is two hops, not
    // one, so Outer is not button-like even though a Button exists two levels inside it.
    const source = `
      <div>
        <Outer asChild>
          <Inner asChild>
            <Button>Deep</Button>
          </Inner>
        </Outer>
        <Button>Shallow</Button>
      </div>
    `
    expect(findViolations(source)).toEqual([])
  })

  it('requires 2 or more button-like children -- a single one never flags', () => {
    expect(findViolations('<div><Button>Only one</Button></div>')).toEqual([])
  })

  it('does not flag when the parent className already contains gap-', () => {
    const source = `
      <div className="flex gap-3">
        <Button>A</Button>
        <Button>B</Button>
      </div>
    `
    expect(findViolations(source)).toEqual([])
  })

  it('matches a gap- utility inside a cn(...) expression, not only a plain string literal', () => {
    const source = `
      <div className={cn('flex flex-wrap', 'gap-3', extra)}>
        <Button>A</Button>
        <Button>B</Button>
      </div>
    `
    expect(findViolations(source)).toEqual([])
  })

  it('does not flag DialogFooter or Example, which already gap their own children internally', () => {
    const source = `
      <DialogFooter>
        <DialogClose asChild>
          <Button variant="secondary">Cancel</Button>
        </DialogClose>
        <Button>Save</Button>
      </DialogFooter>
    `
    expect(findViolations(source)).toEqual([])

    const docsSource = `
      <Example caption="Variants">
        <Button variant="primary">A</Button>
        <Button variant="secondary">B</Button>
      </Example>
    `
    expect(findViolations(docsSource)).toEqual([])
  })

  it('does not trust the DialogFooter/Example exemption when the call site overrides display to block', () => {
    // Real shape: 10+ *Docs.tsx files pass className="block" to <Example> today (TagDocs,
    // AuthFormDocs, CartDocs, ChartPanelDocs, DataTableDocs, ...). None currently combine that
    // with 2+ button-like children, but if one ever did, tailwind-merge's cn(internal, className)
    // composition means the call site's "block" wins the display conflict and silently turns the
    // internal Panel's "flex ... gap-4" off -- the exemption must not paper over that.
    const source = `
      <Example caption="Variants" className="block">
        <Button variant="primary">A</Button>
        <Button variant="secondary">B</Button>
      </Example>
    `
    const hits = findViolations(source, 'x.tsx')
    expect(hits).toHaveLength(1)
    expect(hits[0]).toMatchObject({ tag: 'Example', count: 2 })
  })

  it('rejects gap-0 as satisfying the gap requirement, exemption or not', () => {
    expect(
      findViolations('<div className="flex gap-0"><Button>A</Button><Button>B</Button></div>')
    ).toHaveLength(1)
    expect(
      findViolations(
        '<DialogFooter className="gap-0"><Button>A</Button><Button>B</Button></DialogFooter>'
      )
    ).toHaveLength(1)
  })

  it('rejects a gap-y-only value: it spaces stacked rows vertically, not two elements sitting side by side', () => {
    const source = '<div className="flex gap-y-4"><Button>A</Button><Button>B</Button></div>'
    const hits = findViolations(source, 'x.tsx')
    expect(hits).toHaveLength(1)
    expect(hits[0]).toMatchObject({ tag: 'div', count: 2 })
  })

  it('rejects a real gap- utility on an element with no flex/grid token: the gap utility does nothing there', () => {
    const source = '<div className="gap-3"><Button>A</Button><Button>B</Button></div>'
    expect(findViolations(source)).toHaveLength(1)
  })

  it('does not mistake a flex-ITEM utility (flex-1) for a flex CONTAINER', () => {
    // flex-1/flex-none/flex-auto set flex-grow/shrink/basis on an element sitting INSIDE a flex
    // container; they say nothing about this element's own children being laid out in a row.
    const source = '<div className="flex-1 gap-3"><Button>A</Button><Button>B</Button></div>'
    expect(findViolations(source)).toHaveLength(1)
  })

  it('still accepts inline-flex/grid/inline-grid as real formatting contexts, not only bare flex', () => {
    expect(findViolations('<div className="inline-flex gap-2"><Button>A</Button><Button>B</Button></div>')).toEqual([])
    expect(findViolations('<div className="grid gap-2"><Button>A</Button><Button>B</Button></div>')).toEqual([])
    expect(findViolations('<div className="inline-grid gap-2"><Button>A</Button><Button>B</Button></div>')).toEqual([])
  })

  it('accepts a real gap value inside brackets or with a decimal, which are not the literal string "0"', () => {
    expect(findViolations('<div className="flex gap-[10px]"><Button>A</Button><Button>B</Button></div>')).toEqual([])
    expect(findViolations('<div className="flex gap-0.5"><Button>A</Button><Button>B</Button></div>')).toEqual([])
  })

  it('matches every real, currently-passing parent in this codebase under the tightened check', () => {
    // Pinned so a future tightening of hasWorkingGap can't silently start flagging real code
    // without a test noticing. Pagination's <nav> genuinely uses bare IconButton/Button for its
    // prev/next and page controls -- it passes because its own gap-1 is real, not because the tag
    // matcher misses it (see commands.md).
    const real = [
      'flex flex-wrap items-center gap-1', // Pagination.tsx:92
      'flex gap-3', // StepperDocs.tsx
      'flex gap-2 mb-4', // TabsDocs.tsx
      'flex flex-wrap gap-3', // ToastDocs.tsx / SheetDocs.tsx (this fix)
      'flex gap-3 w-fit', // MotionGuideline.tsx
      'flex flex-wrap items-center gap-3 mt-8', // Overview.tsx
      'flex flex-wrap items-center gap-4', // Overview.tsx / Example's own internal Panel
      'flex flex-wrap items-center justify-end gap-3 mt-6', // DialogFooter's own internal div
    ]
    for (const className of real) {
      const source = `<div className="${className}"><Button>A</Button><Button>B</Button></div>`
      expect(findViolations(source), className).toEqual([])
    }
  })

  it('ignores a plain div that merely contains one Button among other, non-button content', () => {
    const source = `
      <div>
        <p>Some text</p>
        <Button>Only button</Button>
      </div>
    `
    expect(findViolations(source)).toEqual([])
  })

  it('does not confuse a TypeScript generic or a comparison for a JSX tag', () => {
    // Both of these appear ahead of real JSX using Button/IconButton-shaped names purely to prove
    // the generic doesn't get read as an opening tag that then swallows the real elements below it
    // as its children.
    const source = `
      type Foo = Array<Button>
      const ok = 1 < 2
      const el = (
        <div>
          <Button>A</Button>
          <Button>B</Button>
        </div>
      )
    `
    const hits = findViolations(source)
    expect(hits).toHaveLength(1)
    expect(hits[0]).toMatchObject({ tag: 'div', count: 2 })
  })

  it('reports 1-based line and column pointing at the parent element, with a trimmed excerpt', () => {
    const source = '<div>\n  <Button>A</Button>\n  <Button>B</Button>\n</div>\n'
    const [hit] = findViolations(source, 'src/x.tsx')
    expect(hit).toMatchObject({ file: 'src/x.tsx', line: 1, column: 1, tag: 'div', count: 2 })
  })
})

describe('formatViolation', () => {
  it('names the file, the tag and the count in the printed message', () => {
    const [hit] = findViolations('<div>\n<Button>A</Button><Button>B</Button>\n</div>', 'src/pages/P.tsx')
    const message = formatViolation(hit)
    expect(message).toContain('src/pages/P.tsx')
    expect(message).toContain('<div>')
    expect(message).toContain('2 button-like children')
    expect(message).toContain('"gap-"')
  })
})
