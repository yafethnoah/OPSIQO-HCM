import { describe, expect, it } from "vitest";
import {
  ALLOWED_EVENT_NAMES,
  OPSIQO_ANALYTICS_EVENTS,
} from "../../src/lib/product-analytics/eventCatalog";

describe("OPSIQO analytics catalog", () => {
  it("uses only the OPSIQO namespace", () => {
    for (const eventName of Object.values(OPSIQO_ANALYTICS_EVENTS)) {
      expect(eventName.startsWith("opsiqo_")).toBe(true);
    }
  });

  it("contains no duplicate event names", () => {
    const events = Object.values(OPSIQO_ANALYTICS_EVENTS);
    expect(new Set(events).size).toBe(events.length);
    expect(ALLOWED_EVENT_NAMES.size).toBe(events.length);
  });
});
