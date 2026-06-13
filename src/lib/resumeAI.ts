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
  console.log("[scoreResume] INPUT latex length:", latex.length, "first 300:", latex.slice(0, 300));
  console.log("[scoreResume] INPUT plainResume length:", plainResume.length, "first 300:", plainResume.slice(0, 300));
  console.log("[scoreResume] INPUT jd length:", jd.length, "first 300:", jd.slice(0, 300));
  const prompt = buildScoreResumePrompt(jd, plainResume);
  console.log("[scoreResume] PROMPT (full):\n", prompt);

  let rawResult: string;
  try {
    rawResult = await callGemini(geminiKey, prompt, GEMINI_CONFIG.SCORING_CONFIG);
  } catch (e) {
    console.error("[scoreResume] callGemini THREW:", e);
    throw e;
  }
  console.log("[scoreResume] RAW LLM RESPONSE (length=" + rawResult.length + "):\n", rawResult);

  try {
    const cleaned = rawResult
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/, "")
      .trim();
    console.log("[scoreResume] CLEANED for parse (length=" + cleaned.length + "):\n", cleaned);
    const parsed = JSON.parse(cleaned) as ATSScoreResult;
    console.log("[scoreResume] PARSED OBJECT:", JSON.stringify(parsed, null, 2));
    const final = {
      score: parsed.score || 0,
      keyword_match: parsed.keyword_match || 0,
      skills_alignment: parsed.skills_alignment || 0,
      action_verbs: parsed.action_verbs || 0,
      structure: parsed.structure || 0,
      project_relevance: parsed.project_relevance || 0,
      missing_keywords: Array.isArray(parsed.missing_keywords) ? parsed.missing_keywords : [],
      improvements: Array.isArray(parsed.improvements) ? parsed.improvements : [],
    };
    console.log("[scoreResume] RETURNING:", JSON.stringify(final, null, 2));
    return final;
  } catch (err) {
    console.error("[scoreResume] JSON.parse THREW:", err);
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
