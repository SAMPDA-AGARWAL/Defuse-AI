'use client'
import { useState, useEffect } from 'react'

interface CountdownResult {
  hours: number
  minutes: number
  seconds: number
  totalSeconds: number
  isExpired: boolean
  isCritical: boolean
  isWarning: boolean
  display: string
  colorClass: string
}

export const useCountdown = (deadline?: string): CountdownResult => {
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [])

  if (!deadline) {
    return { hours: 0, minutes: 0, seconds: 0, totalSeconds: 0, isExpired: false, isCritical: false, isWarning: false, display: 'No deadline', colorClass: 'text-sr-muted' }
  }

  const diff = new Date(deadline).getTime() - now
  const totalSeconds = Math.max(0, Math.floor(diff / 1000))
  const isExpired = diff <= 0
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const isCritical = !isExpired && hours < 6
  const isWarning = !isExpired && hours < 24 && !isCritical

  const display = isExpired
    ? 'EXPIRED'
    : hours > 48
    ? `${Math.floor(hours / 24)}d ${hours % 24}h`
    : `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`

  const colorClass = isExpired
    ? 'text-gray-500'
    : isCritical
    ? 'text-sr-red'
    : isWarning
    ? 'text-sr-orange'
    : 'text-sr-green'

  return { hours, minutes, seconds, totalSeconds, isExpired, isCritical, isWarning, display, colorClass }
}
