import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Activity, Users, Building2, AlertTriangle, RefreshCw, UploadCloud } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

export function Navigation() {
  const location = useLocation()

  const navItems = [
    { path: '/upload', label: 'Upload Data', icon: UploadCloud, primary: true },
    { path: '/', label: 'Dashboard', icon: Activity },
    { path: '/subjects', label: 'Subjects', icon: Users },
    { path: '/sites', label: 'Sites', icon: Building2 },
    { path: '/data-quality', label: 'Data Quality', icon: AlertTriangle },
  ]

  return (
    <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur-xl">
      <div className="container mx-auto flex h-16 items-center justify-between px-6">
        <div className="flex items-center gap-8">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 transition-opacity hover:opacity-80">
            <div className="rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 p-2 shadow-sm">
              <Activity className="h-5 w-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold leading-none text-slate-900">
                Casebook
              </span>
              <span className="text-xs leading-none text-slate-500">
                Soft-Lock Navigator
              </span>
            </div>
          </Link>

          {/* Nav Links */}
          <div className="flex gap-1">
            {navItems.map(({ path, label, icon: Icon, primary }) => {
              const isActive = location.pathname === path

              // Primary upload button
              if (primary) {
                return (
                  <Link
                    key={path}
                    to={path}
                    className={cn(
                      'flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-semibold transition-all shadow-sm',
                      isActive
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md hover:shadow-lg'
                        : 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:from-blue-600 hover:to-indigo-600 hover:shadow-lg'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{label}</span>
                  </Link>
                )
              }

              // Regular nav links
              return (
                <Link
                  key={path}
                  to={path}
                  className={cn(
                    'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all',
                    isActive
                      ? 'bg-blue-50 text-blue-700 shadow-sm'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{label}</span>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-1.5">
            <div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
            <span className="text-xs font-medium text-slate-600">
              Updated 2m ago
            </span>
          </div>

          <Button variant="outline" size="sm" className="gap-2">
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
        </div>
      </div>
    </nav>
  )
}
