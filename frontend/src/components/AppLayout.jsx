import React from 'react'
import { Navigation } from './Navigation'

export function AppLayout({ children }) {
  return (
    <div className="min-h-screen">
      <Navigation />
      <main className="container mx-auto px-6 py-8 max-w-7xl">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white/50 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-6 max-w-7xl">
          <div className="flex flex-col items-center justify-between gap-4 text-sm text-slate-600 sm:flex-row">
            <p>
              © 2026 Casebook Soft-Lock Navigator. Clinical trial data management dashboard.
            </p>
            <div className="flex gap-6">
              <a href="#" className="transition-colors hover:text-slate-900">
                Documentation
              </a>
              <a href="#" className="transition-colors hover:text-slate-900">
                Support
              </a>
              <a href="#" className="transition-colors hover:text-slate-900">
                Privacy
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
