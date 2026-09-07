'use client';

import * as React from 'react';
import { useFormStatus } from 'react-dom';
import { Spinner } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';

type Props = React.ComponentProps<typeof Button> & {
  // Label shown in place of children while the form's action is in flight.
  // Optional — omit to keep the same label but with a leading spinner.
  pendingLabel?: React.ReactNode;
};

// Submit button that disables and spins itself while the parent `<form>`'s
// server action is running. Reads `pending` from useFormStatus, so it only
// works as a descendant of a `<form action={...}>`. Guards against spam clicks
// firing the action N times before the server responds.
export function SubmitButton({ children, pendingLabel, disabled, ...rest }: Props) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      aria-busy={pending || undefined}
      disabled={pending || disabled}
      {...rest}
    >
      {pending && <Spinner className="animate-spin" />}
      {pending && pendingLabel ? pendingLabel : children}
    </Button>
  );
}
