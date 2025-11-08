import React from "react";
import { Outlet } from "react-router-dom";
import { SiteFooter } from "@/components/SiteFooter";
import { useAuth } from "@/components/AuthProvider";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";

export const MainLayout = () => {
  const { user } = useAuth();
  
  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen flex w-full bg-background">
        {user && <AppSidebar />}
        <SidebarInset className="flex flex-col">
          {user && (
            <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-4 sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10">
              <SidebarTrigger />
              <div className="flex-1" />
            </header>
          )}
          <main className="flex-1">
            <Outlet />
          </main>
          <SiteFooter />
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};