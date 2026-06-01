import { describe, it, expect, vi } from 'vitest';
import { createPromptController } from '../engine/SceneContext';

describe('PromptController', () => {
  it('starts empty', () => {
    const p = createPromptController();
    expect(p.get()).toBe('');
  });

  it('set() then get() returns the text', () => {
    const p = createPromptController();
    p.set('3 × 4 = ?');
    expect(p.get()).toBe('3 × 4 = ?');
  });

  it('clear() empties the prompt', () => {
    const p = createPromptController();
    p.set('something');
    p.clear();
    expect(p.get()).toBe('');
  });

  it('notifies subscribers on set', () => {
    const p = createPromptController();
    const obs = vi.fn();
    p.subscribe(obs);
    p.set('hello');
    expect(obs).toHaveBeenCalledWith('hello');
  });

  it('notifies subscribers on clear', () => {
    const p = createPromptController();
    const obs = vi.fn();
    p.set('hello');
    p.subscribe(obs);
    p.clear();
    expect(obs).toHaveBeenCalledWith('');
  });

  it('unsubscribe stops notifications', () => {
    const p = createPromptController();
    const obs = vi.fn();
    const unsub = p.subscribe(obs);
    unsub();
    p.set('hello');
    expect(obs).not.toHaveBeenCalled();
  });
});
