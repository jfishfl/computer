import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import DatePresetPicker from "@/components/DatePresetPicker";
import CampaignPicker from "@/components/CampaignPicker";
import {
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, Lightbulb,
  ChevronRight, Target, Zap, BarChart3, Activity, ArrowUpRight, ArrowDownRight,
  Info, Star, Clock, RefreshCw
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip } from "recharts";

// ── Types ────────────────────────────────────────────────────────────────────
type Severity = "critical" | "warning" | "opportunity" | "good";
type Priority = "high" | "medium" | "low";

interface Rec {
  id: string;
  title: string;
  detail: string;
  severity: Severity;
  stage: string;
  priority: Priority;
  effort: "low" | "medium" | "high";
  impact: "low" | "medium" | "high";
  adset?: string;
}

interface Ranking {
  id: string;
  name: string;
  angle: string;
  score: number;
  grade: string;
  spend: number;
  ctr: number;
  cpc: number;
  cpm: number;
  purchases: number;
  cpa: number | null;
  convRate: number;
  recommendation: string;
}

interface HealthScore {
  overall: number;
  ctr: number;
  efficiency: number;
  conversion: number;
  fatigue: number;
}

interface Funnel {
  impressions: number;
  reach: number;
  clicks: number;
  landingViews: number;
  purchases: number;
  impressionToClick: string | null;
  clickToLanding: string | null;
  landingToPurchase: string | null;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const SEVERITY_CONFIG: Record<Severity, { icon: any; color: string; bg: string; border: string; label: string }> = {
  critical: {
    icon: AlertTriangle, color: "text-red-400", bg: "bg-red-500/10",
    border: "border-red-500/30", label: "Critical",
  },
  warning: {
    icon: AlertTriangle, color: "text-yellow-400", bg: "bg-yellow-500/10",
    border: "border-yellow-500/30", label: "Warning",
  },
  opportunity: {
    icon: Lightbulb, color: "text-blue-400", bg: "bg-blue-500/10",
    border: "border-blue-500/30", label: "Opportunity",
  },
  good: {
    icon: CheckCircle2, color: "text-green-400", bg: "bg-green-500/10",
    border: "border-green-500/30", label: "Good",
  },
};

const ANGLE_LABELS: Record<string, string> = {
  same_type: "Same Type",
  therapist: "Therapist",
  ai_oracle: "AI Oracle",
};

const ANGLE_COLORS: Record<string, string> = {
  same_type: "bg-blue-500/20 text-blue-300",
  therapist: "bg-purple-500/20 text-purple-300",
  ai_oracle: "bg-amber-500/20 text-amber-300",
};

function fmt(n: number | null | undefined, prefix = "", suffix = "", digits = 2): string {
  if (n === null || n === undefined || isNaN(n as number)) return "—";
  const val = typeof n === "number" ? n : parseFloat(n as any);
  return `${prefix}${val.toFixed(digits)}${suffix}`;
}

function GradeCircle({ grade, score }: { grade: string; score: number }) {
  const color = grade === "A" ? "text-green-400 border-green-400/40"
    : grade === "B" ? "text-blue-400 border-blue-400/40"
    : grade === "C" ? "text-yellow-400 border-yellow-400/40"
    : grade === "D" ? "text-orange-400 border-orange-400/40"
    : "text-red-400 border-red-400/40";
  return (
    <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center shrink-0 ${color}`}>
      <span className="text-sm font-bold">{grade}</span>
    </div>
  );
}

function ScoreBar({ value, max = 100, color = "bg-primary" }: { value: number; max?: number; color?: string }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function HealthGauge({ score }: { score: number }) {
  const color = score >= 70 ? "text-green-400" : score >= 50 ? "text-yellow-400" : "text-red-400";
  const label = score >= 70 ? "Healthy" : score >= 50 ? "Needs Work" : "At Risk";
  const ringColor = score >= 70 ? "#22c55e" : score >= 50 ? "#f59e0b" : "#ef4444";
  const circumference = 2 * Math.PI * 42;
  const dashOffset = circumference * (1 - score / 100);

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-28 h-28">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--secondary))" strokeWidth="8" />
          <circle
            cx="50" cy="50" r="42" fill="none" stroke={ringColor} strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{ transition: "stroke-dashoffset 0.6s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-2xl font-bold ${color}`}>{score}</span>
          <span className="text-xs text-muted-foreground">/100</span>
        </div>
      </div>
      <span className={`text-xs font-medium ${color}`}>{label}</span>
    </div>
  );
}

function FunnelStep({
  label, value, rate, isLast = false, highlight = false,
}: {
  label: string; value: number; rate?: string | null; isLast?: boolean; highlight?: boolean;
}) {
  return (
    <div className="flex-1 min-w-0">
      <div className={`rounded-lg p-3 border text-center ${highlight ? "bg-primary/10 border-primary/30" : "bg-secondary/50 border-border"}`}>
        <div className="text-xs text-muted-foreground mb-1">{label}</div>
        <div className="text-lg font-bold text-foreground">{value.toLocaleString()}</div>
        {rate && <div className="text-xs text-green-400 mt-0.5">{rate}% pass-through</div>}
      </div>
      {!isLast && (
        <div className="flex justify-center mt-1 mb-1">
          <ChevronRight size={14} className="text-muted-foreground" />
        </div>
      )}
    </div>
  );
}

// ── Recommendation Card ───────────────────────────────────────────────────────
function RecCard({ rec, expanded, onToggle }: { rec: Rec; expanded: boolean; onToggle: () => void }) {
  const cfg = SEVERITY_CONFIG[rec.severity];
  const Icon = cfg.icon;

  return (
    <div
      className={`rounded-lg border p-4 cursor-pointer transition-all hover:bg-card/80 ${cfg.bg} ${cfg.border}`}
      onClick={onToggle}
      data-testid={`rec-card-${rec.id}`}
    >
      <div className="flex items-start gap-3">
        <Icon size={16} className={`mt-0.5 shrink-0 ${cfg.color}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <span className="text-sm font-medium text-foreground leading-snug">{rec.title}</span>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${cfg.color} ${cfg.bg}`}>
                {cfg.label}
              </span>
              <ChevronRight size={13} className={`text-muted-foreground transition-transform ${expanded ? "rotate-90" : ""}`} />
            </div>
          </div>
          <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
            <span className="capitalize">{rec.stage}</span>
            <span>·</span>
            <span>Impact: <span className={rec.impact === "high" ? "text-green-400" : rec.impact === "medium" ? "text-yellow-400" : "text-muted-foreground"}>{rec.impact}</span></span>
            <span>·</span>
            <span>Effort: <span className={rec.effort === "low" ? "text-green-400" : rec.effort === "medium" ? "text-yellow-400" : "text-orange-400"}>{rec.effort}</span></span>
          </div>
          {expanded && (
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed border-t border-border/50 pt-3">
              {rec.detail}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── No-token state ────────────────────────────────────────────────────────────
function NoTokenState() {
  return (
    <div className="bg-card border border-border rounded-lg p-10 text-center max-w-md mx-auto mt-12">
      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
        <Activity size={22} className="text-primary" />
      </div>
      <div className="text-sm font-semibold text-foreground mb-2">Connect token to see insights</div>
      <div className="text-xs text-muted-foreground leading-relaxed">
        Add your Meta API token using the button in the top-right corner, then return here for a full performance analysis with prioritized recommendations.
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Insights() {
  const [datePreset, setDatePreset] = useState("last_7d");
  const [campaignId, setCampaignId] = useState("");
  const [expandedRec, setExpandedRec] = useState<string | null>(null);
  const [severityFilter, setSeverityFilter] = useState<Severity | "all">("all");

  const { data: tokenData } = useQuery({
    queryKey: ["/api/token"],
    queryFn: () => apiRequest("GET", "/api/token").then(r => r.json()),
  });
  const hasToken = tokenData?.hasToken;

  const { data, isLoading, dataUpdatedAt } = useQuery({
    queryKey: ["/api/campaigns", campaignId, "insights-analysis", datePreset],
    queryFn: () => apiRequest("GET", `/api/campaigns/${campaignId}/insights-analysis?date_preset=${datePreset}`).then(r => r.json()),
    enabled: hasToken && !!campaignId,
    refetchInterval: 5 * 60 * 1000,
    staleTime: 4 * 60 * 1000,
  });

  if (!hasToken) return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-bold">Performance Insights</h1>
          <p className="text-xs text-muted-foreground mt-0.5">AI-powered analysis & recommendations</p>
        </div>
      </div>
      <NoTokenState />
    </div>
  );

  const { healthScore, funnel, rankings, recommendations, campaignIns } = data || {};

  // Radar chart data
  const radarData = healthScore ? [
    { subject: "CTR", value: Math.round(healthScore.ctr) },
    { subject: "Efficiency", value: Math.round(healthScore.efficiency) },
    { subject: "Conversion", value: Math.round(healthScore.conversion) },
    { subject: "Freshness", value: Math.round(healthScore.fatigue) },
  ] : [];

  const filteredRecs = (recommendations || []).filter(
    (r: Rec) => severityFilter === "all" || r.severity === severityFilter
  );

  const counts = (recommendations || []).reduce((acc: Record<string, number>, r: Rec) => {
    acc[r.severity] = (acc[r.severity] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="p-4 md:p-6 space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Activity size={18} className="text-primary" />
            Performance Insights
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">Affiliate marketer analysis · Numerology Blueprint</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {dataUpdatedAt ? (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock size={11} />
              Updated {Math.round((Date.now() - dataUpdatedAt) / 60000) <= 0 ? "just now" : `${Math.round((Date.now() - dataUpdatedAt) / 60000)} min ago`}
            </span>
          ) : null}
          <CampaignPicker value={campaignId} onChange={setCampaignId} includeAll />
          <DatePresetPicker value={datePreset} onChange={setDatePreset} />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-32 shimmer rounded-lg" />)}
        </div>
      ) : !data || data.error ? (
        <div className="bg-card border border-border rounded-lg p-8 text-center">
          <Info size={24} className="mx-auto mb-3 text-muted-foreground" />
          <div className="text-sm text-muted-foreground">
            {data?.error === "No token" ? "Token expired — reconnect in the sidebar." : "No data for this period yet. Activate the campaign and let it run."}
          </div>
        </div>
      ) : (
        <>
          {/* ── Section 1: Campaign Health Score ── */}
          <div className="bg-card border border-border rounded-lg p-5">
            <div className="text-sm font-semibold mb-4 flex items-center gap-2">
              <Target size={14} className="text-primary" />
              Campaign Health Score
            </div>
            <div className="flex flex-col md:flex-row gap-6 items-center">
              <HealthGauge score={healthScore?.overall || 0} />

              {/* Radar */}
              <div className="flex-1 w-full" style={{ height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData} outerRadius={70}>
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis
                      dataKey="subject"
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    />
                    <Radar
                      name="Score"
                      dataKey="value"
                      stroke="hsl(var(--primary))"
                      fill="hsl(var(--primary))"
                      fillOpacity={0.15}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))", border: "1px solid hsl(var(--border))",
                        borderRadius: "6px", fontSize: "12px",
                      }}
                      formatter={(v: any) => [`${v}/100`]}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              {/* Score breakdown */}
              <div className="flex-1 space-y-3 min-w-0 w-full">
                {[
                  { label: "Click-Through Rate", value: healthScore?.ctr || 0, color: "bg-blue-500" },
                  { label: "Cost Efficiency (CPC)", value: healthScore?.efficiency || 0, color: "bg-green-500" },
                  { label: "Conversion Performance", value: healthScore?.conversion || 0, color: "bg-purple-500" },
                  { label: "Creative Freshness", value: healthScore?.fatigue || 0, color: "bg-amber-500" },
                ].map(({ label, value, color }) => (
                  <div key={label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">{label}</span>
                      <span className="text-foreground font-mono">{Math.round(value)}</span>
                    </div>
                    <ScoreBar value={value} color={color} />
                  </div>
                ))}
              </div>
            </div>

            {/* Quick stats row */}
            {campaignIns && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-border">
                {[
                  { label: "Spend", value: fmt(campaignIns.spend, "$"), trend: null },
                  { label: "CTR", value: fmt(campaignIns.ctr, "", "%"), trend: campaignIns.ctr >= 1 ? "up" : "down" },
                  { label: "CPC", value: fmt(campaignIns.cpc, "$"), trend: campaignIns.cpc <= 1.5 ? "up" : "down" },
                  { label: "Purchases", value: String(campaignIns.purchases), trend: campaignIns.purchases > 0 ? "up" : null },
                ].map(({ label, value, trend }) => (
                  <div key={label} className="text-center">
                    <div className="text-xs text-muted-foreground mb-1">{label}</div>
                    <div className="flex items-center justify-center gap-1">
                      <span className="text-base font-bold text-foreground">{value}</span>
                      {trend === "up" && <ArrowUpRight size={12} className="text-green-400" />}
                      {trend === "down" && <ArrowDownRight size={12} className="text-red-400" />}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Section 2: Funnel Breakdown ── */}
          {funnel && (
            <div className="bg-card border border-border rounded-lg p-5">
              <div className="text-sm font-semibold mb-4 flex items-center gap-2">
                <BarChart3 size={14} className="text-primary" />
                Conversion Funnel
              </div>
              <div className="flex items-stretch gap-2 overflow-x-auto pb-1">
                <FunnelStep label="Impressions" value={funnel.impressions} rate={funnel.impressionToClick} />
                <FunnelStep label="Clicks" value={funnel.clicks} rate={funnel.clickToLanding} />
                {funnel.landingViews > 0 && (
                  <FunnelStep label="Landing Views" value={funnel.landingViews} rate={funnel.landingToPurchase} />
                )}
                <FunnelStep label="Purchases" value={funnel.purchases} isLast highlight />
              </div>
              <div className="mt-3 p-3 bg-secondary/40 rounded-lg text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Reading this:</span> Each number shows how many users made it to that stage. The % below each arrow is the pass-through rate. A low click→landing rate (under 70%) suggests slow landing page load or a disconnect between ad promise and page.
              </div>
            </div>
          )}

          {/* ── Section 3: Ad Set Performance Rankings ── */}
          <div className="bg-card border border-border rounded-lg p-5">
            <div className="text-sm font-semibold mb-4 flex items-center gap-2">
              <Star size={14} className="text-primary" />
              Ad Set Rankings
            </div>
            <div className="space-y-2">
              {(rankings || []).map((r: Ranking, i: number) => (
                <div key={r.id} data-testid={`ranking-row-${r.id}`}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-secondary/30 transition-colors">
                  <div className="text-xs text-muted-foreground font-mono w-4 shrink-0">#{i + 1}</div>
                  <GradeCircle grade={r.grade} score={r.score} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-foreground truncate">
                        {r.name.replace("Static - ", "")}
                      </span>
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${ANGLE_COLORS[r.angle] || "bg-secondary text-muted-foreground"}`}>
                        {ANGLE_LABELS[r.angle] || r.angle}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                      <span>CTR <span className="text-foreground font-mono">{r.ctr > 0 ? `${r.ctr.toFixed(2)}%` : "—"}</span></span>
                      <span>CPC <span className="text-foreground font-mono">{r.cpc > 0 ? `$${r.cpc.toFixed(2)}` : "—"}</span></span>
                      <span>Spend <span className="text-foreground font-mono">{r.spend > 0 ? `$${r.spend.toFixed(2)}` : "—"}</span></span>
                      <span>Purchases <span className="text-foreground font-mono">{r.purchases}</span></span>
                    </div>
                    <div className="mt-1.5 w-full max-w-[120px]">
                      <ScoreBar
                        value={r.score}
                        color={r.grade === "A" ? "bg-green-500" : r.grade === "B" ? "bg-blue-500" : r.grade === "C" ? "bg-yellow-500" : "bg-red-500"}
                      />
                    </div>
                  </div>
                  <div className="shrink-0">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full border ${
                      r.recommendation === "Scale"
                        ? "text-green-400 border-green-500/30 bg-green-500/10"
                        : r.recommendation === "Hold"
                        ? "text-blue-400 border-blue-500/30 bg-blue-500/10"
                        : r.recommendation === "Review"
                        ? "text-yellow-400 border-yellow-500/30 bg-yellow-500/10"
                        : "text-muted-foreground border-border"
                    }`}>
                      {r.recommendation}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Section 4: Recommendations ── */}
          <div className="bg-card border border-border rounded-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm font-semibold flex items-center gap-2">
                <Zap size={14} className="text-primary" />
                Action Items
                <span className="text-xs text-muted-foreground font-normal ml-1">
                  ({filteredRecs.length} of {recommendations?.length || 0})
                </span>
              </div>
              {/* Severity filters */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {(["all", "critical", "warning", "opportunity", "good"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setSeverityFilter(s)}
                    data-testid={`filter-${s}`}
                    className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                      severityFilter === s
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
                    }`}
                  >
                    {s === "all" ? `All (${recommendations?.length || 0})` : `${s} ${counts[s] ? `(${counts[s]})` : ""}`}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              {filteredRecs.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">No items for this filter.</div>
              ) : (
                filteredRecs.map((rec: Rec) => (
                  <RecCard
                    key={rec.id}
                    rec={rec}
                    expanded={expandedRec === rec.id}
                    onToggle={() => setExpandedRec(expandedRec === rec.id ? null : rec.id)}
                  />
                ))
              )}
            </div>
          </div>

          {/* ── Section 5: Optimization Cadence ── */}
          <div className="bg-card border border-border rounded-lg p-5">
            <div className="text-sm font-semibold mb-4 flex items-center gap-2">
              <TrendingUp size={14} className="text-primary" />
              Optimization Cadence
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                {
                  freq: "Daily",
                  color: "border-red-500/30 bg-red-500/5",
                  badge: "text-red-400",
                  items: ["Monitor campaign for disapprovals", "Check budget pacing", "Flag frequency spikes above 3.5x"],
                },
                {
                  freq: "Weekly",
                  color: "border-yellow-500/30 bg-yellow-500/5",
                  badge: "text-yellow-400",
                  items: ["Review CTR by ad set", "Pause ads below 0.5% CTR", "Scale ad sets with CPA under $40", "Shift budget to winners"],
                },
                {
                  freq: "Bi-Weekly",
                  color: "border-blue-500/30 bg-blue-500/5",
                  badge: "text-blue-400",
                  items: ["Refresh creative variants", "Test new angle or hook", "Review audience overlap"],
                },
                {
                  freq: "Monthly",
                  color: "border-green-500/30 bg-green-500/5",
                  badge: "text-green-400",
                  items: ["Full performance review", "Update budget allocation (70/20/10)", "Quarterly creative strategy reset", "Check pixel health in Events Manager"],
                },
              ].map(({ freq, color, badge, items }) => (
                <div key={freq} className={`rounded-lg border p-4 ${color}`}>
                  <div className={`text-xs font-bold mb-3 ${badge}`}>{freq}</div>
                  <ul className="space-y-1.5">
                    {items.map((item) => (
                      <li key={item} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <CheckCircle2 size={11} className="mt-0.5 shrink-0 text-muted-foreground/50" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
