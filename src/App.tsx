import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import Index from "./pages/Index";
import CityPage from "./pages/CityPage";
import NotFound from "./pages/NotFound";
import Studio from "./pages/Studio";
import StudioProjectList from "./pages/StudioProjectList";
import StudioProjectShell from "./pages/StudioProjectShell";
import StudioProjectPreview from "./pages/StudioProjectPreview";
import SdrForm from "./pages/SdrForm";
import Teste from "./pages/Teste";

const queryClient = new QueryClient();
const routerBasePath = import.meta.env.BASE_URL || "/";
const routerBasename =
  routerBasePath !== "/" && routerBasePath.endsWith("/")
    ? routerBasePath.slice(0, -1)
    : routerBasePath;

const App = () => (
  <QueryClientProvider client={queryClient}>
    <HelmetProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter basename={routerBasename}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/energia-solar-em/:slug" element={<CityPage />} />
            <Route path="/cadastro-sdr" element={<SdrForm />} />
            <Route path="/teste" element={<Teste />} />
            <Route path="/dev/studio/preview/:projectId" element={<StudioProjectPreview />} />
            <Route path="/dev/studio/projects/:projectId" element={<StudioProjectShell />} />
            <Route path="/dev/studio/projects" element={<StudioProjectList />} />
            <Route path="/dev/studio" element={<Studio />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </HelmetProvider>
  </QueryClientProvider>
);

export default App;
