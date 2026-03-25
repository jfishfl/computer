import { useAccount } from "@/contexts/AccountContext";

/**
 * Returns a URL with the account query param injected when needed.
 * Use this for all /api/* calls in pages.
 */
export function useApiUrl() {
  const account = useAccount();
  return function apiUrl(path: string): string {
    if (account.id === "numerology") return path;
    const sep = path.includes("?") ? "&" : "?";
    return `${path}${sep}account=${account.id}`;
  };
}
