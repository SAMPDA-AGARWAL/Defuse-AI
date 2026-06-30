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
  Bell,
  Briefcase,
  Calendar,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  CreditCard,
  FolderKanban,
  Home,
  LayoutGrid,
  LogOut,
  Menu,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
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

type NavFilter =
  | 'all'
  | 'today'
  | 'week'
  | 'month'
  | 'completed'
  | 'calendar'
  | 'study'
  | 'work'
  | 'payment'
  | 'personal'

type ResourceKey = 'gmail' | 'calendar' | 'pdf' | 'image'

const NAV_ITEMS: Array<{ key: NavFilter; label: string; icon: typeof Home }> = [
  { key: 'all', label: 'All Tasks', icon: LayoutGrid },
  { key: 'today', label: 'Due Today', icon: CheckCircle2 },
  { key: 'week', label: 'This Week', icon: CalendarDays },
  { key: 'month', label: 'This Month', icon: Calendar },
  { key: 'completed', label: 'Completed', icon: Check },
  { key: 'calendar', label: 'Calendar', icon: Calendar },
  { key: 'study', label: 'Study', icon: FolderKanban },
  { key: 'work', label: 'Work', icon: Briefcase },
  { key: 'payment', label: 'Payments', icon: CreditCard },
  { key: 'personal', label: 'Personal', icon: UserRound }
]

const CATEGORY_STYLES: Record<TaskCategory, string> = {
  study: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300',
  exam: 'bg-rose-500/10 text-rose-600 dark:text-rose-300',
  assignment: 'bg-violet-500/10 text-violet-600 dark:text-violet-300',
  work: 'bg-orange-500/10 text-orange-600 dark:text-orange-300',
  meeting: 'bg-sky-500/10 text-sky-600 dark:text-sky-300',
  payment: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  health: 'bg-pink-500/10 text-pink-600 dark:text-pink-300',
  personal: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300',
  other: 'bg-sr-header text-sr-muted'
}

const PRIORITY_STYLES: Record<TaskPriority, string> = {
  critical: 'bg-rose-500/10 text-rose-600 dark:text-rose-300',
  high: 'bg-orange-500/10 text-orange-600 dark:text-orange-300',
  medium: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  low: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
}

const TASK_SOURCE_LABELS: Record<string, string> = {
  gmail: 'From Gmail',
  calendar: 'From Calendar',
  pdf: 'From PDF',
  image: 'From Image',
  screenshot: 'From Screenshot',
  whatsapp: 'From WhatsApp',
  voice: 'From Voice',
  manual: 'Manual'
}

const getCategoryIconStyles = (category: TaskCategory) => {
  switch (category) {
    case 'study':
    case 'exam':
    case 'assignment':
      return 'bg-violet-500/10 text-violet-600 dark:text-violet-300'
    case 'work':
    case 'meeting':
      return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300'
    case 'payment':
      return 'bg-amber-500/10 text-amber-700 dark:text-amber-300'
    case 'personal':
    case 'health':
      return 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300'
    default:
      return 'bg-sr-header text-sr-muted'
  }
}

const CategoryGlyph = ({ category }: { category: TaskCategory }) => {
  if (['study', 'exam', 'assignment'].includes(category)) return <FolderKanban className="h-4 w-4" />
  if (['work', 'meeting'].includes(category)) return <Briefcase className="h-4 w-4" />
  if (category === 'payment') return <Wallet className="h-4 w-4" />
  if (['personal', 'health'].includes(category)) return <UserRound className="h-4 w-4" />
  return <Calendar className="h-4 w-4" />
}

const SourceGlyph = ({ source }: { source: Task['source'] }) => {
  if (source === 'gmail') return <span className="font-semibold text-sr-red">G</span>
  if (source === 'calendar') return <Calendar className="h-3.5 w-3.5" />
  if (source === 'pdf') return <FolderKanban className="h-3.5 w-3.5" />
  return <Sparkles className="h-3.5 w-3.5" />
}

const formatTaskMeta = (task: Task) => {
  if (!task.deadline) return 'No deadline'
  const deadline = new Date(task.deadline)
  if (isToday(deadline)) return `Due today, ${format(deadline, 'h:mm a')}`
  return `Due ${format(deadline, 'MMM d')}, ${format(deadline, 'h:mm a')}`
}

const formatResourceSync = (meta?: SourceConnection) => {
  if (!meta?.lastSyncedAt) return meta?.status === 'connected' ? 'Connected just now' : 'Not connected'
  return `Last synced: ${format(new Date(meta.lastSyncedAt), 'MMM d, h:mm a')}`
}

function DashboardTaskRow({ task, onComplete }: { task: Task; onComplete: (taskId: string) => Promise<void> }) {
  const category = task.category || 'other'
  const sourceLabel = TASK_SOURCE_LABELS[task.source] || 'Imported'

  return (
    <div className="group flex items-center gap-3 px-4 py-4 transition-colors hover:bg-sr-header/70 sm:px-5">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${getCategoryIconStyles(category)}`}>
        <CategoryGlyph category={category} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-semibold text-sr-text sm:text-[0.95rem]">{task.title}</p>
          <span className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${CATEGORY_STYLES[category]}`}>
            {category.charAt(0).toUpperCase() + category.slice(1)}
          </span>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-sr-muted">
          <span>{formatTaskMeta(task)}</span>
          <span className="hidden text-sr-border/30 sm:inline">•</span>
          <span className="inline-flex items-center gap-1">
            <SourceGlyph source={task.source} />
            {sourceLabel}
          </span>
        </div>
      </div>

      <span className={`hidden rounded-full px-2.5 py-1 text-xs font-semibold sm:inline-flex ${PRIORITY_STYLES[task.priority]}`}>
        {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
      </span>

      <button
        type="button"
        onClick={() => void onComplete(task._id)}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-sr-border/20 bg-sr-card text-transparent transition-all hover:border-sr-green hover:bg-sr-green/10 hover:text-sr-green"
        aria-label={`Mark ${task.title} complete`}
      >
        <Check className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

function OverviewCard({ summary }: { summary: TaskSummary }) {
  const stats = [
    { label: 'Due Today', value: summary.dueToday, tone: 'text-sr-red', bg: 'bg-sr-red/6' },
    { label: 'Active Tasks', value: summary.active, tone: 'text-sr-purple', bg: 'bg-sr-purple/6' },
    { label: 'Completed', value: summary.completed, tone: 'text-sr-green', bg: 'bg-sr-green/6' },
    { label: 'Overdue', value: summary.overdue, tone: 'text-sr-red', bg: 'bg-sr-orange/8' }
  ]

  return (
    <section className="rounded-[22px] border border-sr-border/10 bg-sr-card p-5 shadow-[0_12px_36px_rgba(69,86,66,0.08)]">
      <h3 className="text-xl font-semibold tracking-tight text-sr-text">Overview</h3>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {stats.map((item) => (
          <div key={item.label} className={`rounded-[18px] border border-sr-border/6 ${item.bg} p-4 text-center`}>
            <p className={`font-display text-[2rem] font-bold ${item.tone}`}>{item.value}</p>
            <p className="mt-1 text-xs font-medium text-sr-muted">{item.label}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

export default function DashboardPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | undefined>()
  const [user, setUser] = useState<User | null>(null)
  const [activeFilter, setActiveFilter] = useState<NavFilter>('all')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddTask, setShowAddTask] = useState(false)
  const [newTask, setNewTask] = useState({ title: '', deadline: '', priority: 'medium', category: 'other' })
  const [syncing, setSyncing] = useState(false)
  const [showGmailModal, setShowGmailModal] = useState(false)
  const [showPdfModal, setShowPdfModal] = useState(false)
  const [syncingCal, setSyncingCal] = useState(false)
  const [loadingBriefing, setLoadingBriefing] = useState(false)
  const [briefing, setBriefing] = useState<Record<string, string> | null>(null)
  const [resourceToast, setResourceToast] = useState<string | null>(null)
  const imageInputRef = useRef<HTMLInputElement | null>(null)
  const accountMenuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('defuse_token')
    if (!token) {
      router.replace('/login')
      return
    }
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

  useEffect(() => {
    void refreshUser()
  }, [])

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target as Node)) {
        setAccountMenuOpen(false)
      }
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

  const { tasks, activeTasks, completedTasks, summary, loading, refetch } = useTasks(userId)

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

  const searchedTasks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return activeTasks
    return activeTasks.filter((task) => {
      const haystack = [task.title, task.description, task.category, task.source].filter(Boolean).join(' ').toLowerCase()
      return haystack.includes(query)
    })
  }, [activeTasks, searchQuery])

  const filterTasksByNav = (task: Task) => {
    const deadline = task.deadline ? new Date(task.deadline) : null
    switch (activeFilter) {
      case 'today':
        return deadline ? isToday(deadline) : false
      case 'week':
        return deadline ? isThisWeek(deadline, { weekStartsOn: 1 }) : false
      case 'month':
        return deadline ? isThisMonth(deadline) : false
      case 'calendar':
        return task.source === 'calendar'
      case 'study':
        return ['study', 'exam', 'assignment'].includes(task.category)
      case 'work':
        return ['work', 'meeting'].includes(task.category)
      case 'payment':
        return task.category === 'payment'
      case 'personal':
        return ['personal', 'health'].includes(task.category)
      default:
        return true
    }
  }

  const visibleActiveTasks = useMemo(() => searchedTasks.filter(filterTasksByNav), [searchedTasks, activeFilter])
  const completedMatches = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    const base = activeFilter === 'completed'
      ? completedTasks
      : completedTasks.slice(0, 6)
    if (!query) return base
    return base.filter((task) => task.title.toLowerCase().includes(query))
  }, [completedTasks, activeFilter, searchQuery])

  const dueTodayTasks = useMemo(
    () => visibleActiveTasks.filter((task) => task.deadline && isToday(new Date(task.deadline))),
    [visibleActiveTasks]
  )

  const thisWeekTasks = useMemo(
    () =>
      visibleActiveTasks.filter((task) => {
        if (!task.deadline) return false
        const deadline = new Date(task.deadline)
        return !isToday(deadline) && isThisWeek(deadline, { weekStartsOn: 1 })
      }),
    [visibleActiveTasks]
  )

  const thisMonthTasks = useMemo(
    () =>
      visibleActiveTasks.filter((task) => {
        if (!task.deadline) return false
        const deadline = new Date(task.deadline)
        return !isThisWeek(deadline, { weekStartsOn: 1 }) && isThisMonth(deadline)
      }),
    [visibleActiveTasks]
  )

  const importedTasks = useMemo(
    () => tasks.filter((task) => task.source !== 'manual' || task.sourceMetadata?.importType === 'syllabus_pdf'),
    [tasks]
  )

  const importedThisWeek = useMemo(
    () => importedTasks.filter((task) => isThisWeek(new Date(task.createdAt), { weekStartsOn: 1 })).length,
    [importedTasks]
  )

  const importedDueThisWeek = useMemo(
    () =>
      importedTasks.filter((task) =>
        ['pending', 'in_progress', 'defusing'].includes(task.status) &&
        task.deadline &&
        isThisWeek(new Date(task.deadline), { weekStartsOn: 1 })
      ).length,
    [importedTasks]
  )

  const aiSummaryText =
    briefing?.summary ||
    summary.aiSummary ||
    `As of today, you have ${summary.dueToday} tasks due today, ${visibleActiveTasks.filter((task) => task.deadline && isThisWeek(new Date(task.deadline), { weekStartsOn: 1 })).length} tasks due this week, and ${summary.overdue} overdue. Keep focusing on high priority items.`

  const userInitials = (user?.name || 'Defuse User')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const sections = [
    {
      key: 'today',
      title: 'Due Today',
      subtitle: 'Tasks that need your attention today',
      tasks: dueTodayTasks,
      badgeTone: 'bg-sr-red/10 text-sr-red'
    },
    {
      key: 'week',
      title: 'This Week',
      subtitle: 'Tasks due in the next 7 days',
      tasks: thisWeekTasks,
      badgeTone: 'bg-sr-green/10 text-sr-green'
    },
    {
      key: 'month',
      title: 'This Month',
      subtitle: 'Upcoming tasks this month',
      tasks: thisMonthTasks,
      badgeTone: 'bg-sr-purple/10 text-sr-purple'
    }
  ] as const

  const resourceCards: Array<{
    key: ResourceKey
    title: string
    meta?: SourceConnection
    status: string
    tone: string
    subtitle: string
    actionLabel: string
    onAction: () => void
    busy?: boolean
  }> = [
    {
      key: 'gmail',
      title: 'Gmail',
      meta: user?.sources?.gmail,
      status: user?.sources?.gmail?.status === 'connected' ? 'Connected' : 'Not connected',
      tone: user?.sources?.gmail?.status === 'connected' ? 'bg-sr-green/10 text-sr-green' : 'bg-sr-header text-sr-muted',
      subtitle: formatResourceSync(user?.sources?.gmail),
      actionLabel: 'Refresh',
      onAction: () => setShowGmailModal(true)
    },
    {
      key: 'calendar',
      title: 'Calendar',
      meta: user?.sources?.calendar,
      status: user?.sources?.calendar?.status === 'connected' ? 'Synced' : 'Not connected',
      tone: user?.sources?.calendar?.status === 'connected' ? 'bg-sr-green/10 text-sr-green' : 'bg-sr-header text-sr-muted',
      subtitle: formatResourceSync(user?.sources?.calendar),
      actionLabel: syncingCal ? 'Refreshing' : 'Refresh',
      onAction: () => void handleCalendarRefresh(),
      busy: syncingCal
    },
    {
      key: 'pdf',
      title: 'Scan PDF',
      meta: user?.sources?.pdf,
      status: user?.sources?.pdf?.status === 'connected' ? 'Ready' : 'Upload',
      tone: user?.sources?.pdf?.status === 'connected' ? 'bg-sr-green/10 text-sr-green' : 'bg-sr-header text-sr-muted',
      subtitle: user?.sources?.pdf?.fileName || formatResourceSync(user?.sources?.pdf),
      actionLabel: 'Upload',
      onAction: () => setShowPdfModal(true)
    },
    {
      key: 'image',
      title: 'Image Scan',
      meta: user?.sources?.image,
      status: user?.sources?.image?.status === 'connected' ? 'Ready' : 'Upload',
      tone: user?.sources?.image?.status === 'connected' ? 'bg-sr-green/10 text-sr-green' : 'bg-sr-header text-sr-muted',
      subtitle: user?.sources?.image?.fileName || formatResourceSync(user?.sources?.image),
      actionLabel: 'Upload',
      onAction: () => imageInputRef.current?.click()
    }
  ]

  const AccountMenu = ({ mobile = false }: { mobile?: boolean }) => (
    <div ref={mobile ? undefined : accountMenuRef} className="relative">
      <button
        type="button"
        onClick={() => setAccountMenuOpen((value) => !value)}
        className="flex w-full items-center gap-3 rounded-[20px] border border-sr-border/10 bg-sr-card px-3 py-3 text-left shadow-[0_10px_24px_rgba(69,86,66,0.06)] transition-colors hover:bg-sr-header"
      >
        {user?.avatar ? (
          <img src={user.avatar} alt={user.name} className="h-11 w-11 rounded-2xl object-cover" />
        ) : (
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sr-red text-sm font-semibold text-white">
            {userInitials}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-sr-text">{user?.name || 'Defuse User'}</p>
          <p className="truncate text-xs text-sr-muted">{user?.email || 'Connected account'}</p>
        </div>
        <ChevronDown className={`h-4 w-4 shrink-0 text-sr-muted transition-transform ${accountMenuOpen ? 'rotate-180' : ''}`} />
      </button>

      {accountMenuOpen ? (
        <div className={`${mobile ? 'mt-2' : 'absolute bottom-[calc(100%+0.75rem)] left-0 right-0'} z-30 overflow-hidden rounded-[20px] border border-sr-border/10 bg-sr-card shadow-[0_18px_42px_rgba(69,86,66,0.16)]`}>
          <div className="border-b border-sr-border/10 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-sr-muted">Account</p>
            <p className="mt-1 truncate text-sm font-medium text-sr-text">{user?.email || 'No email available'}</p>
          </div>
          <div className="p-2">
            <button
              type="button"
              onClick={() => {
                setAccountMenuOpen(false)
                setSettingsOpen(true)
                setSidebarOpen(false)
              }}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-sr-text transition-colors hover:bg-sr-header"
            >
              <Settings className="h-4 w-4 text-sr-muted" />
              Profile settings
            </button>
            <button
              type="button"
              onClick={() => {
                setAccountMenuOpen(false)
                handleLogout()
              }}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-sr-text transition-colors hover:bg-sr-header"
            >
              <LogOut className="h-4 w-4 text-sr-muted" />
              Log out
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )

  const Sidebar = ({ mobile = false }: { mobile?: boolean }) => (
    <div className="flex h-full flex-col rounded-[24px] border border-sr-border/10 bg-sr-card p-5 shadow-[0_16px_40px_rgba(69,86,66,0.08)]">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sr-red text-white shadow-[0_12px_30px_rgba(235,91,42,0.28)]">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div>
          <p className="font-display text-xl font-bold tracking-tight text-sr-text">DEFUSE AI</p>
          <p className="max-w-[130px] text-xs leading-5 text-sr-muted">Deadline clarity for students & teams</p>
        </div>
      </div>

      <div className="mt-7 space-y-1.5">
        <button
          type="button"
          onClick={() => {
            router.push('/')
            setSidebarOpen(false)
          }}
          className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium text-sr-muted transition-colors hover:bg-sr-header hover:text-sr-text"
        >
          <Home className="h-4 w-4" />
          Home
        </button>

        {NAV_ITEMS.map(({ key, label, icon: Icon }) => {
          const isActive = activeFilter === key
          return (
            <button
              key={key}
              type="button"
              onClick={() => {
                setActiveFilter(key)
                setSidebarOpen(false)
              }}
              className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium transition-all ${
                isActive
                  ? 'bg-[linear-gradient(135deg,rgba(255,111,49,1),rgba(235,91,42,1))] text-white shadow-[0_12px_30px_rgba(235,91,42,0.25)]'
                  : 'text-sr-muted hover:bg-sr-header hover:text-sr-text'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          )
        })}
      </div>

      <div className="mt-6 rounded-[22px] border border-sr-border/10 bg-[linear-gradient(180deg,rgba(255,250,243,0.98),rgba(255,247,237,0.92))] p-4 dark:bg-sr-header">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-sr-orange" />
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sr-orange">AI Insights</p>
        </div>
        <p className="mt-4 text-sm leading-7 text-sr-muted">
          You have {summary.dueToday} tasks due today and {importedDueThisWeek} due this week. Focus on finishing high priority items first.
        </p>
        <button
          type="button"
          onClick={handleRefreshSummary}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-sr-border/10 bg-white/80 px-4 py-2.5 text-sm font-semibold text-sr-text transition-colors hover:bg-white dark:bg-sr-card dark:hover:bg-sr-card"
        >
          <Sparkles className="h-4 w-4 text-sr-orange" />
          Refresh insights
        </button>
      </div>

      <div className="mt-auto pt-6">
        <AccountMenu mobile={mobile} />
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-sr-bg">
      {showGmailModal ? (
        <GmailSyncModal
          onClose={() => setShowGmailModal(false)}
          onSynced={(result) => {
            setShowGmailModal(false)
            setResourceToast(`Scanned ${result.emails} emails and added ${result.tasks} tasks`)
            void Promise.allSettled([refetch(), refreshUser()])
            window.setTimeout(() => setResourceToast(null), 4500)
          }}
        />
      ) : null}

      {showPdfModal ? (
        <SyllabusScanModal
          onClose={() => setShowPdfModal(false)}
          onSaved={(result) => {
            setShowPdfModal(false)
            setResourceToast(`Saved ${result.count} tasks from PDF`)
            void Promise.allSettled([refetch(), refreshUser()])
            window.setTimeout(() => setResourceToast(null), 4500)
          }}
        />
      ) : null}

      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => void handleImageUpload(event.target.files?.[0])}
      />

      <div className="mx-auto max-w-[1440px] px-4 py-5 sm:px-6 lg:px-8">
        <div className="grid gap-5 xl:grid-cols-[228px_minmax(0,1fr)_300px]">
          <aside className="hidden xl:block">
            <div className="sticky top-5 h-[calc(100vh-2.5rem)]">
              <Sidebar />
            </div>
          </aside>

          <div className="min-w-0">
            <div className="mb-4 flex items-center justify-between gap-3 xl:hidden">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="inline-flex items-center gap-2 rounded-full border border-sr-border/10 bg-sr-card px-4 py-2.5 text-sm font-semibold text-sr-text"
              >
                <Menu className="h-4 w-4" />
                Menu
              </button>
              <button
                type="button"
                onClick={() => setShowAddTask(true)}
                className="inline-flex items-center gap-2 rounded-full bg-sr-red px-4 py-2.5 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(235,91,42,0.22)]"
              >
                <Plus className="h-4 w-4" />
                Add Task
              </button>
            </div>

            {sidebarOpen ? (
              <div className="fixed inset-0 z-50 bg-black/30 xl:hidden" onClick={() => setSidebarOpen(false)}>
                <div className="h-full w-[290px] p-4" onClick={(event) => event.stopPropagation()}>
                  <Sidebar mobile />
                </div>
              </div>
            ) : null}

            <header className="rounded-[24px] border border-sr-border/10 bg-sr-card px-5 py-5 shadow-[0_16px_40px_rgba(69,86,66,0.08)] sm:px-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h1 className="font-display text-[2rem] font-bold tracking-[-0.04em] text-sr-text">
                    Welcome back, {user?.name?.split(' ')[0] || 'there'}! <span aria-hidden="true">👋</span>
                  </h1>
                  <p className="mt-1 text-sm text-sr-muted sm:text-base">Let&apos;s stay on top of your deadlines today.</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex min-w-[240px] flex-1 items-center gap-2 rounded-2xl border border-sr-border/10 bg-sr-header px-4 py-3 text-sm text-sr-muted lg:min-w-[280px] lg:flex-none">
                    <Search className="h-4 w-4" />
                    <input
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder="Search tasks..."
                      className="w-full bg-transparent text-sr-text outline-none placeholder:text-sr-muted"
                    />
                  </label>

                  <button
                    type="button"
                    className="relative inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-sr-border/10 bg-sr-header text-sr-muted transition-colors hover:text-sr-text"
                    aria-label="Notifications"
                  >
                    <Bell className="h-4.5 w-4.5" />
                    <span className="absolute right-3 top-3 h-2.5 w-2.5 rounded-full bg-sr-red" />
                  </button>

                  <ThemeToggle compact />

                  <button
                    type="button"
                    onClick={() => setShowAddTask(true)}
                    className="inline-flex items-center gap-2 rounded-2xl bg-[linear-gradient(135deg,rgba(255,111,49,1),rgba(235,91,42,1))] px-4 py-3 text-sm font-semibold text-white shadow-[0_14px_32px_rgba(235,91,42,0.24)] transition-transform hover:-translate-y-0.5"
                  >
                    <Plus className="h-4 w-4" />
                    Add Task
                  </button>
                </div>
              </div>
            </header>

            {resourceToast ? (
              <div className="mt-4 rounded-2xl border border-sr-green/20 bg-sr-green/10 px-4 py-3 text-sm font-medium text-sr-green">
                {resourceToast}
              </div>
            ) : null}

            {showAddTask ? (
              <section className="mt-4 rounded-[24px] border border-sr-border/10 bg-sr-card p-5 shadow-[0_16px_40px_rgba(69,86,66,0.08)] sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-lg font-semibold text-sr-text">Add a new task</p>
                    <p className="mt-1 text-sm text-sr-muted">Create a task without leaving the dashboard.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAddTask(false)}
                    className="inline-flex items-center gap-2 rounded-xl border border-sr-border/10 bg-sr-header px-3 py-2 text-sm font-medium text-sr-text"
                  >
                    <X className="h-4 w-4" />
                    Close
                  </button>
                </div>
                <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                  <input
                    value={newTask.title}
                    onChange={(event) => setNewTask((prev) => ({ ...prev, title: event.target.value }))}
                    placeholder="Finish prototype, submit report..."
                    className="rounded-2xl border border-sr-border/10 bg-sr-header px-4 py-3 text-sm text-sr-text outline-none placeholder:text-sr-muted xl:col-span-2"
                  />
                  <input
                    type="datetime-local"
                    value={newTask.deadline}
                    onChange={(event) => setNewTask((prev) => ({ ...prev, deadline: event.target.value }))}
                    className="rounded-2xl border border-sr-border/10 bg-sr-header px-4 py-3 text-sm text-sr-text outline-none"
                  />
                  <select
                    value={newTask.category}
                    onChange={(event) => setNewTask((prev) => ({ ...prev, category: event.target.value }))}
                    className="rounded-2xl border border-sr-border/10 bg-sr-header px-4 py-3 text-sm text-sr-text outline-none"
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
                    className="rounded-2xl border border-sr-border/10 bg-sr-header px-4 py-3 text-sm text-sr-text outline-none"
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
                  className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-sr-red px-4 py-3 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(235,91,42,0.22)]"
                >
                  <Plus className="h-4 w-4" />
                  Save task
                </button>
              </section>
            ) : null}

            <main className="mt-5 space-y-5">
              {activeFilter === 'completed' ? (
                <section className="rounded-[24px] border border-sr-border/10 bg-sr-card shadow-[0_16px_40px_rgba(69,86,66,0.08)]">
                  <div className="flex items-center justify-between gap-3 border-b border-sr-border/10 px-5 py-5 sm:px-6">
                    <div>
                      <div className="flex items-center gap-3">
                        <h2 className="font-display text-[2rem] font-bold tracking-[-0.04em] text-sr-text">Completed</h2>
                        <span className="rounded-full bg-sr-green/10 px-3 py-1 text-sm font-semibold text-sr-green">{completedMatches.length}</span>
                      </div>
                      <p className="mt-1 text-sm text-sr-muted">Finished tasks, ordered by most recently completed.</p>
                    </div>
                  </div>

                  <div>
                    {completedMatches.length === 0 ? (
                      <div className="px-6 py-12 text-center text-sr-muted">No completed tasks match this view.</div>
                    ) : (
                      completedMatches.map((task) => (
                        <div key={task._id} className="border-b border-sr-border/8 px-5 py-4 last:border-b-0 sm:px-6">
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-sr-text">{task.title}</p>
                              <p className="mt-1 text-xs text-sr-muted">
                                Completed {format(new Date(task.completedAt || task.updatedAt), 'MMM d, h:mm a')}
                              </p>
                            </div>
                            <span className="rounded-full bg-sr-green/10 px-3 py-1 text-xs font-semibold text-sr-green">Done</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </section>
              ) : (
                sections.map((section) => (
                  <section key={section.key} className="rounded-[24px] border border-sr-border/10 bg-sr-card shadow-[0_16px_40px_rgba(69,86,66,0.08)]">
                    <div className="flex items-start justify-between gap-3 border-b border-sr-border/10 px-5 py-5 sm:px-6">
                      <div>
                        <div className="flex items-center gap-3">
                          <h2 className="font-display text-[2rem] font-bold tracking-[-0.04em] text-sr-text">{section.title}</h2>
                          <span className={`rounded-full px-3 py-1 text-sm font-semibold ${section.badgeTone}`}>
                            {section.tasks.length}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-sr-muted">{section.subtitle}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveFilter(section.key)}
                        className="text-sm font-semibold text-sr-purple transition-colors hover:text-sr-red"
                      >
                        View all
                      </button>
                    </div>

                    <div>
                      {loading ? (
                        <div className="flex h-28 items-center justify-center">
                          <div className="h-10 w-10 animate-spin rounded-full border-4 border-sr-border/20 border-t-sr-red" />
                        </div>
                      ) : section.tasks.length === 0 ? (
                        <div className="px-6 py-12 text-center text-sr-muted">No tasks in this section right now.</div>
                      ) : (
                        section.tasks.slice(0, activeFilter === 'all' ? 4 : 8).map((task, index) => (
                          <div key={task._id} className={index === 0 ? '' : 'border-t border-sr-border/8'}>
                            <DashboardTaskRow task={task} onComplete={handleCompleteTask} />
                          </div>
                        ))
                      )}
                    </div>
                  </section>
                ))
              )}
            </main>
          </div>

          <aside className="min-w-0">
            <div className="flex flex-col gap-4 xl:sticky xl:top-5">
              <OverviewCard summary={summary} />

              <section className="rounded-[22px] border border-sr-border/10 bg-sr-card p-5 shadow-[0_12px_36px_rgba(69,86,66,0.08)]">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-sr-orange" />
                  <h3 className="text-xl font-semibold tracking-tight text-sr-text">AI Summary</h3>
                </div>
                <p className="mt-4 text-sm leading-7 text-sr-muted">{aiSummaryText}</p>
                <button
                  type="button"
                  onClick={() => void handleRefreshSummary()}
                  disabled={loadingBriefing}
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-sr-border/10 bg-sr-header px-4 py-3 text-sm font-semibold text-sr-text transition-colors hover:bg-sr-card disabled:opacity-60"
                >
                  <Sparkles className="h-4 w-4 text-sr-orange" />
                  {loadingBriefing ? 'Refreshing...' : 'Refresh AI Summary'}
                </button>
              </section>

              <section className="rounded-[22px] border border-sr-border/10 bg-sr-card p-5 shadow-[0_12px_36px_rgba(69,86,66,0.08)]">
                <h3 className="text-xl font-semibold tracking-tight text-sr-text">Resources</h3>
                <div className="mt-4 space-y-3">
                  {resourceCards.map((resource) => (
                    <div key={resource.key} className="flex items-center gap-3 rounded-[18px] border border-sr-border/10 bg-sr-header/70 p-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sr-card">
                        {resource.key === 'gmail' ? <span className="font-display text-lg font-bold text-sr-red">G</span> : null}
                        {resource.key === 'calendar' ? <Calendar className="h-5 w-5 text-sr-purple" /> : null}
                        {resource.key === 'pdf' ? <FolderKanban className="h-5 w-5 text-sr-orange" /> : null}
                        {resource.key === 'image' ? <Sparkles className="h-5 w-5 text-sr-green" /> : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-sr-text">{resource.title}</p>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${resource.tone}`}>{resource.status}</span>
                        </div>
                        <p className="mt-1 truncate text-xs text-sr-muted">{resource.subtitle}</p>
                      </div>
                      <button
                        type="button"
                        onClick={resource.onAction}
                        disabled={resource.busy}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-sr-border/10 bg-sr-card text-sr-muted transition-colors hover:text-sr-text disabled:opacity-60"
                        aria-label={resource.actionLabel}
                      >
                        {resource.busy ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-sr-border/20 border-t-sr-red" /> : <Sparkles className="h-4 w-4" />}
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </aside>
        </div>
      </div>

      <ChatBot onTasksAdded={refetch} />

      {settingsOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6 backdrop-blur-sm">
          <div className="absolute inset-0" onClick={() => setSettingsOpen(false)} aria-hidden="true" />
          <div className="relative z-10 w-full max-w-xl rounded-[24px] border border-sr-border/10 bg-sr-card p-6 shadow-[0_24px_60px_rgba(0,0,0,0.18)] sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sr-red/10 text-sr-red">
                  <Settings className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sr-muted">Settings</p>
                  <h2 className="mt-1 font-display text-2xl font-bold text-sr-text">Account settings</h2>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSettingsOpen(false)}
                className="rounded-full p-2 text-sr-muted transition-colors hover:bg-sr-header hover:text-sr-text"
                aria-label="Close settings"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-6 rounded-[20px] border border-sr-border/10 bg-sr-header p-5">
              <div className="flex items-center gap-3">
                {user?.avatar ? (
                  <img src={user.avatar} alt={user.name} className="h-11 w-11 rounded-2xl object-cover" />
                ) : (
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sr-card text-sr-muted">
                    <UserRound className="h-5 w-5" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-sr-text">{user?.name || 'Defuse User'}</p>
                  <p className="truncate text-sm text-sr-muted">{user?.email || 'Loading account email...'}</p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-sr-muted">
                Your account is connected to this dashboard. More controls can live here later without changing the main layout.
              </p>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-2 rounded-xl bg-sr-red px-4 py-2.5 text-sm font-semibold text-white"
              >
                <LogOut className="h-4 w-4" />
                Log out
              </button>
              <Link
                href="/dashboard/settings"
                className="inline-flex items-center gap-2 rounded-xl border border-sr-border/10 bg-sr-header px-4 py-2.5 text-sm font-semibold text-sr-text"
              >
                <Settings className="h-4 w-4" />
                Open full settings
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
