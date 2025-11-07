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
  LayoutDashboard
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
    path: "/competitor-analyzer",
    label: "Competitor",
    icon: Users,
    description: "Competitor analysis",
    requiresAuth: true,
    tourId: "competitor-tab"
  },
  {
    path: "/my-research",
    label: "My Research",
    icon: Database,
    description: "View your research history",
    requiresAuth: true
  }
  // Removed: Docs, Status, Changelog, Roadmap (admins see same nav as regular users)
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
    path: "/billing",
    label: "Billing",
    icon: CreditCard,
    description: "Manage billing",
    requiresAuth: true
  },
  {
    path: "/privacy-settings",
    label: "Privacy",
    icon: Lock,
    description: "Privacy settings",
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
    path: "/terms",
    label: "Terms",
    icon: FileText,
    description: "Terms of Service"
  },
  {
    path: "/privacy",
    label: "Privacy",
    icon: Shield,
    description: "Privacy Policy"
  },
  {
    path: "/contact",
    label: "Contact",
    icon: MessageSquare,
    description: "Contact us"
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
    path: "/docs",
    label: "Docs",
    icon: BookOpen,
    description: "Documentation"
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
