'use client';

import { ValidatedForm, Field } from '@/components/FormField';
import { requiredMessage, type FieldErrors } from '@/lib/form-validation';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { SubmitButton } from '@/components/ui/submit-button';
import { submitRequest } from '@/lib/actions';

// Q3 of the design: the whole mandatory surface is one free-text need plus the
// production-issue toggle. Everything else is optional here and becomes Scout's
// clarification territory — the D1 minimum-info set is an extraction target,
// not form friction.

function validate(data?: FormData): FieldErrors {
  const errors: FieldErrors = {};
  if (!String(data?.get('need') ?? '').trim()) errors.need = requiredMessage('Description');
  return errors;
}

export function NewRequestForm() {
  return (
    <ValidatedForm action={submitRequest} validate={validate} className="space-y-5">
      <Field
        name="need"
        label="What do you need?"
        htmlFor="need"
        hint="Plain language is perfect — say the problem and the outcome you want. Scout asks if anything is unclear."
      >
        <Textarea
          id="need"
          name="need"
          rows={6}
          placeholder="e.g. Merchants on the new pricing plan can't see FX margins in reporting, and Finance needs this before the Q4 close…"
        />
      </Field>

      <div className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3">
        <Switch id="activeDisruption" name="activeDisruption" aria-label="Something is broken in production right now" />
        <Label htmlFor="activeDisruption" className="text-sm font-normal">
          Something is broken in production right now
        </Label>
      </div>

      <Field
        name="evidenceLinks"
        label="Evidence links"
        htmlFor="evidenceLinks"
        optional
        hint="Docs, tickets, recordings — anything Scout should read before asking you questions."
      >
        <Input id="evidenceLinks" name="evidenceLinks" placeholder="https://…" />
      </Field>

      <Field
        name="timing"
        label="When do you need it?"
        htmlFor="timing"
        optional
        hint="If a date is fixed, say what drives it — customer, regulator, scheme, contract."
      >
        <Input id="timing" name="timing" placeholder="e.g. before Q4 close — regulatory deadline" />
      </Field>

      {/* Footer per design.md §7: explanation left, actions right, primary rightmost. */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
        <p className="text-xs text-muted-foreground">
          Submitting creates your request record — Scout&rsquo;s questions arrive on it.
        </p>
        <div className="ml-auto">
          <SubmitButton pendingLabel="Submitting…">Submit to Scout</SubmitButton>
        </div>
      </div>
    </ValidatedForm>
  );
}
