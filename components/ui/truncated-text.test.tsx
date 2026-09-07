// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TruncatedText } from './truncated-text';
import { FREE_TEXT_CASES } from '@/lib/test-fixtures/free-text';

// jsdom returns 0 for scrollHeight/clientHeight. Overflow detection relies on
// scrollHeight > clientHeight, so we drive those per-test via an instance
// property that the getters below read from.
type MeasurableElement = HTMLElement & {
  __scrollHeight?: number;
  __clientHeight?: number;
};

const originalScrollHeight = Object.getOwnPropertyDescriptor(
  HTMLElement.prototype,
  'scrollHeight',
);
const originalClientHeight = Object.getOwnPropertyDescriptor(
  HTMLElement.prototype,
  'clientHeight',
);

beforeEach(() => {
  Object.defineProperty(HTMLElement.prototype, 'scrollHeight', {
    configurable: true,
    get(this: MeasurableElement) {
      return this.__scrollHeight ?? 0;
    },
  });
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
    configurable: true,
    get(this: MeasurableElement) {
      return this.__clientHeight ?? 0;
    },
  });
});

afterEach(() => {
  if (originalScrollHeight) {
    Object.defineProperty(HTMLElement.prototype, 'scrollHeight', originalScrollHeight);
  }
  if (originalClientHeight) {
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', originalClientHeight);
  }
});

function measure(el: HTMLElement | null, scrollHeight: number, clientHeight: number) {
  if (!el) throw new Error('element not found');
  (el as MeasurableElement).__scrollHeight = scrollHeight;
  (el as MeasurableElement).__clientHeight = clientHeight;
}

describe('TruncatedText', () => {
  it('renders the full text in the DOM', () => {
    render(<TruncatedText text="hello world" />);
    expect(screen.getByText('hello world')).toBeInTheDocument();
  });

  it('sets data-slot on the root', () => {
    render(<TruncatedText text="hi" data-testid="root" />);
    expect(screen.getByTestId('root')).toHaveAttribute('data-slot', 'truncated-text');
  });

  it('does not render a toggle when content fits', async () => {
    const { rerender } = render(<TruncatedText text="short" data-testid="root" />);
    const body = screen.getByText('short');
    await act(async () => {
      measure(body, 20, 60);
      rerender(<TruncatedText text="short" data-testid="root" />);
    });
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders a "Show more" toggle when content overflows', async () => {
    const long = 'line one\nline two\nline three\nline four\nline five';
    const { rerender, container } = render(<TruncatedText text={long} lines={2} />);
    const body = container.querySelector('[data-slot="truncated-text-body"]') as HTMLElement;
    await act(async () => {
      measure(body, 200, 40);
      rerender(<TruncatedText text={long} lines={2} />);
    });
    expect(screen.getByRole('button', { name: 'Show more' })).toBeInTheDocument();
  });

  it('expands to "Show less" on click and toggles back', async () => {
    const long = 'a very long piece of text that will overflow the clamp';
    const { rerender } = render(<TruncatedText text={long} lines={1} />);
    const body = screen.getByText(long);
    await act(async () => {
      measure(body, 200, 40);
      rerender(<TruncatedText text={long} lines={1} />);
    });

    const toggle = screen.getByRole('button', { name: 'Show more' });
    expect(body).toHaveAttribute('data-clamped', 'true');
    await userEvent.click(toggle);
    expect(screen.getByRole('button', { name: 'Show less' })).toBeInTheDocument();
    expect(body).toHaveAttribute('data-clamped', 'false');
    await userEvent.click(screen.getByRole('button', { name: 'Show less' }));
    expect(screen.getByRole('button', { name: 'Show more' })).toBeInTheDocument();
    expect(body).toHaveAttribute('data-clamped', 'true');
  });

  it('respects custom labels', async () => {
    const { rerender } = render(
      <TruncatedText text="x" lines={1} moreLabel="Read more" lessLabel="Read less" />,
    );
    const body = screen.getByText('x');
    await act(async () => {
      measure(body, 100, 20);
      rerender(
        <TruncatedText text="x" lines={1} moreLabel="Read more" lessLabel="Read less" />,
      );
    });
    expect(screen.getByRole('button', { name: 'Read more' })).toBeInTheDocument();
  });

  // HIVE-203: sweep over the shared free-text fixture so this primitive is
  // pinned against every input every other surface has to handle.
  it.each(FREE_TEXT_CASES)('renders free-text case: $label', ({ value }) => {
    expect(() => render(<TruncatedText text={value} />)).not.toThrow();
  });

  it('merges custom className on the root', () => {
    render(<TruncatedText text="hi" className="extra" data-testid="root" />);
    expect(screen.getByTestId('root').className).toContain('extra');
  });
});
