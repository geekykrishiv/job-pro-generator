import { LATEX_PREAMBLE } from "@/config/latexTemplate";

const LATEX_STRUCTURE_RULES = `
- Use this exact preamble in your output:
${LATEX_PREAMBLE}
- Every \\resumeSubheading has exactly 4 arguments in 4 separate {}
- Escape special characters: & → \\&, % → \\%, _ → \\_, # → \\#
- Keep the resume to ONE page; each bullet max 115 characters
`.trim();

/** Single combined prompt for Gemini (no separate system role). */
export function buildTailoredResumePrompt(
  jobDescription: string,
  masterResumeContent: string,
): string {
  return `
You are an expert resume writer. Your job is to tailor a LaTeX resume to a job description.

RULES:
- Return ONLY valid LaTeX code. No explanation, no markdown, no preamble text before \\documentclass.
- Start with \\documentclass and end with \\end{document}
- Keep ALL formatting, LaTeX commands, and structure from the master resume
- Only reorder, emphasize, or trim content to match the job description
- Do NOT invent new experience, skills, or projects
- Do NOT include any project or experience not present in the master resume below
- Do NOT change contact info, education dates, or company names
${LATEX_STRUCTURE_RULES}

MASTER RESUME (source of truth — use ONLY what is here):
---
${masterResumeContent}
---

JOB DESCRIPTION:
---
${jobDescription}
---

Now return the tailored LaTeX resume:
`.trim();
}

export function buildRewriteResumePrompt(
  jobDescription: string,
  masterResumeContent: string,
  currentLatex: string,
  scoreData: { score: number; missing_keywords: string[]; improvements: string[] },
): string {
  return `
You are an expert ATS resume editor. Improve the CURRENT RESUME LaTeX to score higher on the job description.

RULES:
- Return ONLY valid LaTeX from \\documentclass through \\end{document}
- The MASTER RESUME is the only source of facts — do not add projects, employers, or skills not listed there
- Incorporate missing keywords naturally into existing bullets
- Do not invent experience
${LATEX_STRUCTURE_RULES}

MASTER RESUME (source of truth):
---
${masterResumeContent}
---

CURRENT RESUME (improve this):
---
${currentLatex}
---

ATS FEEDBACK:
- Score: ${scoreData.score}/100
- Missing keywords: ${scoreData.missing_keywords.join(", ") || "none"}
- Improvements:
${scoreData.improvements.map((i) => `  - ${i}`).join("\n") || "  - none"}

JOB DESCRIPTION:
---
${jobDescription}
---

Return the improved full LaTeX resume:
`.trim();
}

export function buildScoreResumePrompt(jobDescription: string, resumeText: string): string {
  return `
You are an ATS scoring engine. Score this resume 0–100 against the job description.

Rubric (sub-scores must reflect your evaluation — do NOT return all zeros unless the resume is completely empty):
- keyword_match (0–40): JD keywords present in resume
- skills_alignment (0–25): required skills covered
- action_verbs (0–15): strong verbs and measurable impact
- structure (0–10): clear ATS-readable sections
- project_relevance (0–10): projects match the role
- score (0–100): overall total (should equal sum of sub-scores)

Return ONLY valid JSON with these exact snake_case keys:
{"score":75,"keyword_match":30,"skills_alignment":20,"action_verbs":10,"structure":8,"project_relevance":7,"missing_keywords":["example"],"improvements":["example tip"]}

JOB DESCRIPTION:
---
${jobDescription}
---

RESUME TEXT:
---
${resumeText}
---
`.trim();
}

export function buildFixLatexPrompt(latex: string, errorLog: string): string {
  return `
You are a LaTeX expert. Fix ALL compilation errors. Do not change resume facts.

RULES:
- Return ONLY fixed LaTeX from \\documentclass through \\end{document}
- No markdown fences or explanation

COMPILER ERROR LOG:
---
${errorLog}
---

BROKEN LATEX:
---
${latex}
---

Fixed LaTeX:
`.trim();
}
