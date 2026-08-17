export type AtsReviewBand = 'strong_alignment' | 'good_alignment' | 'partial_alignment' | 'limited_evidence';
export type AtsCriterionCategory = 'required_qualification' | 'skill' | 'responsibility' | 'experience' | 'education_certification' | 'document_quality';

export interface ResumeSourceMeta {
  fileName: string;
  contentType: string;
  size: number;
  sha256: string;
  storagePath?: string;
}

export interface ParsedResumeProfile {
  firstName?: string;
  lastName?: string;
  displayName?: string;
  email?: string;
  phone?: string;
  location?: string;
  linkedinUrl?: string;
  headline?: string;
  summary?: string;
  skills: string[];
  certifications: string[];
  education: string[];
  employers: string[];
  jobTitles: string[];
  yearsOfExperience?: number;
  sourceText: string;
  warnings: string[];
  parser: 'deterministic' | 'governed_ai' | 'hybrid';
  provider?: string;
  model?: string;
}

export interface AtsEvidenceMatch {
  criterion: string;
  category: AtsCriterionCategory;
  weight: number;
  matched: boolean;
  confidence: number;
  evidence?: string;
  missingTerms?: string[];
}

export interface AtsScoreBreakdown {
  requirements: number;
  skills: number;
  responsibilities: number;
  experience: number;
  educationCertification: number;
  documentQuality: number;
}

export interface AtsResumeReview {
  id: string;
  applicationId: string;
  requisitionId: string;
  candidateId: string;
  score: number;
  band: AtsReviewBand;
  breakdown: AtsScoreBreakdown;
  assessedDimensions: Array<keyof AtsScoreBreakdown>;
  assessmentCoverage: number;
  warnings: string[];
  matchedRequirements: string[];
  missingRequirements: string[];
  matchedKeywords: string[];
  missingKeywords: string[];
  strengths: string[];
  gaps: string[];
  evidence: AtsEvidenceMatch[];
  resumeProfile: Omit<ParsedResumeProfile, 'sourceText'>;
  sourceMeta?: ResumeSourceMeta;
  jobTextHash: string;
  resumeTextHash: string;
  scoringVersion: string;
  humanReviewRequired: true;
  decisionBoundary: string;
  createdBy: string;
  createdAt: string;
}

export interface CoverLetterReview {
  relevanceScore: number;
  evidenceGroundingScore: number;
  matchedJobSignals: string[];
  unsupportedClaims: string[];
  missingJobSignals: string[];
  recommendations: string[];
  humanReviewRequired: true;
}

export interface CoverLetterDraft {
  id: string;
  applicationId: string;
  requisitionId: string;
  candidateId: string;
  text: string;
  tone: 'professional' | 'concise' | 'warm';
  evidenceUsed: string[];
  provider: 'deterministic' | 'openai' | 'gemini';
  model?: string;
  promptVersion: string;
  humanReviewRequired: true;
  createdBy: string;
  createdAt: string;
}
