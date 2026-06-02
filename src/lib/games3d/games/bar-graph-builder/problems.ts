import type { ProblemGenerator } from '@/lib/games3d/quiz/types';

/**
 * A bar-graph READING problem. Three categories (identified only by a universal
 * emoji, so no per-language category names are needed) each have a fixed COUNT.
 * The child reads two bar heights off the Y-axis scale and answers "how many
 * MORE {a} than {b}?". `a` is the taller (more) category and `b` the shorter
 * (less), chosen so the difference is always ≥ 1 (non-degenerate).
 */
export interface BarGraphProblem {
  /** Emoji + count for each of the three bars (fixed data shown on the chart). */
  bars: ReadonlyArray<{ emoji: string; count: number }>;
  /** Index into `bars` of the larger category (the "how many more {a}…"). */
  aIndex: number;
  /** Index into `bars` of the smaller category (the "…than {b}?"). */
  bIndex: number;
  /** The correct answer: bars[aIndex].count − bars[bIndex].count (≥ 1). */
  diff: number;
}

/** Max bar count (and the top of the Y-axis scale). Counts live in 1..MAX_COUNT. */
export const MAX_COUNT = 10;

/** The three category emoji used for the bars (universal, language-free). */
export const BAR_EMOJI = ['🍎', '🍌', '🍇'] as const;

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Three DISTINCT counts in 1..MAX_COUNT (distinct so any pair has diff ≥ 1). */
function distinctCounts(): [number, number, number] {
  const pool: number[] = [];
  while (pool.length < 3) {
    const n = randInt(1, MAX_COUNT);
    if (!pool.includes(n)) pool.push(n);
  }
  return [pool[0], pool[1], pool[2]];
}

export function createBarGraphGenerator(): ProblemGenerator<BarGraphProblem> {
  return {
    next(): BarGraphProblem {
      const counts = distinctCounts();
      const bars = BAR_EMOJI.map((emoji, i) => ({ emoji, count: counts[i] }));
      // Pick two distinct bars; `a` is the larger count, `b` the smaller, so the
      // question "how many more a than b" always has a positive answer (≥ 1).
      let i = randInt(0, 2);
      let j = randInt(0, 2);
      while (j === i) j = randInt(0, 2);
      if (bars[i].count < bars[j].count) [i, j] = [j, i];
      return {
        bars,
        aIndex: i,
        bIndex: j,
        diff: bars[i].count - bars[j].count,
      };
    },
    check(problem: BarGraphProblem, answer: unknown): boolean {
      // STRICT: only a finite integer exactly equal to the read-off difference.
      if (typeof answer !== 'number' || !Number.isFinite(answer)) return false;
      if (!Number.isInteger(answer)) return false;
      return answer === problem.diff;
    },
  };
}
