'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, Loader2, Mail, Calendar, MessageCircle, ArrowRight } from 'lucide-react'
import api from '@/lib/api'
import type { Task } from '@/types'

type Step = 1 | 2 | 3

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [scanning, setScanning] = useState(false)
  const [tasks, setTasks] = useState<Task[]>([])
  const [whatsapp, setWhatsapp] = useState('')
  const [scanResult, setScanResult] = useState({ emailsScanned: 0, tasksCreated: 0, synced: 0 })

  useEffect(() => {
    if (step === 1) startScan()
  }, [])

  const startScan = async () => {
    setScanning(true)
    try {
      const [gmailRes, calRes] = await Promise.allSettled([
        api.get('/sync/gmail'),
        api.get('/sync/calendar')
      ])
      const gmail = gmailRes.status === 'fulfilled' ? gmailRes.value.data : { emailsScanned: 0, tasksCreated: 0 }
      const cal = calRes.status === 'fulfilled' ? calRes.value.data : { synced: 0 }
      setScanResult({ emailsScanned: gmail.emailsScanned || 0, tasksCreated: gmail.tasksCreated || 0, synced: cal.synced || 0 })

      const { data } = await api.get('/tasks')
      setTasks(data.tasks?.slice(0, 5) || [])
    } catch (e) {
      console.error('Scan error:', e)
    } finally {
      setScanning(false)
      setTimeout(() => setStep(2), 1000)
    }
  }

  const saveWhatsApp = async () => {
    if (whatsapp) {
      await api.patch('/auth/me', { 'preferences.whatsappNumber': whatsapp }).catch(() => {})
    }
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-2xl">
        {/* Progress dots */}
        <div className="mb-8 flex justify-center gap-2">
          {[1, 2, 3].map(s => (
            <div key={s} className={`h-2 w-12 rounded-full transition-all ${s <= step ? 'bg-sr-red' : 'bg-sr-border'}`} />
          ))}
        </div>

        {step === 1 && (
          <div className="app-surface rounded-[2rem] p-8 text-center">
            <div className="mb-4 text-4xl">{scanning ? '🔍' : '✅'}</div>
            <h2 className="font-display text-3xl font-bold text-sr-text mb-2">
              {scanning ? 'Scanning your accounts...' : 'Scan Complete!'}
            </h2>
            <p className="text-sr-muted mb-8">
              {scanning ? 'Reading Gmail and Calendar for deadlines...' : `Found ${scanResult.tasksCreated + scanResult.synced} items across your accounts`}
            </p>
            {scanning && <Loader2 className="w-8 h-8 text-sr-red animate-spin mx-auto" />}
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="bg-sr-header border border-sr-border rounded-[1.5rem] p-4 flex items-center gap-3">
                <Mail className="w-5 h-5 text-sr-red" />
                <div><p className="text-sr-text text-sm font-semibold">Gmail</p><p className="text-sr-muted text-xs">{scanResult.tasksCreated} tasks found</p></div>
              </div>
              <div className="bg-sr-header border border-sr-border rounded-[1.5rem] p-4 flex items-center gap-3">
                <Calendar className="w-5 h-5 text-sr-green" />
                <div><p className="text-sr-text text-sm font-semibold">Calendar</p><p className="text-sr-muted text-xs">{scanResult.synced} events synced</p></div>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="app-surface rounded-[2rem] p-8">
            <h2 className="font-display text-3xl font-bold text-sr-text mb-2">Here&apos;s what I found</h2>
            <p className="text-sr-muted mb-6">These deadlines are now in your dashboard.</p>
            <div className="space-y-2 mb-8">
              {tasks.length ? tasks.map(t => (
                <div key={t._id} className="bg-sr-header border border-sr-border rounded-[1.25rem] px-4 py-3 flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${t.priority === 'critical' ? 'bg-sr-red' : t.priority === 'high' ? 'bg-sr-orange' : 'bg-sr-green'}`} />
                  <p className="text-sr-text text-sm flex-1 truncate">{t.title}</p>
                  <span className="text-sr-muted text-xs">{t.source}</span>
                </div>
              )) : (
                <div className="bg-sr-header border border-sr-border rounded-[1.5rem] p-6 text-center">
                  <CheckCircle className="w-8 h-8 text-sr-green mx-auto mb-2" />
                  <p className="text-sr-muted text-sm">No urgent deadlines found! You're clear.</p>
                </div>
              )}
            </div>
            <button onClick={() => setStep(3)} className="w-full bg-sr-red text-white font-bold py-3.5 rounded-2xl hover:bg-red-600 transition-colors flex items-center justify-center gap-2">
              Looks good <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="app-surface rounded-[2rem] p-8 text-center">
            <MessageCircle className="w-12 h-12 text-sr-green mx-auto mb-4" />
            <h2 className="font-display text-3xl font-bold text-sr-text mb-2">Add WhatsApp alerts?</h2>
            <p className="text-sr-muted mb-6">Get deadline warnings directly on WhatsApp — no app needed.</p>
            <input
              type="tel"
              value={whatsapp}
              onChange={e => setWhatsapp(e.target.value)}
              placeholder="+91 XXXXX XXXXX"
              className="w-full bg-sr-header border border-sr-border rounded-2xl px-4 py-3 text-sr-text placeholder-sr-muted mb-4 outline-none focus:border-sr-red transition-colors"
            />
            <button onClick={saveWhatsApp} className="w-full bg-sr-red text-white font-bold py-3.5 rounded-2xl hover:bg-red-600 transition-colors mb-3">
              Add WhatsApp
            </button>
            <button onClick={() => router.push('/dashboard')} className="w-full text-sr-muted text-sm py-2 hover:text-sr-text transition-colors">
              Skip for now
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
