import type { RouteGroup } from "./performanceTypes";

const ROUTES: Array<[RegExp, RouteGroup]> = [
  [/^\/home(?:\/|$)/, "home"],
  [/^\/employees?(?:\/|$)/, "core_hr"],
  [/^\/(?:time|leave)(?:\/|$)/, "leave"],
  [/^\/recruit/, "recruiting"],
  [/^\/onboard/, "onboarding"],
  [/^\/documents?(?:\/|$)/, "documents"],
  [/^\/imports?(?:\/|$)/, "imports"],
  [/^\/studio(?:\/|$)/, "studio"],
  [/^\/analytics(?:\/|$)/, "analytics"],
  [/^\/admin(?:\/|$)/, "admin"],
];

export function classifyRoute(pathname: string): RouteGroup {
  const safePath = pathname.split("?")[0].split("#")[0];
  for (const [pattern, group] of ROUTES) {
    if (pattern.test(safePath)) return group;
  }
  return "other";
}
