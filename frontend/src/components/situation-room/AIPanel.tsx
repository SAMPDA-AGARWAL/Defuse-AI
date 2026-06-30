'use client'

import { useState } from 'react'
import { Calendar, FileText, Loader2, Mail, MessageCircle, RefreshCw, Sparkles } from 'lucide-react'
import api from '@/lib/api'
import GmailSyncModal from './GmailSyncModal'
import SyllabusScanModal from './SyllabusScanModal'
import type { Task, TaskSummary } from '@/types'

interface Props {
  tasks: Task[]
  summary: TaskSummary
  onRefresh: () => void
}

export default function AIPanel({ tasks, summary, onRefresh }: Props) {
  const [briefing, setBriefing] = useState<Record<string, string> | null>(null)
  const [loadingBriefing, setLoadingBriefing] = useState(false)
  const [loadingPlan, setLoadingPlan] = useState(false)
  const [showGmailModal, setShowGmailModal] = useState(false)
  const [showSyllabusModal, setShowSyllabusModal] = useState(false)
  const [syncingCal, setSyncingCal] = useState(false)
  const [syncResult, setSyncResult] = useState<string | null>(null)

  const getAIMessage = () => {
    if (briefing?.summary) return briefing.summary
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
    setTimeout(() => setSyncResult(null), 5000)
  }

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
          }}
        />
      ) : null}

      <section className="app-surface rounded-[1.75rem] p-4 sm:p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sr-muted">Stats</p>
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="rounded-[1.25rem] bg-sr-header p-3 text-center">
            <p className="font-display text-2xl font-bold text-sr-red">{summary.critical}</p>
            <p className="mt-1 text-xs text-sr-muted">Due today</p>
          </div>
          <div className="rounded-[1.25rem] bg-sr-header p-3 text-center">
            <p className="font-display text-2xl font-bold text-sr-text">{summary.upcoming}</p>
            <p className="mt-1 text-xs text-sr-muted">Active</p>
          </div>
          <div className="rounded-[1.25rem] bg-sr-header p-3 text-center">
            <p className="font-display text-2xl font-bold text-sr-orange">{summary.high}</p>
            <p className="mt-1 text-xs text-sr-muted">High</p>
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
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sr-muted">Sources</p>
        {syncResult ? <p className="mt-3 text-sm font-medium text-sr-green">{syncResult}</p> : null}

        <div className="mt-4 space-y-3">
          {[
            {
              icon: Mail,
              title: 'Gmail',
              description: 'Find deadlines and assignment updates from your inbox.',
              action: (
                <button
                  onClick={() => setShowGmailModal(true)}
                  className="rounded-full bg-sr-red/10 px-3 py-1.5 text-xs font-semibold text-sr-red"
                >
                  Scan
                </button>
              )
            },
            {
              icon: Calendar,
              title: 'Calendar',
              description: 'Turn upcoming events and due dates into tasks.',
              action: (
                <button
                  onClick={handleCalSync}
                  disabled={syncingCal}
                  className="rounded-full bg-sr-green/10 px-3 py-1.5 text-xs font-semibold text-sr-green disabled:opacity-60"
                >
                  {syncingCal ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Sync'}
                </button>
              )
            },
            {
              icon: MessageCircle,
              title: 'WhatsApp',
              description: 'Capture forwarded reminders and shared task messages.',
              action: <span className="text-xs font-semibold text-sr-orange">Later</span>
            },
            {
              icon: FileText,
              title: 'Scan PDF',
              description: 'Extract important deadlines, announcements, exams, and assignments from any PDF.',
              action: (
                <button
                  onClick={() => setShowSyllabusModal(true)}
                  className="rounded-full bg-sr-purple/10 px-3 py-1.5 text-xs font-semibold text-sr-purple"
                >
                  Upload PDF
                </button>
              )
            }
          ].map(({ icon: Icon, title, description, action }) => (
            <div key={title} className="flex items-center gap-3 rounded-[1.25rem] bg-sr-header p-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sr-card text-sr-red">
                <Icon className="h-4.5 w-4.5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-sr-text">{title}</p>
                <p className="mt-0.5 text-[11px] leading-5 text-sr-muted">{description}</p>
              </div>
              <div>{action}</div>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}
