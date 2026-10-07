import type { CompleteSummary } from '../types';
import type { ProblemGenerator, QuizConfig, QuizState } from './types';

export interface SubmitResult {
  correct: boolean;
  finished: boolean;
}

export interface QuizController<TProblem> {
  state(): QuizState<TProblem>;
  submit(answer: unknown): SubmitResult;
  summary(): CompleteSummary;
}

export function createQuizController<TProblem>(
  generator: ProblemGenerator<TProblem>,
  config: QuizConfig,
  now: () => number = () => Date.now()
): QuizController<TProblem> {
  const startedAt = now();
  let current = generator.next();
  let index = 0;
  let score = 0;
  let correct = 0;
  let streak = 0;
  let bestStreak = 0;
  let finished = false;

  const streakBonus = config.streakBonus ?? 0;

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
    };
  }

  function submit(answer: unknown): SubmitResult {
    if (finished) return { correct: false, finished: true };

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
    }
    return { correct: isCorrect, finished };
  }

  function summary(): CompleteSummary {
    return {
      totalPoints: score,
      accuracy: config.length > 0 ? correct / config.length : 0,
      durationSec: Math.max(0, (now() - startedAt) / 1000),
      streak: bestStreak,
    };
  }

  return { state, submit, summary };
}
