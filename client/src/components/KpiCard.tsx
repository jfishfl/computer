interface KpiCardProps {
  label: string;
  value: string | number | null;
  sub?: string;
  delta?: number | null;
  prefix?: string;
  suffix?: string;
  color?: "default" | "green" | "red" | "blue" | "yellow" | "gold";
  loading?: boolean;
  icon?: React.ReactNode;
}

export default function KpiCard({
  label, value, sub, delta, prefix = "", suffix = "",
  color = "default", loading, icon,
}: KpiCardProps) {
  const valueColorMap: Record<string, string> = {
    default: "text-foreground",
    green:   "text-green-400",
    red:     "text-red-400",
    blue:    "text-blue-400",
    yellow:  "text-amber-400",
    gold:    "text-amber-400",
  };

  const cardClassMap: Record<string, string> = {
    default: "",
    green:   "kpi-green",
    red:     "kpi-red",
    blue:    "",
    yellow:  "kpi-gold",
    gold:    "kpi-gold",
  };

  const glowMap: Record<string, string> = {
    default: "",
    green:   "hover:shadow-[0_0_20px_hsl(145_60%_40%_/_0.08)]",
    red:     "hover:shadow-[0_0_20px_hsl(0_70%_55%_/_0.08)]",
    blue:    "hover:shadow-[0_0_20px_hsl(200_90%_55%_/_0.08)]",
    yellow:  "hover:shadow-[0_0_20px_hsl(38_95%_52%_/_0.12)]",
    gold:    "hover:shadow-[0_0_20px_hsl(38_95%_52%_/_0.12)]",
  };

  return (
    <div
      className={`kpi-card bg-card border border-border rounded-xl p-4 flex flex-col gap-1.5 transition-all duration-200 ${cardClassMap[color]} ${glowMap[color]}`}
      data-testid={`kpi-${label.toLowerCase().replace(/\s+/g, '-')}`}
      style={{
        boxShadow: "0 1px 3px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2)",
      }}
    >
      {/* Label row */}
      <div className="flex items-center gap-1.5">
        {icon && <span className="text-muted-foreground/60">{icon}</span>}
        <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
          {label}
        </div>
      </div>

      {/* Value */}
      {loading ? (
        <div className="shimmer h-7 rounded-md w-2/3 mt-1" />
      ) : (
        <div className={`text-2xl font-bold tracking-tight count-up tabular ${valueColorMap[color]}`}
          style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: "-0.02em" }}
        >
          {value === null || value === undefined ? (
            <span className="text-muted-foreground/40 text-lg">—</span>
          ) : (
            <>{prefix}{typeof value === "number"
              ? value.toLocaleString(undefined, { maximumFractionDigits: 2 })
              : value}{suffix}</>
          )}
        </div>
      )}

      {/* Sub text */}
      {sub && (
        <div className="text-[11px] text-muted-foreground leading-tight">{sub}</div>
      )}

      {/* Delta */}
      {delta !== null && delta !== undefined && !loading && (
        <div className={`text-[11px] font-semibold flex items-center gap-1 ${
          delta > 0 ? "text-green-400" : delta < 0 ? "text-red-400" : "text-muted-foreground"
        }`}>
          <span className="text-[10px]">
            {delta > 0 ? "▲" : delta < 0 ? "▼" : "→"}
          </span>
          {Math.abs(delta).toFixed(1)}%
        </div>
      )}
    </div>
  );
}
