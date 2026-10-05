import type { LucideIcon } from "lucide-react";
import * as m from "motion/react-m";
import { useReducedMotion } from "motion/react";

export function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
  tone = "neutral",
  onClick,
}: {
  label: string;
  value: number;
  detail: string;
  icon: LucideIcon;
  tone?: string;
  onClick?: () => void;
}) {
  const reduced = useReducedMotion();
  const content = (
    <>
      <div className="studio-metric-top">
        <span>{label}</span>
        <span className={`studio-icon studio-icon--${tone}`}>
          <Icon size={16} strokeWidth={1.7} />
        </span>
      </div>
      <p className="studio-metric-value">{value}</p>
      <p className="studio-meta">{detail}</p>
    </>
  );
  return (
    <m.div
      initial={reduced ? false : { opacity: 0, transform: "translateY(6px)" }}
      animate={{ opacity: 1, transform: "translateY(0)" }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      className="studio-metric"
    >
      {onClick ? (
        <button
          className="studio-metric-content"
          onClick={onClick}
          aria-label={`${label}: ${value}. ${detail}`}
        >
          {content}
        </button>
      ) : (
        <div className="studio-metric-content">{content}</div>
      )}
    </m.div>
  );
}
