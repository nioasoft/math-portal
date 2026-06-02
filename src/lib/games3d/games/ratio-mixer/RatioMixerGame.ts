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
  tweenTo,
  PALETTE,
} from '@/lib/games3d/kit';
import { createRatioGenerator, MAX_AMOUNT, type RatioProblem } from './problems';

// Theme: a SMOOTHIE / JUICE BAR. Two tall measuring glasses sit side by side on
// a counter — glass A holds strawberry-red juice, glass B holds lemon-yellow
// juice. The child sets how many units of each juice with the −/+ buttons (or by
// dragging a glass up/down); the colored liquid column rises and falls so the
// live PROPORTION between the two is always visible. A mixing bowl sits between
// them. The task is a target ratio A:B (reduced, e.g. 2:3) and ANY equivalent
// mix (4:6, 6:9 …) is accepted — teaching ratio as a comparison that scales.
//
// FRAMING: two glasses centered about the origin on the X axis, a straight-on
// locked camera at (0, ~mid, D) so drag-x → world-x and drag-up → taller liquid
// are both NATURAL (never inverted). Glasses + bowl fill the central viewport.

const QUIZ_LENGTH = 10;
const POINTS_PER_CORRECT = 10;
const STEP = 1; // one juice unit per button press
const FILL_TWEEN_MS = 360; // smooth liquid rise/fall

// Glass geometry (procedural). MAX_AMOUNT units map to GLASS_H of interior height.
const GLASS_H = 5.0; // interior height = full glass (MAX_AMOUNT units)
const GLASS_RADIUS = 1.25;
const LIQUID_RADIUS = GLASS_RADIUS * 0.92; // hugs the inner wall
const GLASS_GAP = 4.2; // center-to-center spacing of the two glasses
const GLASS_X = GLASS_GAP / 2; // glass A at -GLASS_X, glass B at +GLASS_X
const BASE_Y = 0.15; // glass interior bottom sits just above the counter base

// Juice bar palette — saturated, high-contrast juices on a light counter.
const JUICE_A_COLOR = 0xe23b53; // strawberry red
const JUICE_B_COLOR = 0xf2c014; // lemon yellow
const GLASS_TINT = 0xbfe3ff; // faint blue glass
const COUNTER_COLOR = 0x8a5a3b; // warm wood counter
const BOWL_COLOR = PALETTE.cream; // pale mixing bowl between the glasses

/** Convert an integer juice amount (0..MAX) into the liquid mesh's scale.y. */
function amountToHeight(amount: number): number {
  const frac = MAX_AMOUNT > 0 ? amount / MAX_AMOUNT : 0;
  return Math.max(0.0001, frac * GLASS_H);
}

/** Map a pointer's NDC y (-1..1, up = +1) to an integer amount 0..MAX (natural). */
function pointerToAmount(ndcY: number): number {
  const t = (ndcY + 1) / 2; // 0 (bottom) .. 1 (top)
  return Math.max(0, Math.min(MAX_AMOUNT, Math.round(t * MAX_AMOUNT)));
}

export const ratioMixerGame: Game3D = {
  meta: {
    id: 'ratio-mixer',
    i18nKey: 'games3d.ratioMixer',
    topic: 'ratio',
    difficulty: 3,
    gradeRange: [5, 6],
    estimatedSeconds: 120,
    supportedModes: ['practice', 'quiz'],
  },
  init(ctx) {
    // Straight-on front view: glasses sit on the X axis centered at the origin,
    // camera looks down -Z so drag-x → world-x and drag-up → taller are natural.
    ctx.presets.camera.locked(new THREE.Vector3(0, GLASS_H / 2, 12), new THREE.Vector3(0, GLASS_H / 2, 0));

    // Juice-bar ambience: a light counter look. The glasses STAND on the counter
    // at y=0, so keep ground on at y=0 for the soft shadow under the bar.
    const clayLook = applyClayLook(ctx, {
      topColor: '#ffe6d2',
      bottomColor: '#fdf3e6',
      ground: true,
      groundY: 0,
      shadowArea: 10,
      fog: false,
    });

    const generator = createRatioGenerator();
    const quiz =
      ctx.mode === 'quiz'
        ? createQuizController(generator, { length: QUIZ_LENGTH, pointsPerCorrect: POINTS_PER_CORRECT })
        : null;

    // ---- Tween tracking (no tween outlives its target) ----
    const liveTweens = new Set<Tween<{ s: number } | { v: number } | { t: number }>>();
    function track(t: Tween<{ s: number }> | Tween<{ v: number }> | Tween<{ t: number }>): void {
      liveTweens.add(t as Tween<{ s: number } | { v: number } | { t: number }>);
    }
    function stopAllTweens(): void {
      liveTweens.forEach((t) => t.stop());
      liveTweens.clear();
    }

    // ---- Shared, reused resources (one geometry/material per visual kind) ----
    // Hollow glass cylinder (open-ended so the liquid shows through the top).
    const glassGeo = new THREE.CylinderGeometry(GLASS_RADIUS, GLASS_RADIUS * 0.96, GLASS_H, 36, 1, true);
    const glassMat = new THREE.MeshStandardMaterial({
      color: GLASS_TINT,
      roughness: 0.15,
      metalness: 0.05,
      transparent: true,
      opacity: 0.28,
      side: THREE.DoubleSide,
    });

    // Unit-height liquid cylinders, scaled on Y; one material per juice color.
    const liquidGeo = new THREE.CylinderGeometry(LIQUID_RADIUS, LIQUID_RADIUS * 0.97, 1, 36);
    const liquidMatA = new THREE.MeshStandardMaterial({ color: JUICE_A_COLOR, roughness: 0.4, metalness: 0.05 });
    const liquidMatB = new THREE.MeshStandardMaterial({ color: JUICE_B_COLOR, roughness: 0.4, metalness: 0.05 });

    // Counter slab under both glasses (warm wood; catches the shadow).
    const counterGeo = roundedBox(GLASS_GAP + 4, 0.4, 4, 0.2, 3);
    const counterMat = new THREE.MeshStandardMaterial({ color: COUNTER_COLOR, roughness: 0.85, metalness: 0.02 });
    const counter = new THREE.Mesh(counterGeo, counterMat);
    counter.position.set(0, -0.2, 0);
    counter.receiveShadow = true;
    ctx.scene.add(counter);

    // A pale mixing bowl between the two glasses (a half-sphere on its rim).
    const bowlGeo = new THREE.SphereGeometry(1.05, 28, 18, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
    const bowlMat = new THREE.MeshStandardMaterial({ color: BOWL_COLOR, roughness: 0.7, metalness: 0.05 });
    const bowl = new THREE.Mesh(bowlGeo, bowlMat);
    bowl.position.set(0, BASE_Y + 0.05, 0.2);
    bowl.castShadow = true;
    bowl.receiveShadow = true;
    ctx.scene.add(bowl);

    /**
     * Build one glass column: a transparent glass shell + a liquid cylinder whose
     * scale.y encodes the amount. The liquid pivots from its base (we shift the
     * mesh up by half its scaled height each render). Returned for animation.
     */
    function buildGlass(x: number, liquidMat: THREE.Material): { group: THREE.Group; liquid: THREE.Mesh } {
      const group = new THREE.Group();
      group.position.set(x, 0, 0);

      const shell = new THREE.Mesh(glassGeo, glassMat);
      shell.position.y = BASE_Y + GLASS_H / 2;
      group.add(shell);

      const liquid = new THREE.Mesh(liquidGeo, liquidMat);
      liquid.castShadow = true;
      liquid.position.y = BASE_Y; // base of liquid sits on the glass floor
      liquid.scale.y = amountToHeight(0);
      group.add(liquid);

      ctx.scene.add(group);
      return { group, liquid };
    }

    const glassA = buildGlass(-GLASS_X, liquidMatA);
    const glassB = buildGlass(GLASS_X, liquidMatB);

    const first = quiz ? quiz.state().current : generator.next();
    const state = {
      problem: first as RatioProblem,
      a: 0, // current amount of juice A
      b: 0, // current amount of juice B
      streak: 0,
      answered: 0,
    };

    /**
     * Set a liquid mesh's height from its amount. The cylinder is modeled with
     * height 1 centered on its origin, so after scaling we lift it by half the
     * scaled height to keep its BASE pinned to the glass floor (grows upward).
     */
    function applyLevel(liquid: THREE.Mesh, amount: number, animate: boolean): void {
      const targetH = amountToHeight(amount);
      if (!animate || ctx.prefersReducedMotion) {
        liquid.scale.y = targetH;
        liquid.position.y = BASE_Y + targetH / 2;
        return;
      }
      const fromH = liquid.scale.y;
      const t = tweenTo(fromH, targetH, FILL_TWEEN_MS, (v) => {
        liquid.scale.y = v;
        liquid.position.y = BASE_Y + v / 2;
      });
      track(t as unknown as Tween<{ v: number }>);
    }

    function renderLevels(animate: boolean): void {
      applyLevel(glassA.liquid, state.a, animate);
      applyLevel(glassB.liquid, state.b, animate);
    }

    function showPrompt(): void {
      // TASK ONLY — the target ratio, never the live amounts or correctness.
      ctx.prompt.set(ctx.t('ratioMixer.prompt', { a: state.problem.targetA, b: state.problem.targetB }));
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

    function setA(amount: number): void {
      state.a = Math.max(0, Math.min(MAX_AMOUNT, amount));
      applyLevel(glassA.liquid, state.a, true);
    }
    function setB(amount: number): void {
      state.b = Math.max(0, Math.min(MAX_AMOUNT, amount));
      applyLevel(glassB.liquid, state.b, true);
    }

    function setControls(): void {
      const buttons: ControlButton[] = [
        { id: 'a-dec', label: `${ctx.t('controls.juiceA')} −`, onPress: () => setA(state.a - STEP) },
        { id: 'a-inc', label: `${ctx.t('controls.juiceA')} +`, onPress: () => setA(state.a + STEP) },
        { id: 'b-dec', label: `${ctx.t('controls.juiceB')} −`, onPress: () => setB(state.b - STEP) },
        { id: 'b-inc', label: `${ctx.t('controls.juiceB')} +`, onPress: () => setB(state.b + STEP) },
        { id: 'reset', label: ctx.t('controls.reset'), variant: 'reset', onPress: resetMix },
        { id: 'check', label: ctx.t('controls.check'), variant: 'confirm', onPress: confirm },
      ];
      ctx.controls.set(buttons);
    }

    function resetMix(): void {
      state.a = 0;
      state.b = 0;
      renderLevels(true);
    }

    function startNewProblem(): void {
      // Start each problem empty (0:0 is never a valid mix, so it never opens
      // already-solved) and show only the new target.
      state.a = 0;
      state.b = 0;
      renderLevels(true);
      showPrompt();
      showStatus();
    }

    function onCorrect(): void {
      ctx.audio.play('success');
      ctx.feedback.correct(
        ctx.t('ratioMixer.correct', { a: state.problem.targetA, b: state.problem.targetB })
      );
      track(punch(glassA.group, 0.14));
      track(punch(glassB.group, 0.14));
      track(punch(bowl, 0.16));
      celebrate();
    }

    function onWrong(): void {
      ctx.audio.play('fail');
      ctx.feedback.wrong(ctx.t('ratioMixer.wrong'));
      track(shake(glassA.group, 0.06, 280));
      track(shake(glassB.group, 0.06, 280));
    }

    function confirm(): void {
      const answer = { a: state.a, b: state.b };
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

      // Practice: correct → score + next problem; wrong → KEEP the mix to fix it.
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
     * Drag = pour. Whichever glass the pointer is over (by NDC x sign), its level
     * follows the pointer's height: drag UP raises that juice, drag DOWN lowers
     * it (natural — never inverted). Right half of the screen = glass B, left =
     * glass A, matching their world X positions under the straight-on camera.
     */
    const offDrag = ctx.input.on('drag', (p) => {
      const amount = pointerToAmount(p.y);
      if (p.x >= 0) {
        if (amount !== state.b) setB(amount);
      } else {
        if (amount !== state.a) setA(amount);
      }
    });
    // dragEnd is a SECONDARY submit path; the בדוק button is the primary one.
    const offDragEnd = ctx.input.on('dragEnd', confirm);

    // Initial render: empty glasses, prompt + status + controls up.
    renderLevels(false);
    track(popIn(glassA.group, { scale: 1 }));
    track(popIn(glassB.group, { scale: 1 }));
    track(popIn(bowl, { scale: 1 }));
    setControls();
    showPrompt();
    showStatus();

    return {
      onResize() {},
      dispose() {
        offDrag();
        offDragEnd();
        stopAllTweens();
        ctx.controls.clear();
        ctx.prompt.clear();
        ctx.status.clear();
        clayLook.dispose();

        glassA.group.clear();
        glassB.group.clear();
        ctx.scene.remove(glassA.group);
        ctx.scene.remove(glassB.group);
        ctx.scene.remove(bowl);
        ctx.scene.remove(counter);

        glassGeo.dispose();
        glassMat.dispose();
        liquidGeo.dispose();
        liquidMatA.dispose();
        liquidMatB.dispose();
        counterGeo.dispose();
        counterMat.dispose();
        bowlGeo.dispose();
        bowlMat.dispose();
      },
    };
  },
};
