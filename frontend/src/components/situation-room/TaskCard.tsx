'use client'

import { useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { differenceInHours, differenceInDays, format, isToday, isTomorrow } from 'date-fns'
import { Calendar, CheckCircle2, Edit, Mail, MessageCircle, Mic, MoreHorizontal, Play, Sparkles, Trash2 } from 'lucide-react'
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

const toDatetimeLocalValue = (value?: string) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (num: number) => String(num).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const getDeadlineLabel = (deadline?: string) => {
  if (!deadline) return 'No deadline'
  const date = new Date(deadline)
  if (Number.isNaN(date.getTime())) return 'No deadline'

  if (isToday(date)) return `Today ${format(date, 'ha').toLowerCase()}`
  if (isTomorrow(date)) return `Tomorrow ${format(date, 'ha').toLowerCase()}`
  return format(date, 'MMM d')
}

const getTimeLeftPill = (deadline?: string) => {
  if (!deadline) return null
  const date = new Date(deadline)
  const now = new Date()
  if (Number.isNaN(date.getTime()) || date <= now) return { label: 'Overdue', tone: 'bg-sr-red text-white' }

  const hoursLeft = differenceInHours(date, now)
  if (hoursLeft < 24) {
    return { label: `${Math.max(1, hoursLeft)}h left`, tone: 'bg-sr-red/10 text-sr-red' }
  }

  const daysLeft = differenceInDays(date, now)
  return { label: `${Math.max(1, daysLeft)} day${daysLeft === 1 ? '' : 's'}`, tone: 'bg-sr-header text-sr-text' }
}

export default function TaskCard({ task, onUpdate }: Props) {
  const router = useRouter()
  const progressRef = useRef<HTMLButtonElement | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [updatingProgress, setUpdatingProgress] = useState(false)

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
      setMenuOpen(false)
    }
  }

  const handleEditDeadline = async () => {
    const currentValue = toDatetimeLocalValue(task.deadline)
    const nextValue = window.prompt('Set a deadline in YYYY-MM-DDTHH:MM format. Leave empty to clear it.', currentValue)
    if (nextValue === null) return

    await api.patch(`/tasks/${task._id}`, {
      deadline: nextValue.trim() ? new Date(nextValue).toISOString() : null
    })
    setMenuOpen(false)
    onUpdate()
  }

  const handleSetProgressPrompt = async () => {
    const current = String(task.progressPercent ?? 0)
    const nextValue = window.prompt('Enter progress from 0 to 100', current)
    if (nextValue === null) return
    const parsed = Math.min(100, Math.max(0, Number(nextValue) || 0))
    await api.patch(`/tasks/${task._id}`, { progressPercent: parsed })
    setMenuOpen(false)
    onUpdate()
  }

  const handleProgressClick = async (event: React.MouseEvent<HTMLButtonElement>) => {
    if (!progressRef.current || updatingProgress) return
    const rect = progressRef.current.getBoundingClientRect()
    const rawPercent = ((event.clientX - rect.left) / rect.width) * 100
    const nextProgress = Math.min(100, Math.max(0, Math.round(rawPercent / 5) * 5))

    setUpdatingProgress(true)
    try {
      await api.patch(`/tasks/${task._id}`, { progressPercent: nextProgress })
      onUpdate()
    } finally {
      setUpdatingProgress(false)
    }
  }

  if (task.status === 'completed' || task.status === 'missed') return null

  const category = task.category || 'other'
  const progress = Math.min(100, Math.max(0, task.progressPercent ?? 0))
  const deadlineLabel = getDeadlineLabel(task.deadline)
  const timePill = getTimeLeftPill(task.deadline)

  return (
    <article className={`group relative rounded-[1.5rem] border border-l-2 bg-sr-card p-4 transition-all hover:-translate-y-1 hover:shadow-xl ${PRIORITY_STYLES[task.priority]}`}>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${CATEGORY_STYLES[category]}`}>
              {category}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-sr-header px-3 py-1 text-xs font-medium text-sr-muted">
              {SOURCE_ICONS[task.source]}
              {task.source}
            </span>
          </div>

          <h3 className="mt-3 font-display text-lg font-semibold tracking-tight text-sr-text">{task.title}</h3>
          {task.description ? (
            <p className="mt-2 line-clamp-2 text-sm leading-6 text-sr-muted">{task.description}</p>
          ) : null}
        </div>

        <div className="relative">
          <button
            onClick={() => setMenuOpen((value) => !value)}
            className="rounded-full border border-sr-border bg-sr-header p-2 text-sr-muted opacity-0 transition-all hover:border-sr-red hover:text-sr-red group-hover:opacity-100"
            title="Task options"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>

          {menuOpen ? (
            <div className="absolute right-0 top-11 z-20 w-44 rounded-2xl border border-sr-border bg-sr-card p-2 shadow-2xl">
              <button
                onClick={handleEditDeadline}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-sr-text hover:bg-sr-header"
              >
                <Edit className="h-4 w-4" />
                Edit deadline
              </button>
              <button
                onClick={handleSetProgressPrompt}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-sr-text hover:bg-sr-header"
              >
                <CheckCircle2 className="h-4 w-4" />
                Set progress %
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-sr-red hover:bg-sr-header disabled:opacity-60"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-sr-text">{deadlineLabel}</p>
          <p className="mt-1 text-xs uppercase tracking-[0.2em] text-sr-muted">{task.priority} priority</p>
        </div>
        {timePill ? (
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${timePill.tone}`}>
            {timePill.label}
          </span>
        ) : null}
      </div>

      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between text-xs">
          <span className="text-sr-muted">Progress</span>
          <span className="font-medium text-sr-text">{progress}%</span>
        </div>
        <button
          ref={progressRef}
          onClick={handleProgressClick}
          className="block h-2.5 w-full overflow-hidden rounded-full bg-sr-border"
          title="Click to update progress"
        >
          <span
            className="block h-full rounded-full bg-sr-red transition-all"
            style={{ width: `${Math.max(2, progress)}%` }}
          />
        </button>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <button
          onClick={handleFocusMode}
          title="Open Focus Mode"
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-sr-red text-white transition-transform hover:-translate-y-0.5"
        >
          <Play className="h-4 w-4 fill-white" />
        </button>

        <button
          onClick={handleComplete}
          title="Mark as done"
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-sr-border bg-sr-header text-sr-muted transition-colors hover:border-sr-green hover:text-sr-green"
        >
          <CheckCircle2 className="h-5 w-5" />
        </button>
      </div>
    </article>
  )
}
