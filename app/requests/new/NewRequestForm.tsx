'use client';

import { ValidatedForm, Field } from '@/components/FormField';
import { requiredMessage, type FieldErrors } from '@/lib/form-validation';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { SubmitButton } from '@/components/ui/submit-button';
import { submitRequest } from '@/lib/actions';
import { DatePicker } from '@/components/DatePicker';
import { EvidenceLinksInput } from '@/components/EvidenceLinksInput';
import { DOC_LINK_HELP } from '@/lib/doc-links';
import { useState } from 'react';
import { format } from 'date-fns';

// Q3 of the design: the whole mandatory surface is one free-text need.
// Everything else is optional here and becomes Scout's clarification territory — the D1 minimum-info set is an extraction target,
// not form friction.

function validate(data?: FormData): FieldErrors {
  const errors: FieldErrors = {};
  if (!String(data?.get('need') ?? '').trim()) errors.need = requiredMessage('Description');
  return errors;
}

export function NewRequestForm() {
  const [neededBy, setNeededBy] = useState<string | null>(null);
  const today = format(new Date(), 'yyyy-MM-dd');

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

      <Field
        name="evidenceLinks"
        label="Evidence links"
        htmlFor="evidenceLinks"
        optional
        hint={DOC_LINK_HELP}
      >
        <EvidenceLinksInput id="evidenceLinks" name="evidenceLinks" />
      </Field>

      <Field
        name="neededBy"
        label="When do you need it?"
        htmlFor="neededBy"
        optional
        hint="If a date is fixed, say what drives it — customer, regulator, scheme, contract. An aspirational date is fine too; Scout treats the two differently."
      >
        <div className="flex flex-wrap items-center gap-2">
          <DatePicker
            id="neededBy"
            value={neededBy}
            onChange={setNeededBy}
            min={today}
            aria-label="Needed by"
          />
          <input type="hidden" name="neededBy" value={neededBy ?? ''} />
          <Input
            id="dateDriver"
            name="dateDriver"
            aria-label="What drives the date"
            placeholder="What drives the date? e.g. regulatory deadline"
            className="min-w-0 flex-1"
          />
        </div>
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
