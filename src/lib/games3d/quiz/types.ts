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
}

export interface QuizState<TProblem> {
  current: TProblem;
  index: number;        // 0-based
  total: number;
  score: number;
  correct: number;
  streak: number;
  finished: boolean;
}
