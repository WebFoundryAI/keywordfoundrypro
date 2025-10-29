import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { headerNav, getVisibleNavItems } from "@/lib/nav/config";
import { useAuth } from "@/components/AuthProvider";

export const Navigation = () => {
  const location = useLocation();
  const { user } = useAuth();

  const visibleItems = getVisibleNavItems(headerNav, !!user, false);

  return (
    <nav className="flex gap-2">
      {visibleItems.map((item) => {
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