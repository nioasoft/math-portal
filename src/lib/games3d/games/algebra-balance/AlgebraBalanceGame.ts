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
// `tweenTo` drives a numeric proxy on the kit's shared, engine-updated tween
// group — we adapt it to animate the beam pivot's `rotation.z` (the kit's
// popIn/punch/shake only touch scale/position), exactly like ClockBuilderGame.
import { tweenTo } from '@/lib/games3d/kit/juice';
import { lockedCameraFrame } from '@/lib/games3d/kit/camera';
import {
  createAlgebraBalanceGenerator,
  type AlgebraBalanceProblem,
  type BalanceAnswer,
} from './problems';

// Theme: מאזני קריסטל במעבדה עתידנית — a crystal balance scale in a futuristic
// lab. A horizontal BEAM pivots on a tall FULCRUM column; a PAN hangs from each
// end. The LEFT pan holds the special `?` BOX (its hidden weight = trueX) plus
// `b` unit "crystals" (small glassy saturated octahedra); the RIGHT pan holds
// `c` crystals. The scale STARTS LEVEL because trueX + b = c.
//
// The child removes EQUAL crystals from both pans (שמאל −/+, ימין −/+) until the
// `?` stands alone and the beam is level again. Removing UNEQUALLY tilts the beam
// (the heavier side dips) — that visible tilt IS the lesson about preserving
// equality. בדוק grades; the prompt only ever shows the TASK (? + b = c).
//
// BEAM TILT CONVENTION: leftWeight = trueX + leftUnits, rightWeight = rightUnits.
// A heavier side dips. The beam pivots about Z at the fulcrum top; positive Z-rot
// is CCW in three.js. We map tilt = clamp(k·(rightWeight − leftWeight)): when the
// right is heavier (diff > 0) the right end should dip, which is a CLOCKWISE
// (negative Z) rotation. So beam.rotation.z = −tilt. Pans hang from the beam ends
// so they translate with the tilt; we keep each pan visually level (counter-rotate
// the pan group) so the crystals don't slide.

const QUIZ_LENGTH = 10;
const POINTS_PER_CORRECT = 10;

// ---- Procedural geometry layout (XY plane, facing a front camera at z≈0) ----
const BEAM_HALF_SPAN = 3.6; // distance from fulcrum center to each pan hang-point
const BEAM_LENGTH = BEAM_HALF_SPAN * 2 + 0.6;
const BEAM_THICKNESS = 0.32;
const BEAM_DEPTH = 0.5;
const BEAM_Y = 3.1; // height of the beam pivot above the lab floor

const FULCRUM_WIDTH = 0.7;
const FULCRUM_DEPTH = 0.7;
const FULCRUM_HEIGHT = BEAM_Y; // column from floor up to the beam pivot
const FULCRUM_Y = FULCRUM_HEIGHT / 2;

const HANGER_LENGTH = 1.15; // thin rod from a beam end down to its pan
const HANGER_WIDTH = 0.08;
const PAN_RADIUS = 1.55;
const PAN_THICKNESS = 0.18;

// Unit crystals + the `?` box.
const CRYSTAL_SIZE = 0.46; // octahedron "radius"
const CRYSTAL_GAP = 0.62; // x-pitch when laid in a row on a pan
const CRYSTAL_Y = PAN_THICKNESS / 2 + CRYSTAL_SIZE * 0.7; // rest height above a pan
const MAX_UNITS_PER_ROW = 5; // wrap crystals into rows so big counts fit on a pan
const BOX_SIZE = 0.82; // the `?` box — visibly LARGER than a unit crystal

// Tilt animation.
const TILT_PER_UNIT = 0.07; // radians of beam tilt per unit of weight difference
const MAX_TILT = 0.34; // clamp so the beam never flips absurdly
const TILT_TWEEN_MS = 420;

// Futuristic-lab palette: cool dark fulcrum/beam metal, saturated glassy crystals,
// a distinct grape `?` box. High contrast against the dark lab backdrop.
const BEAM_COLOR = 0x9fb3c8; // brushed cool metal
const FULCRUM_COLOR = 0x5b6b7e; // darker metal column
const PAN_COLOR = 0xb8c6d6; // light metal pan (crystals read on top)
const HANGER_COLOR = 0x7d8ea0;
const CRYSTAL_COLOR = PALETTE.sky; // saturated glassy blue unit crystals
const BOX_COLOR = PALETTE.grape; // the unknown `?` — a distinct purple box

export const algebraBalanceGame: Game3D = {
  meta: {
    id: 'algebra-balance',
    i18nKey: 'games3d.algebraBalance',
    // No 'algebra' topic in the contract → arithmetic is the closest band.
    topic: 'arithmetic',
    difficulty: 3,
    gradeRange: [5, 6],
    estimatedSeconds: 140,
    supportedModes: ['practice', 'quiz'],
  },
  init(ctx) {
    // The balance faces the viewer: lock the camera in front of the XY-plane scene
    // looking at the beam, so "up" on screen is +Y and the tilt reads naturally.
    const lookY = BEAM_Y * 0.5;
    function reframe(): void {
      const f = lockedCameraFrame(3.9, lookY, ctx.camera.aspect);
      ctx.presets.camera.locked(f.position, f.lookAt);
    }
    reframe();

    // Cool, futuristic-lab ambience. No ground plane (the scale stands on the
    // gradient backdrop); the engine still provides the soft contact shadow.
    const clayLook = applyClayLook(ctx, {
      topColor: '#1e2a3a',
      bottomColor: '#3a4a63',
      ground: true,
      shadowArea: 12,
      fog: false,
    });

    const generator = createAlgebraBalanceGenerator();
    const quiz =
      ctx.mode === 'quiz'
        ? createQuizController(generator, { length: QUIZ_LENGTH, pointsPerCorrect: POINTS_PER_CORRECT })
        : null;

    // ---- Tween tracking (no tween outlives its target) ----
    const liveTweens = new Set<Tween<{ s: number } | { t: number } | { v: number }>>();
    function track(t: Tween<{ s: number }> | Tween<{ t: number }> | Tween<{ v: number }>): void {
      liveTweens.add(t as Tween<{ s: number } | { t: number } | { v: number }>);
    }
    function stopAllTweens(): void {
      liveTweens.forEach((t) => t.stop());
      liveTweens.clear();
    }

    // ---- Shared, reused resources (one geometry + material PER KIND) ----
    // Adding/removing crystals reuses ONE crystal geo + ONE material — never an
    // allocate-and-forget per crystal.
    const crystalGeo = new THREE.OctahedronGeometry(CRYSTAL_SIZE, 0);
    const crystalMat = new THREE.MeshStandardMaterial({
      color: CRYSTAL_COLOR,
      roughness: 0.25,
      metalness: 0.1,
      transparent: true,
      opacity: 0.85,
      emissive: new THREE.Color(CRYSTAL_COLOR).multiplyScalar(0.15),
    });

    const boxGeo = roundedBox(BOX_SIZE, BOX_SIZE, BOX_SIZE, 0.12, 3);
    const boxMat = new THREE.MeshStandardMaterial({
      color: BOX_COLOR,
      roughness: 0.4,
      metalness: 0.12,
      emissive: new THREE.Color(BOX_COLOR).multiplyScalar(0.18),
    });

    const beamGeo = roundedBox(BEAM_LENGTH, BEAM_THICKNESS, BEAM_DEPTH, 0.1, 3);
    const beamMat = new THREE.MeshStandardMaterial({ color: BEAM_COLOR, roughness: 0.45, metalness: 0.35 });

    const fulcrumGeo = roundedBox(FULCRUM_WIDTH, FULCRUM_HEIGHT, FULCRUM_DEPTH, 0.12, 3);
    const fulcrumMat = new THREE.MeshStandardMaterial({ color: FULCRUM_COLOR, roughness: 0.5, metalness: 0.3 });

    const hangerGeo = roundedBox(HANGER_WIDTH, HANGER_LENGTH, HANGER_WIDTH, 0.03, 2);
    const hangerMat = new THREE.MeshStandardMaterial({ color: HANGER_COLOR, roughness: 0.5, metalness: 0.3 });

    const panGeo = new THREE.CylinderGeometry(PAN_RADIUS, PAN_RADIUS * 0.78, PAN_THICKNESS, 28);
    const panMat = new THREE.MeshStandardMaterial({ color: PAN_COLOR, roughness: 0.4, metalness: 0.3 });

    // ---- Assemble the static structure ----
    const root = new THREE.Group();
    ctx.scene.add(root);

    const fulcrum = new THREE.Mesh(fulcrumGeo, fulcrumMat);
    fulcrum.position.set(0, FULCRUM_Y, 0);
    fulcrum.castShadow = true;
    fulcrum.receiveShadow = true;
    root.add(fulcrum);

    // Beam pivots about Z at the fulcrum top. Tilting the beam swings the pan
    // hang-points up/down — the lesson's signature motion.
    const beamPivot = new THREE.Group();
    beamPivot.position.set(0, BEAM_Y, 0);
    root.add(beamPivot);

    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.castShadow = true;
    beamPivot.add(beam);

    // Each side is a hang-point on the beam → hanger rod → pan group (kept level so
    // crystals don't slide as the beam tilts).
    interface SideView {
      hangPoint: THREE.Group; // child of beamPivot at ±BEAM_HALF_SPAN (tilts with beam)
      pan: THREE.Group; // counter-rotated to stay level
      crystalsRow: THREE.Group; // holds the unit crystals (and the ? box on the left)
    }

    function makeSide(sign: number): SideView {
      const hangPoint = new THREE.Group();
      hangPoint.position.set(sign * BEAM_HALF_SPAN, -BEAM_THICKNESS / 2, 0);
      beamPivot.add(hangPoint);

      const hanger = new THREE.Mesh(hangerGeo, hangerMat);
      hanger.position.set(0, -HANGER_LENGTH / 2, 0);
      hanger.castShadow = true;
      hangPoint.add(hanger);

      // Pan group hangs at the bottom of the hanger; counter-rotated each frame so
      // it (and its crystals) stays visually level while the beam tilts.
      const pan = new THREE.Group();
      pan.position.set(0, -HANGER_LENGTH, 0);
      hangPoint.add(pan);

      const dish = new THREE.Mesh(panGeo, panMat);
      dish.castShadow = true;
      dish.receiveShadow = true;
      pan.add(dish);

      const crystalsRow = new THREE.Group();
      crystalsRow.position.y = 0;
      pan.add(crystalsRow);

      return { hangPoint, pan, crystalsRow };
    }

    const left = makeSide(-1);
    const right = makeSide(1);

    const first = quiz ? quiz.state().current : generator.next();
    const state = {
      problem: first as AlgebraBalanceProblem,
      leftUnits: (first as AlgebraBalanceProblem).b, // start: ? + b on the left
      rightUnits: (first as AlgebraBalanceProblem).c, // start: c on the right
      streak: 0,
      answered: 0,
    };

    // ---- Crystal/box layout on a pan ----
    /** X position of the i-th item laid out centered in rows of MAX_UNITS_PER_ROW. */
    function layoutPosition(index: number, total: number): { x: number; y: number } {
      const row = Math.floor(index / MAX_UNITS_PER_ROW);
      const col = index % MAX_UNITS_PER_ROW;
      const inThisRow = Math.min(MAX_UNITS_PER_ROW, total - row * MAX_UNITS_PER_ROW);
      const rowWidth = (inThisRow - 1) * CRYSTAL_GAP;
      const x = col * CRYSTAL_GAP - rowWidth / 2;
      const y = CRYSTAL_Y + row * (CRYSTAL_SIZE * 1.6);
      return { x, y };
    }

    /**
     * Rebuild a pan's crystal row to match a unit count. The `?` box (left pan only)
     * is the FIRST item in the row and is always present. New items pop in.
     * Reuses the ONE shared crystal geo+mat (and box geo+mat) for every mesh.
     */
    function rebuildPan(side: SideView, units: number, hasBox: boolean, prevCount: number, animate: boolean): void {
      side.crystalsRow.clear();
      const boxCount = hasBox ? 1 : 0;
      const total = units + boxCount;
      let itemIndex = 0;
      let newOrdinal = 0;

      if (hasBox) {
        const pos = layoutPosition(itemIndex, total);
        const box = new THREE.Mesh(boxGeo, boxMat);
        // The box sits a touch higher so its larger body reads above the crystals.
        box.position.set(pos.x, pos.y + (BOX_SIZE - CRYSTAL_SIZE) * 0.4, 0);
        box.castShadow = true;
        side.crystalsRow.add(box);
        itemIndex += 1;
      }

      for (let u = 0; u < units; u++) {
        const pos = layoutPosition(itemIndex, total);
        const crystal = new THREE.Mesh(crystalGeo, crystalMat);
        crystal.position.set(pos.x, pos.y, 0);
        crystal.castShadow = true;
        // "Newly present" crystals (beyond the previous count) pop in.
        if (animate && u >= prevCount) {
          track(popIn(crystal, { delay: newOrdinal * 24 }));
          newOrdinal += 1;
        }
        side.crystalsRow.add(crystal);
        itemIndex += 1;
      }
    }

    // ---- Beam tilt ----
    /**
     * Tilt the beam by the current weight difference. leftWeight = trueX + leftUnits,
     * rightWeight = rightUnits. Right-heavier (diff > 0) ⇒ right end DIPS ⇒ clockwise
     * ⇒ negative Z rotation. Pans are counter-rotated to stay level. Tweened via the
     * kit's shared group (tracked + stopped on dispose) unless reduced-motion.
     */
    function renderTilt(animate: boolean): void {
      const leftWeight = state.problem.trueX + state.leftUnits;
      const rightWeight = state.rightUnits;
      const diff = rightWeight - leftWeight;
      const target = THREE.MathUtils.clamp(diff * TILT_PER_UNIT, -MAX_TILT, MAX_TILT);
      const beamTarget = -target;

      const applyLevelPans = () => {
        // Keep both pans visually level regardless of beam tilt.
        left.pan.rotation.z = -beamPivot.rotation.z;
        right.pan.rotation.z = -beamPivot.rotation.z;
      };

      if (!animate || ctx.prefersReducedMotion) {
        beamPivot.rotation.z = beamTarget;
        applyLevelPans();
        return;
      }
      const from = beamPivot.rotation.z;
      const t = tweenTo(from, beamTarget, TILT_TWEEN_MS, (v) => {
        beamPivot.rotation.z = v;
        applyLevelPans();
      });
      track(t);
    }

    function refreshScene(animate: boolean, prevLeft: number, prevRight: number): void {
      rebuildPan(left, state.leftUnits, true, prevLeft, animate);
      rebuildPan(right, state.rightUnits, false, prevRight, animate);
      renderTilt(animate);
    }

    function showPrompt(): void {
      // TASK ONLY — "? + b = c"; never echoes the live pan state or correctness.
      ctx.prompt.set(ctx.t('algebraBalance.prompt', { b: state.problem.b, c: state.problem.c }));
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

    /** Change a side's unit count by ±1, clamped to 0..startingCount for that side. */
    function changeUnits(sideKey: 'left' | 'right', delta: number): void {
      const prevLeft = state.leftUnits;
      const prevRight = state.rightUnits;
      if (sideKey === 'left') {
        const next = state.leftUnits + delta;
        if (next < 0 || next > state.problem.b) return; // can't go below 0 or above start (b)
        state.leftUnits = next;
      } else {
        const next = state.rightUnits + delta;
        if (next < 0 || next > state.problem.c) return; // can't go below 0 or above start (c)
        state.rightUnits = next;
      }
      refreshScene(true, prevLeft, prevRight);
    }

    function resetBalance(): void {
      const prevLeft = state.leftUnits;
      const prevRight = state.rightUnits;
      state.leftUnits = state.problem.b;
      state.rightUnits = state.problem.c;
      refreshScene(false, prevLeft, prevRight);
    }

    function setControls(): void {
      const buttons: ControlButton[] = [
        { id: 'left-dec', label: `${ctx.t('controls.left')} −`, onPress: () => changeUnits('left', -1) },
        { id: 'left-inc', label: `${ctx.t('controls.left')} +`, onPress: () => changeUnits('left', 1) },
        { id: 'right-dec', label: `${ctx.t('controls.right')} −`, onPress: () => changeUnits('right', -1) },
        { id: 'right-inc', label: `${ctx.t('controls.right')} +`, onPress: () => changeUnits('right', 1) },
        { id: 'reset', label: ctx.t('controls.reset'), variant: 'reset', onPress: resetBalance },
        { id: 'check', label: ctx.t('controls.check'), variant: 'confirm', onPress: confirm },
      ];
      ctx.controls.set(buttons);
    }

    /** Load the next problem (fresh balanced start) and refresh prompt + status. */
    function startNewProblem(): void {
      const prevLeft = state.leftUnits;
      const prevRight = state.rightUnits;
      state.leftUnits = state.problem.b;
      state.rightUnits = state.problem.c;
      refreshScene(false, prevLeft, prevRight);
      showPrompt();
      showStatus();
    }

    function onCorrect(): void {
      ctx.audio.play('success');
      // Reveal the solved value: ? = x (= the remaining right-pan crystals).
      ctx.feedback.correct(ctx.t('algebraBalance.correct', { x: state.problem.trueX }));
      track(punch(left.crystalsRow, 0.18));
      track(punch(right.crystalsRow, 0.18));
      celebrate();
    }

    function onWrong(): void {
      ctx.audio.play('fail');
      ctx.feedback.wrong(ctx.t('algebraBalance.wrong'));
      track(shake(root, 0.06, 280));
    }

    function confirm(): void {
      const answer: BalanceAnswer = { leftUnits: state.leftUnits, rightUnits: state.rightUnits };
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

      // Practice: correct → score + next problem; wrong → KEEP the current pan
      // configuration so the child can fix it.
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

    // Drag is skipped here (NOTED): the −/+ buttons per side are the interaction,
    // matching the lesson (independent per-side moves so an unequal removal visibly
    // tilts the beam). dragEnd is still wired as a SECONDARY submit path, like the
    // gold template, so a sweep-then-release also checks.
    const offDragEnd = ctx.input.on('dragEnd', confirm);

    // Initial build: balanced start, prompt + status + controls up.
    refreshScene(false, 0, 0);
    track(popIn(beamPivot, { scale: 1 }));
    showPrompt();
    setControls();
    showStatus();

    return {
      onResize() { reframe(); },
      dispose() {
        offDragEnd();
        stopAllTweens();
        ctx.controls.clear();
        ctx.prompt.clear();
        ctx.status.clear();
        clayLook.dispose();

        // Detach every object added to the scene.
        left.crystalsRow.clear();
        right.crystalsRow.clear();
        beamPivot.clear();
        root.clear();
        ctx.scene.remove(root);

        // Dispose every geometry + material created (one per kind, shared).
        crystalGeo.dispose();
        crystalMat.dispose();
        boxGeo.dispose();
        boxMat.dispose();
        beamGeo.dispose();
        beamMat.dispose();
        fulcrumGeo.dispose();
        fulcrumMat.dispose();
        hangerGeo.dispose();
        hangerMat.dispose();
        panGeo.dispose();
        panMat.dispose();
      },
    };
  },
};
