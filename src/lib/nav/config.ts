import {
  Search,
  BarChart,
  Target,
  Users,
  FileText,
  Activity,
  Map,
  BookOpen,
  User,
  CreditCard,
  Shield,
  Database,
  Settings,
  FileSearch,
  Layers,
  Eye,
  MessageSquare,
  ClipboardList,
  TrendingUp,
  Lock,
  Cookie,
  LayoutDashboard,
  ListChecks,
  Zap,
  Globe,
  Key,
  TrendingDown,
  Info,
  BarChart2,
  LogOut
} from "lucide-react";
import { LucideIcon } from "lucide-react";

export interface NavItem {
  path: string;
  label: string;
  icon: LucideIcon;
  description?: string;
  requiresAuth?: boolean;
  requiresAdmin?: boolean;
  tourId?: string;
}

// Main header navigation (for ALL authenticated users - admin and non-admin see the same)
export const headerNav: NavItem[] = [
  {
    path: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    description: "Usage dashboard",
    requiresAuth: true
  },
  {
    path: "/research",
    label: "Research",
    icon: Search,
    description: "Keyword research",
    requiresAuth: true,
    tourId: "research-tab"
  },
  {
    path: "/keyword-results",
    label: "Results",
    icon: BarChart,
    description: "View results",
    requiresAuth: true
  },
  {
    path: "/serp-analysis",
    label: "SERP",
    icon: Target,
    description: "SERP analysis",
    requiresAuth: true
  },
  {
    path: "/related-keywords",
    label: "Related",
    icon: TrendingUp,
    description: "Related keywords",
    requiresAuth: true
  },
  {
    path: "/bulk-checker",
    label: "Bulk Checker",
    icon: ListChecks,
    description: "Bulk keyword checker",
    requiresAuth: true
  },
  {
    path: "/competitor-analyzer",
    label: "Competitor",
    icon: Users,
    description: "Competitor analysis",
    requiresAuth: true,
    tourId: "competitor-tab"
  },
  {
    path: "/pricing",
    label: "Pricing",
    icon: CreditCard,
    description: "View pricing plans"
  }
  // Removed: Docs, Status, Changelog, Roadmap (admins see same nav as regular users)
];

// Advanced tools navigation
export const advancedNav: NavItem[] = [
  {
    path: "/advanced/keywords-for-site",
    label: "Keywords for Site",
    icon: Globe,
    description: "Find keywords a domain ranks for",
    requiresAuth: true
  },
  {
    path: "/advanced/keywords-for-keywords",
    label: "Keywords for Keywords",
    icon: Key,
    description: "Generate keyword suggestions",
    requiresAuth: true
  },
  {
    path: "/advanced/ad-traffic-by-keywords",
    label: "Ad Traffic Forecast",
    icon: TrendingDown,
    description: "Forecast ad traffic for keywords",
    requiresAuth: true
  },
  {
    path: "/advanced/google-ads-status",
    label: "Google Ads Status",
    icon: Info,
    description: "Check Google Ads data freshness",
    requiresAuth: true,
    requiresAdmin: true
  },
  {
    path: "/advanced/dataforseo-search-volume",
    label: "DataForSEO Volume",
    icon: BarChart2,
    description: "Get search volume from DataForSEO",
    requiresAuth: true,
    requiresAdmin: true
  },
  {
    path: "/advanced/search-volume-advanced",
    label: "Advanced Search Volume",
    icon: Zap,
    description: "Search volume with advanced filters",
    requiresAuth: true
  }
];

// Account menu navigation
export const accountNav: NavItem[] = [
  {
    path: "/profile",
    label: "Profile",
    icon: User,
    description: "Manage your profile",
    requiresAuth: true
  },
  {
    path: "/account",
    label: "Settings",
    icon: Settings,
    description: "Account settings",
    requiresAuth: true
  },
  {
    path: "/sign-out",
    label: "Sign Out",
    icon: LogOut,
    description: "Sign out of your account",
    requiresAuth: true
  }
];

// Admin navigation
export const adminNav: NavItem[] = [
  {
    path: "/admin",
    label: "Dashboard",
    icon: BarChart,
    description: "Admin dashboard",
    requiresAdmin: true
  },
  {
    path: "/admin/users",
    label: "Users",
    icon: Users,
    description: "User management",
    requiresAdmin: true
  },
  {
    path: "/admin/research",
    label: "Research",
    icon: FileSearch,
    description: "All research",
    requiresAdmin: true
  },
  {
    path: "/admin/subscriptions",
    label: "Subscriptions",
    icon: CreditCard,
    description: "Manage subscriptions",
    requiresAdmin: true
  },
  {
    path: "/admin/usage",
    label: "API Usage",
    icon: Activity,
    description: "API usage metrics",
    requiresAdmin: true
  },
  {
    path: "/admin/clustering",
    label: "Clustering",
    icon: Layers,
    description: "Keyword clustering",
    requiresAdmin: true
  },
  {
    path: "/admin/observability",
    label: "Observability",
    icon: Eye,
    description: "System monitoring",
    requiresAdmin: true
  },
  {
    path: "/admin/status",
    label: "Status Admin",
    icon: Activity,
    description: "Manage status page",
    requiresAdmin: true
  },
  {
    path: "/admin/changelog",
    label: "Changelog Admin",
    icon: ClipboardList,
    description: "Manage changelog",
    requiresAdmin: true
  },
  {
    path: "/admin/roadmap",
    label: "Roadmap Admin",
    icon: Map,
    description: "Manage roadmap",
    requiresAdmin: true
  },
  {
    path: "/admin/env-check",
    label: "Environment",
    icon: Settings,
    description: "Environment check",
    requiresAdmin: true
  },
  {
    path: "/admin/connection-diagnostic",
    label: "Connection Diagnostic",
    icon: Settings,
    description: "Test Edge Function deployment",
    requiresAdmin: true
  },
  {
    path: "/admin/logs",
    label: "Server Logs",
    icon: FileText,
    description: "View server logs",
    requiresAdmin: true
  },
  {
    path: "/admin/cookie-settings",
    label: "Cookie Banner",
    icon: Cookie,
    description: "Cookie consent settings",
    requiresAdmin: true
  }
];

// Footer navigation (public links)
export const footerNav: NavItem[] = [
  {
    path: "/about",
    label: "About",
    icon: FileText,
    description: "About us"
  },
  {
    path: "/roadmap",
    label: "Roadmap",
    icon: Map,
    description: "Product roadmap"
  },
  {
    path: "/status",
    label: "Status",
    icon: Activity,
    description: "System status"
  },
  {
    path: "/changelog",
    label: "Changelog",
    icon: ClipboardList,
    description: "Updates"
  },
  {
    path: "/docs/troubleshooting",
    label: "Docs",
    icon: BookOpen,
    description: "Documentation"
  },
  {
    path: "/legal/terms",
    label: "Terms",
    icon: FileText,
    description: "Terms of Service"
  },
  {
    path: "/legal/privacy",
    label: "Privacy",
    icon: Shield,
    description: "Privacy Policy"
  },
  {
    path: "/legal/contact",
    label: "Contact",
    icon: MessageSquare,
    description: "Contact us"
  }
];

// Helper functions
export function filterByAuth(items: NavItem[], isAuthenticated: boolean): NavItem[] {
  return items.filter(item => !item.requiresAuth || isAuthenticated);
}

export function filterByAdmin(items: NavItem[], isAdmin: boolean): NavItem[] {
  return items.filter(item => !item.requiresAdmin || isAdmin);
}

export function getVisibleNavItems(
  items: NavItem[],
  isAuthenticated: boolean,
  isAdmin: boolean = false
): NavItem[] {
  let filtered = filterByAuth(items, isAuthenticated);
  filtered = filterByAdmin(filtered, isAdmin);
  return filtered;
}
