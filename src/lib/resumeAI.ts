import { callGemini } from "./gemini";
import { MASTER_RESUME } from "@/config/masterResume";
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

export async function generateResume(jd: string, geminiKey: string): Promise<string> {
  const prompt = `You are an expert ATS resume writer and LaTeX specialist.

Generate a polished, complete, 1-page LaTeX resume for the job description below.
Use ONLY data from the master resume — never fabricate anything.

SECTION ORDER (follow exactly):
1. Heading (name + contact)
2. Summary (2-3 sentences tailored to the role)
3. Education
4. Skills (NO soft skills — only Languages, Frameworks, Tools, Concepts)
5. Projects (Drum Vision ALWAYS first, then 2-3 more by JD relevance)
6. Achievements (always include both competition wins)
7. Positions of Responsibility (always include both roles)

PROJECT PRIORITY RULE — CRITICAL:
- ALWAYS put Drum Vision as the FIRST project. Never skip it.
- Select 2-3 additional projects from P2-P5 based on JD relevance.

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
  Examples: "Personal Project" ✓  |  "Current Personal Project" ✗ (too long, will overflow)
  Acceptable short forms:
    "Current Personal Project" → "Personal Project"
    "Academic / Personal Project" → "Academic Project"
    "Client Project" → "Client Project" (fine as-is)
    "Group Project" → "Group Project" (fine as-is)
    "2023 -- 2027 (Pursuing)" → "2023 -- 2027" (drop the parenthetical)
- If a right-column label is longer than 22 chars, abbreviate it — never let it overflow

CRITICAL OUTPUT RULE:
- Output ONLY raw LaTeX starting with \\documentclass — nothing else
- Zero markdown fences, zero explanation

USE THIS EXACT PREAMBLE:
${LATEX_PREAMBLE}

MASTER RESUME:
${MASTER_RESUME}

JOB DESCRIPTION:
${jd}

Raw LaTeX:`;

  const rawResult = await callGemini(geminiKey, prompt);
  return cleanLatex(rawResult);
}

export async function scoreResume(latex: string, jd: string, geminiKey: string): Promise<ATSScoreResult> {
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
    const rawResult = await callGemini(geminiKey, prompt);
    const cleaned = rawResult.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
    const parsed = JSON.parse(cleaned) as ATSScoreResult;
    // ensure structure matches
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

export async function rewriteResume(latex: string, jd: string, scoreData: ATSScoreResult, geminiKey: string): Promise<string> {
  const prompt = `You are an expert ATS resume writer and LaTeX specialist.

Rewrite the resume to improve its ATS score using the feedback below.

MANDATORY (never remove):
- Drum Vision must remain the FIRST project
- Both Achievements (IEEE + Navriti) must stay
- Positions of Responsibility section with both roles must stay
- Skills section must NOT have a Soft Skills row

RULES:
- Incorporate missing keywords naturally into bullets
- Keep every bullet complete, max 115 chars
- Fix any LaTeX syntax issues you notice while rewriting
- Right-column text in \\resumeSubheading (args #2 and #4) must be SHORT — max 22 characters
  Examples: "Personal Project" ✓  |  "Current Personal Project" ✗ (too long, will overflow)
  Acceptable short forms:
    "Current Personal Project" → "Personal Project"
    "Academic / Personal Project" → "Academic Project"
    "Client Project" → "Client Project" (fine as-is)
    "Group Project" → "Group Project" (fine as-is)
    "2023 -- 2027 (Pursuing)" → "2023 -- 2027" (drop the parenthetical)
- If a right-column label is longer than 22 chars, abbreviate it — never let it overflow
- Keep to 1 page
- Never fabricate anything not in the master resume
- Output ONLY raw LaTeX starting with \\documentclass — no markdown fences

PREAMBLE TO USE:
${LATEX_PREAMBLE}

MASTER RESUME:
${MASTER_RESUME}

CURRENT RESUME:
${latex}

FEEDBACK:
Score: ${scoreData.score}/100
Missing keywords: ${scoreData.missing_keywords.join(', ')}
${scoreData.improvements.map(i => `- ${i}`).join('\n')}

JOB DESCRIPTION:
${jd}

Rewritten LaTeX:`;

  const rawResult = await callGemini(geminiKey, prompt);
  return cleanLatex(rawResult);
}

export async function fixLatex(latex: string, errorLog: string, geminiKey: string): Promise<string> {
  const prompt = `You are a LaTeX expert. Fix ALL compilation errors in this resume.

COMPILER ERROR LOG:
${errorLog}

FIX RULES:
- Output ONLY fixed raw LaTeX starting with \\documentclass
- No markdown fences, no explanation
- Keep all resume content intact — only fix LaTeX syntax
- Common fixes:
  * Escape: & → \\&, % → \\%, _ → \\_, # → \\#
  * Every \\begin{X} needs \\end{X}
  * \\resumeSubheading needs exactly 4 args in 4 separate {}
  * Never nest \\resumeSubheading inside \\resumeItemListStart
  * Close \\resumeItemListEnd before each new \\resumeSubheading
  * File must end with \\end{document}
  * Right-column text in \\resumeSubheading (args #2 and #4) must be SHORT — max 22 characters
    Examples: "Current Personal Project" → "Personal Project"
  * If a right-column label is longer than 22 chars, abbreviate it — never let it overflow
  * If \\resumeSubheading uses \\begin{tabular*} with \\extracolsep{\\fill}, replace it with \\begin{tabularx}{0.97\\textwidth}{X r} — this prevents right-column clipping. Also add \\usepackage{tabularx} to the preamble if not already present.

BROKEN LATEX:
${latex}

Fixed LaTeX:`;

  const rawResult = await callGemini(geminiKey, prompt);
  return cleanLatex(rawResult);
}
