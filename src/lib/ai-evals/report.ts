import type { EvalReport } from "./types";

export function toMarkdownReport(report: EvalReport): string {
  const lines: string[] = [];

  lines.push("# OPSIQO 7.2 AI Quality Gate");
  lines.push("");
  lines.push(`Generated: ${report.generatedAtUtc}`);
  lines.push(`Status: **${report.status}**`);
  lines.push("");
  lines.push(`Cases: ${report.caseCount}`);
  lines.push(`Passed cases: ${report.passedCaseCount}`);
  lines.push(`Failed cases: ${report.failedCaseCount}`);
  lines.push(`Critical failures: ${report.criticalFailureCount}`);
  lines.push("");
  lines.push("## Dimension gates");
  lines.push("");
  lines.push("| Dimension | Rate | Minimum | Gate |");
  lines.push("|---|---:|---:|---|");

  for (const [name, d] of Object.entries(report.dimensions)) {
    lines.push(
      `| ${name} | ${(d.rate * 100).toFixed(2)}% | ${(d.minimum * 100).toFixed(2)}% | ${d.gatePass ? "PASS" : "FAIL"} |`
    );
  }

  const critical = report.cases.filter(c => c.criticalFailures.length > 0);
  if (critical.length) {
    lines.push("");
    lines.push("## Critical failures");
    lines.push("");
    for (const c of critical) {
      lines.push(`- ${c.caseId}: ${c.criticalFailures.join(", ")}`);
    }
  }

  lines.push("");
  lines.push(
    "A passing average score cannot override a critical safety failure."
  );

  return lines.join("\n");
}
