import * as THREE from 'three';
import type { Tween } from '@tweenjs/tween.js';
import type { ControlButton, Game3D } from '@/lib/games3d/types';
import { createQuizController } from '@/lib/games3d/quiz/controller';
import {
  applyClayLook,
  roundedBox,
  popIn,
  punch,
  shake,
  celebrate,
  bigCelebrate,
  computeStars,
  PALETTE,
} from '@/lib/games3d/kit';
import {
  createLongDivisionTowerGenerator,
  quotientOf,
  remainderOf,
  type LongDivisionTowerProblem,
} from './problems';

// Theme: a CONSTRUCTION SITE block-stacking game. A pool of `n` loose unit blocks
// sits on a low platform at the front; behind it stand `d` empty tower bases
// (columns). The child decides how many blocks go in EACH tower with the −/+
// buttons (incrementing lifts ONE block onto EVERY tower at once — equal sharing)
// or by dragging UP. As the per-tower height rises, perTower·d blocks move from
// the pool into the towers (equal heights); the leftover n − perTower·d blocks
// stay in the pool as the visible remainder. Sharing MORE than the blocks allow
// (perTower·d > n) is invalid — the towers flash RED. The goal: stack the towers
// as high as they can go EQUALLY — i.e. find the quotient; what's left stays in
// the pool. בדוק grades perTower against floor(n / d). The prompt shows ONLY the
// task.
//
// Camera convention: a locked camera straight in front of the XY plane looking at
// the content center, so screen-up is +Y. Dragging UP raises the per-tower height
// (natural: up = taller towers); never inverted. Distance is sized PER PROBLEM so
// both the d towers (up to quotient+1 tall) and the pool fit with margin.

const QUIZ_LENGTH = 10;
const POINTS_PER_CORRECT = 10;

// Block + tower layout (procedural, in the XY plane facing the camera at z≈0).
const BLOCK = 0.9; // unit cube edge
const BLOCK_GAP = 0.06; // tiny gap so a stack reads as discrete cubes
const BLOCK_STEP = BLOCK + BLOCK_GAP; // vertical pitch of stacked cubes
const TOWER_GAP = 0.7; // gap between adjacent tower columns
const TOWER_PITCH = BLOCK + TOWER_GAP; // x-distance between tower centers
const BASE_H = 0.3; // tower base pad thickness
const BASE_TOP_Y = BASE_H; // y of the top of a base pad (first cube sits here)
const POOL_ROW = 6; // blocks per row in the loose pool
const POOL_Y = BLOCK / 2; // pool blocks rest on the platform top
const POOL_GAP_BELOW = 1.4; // gap between the pool platform and the tower bases

// Construction palette: SATURATED amber tower blocks (high contrast on light
// clay), a cooler steel-blue for the loose POOL blocks so the two groups read as
// distinct, dark concrete bases/platform for in-scene contrast, and a red flash
// material reused when the child over-shares.
const TOWER_BLOCK_COLOR = 0xf2960c; // saturated amber/orange — strong on light clay
const POOL_BLOCK_COLOR = PALETTE.sky; // cool steel-blue loose blocks (distinct from towers)
const BASE_COLOR = 0x37424d; // dark concrete tower base
const PLATFORM_COLOR = 0x2c343c; // darker concrete pool platform
const INVALID_COLOR = 0xd23b3b; // red flash when over-shared (not enough blocks)

export const longDivisionTowerGame: Game3D = {
  meta: {
    id: 'long-division-tower',
    i18nKey: 'games3d.longDivision',
    topic: 'arithmetic',
    difficulty: 3,
    gradeRange: [3, 5],
    estimatedSeconds: 100,
    supportedModes: ['practice', 'quiz'],
  },
  init(ctx) {
    const generator = createLongDivisionTowerGenerator();
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

    // ---- Shared, reused resources (ONE geometry + material per kind) ----
    // A SINGLE cube geometry is reused for ALL n blocks (towers + pool) — never
    // n separate geometries. Per the spec's per-element budget.
    const cubeGeo = roundedBox(BLOCK, BLOCK, BLOCK, 0.1, 2);
    const towerBlockMat = new THREE.MeshStandardMaterial({
      color: TOWER_BLOCK_COLOR,
      roughness: 0.6,
      metalness: 0.05,
    });
    const poolBlockMat = new THREE.MeshStandardMaterial({
      color: POOL_BLOCK_COLOR,
      roughness: 0.55,
      metalness: 0.06,
    });
    const invalidMat = new THREE.MeshStandardMaterial({
      color: INVALID_COLOR,
      roughness: 0.6,
      metalness: 0.05,
    });
    // Base pads are unit cubes scaled per width (one geometry, one material).
    const baseGeo = roundedBox(1, BASE_H, 1, 0.06, 2);
    const baseMat = new THREE.MeshStandardMaterial({ color: BASE_COLOR, roughness: 0.9, metalness: 0.04 });
    const platformGeo = roundedBox(1, 0.24, 1, 0.08, 2);
    const platformMat = new THREE.MeshStandardMaterial({ color: PLATFORM_COLOR, roughness: 0.92, metalness: 0.03 });

    // ---- Scene groups ----
    const root = new THREE.Group();
    ctx.scene.add(root);
    const baseGroup = new THREE.Group(); // tower base pads
    const towerGroup = new THREE.Group(); // d tower sub-groups (each a stack of cubes)
    const poolGroup = new THREE.Group(); // platform + loose remainder blocks
    root.add(baseGroup);
    root.add(towerGroup);
    root.add(poolGroup);

    // Per-tower stack groups, rebuilt when d changes. popIn/punch target these
    // GROUPS (uniform scale on a group is harmless), never the height-bearing cubes.
    const towerStacks: THREE.Group[] = [];
    let poolBlocksGroup: THREE.Group | null = null;

    const first = quiz ? quiz.state().current : generator.next();
    const state = {
      problem: first as LongDivisionTowerProblem,
      perTower: 0, // start at 0 — never equals the quotient (>=1), so never pre-solved
      streak: 0,
      answered: 0,
    };

    /** Correct per-tower height = floor(n / d). */
    function quotient(): number {
      return quotientOf(state.problem);
    }
    /**
     * Max per-tower the child can dial in: quotient + 1, so OVER-sharing by one is
     * reachable (a genuine wrong answer) and shown as invalid (red). Clamp ceiling.
     */
    function maxPerTower(): number {
      return quotient() + 1;
    }
    /** Is the current perTower over-shared (needs more blocks than the pool holds)? */
    function isOverShared(): boolean {
      return state.perTower * state.problem.d > state.problem.n;
    }

    /** x-center of tower i (0-based) for d towers, centered at the origin. */
    function towerX(i: number, d: number): number {
      const span = (d - 1) * TOWER_PITCH;
      return -span / 2 + i * TOWER_PITCH;
    }

    /** Build (or rebuild) the d tower bases + empty stacks for the current problem. */
    function buildTowers(): void {
      baseGroup.clear();
      towerGroup.clear();
      towerStacks.length = 0;
      const d = state.problem.d;
      for (let i = 0; i < d; i++) {
        const x = towerX(i, d);

        const base = new THREE.Mesh(baseGeo, baseMat);
        base.scale.set(BLOCK + 0.18, 1, BLOCK + 0.18);
        base.position.set(x, BASE_H / 2, 0);
        base.castShadow = true;
        base.receiveShadow = true;
        baseGroup.add(base);

        const stack = new THREE.Group();
        stack.position.set(x, BASE_TOP_Y, 0);
        towerGroup.add(stack);
        towerStacks.push(stack);
      }
    }

    /** Build (or rebuild) the loose-block POOL platform below the towers. */
    function buildPool(): void {
      poolGroup.clear();
      const d = state.problem.d;
      const n = state.problem.n;
      // Platform wide enough for the towers above and the pooled blocks below.
      const poolCols = Math.min(POOL_ROW, Math.max(d, n > 0 ? Math.min(n, POOL_ROW) : 1));
      const platW = Math.max((d - 1) * TOWER_PITCH + BLOCK + 0.6, poolCols * BLOCK_STEP + 0.6);
      const platform = new THREE.Mesh(platformGeo, platformMat);
      platform.scale.set(platW, 1, BLOCK + 0.6);
      platform.position.set(0, poolPlatformY() - 0.12, 0);
      platform.receiveShadow = true;
      platform.castShadow = true;
      poolGroup.add(platform);

      const blocks = new THREE.Group();
      blocks.position.set(0, poolPlatformY(), 0);
      poolGroup.add(blocks);
      poolBlocksGroup = blocks;
    }

    /** World y of the pool platform TOP (the towers' bases sit at y=0..BASE_H above it). */
    function poolPlatformY(): number {
      // Bases occupy y=0..BASE_H; the pool sits a gap below the bases.
      return -POOL_GAP_BELOW;
    }

    /**
     * Render the blocks: `perTower` cubes stacked in EACH tower (amber), and the
     * leftover cubes (n − perTower·d, clamped at 0) loose in the pool (blue). When
     * over-shared (perTower·d > n) the towers turn RED to signal "not enough
     * blocks". Reuses the ONE shared cube geometry; cleared/refilled each rebuild.
     */
    function renderBlocks(animateNew: boolean): void {
      const d = state.problem.d;
      const perTower = state.perTower;
      const over = isOverShared();
      const mat = over ? invalidMat : towerBlockMat;

      for (let i = 0; i < towerStacks.length; i++) {
        const stack = towerStacks[i];
        const prev = stack.children.length;
        stack.clear();
        for (let c = 0; c < perTower; c++) {
          const cube = new THREE.Mesh(cubeGeo, mat);
          cube.position.set(0, c * BLOCK_STEP + BLOCK / 2, 0);
          cube.castShadow = true;
          cube.receiveShadow = true;
          stack.add(cube);
          // popIn the UNIFORM cube (its scale is never set non-uniformly), safe.
          if (animateNew && !over && c >= prev) track(popIn(cube, { delay: c * 8, scale: 1 }));
        }
      }

      // Pool: leftover loose blocks (0 when over-shared — all "used up" + invalid).
      const leftover = Math.max(0, state.problem.n - perTower * d);
      if (poolBlocksGroup) {
        poolBlocksGroup.clear();
        for (let c = 0; c < leftover; c++) {
          const cube = new THREE.Mesh(cubeGeo, poolBlockMat);
          const col = c % POOL_ROW;
          const row = Math.floor(c / POOL_ROW);
          const rowCount = Math.min(POOL_ROW, leftover - row * POOL_ROW);
          const rowSpan = (rowCount - 1) * BLOCK_STEP;
          cube.position.set(col * BLOCK_STEP - rowSpan / 2, POOL_Y + row * BLOCK_STEP, 0);
          cube.castShadow = true;
          cube.receiveShadow = true;
          poolBlocksGroup.add(cube);
        }
      }
    }

    /** Frame the camera PER PROBLEM so the towers (up to quotient+1 tall) + pool fit. */
    function frameCamera(): void {
      const d = state.problem.d;
      const towersTopY = BASE_TOP_Y + maxPerTower() * BLOCK_STEP; // tallest reachable
      const poolBottomY = poolPlatformY() - BLOCK; // a touch below the pool
      const contentH = towersTopY - poolBottomY;
      const contentW = (d - 1) * TOWER_PITCH + BLOCK + 1.0;
      const centerY = (towersTopY + poolBottomY) / 2;
      // Fit both height and width into a 60° vertical FOV at ~1.4 aspect.
      const fovV = (60 * Math.PI) / 180;
      const aspect = ctx.camera.aspect;
      const distForH = contentH / 2 / Math.tan(fovV / 2);
      const distForW = contentW / 2 / (Math.tan(fovV / 2) * aspect);
      const dist = Math.max(distForH, distForW) * 1.18 + 1.5; // margin
      ctx.presets.camera.locked(
        new THREE.Vector3(0, centerY, dist),
        new THREE.Vector3(0, centerY, 0)
      );
    }

    /** Set the per-tower height, clamped to 0..quotient+1, then re-render. */
    function setPerTower(value: number, animate: boolean): void {
      const clamped = Math.max(0, Math.min(maxPerTower(), value));
      const changed = clamped !== state.perTower;
      state.perTower = clamped;
      renderBlocks(animate && changed);
      showStatus();
    }

    function showPrompt(): void {
      // TASK ONLY — the target counts (n blocks + d towers), never the live
      // per-tower height or whether it's correct. The 3D scene shows progress.
      ctx.prompt.set(ctx.t('longDivision.prompt', { n: state.problem.n, d: state.problem.d }));
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

    function setControls(): void {
      const valueLabel = ctx.t('controls.value');
      const buttons: ControlButton[] = [
        {
          id: 'per-dec',
          label: `${valueLabel} −`,
          onPress: () => setPerTower(state.perTower - 1, true),
        },
        {
          id: 'per-inc',
          label: `${valueLabel} +`,
          onPress: () => setPerTower(state.perTower + 1, true),
        },
        { id: 'reset', label: ctx.t('controls.reset'), variant: 'reset', onPress: () => setPerTower(0, true) },
        { id: 'check', label: ctx.t('controls.check'), variant: 'confirm', onPress: confirm },
      ];
      ctx.controls.set(buttons);
    }

    function startNewProblem(): void {
      buildTowers();
      buildPool();
      frameCamera();
      setPerTower(0, false); // restart at 0 each problem (never pre-solved)
      // popIn the bases + platform via their groups (uniform group scale, safe).
      track(popIn(baseGroup, { scale: 1 }));
      track(popIn(poolGroup, { scale: 1 }));
      renderBlocks(false);
      showPrompt();
      showStatus();
    }

    function onCorrect(): void {
      ctx.audio.play('success');
      ctx.feedback.correct(
        ctx.t('longDivision.correct', {
          perTower: quotient(),
          remainder: remainderOf(state.problem),
        })
      );
      // Punch each tower STACK group (uniform scale on the group — safe).
      for (const stack of towerStacks) track(punch(stack, 0.16));
      celebrate();
    }

    function onWrong(): void {
      ctx.audio.play('fail');
      ctx.feedback.wrong(ctx.t('longDivision.wrong'));
      for (const stack of towerStacks) track(shake(stack, 0.07, 280));
    }

    function confirm(): void {
      const answer = state.perTower;
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

      // Practice: correct → score + next problem; wrong → KEEP the towers to fix.
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

    /**
     * Drag = fast equal-stacking. Map the pointer's vertical NDC (−1 bottom → +1
     * top) to the per-tower height in 0..quotient+1. Dragging UP raises every
     * tower (natural: up = taller); never inverted. The locked front camera keeps
     * NDC-y → world-y monotonic.
     */
    function pointerToPerTower(ndcY: number): number {
      const max = maxPerTower();
      const t = (ndcY + 1) / 2; // 0..1, bottom→top
      return Math.max(0, Math.min(max, Math.round(t * max)));
    }
    const offDrag = ctx.input.on('drag', (p) => {
      setPerTower(pointerToPerTower(p.y), true);
    });
    // dragEnd is a SECONDARY submit path; the בדוק button is the primary one.
    const offDragEnd = ctx.input.on('dragEnd', confirm);

    // Construction-site ambience. Ground disabled — content (bases at y≥0, pool a
    // gap below) is framed by the gradient backdrop + the engine's soft shadow;
    // a clay ground plane at y≈0 would occlude the pool below it.
    const clayLook = applyClayLook(ctx, {
      topColor: '#cfe0ee',
      bottomColor: '#efe2c6',
      ground: false,
      shadowArea: 12,
      fog: false,
    });

    // Initial build.
    buildTowers();
    buildPool();
    frameCamera();
    setPerTower(0, false);
    // popIn the static props via their GROUPS (uniform group scale is harmless).
    track(popIn(baseGroup, { scale: 1 }));
    track(popIn(poolGroup, { scale: 1 }));
    renderBlocks(false);
    showPrompt();
    setControls();
    showStatus();

    return {
      onResize() { frameCamera(); },
      dispose() {
        offDrag();
        offDragEnd();
        stopAllTweens();
        ctx.controls.clear();
        ctx.prompt.clear();
        ctx.status.clear();
        clayLook.dispose();

        baseGroup.clear();
        towerGroup.clear();
        poolGroup.clear();
        towerStacks.length = 0;
        poolBlocksGroup = null;
        root.clear();
        ctx.scene.remove(root);

        cubeGeo.dispose();
        towerBlockMat.dispose();
        poolBlockMat.dispose();
        invalidMat.dispose();
        baseGeo.dispose();
        baseMat.dispose();
        platformGeo.dispose();
        platformMat.dispose();
      },
    };
  },
};
