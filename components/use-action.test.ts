// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

import { useAction } from './use-action';
import { toast } from 'sonner';

const mockToastError = (toast as unknown as { error: ReturnType<typeof vi.fn> }).error;

describe('useAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls onSuccess when action resolves with a non-failure value', async () => {
    const onSuccess = vi.fn();
    const { result } = renderHook(() => useAction());
    await act(async () => {
      result.current.run(async () => undefined, { onSuccess });
    });
    expect(onSuccess).toHaveBeenCalledOnce();
  });

  it('calls onSuccess when action resolves with { ok: true }', async () => {
    const onSuccess = vi.fn();
    const { result } = renderHook(() => useAction());
    await act(async () => {
      result.current.run(async () => ({ ok: true }), { onSuccess });
    });
    expect(onSuccess).toHaveBeenCalledOnce();
  });

  it('calls toast.error with the error message when action returns { ok: false, error }', async () => {
    const { result } = renderHook(() => useAction());
    await act(async () => {
      result.current.run(async () => ({ ok: false, error: 'Domain not found' }));
    });
    expect(mockToastError).toHaveBeenCalledWith('Domain not found');
  });

  it('calls toast.error with FORBIDDEN_MESSAGE when forbidden: true and no specific error', async () => {
    const { result } = renderHook(() => useAction());
    await act(async () => {
      result.current.run(async () => ({ ok: false, forbidden: true }));
    });
    expect(mockToastError).toHaveBeenCalledWith("You don't have permission to do that.");
  });

  it('uses opts.errorMessage when result is { ok: false } with no error or forbidden', async () => {
    const { result } = renderHook(() => useAction());
    await act(async () => {
      result.current.run(async () => ({ ok: false }), { errorMessage: 'Custom error' });
    });
    expect(mockToastError).toHaveBeenCalledWith('Custom error');
  });

  it('uses GENERIC_MESSAGE when result is { ok: false } with no error/forbidden/errorMessage', async () => {
    const { result } = renderHook(() => useAction());
    await act(async () => {
      result.current.run(async () => ({ ok: false }));
    });
    expect(mockToastError).toHaveBeenCalledWith('Something went wrong. Please try again.');
  });

  it('calls toast.error and onError when action throws', async () => {
    const onError = vi.fn();
    const { result } = renderHook(() => useAction());
    await act(async () => {
      result.current.run(async () => { throw new Error('boom'); }, { onError });
    });
    expect(mockToastError).toHaveBeenCalled();
    expect(onError).toHaveBeenCalledOnce();
  });

  it('calls onError when action returns a failure result', async () => {
    const onError = vi.fn();
    const { result } = renderHook(() => useAction());
    await act(async () => {
      result.current.run(async () => ({ ok: false, error: 'fail' }), { onError });
    });
    expect(onError).toHaveBeenCalledOnce();
  });

  it('does not call onSuccess when action returns a failure', async () => {
    const onSuccess = vi.fn();
    const { result } = renderHook(() => useAction());
    await act(async () => {
      result.current.run(async () => ({ ok: false }), { onSuccess });
    });
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('prefers specific error message over FORBIDDEN_MESSAGE when error !== "Forbidden"', async () => {
    const { result } = renderHook(() => useAction());
    await act(async () => {
      result.current.run(async () => ({ ok: false, error: 'Specific reason', forbidden: true }));
    });
    expect(mockToastError).toHaveBeenCalledWith('Specific reason');
  });

  // ─── successMessage ─────────────────────────────────────────────────────────

  it('calls toast.success with successMessage when action resolves successfully', async () => {
    const mockToastSuccess = (toast as unknown as { success: ReturnType<typeof vi.fn> }).success;
    const { result } = renderHook(() => useAction());
    await act(async () => {
      result.current.run(async () => undefined, { successMessage: 'Approval recorded' });
    });
    expect(mockToastSuccess).toHaveBeenCalledWith('Approval recorded');
  });

  it('does not call toast.success when successMessage is not provided', async () => {
    const mockToastSuccess = (toast as unknown as { success: ReturnType<typeof vi.fn> }).success;
    const { result } = renderHook(() => useAction());
    await act(async () => {
      result.current.run(async () => undefined);
    });
    expect(mockToastSuccess).not.toHaveBeenCalled();
  });

  it('does not call toast.success when action returns a failure', async () => {
    const mockToastSuccess = (toast as unknown as { success: ReturnType<typeof vi.fn> }).success;
    const { result } = renderHook(() => useAction());
    await act(async () => {
      result.current.run(async () => ({ ok: false }), { successMessage: 'Should not show' });
    });
    expect(mockToastSuccess).not.toHaveBeenCalled();
  });

  it('still calls onSuccess after toast.success fires', async () => {
    const onSuccess = vi.fn();
    const { result } = renderHook(() => useAction());
    await act(async () => {
      result.current.run(async () => undefined, { successMessage: 'Done', onSuccess });
    });
    expect(onSuccess).toHaveBeenCalledOnce();
  });
});
