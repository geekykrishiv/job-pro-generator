import { generateResume, scoreResume, rewriteResume, fixLatex } from "./resumeAI";
import { compileLatex } from "./latexCompiler";
import type { ATSScoreResult, GenerationStep } from "@/types";

interface PipelineParams {
  jd: string;
  /** Job description only — used for ATS scoring (not refinement context). */
  scoringJd: string;
  masterResumeLatex: string;
  apiKey: string;
  onStepUpdate: (steps: GenerationStep[]) => void;
  onScoreUpdate: (score: ATSScoreResult) => void;
  ATS_THRESHOLD?: number;
  MAX_ATS_RETRIES?: number;
  MAX_FIX_RETRIES?: number;
}

interface PipelineResult {
  latex: string;
  pdfBlob: Blob | null;
  pdfUrl?: string | null;
  bestScore: number;
  atsScore?: ATSScoreResult | null;
  finalSteps: GenerationStep[];
}

export async function runResumePipeline({
  jd,
  scoringJd,
  masterResumeLatex,
  apiKey,
  onStepUpdate,
  onScoreUpdate,
  ATS_THRESHOLD = 80,
  MAX_ATS_RETRIES = 3,
  MAX_FIX_RETRIES = 5,
}: PipelineParams): Promise<PipelineResult> {
  const steps: GenerationStep[] = [
    { id: 'generate', label: 'Generating tailored resume', status: 'pending' },
    { id: 'ats', label: 'Scoring ATS compatibility', status: 'pending' },
    { id: 'compile', label: 'Compiling PDF', status: 'pending' },
  ];

  const updateStep = (id: string, patch: Partial<GenerationStep>) => {
    const idx = steps.findIndex((s) => s.id === id);
    if (idx !== -1) {
      steps[idx] = { ...steps[idx], ...patch };
      onStepUpdate([...steps]);
    }
  };

  try {
    let currentLatex = '';
    try {
      updateStep('generate', { status: 'running', detail: 'Calling Gemini...' });
      currentLatex = await generateResume(jd, masterResumeLatex, apiKey);

      if (!currentLatex || currentLatex.trim().length < 100) {
        throw new Error('Gemini returned empty or invalid LaTeX');
      }

      updateStep('generate', { status: 'done', detail: 'Resume generated' });
    } catch (err) {
      updateStep('generate', { status: 'error', detail: `Generation failed: ${String(err)}` });
      return {
        latex: '',
        pdfBlob: null,
        pdfUrl: null,
        bestScore: 0,
        atsScore: null,
        finalSteps: steps,
      };
    }

    updateStep('ats', { status: 'running' });
    let bestLatex = currentLatex;
    let bestScoreObj: ATSScoreResult | null = null;
    let atsAttempts = 0;

    while (atsAttempts <= MAX_ATS_RETRIES) {
      const scoreData = await scoreResume(currentLatex, scoringJd, apiKey);
      onScoreUpdate(scoreData);

      updateStep('ats', { detail: `Attempt ${atsAttempts + 1}: Score ${scoreData.score}/100` });

      if (!bestScoreObj || scoreData.score > bestScoreObj.score) {
        bestScoreObj = scoreData;
        bestLatex = currentLatex;
      }

      if (scoreData.score >= ATS_THRESHOLD || atsAttempts === MAX_ATS_RETRIES) {
        break;
      }

      atsAttempts++;
      updateStep('ats', { detail: `Score ${scoreData.score}/100 < ${ATS_THRESHOLD}. Rewriting (Attempt ${atsAttempts}/${MAX_ATS_RETRIES})...` });
      currentLatex = await rewriteResume(currentLatex, jd, scoreData, masterResumeLatex, apiKey);
    }

    currentLatex = bestLatex;
    updateStep('ats', { status: 'done', detail: `Final Score: ${bestScoreObj?.score || 0}/100` });

    updateStep('compile', { status: 'running' });
    let pdfBlob: Blob | null = null;

    for (let attempt = 1; attempt <= MAX_FIX_RETRIES; attempt++) {
      updateStep('compile', { detail: attempt > 1 ? `Compile error — fixing (attempt ${attempt}/${MAX_FIX_RETRIES})...` : 'Compiling...' });

      const { pdfBlob: result, errorLog, success } = await compileLatex(currentLatex);

      if (success && result) {
        pdfBlob = result;
        updateStep('compile', { status: 'done', detail: 'PDF compiled successfully' });
        break;
      }

      if (attempt < MAX_FIX_RETRIES) {
        currentLatex = await fixLatex(currentLatex, errorLog, apiKey);
      } else {
        updateStep('compile', { status: 'error', detail: `Failed after ${MAX_FIX_RETRIES} attempts` });
      }
    }

    const finalPdfUrl = pdfBlob ? URL.createObjectURL(pdfBlob) : null;

    return {
      latex: currentLatex ?? '',
      pdfBlob: pdfBlob ?? null,
      pdfUrl: finalPdfUrl ?? null,
      bestScore: bestScoreObj?.score ?? 0,
      atsScore: bestScoreObj ?? null,
      finalSteps: steps ?? [],
    };
  } catch (error: unknown) {
    console.error("Pipeline Error:", error);
    steps.forEach(s => {
      if (s.status === 'running') {
        s.status = 'error';
        s.detail = error instanceof Error ? error.message : 'Pipeline failed';
      }
    });
    onStepUpdate([...steps]);

    return {
      latex: "",
      pdfBlob: null,
      bestScore: 0,
      finalSteps: steps,
    };
  }
}
