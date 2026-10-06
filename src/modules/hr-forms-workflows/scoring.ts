import { HRFormField, HRFormTemplate } from "./types";

export interface ScoreResult {
  sectionScores: Record<string, number>;
  weightedTotal?: number;
  missingScoredResponses: string[];
}

export function scoreSubmission(
  template: HRFormTemplate,
  answers: Record<string, unknown>
): ScoreResult {
  const sectionScores: Record<string, number> = {};
  const missingScoredResponses: string[] = [];
  let weightedNumerator = 0;
  let totalWeight = 0;

  const walk = (fields: HRFormField[], section = "general") => {
    for (const field of fields) {
      const nextSection = field.kind === "section" ? field.id : section;
      if (field.scoring?.enabled) {
        const raw = answers[field.id];
        if (raw === undefined || raw === null || raw === "") {
          missingScoredResponses.push(field.id);
        } else {
          const min = field.scoring.min ?? 1;
          const max = field.scoring.max ?? 5;
          const value = Number(raw);
          const normalized = Math.max(0, Math.min(1, (value - min) / Math.max(1, max - min)));
          const percent = normalized * 100;
          sectionScores[nextSection] = ((sectionScores[nextSection] ?? 0) + percent) / 2 || percent;
          if (field.scoring.weight !== undefined) {
            weightedNumerator += percent * field.scoring.weight;
            totalWeight += field.scoring.weight;
          }
        }
      }
      if (field.children?.length) walk(field.children, nextSection);
    }
  };

  walk(template.fields);
  return {
    sectionScores,
    weightedTotal: totalWeight ? weightedNumerator / totalWeight : undefined,
    missingScoredResponses
  };
}
