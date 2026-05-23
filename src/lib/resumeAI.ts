import { callClaude } from "./claude";
import { LATEX_PREAMBLE } from "@/config/latexTemplate";
import type { ATSScoreResult } from "@/types";

/**
 * Strips markdown fences from a raw string if present, and extracts just the LaTeX.
 */
function cleanLatex(raw: string): string {
  let s = raw.trim();
  s = s.replace(/^```[a-z]*\n?/, '').replace(/\n?```$/, '').trim();
  const idx = s.indexOf('\\documentclass');
  return idx > 0 ? s.slice(idx).trim() : s;
}

export async function generateResume(
  jd: string,
  masterResumeLatex: string,
  apiKey: string,
): Promise<string> {
  const prompt = `You are an expert ATS resume writer and LaTeX specialist.

Generate a polished, complete, 1-page LaTeX resume for the job description below.
Use ONLY data from the master resume — never fabricate anything.

SECTION ORDER (follow exactly):
1. Heading (name + contact)
2. Summary (2-3 sentences tailored to the role)
3. Education
4. Skills (NO soft skills — only Languages, Frameworks, Tools, Concepts)
5. Projects (select projects by JD relevance from the master resume)
6. Achievements (include competition wins if present in master)
7. Positions of Responsibility (include roles if present in master)

PROJECT RULE — CRITICAL:
- Select projects from the master resume based on JD relevance.
- Do NOT include projects that are not in the master resume.
- Prioritize the most relevant projects for the role.

LATEX RULES (follow strictly):
- Every \\resumeSubheading must have exactly 4 arguments in 4 separate {}
- Every \\begin{X} must have \\end{X}
- Escape special chars: & as \\&, % as \\%, _ as \\_, # as \\#
- URLs: \\href{url}{\\underline{text}}
- Never nest \\resumeSubheading inside \\resumeItemListStart
- Always close \\resumeItemListEnd before starting a new \\resumeSubheading
- End file with \\end{document}
- Keep every bullet complete — never truncate mid-sentence
- Each bullet max 115 characters
- Right-column text in \\resumeSubheading (args #2 and #4) must be SHORT — max 22 characters

CRITICAL OUTPUT RULE:
- Output ONLY raw LaTeX starting with \\documentclass — nothing else
- Zero markdown fences, zero explanation

USE THIS EXACT PREAMBLE:
${LATEX_PREAMBLE}

MASTER RESUME (LaTeX — sole source of truth):
${masterResumeLatex}

JOB DESCRIPTION:
${jd}

Raw LaTeX:`;

  const rawResult = await callClaude(apiKey, prompt);
  return cleanLatex(rawResult);
}

export async function scoreResume(
  latex: string,
  jd: string,
  apiKey: string,
): Promise<ATSScoreResult> {
  const prompt = `You are an ATS evaluator. Score this resume 0-100 against the job description.

Scoring:
- keyword_match (max 40): JD keywords in resume
- skills_alignment (max 25): required skills covered
- action_verbs (max 15): strong verbs and measurable impact
- structure (max 10): clean ATS-readable sections
- project_relevance (max 10): projects match role

Return ONLY valid JSON, no markdown, no explanation:
{"score":0,"keyword_match":0,"skills_alignment":0,"action_verbs":0,"structure":0,"project_relevance":0,"missing_keywords":[],"improvements":[]}

JOB DESCRIPTION:
${jd}

RESUME:
${latex}

JSON:`;

  try {
    const rawResult = await callClaude(apiKey, prompt);
    const cleaned = rawResult.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
    const parsed = JSON.parse(cleaned) as ATSScoreResult;
    return {
      score: parsed.score || 0,
      keyword_match: parsed.keyword_match || 0,
      skills_alignment: parsed.skills_alignment || 0,
      action_verbs: parsed.action_verbs || 0,
      structure: parsed.structure || 0,
      project_relevance: parsed.project_relevance || 0,
      missing_keywords: Array.isArray(parsed.missing_keywords) ? parsed.missing_keywords : [],
      improvements: Array.isArray(parsed.improvements) ? parsed.improvements : []
    };
  } catch (err) {
    console.error("scoreResume JSON parse error", err);
    return {
      score: 0,
      keyword_match: 0,
      skills_alignment: 0,
      action_verbs: 0,
      structure: 0,
      project_relevance: 0,
      missing_keywords: [],
      improvements: ["Failed to parse ATS score from AI."]
    };
  }
}

export async function rewriteResume(
  latex: string,
  jd: string,
  scoreData: ATSScoreResult,
  masterResumeLatex: string,
  apiKey: string,
): Promise<string> {
  const prompt = `You are an expert ATS resume writer and LaTeX specialist.

Rewrite the resume to improve its ATS score using the feedback below.

MANDATORY:
- Only use projects and content present in the master resume
- Do NOT add projects removed from the master resume
- Keep Skills section without a Soft Skills row if the master has none

RULES:
- Incorporate missing keywords naturally into bullets
- Keep every bullet complete, max 115 chars
- Fix any LaTeX syntax issues you notice while rewriting
- Right-column text in \\resumeSubheading (args #2 and #4) must be SHORT — max 22 characters
- Keep to 1 page
- Never fabricate anything not in the master resume
- Output ONLY raw LaTeX starting with \\documentclass — no markdown fences

PREAMBLE TO USE:
${LATEX_PREAMBLE}

MASTER RESUME (LaTeX — sole source of truth):
${masterResumeLatex}

CURRENT RESUME:
${latex}

FEEDBACK:
Score: ${scoreData.score}/100
Missing keywords: ${scoreData.missing_keywords.join(', ')}
${scoreData.improvements.map(i => `- ${i}`).join('\n')}

JOB DESCRIPTION:
${jd}

Rewritten LaTeX:`;

  const rawResult = await callClaude(apiKey, prompt);
  return cleanLatex(rawResult);
}

export async function fixLatex(latex: string, errorLog: string, apiKey: string): Promise<string> {
  const prompt = `You are a LaTeX expert. Fix ALL compilation errors in this resume.

COMPILER ERROR LOG:
${errorLog}

FIX RULES:
- Output ONLY fixed raw LaTeX starting with \\documentclass
- No markdown fences, no explanation
- Keep all resume content intact — only fix LaTeX syntax
- File must end with \\end{document}

BROKEN LATEX:
${latex}

Fixed LaTeX:`;

  const rawResult = await callClaude(apiKey, prompt);
  return cleanLatex(rawResult);
}
