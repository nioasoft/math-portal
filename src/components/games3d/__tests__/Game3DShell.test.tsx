import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { Game3DShell } from '../Game3DShell';
import type { CompleteSummary, Game3D, GameMode3D } from '@/lib/games3d/types';

// Mock next-intl navigation (requires next/navigation which is unavailable in jsdom)
vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, className, 'aria-label': ariaLabel }: { href: string; children: React.ReactNode; className?: string; 'aria-label'?: string }) => (
    <a href={href} className={className} aria-label={ariaLabel}>{children}</a>
  ),
  redirect: vi.fn(),
  usePathname: vi.fn(() => '/'),
  useRouter: vi.fn(() => ({ push: vi.fn(), replace: vi.fn() })),
  getPathname: vi.fn(),
}));

// jsdom has no WebGL, so the real canvas can never mount here. The stub records its
// props so a test can drive `onComplete` and read back the mode it was mounted with.
vi.mock('../Canvas3D', () => ({
  Canvas3D: (props: { mode: string; onComplete: (s: CompleteSummary) => void }) => {
    (globalThis as Record<string, unknown>).__canvasProps = props;
    return <div data-testid="canvas3d" data-mode={props.mode} />;
  },
}));

function canvasProps(): { mode: string; onComplete: (s: CompleteSummary) => void } {
  return (globalThis as Record<string, unknown>).__canvasProps as never;
}

const messages = {
  games3d: { loading: 'Loading game…', loadProgress: '{percent}%', mute: 'Mute', unmute: 'Unmute', gameLoadError: 'Error', retry: 'Retry', playAgain: 'Play again', newBest: 'New Best!', bestStreak: 'Best Streak', bestScore: 'Best score', stars: '{count} Stars', webglNotSupported: 'Not supported', frameRateLowNotice: 'Q', canary: { title: 'Tap the Cube', description: 'Dev' } },
  games: { shell: { backToGames: 'Back', home: 'Home' }, score: { score: 'Score', streak: 'Streak', correctWrong: 'C/W' }, hud: { help: 'Help', hideHelp: 'Hide' } },
};

function wrap(ui: React.ReactNode) {
  return <NextIntlClientProvider locale="en" messages={messages}>{ui}</NextIntlClientProvider>;
}

const game: Game3D = {
  meta: { id: 'x', i18nKey: 'canary', topic: 'misc', difficulty: 1, gradeRange: [1, 6], estimatedSeconds: 10, supportedModes: ['practice'] },
  init: () => ({ dispose: vi.fn() }),
};

describe('Game3DShell', () => {
  beforeEach(() => {
    localStorage.clear();
    delete (globalThis as Record<string, unknown>).__canvasProps;
  });

  it('renders WebGL fallback when WebGL unavailable', async () => {
    render(wrap(<Game3DShell gameId={game.meta.id} meta={game.meta} title="Test" webGLAvailable={false} />));
    expect(await screen.findByText(/Not supported/i)).toBeInTheDocument();
  });

  it('renders mute button when WebGL available', async () => {
    render(wrap(<Game3DShell gameId={game.meta.id} meta={game.meta} title="Test" webGLAvailable={true} />));
    await waitFor(() => expect(screen.getByLabelText(/Mute|Unmute/)).toBeInTheDocument());
  });

  it('probes WebGL itself when no override is given', async () => {
    render(wrap(<Game3DShell gameId={game.meta.id} meta={game.meta} title="Test" />));
    expect(await screen.findByText(/Not supported/i)).toBeInTheDocument();
  });

  it('keeps the chosen mode on "Play again" and shows the stored best', async () => {
    const twoModes: GameMode3D[] = ['practice', 'quiz'];
    render(
      wrap(
        <Game3DShell
          gameId={game.meta.id}
          meta={{ ...game.meta, supportedModes: twoModes }}
          title="Test"
          webGLAvailable
          initialMode="quiz"
          gameLoader={async () => ({ default: game })}
        />
      )
    );
    await screen.findByTestId('canvas3d');
    expect(screen.getByTestId('canvas3d')).toHaveAttribute('data-mode', 'quiz');

    act(() => {
      canvasProps().onComplete({ totalPoints: 12, accuracy: 0.95, durationSec: 30, streak: 4 });
    });
    fireEvent.click(await screen.findByRole('button', { name: /Play again/i }));

    // The child would be thrown back to the mode picker if playAgain reset the mode.
    await waitFor(() => expect(screen.getByTestId('canvas3d')).toHaveAttribute('data-mode', 'quiz'));

    act(() => {
      canvasProps().onComplete({ totalPoints: 5, accuracy: 0.4, durationSec: 20 });
    });
    expect(await screen.findByText(/Best score/i)).toBeInTheDocument();
  });
});
