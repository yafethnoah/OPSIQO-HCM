export type AnalyticsMetricStatus='draft'|'active'|'retired';
export type AnalyticsMetricUnit='count'|'fte'|'currency'|'percent'|'days'|'score'|'hours';
export type AnalyticsForecastModelType='linear_trend'|'rolling_average';
export type AnalyticsForecastStatus='draft'|'reviewed'|'approved'|'rejected';

export interface AnalyticsMetricDefinition {
  id:string;
  code:string;
  name:string;
  description:string;
  category:'workforce'|'recruiting'|'talent'|'compensation'|'experience'|'safety'|'service'|'lifecycle';
  unit:AnalyticsMetricUnit;
  aggregation:'point_in_time'|'period_total'|'period_rate'|'average';
  formula:string;
  sourceCollections:string[];
  ownerRole:string;
  status:AnalyticsMetricStatus;
  sensitive:boolean;
  minimumGroupSize:number;
  createdBy:string;
  createdAt:string;
  updatedAt:string;
}

export interface AnalyticsSegmentSnapshot {
  dimensionType:'org_unit'|'location';
  dimensionId:string;
  label:string;
  population:number;
  suppressed:boolean;
  metrics:Record<string,number>;
}

export interface AnalyticsSnapshot {
  id:string;
  snapshotDate:string;
  period:'daily';
  currency:string;
  metricVersion:number;
  metrics:Record<string,number>;
  segments:AnalyticsSegmentSnapshot[];
  sourceCounts:Record<string,number>;
  generatedBy:string;
  generatedAt:string;
  methodologyNotice:string;
}

export interface AnalyticsForecastModel {
  id:string;
  code:string;
  name:string;
  metricCode:string;
  modelType:AnalyticsForecastModelType;
  horizonPeriods:number;
  confidenceLevel:0.8|0.95;
  minimumHistoryPoints:number;
  rollingWindow?:number;
  assumptions:string;
  version:number;
  status:'draft'|'active'|'retired';
  createdBy:string;
  createdAt:string;
  updatedAt:string;
  approvedBy?:string;
  approvedAt?:string;
}

export interface AnalyticsForecastPoint {
  period:string;
  value:number;
  lower:number;
  upper:number;
}

export interface AnalyticsForecastRun {
  id:string;
  modelId:string;
  modelCode:string;
  modelVersion:number;
  metricCode:string;
  generatedAt:string;
  historyStart:string;
  historyEnd:string;
  historyPoints:number;
  forecast:AnalyticsForecastPoint[];
  diagnostics:{mae:number;rmse:number;residualStdDev:number};
  dataQualityWarnings:string[];
  assumptions:string;
  confidenceLevel:0.8|0.95;
  status:AnalyticsForecastStatus;
  generatedBy:string;
  reviewedBy?:string;
  reviewedAt?:string;
  reviewNote?:string;
  approvedBy?:string;
  approvedAt?:string;
}

export interface PeopleAnalyticsDashboard {
  latestSnapshot:AnalyticsSnapshot;
  history:AnalyticsSnapshot[];
  metrics:AnalyticsMetricDefinition[];
  forecastModels:AnalyticsForecastModel[];
  forecastRuns:AnalyticsForecastRun[];
  quality:{score:number;warnings:string[];historyPoints:number;lastSnapshotDate:string};
  headline:Array<{key:string;label:string;value:number;unit:AnalyticsMetricUnit;helper:string}>;
  governanceNotice:string;
  generatedAt:string;
}
