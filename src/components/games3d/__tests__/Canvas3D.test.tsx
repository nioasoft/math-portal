import { describe, it, expect, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { Canvas3D } from '../Canvas3D';
import type { Game3D } from '@/lib/games3d/types';

const game: Game3D = {
  meta: {
    id: 'unit', i18nKey: 'unit', topic: 'misc', difficulty: 1,
    gradeRange: [1, 6], estimatedSeconds: 10, supportedModes: ['practice'],
  },
  init: () => ({ dispose: vi.fn() }),
};

function fakeAudio() {
  return {
    play: vi.fn(), playPitched: vi.fn(), playBGM: vi.fn(), stopBGM: vi.fn(),
    getVolume: () => 1, setVolume: vi.fn(), isMuted: () => false, setMuted: vi.fn(),
    preload: vi.fn(async () => {}), dispose: vi.fn(),
  };
}

function fakeEngine(overrides: Record<string, unknown> = {}) {
  return {
    start: vi.fn(async () => {}),
    dispose: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    resize: vi.fn(),
    getAudio: fakeAudio,
    getScoreController: () => ({ add: vi.fn(), set: vi.fn(), reset: vi.fn(), get: () => 0 }),
    subscribeScore: vi.fn(() => () => {}),
    subscribeFeedback: vi.fn(() => () => {}),
    subscribePrompt: vi.fn(() => () => {}),
    subscribeControls: vi.fn(() => () => {}),
    subscribeStatus: vi.fn(() => () => {}),
    _debug: () => ({} as any),
    ...overrides,
  } as any;
}

describe('Canvas3D', () => {
  it('starts engine on mount', async () => {
    const engine = fakeEngine();
    const factory = vi.fn(() => engine);
    render(<Canvas3D game={game} locale="en" isRTL={false} mode="practice" t={(k) => k} engineFactory={factory} />);
    await waitFor(() => expect(engine.start).toHaveBeenCalledWith(game));
  });

  it('re-fits the drawing buffer once start resolves', async () => {
    const engine = fakeEngine();
    const factory = vi.fn(() => engine);
    render(<Canvas3D game={game} locale="en" isRTL={false} mode="practice" t={(k) => k} engineFactory={factory} />);
    await waitFor(() => expect(engine.resize).toHaveBeenCalled());
  });

  it('disposes engine on unmount', async () => {
    const engine = fakeEngine();
    const factory = vi.fn(() => engine);
    const { unmount } = render(<Canvas3D game={game} locale="en" isRTL={false} mode="practice" t={(k) => k} engineFactory={factory} />);
    await waitFor(() => expect(factory).toHaveBeenCalled());
    unmount();
    expect(engine.dispose).toHaveBeenCalledOnce();
  });

  it('mirrors mute and volume changes into the engine audio bus', async () => {
    const audio = fakeAudio();
    const engine = fakeEngine({ getAudio: () => audio });
    const factory = vi.fn(() => engine);
    const { rerender } = render(
      <Canvas3D game={game} locale="en" isRTL={false} mode="practice" t={(k) => k} engineFactory={factory} muted={false} volume={0.5} />
    );
    await waitFor(() => expect(audio.setMuted).toHaveBeenCalledWith(false));

    rerender(
      <Canvas3D game={game} locale="en" isRTL={false} mode="practice" t={(k) => k} engineFactory={factory} muted volume={0.25} />
    );
    await waitFor(() => expect(audio.setMuted).toHaveBeenCalledWith(true));
    expect(audio.setVolume).toHaveBeenCalledWith(0.25);
  });
});
