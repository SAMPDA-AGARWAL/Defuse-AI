'use client'
import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Zap } from 'lucide-react'

function CallbackHandler() {
  const router = useRouter()
  const params = useSearchParams()

  useEffect(() => {
    const token = params.get('token')
    const isNew = params.get('isNew') === 'true'
    const userId = params.get('userId')

    if (!token) {
      router.replace('/login')
      return
    }

    // Store in localStorage for API calls
    localStorage.setItem('defuse_token', token)
    if (userId) localStorage.setItem('defuse_user_id', userId)

    // Also set as cookie so middleware can read it
    document.cookie = `defuse_token=${token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`

    router.replace(isNew ? '/onboarding' : '/dashboard')
  }, [params, router])

  return null
}

export default function AuthCallback() {
  return (
    <div className="min-h-screen bg-sr-bg flex items-center justify-center">
      <div className="text-center">
        <Zap className="w-12 h-12 text-sr-red animate-pulse mx-auto mb-4" fill="#FF3B3B" />
        <p className="text-sr-muted text-sm">Connecting your accounts...</p>
      </div>
      <Suspense fallback={null}>
        <CallbackHandler />
      </Suspense>
    </div>
  )
}
