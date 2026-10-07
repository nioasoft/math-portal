import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { useState, type ReactElement } from 'react';
import Timer from '../Timer';

const messages = {
  games: {
    timer: {
      timeLeft: 'Time left',
      seconds: 'seconds',
    },
  },
};

function withIntl(ui: ReactElement) {
  return (
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>
  );
}

/**
 * Mirrors the real clients: every tick re-renders the parent with a new
 * `timeRemaining`, which is what used to tear the interval down.
 */
function Harness({ onTick }: { onTick: () => void }) {
  const [remaining, setRemaining] = useState(60);
  return (
    <Timer
      timeRemaining={remaining}
      isActive
      onTick={() => {
        setRemaining((r) => r - 1);
        onTick();
      }}
    />
  );
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

describe('Timer', () => {
  it('ticks once per second', () => {
    const onTick = vi.fn();
    render(withIntl(<Harness onTick={onTick} />));
    advance(5000);
    expect(onTick).toHaveBeenCalledTimes(5);
    expect(screen.getByText('0:55')).toBeInTheDocument();
  });

  it('creates its interval once and keeps it across countdown re-renders', () => {
    // A rebuilt interval necessarily means another setInterval call, so this
    // count is what pins the regression — the tick counts above look identical
    // either way under fake timers.
    const setIntervalSpy = vi.spyOn(globalThis, 'setInterval');
    render(withIntl(<Harness onTick={vi.fn()} />));

    advance(5000);
    expect(screen.getByText('0:55')).toBeInTheDocument();
    expect(setIntervalSpy).toHaveBeenCalledTimes(1);
  });

  it('does not tick while inactive, and restarts when it becomes active', () => {
    const onTick = vi.fn();
    const setIntervalSpy = vi.spyOn(globalThis, 'setInterval');
    const { rerender } = render(
      withIntl(<Timer timeRemaining={60} onTick={onTick} isActive={false} />)
    );

    advance(3000);
    expect(onTick).not.toHaveBeenCalled();
    expect(setIntervalSpy).not.toHaveBeenCalled();

    rerender(withIntl(<Timer timeRemaining={60} onTick={onTick} isActive />));
    advance(2000);
    expect(onTick).toHaveBeenCalledTimes(2);
  });

  it('calls the latest onTick without rebuilding the interval', () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = render(
      withIntl(<Timer timeRemaining={60} onTick={first} isActive />)
    );
    advance(1000);
    expect(first).toHaveBeenCalledTimes(1);

    rerender(withIntl(<Timer timeRemaining={59} onTick={second} isActive />));
    advance(1000);
    expect(second).toHaveBeenCalledTimes(1);
    expect(first).toHaveBeenCalledTimes(1);
  });

  it('marks the last ten seconds as low time', () => {
    render(withIntl(<Timer timeRemaining={9} onTick={vi.fn()} isActive />));
    expect(screen.getByText('0:09').parentElement?.className).toContain('text-red-400');
  });

  it('exposes the countdown as a labelled timer for screen readers', () => {
    render(withIntl(<Timer timeRemaining={65} onTick={vi.fn()} isActive />));
    const timer = screen.getByRole('timer');
    expect(timer).toHaveTextContent('Time left: 1:05');
  });
});
