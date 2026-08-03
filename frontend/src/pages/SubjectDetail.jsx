import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle, XCircle, AlertCircle, ChevronLeft, FileText, Download, ShieldAlert, Activity, FileWarning, Search, AlertTriangle, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DotGrid,
  SplitText,
  BlurText,
  Counter,
  MagicBento,
  BentoCard,
  FadeContent,
  AnimatedList,
  AnimatedListItem,
  LoadingSpinner,
  StatusBadge,
  ProgressBar
} from '@/components/bits'
import { cn } from '@/lib/utils'
import { getSubjectDetail } from '@/lib/api'

export function SubjectDetail() {
  const { subjectId } = useParams()
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchSubjectDetail()
  }, [subjectId])

  const fetchSubjectDetail = async () => {
    try {
      setIsLoading(true)
      const res = await getSubjectDetail(subjectId)
      if (!res.exists) {
        setError(`Subject ${subjectId} not found in database.`)
      } else {
        setData(res.subject)
      }
    } catch (err) {
      setError(err.message || 'Endpoint not available')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-200px)] items-center justify-center">
        <LoadingSpinner size="lg" message={`Loading subject ${subjectId}...`} />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" className="gap-2 hover:bg-slate-100" asChild>
          <Link to="/subjects">
            <ChevronLeft className="h-4 w-4" />
            Back to Subjects
          </Link>
        </Button>
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center max-w-2xl mx-auto shadow-sm">
          <AlertCircle className="mx-auto h-8 w-8 text-red-600 mb-2" />
          <h3 className="text-lg font-medium text-red-900">Data unavailable</h3>
          <p className="text-sm text-red-700">{error}</p>
        </div>
      </div>
    )
  }

  const overallStatus = data.ready_to_soft_lock ? 'ready' : (data.blocker_count <= 2 && (!data.primary_blocker || !data.primary_blocker.includes('Critical')) ? 'warning' : 'blocked')

  // Prepare evidence for AnimatedList
  const evidenceItems = []

  if (data.open_adjudications?.length > 0) {
    data.open_adjudications.forEach((adj, idx) => {
      evidenceItems.push({
        id: `adj-${idx}`,
        variant: adj.days_open > 90 ? 'danger' : 'warning',
        icon: <ShieldAlert className={adj.days_open > 90 ? "h-5 w-5 text-red-600" : "h-5 w-5 text-amber-600"} />,
        title: `Adjudication: ${adj.event_type || 'Event'}`,
        description: `Status: ${adj.inquiry_status}`,
        meta: `${adj.days_open} days open`
      })
    })
  }

  if (data.missing_signatures?.length > 0) {
    data.missing_signatures.forEach((sig, idx) => {
      evidenceItems.push({
        id: `sig-${idx}`,
        variant: 'danger',
        icon: <FileWarning className="h-5 w-5 text-red-600" />,
        title: `Missing Signature: ${sig.form}`,
        description: `Required: ${sig.signature_type}`,
        meta: 'Not obtained'
      })
    })
  }

  if (data.open_queries?.length > 0) {
    data.open_queries.forEach((q, idx) => {
      evidenceItems.push({
        id: `q-${idx}`,
        variant: 'warning',
        icon: <AlertCircle className="h-5 w-5 text-amber-600" />,
        title: `Query ${q.query_no}: ${q.status}`,
        description: q.query_text,
        meta: 'Open'
      })
    })
  }

  if (data.unacknowledged_deviation_count > 0) {
    evidenceItems.push({
      id: 'pd-1',
      variant: 'warning',
      icon: <AlertTriangle className="h-5 w-5 text-amber-600" />,
      title: `${data.unacknowledged_deviation_count} Unacknowledged Protocol Deviation(s)`,
      description: 'PI acknowledgment not verified in source data.',
      meta: 'Pending'
    })
  }

  return (
    <div className="space-y-8 pb-12">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" className="gap-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100" asChild>
          <Link to="/subjects">
            <ChevronLeft className="h-4 w-4" />
            Back to Subjects
          </Link>
        </Button>
        <Button variant="outline" size="sm" className="gap-2 bg-white shadow-sm hover:bg-slate-50">
          <Download className="h-4 w-4" />
          Export Report
        </Button>
      </div>

      {/* Hero Section */}
      <DotGrid dotColor="slate" dotSize="sm" spacing="normal" opacity={25} className="rounded-2xl overflow-hidden bg-slate-900 shadow-xl border border-slate-800">
        <div className="p-8 md:p-12 relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-8">
          <div className="space-y-4 flex-1">
            <div className="inline-flex items-center gap-3 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-xs font-medium text-slate-300 mb-2">
              <Search className="h-3.5 w-3.5" />
              Forensic Investigation View
            </div>

            <SplitText
              text={data.subject_id}
              as="h1"
              className="text-4xl md:text-5xl font-mono font-bold text-white tracking-tight block"
              stagger={0.03}
            />

            <div className="flex flex-wrap items-center gap-6 text-sm text-slate-300 pt-2">
              <div className="flex items-center gap-2">
                <span className="text-slate-500">Site ID:</span>
                <span className="font-mono bg-slate-800 px-2 py-0.5 rounded text-slate-200 border border-slate-700">{data.site_id}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-500">Active Blockers:</span>
                <span className="font-bold text-white tabular-nums"><Counter value={data.blocker_count} /></span>
              </div>
            </div>
          </div>

          <div className="shrink-0 flex flex-col items-end gap-4">
            <div className={cn(
              "px-6 py-4 rounded-xl border flex flex-col items-center justify-center min-w-[160px] shadow-lg backdrop-blur-sm",
              overallStatus === 'ready' ? "bg-green-500/10 border-green-500/30 text-green-400" :
              overallStatus === 'warning' ? "bg-amber-500/10 border-amber-500/30 text-amber-400" :
              "bg-red-500/10 border-red-500/30 text-red-400"
            )}>
              {overallStatus === 'ready' ? <ShieldCheck className="h-8 w-8 mb-2" /> :
               overallStatus === 'warning' ? <AlertTriangle className="h-8 w-8 mb-2" /> :
               <ShieldAlert className="h-8 w-8 mb-2" />}
              <span className="text-sm font-bold uppercase tracking-wider">
                {overallStatus === 'ready' ? 'Cleared' :
                 overallStatus === 'warning' ? 'At Risk' : 'Blocked'}
              </span>
            </div>
          </div>
        </div>

        {/* Primary Blocker Hero Banner (Extends out of DotGrid visually) */}
        {!data.ready_to_soft_lock && data.primary_blocker && (
          <div className="bg-red-600 text-white p-6 border-t border-red-700/50">
            <div className="flex items-start gap-4">
              <div className="bg-red-700 p-3 rounded-lg shrink-0 shadow-inner">
                <ShieldAlert className="h-6 w-6 text-red-100" />
              </div>
              <div>
                <p className="text-red-200 text-sm font-semibold uppercase tracking-wider mb-1">Primary Blocker</p>
                <BlurText
                  text={data.primary_blocker}
                  as="h2"
                  className="text-xl md:text-2xl font-bold text-white"
                  delay={0.2}
                  duration={0.8}
                />
              </div>
            </div>
          </div>
        )}
      </DotGrid>

      {/* Readiness Assessment (Magic Bento 2x2) */}
      <FadeContent delay={0.2}>
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Activity className="h-5 w-5 text-slate-500" />
            Readiness Assessment
          </h2>

          <MagicBento cols={2} gap={4}>
            {/* Queries */}
            <BentoCard className={cn(
              "border-l-4 transition-colors",
              data.ready_ae_queries ? "border-l-green-500 hover:border-green-200" : "border-l-amber-500 hover:border-amber-200 bg-amber-50/30"
            )}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-semibold text-slate-900">Queries</h3>
                  <p className="text-xs text-slate-500 font-mono mt-1">Source: EDC_AE Query Report.xlsx</p>
                </div>
                {data.ready_ae_queries ?
                  <CheckCircle className="h-5 w-5 text-green-500" /> :
                  <AlertCircle className="h-5 w-5 text-amber-500" />
                }
              </div>
              <div className="flex items-end gap-3 mt-4">
                <div className={cn("text-3xl font-bold tabular-nums", data.ready_ae_queries ? "text-slate-900" : "text-amber-700")}>
                  <Counter value={data.open_query_count} />
                </div>
                <div className="text-sm font-medium text-slate-600 mb-1">open queries</div>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-100 text-sm">
                <span className={cn("font-medium", data.ready_ae_queries ? "text-green-700" : "text-amber-700")}>
                  {data.ready_ae_queries ? "Outcome: Passed" : "Outcome: Site action required"}
                </span>
              </div>
            </BentoCard>

            {/* Adjudications */}
            <BentoCard className={cn(
              "border-l-4 transition-colors",
              data.ready_adjudication ? "border-l-green-500 hover:border-green-200" : "border-l-red-500 hover:border-red-200 bg-red-50/30"
            )}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-semibold text-slate-900">Adjudications</h3>
                  <p className="text-xs text-slate-500 font-mono mt-1">Source: Adjudication Queries.csv</p>
                </div>
                {data.ready_adjudication ?
                  <CheckCircle className="h-5 w-5 text-green-500" /> :
                  <XCircle className="h-5 w-5 text-red-500" />
                }
              </div>
              <div className="flex items-end gap-3 mt-4">
                <div className={cn("text-3xl font-bold tabular-nums", data.ready_adjudication ? "text-slate-900" : "text-red-700")}>
                  <Counter value={data.open_adjudication_count} />
                </div>
                <div className="text-sm font-medium text-slate-600 mb-1">pending inquiries</div>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-100 text-sm flex justify-between">
                <span className={cn("font-medium", data.ready_adjudication ? "text-green-700" : "text-red-700")}>
                  {data.ready_adjudication ? "Outcome: Passed" : "Outcome: Blocked"}
                </span>
                {!data.ready_adjudication && (
                  <span className="text-red-600 font-medium">{data.max_adjudication_days_open} days oldest</span>
                )}
              </div>
            </BentoCard>

            {/* Signatures */}
            <BentoCard className={cn(
              "border-l-4 transition-colors",
              data.ready_signature ? "border-l-green-500 hover:border-green-200" : "border-l-red-500 hover:border-red-200 bg-red-50/30"
            )}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-semibold text-slate-900">Signatures</h3>
                  <p className="text-xs text-slate-500 font-mono mt-1">Source: Signature List EDC Report.xlsx</p>
                </div>
                {data.ready_signature ?
                  <CheckCircle className="h-5 w-5 text-green-500" /> :
                  <XCircle className="h-5 w-5 text-red-500" />
                }
              </div>
              <div className="flex items-end gap-3 mt-4">
                <div className={cn("text-3xl font-bold tabular-nums", data.ready_signature ? "text-slate-900" : "text-red-700")}>
                  <Counter value={data.missing_signatures_count} />
                </div>
                <div className="text-sm font-medium text-slate-600 mb-1">missing signatures</div>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-100 text-sm">
                <span className={cn("font-medium", data.ready_signature ? "text-green-700" : "text-red-700")}>
                  {data.ready_signature ? "Outcome: Passed" : "Outcome: Blocked"}
                </span>
              </div>
            </BentoCard>

            {/* SDV */}
            <BentoCard className={cn(
              "border-l-4 transition-colors",
              data.ready_sdv ? "border-l-green-500 hover:border-green-200" : "border-l-amber-500 hover:border-amber-200 bg-amber-50/30"
            )}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-semibold text-slate-900">SDV Completion</h3>
                  <p className="text-xs text-slate-500 font-mono mt-1">Source: SDV Key Fields Report.csv</p>
                </div>
                {data.ready_sdv ?
                  <CheckCircle className="h-5 w-5 text-green-500" /> :
                  <AlertCircle className="h-5 w-5 text-amber-500" />
                }
              </div>
              <div className="mt-4">
                <div className="flex items-end justify-between mb-2">
                  <div className={cn("text-3xl font-bold tabular-nums", data.ready_sdv ? "text-slate-900" : "text-amber-700")}>
                    <Counter value={data.sdv_completion_pct !== null ? data.sdv_completion_pct : 100} suffix="%" />
                  </div>
                </div>
                <ProgressBar
                  percentage={data.sdv_completion_pct !== null ? data.sdv_completion_pct : 100}
                  size="sm"
                  showPercentage={false}
                  animate={true}
                  color={data.ready_sdv ? "green" : "yellow"}
                />
              </div>
              <div className="mt-4 pt-4 border-t border-slate-100 text-sm">
                <span className={cn("font-medium", data.ready_sdv ? "text-green-700" : "text-amber-700")}>
                  {data.ready_sdv ? "Outcome: Passed (≥90%)" : "Outcome: Below Threshold"}
                </span>
              </div>
            </BentoCard>
          </MagicBento>
        </div>
      </FadeContent>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column: Detailed Evidence */}
        <div className="lg:col-span-2 space-y-6">
          <FadeContent delay={0.3}>
            <Card className="border-slate-200 shadow-sm h-full flex flex-col">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                <CardTitle className="text-lg flex items-center justify-between">
                  <span>Detailed Evidence Log</span>
                  <span className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full text-xs font-normal">
                    <Counter value={evidenceItems.length} /> records
                  </span>
                </CardTitle>
                <CardDescription>Itemized breakdown of all blocking or warning conditions</CardDescription>
              </CardHeader>
              <CardContent className="p-0 flex-1">
                {evidenceItems.length > 0 ? (
                  <div className="p-4 max-h-[500px] overflow-y-auto">
                    <AnimatedList
                      items={evidenceItems}
                      renderItem={(item) => (
                        <AnimatedListItem variant={item.variant} icon={item.icon} className="shadow-sm mb-3">
                          <div className="flex justify-between items-start gap-4">
                            <div>
                              <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                              <p className="text-sm text-slate-600 mt-1">{item.description}</p>
                            </div>
                            <span className={cn(
                              "text-xs font-mono font-medium px-2 py-1 rounded bg-white/50 whitespace-nowrap shrink-0",
                              item.variant === 'danger' ? "text-red-700 border border-red-100" : "text-amber-700 border border-amber-100"
                            )}>
                              {item.meta}
                            </span>
                          </div>
                        </AnimatedListItem>
                      )}
                      stagger={0.05}
                      direction="up"
                    />
                  </div>
                ) : (
                  <div className="p-12 text-center text-slate-500 flex flex-col items-center">
                    <CheckCircle className="h-12 w-12 text-green-300 mb-4" />
                    <p className="font-medium text-slate-900">No active issues</p>
                    <p className="text-sm mt-1">This subject is clear of all trackable blockers.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </FadeContent>
        </div>

        {/* Right Column: Data Quality & Metadata */}
        <div className="space-y-6">
          <FadeContent delay={0.4}>
            <Card className="border-blue-200 shadow-sm bg-gradient-to-br from-blue-50 to-white">
              <CardHeader className="pb-3 border-b border-blue-100">
                <CardTitle className="text-base text-blue-900 flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4" />
                  Data Quality Limitations
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                {(!data.data_quality_flags || data.data_quality_flags.length === 0) && (
                  <p className="text-sm text-slate-500">No specific data quality flags for this subject.</p>
                )}

                {data.data_quality_flags?.map((flag, idx) => (
                  <div key={idx} className="flex gap-3 text-sm">
                    <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                    <span className="text-slate-700">{flag}</span>
                  </div>
                ))}

                {/* Global limitations that affect interpretation */}
                <div className="pt-4 border-t border-blue-100">
                  <p className="text-xs font-semibold text-blue-800 mb-2 uppercase tracking-wide">System-Wide Constraints</p>
                  <ul className="space-y-2">
                    <li className="flex gap-2 text-xs text-slate-600">
                      <div className="h-1.5 w-1.5 rounded-full bg-slate-400 shrink-0 mt-1" />
                      <span><strong>MM AE Review:</strong> Rule degraded due to 100% missing signature data in source export.</span>
                    </li>
                    <li className="flex gap-2 text-xs text-slate-600">
                      <div className="h-1.5 w-1.5 rounded-full bg-slate-400 shrink-0 mt-1" />
                      <span><strong>Protocol Deviations:</strong> Shows any acknowledgment due to lack of PI role verification capability.</span>
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </FadeContent>
        </div>
      </div>
    </div>
  )
}
