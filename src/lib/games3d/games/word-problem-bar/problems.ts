import type { ProblemGenerator } from '@/lib/games3d/quiz/types';

/**
 * A part–part–whole word problem modelled with a bar diagram.
 *
 * - `add` (find the WHOLE): two known parts `a` + `b`; answer = a + b.
 *   "{name} had {a} {item}, then got {b} more — how many now?"
 * - `sub` (find the remaining PART): a known `whole` and a known part `a`
 *   given/taken away; answer = whole − a.
 *   "{name} had {whole} {item}, gave away {a} — how many left?"
 *
 * The numbers in the story ARE the task (allowed per spec §11), so the prompt
 * is parameterised. The answer is always an integer 1..18.
 */
export type WordProblemType = 'add' | 'sub';

export interface WordProblemBarProblem {
  type: WordProblemType;
  /** Index into the locale's name list (so the story localises). */
  nameIndex: number;
  /** Index into the locale's item list. */
  itemIndex: number;
  /** First known part (add) OR the part given away (sub). */
  a: number;
  /** Second known part — present only for `add`. */
  b?: number;
  /** The known whole — present only for `sub`. */
  whole?: number;
  /** The integer answer the child must build (1..18). */
  answer: number;
}

/** How many name/item options each locale provides (the renderer/i18n agree). */
export const NAME_COUNT = 6;
export const ITEM_COUNT = 6;

/** Hard clamp for the answer bar (the child can dial 0..MAX_VALUE). */
export const MAX_VALUE = 20;

function randInt(min: number, max: number): number {
  // inclusive on both ends
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function isAnswer(a: unknown): a is number {
  return typeof a === 'number' && Number.isInteger(a);
}

export function createWordProblemBarGenerator(): ProblemGenerator<WordProblemBarProblem> {
  return {
    next(): WordProblemBarProblem {
      const type: WordProblemType = Math.random() < 0.5 ? 'add' : 'sub';
      const nameIndex = randInt(0, NAME_COUNT - 1);
      const itemIndex = randInt(0, ITEM_COUNT - 1);

      if (type === 'add') {
        // two parts in 2..9 → whole in 4..18 (in range, never degenerate)
        const a = randInt(2, 9);
        const b = randInt(2, 9);
        return { type, nameIndex, itemIndex, a, b, answer: a + b };
      }

      // sub: whole in 5..12, part a in 1..whole-1 → remaining in 1..11 (>=1)
      const whole = randInt(5, 12);
      const a = randInt(1, whole - 1);
      return { type, nameIndex, itemIndex, a, whole, answer: whole - a };
    },

    check(problem: WordProblemBarProblem, answer: unknown): boolean {
      // STRICT: integer-only, exact match. Rejects off-by-one, floats,
      // NaN, null, strings, objects.
      if (!isAnswer(answer)) return false;
      return answer === problem.answer;
    },
  };
}
