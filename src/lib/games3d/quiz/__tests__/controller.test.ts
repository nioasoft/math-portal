import { describe, it, expect } from 'vitest';
import { createQuizController } from '../controller';
import type { ProblemGenerator } from '../types';

// Deterministic generator: problems are numbers 1,2,3,...; correct answer === problem.
function seqGenerator(): ProblemGenerator<number> {
  let n = 0;
  return {
    next: () => (n += 1),
    check: (problem, answer) => answer === problem,
  };
}

describe('quiz controller', () => {
  it('starts at index 0 with the first problem', () => {
    const c = createQuizController(seqGenerator(), { length: 3, pointsPerCorrect: 10 });
    expect(c.state().index).toBe(0);
    expect(c.state().total).toBe(3);
    expect(c.state().current).toBe(1);
    expect(c.state().finished).toBe(false);
  });

  it('awards points and advances on a correct answer', () => {
    const c = createQuizController(seqGenerator(), { length: 3, pointsPerCorrect: 10 });
    const res = c.submit(1); // correct
    expect(res.correct).toBe(true);
    expect(c.state().score).toBe(10);
    expect(c.state().streak).toBe(1);
    expect(c.state().index).toBe(1);
    expect(c.state().current).toBe(2);
  });

  it('does not award points and resets streak on a wrong answer but still advances', () => {
    const c = createQuizController(seqGenerator(), { length: 3, pointsPerCorrect: 10 });
    c.submit(1);        // correct, streak 1
    const res = c.submit(999); // wrong
    expect(res.correct).toBe(false);
    expect(c.state().score).toBe(10);
    expect(c.state().streak).toBe(0);
    expect(c.state().index).toBe(2);
  });

  it('finishes after `length` submissions and reports a summary', () => {
    const c = createQuizController(seqGenerator(), { length: 3, pointsPerCorrect: 10 });
    c.submit(1); // correct
    c.submit(2); // correct
    expect(c.state().finished).toBe(false);
    const last = c.submit(3); // correct -> finishes
    expect(last.finished).toBe(true);
    expect(c.state().finished).toBe(true);
    const summary = c.summary();
    expect(summary.totalPoints).toBe(30);
    expect(summary.accuracy).toBeCloseTo(1, 5);
    expect(summary.streak).toBe(3);
    expect(summary.durationSec).toBeGreaterThanOrEqual(0);
  });

  it('computes fractional accuracy', () => {
    const c = createQuizController(seqGenerator(), { length: 2, pointsPerCorrect: 5 });
    c.submit(1);   // correct
    c.submit(999); // wrong -> finishes
    expect(c.summary().accuracy).toBeCloseTo(0.5, 5);
  });
});
