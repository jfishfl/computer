import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useApiUrl } from "@/hooks/useApi";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { RefreshCw, Trash2, Wifi, Database, Clock, AlertCircle, CheckCircle, Info, AlertTriangle } from "lucide-react";

function fmt(ts: number) {
  return new Date(ts).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
}

function fmtUptime(secs: number) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

const LEVEL_STYLES: Record<string, { bg: string; text: string; border: string; icon: any }> = {
  info:    { bg: "bg-blue-500/5",   text: "text-blue-400",   border: "border-blue-500/20",   icon: Info },
  success: { bg: "bg-green-500/5",  text: "text-green-400",  border: "border-green-500/20",  icon: CheckCircle },
  warn:    { bg: "bg-yellow-500/5", text: "text-yellow-400", border: "border-yellow-500/20", icon: AlertTriangle },
  error:   { bg: "bg-red-500/5",    text: "text-red-400",    border: "border-red-500/20",    icon: AlertCircle },
};

export default function Logs() {
  const url = useApiUrl();
  const [filter, setFilter] = useState<"all" | "error" | "warn" | "success" | "info">("all");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data, isLoading, dataUpdatedAt } = useQuery({
    queryKey: ["/api/logs"],
    queryFn: () => apiRequest("GET", url("/api/logs")).then(r => r.json()),
    refetchInterval: autoRefresh ? 5000 : false,
  });

  const clearLogs = useMutation({
    mutationFn: () => apiRequest("POST", url("/api/logs/clear")),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/logs"] }); toast({ title: "Logs cleared" }); },
  });

  const clearCache = useMutation({
    mutationFn: () => apiRequest("POST", url("/api/cache/clear")),
    onSuccess: () => { qc.invalidateQueries(); toast({ title: "Cache cleared", description: "Fetching fresh data from Meta..." }); },
  });

  const logs: any[] = data?.logs || [];
  const cache = data?.cache || { entries: 0 };
  const uptime = data?.uptime || 0;

  const filtered = filter === "all" ? logs : logs.filter((l: any) => l.level === filter);
  const errorCount = logs.filter((l: any) => l.level === "error").length;
  const apiCalls = logs.filter((l: any) => l.msg?.startsWith("→")).length;
  const cacheHits = logs.filter((l: any) => l.msg?.startsWith("⚡")).length;

  return (
    <div className="p-4 md:p-6 space-y-5 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div>
          <h1 className="text-lg font-bold">System Logs</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Live API call log and cache status</p>
        </div>
        <div className="sm:ml-auto flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setAutoRefresh(a => !a)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
              autoRefresh
                ? "bg-green-500/10 border-green-500/30 text-green-400"
                : "bg-secondary border-border text-muted-foreground"
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${autoRefresh ? "bg-green-400 animate-pulse" : "bg-zinc-500"}`} />
            {autoRefresh ? "Live" : "Paused"}
          </button>
          <Button size="sm" variant="outline" className="text-xs h-8"
            onClick={() => qc.invalidateQueries({ queryKey: ["/api/logs"] })}>
            <RefreshCw size={12} className="mr-1.5" />Refresh
          </Button>
          <Button size="sm" variant="outline" className="text-xs h-8 border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10"
            onClick={() => clearCache.mutate()} disabled={clearCache.isPending}>
            <Database size={12} className="mr-1.5" />Clear Cache
          </Button>
          <Button size="sm" variant="outline" className="text-xs h-8 border-red-500/30 text-red-400 hover:bg-red-500/10"
            onClick={() => clearLogs.mutate()} disabled={clearLogs.isPending}>
            <Trash2 size={12} className="mr-1.5" />Clear Logs
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Server Uptime", value: fmtUptime(uptime), icon: Clock, color: "text-blue-400" },
          { label: "Cache Entries", value: cache.entries, icon: Database, color: "text-purple-400" },
          { label: "API Calls (session)", value: apiCalls, icon: Wifi, color: "text-green-400" },
          { label: "Errors", value: errorCount, icon: AlertCircle, color: errorCount > 0 ? "text-red-400" : "text-muted-foreground" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-card border border-border rounded-lg p-3 flex items-center gap-3">
            <Icon size={16} className={color} />
            <div>
              <div className="text-xs text-muted-foreground">{label}</div>
              <div className={`text-sm font-bold ${color}`}>{value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Cache hit rate */}
      {(apiCalls + cacheHits) > 0 && (
        <div className="bg-card border border-border rounded-lg p-3 flex items-center gap-4 text-xs">
          <span className="text-muted-foreground">Cache hit rate:</span>
          <div className="flex-1 bg-secondary rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all"
              style={{ width: `${Math.round((cacheHits / (cacheHits + apiCalls)) * 100)}%` }}
            />
          </div>
          <span className="font-mono font-medium text-green-400">
            {Math.round((cacheHits / (cacheHits + apiCalls)) * 100)}%
          </span>
          <span className="text-muted-foreground">{cacheHits} hits / {apiCalls} live calls</span>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex items-center gap-1 border-b border-border pb-2">
        {(["all", "error", "warn", "success", "info"] as const).map(f => (
          <button key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-md text-xs font-medium capitalize transition-colors ${
              filter === f ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
            }`}>
            {f}
            {f === "error" && errorCount > 0 && (
              <span className="ml-1.5 bg-red-500/20 text-red-400 px-1 rounded text-[10px]">{errorCount}</span>
            )}
          </button>
        ))}
        <span className="ml-auto text-xs text-muted-foreground">
          {dataUpdatedAt ? `Updated ${new Date(dataUpdatedAt).toLocaleTimeString()}` : ""}
        </span>
      </div>

      {/* Log entries */}
      <div className="bg-card border border-border rounded-lg overflow-hidden font-mono text-xs">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Loading logs...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No log entries yet. Navigate around the dashboard to generate API calls.</div>
        ) : (
          <div className="divide-y divide-border/40 max-h-[60vh] overflow-y-auto">
            {filtered.map((log: any) => {
              const style = LEVEL_STYLES[log.level] || LEVEL_STYLES.info;
              const Icon = style.icon;
              return (
                <div key={log.id} className={`flex items-start gap-3 px-4 py-2.5 ${log.level === "error" ? "bg-red-500/5" : ""}`}>
                  <span className="text-muted-foreground shrink-0 w-16">{fmt(log.ts)}</span>
                  <Icon size={12} className={`${style.text} shrink-0 mt-0.5`} />
                  <div className="flex-1 min-w-0">
                    <span className={`${style.text}`}>{log.msg}</span>
                    {log.detail && (
                      <span className="text-muted-foreground ml-2">{log.detail}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
