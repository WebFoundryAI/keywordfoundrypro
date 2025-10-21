import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Search, BarChart, Target, Users } from "lucide-react";

export const Navigation = () => {
  const location = useLocation();
  
  const navItems = [
    {
      path: "/research",
      label: "Seed Keyword",
      icon: Search,
      description: "Enter keyword for analysis",
      tourId: "research-tab"
    },
    {
      path: "/keyword-results",
      label: "Keyword Results",
      icon: Search,
      description: "View keyword analysis results"
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
    },
    {
      path: "/competitor-analyzer",
      label: "Competitor Analyzer",
      icon: Users,
      description: "Analyze competitor domains",
      tourId: "competitor-tab"
    },
    {
      path: "/pricing",
      label: "Pricing",
      icon: Target,
      description: "View pricing plans"
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
              data-tour={item.tourId}
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