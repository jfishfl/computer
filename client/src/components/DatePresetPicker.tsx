const PRESETS = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "last_3d", label: "3D" },
  { value: "last_7d", label: "7D" },
  { value: "last_14d", label: "14D" },
  { value: "last_30d", label: "30D" },
  { value: "this_month", label: "MTD" },
  { value: "maximum", label: "All Time" },
];

export default function DatePresetPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex bg-secondary rounded-md p-0.5 gap-0.5" data-testid="date-preset-picker">
      {PRESETS.map(p => (
        <button
          key={p.value}
          data-testid={`preset-${p.value}`}
          onClick={() => onChange(p.value)}
          className={`px-2.5 py-1 rounded text-xs font-medium transition-colors
            ${value === p.value
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
            }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
