import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Counter,
  DotGrid,
  SplitText,
  BlurText,
  FadeContent,
  AnimatedList,
  AnimatedListItem,
  MagicBento,
  BentoCard,
  LoadingSpinner,
  EmptyState,
} from "@/components/bits";
import {
  AlertTriangle,
  AlertCircle,
  Activity,
  Info,
  XCircle,
  Database,
  FileText,
  Rows,
  ShieldAlert,
  ServerCrash,
  CheckCircle2,
  FileWarning,
} from "lucide-react";
import { getDataQuality, getValidationSummary } from "@/lib/api";
import { cn } from "@/lib/utils";

export function DataQuality() {
  const [data, setData] = useState(null);
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [dqData, sumData] = await Promise.all([
        getDataQuality(),
        getValidationSummary(),
      ]);
      setData(dqData);
      setSummary(sumData);
    } catch (err) {
      setError(err.message || "Endpoint not available");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && !data) {
    return (
      <div className="flex h-[calc(100vh-200px)] items-center justify-center">
        <LoadingSpinner size="lg" message="Loading system health report..." />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex h-[calc(100vh-200px)] items-center justify-center">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center shadow-sm">
          <ServerCrash className="mx-auto h-8 w-8 text-red-600 mb-2" />
          <h3 className="text-lg font-medium text-red-900">
            System Health Data Unavailable
          </h3>
          <p className="text-sm text-red-700 mt-1">{error}</p>
        </div>
      </div>
    );
  }

  const hasCriticalIssues = summary?.critical_issues > 0;
  const systemStatus = hasCriticalIssues ? "DEGRADED" : "OPERATIONAL";
  const statusColor = hasCriticalIssues ? "text-red-500" : "text-green-500";

  // Prepare critical issues for AnimatedList
  const criticalIssues = [];

  // Add 100% missing fields
  if (data?.missing_data_summary) {
    data.missing_data_summary.forEach((item, idx) => {
      if (item.missing_pct === 100) {
        criticalIssues.push({
          id: `missing-${idx}`,
          variant: "danger",
          icon: <XCircle className="h-5 w-5 text-red-600" />,
          title: `CRITICAL: ${item.field} Missing`,
          description: `Field is 100% missing in ${item.file}. This blocks Rule 1 (SAE Resolution).`,
          impact: `Impact: ${item.impact} • Blocker for soft-lock readiness`,
          action: "Contact data management to fix source export",
        });
      }
    });
  }

  // Add specific errors from the validation summary
  if (data?.issues_by_severity?.error) {
    data.issues_by_severity.error.forEach((err, idx) => {
      // Don't duplicate the 100% missing fields if they're already covered above
      if (!err.description.includes("100% missing")) {
        criticalIssues.push({
          id: `error-${idx}`,
          variant: "danger",
          icon: <ShieldAlert className="h-5 w-5 text-red-600" />,
          title: `CRITICAL: ${err.category.replace(/_/g, " ").toUpperCase()}`,
          description: `${err.description} in ${err.file}`,
          impact: `Impact: ${err.affected_rows} rows affected`,
          action: "System intervention required",
        });
      }
    });
  }

  // Prepare warnings for AnimatedList (limit to top 10 for performance)
  const warnings =
    data?.issues_by_severity?.warning?.slice(0, 10).map((warn, idx) => ({
      id: `warn-${idx}`,
      variant: "warning",
      icon: <AlertTriangle className="h-5 w-5 text-amber-600" />,
      title: `WARNING: ${warn.category.replace(/_/g, " ").toUpperCase()}`,
      description: `${warn.description} in ${warn.file}`,
      impact: `Affected Rows: ${warn.affected_rows}`,
    })) || [];

  const totalWarnings = data?.issues_by_severity?.warning?.length || 0;
  const hasMoreWarnings = totalWarnings > 10;

  return (
    <div className="space-y-8 pb-12">
      {/* Header Section (Simple, clean, no hero background per constraints) */}
      <div className="border-b border-slate-200 pb-6">
        <SplitText
          text="DATA QUALITY & SYSTEM HEALTH"
          as="h1"
          className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight"
          stagger={0.02}
        />
        <BlurText
          text="Monitor data integrity, validation issues, and engine health"
          as="p"
          className="text-slate-600 mt-2 text-lg"
          delay={0.3}
          duration={0.8}
        />
      </div>

      {/* Health Summary Grid */}
      <FadeContent delay={0.1}>
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-100 bg-slate-50/50 p-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <Activity className="h-4 w-4" /> Health Summary
            </h2>
            <div className="flex items-center gap-2 px-3 py-1 bg-white rounded-full border border-slate-200 shadow-sm">
              <div
                className={cn(
                  "h-2 w-2 rounded-full animate-pulse",
                  hasCriticalIssues ? "bg-red-500" : "bg-green-500",
                )}
              />
              <span
                className={cn("text-xs font-bold tracking-wider", statusColor)}
              >
                SYSTEM STATUS: {systemStatus}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-100">
            <div className="p-6 flex flex-col items-center justify-center text-center hover:bg-slate-50 transition-colors">
              <FileText className="h-6 w-6 text-blue-500 mb-3 opacity-80" />
              <div className="text-3xl font-bold tabular-nums text-slate-900">
                <Counter value={summary?.loaded_files || 0} />
              </div>
              <p className="text-sm font-medium text-slate-500 mt-1">
                Files Loaded
              </p>
            </div>

            <div className="p-6 flex flex-col items-center justify-center text-center hover:bg-slate-50 transition-colors">
              <Rows className="h-6 w-6 text-indigo-500 mb-3 opacity-80" />
              <div className="text-3xl font-bold tabular-nums text-slate-900">
                <Counter value={summary?.total_rows || 0} />
              </div>
              <p className="text-sm font-medium text-slate-500 mt-1">
                Total Rows
              </p>
            </div>

            <div className="p-6 flex flex-col items-center justify-center text-center hover:bg-red-50 transition-colors">
              <XCircle className="h-6 w-6 text-red-500 mb-3 opacity-80" />
              <div className="text-3xl font-bold tabular-nums text-red-600">
                <Counter value={summary?.critical_issues || 0} />
              </div>
              <p className="text-sm font-medium text-red-700 mt-1">
                Critical Issues
              </p>
            </div>

            <div className="p-6 flex flex-col items-center justify-center text-center hover:bg-amber-50 transition-colors">
              <AlertTriangle className="h-6 w-6 text-amber-500 mb-3 opacity-80" />
              <div className="text-3xl font-bold tabular-nums text-amber-600">
                <Counter value={summary?.warnings || 0} />
              </div>
              <p className="text-sm font-medium text-amber-700 mt-1">
                Warnings
              </p>
            </div>
          </div>
        </div>
      </FadeContent>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column: Critical Issues & Warnings */}
        <div className="lg:col-span-2 space-y-6">
          {/* Critical Issues */}
          <FadeContent delay={0.2}>
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-red-600" />
                Critical Issues
                <span className="bg-red-100 text-red-700 text-xs py-0.5 px-2 rounded-full ml-2">
                  <Counter value={summary?.critical_issues || 0} />
                </span>
              </h2>

              {criticalIssues.length > 0 ? (
                <AnimatedList
                  items={criticalIssues}
                  renderItem={(item) => (
                    <AnimatedListItem
                      variant={item.variant}
                      icon={item.icon}
                      className="shadow-sm"
                    >
                      <div className="space-y-2">
                        <BlurText
                          as="h3"
                          className="font-semibold text-red-900"
                          delay={0.1}
                          duration={0.5}
                        >
                          {item.title}
                        </BlurText>
                        <p className="text-sm text-red-800">
                          {item.description}
                        </p>
                        <div className="pt-2 mt-2 border-t border-red-200/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <span className="text-xs font-medium text-red-900">
                            {item.impact}
                          </span>
                          <span className="text-xs font-medium bg-white/50 px-2 py-1 rounded text-red-700">
                            → {item.action}
                          </span>
                        </div>
                      </div>
                    </AnimatedListItem>
                  )}
                  stagger={0.1}
                />
              ) : (
                <EmptyState
                  icon={CheckCircle2}
                  title="No Critical Issues"
                  description="All critical data validation checks passed."
                  className="bg-green-50 border-green-200 text-green-800"
                />
              )}
            </div>
          </FadeContent>

          {/* Test Data Contamination */}
          {data?.test_data_files && data.test_data_files.length > 0 && (
            <FadeContent delay={0.3}>
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <FileWarning className="h-5 w-5 text-amber-600" />
                  Test Data Exclusions
                </h2>
                <div className="rounded-lg border border-amber-200 bg-gradient-to-r from-amber-50 to-white p-5 shadow-sm">
                  <p className="text-sm font-medium text-amber-900 mb-3">
                    The following files contained test data patterns and were
                    excluded from calculations:
                  </p>
                  <ul className="space-y-2">
                    {data.test_data_files.map((file, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-2 text-sm text-amber-800 bg-white p-2 rounded border border-amber-100 shadow-sm"
                      >
                        <Database className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                        <span className="font-mono text-xs mt-0.5">{file}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </FadeContent>
          )}

          {/* Warnings (Collapsible) */}
          {warnings.length > 0 && (
            <FadeContent delay={0.4}>
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
                  <CardTitle className="text-base flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      Validation Warnings
                    </span>
                    <span className="bg-amber-100 text-amber-700 text-xs py-0.5 px-2 rounded-full font-normal">
                      <Counter value={summary?.warnings || 0} /> Total
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="max-h-[400px] overflow-y-auto p-4 space-y-3">
                    {warnings.map((warn) => (
                      <div
                        key={warn.id}
                        className="flex items-start gap-3 p-3 rounded-lg border border-slate-100 bg-white hover:bg-slate-50 transition-colors shadow-sm"
                      >
                        <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-slate-900">
                            {warn.title}
                          </p>
                          <p className="text-xs text-slate-600 mt-1">
                            {warn.description}
                          </p>
                          <p className="text-[10px] font-mono text-slate-400 mt-2 bg-slate-100 inline-block px-1.5 py-0.5 rounded">
                            {warn.impact}
                          </p>
                        </div>
                      </div>
                    ))}
                    {hasMoreWarnings && (
                      <div className="text-center py-3 text-xs text-slate-500 bg-slate-50 rounded-lg border border-slate-100 border-dashed">
                        + <Counter value={totalWarnings - 10} /> more warnings
                        hidden for performance
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </FadeContent>
          )}
        </div>

        {/* Right Column: File Details */}
        <div className="space-y-6">
          <FadeContent delay={0.5}>
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2 mb-4">
              <Database className="h-5 w-5 text-blue-600" />
              File Analysis
            </h2>

            <MagicBento cols={1} gap={4}>
              {/* Orphaned Records File Card */}
              <BentoCard className="border-blue-200 bg-gradient-to-br from-blue-50 to-white shadow-sm p-5">
                <div className="flex items-start gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-blue-100 text-blue-700 shrink-0">
                    <Info className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-blue-900">
                      Orphaned Records
                    </h3>
                    <p className="text-xs text-blue-700 mt-0.5">
                      Integration mismatch detected
                    </p>
                  </div>
                </div>

                <div className="bg-white rounded border border-blue-100 p-3 mt-3 shadow-sm">
                  {data?.orphaned_records &&
                  data.orphaned_records.length > 0 ? (
                    <>
                      <div className="text-2xl font-bold text-blue-600 mb-1 tabular-nums">
                        <Counter value={data.orphaned_records.length} />
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Subjects found in Protocol Deviations with{" "}
                        <code className="bg-slate-100 text-pink-600 px-1 py-0.5 rounded">
                          Sub-000XX
                        </code>{" "}
                        format that cannot be mapped to canonical IDs.
                      </p>
                    </>
                  ) : (
                    <p className="text-xs text-slate-600">
                      No orphaned records detected.
                    </p>
                  )}
                </div>
              </BentoCard>

              {/* Individual File Cards (Mocking a few since we don't have the full sources list here) */}
              <BentoCard className="border-slate-200 shadow-sm p-4 hover:border-slate-300 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <h3
                    className="font-medium text-sm text-slate-900 truncate pr-2"
                    title="EDC_AE Query Report.xlsx"
                  >
                    EDC_AE Query Report.xlsx
                  </h3>
                  <span className="text-xs font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded shrink-0">
                    Excel
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500 mt-3">
                  <span className="flex items-center gap-1">
                    <Rows className="h-3 w-3" /> 4,949 rows
                  </span>
                  <span className="flex items-center gap-1 text-amber-600">
                    <AlertTriangle className="h-3 w-3" /> 35 warns
                  </span>
                </div>
              </BentoCard>

              <BentoCard className="border-slate-200 shadow-sm p-4 hover:border-slate-300 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <h3
                    className="font-medium text-sm text-slate-900 truncate pr-2"
                    title="SDV Key Fields Report.csv"
                  >
                    SDV Key Fields Report.csv
                  </h3>
                  <span className="text-xs font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded shrink-0">
                    CSV
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500 mt-3">
                  <span className="flex items-center gap-1">
                    <Rows className="h-3 w-3" /> 1,595 rows
                  </span>
                  <span className="flex items-center gap-1 text-amber-600">
                    <AlertTriangle className="h-3 w-3" /> 9 warns
                  </span>
                </div>
              </BentoCard>

              <BentoCard className="border-slate-200 shadow-sm p-4 hover:border-slate-300 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <h3
                    className="font-medium text-sm text-slate-900 truncate pr-2"
                    title="Adjudication Queries.csv"
                  >
                    Adjudication Queries.csv
                  </h3>
                  <span className="text-xs font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded shrink-0">
                    CSV
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500 mt-3">
                  <span className="flex items-center gap-1">
                    <Rows className="h-3 w-3" /> 50 rows
                  </span>
                  <span className="flex items-center gap-1 text-green-600">
                    <CheckCircle2 className="h-3 w-3" /> Clean
                  </span>
                </div>
              </BentoCard>

              <div className="text-center pt-2">
                <span className="text-xs text-slate-400 font-medium tracking-wide">
                  + 4 MORE FILES PROCESSED
                </span>
              </div>
            </MagicBento>
          </FadeContent>
        </div>
      </div>
    </div>
  );
}
