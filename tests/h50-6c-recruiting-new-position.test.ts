import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("H50.6C recruiting new-position workflow", () => {
  it("offers inline position creation from the requisition workflow", () => {
    const ui = read("src/components/recruiting-workspace.tsx");
    expect(ui).toContain("+ Create new position from this requisition");
    expect(ui).toContain("Create new position");
    expect(ui).toContain("Create & select position");
    expect(ui).toContain('data-h50-6c-new-position="true"');
    expect(ui).toContain("startNewPositionFromRequisition");
    expect(ui).toContain("createNewPositionFromRequisition");
  });

  it("does not strand a requisition when the selected org unit has no positions", () => {
    const ui = read("src/components/recruiting-workspace.tsx");
    expect(ui).toContain("disabled={!reqUnitId}");
    expect(ui).toContain('CREATE_NEW_POSITION_VALUE = "__create_new_position__"');
    expect(ui).toContain("No position yet — create one below");
    expect(ui).toContain("Position Management permission");
    expect(ui).toContain("reqPositionId === CREATE_NEW_POSITION_VALUE");
  });

  it("prefills supported position fields from the current requisition", () => {
    const ui = read("src/components/recruiting-workspace.tsx");
    expect(ui).toContain('document.getElementById(');
    expect(ui).toContain('"requisition-create-form"');
    expect(ui).toContain('values.get("title")');
    expect(ui).toContain('values.get("location")');
    expect(ui).toContain('values.get("headcount")');
    expect(ui).toContain("suggestPositionCode");
  });

  it("creates through the governed positions API and auto-selects the result", () => {
    const ui = read("src/components/recruiting-workspace.tsx");
    expect(ui).toContain('can("positions.manage")');
    expect(ui).toContain("`/api/organizations/${activeOrgId()}/positions`");
    expect(ui).toContain('method: "POST"');
    expect(ui).toContain("positionCode,");
    expect(ui).toContain("orgUnitId: reqUnitId");
    expect(ui).toContain("headcountLimit,");
    expect(ui).toContain("reportsToPositionId:");
    expect(ui).toContain("setReqPositionId(created.id)");
  });

  it("keeps server-side position creation permission enforcement", () => {
    const route = read("src/app/api/organizations/[orgId]/positions/route.ts");
    expect(route).toContain("requirePermission(actor, 'positions.manage')");
    expect(route).toContain("createPosition(actor, await request.json())");
  });

  it("uses only fields accepted by the existing position contract", () => {
    const schemas = read("src/lib/hr/schemas.ts");
    for (const field of [
      "positionCode",
      "title",
      "orgUnitId",
      "reportsToPositionId",
      "status",
      "fte",
      "headcountLimit",
      "location",
      "jobFamily",
      "grade",
    ]) {
      expect(schemas).toContain(`${field}:`);
    }
  });

  it("publishes H50.6C release identity", () => {
    const identity = read("src/lib/release/identity.ts");
    expect(identity).toContain(
      "OPSIQO_PATCH_RELEASE = process.env.OPSIQO_PATCH_RELEASE || 'H50.6C'",
    );
  });
});
