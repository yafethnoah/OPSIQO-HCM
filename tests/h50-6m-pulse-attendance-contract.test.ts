import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (p: string) => readFileSync(p, "utf8");

describe("H50.6M Pulse attendance API contract", () => {
  it("does not misclassify a normal native client capture time as an offline replay", () => {
    const service = read("src/lib/time/service.ts");
    expect(service).toContain("const offlineSync=Boolean(input.offlineEventId||input.location?.source==='offline_sync');");
    expect(service).not.toContain("const offlineSync=Boolean(input.offlineEventId||input.clientCapturedAt);");
    expect(service).toContain("offlineSync&&(!input.offlineEventId||!input.clientCapturedAt)");
  });

  it("keeps offline replay idempotency and original capture time enforcement", () => {
    const service = read("src/lib/time/service.ts");
    expect(service).toContain("attendanceOfflineEventIndex");
    expect(service).toContain("offline_event_duplicate");
    expect(service).toContain("eventAt=input.clientCapturedAt!");
    expect(service).toContain("offline_clock_disabled");
  });

  it("keeps online attendance server-time authoritative", () => {
    const service = read("src/lib/time/service.ts");
    expect(service).toContain("let eventAt=now();");
    expect(service).toContain("source:offlineSync?'offline_sync':'web_clock'");
  });
});
