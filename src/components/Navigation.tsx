import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Search, BarChart, Target } from "lucide-react";

export const Navigation = () => {
  const location = useLocation();
  
  const navItems = [
    {
      path: "/research",
      label: "Keyword Research",
      icon: Search,
      description: "Find keywords and analyze competition"
    },
    {
      path: "/serp-analysis", 
      label: "SERP Analysis",
      icon: BarChart,
      description: "Analyze top 10 organic results"
    },
    {
      path: "/related-keywords",
      label: "Related Keywords", 
      icon: Target,
      description: "Find content pillars and opportunities"
    }
  ];

  return (
    <nav className="flex gap-2">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = location.pathname === item.path;
        
        return (
          <Link key={item.path} to={item.path}>
            <Button
              variant={isActive ? "default" : "ghost"}
              size="sm"
              className="flex items-center gap-2"
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </Button>
          </Link>
        );
      })}
    </nav>
  );
};