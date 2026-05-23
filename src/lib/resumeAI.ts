import { callGemini } from "./gemini";
import { GEMINI_CONFIG } from "@/config/gemini";
import {
  buildGenerateUserPrompt,
  buildRewriteUserPrompt,
  FIX_LATEX_SYSTEM,
  GENERATE_SYSTEM,
  REWRITE_SYSTEM,
  SCORE_SYSTEM,
} from "./resumePrompts";
import type { ATSScoreResult } from "@/types";

function cleanLatex(raw: string): string {
  let s = raw.trim();
  s = s.replace(/^```[a-z]*\n?/, "").replace(/\n?```$/, "").trim();
  const idx = s.indexOf("\\documentclass");
  return idx > 0 ? s.slice(idx).trim() : s;
}

export async function generateResume(
  jd: string,
  masterResumeLatex: string,
  geminiKey: string,
): Promise<string> {
  const prompt = buildGenerateUserPrompt(jd, masterResumeLatex);
  const rawResult = await callGemini(
    geminiKey,
    prompt,
    GENERATE_SYSTEM,
    GEMINI_CONFIG.GENERATION_CONFIG,
  );
  return cleanLatex(rawResult);
}

export async function scoreResume(
  latex: string,
  jd: string,
  geminiKey: string,
): Promise<ATSScoreResult> {
  const prompt = `Score this resume 0–100 against the job description.

Rubric (max points):
- keyword_match (40): required JD terms appear in resume
- skills_alignment (25): hard skills / stack overlap
- action_verbs (15): strong verbs and impact language
- structure (10): clear ATS-friendly sections
- project_relevance (10): projects match the role

Return ONLY this JSON (no markdown):
{"score":0,"keyword_match":0,"skills_alignment":0,"action_verbs":0,"structure":0,"project_relevance":0,"missing_keywords":[],"improvements":[]}

JOB DESCRIPTION:
${jd}

RESUME (LaTeX):
${latex}`;

  try {
    const rawResult = await callGemini(
      geminiKey,
      prompt,
      SCORE_SYSTEM,
      GEMINI_CONFIG.SCORING_CONFIG,
    );
    const cleaned = rawResult.replace(/^```json\n?/, "").replace(/\n?```$/, "").trim();
    const parsed = JSON.parse(cleaned) as ATSScoreResult;
    return {
      score: parsed.score || 0,
      keyword_match: parsed.keyword_match || 0,
      skills_alignment: parsed.skills_alignment || 0,
      action_verbs: parsed.action_verbs || 0,
      structure: parsed.structure || 0,
      project_relevance: parsed.project_relevance || 0,
      missing_keywords: Array.isArray(parsed.missing_keywords) ? parsed.missing_keywords : [],
      improvements: Array.isArray(parsed.improvements) ? parsed.improvements : [],
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
      improvements: ["Failed to parse ATS score from AI."],
    };
  }
}

export async function rewriteResume(
  latex: string,
  jd: string,
  scoreData: ATSScoreResult,
  masterResumeLatex: string,
  geminiKey: string,
): Promise<string> {
  const prompt = buildRewriteUserPrompt(jd, masterResumeLatex, latex, scoreData);
  const rawResult = await callGemini(
    geminiKey,
    prompt,
    REWRITE_SYSTEM,
    GEMINI_CONFIG.GENERATION_CONFIG,
  );
  return cleanLatex(rawResult);
}

export async function fixLatex(latex: string, errorLog: string, geminiKey: string): Promise<string> {
  const prompt = `COMPILER ERROR LOG:
${errorLog}

BROKEN LATEX:
${latex}

Return the fixed full LaTeX document.`;

  const rawResult = await callGemini(
    geminiKey,
    prompt,
    FIX_LATEX_SYSTEM,
    GEMINI_CONFIG.GENERATION_CONFIG,
  );
  return cleanLatex(rawResult);
}
