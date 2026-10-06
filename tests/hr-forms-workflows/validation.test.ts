import { describe, expect, it } from "vitest";
import { validateSubmission } from "../../src/modules/hr-forms-workflows/validation";
import type { HRFormTemplate } from "../../src/modules/hr-forms-workflows/types";

const template: HRFormTemplate = {
  id:"t1", organizationId:"o1", formCode:"T1", title:"Test",
  category:"Custom", status:"published", version:"1.0",
  sensitivity:"internal", aiGenerated:false,
  createdBy:"u1", createdAt:"2026-01-01", updatedBy:"u1", updatedAt:"2026-01-01",
  fields:[
    { id:"email", kind:"email", label:"Email", required:true,
      validation:[{kind:"email",message:"Invalid email"}] }
  ]
};

describe("HR Forms validation", () => {
  it("blocks missing required", () => {
    expect(validateSubmission(template, {})).toHaveLength(1);
  });
  it("blocks invalid email", () => {
    expect(validateSubmission(template, {email:"bad"}).map(x=>x.code)).toContain("email");
  });
  it("accepts valid email", () => {
    expect(validateSubmission(template, {email:"a@example.com"})).toHaveLength(0);
  });
});
