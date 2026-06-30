'use client'

import './globals.css'

export default function GlobalError({
  error,
  reset
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  console.error(error)

  return (
    <html lang="en">
      <body className="bg-sr-bg font-sans text-sr-text antialiased">
        <main className="flex min-h-screen items-center justify-center px-4 py-8">
          <div className="app-surface w-full max-w-lg rounded-[2rem] p-6 text-center sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sr-muted">App error</p>
            <h1 className="mt-3 font-display text-3xl font-bold text-sr-text">DEFUSE AI needs a quick reset.</h1>
            <p className="mt-3 text-sm leading-6 text-sr-muted">
              A top-level error interrupted rendering. You can retry here without restarting the whole browser tab.
            </p>
            <button
              type="button"
              onClick={reset}
              className="mt-6 inline-flex items-center justify-center rounded-xl bg-sr-red px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#d95a2e]"
            >
              Reload app
            </button>
          </div>
        </main>
      </body>
    </html>
  )
}
