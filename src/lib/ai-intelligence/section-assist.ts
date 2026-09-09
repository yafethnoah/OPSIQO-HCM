export interface SectionAiAssistConfig {
  id: string;
  label: string;
  description: string;
  presets: Array<{ label: string; prompt: string }>;
}

const configs: Array<{ prefixes: string[]; config: SectionAiAssistConfig }> = [
  {
    prefixes: ['/dashboard', '/lifecycle'],
    config: {
      id: 'executive',
      label: 'Executive & workforce',
      description: 'Summaries, risks, priorities and evidence-grounded plans.',
      presets: [
        { label: 'Executive summary', prompt: 'Generate a concise executive workforce summary from current governed OPSIQO evidence. Separate facts, risks, assumptions and recommended human review actions.' },
        { label: 'Top HR priorities', prompt: 'Identify the highest-priority HR operational issues supported by current governed evidence and draft a non-consequential 30-day review plan.' },
      ],
    },
  },
  {
    prefixes: ['/recruiting', '/ats'],
    config: {
      id: 'recruiting',
      label: 'Recruiting',
      description: 'Job content, outreach, interview structure and evidence summaries.',
      presets: [
        { label: 'Draft job description', prompt: 'Draft a professional job-description framework using available governed recruiting and organizational evidence. Mark missing facts as assumptions. Do not rank, select or reject candidates.' },
        { label: 'Draft interview guide', prompt: 'Draft a structured job-related interview guide and scoring rubric framework. Do not make or recommend a hiring decision and do not use protected or sensitive traits.' },
        { label: 'Candidate evidence summary', prompt: 'Summarize available job-related candidate and requisition evidence without ranking candidates or recommending hire/reject outcomes. Identify evidence gaps for recruiter review.' },
      ],
    },
  },
  {
    prefixes: ['/onboarding'],
    config: {
      id: 'onboarding',
      label: 'Onboarding',
      description: 'Plans, checklists and employee communications.',
      presets: [
        { label: 'Draft onboarding plan', prompt: 'Draft a practical 30-day onboarding plan using governed OPSIQO role and organizational evidence. Include owners, checkpoints and missing-information assumptions.' },
        { label: 'Draft welcome message', prompt: 'Draft a warm professional new-hire welcome message based only on permitted organizational evidence. Do not invent personal facts.' },
      ],
    },
  },
  {
    prefixes: ['/people', '/positions'],
    config: {
      id: 'people',
      label: 'People & positions',
      description: 'Role summaries, manager communications and data-quality review.',
      presets: [
        { label: 'Draft role summary', prompt: 'Draft a clear role and responsibility summary from governed position and organizational evidence. Identify missing or conflicting information.' },
        { label: 'Data-quality review', prompt: 'Explain the most important people-data quality or lifecycle issues supported by current evidence and draft a review checklist. Do not make employment decisions.' },
      ],
    },
  },
  {
    prefixes: ['/performance'],
    config: {
      id: 'performance',
      label: 'Performance',
      description: 'Goals, coaching structures and development-focused drafts.',
      presets: [
        { label: 'Draft goal framework', prompt: 'Draft a measurable performance-goal framework using governed role and organizational evidence. Do not assign an individual performance rating or recommend promotion or discipline.' },
        { label: 'Draft coaching agenda', prompt: 'Draft a neutral manager coaching conversation agenda focused on expectations, evidence and development. Do not determine ratings, discipline, PIP or promotion outcomes.' },
      ],
    },
  },
  {
    prefixes: ['/learning', '/career', '/career-gps'],
    config: {
      id: 'development',
      label: 'Learning & career',
      description: 'Development plans, skills gaps and learning recommendations.',
      presets: [
        { label: 'Draft development plan', prompt: 'Draft a development and learning plan from permitted skills, role and organizational evidence. Do not select anyone for promotion or succession.' },
        { label: 'Explain skills gaps', prompt: 'Explain evidence-supported skills or capability gaps and draft a learning response plan. Clearly state evidence limitations.' },
      ],
    },
  },
  {
    prefixes: ['/policies', '/compliance', '/regulatory'],
    config: {
      id: 'policy',
      label: 'Policy & compliance',
      description: 'Policy drafts, control explanations and impact summaries.',
      presets: [
        { label: 'Draft policy update', prompt: 'Draft a policy or procedure update based on governed OPSIQO evidence. Label it as a draft requiring authorized and, where needed, qualified legal review. Do not declare legal compliance.' },
        { label: 'Explain compliance impact', prompt: 'Explain the operational compliance impact supported by current evidence, identify gaps, and draft a human-review action checklist. Do not provide a final legal conclusion.' },
      ],
    },
  },
  {
    prefixes: ['/time', '/leave', '/expenses'],
    config: {
      id: 'time',
      label: 'Time, leave & expenses',
      description: 'Anomaly explanations, checklists and neutral communications.',
      presets: [
        { label: 'Explain anomalies', prompt: 'Explain attendance, time, leave or expense anomalies supported by governed evidence and draft a review checklist. Do not alter records or recommend discipline.' },
        { label: 'Draft employee follow-up', prompt: 'Draft a neutral fact-seeking employee follow-up message about an attendance, time, leave or expense discrepancy. Do not assume misconduct or recommend discipline.' },
      ],
    },
  },
  {
    prefixes: ['/compensation', '/payroll'],
    config: {
      id: 'pay',
      label: 'Compensation & payroll',
      description: 'Control explanations, review checklists and communications.',
      presets: [
        { label: 'Explain pay controls', prompt: 'Explain payroll or compensation control risks supported by governed aggregate evidence and draft a review checklist. Do not recommend an individual pay outcome.' },
        { label: 'Draft pay communication', prompt: 'Draft a neutral payroll or compensation process communication using governed evidence. Do not determine or recommend any individual compensation change.' },
      ],
    },
  },
  {
    prefixes: ['/employee-relations'],
    config: {
      id: 'er',
      label: 'Employee relations',
      description: 'Neutral summaries, investigation planning and communications.',
      presets: [
        { label: 'Draft neutral case summary', prompt: 'Draft a neutral factual employee-relations case summary from permitted evidence, clearly separating allegations, established facts, gaps and next review steps. Do not recommend discipline or dismissal.' },
        { label: 'Draft investigation questions', prompt: 'Draft neutral fact-finding questions and an investigation meeting agenda. Do not determine credibility, discipline or an employment outcome.' },
      ],
    },
  },
  {
    prefixes: ['/safety'],
    config: {
      id: 'safety',
      label: 'Health & safety',
      description: 'Incident summaries, prevention actions and meeting drafts.',
      presets: [
        { label: 'Draft safety follow-up', prompt: 'Draft a safety follow-up and prevention checklist from governed incident and operational evidence. Do not make medical or employment decisions.' },
        { label: 'Draft committee agenda', prompt: 'Draft a health and safety committee agenda focused on evidence-supported hazards, controls and follow-up actions.' },
      ],
    },
  },
  {
    prefixes: ['/workforce-planning', '/people-analytics'],
    config: {
      id: 'analytics',
      label: 'Workforce planning & analytics',
      description: 'Trend explanations, scenarios and planning drafts.',
      presets: [
        { label: 'Explain workforce trends', prompt: 'Explain the most important workforce trends and data-quality limitations supported by governed aggregate evidence. Distinguish observations from forecasts.' },
        { label: 'Draft planning options', prompt: 'Draft non-consequential workforce planning options from approved aggregate evidence and scenarios. Do not select named people for employment actions.' },
      ],
    },
  },
  {
    prefixes: ['/strategy', '/org-design', '/resilience'],
    config: {
      id: 'strategy',
      label: 'Strategy & organization design',
      description: 'Scenario summaries, operating-model options and plans.',
      presets: [
        { label: 'Draft strategy brief', prompt: 'Draft an evidence-grounded workforce strategy brief with risks, assumptions, options and human decision points. Do not select individuals for restructuring or employment actions.' },
        { label: 'Explain org-design risks', prompt: 'Explain aggregate organization-design or resilience risks and draft a review plan. Do not identify named workers for removal, promotion, succession or reassignment.' },
      ],
    },
  },
  {
    prefixes: ['/privacy', '/security-operations', '/identity', '/integrations'],
    config: {
      id: 'trust',
      label: 'Trust, privacy & integrations',
      description: 'Control summaries, exception analysis and remediation drafts.',
      presets: [
        { label: 'Explain control gaps', prompt: 'Explain evidence-supported privacy, security, identity or integration control gaps and draft a remediation review plan. Do not expose credentials or individual security payloads.' },
        { label: 'Draft risk brief', prompt: 'Draft a concise operational risk brief from governed aggregate evidence, including limitations, owners for human review and next checks.' },
      ],
    },
  },
  {
    prefixes: ['/service', '/experience'],
    config: {
      id: 'experience',
      label: 'Employee experience & service',
      description: 'Service summaries, communications and improvement plans.',
      presets: [
        { label: 'Draft service response', prompt: 'Draft a professional employee-service response using permitted governed evidence. Do not invent case facts or make consequential employment decisions.' },
        { label: 'Draft improvement plan', prompt: 'Draft an employee-experience improvement plan from governed aggregate evidence, with measures, owners and review checkpoints.' },
      ],
    },
  },
  {
    prefixes: ['/separation'],
    config: {
      id: 'offboarding',
      label: 'Offboarding',
      description: 'Approved offboarding checklists and neutral communications only.',
      presets: [
        { label: 'Draft offboarding checklist', prompt: 'Draft an administrative offboarding checklist for a separation that has already been authorized by a human. Do not decide whether any person should leave employment.' },
        { label: 'Draft neutral communication', prompt: 'Draft a neutral administrative offboarding communication for an already-authorized process. Do not make or recommend an employment decision.' },
      ],
    },
  },
];

const NEXT_ACTION_PRESET = {
  label: 'What should I do next?',
  prompt: 'Using only governed OPSIQO evidence for the current page, identify the single most useful next operational action. Include: detected issue, why it matters, supporting evidence, responsible owner, deadline or timing, confidence, approval status, and an exact preview of what OPSIQO would prepare or change. Do not execute or recommend a consequential employment decision; route those to authorized human review.',
};

export function getSectionAiAssist(pathname: string): SectionAiAssistConfig | null {
  const path = String(pathname || '').toLowerCase();
  const match = configs.find(({ prefixes }) =>
    prefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`)),
  );
  if (!match) return null;
  const base = match.config;
  const presets = base.presets.some((preset) => preset.label === NEXT_ACTION_PRESET.label)
    ? base.presets
    : [...base.presets, NEXT_ACTION_PRESET];
  return { ...base, presets };
}

export function sectionAiAssistConfigs(): SectionAiAssistConfig[] {
  return configs.map(({ config }) => config);
}
