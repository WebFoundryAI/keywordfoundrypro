import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/components/AuthProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { MainLayout } from "@/components/MainLayout";
import { AdminLayout } from "@/components/AdminLayout";
import Index from "./pages/Index";
import Research from "./pages/Research";
import AppKeywordResearch from "./pages/AppKeywordResearch";
import KeywordResults from "./pages/KeywordResults";
import SerpAnalysis from "./pages/SerpAnalysis";
import RelatedKeywords from "./pages/RelatedKeywords";
import CompetitorAnalyzer from "./pages/CompetitorAnalyzer";
import DemoCompetitorAnalyzer from "./pages/DemoCompetitorAnalyzer";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import UpdatePassword from "./pages/UpdatePassword";
import AuthCallback from "./pages/AuthCallback";
import Profile from "./pages/Profile";
import Pricing from "./pages/Pricing";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminUsers from "./pages/admin/Users";
import AdminResearch from "./pages/admin/Research";
import AdminSubscriptions from "./pages/admin/Subscriptions";
import AdminUsage from "./pages/admin/Usage";
import AdminClustering from "./pages/admin/Clustering";
import AdminEnvCheck from "./pages/admin/EnvCheck";
import AdminLogs from "./pages/admin/Logs";
import NotFound from "./pages/NotFound";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentCancelled from "./pages/PaymentCancelled";
import Troubleshooting from "./pages/Troubleshooting";
import MasterPrompt from "./pages/docs/MasterPrompt";
import Runbooks from "./pages/docs/Runbooks";
import CompetitorAnalysisDoc from "./pages/docs/CompetitorAnalysisDoc";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="light" storageKey="keyword-foundry-pro-theme">
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route element={<MainLayout />}>
                <Route path="/" element={<Index />} />
                <Route path="/research" element={<ProtectedRoute><Research /></ProtectedRoute>} />
                <Route path="/app/keyword-research" element={<ProtectedRoute><AppKeywordResearch /></ProtectedRoute>} />
                <Route path="/keyword-results" element={<ProtectedRoute><KeywordResults /></ProtectedRoute>} />
                <Route path="/serp-analysis" element={<ProtectedRoute><SerpAnalysis /></ProtectedRoute>} />
                <Route path="/related-keywords" element={<ProtectedRoute><RelatedKeywords /></ProtectedRoute>} />
                <Route path="/competitor-analyzer" element={<ProtectedRoute><CompetitorAnalyzer /></ProtectedRoute>} />
                <Route path="/demo/competitor" element={<DemoCompetitorAnalyzer />} />
                <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/about" element={<About />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/troubleshooting" element={<Troubleshooting />} />
                <Route path="/docs/master-prompt" element={<ProtectedRoute><MasterPrompt /></ProtectedRoute>} />
                <Route path="/docs/runbooks" element={<ProtectedRoute><Runbooks /></ProtectedRoute>} />
                <Route path="/docs/competitor-analysis" element={<ProtectedRoute><CompetitorAnalysisDoc /></ProtectedRoute>} />
                <Route path="/payment-success" element={<ProtectedRoute><PaymentSuccess /></ProtectedRoute>} />
                <Route path="/payment-cancelled" element={<ProtectedRoute><PaymentCancelled /></ProtectedRoute>} />
                <Route path="*" element={<NotFound />} />
              </Route>

              <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
                <Route index element={<AdminDashboard />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="research" element={<AdminResearch />} />
                <Route path="subscriptions" element={<AdminSubscriptions />} />
                <Route path="usage" element={<AdminUsage />} />
                <Route path="clustering" element={<AdminClustering />} />
                <Route path="env-check" element={<AdminEnvCheck />} />
                <Route path="logs" element={<AdminLogs />} />
              </Route>

              <Route path="/auth/sign-in" element={<SignIn />} />
              <Route path="/auth/sign-up" element={<SignUp />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/auth/update-password" element={<UpdatePassword />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
