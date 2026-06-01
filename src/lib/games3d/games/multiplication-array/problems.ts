import type { ProblemGenerator } from '@/lib/games3d/quiz/types';

export interface MultiplicationProblem {
  rows: number;
  cols: number;
  product: number;
}

const MIN = 2;
const MAX = 10;

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function createMultiplicationGenerator(): ProblemGenerator<MultiplicationProblem> {
  return {
    next(): MultiplicationProblem {
      const rows = randInt(MIN, MAX);
      const cols = randInt(MIN, MAX);
      return { rows, cols, product: rows * cols };
    },
    check(problem: MultiplicationProblem, answer: unknown): boolean {
      return typeof answer === 'number' && answer === problem.product;
    },
  };
}
