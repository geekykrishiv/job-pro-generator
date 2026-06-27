import { callGemini } from "./gemini";
import { GEMINI_CONFIG } from "@/config/gemini";
import { extractKeywords, scoreResumeMatch } from "./atsAnalyzer";
import { isEmptyAtsScore, parseAtsScoreJson } from "./atsScoreParse";
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

/** Plain text for ATS scoring — preserves braced content from \\commands. */
function latexToPlainText(latex: string): string {
  let s = latex.replace(/^\s*%.*$/gm, " ");
  for (let i = 0; i < 6; i++) {
    s = s.replace(/\\[a-zA-Z@]+\*?(?:\[[^\]]*\])?\{([^{}]*)\}/g, " $1 ");
  }
  return s
    .replace(/\\(begin|end)\{[^}]+\}/g, " ")
    .replace(/\\[a-zA-Z@]+/g, " ")
    .replace(/[{}\\%$&#^~_]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function resumeTextForScoring(latex: string): string {
  const plain = latexToPlainText(latex);
  return plain.length >= 80 ? plain : latex.replace(/\s+/g, " ").trim();
}

function localAtsFallback(latex: string, jobDescription: string): ATSScoreResult {
  const ats = extractKeywords(jobDescription);
  const match = scoreResumeMatch(latex, ats);
  const overall = match.overall;
  return {
    score: overall,
    keyword_match: Math.min(40, Math.round(overall * 0.4)),
    skills_alignment: Math.min(25, Math.round(overall * 0.25)),
    action_verbs: Math.min(15, Math.round(overall * 0.15)),
    structure: Math.min(10, Math.round(overall * 0.1)),
    project_relevance: Math.min(10, Math.round(overall * 0.1)),
    missing_keywords: [...match.missingKeywords, ...match.missingSkills].slice(0, 12),
    improvements: match.missingKeywords.slice(0, 5).map((k) => `Incorporate keyword: ${k}`),
  };
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
  jobDescription: string,
  geminiKey: string,
): Promise<ATSScoreResult> {
  if (!latex?.trim()) {
    throw new Error("Cannot score ATS: resume LaTeX is empty.");
  }
  if (!jobDescription?.trim()) {
    throw new Error("Cannot score ATS: job description is empty.");
  }

  const resumeText = resumeTextForScoring(latex);
  const prompt = buildScoreResumePrompt(jobDescription, resumeText);

  try {
    const rawResult = await callGemini(geminiKey, prompt, GEMINI_CONFIG.SCORING_CONFIG);
    if (!rawResult?.trim()) {
      console.warn("[scoreResume] Empty LLM response — using local keyword match fallback.");
      return localAtsFallback(latex, jobDescription);
    }

    const parsed = parseAtsScoreJson(rawResult);
    if (isEmptyAtsScore(parsed)) {
      console.warn("[scoreResume] LLM returned all-zero score — using local keyword match fallback.");
      return localAtsFallback(latex, jobDescription);
    }
    return parsed;
  } catch (err) {
    console.error("[scoreResume] Parse/API error, using local fallback:", err);
    return localAtsFallback(latex, jobDescription);
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
