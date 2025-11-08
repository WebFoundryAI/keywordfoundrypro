import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { headerNav, advancedNav, getVisibleNavItems } from "@/lib/nav/config";
import { useAuth } from "@/components/AuthProvider";
import { useAdmin } from "@/hooks/useAdmin";
import { cn } from "@/lib/utils";

export const Navigation = () => {
  const location = useLocation();
  const { user } = useAuth();
  const { isAdmin } = useAdmin();

  const visibleItems = getVisibleNavItems(headerNav, !!user, isAdmin);
  const visibleAdvanced = getVisibleNavItems(advancedNav, !!user, isAdmin);
  const isAdvancedActive = location.pathname.startsWith('/advanced');

  return (
    <nav className="flex gap-2 items-center">
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
      
      {user && visibleAdvanced.length > 0 && (
        <NavigationMenu>
          <NavigationMenuList>
            <NavigationMenuItem>
              <NavigationMenuTrigger 
                className={cn(
                  "h-9 px-3 text-sm",
                  isAdvancedActive && "bg-primary text-primary-foreground"
                )}
              >
                Advanced
              </NavigationMenuTrigger>
              <NavigationMenuContent>
                <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px]">
                  {visibleAdvanced.map((item) => {
                    const Icon = item.icon;
                    return (
                      <li key={item.path}>
                        <NavigationMenuLink asChild>
                          <Link
                            to={item.path}
                            className={cn(
                              "block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
                              location.pathname === item.path && "bg-accent"
                            )}
                          >
                            <div className="flex items-center gap-2 text-sm font-medium leading-none">
                              <Icon className="w-4 h-4" />
                              {item.label}
                            </div>
                            <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                              {item.description}
                            </p>
                          </Link>
                        </NavigationMenuLink>
                      </li>
                    );
                  })}
                </ul>
              </NavigationMenuContent>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>
      )}
    </nav>
  );
};