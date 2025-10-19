import { Link, Outlet, useLocation, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Users, FileSearch, ArrowLeft, CreditCard, Activity, Layers } from "lucide-react";
import { Header } from "@/components/Header";
import { useAuth } from "@/components/AuthProvider";
import { useAdmin } from "@/hooks/useAdmin";

export const AdminLayout = () => {
  const location = useLocation();
  const { user } = useAuth();
  const { isAdmin, isLoading } = useAdmin();

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

  const navItems = [
    {
      path: "/admin",
      label: "Dashboard",
      icon: LayoutDashboard,
    },
    {
      path: "/admin/users",
      label: "Users",
      icon: Users,
    },
    {
      path: "/admin/research",
      label: "Research",
      icon: FileSearch,
    },
    {
      path: "/admin/subscriptions",
      label: "Subscriptions",
      icon: CreditCard,
    },
    {
      path: "/admin/usage",
      label: "API Usage",
      icon: Activity,
    },
    {
      path: "/admin/clustering",
      label: "Clustering",
      icon: Layers,
    },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Header user={user} />
      <div className="flex-1 flex">
        {/* Sidebar */}
        <aside className="w-64 border-r bg-muted/30">
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Admin Panel</h2>
              <Link to="/">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
            </div>
            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                
                return (
                  <Link key={item.path} to={item.path}>
                    <Button
                      variant={isActive ? "secondary" : "ghost"}
                      className="w-full justify-start"
                    >
                      <Icon className="mr-2 h-4 w-4" />
                      {item.label}
                    </Button>
                  </Link>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
