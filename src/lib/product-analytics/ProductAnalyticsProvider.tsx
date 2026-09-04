"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { trackProductEvent } from "./productAnalytics";

const ROUTE_GROUPS: Array<[RegExp, string]> = [
  [/^\/home(?:\/|$)/, "home"],
  [/^\/employees?(?:\/|$)/, "core_hr"],
  [/^\/(time|leave)(?:\/|$)/, "leave"],
  [/^\/recruit/, "recruiting"],
  [/^\/onboard/, "onboarding"],
  [/^\/documents?(?:\/|$)/, "documents"],
  [/^\/imports?(?:\/|$)/, "imports"],
  [/^\/studio(?:\/|$)/, "studio"],
  [/^\/analytics(?:\/|$)/, "analytics"],
  [/^\/admin(?:\/|$)/, "admin"],
];

function routeGroup(pathname: string): string {
  for (const [pattern, group] of ROUTE_GROUPS) {
    if (pattern.test(pathname)) return group;
  }
  return "other";
}

function moduleForRoute(group: string): string {
  return group === "core_hr" ? "core_hr" : group;
}

export function ProductAnalyticsProvider({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;

    const group = routeGroup(pathname);

    void trackProductEvent("opsiqo_page_view", {
      module: moduleForRoute(group),
      route_group: group,
      source_surface: "app_router",
    });
  }, [pathname]);

  return children;
}
