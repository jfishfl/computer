import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import KpiCard from "@/components/KpiCard";
import DatePresetPicker from "@/components/DatePresetPicker";
import StatusBadge from "@/components/StatusBadge";
import CampaignPicker from "@/components/CampaignPicker";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Play, Pause, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";

const ADSET_COLORS = ["#3b82f6","#22c55e","#f59e0b","#a78bfa","#fb7185","#34d399","#60a5fa","#f97316","#06b6d4","#e879f9"];

function shortName(name: string) {
  return name
    .replace(/numerology blueprint\s*[-–]\s*/i, "")
    .replace(/^static\s*-\s*/i, "")
    .trim();
}

export default function Dashboard() {
  const [datePreset, setDatePreset] = useState("last_7d");
  const [campaignId, setCampaignId] = useState("");
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: tokenData } = useQuery({ queryKey: ["/api/token"], queryFn: () => apiRequest("GET", "/api/token").then(r => r.json()) });
  const hasToken = tokenData?.hasToken;

  const { data: campaignData, isLoading: campaignLoading } = useQuery({
    queryKey: ["/api/campaigns", campaignId, datePreset],
    queryFn: () => apiRequest("GET", `/api/campaigns/${campaignId}?date_preset=${datePreset}`).then(r => r.json()),
    enabled: hasToken && !!campaignId,
  });

  const { data: adsetsData, isLoading: adsetsLoading } = useQuery({
    queryKey: ["/api/campaigns", campaignId, "adsets", datePreset],
    queryFn: () => apiRequest("GET", `/api/campaigns/${campaignId}/adsets?date_preset=${datePreset}`).then(r => r.json()),
    enabled: hasToken && !!campaignId,
  });

  const toggleCampaign = useMutation({
    mutationFn: (status: string) => apiRequest("POST", "/api/campaign/toggle", { status }).then(r => r.json()),
    onSuccess: (_, status) => {
      toast({ title: `Campaign ${status === "ACTIVE" ? "activated" : "paused"}` });
      qc.invalidateQueries({ queryKey: ["/api/campaigns"] });
    },
  });

  const campaign = campaignData?.campaign;
  const insights = campaignData?.insights;
  const adsets = adsetsData?.adsets || [];

  const spendChart = adsets.map((a: any, i: number) => ({
    name: shortName(a.name),
    spend: a.insights?.spend || 0,
    clicks: a.insights?.clicks || 0,
    color: ADSET_COLORS[i % ADSET_COLORS.length],
  }));

  const isActive = campaign?.status === "ACTIVE";
  const totalBudget = adsets.reduce((s: number, a: any) => s + (a.budget || 0), 0);

  return (
    <div className="p-4 md:p-6 space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <h1 className="text-lg font-bold text-foreground">Campaign Overview</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {campaignId === "all" ? "Aggregated across all campaigns" : campaign ? shortName(campaign.name) : "Select a campaign"}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <CampaignPicker value={campaignId} onChange={setCampaignId} includeAll />
          <DatePresetPicker value={datePreset} onChange={setDatePreset} />
          {hasToken && campaignId && campaignId !== "all" && (
            <Button
              size="sm"
              variant={isActive ? "outline" : "default"}
              className={`text-xs ${isActive ? "border-red-500/50 text-red-400 hover:bg-red-500/10" : ""}`}
              onClick={() => toggleCampaign.mutate(isActive ? "PAUSED" : "ACTIVE")}
              disabled={toggleCampaign.isPending || campaignLoading}
              data-testid="button-toggle-campaign"
            >
              {isActive
                ? <><Pause size={12} className="mr-1.5" />Pause</>
                : <><Play size={12} className="mr-1.5" />Activate</>}
            </Button>
          )}
        </div>
      </div>

      {/* Campaign status bar */}
      {hasToken && campaign && (
        <div className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg">
          <StatusBadge status={campaignId === "all" ? "ACTIVE" : (campaign.status || "PAUSED")} />
          <span className="text-sm font-medium text-foreground truncate">
            {campaignId === "all" ? "All Campaigns (Aggregate)" : campaign.name}
          </span>
          <div className="ml-auto flex items-center gap-4 text-xs text-muted-foreground">
            <span>{adsets.length} ad sets</span>
            {totalBudget > 0 && <span className="font-medium text-foreground">${totalBudget}/day budget</span>}
          </div>
        </div>
      )}

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard label="Spend" value={insights?.spend ?? null} prefix="$" loading={campaignLoading && hasToken} color="blue" />
        <KpiCard label="Impressions" value={insights?.impressions ?? null} loading={campaignLoading && hasToken} />
        <KpiCard label="Clicks" value={insights?.clicks ?? null} loading={campaignLoading && hasToken} />
        <KpiCard label="CTR" value={insights?.ctr ?? null} suffix="%" loading={campaignLoading && hasToken} color={insights?.ctr > 1 ? "green" : "default"} />
        <KpiCard label="CPC" value={insights?.cpc ?? null} prefix="$" loading={campaignLoading && hasToken} color={insights?.cpc < 1 ? "green" : "default"} />
        <KpiCard label="CPM" value={insights?.cpm ?? null} prefix="$" loading={campaignLoading && hasToken} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Reach" value={insights?.reach ?? null} loading={campaignLoading && hasToken} />
        <KpiCard label="Frequency" value={insights?.frequency ?? null} loading={campaignLoading && hasToken} color={insights?.frequency > 3 ? "yellow" : "default"} sub={insights?.frequency > 3 ? "Consider rotating creatives" : undefined} />
        <KpiCard label="Purchases" value={insights?.purchases ?? null} loading={campaignLoading && hasToken} color="green" />
        <KpiCard label="Cost / Purchase" value={insights?.costPerPurchase ?? null} prefix="$" loading={campaignLoading && hasToken} color={insights?.costPerPurchase && insights.costPerPurchase < 40 ? "green" : "default"} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-semibold">Spend by Ad Set</div>
            <TrendingUp size={14} className="text-muted-foreground" />
          </div>
          {adsetsLoading && hasToken ? (
            <div className="h-44 shimmer rounded" />
          ) : spendChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={176}>
              <BarChart data={spendChart} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px", fontSize: "12px" }} formatter={(val: any) => [`$${Number(val).toFixed(2)}`, "Spend"]} />
                <Bar dataKey="spend" radius={[3, 3, 0, 0]}>
                  {spendChart.map((entry: any, i: number) => <Cell key={i} fill={entry.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-44 flex items-center justify-center text-xs text-muted-foreground">No spend data for this period</div>
          )}
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-semibold">Clicks by Ad Set</div>
            <TrendingUp size={14} className="text-muted-foreground" />
          </div>
          {adsetsLoading && hasToken ? (
            <div className="h-44 shimmer rounded" />
          ) : spendChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={176}>
              <BarChart data={spendChart} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px", fontSize: "12px" }} />
                <Bar dataKey="clicks" radius={[3, 3, 0, 0]}>
                  {spendChart.map((entry: any, i: number) => <Cell key={i} fill={entry.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-44 flex items-center justify-center text-xs text-muted-foreground">No click data for this period</div>
          )}
        </div>
      </div>

      {/* No-token state */}
      {!hasToken && (
        <div className="bg-card border border-border rounded-lg p-8 text-center">
          <div className="text-4xl mb-3">📊</div>
          <div className="text-sm font-semibold text-foreground mb-1">No live data yet</div>
          <div className="text-xs text-muted-foreground">Connect your Meta API token in the sidebar to load performance metrics</div>
        </div>
      )}
    </div>
  );
}
