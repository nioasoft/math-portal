/** A pure, testable problem source for a game. TProblem is the game's problem shape. */
export interface ProblemGenerator<TProblem> {
  /** Produce the next problem. */
  next(): TProblem;
  /** Grade an answer against a problem. */
  check(problem: TProblem, answer: unknown): boolean;
}

export interface QuizConfig {
  /** Number of problems in a quiz run. */
  length: number;
  /** Points awarded per correct answer. */
  pointsPerCorrect: number;
  /** Bonus points multiplied by current streak (e.g. 2 → streak 3 gives +6 bonus). */
  streakBonus?: number;
  /** Max milliseconds per question. undefined = no time limit. */
  timePerQuestionMs?: number;
  /** Generate a hint string for a problem. */
  hintGenerator?: (problem: unknown) => string;
  /** Max hints allowed per quiz. undefined = unlimited. */
  maxHints?: number;
}

export interface QuizState<TProblem> {
  current: TProblem;
  index: number;        // 0-based
  total: number;
  score: number;
  correct: number;
  streak: number;
  bestStreak: number;
  finished: boolean;
  questionStartedAt: number;
  timeRemainingMs: number | null;
  hintsUsed: number;
  hintsRemaining: number | null;
}
