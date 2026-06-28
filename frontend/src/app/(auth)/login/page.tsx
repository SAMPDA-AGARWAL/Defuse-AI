'use client'

import Link from 'next/link'
import { ArrowLeft, Calendar, Mail, ShieldCheck, Sparkles } from 'lucide-react'
import ThemeToggle from '@/components/ThemeToggle'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

export default function LoginPage() {
  const handleGoogleLogin = () => {
    window.location.href = `${API_URL}/auth/google`
  }

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2 rounded-full border border-sr-border bg-sr-header px-4 py-2 text-sm font-semibold text-sr-text transition-colors hover:border-sr-red hover:text-sr-red">
            <ArrowLeft className="h-4 w-4" />
            Back home
          </Link>
          <ThemeToggle compact />
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="app-surface rounded-[2rem] p-6 sm:p-8">
            <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-sr-red text-white">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <p className="mt-5 text-sm font-semibold uppercase tracking-[0.24em] text-sr-red">Welcome to Defuse</p>
            <h1 className="mt-3 max-w-2xl font-display text-4xl font-bold tracking-tight text-sr-text sm:text-5xl">
              Sign in and turn scattered deadlines into one clear task list
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-sr-muted">
              Defuse AI is made for people who do not want a heavy project-management setup. Connect Google, pull your deadlines in, and use simple focus mode when you get stuck.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {[
                { icon: Mail, label: 'Gmail', description: 'Finds deadline-related emails' },
                { icon: Calendar, label: 'Calendar', description: 'Imports upcoming events' },
                { icon: Sparkles, label: 'AI help', description: 'Explains what to do next' }
              ].map(({ icon: Icon, label, description }) => (
                <div key={label} className="rounded-[1.5rem] border border-sr-border bg-sr-header p-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sr-card text-sr-red">
                    <Icon className="h-5 w-5" />
                  </div>
                  <p className="mt-3 font-display text-xl font-semibold text-sr-text">{label}</p>
                  <p className="mt-2 text-sm leading-6 text-sr-muted">{description}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="app-surface flex flex-col justify-center rounded-[2rem] p-6 sm:p-8">
            <div className="rounded-[1.75rem] border border-sr-border bg-sr-header p-5 sm:p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sr-muted">Login</p>
              <h2 className="mt-3 font-display text-3xl font-semibold text-sr-text">Continue with Google</h2>
              <p className="mt-2 text-sm leading-6 text-sr-muted">
                We use your Google account so Defuse can read Gmail and Calendar for deadlines. You&apos;ll land in onboarding after sign-in.
              </p>

              <button
                onClick={handleGoogleLogin}
                className="mt-6 flex w-full items-center justify-center gap-3 rounded-2xl bg-white px-6 py-4 text-base font-semibold text-gray-900 shadow-lg transition-transform hover:-translate-y-0.5"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </button>

              <p className="mt-4 text-center text-xs leading-5 text-sr-muted">
                Best for hackathon demos: login once, sync sources, and show how focus mode turns one task into easy steps.
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
