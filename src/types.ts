// ─── Master LaTeX Resume ────────────────────────────────────────────────

export interface MasterLatexResume {
  latexCode: string;
  title: string;
  updatedAt: number;
}

// ─── Chat & Project ─────────────────────────────────────────────────────

export interface ChatMessage {
  id?: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  metadata?: {
    company?: string;
    targetRole?: string;
    instructions?: string;
    stage?: string;
  };
}

export interface ResumeVersion {
  id: string;
  latex: string;
  createdAt: number;
  label?: string;
  company?: string;
  role?: string;
  jobDescription?: string;
  atsScore?: ATSScoreResult;
}

export interface ResumeProject {
  id: string;
  name: string;
  jobDescription: string;
  chatHistory: ChatMessage[];
  versions: ResumeVersion[];
  currentLatex: string;
  createdAt: number;
  updatedAt: number;
  company?: string;
  targetRole?: string;
  activeVersionId?: string;
}

// ─── ATS Analysis ───────────────────────────────────────────────────────

export interface ATSScoreResult {
  score: number;           // 0-100
  keyword_match: number;   // 0-40
  skills_alignment: number; // 0-25
  action_verbs: number;    // 0-15
  structure: number;       // 0-10
  project_relevance: number; // 0-10
  missing_keywords: string[];
  improvements: string[];
}

export interface GenerationStep {
  id: string;
  label: string;
  status: 'pending' | 'running' | 'done' | 'error';
  detail?: string; // e.g. "ATS Score: 74/100"
}

export interface ATSKeywordResult {
  keywords: string[];
  skills: string[];
  tools: string[];
  softSkills: string[];
  certifications: string[];
}

export interface ResumeMatchScore {
  overall: number;           // 0-100
  keywordMatches: string[];  // keywords found in resume
  missingKeywords: string[]; // keywords NOT found in resume
  matchedSkills: string[];
  missingSkills: string[];
}

// ─── Legacy compat — keep for MasterResume page backward compat ─────────
// These are retained so old Firestore data doesn't break on read.

export interface Education {
  id: string;
  school: string;
  degree: string;
  field: string;
  startDate: string;
  endDate: string;
  gpa?: string;
  details?: string;
}

export interface Experience {
  id: string;
  company: string;
  role: string;
  location?: string;
  startDate: string;
  endDate: string;
  bullets: string[];
}

export interface ProjectItem {
  id: string;
  name: string;
  tech?: string;
  link?: string;
  description: string;
}

export interface Certification {
  id: string;
  name: string;
  issuer?: string;
  date?: string;
}

export interface Achievement {
  id: string;
  title: string;
  description?: string;
  date?: string;
}

export interface MasterResume {
  fullName: string;
  email: string;
  phone?: string;
  location?: string;
  links?: string;
  summary?: string;
  education: Education[];
  experience: Experience[];
  projects: ProjectItem[];
  skills: string[];
  certifications?: Certification[];
  achievements?: Achievement[];
}
