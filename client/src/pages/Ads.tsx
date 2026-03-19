import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import DatePresetPicker from "@/components/DatePresetPicker";
import CampaignPicker from "@/components/CampaignPicker";
import { Search, ArrowUpDown, X, ExternalLink, Image as ImageIcon, Play } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

function fmt(n: number | null | undefined, prefix = "", suffix = "", decimals = 2) {
  if (n === null || n === undefined) return "—";
  return `${prefix}${n.toLocaleString(undefined, { maximumFractionDigits: decimals })}${suffix}`;
}

function shortName(name: string) {
  return name.replace(/numerology blueprint\s*[-–]\s*/i, "").replace(/^(static|intl)\s*[-–]\s*/i, "").trim();
}

type SortKey = "spend" | "impressions" | "clicks" | "ctr" | "cpc" | "cpm" | "reach";

// ── Ad Thumbnail ─────────────────────────────────────────────────────────────
function AdThumbnail({
  ad,
  campaignId,
  onClick,
}: {
  ad: any;
  campaignId: string;
  onClick: () => void;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["/api/creative", ad.id],
    queryFn: () =>
      apiRequest(
        "GET",
        `/api/campaigns/${campaignId}/adsets/${ad.adsetId}/ads/${ad.id}/creative`
      ).then((r) => r.json()),
    staleTime: 15 * 60 * 1000, // 15 min — creatives don't change often
    retry: false,
  });

  const thumb = data?.thumbnailUrl;

  return (
    <button
      onClick={onClick}
      className="w-9 h-9 rounded border border-border overflow-hidden shrink-0 flex items-center justify-center bg-secondary hover:border-primary/60 transition-all group relative"
      title="Preview ad creative"
    >
      {isLoading ? (
        <Skeleton className="w-full h-full" />
      ) : thumb ? (
        <>
          <img
            src={thumb}
            alt="ad thumbnail"
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
            <Play size={12} className="text-white fill-white" />
          </div>
        </>
      ) : (
        <ImageIcon size={14} className="text-muted-foreground group-hover:text-primary transition-colors" />
      )}
    </button>
  );
}

// ── Ad Preview Modal ──────────────────────────────────────────────────────────
function AdPreviewModal({
  ad,
  campaignId,
  open,
  onClose,
}: {
  ad: any | null;
  campaignId: string;
  open: boolean;
  onClose: () => void;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["/api/creative", ad?.id],
    queryFn: () =>
      apiRequest(
        "GET",
        `/api/campaigns/${campaignId}/adsets/${ad.adsetId}/ads/${ad.id}/creative`
      ).then((r) => r.json()),
    enabled: open && !!ad,
    staleTime: 15 * 60 * 1000,
    retry: false,
  });

  if (!ad) return null;
  const ins = ad.insights;
  const thumb = data?.thumbnailUrl;
  const isTopCtr = ins?.ctr && ins.ctr > 1.5;
  const isPoorCtr = ins?.ctr && ins.ctr < 0.3;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg bg-card border-border p-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-border">
          <DialogTitle className="text-sm font-semibold flex items-center gap-2 leading-tight">
            <span className="font-mono text-xs text-muted-foreground truncate max-w-xs">{ad.label}</span>
            {isTopCtr && <Badge className="text-xs bg-green-500/15 text-green-400 border-green-500/30">Top performer</Badge>}
            {isPoorCtr && <Badge className="text-xs bg-red-500/15 text-red-400 border-red-500/30">Low CTR</Badge>}
          </DialogTitle>
          <p className="text-xs text-muted-foreground">{shortName(ad.adset || "")}</p>
        </DialogHeader>

        <div className="flex flex-col sm:flex-row gap-0">
          {/* Creative preview */}
          <div className="sm:w-48 shrink-0 flex items-center justify-center bg-black/30 min-h-[180px]">
            {isLoading ? (
              <Skeleton className="w-full h-48" />
            ) : thumb ? (
              <img
                src={thumb}
                alt="Ad creative"
                className="w-full object-contain max-h-64"
              />
            ) : (
              <div className="flex flex-col items-center gap-2 py-12 px-6 text-center">
                <ImageIcon size={28} className="text-muted-foreground/40" />
                <p className="text-xs text-muted-foreground">No preview available</p>
                <p className="text-xs text-muted-foreground/60">Thumbnail may not be accessible</p>
              </div>
            )}
          </div>

          {/* Metrics */}
          <div className="flex-1 p-5 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <MetricCell label="Spend" value={fmt(ins?.spend, "$")} highlight={false} />
              <MetricCell label="CTR" value={fmt(ins?.ctr, "", "%")}
                highlight={isTopCtr ? "green" : isPoorCtr ? "red" : false} />
              <MetricCell label="Impressions" value={fmt(ins?.impressions, "", "", 0)} highlight={false} />
              <MetricCell label="Clicks" value={fmt(ins?.clicks, "", "", 0)} highlight={false} />
              <MetricCell label="CPC" value={fmt(ins?.cpc, "$")}
                highlight={ins?.cpc > 0 && ins.cpc < 0.8 ? "green" : false} />
              <MetricCell label="CPM" value={fmt(ins?.cpm, "$")} highlight={false} />
              <MetricCell label="Reach" value={fmt(ins?.reach, "", "", 0)} highlight={false} />
              <MetricCell label="Frequency" value={fmt(ins?.frequency)} highlight={false} />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <div
                className={`w-2 h-2 rounded-full ${ad.status === "ACTIVE" ? "bg-green-400" : "bg-yellow-400"}`}
              />
              <span className="text-xs text-muted-foreground capitalize">{(ad.status || "").toLowerCase()}</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function MetricCell({ label, value, highlight }: { label: string; value: string; highlight: false | "green" | "red" }) {
  return (
    <div className="bg-secondary/40 rounded-md px-3 py-2">
      <div className="text-xs text-muted-foreground mb-0.5">{label}</div>
      <div
        className={`text-sm font-semibold tabular-nums ${
          highlight === "green" ? "text-green-400" : highlight === "red" ? "text-red-400" : "text-foreground"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

// ── Main Ads page ─────────────────────────────────────────────────────────────
export default function Ads() {
  const [datePreset, setDatePreset] = useState("last_7d");
  const [campaignId, setCampaignId] = useState("");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("ctr");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [filterAdset, setFilterAdset] = useState("all");
  const [previewAd, setPreviewAd] = useState<any | null>(null);

  const { data: tokenData } = useQuery({ queryKey: ["/api/token"], queryFn: () => apiRequest("GET", "/api/token").then(r => r.json()) });
  const hasToken = tokenData?.hasToken;

  // Fetch ad sets for the filter dropdown
  const { data: adsetsData } = useQuery({
    queryKey: ["/api/campaigns", campaignId, "adsets", "filter"],
    queryFn: () => apiRequest("GET", `/api/campaigns/${campaignId}/adsets?date_preset=last_7d`).then(r => r.json()),
    enabled: hasToken && !!campaignId,
  });
  const adsetList: any[] = adsetsData?.adsets || [];

  // Fetch all ads for the selected campaign
  const { data: allAdsData, isLoading } = useQuery({
    queryKey: ["/api/campaigns", campaignId, "all-ads", datePreset],
    queryFn: async () => {
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
                <th className="text-left px-3 py-2.5 text-xs font-medium text-muted-foreground uppercase w-10"></th>
                <th className="text-left px-3 py-2.5 text-xs font-medium text-muted-foreground uppercase">Creative</th>
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
                    <td className="px-3 py-2.5"><Skeleton className="h-9 w-9 rounded" /></td>
                    <td colSpan={9} className="px-3 py-2.5"><Skeleton className="h-4 w-full" /></td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-xs text-muted-foreground">
                    {hasToken && campaignId ? "No ads found." : "Select a campaign above."}
                  </td>
                </tr>
              ) : filtered.map((ad: any) => {
                const ins = ad.insights;
                const isTopCtr = ins?.ctr && ins.ctr > 1.5;
                const isPoorCtr = ins?.ctr && ins.ctr < 0.3;
                return (
                  <tr
                    key={ad.id}
                    className="border-b border-border/40 hover:bg-secondary/20 transition-colors cursor-pointer"
                    data-testid={`row-ad-${ad.id}`}
                    onClick={() => setPreviewAd(ad)}
                  >
                    {/* Thumbnail */}
                    <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                      <AdThumbnail
                        ad={ad}
                        campaignId={campaignId}
                        onClick={() => setPreviewAd(ad)}
                      />
                    </td>
                    <td className="px-3 py-2.5">
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
          {filtered.length} ads {(search || filterAdset !== "all") && ads.length > 0 ? `(filtered from ${ads.length})` : ""} · Click any row to preview creative
        </div>
      </div>

      {/* Ad Preview Modal */}
      <AdPreviewModal
        ad={previewAd}
        campaignId={campaignId}
        open={!!previewAd}
        onClose={() => setPreviewAd(null)}
      />
    </div>
  );
}
