import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  LogOut,
  LogIn,
  UserPlus,
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { useAdmin } from "@/hooks/useAdmin";
import { useNotificationCounts } from "@/hooks/useNotificationCounts";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { headerNav, advancedNav, accountNav, adminNav, getVisibleNavItems } from "@/lib/nav/config";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

// Animation variants for framer-motion
const sidebarVariants = {
  expanded: {
    width: "280px",
    transition: {
      duration: 0.3,
      ease: "easeInOut",
    },
  },
  collapsed: {
    width: "54px",
    transition: {
      duration: 0.3,
      ease: "easeInOut",
    },
  },
};

const contentVariants = {
  expanded: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.2,
      delay: 0.1,
    },
  },
  collapsed: {
    opacity: 0,
    x: -10,
    transition: {
      duration: 0.1,
    },
  },
};

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { isAdmin } = useAdmin();
  const { state, isMobile, open, setOpen } = useSidebar();
  const { toast } = useToast();
  const { counts } = useNotificationCounts();
  const [searchQuery, setSearchQuery] = useState("");
  const [isPinned, setIsPinned] = useState(true); // Default to pinned/open
  const [isHovering, setIsHovering] = useState(false);

  const isExpanded = state === "expanded";
  const isCollapsed = state === "collapsed";

  // Load pinned state from localStorage
  useEffect(() => {
    const savedPinned = localStorage.getItem("sidebar-pinned");
    if (savedPinned !== null) {
      setIsPinned(savedPinned === "true");
      setOpen(savedPinned === "true");
    } else {
      // If no saved state, default to pinned/open
      setIsPinned(true);
      setOpen(true);
      localStorage.setItem("sidebar-pinned", "true");
    }
  }, [setOpen]);

  // Handle hover expand when not pinned
  useEffect(() => {
    if (!isMobile && !isPinned) {
      setOpen(isHovering);
    }
  }, [isHovering, isPinned, isMobile, setOpen]);

  // Save pinned state to localStorage
  const togglePin = () => {
    const newPinned = !isPinned;
    setIsPinned(newPinned);
    setOpen(newPinned);
    localStorage.setItem("sidebar-pinned", String(newPinned));
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate("/auth/sign-in");
    } catch (error) {
      toast({
        title: "Error signing out",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  // Get visible nav items
  const visibleHeader = getVisibleNavItems(headerNav, !!user, isAdmin);
  const visibleAdvanced = getVisibleNavItems(advancedNav, !!user, isAdmin);
  const visibleAccount = getVisibleNavItems(accountNav, !!user, isAdmin);
  const visibleAdmin = getVisibleNavItems(adminNav, !!user, isAdmin);

  // Get user initials
  const getUserInitials = () => {
    if (!user?.email) return "U";
    return user.email
      .split("@")[0]
      .substring(0, 2)
      .toUpperCase();
  };

  // Get notification count for a specific path
  const getNotificationCount = (path: string): number => {
    if (path === '/research' || path === '/keyword-results') {
      return counts.newResearch;
    }
    if (path === '/project-members') {
      return counts.pendingInvites;
    }
    if (path === '/dashboard') {
      return counts.usageAlerts;
    }
    if (path === '/admin' && isAdmin) {
      return counts.adminAlerts;
    }
    return 0;
  };

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-border"
      onMouseEnter={() => !isMobile && setIsHovering(true)}
      onMouseLeave={() => !isMobile && setIsHovering(false)}
    >
      <SidebarHeader className="border-b border-border">
        <div className="flex items-center justify-between px-2 py-3">
          <Link to="/" className="flex items-center gap-2 min-w-0">
            {isExpanded ? (
              <motion.div
                variants={contentVariants}
                initial="collapsed"
                animate="expanded"
                className="flex items-center gap-2"
              >
                <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center shrink-0">
                  <Search className="w-5 h-5 text-primary-foreground" />
                </div>
                <span className="font-bold text-sm truncate">
                  Keyword Foundry Pro
                </span>
              </motion.div>
            ) : (
              <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
                <Search className="w-5 h-5 text-primary-foreground" />
              </div>
            )}
          </Link>
          {isExpanded && !isMobile && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={togglePin}
            >
              {isPinned ? (
                <ChevronLeft className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>

        {isExpanded && (
          <motion.div
            variants={contentVariants}
            initial="collapsed"
            animate="expanded"
            className="px-2 pb-2"
          >
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
          </motion.div>
        )}
      </SidebarHeader>

      <SidebarContent>
        <ScrollArea className="flex-1">
          {/* Account */}
          {visibleAccount.length > 0 && (
            <SidebarGroup>
              {isExpanded && (
                <SidebarGroupLabel>Account</SidebarGroupLabel>
              )}
              <SidebarGroupContent>
                <SidebarMenu>
                  {visibleAccount.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path;
                    const notificationCount = getNotificationCount(item.path);
                    const isSignOut = item.path === '/sign-out';

                    return (
                      <SidebarMenuItem key={item.path}>
                        <SidebarMenuButton
                          asChild={!isSignOut}
                          isActive={!isSignOut && isActive}
                          tooltip={isCollapsed ? item.label : undefined}
                          onClick={isSignOut ? handleSignOut : undefined}
                          className={isSignOut ? "cursor-pointer text-destructive hover:text-destructive hover:bg-destructive/10" : ""}
                        >
                          {isSignOut ? (
                            <div className="flex items-center w-full">
                              <Icon className="h-4 w-4" />
                              {isExpanded && (
                                <span className="flex-1">{item.label}</span>
                              )}
                            </div>
                          ) : (
                            <Link to={item.path} className="relative">
                              <Icon className="h-4 w-4" />
                              {isExpanded && (
                                <>
                                  <span className="flex-1">{item.label}</span>
                                  {notificationCount > 0 && (
                                    <Badge
                                      variant="destructive"
                                      className="ml-auto h-5 min-w-5 px-1 text-xs flex items-center justify-center"
                                    >
                                      {notificationCount > 99 ? '99+' : notificationCount}
                                    </Badge>
                                  )}
                                </>
                              )}
                              {isCollapsed && notificationCount > 0 && (
                                <span className="absolute -top-1 -right-1 h-4 w-4 bg-destructive text-destructive-foreground rounded-full text-[10px] flex items-center justify-center font-semibold">
                                  {notificationCount > 9 ? '9+' : notificationCount}
                                </span>
                              )}
                            </Link>
                          )}
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}

          {/* Core Tools */}
          <SidebarSeparator />
          <SidebarGroup>
            {isExpanded && (
              <SidebarGroupLabel>Core Tools</SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {visibleHeader.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  const notificationCount = getNotificationCount(item.path);

                  return (
                    <SidebarMenuItem key={item.path}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={isCollapsed ? item.label : undefined}
                      >
                        <Link to={item.path} data-tour={item.tourId} className="relative">
                          <Icon className="h-4 w-4" />
                          {isExpanded && (
                            <>
                              <span className="flex-1">{item.label}</span>
                              {notificationCount > 0 && (
                                <Badge
                                  variant="destructive"
                                  className="ml-auto h-5 min-w-5 px-1 text-xs flex items-center justify-center"
                                >
                                  {notificationCount > 99 ? '99+' : notificationCount}
                                </Badge>
                              )}
                            </>
                          )}
                          {isCollapsed && notificationCount > 0 && (
                            <span className="absolute -top-1 -right-1 h-4 w-4 bg-destructive text-destructive-foreground rounded-full text-[10px] flex items-center justify-center font-semibold">
                              {notificationCount > 9 ? '9+' : notificationCount}
                            </span>
                          )}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Advanced Tools */}
          {visibleAdvanced.length > 0 && (
            <>
              <SidebarSeparator />
              <SidebarGroup>
                {isExpanded && (
                  <SidebarGroupLabel>Advanced Tools</SidebarGroupLabel>
                )}
                <SidebarGroupContent>
                  <SidebarMenu>
                    {visibleAdvanced.map((item) => {
                      const Icon = item.icon;
                      const isActive = location.pathname === item.path;
                      const notificationCount = getNotificationCount(item.path);

                      return (
                        <SidebarMenuItem key={item.path}>
                          <SidebarMenuButton
                            asChild
                            isActive={isActive}
                            tooltip={isCollapsed ? item.label : undefined}
                          >
                            <Link to={item.path} className="relative">
                              <Icon className="h-4 w-4" />
                              {isExpanded && (
                                <>
                                  <span className="flex-1">{item.label}</span>
                                  {item.requiresAdmin && (
                                    <Badge
                                      variant="secondary"
                                      className="ml-auto text-xs"
                                    >
                                      Admin
                                    </Badge>
                                  )}
                                  {notificationCount > 0 && (
                                    <Badge
                                      variant="destructive"
                                      className="ml-2 h-5 min-w-5 px-1 text-xs flex items-center justify-center"
                                    >
                                      {notificationCount > 99 ? '99+' : notificationCount}
                                    </Badge>
                                  )}
                                </>
                              )}
                              {isCollapsed && notificationCount > 0 && (
                                <span className="absolute -top-1 -right-1 h-4 w-4 bg-destructive text-destructive-foreground rounded-full text-[10px] flex items-center justify-center font-semibold">
                                  {notificationCount > 9 ? '9+' : notificationCount}
                                </span>
                              )}
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </>
          )}

          {/* Admin Panel */}
          {isAdmin && visibleAdmin.length > 0 && (
            <>
              <SidebarSeparator />
              <SidebarGroup>
                {isExpanded && (
                  <SidebarGroupLabel className="text-primary">
                    Admin Panel
                  </SidebarGroupLabel>
                )}
                <SidebarGroupContent>
                  <SidebarMenu>
                    {visibleAdmin.map((item) => {
                      const Icon = item.icon;
                      const isActive = location.pathname === item.path;
                      const notificationCount = getNotificationCount(item.path);

                      return (
                        <SidebarMenuItem key={item.path}>
                          <SidebarMenuButton
                            asChild
                            isActive={isActive}
                            tooltip={isCollapsed ? item.label : undefined}
                          >
                            <Link to={item.path} className="relative">
                              <Icon className="h-4 w-4" />
                              {isExpanded && (
                                <>
                                  <span className="flex-1">{item.label}</span>
                                  {notificationCount > 0 && (
                                    <Badge
                                      variant="destructive"
                                      className="ml-auto h-5 min-w-5 px-1 text-xs flex items-center justify-center"
                                    >
                                      {notificationCount > 99 ? '99+' : notificationCount}
                                    </Badge>
                                  )}
                                </>
                              )}
                              {isCollapsed && notificationCount > 0 && (
                                <span className="absolute -top-1 -right-1 h-4 w-4 bg-destructive text-destructive-foreground rounded-full text-[10px] flex items-center justify-center font-semibold">
                                  {notificationCount > 9 ? '9+' : notificationCount}
                                </span>
                              )}
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </>
          )}
        </ScrollArea>
      </SidebarContent>

      <SidebarFooter className="border-t border-border">
        {user && (
          <div className="flex items-center gap-2 px-2 py-2 opacity-60">
            <Avatar className="h-8 w-8 rounded-lg">
              <AvatarFallback className="rounded-lg bg-primary/10 text-primary">
                {getUserInitials()}
              </AvatarFallback>
            </Avatar>
            {isExpanded && (
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold text-xs">
                  {user.user_metadata?.full_name || 'User'}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {user.email}
                </span>
              </div>
            )}
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
