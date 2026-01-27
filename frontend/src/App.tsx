import { forwardRef } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createBrowserRouter,
  Navigate,
  Outlet,
  RouteObject,
  RouterProvider,
} from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { RoleProvider } from "@/contexts/RoleContext";
import { Web3Provider } from "@/contexts/Web3Context";
// Removed LoadingSpinner import as we are making auth checks instant
// import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Header } from "@/components/layout/Header";
import { NotificationTab } from "./components/notifications/NotificationTab";

// Pages
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Courts from "./pages/Courts";
import Sections from "./pages/Sections";
import CaseBlocks from "./pages/CaseBlocks";
import CaseDetails from "./pages/CaseDetails";
import CauseList from "./pages/CauseList";
import JudgmentWriter from "./pages/JudgmentWriter";
import EvidenceVault from "./pages/EvidenceVault";
import CourtCalendar from "./pages/CourtCalendar";
import Analytics from "./pages/Analytics";
import NotFound from "./pages/NotFound";
import NewFIR from "./pages/NewFIR";
import FIRDetails from "./pages/FIRDetails";
import TodayCases from "./pages/TodayCases";
import CaseRepository from "./pages/CaseRepository";
import { PoliceDashboard } from "./components/dashboard/PoliceDashboard";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Glassmorphism Layout Wrapper
const GlassLayout = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden">
      {/* Animated Background Grid */}
      <div className="absolute inset-0 grid-background opacity-20" />
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-amber-500/5 rounded-full blur-[120px] animate-pulse delay-1000" />

      <div className="relative z-10">
        <Header />
        <main className="container mx-auto px-4 py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

// --- CUSTOM AUTH LOGIC START ---

// 1. Protected Route: Checks LocalStorage ("The Wristband")
// This ignores Supabase session status and trusts your manual token.
const ProtectedRoute = forwardRef<HTMLDivElement>(() => {
  const token = localStorage.getItem("auth_token");
  const isAuthenticated = !!token; // True if token exists

  // Instant check - no loading spinner needed
  return isAuthenticated ? <GlassLayout /> : <Navigate to="/" replace />;
});
ProtectedRoute.displayName = "ProtectedRoute";

// 2. Public Route: Redirects to Dashboard if token exists
// Prevents logged-in users from seeing the Landing/Auth page
const PublicRoute = forwardRef<HTMLDivElement>(() => {
  const token = localStorage.getItem("auth_token");
  const isAuthenticated = !!token;

  if (isAuthenticated) {
    // Check if user is authenticated and redirect based on role
    // For now, redirect to dashboard - role-based redirect will happen in Dashboard component
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
});
PublicRoute.displayName = "PublicRoute";

// --- ROUTES CONFIGURATION ---

const routes: RouteObject[] = [
  {
    element: <PublicRoute />,
    children: [
      { path: "/", element: <Landing /> },
      { path: "/auth", element: <Auth /> },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      { path: "/dashboard", element: <Dashboard /> },
      { path: "/police/dashboard", element: <PoliceDashboard /> },
      { path: "/cause-list", element: <CauseList /> },
      { path: "/judgment-writer", element: <JudgmentWriter /> },
      { path: "/evidence-vault", element: <EvidenceVault /> },
      { path: "/court-calendar", element: <CourtCalendar /> },
      { path: "/analytics", element: <Analytics /> },
      { path: "/courts", element: <Courts /> },
      { path: "/courts/:courtId/sections", element: <Sections /> },
      { path: "/sections/:sectionId/blocks", element: <CaseBlocks /> },
      { path: "/cases/:id", element: <CaseDetails /> },
      { path: "/lawyer/today-cases", element: <TodayCases /> },
      { path: "/lawyer/case-repository", element: <CaseRepository /> },
      { path: "/lawyer/notifications", element: <NotificationTab /> },
      { path: "/police/new-fir", element: <NewFIR /> },
      { path: "/police/firs/:id", element: <FIRDetails /> },
    ],
  },
  { path: "/login", element: <Navigate to="/auth" replace /> },
  { path: "*", element: <NotFound /> },
];

// Router setup with flags
const router = createBrowserRouter(routes, {
  future: {
    v7_startTransition: true,
    v7_relativeSplatPath: true,
    v7_fetcherPersist: true,
    v7_normalizeFormMethod: true,
    v7_partialHydration: true,
    v7_skipActionErrorRevalidation: true,
  },
} as any);

const App = () => (
  <QueryClientProvider client={queryClient}>
    {/* Web3Provider MUST act as the parent to AuthProvider */}
    <Web3Provider>
      <AuthProvider>
        <RoleProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <RouterProvider router={router} />
          </TooltipProvider>
        </RoleProvider>
      </AuthProvider>
    </Web3Provider>
  </QueryClientProvider>
);

export default App;
