import { useState } from "react";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Lock } from "lucide-react";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await apiRequest("POST", "/api/auth/login", { username, password });
      if (res.ok) {
        await qc.invalidateQueries({ queryKey: ["/api/auth/check"] });
        setLocation("/");
      } else {
        const data = await res.json();
        toast({ title: "Login failed", description: data.error || "Invalid credentials", variant: "destructive" });
      }
    } catch {
      toast({ title: "Login failed", description: "Could not connect to server", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
            <Lock size={22} className="text-primary" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Numerology Blueprint</h1>
          <p className="text-xs text-muted-foreground mt-1">Meta Ads Dashboard</p>
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-lg">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="username" className="text-xs font-medium">Username</Label>
              <Input
                id="username"
                data-testid="input-username"
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="admin"
                className="bg-background border-border"
                autoComplete="username"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-medium">Password</Label>
              <Input
                id="password"
                data-testid="input-password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="bg-background border-border"
                autoComplete="current-password"
                required
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={loading}
              data-testid="button-login"
            >
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
