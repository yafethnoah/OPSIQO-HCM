import { describe, expect, it } from "vitest";
import { classifyRoute } from "../../src/lib/ux-performance/routeClassifier";

describe("route classifier", () => {
  it("classifies known route groups", () => {
    expect(classifyRoute("/home")).toBe("home");
    expect(classifyRoute("/employees/abc")).toBe("core_hr");
    expect(classifyRoute("/leave/request")).toBe("leave");
    expect(classifyRoute("/recruiting/jobs")).toBe("recruiting");
  });

  it("drops query strings and fragments", () => {
    expect(classifyRoute("/employees?id=secret#section")).toBe("core_hr");
  });

  it("does not return raw route data", () => {
    expect(classifyRoute("/some/custom/employee/12345")).toBe("other");
  });
});
