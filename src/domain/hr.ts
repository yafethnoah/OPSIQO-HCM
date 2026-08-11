export type WorkerStatus = 'active' | 'inactive' | 'leave' | 'terminated';
export type PositionStatus = 'planned' | 'open' | 'filled' | 'frozen' | 'closed';
export type EmploymentType = 'permanent' | 'temporary' | 'contractor' | 'intern' | 'volunteer';
export type EmployeeChangeType = 'transfer' | 'promotion' | 'manager_change' | 'status_change';

export interface Person {
  id: string;
  authUid?: string;
  legalFirstName: string;
  legalLastName: string;
  preferredName?: string;
  workEmail?: string;
  personalEmail?: string;
  phone?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Worker {
  id: string;
  personId: string;
  employeeNumber: string;
  displayName: string;
  displayNameLower?: string;
  employeeNumberLower?: string;
  workEmail: string;
  workEmailLower?: string;
  status: WorkerStatus;
  primaryAssignmentId?: string;
  hireDate?: string;
  terminationDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Employment {
  id: string;
  workerId: string;
  employmentType: EmploymentType;
  legalEntityId?: string;
  startDate: string;
  endDate?: string;
  fte: number;
  status: 'active' | 'ended' | 'pending';
  createdAt: string;
  updatedAt: string;
}

export interface OrgUnit {
  id: string;
  name: string;
  code: string;
  type: 'company' | 'division' | 'department' | 'team' | 'location';
  parentId?: string;
  managerWorkerId?: string;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface Position {
  id: string;
  positionCode: string;
  title: string;
  orgUnitId: string;
  reportsToPositionId?: string;
  status: PositionStatus;
  fte: number;
  headcountLimit: number;
  location?: string;
  jobFamily?: string;
  grade?: string;
  createdAt: string;
  updatedAt: string;
}

export type AssignmentType = 'primary' | 'secondary';

export interface Assignment {
  id: string;
  workerId: string;
  employmentId: string;
  positionId: string;
  orgUnitId: string;
  managerWorkerId?: string;
  primary: boolean;
  assignmentType?: AssignmentType;
  allocationFte?: number;
  startDate: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeChange {
  id: string;
  workerId: string;
  changeType: EmployeeChangeType;
  effectiveDate: string;
  status: 'scheduled' | 'applied' | 'cancelled' | 'failed';
  fromAssignmentId?: string;
  toAssignmentId?: string;
  positionId?: string;
  orgUnitId?: string;
  managerWorkerId?: string;
  workerStatus?: WorkerStatus;
  note?: string;
  requestedBy: string;
  createdAt: string;
  appliedAt?: string;
  appliedBy?: string;
  executionAttempts?: number;
  lastExecutionAt?: string;
  lastExecutionError?: string;
}


export interface SecondaryAssignmentPlan {
  id: string;
  workerId: string;
  action: 'start' | 'end';
  effectiveDate: string;
  status: 'scheduled' | 'applied' | 'cancelled' | 'failed';
  assignmentId?: string;
  employmentId?: string;
  positionId?: string;
  orgUnitId?: string;
  managerWorkerId?: string;
  allocationFte?: number;
  requestedBy: string;
  createdAt: string;
  appliedAt?: string;
  appliedBy?: string;
  executionAttempts?: number;
  lastExecutionAt?: string;
  lastExecutionError?: string;
}

export interface WorkerTimelineEvent {
  id: string;
  eventType: 'hire' | 'assignment_start' | 'assignment_end' | 'employee_change' | 'status_change';
  title: string;
  description?: string;
  effectiveDate: string;
  status?: string;
}

export interface PositionWithOccupancy extends Position {
  occupiedHeadcount: number;
  occupiedFte: number;
  availableHeadcount: number;
  availableFte: number;
  occupancyPercent: number;
  capacityState: 'vacant' | 'partially_filled' | 'full' | 'over_capacity';
}
