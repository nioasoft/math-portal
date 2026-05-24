import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { OverlayHUD } from '../OverlayHUD';

const messages = {
  games3d: { loading: 'L', loadProgress: '{percent}%', mute: 'M', unmute: 'U', gameLoadError: 'E', retry: 'R', webglNotSupported: 'W', frameRateLowNotice: 'Q', canary: { title: 'T', description: 'D' } },
  games: { score: { score: 'Score', streak: 'Streak', correctWrong: 'C/W' } },
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
});
