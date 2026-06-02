import { describe, it, expect, vi } from 'vitest';
import {
  createScoreController,
  createFeedbackController,
  createControlsController,
  createStatusController,
} from '../engine/SceneContext';
import type { ControlButton } from '../types';

describe('ScoreController', () => {
  it('starts at 0', () => {
    const s = createScoreController();
    expect(s.get()).toBe(0);
  });

  it('add() accumulates', () => {
    const s = createScoreController();
    s.add(5);
    s.add(3);
    expect(s.get()).toBe(8);
  });

  it('set() replaces value', () => {
    const s = createScoreController();
    s.set(42);
    expect(s.get()).toBe(42);
  });

  it('reset() returns to 0', () => {
    const s = createScoreController();
    s.add(10);
    s.reset();
    expect(s.get()).toBe(0);
  });

  it('notifies subscribers on change', () => {
    const s = createScoreController();
    const obs = vi.fn();
    s.subscribe(obs);
    s.add(5);
    expect(obs).toHaveBeenCalledWith(5);
  });
});

describe('FeedbackController', () => {
  it('emits correct event', () => {
    const f = createFeedbackController();
    const obs = vi.fn();
    f.subscribe(obs);
    f.correct('Well done!');
    expect(obs).toHaveBeenCalledWith(expect.objectContaining({ kind: 'correct', message: 'Well done!' }));
  });

  it('emits wrong event', () => {
    const f = createFeedbackController();
    const obs = vi.fn();
    f.subscribe(obs);
    f.wrong();
    expect(obs).toHaveBeenCalledWith(expect.objectContaining({ kind: 'wrong' }));
  });

  it('emits hint event', () => {
    const f = createFeedbackController();
    const obs = vi.fn();
    f.subscribe(obs);
    f.hint('Try the blue one');
    expect(obs).toHaveBeenCalledWith(expect.objectContaining({ kind: 'hint', message: 'Try the blue one' }));
  });
});

describe('ControlsController', () => {
  const sample: ControlButton[] = [
    { id: 'inc', label: '+', onPress: () => {} },
    { id: 'check', label: 'Check', onPress: () => {}, variant: 'confirm' },
  ];

  it('starts empty', () => {
    const c = createControlsController();
    expect(c.get()).toEqual([]);
  });

  it('set() replaces the button list and get() returns it', () => {
    const c = createControlsController();
    c.set(sample);
    expect(c.get()).toEqual(sample);
  });

  it('clear() empties the list', () => {
    const c = createControlsController();
    c.set(sample);
    c.clear();
    expect(c.get()).toEqual([]);
  });

  it('notifies subscribers on set and clear', () => {
    const c = createControlsController();
    const obs = vi.fn();
    c.subscribe(obs);
    c.set(sample);
    expect(obs).toHaveBeenCalledWith(sample);
    c.clear();
    expect(obs).toHaveBeenLastCalledWith([]);
    expect(obs).toHaveBeenCalledTimes(2);
  });

  it('unsubscribe stops further notifications', () => {
    const c = createControlsController();
    const obs = vi.fn();
    const unsub = c.subscribe(obs);
    unsub();
    c.set(sample);
    expect(obs).not.toHaveBeenCalled();
  });
});

describe('StatusController', () => {
  it('starts empty', () => {
    const s = createStatusController();
    expect(s.get()).toEqual({});
  });

  it('set() stores the status and get() returns it', () => {
    const s = createStatusController();
    s.set({ stars: 2, maxStars: 3, streak: 4, progress: { current: 1, total: 5 } });
    expect(s.get()).toEqual({ stars: 2, maxStars: 3, streak: 4, progress: { current: 1, total: 5 } });
  });

  it('set() copies the input (immutability — later mutation of the arg does not leak)', () => {
    const s = createStatusController();
    const input = { stars: 1, maxStars: 3 };
    s.set(input);
    input.stars = 99;
    expect(s.get().stars).toBe(1);
  });

  it('clear() resets to empty', () => {
    const s = createStatusController();
    s.set({ stars: 3, maxStars: 3 });
    s.clear();
    expect(s.get()).toEqual({});
  });

  it('notifies subscribers on set and clear', () => {
    const s = createStatusController();
    const obs = vi.fn();
    s.subscribe(obs);
    s.set({ stars: 1, maxStars: 3 });
    expect(obs).toHaveBeenCalledWith(expect.objectContaining({ stars: 1, maxStars: 3 }));
    s.clear();
    expect(obs).toHaveBeenLastCalledWith({});
    expect(obs).toHaveBeenCalledTimes(2);
  });

  it('unsubscribe stops further notifications', () => {
    const s = createStatusController();
    const obs = vi.fn();
    const unsub = s.subscribe(obs);
    unsub();
    s.set({ stars: 1 });
    expect(obs).not.toHaveBeenCalled();
  });
});
