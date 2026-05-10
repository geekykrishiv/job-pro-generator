import { cn } from "@/lib/utils";

interface ATSBadgeProps {
  score: number;
  className?: string;
}

export default function ATSBadge({ score, className }: ATSBadgeProps) {
  let bgColor = "bg-red-500";
  if (score >= 80) bgColor = "bg-green-500";
  else if (score >= 60) bgColor = "bg-amber-500";

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold text-white shadow-sm",
        bgColor,
        className
      )}
    >
      {score}/100
    </span>
  );
}
