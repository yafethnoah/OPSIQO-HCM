export type ImportLibraryKind =
  | 'policy'
  | 'procedure'
  | 'sop'
  | 'contract'
  | 'form'
  | 'template'
  | 'employee_document'
  | 'training_record'
  | 'organization_reference'
  | 'position_reference'
  | 'job_description'
  | 'employee_roster'
  | 'zip_library'
  | 'other';

export type ImportScanStatus = 'not_scanned' | 'clean' | 'blocked';
export type ImportReviewStatus = 'review_required' | 'approved' | 'rejected';
export type ImportAnalysisStatus = 'not_analyzed' | 'analyzing' | 'completed' | 'failed';

export interface ImportFieldProposal {
  sourceLabel: string;
  targetModule: string;
  targetField: string;
  value: string | string[] | number | boolean | null;
  confidence: number;
  evidence?: string;
  requiresHumanConfirmation: true;
}

export interface ImportedFormField {
  label: string;
  proposedKey: string;
  type: 'text' | 'long_text' | 'email' | 'phone' | 'date' | 'number' | 'checkbox' | 'select' | 'signature' | 'approval';
  required: boolean;
  options?: string[];
  confidence: number;
  evidence?: string;
}

export interface ZipImportEntryAnalysis {
  path: string;
  size: number;
  detectedKind: ImportLibraryKind;
  confidence: number;
  title: string;
  parseable: boolean;
  warnings: string[];
}

export interface UniversalImportAnalysis {
  version: 'UNIVERSAL_IMPORT_V2';
  detectedKind: ImportLibraryKind;
  classificationConfidence: number;
  language: string;
  title: string;
  summary: string;
  targetModule: string;
  fields: ImportFieldProposal[];
  sections: Array<{ name: string; text: string; confidence: number }>;
  steps: Array<{ order: number; instruction: string; ownerRole?: string; evidence?: string }>;
  formFields: ImportedFormField[];
  zipEntries: ZipImportEntryAnalysis[];
  warnings: string[];
  parser: 'deterministic' | 'governed_ai' | 'hybrid';
  provider?: string;
  model?: string;
  promptVersion?: string;
  analyzedAt: string;
  humanReviewRequired: true;
}

export interface LibraryImportRecord {
  id: string;
  kind: ImportLibraryKind;
  title: string;
  workerId?: string;
  fileName: string;
  contentType: string;
  size: number;
  sha256: string;
  storagePath: string;
  scanStatus: ImportScanStatus;
  scanEvidenceRef?: string;
  scanRecordedBy?: string;
  scanRecordedAt?: string;
  reviewStatus: ImportReviewStatus;
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  analysisStatus?: ImportAnalysisStatus;
  analysis?: UniversalImportAnalysis;
  analysisError?: string;
  analyzedBy?: string;
  analyzedAt?: string;
  promotedEntityType?: string;
  promotedEntityId?: string;
  promotedAt?: string;
  promotedBy?: string;
}
