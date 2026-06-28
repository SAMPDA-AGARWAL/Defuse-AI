'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarRange, LogOut, Plus, RefreshCw } from 'lucide-react'
import SituationHeader from '@/components/situation-room/SituationHeader'
import TaskCard from '@/components/situation-room/TaskCard'
import AIPanel from '@/components/situation-room/AIPanel'
import ChatBot from '@/components/chat/ChatBot'
import { useTasks } from '@/hooks/useTasks'
import api from '@/lib/api'

const CATEGORIES = ['all', 'study', 'exam', 'assignment', 'work', 'meeting', 'payment', 'personal', 'other']
const CATEGORY_LABELS: Record<string, string> = {
  all: 'All',
  study: 'Study',
  exam: 'Exam',
  assignment: 'Assignment',
  work: 'Work',
  meeting: 'Meeting',
  payment: 'Payment',
  personal: 'Personal',
  other: 'Other'
}

export default function DashboardPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | undefined>()
  const [showAddTask, setShowAddTask] = useState(false)
  const [newTask, setNewTask] = useState({ title: '', deadline: '', priority: 'medium', category: 'other' })
  const [syncing, setSyncing] = useState(false)
  const [activeCategory, setActiveCategory] = useState('all')

  useEffect(() => {
    const token = localStorage.getItem('defuse_token')
    if (!token) {
      router.replace('/login')
      return
    }
    setUserId(localStorage.getItem('defuse_user_id') || undefined)
  }, [router])

  const { activeTasks, summary, loading, refetch } = useTasks(userId)

  const filteredTasks = activeCategory === 'all'
    ? activeTasks
    : activeTasks.filter((task) => (task.category || 'other') === activeCategory)

  const highlights = useMemo(() => [
    { label: 'Urgent now', value: summary.critical, tone: 'text-sr-red' },
    { label: 'Active tasks', value: summary.upcoming, tone: 'text-sr-text' },
    { label: 'High priority', value: summary.high, tone: 'text-sr-orange' }
  ], [summary])

  const handleSync = async () => {
    setSyncing(true)
    try {
      await Promise.allSettled([api.get('/sync/gmail?days=7'), api.get('/sync/calendar')])
      refetch()
    } finally {
      setSyncing(false)
    }
  }

  const handleAddTask = async () => {
    if (!newTask.title.trim()) return

    await api.post('/tasks', { ...newTask, estimatedMinutes: 60 })
    setNewTask({ title: '', deadline: '', priority: 'medium', category: 'other' })
    setShowAddTask(false)
    refetch()
  }

  const handleLogout = () => {
    localStorage.clear()
    document.cookie = 'defuse_token=; path=/; max-age=0'
    router.replace('/login')
  }

  return (
    <div className="min-h-screen">
      <SituationHeader summary={summary} />

      <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
        <section className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
          <div className="app-surface rounded-[2rem] p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="max-w-2xl">
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sr-red">Overview</p>
                <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-sr-text sm:text-4xl">
                  A simpler way to stay on top of deadlines
                </h1>
                <p className="mt-3 text-sm leading-6 text-sr-muted sm:text-base">
                  Defuse keeps your tasks in one place, shows what needs attention first, and opens a guided focus page when you want help starting.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleSync}
                  disabled={syncing}
                  className="inline-flex items-center gap-2 rounded-full border border-sr-border bg-sr-header px-4 py-2.5 text-sm font-semibold text-sr-text transition-colors hover:border-sr-red hover:text-sr-red disabled:opacity-60"
                >
                  <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
                  Refresh sources
                </button>
                <button
                  onClick={() => setShowAddTask((value) => !value)}
                  className="inline-flex items-center gap-2 rounded-full bg-sr-red px-4 py-2.5 text-sm font-bold text-white transition-transform hover:-translate-y-0.5"
                >
                  <Plus className="h-4 w-4" />
                  Add task
                </button>
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center gap-2 rounded-full border border-sr-border bg-sr-header px-4 py-2.5 text-sm font-semibold text-sr-muted transition-colors hover:border-sr-red hover:text-sr-red"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {highlights.map((item) => (
                <div key={item.label} className="rounded-[1.5rem] border border-sr-border bg-sr-header p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-sr-muted">{item.label}</p>
                  <p className={`mt-3 font-display text-3xl font-bold ${item.tone}`}>{item.value}</p>
                </div>
              ))}
            </div>

            {showAddTask && (
              <div className="mt-5 rounded-[1.75rem] border border-sr-border bg-sr-header p-4">
                <p className="text-sm font-semibold text-sr-text">Quick add a task</p>
                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <input
                    value={newTask.title}
                    onChange={(event) => setNewTask((prev) => ({ ...prev, title: event.target.value }))}
                    onKeyDown={(event) => event.key === 'Enter' && handleAddTask()}
                    placeholder="Finish prototype, submit report, call mentor..."
                    autoFocus
                    className="rounded-2xl border border-sr-border bg-sr-card px-4 py-3 text-sm text-sr-text outline-none transition-colors placeholder:text-sr-muted focus:border-sr-red xl:col-span-2"
                  />
                  <input
                    type="datetime-local"
                    value={newTask.deadline}
                    onChange={(event) => setNewTask((prev) => ({ ...prev, deadline: event.target.value }))}
                    className="rounded-2xl border border-sr-border bg-sr-card px-4 py-3 text-sm text-sr-text outline-none transition-colors focus:border-sr-red"
                  />
                  <select
                    value={newTask.category}
                    onChange={(event) => setNewTask((prev) => ({ ...prev, category: event.target.value }))}
                    className="rounded-2xl border border-sr-border bg-sr-card px-4 py-3 text-sm text-sr-text outline-none"
                  >
                    {CATEGORIES.filter((category) => category !== 'all').map((category) => (
                      <option key={category} value={category}>{CATEGORY_LABELS[category]}</option>
                    ))}
                  </select>
                  <select
                    value={newTask.priority}
                    onChange={(event) => setNewTask((prev) => ({ ...prev, priority: event.target.value }))}
                    className="rounded-2xl border border-sr-border bg-sr-card px-4 py-3 text-sm text-sr-text outline-none"
                  >
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                  <button
                    onClick={handleAddTask}
                    className="rounded-2xl bg-sr-red px-4 py-3 text-sm font-bold text-white transition-transform hover:-translate-y-0.5"
                  >
                    Save task
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="app-surface rounded-[2rem] p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sr-red/10 text-sr-red">
                <CalendarRange className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sr-muted">How it works</p>
                <h2 className="mt-2 font-display text-2xl font-semibold text-sr-text">Easy to show in a demo</h2>
              </div>
            </div>
            <div className="mt-5 space-y-3">
              {[
                'Defuse collects deadlines from Gmail and Calendar.',
                'The dashboard shows urgent tasks first in simple language.',
                'Opening a task gives a guided focus flow instead of a complex sprint system.'
              ].map((point, index) => (
                <div key={point} className="flex items-start gap-3 rounded-2xl border border-sr-border bg-sr-header p-4">
                  <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-sr-red text-sm font-bold text-white">
                    {index + 1}
                  </span>
                  <p className="text-sm leading-6 text-sr-muted">{point}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
          <div className="app-surface overflow-hidden rounded-[2rem]">
            <div className="border-b border-sr-border px-5 py-4 sm:px-6">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-sm font-semibold text-sr-text">Your tasks</p>
                  <p className="text-sm text-sr-muted">Filter by type and open focus mode when you need step-by-step help.</p>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {CATEGORIES.map((category) => {
                    const count = category === 'all'
                      ? activeTasks.length
                      : activeTasks.filter((task) => (task.category || 'other') === category).length

                    if (category !== 'all' && count === 0) return null

                    return (
                      <button
                        key={category}
                        onClick={() => setActiveCategory(category)}
                        className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                          activeCategory === category
                            ? 'bg-sr-red text-white'
                            : 'border border-sr-border bg-sr-header text-sr-muted hover:border-sr-red hover:text-sr-text'
                        }`}
                      >
                        {CATEGORY_LABELS[category]}
                        {count > 0 ? ` (${count})` : ''}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="p-5 sm:p-6">
              {loading ? (
                <div className="flex h-40 items-center justify-center">
                  <div className="h-10 w-10 rounded-full border-4 border-sr-border border-t-sr-red animate-spin" />
                </div>
              ) : filteredTasks.length === 0 ? (
                <div className="rounded-[1.75rem] border border-dashed border-sr-border bg-sr-header px-6 py-14 text-center">
                  <p className="font-display text-2xl font-semibold text-sr-text">
                    {activeCategory === 'all' ? 'No active tasks right now' : `No ${CATEGORY_LABELS[activeCategory]} tasks yet`}
                  </p>
                  <p className="mt-2 text-sm text-sr-muted">
                    {activeCategory === 'all'
                      ? 'Add one manually or refresh your Google sources to pull in more deadlines.'
                      : 'Try another filter or create a quick task above.'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {filteredTasks.map((task) => (
                    <TaskCard key={task._id} task={task} onUpdate={refetch} />
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-5">
            <AIPanel tasks={activeTasks} summary={summary} onRefresh={refetch} />
          </div>
        </section>
      </div>

      <ChatBot onTasksAdded={refetch} />
    </div>
  )
}
