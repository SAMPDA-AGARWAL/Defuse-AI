'use client'

import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'

type Theme = 'light' | 'dark'

const getPreferredTheme = (): Theme => {
  if (typeof window === 'undefined') return 'light'
  const saved = window.localStorage.getItem('defuse_theme')
  if (saved === 'light' || saved === 'dark') return saved
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export default function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const [theme, setTheme] = useState<Theme>('light')

  useEffect(() => {
    const next = getPreferredTheme()
    setTheme(next)
    document.documentElement.dataset.theme = next
  }, [])

  const toggleTheme = () => {
    const next: Theme = theme === 'light' ? 'dark' : 'light'
    setTheme(next)
    document.documentElement.dataset.theme = next
    window.localStorage.setItem('defuse_theme', next)
  }

  return (
    <button
      onClick={toggleTheme}
      className={`inline-flex items-center gap-2 border border-sr-border/10 bg-sr-header text-sr-muted transition-colors hover:text-sr-text ${
        compact
          ? 'h-9 w-9 justify-center rounded-xl'
          : 'rounded-xl px-4 py-2.5 text-sm gap-2'
      }`}
      aria-label="Toggle color theme"
    >
      {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
      {!compact && <span className="text-sm font-medium">{theme === 'light' ? 'Dark mode' : 'Light mode'}</span>}
    </button>
  )
}
