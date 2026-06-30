'use client'

import { useEffect, useMemo, useState } from 'react'
import { format, isThisWeek, isToday, isWithinInterval, startOfDay } from 'date-fns'
import { useRouter } from 'next/navigation'
import { Briefcase, CheckCircle2, CreditCard, LogOut, Menu, Plus, RefreshCw, ShieldCheck, UserRound, X } from 'lucide-react'
import TaskCard from '@/components/situation-room/TaskCard'
import AIPanel from '@/components/situation-room/AIPanel'
import ChatBot from '@/components/chat/ChatBot'
import { useTasks } from '@/hooks/useTasks'
import api from '@/lib/api'
import type { Task, User } from '@/types'

type NavFilter = 'all' | 'today' | 'week' | 'study' | 'work' | 'payment' | 'personal'
type TimeGroupKey = 'today' | 'week' | 'month' | 'later'

const NAV_ITEMS: Array<{ key: NavFilter; label: string; icon: typeof ShieldCheck }> = [
  { key: 'all', label: 'All Tasks', icon: ShieldCheck },
  { key: 'today', label: 'Due Today', icon: CheckCircle2 },
  { key: 'week', label: 'This Week', icon: RefreshCw },
  { key: 'study', label: 'Study', icon: UserRound },
  { key: 'work', label: 'Work', icon: Briefcase },
  { key: 'payment', label: 'Payments', icon: CreditCard },
  { key: 'personal', label: 'Personal', icon: UserRound }
]

const GROUP_LABELS: Record<TimeGroupKey, string> = {
  today: 'Due Today',
  week: 'This Week',
  month: 'Next 30 days',
  later: 'Later'
}

const initialCollapsedState: Record<TimeGroupKey, boolean> = {
  today: false,
  week: false,
  month: false,
  later: false
}

const getTaskGroupKey = (task: Task): TimeGroupKey => {
  if (!task.deadline) return 'later'

  const deadline = new Date(task.deadline)
  const now = new Date()
  const inNext30Days = isWithinInterval(deadline, { start: now, end: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) })

  if (isToday(deadline)) return 'today'
  if (isThisWeek(deadline, { weekStartsOn: 1 })) return 'week'
  if (inNext30Days) return 'month'
  return 'later'
}

export default function DashboardPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | undefined>()
  const [user, setUser] = useState<User | null>(null)
  const [showAddTask, setShowAddTask] = useState(false)
  const [newTask, setNewTask] = useState({ title: '', deadline: '', priority: 'medium', category: 'other' })
  const [syncing, setSyncing] = useState(false)
  const [activeFilter, setActiveFilter] = useState<NavFilter>('all')
  const [collapsed, setCollapsed] = useState<Record<TimeGroupKey, boolean>>(initialCollapsedState)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('defuse_token')
    if (!token) {
      router.replace('/login')
      return
    }
    setUserId(localStorage.getItem('defuse_user_id') || undefined)
  }, [router])

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data } = await api.get('/auth/me')
        setUser(data.user)
      } catch (error) {
        console.error(error)
      }
    }

    fetchUser()
  }, [])

  const { tasks, activeTasks, completedTasks, summary, loading, refetch } = useTasks(userId)

  const importedTasks = useMemo(
    () => tasks.filter((task) => task.source !== 'manual' || task.sourceMetadata?.importType === 'syllabus_pdf'),
    [tasks]
  )

  const importedDueThisWeek = useMemo(
    () => importedTasks.filter((task) =>
      ['pending', 'in_progress', 'defusing'].includes(task.status) &&
      task.deadline &&
      isThisWeek(new Date(task.deadline), { weekStartsOn: 1 })
    ).length,
    [importedTasks]
  )

  const sourceCounts = useMemo(() => ({
    gmail: importedTasks.filter((task) => task.source === 'gmail').length,
    calendar: importedTasks.filter((task) => task.source === 'calendar').length,
    pdf: importedTasks.filter((task) => task.sourceMetadata?.importType === 'syllabus_pdf').length,
    other: importedTasks.filter((task) => ['screenshot', 'whatsapp', 'voice'].includes(task.source)).length
  }), [importedTasks])

  const filteredTasks = useMemo(() => {
    const todayStart = startOfDay(new Date())
    return activeTasks.filter((task) => {
      const deadline = task.deadline ? new Date(task.deadline) : null

      switch (activeFilter) {
        case 'today':
          return deadline ? isToday(deadline) : false
        case 'week':
          return deadline ? isThisWeek(deadline, { weekStartsOn: 1 }) : false
        case 'study':
          return ['study', 'exam', 'assignment'].includes(task.category)
        case 'work':
          return ['work', 'meeting'].includes(task.category)
        case 'payment':
          return task.category === 'payment'
        case 'personal':
          return ['personal', 'health'].includes(task.category)
        default:
          return !deadline || deadline >= todayStart || task.status !== 'missed'
      }
    })
  }, [activeFilter, activeTasks])

  const groupedTasks = useMemo(() => {
    const groups: Record<TimeGroupKey, Task[]> = { today: [], week: [], month: [], later: [] }
    filteredTasks
      .slice()
      .sort((a, b) => {
        const aTime = a.deadline ? new Date(a.deadline).getTime() : Number.MAX_SAFE_INTEGER
        const bTime = b.deadline ? new Date(b.deadline).getTime() : Number.MAX_SAFE_INTEGER
        return aTime - bTime
      })
      .forEach((task) => {
        groups[getTaskGroupKey(task)].push(task)
      })

    return groups
  }, [filteredTasks])

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

  const toggleSection = (key: TimeGroupKey) => {
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const selectedLabel = NAV_ITEMS.find((item) => item.key === activeFilter)?.label || 'All Tasks'
  const userInitials = (user?.name || 'Defuse User')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="min-h-screen">
      <div className="mx-auto flex max-w-[1440px] gap-5 px-4 py-5 sm:px-6 lg:px-8">
        <aside className="hidden w-[200px] flex-shrink-0 lg:block">
          <div className="app-surface flex h-[calc(100vh-2.5rem)] flex-col rounded-[2rem] p-4">
            <div className="flex items-center gap-3 px-2 py-2">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sr-red text-white">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="font-display text-lg font-bold text-sr-text">DEFUSE</p>
                <p className="text-xs text-sr-muted">Task hub</p>
              </div>
            </div>

            <nav className="mt-6 space-y-1">
              {NAV_ITEMS.map(({ key, label, icon: Icon }) => {
                const isActive = activeFilter === key
                return (
                  <button
                    key={key}
                    onClick={() => setActiveFilter(key)}
                    className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-sr-red text-white'
                        : 'text-sr-muted hover:bg-sr-header hover:text-sr-text'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </button>
                )
              })}
            </nav>

            <div className="mt-6 rounded-[1.75rem] bg-sr-header p-3.5">
              <div className="mb-3 px-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-sr-muted">Imported Insights</p>
                <p className="mt-1 text-xs leading-5 text-sr-muted">Live counts from Gmail, Calendar, PDF scans, and captured inputs.</p>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-[1.25rem] bg-sr-card p-3">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-sr-muted">Imported</p>
                  <p className="mt-2 font-display text-2xl font-bold text-sr-text">{importedTasks.length}</p>
                </div>
                <div className="rounded-[1.25rem] bg-sr-card p-3">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-sr-muted">Due This Week</p>
                  <p className="mt-2 font-display text-2xl font-bold text-sr-red">{importedDueThisWeek}</p>
                </div>
              </div>

              <div className="mt-3 space-y-2">
                {[
                  { label: 'Gmail detected', value: sourceCounts.gmail, tone: 'text-sr-red' },
                  { label: 'Calendar synced', value: sourceCounts.calendar, tone: 'text-sr-green' },
                  { label: 'PDF extracted', value: sourceCounts.pdf, tone: 'text-sr-purple' },
                  { label: 'Other captures', value: sourceCounts.other, tone: 'text-sr-orange' }
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between rounded-[1.1rem] bg-sr-card px-3 py-2.5">
                    <p className="text-xs font-medium text-sr-muted">{item.label}</p>
                    <p className={`font-display text-lg font-bold ${item.tone}`}>{item.value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-auto rounded-[1.5rem] bg-sr-header p-3">
              <div className="flex items-center gap-3">
                {user?.avatar ? (
                  <img src={user.avatar} alt={user.name} className="h-11 w-11 rounded-2xl object-cover" />
                ) : (
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sr-red/10 text-sm font-bold text-sr-red">
                    {userInitials}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-sr-text">{user?.name || 'Defuse User'}</p>
                  <p className="truncate text-xs text-sr-muted">{user?.email || 'Connected account'}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-sr-border bg-sr-card px-3 py-2 text-sm font-semibold text-sr-muted"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <div className="mb-4 flex items-center justify-between gap-3 lg:hidden">
            <button
              onClick={() => setSidebarOpen(true)}
              className="inline-flex items-center gap-2 rounded-full border border-sr-border bg-sr-header px-4 py-2.5 text-sm font-semibold text-sr-text"
            >
              <Menu className="h-4 w-4" />
              Menu
            </button>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-full border border-sr-border bg-sr-header px-4 py-2.5 text-sm font-semibold text-sr-muted"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>

          {sidebarOpen ? (
            <div className="fixed inset-0 z-50 bg-black/30 lg:hidden" onClick={() => setSidebarOpen(false)}>
              <div className="h-full w-[250px] bg-sr-bg p-4" onClick={(event) => event.stopPropagation()}>
                <div className="app-surface flex h-full flex-col rounded-[2rem] p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sr-red text-white">
                        <ShieldCheck className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-display text-lg font-bold text-sr-text">DEFUSE</p>
                        <p className="text-xs text-sr-muted">Task hub</p>
                      </div>
                    </div>
                    <button onClick={() => setSidebarOpen(false)} className="rounded-full p-2 text-sr-muted">
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <nav className="mt-6 space-y-1">
                    {NAV_ITEMS.map(({ key, label, icon: Icon }) => {
                      const isActive = activeFilter === key
                      return (
                        <button
                          key={key}
                          onClick={() => {
                            setActiveFilter(key)
                            setSidebarOpen(false)
                          }}
                          className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-medium ${
                            isActive ? 'bg-sr-red text-white' : 'text-sr-muted'
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                          {label}
                        </button>
                      )
                    })}
                  </nav>
                </div>
              </div>
            </div>
          ) : null}

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_280px]">
            <section className="min-w-0">
              <div className="app-surface rounded-[2rem] p-5 sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sr-muted">{selectedLabel}</p>
                    <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-sr-text">Your task timeline</h1>
                    <p className="mt-2 text-sm text-sr-muted">
                      {loading ? 'Loading tasks...' : `${filteredTasks.length} active task${filteredTasks.length !== 1 ? 's' : ''} in this view`}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={handleSync}
                      disabled={syncing}
                      className="inline-flex items-center gap-2 rounded-full border border-sr-border bg-sr-header px-4 py-2.5 text-sm font-semibold text-sr-text disabled:opacity-60"
                    >
                      <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
                      Refresh
                    </button>
                    <button
                      onClick={() => setShowAddTask((value) => !value)}
                      className="inline-flex items-center gap-2 rounded-full bg-sr-red px-4 py-2.5 text-sm font-bold text-white"
                    >
                      <Plus className="h-4 w-4" />
                      Add task
                    </button>
                  </div>
                </div>

                {showAddTask ? (
                  <div className="mt-5 rounded-[1.75rem] border border-sr-border bg-sr-header p-4">
                    <p className="text-sm font-semibold text-sr-text">Quick add a task</p>
                    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      <input
                        value={newTask.title}
                        onChange={(event) => setNewTask((prev) => ({ ...prev, title: event.target.value }))}
                        onKeyDown={(event) => event.key === 'Enter' && handleAddTask()}
                        placeholder="Finish prototype, submit report, call mentor..."
                        autoFocus
                        className="rounded-2xl border border-sr-border bg-sr-card px-4 py-3 text-sm text-sr-text outline-none placeholder:text-sr-muted focus:border-sr-red xl:col-span-2"
                      />
                      <input
                        type="datetime-local"
                        value={newTask.deadline}
                        onChange={(event) => setNewTask((prev) => ({ ...prev, deadline: event.target.value }))}
                        className="rounded-2xl border border-sr-border bg-sr-card px-4 py-3 text-sm text-sr-text outline-none focus:border-sr-red"
                      />
                      <select
                        value={newTask.category}
                        onChange={(event) => setNewTask((prev) => ({ ...prev, category: event.target.value }))}
                        className="rounded-2xl border border-sr-border bg-sr-card px-4 py-3 text-sm text-sr-text outline-none"
                      >
                        <option value="study">Study</option>
                        <option value="exam">Exam</option>
                        <option value="assignment">Assignment</option>
                        <option value="work">Work</option>
                        <option value="meeting">Meeting</option>
                        <option value="payment">Payment</option>
                        <option value="personal">Personal</option>
                        <option value="other">Other</option>
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
                        className="rounded-2xl bg-sr-red px-4 py-3 text-sm font-bold text-white"
                      >
                        Save task
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="mt-5 space-y-4">
                {loading ? (
                  <div className="app-surface flex h-40 items-center justify-center rounded-[2rem]">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-sr-border border-t-sr-red" />
                  </div>
                ) : filteredTasks.length === 0 ? (
                  <div className="app-surface rounded-[2rem] px-6 py-14 text-center">
                    <p className="font-display text-2xl font-semibold text-sr-text">No tasks in this view</p>
                    <p className="mt-2 text-sm text-sr-muted">Try a different section in the sidebar or add a new task.</p>
                  </div>
                ) : (
                  (Object.keys(GROUP_LABELS) as TimeGroupKey[]).map((groupKey) => {
                    const tasks = groupedTasks[groupKey]
                    if (!tasks.length) return null

                    return (
                      <section key={groupKey} className="app-surface overflow-hidden rounded-[2rem]">
                        <button
                          onClick={() => toggleSection(groupKey)}
                          className="flex w-full items-center justify-between gap-3 border-b border-sr-border px-5 py-4 text-left sm:px-6"
                        >
                          <div>
                            <p className="font-display text-2xl font-semibold text-sr-text">{GROUP_LABELS[groupKey]}</p>
                            <p className="mt-1 text-sm text-sr-muted">{tasks.length} task{tasks.length !== 1 ? 's' : ''}</p>
                          </div>
                          <span className="text-sm font-semibold text-sr-muted">
                            {collapsed[groupKey] ? 'Show' : 'Hide'}
                          </span>
                        </button>

                        {!collapsed[groupKey] ? (
                          <div className="grid grid-cols-1 gap-4 p-5 sm:p-6 xl:grid-cols-2">
                            {tasks.map((task) => (
                              <TaskCard key={task._id} task={task} onUpdate={refetch} />
                            ))}
                          </div>
                        ) : null}
                      </section>
                    )
                  })
                )}
              </div>

              <section className="app-surface mt-5 overflow-hidden rounded-[2rem]">
                <div className="border-b border-sr-border px-5 py-4 sm:px-6">
                  <p className="font-display text-2xl font-semibold text-sr-text">Completed tasks</p>
                  <p className="mt-1 text-sm text-sr-muted">Stored separately and ordered by most recently completed.</p>
                </div>

                <div className="p-5 sm:p-6">
                  {completedTasks.length === 0 ? (
                    <div className="rounded-[1.5rem] border border-dashed border-sr-border bg-sr-header px-6 py-10 text-center">
                      <p className="text-lg font-semibold text-sr-text">No completed tasks yet</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {completedTasks.map((task) => (
                        <div key={task._id} className="rounded-[1.5rem] bg-sr-header px-4 py-4 sm:px-5">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0">
                              <p className="font-semibold text-sr-text">{task.title}</p>
                              <p className="mt-1 text-sm text-sr-muted">{task.category} • {task.source}</p>
                            </div>
                            <div className="text-sm text-sr-muted sm:text-right">
                              <p className="font-medium text-sr-green">Completed</p>
                              <p>{task.completedAt ? format(new Date(task.completedAt), 'd MMM, h:mma').toLowerCase() : format(new Date(task.updatedAt), 'd MMM, h:mma').toLowerCase()}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            </section>

            <aside className="flex flex-col gap-4">
              <AIPanel tasks={activeTasks} summary={summary} onRefresh={refetch} />
            </aside>
          </div>
        </div>
      </div>

      <ChatBot onTasksAdded={refetch} />
    </div>
  )
}
