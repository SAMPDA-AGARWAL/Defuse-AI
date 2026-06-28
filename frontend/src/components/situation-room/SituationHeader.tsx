'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import ThemeToggle from '@/components/ThemeToggle'
import type { TaskSummary } from '@/types'

interface Props {
  summary: TaskSummary
}

export default function SituationHeader({ summary }: Props) {
  const [time, setTime] = useState('')
  const [date, setDate] = useState('')

  useEffect(() => {
    const update = () => {
      const now = new Date()
      setTime(now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }))
      setDate(now.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }))
    }

    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <header className="sticky top-0 z-30 border-b border-sr-border bg-sr-header/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sr-red text-white">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="font-display text-xl font-bold tracking-tight text-sr-text">DEFUSE AI</p>
              <p className="text-xs text-sr-muted">Simple deadline control for students and teams</p>
            </div>
          </Link>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3 rounded-full border border-sr-border bg-sr-card px-4 py-2.5">
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-sr-muted">Today</p>
              <p className="text-sm font-semibold text-sr-text">{date}</p>
            </div>
            <div className="h-8 w-px bg-sr-border" />
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-sr-muted">Time</p>
              <p className="font-display text-lg font-semibold text-sr-text">{time}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-full border border-sr-border bg-sr-card px-4 py-2.5 text-sm">
            <span className="font-semibold text-sr-red">{summary.critical} urgent</span>
            <span className="text-sr-muted">{summary.upcoming} active</span>
            <span className="hidden h-2 w-2 rounded-full bg-sr-green animate-pulse sm:inline-block" />
            <span className="hidden text-sr-muted sm:inline">tracking your sources</span>
          </div>

          <ThemeToggle compact />
        </div>
      </div>
    </header>
  )
}
