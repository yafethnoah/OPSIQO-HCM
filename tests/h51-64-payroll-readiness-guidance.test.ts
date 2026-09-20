import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("H51.64 payroll readiness guidance", () => {
  it("reuses authoritative payroll readiness instead of creating fake paychecks", () => {
    const ledger = read("src/components/paycheck-ledger.tsx");

    expect(ledger).toContain("/payroll/readiness");
    expect(ledger).toContain("Exact payroll blockers");
    expect(ledger).toContain("does not fabricate paycheck amounts");
    expect(ledger).not.toContain("seed paycheck");
    expect(ledger).not.toContain("mock paycheck");
  });

  it("shows worker and UAT provider readiness when the ledger is empty", () => {
    const ledger = read("src/components/paycheck-ledger.tsx");

    expect(ledger).toContain("Ready workers");
    expect(ledger).toContain("Blocked workers");
    expect(ledger).toContain("UAT payroll provider");
    expect(ledger).toContain("/payroll/dashboard");
  });

  it("routes common blockers to the correct resolution workspace", () => {
    const ledger = read("src/components/paycheck-ledger.tsx");

    expect(ledger).toContain("return '/compensation'");
    expect(ledger).toContain("return '/time'");
    expect(ledger).toContain("`/people/${encodeURIComponent(workerId)}`");
  });

  it("adds stable payroll anchors for readiness, provider setup and controlled run", () => {
    const payroll = read("src/components/payroll-workspace.tsx");

    expect(payroll).toContain('id="payroll-readiness"');
    expect(payroll).toContain('id="payroll-providers"');
    expect(payroll).toContain('id="payroll-controlled-regular-run"');
  });

  it("preserves the H51.63 Paid and Excel workflows", () => {
    const ledger = read("src/components/paycheck-ledger.tsx");

    expect(ledger).toContain("Mark as Paid");
    expect(ledger).toContain("Saved as Paid");
    expect(ledger).toContain("Download Paycheck Excel");
    expect(ledger).toContain("/payroll/paychecks/export");
  });
});