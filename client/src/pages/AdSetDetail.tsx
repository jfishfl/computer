import { useState } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useApiUrl } from "@/hooks/useApi";
import { Link } from "wouter";
import DatePresetPicker from "@/components/DatePresetPicker";
import { ChevronLeft } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

function fmt(n: number | null | undefined, prefix = "", suffix = "", decimals = 2) {
  if (n === null || n === undefined) return "—";
  return `${prefix}${n.toLocaleString(undefined, { maximumFractionDigits: decimals })}${suffix}`;
}

export default function AdSetDetail() {
  const url = useApiUrl();
  const { id } = useParams<{ id: string }>();
  const [datePreset, setDatePreset] = useState("last_7d");

  const { data: tokenData } = useQuery({ queryKey: ["/api/token"], queryFn: () => apiRequest("GET", url("/api/token")).then(r => r.json()) });
  const hasToken = tokenData?.hasToken;

  // Fetch the ad set's own metadata from Meta
  const { data: adsetMeta } = useQuery({
    queryKey: ["/api/adset-meta", id],
    queryFn: () => fetch(`https://graph.facebook.com/v19.0/${id}?fields=id,name,status,daily_budget&access_token=`).then(r => r.json()).catch(() => null),
    enabled: false, // we'll rely on the ads endpoint below for the name
  });

  // Try to figure out the campaign from the ad set — fetch ads directly
  const { data, isLoading } = useQuery({
    queryKey: ["/api/adset-ads-direct", id, datePreset],
    queryFn: async () => {
      // We have the adset ID but need a campaign ID for the new route
      // Fall back to the old direct adset/ads route which still exists
      const res = await apiRequest("GET", url(`/api/adsets/${id}/ads?date_preset=${datePreset}`)).then(r => r.json());
      return res;
    },
    enabled: hasToken && !!id,
  });

  const ads = data?.ads || [];
  const sorted = [...ads].sort((a: any, b: any) => (b.insights?.ctr || 0) - (a.insights?.ctr || 0));
  const chartData = sorted.slice(0, 10).map((ad: any) => ({
    name: ad.label?.replace("ad-creative-", "").replace(".png", "") || ad.label,
    ctr: parseFloat((ad.insights?.ctr || 0).toFixed(2)),
    clicks: ad.insights?.clicks || 0,
    spend: parseFloat((ad.insights?.spend || 0).toFixed(2)),
  }));

  // Extract adset name from the first ad
  const adsetName = ads[0]?.adset || id;

  return (
    <div className="p-4 md:p-6 space-y-5 pb-10">
      <div className="flex items-center gap-2">
        <Link href="/adsets">
          <button className="flex items-center gap-1 text-muted-foreground hover:text-foreground text-xs transition-colors">
            <ChevronLeft size={14} />
            Ad Sets
          </button>
        </Link>
        <span className="text-muted-foreground text-xs">/</span>
        <span className="text-sm font-medium truncate max-w-xs">{adsetName}</span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div>
          <h1 className="text-lg font-bold">{adsetName}</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{ads.length} ads · Ad set {id}</p>
        </div>
        <div className="sm:ml-auto">
          <DatePresetPicker value={datePreset} onChange={setDatePreset} />
        </div>
      </div>

      {chartData.length > 0 && (
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="text-sm font-semibold mb-4">CTR by Creative (top 10)</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 20, left: 80, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={80} />
              <Tooltip
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px", fontSize: "12px" }}
                formatter={(v: any) => [`${v}%`, "CTR"]}
              />
              <Bar dataKey="ctr" fill="hsl(var(--primary))" radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <div className="text-sm font-semibold">Ad Performance</div>
          {isLoading && <div className="text-xs text-muted-foreground">Loading...</div>}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase">Creative</th>
                <th className="text-right px-3 py-2.5 text-xs font-medium text-muted-foreground uppercase">Spend</th>
                <th className="text-right px-3 py-2.5 text-xs font-medium text-muted-foreground uppercase">Impr.</th>
                <th className="text-right px-3 py-2.5 text-xs font-medium text-muted-foreground uppercase">Clicks</th>
                <th className="text-right px-3 py-2.5 text-xs font-medium text-muted-foreground uppercase">CTR</th>
                <th className="text-right px-3 py-2.5 text-xs font-medium text-muted-foreground uppercase">CPC</th>
                <th className="text-right px-3 py-2.5 text-xs font-medium text-muted-foreground uppercase">CPM</th>
                <th className="text-right px-3 py-2.5 text-xs font-medium text-muted-foreground uppercase">Reach</th>
              </tr>
            </thead>
            <tbody>
              {(isLoading ? Array(5).fill(null) : sorted).map((ad: any, i: number) => (
                <tr key={ad?.id || i} className="border-b border-border/40 hover:bg-secondary/20 transition-colors"
                  data-testid={`row-ad-${ad?.id || i}`}>
                  {isLoading ? (
                    <><td colSpan={8} className="px-4 py-3"><div className="shimmer h-4 rounded w-full" /></td></>
                  ) : (
                    <>
                      <td className="px-4 py-3 font-mono text-xs text-foreground">{ad.label}</td>
                      <td className="px-3 py-3 text-right tabular">{fmt(ad.insights?.spend, "$")}</td>
                      <td className="px-3 py-3 text-right tabular text-muted-foreground">{fmt(ad.insights?.impressions, "", "", 0)}</td>
                      <td className="px-3 py-3 text-right tabular">{fmt(ad.insights?.clicks, "", "", 0)}</td>
                      <td className={`px-3 py-3 text-right tabular font-medium ${ad.insights?.ctr > 1 ? "text-green-400" : ad.insights?.ctr < 0.5 && ad.insights?.ctr > 0 ? "text-red-400" : ""}`}>
                        {fmt(ad.insights?.ctr, "", "%")}
                      </td>
                      <td className="px-3 py-3 text-right tabular">{fmt(ad.insights?.cpc, "$")}</td>
                      <td className="px-3 py-3 text-right tabular text-muted-foreground">{fmt(ad.insights?.cpm, "$")}</td>
                      <td className="px-3 py-3 text-right tabular text-muted-foreground">{fmt(ad.insights?.reach, "", "", 0)}</td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {!hasToken && (
        <div className="bg-card border border-border rounded-lg p-6 text-center text-sm text-muted-foreground">
          Connect your API token to see per-ad performance data
        </div>
      )}
    </div>
  );
}
