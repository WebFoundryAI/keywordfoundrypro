import React from "react";
import { Link } from "react-router-dom";
import { footerNav } from "@/lib/nav/config";

export const SiteFooter = () => {
  return (
    <footer className="border-t border-border bg-card/50 backdrop-blur-sm">
      <div className="container mx-auto px-6 py-6 text-sm text-muted-foreground flex flex-col md:flex-row gap-3 items-center justify-between">
        <div>&copy; {new Date().getFullYear()} Keyword Foundry Pro</div>
        <nav className="flex flex-wrap gap-3">
          {footerNav.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className="hover:text-foreground transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
};