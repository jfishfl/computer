export default function StatusBadge({ status }: { status: string }) {
  const isActive = status === "ACTIVE";
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium
      ${isActive ? "bg-green-500/15 text-green-400" : "bg-secondary text-muted-foreground"}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-green-400 status-active" : "bg-muted-foreground"}`} />
      {status}
    </span>
  );
}
