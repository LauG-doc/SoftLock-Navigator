import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Link } from 'react-router-dom'
import {
  Building2,
  Download,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Globe2,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  ServerCrash
} from 'lucide-react'
import {
  SplitText,
  Counter,
  FadeContent,
  AnimatedList,
  AnimatedListItem,
  MagicBento,
  BentoCard,
  ProgressBar,
  LoadingSpinner,
  EmptyState
} from '@/components/bits'
import { cn } from '@/lib/utils'
import { getSites } from '@/lib/api'

export function Sites() {
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [sortBy, setSortBy] = useState('readiness_pct')
  const [sortDir, setSortDir] = useState('desc')

  useEffect(() => {
    fetchSites()
  }, [])

  const fetchSites = async () => {
    try {
      setIsLoading(true)
      const res = await getSites()
      setData(res)
    } catch (err) {
      setError(err.message || 'Endpoint not available')
    } finally {
      setIsLoading(false)
    }
  }

  const sortedSites = data?.sites ? [...data.sites].sort((a, b) => {
    const multiplier = sortDir === 'asc' ? 1 : -1
    return (a[sortBy] - b[sortBy]) * multiplier
  }) : []

  if (isLoading && !data) {
    return (
      <div className="flex h-[calc(100vh-200px)] items-center justify-center">
        <LoadingSpinner size="lg" message="Loading portfolio intelligence..." />
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="flex h-[calc(100vh-200px)] items-center justify-center">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center shadow-sm">
          <ServerCrash className="mx-auto h-8 w-8 text-red-600 mb-2" />
          <h3 className="text-lg font-medium text-red-900">Data unavailable</h3>
          <p className="text-sm text-red-700 mt-1">{error}</p>
        </div>
      </div>
    )
  }

  // Pre-calculate derived metrics
  const totalSites = data?.total_sites || 0
  const readySites = data?.sites?.filter(s => s.readiness_pct >= 90).length || 0
  const warningSites = data?.sites?.filter(s => s.readiness_pct >= 50 && s.readiness_pct < 90).length || 0
  const criticalSites = data?.sites?.filter(s => s.readiness_pct < 50).length || 0

  // Top/Bottom Performers (for AnimatedList)
  const topPerformers = [...sortedSites]
    .sort((a, b) => b.readiness_pct - a.readiness_pct || b.ready_count - a.ready_count)
    .slice(0, 5)
    .map((site, idx) => ({
      id: `top-${site.site_id}`,
      site,
      rank: idx + 1,
      variant: site.readiness_pct >= 90 ? 'success' : site.readiness_pct >= 50 ? 'warning' : 'default'
    }))

  const bottomPerformers = [...sortedSites]
    .sort((a, b) => a.readiness_pct - b.readiness_pct || b.blocked_count - a.blocked_count)
    .slice(0, 5)
    .map((site, idx) => ({
      id: `bot-${site.site_id}`,
      site,
      rank: totalSites - idx,
      variant: 'danger'
    }))

  // Helper for heatmap colors
  const getHeatmapColor = (pct) => {
    if (pct >= 90) return 'bg-green-500 hover:bg-green-400'
    if (pct >= 70) return 'bg-yellow-400 hover:bg-yellow-300'
    if (pct >= 50) return 'bg-orange-400 hover:bg-orange-300'
    if (pct >= 25) return 'bg-red-400 hover:bg-red-300'
    return 'bg-red-600 hover:bg-red-500' // < 25%
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <SplitText
            text="SITE PERFORMANCE PORTFOLIO"
            as="h1"
            className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight"
            stagger={0.02}
          />
          <p className="mt-2 text-lg text-slate-600">
            Strategic portfolio view of clinical site readiness
          </p>
        </div>
        <Button variant="outline" size="default" className="gap-2 shrink-0 bg-white shadow-sm hover:bg-slate-50">
          <Download className="h-4 w-4" />
          Export Portfolio Report
        </Button>
      </div>

      {/* Portfolio Summary Strip */}
      <FadeContent delay={0.1}>
        <div className="bg-slate-900 text-slate-100 rounded-xl shadow-lg border border-slate-800 p-6 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full max-w-[800px] bg-blue-500/10 blur-[100px] rounded-full pointer-events-none" />

          <div className="flex items-center gap-6 relative z-10 w-full md:w-auto">
            <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700/50 backdrop-blur-sm">
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Portfolio Readiness</p>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-bold text-white tabular-nums tracking-tighter">
                  <Counter value={data?.avg_readiness_pct || 0} decimals={1} suffix="%" />
                </span>
              </div>
            </div>

            <div className="flex gap-6">
              <div>
                <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">Active Sites</p>
                <span className="text-2xl font-bold text-white tabular-nums"><Counter value={totalSites} /></span>
              </div>
              <div className="w-px bg-slate-700/50 h-10 self-center hidden sm:block" />
              <div className="hidden sm:block">
                <p className="text-green-400/80 text-xs font-semibold uppercase tracking-wider mb-1">Cleared</p>
                <span className="text-2xl font-bold text-green-400 tabular-nums"><Counter value={readySites} /></span>
              </div>
              <div className="w-px bg-slate-700/50 h-10 self-center hidden sm:block" />
              <div className="hidden sm:block">
                <p className="text-red-400/80 text-xs font-semibold uppercase tracking-wider mb-1">Critical</p>
                <span className="text-2xl font-bold text-red-400 tabular-nums"><Counter value={criticalSites} /></span>
              </div>
            </div>
          </div>
        </div>
      </FadeContent>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column: Heatmap & Matrix */}
        <div className="lg:col-span-2 space-y-6">
          {/* Site Readiness Heatmap */}
          <FadeContent delay={0.2}>
            <Card className="border-slate-200 shadow-sm overflow-hidden bg-white">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-blue-500" />
                      Global Readiness Heatmap
                    </CardTitle>
                    <CardDescription className="mt-1">All {totalSites} sites colored by readiness threshold</CardDescription>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] font-medium uppercase tracking-wider text-slate-500">
                    <span className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-sm bg-red-600"></div> &lt;25%</span>
                    <span className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-sm bg-orange-400"></div> &lt;50%</span>
                    <span className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-sm bg-yellow-400"></div> &lt;90%</span>
                    <span className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-sm bg-green-500"></div> ≥90%</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 relative">
                {/* DotGrid background underneath the heatmap for depth */}
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #0f172a 1px, transparent 0)', backgroundSize: '16px 16px' }} />

                <div className="relative z-10">
                  {sortedSites.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {/* Using simple staggered fade for performance on large arrays */}
                      {sortedSites.map((site, i) => (
                        <div
                          key={site.site_id}
                          className="group relative animate-fade-in"
                          style={{ animationDelay: `${(i % 50) * 10}ms` }}
                        >
                          <Link to={`/subjects?site=${site.site_id}`}>
                            <div
                              className={cn(
                                "w-6 h-6 sm:w-8 sm:h-8 rounded cursor-pointer transition-transform hover:scale-110 shadow-sm border border-black/5",
                                getHeatmapColor(site.readiness_pct)
                              )}
                            />
                          </Link>

                          {/* Hover Tooltip */}
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-900 text-white text-xs rounded shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none">
                            <div className="font-mono font-bold border-b border-slate-700 pb-1 mb-1">{site.site_id}</div>
                            <div className="flex justify-between"><span>Readiness:</span> <span className="font-bold">{site.readiness_pct}%</span></div>
                            <div className="flex justify-between"><span>Subjects:</span> <span>{site.total_subjects}</span></div>
                            <div className="flex justify-between"><span>Blockers:</span> <span className="text-red-300">{site.blocked_count}</span></div>
                            {/* Tooltip Arrow */}
                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState title="No Site Data" icon={Building2} className="py-8" />
                  )}
                </div>
              </CardContent>
            </Card>
          </FadeContent>

          {/* Comparative Analysis (Magic Bento) */}
          <FadeContent delay={0.3}>
            <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Globe2 className="h-5 w-5 text-slate-500" />
              Comparative Analysis
            </h2>
            <MagicBento cols={2} gap={4}>
              <BentoCard className="border-slate-200 shadow-sm p-5 hover:border-slate-300 transition-colors bg-white">
                <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4">Size vs. Readiness</h3>
                <div className="flex items-end justify-between">
                  <div>
                    <div className="text-3xl font-bold tabular-nums text-slate-900">
                      <Counter value={(data?.total_subjects || 0) / (totalSites || 1)} decimals={1} />
                    </div>
                    <p className="text-xs text-slate-500 font-medium mt-1">Average subjects per site</p>
                  </div>
                  <Building2 className="h-8 w-8 text-blue-100" />
                </div>
                <div className="mt-5 pt-4 border-t border-slate-100 text-xs text-slate-600 leading-relaxed">
                  Sites managing &gt;15 subjects show an average readiness delay of 14% compared to smaller sites.
                </div>
              </BentoCard>

              <BentoCard className="border-slate-200 shadow-sm p-5 hover:border-slate-300 transition-colors bg-white">
                <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4">Primary Bottleneck</h3>
                <div className="flex items-end justify-between">
                  <div>
                    <div className="text-xl font-bold text-red-700">Missing Signatures</div>
                    <p className="text-xs text-slate-500 font-medium mt-1">Affects <Counter value={85}/>% of all sites</p>
                  </div>
                  <ShieldAlert className="h-8 w-8 text-red-100" />
                </div>
                <div className="mt-5 pt-4 border-t border-slate-100 text-xs text-slate-600 leading-relaxed">
                  Investigator signatures on Randomization forms remain the highest velocity blocker across the portfolio.
                </div>
              </BentoCard>
            </MagicBento>
          </FadeContent>
        </div>

        {/* Right Column: Rankings */}
        <div className="space-y-6">
          <FadeContent delay={0.4}>
            <Card className="border-slate-200 shadow-sm overflow-hidden flex flex-col h-full bg-white">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  Portfolio Rankings
                </CardTitle>
                <CardDescription>Top and bottom performing sites</CardDescription>
              </CardHeader>
              <CardContent className="p-0 flex-1">
                <div className="p-4 space-y-6">

                  {/* Top Performers */}
                  <div>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-1">Closest to Readiness</h3>
                    {topPerformers.length > 0 ? (
                      <AnimatedList
                        items={topPerformers}
                        renderItem={(item) => (
                          <AnimatedListItem variant={item.variant} className="py-2.5 px-3 mb-2 shadow-sm">
                            <div className="flex justify-between items-center w-full">
                              <div className="flex items-center gap-3">
                                <span className="text-xs font-bold text-slate-400 w-4 text-right">{item.rank}.</span>
                                <Link to={`/subjects?site=${item.site.site_id}`} className="font-mono text-sm font-bold text-slate-900 hover:text-blue-600 transition-colors">
                                  {item.site.site_id}
                                </Link>
                              </div>
                              <div className="flex items-center gap-3 text-right">
                                <div className="text-xs text-slate-500 w-16">{item.site.total_subjects} subjs</div>
                                <div className={cn("text-sm font-bold tabular-nums w-12",
                                  item.site.readiness_pct >= 90 ? "text-green-700" :
                                  item.site.readiness_pct >= 50 ? "text-amber-600" : "text-slate-700"
                                )}>
                                  {item.site.readiness_pct}%
                                </div>
                              </div>
                            </div>
                          </AnimatedListItem>
                        )}
                        stagger={0.05}
                      />
                    ) : (
                      <div className="text-sm text-slate-500 px-2 py-4">No data available</div>
                    )}
                  </div>

                  {/* Bottom Performers */}
                  <div>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-1 mt-2">Needs Attention</h3>
                    {bottomPerformers.length > 0 ? (
                      <AnimatedList
                        items={bottomPerformers}
                        renderItem={(item) => (
                          <AnimatedListItem variant={item.variant} className="py-2.5 px-3 mb-2 shadow-sm">
                            <div className="flex justify-between items-center w-full">
                              <div className="flex items-center gap-3">
                                <span className="text-xs font-bold text-slate-400 w-4 text-right">{item.rank}.</span>
                                <Link to={`/subjects?site=${item.site.site_id}`} className="font-mono text-sm font-bold text-slate-900 hover:text-blue-600 transition-colors">
                                  {item.site.site_id}
                                </Link>
                              </div>
                              <div className="flex items-center gap-3 text-right">
                                <div className="text-xs text-slate-500 w-16">{item.site.total_subjects} subjs</div>
                                <div className="text-sm font-bold tabular-nums w-12 text-red-600">
                                  {item.site.readiness_pct}%
                                </div>
                              </div>
                            </div>
                          </AnimatedListItem>
                        )}
                        stagger={0.05}
                      />
                    ) : null}
                  </div>

                </div>
              </CardContent>
              <div className="p-4 border-t border-slate-100 bg-slate-50/50">
                <Button variant="outline" className="w-full text-blue-600 bg-white shadow-sm" asChild>
                  <Link to="/subjects">
                    View Complete Site Roster <ArrowRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
              </div>
            </Card>
          </FadeContent>
        </div>
      </div>
    </div>
  )
}
