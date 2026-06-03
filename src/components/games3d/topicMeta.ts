import {
  Calculator, Shapes, PieChart, Ruler, Percent, Hash,
  Scale, ListOrdered, BookOpen, Sparkles, type LucideIcon,
} from 'lucide-react';

/**
 * Per-topic presentation for the home-page Games Hub shelves. `topic` matches
 * `GameMeta.topic` (see games3d/types). Labels themselves come from i18n
 * (`games3d.topics.<topic>`); this map only carries icon + color tokens.
 */
export interface TopicStyle {
  icon: LucideIcon;
  /** Tailwind gradient for the icon tile / accents (e.g. "from-blue-400 to-blue-500"). */
  gradient: string;
  /** Soft background tint for the icon tile. */
  iconBg: string;
  /** Solid text color for the topic chip. */
  chip: string;
}

export const TOPIC_STYLES: Record<string, TopicStyle> = {
  arithmetic: { icon: Calculator, gradient: 'from-blue-400 to-blue-600', iconBg: 'bg-blue-50', chip: 'bg-blue-50 text-blue-700' },
  geometry: { icon: Shapes, gradient: 'from-rose-400 to-pink-600', iconBg: 'bg-rose-50', chip: 'bg-rose-50 text-rose-700' },
  fractions: { icon: PieChart, gradient: 'from-violet-400 to-purple-600', iconBg: 'bg-violet-50', chip: 'bg-violet-50 text-violet-700' },
  units: { icon: Ruler, gradient: 'from-cyan-400 to-teal-600', iconBg: 'bg-cyan-50', chip: 'bg-cyan-50 text-cyan-700' },
  percentage: { icon: Percent, gradient: 'from-amber-400 to-orange-600', iconBg: 'bg-amber-50', chip: 'bg-amber-50 text-amber-700' },
  decimals: { icon: Hash, gradient: 'from-emerald-400 to-green-600', iconBg: 'bg-emerald-50', chip: 'bg-emerald-50 text-emerald-700' },
  ratio: { icon: Scale, gradient: 'from-indigo-400 to-indigo-600', iconBg: 'bg-indigo-50', chip: 'bg-indigo-50 text-indigo-700' },
  series: { icon: ListOrdered, gradient: 'from-fuchsia-400 to-fuchsia-600', iconBg: 'bg-fuchsia-50', chip: 'bg-fuchsia-50 text-fuchsia-700' },
  wordProblems: { icon: BookOpen, gradient: 'from-orange-400 to-red-500', iconBg: 'bg-orange-50', chip: 'bg-orange-50 text-orange-700' },
  misc: { icon: Sparkles, gradient: 'from-slate-400 to-slate-600', iconBg: 'bg-slate-100', chip: 'bg-slate-100 text-slate-700' },
};

/** Display order of topic shelves (largest / most foundational first). Unknown topics fall back to misc. */
export const TOPIC_ORDER: string[] = [
  'arithmetic', 'geometry', 'fractions', 'units',
  'percentage', 'decimals', 'ratio', 'series', 'wordProblems', 'misc',
];

export function topicStyle(topic: string): TopicStyle {
  return TOPIC_STYLES[topic] ?? TOPIC_STYLES.misc;
}
