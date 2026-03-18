import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import DatePresetPicker from "@/components/DatePresetPicker";
import StatusBadge from "@/components/StatusBadge";
import CampaignPicker from "@/components/CampaignPicker";
import { useToast } from "@/hooks/use-toast";
import { Play, Pause, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

function fmt(n: number | null | undefined, prefix = "", suffix = "", decimals = 2) {
  if (n === null || n === undefined) return "—";
  return `${prefix}${n.toLocaleString(undefined, { maximumFractionDigits: decimals })}${suffix}`;
}

function shortName(name: string) {
  return name.replace(/numerology blueprint\s*[-–]\s*/i, "").replace(/^(static|intl)\s*[-–]\s*/i, "").trim();
}

export default function AdSets() {
  const [datePreset, setDatePreset] = useState("last_7d");
  const [campaignId, setCampaignId] = useState("");
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: tokenData } = useQuery({ queryKey: ["/api/token"], queryFn: () => apiRequest("GET", "/api/token").then(r => r.json()) });
  const hasToken = tokenData?.hasToken;

  const { data, isLoading } = useQuery({
    queryKey: ["/api/campaigns", campaignId, "adsets", datePreset],
    queryFn: () => apiRequest("GET", `/api/campaigns/${campaignId}/adsets?date_preset=${datePreset}`).then(r => r.json()),
    enabled: hasToken && !!campaignId,
  });

  const adsets = data?.adsets || [];

  const toggleMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiRequest("POST", `/api/adsets/${id}/toggle`, { status }).then(r => r.json()),
    onSuccess: (_, { status }) => {
      toast({ title: `Ad set ${status === "ACTIVE" ? "activated" : "paused"}` });
      qc.invalidateQueries({ queryKey: ["/api/campaigns", campaignId, "adsets"] });
    },
  });

  const sorted = [...adsets].sort((a: any, b: any) => (b.insights?.spend || 0) - (a.insights?.spend || 0));
  const totalBudget = adsets.reduce((s: number, a: any) => s + (a.budget || 0), 0);

  return (
    <div className="p-4 md:p-6 space-y-5 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div>
          <h1 className="text-lg font-bold">Ad Sets</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {adsets.length > 0 ? `${adsets.length} ad sets${totalBudget > 0 ? ` · $${totalBudget}/day total budget` : ""}` : "Select a campaign"}
          </p>
        </div>
        <div className="sm:ml-auto flex items-center gap-2 flex-wrap">
          <CampaignPicker value={campaignId} onChange={setCampaignId} includeAll />
          <DatePresetPicker value={datePreset} onChange={setDatePreset} />
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Ad Set</th>
                {campaignId === "all" && <th className="text-left px-3 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Campaign</th>}
                <th className="text-right px-3 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Budget</th>
                <th className="text-right px-3 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Spend</th>
                <th className="text-right px-3 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Impr.</th>
                <th className="text-right px-3 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Clicks</th>
                <th className="text-right px-3 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">CTR</th>
                <th className="text-right px-3 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">CPC</th>
                <th className="text-right px-3 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">CPM</th>
                <th className="text-right px-3 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Conv.</th>
                <th className="text-right px-3 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">CPA</th>
                <th className="text-center px-3 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</th>
                <th className="px-3 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading && hasToken ? (
                Array(5).fill(null).map((_, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td colSpan={12} className="px-4 py-3"><Skeleton className="h-5 w-full" /></td>
                  </tr>
                ))
              ) : sorted.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-4 py-8 text-center text-xs text-muted-foreground">
                    {hasToken ? "No ad sets found for this campaign." : "Connect your token to load ad sets."}
                  </td>
                </tr>
              ) : sorted.map((adset: any) => {
                const ins = adset.insights;
                const isActive = adset.status === "ACTIVE";
                return (
                  <tr key={adset.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors"
                    data-testid={`row-adset-${adset.id}`}>
                    <td className="px-4 py-3">
                      <div>
                        <div className="font-medium text-foreground text-sm">{shortName(adset.name)}</div>
                        <div className="text-xs text-muted-foreground font-mono mt-0.5">{adset.id}</div>
                      </div>
                    </td>
                    {campaignId === "all" && (
                      <td className="px-3 py-3 text-xs text-muted-foreground max-w-[120px] truncate">
                        {adset.campaignName ? shortName(adset.campaignName) : "—"}
                      </td>
                    )}
                    <td className="px-3 py-3 text-right tabular text-muted-foreground text-xs">
                      {adset.budget ? `$${adset.budget}/day` : "—"}
                    </td>
                    <td className="px-3 py-3 text-right tabular font-medium">{fmt(ins?.spend, "$")}</td>
                    <td className="px-3 py-3 text-right tabular text-muted-foreground">{fmt(ins?.impressions, "", "", 0)}</td>
                    <td className="px-3 py-3 text-right tabular">{fmt(ins?.clicks, "", "", 0)}</td>
                    <td className={`px-3 py-3 text-right tabular font-medium ${ins?.ctr > 1 ? "text-green-400" : ins?.ctr < 0.5 && ins?.ctr > 0 ? "text-red-400" : ""}`}>
                      {fmt(ins?.ctr, "", "%")}
                    </td>
                    <td className={`px-3 py-3 text-right tabular ${ins?.cpc > 0 && ins.cpc < 1 ? "text-green-400" : ""}`}>
                      {fmt(ins?.cpc, "$")}
                    </td>
                    <td className="px-3 py-3 text-right tabular text-muted-foreground">{fmt(ins?.cpm, "$")}</td>
                    <td className={`px-3 py-3 text-right tabular font-medium ${ins?.purchases > 0 ? "text-green-400" : ""}`}>
                      {fmt(ins?.purchases, "", "", 0)}
                    </td>
                    <td className={`px-3 py-3 text-right tabular ${ins?.costPerPurchase && ins.costPerPurchase < 40 ? "text-green-400" : ""}`}>
                      {fmt(ins?.costPerPurchase, "$")}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <StatusBadge status={adset.status || "PAUSED"} />
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1">
                        {hasToken && (
                          <Button size="sm" variant="ghost"
                            className={`h-7 w-7 p-0 ${isActive ? "text-muted-foreground hover:text-red-400" : "text-muted-foreground hover:text-green-400"}`}
                            onClick={() => toggleMutation.mutate({ id: adset.id, status: isActive ? "PAUSED" : "ACTIVE" })}
                            title={isActive ? "Pause" : "Activate"}
                            data-testid={`button-toggle-adset-${adset.id}`}>
                            {isActive ? <Pause size={13} /> : <Play size={13} />}
                          </Button>
                        )}
                        <Link href={`/adsets/${adset.id}`}>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                            data-testid={`link-adset-${adset.id}`}>
                            <ChevronRight size={14} />
                          </Button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
