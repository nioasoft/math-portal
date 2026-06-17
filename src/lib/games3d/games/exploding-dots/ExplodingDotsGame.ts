import * as THREE from 'three';
import type { Tween } from '@tweenjs/tween.js';
import type { ControlButton, Game3D } from '@/lib/games3d/types';
import { createQuizController } from '@/lib/games3d/quiz/controller';
import { applyClayLook, roundedBox, popIn, punch, shake, tweenTo, celebrate, bigCelebrate, computeStars } from '@/lib/games3d/kit';
import { lockedCameraFrame } from '@/lib/games3d/kit/camera';
import {
  createExplodingDotsGenerator,
  normalize,
  EXPLODE_AT,
  MAX_PER_BOX,
  type BoxCounts,
  type ExplodingDotsProblem,
} from './problems';

// Theme: the famous "1←10 machine" (James Tanton's Exploding Dots) staged in a
// DARK NEON LAB. Three glowing boxes sit left→right — HUNDREDS | TENS | ONES.
// You drop neon dots into the ONES box (drag up, or the per-box −/+ controls).
// The instant ANY box reaches TEN dots it EXPLODES: the ten dots flare white-hot,
// fly LEFT toward the next box, and a single fresh dot blooms there — value is
// preserved (10 ones → 1 ten, 10 tens → 1 hundred). The explosion can CASCADE.
//
// This is deliberately NOT place-value-builder's gentle "carry-cart" (where ten
// small blocks are quietly bundled into one bigger block on a shelf). Here the
// regroup is a flashy DETONATION: a confetti burst, an emissive flash ring, the
// ten dots scaling up + streaking toward the higher box, then the new dot popping
// in. Same value-preserving normalize() math, totally different drama.
//
// Built value = hundreds·100 + tens·10 + ones. The prompt only ever shows the
// TARGET; the live built value is never echoed (the glowing dots show progress).

const QUIZ_LENGTH = 10;
const POINTS_PER_CORRECT = 10;
const POP_STAGGER_MS = 26; // gentle per-dot delay so a box fills alive

// Three boxes, laid out left→right across the dark lab. Front-facing locked
// camera, so screen-left = world −x. Reading order (hundreds → ones) is left→right.
const BOX_GAP = 4.6; // x-distance between box centers
const HUNDREDS_X = -BOX_GAP; // hundreds on the −x (screen-left) end
const TENS_X = 0;
const ONES_X = BOX_GAP; // ones on the +x (screen-right) end — where dots are added

// Box frame: a glowing neon-rimmed open cell. Dots live in a 3×3 grid inside.
const BOX_W = 3.4;
const BOX_H = 3.4;
const FRAME_T = 0.18; // thickness of the neon rim bars
const DOT_R = 0.42; // dot radius
const GRID_COLS = 3; // 3×3 = up to 9 settled dots; a transient 10th sits center-front
const GRID_GAP = BOX_W / (GRID_COLS + 1);

// Neon palette — SATURATED + EMISSIVE so dots/frames glow against the dark lab.
const ONES_NEON = 0x39ff14; // electric green
const TENS_NEON = 0x00e5ff; // cyan
const HUNDREDS_NEON = 0xff2bd6; // magenta
const FLASH_COLOR = 0xffffff; // the white-hot detonation flare

type Box = 'hundreds' | 'tens' | 'ones';

interface BoxView {
  box: Box;
  x: number;
  group: THREE.Group; // holds the dot meshes (cleared/rebuilt)
  neon: number;
  dotMat: THREE.MeshStandardMaterial; // shared per-box dot material
}

export const explodingDotsGame: Game3D = {
  meta: {
    id: 'exploding-dots',
    i18nKey: 'games3d.explodingDots',
    topic: 'arithmetic',
    difficulty: 2,
    gradeRange: [2, 3],
    estimatedSeconds: 110,
    supportedModes: ['practice', 'quiz'],
  },
  init(ctx) {
    // Straight-on locked camera (clock-builder pattern): keeps drag-x → world-x
    // monotonic and frames the three boxes head-on. Distance sized so all three
    // boxes (total width ≈ 2·BOX_GAP + BOX_W ≈ 12.6) FILL the viewport with margin.
    const BOXES_HALF_W = 6.3; // 3 boxes at 4.2 gap ≈ 12.6 total
    function reframe(): void {
      const f = lockedCameraFrame(BOXES_HALF_W, 0, ctx.camera.aspect, 3);
      ctx.presets.camera.locked(f.position, f.lookAt);
    }
    reframe();

    // Dark lab. No ground plane (content is centered on y=0 and would be occluded
    // by a horizontal clay floor) — the deep gradient IS the lab backdrop.
    const clayLook = applyClayLook(ctx, {
      topColor: '#0a0a1f',
      bottomColor: '#1b1230',
      ground: false,
      shadowArea: 12,
      fog: false,
    });

    // Grade band 2–3 stays in tens+ones+small hundreds; targets 10..199 so an
    // explosion always matters. The shell passes no grade, so use the full range.
    const generator = createExplodingDotsGenerator();
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

    // ---- Shared, reused resources (one geometry/material per visual kind) ----
    const dotGeo = new THREE.SphereGeometry(DOT_R, 20, 16);
    const onesDotMat = neonMat(ONES_NEON);
    const tensDotMat = neonMat(TENS_NEON);
    const hundredsDotMat = neonMat(HUNDREDS_NEON);
    // The detonation flare: one shared bright sphere geometry, scaled per burst.
    const flashGeo = new THREE.SphereGeometry(1, 16, 12);
    const flashMat = new THREE.MeshStandardMaterial({
      color: FLASH_COLOR,
      emissive: new THREE.Color(FLASH_COLOR),
      emissiveIntensity: 2.2,
      transparent: true,
      opacity: 0.0,
      roughness: 0.3,
      metalness: 0.0,
    });
    // Neon frame bars: one unit-cube geometry, scaled per bar; one material per box.
    const barGeo = roundedBox(1, 1, 1, 0.04, 2);
    const onesBarMat = neonMat(ONES_NEON, 0.75);
    const tensBarMat = neonMat(TENS_NEON, 0.75);
    const hundredsBarMat = neonMat(HUNDREDS_NEON, 0.75);

    function neonMat(hex: number, intensity = 1.0): THREE.MeshStandardMaterial {
      return new THREE.MeshStandardMaterial({
        color: hex,
        emissive: new THREE.Color(hex),
        emissiveIntensity: intensity,
        roughness: 0.35,
        metalness: 0.1,
      });
    }

    const sceneRoot = new THREE.Group();
    ctx.scene.add(sceneRoot);

    // Build the neon frame of one box (four rim bars) at world x. Frames are
    // static (never rebuilt), so we add them straight to sceneRoot.
    function buildFrame(x: number, barMat: THREE.MeshStandardMaterial): void {
      const halfW = BOX_W / 2;
      const halfH = BOX_H / 2;
      const bars: Array<{ sx: number; sy: number; px: number; py: number }> = [
        { sx: BOX_W + FRAME_T, sy: FRAME_T, px: 0, py: halfH }, // top
        { sx: BOX_W + FRAME_T, sy: FRAME_T, px: 0, py: -halfH }, // bottom
        { sx: FRAME_T, sy: BOX_H + FRAME_T, px: -halfW, py: 0 }, // left
        { sx: FRAME_T, sy: BOX_H + FRAME_T, px: halfW, py: 0 }, // right
      ];
      for (const b of bars) {
        const bar = new THREE.Mesh(barGeo, barMat);
        bar.scale.set(b.sx, b.sy, FRAME_T);
        bar.position.set(x + b.px, b.py, 0);
        sceneRoot.add(bar);
      }
    }
    buildFrame(HUNDREDS_X, hundredsBarMat);
    buildFrame(TENS_X, tensBarMat);
    buildFrame(ONES_X, onesBarMat);

    const boxes: Record<Box, BoxView> = {
      hundreds: makeBox('hundreds', HUNDREDS_X, HUNDREDS_NEON, hundredsDotMat),
      tens: makeBox('tens', TENS_X, TENS_NEON, tensDotMat),
      ones: makeBox('ones', ONES_X, ONES_NEON, onesDotMat),
    };

    function makeBox(box: Box, x: number, neon: number, dotMat: THREE.MeshStandardMaterial): BoxView {
      const group = new THREE.Group();
      group.position.x = x;
      sceneRoot.add(group);
      return { box, x, group, neon, dotMat };
    }

    const first = quiz ? quiz.state().current : generator.next();
    const state = {
      problem: first as ExplodingDotsProblem,
      counts: { hundreds: 0, tens: 0, ones: 0 } as BoxCounts, // starts at 0 (≠ target)
      streak: 0,
      answered: 0,
      busy: false, // true while a detonation plays (blocks input churn)
    };

    // setTimeout handles for in-flight explosion beats — cleared on dispose.
    const pendingTimeouts = new Set<ReturnType<typeof setTimeout>>();

    function showPrompt(): void {
      // TASK ONLY — never echoes the live built value.
      ctx.prompt.set(ctx.t('explodingDots.prompt', { target: state.problem.target }));
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

    /**
     * Local position of the n-th (0-based) dot inside a box. Dots fill a 3×3 grid
     * bottom-up, left-to-right; a transient 10th dot (index 9, only during the
     * pre-explosion beat) sits dead-center-front so the "full, about to blow" box
     * reads clearly.
     */
    function dotPos(n: number): THREE.Vector3 {
      if (n >= GRID_COLS * GRID_COLS) {
        return new THREE.Vector3(0, 0, DOT_R); // the overflow dot, pushed forward
      }
      const col = n % GRID_COLS;
      const row = Math.floor(n / GRID_COLS);
      const x = (col - (GRID_COLS - 1) / 2) * GRID_GAP;
      const y = (row - (GRID_COLS - 1) / 2) * GRID_GAP;
      return new THREE.Vector3(x, y, 0);
    }

    /**
     * Rebuild every dot in a box to match `state.counts[box]`. Dots at index ≥
     * prevCount bloom in (newly added); existing dots snap to place. Reuses the
     * shared dot geometry + the box's shared neon material — no per-dot allocation
     * of geo/mat.
     */
    function rebuildBox(view: BoxView, prevCount: number, animate: boolean): void {
      view.group.clear();
      const count = state.counts[view.box];
      let newOrdinal = 0;
      for (let i = 0; i < count; i++) {
        const dot = new THREE.Mesh(dotGeo, view.dotMat);
        dot.position.copy(dotPos(i));
        if (animate && i >= prevCount) {
          track(popIn(dot, { delay: newOrdinal * POP_STAGGER_MS }));
          newOrdinal += 1;
        }
        view.group.add(dot);
      }
    }

    function rebuildAll(prev: BoxCounts, animate: boolean): void {
      rebuildBox(boxes.hundreds, prev.hundreds, animate);
      rebuildBox(boxes.tens, prev.tens, animate);
      rebuildBox(boxes.ones, prev.ones, animate);
    }

    /**
     * Add `delta` dots to a box (delta may be negative for the − button). After
     * the change, if a box just reached TEN it EXPLODES (see playExplosion). The
     * numeric value is preserved across the explosion (normalize is value-stable).
     */
    function changeBox(box: Box, delta: number): void {
      if (state.busy) return;
      const prev: BoxCounts = { ...state.counts };
      const raw = { ...state.counts, [box]: state.counts[box] + delta };
      // A box "overflows" when it just reached TEN (ones/tens only — hundreds is
      // the top box). We allow a transient 10 so the explosion has ten dots to
      // detonate. If the higher box is already full (9), the explosion would push
      // value past 999 → block the add instead of losing value.
      const higherFull =
        (box === 'ones' && state.counts.tens >= MAX_PER_BOX) ||
        (box === 'tens' && state.counts.hundreds >= MAX_PER_BOX);
      const overflowed = box !== 'hundreds' && raw[box] === EXPLODE_AT && !higherFull;
      if (raw[box] < 0) return; // − below zero: ignore
      if (box === 'hundreds' && raw.hundreds > MAX_PER_BOX) return; // cap the top box
      if (!overflowed && raw[box] > MAX_PER_BOX) return; // manual cap (no skipping past 10)

      state.counts = raw;
      rebuildAll(prev, true);

      if (overflowed) {
        playExplosion(box);
      }
      showPrompt();
    }

    /**
     * THE EXPLOSION (signature animation). The box at TEN detonates:
     *   1) a confetti pop + a white-hot flash sphere blooms and fades at the box,
     *   2) the ten dots scale UP and STREAK left toward the next box,
     *   3) after a short beat we normalize() (value-preserving) → that box 0, the
     *      higher box +1 — and the fresh dot in the higher box punches in.
     * Cascades naturally: if the higher box also hits ten, changeBox already set
     * its count, and normalize() resolves the whole chain in one value-stable step.
     * Distinct from place-value's quiet carry-cart: this is a flashy detonation.
     */
    function playExplosion(fromBox: Box): void {
      const higher: Box = fromBox === 'ones' ? 'tens' : 'hundreds';
      state.busy = true;
      const fromView = boxes[fromBox];
      const higherView = boxes[higher];

      const reduced = ctx.prefersReducedMotion;
      ctx.audio.play('click');
      if (!reduced) celebrate(); // a real confetti BURST — the detonation flair

      // 1) White-hot flash sphere at the exploding box: bloom out + fade.
      const flash = new THREE.Mesh(flashGeo, flashMat);
      flash.position.set(fromView.x, 0, DOT_R + 0.2);
      flash.scale.setScalar(0.2);
      flashMat.opacity = 0.85;
      sceneRoot.add(flash);
      const flashMs = reduced ? 1 : 280;
      track(tweenTo(0.2, BOX_W * 0.7, flashMs, (v) => flash.scale.setScalar(v)));
      track(
        tweenTo(0.85, 0.0, flashMs, (v) => {
          flashMat.opacity = v;
        })
      );

      // 2) Streak the ten dots toward the higher (left/right) box — the "fly left".
      track(punch(fromView.group, 0.28));
      const streakDx = higherView.x - fromView.x;
      track(
        tweenTo(0, streakDx, reduced ? 1 : 260, (v) => {
          fromView.group.position.x = fromView.x + v * 0.4; // lean toward the higher box
        })
      );

      // 3) After the beat: regroup, snap groups back, bloom the new higher dot.
      const beat = reduced ? 0 : 300;
      const t = setTimeout(() => {
        const before: BoxCounts = { ...state.counts };
        const after = normalize(state.counts); // value-preserving detonation math
        state.counts = after;
        fromView.group.position.x = fromView.x; // snap the streaked box home
        rebuildAll(before, true);
        sceneRoot.remove(flash);
        flashMat.opacity = 0;
        track(punch(higherView.group, 0.26)); // the freshly-born dot lands hard
        state.busy = false;
      }, beat);
      pendingTimeouts.add(t);
    }

    function setControls(): void {
      const buttons: ControlButton[] = [
        { id: 'hundreds-dec', label: `${ctx.t('controls.hundreds')} −`, onPress: () => changeBox('hundreds', -1) },
        { id: 'hundreds-inc', label: `${ctx.t('controls.hundreds')} +`, onPress: () => changeBox('hundreds', 1) },
        { id: 'tens-dec', label: `${ctx.t('controls.tens')} −`, onPress: () => changeBox('tens', -1) },
        { id: 'tens-inc', label: `${ctx.t('controls.tens')} +`, onPress: () => changeBox('tens', 1) },
        { id: 'ones-dec', label: `${ctx.t('controls.ones')} −`, onPress: () => changeBox('ones', -1) },
        { id: 'ones-inc', label: `${ctx.t('controls.ones')} +`, onPress: () => changeBox('ones', 1) },
        { id: 'reset', label: ctx.t('controls.reset'), variant: 'reset', onPress: resetBuild },
        { id: 'check', label: ctx.t('controls.check'), variant: 'confirm', onPress: confirm },
      ];
      ctx.controls.set(buttons);
    }

    function resetBuild(): void {
      if (state.busy) return;
      const prev: BoxCounts = { ...state.counts };
      state.counts = { hundreds: 0, tens: 0, ones: 0 };
      rebuildAll(prev, false);
      showPrompt();
    }

    function startNewProblem(): void {
      const prev: BoxCounts = { ...state.counts };
      state.counts = { hundreds: 0, tens: 0, ones: 0 }; // 0 ≠ target ⇒ never opens solved
      rebuildAll(prev, false);
      showPrompt();
      showStatus();
    }

    function onCorrect(): void {
      ctx.audio.play('success');
      ctx.feedback.correct(ctx.t('explodingDots.correct', { target: state.problem.target }));
      track(punch(boxes.hundreds.group, 0.16));
      track(punch(boxes.tens.group, 0.16));
      track(punch(boxes.ones.group, 0.16));
      celebrate();
    }

    function onWrong(): void {
      ctx.audio.play('fail');
      ctx.feedback.wrong(ctx.t('explodingDots.wrong'));
      track(shake(boxes.hundreds.group, 0.07, 280));
      track(shake(boxes.tens.group, 0.07, 280));
      track(shake(boxes.ones.group, 0.07, 280));
    }

    function confirm(): void {
      if (state.busy) return;
      const answer: BoxCounts = { ...state.counts };
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

      // Practice: correct → score + next; wrong → KEEP the build so the child fixes it.
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
     * Which box is under the pointer? Map NDC x (−1..1) to the nearest of the
     * three box world-x positions (hundreds | tens | ones, left→right). Locked
     * straight-on camera ⇒ NDC x tracks world x with no inversion.
     */
    function boxUnderPointerX(ndcX: number): Box {
      if (ndcX < -1 / 3) return 'hundreds';
      if (ndcX > 1 / 3) return 'ones';
      return 'tens';
    }

    // Drag = fast add. Dragging UP over a box drops one dot per "notch" of upward
    // travel (natural direction: up = more, never inverted); dragging down removes
    // one. The primary, taught action is adding to the ONES box, but any box works.
    let lastDragY = 0;
    const offDragStart = ctx.input.on('dragStart', (p) => {
      lastDragY = p.y;
    });
    const offDrag = ctx.input.on('drag', (p) => {
      if (state.busy) return;
      const dy = p.y - lastDragY; // NDC: +y is up
      if (dy > 0.08) {
        changeBox(boxUnderPointerX(p.x), 1);
        lastDragY = p.y;
      } else if (dy < -0.08) {
        changeBox(boxUnderPointerX(p.x), -1);
        lastDragY = p.y;
      }
    });
    // dragEnd is a SECONDARY submit path; the בדוק (Check) button is the primary one.
    const offDragEnd = ctx.input.on('dragEnd', confirm);

    startNewProblem();
    setControls();
    showStatus();

    return {
      onResize() { reframe(); },
      dispose() {
        offDragStart();
        offDrag();
        offDragEnd();
        pendingTimeouts.forEach((t) => clearTimeout(t));
        pendingTimeouts.clear();
        stopAllTweens();
        ctx.controls.clear();
        ctx.prompt.clear();
        ctx.status.clear();
        clayLook.dispose();

        for (const view of Object.values(boxes)) {
          view.group.clear();
        }
        sceneRoot.clear(); // detach ALL children (box groups + frame bars + any flash)
        ctx.scene.remove(sceneRoot);

        dotGeo.dispose();
        onesDotMat.dispose();
        tensDotMat.dispose();
        hundredsDotMat.dispose();
        flashGeo.dispose();
        flashMat.dispose();
        barGeo.dispose();
        onesBarMat.dispose();
        tensBarMat.dispose();
        hundredsBarMat.dispose();
      },
    };
  },
};
