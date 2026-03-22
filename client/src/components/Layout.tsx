import { Link, useLocation } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useState } from "react";
import {
  LayoutDashboard, Layers, BarChart2, Activity, Globe, Key,
  ExternalLink, Menu, X, LogOut, RefreshCw, Terminal, DollarSign, Flame,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import PerplexityAttribution from "@/components/PerplexityAttribution";

const NAV = [
  { href: "/",          icon: LayoutDashboard, label: "Overview"  },
  { href: "/adsets",    icon: Layers,          label: "Ad Sets"   },
  { href: "/ads",       icon: BarChart2,        label: "All Ads"   },
  { href: "/pnl",       icon: DollarSign,       label: "P&L"       },
  { href: "/creatives", icon: Flame,            label: "Creatives" },
  { href: "/insights",  icon: Activity,         label: "Insights"  },
  { href: "/geography", icon: Globe,            label: "Geography" },
];

const NAV_SIDEBAR = [
  ...NAV,
  { href: "/logs", icon: Terminal, label: "Logs" },
];

// ── Token Modal ───────────────────────────────────────────────────────────────
function TokenModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [token, setToken] = useState("");
  const { toast } = useToast();
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: (t: string) => apiRequest("POST", "/api/token", { token: t }),
    onSuccess: async (res) => {
      const data = await res.json();
      toast({ title: `Connected as ${data.name}`, description: "Token saved to disk." });
      qc.invalidateQueries();
      onClose();
    },
    onError: () => toast({ title: "Invalid token", variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md border-border"
        style={{ background: "hsl(224 20% 9%)", boxShadow: "0 24px 80px rgba(0,0,0,0.7), 0 0 0 1px hsl(38 95% 52% / 0.12)" }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-400">
            <Key size={15} />
            Connect Meta API Token
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm leading-relaxed">
            Generate a token from{" "}
            <a href="https://developers.facebook.com/tools/explorer" target="_blank" rel="noreferrer"
              className="text-amber-400 underline underline-offset-2">
              Graph API Explorer
            </a>{" "}
            with <code className="text-xs bg-secondary/80 px-1.5 py-0.5 rounded text-amber-300/80">ads_management</code> +{" "}
            <code className="text-xs bg-secondary/80 px-1.5 py-0.5 rounded text-amber-300/80">ads_read</code> scopes.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-1">
          <div>
            <Label htmlFor="token-input" className="text-xs text-muted-foreground mb-1.5 block uppercase tracking-wider">
              Access Token
            </Label>
            <Input
              id="token-input"
              data-testid="input-token"
              placeholder="EAAGxxx..."
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="font-mono text-xs bg-secondary/60 border-border focus:border-amber-500/50 focus:ring-amber-500/20"
            />
          </div>
          <Button
            data-testid="button-connect"
            className="w-full bg-amber-500 hover:bg-amber-400 text-black font-semibold transition-all"
            style={{ boxShadow: "0 0 20px hsl(38 95% 52% / 0.25)" }}
            disabled={!token || mutation.isPending}
            onClick={() => mutation.mutate(token)}
          >
            {mutation.isPending ? "Verifying…" : "Connect →"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Logo ──────────────────────────────────────────────────────────────────────
function Logo() {
  return (
    <div className="flex items-center gap-3">
      {/* Geometric numerology mark */}
      <div className="relative w-8 h-8 shrink-0">
        <svg viewBox="0 0 32 32" width="32" height="32" fill="none">
          <rect width="32" height="32" rx="8"
            fill="hsl(38 95% 52% / 0.12)"
            stroke="hsl(38 95% 52% / 0.3)"
            strokeWidth="1"
          />
          {/* Sacred geometry / numerology mark */}
          <circle cx="16" cy="16" r="6.5" stroke="hsl(38 95% 52% / 0.6)" strokeWidth="1.2" />
          <circle cx="16" cy="16" r="2.5" fill="hsl(38 95% 52%)" />
          <line x1="16" y1="7" x2="16" y2="25" stroke="hsl(38 95% 52% / 0.35)" strokeWidth="0.8" />
          <line x1="7"  y1="16" x2="25" y2="16" stroke="hsl(38 95% 52% / 0.35)" strokeWidth="0.8" />
        </svg>
      </div>
      <div>
        <div className="text-sm font-bold leading-tight tracking-tight"
          style={{ fontFamily: "'Outfit', sans-serif", letterSpacing: "-0.01em" }}>
          Numerology
        </div>
        <div className="text-[10px] text-muted-foreground/60 leading-tight uppercase tracking-widest font-medium">
          Media Dashboard
        </div>
      </div>
    </div>
  );
}

// ── Main Layout ───────────────────────────────────────────────────────────────
export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [tokenOpen, setTokenOpen]   = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: tokenData } = useQuery({
    queryKey: ["/api/token"],
    queryFn: () => apiRequest("GET", "/api/token").then(r => r.json()),
    staleTime: 30000,
  });
  const hasToken = tokenData?.hasToken;

  return (
    <div className="flex h-screen bg-background overflow-hidden">

      {/* ── Desktop Sidebar ────────────────────────────────────────────────── */}
      <aside className={`
        fixed inset-y-0 left-0 z-30 w-[220px] flex flex-col
        transition-transform duration-250 ease-out lg:relative lg:translate-x-0
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
      `} style={{
        background: "hsl(224 22% 8%)",
        borderRight: "1px solid hsl(224 14% 14%)",
        boxShadow: "4px 0 24px rgba(0,0,0,0.35)",
      }}>

        {/* Logo area */}
        <div className="h-[60px] flex items-center px-4 shrink-0"
          style={{ borderBottom: "1px solid hsl(224 14% 12%)" }}>
          <Logo />
        </div>

        {/* Nav section label */}
        <div className="px-4 pt-5 pb-2">
          <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground/40">
            Navigation
          </span>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-2 space-y-0.5 overflow-y-auto">
          {NAV_SIDEBAR.map(({ href, icon: Icon, label }) => {
            const active = location === href;
            return (
              <Link key={href} href={href}
                onClick={() => setSidebarOpen(false)}
                className={`
                  relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium
                  transition-all duration-150 group
                  ${active
                    ? "nav-active"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04]"
                  }
                `}
              >
                <Icon
                  size={15}
                  strokeWidth={active ? 2.2 : 1.8}
                  className={active ? "text-amber-400" : "text-muted-foreground/70 group-hover:text-muted-foreground transition-colors"}
                />
                {label}
                {active && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_6px_hsl(38_95%_52%_/_0.8)]" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom actions */}
        <div className="px-3 py-4 shrink-0"
          style={{ borderTop: "1px solid hsl(224 14% 12%)" }}>

          {/* Token status */}
          <button data-testid="button-token" onClick={() => setTokenOpen(true)}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs hover:bg-white/[0.04] transition-colors group">
            <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
              hasToken ? "bg-green-400 shadow-[0_0_6px_rgba(34,197,94,0.6)]" : "bg-amber-400 shadow-[0_0_6px_rgba(245,158,11,0.6)]"
            }`} />
            <span className={`truncate ${hasToken ? "text-muted-foreground" : "text-amber-400/80"}`}>
              {hasToken ? "Token connected" : "Connect token"}
            </span>
            <Key size={10} className="ml-auto text-muted-foreground/40 group-hover:text-muted-foreground/60 transition-colors" />
          </button>

          {/* Refresh */}
          <button
            onClick={async () => {
              await apiRequest("POST", "/api/cache/clear");
              qc.invalidateQueries();
              toast({ title: "Cache cleared", description: "Fetching fresh data from Meta…" });
            }}
            className="mt-0.5 w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-white/[0.04] transition-colors"
          >
            <RefreshCw size={11} />
            Refresh data
          </button>

          {/* Ads Manager */}
          <a href="https://adsmanager.facebook.com" target="_blank" rel="noreferrer"
            className="mt-0.5 w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-white/[0.04] transition-colors">
            <ExternalLink size={11} />
            Ads Manager
          </a>

          {/* Sign out */}
          <button
            onClick={async () => {
              await apiRequest("POST", "/api/auth/logout");
              qc.invalidateQueries({ queryKey: ["/api/auth/check"] });
            }}
            className="mt-0.5 w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-muted-foreground hover:text-red-400 hover:bg-red-500/8 transition-colors">
            <LogOut size={11} />
            Sign out
          </button>

          <div className="mt-3 px-1">
            <PerplexityAttribution />
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-20 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Main content area ─────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Top bar */}
        <header
          className="h-[60px] flex items-center px-4 gap-3 shrink-0"
          style={{
            background: "hsl(224 22% 8% / 0.85)",
            backdropFilter: "blur(20px) saturate(1.3)",
            WebkitBackdropFilter: "blur(20px) saturate(1.3)",
            borderBottom: "1px solid hsl(224 14% 13%)",
            boxShadow: "0 1px 0 hsl(38 95% 52% / 0.04)",
          }}
        >
          {/* Hamburger — mobile only */}
          <button
            className="lg:hidden text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>

          {/* Breadcrumb / page info */}
          <div className="flex-1 min-w-0">
            <div className="text-xs text-muted-foreground/50 font-mono truncate tracking-wide">
              Numerology Blueprint · Meta Ads · act_670664411827203
            </div>
          </div>

          {/* Token warning */}
          {!hasToken && (
            <Button
              size="sm"
              onClick={() => setTokenOpen(true)}
              className="text-xs h-8 px-3 border-amber-500/40 bg-amber-500/8 text-amber-400 hover:bg-amber-500/15 hover:border-amber-400/60 transition-all"
              variant="outline"
              style={{ boxShadow: "0 0 12px hsl(38 95% 52% / 0.12)" }}
            >
              <Key size={11} className="mr-1.5" />
              Add Token
            </Button>
          )}

          {/* Token connected dot */}
          {hasToken && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground/50">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 shadow-[0_0_6px_rgba(34,197,94,0.5)]" />
              <span className="hidden sm:block font-mono">connected</span>
            </div>
          )}
        </header>

        {/* Token warning banner */}
        {!hasToken && (
          <div className="mx-4 mt-4 p-3 rounded-xl flex items-center gap-3 text-sm"
            style={{
              background: "hsl(38 95% 52% / 0.07)",
              border: "1px solid hsl(38 95% 52% / 0.2)",
            }}>
            <Key size={13} className="text-amber-400 shrink-0" />
            <span className="text-amber-200/80 text-xs">Connect your Meta API token to load live performance data.</span>
            <Button size="sm" variant="ghost" onClick={() => setTokenOpen(true)}
              className="ml-auto text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 text-xs h-7 px-3">
              Connect →
            </Button>
          </div>
        )}

        {/* Page content */}
        <main className="flex-1 overflow-y-auto overscroll-contain pb-16 lg:pb-0 page-enter">
          {children}
        </main>
      </div>

      {/* ── Mobile Bottom Nav ─────────────────────────────────────────────── */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 flex items-stretch"
        style={{
          background: "hsl(224 22% 8% / 0.96)",
          backdropFilter: "blur(20px) saturate(1.3)",
          WebkitBackdropFilter: "blur(20px) saturate(1.3)",
          borderTop: "1px solid hsl(224 14% 13%)",
          boxShadow: "0 -4px 24px rgba(0,0,0,0.4)",
        }}
      >
        {NAV.map(({ href, icon: Icon, label }) => {
          const active = location === href;
          return (
            <Link key={href} href={href}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 text-[9px] font-semibold uppercase tracking-wider transition-colors relative
                ${active ? "text-amber-400" : "text-muted-foreground/50 hover:text-muted-foreground"}`}
            >
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[1.5px] rounded-b-full bg-amber-400 shadow-[0_0_8px_hsl(38_95%_52%_/_0.8)]" />
              )}
              <Icon size={17} strokeWidth={active ? 2.2 : 1.7} />
              <span>{label}</span>
            </Link>
          );
        })}

        {/* Token/settings shortcut */}
        <button
          onClick={() => setTokenOpen(true)}
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 text-[9px] font-semibold uppercase tracking-wider transition-colors
            ${hasToken ? "text-muted-foreground/50" : "text-amber-400"}`}
        >
          <Key size={17} strokeWidth={1.7} />
          <span>Token</span>
        </button>
      </nav>

      <TokenModal open={tokenOpen} onClose={() => setTokenOpen(false)} />
    </div>
  );
}
