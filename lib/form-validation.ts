/**
 * The vocabulary of form validation, HIVE-155.
 *
 * The rule this file exists to serve: **every field is required unless it says
 * otherwise.** Nothing carries a "required" marker — no asterisk, no word —
 * because a marker on the majority case teaches nothing. Only the exceptions
 * are labelled, as `Optional`.
 *
 * The consequence is that a user cannot see what is missing by reading the
 * form, so the form has to tell them when they act: the primary stays enabled,
 * and pressing it names every gap at once, beside the field that has it.
 *
 * Pure and framework-free on purpose (`lib/` never imports React). The React
 * side of the same rule is `components/FormField.tsx`.
 */

/** Field name → the message shown under that field. Empty object = valid. */
export type FieldErrors = Record<string, string>;

/**
 * The default message. Phrase it with the noun the user would use, which is not
 * always the label: a field labelled "What" is still "Title is required" if
 * that is what the thing is called elsewhere in the product.
 */
export function requiredMessage(noun: string): string {
  return `${noun} is required`;
}

/** True when there is nothing to show. */
export function isValid(errors: FieldErrors): boolean {
  return Object.keys(errors).length === 0;
}

/**
 * The field whose message should be brought into view — the first in the order
 * the caller listed them, which is the order they appear on screen. `Object`
 * key order is insertion order for string keys, so building the errors object
 * top-down is enough; no explicit ordering prop.
 */
export function firstErrorField(errors: FieldErrors): string | undefined {
  return Object.keys(errors)[0];
}
