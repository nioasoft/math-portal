import type { Game3D } from '../types';

/**
 * Lazy loaders only — NO static game imports. Importing this module (e.g. from
 * the client `Game3DShell`) must NOT pull any game's Three.js code into the
 * initial chunk; each game is its own code-split chunk fetched on demand.
 */
export const gameLoaders: Record<string, () => Promise<{ default: Game3D }>> = {
  'multiplication-array': () =>
    import('./multiplication-array/MultiplicationArrayGame').then((m) => ({ default: m.multiplicationArrayGame })),
  'measure-fill': () =>
    import('./measure-fill/MeasureFillGame').then((m) => ({ default: m.measureFillGame })),
  'fraction-build': () =>
    import('./fraction-build/FractionBuildGame').then((m) => ({ default: m.fractionBuildGame })),
  'area-perimeter': () =>
    import('./area-perimeter/AreaPerimeterGame').then((m) => ({ default: m.areaPerimeterGame })),
  'ten-frame-fill': () =>
    import('./ten-frame-fill/TenFrameFillGame').then((m) => ({ default: m.tenFrameFillGame })),
  'place-value-builder': () =>
    import('./place-value-builder/PlaceValueBuilderGame').then((m) => ({ default: m.placeValueBuilderGame })),
  'clock-builder': () =>
    import('./clock-builder/ClockBuilderGame').then((m) => ({ default: m.clockBuilderGame })),
  'fraction-number-line': () =>
    import('./fraction-number-line/FractionNumberLineGame').then((m) => ({ default: m.fractionNumberLineGame })),
  'algebra-balance': () =>
    import('./algebra-balance/AlgebraBalanceGame').then((m) => ({ default: m.algebraBalanceGame })),
  'money-shop': () =>
    import('./money-shop/MoneyShopGame').then((m) => ({ default: m.moneyShopGame })),
  'addition-mine': () =>
    import('./addition-mine/AdditionMineGame').then((m) => ({ default: m.additionMineGame })),
  'volume-cube-fill': () =>
    import('./volume-cube-fill/VolumeCubeFillGame').then((m) => ({ default: m.volumeCubeFillGame })),
  'ruler-measure': () =>
    import('./ruler-measure/RulerMeasureGame').then((m) => ({ default: m.rulerMeasureGame })),
  'decimal-place-value': () =>
    import('./decimal-place-value/DecimalPlaceValueGame').then((m) => ({ default: m.decimalPlaceValueGame })),
  'number-bond-split': () =>
    import('./number-bond-split/NumberBondSplitGame').then((m) => ({ default: m.numberBondSplitGame })),
  'number-line-jump': () =>
    import('./number-line-jump/NumberLineJumpGame').then((m) => ({ default: m.numberLineJumpGame })),
  'exploding-dots': () =>
    import('./exploding-dots/ExplodingDotsGame').then((m) => ({ default: m.explodingDotsGame })),
  'balance-scale-equations': () =>
    import('./balance-scale-equations/BalanceScaleEquationsGame').then((m) => ({
      default: m.balanceScaleEquationsGame,
    })),
  'factris-blocks': () =>
    import('./factris-blocks/FactrisBlocksGame').then((m) => ({ default: m.factrisBlocksGame })),
  'subtraction-bridge': () =>
    import('./subtraction-bridge/SubtractionBridgeGame').then((m) => ({ default: m.subtractionBridgeGame })),
  'skip-count-track': () =>
    import('./skip-count-track/SkipCountTrackGame').then((m) => ({ default: m.skipCountTrackGame })),
  'weight-balance': () =>
    import('./weight-balance/WeightBalanceGame').then((m) => ({ default: m.weightBalanceGame })),
  'percent-bar': () =>
    import('./percent-bar/PercentBarGame').then((m) => ({ default: m.percentBarGame })),
  'ratio-mixer': () =>
    import('./ratio-mixer/RatioMixerGame').then((m) => ({ default: m.ratioMixerGame })),
  'number-sequence': () =>
    import('./number-sequence/NumberSequenceGame').then((m) => ({ default: m.numberSequenceGame })),
  'fraction-strip-compare': () =>
    import('./fraction-strip-compare/FractionStripCompareGame').then((m) => ({
      default: m.fractionStripCompareGame,
    })),
  'angle-builder': () =>
    import('./angle-builder/AngleBuilderGame').then((m) => ({ default: m.angleBuilderGame })),
  'division-share': () =>
    import('./division-share/DivisionShareGame').then((m) => ({ default: m.divisionShareGame })),
  'bar-graph-builder': () =>
    import('./bar-graph-builder/BarGraphBuilderGame').then((m) => ({ default: m.barGraphBuilderGame })),
  'subitize-dots': () =>
    import('./subitize-dots/SubitizeDotsGame').then((m) => ({ default: m.subitizeDotsGame })),
  'array-multiply-slice': () =>
    import('./array-multiply-slice/ArrayMultiplySliceGame').then((m) => ({ default: m.arrayMultiplySliceGame })),
  'fraction-slice': () =>
    import('./fraction-slice/FractionSliceGame').then((m) => ({ default: m.fractionSliceGame })),
  'pattern-complete': () =>
    import('./pattern-complete/PatternCompleteGame').then((m) => ({ default: m.patternCompleteGame })),
  'net-fold': () =>
    import('./net-fold/NetFoldGame').then((m) => ({ default: m.netFoldGame })),
  'symmetry-mirror': () =>
    import('./symmetry-mirror/SymmetryMirrorGame').then((m) => ({ default: m.symmetryMirrorGame })),
  'hundred-chart-colour': () =>
    import('./hundred-chart-colour/HundredChartColourGame').then((m) => ({ default: m.hundredChartColourGame })),
  'geoboard-shapes': () =>
    import('./geoboard-shapes/GeoboardShapesGame').then((m) => ({ default: m.geoboardShapesGame })),
  'shape-sort-3d': () =>
    import('./shape-sort-3d/ShapeSort3DGame').then((m) => ({ default: m.shapeSort3DGame })),
  'coordinate-plot': () =>
    import('./coordinate-plot/CoordinatePlotGame').then((m) => ({ default: m.coordinatePlotGame })),
  'word-problem-bar': () =>
    import('./word-problem-bar/WordProblemBarGame').then((m) => ({ default: m.wordProblemBarGame })),
  'estimation-land': () =>
    import('./estimation-land/EstimationLandGame').then((m) => ({ default: m.estimationLandGame })),
  'multiplication-factor-tree': () =>
    import('./multiplication-factor-tree/MultiplicationFactorTreeGame').then((m) => ({
      default: m.multiplicationFactorTreeGame,
    })),
};

export const GAME_IDS = Object.keys(gameLoaders);
