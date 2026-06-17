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
import { lockedCameraFrame } from '@/lib/games3d/kit/camera';
// `tweenTo` drives a numeric proxy on the kit's shared, engine-updated tween
// group — we adapt it to animate a hand pivot's `rotation.z` (the kit's
// popIn/punch/shake only touch scale/position).
import { tweenTo } from '@/lib/games3d/kit/juice';
import {
  createClockGenerator,
  angleFor,
  formatTime,
  HOURS_ON_FACE,
  MINUTES_IN_HOUR,
  type ClockTime,
} from './problems';

// Theme: a giant WALL CLOCK in a BAKERY. A round clay clock face hangs on a warm
// wall; 12 hour ticks ring the rim; a short thick HOUR hand and a long slim
// MINUTE hand pivot from a center hub. The child drags the minute hand around the
// face (it snaps to the nearest 5-minute mark) and the hour hand follows
// PROPORTIONALLY — at 3:30 it sits halfway between 3 and 4. −/+ controls give
// precise minute (±5) and hour (±1) steps; בדוק grades the built time against a
// digital target, Reset returns to 12:00. The prompt shows ONLY the target.
//
// CLOCK ANGLE CONVENTION (see problems.ts angleFor): 12 is UP (+Y), time runs
// CLOCKWISE. A hand value v out of N has clockwise angle θ = 2π·v/N from +Y, so
// the tip is (sinθ, cosθ)·len. A hand modeled along +Y is pointed there by
// rotating its pivot group by −θ about Z (positive Z-rot is CCW in three.js).
// Sanity: 3→right(+X), 6→down(−Y), 9→left(−X), 12→up(+Y).

const QUIZ_LENGTH = 10;
const POINTS_PER_CORRECT = 10;
const MINUTE_SNAP = 5; // drag/step granularity for the minute hand

// Clock geometry (procedural, in the XY plane facing the camera at z≈0).
const FACE_RADIUS = 4.2;
const FACE_THICKNESS = 0.5;
const RIM_RADIUS = FACE_RADIUS + 0.35;
const TICK_RING_RADIUS = FACE_RADIUS - 0.55; // where the 12 hour ticks sit
const HUB_RADIUS = 0.4;
const FACE_Z = 0; // face front sits near z=0; hands float just in front

// Hand dimensions — the hour hand reads clearly SHORTER and THICKER than minute.
const MINUTE_LEN = FACE_RADIUS - 0.7;
const MINUTE_WIDTH = 0.22;
const HOUR_LEN = FACE_RADIUS * 0.6;
const HOUR_WIDTH = 0.36;
const HAND_DEPTH = 0.18;
const MINUTE_HAND_Z = 0.55; // float in front of the face
const HOUR_HAND_Z = 0.42; // hour hand slightly behind the minute hand

// Bakery palette: warm cream face, dark cocoa ticks/hands (high contrast on the
// light face — never faint light-on-light), coral hour hand, deep-brown minute.
const FACE_COLOR = PALETTE.cream;
const RIM_COLOR = 0x8a5a3b; // warm wood/brass rim
const TICK_COLOR = 0x4a2f1c; // dark cocoa ticks — strong contrast on cream
const HUB_COLOR = 0x4a2f1c;
const HOUR_HAND_COLOR = PALETTE.coral; // short, thick, warm
const MINUTE_HAND_COLOR = 0x3d2817; // long, slim, dark
const HAND_TWEEN_MS = 260;

export const clockBuilderGame: Game3D = {
  meta: {
    id: 'clock-builder',
    i18nKey: 'games3d.clockBuilder',
    topic: 'units',
    difficulty: 2,
    gradeRange: [2, 3],
    estimatedSeconds: 120,
    supportedModes: ['practice', 'quiz'],
  },
  init(ctx) {
    // A wall clock faces the viewer: lock the camera in front of the XY-plane face
    // looking at the origin, so "up" on screen is +Y and the clock reads naturally.
    function reframe(): void {
      const f = lockedCameraFrame(4.55, 0, ctx.camera.aspect);
      ctx.presets.camera.locked(f.position, f.lookAt);
    }
    reframe();

    // Warm bakery ambience. No ground plane (the clock hangs on a wall, framed by
    // the gradient backdrop); the engine still provides the soft shadow.
    const clayLook = applyClayLook(ctx, {
      topColor: '#f6d9b0',
      bottomColor: '#e8b27a',
      ground: false,
      shadowArea: 9,
      fog: false,
    });

    // Grade band 2–3 → 5-minute marks (the harder end of the spec). Easier
    // o'clock/half-past is available via { minuteStep: 30 } if a grade is wired in.
    const generator = createClockGenerator({ minuteStep: 5 });
    const quiz =
      ctx.mode === 'quiz'
        ? createQuizController(generator, { length: QUIZ_LENGTH, pointsPerCorrect: POINTS_PER_CORRECT })
        : null;

    // ---- Tween tracking (no tween outlives its target) ----
    const liveTweens = new Set<Tween<{ s: number } | { t: number } | { a: number }>>();
    function track(t: Tween<{ s: number }> | Tween<{ t: number }> | Tween<{ a: number }>): void {
      liveTweens.add(t as Tween<{ s: number } | { t: number } | { a: number }>);
    }
    function stopAllTweens(): void {
      liveTweens.forEach((t) => t.stop());
      liveTweens.clear();
    }

    // ---- Shared, reused resources (one geometry + material per kind) ----
    const faceGeo = new THREE.CylinderGeometry(FACE_RADIUS, FACE_RADIUS, FACE_THICKNESS, 48);
    faceGeo.rotateX(Math.PI / 2); // lay the disc to face +Z (camera)
    const faceMat = new THREE.MeshStandardMaterial({ color: FACE_COLOR, roughness: 0.85, metalness: 0.02 });

    const rimGeo = new THREE.TorusGeometry(RIM_RADIUS, 0.28, 16, 60);
    const rimMat = new THREE.MeshStandardMaterial({ color: RIM_COLOR, roughness: 0.7, metalness: 0.08 });

    // One tick geometry reused for all 12 ticks (a small dark block).
    const tickGeo = roundedBox(0.22, 0.7, 0.18, 0.06, 2);
    const tickMat = new THREE.MeshStandardMaterial({ color: TICK_COLOR, roughness: 0.6, metalness: 0.05 });

    const hubGeo = new THREE.CylinderGeometry(HUB_RADIUS, HUB_RADIUS, 0.5, 24);
    hubGeo.rotateX(Math.PI / 2);
    const hubMat = new THREE.MeshStandardMaterial({ color: HUB_COLOR, roughness: 0.5, metalness: 0.2 });

    // Hand geometries: modeled along +Y with the BASE at the origin (translate up
    // by half-length) so the pivot group rotates them about the clock center.
    const minuteHandGeo = roundedBox(MINUTE_WIDTH, MINUTE_LEN, HAND_DEPTH, 0.08, 2);
    minuteHandGeo.translate(0, MINUTE_LEN / 2, 0);
    const minuteHandMat = new THREE.MeshStandardMaterial({ color: MINUTE_HAND_COLOR, roughness: 0.5, metalness: 0.1 });

    const hourHandGeo = roundedBox(HOUR_WIDTH, HOUR_LEN, HAND_DEPTH, 0.1, 2);
    hourHandGeo.translate(0, HOUR_LEN / 2, 0);
    const hourHandMat = new THREE.MeshStandardMaterial({ color: HOUR_HAND_COLOR, roughness: 0.5, metalness: 0.1 });

    // ---- Assemble the clock ----
    const clock = new THREE.Group();
    ctx.scene.add(clock);

    const rim = new THREE.Mesh(rimGeo, rimMat);
    rim.position.z = FACE_Z;
    rim.castShadow = true;
    clock.add(rim);

    const face = new THREE.Mesh(faceGeo, faceMat);
    face.position.z = FACE_Z;
    face.receiveShadow = true;
    clock.add(face);

    // 12 hour ticks around the rim, each rotated to point outward from center.
    const ticksGroup = new THREE.Group();
    clock.add(ticksGroup);
    for (let h = 0; h < HOURS_ON_FACE; h++) {
      const theta = angleFor(h, HOURS_ON_FACE); // clockwise from +Y
      const x = Math.sin(theta) * TICK_RING_RADIUS;
      const y = Math.cos(theta) * TICK_RING_RADIUS;
      const tick = new THREE.Mesh(tickGeo, tickMat);
      tick.position.set(x, y, FACE_Z + FACE_THICKNESS / 2 + 0.05);
      tick.rotation.z = -theta; // align the tick's long axis with the radius
      tick.castShadow = true;
      ticksGroup.add(tick);
    }

    // Hour hand pivot (added first → renders behind the minute hand).
    const hourPivot = new THREE.Group();
    hourPivot.position.z = HOUR_HAND_Z;
    const hourHand = new THREE.Mesh(hourHandGeo, hourHandMat);
    hourHand.castShadow = true;
    hourPivot.add(hourHand);
    clock.add(hourPivot);

    // Minute hand pivot (in front).
    const minutePivot = new THREE.Group();
    minutePivot.position.z = MINUTE_HAND_Z;
    const minuteHand = new THREE.Mesh(minuteHandGeo, minuteHandMat);
    minuteHand.castShadow = true;
    minutePivot.add(minuteHand);
    clock.add(minutePivot);

    // Center hub caps the hand bases.
    const hub = new THREE.Mesh(hubGeo, hubMat);
    hub.position.z = MINUTE_HAND_Z + 0.05;
    clock.add(hub);

    const first = quiz ? quiz.state().current : generator.next();
    const state = {
      problem: first as ClockTime,
      hour: 12, // current set hour 1..12
      minute: 0, // current set minute (multiple of 5)
      streak: 0,
      answered: 0,
    };

    /**
     * Point the hands at the current state. The minute hand uses minute/60; the
     * hour hand is PROPORTIONAL: (hour + minute/60)/12 — so it drifts off the
     * exact hour as the minutes advance (never pinned). Rotates by −θ about Z so
     * the hand (modeled along +Y) sweeps clockwise. Smoothly tweened unless
     * reduced-motion is preferred.
     */
    function renderHands(animate: boolean): void {
      const minuteTheta = angleFor(state.minute, MINUTES_IN_HOUR);
      const hourValue = (state.hour % HOURS_ON_FACE) + state.minute / MINUTES_IN_HOUR;
      const hourTheta = angleFor(hourValue, HOURS_ON_FACE);
      const minuteTarget = -minuteTheta;
      const hourTarget = -hourTheta;

      if (!animate || ctx.prefersReducedMotion) {
        minutePivot.rotation.z = minuteTarget;
        hourPivot.rotation.z = hourTarget;
        return;
      }
      track(tweenAngle(minutePivot, minuteTarget));
      track(tweenAngle(hourPivot, hourTarget));
    }

    /**
     * Tween a pivot's `rotation.z` to `target` along the SHORTEST arc (so 11→12
     * doesn't sweep all the way back). Driven via the kit's shared tween group
     * through `tweenTo`; the returned Tween is tracked + stopped on dispose.
     */
    function tweenAngle(pivot: THREE.Object3D, target: number): Tween<{ a: number }> {
      const from = pivot.rotation.z;
      let to = target;
      const twoPi = Math.PI * 2;
      while (to - from > Math.PI) to -= twoPi;
      while (to - from < -Math.PI) to += twoPi;
      const t = tweenTo(from, to, HAND_TWEEN_MS, (v) => {
        pivot.rotation.z = v;
      });
      return t as unknown as Tween<{ a: number }>;
    }

    function setControls(): void {
      const buttons: ControlButton[] = [
        { id: 'minute-dec', label: `${ctx.t('controls.minute')} −`, onPress: () => stepMinute(-MINUTE_SNAP) },
        { id: 'minute-inc', label: `${ctx.t('controls.minute')} +`, onPress: () => stepMinute(MINUTE_SNAP) },
        { id: 'hour-dec', label: `${ctx.t('controls.hour')} −`, onPress: () => stepHour(-1) },
        { id: 'hour-inc', label: `${ctx.t('controls.hour')} +`, onPress: () => stepHour(1) },
        { id: 'reset', label: ctx.t('controls.reset'), variant: 'reset', onPress: resetClock },
        { id: 'check', label: ctx.t('controls.check'), variant: 'confirm', onPress: confirm },
      ];
      ctx.controls.set(buttons);
    }

    /** Advance minutes by ±5, wrapping 0..55 (no hour roll — hour has its own ±). */
    function stepMinute(delta: number): void {
      const m = ((state.minute + delta) % MINUTES_IN_HOUR + MINUTES_IN_HOUR) % MINUTES_IN_HOUR;
      state.minute = m;
      renderHands(true);
    }

    /** Advance the hour by ±1, wrapping 12→1 / 1→12. */
    function stepHour(delta: number): void {
      // hours are 1..12; shift into 0..11 space, wrap, shift back.
      const h0 = (((state.hour - 1 + delta) % HOURS_ON_FACE) + HOURS_ON_FACE) % HOURS_ON_FACE;
      state.hour = h0 + 1;
      renderHands(true);
    }

    function resetClock(): void {
      state.hour = 12;
      state.minute = 0;
      renderHands(true);
    }

    function showPrompt(): void {
      // TASK ONLY — shows the digital TARGET, never the live setting or correctness.
      ctx.prompt.set(ctx.t('clockBuilder.prompt', { time: formatTime(state.problem.hour, state.problem.minute) }));
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

    function startNewProblem(): void {
      // Keep the hands where they are between problems; only the target changes.
      showPrompt();
      showStatus();
    }

    function onCorrect(): void {
      ctx.audio.play('success');
      ctx.feedback.correct(
        ctx.t('clockBuilder.correct', { time: formatTime(state.problem.hour, state.problem.minute) })
      );
      track(punch(minutePivot, 0.16));
      track(punch(hourPivot, 0.16));
      celebrate();
    }

    function onWrong(): void {
      ctx.audio.play('fail');
      ctx.feedback.wrong(ctx.t('clockBuilder.wrong'));
      track(shake(clock, 0.06, 280));
    }

    function confirm(): void {
      const answer: ClockTime = { hour: state.hour, minute: state.minute };
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

      // Practice: correct → score + next problem; wrong → KEEP the set time to fix.
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
     * Drag = grab the minute hand and sweep it around the face. Convert the
     * pointer's NDC position into an angle around the clock center, then snap to
     * the nearest 5-minute mark. The clock is centered at the origin and the
     * locked camera looks straight down −Z, so NDC (x, y) map monotonically to
     * world (x, y): the pointer's clockwise angle from +Y is atan2(x, y).
     * Dragging clockwise advances the minutes — never inverted.
     */
    function pointerToMinute(ndcX: number, ndcY: number): number {
      // atan2(x, y): 0 at +Y(up/12), +π/2 at +X(right/3), increasing CLOCKWISE.
      let theta = Math.atan2(ndcX, ndcY);
      if (theta < 0) theta += Math.PI * 2; // 0..2π
      const exactMinute = (theta / (Math.PI * 2)) * MINUTES_IN_HOUR; // 0..60
      const snapped = Math.round(exactMinute / MINUTE_SNAP) * MINUTE_SNAP;
      return snapped % MINUTES_IN_HOUR; // 60 → 0
    }

    const offDrag = ctx.input.on('drag', (p) => {
      const newMinute = pointerToMinute(p.x, p.y);
      if (newMinute === state.minute) return;
      state.minute = newMinute;
      // While dragging, snap hands instantly so the minute hand tracks the finger;
      // the proportional hour hand follows on the same frame.
      renderHands(false);
    });
    // dragEnd is a SECONDARY submit path; the בדוק button is the primary one.
    const offDragEnd = ctx.input.on('dragEnd', confirm);

    // Initial render: hands at 12:00, prompt + status + controls up.
    resetClock();
    renderHands(false);
    track(popIn(clock, { scale: 1 }));
    setControls();
    startNewProblem();

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

        ticksGroup.clear();
        clock.clear();
        ctx.scene.remove(clock);

        faceGeo.dispose();
        faceMat.dispose();
        rimGeo.dispose();
        rimMat.dispose();
        tickGeo.dispose();
        tickMat.dispose();
        hubGeo.dispose();
        hubMat.dispose();
        minuteHandGeo.dispose();
        minuteHandMat.dispose();
        hourHandGeo.dispose();
        hourHandMat.dispose();
      },
    };
  },
};
