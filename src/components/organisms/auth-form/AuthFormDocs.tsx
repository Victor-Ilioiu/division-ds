import { useState } from 'react'
import { ComponentDocs } from '../../docs/ComponentDocs'
import { meta } from './AuthForm.meta'
import { Example } from '../../docs/Example'
import { AuthForm, type AuthMode, type AuthValues } from './AuthForm'

const wait = (ms: number) => new Promise(resolve => window.setTimeout(resolve, ms))

/** A stand-in for a server: any email, and the password "hexline" signs in. */
function AccountExample() {
  const [mode, setMode] = useState<AuthMode>('sign-in')
  const [signedIn, setSignedIn] = useState('')
  const submit = async (values: AuthValues, current: AuthMode) => {
    await wait(600)
    if (current === 'sign-in' && values.password !== 'hexline') {
      return { password: 'That email and password do not match.' }
    }
    if (current === 'sign-in' || current === 'create-account') setSignedIn(`Signed in as ${values.email}. This is a demo.`)
    return undefined
  }
  return (
    <div className="flex flex-col gap-3 w-full max-w-sm">
      <p className="font-body text-sm text-[var(--color-text-secondary)]">
        Demo: any email works, and the password <code className="font-mono">hexline</code> signs in.
      </p>
      <AuthForm
        mode={mode}
        onModeChange={next => {
          setMode(next)
          setSignedIn('')
        }}
        onSubmit={submit}
        headingLevel={4}
      />
      <p role="status" className="font-body text-sm text-[var(--color-text-primary)]">
        {signedIn}
      </p>
    </div>
  )
}

export function AuthFormDocs() {
  return (
    <ComponentDocs meta={meta}>
      <Example caption="Sign in, with a server error, and the other modes" className="block">
        <AccountExample />
      </Example>

      <Example caption="Two-step sign-in with a code" className="block">
        <AuthForm mode="verify-code" onSubmit={() => wait(600).then(() => undefined)} headingLevel={4} />
      </Example>
    </ComponentDocs>
  )
}
