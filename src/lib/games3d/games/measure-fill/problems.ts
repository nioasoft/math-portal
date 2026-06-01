import type { ProblemGenerator } from '@/lib/games3d/quiz/types';

export interface MeasureFillProblem {
  targetMl: number;
  capacityMl: number;
}

export const MEASURE_TOLERANCE_ML = 25;
const CAPACITY = 1000;
const STEP = 50;

export function createMeasureFillGenerator(): ProblemGenerator<MeasureFillProblem> {
  return {
    next(): MeasureFillProblem {
      const steps = Math.floor(CAPACITY / STEP); // 20
      const n = Math.floor(Math.random() * steps) + 1; // 1..20
      return { targetMl: n * STEP, capacityMl: CAPACITY };
    },
    check(problem: MeasureFillProblem, answer: unknown): boolean {
      return typeof answer === 'number' && Math.abs(answer - problem.targetMl) <= MEASURE_TOLERANCE_ML;
    },
  };
}
