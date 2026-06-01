import { callGemini } from "./gemini";
import { GEMINI_CONFIG } from "@/config/gemini";
import { extractKeywords, scoreResumeMatch } from "./atsAnalyzer";
import type { ATSKeywordResult, ResumeMatchScore } from "@/types";

// ─── System Prompt: The Elite ATS Tailoring Engine ──────────────────────

const TAILORING_SYSTEM_PROMPT = `You are an elite ATS resume optimization engine.

Your task:
Modify an existing LaTeX resume to tailor it specifically for a target job description.

RULES:
- Preserve ALL LaTeX syntax and formatting
- Do NOT break compilation
- Do NOT invent fake experience
- Do NOT fabricate projects
- Only improve wording and prioritization
- Optimize for ATS keywords
- Keep output concise and professional
- Maintain one-page format when possible
- Return ONLY valid LaTeX code — no markdown fences, no explanations

OBJECTIVES:
1. Increase ATS match score
2. Improve recruiter readability
3. Emphasize relevant experience
4. Improve action verbs
5. Optimize technical skills alignment
6. Rewrite bullet points to naturally incorporate key terms
7. Reorder sections and items by relevance to the target role
8. Generate a tailored summary/objective if one exists

Return ONLY valid LaTeX. Start with \\documentclass and end with \\end{document}.`;

const REFINE_SYSTEM_PROMPT = `You are an elite ATS resume optimization engine.
The user wants specific modifications to their already-tailored LaTeX resume.

RULES:
- Preserve ALL LaTeX syntax and formatting exactly
- Do NOT break LaTeX compilation
- Do NOT invent fake experience or projects
- Apply ONLY the changes the user requests
- Keep the resume ATS-friendly and professional
- Return ONLY valid LaTeX code — no markdown, no explanations

Return ONLY valid LaTeX. Start with \\documentclass and end with \\end{document}.`;

// ─── LaTeX Extraction Helper ────────────────────────────────────────────

function extractLatexCode(text: string): string {
  // Try code fences first
  const fenced = text.match(/```(?:latex|tex)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  // Find raw LaTeX
  const docMatch = text.match(/(\\documentclass[\s\S]*\\end\{document\})/);
  if (docMatch) return docMatch[1].trim();
  // If it starts with \documentclass, it's already raw LaTeX
  if (text.trim().startsWith("\\documentclass")) return text.trim();
  return text.trim();
}

// ─── Validate LaTeX Output ──────────────────────────────────────────────

function validateLatex(latex: string): { valid: boolean; error?: string } {
  if (!latex.includes("\\documentclass")) {
    return { valid: false, error: "Missing \\documentclass" };
  }
  if (!latex.includes("\\begin{document}")) {
    return { valid: false, error: "Missing \\begin{document}" };
  }
  if (!latex.includes("\\end{document}")) {
    return { valid: false, error: "Missing \\end{document}" };
  }
  // Check for balanced braces (rough check)
  let depth = 0;
  for (const ch of latex) {
    if (ch === "{") depth++;
    if (ch === "}") depth--;
    if (depth < 0) return { valid: false, error: "Unbalanced braces" };
  }
  if (depth !== 0) {
    return { valid: false, error: `Unbalanced braces (${depth} unclosed)` };
  }
  return { valid: true };
}

// ═══════════════════════════════════════════════════════════════════════
//  MAIN FUNCTION: generateTailoredResume
// ═══════════════════════════════════════════════════════════════════════

export interface TailorInput {
  masterResumeLatex: string;
  jobDescription: string;
  companyName?: string;
  targetRole?: string;
  additionalInstructions?: string;
  apiKey: string;
}

export interface TailorResult {
  latex: string;
  atsAnalysis: ATSKeywordResult;
  matchScore: ResumeMatchScore;
  company: string;
  role: string;
}

/**
 * Core tailoring engine.
 * Takes a master LaTeX resume + job description → returns tailored LaTeX.
 */
export async function generateTailoredResume({
  masterResumeLatex,
  jobDescription,
  companyName,
  targetRole,
  additionalInstructions,
  apiKey,
}: TailorInput): Promise<TailorResult> {
  if (!apiKey) throw new Error("Missing Gemini API key. Add it in Settings.");
  if (!masterResumeLatex.trim()) throw new Error("No master resume found. Upload your LaTeX resume first.");
  if (!jobDescription.trim()) throw new Error("Job description is empty.");

  // Step 1: Extract ATS keywords locally (no API call needed)
  const atsAnalysis = extractKeywords(jobDescription);

  // Step 2: Build the prompt
  const prompt = buildTailoringPrompt({
    masterResumeLatex,
    jobDescription,
    companyName: companyName || "",
    targetRole: targetRole || "",
    additionalInstructions: additionalInstructions || "",
    atsKeywords: atsAnalysis,
  });

  // Step 3: Call Gemini
  const fullPrompt = `${TAILORING_SYSTEM_PROMPT}\n\n${prompt}`;
  const raw = await callGemini(apiKey, fullPrompt, GEMINI_CONFIG.GENERATION_CONFIG);

  // Step 4: Extract and validate LaTeX
  let latex = extractLatexCode(raw);

  const validation = validateLatex(latex);
  if (!validation.valid) {
    // If validation fails, try one more time with a fix-up prompt
    console.warn("LaTeX validation failed:", validation.error, "— attempting fix");
    const fixPrompt = `The following LaTeX code has an error: ${validation.error}. Fix it and return ONLY valid LaTeX:\n\n${latex}`;
    const fixRaw = await callGemini(
      apiKey,
      `Fix the LaTeX code. Return ONLY valid LaTeX starting with \\documentclass and ending with \\end{document}.\n\n${fixPrompt}`,
      GEMINI_CONFIG.GENERATION_CONFIG,
    );
    latex = extractLatexCode(fixRaw);
  }

  // Step 5: Score the tailored resume against the JD
  const matchScore = scoreResumeMatch(latex, atsAnalysis);

  return {
    latex,
    atsAnalysis,
    matchScore,
    company: companyName || atsAnalysis.keywords[0] || "",
    role: targetRole || "",
  };
}

// ─── Prompt Builder ─────────────────────────────────────────────────────

function buildTailoringPrompt(params: {
  masterResumeLatex: string;
  jobDescription: string;
  companyName: string;
  targetRole: string;
  additionalInstructions: string;
  atsKeywords: ATSKeywordResult;
}): string {
  const parts: string[] = [];

  if (params.targetRole) {
    parts.push(`TARGET ROLE:\n${params.targetRole}`);
  }
  if (params.companyName) {
    parts.push(`COMPANY:\n${params.companyName}`);
  }

  parts.push(`ATS KEYWORDS TO INCORPORATE (extracted from JD):\nTechnical: ${params.atsKeywords.skills.join(", ")}\nGeneral: ${params.atsKeywords.keywords.join(", ")}\nSoft skills: ${params.atsKeywords.softSkills.join(", ")}`);

  if (params.additionalInstructions) {
    parts.push(`ADDITIONAL INSTRUCTIONS:\n${params.additionalInstructions}`);
  }

  parts.push(`JOB DESCRIPTION:\n${params.jobDescription}`);
  parts.push(`MASTER LATEX RESUME:\n${params.masterResumeLatex}`);
  parts.push("Return ONLY valid LaTeX.");

  return parts.join("\n\n");
}

// ═══════════════════════════════════════════════════════════════════════
//  REFINE: Iterative modifications to an already-tailored resume
// ═══════════════════════════════════════════════════════════════════════

/**
 * Refine an already-tailored resume based on user feedback.
 */
export async function refineTailoredResume(
  apiKey: string,
  currentLatex: string,
  masterResumeLatex: string,
  jobDescription: string,
  userRequest: string,
): Promise<string> {
  const prompt = `CURRENT TAILORED RESUME (LaTeX):\n${currentLatex}\n\nORIGINAL MASTER RESUME (LaTeX):\n${masterResumeLatex}\n\nJOB DESCRIPTION:\n${jobDescription}\n\nUSER REQUEST:\n${userRequest}\n\nApply the requested changes. Return ONLY valid LaTeX.`;
  const raw = await callGemini(apiKey, `${REFINE_SYSTEM_PROMPT}\n\n${prompt}`, GEMINI_CONFIG.GENERATION_CONFIG);
  return extractLatexCode(raw);
}
