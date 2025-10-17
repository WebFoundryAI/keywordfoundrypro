import React from "react";

export const SiteFooter = () => {
  return (
    <footer className="border-t border-border bg-card/50 backdrop-blur-sm">
      <div className="container mx-auto px-6 py-6 text-sm text-muted-foreground flex flex-col md:flex-row gap-3 items-center justify-between">
        <div>&copy; {new Date().getFullYear()} Keyword Foundry Pro</div>
        <nav className="flex flex-wrap gap-3">
          <a className="hover:text-foreground" href="/pricing">Pricing</a>
          <a className="hover:text-foreground" href="/privacy">Privacy</a>
          <a className="hover:text-foreground" href="/terms">Terms</a>
          <a className="hover:text-foreground" href="/contact">Contact</a>
        </nav>
      </div>
    </footer>
  );
};