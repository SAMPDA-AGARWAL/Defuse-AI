import type { Metadata } from 'next'
import { Manrope, Space_Grotesk } from 'next/font/google'
import './globals.css'

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-body'
})

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-display'
})

export const metadata: Metadata = {
  title: 'DEFUSE AI',
  description: 'Defuse AI turns messy deadlines from Gmail, Calendar, and manual notes into a clean action list your team can actually follow.'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const themeScript = `
    (function() {
      try {
        var saved = localStorage.getItem('defuse_theme');
        var theme = saved === 'light' || saved === 'dark'
          ? saved
          : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        document.documentElement.dataset.theme = theme;
      } catch (e) {
        document.documentElement.dataset.theme = 'light';
      }
    })();
  `

  return (
    <html lang="en">
      <body className={`${manrope.variable} ${spaceGrotesk.variable} bg-sr-bg font-sans text-sr-text antialiased`}>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        {children}
      </body>
    </html>
  )
}
