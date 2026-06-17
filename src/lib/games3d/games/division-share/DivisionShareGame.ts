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
} from '@/lib/games3d/kit';
import { lockedCameraFrame } from '@/lib/games3d/kit/camera';
import {
  createDivisionShareGenerator,
  quotientOf,
  remainderOf,
  type DivisionShareProblem,
} from './problems';

// Theme: a PIRATE COVE treasure split. A row of K wooden treasure CHESTS sits in
// front of the viewer; the child decides how many gold coins go in EACH chest
// with the −/+ buttons (incrementing drops one coin into EVERY chest at once —
// equal sharing). Coins that cannot be shared evenly pile into a separate
// REMAINDER pouch/cup on the right. The goal: share as MANY coins as possible
// equally — i.e. find the quotient; what's left over stays in the cup. בדוק
// grades perChest against floor(total / k). The prompt shows ONLY the task.
//
// Camera convention: a locked camera straight in front of the XY plane looking at
// the origin, so screen-up is +Y. Dragging UP raises the per-chest count
// (natural: up = more coins per chest); never inverted.

const QUIZ_LENGTH = 10;
const POINTS_PER_CORRECT = 10;

// Layout (procedural, in the XY plane facing the camera at z≈0).
const CHEST_W = 1.7; // chest body width
const CHEST_H = 1.1; // chest body height
const CHEST_D = 1.1; // chest depth
const CHEST_GAP = 0.55; // gap between adjacent chests
const COIN_RADIUS = 0.34;
const COIN_THICK = 0.16;
const COIN_GAP = 0.04; // vertical gap so a stack reads as discrete coins
const COIN_STEP = COIN_THICK + COIN_GAP;
const CHEST_LIP_Y = CHEST_H / 2; // coins stack up from the chest's open top
const CHEST_BASE_Y = 0.0; // chest centers sit on the y-axis (above ground at y≈0)
const CUP_X_MARGIN = 1.7; // how far the remainder cup sits past the last chest

// Pirate palette: saturated GOLD coins (high contrast on the light clay
// background), dark walnut chests with a warm brass trim, a deep canvas pouch.
const GOLD_COLOR = 0xf2b705; // saturated gold — reads strongly on light clay
const CHEST_COLOR = 0x5b3a1e; // dark walnut wood
const CHEST_LID_COLOR = 0x6f4a26; // slightly lighter lid
const TRIM_COLOR = 0xc9962b; // brass trim band
const CUP_COLOR = 0x7a4a2a; // canvas/leather remainder pouch
const LABEL_DARK = 0x2a1a0c; // dark base for in-scene contrast

export const divisionShareGame: Game3D = {
  meta: {
    id: 'division-share',
    i18nKey: 'games3d.divisionShare',
    topic: 'arithmetic',
    difficulty: 2,
    gradeRange: [3, 4],
    estimatedSeconds: 120,
    supportedModes: ['practice', 'quiz'],
  },
  init(ctx) {
    // Front-facing locked camera so screen-up is +Y and drag-up = more coins.
    // Distance sized to frame up to 6 chests in a row (the widest case) plus the
    // remainder cup, with a little margin.
    function reframe() {
      const { position, lookAt } = lockedCameraFrame(6, 1.2, ctx.camera.aspect);
      ctx.presets.camera.locked(position, lookAt);
    }
    reframe();

    // Pirate-cove ambience. Ground disabled — the chests "sit" framed by the
    // gradient backdrop and the engine's soft shadow (content stays above y=0).
    const clayLook = applyClayLook(ctx, {
      topColor: '#cfe6f2',
      bottomColor: '#e9d8b4',
      ground: false,
      shadowArea: 11,
      fog: false,
    });

    const generator = createDivisionShareGenerator();
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

    // ---- Shared, reused resources (one geometry + material per kind) ----
    const chestBodyGeo = roundedBox(CHEST_W, CHEST_H, CHEST_D, 0.12, 3);
    const chestBodyMat = new THREE.MeshStandardMaterial({ color: CHEST_COLOR, roughness: 0.85, metalness: 0.05 });
    const chestLidGeo = roundedBox(CHEST_W, 0.28, CHEST_D, 0.12, 3);
    const chestLidMat = new THREE.MeshStandardMaterial({ color: CHEST_LID_COLOR, roughness: 0.8, metalness: 0.05 });
    const trimGeo = roundedBox(CHEST_W + 0.04, 0.16, CHEST_D + 0.04, 0.05, 2);
    const trimMat = new THREE.MeshStandardMaterial({ color: TRIM_COLOR, roughness: 0.4, metalness: 0.55 });

    // One coin geometry reused for every coin (chests + cup). A flat gold disc.
    const coinGeo = new THREE.CylinderGeometry(COIN_RADIUS, COIN_RADIUS, COIN_THICK, 22);
    const coinMat = new THREE.MeshStandardMaterial({ color: GOLD_COLOR, roughness: 0.35, metalness: 0.6 });

    // Remainder cup: an open leather pouch (a short wide cylinder shell look via a
    // rounded box) sitting to the right of the chests.
    const cupGeo = roundedBox(1.5, 1.0, 1.2, 0.3, 3);
    const cupMat = new THREE.MeshStandardMaterial({ color: CUP_COLOR, roughness: 0.95, metalness: 0.02 });
    const cupBaseGeo = roundedBox(1.7, 0.18, 1.4, 0.08, 2);
    const cupBaseMat = new THREE.MeshStandardMaterial({ color: LABEL_DARK, roughness: 0.9, metalness: 0.04 });

    // ---- Scene groups ----
    // chestsGroup holds K chest sub-groups; coinsGroup holds the per-chest coin
    // stacks; cupGroup holds the remainder pouch + its coins.
    const root = new THREE.Group();
    ctx.scene.add(root);
    const chestsGroup = new THREE.Group();
    const coinsGroup = new THREE.Group();
    const cupGroup = new THREE.Group();
    root.add(chestsGroup);
    root.add(coinsGroup);
    root.add(cupGroup);

    // Per-chest containers, rebuilt when k changes. Each entry: the chest body
    // group (for punch/shake) and the coin stack group (cleared/refilled).
    const chestNodes: Array<{ chest: THREE.Group; stack: THREE.Group }> = [];
    let cupCoins: THREE.Group | null = null;

    const first = quiz ? quiz.state().current : generator.next();
    const state = {
      problem: first as DivisionShareProblem,
      perChest: 0, // start at 0 — never equals the quotient (>=1), so never pre-solved
      streak: 0,
      answered: 0,
    };

    /** Max coins that can be placed per chest = floor(total / k) (clamp ceiling). */
    function maxPerChest(): number {
      return quotientOf(state.problem);
    }

    /** Total x-extent of K chests so we can center them at the origin. */
    function chestSpan(k: number): number {
      return k * CHEST_W + (k - 1) * CHEST_GAP;
    }
    function chestX(i: number, k: number): number {
      const span = chestSpan(k);
      return -span / 2 + CHEST_W / 2 + i * (CHEST_W + CHEST_GAP);
    }

    /** Build (or rebuild) K chests + the remainder cup for the current problem. */
    function buildChests(): void {
      // Clear previous chests/coins/cup.
      chestsGroup.clear();
      coinsGroup.clear();
      cupGroup.clear();
      chestNodes.length = 0;

      const k = state.problem.k;
      for (let i = 0; i < k; i++) {
        const x = chestX(i, k);
        const chest = new THREE.Group();
        chest.position.set(x, CHEST_BASE_Y, 0);

        const body = new THREE.Mesh(chestBodyGeo, chestBodyMat);
        body.position.y = 0;
        body.castShadow = true;
        body.receiveShadow = true;
        chest.add(body);

        const trim = new THREE.Mesh(trimGeo, trimMat);
        trim.position.y = 0;
        chest.add(trim);

        // Open lid tilted back behind the chest so coins drop in from the top.
        const lid = new THREE.Mesh(chestLidGeo, chestLidMat);
        lid.position.set(0, CHEST_H / 2 + 0.05, -CHEST_D / 2 + 0.1);
        lid.rotation.x = -0.9;
        lid.castShadow = true;
        chest.add(lid);

        chestsGroup.add(chest);

        const stack = new THREE.Group();
        stack.position.set(x, CHEST_BASE_Y + CHEST_LIP_Y, 0);
        coinsGroup.add(stack);

        chestNodes.push({ chest, stack });
        track(popIn(chest, { delay: i * 30, scale: 1 }));
      }

      // Remainder cup just past the last chest on the right.
      const cupX = chestSpan(k) / 2 + CUP_X_MARGIN;
      const cup = new THREE.Group();
      cup.position.set(cupX, CHEST_BASE_Y - 0.05, 0);
      const cupBody = new THREE.Mesh(cupGeo, cupMat);
      cupBody.castShadow = true;
      cupBody.receiveShadow = true;
      cup.add(cupBody);
      const cupBase = new THREE.Mesh(cupBaseGeo, cupBaseMat);
      cupBase.position.y = -0.55;
      cup.add(cupBase);
      cupGroup.add(cup);

      const cc = new THREE.Group();
      cc.position.set(cupX, CHEST_BASE_Y - 0.05 + 0.45, 0);
      cupGroup.add(cc);
      cupCoins = cc;
      track(popIn(cup, { scale: 1 }));
    }

    /**
     * Render the coins: `perChest` coins stacked in EACH chest, and the leftover
     * coins (total − perChest·k) piled in the remainder cup. Reuses the shared
     * coin geometry/material; meshes are cheap and fully cleared each rebuild.
     */
    function renderCoins(animateNew: boolean): void {
      const k = state.problem.k;
      const perChest = state.perChest;

      for (let i = 0; i < chestNodes.length; i++) {
        const { stack } = chestNodes[i];
        const prev = stack.children.length;
        stack.clear();
        for (let c = 0; c < perChest; c++) {
          const coin = new THREE.Mesh(coinGeo, coinMat);
          // Stack upward from the chest lip; tiny x/z jitter for a loose-pile feel.
          const jitterX = ((c * 37) % 7 - 3) * 0.03;
          const jitterZ = ((c * 53) % 5 - 2) * 0.04;
          coin.position.set(jitterX, c * COIN_STEP + COIN_THICK / 2, jitterZ);
          coin.castShadow = true;
          stack.add(coin);
          if (animateNew && c >= prev) track(popIn(coin, { delay: c * 8, scale: 1 }));
        }
      }

      // Remainder cup: leftover coins.
      const leftover = state.problem.total - perChest * k;
      if (cupCoins) {
        cupCoins.clear();
        for (let c = 0; c < leftover; c++) {
          const coin = new THREE.Mesh(coinGeo, coinMat);
          // Loose heap in the cup (two-wide so a big remainder doesn't tower).
          const col = c % 2 === 0 ? -0.22 : 0.22;
          const row = Math.floor(c / 2);
          coin.position.set(col, row * COIN_STEP + COIN_THICK / 2, ((c * 17) % 5 - 2) * 0.04);
          coin.castShadow = true;
          cupCoins.add(coin);
        }
      }
    }

    /** Set the per-chest amount, clamped to 0..floor(total/k), then re-render. */
    function setPerChest(value: number, animate: boolean): void {
      const clamped = Math.max(0, Math.min(maxPerChest(), value));
      const changed = clamped !== state.perChest;
      state.perChest = clamped;
      renderCoins(animate && changed);
    }

    function showPrompt(): void {
      // TASK ONLY — the target counts (total + chests), never the live per-chest
      // amount or whether it's correct. The 3D scene shows progress.
      ctx.prompt.set(
        ctx.t('divisionShare.prompt', { total: state.problem.total, k: state.problem.k })
      );
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
      const buttons: ControlButton[] = [
        {
          id: 'per-dec',
          label: `${ctx.t('controls.perChest')} −`,
          onPress: () => setPerChest(state.perChest - 1, true),
        },
        {
          id: 'per-inc',
          label: `${ctx.t('controls.perChest')} +`,
          onPress: () => setPerChest(state.perChest + 1, true),
        },
        { id: 'reset', label: ctx.t('controls.reset'), variant: 'reset', onPress: () => setPerChest(0, true) },
        { id: 'check', label: ctx.t('controls.check'), variant: 'confirm', onPress: confirm },
      ];
      ctx.controls.set(buttons);
    }

    function startNewProblem(): void {
      buildChests();
      setPerChest(0, false); // restart at 0 each problem (never pre-solved)
      showPrompt();
      showStatus();
    }

    function onCorrect(): void {
      ctx.audio.play('success');
      ctx.feedback.correct(
        ctx.t('divisionShare.correct', {
          perChest: quotientOf(state.problem),
          remainder: remainderOf(state.problem),
        })
      );
      for (const node of chestNodes) track(punch(node.chest, 0.14));
      celebrate();
    }

    function onWrong(): void {
      ctx.audio.play('fail');
      ctx.feedback.wrong(ctx.t('divisionShare.wrong'));
      for (const node of chestNodes) track(shake(node.chest, 0.06, 280));
    }

    function confirm(): void {
      const answer = state.perChest;
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

      // Practice: correct → score + next problem; wrong → KEEP the split to fix.
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
     * Drag = fast equal-sharing. Map the pointer's vertical NDC (−1 bottom → +1
     * top) to the per-chest amount in 0..floor(total/k). Dragging UP adds coins to
     * every chest (natural: up = more); never inverted. The locked front camera
     * keeps NDC-y → world-y monotonic.
     */
    function pointerToPerChest(ndcY: number): number {
      const max = maxPerChest();
      const t = (ndcY + 1) / 2; // 0..1, bottom→top
      return Math.max(0, Math.min(max, Math.round(t * max)));
    }
    const offDrag = ctx.input.on('drag', (p) => {
      setPerChest(pointerToPerChest(p.y), true);
    });
    // dragEnd is a SECONDARY submit path; the בדוק button is the primary one.
    const offDragEnd = ctx.input.on('dragEnd', confirm);

    // Initial build.
    buildChests();
    setPerChest(0, false);
    showPrompt();
    setControls();
    showStatus();

    return {
      onResize() { reframe(); },
      dispose() {
        offDrag();
        offDragEnd();
        stopAllTweens();
        ctx.controls.clear();
        ctx.prompt.clear();
        ctx.status.clear();
        clayLook.dispose();

        chestsGroup.clear();
        coinsGroup.clear();
        cupGroup.clear();
        chestNodes.length = 0;
        cupCoins = null;
        root.clear();
        ctx.scene.remove(root);

        chestBodyGeo.dispose();
        chestBodyMat.dispose();
        chestLidGeo.dispose();
        chestLidMat.dispose();
        trimGeo.dispose();
        trimMat.dispose();
        coinGeo.dispose();
        coinMat.dispose();
        cupGeo.dispose();
        cupMat.dispose();
        cupBaseGeo.dispose();
        cupBaseMat.dispose();
      },
    };
  },
};
