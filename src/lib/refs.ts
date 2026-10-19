import { useCallback, type Ref, type RefCallback } from 'react'

/** Writes `node` into one ref, whichever kind it is. */
export function assignRef<T>(ref: Ref<T> | undefined, node: T | null): void {
  if (typeof ref === 'function') ref(node)
  else if (ref) (ref as { current: T | null }).current = node
}

/**
 * One ref callback that feeds every ref it is given: a component's own (for focus management) and
 * the caller's. Its identity is stable while the refs are. React re-runs a ref callback whose
 * identity changes, detaching with null and reattaching with the node, so an inline
 * `node => { ... }` does that on every render. The refs are the dependency list, so the number of
 * refs passed must not change between renders of one component, the rule every hook's deps follow.
 *
 * Returns a cleanup, so React 19 detaches through it rather than by calling this callback again
 * with `null`. Each ref's own cleanup runs on detach: a callback ref's returned cleanup, if it gave
 * one; otherwise that callback called with `null`. An object ref's cleanup clears `.current`.
 */
export function useMergedRefs<T>(...refs: Array<Ref<T> | undefined>): RefCallback<T> {
  return useCallback((node: T | null) => {
    const cleanups = refs.map(ref => {
      if (typeof ref === 'function') {
        const cleanup = ref(node)
        return typeof cleanup === 'function' ? cleanup : () => ref(null)
      }
      if (ref) {
        ref.current = node
        return () => {
          ref.current = null
        }
      }
      return undefined
    })
    return () => {
      for (const cleanup of cleanups) cleanup?.()
    }
  }, refs)
}
