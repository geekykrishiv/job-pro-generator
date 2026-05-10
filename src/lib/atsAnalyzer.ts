import type { ATSKeywordResult, ResumeMatchScore } from "@/types";

// ─── Stop-words to filter from keyword extraction ───────────────────────

const STOP_WORDS = new Set([
  "a","an","the","and","or","but","in","on","at","to","for","of","with","by",
  "is","are","was","were","be","been","being","have","has","had","do","does",
  "did","will","would","shall","should","may","might","can","could","must",
  "that","this","these","those","it","its","we","our","you","your","they",
  "their","he","she","his","her","not","no","nor","so","if","then","than",
  "as","from","about","into","through","during","before","after","above",
  "below","between","under","over","again","further","once","here","there",
  "when","where","why","how","all","both","each","few","more","most","other",
  "some","such","only","own","same","too","very","just","also","any","new",
  "work","working","experience","team","ability","strong","looking","role",
  "position","company","join","including","across","well","using","used",
  "make","ensure","help","etc","plus","within","based","related","required",
  "preferred","minimum","years","year","knowledge","understanding","skills",
  "skill","proficiency","proficient","familiar","familiarity","excellent",
  "good","great","proven","demonstrated","track","record","responsible",
]);

// ─── Keyword / Skill Dictionaries ───────────────────────────────────────

const TECH_TOOLS = new Set([
  "python","java","javascript","typescript","c++","c#","go","rust","ruby","php",
  "swift","kotlin","scala","r","matlab","sql","nosql","html","css","sass","less",
  "react","angular","vue","svelte","next.js","nuxt","gatsby","node.js","express",
  "django","flask","fastapi","spring","rails","laravel",".net","asp.net",
  "aws","azure","gcp","docker","kubernetes","terraform","ansible","jenkins",
  "git","github","gitlab","bitbucket","ci/cd","circleci","travis",
  "mongodb","postgresql","mysql","redis","elasticsearch","dynamodb","firebase",
  "kafka","rabbitmq","graphql","rest","grpc","websocket",
  "tensorflow","pytorch","scikit-learn","pandas","numpy","spark","hadoop",
  "tableau","power bi","excel","figma","sketch","adobe","jira","confluence",
  "linux","unix","bash","powershell","nginx","apache",
  "agile","scrum","kanban","devops","mlops","microservices","serverless",
  "oauth","jwt","ssl","tls","api","sdk","saas","paas","iaas",
]);

const SOFT_SKILLS = new Set([
  "leadership","communication","collaboration","teamwork","problem-solving",
  "critical thinking","analytical","creative","innovative","adaptable",
  "flexible","detail-oriented","organized","time management","project management",
  "mentoring","coaching","negotiation","presentation","stakeholder management",
  "cross-functional","strategic","planning","decision-making","interpersonal",
]);

// ─── Core Extraction Function ───────────────────────────────────────────

/**
 * Extract ATS-relevant keywords from a job description using
 * frequency analysis and dictionary matching.
 */
export function extractKeywords(jobDescription: string): ATSKeywordResult {
  const text = jobDescription.toLowerCase();

  // Tokenize: split on non-alphanumeric, keep compound terms
  const rawTokens = text
    .replace(/[^\w\s.#+/-]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOP_WORDS.has(t));

  // Count frequency
  const freq = new Map<string, number>();
  for (const token of rawTokens) {
    freq.set(token, (freq.get(token) || 0) + 1);
  }

  // Also extract bigrams (two-word phrases) for compound terms
  const words = text.split(/\s+/);
  for (let i = 0; i < words.length - 1; i++) {
    const bigram = words[i].replace(/[^\w]/g, "") + " " + words[i + 1].replace(/[^\w]/g, "");
    if (bigram.length > 4 && !STOP_WORDS.has(bigram)) {
      freq.set(bigram, (freq.get(bigram) || 0) + 1);
    }
  }

  // Classify tokens
  const tools: string[] = [];
  const softSkillsFound: string[] = [];
  const certifications: string[] = [];
  const generalKeywords: string[] = [];

  // Check for tool/tech matches
  for (const token of freq.keys()) {
    if (TECH_TOOLS.has(token)) {
      tools.push(token);
    } else if (SOFT_SKILLS.has(token)) {
      softSkillsFound.push(token);
    } else if (
      token.includes("certif") ||
      token.includes("license") ||
      token.includes("cpa") ||
      token.includes("pmp") ||
      token.includes("aws certified")
    ) {
      certifications.push(token);
    }
  }

  // Extract multi-word tech terms from the full text
  const multiWordTech = [
    "machine learning", "deep learning", "natural language processing",
    "computer vision", "data science", "data engineering", "data analysis",
    "full stack", "front end", "back end", "cloud computing",
    "continuous integration", "continuous deployment",
    "object oriented", "test driven", "behavior driven",
    "version control", "source control",
    "unit testing", "integration testing", "end to end",
    "system design", "distributed systems",
    "react native", "node js", "next js", "vue js",
    "google cloud", "amazon web services",
  ];
  for (const term of multiWordTech) {
    if (text.includes(term)) {
      tools.push(term);
    }
  }

  // General keywords: high-frequency non-stop-word tokens
  const sorted = [...freq.entries()]
    .filter(([token]) => !STOP_WORDS.has(token) && token.length > 2)
    .sort((a, b) => b[1] - a[1]);

  for (const [token] of sorted.slice(0, 30)) {
    if (!tools.includes(token) && !softSkillsFound.includes(token)) {
      generalKeywords.push(token);
    }
  }

  return {
    keywords: [...new Set(generalKeywords)].slice(0, 20),
    skills: [...new Set([...tools])].slice(0, 25),
    tools: [...new Set(tools)].slice(0, 20),
    softSkills: [...new Set(softSkillsFound)].slice(0, 10),
    certifications: [...new Set(certifications)],
  };
}

// ─── Resume Section Analysis ────────────────────────────────────────────

/**
 * Extract text content from LaTeX code for analysis purposes.
 * Strips LaTeX commands and returns plain text per section.
 */
export function analyzeResumeSections(latexCode: string): Record<string, string> {
  const sections: Record<string, string> = {};
  let currentSection = "header";

  const lines = latexCode.split("\n");
  for (const line of lines) {
    // Detect section headers
    const sectionMatch = line.match(/\\section\*?\{([^}]+)\}/i);
    if (sectionMatch) {
      currentSection = sectionMatch[1].toLowerCase().trim();
      sections[currentSection] = "";
      continue;
    }

    // Strip LaTeX commands and accumulate text
    const plainText = line
      .replace(/\\[a-zA-Z]+\*?(\{[^}]*\})?/g, " ")
      .replace(/[{}\\%&$#_^~]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (plainText) {
      sections[currentSection] = (sections[currentSection] || "") + " " + plainText;
    }
  }

  return sections;
}

// ─── Resume Match Scoring ───────────────────────────────────────────────

/**
 * Score how well a resume matches a job description's keywords.
 */
export function scoreResumeMatch(
  latexCode: string,
  atsResult: ATSKeywordResult,
): ResumeMatchScore {
  const resumeText = latexCode.toLowerCase();

  const allTargetKeywords = [
    ...atsResult.keywords,
    ...atsResult.skills,
    ...atsResult.softSkills,
  ];

  const keywordMatches: string[] = [];
  const missingKeywords: string[] = [];
  const matchedSkills: string[] = [];
  const missingSkills: string[] = [];

  for (const kw of atsResult.keywords) {
    if (resumeText.includes(kw.toLowerCase())) {
      keywordMatches.push(kw);
    } else {
      missingKeywords.push(kw);
    }
  }

  for (const skill of [...atsResult.skills, ...atsResult.tools]) {
    if (resumeText.includes(skill.toLowerCase())) {
      matchedSkills.push(skill);
    } else {
      missingSkills.push(skill);
    }
  }

  const totalTargets = allTargetKeywords.length || 1;
  const totalMatched = keywordMatches.length + matchedSkills.length;
  const overall = Math.round((totalMatched / totalTargets) * 100);

  return {
    overall: Math.min(overall, 100),
    keywordMatches: [...new Set(keywordMatches)],
    missingKeywords: [...new Set(missingKeywords)],
    matchedSkills: [...new Set(matchedSkills)],
    missingSkills: [...new Set(missingSkills)],
  };
}

/**
 * Identify keywords from the JD that are missing in the resume.
 */
export function identifyMissingKeywords(
  latexCode: string,
  jobDescription: string,
): { missing: string[]; present: string[] } {
  const ats = extractKeywords(jobDescription);
  const score = scoreResumeMatch(latexCode, ats);
  return {
    missing: [...score.missingKeywords, ...score.missingSkills],
    present: [...score.keywordMatches, ...score.matchedSkills],
  };
}
