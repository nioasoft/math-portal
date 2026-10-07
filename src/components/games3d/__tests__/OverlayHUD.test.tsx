import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { OverlayHUD } from '../OverlayHUD';

const messages = {
  games3d: { loading: 'L', loadProgress: '{percent}%', mute: 'M', unmute: 'U', gameLoadError: 'E', retry: 'R', webglNotSupported: 'W', frameRateLowNotice: 'Q', canary: { title: 'T', description: 'D' } },
  games: { score: { score: 'Score', streak: 'Streak', correctWrong: 'C/W' }, hud: { help: 'How to play', hideHelp: 'Hide instructions' } },
};

function wrap(ui: React.ReactNode) {
  return <NextIntlClientProvider locale="en" messages={messages}>{ui}</NextIntlClientProvider>;
}

describe('OverlayHUD', () => {
  it('renders score', () => {
    render(wrap(<OverlayHUD score={7} feedback={null} />));
    expect(screen.getByText('7')).toBeInTheDocument();
  });

  it('renders feedback message when provided', () => {
    render(wrap(
      <OverlayHUD score={0} feedback={{ kind: 'correct', message: 'Nice!', at: Date.now() }} />
    ));
    expect(screen.getByText('Nice!')).toBeInTheDocument();
  });

  it('does not render feedback when null', () => {
    const { container } = render(wrap(<OverlayHUD score={0} feedback={null} />));
    expect(container.querySelector('[data-testid="feedback-toast"]')).toBeNull();
  });

  it('renders the persistent prompt banner when prompt is set', () => {
    render(wrap(<OverlayHUD score={0} feedback={null} prompt="3 × 4 = ?" />));
    expect(screen.getByTestId('prompt-banner')).toHaveTextContent('3 × 4 = ?');
  });

  it('does not render the prompt banner when prompt is empty/undefined', () => {
    const { container } = render(wrap(<OverlayHUD score={0} feedback={null} />));
    expect(container.querySelector('[data-testid="prompt-banner"]')).toBeNull();
  });

  it('shows instructions at first, then collapses them to a help button', () => {
    vi.useFakeTimers();
    try {
      render(wrap(<OverlayHUD score={0} feedback={null} prompt="2 + 2" instructions="Tap the tiles" />));
      expect(screen.getByTestId('prompt-instructions')).toHaveTextContent('Tap the tiles');

      act(() => { vi.advanceTimersByTime(6000); });

      expect(screen.queryByTestId('prompt-instructions')).toBeNull();
      expect(screen.getByTestId('help-toggle')).toBeInTheDocument();

      act(() => { screen.getByTestId('help-toggle').click(); });

      expect(screen.getByTestId('prompt-instructions')).toHaveTextContent('Tap the tiles');
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps the prompt banner visible after instructions collapse', () => {
    vi.useFakeTimers();
    try {
      render(wrap(<OverlayHUD score={0} feedback={null} prompt="2 + 2" instructions="Tap the tiles" />));
      act(() => { vi.advanceTimersByTime(6000); });
      expect(screen.getByTestId('prompt-banner')).toHaveTextContent('2 + 2');
    } finally {
      vi.useRealTimers();
    }
  });
});
