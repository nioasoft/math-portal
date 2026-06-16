import type { CompleteSummary } from '../types';
import type { ProblemGenerator, QuizConfig, QuizState } from './types';

export interface SubmitResult {
  correct: boolean;
  finished: boolean;
  timedOut: boolean;
}

export interface QuizController<TProblem> {
  state(): QuizState<TProblem>;
  submit(answer: unknown): SubmitResult;
  requestHint(): string | null;
  summary(): CompleteSummary;
}

export function createQuizController<TProblem>(
  generator: ProblemGenerator<TProblem>,
  config: QuizConfig,
  now: () => number = () => Date.now()
): QuizController<TProblem> {
  const startedAt = now();
  let questionStartedAt = now();
  let current = generator.next();
  let index = 0;
  let score = 0;
  let correct = 0;
  let streak = 0;
  let bestStreak = 0;
  let finished = false;
  let hintsUsed = 0;

  const maxHints = config.maxHints ?? (config.hintGenerator ? Infinity : 0);
  const streakBonus = config.streakBonus ?? 0;
  const timePerQuestionMs = config.timePerQuestionMs;

  function getTimeRemaining(): number | null {
    if (!timePerQuestionMs) return null;
    const elapsed = now() - questionStartedAt;
    return Math.max(0, timePerQuestionMs - elapsed);
  }

  function state(): QuizState<TProblem> {
    return {
      current,
      index,
      total: config.length,
      score,
      correct,
      streak,
      bestStreak,
      finished,
      questionStartedAt,
      timeRemainingMs: getTimeRemaining(),
      hintsUsed,
      hintsRemaining: maxHints === Infinity ? null : Math.max(0, maxHints - hintsUsed),
    };
  }

  function submit(answer: unknown): SubmitResult {
    if (finished) return { correct: false, finished: true, timedOut: false };

    // Check timeout
    if (timePerQuestionMs && getTimeRemaining() === 0) {
      streak = 0;
      index += 1;
      if (index >= config.length) {
        finished = true;
      } else {
        current = generator.next();
        questionStartedAt = now();
      }
      return { correct: false, finished, timedOut: true };
    }

    const isCorrect = generator.check(current, answer);
    if (isCorrect) {
      const bonus = streak * streakBonus;
      score += config.pointsPerCorrect + bonus;
      correct += 1;
      streak += 1;
      if (streak > bestStreak) bestStreak = streak;
    } else {
      streak = 0;
    }
    index += 1;
    if (index >= config.length) {
      finished = true;
    } else {
      current = generator.next();
      questionStartedAt = now();
    }
    return { correct: isCorrect, finished, timedOut: false };
  }

  function requestHint(): string | null {
    if (!config.hintGenerator) return null;
    if (hintsUsed >= maxHints) return null;
    hintsUsed += 1;
    return config.hintGenerator(current);
  }

  function summary(): CompleteSummary {
    return {
      totalPoints: score,
      accuracy: config.length > 0 ? correct / config.length : 0,
      durationSec: Math.max(0, (now() - startedAt) / 1000),
      streak: bestStreak,
    };
  }

  return { state, submit, requestHint, summary };
}
