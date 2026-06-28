'use client'
import { useState } from 'react'
import { Mail, X, Loader2, CheckCircle, Calendar } from 'lucide-react'
import api from '@/lib/api'

interface Props {
  onClose: () => void
  onSynced: (result: { emails: number; tasks: number }) => void
}

const PRESETS = [
  { label: 'Last 7 days', days: 7, desc: 'Recent emails only' },
  { label: 'Last 2 weeks', days: 14, desc: 'Good starting point' },
  { label: 'Last month', days: 30, desc: 'Most emails (recommended)', recommended: true },
  { label: 'Last 3 months', days: 90, desc: 'Everything, may take longer' },
]

export default function GmailSyncModal({ onClose, onSynced }: Props) {
  const [selected, setSelected] = useState(30)
  const [custom, setCustom] = useState('')
  const [syncing, setSyncing] = useState(false)
  const [done, setDone] = useState<{ emails: number; tasks: number } | null>(null)

  const effectiveDays = custom ? Math.min(parseInt(custom) || 30, 180) : selected

  const handleSync = async () => {
    setSyncing(true)
    try {
      const { data } = await api.get(`/sync/gmail?days=${effectiveDays}`)
      const result = { emails: data.emailsScanned || 0, tasks: data.tasksCreated || 0 }
      setDone(result)
      onSynced(result)
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Sync failed. Check Google account connection.'
      setDone({ emails: -1, tasks: -1 })
      console.error(msg)
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-sr-card border border-sr-border rounded-2xl w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 p-5 border-b border-sr-border">
          <div className="w-10 h-10 rounded-xl bg-sr-red/10 flex items-center justify-center">
            <Mail className="w-5 h-5 text-sr-red" />
          </div>
          <div className="flex-1">
            <h2 className="text-sr-text font-bold">Scan Gmail for Deadlines</h2>
            <p className="text-sr-muted text-xs mt-0.5">We'll find emails about assignments, due dates, and reminders</p>
          </div>
          <button onClick={onClose} className="text-sr-muted hover:text-sr-text transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {done ? (
          <div className="p-6 text-center">
            {done.emails === -1 ? (
              <>
                <div className="text-3xl mb-3">⚠️</div>
                <p className="text-sr-text font-semibold mb-1">Sync failed</p>
                <p className="text-sr-muted text-sm mb-4">Your Google account may not be connected. Try signing out and logging in again.</p>
              </>
            ) : (
              <>
                <CheckCircle className="w-12 h-12 text-sr-green mx-auto mb-3" />
                <p className="text-sr-text font-bold text-lg mb-1">Scan complete!</p>
                <p className="text-sr-muted text-sm mb-1">Scanned <span className="text-sr-text font-semibold">{done.emails}</span> emails</p>
                <p className="text-sr-green font-bold text-xl">{done.tasks} new tasks added</p>
              </>
            )}
            <button onClick={onClose} className="mt-4 bg-sr-red text-white font-bold py-2.5 px-6 rounded-xl hover:bg-red-600 transition-colors text-sm">
              {done.tasks > 0 ? 'See my tasks' : 'Close'}
            </button>
          </div>
        ) : (
          <div className="p-5">
            <p className="text-sr-text text-sm font-semibold mb-3">How far back should we look?</p>

            <div className="grid grid-cols-2 gap-2 mb-4">
              {PRESETS.map(p => (
                <button
                  key={p.days}
                  onClick={() => { setSelected(p.days); setCustom('') }}
                  className={`relative text-left p-3 rounded-xl border transition-all ${
                    selected === p.days && !custom
                      ? 'bg-sr-red/10 border-sr-red'
                      : 'bg-sr-header border-sr-border hover:border-sr-muted'
                  }`}
                >
                  {p.recommended && (
                    <span className="absolute top-2 right-2 text-[9px] font-bold text-sr-red bg-sr-red/10 px-1.5 py-0.5 rounded-full">BEST</span>
                  )}
                  <p className={`font-semibold text-sm ${selected === p.days && !custom ? 'text-sr-text' : 'text-sr-muted'}`}>{p.label}</p>
                  <p className="text-sr-muted text-xs mt-0.5">{p.desc}</p>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 mb-5">
              <div className="flex-1 h-px bg-sr-border" />
              <span className="text-sr-muted text-xs">or custom</span>
              <div className="flex-1 h-px bg-sr-border" />
            </div>

            <div className="flex items-center gap-2 mb-5">
              <Calendar className="w-4 h-4 text-sr-muted flex-shrink-0" />
              <input
                type="number"
                min="1"
                max="180"
                value={custom}
                onChange={e => { setCustom(e.target.value); setSelected(0) }}
                placeholder="Enter number of days (e.g. 45)"
                className="flex-1 bg-sr-header border border-sr-border rounded-xl px-3 py-2 text-sm text-sr-text placeholder-sr-muted outline-none focus:border-sr-red"
              />
              <span className="text-sr-muted text-sm">days</span>
            </div>

            <div className="bg-sr-header border border-sr-border rounded-xl p-3 mb-4 text-xs text-sr-muted">
              <p>🔍 We look for emails with keywords like <span className="text-sr-text">due, deadline, submit, assignment, reminder, exam</span> in the subject line.</p>
            </div>

            <button
              onClick={handleSync}
              disabled={syncing}
              className="w-full bg-sr-red text-white font-bold py-3 rounded-xl hover:bg-red-600 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {syncing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Scanning {effectiveDays} days of email...
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4" />
                  Scan last {effectiveDays} days
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
