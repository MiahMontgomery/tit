import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Dashboard from "@/pages/dashboard";
import ProjectPage from "@/pages/project";
import NotFound from "@/pages/not-found";
import PersonasPage from "@/pages/personas";
import PersonaPage from "@/pages/persona";
    

function Router() {
  return (

          <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/projects/:id" component={ProjectPage} />
        <Route path="/personas" component={PersonasPage} />
        <Route path="/personas/:id" component={PersonaPage} />
        <Route component={NotFound} />
      </Switch>
}

function App() {
  return (
    <div className="dark">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </div>
  );
}

export default App;
