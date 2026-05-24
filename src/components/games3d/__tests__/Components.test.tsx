import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { WebGLFallback } from '../WebGLFallback';
import { LoadingScene } from '../LoadingScene';
import { GameLoadError } from '../GameLoadError';
import { MuteButton } from '../MuteButton';

const messages = {
  games3d: {
    loading: 'Loading game…',
    loadProgress: '{percent}%',
    mute: 'Mute sound',
    unmute: 'Unmute sound',
    gameLoadError: 'The game failed to load.',
    retry: 'Try again',
    webglNotSupported: 'Your browser does not support 3D graphics.',
    frameRateLowNotice: 'Reducing quality',
    canary: { title: 'Tap the Cube', description: 'Dev test' },
  },
};

function wrap(ui: React.ReactNode) {
  return (
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>
  );
}

describe('WebGLFallback', () => {
  it('renders the not-supported message', () => {
    render(wrap(<WebGLFallback />));
    expect(screen.getByText(/3D graphics/i)).toBeInTheDocument();
  });
});

describe('LoadingScene', () => {
  it('renders loading label', () => {
    render(wrap(<LoadingScene progress={0} />));
    expect(screen.getByText(/Loading game/i)).toBeInTheDocument();
  });

  it('shows progress percentage', () => {
    render(wrap(<LoadingScene progress={0.42} />));
    expect(screen.getByText('42%')).toBeInTheDocument();
  });
});

describe('GameLoadError', () => {
  it('calls onRetry when retry clicked', () => {
    const onRetry = vi.fn();
    render(wrap(<GameLoadError onRetry={onRetry} />));
    fireEvent.click(screen.getByRole('button', { name: /Try again/i }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});

describe('MuteButton', () => {
  it('shows mute label when not muted', () => {
    render(wrap(<MuteButton muted={false} onToggle={() => {}} />));
    expect(screen.getByLabelText('Mute sound')).toBeInTheDocument();
  });
  it('shows unmute label when muted', () => {
    render(wrap(<MuteButton muted={true} onToggle={() => {}} />));
    expect(screen.getByLabelText('Unmute sound')).toBeInTheDocument();
  });
  it('calls onToggle when clicked', () => {
    const onToggle = vi.fn();
    render(wrap(<MuteButton muted={false} onToggle={onToggle} />));
    fireEvent.click(screen.getByLabelText('Mute sound'));
    expect(onToggle).toHaveBeenCalledOnce();
  });
});
