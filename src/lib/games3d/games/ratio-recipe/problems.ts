import type { ProblemGenerator } from '@/lib/games3d/quiz/types';

/**
 * A "scale a recipe" problem. The child sees a recipe for a base number of
 * servings (always 2) and must compute the amount of one ingredient for a
 * target number of servings. All values yield clean integer results.
 */
export interface RecipeProblem {
  /** Base number of servings the recipe is written for. */
  baseServings: number;
  /** Target number of servings the child must scale to. */
  targetServings: number;
  /** Amount of the highlighted ingredient in the base recipe. */
  baseAmount: number;
}

/** Base servings is always 2. */
const BASE_SERVINGS = 2;
/** Target servings that are clean multiples of BASE_SERVINGS. */
const TARGET_SERVINGS = [4, 6, 8, 10] as const;
/** Ingredient amounts in the base recipe. */
const BASE_AMOUNTS = [1, 2, 3, 4, 5] as const;

export const MIN_ANSWER = 2;   // 1 × (4/2)
export const MAX_ANSWER = 25;  // 5 × (10/2)

function isPositiveInt(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && Number.isInteger(value);
}

export function createRecipeGenerator(): ProblemGenerator<RecipeProblem> {
  return {
    next(): RecipeProblem {
      const targetServings = TARGET_SERVINGS[Math.floor(Math.random() * TARGET_SERVINGS.length)];
      const baseAmount = BASE_AMOUNTS[Math.floor(Math.random() * BASE_AMOUNTS.length)];
      return { baseServings: BASE_SERVINGS, targetServings, baseAmount };
    },
    check(problem: RecipeProblem, answer: unknown): boolean {
      if (!isPositiveInt(answer)) return false;
      const expected = problem.baseAmount * (problem.targetServings / problem.baseServings);
      return answer === expected;
    },
  };
}
