/** Fingerprint master LaTeX for UI preview (no full content dump). */
export function masterResumeFingerprint(latex: string): {
  len: number;
  sectionCount: number;
  sections: string[];
  snippet: string;
} {
  const sections = [...latex.matchAll(/\\section\*?\{([^}]+)\}/g)].map((m) => m[1].trim());
  return {
    len: latex.length,
    sectionCount: sections.length,
    sections: sections.slice(0, 12),
    snippet: latex.replace(/\s+/g, " ").trim().slice(0, 120),
  };
}
