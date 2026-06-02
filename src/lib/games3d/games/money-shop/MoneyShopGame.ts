import * as THREE from 'three';
import type { Tween } from '@tweenjs/tween.js';
import type { ControlButton, Game3D } from '@/lib/games3d/types';
import { createQuizController } from '@/lib/games3d/quiz/controller';
import { applyClayLook, roundedBox, popIn, punch, shake, celebrate, bigCelebrate, computeStars } from '@/lib/games3d/kit';
import {
  createMoneyShopGenerator,
  trayTotal,
  emptyTray,
  DENOMINATIONS,
  type Denomination,
  type TrayCounts,
  type MoneyShopAnswer,
  type MoneyShopProblem,
} from './problems';

// Theme: an Israeli market (שוק) money stall. A wooden payment tray sits in front
// of the child; coins (short procedural cylinders, metallic gold/silver tints,
// distinct sizes per denomination) and bills (flat rounded rectangles, colored
// per denomination) accumulate on it as the child pays. Each denomination has its
// own column of stacked money on the tray plus a −/+ control labelled with the
// shekel amount (e.g. "₪10 +"). Dragging UP over the tray adds a ₪1 coin (fast,
// natural: up = more). The prompt only ever shows the amount to pay — never the
// running total; the 3D pile shows progress. בדוק grades the tray total exactly.

const QUIZ_LENGTH = 10;
const POINTS_PER_CORRECT = 10;
const POP_STAGGER_MS = 24; // gentle per-piece delay so a stack grows alive
const MAX_PER_DENOM = 30; // cap pieces per column (a tray of ₪1 to 99 fits easily)

// Coins are short cylinders; bills are thin flat slabs. Size encodes value so the
// pile reads at a glance. Radii/half-widths grow with the denomination.
interface MoneySpec {
  denom: Denomination;
  kind: 'coin' | 'bill';
  color: number; // saturated metallic/paper tint (dark enough to read on light clay)
  // coin: radius + thickness; bill: width/depth + thickness (a flat rectangle).
  radius?: number;
  width?: number;
  depth?: number;
  thickness: number;
}

// Israeli-flavoured tints: coins in gold/silver/bronze, bills in their real-ish
// note colors (₪20 brown-orange, ₪50 green). All saturated so they read on clay.
const SPECS: Record<Denomination, MoneySpec> = {
  1: { denom: 1, kind: 'coin', color: 0xc9a227, radius: 0.42, thickness: 0.16 }, // gold ₪1
  2: { denom: 2, kind: 'coin', color: 0xb8b8c0, radius: 0.5, thickness: 0.18 }, // silver ₪2
  5: { denom: 5, kind: 'coin', color: 0x9a9aa2, radius: 0.58, thickness: 0.22 }, // bigger silver ₪5
  10: { denom: 10, kind: 'coin', color: 0xb87333, radius: 0.66, thickness: 0.2 }, // bronze ₪10
  20: { denom: 20, kind: 'bill', color: 0xc25a2b, width: 1.7, depth: 0.95, thickness: 0.05 }, // orange ₪20 note
  50: { denom: 50, kind: 'bill', color: 0x2e8b57, width: 1.8, depth: 1.0, thickness: 0.05 }, // green ₪50 note
};

const TRAY_COLOR = 0x7a5230; // warm market-wood tray
const COLUMN_GAP = 1.7; // x-distance between denomination columns on the tray
const STACK_GAP = 0.02; // tiny gap between stacked pieces
const FLOOR_Y = 0.0; // tray surface (pieces sit on top)

interface ColumnView {
  denom: Denomination;
  spec: MoneySpec;
  x: number;
  group: THREE.Group;
  geo: THREE.BufferGeometry;
  mat: THREE.MeshStandardMaterial;
  pitch: number; // vertical step when stacking this piece kind
}

export const moneyShopGame: Game3D = {
  meta: {
    id: 'money-shop',
    i18nKey: 'games3d.moneyShop',
    topic: 'arithmetic',
    difficulty: 2,
    gradeRange: [2, 4],
    estimatedSeconds: 120,
    supportedModes: ['practice', 'quiz'],
  },
  init(ctx) {
    // Orbit slightly above the tray so the stacks have depth and the pile reads.
    ctx.presets.camera.orbit(new THREE.Vector3(0, 0.8, 0), 11);

    const clayLook = applyClayLook(ctx, {
      topColor: '#f2e0c2',
      bottomColor: '#e7d3a8',
      ground: true,
      shadowArea: 11,
      fog: false,
    });

    const generator = createMoneyShopGenerator();
    const quiz =
      ctx.mode === 'quiz'
        ? createQuizController(generator, { length: QUIZ_LENGTH, pointsPerCorrect: POINTS_PER_CORRECT })
        : null;

    // ---- Tween tracking (no tween outlives its target) ----
    const liveTweens = new Set<Tween<{ s: number } | { t: number }>>();
    function track(t: Tween<{ s: number }> | Tween<{ t: number }>): void {
      liveTweens.add(t as Tween<{ s: number } | { t: number }>);
    }
    function stopAllTweens(): void {
      liveTweens.forEach((t) => t.stop());
      liveTweens.clear();
    }

    // ---- Shared, reused resources: ONE geometry + material per denomination ----
    // (one cylinder geo per coin size, one rounded-rect geo per bill). Adding /
    // removing pieces only adds/removes Meshes that reference these — never
    // allocates a new geometry/material per piece, so it can't leak.
    const columns: Record<Denomination, ColumnView> = {} as Record<Denomination, ColumnView>;

    const sceneRoot = new THREE.Group();
    ctx.scene.add(sceneRoot);

    // Wooden tray base under all columns (frames the payment area, catches shadow).
    const trayW = COLUMN_GAP * (DENOMINATIONS.length - 1) + 2.4;
    const trayGeo = roundedBox(trayW, 0.3, 3.0, 0.18, 3);
    const trayMat = new THREE.MeshStandardMaterial({ color: TRAY_COLOR, roughness: 0.9, metalness: 0.03 });
    const tray = new THREE.Mesh(trayGeo, trayMat);
    tray.position.set(0, -0.16, 0);
    tray.receiveShadow = true;
    tray.castShadow = true;
    sceneRoot.add(tray);

    // Build one column per denomination, left→right in ascending value.
    DENOMINATIONS.forEach((denom, i) => {
      const spec = SPECS[denom];
      const x = -((DENOMINATIONS.length - 1) * COLUMN_GAP) / 2 + i * COLUMN_GAP;
      const geo =
        spec.kind === 'coin'
          ? new THREE.CylinderGeometry(spec.radius!, spec.radius!, spec.thickness, 28)
          : roundedBox(spec.width!, spec.thickness, spec.depth!, 0.04, 2);
      const mat = new THREE.MeshStandardMaterial({
        color: spec.color,
        roughness: spec.kind === 'coin' ? 0.35 : 0.8,
        metalness: spec.kind === 'coin' ? 0.7 : 0.05,
      });
      const group = new THREE.Group();
      group.position.x = x;
      sceneRoot.add(group);
      columns[denom] = { denom, spec, x, group, geo, mat, pitch: spec.thickness + STACK_GAP };
    });

    const first = quiz ? quiz.state().current : generator.next();
    const state = {
      problem: first as MoneyShopProblem,
      counts: emptyTray(),
      streak: 0,
      answered: 0,
    };

    function showPrompt(): void {
      // TASK ONLY — never echoes the running total (the pile shows progress).
      // Keep the digits LTR even under RTL by isolating the amount.
      ctx.prompt.set(ctx.t('moneyShop.prompt', { amount: state.problem.target }));
    }

    function showStatus(): void {
      if (quiz) {
        ctx.status.set({ streak: state.streak, progress: { current: state.answered, total: QUIZ_LENGTH } });
      } else {
        ctx.status.set({
          streak: state.streak,
          stars: Math.min(3, Math.floor(state.streak / 3)),
          maxStars: 3,
        });
      }
    }

    /** Y-center of the n-th (0-based) stacked piece in a column. */
    function pieceY(column: ColumnView, n: number): number {
      return FLOOR_Y + column.spec.thickness / 2 + n * column.pitch;
    }

    /**
     * Rebuild every piece in one column to match `state.counts[denom]`. Pieces at
     * index ≥ prevCount pop in (newly placed); existing ones snap to place. All
     * pieces reuse the column's single shared geo + material.
     */
    function rebuildColumn(column: ColumnView, prevCount: number, animate: boolean): void {
      column.group.clear();
      const count = state.counts[column.denom];
      let newOrdinal = 0;
      for (let i = 0; i < count; i++) {
        const piece = new THREE.Mesh(column.geo, column.mat);
        piece.position.set(0, pieceY(column, i), 0);
        // Bills alternate a tiny yaw so the stack looks hand-laid, not machined.
        if (column.spec.kind === 'bill') piece.rotation.y = (i % 2 === 0 ? 1 : -1) * 0.06;
        piece.castShadow = true;
        piece.receiveShadow = true;
        if (animate && i >= prevCount) {
          track(popIn(piece, { delay: newOrdinal * POP_STAGGER_MS }));
          newOrdinal += 1;
        }
        column.group.add(piece);
      }
    }

    /**
     * Add `delta` pieces of a denomination (delta may be negative for the −
     * button). Clamps to [0, MAX_PER_DENOM]; below zero / above cap is ignored.
     */
    function changeDenom(denom: Denomination, delta: number): void {
      const column = columns[denom];
      const prevCount = state.counts[denom];
      const next = prevCount + delta;
      if (next < 0 || next > MAX_PER_DENOM) return;
      state.counts = { ...state.counts, [denom]: next };
      rebuildColumn(column, prevCount, true);
      showPrompt();
    }

    function setControls(): void {
      const buttons: ControlButton[] = [];
      for (const denom of DENOMINATIONS) {
        // Label literally with the ₪ glyph + number (reads across all locales).
        buttons.push({ id: `d${denom}-dec`, label: `₪${denom} −`, onPress: () => changeDenom(denom, -1) });
        buttons.push({ id: `d${denom}-inc`, label: `₪${denom} +`, onPress: () => changeDenom(denom, 1) });
      }
      buttons.push({ id: 'reset', label: ctx.t('controls.reset'), variant: 'reset', onPress: resetTray });
      buttons.push({ id: 'check', label: ctx.t('controls.check'), variant: 'confirm', onPress: confirm });
      ctx.controls.set(buttons);
    }

    function rebuildAll(prev: TrayCounts, animate: boolean): void {
      for (const denom of DENOMINATIONS) rebuildColumn(columns[denom], prev[denom], animate);
    }

    function resetTray(): void {
      const prev = state.counts;
      state.counts = emptyTray();
      rebuildAll(prev, false);
      showPrompt();
    }

    function startNewProblem(): void {
      const prev = state.counts;
      state.counts = emptyTray();
      rebuildAll(prev, false);
      showPrompt();
      showStatus();
    }

    function onCorrect(): void {
      ctx.audio.play('success');
      ctx.feedback.correct(ctx.t('moneyShop.correct', { amount: state.problem.target }));
      for (const denom of DENOMINATIONS) track(punch(columns[denom].group, 0.16));
      celebrate();
    }

    function onWrong(): void {
      ctx.audio.play('fail');
      ctx.feedback.wrong(ctx.t('moneyShop.wrong'));
      for (const denom of DENOMINATIONS) track(shake(columns[denom].group, 0.06, 280));
    }

    function buildAnswer(): MoneyShopAnswer {
      return { counts: { ...state.counts }, total: trayTotal(state.counts) };
    }

    function confirm(): void {
      const answer = buildAnswer();
      const ok = generator.check(state.problem, answer);

      if (quiz) {
        if (ok) {
          state.streak += 1;
          onCorrect();
        } else {
          state.streak = 0;
          onWrong();
        }
        quiz.submit(answer);
        const qs = quiz.state();
        state.answered = qs.index;
        ctx.score.set(qs.score);
        if (qs.finished) {
          const summary = quiz.summary();
          const stars = computeStars(summary.accuracy);
          ctx.status.set({
            stars,
            maxStars: 3,
            streak: state.streak,
            progress: { current: QUIZ_LENGTH, total: QUIZ_LENGTH },
          });
          bigCelebrate();
          ctx.complete(summary);
          return;
        }
        state.problem = qs.current;
        startNewProblem();
        return;
      }

      // Practice: correct → score + next; wrong → KEEP the tray so the child fixes it.
      if (ok) {
        state.streak += 1;
        onCorrect();
        ctx.score.add(POINTS_PER_CORRECT);
        if (state.streak > 0 && state.streak % 3 === 0) bigCelebrate();
        state.problem = generator.next();
        startNewProblem();
      } else {
        state.streak = 0;
        onWrong();
        showStatus();
      }
    }

    // Drag = fast pay. Dragging UP adds a ₪1 coin per upward notch (natural: up =
    // more, never inverted); dragging down removes one ₪1 coin. Keeps the simplest
    // mapping per the design (₪1 on drag); precise control is the −/+ buttons.
    let lastDragY = 0;
    const offDragStart = ctx.input.on('dragStart', (p) => {
      lastDragY = p.y;
    });
    const offDrag = ctx.input.on('drag', (p) => {
      const dy = p.y - lastDragY; // NDC: +y is up
      if (dy > 0.08) {
        changeDenom(1, 1);
        lastDragY = p.y;
      } else if (dy < -0.08) {
        changeDenom(1, -1);
        lastDragY = p.y;
      }
    });
    // dragEnd is a secondary submit path; the בדוק button is the primary one.
    const offDragEnd = ctx.input.on('dragEnd', confirm);

    startNewProblem();
    setControls();
    showStatus();

    return {
      onResize() {},
      dispose() {
        offDragStart();
        offDrag();
        offDragEnd();
        stopAllTweens();
        ctx.controls.clear();
        ctx.prompt.clear();
        ctx.status.clear();
        clayLook.dispose();

        for (const denom of DENOMINATIONS) columns[denom].group.clear();
        sceneRoot.clear(); // detach ALL children (column groups + tray)
        ctx.scene.remove(sceneRoot);

        // Dispose every geometry + material we created (one per denomination + tray).
        for (const denom of DENOMINATIONS) {
          columns[denom].geo.dispose();
          columns[denom].mat.dispose();
        }
        trayGeo.dispose();
        trayMat.dispose();
      },
    };
  },
};
