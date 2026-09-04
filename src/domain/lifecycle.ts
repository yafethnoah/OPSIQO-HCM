export type LifecycleSeverity = 'info' | 'warning' | 'high' | 'critical';

export interface LifecycleMetric {
  key: string;
  label: string;
  value: number | string;
  helper: string;
  href: string;
}

export interface LifecycleAlert {
  id: string;
  severity: LifecycleSeverity;
  title: string;
  message: string;
  href: string;
  entityType?: string;
  entityId?: string;
}

export interface DataQualityFinding {
  id: string;
  code: string;
  severity: LifecycleSeverity;
  title: string;
  description: string;
  entityType: string;
  entityId?: string;
  href: string;
  recommendedAction: string;
}

export interface LifecycleDiagnostics {
  score: number;
  scannedAt: string;
  findings: DataQualityFinding[];
  counts: Record<LifecycleSeverity, number>;
  sampled: boolean;
  sampleLimit: number;
}

export interface LifecycleDashboard {
  metrics: LifecycleMetric[];
  funnel: Array<{ stage: string; value: number; href: string }>;
  alerts: LifecycleAlert[];
  diagnostics: LifecycleDiagnostics;
  lastAutomationRun?: { id: string; status: string; startedAt?: string; completedAt?: string; lastError?: string };
  generatedAt: string;
}
