import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  theme: {
    extend: {
      colors: {
        'sr-bg': 'rgb(var(--bg) / <alpha-value>)',
        'sr-card': 'rgb(var(--card) / <alpha-value>)',
        'sr-header': 'rgb(var(--header) / <alpha-value>)',
        'sr-border': 'rgb(var(--border) / <alpha-value>)',
        'sr-red': 'rgb(var(--accent) / <alpha-value>)',
        'sr-orange': 'rgb(var(--accent-warm) / <alpha-value>)',
        'sr-green': 'rgb(var(--accent-ok) / <alpha-value>)',
        'sr-purple': 'rgb(var(--accent-cool) / <alpha-value>)',
        'sr-text': 'rgb(var(--text) / <alpha-value>)',
        'sr-muted': 'rgb(var(--muted) / <alpha-value>)'
      },
      fontFamily: {
        sans: ['var(--font-body)', 'sans-serif'],
        display: ['var(--font-display)', 'sans-serif']
      },
      animation: {
        'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulse-fast': 'pulse 0.8s cubic-bezier(0.4, 0, 0.6, 1) infinite'
      }
    }
  },
  plugins: []
}

export default config
