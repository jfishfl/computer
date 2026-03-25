import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useApiUrl } from "@/hooks/useApi";

export interface Campaign {
  id: string;
  name: string;
  status: string;
  objective?: string;
  daily_budget?: string;
  lifetime_budget?: string;
  created_time?: string;
}

export function useCampaigns(hasToken: boolean) {
  const url = useApiUrl();
  return useQuery<{ campaigns: Campaign[] }>({
    queryKey: ["/api/campaigns"],
    queryFn: () => apiRequest("GET", url("/api/campaigns")).then(r => r.json()),
    enabled: hasToken,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
  });
}
