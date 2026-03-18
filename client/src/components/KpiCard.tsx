interface KpiCardProps {
  label: string;
  value: string | number | null;
  sub?: string;
  delta?: number | null;
  prefix?: string;
  suffix?: string;
  color?: "default" | "green" | "red" | "blue" | "yellow";
  loading?: boolean;
}

export default function KpiCard({ label, value, sub, delta, prefix = "", suffix = "", color = "default", loading }: KpiCardProps) {
  const colorMap = {
    default: "text-foreground",
    green: "text-green-400",
    red: "text-red-400",
    blue: "text-blue-400",
    yellow: "text-yellow-400",
  };

  return (
    <div className="bg-card border border-border rounded-lg p-4 flex flex-col gap-1" data-testid={`kpi-${label.toLowerCase().replace(/\s+/g, '-')}`}>
      <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</div>
      {loading ? (
        <div className="shimmer h-8 rounded w-3/4 mt-1" />
      ) : (
        <div className={`text-2xl font-bold tabular count-up ${colorMap[color]}`}>
          {value === null || value === undefined ? (
            <span className="text-muted-foreground text-base">—</span>
          ) : (
            <>{prefix}{typeof value === "number" ? value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : value}{suffix}</>
          )}
        </div>
      )}
      {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
      {delta !== null && delta !== undefined && !loading && (
        <div className={`text-xs font-medium mt-0.5 ${delta > 0 ? "text-green-400" : delta < 0 ? "text-red-400" : "text-muted-foreground"}`}>
          {delta > 0 ? "▲" : delta < 0 ? "▼" : "→"} {Math.abs(delta).toFixed(1)}%
        </div>
      )}
    </div>
  );
}
