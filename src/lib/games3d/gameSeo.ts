/** A single game-specific FAQ entry rendered both visibly and as FAQPage JSON-LD. */
export interface GameFaq {
  q: string;
  a: string;
}

/** Unique, game-specific SEO content stored per game in messages/<locale>/games3d.json. */
export interface GameSeo {
  intro: string;
  howToPlay: string[];
  skills: string;
  example: string;
  mistakes: string;
  faqs: GameFaq[];
}

const nonEmpty = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;

/** Type guard: true only when the value is a fully-populated GameSeo block. */
export function isCompleteGameSeo(value: unknown): value is GameSeo {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  if (!nonEmpty(v.intro) || !nonEmpty(v.skills) || !nonEmpty(v.example) || !nonEmpty(v.mistakes)) {
    return false;
  }
  if (!Array.isArray(v.howToPlay) || v.howToPlay.length < 3 || !v.howToPlay.every(nonEmpty)) {
    return false;
  }
  if (!Array.isArray(v.faqs) || v.faqs.length < 3) return false;
  return v.faqs.every(
    (f) => typeof f === 'object' && f !== null && nonEmpty((f as GameFaq).q) && nonEmpty((f as GameFaq).a),
  );
}
