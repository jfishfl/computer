import { Switch, Route, Router as WouterRouter } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { queryClient, apiRequest } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import Dashboard from "@/pages/Dashboard";
import AdSets from "@/pages/AdSets";
import AdSetDetail from "@/pages/AdSetDetail";
import Ads from "@/pages/Ads";
import Insights from "@/pages/Insights";
import Geography from "@/pages/Geography";
import Logs from "@/pages/Logs";
import PnL from "@/pages/PnL";
import Creatives from "@/pages/Creatives";
import Login from "@/pages/Login";
import NotFound from "@/pages/not-found";
import Layout from "@/components/Layout";
import { Skeleton } from "@/components/ui/skeleton";
import { AccountProvider } from "@/contexts/AccountContext";

function AuthGate({ children }: { children: React.ReactNode }) {
  const { data, isLoading } = useQuery({
    queryKey: ["/api/auth/check"],
    queryFn: () => apiRequest("GET", "/api/auth/check").then(r => r.json()),
    retry: false,
    staleTime: 60000,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Skeleton className="h-8 w-48" />
      </div>
    );
  }

  if (!data?.authenticated) {
    return <Login />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <WouterRouter hook={useHashLocation}>
      <AuthGate>
        <Layout>
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/adsets" component={AdSets} />
            <Route path="/adsets/:id" component={AdSetDetail} />
            <Route path="/ads" component={Ads} />
            <Route path="/insights" component={Insights} />
            <Route path="/geography" component={Geography} />
            <Route path="/pnl" component={PnL} />
            <Route path="/creatives" component={Creatives} />
            <Route path="/logs" component={Logs} />
            <Route component={NotFound} />
          </Switch>
        </Layout>
      </AuthGate>
    </WouterRouter>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AccountProvider>
        <AppRoutes />
        <Toaster />
      </AccountProvider>
    </QueryClientProvider>
  );
}

export default App;
