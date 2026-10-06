import { describe, expect, it } from "vitest";
import { scoreSubmission } from "../../src/modules/hr-forms-workflows/scoring";
import type { HRFormTemplate } from "../../src/modules/hr-forms-workflows/types";

describe("HR Forms scoring", () => {
  it("calculates configurable weighted score", () => {
    const t = {
      id:"x", organizationId:"o", formCode:"X", title:"X", category:"Recruitment",
      status:"published", version:"1", sensitivity:"confidential", aiGenerated:false,
      createdBy:"u", createdAt:"x", updatedBy:"u", updatedAt:"x",
      fields:[
        {id:"q1",kind:"scale_1_5",label:"Q1",scoring:{enabled:true,min:1,max:5,weight:60}},
        {id:"q2",kind:"scale_1_5",label:"Q2",scoring:{enabled:true,min:1,max:5,weight:40}}
      ]
    } as HRFormTemplate;
    const s = scoreSubmission(t,{q1:5,q2:3});
    expect(Math.round(s.weightedTotal!)).toBe(80);
  });
});
