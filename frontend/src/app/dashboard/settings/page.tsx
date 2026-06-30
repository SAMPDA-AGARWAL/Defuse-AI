'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, LogOut, Settings, UserRound } from 'lucide-react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import type { User } from '@/types'

export default function DashboardSettingsPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('defuse_token')
    if (!token) {
      router.replace('/login')
      return
    }

    const loadUser = async () => {
      try {
        const { data } = await api.get('/auth/me')
        setUser(data.user)
      } catch (error) {
        console.error(error)
      }
    }

    void loadUser()
  }, [router])

  const handleLogout = () => {
    localStorage.clear()
    document.cookie = 'defuse_token=; path=/; max-age=0'
    router.replace('/login')
  }

  return (
    <main className="min-h-screen px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-5">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-full border border-sr-border bg-sr-header px-4 py-2 text-sm font-semibold text-sr-text transition-colors hover:bg-sr-card"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to dashboard
          </Link>
        </div>

        <section className="app-surface rounded-[2rem] p-6 sm:p-7">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sr-red/10 text-sr-red">
              <Settings className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sr-muted">Settings</p>
              <h1 className="mt-1 font-display text-3xl font-bold text-sr-text">Account settings</h1>
            </div>
          </div>

          <div className="mt-6 rounded-[1.5rem] border border-sr-border/10 bg-sr-header p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sr-card text-sr-muted">
                <UserRound className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-sr-text">{user?.name || 'Defuse User'}</p>
                <p className="text-sm text-sr-muted">{user?.email || 'Loading account email...'}</p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-sr-muted">
              More account controls can be added here later. For now, this page gives users a clear settings destination from the profile menu.
            </p>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-sr-red px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#d95a2e]"
          >
            <LogOut className="h-4 w-4" />
            Log out
          </button>
        </section>
      </div>
    </main>
  )
}
