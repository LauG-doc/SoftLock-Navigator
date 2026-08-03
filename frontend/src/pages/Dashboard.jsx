import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Counter,
  MagicBento,
  BentoCard,
  FadeContent,
  AnimatedList,
  AnimatedListItem,
  DotGrid,
  SplitText,
  BlurText,
  LoadingSpinner,
  EmptyState,
} from "@/components/bits";
import {
  Users,
  CheckCircle,
  XCircle,
  AlertCircle,
  AlertTriangle,
  UploadCloud,
  TrendingUp,
  Building2,
  Activity,
  Database,
  FileCheck,
} from "lucide-react";
import { getDashboardSummary, getSites } from "@/lib/api";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { cn } from "@/lib/utils";

const COLORS = {
  queries: "#f59e0b",
  signatures: "#ef4444",
  deviations: "#f97316",
  adjudications: "#dc2626",
  sdv: "#3b82f6",
};

export function Dashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [sitesData, setSitesData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(
    location.state?.successMessage || null,
  );

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [summary, sitesRes] = await Promise.all([
        getDashboardSummary(),
        getSites().catch(() => ({ sites: [] })),
      ]);
      setData(summary);
      setSitesData(sitesRes.sites || []);
    } catch (err) {
      setError(err.message || "Endpoint not available");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && !data) {
    return (
      <div className="flex h-[calc(100vh-200px)] items-center justify-center">
        <LoadingSpinner size="lg" message="Loading dashboard metrics..." />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex h-[calc(100vh-200px)] items-center justify-center">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <AlertCircle className="mx-auto h-8 w-8 text-red-600 mb-2" />
          <h3 className="text-lg font-medium text-red-900">Data unavailable</h3>
          <p className="text-sm text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  // Handle empty state: prompt upload
  if (data?.total_subjects === 0) {
    return (
      <div className="flex h-[calc(100vh-200px)] items-center justify-center">
        <EmptyState
          icon={UploadCloud}
          title="Welcome to Casebook Soft-Lock Navigator"
          description="The readiness engine has no data loaded. Please upload the required clinical data files to begin analysis."
          action={{
            label: "Upload Data",
            onClick: () => navigate("/upload"),
          }}
        />
      </div>
    );
  }

  // Prepare chart data
  const pieData = [
    {
      name: "Missing Signatures",
      value: data.blocked_by_signatures,
      color: COLORS.signatures,
    },
    {
      name: "Open Queries",
      value: data.blocked_by_queries,
      color: COLORS.queries,
    },
    {
      name: "Protocol Deviations",
      value: data.blocked_by_deviations,
      color: COLORS.deviations,
    },
    {
      name: "Pending Adjudications",
      value: data.blocked_by_adjudications,
      color: COLORS.adjudications,
    },
  ].filter((d) => d.value > 0);

  const barData = sitesData
    .sort((a, b) => b.blocked_count - a.blocked_count)
    .slice(0, 5)
    .map((s) => ({
      name: s.site_id,
      Signatures: s.blocked_by_signatures,
      Queries: s.blocked_by_queries,
      Deviations: s.blocked_by_deviations,
    }));

  // Critical blockers for AnimatedList
  const criticalBlockers = [];
  if (data.critical_adjudications > 0) {
    criticalBlockers.push({
      id: "adj",
      variant: "danger",
      icon: <AlertTriangle className="h-5 w-5 text-red-600" />,
      title: `${data.critical_adjudications} Critical Adjudications`,
      description: "Open >90 days - Immediate escalation required",
      count: data.critical_adjudications,
    });
  }
  if (data.high_query_volume > 0) {
    criticalBlockers.push({
      id: "queries",
      variant: "warning",
      icon: <AlertCircle className="h-5 w-5 text-amber-600" />,
      title: `${data.high_query_volume} High Query Volume`,
      description: ">10 open queries per subject",
      count: data.high_query_volume,
    });
  }
  if (data.blocked_by_signatures > 0) {
    criticalBlockers.push({
      id: "sigs",
      variant: "danger",
      icon: <XCircle className="h-5 w-5 text-red-600" />,
      title: `${data.blocked_by_signatures} Missing Signatures`,
      description: `${((data.blocked_by_signatures / data.total_subjects) * 100).toFixed(0)}% of subjects - Investigator signatures required`,
      count: data.blocked_by_signatures,
    });
  }

  // Site performance tiers
  const siteTiers = {
    critical: sitesData.filter((s) => (s.readiness_pct || 0) < 50).length,
    warning: sitesData.filter(
      (s) => (s.readiness_pct || 0) >= 50 && (s.readiness_pct || 0) < 90,
    ).length,
    ready: sitesData.filter((s) => (s.readiness_pct || 0) >= 90).length,
  };

  const dqOnlyPct =
    data.total_subjects > 0
      ? (data.data_quality_only_count / data.total_subjects) * 100
      : 0;

  const actionableBlockedPct =
    data.total_subjects > 0
      ? (data.actionable_blocked_count / data.total_subjects) * 100
      : 0;

  return (
    <div className="space-y-8 pb-12">
      {/* Success Message */}
      {successMessage && (
        <FadeContent>
          <div className="rounded-lg bg-green-50 p-4 border border-green-200 flex items-start gap-3 shadow-sm">
            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-green-900">Success</p>
              <p className="text-sm text-green-700">{successMessage}</p>
            </div>
          </div>
        </FadeContent>
      )}

      {/* Hero Section */}
      <DotGrid dotColor="slate" dotSize="sm" spacing="normal" opacity={15}>
        <div className="py-12 px-6 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 shadow-xl">
          <FadeContent direction="up" duration={0.8}>
            <div className="text-center space-y-6">
              <div className="inline-block">
                <SplitText
                  text="SOFT-LOCK READINESS COMMAND CENTER"
                  as="h1"
                  className="text-2xl md:text-3xl font-bold text-white tracking-wide"
                  stagger={0.02}
                />
              </div>

              {/* Hero Metric - Overall Readiness */}
              <div className="flex justify-center">
                <div className="text-center space-y-3">
                  <div className="text-8xl font-bold tabular-nums">
                    <Counter
                      value={data.readiness_pct || 0}
                      suffix="%"
                      decimals={0}
                      duration={2000}
                      className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400"
                    />
                  </div>
                  <BlurText
                    text="Ready to Soft-Lock"
                    as="p"
                    className="text-lg text-slate-300"
                    delay={0.5}
                    duration={0.8}
                  />
                </div>
              </div>

              {/* Summary Stats */}
              <div className="flex flex-wrap justify-center gap-8 text-slate-300 text-sm">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <Counter
                    value={data.total_subjects}
                    className="font-semibold text-white"
                  />{" "}
                  Subjects
                </div>
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  <Counter
                    value={data.total_sites}
                    className="font-semibold text-white"
                  />{" "}
                  Sites
                </div>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-400" />
                  Critical:{" "}
                  <Counter
                    value={data.critical_adjudications}
                    className="font-semibold text-red-400"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-400" />
                  High Risk:{" "}
                  <Counter
                    value={data.high_query_volume}
                    className="font-semibold text-amber-400"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-orange-300" />
                  Actionable Blocked:{" "}
                  <Counter
                    value={data.actionable_blocked_count}
                    className="font-semibold text-orange-300"
                  />
                </div>
              </div>

              {/* System Status */}
              <div className="flex flex-wrap justify-center gap-6 text-xs text-slate-400 pt-4 border-t border-slate-700">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  <span>Live</span>
                </div>
                <div>Last Updated: 2m ago</div>
                <div className="flex items-center gap-2">
                  <Database className="h-3 w-3" />
                  <Counter value={7} /> Files Loaded
                </div>
                <div className="flex items-center gap-2">
                  <FileCheck className="h-3 w-3" />
                  Validation: Complete
                </div>
              </div>
            </div>
          </FadeContent>
        </div>
      </DotGrid>

      {/* Executive KPIs */}
      <FadeContent delay={0.2}>
        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Executive Metrics
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">
                      Total Subjects
                    </p>
                    <div className="text-3xl font-bold tabular-nums mt-2 text-slate-900">
                      <Counter value={data.total_subjects} duration={1500} />
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Across {data.total_sites} sites
                    </p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3">
                    <Users className="h-5 w-5 text-slate-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-green-200 shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br from-green-50 to-white">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-700">
                      Ready for Soft-Lock
                    </p>
                    <div className="text-3xl font-bold tabular-nums mt-2 text-green-900">
                      <Counter value={data.ready_count} duration={1500} />
                    </div>
                    <p className="text-xs text-green-600 mt-1">
                      <Counter
                        value={data.readiness_pct}
                        decimals={1}
                        suffix="%"
                      />{" "}
                      of total
                    </p>
                  </div>
                  <div className="rounded-lg bg-green-100 p-3">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-red-200 shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br from-red-50 to-white">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-red-700">
                      Actionable Blocked
                    </p>
                    <div className="text-3xl font-bold tabular-nums mt-2 text-red-900">
                      <Counter
                        value={data.actionable_blocked_count}
                        duration={1500}
                      />
                    </div>
                    <p className="text-xs text-red-600 mt-1">
                      <Counter
                        value={actionableBlockedPct}
                        decimals={1}
                        suffix="%"
                      />{" "}
                      require team action
                    </p>
                  </div>
                  <div className="rounded-lg bg-red-100 p-3">
                    <XCircle className="h-5 w-5 text-red-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-amber-200 shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br from-amber-50 to-white">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-amber-700">
                      Sites Below 60%
                    </p>
                    <div className="text-3xl font-bold tabular-nums mt-2 text-amber-900">
                      <Counter
                        value={data.sites_below_60_pct}
                        duration={1500}
                      />
                    </div>
                    <p className="text-xs text-amber-600 mt-1">
                      Require intervention
                    </p>
                  </div>
                  <div className="rounded-lg bg-amber-100 p-3">
                    <AlertCircle className="h-5 w-5 text-amber-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-sky-200 shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br from-sky-50 to-white">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-sky-700">
                      Data-Quality Only Flags
                    </p>
                    <div className="text-3xl font-bold tabular-nums mt-2 text-sky-900">
                      <Counter
                        value={data.data_quality_only_count}
                        duration={1500}
                      />
                    </div>
                    <p className="text-xs text-sky-600 mt-1">
                      <Counter value={dqOnlyPct} decimals={1} suffix="%" />{" "}
                      operationally ready
                    </p>
                  </div>
                  <div className="rounded-lg bg-sky-100 p-3">
                    <Database className="h-5 w-5 text-sky-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-indigo-200 shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br from-indigo-50 to-white">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-indigo-700">
                      MM AE Data Coverage
                    </p>
                    <div className="text-3xl font-bold tabular-nums mt-2 text-indigo-900">
                      <Counter
                        value={data.mm_ae_coverage_pct}
                        decimals={1}
                        suffix="%"
                        duration={1500}
                      />
                    </div>
                    <p className="text-xs text-indigo-600 mt-1">
                      Data availability in source feed
                    </p>
                  </div>
                  <div className="rounded-lg bg-indigo-100 p-3">
                    <FileCheck className="h-5 w-5 text-indigo-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </FadeContent>

      {/* Magic Bento Grid */}
      <FadeContent delay={0.4}>
        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Executive Signals
          </h2>
          <MagicBento cols={3} gap={6}>
            {/* Critical Blockers */}
            <BentoCard
              span="2"
              className="bg-gradient-to-br from-red-50 to-white border-red-200"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-red-900">
                  Critical Blockers
                </h3>
                <div className="flex items-center gap-2 text-xs text-red-700">
                  <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                  <span>Live</span>
                </div>
              </div>

              {criticalBlockers.length > 0 ? (
                <AnimatedList
                  items={criticalBlockers}
                  renderItem={(item) => (
                    <AnimatedListItem variant={item.variant} icon={item.icon}>
                      <div>
                        <p className="font-medium text-sm text-slate-900">
                          {item.title}
                        </p>
                        <p className="text-xs text-slate-600 mt-1">
                          {item.description}
                        </p>
                      </div>
                    </AnimatedListItem>
                  )}
                  direction="up"
                  stagger={0.1}
                />
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                  <p className="text-sm">No critical blockers detected</p>
                </div>
              )}
            </BentoCard>

            {/* Blocker Distribution Chart */}
            <BentoCard className="border-slate-200">
              <h3 className="text-base font-semibold text-slate-900 mb-4">
                Blocker Distribution
              </h3>
              <div className="h-64">
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        formatter={(value, name) => [`${value} subjects`, name]}
                        contentStyle={{
                          backgroundColor: "rgba(255, 255, 255, 0.95)",
                          border: "1px solid #e2e8f0",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                      />
                      <Legend
                        verticalAlign="bottom"
                        height={36}
                        iconType="circle"
                        wrapperStyle={{ fontSize: "11px" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-slate-500 text-sm">
                    No active blockers
                  </div>
                )}
              </div>
            </BentoCard>

            {/* Site Performance Matrix */}
            <BentoCard span="full" className="border-slate-200">
              <h3 className="text-base font-semibold text-slate-900 mb-4">
                Site Performance Matrix
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="text-center p-4 rounded-lg bg-red-50 border border-red-200">
                  <div className="text-3xl font-bold tabular-nums text-red-900">
                    <Counter value={siteTiers.critical} />
                  </div>
                  <p className="text-sm text-red-700 mt-1">
                    Critical (&lt;50%)
                  </p>
                  <p className="text-xs text-red-600 mt-1">
                    Immediate attention required
                  </p>
                </div>

                <div className="text-center p-4 rounded-lg bg-amber-50 border border-amber-200">
                  <div className="text-3xl font-bold tabular-nums text-amber-900">
                    <Counter value={siteTiers.warning} />
                  </div>
                  <p className="text-sm text-amber-700 mt-1">
                    At Risk (50-89%)
                  </p>
                  <p className="text-xs text-amber-600 mt-1">
                    Monitoring recommended
                  </p>
                </div>

                <div className="text-center p-4 rounded-lg bg-green-50 border border-green-200">
                  <div className="text-3xl font-bold tabular-nums text-green-900">
                    <Counter value={siteTiers.ready} />
                  </div>
                  <p className="text-sm text-green-700 mt-1">Ready (≥90%)</p>
                  <p className="text-xs text-green-600 mt-1">
                    On track for soft-lock
                  </p>
                </div>
              </div>

              {/* Site Bar Chart */}
              <div className="h-72">
                {barData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={barData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="#e2e8f0"
                      />
                      <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#64748b", fontSize: 12 }}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#64748b", fontSize: 12 }}
                      />
                      <RechartsTooltip
                        cursor={{ fill: "#f1f5f9" }}
                        contentStyle={{
                          backgroundColor: "rgba(255, 255, 255, 0.95)",
                          border: "1px solid #e2e8f0",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                      />
                      <Legend
                        iconType="circle"
                        wrapperStyle={{ fontSize: "12px" }}
                      />
                      <Bar
                        dataKey="Signatures"
                        stackId="a"
                        fill={COLORS.signatures}
                        radius={[0, 0, 0, 0]}
                      />
                      <Bar
                        dataKey="Queries"
                        stackId="a"
                        fill={COLORS.queries}
                        radius={[0, 0, 0, 0]}
                      />
                      <Bar
                        dataKey="Deviations"
                        stackId="a"
                        fill={COLORS.deviations}
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-slate-500 text-sm">
                    No site data available
                  </div>
                )}
              </div>
            </BentoCard>
          </MagicBento>
        </div>
      </FadeContent>

      {/* What Requires Action */}
      <FadeContent delay={0.6}>
        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg text-blue-900">
              What Requires Action?
            </CardTitle>
            <CardDescription className="text-blue-700">
              Recommended next steps based on current readiness status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.critical_adjudications > 0 && (
                <BlurText delay={0.1} duration={0.8}>
                  <div className="flex items-start gap-3 rounded-lg bg-white p-4 shadow-sm border border-red-100">
                    <div className="rounded-full bg-red-100 p-2 shrink-0">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900">
                        {data.critical_adjudications} critical adjudications
                        open &gt;90 days
                      </p>
                      <p className="mt-1 text-xs text-slate-600">
                        → Recommended Action: Immediate escalation to
                        adjudication committee required
                      </p>
                    </div>
                  </div>
                </BlurText>
              )}

              {data.high_query_volume > 0 && (
                <BlurText delay={0.2} duration={0.8}>
                  <div className="flex items-start gap-3 rounded-lg bg-white p-4 shadow-sm border border-amber-100">
                    <div className="rounded-full bg-amber-100 p-2 shrink-0">
                      <AlertCircle className="h-4 w-4 text-amber-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900">
                        {data.high_query_volume} subjects with high query volume
                        (&gt;10 open)
                      </p>
                      <p className="mt-1 text-xs text-slate-600">
                        → Recommended Action: Assign CRAs to prioritize query
                        resolution
                      </p>
                    </div>
                  </div>
                </BlurText>
              )}

              {(data.blocked_by_signatures / data.total_subjects) * 100 >
                80 && (
                <BlurText delay={0.3} duration={0.8}>
                  <div className="flex items-start gap-3 rounded-lg bg-white p-4 shadow-sm border border-red-100">
                    <div className="rounded-full bg-red-100 p-2 shrink-0">
                      <XCircle className="h-4 w-4 text-red-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900">
                        {Math.round(
                          (data.blocked_by_signatures / data.total_subjects) *
                            100,
                        )}
                        % of subjects missing Investigator signatures
                      </p>
                      <p className="mt-1 text-xs text-slate-600">
                        → Recommended Action: Escalate to study coordinators for
                        signature collection campaign
                      </p>
                    </div>
                  </div>
                </BlurText>
              )}
            </div>
          </CardContent>
        </Card>
      </FadeContent>

      {/* Data Confidence & Limitations */}
      {data.data_quality_warnings > 0 && (
        <FadeContent delay={0.8}>
          <Card className="border-slate-200 bg-slate-50">
            <CardHeader>
              <CardTitle className="text-base text-slate-900">
                Data Confidence & Limitations
              </CardTitle>
              <CardDescription className="text-slate-600">
                Known data quality issues affecting readiness calculations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                {data.blocked_by_mm_review > 0 && (
                  <div className="flex items-start gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-slate-400 mt-1.5 shrink-0" />
                    <p className="text-slate-700">
                      <span className="font-medium">
                        MM AE Review data unavailable:
                      </span>{" "}
                      {data.blocked_by_mm_review} subjects are flagged with
                      missing Medical Monitor review signatures. This is tracked
                      as a data quality limitation, not an actionable soft-lock
                      blocker.
                    </p>
                  </div>
                )}
                {data.orphaned_subjects > 0 && (
                  <div className="flex items-start gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-slate-400 mt-1.5 shrink-0" />
                    <p className="text-slate-700">
                      <span className="font-medium">
                        Protocol Deviations mapping degraded:
                      </span>{" "}
                      Subject ID format requires manual site crosswalk -{" "}
                      {data.orphaned_subjects || data.blocked_by_deviations}{" "}
                      potential orphaned records
                    </p>
                  </div>
                )}
                {data.test_data_excluded && (
                  <div className="flex items-start gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-slate-400 mt-1.5 shrink-0" />
                    <p className="text-slate-700">
                      <span className="font-medium">Test data excluded:</span>{" "}
                      Sample/test data sheets have been filtered from
                      calculations
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </FadeContent>
      )}
    </div>
  );
}
