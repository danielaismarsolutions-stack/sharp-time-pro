import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { BusinessBrandProvider } from "@/contexts/BusinessBrandContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminRoute from "@/components/AdminRoute";
import DashboardLayout from "@/components/layout/DashboardLayout";

// Lazy-loaded pages
const Login = lazy(() => import("./pages/Login"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Calendar = lazy(() => import("./pages/Calendar"));
const Consultations = lazy(() => import("./pages/Consultations"));
const Clients = lazy(() => import("./pages/Clients"));
const ClientDetail = lazy(() => import("./pages/ClientDetail"));
const Barbers = lazy(() => import("./pages/Barbers"));
const Services = lazy(() => import("./pages/Services"));
const Reports = lazy(() => import("./pages/Reports"));
const Settings = lazy(() => import("./pages/Settings"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Cookies = lazy(() => import("./pages/Cookies"));
const TimeTracking = lazy(() => import("./pages/TimeTracking"));
const Billing = lazy(() => import("./pages/Billing"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutes — data is fresh, no re-fetch on mount
      gcTime: 1000 * 60 * 10,   // 10 minutes — keep unused cache before garbage collection
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const PageLoader = () => (
  <div className="flex h-screen items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
  </div>
);

const App = () => (
  <ErrorBoundary>
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <BusinessBrandProvider>
        <NotificationProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/" element={<Navigate to="/calendar" replace />} />
                <Route
                  element={
                    <ProtectedRoute>
                      <DashboardLayout />
                    </ProtectedRoute>
                  }
                >
                  {/* Barber-accessible routes */}
                  <Route path="/calendar" element={<Calendar />} />
                  <Route path="/consultations" element={<Consultations />} />
                  <Route path="/clients" element={<Clients />} />
                  <Route path="/clients/:id" element={<ClientDetail />} />
                  <Route path="/time-tracking" element={<TimeTracking />} />
                  {/* Admin-only routes */}
                  <Route path="/dashboard" element={<AdminRoute><Dashboard /></AdminRoute>} />
                  <Route path="/barbers" element={<AdminRoute><Barbers /></AdminRoute>} />
                  <Route path="/services" element={<AdminRoute><Services /></AdminRoute>} />
                  <Route path="/reports" element={<AdminRoute><Reports /></AdminRoute>} />
                  <Route path="/billing" element={<AdminRoute><Billing /></AdminRoute>} />
                  <Route path="/settings" element={<Settings />} />
                </Route>
                {/* Legal pages (public) */}
                <Route path="/terminos" element={<Terms />} />
                <Route path="/privacidad" element={<Privacy />} />
                <Route path="/cookies" element={<Cookies />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </NotificationProvider>
        </BusinessBrandProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
