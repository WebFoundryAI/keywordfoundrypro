import { Outlet, Navigate } from "react-router-dom";
import { SiteFooter } from "@/components/SiteFooter";
import { useAuth } from "@/components/AuthProvider";
import { useAdmin } from "@/hooks/useAdmin";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { useEnsureAdminPro } from "@/lib/billing/ensure-admin-pro";

export const AdminLayout = () => {
  const { user } = useAuth();
  const { isAdmin, isLoading } = useAdmin();

  // Ensure admin has Pro subscription record (idempotent)
  useEnsureAdminPro(user?.id, isAdmin);

  // Show loading state while checking admin status
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Redirect non-admins to home page
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <SidebarInset className="flex flex-col">
          <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-4 sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10">
            <SidebarTrigger />
            <div className="flex-1" />
          </header>
          <main className="flex-1 p-8">
            <Outlet />
          </main>
          <SiteFooter />
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};
