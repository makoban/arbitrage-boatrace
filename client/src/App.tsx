import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";
import Home from "./pages/Home";
import RaceList from "./pages/RaceList";
import OddsAnalysis from "./pages/OddsAnalysis";
import RacerStats from "./pages/RacerStats";
import Predictions from "./pages/Predictions";
import DataMonitor from "./pages/DataMonitor";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/races" component={RaceList} />
      <Route path="/odds/:date/:stadium/:race" component={OddsAnalysis} />
      <Route path="/racers" component={RacerStats} />
      <Route path="/predictions" component={Predictions} />
      <Route path="/monitor" component={DataMonitor} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <DashboardLayout>
            <Router />
          </DashboardLayout>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
