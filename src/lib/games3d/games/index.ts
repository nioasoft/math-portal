import type { Game3D } from '../types';
import { registerGame, listGames } from '../registry';
import { multiplicationArrayGame } from './multiplication-array/MultiplicationArrayGame';
import { measureFillGame } from './measure-fill/MeasureFillGame';
import { fractionBuildGame } from './fraction-build/FractionBuildGame';
import { areaPerimeterGame } from './area-perimeter/AreaPerimeterGame';
import { tenFrameFillGame } from './ten-frame-fill/TenFrameFillGame';
import { placeValueBuilderGame } from './place-value-builder/PlaceValueBuilderGame';
import { clockBuilderGame } from './clock-builder/ClockBuilderGame';
import { fractionNumberLineGame } from './fraction-number-line/FractionNumberLineGame';
import { algebraBalanceGame } from './algebra-balance/AlgebraBalanceGame';
import { moneyShopGame } from './money-shop/MoneyShopGame';
import { additionMineGame } from './addition-mine/AdditionMineGame';
import { volumeCubeFillGame } from './volume-cube-fill/VolumeCubeFillGame';
import { rulerMeasureGame } from './ruler-measure/RulerMeasureGame';
import { decimalPlaceValueGame } from './decimal-place-value/DecimalPlaceValueGame';
import { numberBondSplitGame } from './number-bond-split/NumberBondSplitGame';
import { numberLineJumpGame } from './number-line-jump/NumberLineJumpGame';
import { explodingDotsGame } from './exploding-dots/ExplodingDotsGame';
import { balanceScaleEquationsGame } from './balance-scale-equations/BalanceScaleEquationsGame';
import { factrisBlocksGame } from './factris-blocks/FactrisBlocksGame';
import { subtractionBridgeGame } from './subtraction-bridge/SubtractionBridgeGame';
import { skipCountTrackGame } from './skip-count-track/SkipCountTrackGame';
import { weightBalanceGame } from './weight-balance/WeightBalanceGame';
import { percentBarGame } from './percent-bar/PercentBarGame';
import { ratioMixerGame } from './ratio-mixer/RatioMixerGame';
import { numberSequenceGame } from './number-sequence/NumberSequenceGame';
import { fractionStripCompareGame } from './fraction-strip-compare/FractionStripCompareGame';
import { angleBuilderGame } from './angle-builder/AngleBuilderGame';
import { divisionShareGame } from './division-share/DivisionShareGame';
import { barGraphBuilderGame } from './bar-graph-builder/BarGraphBuilderGame';
import { subitizeDotsGame } from './subitize-dots/SubitizeDotsGame';
import { arrayMultiplySliceGame } from './array-multiply-slice/ArrayMultiplySliceGame';
import { fractionSliceGame } from './fraction-slice/FractionSliceGame';
import { patternCompleteGame } from './pattern-complete/PatternCompleteGame';
import { netFoldGame } from './net-fold/NetFoldGame';

/**
 * Server/registry-side catalog: the static `games` array + registration helpers.
 * This statically imports every game module (and therefore three), so it must
 * NOT be imported from the client bundle. The client uses `./loaders` (lazy
 * `() => import(...)` only) instead. Adding a game = add an entry here AND in
 * `./loaders.ts`.
 */

// Statically-imported game definitions (meta + init fn). Registered for the catalog.
const games: Game3D[] = [
  multiplicationArrayGame,
  measureFillGame,
  fractionBuildGame,
  areaPerimeterGame,
  tenFrameFillGame,
  placeValueBuilderGame,
  clockBuilderGame,
  fractionNumberLineGame,
  algebraBalanceGame,
  moneyShopGame,
  additionMineGame,
  volumeCubeFillGame,
  rulerMeasureGame,
  decimalPlaceValueGame,
  numberBondSplitGame,
  numberLineJumpGame,
  explodingDotsGame,
  balanceScaleEquationsGame,
  factrisBlocksGame,
  subtractionBridgeGame,
  skipCountTrackGame,
  weightBalanceGame,
  percentBarGame,
  ratioMixerGame,
  numberSequenceGame,
  fractionStripCompareGame,
  angleBuilderGame,
  divisionShareGame,
  barGraphBuilderGame,
  subitizeDotsGame,
  arrayMultiplySliceGame,
  fractionSliceGame,
  patternCompleteGame,
  netFoldGame,
];

let registered = false;
export function ensureRegistered(): void {
  if (registered) return;
  registered = true;
  for (const g of games) registerGame(g);
}

export function getRegisteredGames(): Game3D[] {
  ensureRegistered();
  return listGames();
}
