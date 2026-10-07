import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import Feedback from '../Feedback';

const messages = {
  games: {
    feedback: {
      correct: 'Great!',
      incorrect: 'Not quite',
      theAnswer: 'The answer is',
    },
  },
};

function renderFeedback(props: {
  correct: boolean | null;
  correctAnswer?: number;
  onComplete?: () => void;
}) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <Feedback {...props} />
    </NextIntlClientProvider>
  );
}

/** Advance past the pending requestAnimationFrame that reveals the overlay. */
function flushFrame(): void {
  act(() => {
    vi.advanceTimersByTime(20);
  });
}

function advance(ms: number): void {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('Feedback', () => {
  it('renders nothing until there is an answer to report', () => {
    renderFeedback({ correct: null });
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('shows the success mark and clears it after the short reveal', () => {
    const onComplete = vi.fn();
    const { rerender } = renderFeedback({ correct: null, onComplete });
    flushFrame();

    // null → true is the transition that opens the overlay.
    rerender(
      <NextIntlClientProvider locale="en" messages={messages}>
        <Feedback correct onComplete={onComplete} />
      </NextIntlClientProvider>
    );
    flushFrame();
    expect(screen.getByRole('status')).toHaveTextContent('Great!');
    expect(onComplete).not.toHaveBeenCalled();

    advance(1200);
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('keeps a wrong answer up long enough to read the correct value', () => {
    const onComplete = vi.fn();
    const { rerender } = renderFeedback({ correct: null, onComplete });
    flushFrame();

    rerender(
      <NextIntlClientProvider locale="en" messages={messages}>
        <Feedback correct={false} correctAnswer={60} onComplete={onComplete} />
      </NextIntlClientProvider>
    );
    flushFrame();

    expect(screen.getByRole('status')).toHaveTextContent('The answer is 60');

    advance(1200);
    expect(onComplete).not.toHaveBeenCalled();
    expect(screen.getByRole('status')).toBeInTheDocument();

    advance(2800 - 1200);
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('does not fire onComplete after unmount', () => {
    const onComplete = vi.fn();
    const { rerender } = renderFeedback({ correct: null, onComplete });
    flushFrame();

    rerender(
      <NextIntlClientProvider locale="en" messages={messages}>
        <Feedback correct={false} correctAnswer={60} onComplete={onComplete} />
      </NextIntlClientProvider>
    );
    flushFrame();

    rerender(<div />);
    advance(5000);
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('cancels a pending reveal when the answer is retracted', () => {
    const onComplete = vi.fn();
    const { rerender } = renderFeedback({ correct: null, onComplete });
    flushFrame();

    rerender(
      <NextIntlClientProvider locale="en" messages={messages}>
        <Feedback correct={false} correctAnswer={60} onComplete={onComplete} />
      </NextIntlClientProvider>
    );
    // Retract before the reveal frame runs: nothing should appear or complete.
    rerender(
      <NextIntlClientProvider locale="en" messages={messages}>
        <Feedback correct={null} onComplete={onComplete} />
      </NextIntlClientProvider>
    );
    advance(5000);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(onComplete).not.toHaveBeenCalled();
  });
});
