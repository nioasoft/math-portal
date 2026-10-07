import {
  Atom, Blocks, Bomb, BookOpen, Box, BrickWall, Building2, CakeSlice, ChartNoAxesColumn,
  ChefHat, Clock, Coins, Compass, Cone, Copy, Crosshair, Dices, Divide, Droplets, Equal,
  Eye, FlaskConical, Footprints, Frame, GitBranch, Grid2x2, Grid3x3, Group, Hash,
  ListChecks, ListOrdered, Milestone, MoveHorizontal, MoveRight, Package, Palette, Percent,
  Pizza, Plus, Puzzle, Repeat, Route, Rows3, Ruler, Scale, Scissors, Shapes, Split, Table,
  Tag, TrendingUp, Weight,
  type LucideIcon,
} from 'lucide-react';
import type { GameTopic3D } from '@/lib/games3d/types';

/**
 * Per-game card art. Sibling of `topicMeta` rather than a field on `GameMeta`:
 * the engine layer owns game behaviour and must not pull React icon components
 * into the three.js chunks, so presentation stays here. Unknown ids fall back to
 * their topic's art, so a newly registered game still renders.
 */
export interface GameArt {
  icon: LucideIcon;
  /** Gradient stops for the art tile. Plain hex — Tailwind cannot see composed class names. */
  from: string;
  to: string;
}

const TOPIC_ART: Record<GameTopic3D, GameArt> = {
  arithmetic: { icon: Grid3x3, from: '#4d96ff', to: '#1d4ed8' },
  geometry: { icon: Shapes, from: '#4ade80', to: '#15803d' },
  fractions: { icon: Pizza, from: '#f97316', to: '#c2410c' },
  percentage: { icon: Percent, from: '#fbbf24', to: '#ea580c' },
  decimals: { icon: Hash, from: '#93c5fd', to: '#1d4ed8' },
  ratio: { icon: Scale, from: '#818cf8', to: '#4338ca' },
  series: { icon: ListOrdered, from: '#fde047', to: '#a16207' },
  units: { icon: Ruler, from: '#fcd34d', to: '#b45309' },
  wordProblems: { icon: BookOpen, from: '#fca5a5', to: '#b91c1c' },
  misc: { icon: Group, from: '#a5b4fc', to: '#4338ca' },
};

export const GAME_ART: Record<string, GameArt> = {
  'addition-mine': { icon: Bomb, from: '#f97316', to: '#dc2626' },
  'algebra-balance': { icon: Scale, from: '#6366f1', to: '#4338ca' },
  'angle-builder': { icon: Compass, from: '#2dd4bf', to: '#0f766e' },
  'area-perimeter': { icon: Frame, from: '#4ade80', to: '#15803d' },
  'array-multiply-slice': { icon: Scissors, from: '#06b6d4', to: '#0e7490' },
  'balance-scale-equations': { icon: Equal, from: '#8b5cf6', to: '#6d28d9' },
  'bar-graph-builder': { icon: ChartNoAxesColumn, from: '#f59e0b', to: '#b45309' },
  'clock-builder': { icon: Clock, from: '#6ee7b7', to: '#047857' },
  'coordinate-plot': { icon: Crosshair, from: '#60a5fa', to: '#1e40af' },
  'decimal-addition': { icon: Plus, from: '#22c55e', to: '#15803d' },
  'decimal-number-line': { icon: MoveHorizontal, from: '#5eead4', to: '#0f766e' },
  'decimal-place-value': { icon: Hash, from: '#93c5fd', to: '#1d4ed8' },
  'division-share': { icon: Divide, from: '#14b8a6', to: '#0f766e' },
  'estimation-land': { icon: Eye, from: '#84cc16', to: '#4d7c0f' },
  'exploding-dots': { icon: Atom, from: '#ec4899', to: '#be185d' },
  'factris-blocks': { icon: BrickWall, from: '#f43f5e', to: '#9f1239' },
  'fraction-build': { icon: Pizza, from: '#f97316', to: '#c2410c' },
  'fraction-number-line': { icon: Milestone, from: '#a855f7', to: '#7e22ce' },
  'fraction-slice': { icon: CakeSlice, from: '#f472b6', to: '#be185d' },
  'fraction-strip-compare': { icon: Rows3, from: '#818cf8', to: '#4338ca' },
  'geoboard-shapes': { icon: Shapes, from: '#f87171', to: '#b91c1c' },
  'geometric-sequence': { icon: TrendingUp, from: '#86efac', to: '#15803d' },
  'hundred-chart-colour': { icon: Palette, from: '#eab308', to: '#a16207' },
  'long-division-tower': { icon: Building2, from: '#0077b6', to: '#075985' },
  'measure-fill': { icon: FlaskConical, from: '#67e8f9', to: '#0e7490' },
  'money-shop': { icon: Coins, from: '#f59e0b', to: '#b45309' },
  'multiplication-array': { icon: Grid3x3, from: '#4d96ff', to: '#1d4ed8' },
  'multiplication-factor-tree': { icon: GitBranch, from: '#10b981', to: '#047857' },
  'net-fold': { icon: Package, from: '#facc15', to: '#a16207' },
  'number-bond-split': { icon: Split, from: '#ff9a9e', to: '#e11d48' },
  'number-line-jump': { icon: MoveRight, from: '#38bdf8', to: '#0369a1' },
  'number-sequence': { icon: ListOrdered, from: '#fde047', to: '#a16207' },
  'pattern-complete': { icon: Repeat, from: '#f0abfc', to: '#a21caf' },
  'percent-bar': { icon: ChartNoAxesColumn, from: '#fbbf24', to: '#ea580c' },
  'percent-discount': { icon: Tag, from: '#f43f5e', to: '#be123c' },
  'percent-of-quantity': { icon: Percent, from: '#a3e635', to: '#4d7c0f' },
  'place-value-builder': { icon: Blocks, from: '#a78bfa', to: '#6d28d9' },
  'ratio-mixer': { icon: Droplets, from: '#f9a8d4', to: '#be185d' },
  'ratio-recipe': { icon: ChefHat, from: '#fdba74', to: '#c2410c' },
  'ratio-table': { icon: Table, from: '#7dd3fc', to: '#0369a1' },
  'ruler-measure': { icon: Ruler, from: '#fcd34d', to: '#b45309' },
  'shape-sort-3d': { icon: Cone, from: '#fb923c', to: '#c2410c' },
  'skip-count-track': { icon: Footprints, from: '#34d399', to: '#059669' },
  'subitize-dots': { icon: Dices, from: '#fb7185', to: '#be123c' },
  'subtraction-bridge': { icon: Route, from: '#22d3ee', to: '#0e7490' },
  'symmetry-mirror': { icon: Copy, from: '#38bdf8', to: '#0284c7' },
  'tangram-build': { icon: Puzzle, from: '#c084fc', to: '#7e22ce' },
  'ten-frame-fill': { icon: Grid2x2, from: '#fbbf24', to: '#d97706' },
  'venn-sort': { icon: Group, from: '#a5b4fc', to: '#4338ca' },
  'volume-cube-fill': { icon: Box, from: '#34d399', to: '#047857' },
  'weight-balance': { icon: Weight, from: '#94a3b8', to: '#334155' },
  'word-problem-bar': { icon: BookOpen, from: '#fca5a5', to: '#b91c1c' },
  'word-problem-steps': { icon: ListChecks, from: '#99f6e4', to: '#0f766e' },
};

export function gameArt(id: string, topic: string): GameArt {
  return GAME_ART[id] ?? TOPIC_ART[topic as GameTopic3D] ?? TOPIC_ART.misc;
}
