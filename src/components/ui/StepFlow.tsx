import { ArrowDown, ArrowRight, type LucideIcon } from "lucide-react";
import { Fragment } from "react";

import { IconTile } from "./Tiles";

export interface FlowStep {
  icon: LucideIcon;
  title: string;
  line: string;
}

/** Ordered steps with arrows: stacked below 900px, one row from 900px. */
export function StepFlow({ steps }: { steps: FlowStep[] }) {
  return (
    <ol className="flex flex-col items-stretch min-[900px]:flex-row min-[900px]:items-center">
      {steps.map((step, index) => (
        <Fragment key={step.title}>
          {index > 0 && (
            <li aria-hidden="true" className="flex list-none justify-center py-2 text-ink-muted min-[900px]:px-2 min-[900px]:py-0">
              <ArrowDown className="size-5 min-[900px]:hidden" strokeWidth={1.75} />
              <ArrowRight className="hidden size-5 min-[900px]:block" strokeWidth={1.75} />
            </li>
          )}
          <li
            aria-label={`Step ${index + 1} of ${steps.length}: ${step.title}`}
            className="flex-1 list-none rounded-md border border-line bg-surface p-4 min-[900px]:self-stretch"
          >
            <p className="text-secondary text-ink-muted">Step {index + 1}</p>
            <div className="mt-2 flex items-start gap-3">
              <IconTile icon={step.icon} />
              <div className="min-w-0">
                <p className="font-semibold text-ink">{step.title}</p>
                <p className="text-secondary text-ink">{step.line}</p>
              </div>
            </div>
          </li>
        </Fragment>
      ))}
    </ol>
  );
}

export function FeatureCard({ icon, title, line }: FlowStep) {
  return (
    <li className="flex list-none items-start gap-3 rounded-md border border-line bg-surface p-4">
      <IconTile icon={icon} />
      <div className="min-w-0">
        <p className="font-semibold text-ink">{title}</p>
        <p className="text-secondary text-ink">{line}</p>
      </div>
    </li>
  );
}
