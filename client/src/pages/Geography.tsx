import { useState, useMemo, Suspense, lazy } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useCampaigns } from "@/hooks/useCampaigns";
import { Globe, TrendingUp, DollarSign, MousePointer, ShoppingCart, Clock, RefreshCw, AlertCircle, Map } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

const WorldMap = lazy(() => import("@/components/WorldMap"));

const LANG_COLORS: Record<string, string> = {
  Spanish:    "hsl(16,  90%, 58%)",
  Portuguese: "hsl(210, 90%, 56%)",
  French:     "hsl(260, 75%, 62%)",
  German:     "hsl(145, 60%, 48%)",
  Italian:    "hsl(335, 80%, 56%)",
  English:    "hsl(190, 80%, 48%)",
  Multi:      "hsl(45,  90%, 55%)",
  Other:      "hsl(220, 20%, 55%)",
};

function fmt(n: number, decimals = 2) {
  return n.toLocaleString("en-US", { maximumFractionDigits: decimals, minimumFractionDigits: decimals });
}
function fmtK(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function StatCard({ icon: Icon, label, value, sub }: { icon: any; label: string; value: string; sub?: string }) {
  return (
    <Card className="bg-card border-border">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-1">
          <Icon size={13} className="text-primary" />
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
        <div className="text-lg font-bold tabular-nums">{value}</div>
        {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
      </CardContent>
    </Card>
  );
}

function NoTokenState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
      <AlertCircle size={32} className="text-yellow-400" />
      <p className="text-sm text-muted-foreground">Connect your Meta API token to load geography data.</p>
    </div>
  );
}

function LastUpdated({ iso }: { iso?: string }) {
  if (!iso) return null;
  const d = new Date(iso);
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  const label = mins <= 0 ? "just now" : mins === 1 ? "1 min ago" : `${mins} min ago`;
  return (
    <span className="flex items-center gap-1 text-xs text-muted-foreground">
      <Clock size={11} />
      Updated {label}
    </span>
  );
}

export default function Geography() {
  const [datePreset, setDatePreset] = useState("last_7d");
  const [countrySort, setCountrySort] = useState<"spend" | "clicks" | "ctr" | "purchases">("spend");
  const [tab, setTab] = useState<"countries" | "languages">("countries");
  // Track which campaigns are selected (all by default)
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([]);

  const { data: tokenData } = useQuery({
    queryKey: ["/api/token"],
    queryFn: () => apiRequest("GET", "/api/token").then(r => r.json()),
  });
  const hasToken = tokenData?.hasToken;

  const { data: campaignsData } = useCampaigns(!!hasToken);
  const allCampaigns = campaignsData?.campaigns || [];

  // Build the campaign_ids param — empty means all
  const campaignIdsParam = selectedCampaigns.length > 0
    ? `&campaign_ids=${selectedCampaigns.join(",")}`
    : "";

  const { data, isLoading, dataUpdatedAt, refetch, isFetching } = useQuery({
    queryKey: ["/api/geography", datePreset, selectedCampaigns.join(",")],
    queryFn: () =>
      apiRequest("GET", `/api/geography?date_preset=${datePreset}${campaignIdsParam}`).then(r => r.json()),
    enabled: hasToken,
    refetchInterval: 5 * 60 * 1000,
    staleTime: 4 * 60 * 1000,
  });

  const countries: any[] = data?.countries || [];
  const languages: any[] = data?.languages || [];

  // Sort countries
  const sortedCountries = useMemo(() => {
    return [...countries].sort((a, b) => b[countrySort] - a[countrySort]);
  }, [countries, countrySort]);

  // Aggregate totals
  const totals = useMemo(() => {
    const all = countries;
    return {
      spend: all.reduce((s, c) => s + c.spend, 0),
      impressions: all.reduce((s, c) => s + c.impressions, 0),
      clicks: all.reduce((s, c) => s + c.clicks, 0),
      purchases: all.reduce((s, c) => s + c.purchases, 0),
      countries: all.length,
    };
  }, [countries]);

  // Top 10 for chart
  const top10Spend = useMemo(() => sortedCountries.slice(0, 10), [sortedCountries]);

  // Language totals from language map
  const langTotals = useMemo(() => {
    return languages.map((l) => ({
      ...l,
      pct: totals.spend > 0 ? (l.spend / totals.spend) * 100 : 0,
    }));
  }, [languages, totals.spend]);

  if (!hasToken) return (
    <div className="p-4 md:p-6">
      <h1 className="text-lg font-bold mb-6">Geography & Language</h1>
      <NoTokenState />
    </div>
  );

  const lastUpdatedISO = dataUpdatedAt ? new Date(dataUpdatedAt).toISOString() : undefined;

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold flex items-center gap-2">
            <Globe size={18} className="text-primary" />
            Geography & Language
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Performance breakdown by country and language — international campaign
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <LastUpdated iso={lastUpdatedISO} />
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-secondary"
            title="Refresh now"
          >
            <RefreshCw size={12} className={isFetching ? "animate-spin" : ""} />
            {isFetching ? "Refreshing..." : "Refresh"}
          </button>
          <Select
            value={selectedCampaigns.length === 0 ? "all" : selectedCampaigns[0]}
            onValueChange={(v) => setSelectedCampaigns(v === "all" ? [] : [v])}
          >
            <SelectTrigger className="w-48 h-8 text-xs bg-secondary border-border">
              <SelectValue placeholder="All Campaigns" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Campaigns</SelectItem>
              {allCampaigns.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name.replace(/numerology blueprint\s*[-–]\s*/i, "").trim()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={datePreset} onValueChange={setDatePreset}>
            <SelectTrigger className="w-32 h-8 text-xs bg-secondary border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="yesterday">Yesterday</SelectItem>
              <SelectItem value="last_3d">Last 3 days</SelectItem>
              <SelectItem value="last_7d">Last 7 days</SelectItem>
              <SelectItem value="last_14d">Last 14 days</SelectItem>
              <SelectItem value="last_30d">Last 30 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stat cards */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard icon={Globe} label="Countries" value={totals.countries.toString()} sub="with spend data" />
          <StatCard icon={DollarSign} label="Total Spend" value={`$${fmt(totals.spend)}`} />
          <StatCard icon={MousePointer} label="Total Clicks" value={fmtK(totals.clicks)} />
          <StatCard icon={ShoppingCart} label="Purchases" value={totals.purchases.toString()} sub="tracked conversions" />
        </div>
      )}

      {/* Interactive World Map */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Map size={14} className="text-primary" />
            World Performance Map
          </CardTitle>
          <CardDescription className="text-xs">
            Green = profitable countries · Red = spend with no conversions · Gray = not targeted
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {isLoading ? (
            <Skeleton className="w-full rounded-lg" style={{ aspectRatio: "16/7" }} />
          ) : (
            <Suspense fallback={<Skeleton className="w-full rounded-lg" style={{ aspectRatio: "16/7" }} />}>
              <WorldMap countries={sortedCountries} />
            </Suspense>
          )}
        </CardContent>
      </Card>

      {/* Language summary bar */}
      {!isLoading && langTotals.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold">Spend by Language</CardTitle>
            <CardDescription className="text-xs">International campaign ad set breakdown</CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={langTotals} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 20% 20%)" />
                  <XAxis dataKey="language" tick={{ fontSize: 11, fill: "hsl(220 20% 55%)" }} />
                  <YAxis tickFormatter={(v) => `$${v}`} tick={{ fontSize: 11, fill: "hsl(220 20% 55%)" }} />
                  <Tooltip
                    contentStyle={{ background: "hsl(220 20% 12%)", border: "1px solid hsl(220 20% 22%)", borderRadius: 8, fontSize: 12 }}
                    formatter={(v: any, name: string) => name === "spend" ? [`$${fmt(v)}`, "Spend"] : [v, name]}
                  />
                  <Bar dataKey="spend" radius={[4, 4, 0, 0]} maxBarSize={60}>
                    {langTotals.map((l: any) => (
                      <Cell key={l.language} fill={LANG_COLORS[l.language] || LANG_COLORS.Other} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            {/* Language legend */}
            <div className="flex flex-wrap gap-3 mt-3">
              {langTotals.map((l: any) => (
                <div key={l.language} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: LANG_COLORS[l.language] || LANG_COLORS.Other }} />
                  <span>{l.language}</span>
                  <span className="text-foreground font-medium">${fmt(l.spend)}</span>
                  <span className="opacity-60">({l.pct.toFixed(1)}%)</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs: Countries | Languages */}
      <div>
        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
            <TabsList className="bg-secondary h-8">
              <TabsTrigger value="countries" className="text-xs h-6 px-3">By Country</TabsTrigger>
              <TabsTrigger value="languages" className="text-xs h-6 px-3">By Language</TabsTrigger>
            </TabsList>
            {tab === "countries" && (
              <Select value={countrySort} onValueChange={(v) => setCountrySort(v as any)}>
                <SelectTrigger className="w-32 h-8 text-xs bg-secondary border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="spend">Sort: Spend</SelectItem>
                  <SelectItem value="clicks">Sort: Clicks</SelectItem>
                  <SelectItem value="ctr">Sort: CTR</SelectItem>
                  <SelectItem value="purchases">Sort: Purchases</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Country table */}
          {tab === "countries" && (
            <Card className="bg-card border-border">
              {isLoading ? (
                <div className="p-4 space-y-2">
                  {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-9 rounded" />)}
                </div>
              ) : sortedCountries.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  No country data yet — campaigns are still paused or no spend recorded for this period.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-xs text-muted-foreground">
                        <th className="text-left px-4 py-2.5 font-medium">Country</th>
                        <th className="text-left px-3 py-2.5 font-medium">Language</th>
                        <th className="text-right px-3 py-2.5 font-medium">Spend</th>
                        <th className="text-right px-3 py-2.5 font-medium">Impr.</th>
                        <th className="text-right px-3 py-2.5 font-medium">Clicks</th>
                        <th className="text-right px-3 py-2.5 font-medium">CTR</th>
                        <th className="text-right px-3 py-2.5 font-medium">CPC</th>
                        <th className="text-right px-4 py-2.5 font-medium">Purchases</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedCountries.map((c, i) => (
                        <tr key={c.countryCode} className={`border-b border-border/50 hover:bg-secondary/30 transition-colors ${i === 0 ? "bg-primary/5" : ""}`}>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2">
                              <span className="text-base leading-none">{countryFlag(c.countryCode)}</span>
                              <div>
                                <div className="font-medium text-xs">{c.country}</div>
                                <div className="text-xs text-muted-foreground font-mono">{c.countryCode}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-2.5">
                            <Badge
                              variant="outline"
                              className="text-xs border-border py-0 px-1.5"
                              style={{ borderColor: LANG_COLORS[c.language] + "55", color: LANG_COLORS[c.language] }}
                            >
                              {c.language}
                            </Badge>
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono text-xs tabular-nums">${fmt(c.spend)}</td>
                          <td className="px-3 py-2.5 text-right font-mono text-xs tabular-nums text-muted-foreground">{fmtK(c.impressions)}</td>
                          <td className="px-3 py-2.5 text-right font-mono text-xs tabular-nums">{fmtK(c.clicks)}</td>
                          <td className="px-3 py-2.5 text-right font-mono text-xs tabular-nums">
                            <span className={c.ctr >= 2 ? "text-green-400" : c.ctr >= 1 ? "text-yellow-400" : "text-muted-foreground"}>
                              {fmt(c.ctr)}%
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono text-xs tabular-nums">
                            <span className={c.cpc > 0 && c.cpc <= 0.8 ? "text-green-400" : c.cpc <= 1.5 ? "text-foreground" : "text-red-400"}>
                              {c.cpc > 0 ? `$${fmt(c.cpc)}` : "—"}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono text-xs tabular-nums">
                            {c.purchases > 0 ? (
                              <span className="text-green-400 font-semibold">{c.purchases}</span>
                            ) : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}

          {/* Language table */}
          {tab === "languages" && (
            <Card className="bg-card border-border">
              {isLoading ? (
                <div className="p-4 space-y-2">
                  {[...Array(7)].map((_, i) => <Skeleton key={i} className="h-10 rounded" />)}
                </div>
              ) : langTotals.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  No language data yet. International campaign may not have spend in this period.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-xs text-muted-foreground">
                        <th className="text-left px-4 py-2.5 font-medium">Language</th>
                        <th className="text-left px-3 py-2.5 font-medium">Ad Set</th>
                        <th className="text-right px-3 py-2.5 font-medium">Spend</th>
                        <th className="text-right px-3 py-2.5 font-medium">% of Total</th>
                        <th className="text-right px-3 py-2.5 font-medium">Impr.</th>
                        <th className="text-right px-3 py-2.5 font-medium">Clicks</th>
                        <th className="text-right px-3 py-2.5 font-medium">CTR</th>
                        <th className="text-right px-3 py-2.5 font-medium">CPC</th>
                        <th className="text-right px-4 py-2.5 font-medium">Purchases</th>
                        <th className="text-right px-4 py-2.5 font-medium">CPA</th>
                      </tr>
                    </thead>
                    <tbody>
                      {langTotals.map((l: any, i: number) => (
                        <tr key={l.language} className={`border-b border-border/50 hover:bg-secondary/30 transition-colors ${i === 0 ? "bg-primary/5" : ""}`}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: LANG_COLORS[l.language] || LANG_COLORS.Other }} />
                              <span className="font-medium text-xs">{l.language}</span>
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <span className="text-xs text-muted-foreground truncate max-w-xs">{l.adsetName || l.adsetId}</span>
                          </td>
                          <td className="px-3 py-3 text-right font-mono text-xs tabular-nums">${fmt(l.spend)}</td>
                          <td className="px-3 py-3 text-right text-xs tabular-nums">
                            <div className="flex items-center justify-end gap-2">
                              <div className="w-16 h-1.5 bg-secondary rounded-full overflow-hidden">
                                <div className="h-full rounded-full" style={{ width: `${Math.min(100, l.pct)}%`, background: LANG_COLORS[l.language] || LANG_COLORS.Other }} />
                              </div>
                              <span className="text-muted-foreground w-12 text-right">{fmt(l.pct, 1)}%</span>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-right font-mono text-xs tabular-nums text-muted-foreground">{fmtK(l.impressions)}</td>
                          <td className="px-3 py-3 text-right font-mono text-xs tabular-nums">{fmtK(l.clicks)}</td>
                          <td className="px-3 py-3 text-right font-mono text-xs tabular-nums">
                            <span className={l.ctr >= 2 ? "text-green-400" : l.ctr >= 1 ? "text-yellow-400" : "text-muted-foreground"}>
                              {fmt(l.ctr)}%
                            </span>
                          </td>
                          <td className="px-3 py-3 text-right font-mono text-xs tabular-nums">
                            {l.cpc > 0 ? `$${fmt(l.cpc)}` : "—"}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-xs tabular-nums">
                            {l.purchases > 0 ? <span className="text-green-400 font-semibold">{l.purchases}</span> : "—"}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-xs tabular-nums">
                            {l.cpa ? `$${fmt(l.cpa)}` : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}
        </Tabs>
      </div>

      {/* Top 10 countries spend bar chart */}
      {!isLoading && top10Spend.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp size={14} className="text-primary" />
              Top 10 Countries by Spend
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={top10Spend} layout="vertical" margin={{ top: 0, right: 16, left: 60, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(220 20% 20%)" />
                  <XAxis type="number" tickFormatter={(v) => `$${v}`} tick={{ fontSize: 11, fill: "hsl(220 20% 55%)" }} />
                  <YAxis type="category" dataKey="country" tick={{ fontSize: 11, fill: "hsl(220 20% 65%)" }} width={58} />
                  <Tooltip
                    contentStyle={{ background: "hsl(220 20% 12%)", border: "1px solid hsl(220 20% 22%)", borderRadius: 8, fontSize: 12 }}
                    formatter={(v: any) => [`$${fmt(v)}`, "Spend"]}
                  />
                  <Bar dataKey="spend" radius={[0, 4, 4, 0]} maxBarSize={18}>
                    {top10Spend.map((c) => (
                      <Cell key={c.countryCode} fill={LANG_COLORS[c.language] || LANG_COLORS.Other} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Refresh info */}
      <div className="text-xs text-muted-foreground text-center pb-2">
        Data auto-refreshes every 5 minutes · Meta Insights API may delay up to 15 min
      </div>
    </div>
  );
}

// Simple country flag emoji from ISO code
function countryFlag(code: string): string {
  if (!code || code.length !== 2) return "🌍";
  const upper = code.toUpperCase();
  return String.fromCodePoint(0x1F1E6 + upper.charCodeAt(0) - 65, 0x1F1E6 + upper.charCodeAt(1) - 65);
}
