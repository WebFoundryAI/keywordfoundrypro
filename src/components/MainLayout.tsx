import React from "react";
import { Outlet } from "react-router-dom";
import { Header } from "@/components/Header";
import { SiteFooter } from "@/components/SiteFooter";
import { useAuth } from "@/components/AuthProvider";

export const MainLayout = () => {
  const { user } = useAuth();
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header user={user} />
      <main className="flex-1">
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  );
};