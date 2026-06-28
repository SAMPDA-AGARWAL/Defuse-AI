'use client'

import { useState } from 'react'
import type { ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Calendar, CheckCircle2, Edit, Mail, MessageCircle, Mic, Sparkles, Trash2 } from 'lucide-react'
import { useCountdown } from '@/hooks/useCountdown'
import type { Task } from '@/types'
import api from '@/lib/api'

const SOURCE_ICONS: Record<string, ReactNode> = {
  gmail: <Mail className="h-3.5 w-3.5" />,
  calendar: <Calendar className="h-3.5 w-3.5" />,
  whatsapp: <MessageCircle className="h-3.5 w-3.5" />,
  screenshot: <Sparkles className="h-3.5 w-3.5" />,
  voice: <Mic className="h-3.5 w-3.5" />,
  manual: <Edit className="h-3.5 w-3.5" />
}

const CATEGORY_STYLES: Record<string, string> = {
  study: 'bg-blue-500/10 text-blue-500',
  exam: 'bg-red-500/10 text-red-500',
  assignment: 'bg-violet-500/10 text-violet-500',
  work: 'bg-amber-500/10 text-amber-600',
  meeting: 'bg-cyan-500/10 text-cyan-600',
  payment: 'bg-emerald-500/10 text-emerald-600',
  health: 'bg-pink-500/10 text-pink-500',
  personal: 'bg-orange-500/10 text-orange-500',
  other: 'bg-sr-header text-sr-muted'
}

const PRIORITY_STYLES: Record<string, string> = {
  critical: 'border-sr-red',
  high: 'border-sr-orange',
  medium: 'border-sr-green',
  low: 'border-sr-purple'
}

interface Props {
  task: Task
  onUpdate: () => void
}

export default function TaskCard({ task, onUpdate }: Props) {
  const router = useRouter()
  const countdown = useCountdown(task.deadline)
  const [deleting, setDeleting] = useState(false)

  const handleFocusMode = () => router.push(`/defuse/${task._id}`)

  const handleComplete = async () => {
    await api.post(`/tasks/${task._id}/complete`)
    onUpdate()
  }

  const handleDelete = async () => {
    if (!confirm('Remove this task?')) return
    setDeleting(true)
    try {
      await api.delete(`/tasks/${task._id}`)
      onUpdate()
    } finally {
      setDeleting(false)
    }
  }

  if (task.status === 'completed' || task.status === 'missed') return null

  const category = task.category || 'other'

  return (
    <article className={`group rounded-[1.75rem] border bg-sr-card p-4 transition-all hover:-translate-y-1 hover:shadow-xl ${PRIORITY_STYLES[task.priority]} ${countdown.isCritical ? 'card-critical' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sr-muted">{task.priority} priority</p>
          <h3 className="mt-2 font-display text-xl font-semibold tracking-tight text-sr-text">{task.title}</h3>
          {task.description ? (
            <p className="mt-2 line-clamp-2 text-sm leading-6 text-sr-muted">{task.description}</p>
          ) : null}
        </div>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="rounded-full border border-sr-border bg-sr-header p-2 text-sr-muted opacity-0 transition-all hover:border-sr-red hover:text-sr-red group-hover:opacity-100"
          title="Delete task"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${CATEGORY_STYLES[category]}`}>
          {category}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-sr-header px-3 py-1 text-xs font-medium text-sr-muted">
          {SOURCE_ICONS[task.source]}
          {task.source}
        </span>
      </div>

      <div className="mt-5 rounded-[1.25rem] bg-sr-header p-4">
        {task.deadline ? (
          <>
            <p className="text-xs uppercase tracking-[0.2em] text-sr-muted">Time left</p>
            <p className={`mt-2 font-display text-3xl font-bold ${countdown.colorClass} ${countdown.isCritical ? 'countdown-critical' : ''}`}>
              {countdown.display}
            </p>
            <div className="mt-3 flex items-center gap-2">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-sr-border">
                <div
                  className={`h-full rounded-full transition-all ${countdown.isCritical ? 'bg-sr-red' : countdown.isWarning ? 'bg-sr-orange' : 'bg-sr-green'}`}
                  style={{ width: `${Math.min(100, Math.max(5, (1 - countdown.totalSeconds / (7 * 24 * 3600)) * 100))}%` }}
                />
              </div>
              <span className="text-xs text-sr-muted">~{task.aiEstimatedMinutes || task.estimatedMinutes}m</span>
            </div>
          </>
        ) : (
          <p className="text-sm text-sr-muted">No deadline set yet. You can still open focus mode and start working.</p>
        )}
      </div>

      <div className="mt-4 flex gap-2">
        <button
          onClick={handleFocusMode}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-sr-red px-4 py-3 text-sm font-bold text-white transition-transform hover:-translate-y-0.5"
        >
          Open focus mode
          <ArrowRight className="h-4 w-4" />
        </button>
        <button
          onClick={handleComplete}
          title="Mark as done"
          className="inline-flex items-center justify-center rounded-2xl border border-sr-border bg-sr-header px-4 py-3 text-sr-muted transition-colors hover:border-sr-green hover:text-sr-green"
        >
          <CheckCircle2 className="h-5 w-5" />
        </button>
      </div>
    </article>
  )
}
