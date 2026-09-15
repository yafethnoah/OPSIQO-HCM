export type WorkerBandMappingState =
  | 'not_applicable'
  | 'missing_position'
  | 'missing_band_mapping'
  | 'inactive_band_mapping'
  | 'mapped';

export interface WorkerBandMappingEvaluation {
  state: WorkerBandMappingState;
  label: string;
  requiresAttention: boolean;
  reason: string;
}

export function evaluateWorkerBandMapping(input: {
  hasCompensation: boolean;
  positionId?: string;
  salaryBandId?: string;
  salaryBandStatus?: string;
}): WorkerBandMappingEvaluation {
  if (!input.hasCompensation) {
    return {
      state: 'not_applicable',
      label: 'Not Applicable',
      requiresAttention: false,
      reason: 'No current compensation record exists yet.',
    };
  }

  if (!input.positionId) {
    return {
      state: 'missing_position',
      label: 'Missing Position',
      requiresAttention: true,
      reason: 'Current compensation exists, but the worker has no current position to map to salary architecture.',
    };
  }

  if (!input.salaryBandId) {
    return {
      state: 'missing_band_mapping',
      label: 'Missing Band Mapping',
      requiresAttention: true,
      reason: 'Current compensation exists, but the current position has no salary-band mapping.',
    };
  }

  if (input.salaryBandStatus && input.salaryBandStatus !== 'active') {
    return {
      state: 'inactive_band_mapping',
      label: 'Inactive Band Mapping',
      requiresAttention: true,
      reason: 'The current position references a salary band that is not active.',
    };
  }

  return {
    state: 'mapped',
    label: 'Mapped',
    requiresAttention: false,
    reason: 'The current position is mapped to an active salary band.',
  };
}

export interface ArchitectureHealthDimension {
  key: 'job_families' | 'job_levels' | 'salary_bands' | 'position_mappings' | 'employee_placements';
  label: string;
  done: number;
  total: number;
  pct: number;
  detail: string;
}

export interface CompensationArchitectureHealth {
  foundationConfigured: boolean;
  overallPct: number;
  dimensions: ArchitectureHealthDimension[];
}

function ratio(done: number, total: number, emptyPct: number) {
  return total > 0
    ? Math.round((Math.max(0, Math.min(done, total)) / total) * 100)
    : emptyPct;
}

export function calculateCompensationArchitectureHealth(input: {
  activeJobFamilies: number;
  activeJobLevels: number;
  activeSalaryBands: number;
  currentPositions: number;
  mappedCurrentPositions: number;
  workersInScope: number;
  placedWorkers: number;
}): CompensationArchitectureHealth {
  const foundationConfigured =
    input.activeJobFamilies > 0 ||
    input.activeJobLevels > 0 ||
    input.activeSalaryBands > 0;

  const dimensions: ArchitectureHealthDimension[] = [
    {
      key: 'job_families',
      label: 'Job Families',
      done: Math.min(input.activeJobFamilies, 1),
      total: 1,
      pct: input.activeJobFamilies > 0 ? 100 : 0,
      detail: `${input.activeJobFamilies} active`,
    },
    {
      key: 'job_levels',
      label: 'Job Levels',
      done: Math.min(input.activeJobLevels, 1),
      total: 1,
      pct: input.activeJobLevels > 0 ? 100 : 0,
      detail: `${input.activeJobLevels} active`,
    },
    {
      key: 'salary_bands',
      label: 'Salary Bands',
      done: Math.min(input.activeSalaryBands, 1),
      total: 1,
      pct: input.activeSalaryBands > 0 ? 100 : 0,
      detail: `${input.activeSalaryBands} active`,
    },
    {
      key: 'position_mappings',
      label: 'Position Mappings',
      done: input.mappedCurrentPositions,
      total: input.currentPositions,
      pct: ratio(input.mappedCurrentPositions, input.currentPositions, foundationConfigured ? 100 : 0),
      detail: `${input.mappedCurrentPositions}/${input.currentPositions} current positions`,
    },
    {
      key: 'employee_placements',
      label: 'Employee Placements',
      done: input.placedWorkers,
      total: input.workersInScope,
      pct: ratio(input.placedWorkers, input.workersInScope, foundationConfigured ? 100 : 0),
      detail: `${input.placedWorkers}/${input.workersInScope} workers`,
    },
  ];

  const overallPct = foundationConfigured
    ? Math.round(dimensions.reduce((sum, item) => sum + item.pct, 0) / dimensions.length)
    : 0;

  return { foundationConfigured, overallPct, dimensions };
}