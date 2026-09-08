export interface ResumeEmploymentEntry {
  id?: string;
  positionTitle: string;
  employer: string;
  current?: boolean;
  startDate?: string;
  endDate?: string;
  location?: string;
  city?: string;
  region?: string;
  country?: string;
  responsibilities: string[];
  reasonForLeaving?: string;
}

export interface ResumeEducationEntry {
  id?: string;
  degree: string;
  fieldOfStudy?: string;
  institution: string;
  startDate?: string;
  endDate?: string;
  graduationDate?: string;
  completed?: boolean;
  location?: string;
}

export interface ResumeCertificationEntry {
  id?: string;
  name: string;
  issuer?: string;
  issuedAt?: string;
  expiresAt?: string;
  credentialId?: string;
}

export interface ResumeLanguageEntry {
  id?: string;
  language: string;
  proficiency?: string;
}

export interface ResumeProjectEntry {
  id?: string;
  name: string;
  role?: string;
  startDate?: string;
  endDate?: string;
  description?: string;
}

export interface ResumeVolunteerEntry {
  id?: string;
  organization: string;
  role?: string;
  startDate?: string;
  endDate?: string;
  description?: string;
}

export interface ResumeAwardEntry {
  id?: string;
  title: string;
  issuer?: string;
  date?: string;
  description?: string;
}

export interface ResumePublicationEntry {
  id?: string;
  title: string;
  publisher?: string;
  date?: string;
  url?: string;
  description?: string;
}

export interface StructuredResumeProfile {
  employmentHistory: ResumeEmploymentEntry[];
  educationHistory: ResumeEducationEntry[];
  skills: string[];
  certifications: ResumeCertificationEntry[];
  languages: ResumeLanguageEntry[];
  projects: ResumeProjectEntry[];
  volunteerExperience: ResumeVolunteerEntry[];
  awards: ResumeAwardEntry[];
  publications: ResumePublicationEntry[];
  additionalInformation?: string;
}
