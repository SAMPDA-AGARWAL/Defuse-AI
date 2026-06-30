'use client'

import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { Calendar, FileText, Loader2, Mail, MessageCircle, RefreshCw, Sparkles } from 'lucide-react'
import api from '@/lib/api'
import GmailSyncModal from './GmailSyncModal'
import SyllabusScanModal from './SyllabusScanModal'
import type { SourceConnection, Task, TaskSummary, User } from '@/types'

interface Props {
  tasks: Task[]
  summary: TaskSummary
  user: User | null
  onRefresh: () => void
  onUserRefresh: () => Promise<void>
}

export default function AIPanel({ tasks, summary, user, onRefresh, onUserRefresh }: Props) {
  const [briefing, setBriefing] = useState<Record<string, string> | null>(null)
  const [loadingBriefing, setLoadingBriefing] = useState(false)
  const [loadingPlan, setLoadingPlan] = useState(false)
  const [showGmailModal, setShowGmailModal] = useState(false)
  const [showSyllabusModal, setShowSyllabusModal] = useState(false)
  const [syncingCal, setSyncingCal] = useState(false)
  const [syncResult, setSyncResult] = useState<string | null>(null)

  const formatConnectedLabel = (meta?: SourceConnection) => {
    if (meta?.status !== 'connected') return 'Not connected'
    if (!meta.lastSyncedAt) return 'Connected'

    const date = new Date(meta.lastSyncedAt)
    const isCurrentYear = date.getFullYear() === new Date().getFullYear()
    return `Connected · ${format(date, isCurrentYear ? 'MMM d, h:mm a' : 'MMM d, yyyy, h:mm a')}`
  }

  const getAIMessage = () => {
    if (briefing?.summary) return briefing.summary
    if (summary.aiSummary) return summary.aiSummary
    if (!tasks.length) return 'Quiet day so far. Good moment to add the next things you need to remember.'
    if (summary.critical > 0) return `${summary.critical} urgent task${summary.critical > 1 ? 's need' : ' needs'} attention first.`
    if (summary.upcoming > 4) return `You have ${summary.upcoming} active tasks. Pick one from the top time section and start there.`
    return `You have ${summary.upcoming} active task${summary.upcoming !== 1 ? 's' : ''}. The workload looks manageable.`
  }

  const handleBriefing = async () => {
    setLoadingBriefing(true)
    try {
      const { data } = await api.post('/ai/briefing')
      setBriefing(data.briefing)
    } catch (error) {
      console.error(error)
    } finally {
      setLoadingBriefing(false)
    }
  }

  const handleBattlePlan = async () => {
    setLoadingPlan(true)
    try {
      await api.post('/ai/battle-plan')
      onRefresh()
    } catch (error) {
      console.error(error)
    } finally {
      setLoadingPlan(false)
    }
  }

  const handleCalSync = async () => {
    setSyncingCal(true)
    try {
      const { data } = await api.get('/sync/calendar?days=14')
      setSyncResult(`Synced ${data.synced} calendar events`)
      onRefresh()
      await onUserRefresh()
      setTimeout(() => setSyncResult(null), 4000)
    } catch (error) {
      console.error(error)
    } finally {
      setSyncingCal(false)
    }
  }

  const handleGmailDone = (result: { emails: number; tasks: number }) => {
    setSyncResult(`Scanned ${result.emails} emails and added ${result.tasks} tasks`)
    onRefresh()
    void onUserRefresh()
    setTimeout(() => setSyncResult(null), 5000)
  }

  const resourceCards = useMemo(() => [
    {
      icon: Mail,
      title: 'Gmail',
      description: 'Finds deadlines and assignments from your inbox.',
      meta: user?.sources?.gmail,
      status: user?.sources?.gmail?.status === 'connected' ? 'Connected' : 'Not connected',
      statusClassName: user?.sources?.gmail?.status === 'connected'
        ? 'bg-sr-green/12 text-sr-green'
        : 'bg-sr-header text-sr-muted',
      actionLabel: user?.sources?.gmail?.status === 'connected' ? 'Refresh' : 'Connect Gmail',
      actionClassName: user?.sources?.gmail?.status === 'connected'
        ? 'border border-sr-border bg-transparent text-sr-text hover:bg-sr-header'
        : 'bg-sr-red text-white hover:bg-[#d95a2e]',
      onAction: () => setShowGmailModal(true),
      busy: false,
      disabled: false,
      inactive: false
    },
    {
      icon: Calendar,
      title: 'Calendar',
      description: 'Turns upcoming events into tracked tasks.',
      meta: user?.sources?.calendar,
      status: user?.sources?.calendar?.status === 'connected' ? 'Connected' : 'Not connected',
      statusClassName: user?.sources?.calendar?.status === 'connected'
        ? 'bg-sr-green/12 text-sr-green'
        : 'bg-sr-header text-sr-muted',
      actionLabel: syncingCal
        ? 'Refreshing...'
        : user?.sources?.calendar?.status === 'connected'
          ? 'Refresh'
          : 'Connect Calendar',
      actionClassName: user?.sources?.calendar?.status === 'connected'
        ? 'border border-sr-border bg-transparent text-sr-text hover:bg-sr-header'
        : 'bg-sr-red text-white hover:bg-[#d95a2e]',
      onAction: handleCalSync,
      busy: syncingCal,
      disabled: syncingCal,
      inactive: false
    },
    {
      icon: FileText,
      title: 'Scan PDF',
      description: 'Extracts deadlines and exams from any PDF.',
      meta: user?.sources?.pdf,
      status: user?.sources?.pdf?.status === 'connected' ? 'Connected' : 'Not connected',
      statusClassName: user?.sources?.pdf?.status === 'connected'
        ? 'bg-sr-green/12 text-sr-green'
        : 'bg-sr-header text-sr-muted',
      actionLabel: user?.sources?.pdf?.status === 'connected' || user?.sources?.pdf?.fileName ? 'Upload New' : 'Upload PDF',
      actionClassName: user?.sources?.pdf?.status === 'connected'
        ? 'border border-sr-border bg-transparent text-sr-text hover:bg-sr-header'
        : 'bg-sr-red text-white hover:bg-[#d95a2e]',
      onAction: () => setShowSyllabusModal(true),
      busy: false,
      disabled: false,
      inactive: false
    },
    {
      icon: MessageCircle,
      title: 'WhatsApp',
      description: 'Deadline tracking from WhatsApp - launching soon.',
      meta: user?.sources?.whatsapp,
      status: 'Coming Soon',
      statusClassName: 'bg-sr-orange/12 text-sr-orange',
      actionLabel: '',
      actionClassName: '',
      onAction: undefined,
      busy: false,
      disabled: true,
      inactive: true
    }
  ], [syncingCal, user?.sources?.calendar, user?.sources?.gmail, user?.sources?.pdf, user?.sources?.whatsapp])

  return (
    <>
      {showGmailModal ? (
        <GmailSyncModal
          onClose={() => setShowGmailModal(false)}
          onSynced={(result) => {
            handleGmailDone(result)
            setShowGmailModal(false)
          }}
        />
      ) : null}
      {showSyllabusModal ? (
        <SyllabusScanModal
          onClose={() => setShowSyllabusModal(false)}
          onSaved={(result) => {
            setSyncResult(`Saved ${result.count} tasks from syllabus`)
            onRefresh()
            void onUserRefresh()
          }}
        />
      ) : null}

      <section className="app-surface rounded-[1.75rem] p-4 sm:p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sr-muted">Stats</p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-[1.25rem] bg-sr-header p-3 text-center">
            <p className="font-display text-2xl font-bold text-sr-red">{summary.dueToday}</p>
            <p className="mt-1 text-xs text-sr-muted">Due today</p>
          </div>
          <div className="rounded-[1.25rem] bg-sr-header p-3 text-center">
            <p className="font-display text-2xl font-bold text-sr-text">{summary.active}</p>
            <p className="mt-1 text-xs text-sr-muted">Active</p>
          </div>
          <div className="rounded-[1.25rem] bg-sr-header p-3 text-center">
            <p className="font-display text-2xl font-bold text-sr-green">{summary.completed}</p>
            <p className="mt-1 text-xs text-sr-muted">Completed</p>
          </div>
          <div className="rounded-[1.25rem] bg-sr-header p-3 text-center">
            <p className="font-display text-2xl font-bold text-sr-orange">{summary.highPriority}</p>
            <p className="mt-1 text-xs text-sr-muted">High priority</p>
          </div>
          <div className="rounded-[1.25rem] bg-sr-header p-3 text-center sm:col-span-2">
            <p className="font-display text-2xl font-bold text-sr-purple">{summary.overdue}</p>
            <p className="mt-1 text-xs text-sr-muted">Overdue</p>
          </div>
        </div>
      </section>

      <section className="app-surface rounded-[1.75rem] p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sr-muted">AI Summary</p>
            <p className="mt-3 text-sm leading-6 text-sr-text">{getAIMessage()}</p>
            {briefing?.topPriority ? (
              <p className="mt-3 text-sm font-medium text-sr-red">
                Start with: {typeof briefing.topPriority === 'object' ? (briefing.topPriority as Record<string, string>).taskTitle : briefing.topPriority}
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2">
          <button
            onClick={handleBriefing}
            disabled={loadingBriefing}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-sr-red px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {loadingBriefing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Refresh AI summary
          </button>
          <button
            onClick={handleBattlePlan}
            disabled={loadingPlan}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-sr-border bg-sr-header px-4 py-2.5 text-sm font-semibold text-sr-text disabled:opacity-60"
          >
            {loadingPlan ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Build today&apos;s plan
          </button>
        </div>
      </section>

      <section className="app-surface rounded-[1.75rem] p-4 sm:p-5">
        <p className="text-xs font-semibold tracking-[0.02em] text-sr-muted">Additional Resources</p>
        {syncResult ? <p className="mt-3 text-sm font-medium text-sr-green">{syncResult}</p> : null}

        <div className="mt-4 space-y-3.5">
          {resourceCards.map(({ icon: Icon, title, description, meta, status, statusClassName, actionLabel, actionClassName, onAction, busy, disabled, inactive }) => (
            <div
              key={title}
              className={`rounded-[1.5rem] border border-sr-border/10 bg-sr-card p-4 shadow-[0_10px_28px_rgba(69,86,66,0.08)] ${inactive ? 'opacity-70' : ''}`}
            >
              <div className="flex items-start gap-3">
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                  title === 'Gmail'
                    ? 'bg-sr-red/10 text-sr-red'
                    : title === 'Calendar'
                      ? 'bg-sr-green/10 text-sr-green'
                      : title === 'Scan PDF'
                        ? 'bg-sr-purple/10 text-sr-purple'
                        : 'bg-sr-orange/10 text-sr-orange'
                }`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[1.02rem] font-semibold leading-6 text-sr-text">{title}</p>
                      <p className="mt-1 truncate text-xs text-sr-muted">{description}</p>
                    </div>
                    <span className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusClassName}`}>
                      {status}
                    </span>
                  </div>

                  <p className="mt-2 text-[11px] text-sr-muted">
                    {inactive ? 'Not connected' : formatConnectedLabel(meta)}
                  </p>

                  {!inactive && onAction ? (
                    <button
                      onClick={onAction}
                      disabled={disabled}
                      className={`mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-150 disabled:opacity-60 ${actionClassName}`}
                    >
                      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      {actionLabel}
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}
