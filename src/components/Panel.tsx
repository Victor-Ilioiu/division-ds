import type { ReactNode } from 'react'

export function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`panel crosshair p-5 ${className}`}>{children}</div>
}
