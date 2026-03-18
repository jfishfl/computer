import { Switch, Route, Router as WouterRouter } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import Dashboard from "@/pages/Dashboard";
import AdSets from "@/pages/AdSets";
import AdSetDetail from "@/pages/AdSetDetail";
import Ads from "@/pages/Ads";
import Insights from "@/pages/Insights";
import Geography from "@/pages/Geography";
import NotFound from "@/pages/not-found";
import Layout from "@/components/Layout";

function Router() {
  return (
    <WouterRouter hook={useHashLocation}>
      <Layout>
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/adsets" component={AdSets} />
          <Route path="/adsets/:id" component={AdSetDetail} />
          <Route path="/ads" component={Ads} />
          <Route path="/insights" component={Insights} />
          <Route path="/geography" component={Geography} />
          <Route component={NotFound} />
        </Switch>
      </Layout>
    </WouterRouter>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
