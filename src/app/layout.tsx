import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'KaleidoSite',
  description: 'Every visit becomes a wild new single-file site',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="py-4">
          <header className="max-w-6xl mx-auto px-4 mb-4">
            <div className="flex items-center justify-between">
              <a href="/" className="text-xl font-semibold tracking-tight">KaleidoSite</a>
              <nav className="text-sm text-white/70">
                <a className="hover:text-white" href="/">Home</a>
              </nav>
            </div>
          </header>
          {children}
        </div>
      </body>
    </html>
  )
}
