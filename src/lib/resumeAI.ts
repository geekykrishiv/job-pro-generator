import { callGemini } from "./gemini";
import { GEMINI_CONFIG } from "@/config/gemini";
import {
  buildFixLatexPrompt,
  buildRewriteResumePrompt,
  buildScoreResumePrompt,
  buildTailoredResumePrompt,
} from "./resumePrompts";
import type { ATSScoreResult } from "@/types";

function cleanLatex(raw: string): string {
  let s = raw.trim();
  s = s.replace(/^```[a-z]*\n?/, "").replace(/\n?```$/, "").trim();
  const idx = s.indexOf("\\documentclass");
  return idx > 0 ? s.slice(idx).trim() : s;
}

/** Strip LaTeX commands/syntax so the scorer sees plain text, not \commands. */
function latexToPlainText(latex: string): string {
  return latex
    // remove comment lines
    .replace(/^\s*%.*$/gm, " ")
    // drop \begin{...} / \end{...} tags
    .replace(/\\(begin|end)\{[^}]+\}/g, " ")
    // drop \command[opts]{arg}{arg} sequences entirely
    .replace(/\\[a-zA-Z@]+\*?(?:\[[^\]]*\])?(?:\{[^}]*\})*/g, " ")
    // collapse braces / special chars
    .replace(/[{}\\%$&#^~_]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function generateResume(
  jd: string,
  masterResumeLatex: string,
  geminiKey: string,
): Promise<string> {
  const prompt = buildTailoredResumePrompt(jd, masterResumeLatex);
  const rawResult = await callGemini(geminiKey, prompt, GEMINI_CONFIG.GENERATION_CONFIG);
  return cleanLatex(rawResult);
}

export async function scoreResume(
  latex: string,
  jd: string,
  geminiKey: string,
): Promise<ATSScoreResult> {
  const plainResume = latexToPlainText(latex);
  console.log("[scoreResume] resume (first 300 chars):", plainResume.slice(0, 300));
  console.log("[scoreResume] jd (first 300 chars):", jd.slice(0, 300));
  const prompt = buildScoreResumePrompt(jd, plainResume);

  try {
    const rawResult = await callGemini(geminiKey, prompt, GEMINI_CONFIG.SCORING_CONFIG);
    // responseMimeType: "application/json" means rawResult IS JSON, but
    // models occasionally still wrap in fences — be defensive.
    const cleaned = rawResult
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/, "")
      .trim();
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
  const prompt = buildRewriteResumePrompt(jd, masterResumeLatex, latex, scoreData);
  const rawResult = await callGemini(geminiKey, prompt, GEMINI_CONFIG.GENERATION_CONFIG);
  return cleanLatex(rawResult);
}

export async function fixLatex(latex: string, errorLog: string, geminiKey: string): Promise<string> {
  const prompt = buildFixLatexPrompt(latex, errorLog);
  const rawResult = await callGemini(geminiKey, prompt, GEMINI_CONFIG.GENERATION_CONFIG);
  return cleanLatex(rawResult);
}
