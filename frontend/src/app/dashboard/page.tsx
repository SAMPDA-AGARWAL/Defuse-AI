'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import {
  addDays,
  format,
  isThisMonth,
  isThisWeek,
  isToday,
  startOfDay
} from 'date-fns'
import { useRouter } from 'next/navigation'
import {
  AlertTriangle,
  Bell,
  Briefcase,
  Calendar,
  CalendarDays,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronDown,
  CreditCard,
  FolderKanban,
  Home,
  LayoutGrid,
  LogOut,
  Mail,
  Menu,
  Plus,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Upload,
  UserRound,
  Wallet,
  X
} from 'lucide-react'
import ChatBot from '@/components/chat/ChatBot'
import ThemeToggle from '@/components/ThemeToggle'
import GmailSyncModal from '@/components/situation-room/GmailSyncModal'
import SyllabusScanModal from '@/components/situation-room/SyllabusScanModal'
import { useTasks } from '@/hooks/useTasks'
import api from '@/lib/api'
import type { SourceConnection, Task, TaskCategory, TaskPriority, TaskSummary, User } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

type NavFilter =
  | 'all'
  | 'overdue'
  | 'today'
  | 'week'
  | 'month'
  | 'later'
  | 'completed'
  | 'calendar'
  | 'study'
  | 'work'
  | 'payment'
  | 'personal'

type ResourceKey = 'gmail' | 'calendar' | 'pdf' | 'image'

// ─── Constants ────────────────────────────────────────────────────────────────

const NAV_ITEMS: Array<{ key: NavFilter; label: string; icon: typeof Home }> = [
  { key: 'all',       label: 'All Tasks',   icon: LayoutGrid },
  { key: 'overdue',   label: 'Overdue',     icon: AlertTriangle },
  { key: 'today',     label: 'Due Today',   icon: CheckCircle2 },
  { key: 'week',      label: 'This Week',   icon: CalendarDays },
  { key: 'month',     label: 'This Month',  icon: Calendar },
  { key: 'later',     label: 'Later',       icon: CalendarClock },
  { key: 'completed', label: 'Completed',   icon: Check },
  { key: 'calendar',  label: 'Calendar',    icon: Calendar },
  { key: 'study',     label: 'Study',       icon: FolderKanban },
  { key: 'work',      label: 'Work',        icon: Briefcase },
  { key: 'payment',   label: 'Payments',    icon: CreditCard },
  { key: 'personal',  label: 'Personal',    icon: UserRound }
]

const CATEGORY_STYLES: Record<TaskCategory, string> = {
  study:      'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
  exam:       'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
  assignment: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  work:       'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  meeting:    'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
  payment:    'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  health:     'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
  personal:   'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
  other:      'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
}

const PRIORITY_STYLES: Record<TaskPriority, string> = {
  critical: 'bg-rose-50 text-rose-800 border border-rose-200/60 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-900/30',
  high:     'bg-orange-50 text-orange-800 border border-orange-200/60 dark:bg-orange-950/30 dark:text-orange-300 dark:border-orange-900/30',
  medium:   'bg-amber-50 text-amber-800 border border-amber-200/60 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900/30',
  low:      'bg-emerald-50 text-emerald-800 border border-emerald-200/60 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900/30'
}

const CATEGORY_ICON_STYLES: Record<TaskCategory, string> = {
  study:      'bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400',
  exam:       'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400',
  assignment: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
  work:       'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
  meeting:    'bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400',
  payment:    'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  health:     'bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400',
  personal:   'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400',
  other:      'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
}

const TASK_SOURCE_LABELS: Record<string, string> = {
  gmail:      'From Gmail',
  calendar:   'From Calendar',
  pdf:        'From PDF',
  image:      'From Image',
  screenshot: 'From Screenshot',
  whatsapp:   'From WhatsApp',
  voice:      'From Voice',
  manual:     'Manual'
}

// ─── Small pure helpers ───────────────────────────────────────────────────────

const CategoryGlyph = ({ category }: { category: TaskCategory }) => {
  if (['study', 'exam', 'assignment'].includes(category)) return <FolderKanban className="h-4 w-4" />
  if (['work', 'meeting'].includes(category))             return <Briefcase className="h-4 w-4" />
  if (category === 'payment')                             return <Wallet className="h-4 w-4" />
  if (['personal', 'health'].includes(category))          return <UserRound className="h-4 w-4" />
  return <Calendar className="h-4 w-4" />
}

const SourceIcon = ({ source }: { source: Task['source'] }) => {
  if (source === 'gmail')    return <Mail className="h-3 w-3 text-red-500" />
  if (source === 'calendar') return <Calendar className="h-3 w-3 text-blue-500" />
  if (source === 'pdf')      return <FolderKanban className="h-3 w-3 text-orange-500" />
  return <Sparkles className="h-3 w-3 text-purple-500" />
}

const formatTaskMeta = (task: Task) => {
  if (!task.deadline) return 'No deadline'
  const deadline = new Date(task.deadline)
  if (deadline < new Date()) return `Overdue • was due ${format(deadline, 'MMM d, h:mm a')}`
  if (isToday(deadline)) return `Due today, ${format(deadline, 'h:mm a')}`
  return `Due ${format(deadline, 'MMM d')}, ${format(deadline, 'h:mm a')}`
}

// Exclusively buckets a task into exactly one time group so every active
// task is visible somewhere — overdue/no-deadline tasks never vanish.
const bucketOf = (task: Task): 'overdue' | 'today' | 'week' | 'month' | 'later' => {
  if (!task.deadline) return 'later'
  const deadline = new Date(task.deadline)
  if (deadline < new Date()) return 'overdue'
  if (isToday(deadline)) return 'today'
  if (isThisWeek(deadline, { weekStartsOn: 1 })) return 'week'
  if (isThisMonth(deadline)) return 'month'
  return 'later'
}

const formatResourceSync = (meta?: SourceConnection) => {
  if (!meta?.lastSyncedAt) return meta?.status === 'connected' ? 'Connected' : 'Not connected'
  return `Last synced: Today, ${format(new Date(meta.lastSyncedAt), 'h:mm a')}`
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

// ─── DashboardTaskRow ─────────────────────────────────────────────────────────

function DashboardTaskRow({
  task,
  onComplete
}: {
  task: Task
  onComplete: (id: string) => Promise<void>
}) {
  const category    = task.category || 'other'
  const sourceLabel = TASK_SOURCE_LABELS[task.source] || 'Imported'
  const isOverdue   = !!task.deadline && new Date(task.deadline) < new Date()

  return (
    <div className={`task-row group ${isOverdue ? 'border-l-2 border-rose-500/60 bg-rose-50/40 dark:bg-rose-950/10' : ''}`}>
      {/* Category icon */}
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${CATEGORY_ICON_STYLES[category]}`}
      >
        <CategoryGlyph category={category} />
      </div>

      {/* Title + meta */}
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <p className="truncate text-sm font-medium text-sr-text leading-snug">{task.title}</p>
          <span className={`badge shrink-0 ${CATEGORY_STYLES[category]}`}>
            {capitalize(category)}
          </span>
        </div>
        <div className="mt-0.5 flex items-center gap-1.5 text-xs">
          <span className={isOverdue ? 'font-semibold text-rose-600 dark:text-rose-400' : 'text-sr-muted'}>
            {formatTaskMeta(task)}
          </span>
          <span className="text-sr-border/40">•</span>
          <span className="inline-flex items-center gap-1 text-sr-muted">
            <SourceIcon source={task.source} />
            {sourceLabel}
          </span>
        </div>
      </div>

      {/* Priority badge */}
      <span className={`badge hidden shrink-0 sm:inline-flex ${PRIORITY_STYLES[task.priority]}`}>
        {capitalize(task.priority)}
      </span>

      {/* Complete checkbox */}
      <button
        type="button"
        onClick={() => void onComplete(task._id)}
        aria-label={`Mark ${task.title} complete`}
        className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full border border-sr-border/20 bg-sr-card text-transparent transition-all hover:border-sr-green hover:bg-sr-green/10 hover:text-sr-green"
      >
        <Check className="h-3 w-3" />
      </button>
    </div>
  )
}

// ─── SectionCard ──────────────────────────────────────────────────────────────

function SectionCard({
  title,
  subtitle,
  count,
  badgeTone,
  tasks,
  loading,
  onViewAll,
  maxRows = 4,
  viewAllLabel = 'View all'
}: {
  title: string
  subtitle: string
  count: number
  badgeTone: string
  tasks: Task[]
  loading: boolean
  onViewAll: () => void
  maxRows?: number
  viewAllLabel?: string
}) {
  return (
    <section className="section-card animate-fade-in">
      {/* Header */}
      <div className="section-card-header">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-sr-text">{title}</h2>
            <span className={`badge ${badgeTone}`}>{count}</span>
          </div>
          <p className="mt-0.5 text-xs text-sr-muted">{subtitle}</p>
        </div>
        <button
          type="button"
          onClick={onViewAll}
          className="shrink-0 text-xs font-semibold text-sr-purple transition-colors hover:text-sr-red"
        >
          {viewAllLabel}
        </button>
      </div>

      {/* Rows */}
      <div>
        {loading ? (
          <div className="flex h-24 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-sr-border/20 border-t-sr-red" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-sr-muted">
            No tasks in this section right now.
          </div>
        ) : (
          tasks.slice(0, maxRows).map((task) => (
            <DashboardTaskRow
              key={task._id}
              task={task}
              onComplete={async (id) => {
                await api.post(`/tasks/${id}/complete`)
              }}
            />
          ))
        )}
      </div>
    </section>
  )
}

// ─── StatCard ─────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  tone,
  bg,
  onClick
}: {
  label: string
  value: number
  tone: string
  bg: string
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`stat-card text-left transition-transform hover:-translate-y-0.5 ${bg}`}
    >
      <p className={`text-2xl font-bold leading-none ${tone}`}>{value}</p>
      <p className="mt-1.5 text-[11px] font-medium text-sr-muted">{label}</p>
    </button>
  )
}

// ─── OverviewCard ─────────────────────────────────────────────────────────────

function OverviewCard({ summary, onSelect }: { summary: TaskSummary; onSelect: (filter: NavFilter) => void }) {
  const stats: Array<{ label: string; value: number; tone: string; bg: string; filter: NavFilter }> = [
    { label: 'Due Today',    value: summary.dueToday,   tone: 'text-orange-500 dark:text-orange-400',  bg: 'bg-orange-50 dark:bg-orange-900/20',  filter: 'today' },
    { label: 'Active Tasks', value: summary.active,     tone: 'text-indigo-500 dark:text-indigo-400',  bg: 'bg-indigo-50 dark:bg-indigo-900/20',  filter: 'all' },
    { label: 'Completed',    value: summary.completed,  tone: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20', filter: 'completed' },
    { label: 'Overdue',      value: summary.overdue,    tone: 'text-rose-500 dark:text-rose-400',      bg: 'bg-rose-50 dark:bg-rose-900/20',      filter: 'overdue' }
  ]

  return (
    <section className="dashboard-card p-4">
      <h3 className="text-sm font-semibold text-sr-text">Overview</h3>
      <div className="mt-3 grid grid-cols-2 gap-2.5">
        {stats.map((item) => (
          <StatCard key={item.label} {...item} onClick={() => onSelect(item.filter)} />
        ))}
      </div>
    </section>
  )
}

// ─── AISummaryCard ────────────────────────────────────────────────────────────

function AISummaryCard({
  text,
  loading,
  onRefresh
}: {
  text: string
  loading: boolean
  onRefresh: () => void
}) {
  return (
    <section className="dashboard-card p-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-sr-orange shrink-0" />
        <h3 className="text-sm font-semibold text-sr-text">AI Summary</h3>
      </div>
      <p className="mt-3 text-xs leading-6 text-sr-muted">{text}</p>
      <button
        type="button"
        onClick={onRefresh}
        disabled={loading}
        className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-sr-border/10 bg-sr-header px-3 py-2 text-xs font-semibold text-sr-text transition-colors hover:bg-sr-card disabled:opacity-60"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
        {loading ? 'Refreshing…' : 'Refresh AI Summary'}
      </button>
    </section>
  )
}

// ─── ResourceCardItem ─────────────────────────────────────────────────────────

function ResourceCardItem({
  icon,
  title,
  statusLabel,
  statusTone,
  subtitle,
  actionLabel,
  onAction,
  busy
}: {
  icon: React.ReactNode
  title: string
  statusLabel: string
  statusTone: string
  subtitle: string
  actionLabel: string
  onAction: () => void
  busy?: boolean
}) {
  return (
    <div className="resource-card">
      {/* Icon */}
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sr-card border border-sr-border/08 shadow-sm">
        {icon}
      </div>
      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium text-sr-text">{title}</span>
          <span className={`badge ${statusTone}`}>{statusLabel}</span>
        </div>
        <p className="mt-0.5 truncate text-[11px] text-sr-muted">{subtitle}</p>
      </div>
      {/* Action */}
      <button
        type="button"
        onClick={onAction}
        disabled={busy}
        aria-label={actionLabel}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-sr-border/10 bg-sr-card text-sr-muted transition-colors hover:text-sr-text disabled:opacity-50"
      >
        {busy
          ? <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-sr-border/20 border-t-sr-red" />
          : actionLabel === 'Upload'
            ? <Upload className="h-3.5 w-3.5" />
            : <RefreshCw className="h-3.5 w-3.5" />
        }
      </button>
    </div>
  )
}

// ─── Main DashboardPage ───────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter()
  const [userId,          setUserId]          = useState<string | undefined>()
  const [user,            setUser]            = useState<User | null>(null)
  const [activeFilter,    setActiveFilter]    = useState<NavFilter>('all')
  const [sidebarOpen,     setSidebarOpen]     = useState(false)
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const [settingsOpen,    setSettingsOpen]    = useState(false)
  const [searchQuery,     setSearchQuery]     = useState('')
  const [showAddTask,     setShowAddTask]     = useState(false)
  const [newTask,         setNewTask]         = useState({ title: '', deadline: '', priority: 'medium', category: 'other' })
  const [syncing,         setSyncing]         = useState(false)
  const [showGmailModal,  setShowGmailModal]  = useState(false)
  const [showPdfModal,    setShowPdfModal]    = useState(false)
  const [syncingCal,      setSyncingCal]      = useState(false)
  const [loadingBriefing, setLoadingBriefing] = useState(false)
  const [briefing,        setBriefing]        = useState<Record<string, string> | null>(null)
  const [resourceToast,   setResourceToast]   = useState<string | null>(null)
  const imageInputRef  = useRef<HTMLInputElement | null>(null)
  const accountMenuRef = useRef<HTMLDivElement | null>(null)

  // ── Auth ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem('defuse_token')
    if (!token) { router.replace('/login'); return }
    setUserId(localStorage.getItem('defuse_user_id') || undefined)
  }, [router])

  const refreshUser = async () => {
    try {
      const { data } = await api.get('/auth/me')
      setUser(data.user)
    } catch (error) {
      console.error(error)
    }
  }

  useEffect(() => { void refreshUser() }, [])

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target as Node))
        setAccountMenuOpen(false)
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setAccountMenuOpen(false)
        setSettingsOpen(false)
        setShowAddTask(false)
      }
    }
    document.addEventListener('mousedown', handlePointerDown)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  // ── Data ──────────────────────────────────────────────────────────────────
  const { tasks, activeTasks, completedTasks, summary, loading, refetch } = useTasks(userId)

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSync = async () => {
    setSyncing(true)
    try {
      await Promise.allSettled([api.get('/sync/gmail?days=7'), api.get('/sync/calendar?days=14')])
      setResourceToast('Refreshed Gmail and Calendar')
      await Promise.allSettled([refetch(), refreshUser()])
      window.setTimeout(() => setResourceToast(null), 4000)
    } finally {
      setSyncing(false)
    }
  }

  const handleCalendarRefresh = async () => {
    setSyncingCal(true)
    try {
      const { data } = await api.get('/sync/calendar?days=14')
      setResourceToast(`Synced ${data.synced} calendar events`)
      await Promise.allSettled([refetch(), refreshUser()])
      window.setTimeout(() => setResourceToast(null), 4000)
    } finally {
      setSyncingCal(false)
    }
  }

  const handleImageUpload = async (file?: File | null) => {
    if (!file) return
    const form = new FormData()
    form.append('file', file)
    await api.post('/tasks/extract', form, { headers: { 'Content-Type': 'multipart/form-data' } })
    setResourceToast(`Scanned ${file.name}`)
    await Promise.allSettled([refetch(), refreshUser()])
    window.setTimeout(() => setResourceToast(null), 4000)
  }

  const handleAddTask = async () => {
    if (!newTask.title.trim()) return
    await api.post('/tasks', { ...newTask, estimatedMinutes: 60 })
    setNewTask({ title: '', deadline: '', priority: 'medium', category: 'other' })
    setShowAddTask(false)
    await refetch()
  }

  const handleLogout = () => {
    localStorage.clear()
    document.cookie = 'defuse_token=; path=/; max-age=0'
    router.replace('/login')
  }

  const handleCompleteTask = async (taskId: string) => {
    await api.post(`/tasks/${taskId}/complete`)
    await refetch()
  }

  const handleRefreshSummary = async () => {
    setLoadingBriefing(true)
    try {
      const { data } = await api.post('/ai/briefing')
      setBriefing(data.briefing)
    } finally {
      setLoadingBriefing(false)
    }
  }

  // ── Filtered tasks ────────────────────────────────────────────────────────
  const searchedTasks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return activeTasks
    return activeTasks.filter((task) => {
      const haystack = [task.title, task.description, task.category, task.source]
        .filter(Boolean).join(' ').toLowerCase()
      return haystack.includes(query)
    })
  }, [activeTasks, searchQuery])

  const filterTasksByNav = (task: Task) => {
    switch (activeFilter) {
      case 'calendar':  return task.source === 'calendar'
      case 'study':     return ['study', 'exam', 'assignment'].includes(task.category)
      case 'work':      return ['work', 'meeting'].includes(task.category)
      case 'payment':   return task.category === 'payment'
      case 'personal':  return ['personal', 'health'].includes(task.category)
      case 'overdue':   return bucketOf(task) === 'overdue'
      case 'today':     return bucketOf(task) === 'today'
      case 'week':      return bucketOf(task) === 'week'
      case 'month':     return bucketOf(task) === 'month'
      case 'later':     return bucketOf(task) === 'later'
      default:          return true
    }
  }

  const visibleActiveTasks = useMemo(
    () => searchedTasks.filter(filterTasksByNav),
    [searchedTasks, activeFilter]
  )

  const completedMatches = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    const base = activeFilter === 'completed' ? completedTasks : completedTasks.slice(0, 6)
    if (!query) return base
    return base.filter((task) => task.title.toLowerCase().includes(query))
  }, [completedTasks, activeFilter, searchQuery])

  // When viewing "All Tasks" or a single category, break the pool into the
  // 5 exclusive time buckets so nothing — overdue, far-future, or no-deadline — is ever dropped.
  const overdueTasks = useMemo(() => visibleActiveTasks.filter((t) => bucketOf(t) === 'overdue'), [visibleActiveTasks])
  const dueTodayTasks = useMemo(() => visibleActiveTasks.filter((t) => bucketOf(t) === 'today'), [visibleActiveTasks])
  const thisWeekTasks = useMemo(() => visibleActiveTasks.filter((t) => bucketOf(t) === 'week'), [visibleActiveTasks])
  const thisMonthTasks = useMemo(() => visibleActiveTasks.filter((t) => bucketOf(t) === 'month'), [visibleActiveTasks])
  const laterTasks = useMemo(() => visibleActiveTasks.filter((t) => bucketOf(t) === 'later'), [visibleActiveTasks])

  const importedTasks = useMemo(
    () => tasks.filter((t) => t.source !== 'manual' || t.sourceMetadata?.importType === 'syllabus_pdf'),
    [tasks]
  )
  const importedDueThisWeek = useMemo(
    () => importedTasks.filter((t) =>
      ['pending', 'in_progress', 'defusing'].includes(t.status) &&
      t.deadline && isThisWeek(new Date(t.deadline), { weekStartsOn: 1 })
    ).length,
    [importedTasks]
  )

  const aiSummaryText =
    briefing?.summary ||
    summary.aiSummary ||
    `As of today, you have ${summary.dueToday} tasks due today, ${visibleActiveTasks.filter((t) => t.deadline && isThisWeek(new Date(t.deadline), { weekStartsOn: 1 })).length} tasks due this week and ${summary.overdue} overdue. Keep focusing on high priority items.`

  const userInitials = (user?.name || 'Defuse User')
    .split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()

  const firstName = user?.name?.split(' ')[0] || 'there'

  // ── Sections config ───────────────────────────────────────────────────────
  // Shown as separate cards on "All Tasks". Every active task lands in
  // exactly one of these five — none can silently disappear.
  const allTasksSections = [
    {
      key:       'overdue' as NavFilter,
      title:     'Overdue',
      subtitle:  'Past deadline — handle these first',
      tasks:     overdueTasks,
      badgeTone: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
    },
    {
      key:       'today'  as NavFilter,
      title:     'Due Today',
      subtitle:  'Tasks that need your attention today',
      tasks:     dueTodayTasks,
      badgeTone: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
    },
    {
      key:       'week'   as NavFilter,
      title:     'This Week',
      subtitle:  'Tasks due in the next 7 days',
      tasks:     thisWeekTasks,
      badgeTone: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
    },
    {
      key:       'month'  as NavFilter,
      title:     'This Month',
      subtitle:  'Upcoming tasks this month',
      tasks:     thisMonthTasks,
      badgeTone: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
    },
    {
      key:       'later'  as NavFilter,
      title:     'Later',
      subtitle:  'Beyond this month or no deadline set',
      tasks:     laterTasks,
      badgeTone: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
    }
  ]

  // Shown when a single sidebar filter (a bucket or a category) is active —
  // one complete, untruncated list instead of re-slicing the 5 buckets above.
  const SINGLE_FILTER_META: Partial<Record<NavFilter, { title: string; subtitle: string; badgeTone: string }>> = {
    overdue:  { title: 'Overdue',     subtitle: 'Past deadline — handle these first',        badgeTone: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' },
    today:    { title: 'Due Today',   subtitle: 'Tasks that need your attention today',      badgeTone: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
    week:     { title: 'This Week',   subtitle: 'Tasks due in the next 7 days',              badgeTone: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
    month:    { title: 'This Month',  subtitle: 'Upcoming tasks this month',                 badgeTone: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' },
    later:    { title: 'Later',       subtitle: 'Beyond this month or no deadline set',       badgeTone: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' },
    calendar: { title: 'Calendar',    subtitle: 'Tasks imported from your calendar',          badgeTone: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
    study:    { title: 'Study',       subtitle: 'Study, exams, and assignments',              badgeTone: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400' },
    work:     { title: 'Work',        subtitle: 'Work tasks and meetings',                    badgeTone: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
    payment:  { title: 'Payments',    subtitle: 'Bills and payments due',                     badgeTone: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
    personal: { title: 'Personal',    subtitle: 'Personal and health tasks',                  badgeTone: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400' }
  }

  // ── Resources config ──────────────────────────────────────────────────────
  const resourceCards = [
    {
      key:         'gmail' as ResourceKey,
      title:       'Gmail',
      icon:        <Mail className="h-4 w-4 text-red-500" />,
      statusLabel: user?.sources?.gmail?.status === 'connected' ? 'Synced' : 'Connect',
      statusTone:  user?.sources?.gmail?.status === 'connected'
        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
      subtitle:    formatResourceSync(user?.sources?.gmail),
      actionLabel: 'Refresh',
      onAction:    () => setShowGmailModal(true),
      busy:        false
    },
    {
      key:         'calendar' as ResourceKey,
      title:       'Calendar',
      icon:        <Calendar className="h-4 w-4 text-blue-500" />,
      statusLabel: user?.sources?.calendar?.status === 'connected' ? 'Synced' : 'Connect',
      statusTone:  user?.sources?.calendar?.status === 'connected'
        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
      subtitle:    formatResourceSync(user?.sources?.calendar),
      actionLabel: syncingCal ? 'Refreshing' : 'Refresh',
      onAction:    () => void handleCalendarRefresh(),
      busy:        syncingCal
    },
    {
      key:         'pdf' as ResourceKey,
      title:       'Scan PDF',
      icon:        <FolderKanban className="h-4 w-4 text-orange-500" />,
      statusLabel: user?.sources?.pdf?.status === 'connected' ? 'Ready' : 'Upload',
      statusTone:  user?.sources?.pdf?.status === 'connected'
        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
      subtitle:    user?.sources?.pdf?.fileName || formatResourceSync(user?.sources?.pdf),
      actionLabel: 'Upload',
      onAction:    () => setShowPdfModal(true),
      busy:        false
    },
    {
      key:         'image' as ResourceKey,
      title:       'Image Scan',
      icon:        <Sparkles className="h-4 w-4 text-purple-500" />,
      statusLabel: user?.sources?.image?.status === 'connected' ? 'Ready' : 'Upload',
      statusTone:  user?.sources?.image?.status === 'connected'
        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
      subtitle:    user?.sources?.image?.fileName || formatResourceSync(user?.sources?.image),
      actionLabel: 'Upload',
      onAction:    () => imageInputRef.current?.click(),
      busy:        false
    }
  ]

  // ── Sub-components (inside page for shared state access) ──────────────────

  const SidebarContent = ({ mobile = false }: { mobile?: boolean }) => (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Logo */}
      <div className="flex shrink-0 items-center gap-3 px-4 pt-5 pb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-red-500 text-white shadow-[0_4px_14px_rgba(235,91,42,0.35)] shrink-0">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="font-display text-base font-bold tracking-tight text-sr-text leading-none">DEFUSE AI</p>
          <p className="mt-0.5 text-[11px] leading-4 text-sr-muted">Deadline clarity for students &amp; teams</p>
        </div>
      </div>

      {/* Scrollable middle: nav + AI insights. Logo stays pinned above,
          profile stays pinned below, regardless of how many nav items there are. */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {/* Nav */}
        <nav className="px-3 pb-2 space-y-0.5">
          {/* Home */}
          <button
            type="button"
            onClick={() => { router.push('/'); setSidebarOpen(false) }}
            className="nav-item w-full"
          >
            <Home className="h-4 w-4 shrink-0" />
            <span>Home</span>
          </button>

          {/* Divider */}
          <div className="mx-1 my-2 h-px bg-sr-border/8" />

          {NAV_ITEMS.map(({ key, label, icon: Icon }) => {
            const isActive = activeFilter === key
            return (
              <button
                key={key}
                type="button"
                onClick={() => { setActiveFilter(key); setSidebarOpen(false) }}
                className={`nav-item w-full ${isActive ? 'nav-item-active' : ''}`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{label}</span>
              </button>
            )
          })}
        </nav>

        {/* AI Insights mini-card */}
        <div className="mx-3 mt-2 mb-3 rounded-2xl border border-orange-200/60 bg-gradient-to-b from-orange-50 to-amber-50 p-4 dark:border-orange-900/30 dark:from-orange-900/20 dark:to-amber-900/20">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-3.5 w-3.5 text-orange-500 shrink-0" />
            <p className="text-[11px] font-semibold uppercase tracking-widest text-orange-600 dark:text-orange-400">AI Insights</p>
          </div>
          <p className="text-xs leading-5 text-sr-muted">
            You have <span className="font-semibold text-sr-text">{summary.dueToday}</span> tasks due today and{' '}
            <span className="font-semibold text-sr-text">{importedDueThisWeek}</span> due this week. Focus on finishing high priority items first.
          </p>
          <button
            type="button"
            onClick={handleRefreshSummary}
            className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-orange-200 bg-white/80 px-3 py-2 text-xs font-semibold text-sr-text transition-colors hover:bg-white dark:border-orange-900/40 dark:bg-sr-card/60 dark:hover:bg-sr-card"
          >
            <RefreshCw className="h-3 w-3 text-orange-500" />
            Refresh Insights
          </button>
        </div>
      </div>

      {/* User profile */}
      <div className="shrink-0 px-3 pb-4" ref={mobile ? undefined : accountMenuRef}>
        <div className="relative">
          <button
            type="button"
            onClick={() => setAccountMenuOpen((v) => !v)}
            className="flex w-full items-center gap-2.5 rounded-2xl border border-sr-border/10 bg-sr-header px-3 py-2.5 text-left transition-colors hover:bg-sr-card"
          >
            {user?.avatar ? (
              <img src={user.avatar} alt={user.name} className="h-8 w-8 shrink-0 rounded-xl object-cover" />
            ) : (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-red-500 text-xs font-bold text-white">
                {userInitials}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-sr-text">{user?.name || 'Defuse User'}</p>
              <p className="truncate text-[11px] text-sr-muted">{user?.email || 'Connected account'}</p>
            </div>
            <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-sr-muted transition-transform ${accountMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {accountMenuOpen && (
            <div className="absolute bottom-[calc(100%+0.5rem)] left-0 right-0 z-30 overflow-hidden rounded-2xl border border-sr-border/10 bg-sr-card shadow-[0_8px_30px_rgba(15,23,42,0.12)] animate-fade-in">
              <div className="border-b border-sr-border/08 px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-sr-muted">Account</p>
                <p className="mt-0.5 truncate text-xs font-medium text-sr-text">{user?.email || 'No email'}</p>
              </div>
              <div className="p-1.5 space-y-0.5">
                <button
                  type="button"
                  onClick={() => { setAccountMenuOpen(false); setSettingsOpen(true); setSidebarOpen(false) }}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-sr-text transition-colors hover:bg-sr-header"
                >
                  <Settings className="h-3.5 w-3.5 text-sr-muted" />
                  Profile settings
                </button>
                <button
                  type="button"
                  onClick={() => { setAccountMenuOpen(false); handleLogout() }}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-rose-600 dark:text-rose-400 transition-colors hover:bg-rose-50 dark:hover:bg-rose-900/20"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Log out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen overflow-hidden bg-sr-bg">
      {/* ── Modals & overlays ── */}
      {showGmailModal && (
        <GmailSyncModal
          onClose={() => setShowGmailModal(false)}
          onSynced={(result) => {
            setShowGmailModal(false)
            setResourceToast(`Scanned ${result.emails} emails and added ${result.tasks} tasks`)
            void Promise.allSettled([refetch(), refreshUser()])
            window.setTimeout(() => setResourceToast(null), 4500)
          }}
        />
      )}

      {showPdfModal && (
        <SyllabusScanModal
          onClose={() => setShowPdfModal(false)}
          onSaved={(result) => {
            setShowPdfModal(false)
            setResourceToast(`Saved ${result.count} tasks from PDF`)
            void Promise.allSettled([refetch(), refreshUser()])
            window.setTimeout(() => setResourceToast(null), 4500)
          }}
        />
      )}

      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => void handleImageUpload(e.target.files?.[0])}
      />

      {/* Settings modal */}
      {settingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6 backdrop-blur-sm">
          <div className="absolute inset-0" onClick={() => setSettingsOpen(false)} aria-hidden="true" />
          <div className="relative z-10 w-full max-w-md rounded-[22px] border border-sr-border/10 bg-sr-card p-6 shadow-[0_24px_60px_rgba(0,0,0,0.18)] animate-fade-in">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 dark:bg-orange-900/30">
                  <Settings className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-sr-muted">Settings</p>
                  <h2 className="text-lg font-bold text-sr-text">Account settings</h2>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSettingsOpen(false)}
                className="rounded-full p-1.5 text-sr-muted transition-colors hover:bg-sr-header hover:text-sr-text"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 rounded-2xl border border-sr-border/08 bg-sr-header p-4">
              <div className="flex items-center gap-3">
                {user?.avatar ? (
                  <img src={user.avatar} alt={user.name} className="h-10 w-10 rounded-xl object-cover" />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-red-500 text-sm font-bold text-white">
                    {userInitials}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-sr-text">{user?.name || 'Defuse User'}</p>
                  <p className="truncate text-xs text-sr-muted">{user?.email || 'Loading...'}</p>
                </div>
              </div>
              <p className="mt-3 text-xs leading-5 text-sr-muted">
                Your account is connected to this dashboard. More settings and preferences are available in the full settings page.
              </p>
            </div>

            <div className="mt-4 flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-2 rounded-xl bg-rose-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-rose-600"
              >
                <LogOut className="h-4 w-4" />
                Log out
              </button>
              <Link
                href="/dashboard/settings"
                className="inline-flex items-center gap-2 rounded-xl border border-sr-border/10 bg-sr-header px-4 py-2.5 text-sm font-semibold text-sr-text transition-colors hover:bg-sr-card"
              >
                <Settings className="h-4 w-4" />
                Full settings
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ── Left Sidebar (own scroll region) ── */}
      <aside className="hidden h-full w-[240px] shrink-0 overflow-y-auto xl:flex xl:flex-col border-r border-sr-border/08 bg-sr-card">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar drawer */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-50 xl:hidden"
          onClick={() => setSidebarOpen(false)}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="absolute left-0 top-0 h-full w-[260px] overflow-y-auto bg-sr-card shadow-[4px_0_24px_rgba(0,0,0,0.15)] animate-slide-in"
            onClick={(e) => e.stopPropagation()}
          >
            <SidebarContent mobile />
          </div>
        </div>
      )}

      {/* ── Main column ── */}
      <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="shrink-0 border-b border-sr-border/08 bg-sr-card px-5 py-3.5">
          <div className="flex items-center justify-between gap-4">
            {/* Left: hamburger (mobile) + greeting */}
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-sr-border/10 text-sr-muted transition-colors hover:text-sr-text xl:hidden"
                aria-label="Open menu"
              >
                <Menu className="h-4 w-4" />
              </button>
              <div className="min-w-0">
                <h1 className="truncate text-base font-bold text-sr-text leading-tight">
                  Welcome back, {firstName}! <span aria-hidden="true">👋</span>
                </h1>
                <p className="text-xs text-sr-muted hidden sm:block">Let&apos;s stay on top of your deadlines today.</p>
              </div>
            </div>

            {/* Right: search + actions */}
            <div className="flex shrink-0 items-center gap-2">
              {/* Search */}
              <label className="hidden items-center gap-2 rounded-xl border border-sr-border/10 bg-sr-header px-3 py-2 text-sm text-sr-muted md:flex">
                <Search className="h-3.5 w-3.5 shrink-0" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search tasks…"
                  className="w-48 bg-transparent text-xs text-sr-text outline-none placeholder:text-sr-muted"
                />
              </label>

              {/* Bell */}
              <button
                type="button"
                aria-label="Notifications"
                className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-sr-border/10 bg-sr-header text-sr-muted transition-colors hover:text-sr-text"
              >
                <Bell className="h-4 w-4" />
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-orange-500" />
              </button>

              {/* Theme toggle */}
              <ThemeToggle compact />

              {/* Add Task */}
              <button
                type="button"
                onClick={() => setShowAddTask(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 px-3 py-2 text-xs font-semibold text-white shadow-[0_4px_14px_rgba(235,91,42,0.3)] transition-all hover:-translate-y-px hover:shadow-[0_6px_20px_rgba(235,91,42,0.35)]"
              >
                <Plus className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Add Task</span>
              </button>
            </div>
          </div>
        </header>

        {/* Scrollable content — main task list and right panel each scroll independently */}
        <div className="flex flex-1 overflow-hidden">
          {/* Center column */}
          <main className="flex-1 overflow-y-auto px-5 py-5">
            {/* Mobile search */}
            <label className="mb-4 flex items-center gap-2 rounded-xl border border-sr-border/10 bg-sr-card px-3 py-2.5 text-sm text-sr-muted md:hidden">
              <Search className="h-4 w-4 shrink-0" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tasks…"
                className="w-full bg-transparent text-sm text-sr-text outline-none placeholder:text-sr-muted"
              />
            </label>

            {/* Toast */}
            {resourceToast && (
              <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-400 animate-fade-in">
                {resourceToast}
              </div>
            )}

            {/* Add Task form */}
            {showAddTask && (
              <section className="mb-5 dashboard-card p-5 animate-fade-in">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div>
                    <p className="text-sm font-semibold text-sr-text">Add a new task</p>
                    <p className="mt-0.5 text-xs text-sr-muted">Create a task without leaving the dashboard.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAddTask(false)}
                    className="flex h-8 w-8 items-center justify-center rounded-xl border border-sr-border/10 bg-sr-header text-sr-muted transition-colors hover:text-sr-text"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
                  <input
                    value={newTask.title}
                    onChange={(e) => setNewTask((p) => ({ ...p, title: e.target.value }))}
                    placeholder="Task title…"
                    className="col-span-full rounded-xl border border-sr-border/10 bg-sr-header px-3.5 py-2.5 text-sm text-sr-text placeholder:text-sr-muted sm:col-span-1 xl:col-span-2"
                  />
                  <input
                    type="datetime-local"
                    value={newTask.deadline}
                    onChange={(e) => setNewTask((p) => ({ ...p, deadline: e.target.value }))}
                    className="rounded-xl border border-sr-border/10 bg-sr-header px-3.5 py-2.5 text-sm text-sr-text"
                  />
                  <select
                    value={newTask.category}
                    onChange={(e) => setNewTask((p) => ({ ...p, category: e.target.value }))}
                    className="rounded-xl border border-sr-border/10 bg-sr-header px-3.5 py-2.5 text-sm text-sr-text"
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
                    onChange={(e) => setNewTask((p) => ({ ...p, priority: e.target.value }))}
                    className="rounded-xl border border-sr-border/10 bg-sr-header px-3.5 py-2.5 text-sm text-sr-text"
                  >
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => void handleAddTask()}
                  className="mt-3.5 inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(235,91,42,0.25)] transition-all hover:-translate-y-px"
                >
                  <Plus className="h-4 w-4" />
                  Save task
                </button>
              </section>
            )}

            {/* Task sections */}
            <div className="space-y-4">
              {activeFilter === 'completed' ? (
                <section className="section-card animate-fade-in">
                  <div className="section-card-header">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-semibold text-sr-text">Completed</h2>
                        <span className="badge bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">{completedMatches.length}</span>
                      </div>
                      <p className="mt-0.5 text-xs text-sr-muted">Finished tasks, most recently completed first.</p>
                    </div>
                  </div>
                  <div>
                    {completedMatches.length === 0 ? (
                      <div className="px-5 py-10 text-center text-sm text-sr-muted">No completed tasks match this view.</div>
                    ) : (
                      completedMatches.map((task) => (
                        <div key={task._id} className="task-row">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                            <Check className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-sr-text line-through opacity-70">{task.title}</p>
                            <p className="mt-0.5 text-xs text-sr-muted">
                              Completed {format(new Date(task.completedAt || task.updatedAt), 'MMM d, h:mm a')}
                            </p>
                          </div>
                          <span className="badge bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 shrink-0">Done</span>
                        </div>
                      ))
                    )}
                  </div>
                </section>
              ) : activeFilter === 'all' ? (
                allTasksSections.map((section) => (
                  <SectionCard
                    key={section.key}
                    title={section.title}
                    subtitle={section.subtitle}
                    count={section.tasks.length}
                    badgeTone={section.badgeTone}
                    tasks={section.tasks}
                    loading={loading}
                    onViewAll={() => setActiveFilter(section.key)}
                    maxRows={4}
                  />
                ))
              ) : (
                <SectionCard
                  title={SINGLE_FILTER_META[activeFilter]?.title || 'Tasks'}
                  subtitle={SINGLE_FILTER_META[activeFilter]?.subtitle || ''}
                  count={visibleActiveTasks.length}
                  badgeTone={SINGLE_FILTER_META[activeFilter]?.badgeTone || 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}
                  tasks={visibleActiveTasks}
                  loading={loading}
                  onViewAll={() => setActiveFilter('all')}
                  viewAllLabel="Back to All Tasks"
                  maxRows={200}
                />
              )}
            </div>
          </main>

          {/* Right panel */}
          <aside className="hidden h-full w-[300px] shrink-0 overflow-y-auto border-l border-sr-border/08 bg-sr-bg p-4 lg:block">
            <div className="space-y-4">
              <OverviewCard summary={summary} onSelect={setActiveFilter} />

              <AISummaryCard
                text={aiSummaryText}
                loading={loadingBriefing}
                onRefresh={() => void handleRefreshSummary()}
              />

              <section className="dashboard-card p-4">
                <h3 className="text-sm font-semibold text-sr-text mb-3">Resources</h3>
                <div className="space-y-2">
                  {resourceCards.map((r) => (
                    <ResourceCardItem
                      key={r.key}
                      icon={r.icon}
                      title={r.title}
                      statusLabel={r.statusLabel}
                      statusTone={r.statusTone}
                      subtitle={r.subtitle}
                      actionLabel={r.actionLabel}
                      onAction={r.onAction}
                      busy={r.busy}
                    />
                  ))}
                </div>
              </section>
            </div>
          </aside>
        </div>
      </div>

      {/* Mobile bottom: Right panel collapses below (lg and below) */}
      {/* This section only renders on tablets/mobile */}
      <div className="sr-only">
        {/* Right panel is hidden on mobile — content accessible via sections */}
      </div>

      <ChatBot onTasksAdded={refetch} />
    </div>
  )
}
