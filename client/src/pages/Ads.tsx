import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import DatePresetPicker from "@/components/DatePresetPicker";
import CampaignPicker from "@/components/CampaignPicker";
import { Search, ArrowUpDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

function fmt(n: number | null | undefined, prefix = "", suffix = "", decimals = 2) {
  if (n === null || n === undefined) return "—";
  return `${prefix}${n.toLocaleString(undefined, { maximumFractionDigits: decimals })}${suffix}`;
}

function shortName(name: string) {
  return name.replace(/numerology blueprint\s*[-–]\s*/i, "").replace(/^(static|intl)\s*[-–]\s*/i, "").trim();
}

type SortKey = "spend" | "impressions" | "clicks" | "ctr" | "cpc" | "cpm" | "reach";

export default function Ads() {
  const [datePreset, setDatePreset] = useState("last_7d");
  const [campaignId, setCampaignId] = useState("");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("ctr");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [filterAdset, setFilterAdset] = useState("all");

  const { data: tokenData } = useQuery({ queryKey: ["/api/token"], queryFn: () => apiRequest("GET", "/api/token").then(r => r.json()) });
  const hasToken = tokenData?.hasToken;

  // Fetch ad sets for the filter dropdown
  const { data: adsetsData } = useQuery({
    queryKey: ["/api/campaigns", campaignId, "adsets", "filter"],
    queryFn: () => apiRequest("GET", `/api/campaigns/${campaignId}/adsets?date_preset=last_7d`).then(r => r.json()),
    enabled: hasToken && !!campaignId,
  });
  const adsetList: any[] = adsetsData?.adsets || [];

  // Fetch all ads for the selected campaign by fetching each ad set's ads
  const { data: allAdsData, isLoading } = useQuery({
    queryKey: ["/api/campaigns", campaignId, "all-ads", datePreset],
    queryFn: async () => {
      // Get ad sets first (use cached), then fetch all ads in parallel
      const asRes = await apiRequest("GET", `/api/campaigns/${campaignId}/adsets?date_preset=${datePreset}`).then(r => r.json());
      const adsetItems: any[] = asRes.adsets || [];
      const adsPerAdset = await Promise.all(
        adsetItems.map((a: any) =>
          apiRequest("GET", `/api/campaigns/${campaignId}/adsets/${a.id}/ads?date_preset=${datePreset}`)
            .then(r => r.json())
            .then(d => (d.ads || []).map((ad: any) => ({ ...ad, adset: a.name, adsetId: a.id })))
        )
      );
      return { ads: adsPerAdset.flat() };
    },
    enabled: hasToken && !!campaignId,
  });

  const ads: any[] = allAdsData?.ads || [];

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  const filtered = useMemo(() => {
    let result = ads.filter((ad: any) => {
      const matchSearch = !search || ad.label?.toLowerCase().includes(search.toLowerCase()) || ad.adset?.toLowerCase().includes(search.toLowerCase());
      const matchAdset = filterAdset === "all" || ad.adsetId === filterAdset;
      return matchSearch && matchAdset;
    });
    return [...result].sort((a: any, b: any) => {
      const av = a.insights?.[sortKey] || 0;
      const bv = b.insights?.[sortKey] || 0;
      return sortDir === "desc" ? bv - av : av - bv;
    });
  }, [ads, search, filterAdset, sortKey, sortDir]);

  const SortHeader = ({ label, k }: { label: string; k: SortKey }) => (
    <th className="text-right px-3 py-2.5 text-xs font-medium text-muted-foreground uppercase cursor-pointer hover:text-foreground transition-colors select-none"
      onClick={() => toggleSort(k)}>
      <span className="inline-flex items-center gap-1 justify-end">
        {label}
        <ArrowUpDown size={10} className={sortKey === k ? "text-primary" : ""} />
      </span>
    </th>
  );

  return (
    <div className="p-4 md:p-6 space-y-5 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div>
          <h1 className="text-lg font-bold">All Ads</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {ads.length > 0 ? `${ads.length} ads across ${adsetList.length} ad sets` : "Select a campaign"}
          </p>
        </div>
        <div className="sm:ml-auto flex items-center gap-2 flex-wrap">
          <CampaignPicker value={campaignId} onChange={(id) => { setCampaignId(id); setFilterAdset("all"); }} includeAll />
          <DatePresetPicker value={datePreset} onChange={setDatePreset} />
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            data-testid="input-search"
            placeholder="Search by creative name or ad set..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 text-sm bg-card border-border h-9"
          />
        </div>
        <select
          data-testid="select-adset-filter"
          value={filterAdset}
          onChange={(e) => setFilterAdset(e.target.value)}
          className="bg-card border border-border rounded-md px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="all">All Ad Sets</option>
          {adsetList.map((a: any) => (
            <option key={a.id} value={a.id}>{shortName(a.name)}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-card z-10">
              <tr className="border-b border-border">
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase">Creative</th>
                <th className="text-left px-3 py-2.5 text-xs font-medium text-muted-foreground uppercase">Ad Set</th>
                <SortHeader label="Spend" k="spend" />
                <SortHeader label="Impr." k="impressions" />
                <SortHeader label="Clicks" k="clicks" />
                <SortHeader label="CTR" k="ctr" />
                <SortHeader label="CPC" k="cpc" />
                <SortHeader label="CPM" k="cpm" />
                <SortHeader label="Reach" k="reach" />
              </tr>
            </thead>
            <tbody>
              {isLoading && hasToken ? (
                Array(8).fill(null).map((_, i) => (
                  <tr key={i} className="border-b border-border/40">
                    <td colSpan={9} className="px-4 py-2.5"><Skeleton className="h-4 w-full" /></td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-xs text-muted-foreground">
                    {hasToken && campaignId ? "No ads found." : "Select a campaign above."}
                  </td>
                </tr>
              ) : filtered.map((ad: any) => {
                const ins = ad.insights;
                const isTopCtr = ins?.ctr && ins.ctr > 1.5;
                const isPoorCtr = ins?.ctr && ins.ctr < 0.3;
                return (
                  <tr key={ad.id} className="border-b border-border/40 hover:bg-secondary/20 transition-colors"
                    data-testid={`row-ad-${ad.id}`}>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        {isTopCtr && <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" title="Top performer" />}
                        {isPoorCtr && <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" title="Low CTR" />}
                        {!isTopCtr && !isPoorCtr && <span className="w-1.5 h-1.5 shrink-0" />}
                        <span className="font-mono text-xs text-foreground">{ad.label}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">{shortName(ad.adset || "")}</td>
                    <td className="px-3 py-2.5 text-right tabular font-medium">{fmt(ins?.spend, "$")}</td>
                    <td className="px-3 py-2.5 text-right tabular text-muted-foreground text-xs">{fmt(ins?.impressions, "", "", 0)}</td>
                    <td className="px-3 py-2.5 text-right tabular">{fmt(ins?.clicks, "", "", 0)}</td>
                    <td className={`px-3 py-2.5 text-right tabular font-semibold ${isTopCtr ? "text-green-400" : isPoorCtr ? "text-red-400" : ""}`}>
                      {fmt(ins?.ctr, "", "%")}
                    </td>
                    <td className={`px-3 py-2.5 text-right tabular ${ins?.cpc > 0 && ins.cpc < 0.8 ? "text-green-400" : ""}`}>
                      {fmt(ins?.cpc, "$")}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular text-muted-foreground">{fmt(ins?.cpm, "$")}</td>
                    <td className="px-3 py-2.5 text-right tabular text-muted-foreground text-xs">{fmt(ins?.reach, "", "", 0)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2 border-t border-border text-xs text-muted-foreground">
          {filtered.length} ads {(search || filterAdset !== "all") && ads.length > 0 ? `(filtered from ${ads.length})` : ""}
        </div>
      </div>
    </div>
  );
}
