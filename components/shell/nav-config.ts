import { pendingReviewsCountMock } from "@/components/mocks/reviews";

export interface NavItem {
  label: string;
  href: string;
  /** Marigold count badge (Review Inbox pending count). */
  countBadge?: number;
  /** Small outline badge (PAID / PUBLIC). */
  outlineBadge?: string;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

/** Sidebar inventory — exactly the prototype's groups and order. */
export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Main",
    items: [
      { label: "Dashboard", href: "/dashboard" },
      { label: "New Audit", href: "/audits/new" },
    ],
  },
  {
    label: "Business workspace",
    items: [
      { label: "Audit Report", href: "/report" },
      { label: "Competitors", href: "/competitors" },
      { label: "Grid Scan", href: "/grid" },
      // Sweep fix: badge derives from the reviews mock, not a literal.
      { label: "Review Inbox", href: "/reviews", countBadge: pendingReviewsCountMock },
      { label: "Post Audit", href: "/posts" },
      { label: "Website Audit", href: "/website" },
    ],
  },
  {
    label: "Tools",
    items: [
      { label: "AI Tools", href: "/ai-tools" },
      { label: "Optimization", href: "/sprint", outlineBadge: "PAID" },
      { label: "Client Ops", href: "/client-ops" },
    ],
  },
  {
    label: "Other",
    items: [
      { label: "Public Checker", href: "/public-checker", outlineBadge: "PUBLIC" },
      { label: "Settings & Spend", href: "/settings" },
      { label: "Account", href: "/account" },
      { label: "Design System", href: "/design-system" },
    ],
  },
];

/** Screens that show the business switcher in the top bar. */
const WORKSPACE_ROUTES = [
  "/report",
  "/competitors",
  "/grid",
  "/reviews",
  "/posts",
  "/website",
];

export function isWorkspaceRoute(pathname: string): boolean {
  return WORKSPACE_ROUTES.some((r) => pathname.startsWith(r));
}

export function titleFor(pathname: string): string {
  for (const g of NAV_GROUPS)
    for (const it of g.items)
      if (pathname.startsWith(it.href)) return it.label;
  return "GMB सारथी";
}
