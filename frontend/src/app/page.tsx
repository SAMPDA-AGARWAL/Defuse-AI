'use client'

import Link from 'next/link'
import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  ArrowRight,
  Calendar,
  CalendarClock,
  Check,
  CheckCircle2,
  FileText,
  Image as ImageIcon,
  ImageIcon as GalleryIcon,
  Lock,
  Loader2,
  BellRing,
  Mail,
  MessageSquareText,
  MoonStar,
  ShieldCheck,
  Sparkles,
  X
} from 'lucide-react'
import ThemeToggle from '@/components/ThemeToggle'
import api from '@/lib/api'
import type { SourceConnection, User } from '@/types'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

const FEATURES = [
  {
    icon: Mail,
    title: 'Automatically scan Gmail',
    description: 'Detect assignments, interviews, bills, notices and important deadlines.'
  },
  {
    icon: Calendar,
    title: 'Sync Google Calendar',
    description: 'Import meetings, reminders and events so nothing gets missed.'
  },
  {
    icon: FileText,
    title: 'Extract from PDFs',
    description: 'Upload PDFs and DEFUSE AI will find deadlines, tasks and schedules.'
  },
  {
    icon: GalleryIcon,
    title: 'Scan images & screenshots',
    description: 'Use OCR to capture dates from notices, posters and handwritten notes.'
  },
  {
    icon: Sparkles,
    title: 'AI prioritizes what matters',
    description: 'Smart priority and focus suggestions to help you stay ahead.'
  },
  {
    icon: BellRing,
    title: 'Smart reminders',
    description: 'Get timely nudges so you never miss a submission or meeting.'
  }
]

const STEPS = [
  'Connect Google once',
  'Let Defuse collect deadlines',
  'Open a task and follow the guided steps'
]

const SOURCE_KEYS = ['gmail', 'calendar', 'pdf', 'image'] as const
type SourceKey = typeof SOURCE_KEYS[number]
type OverlayMode = 'auth' | 'onboarding' | 'loading' | null

type SourceState = {
  gmail: SourceConnection
  calendar: SourceConnection
  pdf: SourceConnection
  image: SourceConnection
}

const defaultConnection = (): SourceConnection => ({ status: 'not_connected' })

const initialSources = (): SourceState => ({
  gmail: defaultConnection(),
  calendar: defaultConnection(),
  pdf: defaultConnection(),
  image: defaultConnection()
})

const mergeSources = (user?: User | null): SourceState => ({
  gmail: user?.sources?.gmail || defaultConnection(),
  calendar: user?.sources?.calendar || defaultConnection(),
  pdf: user?.sources?.pdf || defaultConnection(),
  image: user?.sources?.image || defaultConnection()
})

const persistSession = (token: string, userId?: string) => {
  localStorage.setItem('defuse_token', token)
  if (userId) localStorage.setItem('defuse_user_id', userId)
  document.cookie = `defuse_token=${token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`
}

const persistIdentity = (email?: string, name?: string) => {
  if (!email) return
  localStorage.setItem('defuse_last_email', email)
  if (name) localStorage.setItem('defuse_last_name', name)
}

const formatSyncTime = (value?: string) => {
  if (!value) return 'Not synced yet'
  return `Last synced ${new Date(value).toLocaleString()}`
}

function HomeContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [overlayMode, setOverlayMode] = useState<OverlayMode>(null)
  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError] = useState('')
  const [user, setUser] = useState<User | null>(null)
  const [sources, setSources] = useState<SourceState>(initialSources)
  const [sourceLoading, setSourceLoading] = useState<Partial<Record<SourceKey, boolean>>>({})
  const [sourceError, setSourceError] = useState('')
  const [loadingMessages, setLoadingMessages] = useState<string[]>([])
  const [loadingIndex, setLoadingIndex] = useState(0)
  const [loadingDone, setLoadingDone] = useState(false)
  const pdfInputRef = useRef<HTMLInputElement | null>(null)
  const imageInputRef = useRef<HTMLInputElement | null>(null)
  const handledTokenRef = useRef<string | null>(null)

  const hasAnySourceConnected = useMemo(
    () => SOURCE_KEYS.some((key) => sources[key].status === 'connected'),
    [sources]
  )

  const fetchUser = async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('defuse_token') : null
    if (!token) return null
    try {
      const { data } = await api.get('/auth/me')
      setUser(data.user)
      setSources(mergeSources(data.user))
      return data.user as User
    } catch {
      setUser(null)
      setSources(initialSources())
      return null
    }
  }

  useEffect(() => {
    fetchUser()
  }, [])

  useEffect(() => {
    const token = searchParams.get('token')
    const userId = searchParams.get('userId') || undefined

    if (!token || handledTokenRef.current === token) return

    handledTokenRef.current = token
    persistSession(token, userId)

    const completeGoogleSignIn = async () => {
      setOverlayMode('loading')
      setLoadingMessages([
        'Connecting to Gmail securely...',
        'Reading your recent emails...',
        'Syncing your Google Calendar...',
        'Finding deadlines, interviews, and reminders...',
        'Building your DEFUSE AI dashboard...'
      ])
      setLoadingIndex(0)
      setLoadingDone(false)

      const currentUser = await fetchUser()
      if (currentUser) setSources(mergeSources(currentUser))

      await Promise.allSettled([
        api.get('/sync/gmail?days=30'),
        api.get('/sync/calendar?days=14')
      ])

      await api.patch('/auth/me', { onboardingCompleted: true }).catch(() => null)
      localStorage.setItem('defuse_show_onboarding', 'false')
      localStorage.removeItem('defuse_pending_google_connect')
      setLoadingDone(true)
      router.replace('/dashboard')
    }

    void completeGoogleSignIn()
  }, [router, searchParams])

  useEffect(() => {
    if (overlayMode !== 'onboarding') return

    const pendingSource = localStorage.getItem('defuse_pending_google_connect') as SourceKey | null
    if (!pendingSource) return
    if (!user?.authProviders?.google) return

    localStorage.removeItem('defuse_pending_google_connect')
    void handleSourceAction(pendingSource, true)
  }, [overlayMode, user])

  useEffect(() => {
    if (overlayMode !== 'auth') return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOverlayMode(null)
        setAuthError('')
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [overlayMode])

  useEffect(() => {
    if (overlayMode !== 'loading' || loadingMessages.length === 0) return
    setLoadingIndex(0)
    setLoadingDone(false)

    let currentIndex = 0
    const interval = window.setInterval(() => {
      currentIndex += 1
      if (currentIndex >= loadingMessages.length) {
        window.clearInterval(interval)
        setLoadingDone(true)
        return
      }
      setLoadingIndex(currentIndex)
    }, 1600)

    return () => window.clearInterval(interval)
  }, [overlayMode, loadingMessages])

  const openAuth = () => {
    if (user && user.onboardingCompleted !== false) {
      router.push('/dashboard')
      return
    }

    if (user && user.onboardingCompleted === false) {
      router.push('/dashboard')
      return
    }

    setAuthError('')
    setOverlayMode('auth')
  }

  const handleGoogleAuth = () => {
    setAuthLoading(true)
    window.location.href = `${API_URL}/auth/google?returnTo=home`
  }

  const updateSourceState = (key: SourceKey, patch: Partial<SourceConnection>) => {
    setSources((prev) => ({
      ...prev,
      [key]: { ...prev[key], ...patch }
    }))
  }

  const handleSourceAction = async (source: SourceKey, silent = false) => {
    if (!silent) setSourceError('')

    if ((source === 'gmail' || source === 'calendar') && !user?.authProviders?.google) {
      localStorage.setItem('defuse_pending_google_connect', source)
      localStorage.setItem('defuse_show_onboarding', 'true')
      window.location.href = `${API_URL}/auth/google?returnTo=home`
      return
    }

    setSourceLoading((prev) => ({ ...prev, [source]: true }))

    try {
      if (source === 'gmail') {
        await api.get('/sync/gmail?days=30')
      } else if (source === 'calendar') {
        await api.get('/sync/calendar?days=14')
      }

      const refreshedUser = await fetchUser()
      if (!refreshedUser) throw new Error('Unable to refresh user state.')

      updateSourceState(source, {
        ...(source === 'gmail' || source === 'calendar' ? refreshedUser.sources[source] : {}),
        status: 'connected',
        lastError: ''
      })
    } catch (error: any) {
      updateSourceState(source, { status: 'error', lastError: error?.response?.data?.message || 'Sync failed.' })
      if (!silent) setSourceError(error?.response?.data?.message || 'That source could not be connected right now.')
    } finally {
      setSourceLoading((prev) => ({ ...prev, [source]: false }))
    }
  }

  const handleFileUpload = async (source: 'pdf' | 'image', file?: File | null) => {
    if (!file) return
    setSourceError('')
    setSourceLoading((prev) => ({ ...prev, [source]: true }))

    try {
      const form = new FormData()
      form.append('file', file)

      if (source === 'pdf') {
        form.append('save', 'true')
        await api.post('/tasks/scan-syllabus', form, { headers: { 'Content-Type': 'multipart/form-data' } })
      } else {
        await api.post('/tasks/extract', form, { headers: { 'Content-Type': 'multipart/form-data' } })
      }

      const refreshedUser = await fetchUser()
      updateSourceState(source, {
        ...(refreshedUser?.sources?.[source] || {}),
        status: 'connected',
        fileName: file.name,
        lastError: ''
      })
    } catch (error: any) {
      updateSourceState(source, { status: 'error', lastError: error?.response?.data?.message || 'Upload failed.' })
      setSourceError(error?.response?.data?.message || 'Upload failed. Please try a different file.')
    } finally {
      setSourceLoading((prev) => ({ ...prev, [source]: false }))
    }
  }

  const buildLoadingSequence = () => {
    const messages = ['Setting up your workspace...', 'Getting everything ready...']
    if (sources.gmail.status === 'connected') {
      messages.push(
        'Connecting to Gmail securely...',
        'Reading your recent emails...',
        'Identifying assignments and deadlines...',
        'Flagging internship and hackathon updates...'
      )
    }
    if (sources.calendar.status === 'connected') {
      messages.push('Syncing your Google Calendar...', 'Pulling upcoming meetings and events...')
    }
    if (sources.pdf.status === 'connected') {
      messages.push('Reading your PDF...', 'Extracting dates, titles, and priorities...')
    }
    if (sources.image.status === 'connected') {
      messages.push('Running OCR on your image...', 'Detecting deadlines and tasks...')
    }
    messages.push(
      'Grouping and deduplicating tasks...',
      'Prioritizing by urgency and importance...',
      'Building your personalized dashboard...',
      'Almost there...',
      'Welcome to DEFUSE AI.'
    )
    return messages
  }

  const handleProceed = async (skip = false) => {
    setOverlayMode('loading')
    const sequence = buildLoadingSequence()
    setLoadingMessages(sequence)

    const syncJobs: Promise<unknown>[] = []
    if (!skip && sources.gmail.status === 'connected') syncJobs.push(api.get('/sync/gmail?days=30'))
    if (!skip && sources.calendar.status === 'connected') syncJobs.push(api.get('/sync/calendar?days=14'))

    const minDelay = new Promise((resolve) => window.setTimeout(resolve, 6800))
    await Promise.allSettled([...syncJobs, minDelay])
    await api.patch('/auth/me', { onboardingCompleted: true }).catch(() => null)
    localStorage.setItem('defuse_show_onboarding', 'false')
    localStorage.removeItem('defuse_pending_google_connect')
    setLoadingDone(true)
    window.setTimeout(() => router.push('/dashboard'), 700)
  }

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-7xl flex-col">
        <header className="app-surface sticky top-4 z-20 mb-6 flex items-center justify-between rounded-full px-4 py-3 backdrop-blur sm:px-6">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sr-red text-white shadow-lg shadow-sr-red/20">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="font-display text-lg font-bold tracking-tight text-sr-text">DEFUSE AI</p>
              <p className="text-xs text-sr-muted">Deadline clarity for student and hackathon teams</p>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <ThemeToggle compact />
            <button
              onClick={openAuth}
              className="hidden rounded-full border border-sr-border bg-sr-header px-4 py-2 text-sm font-semibold text-sr-text transition-colors hover:border-sr-red hover:text-sr-red sm:inline-flex"
            >
              {user ? 'Open Dashboard' : 'Login'}
            </button>
          </div>
        </header>

        <section className="grid flex-1 items-center gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-sr-border bg-sr-header px-4 py-2 text-sm text-sr-muted">
              <Sparkles className="h-4 w-4 text-sr-red" />
              Built to make deadline tracking less confusing
            </div>

            <div className="space-y-4">
              <h1 className="max-w-3xl font-display text-4xl font-bold leading-tight tracking-tight text-sr-text sm:text-5xl lg:text-6xl">
                One clean home for tasks, deadlines, and &ldquo;what should we do first?&rdquo;
              </h1>
              <p className="max-w-2xl text-balance text-base leading-7 text-sr-muted sm:text-lg">
                Defuse AI helps students and hackathon teams collect work from Gmail, Calendar, and manual notes, then turns it into a simple action list with guided focus steps.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                onClick={openAuth}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-sr-green px-6 py-3.5 text-sm font-bold text-white transition-transform hover:-translate-y-0.5"
              >
                Get Started for Free
                <ArrowRight className="h-4 w-4" />
              </button>
              <a
                href="#what-we-do"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-sr-border bg-sr-header px-6 py-3.5 text-sm font-semibold text-sr-text transition-colors hover:border-sr-red hover:text-sr-red"
              >
                See Preview <span aria-hidden="true">↓</span>
              </a>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { label: 'Inbox to task list', value: 'Auto-detects deadlines' },
                { label: 'Simple focus mode', value: 'Step-by-step work help' },
                { label: 'Demo ready', value: 'Mobile responsive UI' }
              ].map((item) => (
                <div key={item.label} className="app-surface rounded-3xl p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-sr-muted">{item.label}</p>
                  <p className="mt-2 font-display text-lg font-semibold text-sr-text">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="app-surface relative overflow-hidden rounded-[2rem] p-5 sm:p-6">
            <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-r from-sr-red/15 via-sr-orange/10 to-sr-purple/10" />
            <div className="relative space-y-5">
              <div className="flex items-center justify-between rounded-3xl border border-sr-border bg-sr-header px-4 py-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-sr-muted">Today in Defuse</p>
                  <p className="mt-1 font-display text-xl font-semibold text-sr-text">3 things need attention</p>
                </div>
                <MoonStar className="h-8 w-8 text-sr-red" />
              </div>

              <div className="space-y-3">
                {[
                  { title: 'Finish hackathon landing page', time: 'Due today, 8:00 PM', tone: 'bg-sr-red/10 text-sr-red' },
                  { title: 'Reply to mentor email', time: 'Due in 4 hours', tone: 'bg-sr-orange/10 text-sr-orange' },
                  { title: 'Prepare demo notes', time: 'Tomorrow morning', tone: 'bg-sr-green/10 text-sr-green' }
                ].map((item) => (
                  <div key={item.title} className="rounded-3xl border border-sr-border bg-sr-card p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-sr-text">{item.title}</p>
                        <p className="mt-1 text-sm text-sr-muted">{item.time}</p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${item.tone}`}>Next up</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-3xl border border-dashed border-sr-border px-4 py-4">
                <p className="text-sm font-semibold text-sr-text">Why it&apos;s easy to explain</p>
                <div className="mt-3 space-y-3">
                  {STEPS.map((step) => (
                    <div key={step} className="flex items-center gap-3 text-sm text-sr-muted">
                      <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-sr-green" />
                      {step}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="what-we-do" className="py-10">
          <div className="mb-6 max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sr-red">What We Do</p>
            <h2 className="mt-3 font-display text-3xl font-bold text-sr-text sm:text-4xl">
              Defuse AI is a friendly tracking tool, not a complicated project system
            </h2>
            <p className="mt-3 text-base leading-7 text-sr-muted">
              It helps your team capture deadlines, prioritize what matters right now, and open one task at a time with clear guidance. That keeps the product simple enough for a hackathon demo and useful for real students.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, description }) => (
              <div key={title} className="app-surface rounded-[1.75rem] p-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sr-red/10 text-sr-red">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-display text-xl font-semibold text-sr-text">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-sr-muted">{description}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <input
        ref={pdfInputRef}
        type="file"
        accept=".pdf"
        className="hidden"
        onChange={(event) => handleFileUpload('pdf', event.target.files?.[0])}
      />
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => handleFileUpload('image', event.target.files?.[0])}
      />

      {overlayMode === 'auth' ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md">
          <div
            className="absolute inset-0"
            onClick={() => setOverlayMode(null)}
            aria-hidden="true"
          />
          <div className="relative z-10 w-full max-w-[1120px] overflow-hidden rounded-[24px] border border-[#f0e6dc] bg-white shadow-[0_40px_120px_rgba(23,31,19,0.18)]">
            <button
              onClick={() => setOverlayMode(null)}
              className="absolute right-3 top-3 z-20 rounded-full bg-white/90 p-2 text-sr-muted shadow-sm transition-colors hover:text-sr-text"
              aria-label="Close auth modal"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="grid min-h-[760px] md:grid-cols-2">
              <section className="relative hidden overflow-hidden border-r border-[#f3e7db] bg-[linear-gradient(180deg,#fffaf5_0%,#fff4e7_52%,#fffaf6_100%)] px-12 py-10 md:block">
                <div className="absolute inset-y-0 right-0 w-[58%] bg-[radial-gradient(circle_at_top_right,rgba(255,127,39,0.12),transparent_54%),radial-gradient(circle_at_bottom_right,rgba(255,173,110,0.20),transparent_58%)]" />
                <div className="relative">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#ffd9c2] bg-white text-sr-red shadow-[0_12px_28px_rgba(255,133,63,0.12)]">
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-display text-[2rem] font-bold tracking-[-0.03em] text-sr-text">DEFUSE AI</p>
                      <p className="text-sm text-sr-muted">Deadline clarity for student and hackathon teams</p>
                    </div>
                  </div>

                  <h2 className="mt-12 max-w-[390px] font-display text-[3.2rem] font-bold leading-[1.06] tracking-[-0.05em] text-sr-text">
                    Create your free <span className="text-sr-red">DEFUSE AI</span> account in <span className="decoration-sr-red underline decoration-[3px] underline-offset-[6px]">under 30 seconds</span>
                  </h2>

                  <div className="mt-10 space-y-5">
                    {FEATURES.map(({ icon: Icon, title, description }) => (
                      <div key={title} className="flex items-start gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#ffd9c1] bg-white text-sr-red shadow-[0_10px_22px_rgba(255,130,56,0.10)]">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="max-w-[310px]">
                          <p className="text-[1.02rem] font-semibold leading-6 text-sr-text">{title}</p>
                          <p className="mt-1 text-sm leading-6 text-sr-muted">{description}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pointer-events-none absolute -bottom-14 right-0 h-56 w-60 opacity-75">
                    <div className="absolute inset-x-10 bottom-4 h-44 rounded-[999px] border border-[#ffd9c2]" />
                    <div className="absolute inset-x-6 bottom-0 h-44 rounded-[999px] border border-[#ffe6d5]" />
                    <div className="absolute inset-x-14 bottom-9 h-40 rounded-[999px] border border-[#ffefdf]" />
                    <div className="absolute right-10 top-16 h-2.5 w-2.5 rotate-45 bg-sr-red/75" />
                    <div className="absolute right-20 top-36 h-2 w-2 rotate-45 bg-[#ffaf72]" />
                    <div className="absolute right-4 top-28 h-1.5 w-1.5 rotate-45 bg-[#ffd4b2]" />
                  </div>
                </div>
              </section>

              <section className="flex min-h-full flex-col justify-between bg-white px-8 py-10 sm:px-10">
                <div className="flex flex-1 items-center justify-center">
                  <div className="w-full max-w-[360px] text-center">
                    <h3 className="font-display text-[2.15rem] font-bold tracking-[-0.04em] text-sr-text">
                      Welcome to DEFUSE AI
                    </h3>
                    <p className="mt-3 text-[1.05rem] leading-8 text-sr-muted">
                      Sign up for free and start organizing your deadlines smarter.
                    </p>

                    <button
                      onClick={handleGoogleAuth}
                      disabled={authLoading}
                      className="mt-10 inline-flex w-full items-center justify-center gap-4 rounded-[16px] border border-[#d7dce4] bg-white px-6 py-4 text-base font-semibold text-[#1f2430] shadow-[0_10px_30px_rgba(17,24,39,0.08)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_38px_rgba(17,24,39,0.10)] disabled:opacity-70"
                    >
                      <svg className="h-6 w-6 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      <span>{authLoading ? 'Redirecting to Google...' : 'Continue with Google'}</span>
                      {authLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
                    </button>

                    <div className="mt-7 flex items-start justify-center gap-2 text-sm leading-7 text-sr-muted">
                      <Lock className="mt-1 h-4 w-4 shrink-0" />
                      <p>Secure. Private. We never access your data without your permission.</p>
                    </div>

                    {authError ? <p className="mt-4 text-sm text-sr-red">{authError}</p> : null}
                  </div>
                </div>

                <div className="mx-auto w-full max-w-[360px] border-t border-[#ebeff4] pt-5 text-center text-xs leading-6 text-sr-muted">
                  By signing up, you agree to our <a href="#" className="font-semibold text-sr-red">Terms of Service</a> <span className="px-1.5 text-[#c3c9d2]">•</span> <a href="#" className="font-semibold text-sr-red">Privacy Policy</a>.
                </div>
              </section>
            </div>
          </div>
        </div>
      ) : null}

      {overlayMode === 'onboarding' ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[rgba(0,0,0,0.62)] px-4 py-8 backdrop-blur-md">
          <div className="mx-auto w-full max-w-6xl">
            <div className="app-surface rounded-[2rem] p-6 sm:p-8">
              <div className="max-w-3xl">
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sr-red">Onboarding</p>
                <h2 className="mt-3 font-display text-4xl font-bold tracking-tight text-sr-text">
                  Choose how DEFUSE AI should build your workspace.
                </h2>
                <p className="mt-3 text-base leading-7 text-sr-muted">
                  Connect your sources - DEFUSE AI will automatically find your deadlines, meetings, and upcoming work.
                </p>
              </div>

              {sourceError ? <p className="mt-5 rounded-2xl bg-sr-red/10 px-4 py-3 text-sm text-sr-red">{sourceError}</p> : null}

              <div className="mt-8 grid gap-4 md:grid-cols-2">
                {[
                  {
                    key: 'gmail' as const,
                    icon: Mail,
                    title: 'Gmail',
                    description: 'Automatically scans for assignments, interviews, hackathon invites, submission reminders, Google Classroom emails, and internship updates.',
                    button: 'Connect Gmail'
                  },
                  {
                    key: 'calendar' as const,
                    icon: Calendar,
                    title: 'Google Calendar',
                    description: 'Pulls upcoming meetings, class schedules, interview slots, and due date reminders directly into your timeline.',
                    button: 'Connect Calendar'
                  },
                  {
                    key: 'pdf' as const,
                    icon: FileText,
                    title: 'PDF Documents',
                    description: 'Upload syllabi, assignment sheets, schedules, or notices. AI extracts every date, deadline, and task automatically.',
                    button: 'Upload PDF'
                  },
                  {
                    key: 'image' as const,
                    icon: ImageIcon,
                    title: 'Screenshots & Images',
                    description: 'Upload photos of handwritten schedules, notice boards, or deadline posters. OCR reads the text so you do not have to retype anything.',
                    button: 'Upload Image'
                  }
                ].map(({ key, icon: Icon, title, description, button }) => {
                  const connection = sources[key]
                  const connected = connection.status === 'connected'
                  const busy = !!sourceLoading[key]

                  return (
                    <div key={key} className="rounded-[1.75rem] border border-sr-border bg-sr-header p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sr-card text-sr-red">
                          <Icon className="h-5 w-5" />
                        </div>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          connected ? 'bg-sr-green/10 text-sr-green' : connection.status === 'error' ? 'bg-sr-red/10 text-sr-red' : 'bg-sr-card text-sr-muted'
                        }`}>
                          {connected ? 'Connected' : connection.status === 'error' ? 'Needs retry' : 'Optional'}
                        </span>
                      </div>

                      <h3 className="mt-4 font-display text-2xl font-semibold text-sr-text">{title}</h3>
                      <p className="mt-2 text-sm leading-6 text-sr-muted">{description}</p>

                      <p className="mt-3 text-xs text-sr-muted">
                        {connection.fileName ? `${connection.fileName} - ${formatSyncTime(connection.lastSyncedAt)}` : formatSyncTime(connection.lastSyncedAt)}
                      </p>

                      <button
                        onClick={() => {
                          if (key === 'pdf') pdfInputRef.current?.click()
                          else if (key === 'image') imageInputRef.current?.click()
                          else void handleSourceAction(key)
                        }}
                        disabled={busy || (connected && (key === 'pdf' || key === 'image'))}
                        className={`mt-5 inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-60 ${
                          connected
                            ? 'bg-sr-green text-white'
                            : 'bg-sr-red text-white hover:bg-red-600'
                        }`}
                      >
                        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : connected ? <Check className="h-4 w-4" /> : null}
                        {connected ? `${title === 'Google Calendar' ? 'Calendar' : title === 'PDF Documents' ? 'PDF' : title === 'Screenshots & Images' ? 'Image' : 'Gmail'} Connected` : button}
                      </button>
                    </div>
                  )
                })}
              </div>

              <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                <button
                  onClick={() => handleProceed(!hasAnySourceConnected)}
                  className={`inline-flex items-center gap-2 rounded-full px-6 py-3.5 text-sm font-bold ${
                    hasAnySourceConnected
                      ? 'bg-sr-red text-white'
                      : 'border border-sr-border bg-sr-header text-sr-text'
                  }`}
                >
                  {hasAnySourceConnected ? 'Build My Workspace' : 'Skip for now'}
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleProceed(true)}
                  className="text-sm font-semibold text-sr-muted transition-colors hover:text-sr-text"
                >
                  Skip for now
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {overlayMode === 'loading' ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-sr-bg px-4">
          <div className="mx-auto w-full max-w-[480px] text-center">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-3xl bg-sr-red text-white shadow-lg shadow-sr-red/20">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sr-muted">DEFUSE AI</p>
            <div className="mx-auto mt-6 h-28 w-28 rounded-full border-8 border-sr-border/40 border-t-sr-red animate-spin motion-reduce:animate-none" />
            <div className="mt-6 h-2 overflow-hidden rounded-full bg-sr-header">
              <div
                className="h-full rounded-full bg-sr-red transition-all duration-500"
                style={{ width: `${Math.max(8, ((loadingIndex + 1) / Math.max(loadingMessages.length, 1)) * 100)}%` }}
              />
            </div>
            <p className="mt-6 min-h-[3rem] text-lg font-semibold text-sr-text transition-opacity duration-300">
              {loadingMessages[loadingIndex] || 'Setting up your workspace...'}
            </p>
            {loadingDone ? <p className="mt-2 text-sm text-sr-muted">Preparing your dashboard...</p> : null}
          </div>
        </div>
      ) : null}
    </main>
  )
}

export default function Home() {
  return (
    <Suspense fallback={null}>
      <HomeContent />
    </Suspense>
  )
}
