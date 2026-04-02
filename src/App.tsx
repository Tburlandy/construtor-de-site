import { Suspense, lazy, useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Outlet, Routes, Route, useLocation } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import Index from "./pages/Index";
import CityPage from "./pages/CityPage";
import NotFound from "./pages/NotFound";
import SdrForm from "./pages/SdrForm";
import Teste from "./pages/Teste";

const queryClient = new QueryClient();

function StudioHomeRedirect() {
  const [to, setTo] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/projects')
      .then((r) => r.ok ? r.json() : [])
      .then((projects: { projectId: string }[]) => {
        setTo(projects[0]?.projectId ? `/cliente/${encodeURIComponent(projects[0].projectId)}` : '/construtor');
      })
      .catch(() => setTo('/construtor'));
  }, []);

  if (!to) return null;
  return <Navigate to={to} replace />;
}

function TrailingSlashRedirect() {
  const { pathname, search, hash } = useLocation();
  if (pathname === '/index.html' || pathname === '/index.htm') {
    return <Navigate to={`/${search}${hash}`} replace />;
  }
  if (pathname !== '/' && pathname.endsWith('/')) {
    return <Navigate to={pathname.slice(0, -1) + search + hash} replace />;
  }
  return <Outlet />;
}
const routerBasePath = import.meta.env.BASE_URL || "/";
const routerBasename =
  routerBasePath !== "/" && routerBasePath.endsWith("/")
    ? routerBasePath.slice(0, -1)
    : routerBasePath;
const studioEnabled = __STUDIO_ENABLED__;
const StudioAdminEntry = studioEnabled ? lazy(() => import("./pages/StudioAdminEntry")) : null;
const StudioProjectShell = studioEnabled ? lazy(() => import("./pages/StudioProjectShell")) : null;
const StudioProjectPreview = studioEnabled ? lazy(() => import("./pages/StudioProjectPreview")) : null;

const StudioRouteFallback = (
  <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
    Carregando studio...
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <HelmetProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter basename={routerBasename}>
          <Routes>
            <Route element={<TrailingSlashRedirect />}>
            <Route path="/" element={studioEnabled ? <StudioHomeRedirect /> : <Index />} />
            <Route path="/energia-solar-em/:slug" element={<CityPage />} />
            <Route path="/cadastro-sdr" element={<SdrForm />} />
            <Route path="/teste" element={<Teste />} />
            {studioEnabled && StudioAdminEntry && StudioProjectShell && StudioProjectPreview ? (
              <>
                <Route
                  path="/preview/:clientId"
                  element={
                    <Suspense fallback={StudioRouteFallback}>
                      <StudioProjectPreview />
                    </Suspense>
                  }
                />
                <Route
                  path="/cliente/:clientId"
                  element={
                    <Suspense fallback={StudioRouteFallback}>
                      <StudioProjectShell />
                    </Suspense>
                  }
                />
                <Route
                  path="/construtor"
                  element={
                    <Suspense fallback={StudioRouteFallback}>
                      <StudioAdminEntry />
                    </Suspense>
                  }
                />
              </>
            ) : null}
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </HelmetProvider>
  </QueryClientProvider>
);

export default App;
