'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ArrowRight, CalendarClock, CheckCircle2, Mail, MessageSquareText, MoonStar, ShieldCheck, Sparkles } from 'lucide-react'
import ThemeToggle from '@/components/ThemeToggle'

const FEATURES = [
  {
    icon: Mail,
    title: 'Find deadlines automatically',
    description: 'Defuse AI scans Gmail and Calendar so important tasks stop getting buried in chats and inboxes.'
  },
  {
    icon: CalendarClock,
    title: 'Show what to do next',
    description: 'We turn a messy list into a simple priority view with due dates, urgency, and one-click focus mode.'
  },
  {
    icon: MessageSquareText,
    title: 'Explain the work clearly',
    description: 'AI briefing, starter content, and quick chat help even non-technical users know the next step.'
  }
]

const STEPS = [
  'Connect Google once',
  'Let Defuse collect deadlines',
  'Open a task and follow the guided steps'
]

export default function Home() {
  const [dashboardHref, setDashboardHref] = useState('/login')

  useEffect(() => {
    const token = localStorage.getItem('defuse_token')
    if (token) setDashboardHref('/dashboard')
  }, [])

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-7xl flex-col">
        <header className="app-surface sticky top-4 z-20 mb-6 flex items-center justify-between rounded-full px-4 py-3 backdrop-blur sm:px-6">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sr-red text-white shadow-lg shadow-sr-red/20">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="font-display text-lg font-bold tracking-tight text-sr-text">DEFUSE AI</p>
              <p className="text-xs text-sr-muted">Deadline clarity for student and hackathon teams</p>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <ThemeToggle compact />
            <Link
              href="/login"
              className="hidden rounded-full border border-sr-border bg-sr-header px-4 py-2 text-sm font-semibold text-sr-text transition-colors hover:border-sr-red hover:text-sr-red sm:inline-flex"
            >
              Login
            </Link>
          </div>
        </header>

        <section className="grid flex-1 items-center gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-sr-border bg-sr-header px-4 py-2 text-sm text-sr-muted">
              <Sparkles className="h-4 w-4 text-sr-red" />
              Built to make deadline tracking less confusing
            </div>

            <div className="space-y-4">
              <h1 className="max-w-3xl font-display text-4xl font-bold leading-tight tracking-tight text-sr-text sm:text-5xl lg:text-6xl">
                One clean home for tasks, deadlines, and “what should we do first?”
              </h1>
              <p className="max-w-2xl text-balance text-base leading-7 text-sr-muted sm:text-lg">
                Defuse AI helps students and hackathon teams collect work from Gmail, Calendar, and manual notes, then turns it into a simple action list with guided focus steps.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href={dashboardHref}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-sr-red px-6 py-3.5 text-sm font-bold text-white transition-transform hover:-translate-y-0.5"
              >
                {dashboardHref === '/dashboard' ? 'Open dashboard' : 'Login with Google'}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#what-we-do"
                className="inline-flex items-center justify-center rounded-full border border-sr-border bg-sr-header px-6 py-3.5 text-sm font-semibold text-sr-text transition-colors hover:border-sr-red hover:text-sr-red"
              >
                What Defuse does
              </a>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { label: 'Inbox to task list', value: 'Auto-detects deadlines' },
                { label: 'Simple focus mode', value: 'Step-by-step work help' },
                { label: 'Demo ready', value: 'Mobile responsive UI' }
              ].map((item) => (
                <div key={item.label} className="app-surface rounded-3xl p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-sr-muted">{item.label}</p>
                  <p className="mt-2 font-display text-lg font-semibold text-sr-text">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="app-surface relative overflow-hidden rounded-[2rem] p-5 sm:p-6">
            <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-r from-sr-red/15 via-sr-orange/10 to-sr-purple/10" />
            <div className="relative space-y-5">
              <div className="flex items-center justify-between rounded-3xl border border-sr-border bg-sr-header px-4 py-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-sr-muted">Today in Defuse</p>
                  <p className="mt-1 font-display text-xl font-semibold text-sr-text">3 things need attention</p>
                </div>
                <MoonStar className="h-8 w-8 text-sr-red" />
              </div>

              <div className="space-y-3">
                {[
                  { title: 'Finish hackathon landing page', time: 'Due today, 8:00 PM', tone: 'bg-sr-red/10 text-sr-red' },
                  { title: 'Reply to mentor email', time: 'Due in 4 hours', tone: 'bg-sr-orange/10 text-sr-orange' },
                  { title: 'Prepare demo notes', time: 'Tomorrow morning', tone: 'bg-sr-green/10 text-sr-green' }
                ].map((item) => (
                  <div key={item.title} className="rounded-3xl border border-sr-border bg-sr-card p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-sr-text">{item.title}</p>
                        <p className="mt-1 text-sm text-sr-muted">{item.time}</p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${item.tone}`}>Next up</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-3xl border border-dashed border-sr-border px-4 py-4">
                <p className="text-sm font-semibold text-sr-text">Why it’s easy to explain</p>
                <div className="mt-3 space-y-3">
                  {STEPS.map((step) => (
                    <div key={step} className="flex items-center gap-3 text-sm text-sr-muted">
                      <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-sr-green" />
                      {step}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="what-we-do" className="py-10">
          <div className="mb-6 max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sr-red">What We Do</p>
            <h2 className="mt-3 font-display text-3xl font-bold text-sr-text sm:text-4xl">
              Defuse AI is a friendly tracking tool, not a complicated project system
            </h2>
            <p className="mt-3 text-base leading-7 text-sr-muted">
              It helps your team capture deadlines, prioritize what matters right now, and open one task at a time with clear guidance. That keeps the product simple enough for a hackathon demo and useful for real students.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, description }) => (
              <div key={title} className="app-surface rounded-[1.75rem] p-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sr-red/10 text-sr-red">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-display text-xl font-semibold text-sr-text">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-sr-muted">{description}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}
