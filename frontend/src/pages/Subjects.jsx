import React, { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Search, Download, Users, AlertCircle, FileText, ChevronRight } from 'lucide-react'
import {
  StatusBadge,
  EmptyState,
  LoadingSpinner,
  ProgressBar,
  SplitText,
  FadeContent,
  LineSidebar,
  Counter
} from '@/components/bits'
import { cn } from '@/lib/utils'
import { getSubjects } from '@/lib/api'

export function Subjects() {
  const [subjects, setSubjects] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  // Filter states
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterBlocker, setFilterBlocker] = useState('all')

  useEffect(() => {
    fetchSubjects()
  }, [])

  const fetchSubjects = async () => {
    try {
      setIsLoading(true)
      setError(null)
      // Always fetch all to do client-side filtering for better UX with LineSidebar
      const data = await getSubjects()
      setSubjects(data.subjects || [])
    } catch (err) {
      setError(err.message || 'Endpoint not available')
      setSubjects([])
    } finally {
      setIsLoading(false)
    }
  }

  // Derive simple status for badge (ready, warning, blocked)
  const getSubjectStatus = (subject) => {
    if (subject.ready_to_soft_lock) return 'ready'
    // If they have 1-2 blockers and none are critical adjudications
    if (subject.blocker_count > 0 && subject.blocker_count <= 2 &&
        (!subject.primary_blocker || !subject.primary_blocker.includes('Critical'))) {
      return 'warning'
    }
    return 'blocked'
  }

  // Memoized filtering logic
  const { filteredSubjects, counts } = useMemo(() => {
    // Calculate counts for sidebar badges
    const statusCounts = { ready: 0, warning: 0, blocked: 0 }
    const blockerCounts = { sigs: 0, queries: 0, pd: 0, adj: 0 }

    subjects.forEach(s => {
      const status = getSubjectStatus(s)
      statusCounts[status]++

      const pb = s.primary_blocker || ''
      if (pb.includes('Signature')) blockerCounts.sigs++
      else if (pb.includes('Quer')) blockerCounts.queries++
      else if (pb.includes('Deviation')) blockerCounts.pd++
      else if (pb.includes('Adjudication')) blockerCounts.adj++
    })

    // Apply filters
    const filtered = subjects.filter(subject => {
      // Search
      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase()
        if (!subject.subject_id.toLowerCase().includes(searchLower) &&
            !subject.site_id.toLowerCase().includes(searchLower)) {
          return false
        }
      }

      // Status
      if (filterStatus !== 'all' && getSubjectStatus(subject) !== filterStatus) {
        return false
      }

      // Primary Blocker
      if (filterBlocker !== 'all') {
        const pb = subject.primary_blocker || ''
        if (filterBlocker === 'sigs' && !pb.includes('Signature')) return false
        if (filterBlocker === 'queries' && !pb.includes('Quer')) return false
        if (filterBlocker === 'pd' && !pb.includes('Deviation')) return false
        if (filterBlocker === 'adj' && !pb.includes('Adjudication')) return false
      }

      return true
    })

    return {
      filteredSubjects: filtered,
      counts: { status: statusCounts, blockers: blockerCounts, total: subjects.length }
    }
  }, [subjects, searchQuery, filterStatus, filterBlocker])

  // Pagination (client-side for performance)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 50
  const totalPages = Math.ceil(filteredSubjects.length / itemsPerPage)

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, filterStatus, filterBlocker])

  const paginatedSubjects = filteredSubjects.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  return (
    <div className="flex h-full min-h-[calc(100vh-140px)]">
      {/* Main Content Area */}
      <div className="flex-1 space-y-6 pb-12 w-full max-w-full overflow-hidden">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 pb-6 pr-10">
          <div>
            <SplitText
              text="SUBJECT READINESS INTELLIGENCE"
              as="h1"
              className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight"
            />
            <p className="mt-2 text-lg text-slate-600">
              Master roster of enrolled subjects and database lock status
            </p>
          </div>
          <div className="flex gap-3 shrink-0">
            {/* Search Input */}
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search subject or site ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 pl-9 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <span className="sr-only">Clear</span>
                  &times;
                </button>
              )}
            </div>
            <Button variant="outline" size="default" className="gap-2 shrink-0 bg-white shadow-sm hover:bg-slate-50">
              <Download className="h-4 w-4" />
              Export Roster
            </Button>
          </div>
        </div>

        {error && (
          <FadeContent>
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-red-900">Data unavailable</p>
                  <p className="mt-1 text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          </FadeContent>
        )}

        {/* Quick Stats Bar */}
        {!isLoading && !error && (
          <FadeContent delay={0.1}>
            <div className="flex items-center gap-6 text-sm bg-white p-3 rounded-lg border border-slate-200 shadow-sm inline-flex">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-slate-400" />
                <span className="text-slate-600">Total:</span>
                <span className="font-bold text-slate-900 tabular-nums"><Counter value={counts.total} /></span>
              </div>
              <div className="w-px h-4 bg-slate-200" />
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                <span className="text-slate-600">Ready:</span>
                <span className="font-bold text-green-700 tabular-nums"><Counter value={counts.status.ready} /></span>
              </div>
              <div className="w-px h-4 bg-slate-200" />
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-red-500" />
                <span className="text-slate-600">Blocked:</span>
                <span className="font-bold text-red-700 tabular-nums"><Counter value={counts.status.blocked} /></span>
              </div>
              <div className="w-px h-4 bg-slate-200" />
              <div className="text-slate-500 font-medium">
                Showing {filteredSubjects.length} result{filteredSubjects.length !== 1 && 's'}
              </div>
            </div>
          </FadeContent>
        )}

        {/* Enterprise Data Table */}
        <FadeContent delay={0.2} className="w-full">
          <Card className="border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 text-xs uppercase tracking-wider">
                  <tr>
                    <th scope="col" className="px-6 py-4 font-semibold w-[20%]">Subject ID</th>
                    <th scope="col" className="px-6 py-4 font-semibold w-[15%]">Site ID</th>
                    <th scope="col" className="px-6 py-4 font-semibold w-[15%]">Status</th>
                    <th scope="col" className="px-6 py-4 font-semibold w-[15%]">SDV Progress</th>
                    <th scope="col" className="px-6 py-4 font-semibold w-[30%]">Primary Blocker</th>
                    <th scope="col" className="px-4 py-4 font-semibold text-right w-[5%]">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="h-64 text-center">
                        <LoadingSpinner size="lg" message="Loading subjects..." />
                      </td>
                    </tr>
                  ) : paginatedSubjects.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-12">
                        <EmptyState
                          icon={Users}
                          title="No subjects found"
                          description={error ? "Data could not be loaded." : "Try adjusting your filters or search query"}
                          action={!error && (searchQuery || filterStatus !== 'all' || filterBlocker !== 'all') ? {
                            label: "Clear All Filters",
                            onClick: () => {
                              setSearchQuery('')
                              setFilterStatus('all')
                              setFilterBlocker('all')
                            }
                          } : undefined}
                        />
                      </td>
                    </tr>
                  ) : (
                    paginatedSubjects.map((subject, index) => (
                      <tr
                        key={subject.subject_id}
                        className="group hover:bg-blue-50/50 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Link
                            to={`/subjects/${subject.subject_id}`}
                            className="font-mono text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-2"
                          >
                            <FileText className="h-3.5 w-3.5 opacity-50" />
                            {subject.subject_id}
                          </Link>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="font-mono text-slate-600 bg-slate-100 px-2 py-1 rounded text-xs">
                            {subject.site_id}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <StatusBadge status={getSubjectStatus(subject)} size="sm" showIcon={true} />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="w-full max-w-[120px]">
                            <ProgressBar
                              percentage={subject.sdv_completion_pct || 0}
                              size="sm"
                              showPercentage={false}
                              animate={false} // Disable per-row animation for performance
                            />
                            <div className="text-[10px] text-slate-500 mt-1 font-medium tabular-nums">
                              {subject.sdv_completion_pct !== null ? `${subject.sdv_completion_pct.toFixed(0)}% Complete` : 'No Data'}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {subject.blocker_count > 0 ? (
                            <div className="flex items-start gap-2">
                              <span className={cn(
                                "flex items-center justify-center h-5 w-5 rounded-full text-[10px] font-bold shrink-0",
                                subject.blocker_count > 3 ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                              )}>
                                {subject.blocker_count}
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-slate-900 truncate" title={subject.primary_blocker}>
                                  {subject.primary_blocker}
                                </p>
                              </div>
                            </div>
                          ) : (
                            <span className="text-sm text-slate-400 italic">None</span>
                          )}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <Link
                            to={`/subjects/${subject.subject_id}`}
                            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-slate-100 hover:text-slate-900 h-9 w-9 text-slate-400 group-hover:text-blue-600"
                          >
                            <ChevronRight className="h-5 w-5" />
                            <span className="sr-only">View</span>
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {!isLoading && filteredSubjects.length > 0 && (
              <div className="flex items-center justify-between px-6 py-4 bg-white border-t border-slate-200">
                <p className="text-sm text-slate-600">
                  Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
                  <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredSubjects.length)}</span> of{' '}
                  <span className="font-medium tabular-nums">{filteredSubjects.length}</span> results
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="shadow-sm"
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="shadow-sm"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </FadeContent>
      </div>

      {/* Filter Sidebar (LineSidebar) */}
      <LineSidebar
        title="Intelligence Filters"
        defaultOpen={true}
        side="right"
        width={300}
        className="pt-16" // Account for sticky nav
      >
        <div className="space-y-8">
          {/* Status Group */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Overall Status</h4>
            <div className="space-y-2">
              <label className="flex items-center justify-between p-2 rounded-md hover:bg-slate-50 cursor-pointer border border-transparent hover:border-slate-200 transition-colors">
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="status"
                    checked={filterStatus === 'all'}
                    onChange={() => setFilterStatus('all')}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-slate-700">All Subjects</span>
                </div>
                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium tabular-nums">
                  {counts.total}
                </span>
              </label>

              <label className="flex items-center justify-between p-2 rounded-md hover:bg-green-50 cursor-pointer border border-transparent hover:border-green-200 transition-colors">
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="status"
                    checked={filterStatus === 'ready'}
                    onChange={() => setFilterStatus('ready')}
                    className="text-green-600 focus:ring-green-500"
                  />
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-green-500" />
                    <span className="text-sm font-medium text-green-800">Ready for Soft-Lock</span>
                  </div>
                </div>
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium tabular-nums">
                  {counts.status.ready}
                </span>
              </label>

              <label className="flex items-center justify-between p-2 rounded-md hover:bg-amber-50 cursor-pointer border border-transparent hover:border-amber-200 transition-colors">
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="status"
                    checked={filterStatus === 'warning'}
                    onChange={() => setFilterStatus('warning')}
                    className="text-amber-600 focus:ring-amber-500"
                  />
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                    <span className="text-sm font-medium text-amber-800">At Risk / Warning</span>
                  </div>
                </div>
                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium tabular-nums">
                  {counts.status.warning}
                </span>
              </label>

              <label className="flex items-center justify-between p-2 rounded-md hover:bg-red-50 cursor-pointer border border-transparent hover:border-red-200 transition-colors">
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="status"
                    checked={filterStatus === 'blocked'}
                    onChange={() => setFilterStatus('blocked')}
                    className="text-red-600 focus:ring-red-500"
                  />
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-red-500" />
                    <span className="text-sm font-medium text-red-800">Blocked</span>
                  </div>
                </div>
                <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium tabular-nums">
                  {counts.status.blocked}
                </span>
              </label>
            </div>
          </div>

          {/* Primary Blocker Group */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Primary Blocker</h4>
            <div className="space-y-2">
              <label className="flex items-center justify-between p-2 rounded-md hover:bg-slate-50 cursor-pointer border border-transparent hover:border-slate-200 transition-colors">
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="blocker"
                    checked={filterBlocker === 'all'}
                    onChange={() => setFilterBlocker('all')}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-slate-700">Any Category</span>
                </div>
              </label>

              <label className="flex items-center justify-between p-2 rounded-md hover:bg-slate-50 cursor-pointer border border-transparent hover:border-slate-200 transition-colors">
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="blocker"
                    checked={filterBlocker === 'sigs'}
                    onChange={() => setFilterBlocker('sigs')}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-slate-700">Missing Signatures</span>
                </div>
                <span className="text-xs text-slate-500 tabular-nums">{counts.blockers.sigs}</span>
              </label>

              <label className="flex items-center justify-between p-2 rounded-md hover:bg-slate-50 cursor-pointer border border-transparent hover:border-slate-200 transition-colors">
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="blocker"
                    checked={filterBlocker === 'queries'}
                    onChange={() => setFilterBlocker('queries')}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-slate-700">Open Queries</span>
                </div>
                <span className="text-xs text-slate-500 tabular-nums">{counts.blockers.queries}</span>
              </label>

              <label className="flex items-center justify-between p-2 rounded-md hover:bg-slate-50 cursor-pointer border border-transparent hover:border-slate-200 transition-colors">
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="blocker"
                    checked={filterBlocker === 'pd'}
                    onChange={() => setFilterBlocker('pd')}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-slate-700">Protocol Deviations</span>
                </div>
                <span className="text-xs text-slate-500 tabular-nums">{counts.blockers.pd}</span>
              </label>

              <label className="flex items-center justify-between p-2 rounded-md hover:bg-slate-50 cursor-pointer border border-transparent hover:border-slate-200 transition-colors">
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="blocker"
                    checked={filterBlocker === 'adj'}
                    onChange={() => setFilterBlocker('adj')}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-slate-700">Adjudications</span>
                </div>
                <span className="text-xs text-slate-500 tabular-nums">{counts.blockers.adj}</span>
              </label>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100">
            <Button
              variant="outline"
              className="w-full text-blue-600 border-blue-200 hover:bg-blue-50"
              onClick={() => {
                setSearchQuery('')
                setFilterStatus('all')
                setFilterBlocker('all')
              }}
              disabled={!searchQuery && filterStatus === 'all' && filterBlocker === 'all'}
            >
              Reset All Filters
            </Button>
          </div>
        </div>
      </LineSidebar>
    </div>
  )
}
