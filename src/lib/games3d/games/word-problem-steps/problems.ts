import type { ProblemGenerator } from '@/lib/games3d/quiz/types';

/**
 * A two-step word problem. The child sees a story problem that requires two
 * operations (e.g., "add then subtract"). The final answer is always a clean
 * integer in 1..20.
 */
export interface MultiStepProblem {
  /** First number in the story. */
  stepA: number;
  /** First operation. */
  op1: 'add' | 'sub';
  /** Second number in the story. */
  stepB: number;
  /** Second operation (always different from op1). */
  op2: 'add' | 'sub';
  /** Index for selecting story elements (name, item). */
  storyIndex: number;
}

function computeAnswer(p: MultiStepProblem): number {
  let result = p.stepA;
  if (p.op1 === 'add') result += p.stepB;
  else result -= p.stepB;
  if (p.op2 === 'add') result += p.stepB;
  else result -= p.stepB;
  return result;
}

function isPositiveInt(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && Number.isInteger(value);
}

export function createMultiStepGenerator(): ProblemGenerator<MultiStepProblem> {
  return {
    next(): MultiStepProblem {
      for (;;) {
        const stepA = 5 + Math.floor(Math.random() * 11); // 5..15
        const stepB = 3 + Math.floor(Math.random() * 8);  // 3..10
        const ops: Array<'add' | 'sub'> = ['add', 'sub'];
        const op1 = ops[Math.floor(Math.random() * 2)];
        const op2 = op1 === 'add' ? 'sub' : 'add';
        const storyIndex = Math.floor(Math.random() * 5);
        const problem: MultiStepProblem = { stepA, op1, stepB, op2, storyIndex };
        const result = computeAnswer(problem);
        if (result >= 1 && result <= 20) return problem;
      }
    },
    check(problem: MultiStepProblem, answer: unknown): boolean {
      if (!isPositiveInt(answer)) return false;
      return answer === computeAnswer(problem);
    },
  };
}
