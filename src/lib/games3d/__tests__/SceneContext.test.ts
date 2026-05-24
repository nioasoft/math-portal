import { describe, it, expect, vi } from 'vitest';
import { createScoreController, createFeedbackController } from '../engine/SceneContext';

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
