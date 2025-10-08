import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SignedIn, SignedOut } from "@clerk/react-router";
import { ThemeProvider } from "@/components/ThemeProvider";
import Index from "./pages/Index";
import Research from "./pages/Research";
import KeywordResults from "./pages/KeywordResults";
import SerpAnalysis from "./pages/SerpAnalysis";
import RelatedKeywords from "./pages/RelatedKeywords";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import SsoCallback from "./pages/SsoCallback";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Protected Route wrapper
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => (
  <>
    <SignedIn>{children}</SignedIn>
    <SignedOut>
      <Navigate to="/auth/sign-in" replace />
    </SignedOut>
  </>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="light" storageKey="keyword-foundry-pro-theme">
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth/sign-in" element={<SignIn />} />
            <Route path="/auth/sign-up" element={<SignUp />} />
            <Route path="/sso-callback" element={<SsoCallback />} />
            <Route
              path="/research"
              element={
                <ProtectedRoute>
                  <Research />
                </ProtectedRoute>
              }
            />
            <Route
              path="/keyword-results"
              element={
                <ProtectedRoute>
                  <KeywordResults />
                </ProtectedRoute>
              }
            />
            <Route
              path="/serp-analysis"
              element={
                <ProtectedRoute>
                  <SerpAnalysis />
                </ProtectedRoute>
              }
            />
            <Route
              path="/related-keywords"
              element={
                <ProtectedRoute>
                  <RelatedKeywords />
                </ProtectedRoute>
              }
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
