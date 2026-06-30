'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-8">
      <div className="app-surface w-full max-w-lg rounded-[2rem] p-6 text-center sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sr-muted">Something broke</p>
        <h1 className="mt-3 font-display text-3xl font-bold text-sr-text">This page hit an unexpected error.</h1>
        <p className="mt-3 text-sm leading-6 text-sr-muted">
          Try reloading this section. If it keeps happening, the app can recover without a full white screen.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 inline-flex items-center justify-center rounded-xl bg-sr-red px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#d95a2e]"
        >
          Try again
        </button>
      </div>
    </main>
  )
}
