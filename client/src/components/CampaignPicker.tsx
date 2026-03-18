import { useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useCampaigns, type Campaign } from "@/hooks/useCampaigns";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface CampaignPickerProps {
  value: string;
  onChange: (id: string) => void;
  includeAll?: boolean; // show "All Campaigns" option
  className?: string;
}

export default function CampaignPicker({ value, onChange, includeAll = false, className }: CampaignPickerProps) {
  const { data: tokenData } = useQuery({
    queryKey: ["/api/token"],
    queryFn: () => apiRequest("GET", "/api/token").then(r => r.json()),
    staleTime: 30000,
  });
  const hasToken = tokenData?.hasToken;
  const { data, isLoading } = useCampaigns(!!hasToken);
  const campaigns: Campaign[] = data?.campaigns || [];

  // Auto-select "all" by default when includeAll is true, else first campaign
  useEffect(() => {
    if (!value && campaigns.length > 0) {
      onChange(includeAll ? "all" : campaigns[0].id);
    }
  }, [campaigns, value, onChange, includeAll]);

  if (isLoading) return <Skeleton className={`h-8 w-48 ${className || ""}`} />;
  if (!campaigns.length) return null;

  const shortName = (name: string) => name.replace(/numerology blueprint\s*[-–]/i, "").trim();

  return (
    <Select value={value || campaigns[0]?.id || ""} onValueChange={onChange}>
      <SelectTrigger className={`h-8 text-xs bg-secondary border-border ${className || "w-56"}`}>
        <SelectValue placeholder="Select campaign" />
      </SelectTrigger>
      <SelectContent>
        {includeAll && (
          <SelectItem value="all">All Campaigns</SelectItem>
        )}
        {campaigns.map((c) => (
          <SelectItem key={c.id} value={c.id}>
            <span className="flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${c.status === "ACTIVE" ? "bg-green-400" : "bg-zinc-500"}`} />
              {shortName(c.name)}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
