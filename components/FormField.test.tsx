// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { Field, OptionalTag, ValidatedForm, ValidationProvider } from './FormField';
import { type FieldErrors, requiredMessage } from '@/lib/form-validation';

describe('the required-by-default rule (HIVE-155)', () => {
  it('renders no marker on a required field', () => {
    render(
      <Field name="title" label="Name" htmlFor="title">
        <input id="title" name="title" />
      </Field>,
    );
    // Not "Name *", not "Name (required)" — the label is the label.
    expect(screen.getByText('Name').textContent).toBe('Name');
    expect(screen.queryByText('Optional')).not.toBeInTheDocument();
  });

  it('marks only the exception', () => {
    render(
      <Field name="note" label="Note" optional>
        <input name="note" />
      </Field>,
    );
    expect(screen.getByText('Optional')).toBeInTheDocument();
  });

  it('OptionalTag is the one marker, and it says Optional', () => {
    render(<OptionalTag />);
    expect(screen.getByText('Optional')).toBeInTheDocument();
  });
});

describe('nothing is red until you act', () => {
  const Form = () => (
    <ValidatedForm
      validate={(data): FieldErrors => {
        const v = String(data?.get('title') ?? '').trim();
        return v ? {} : { title: requiredMessage('Name') };
      }}
    >
      <Field name="title" label="Name" htmlFor="title" hint="A short one.">
        <input id="title" name="title" />
      </Field>
      <button type="submit">Create</button>
    </ValidatedForm>
  );

  it('shows no message on a fresh form', () => {
    render(<Form />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('leaves the primary enabled while the form is incomplete', () => {
    render(<Form />);
    expect(screen.getByRole('button', { name: 'Create' })).toBeEnabled();
  });

  it('names the gap under the field once the primary is pressed', async () => {
    render(<Form />);
    await userEvent.click(screen.getByRole('button', { name: 'Create' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Name is required');
  });

  it('turns the label itself danger-coloured, so the gap is findable by scanning', async () => {
    render(<Form />);
    await userEvent.click(screen.getByRole('button', { name: 'Create' }));
    expect(screen.getByText('Name').className).toContain('text-danger');
  });

  it('keeps the hint above the control and puts the message below it', async () => {
    render(<Form />);
    await userEvent.click(screen.getByRole('button', { name: 'Create' }));

    // Guidance survives the error — it is how you fix the thing the error names.
    const hint = screen.getByText('A short one.');
    const input = screen.getByLabelText('Name');
    const message = screen.getByRole('alert');
    expect(hint).toBeInTheDocument();

    // DOCUMENT_POSITION_FOLLOWING === 4
    expect(hint.compareDocumentPosition(input) & 4).toBeTruthy();
    expect(input.compareDocumentPosition(message) & 4).toBeTruthy();
  });

  it('stops showing the message once the field is filled and re-checked', async () => {
    render(<Form />);
    const submit = screen.getByRole('button', { name: 'Create' });
    await userEvent.click(submit);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Name'), 'Launch Platforms');
    await userEvent.click(submit);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('check() as a gate for a non-form surface', () => {
  it('returns false and publishes messages, then true once valid', async () => {
    let empty = true;
    const seen: boolean[] = [];
    render(
      <ValidationProvider
        validate={(): FieldErrors => (empty ? { geography: 'Geography is required' } : {})}
      >
        {({ check }) => (
          <>
            <Field name="geography" label="Geography">
              <div />
            </Field>
            <button type="button" onClick={() => seen.push(check())}>
              Confirm
            </button>
          </>
        )}
      </ValidationProvider>,
    );

    const confirm = screen.getByRole('button', { name: 'Confirm' });
    await userEvent.click(confirm);
    expect(seen).toEqual([false]);
    expect(screen.getByRole('alert')).toHaveTextContent('Geography is required');

    empty = false;
    await userEvent.click(confirm);
    expect(seen).toEqual([false, true]);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('a Field with no provider above it', () => {
  // Renders in read-only contexts too (the Edit sheet has no validator), so it
  // must not throw and must not look invalid.
  it('draws its label and never reports an error', () => {
    render(
      <Field name="orphan" label="Geography">
        <div />
      </Field>,
    );
    expect(screen.getByText('Geography').className).toContain('text-muted-foreground');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
