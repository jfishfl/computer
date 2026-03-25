import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useApiUrl } from "@/hooks/useApi";
import DatePresetPicker from "@/components/DatePresetPicker";
import {
  DollarSign, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2,
  ShoppingCart, MousePointer, Eye, CreditCard, Package, Zap, ArrowUpRight,
  ArrowDownRight, Info, BarChart3, Target, Activity, Bug
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Cell
} from "recharts";

// ── Helpers ──────────────────────────────────────────────────────────────────
function fmt(n: number | null | undefined, prefix = "", suffix = "", digits = 2): string {
  if (n === null || n === undefined || isNaN(n as number)) return "—";
  const val = typeof n === "number" ? n : parseFloat(n as any);
  return `${prefix}${val.toFixed(digits)}${suffix}`;
}

function fmtInt(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return Number(n).toLocaleString();
}

function pct(a: number, b: number): string {
  if (!b) return "—";
  return ((a / b) * 100).toFixed(1) + "%";
}

// ── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({
  label, value, sub, icon: Icon, color = "text-foreground", trend, alert
}: {
  label: string; value: string; sub?: string; icon: any;
  color?: string; trend?: "up" | "down" | "neutral"; alert?: boolean;
}) {
  return (
    <div className={`bg-card border rounded-lg p-4 flex flex-col gap-2 ${alert ? "border-red-500/50 bg-red-500/5" : "border-border"}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground font-medium">{label}</span>
        <div className={`p-1.5 rounded ${alert ? "bg-red-500/10" : "bg-secondary"}`}>
          <Icon size={14} className={alert ? "text-red-400" : "text-muted-foreground"} />
        </div>
      </div>
      <div className={`text-xl font-bold ${color}`}>{value}</div>
      {sub && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          {trend === "up" && <ArrowUpRight size={11} className="text-green-400 shrink-0" />}
          {trend === "down" && <ArrowDownRight size={11} className="text-red-400 shrink-0" />}
          <span>{sub}</span>
        </div>
      )}
    </div>
  );
}

// ── Funnel Step ───────────────────────────────────────────────────────────────
function FunnelStep({ label, value, rate, isLast = false, highlight = false }: {
  label: string; value: number | string; rate?: string | null; isLast?: boolean; highlight?: boolean;
}) {
  return (
    <div className="flex items-center gap-1 shrink-0">
      <div className={`flex flex-col items-center text-center px-3 py-3 rounded-lg min-w-[90px] ${highlight ? "bg-primary/10 border border-primary/30" : "bg-secondary/40"}`}>
        <div className="text-xs text-muted-foreground mb-1">{label}</div>
        <div className={`text-base font-bold ${highlight ? "text-primary" : "text-foreground"}`}>
          {typeof value === "number" ? fmtInt(value) : value}
        </div>
      </div>
      {!isLast && rate && (
        <div className="flex flex-col items-center shrink-0">
          <span className="text-xs text-muted-foreground font-mono">{rate}</span>
          <span className="text-muted-foreground text-lg">→</span>
        </div>
      )}
      {!isLast && !rate && (
        <span className="text-muted-foreground/40 text-lg shrink-0">→</span>
      )}
    </div>
  );
}

// ── Comparison Row ────────────────────────────────────────────────────────────
function CompRow({ label, fb, rt, db, isCurrency = false }: {
  label: string; fb?: number | null; rt?: number | null; db?: number | null; isCurrency?: boolean;
}) {
  const max = Math.max(fb || 0, rt || 0, db || 0) || 1;
  const fmtVal = (v: number | null | undefined) =>
    v == null ? "—" : isCurrency ? `$${v.toFixed(2)}` : fmtInt(v);
  return (
    <div className="grid grid-cols-4 gap-2 py-2 border-b border-border last:border-0 text-sm items-center">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className={`font-mono text-center ${(fb || 0) > (db || 0) * 1.2 ? "text-yellow-400" : "text-foreground"}`}>{fmtVal(fb)}</span>
      <span className="font-mono text-center text-blue-300">{fmtVal(rt)}</span>
      <span className="font-mono text-center text-green-300 font-bold">{fmtVal(db)}</span>
    </div>
  );
}

// ── Custom Tooltip ────────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg p-3 text-xs shadow-lg">
      <div className="text-muted-foreground mb-2 font-medium">{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="text-foreground font-mono font-bold">
            {p.name.toLowerCase().includes("revenue") || p.name.toLowerCase().includes("profit") || p.name.toLowerCase().includes("spend")
              ? `$${Number(p.value).toFixed(2)}`
              : fmtInt(p.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function PnL() {
  const url = useApiUrl();
  const [datePreset, setDatePreset] = useState("last_7d");

  const { data, isLoading, error } = useQuery({
    queryKey: ["/api/pnl", datePreset],
    queryFn: () => apiRequest("GET", url(`/api/pnl?date_preset=${datePreset}`)).then(r => r.json()),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const d = data as any;

  const profit = d?.profit ?? null;
  const trueRoas = d?.trueRoas ?? null;
  const isProfit = profit !== null && profit > 0;

  // DB funnel events
  const fe = (key: string) => d?.dbFunnel?.[key]?.count || 0;
  const fs = (key: string) => d?.dbFunnel?.[key]?.sessions || 0;

  const viewWelcome = fe("view_welcome") || fe("page_view") || fe("view_landing");
  const viewCheckout = fe("view_checkout");
  const checkoutSubmit = fe("checkout_submit") || fe("checkout_complete") || fe("purchase");
  const viewUpsell = fe("view_upsell_1");
  const acceptUpsell = fe("accept_upsell_1");

  // Meta funnel
  const metaFunnel = [
    { label: "Impressions", value: d?.metaFbImpressions },
    { label: "Clicks", value: d?.metaFbClicks },
    { label: "Landing Views", value: d?.metaFbLandingViews },
    { label: "Add to Cart (FB)", value: d?.metaFbATC },
    { label: "Checkout (FB)", value: d?.metaFbCheckout },
    { label: "Purchases (FB)", value: d?.metaFbPurchases },
  ].filter(s => s.value);

  // Daily chart data — normalize dates
  const dailyData = (d?.dailyPnl || []).map((row: any) => ({
    ...row,
    day: row.day?.slice(5), // MM-DD
    profit: row.revenue - 0,
  }));

  // Product revenue chart
  const productData = (d?.dbProducts || []).map((p: any) => ({
    name: p.product?.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()) || "Unknown",
    revenue: p.revenue,
    count: p.count,
    avgPrice: p.avgPrice,
  }));

  const convComp = d?.conversionComparison;

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
            <DollarSign size={18} className="text-primary" />
            P&amp;L Command Center
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Meta Spend · RedTrack Attribution · Railway DB Ground Truth
          </p>
        </div>
        <DatePresetPicker value={datePreset} onChange={setDatePreset} />
      </div>

      {/* Attribution Bug Alert */}
      {d?.attributionBugCount > 0 && (
        <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/40 rounded-lg">
          <Bug size={16} className="text-red-400 mt-0.5 shrink-0" />
          <div>
            <div className="text-sm font-semibold text-red-300 mb-1">
              Attribution Bug Detected — {d.attributionBugCount} conversions untracked
            </div>
            <div className="text-xs text-muted-foreground">
              RedTrack received literal <code className="bg-red-500/20 px-1 rounded">{`{{ad.id}}`}</code> template strings instead of resolved Meta URL params.
              This means <strong className="text-foreground">${fmt(d.attributionGap)} ({fmt(d.attributionGapPct, "", "%", 1)} of revenue)</strong> cannot be attributed to specific ads.
              Fix: ensure your Meta ad URL parameters are properly substituted before RedTrack receives the click.
            </div>
          </div>
        </div>
      )}

      {/* Conversion Comparison Alert */}
      {convComp?.alert && (
        <div className="flex items-start gap-3 p-4 bg-yellow-500/10 border border-yellow-500/40 rounded-lg">
          <AlertTriangle size={16} className="text-yellow-400 mt-0.5 shrink-0" />
          <div>
            <div className="text-sm font-semibold text-yellow-300 mb-1">
              FB vs Actual Conversion Discrepancy
            </div>
            <div className="text-xs text-muted-foreground">
              Meta Ads Manager reports <strong className="text-foreground">{fmtInt(convComp.fbReported)} purchases</strong> but your database shows <strong className="text-foreground">{fmtInt(convComp.actualDB)}</strong>.
              {convComp.fbReported > convComp.actualDB
                ? " Meta may be overcounting due to view-through attribution or delayed pixel events."
                : " Some purchases may not be firing your Meta pixel. Check thank-you page pixel placement."}
            </div>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="text-center py-12 text-muted-foreground text-sm">Loading P&amp;L data from all sources…</div>
      )}
      {error && !d && (
        <div className="text-center py-8 text-red-400 text-sm">Failed to load data. Check server logs.</div>
      )}

      {d && (
        <>
          {/* ── Top KPI Row ── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <KpiCard
              label="Ad Spend"
              value={fmt(d.metaSpend, "$")}
              icon={DollarSign}
              sub="Meta Ads"
              color="text-foreground"
            />
            <KpiCard
              label="Actual Revenue"
              value={fmt(d.dbRevenue, "$")}
              icon={TrendingUp}
              sub="Railway DB ground truth"
              color="text-green-400"
              trend="up"
            />
            <KpiCard
              label="Profit / Loss"
              value={profit !== null ? `${profit >= 0 ? "+" : ""}$${Math.abs(profit).toFixed(2)}` : "—"}
              icon={isProfit ? TrendingUp : TrendingDown}
              sub={d.profitMargin !== null ? `${d.profitMargin.toFixed(1)}% margin` : undefined}
              color={isProfit ? "text-green-400" : "text-red-400"}
              trend={isProfit ? "up" : "down"}
            />
            <KpiCard
              label="True ROAS"
              value={trueRoas !== null ? `${trueRoas.toFixed(2)}x` : "—"}
              icon={Activity}
              sub="DB revenue ÷ Meta spend"
              color={trueRoas !== null && trueRoas >= 1 ? "text-green-400" : "text-red-400"}
              trend={trueRoas !== null ? (trueRoas >= 1 ? "up" : "down") : "neutral"}
            />
            <KpiCard
              label="True CPA"
              value={fmt(d.trueCpa, "$")}
              icon={Target}
              sub={`${fmtInt(d.dbPurchases)} actual purchases`}
              color={d.trueCpa && d.trueCpa < 30 ? "text-green-400" : "text-foreground"}
            />
            <KpiCard
              label="EPC"
              value={fmt(d.epc, "$")}
              icon={MousePointer}
              sub="RT earnings per click"
              color="text-blue-300"
            />
          </div>

          {/* ── FB vs Actual vs RT Comparison ── */}
          <div className="bg-card border border-border rounded-lg p-5">
            <div className="text-sm font-semibold mb-1 flex items-center gap-2">
              <BarChart3 size={14} className="text-primary" />
              Conversion Source Comparison
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Meta Ads Manager reports (may include view-through) vs RedTrack tracked clicks vs actual DB purchases.
              <strong className="text-foreground"> DB is ground truth.</strong>
            </p>
            <div className="grid grid-cols-4 gap-2 text-xs text-muted-foreground pb-2 border-b border-border font-medium">
              <span>Metric</span>
              <span className="text-center text-yellow-400">Meta (FB)</span>
              <span className="text-center text-blue-400">RedTrack</span>
              <span className="text-center text-green-400">DB (Actual)</span>
            </div>
            <CompRow label="Purchases / Conversions" fb={d.metaFbPurchases} rt={d.rtConversions} db={d.dbPurchases} />
            <CompRow label="Revenue" fb={null} rt={d.rtRevenue} db={d.dbRevenue} isCurrency />
            <CompRow label="Add to Cart" fb={d.metaFbATC} rt={null} db={null} />
            <CompRow label="Initiate Checkout" fb={d.metaFbCheckout} rt={null} db={viewCheckout || null} />
            <CompRow label="CPA" fb={d.metaFbCPA} rt={d.rtRevenue && d.rtConversions ? d.rtRevenue / d.rtConversions : null} db={d.trueCpa} isCurrency />
          </div>

          {/* ── Meta Pixel Funnel ── */}
          {metaFunnel.length > 0 && (
            <div className="bg-card border border-border rounded-lg p-5">
              <div className="text-sm font-semibold mb-4 flex items-center gap-2">
                <MousePointer size={14} className="text-primary" />
                Meta Pixel Funnel
                <Badge variant="outline" className="text-xs ml-1">FB-reported</Badge>
              </div>
              <div className="flex items-stretch gap-2 overflow-x-auto pb-2">
                {metaFunnel.map((step, i) => {
                  const next = metaFunnel[i + 1];
                  const rate = next && step.value ? pct(next.value, step.value) : null;
                  return (
                    <FunnelStep
                      key={step.label}
                      label={step.label}
                      value={step.value}
                      rate={rate}
                      isLast={i === metaFunnel.length - 1}
                      highlight={i === metaFunnel.length - 1}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Actual LP Funnel (DB) ── */}
          {(viewWelcome > 0 || viewCheckout > 0) && (
            <div className="bg-card border border-border rounded-lg p-5">
              <div className="text-sm font-semibold mb-1 flex items-center gap-2">
                <ShoppingCart size={14} className="text-primary" />
                Landing Page Funnel
                <Badge variant="outline" className="text-xs ml-1 text-green-400 border-green-500/30">DB Ground Truth</Badge>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                Actual user behavior tracked in Railway DB — reflects real drop-off at each step.
              </p>
              <div className="flex items-stretch gap-2 overflow-x-auto pb-2">
                {viewWelcome > 0 && (
                  <FunnelStep label="View Welcome" value={viewWelcome}
                    rate={viewCheckout ? pct(viewCheckout, viewWelcome) : null} />
                )}
                {viewCheckout > 0 && (
                  <FunnelStep label="View Checkout" value={viewCheckout}
                    rate={checkoutSubmit ? pct(checkoutSubmit, viewCheckout) : null} />
                )}
                {checkoutSubmit > 0 && (
                  <FunnelStep label="Purchase" value={checkoutSubmit}
                    rate={viewUpsell ? pct(viewUpsell, checkoutSubmit) : null}
                    highlight />
                )}
                {viewUpsell > 0 && (
                  <FunnelStep label="View Upsell" value={viewUpsell}
                    rate={acceptUpsell ? pct(acceptUpsell, viewUpsell) : null} />
                )}
                {acceptUpsell > 0 && (
                  <FunnelStep label="Accept Upsell" value={acceptUpsell} isLast highlight />
                )}
              </div>
              {viewWelcome > 0 && checkoutSubmit > 0 && (
                <div className="mt-3 p-3 bg-secondary/40 rounded-lg text-xs text-muted-foreground">
                  Overall LP conversion: <strong className="text-foreground">{pct(checkoutSubmit, viewWelcome)}</strong>
                  {viewCheckout > 0 && <> · Checkout abandon rate: <strong className="text-foreground">{pct(viewCheckout - checkoutSubmit, viewCheckout)}</strong></>}
                </div>
              )}
            </div>
          )}

          {/* ── Revenue by Product ── */}
          {productData.length > 0 && (
            <div className="bg-card border border-border rounded-lg p-5">
              <div className="text-sm font-semibold mb-4 flex items-center gap-2">
                <Package size={14} className="text-primary" />
                Revenue by Product
                <Badge variant="outline" className="text-xs ml-1 text-green-400 border-green-500/30">All time</Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
                {productData.map((p: any) => (
                  <div key={p.name} className="flex items-center justify-between p-3 rounded-lg bg-secondary/40 border border-border">
                    <div>
                      <div className="text-sm font-medium text-foreground">{p.name}</div>
                      <div className="text-xs text-muted-foreground">{fmtInt(p.count)} sales · avg ${p.avgPrice?.toFixed(2)}</div>
                    </div>
                    <div className="text-base font-bold text-green-400">${p.revenue?.toFixed(2)}</div>
                  </div>
                ))}
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={productData} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={v => `$${v}`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="revenue" name="Revenue" radius={[4, 4, 0, 0]}>
                    {productData.map((_: any, i: number) => (
                      <Cell key={i} fill={["#22c55e", "#3b82f6", "#f59e0b", "#a855f7"][i % 4]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* ── Daily Revenue Chart ── */}
          {dailyData.length > 0 && (
            <div className="bg-card border border-border rounded-lg p-5">
              <div className="text-sm font-semibold mb-4 flex items-center gap-2">
                <TrendingUp size={14} className="text-primary" />
                Daily Revenue
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={dailyData} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="rtGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={v => `$${v}`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  <Area type="monotone" dataKey="revenue" name="DB Revenue" stroke="#22c55e" fill="url(#revGrad)" strokeWidth={2} dot={false} />
                  <Area type="monotone" dataKey="rtRevenue" name="RT Revenue" stroke="#3b82f6" fill="url(#rtGrad)" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* ── Attribution Detail ── */}
          <div className="bg-card border border-border rounded-lg p-5">
            <div className="text-sm font-semibold mb-4 flex items-center gap-2">
              <Bug size={14} className="text-primary" />
              Attribution Health
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "RT Attributed Revenue", value: fmt(d.attributedRevenue, "$"), color: "text-green-400" },
                { label: "Attribution Gap", value: fmt(d.attributionGap, "$"), color: d.attributionGap > 0 ? "text-red-400" : "text-green-400" },
                { label: "Gap %", value: fmt(d.attributionGapPct, "", "%", 1), color: d.attributionGapPct > 20 ? "text-red-400" : "text-green-400" },
                { label: "Broken Conversions", value: fmtInt(d.attributionBugCount), color: d.attributionBugCount > 0 ? "text-red-400" : "text-green-400" },
              ].map(({ label, value, color }) => (
                <div key={label} className="text-center p-3 rounded-lg bg-secondary/40">
                  <div className="text-xs text-muted-foreground mb-1">{label}</div>
                  <div className={`text-base font-bold ${color}`}>{value}</div>
                </div>
              ))}
            </div>
            {d.attributionBugCount > 0 && (
              <div className="mt-4 p-3 bg-secondary/40 rounded-lg text-xs text-muted-foreground space-y-1">
                <div className="font-semibold text-foreground mb-2">How to fix the attribution bug:</div>
                <div>1. In Meta Ads Manager, go to your ad → Edit → Destination URL</div>
                <div>2. Ensure URL parameters include: <code className="bg-background px-1 rounded">?sub1={"{{ad.id}}"}&sub2={"{{adset.id}}"}&sub3={"{{campaign.id}}"}&sub4={"{{ad.name}}"}</code></div>
                <div>3. Verify these are <strong className="text-foreground">URL Parameters</strong> fields in Meta (not in the URL bar directly)</div>
                <div>4. Use Meta's URL Parameters builder to auto-insert the dynamic values</div>
              </div>
            )}
          </div>

          <div className="text-xs text-muted-foreground text-center pb-2">
            Last updated: {d.lastUpdated ? new Date(d.lastUpdated).toLocaleString() : "—"}
          </div>
        </>
      )}
    </div>
  );
}
