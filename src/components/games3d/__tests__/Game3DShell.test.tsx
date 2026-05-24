import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { Game3DShell } from '../Game3DShell';
import type { Game3D } from '@/lib/games3d/types';

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

const messages = {
  games3d: { loading: 'Loading game…', loadProgress: '{percent}%', mute: 'Mute', unmute: 'Unmute', gameLoadError: 'Error', retry: 'Retry', webglNotSupported: 'Not supported', frameRateLowNotice: 'Q', canary: { title: 'Tap the Cube', description: 'Dev' } },
  games: { shell: { backToGames: 'Back', home: 'Home' }, score: { score: 'Score', streak: 'Streak', correctWrong: 'C/W' } },
};

function wrap(ui: React.ReactNode) {
  return <NextIntlClientProvider locale="en" messages={messages}>{ui}</NextIntlClientProvider>;
}

const game: Game3D = {
  meta: { id: 'x', i18nKey: 'canary', topic: 'misc', difficulty: 1, gradeRange: [1, 6], estimatedSeconds: 10, supportedModes: ['practice'] },
  init: () => ({ dispose: vi.fn() }),
};

describe('Game3DShell', () => {
  it('renders WebGL fallback when WebGL unavailable', () => {
    render(wrap(<Game3DShell game={game} title="Test" webGLAvailable={false} />));
    expect(screen.getByText(/Not supported/i)).toBeInTheDocument();
  });

  it('renders mute button when WebGL available', () => {
    render(wrap(<Game3DShell game={game} title="Test" webGLAvailable={true} />));
    expect(screen.getByLabelText(/Mute|Unmute/)).toBeInTheDocument();
  });
});
