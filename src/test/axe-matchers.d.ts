// Ambient module augmentation lives in its own .d.ts file (not setup.ts) because
// @testing-library/jest-dom's own `vitest.d.ts` augments `Assertion<T = any>` (one type
// parameter), while Vitest 5's real `Assertion<R, T>` takes two. That mismatch is silently
// tolerated between two .d.ts files under `skipLibCheck`, but a plain .ts source file adding
// a third, differently-shaped `Assertion` declaration is checked and fails with
// "All declarations of 'Assertion' must have identical type parameters" no matter which
// arity is chosen. Keeping this augmentation in a .d.ts file exempts it from that check too.
export {}

declare module 'vitest' {
  interface Assertion<T = any> {
    toHaveNoViolations(): T
  }
}
