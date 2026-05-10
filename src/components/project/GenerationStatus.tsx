import { Loader2, CheckCircle2, XCircle, Circle } from "lucide-react";
import type { GenerationStep, ATSScoreResult } from "@/types";
import ATSBadge from "../ATSBadge";

interface GenerationStatusProps {
  steps: GenerationStep[];
  atsScore: ATSScoreResult | null;
  bestScore: number;
}

export default function GenerationStatus({ steps, atsScore, bestScore }: GenerationStatusProps) {
  return (
    <div className="w-full bg-[#181825] border border-[#313244] rounded-lg p-4 my-2 text-sm text-[#cdd6f4] shadow-md">
      <div className="font-semibold mb-4 text-[#b4befe] flex items-center justify-between">
        <span>Pipeline Progress</span>
        {bestScore > 0 && <ATSBadge score={bestScore} />}
      </div>
      
      <div className="space-y-3 mb-5">
        {steps.map((step) => (
          <div key={step.id} className="flex flex-col">
            <div className="flex items-center gap-3">
              {step.status === "pending" && <Circle className="h-4 w-4 text-[#6c7086]" />}
              {step.status === "running" && <Loader2 className="h-4 w-4 text-[#89b4fa] animate-spin" />}
              {step.status === "done" && <CheckCircle2 className="h-4 w-4 text-[#a6e3a1]" />}
              {step.status === "error" && <XCircle className="h-4 w-4 text-[#f38ba8]" />}
              <span className={step.status === "pending" ? "text-[#6c7086]" : "text-[#cdd6f4]"}>
                {step.label}
              </span>
            </div>
            {step.detail && (
              <div className="ml-7 mt-0.5 text-xs text-[#a6adc8] italic">
                {step.detail}
              </div>
            )}
          </div>
        ))}
      </div>

      {atsScore && (
        <div className="mt-4 pt-4 border-t border-[#313244]">
          <h4 className="text-xs font-semibold text-[#b4befe] mb-3 uppercase tracking-wider">ATS Score Breakdown</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-xs">
            <ScoreBar label="Keyword Match" value={atsScore.keyword_match} max={40} />
            <ScoreBar label="Skills Alignment" value={atsScore.skills_alignment} max={25} />
            <ScoreBar label="Action Verbs" value={atsScore.action_verbs} max={15} />
            <ScoreBar label="Structure" value={atsScore.structure} max={10} />
            <ScoreBar label="Project Relevance" value={atsScore.project_relevance} max={10} />
          </div>

          {atsScore.missing_keywords && atsScore.missing_keywords.length > 0 && (
            <div className="mt-3 text-xs bg-[#f38ba8]/10 text-[#f38ba8] p-2 rounded border border-[#f38ba8]/20">
              <span className="font-semibold">Missing:</span> {atsScore.missing_keywords.join(", ")}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ScoreBar({ label, value, max }: { label: string; value: number; max: number }) {
  const percent = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-[#a6adc8]">
        <span>{label}</span>
        <span>{value}/{max}</span>
      </div>
      <div className="h-1.5 w-full bg-[#313244] rounded-full overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-[#89b4fa] to-[#b4befe] transition-all duration-500 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
