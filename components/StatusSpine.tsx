import type { RequestState } from '@prisma/client';
import { Check } from '@phosphor-icons/react/dist/ssr';
import { STATE_META, isTerminal } from '@/lib/taxonomy';

// The record's status spine (design §3.5): Submitted → Clarifying → Awaiting
// domain decision → outcome. Clarifying is a detour, not a gate, so a request
// that never needed questions shows it as skipped rather than missing. The
// terminal step names the actual outcome once there is one, in its Badge
// colour — never colour alone (a check or the label always accompanies it).

const SPINE: { key: string; label: string; states: RequestState[] }[] = [
  { key: 'submitted', label: 'Submitted', states: ['SUBMITTED'] },
  { key: 'clarifying', label: 'Clarifying', states: ['CLARIFYING', 'READY_FOR_REVIEW', 'REQUESTER_CONFIRMED'] },
  { key: 'domain', label: 'Domain decision', states: ['AWAITING_DOMAIN_DECISION'] },
];

export function StatusSpine({ state, everClarified }: { state: RequestState; everClarified: boolean }) {
  const terminal = isTerminal(state);
  const currentIndex = terminal ? SPINE.length : SPINE.findIndex((s) => s.states.includes(state));

  return (
    <ol className="flex flex-wrap items-center gap-x-1 gap-y-1 text-xs" aria-label="Request progress">
      {SPINE.map((step, i) => {
        const done = i < currentIndex;
        const current = i === currentIndex;
        const skipped = step.key === 'clarifying' && done && !everClarified;
        return (
          <li key={step.key} className="flex items-center gap-1">
            {i > 0 && <span className="mx-1 h-px w-4 bg-border" aria-hidden />}
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${
                current
                  ? 'bg-primary/15 font-medium text-primary'
                  : done
                    ? 'text-muted-foreground'
                    : 'text-tertiary-foreground'
              }`}
            >
              {done && !skipped && <Check className="size-3" aria-hidden />}
              {skipped ? <s>{step.label}</s> : step.label}
            </span>
          </li>
        );
      })}
      <li className="flex items-center gap-1">
        <span className="mx-1 h-px w-4 bg-border" aria-hidden />
        {terminal ? (
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium ${OUTCOME_TONE[STATE_META[state].variant]}`}>
            <Check className="size-3" aria-hidden />
            {STATE_META[state].label}
          </span>
        ) : (
          <span className="rounded-full px-2 py-0.5 text-tertiary-foreground">Outcome</span>
        )}
      </li>
    </ol>
  );
}

const OUTCOME_TONE: Record<string, string> = {
  success: 'bg-success-subtle text-success',
  warning: 'bg-warning-subtle text-warning',
  danger: 'bg-danger-subtle text-danger',
  info: 'bg-primary/15 text-primary',
  neutral: 'bg-muted text-muted-foreground',
};
