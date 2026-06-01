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

describe('Canvas3D', () => {
  it('starts engine on mount', async () => {
    const start = vi.fn(async () => {});
    const dispose = vi.fn();
    const factory = vi.fn(() => ({
      start, dispose, pause: vi.fn(), resume: vi.fn(),
      getScoreController: () => ({ add: vi.fn(), set: vi.fn(), reset: vi.fn(), get: () => 0 }),
      subscribeScore: vi.fn(() => () => {}),
      subscribeFeedback: vi.fn(() => () => {}),
      _debug: () => ({} as any),
    }));
    render(<Canvas3D game={game} locale="en" isRTL={false} mode="practice" engineFactory={factory} />);
    await waitFor(() => expect(start).toHaveBeenCalledWith(game));
  });

  it('disposes engine on unmount', async () => {
    const dispose = vi.fn();
    const factory = vi.fn(() => ({
      start: vi.fn(async () => {}), dispose,
      pause: vi.fn(), resume: vi.fn(),
      getScoreController: () => ({ add: vi.fn(), set: vi.fn(), reset: vi.fn(), get: () => 0 }),
      subscribeScore: vi.fn(() => () => {}),
      subscribeFeedback: vi.fn(() => () => {}),
      _debug: () => ({} as any),
    }));
    const { unmount } = render(<Canvas3D game={game} locale="en" isRTL={false} mode="practice" engineFactory={factory} />);
    await waitFor(() => expect(factory).toHaveBeenCalled());
    unmount();
    expect(dispose).toHaveBeenCalledOnce();
  });
});
