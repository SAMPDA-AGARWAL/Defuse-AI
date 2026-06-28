'use client'

import { useState } from 'react'
import { Calendar, Loader2, Mail, MessageCircle, RefreshCw, Sparkles } from 'lucide-react'
import api from '@/lib/api'
import GmailSyncModal from './GmailSyncModal'
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
  const [syncingCal, setSyncingCal] = useState(false)
  const [syncResult, setSyncResult] = useState<string | null>(null)

  const getAIMessage = () => {
    if (!tasks.length) return 'Everything looks calm right now. Good time to add upcoming work before it becomes urgent.'
    if (summary.critical > 0) return `${summary.critical} urgent task${summary.critical > 1 ? 's are' : ' is'} close to deadline. Start with the top red card.`
    if (summary.upcoming > 3) return `You have ${summary.upcoming} active tasks. A short AI summary can help decide the best order.`
    return `You have ${summary.upcoming} active task${summary.upcoming !== 1 ? 's' : ''}. You’re in a manageable zone.`
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

      <section className="app-surface rounded-[2rem] p-5 sm:p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sr-red">AI Help</p>
        <h2 className="mt-2 font-display text-2xl font-semibold text-sr-text">Friendly guidance, not a complex system</h2>
        <p className="mt-3 text-sm leading-6 text-sr-muted">{getAIMessage()}</p>

        <div className="mt-5 space-y-3">
          {briefing ? (
            <div className="rounded-[1.5rem] border border-sr-border bg-sr-header p-4 text-sm text-sr-muted">
              <p className="font-semibold text-sr-text">{briefing.greeting}</p>
              <p className="mt-2 leading-6">{briefing.summary}</p>
              {briefing.topPriority ? (
                <p className="mt-3 font-medium text-sr-red">
                  Start with: {typeof briefing.topPriority === 'object' ? (briefing.topPriority as Record<string, string>).taskTitle : briefing.topPriority}
                </p>
              ) : null}
              <p className="mt-3 italic text-sr-green">{briefing.motivationNote}</p>
              <button onClick={() => setBriefing(null)} className="mt-4 text-sm font-semibold text-sr-red">
                Clear briefing
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={handleBriefing}
                disabled={loadingBriefing}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-sr-red px-4 py-3 text-sm font-bold text-white transition-transform hover:-translate-y-0.5 disabled:opacity-60"
              >
                {loadingBriefing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Get AI summary
              </button>
              <button
                onClick={handleBattlePlan}
                disabled={loadingPlan}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-sr-border bg-sr-header px-4 py-3 text-sm font-semibold text-sr-text transition-colors hover:border-sr-red hover:text-sr-red disabled:opacity-60"
              >
                {loadingPlan ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Build today&apos;s schedule
              </button>
            </>
          )}
        </div>
      </section>

      <section className="app-surface rounded-[2rem] p-5 sm:p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sr-muted">Connect Sources</p>
        <h2 className="mt-2 font-display text-2xl font-semibold text-sr-text">Keep your task list updated</h2>
        {syncResult ? <p className="mt-3 text-sm font-medium text-sr-green">{syncResult}</p> : null}

        <div className="mt-5 space-y-3">
          {[
            {
              icon: Mail,
              title: 'Gmail',
              description: 'Scan emails for deadlines and assignment updates.',
              action: (
                <button
                  onClick={() => setShowGmailModal(true)}
                  className="rounded-full bg-sr-red/10 px-4 py-2 text-sm font-semibold text-sr-red transition-colors hover:bg-sr-red hover:text-white"
                >
                  Scan
                </button>
              )
            },
            {
              icon: Calendar,
              title: 'Google Calendar',
              description: 'Bring upcoming events into Defuse as tasks.',
              action: (
                <button
                  onClick={handleCalSync}
                  disabled={syncingCal}
                  className="rounded-full bg-sr-green/10 px-4 py-2 text-sm font-semibold text-sr-green transition-colors hover:bg-sr-green hover:text-white disabled:opacity-60"
                >
                  {syncingCal ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Sync'}
                </button>
              )
            },
            {
              icon: MessageCircle,
              title: 'WhatsApp',
              description: 'Forward task messages and reminders into one place.',
              action: <span className="text-sm font-semibold text-sr-orange">Setup later</span>
            }
          ].map(({ icon: Icon, title, description, action }) => (
            <div key={title} className="flex items-center gap-3 rounded-[1.5rem] border border-sr-border bg-sr-header p-4">
              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-sr-card text-sr-red">
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-sr-text">{title}</p>
                <p className="text-sm leading-6 text-sr-muted">{description}</p>
              </div>
              <div className="flex-shrink-0">{action}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="app-surface rounded-[2rem] p-5 sm:p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sr-muted">Snapshot</p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-[1.5rem] bg-sr-header p-4 text-center">
            <p className="font-display text-3xl font-bold text-sr-red">{summary.critical}</p>
            <p className="mt-2 text-sm text-sr-muted">Urgent today</p>
          </div>
          <div className="rounded-[1.5rem] bg-sr-header p-4 text-center">
            <p className="font-display text-3xl font-bold text-sr-text">{summary.upcoming}</p>
            <p className="mt-2 text-sm text-sr-muted">Active tasks</p>
          </div>
        </div>
      </section>
    </>
  )
}
