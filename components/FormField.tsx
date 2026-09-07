'use client';

import * as React from 'react';

import { Label } from '@/components/ui/label';
import {
  type FieldErrors,
  firstErrorField,
  isValid,
} from '@/lib/form-validation';

/**
 * The one implementation of "required by default", HIVE-155.
 *
 * Three pieces, and every form in the app should reach for these rather than
 * hand-rolling a label:
 *
 *   ValidatedForm / ValidationProvider — holds the errors for one form
 *   Field                             — a label + its control + its message
 *   OptionalTag                       — the ONLY marker we render
 *
 * Why a context rather than props: the check happens at the footer and the
 * message renders at the field, and in the sheets those two are hundreds of
 * lines apart with a wizard step between them. Threading an `errors` prop down
 * every level is how the five different optional styles happened.
 *
 * The rule in full lives in `lib/form-validation.ts` and design.md §7.
 */

/**
 * What `validate` is handed. A native `<form>` gives us its FormData, so an
 * uncontrolled field does not have to become controlled just to be validated —
 * which matters, because the alternative is lifting every input's value into
 * React state and losing the server-action form's simplicity. A wizard holding
 * its answers in state gets `undefined` and reads its own state instead.
 */
export type Validator = (data?: FormData) => FieldErrors;

interface ValidationApi {
  errors: FieldErrors;
  /**
   * Run the form's rules, publish the messages, bring the first one into view.
   * Returns true when the caller may proceed — so the call site reads
   * `if (!check()) return;` before the mutation.
   */
  check: (data?: FormData) => boolean;
  /** Drop one message. Called as the user fixes the field. */
  clear: (name: string) => void;
}

const ValidationContext = React.createContext<ValidationApi | null>(null);

/**
 * A Field outside a provider is a bug we'd rather not crash on — a field with
 * no validation still has a label to draw. So the fallback is "no errors, no
 * check", and the field renders exactly as it does when everything is filled.
 */
const NO_VALIDATION: ValidationApi = {
  errors: {},
  check: () => true,
  clear: () => {},
};

export function useValidation(): ValidationApi {
  return React.useContext(ValidationContext) ?? NO_VALIDATION;
}

export function ValidationProvider({
  validate,
  children,
}: {
  /** Recomputed on every check, never memoised — it reads live form state. */
  validate: Validator;
  /**
   * A function child gets the api directly. This exists for the dialogs and
   * sheets, where the button that calls `check` sits in the SAME component as
   * the state `validate` reads — so `useValidation` would need the provider to
   * be a parent it cannot be, and the alternative is splitting the component in
   * two and threading eight props through the seam.
   */
  children: React.ReactNode | ((api: ValidationApi) => React.ReactNode);
}) {
  const [errors, setErrors] = React.useState<FieldErrors>({});

  // `validate` is a fresh closure every render — it has to be, because it reads
  // live form state. So `check` is rebuilt with it rather than pinned by a ref:
  // it is only ever called from an event handler, never a dependency array, so
  // a stable identity buys nothing and a stale closure would cost a wrong answer.
  const check = React.useCallback((data?: FormData) => {
    const next = validate(data);
    setErrors(next);
    if (isValid(next)) return true;
    // The footer can be a screen below the first gap (the approve wizard is
    // three steps tall), so a silent set of messages reads as a dead button —
    // the exact failure mode enabling the button was meant to avoid.
    const first = firstErrorField(next);
    if (first) {
      requestAnimationFrame(() => {
        document
          .querySelector<HTMLElement>(`[data-field="${CSS.escape(first)}"]`)
          ?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      });
    }
    return false;
  }, [validate]);

  const clear = React.useCallback((name: string) => {
    setErrors((prev) => {
      if (!(name in prev)) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }, []);

  const api = React.useMemo(() => ({ errors, check, clear }), [errors, check, clear]);

  return (
    <ValidationContext.Provider value={api}>
      {typeof children === 'function' ? children(api) : children}
    </ValidationContext.Provider>
  );
}

/**
 * A `<form action={serverAction}>` that runs its rules before the action fires.
 * Client-side validation is an affordance, never the gate — the server action
 * enforces the same rules on its own (AGENTS.md: an action is a public HTTP
 * endpoint), so a bypass here loses the message, not the invariant.
 */
export function ValidatedForm({
  validate,
  children,
  ...rest
}: React.ComponentProps<'form'> & { validate: Validator }) {
  return (
    <ValidationProvider validate={validate}>
      <ValidatedFormInner {...rest}>{children}</ValidatedFormInner>
    </ValidationProvider>
  );
}

function ValidatedFormInner({ onSubmit, children, ...rest }: React.ComponentProps<'form'>) {
  const { check } = useValidation();
  return (
    <form
      {...rest}
      onSubmit={(e) => {
        if (!check(new FormData(e.currentTarget))) e.preventDefault();
        onSubmit?.(e);
      }}
      // Our messages, not the browser's. Native bubbles appear one at a time,
      // in the browser's own voice and styling, and they fire before ours.
      noValidate
    >
      {children}
    </form>
  );
}

/**
 * The only marker in the system. An exception, stated quietly — it must not
 * outrank the label it qualifies, so it is a muted chip rather than tinted
 * text or a parenthetical inside the label string.
 */
export function OptionalTag({ className = '' }: { className?: string }) {
  return (
    <span
      className={`shrink-0 rounded bg-muted px-1.5 py-0.5 text-3xs font-normal text-muted-foreground ${className}`}
    >
      Optional
    </span>
  );
}

/** Just the message, for a group that has no single label to sit under. */
export function FieldError({ name, className = '' }: { name: string; className?: string }) {
  const { errors } = useValidation();
  const error = errors[name];
  if (!error) return null;
  return (
    <p
      id={`${name}-error`}
      role="alert"
      data-field={name}
      className={`text-xs text-danger ${className}`}
    >
      {error}
    </p>
  );
}

const LABEL_BASE = 'text-xs font-medium';

/**
 * One field: its label, its control, its hint, its message.
 *
 * `stacked` (default) is label-above-control, `row` is the 140px label track the
 * card surfaces use (design.md §3.11). Both are here so a form cannot get the
 * error treatment only in one of them.
 */
export function Field({
  name,
  label,
  htmlFor,
  optional = false,
  hint,
  layout = 'stacked',
  children,
}: {
  /** Key into the form's FieldErrors — usually the input's `name`. */
  name: string;
  label: React.ReactNode;
  htmlFor?: string;
  /** The exception the rule allows for. Renders the chip; nothing else does. */
  optional?: boolean;
  hint?: React.ReactNode;
  layout?: 'stacked' | 'row';
  children: React.ReactNode;
}) {
  const { errors } = useValidation();
  const error = errors[name];

  const labelBlock = (
    <Label
      htmlFor={htmlFor}
      className={`${LABEL_BASE} ${error ? 'text-danger' : 'text-muted-foreground'}`}
    >
      {label}
      {optional && <OptionalTag />}
    </Label>
  );

  // Guidance before the control, verdict after it. The hint tells you how to
  // answer, so it has to be readable before you do — "Global is exclusive" under
  // the picker is advice that arrives after the mistake. The message is the
  // opposite: it only exists because you already acted.
  const hintBlock = hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null;
  const messageBlock = error ? (
    <p id={`${name}-error`} role="alert" className="text-xs text-danger">
      {error}
    </p>
  ) : null;

  if (layout === 'row') {
    return (
      <div
        data-field={name}
        className="grid grid-cols-1 gap-1.5 px-4 py-3 sm:grid-cols-[140px_1fr] sm:gap-4"
      >
        <div className="pt-1.5">{labelBlock}</div>
        <div className="min-w-0 space-y-1">
          {hintBlock}
          {children}
          {messageBlock}
        </div>
      </div>
    );
  }

  return (
    <div data-field={name} className="space-y-1.5">
      {labelBlock}
      {hintBlock}
      {children}
      {messageBlock}
    </div>
  );
}
