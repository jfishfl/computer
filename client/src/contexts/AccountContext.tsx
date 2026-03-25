import { createContext, useContext, useMemo, ReactNode } from "react";

export interface AccountInfo {
  id: string;          // "numerology" | "proverb"
  name: string;
  description: string;
  colorHue: string;    // CSS hue value for accent theming
  hasCrm: boolean;
  basePath: string;    // "" or "/proverb"
}

// Detect which account we're on from the URL path
function detectAccount(): AccountInfo {
  const path = window.location.pathname;
  if (path.startsWith("/proverb")) {
    return {
      id: "proverb",
      name: "Proverb",
      description: "Proverb · Meta Ads",
      colorHue: "199",  // cyan/teal
      hasCrm: false,
      basePath: "/proverb",
    };
  }
  return {
    id: "numerology",
    name: "Numerology Blueprint",
    description: "Numerology Blueprint · Meta Ads",
    colorHue: "38",   // amber/gold
    hasCrm: true,
    basePath: "",
  };
}

const AccountContext = createContext<AccountInfo>(detectAccount());

export function AccountProvider({ children }: { children: ReactNode }) {
  const account = useMemo(() => detectAccount(), []);

  // Apply account-specific CSS color hue to :root so the whole UI recolors
  // This overrides --primary and --accent with the account's hue
  if (typeof document !== "undefined") {
    const hue = account.colorHue;
    document.documentElement.style.setProperty("--primary", `${hue} 95% 52%`);
    document.documentElement.style.setProperty("--accent",  `${hue} 95% 52%`);
    document.documentElement.style.setProperty("--ring",    `${hue} 95% 52%`);
    // Also update the chart-1 to match
    document.documentElement.style.setProperty("--chart-1", `${hue} 95% 52%`);
    // Update title
    document.title = `${account.name} · Media Dashboard`;
  }

  return (
    <AccountContext.Provider value={account}>
      {children}
    </AccountContext.Provider>
  );
}

export function useAccount(): AccountInfo {
  return useContext(AccountContext);
}

// Returns the query param string to append to all API calls
export function useAccountParam(): string {
  const account = useAccount();
  return account.id === "numerology" ? "" : `account=${account.id}`;
}

// Builds a full API URL with account param injected
export function buildApiUrl(path: string, account: AccountInfo, extraParams?: Record<string, string>): string {
  const url = new URL(path, window.location.origin);
  if (account.id !== "numerology") {
    url.searchParams.set("account", account.id);
  }
  if (extraParams) {
    for (const [k, v] of Object.entries(extraParams)) {
      if (v) url.searchParams.set(k, v);
    }
  }
  return url.pathname + url.search;
}
