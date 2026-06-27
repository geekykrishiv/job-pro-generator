import type { ATSScoreResult } from "@/types";

function num(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** Strip markdown fences and extract JSON object from LLM text. */
export function extractJsonFromLlmText(raw: string): string {
  let s = raw.trim();
  s = s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start !== -1 && end > start) {
    s = s.slice(start, end + 1);
  }
  return s;
}

/** Parse Gemini JSON with snake_case / camelCase field aliases. */
export function parseAtsScoreJson(raw: string): ATSScoreResult {
  const cleaned = extractJsonFromLlmText(raw);
  const parsed = JSON.parse(cleaned) as Record<string, unknown>;

  const keyword_match = num(parsed.keyword_match ?? parsed.keywordMatch);
  const skills_alignment = num(parsed.skills_alignment ?? parsed.skillsAlignment);
  const action_verbs = num(parsed.action_verbs ?? parsed.actionVerbs);
  const structure = num(parsed.structure);
  const project_relevance = num(parsed.project_relevance ?? parsed.projectRelevance);

  const rubricTotal =
    keyword_match + skills_alignment + action_verbs + structure + project_relevance;

  let score = num(parsed.score ?? parsed.atsScore ?? parsed.total_score ?? parsed.totalScore);
  if (score <= 0 && rubricTotal > 0) {
    score = rubricTotal;
  }

  const missing_keywords = parsed.missing_keywords ?? parsed.missingKeywords;
  const improvements = parsed.improvements ?? parsed.suggestions;

  return {
    score: Math.min(100, Math.max(0, Math.round(score))),
    keyword_match,
    skills_alignment,
    action_verbs,
    structure,
    project_relevance,
    missing_keywords: Array.isArray(missing_keywords)
      ? missing_keywords.filter((k): k is string => typeof k === "string")
      : [],
    improvements: Array.isArray(improvements)
      ? improvements.filter((k): k is string => typeof k === "string")
      : [],
  };
}

export function isEmptyAtsScore(result: ATSScoreResult): boolean {
  return (
    result.score === 0 &&
    result.keyword_match === 0 &&
    result.skills_alignment === 0 &&
    result.action_verbs === 0 &&
    result.structure === 0 &&
    result.project_relevance === 0
  );
}
