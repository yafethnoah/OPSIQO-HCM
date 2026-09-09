export type PageGuideStep = {
  en: string;
  ar: string;
};

export type PageExperience = {
  id: string;
  titleEn: string;
  titleAr: string;
  purposeEn: string;
  purposeAr: string;
  nextEn: string;
  nextAr: string;
  steps: PageGuideStep[];
  exampleEn: string;
  exampleAr: string;
};

type Rule = {
  id: string;
  match: (pathname: string) => boolean;
  titleEn: string;
  titleAr: string;
  purposeEn: string;
  purposeAr: string;
  nextEn: string;
  nextAr: string;
  steps: PageGuideStep[];
  exampleEn: string;
  exampleAr: string;
};

function matchesAny(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function humanizePath(pathname: string): string {
  const value = pathname
    .split('?')[0]
    .split('#')[0]
    .split('/')
    .filter(Boolean)
    .pop() || 'OPSIQO';
  return value
    .replace(/\[.*?\]/g, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

const commonSteps = {
  review: { en: 'Review the page purpose, current status and any blockers.', ar: 'راجع هدف الصفحة والحالة الحالية وأي عوائق.' },
  evidence: { en: 'Confirm the source data and evidence before relying on a recommendation.', ar: 'تحقق من بيانات المصدر والأدلة قبل الاعتماد على أي توصية.' },
  next: { en: 'Complete the recommended next action or ask OPSIQO what to do next.', ar: 'أكمل الإجراء التالي الموصى به أو اسأل OPSIQO عما يجب فعله بعد ذلك.' },
  approval: { en: 'Review approvals before any sensitive or consequential action.', ar: 'راجع الموافقات قبل أي إجراء حساس أو مؤثر.' },
};

const RULES: Rule[] = [
  {
    id: 'auth',
    match: (p) => matchesAny(p, ['/signin','/register','/forgot-password','/accept-invite','/setup','/mfa']),
    titleEn: 'Secure access',
    titleAr: 'الوصول الآمن',
    purposeEn: 'Sign in, recover access or complete secure organization setup.',
    purposeAr: 'سجّل الدخول أو استعد الوصول أو أكمل إعداد المؤسسة بشكل آمن.',
    nextEn: 'Complete the required identity step and follow any verification message shown on screen.',
    nextAr: 'أكمل خطوة التحقق من الهوية واتبع أي رسالة تحقق تظهر على الشاشة.',
    steps: [
      { en: 'Confirm you are using the correct organization and account.', ar: 'تأكد من استخدام المؤسسة والحساب الصحيحين.' },
      { en: 'Complete the requested authentication or recovery step.', ar: 'أكمل خطوة المصادقة أو الاسترداد المطلوبة.' },
      { en: 'If access is blocked, use the displayed recovery path instead of retrying repeatedly.', ar: 'إذا تم حظر الوصول، استخدم مسار الاسترداد الظاهر بدلاً من تكرار المحاولة.' },
    ],
    exampleEn: 'Example: complete MFA, then continue to your OPSIQO workspace.',
    exampleAr: 'مثال: أكمل المصادقة متعددة العوامل ثم انتقل إلى مساحة عمل OPSIQO.',
  },
  {
    id: 'start',
    match: (p) => matchesAny(p, ['/home','/my-work','/dashboard','/notifications','/daily-brief']),
    titleEn: 'Today & priorities',
    titleAr: 'اليوم والأولويات',
    purposeEn: 'See what needs attention now, what is blocked and what is approaching.',
    purposeAr: 'اعرض ما يحتاج إلى انتباه الآن وما هو متعطل وما يقترب موعده.',
    nextEn: 'Review the highest-priority item first, then resolve blockers before starting lower-priority work.',
    nextAr: 'راجع أعلى عنصر أولوية أولاً ثم عالج العوائق قبل بدء الأعمال الأقل أولوية.',
    steps: [commonSteps.review, commonSteps.evidence, commonSteps.next],
    exampleEn: 'Example: review an overdue offboarding task before a non-urgent report.',
    exampleAr: 'مثال: راجع مهمة إنهاء خدمة متأخرة قبل تقرير غير عاجل.',
  },
  {
    id: 'people',
    match: (p) => matchesAny(p, ['/self-service','/concierge','/employee','/people','/manager','/manager-copilot','/organization','/workforce-registry','/lifecycle']),
    titleEn: 'People & workforce',
    titleAr: 'الأفراد والقوى العاملة',
    purposeEn: 'Work with verified employee, team, position and workforce information.',
    purposeAr: 'اعمل باستخدام معلومات موثقة عن الموظفين والفرق والوظائف والقوى العاملة.',
    nextEn: 'Confirm the person or position context before creating or changing workforce records.',
    nextAr: 'تحقق من سياق الشخص أو الوظيفة قبل إنشاء أو تغيير سجلات القوى العاملة.',
    steps: [commonSteps.review, commonSteps.evidence, commonSteps.approval],
    exampleEn: 'Example: verify manager, position and employment status before preparing a lifecycle action.',
    exampleAr: 'مثال: تحقق من المدير والوظيفة وحالة التوظيف قبل إعداد إجراء دورة حياة.',
  },
  {
    id: 'recruiting',
    match: (p) => matchesAny(p, ['/recruiting','/apply']),
    titleEn: 'Recruiting',
    titleAr: 'التوظيف',
    purposeEn: 'Manage evidence-based hiring from job requirements through candidate review and handoff.',
    purposeAr: 'أدر التوظيف القائم على الأدلة من متطلبات الوظيفة حتى مراجعة المرشح وتسليمه.',
    nextEn: 'Validate the job requirements and candidate evidence before progressing the hiring workflow.',
    nextAr: 'تحقق من متطلبات الوظيفة وأدلة المرشح قبل متابعة مسار التوظيف.',
    steps: [
      { en: 'Confirm mandatory versus preferred job requirements.', ar: 'حدد المتطلبات الإلزامية مقابل المفضلة.' },
      { en: 'Review parsed candidate evidence and any low-confidence fields.', ar: 'راجع أدلة المرشح المستخرجة والحقول منخفضة الثقة.' },
      { en: 'Use structured interview evidence before a human hiring decision.', ar: 'استخدم أدلة مقابلة منظمة قبل قرار التوظيف البشري.' },
      commonSteps.approval,
    ],
    exampleEn: 'Example: inspect the résumé passage supporting each qualification before shortlisting.',
    exampleAr: 'مثال: افحص فقرة السيرة الذاتية التي تدعم كل مؤهل قبل إدراج المرشح في القائمة المختصرة.',
  },
  {
    id: 'onboarding',
    match: (p) => matchesAny(p, ['/onboarding']),
    titleEn: 'Onboarding',
    titleAr: 'تهيئة الموظف الجديد',
    purposeEn: 'Coordinate a complete, role-aware new-hire setup across HR, manager, IT and compliance.',
    purposeAr: 'نسّق إعداد الموظف الجديد بشكل كامل حسب الدور بين الموارد البشرية والمدير وتقنية المعلومات والامتثال.',
    nextEn: 'Confirm the employee, start date, position and required setup before launching tasks.',
    nextAr: 'تحقق من الموظف وتاريخ البدء والوظيفة ومتطلبات الإعداد قبل بدء المهام.',
    steps: [commonSteps.review, commonSteps.evidence, commonSteps.next, commonSteps.approval],
    exampleEn: 'Example: verify start date and manager before assigning equipment and training.',
    exampleAr: 'مثال: تحقق من تاريخ البدء والمدير قبل تعيين المعدات والتدريب.',
  },
  {
    id: 'offboarding',
    match: (p) => matchesAny(p, ['/separations']),
    titleEn: 'Offboarding',
    titleAr: 'إنهاء الخدمة',
    purposeEn: 'Execute a controlled employee exit with detailed tasks, evidence, documents and closure gates.',
    purposeAr: 'نفّذ خروج الموظف بشكل مضبوط مع مهام مفصلة وأدلة ومستندات وبوابات إغلاق.',
    nextEn: 'Confirm separation details, then prepare task workspaces and resolve closure blockers in sequence.',
    nextAr: 'تحقق من تفاصيل إنهاء الخدمة ثم جهّز مساحات عمل المهام وعالج عوائق الإغلاق بالتسلسل.',
    steps: [
      { en: 'Confirm employee, final working date and separation type.', ar: 'تحقق من الموظف وآخر يوم عمل ونوع إنهاء الخدمة.' },
      { en: 'Prepare all required task workspaces and forms.', ar: 'جهّز جميع مساحات عمل المهام والنماذج المطلوبة.' },
      { en: 'Complete steps and attach substantive evidence before task closure.', ar: 'أكمل الخطوات وأرفق أدلة جوهرية قبل إغلاق المهمة.' },
      commonSteps.approval,
    ],
    exampleEn: 'Example: do not close the process while equipment return or final payroll evidence is outstanding.',
    exampleAr: 'مثال: لا تغلق العملية طالما أن إعادة المعدات أو دليل الرواتب النهائية ما زال معلقاً.',
  },
  {
    id: 'time',
    match: (p) => matchesAny(p, ['/time']),
    titleEn: 'Time & leave',
    titleAr: 'الوقت والإجازات',
    purposeEn: 'Manage time, attendance, leave, approvals and return-to-work evidence.',
    purposeAr: 'أدر الوقت والحضور والإجازات والموافقات وأدلة العودة إلى العمل.',
    nextEn: 'Resolve submitted or exception items first and verify approval authority before changing status.',
    nextAr: 'عالج العناصر المقدمة أو الاستثنائية أولاً وتحقق من صلاحية الموافقة قبل تغيير الحالة.',
    steps: [commonSteps.review, commonSteps.evidence, commonSteps.approval],
    exampleEn: 'Example: review the reason and audit evidence before an administrator override.',
    exampleAr: 'مثال: راجع السبب وأدلة التدقيق قبل تجاوز المسؤول.',
  },
  {
    id: 'talent',
    match: (p) => matchesAny(p, ['/performance','/learning','/skills-passport','/career-gps','/talent-marketplace','/career']),
    titleEn: 'Performance, learning & career',
    titleAr: 'الأداء والتعلم والمسار المهني',
    purposeEn: 'Connect goals, reviews, skills, learning and career opportunities with traceable evidence.',
    purposeAr: 'اربط الأهداف والمراجعات والمهارات والتعلم والفرص المهنية بأدلة قابلة للتتبع.',
    nextEn: 'Review current evidence and due dates before preparing development or performance actions.',
    nextAr: 'راجع الأدلة الحالية والمواعيد قبل إعداد إجراءات التطوير أو الأداء.',
    steps: [commonSteps.review, commonSteps.evidence, commonSteps.next, commonSteps.approval],
    exampleEn: 'Example: use documented goals and feedback before drafting a performance plan.',
    exampleAr: 'مثال: استخدم الأهداف والملاحظات الموثقة قبل إعداد خطة أداء.',
  },
  {
    id: 'rewards',
    match: (p) => matchesAny(p, ['/compensation','/benefits','/payroll']),
    titleEn: 'Compensation, benefits & payroll',
    titleAr: 'التعويضات والمزايا والرواتب',
    purposeEn: 'Manage governed pay, benefits and payroll evidence with explicit approval controls.',
    purposeAr: 'أدر الأجور والمزايا وأدلة الرواتب بضوابط موافقة واضحة.',
    nextEn: 'Validate effective dates, authority and source records before preparing a financial change.',
    nextAr: 'تحقق من تواريخ السريان والصلاحية والسجلات المصدر قبل إعداد أي تغيير مالي.',
    steps: [commonSteps.review, commonSteps.evidence, commonSteps.approval],
    exampleEn: 'Example: verify the approved compensation change before payroll export.',
    exampleAr: 'مثال: تحقق من تغيير التعويض المعتمد قبل تصدير الرواتب.',
  },
  {
    id: 'workflow',
    match: (p) => matchesAny(p, ['/esign','/workflows','/automation','/automation-marketplace','/operations-orchestrator','/meeting-actions']),
    titleEn: 'Workflow & automation',
    titleAr: 'سير العمل والأتمتة',
    purposeEn: 'Prepare and monitor governed workflows, approvals, reminders and reusable automation.',
    purposeAr: 'جهّز وراقب مسارات العمل والموافقات والتذكيرات والأتمتة القابلة لإعادة الاستخدام.',
    nextEn: 'Review the trigger, owners, approval boundary and expected outcome before activation.',
    nextAr: 'راجع المشغل والمالكين وحدود الموافقة والنتيجة المتوقعة قبل التفعيل.',
    steps: [commonSteps.review, commonSteps.evidence, commonSteps.approval],
    exampleEn: 'Example: preview which tasks and notifications will be created before enabling automation.',
    exampleAr: 'مثال: عاين المهام والإشعارات التي سيتم إنشاؤها قبل تمكين الأتمتة.',
  },
  {
    id: 'insights',
    match: (p) => matchesAny(p, ['/intelligence','/people-analytics','/workforce-intelligence','/workforce-planning','/scenario-lab','/grant-workforce','/program-workforce','/program-portfolio','/operations-cockpit','/strategy','/org-design','/resilience']),
    titleEn: 'Intelligence & planning',
    titleAr: 'الذكاء والتخطيط',
    purposeEn: 'Turn governed workforce evidence into operational insight, scenarios and planning decisions.',
    purposeAr: 'حوّل أدلة القوى العاملة الموثقة إلى رؤى تشغيلية وسيناريوهات وقرارات تخطيط.',
    nextEn: 'Check data completeness and assumptions before acting on a forecast or recommendation.',
    nextAr: 'تحقق من اكتمال البيانات والافتراضات قبل التصرف بناءً على توقع أو توصية.',
    steps: [commonSteps.review, commonSteps.evidence, commonSteps.next],
    exampleEn: 'Example: inspect the source population and assumptions before using a staffing forecast.',
    exampleAr: 'مثال: افحص مجتمع البيانات والافتراضات قبل استخدام توقعات التوظيف.',
  },
  {
    id: 'governance',
    match: (p) => matchesAny(p, ['/organizational-memory','/policy-intelligence','/compliance-radar','/compliance','/evidence-center','/governance','/regulatory','/assurance','/privacy']),
    titleEn: 'Governance & compliance',
    titleAr: 'الحوكمة والامتثال',
    purposeEn: 'Identify obligations, evidence gaps, policy issues and approaching compliance deadlines.',
    purposeAr: 'حدد الالتزامات وفجوات الأدلة ومشكلات السياسات والمواعيد التنظيمية القادمة.',
    nextEn: 'Start with unresolved or approaching obligations and trace each recommendation back to evidence.',
    nextAr: 'ابدأ بالالتزامات غير المحلولة أو القريبة واربط كل توصية بالأدلة.',
    steps: [commonSteps.review, commonSteps.evidence, commonSteps.next, commonSteps.approval],
    exampleEn: 'Example: schedule a probation review when the end date is approaching and no review exists.',
    exampleAr: 'مثال: جدولة مراجعة فترة التجربة عند اقتراب نهايتها وعدم وجود مراجعة.',
  },
  {
    id: 'casework',
    match: (p) => matchesAny(p, ['/employee-relations','/safety','/employee-service-center','/experience','/hr-diagnostic']),
    titleEn: 'Employee cases & support',
    titleAr: 'حالات الموظفين والدعم',
    purposeEn: 'Handle employee concerns, incidents, service requests and diagnostics with controlled evidence.',
    purposeAr: 'عالج مخاوف الموظفين والحوادث وطلبات الخدمة والتشخيص بأدلة مضبوطة.',
    nextEn: 'Review the facts, urgency, confidentiality and responsible owner before preparing a response.',
    nextAr: 'راجع الوقائع والاستعجال والسرية والمالك المسؤول قبل إعداد الاستجابة.',
    steps: [commonSteps.review, commonSteps.evidence, commonSteps.approval],
    exampleEn: 'Example: separate verified facts from allegations before drafting a case summary.',
    exampleAr: 'مثال: افصل الوقائع الموثقة عن الادعاءات قبل إعداد ملخص الحالة.',
  },
  {
    id: 'imports',
    match: (p) => matchesAny(p, ['/import-center']),
    titleEn: 'Import center',
    titleAr: 'مركز الاستيراد',
    purposeEn: 'Import HR data with source evidence, confidence, trust states and human verification.',
    purposeAr: 'استورد بيانات الموارد البشرية مع أدلة المصدر ودرجات الثقة وحالات الموثوقية والتحقق البشري.',
    nextEn: 'Review low-confidence, missing and conflicting fields before approving the import.',
    nextAr: 'راجع الحقول منخفضة الثقة والمفقودة والمتعارضة قبل اعتماد الاستيراد.',
    steps: [
      { en: 'Confirm the detected document type and source.', ar: 'تحقق من نوع المستند المكتشف والمصدر.' },
      { en: 'Review field evidence and confidence.', ar: 'راجع أدلة الحقول ودرجة الثقة.' },
      { en: 'Use Improve with AI only for uncertain results, then compare the evidence again.', ar: 'استخدم التحسين بالذكاء الاصطناعي فقط للنتائج غير المؤكدة ثم قارن الأدلة مرة أخرى.' },
      { en: 'Approve only after required fields are verified.', ar: 'اعتمد فقط بعد التحقق من الحقول المطلوبة.' },
    ],
    exampleEn: 'Example: a 70% confidence field remains review-required until a user confirms its source.',
    exampleAr: 'مثال: يبقى الحقل ذو ثقة 70٪ بحاجة إلى مراجعة حتى يؤكد المستخدم مصدره.',
  },
  {
    id: 'ai',
    match: (p) => matchesAny(p, ['/ai-copilot','/ai-governance','/ai-value','/agent-builder']),
    titleEn: 'AI & agents',
    titleAr: 'الذكاء الاصطناعي والوكلاء',
    purposeEn: 'Configure and use governed AI while preserving human control, evidence and auditability.',
    purposeAr: 'هيّئ واستخدم الذكاء الاصطناعي الخاضع للحوكمة مع الحفاظ على التحكم البشري والأدلة وقابلية التدقيق.',
    nextEn: 'Confirm provider readiness, evidence and approval boundaries before using generated output.',
    nextAr: 'تحقق من جاهزية المزود والأدلة وحدود الموافقة قبل استخدام المخرجات المولدة.',
    steps: [commonSteps.review, commonSteps.evidence, commonSteps.approval],
    exampleEn: 'Example: use AI to prepare a draft, then have an authorized person review the final action.',
    exampleAr: 'مثال: استخدم الذكاء الاصطناعي لإعداد مسودة ثم اجعل شخصاً مخولاً يراجع الإجراء النهائي.',
  },
  {
    id: 'admin',
    match: (p) => matchesAny(p, ['/settings','/organization-launchpad','/admin-maintenance','/integrations','/identity','/security-operations','/security','/platform-reliability','/premium-hcm','/platform-tenants','/audit','/members','/experience-readiness','/translation-readiness']),
    titleEn: 'Administration & platform',
    titleAr: 'الإدارة والمنصة',
    purposeEn: 'Manage platform configuration, access, reliability, evidence and organization administration.',
    purposeAr: 'أدر إعدادات المنصة والوصول والموثوقية والأدلة وإدارة المؤسسة.',
    nextEn: 'Verify target organization, permissions and impact before changing platform configuration.',
    nextAr: 'تحقق من المؤسسة المستهدفة والصلاحيات والتأثير قبل تغيير إعدادات المنصة.',
    steps: [commonSteps.review, commonSteps.evidence, commonSteps.approval],
    exampleEn: 'Example: verify tenant and permission scope before a maintenance operation.',
    exampleAr: 'مثال: تحقق من نطاق المؤسسة والصلاحيات قبل عملية صيانة.',
  },
];

export function getPageExperience(pathname: string): PageExperience {
  const normalized = pathname || '/home';
  const rule = RULES.find((candidate) => candidate.match(normalized));
  if (rule) return { ...rule };

  const title = humanizePath(normalized);
  return {
    id: 'general',
    titleEn: title,
    titleAr: 'إرشادات الصفحة',
    purposeEn: `Use ${title} with verified data, clear ownership and explicit review of any sensitive action.`,
    purposeAr: 'استخدم هذه الصفحة ببيانات موثقة وملكية واضحة ومراجعة صريحة لأي إجراء حساس.',
    nextEn: 'Review the current state and complete the next evidence-backed action.',
    nextAr: 'راجع الحالة الحالية وأكمل الإجراء التالي المدعوم بالأدلة.',
    steps: [commonSteps.review, commonSteps.evidence, commonSteps.next, commonSteps.approval],
    exampleEn: 'Example: resolve visible blockers before moving the process forward.',
    exampleAr: 'مثال: عالج العوائق الظاهرة قبل متابعة العملية.',
  };
}
