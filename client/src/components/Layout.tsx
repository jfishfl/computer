import { Link, useLocation } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useState } from "react";
import { LayoutDashboard, Layers, BarChart2, Activity, Globe, Key, ExternalLink, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import PerplexityAttribution from "@/components/PerplexityAttribution";

const NAV = [
  { href: "/", icon: LayoutDashboard, label: "Overview" },
  { href: "/adsets", icon: Layers, label: "Ad Sets" },
  { href: "/ads", icon: BarChart2, label: "All Ads" },
  { href: "/insights", icon: Activity, label: "Insights" },
  { href: "/geography", icon: Globe, label: "Geography" },
];

function TokenModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [token, setToken] = useState("");
  const { toast } = useToast();
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: (t: string) => apiRequest("POST", "/api/token", { token: t }),
    onSuccess: async (res) => {
      const data = await res.json();
      toast({ title: `Connected as ${data.name}`, description: "Token saved for this session." });
      qc.invalidateQueries();
      onClose();
    },
    onError: () => toast({ title: "Invalid token", variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key size={16} className="text-primary" />
            Connect Meta API Token
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm">
            Generate a short-lived token from{" "}
            <a href="https://developers.facebook.com/tools/explorer" target="_blank" rel="noreferrer"
              className="text-primary underline">
              Graph API Explorer
            </a>{" "}
            with <code className="text-xs bg-secondary px-1 rounded">ads_management</code> +{" "}
            <code className="text-xs bg-secondary px-1 rounded">ads_read</code> scopes, using the <strong>Solarmatic</strong> app.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          <div>
            <Label htmlFor="token-input" className="text-sm text-muted-foreground mb-1 block">Access Token</Label>
            <Input
              id="token-input"
              data-testid="input-token"
              placeholder="EAAGxxx..."
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="font-mono text-xs bg-secondary border-border"
            />
          </div>
          <Button
            data-testid="button-connect"
            className="w-full"
            disabled={!token || mutation.isPending}
            onClick={() => mutation.mutate(token)}
          >
            {mutation.isPending ? "Verifying..." : "Connect"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [tokenOpen, setTokenOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { data: tokenData } = useQuery({
    queryKey: ["/api/token"],
    queryFn: () => apiRequest("GET", "/api/token").then(r => r.json()),
    staleTime: 30000,
  });

  const hasToken = tokenData?.hasToken;

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-30 w-56 bg-card border-r border-border flex flex-col
        transition-transform duration-200 lg:relative lg:translate-x-0
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
        {/* Logo */}
        <div className="h-14 flex items-center px-4 border-b border-border shrink-0">
          <svg viewBox="0 0 32 32" width="28" height="28" fill="none" aria-label="eGear Media" className="mr-2.5">
            <rect width="32" height="32" rx="7" fill="hsl(210 100% 56% / 0.15)" />
            <path d="M8 16h16M16 8v16" stroke="hsl(210,100%,56%)" strokeWidth="2.5" strokeLinecap="round"/>
            <circle cx="16" cy="16" r="4" stroke="hsl(210,100%,56%)" strokeWidth="2"/>
          </svg>
          <div>
            <div className="text-sm font-semibold leading-tight">Numerology</div>
            <div className="text-xs text-muted-foreground leading-tight">Meta Ads</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          {NAV.map(({ href, icon: Icon, label }) => {
            const active = location === href;
            return (
              <Link key={href} href={href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors
                  ${active
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}>
                <Icon size={15} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Token status */}
        <div className="px-3 py-3 border-t border-border shrink-0">
          <button
            data-testid="button-token"
            onClick={() => setTokenOpen(true)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-xs hover:bg-secondary transition-colors"
          >
            <div className={`w-2 h-2 rounded-full shrink-0 ${hasToken ? "bg-green-500 status-active" : "bg-yellow-500"}`} />
            <span className="text-muted-foreground truncate">
              {hasToken ? "Token connected" : "Connect token"}
            </span>
            <Key size={11} className="ml-auto text-muted-foreground" />
          </button>
          <a
            href="https://adsmanager.facebook.com"
            target="_blank" rel="noreferrer"
            className="mt-1 w-full flex items-center gap-2 px-3 py-2 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <ExternalLink size={11} />
            Open Ads Manager
          </a>
          <div className="mt-2">
            <PerplexityAttribution />
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-20 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="h-14 border-b border-border flex items-center px-4 gap-3 shrink-0 bg-card/50 backdrop-blur">
          <button
            className="lg:hidden text-muted-foreground hover:text-foreground"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-muted-foreground font-mono truncate">
              Campaign: Numerology Blueprint - Static Meta_3-11-26
            </div>
          </div>
          <div className="text-xs text-muted-foreground font-mono hidden sm:block">
            Act: 670664411827203
          </div>
          {!hasToken && (
            <Button size="sm" variant="outline" onClick={() => setTokenOpen(true)}
              className="text-xs border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10">
              <Key size={12} className="mr-1.5" />
              Add Token
            </Button>
          )}
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto overscroll-contain">
          {!hasToken && (
            <div className="mx-4 mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg flex items-center gap-3 text-sm">
              <Key size={14} className="text-yellow-400 shrink-0" />
              <span className="text-yellow-200">Connect your Meta API token to load live performance data.</span>
              <Button size="sm" variant="ghost" onClick={() => setTokenOpen(true)}
                className="ml-auto text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/10 text-xs">
                Connect →
              </Button>
            </div>
          )}
          {children}
        </main>
      </div>

      <TokenModal open={tokenOpen} onClose={() => setTokenOpen(false)} />
    </div>
  );
}
