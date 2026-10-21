import { describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { hasErrors, summarize, useFieldErrors, type FieldErrors } from './field-errors'

type Field = 'email' | 'name'

const validate = (field: Field, value: string) => {
  if (!value) return field === 'email' ? 'Enter your email address.' : 'Enter your name.'
  if (field === 'email' && !value.includes('@')) return 'Enter an email address like name@example.com.'
  return undefined
}

describe('useFieldErrors', () => {
  // Mutation: in `change`, set validate(field, value) unconditionally; the first expectation fails.
  it('shows an error on blur and never raises one on a keystroke', () => {
    const { result } = renderHook(() => useFieldErrors<Field>(validate))
    act(() => result.current.change('email', 'ana'))
    expect(result.current.errors.email).toBeUndefined()
    act(() => result.current.blur('email', 'ana'))
    expect(result.current.errors.email).toBe('Enter an email address like name@example.com.')
  })

  // The 2026-10-20 outside test: the error line a blur adds pushed Save down mid-click, so the
  // first click missed. Submit validates every field anyway, so a blur heading there says nothing.
  it('shows nothing on a blur caused by pressing a submit button, and still does on a Tab to it', () => {
    const { result } = renderHook(() => useFieldErrors<Field>(validate))
    const save = document.createElement('button')
    save.type = 'submit'
    // jsdom never sets :active, so the press is stubbed; a Tab onto the button is the same button
    // without it.
    const pressed = Object.assign(save.cloneNode() as HTMLButtonElement, { matches: (selector: string) => selector === ':active' })
    act(() => result.current.blur('email', 'ana', pressed))
    expect(result.current.errors.email).toBeUndefined()
    act(() => result.current.blur('email', 'ana', save))
    expect(result.current.errors.email).toBe('Enter an email address like name@example.com.')
  })

  // Mutation: in `change`, clear only when validate returns undefined; 'a' is still invalid, so the
  // stale "Enter your email address." stays.
  it('clears a message on a keystroke once it no longer describes the value, without replacing it', () => {
    const { result } = renderHook(() => useFieldErrors<Field>(validate))
    act(() => result.current.blur('email', ''))
    expect(result.current.errors.email).toBe('Enter your email address.')
    act(() => result.current.change('email', 'a'))
    expect(result.current.errors.email).toBeUndefined()
  })

  // Mutation: in `change`, always clear; the message disappears while it is still true.
  it('keeps a message that still describes the value', () => {
    const { result } = renderHook(() => useFieldErrors<Field>(validate))
    act(() => result.current.blur('email', 'ana'))
    act(() => result.current.change('email', 'anab'))
    expect(result.current.errors.email).toBe('Enter an email address like name@example.com.')
  })

  // Mutation: in `validateAll`, merge into the current errors instead of replacing them; the name
  // error from the earlier blur survives.
  it('validates the given fields in one pass on submit, replacing what was shown', () => {
    const { result } = renderHook(() => useFieldErrors<Field>(validate))
    act(() => result.current.blur('name', ''))
    let found: FieldErrors<Field> = {}
    act(() => {
      found = result.current.validateAll(['email'], () => '')
    })
    expect(found).toEqual({ email: 'Enter your email address.' })
    expect(result.current.errors).toEqual({ email: 'Enter your email address.' })
  })

  // Mutation: build the summary from Object.keys(errors) instead of `order`; name comes first.
  it('summarizes errors in the order given, each with its field id', () => {
    expect(summarize<Field>({ name: 'N', email: 'E' }, ['email', 'name'], field => `id-${field}`)).toEqual([
      { fieldId: 'id-email', message: 'E' },
      { fieldId: 'id-name', message: 'N' },
    ])
    expect(hasErrors<Field>({})).toBe(false)
    expect(hasErrors<Field>({ email: 'E' })).toBe(true)
  })
})
