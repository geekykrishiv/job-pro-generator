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

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export interface ResumeVersion {
  id: string;
  latex: string;
  createdAt: number;
  label?: string;
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
}
