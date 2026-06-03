import * as THREE from 'three';
import type { Tween } from '@tweenjs/tween.js';
import type { ControlButton, Game3D } from '@/lib/games3d/types';
import { createQuizController } from '@/lib/games3d/quiz/controller';
import { applyClayLook, roundedBox, punch, shake, celebrate, bigCelebrate, computeStars, tweenTo } from '@/lib/games3d/kit';
import {
  createDecimalGenerator,
  formatHundredths,
  MAX_PER_PLACE,
  type DecimalDigits,
  type DecimalProblem,
} from './problems';

// Theme: a LAB BENCH with three glass JARS filling with COLORED SAND. Each jar
// is one decimal place — ONES, TENTHS, HUNDREDTHS — and the SAND LEVEL inside
// shows that place's digit (0..9 → 0%..90% full). A decimal-point marker sits on
// the bench between the ONES jar and the TENTHS jar so the place order reads
// left→right: ones . tenths hundredths. There is NO carry/regroup — the lesson
// is decimal place value, so each jar is an independent 0..9 digit clamped at 9.
// The built value is tracked in INTEGER hundredths (ones·100 + tenths·10 +
// hundredths) to dodge float error. The prompt only ever shows the TARGET
// decimal string, never the live built value.

const QUIZ_LENGTH = 10;
const POINTS_PER_CORRECT = 10;

// Three jars laid left→right: ones | . | tenths | hundredths.
const JAR_GAP = 3.4; // x-distance between jar centers
const ONES_X = -JAR_GAP; // ones jar on the -x end (reads first, left)
const TENTHS_X = 0;
const HUNDREDTHS_X = JAR_GAP; // hundredths on the +x end (right)
const POINT_X = (ONES_X + TENTHS_X) / 2; // decimal point sits between ones & tenths

// Jar (glass cylinder) dimensions.
const JAR_RADIUS = 1.15; // outer glass radius
const JAR_HEIGHT = 4.2; // inner sand column travel
const SAND_RADIUS = JAR_RADIUS - 0.18; // sand sits just inside the glass
const FLOOR_Y = 0.0; // bench top; jar bottom rests here
const FILL_TWEEN_MS = 260; // sand level ease

// Saturated sand colors — one per place so they never blur together; all dark
// enough to read against the light clay scene + glass.
const ONES_SAND = 0xe8920c; // amber
const TENTHS_SAND = 0x0e9aa7; // teal
const HUNDREDTHS_SAND = 0x7b3ff2; // violet
const GLASS_COLOR = 0xdfeaf2; // cool pale glass tint
const BENCH_COLOR = 0x4a4a55; // dark bench slab (contrast under jars)
const POINT_COLOR = 0x16161d; // near-black decimal point (dark on light)

type Place = 'ones' | 'tenths' | 'hundredths';

interface JarView {
  place: Place;
  x: number;
  /** Wrapper group for the sand mesh — punch targets this so scale.setScalar is uniform. */
  sandGroup: THREE.Group;
  /** The colored-sand mesh (unit-height cylinder scaled non-uniformly by digit). */
  sand: THREE.Mesh;
  /** In-flight fill tween for this jar, so a new change supersedes it. */
  fillTween: Tween<{ v: number }> | null;
}

export const decimalPlaceValueGame: Game3D = {
  meta: {
    id: 'decimal-place-value',
    i18nKey: 'games3d.decimalBuilder',
    topic: 'decimals',
    difficulty: 3,
    gradeRange: [4, 5],
    estimatedSeconds: 120,
    supportedModes: ['practice', 'quiz'],
  },
  init(ctx) {
    ctx.presets.camera.orbit(new THREE.Vector3(0, 1.4, 0), 13);

    const clayLook = applyClayLook(ctx, {
      topColor: '#e6f0f6',
      bottomColor: '#f3e9d6',
      ground: true,
      shadowArea: 12,
      fog: false,
    });

    // grades 4–5: full hundredths range (0.01 .. 9.99). The shell doesn't pass a
    // grade; the jar controls cap each place at 9 so the build can't exceed 9.99.
    const generator = createDecimalGenerator();
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

    // ---- Shared, reused resources (one geometry + material per visual kind) ----
    // Glass shell: open-ended cylinder so we can see the sand inside.
    const glassGeo = new THREE.CylinderGeometry(JAR_RADIUS, JAR_RADIUS, JAR_HEIGHT, 28, 1, true);
    const glassMat = new THREE.MeshStandardMaterial({
      color: GLASS_COLOR,
      roughness: 0.1,
      metalness: 0.0,
      transparent: true,
      opacity: 0.28,
      side: THREE.DoubleSide,
    });
    // A thin solid jar base disc so the jar reads as a vessel, not a ring.
    const baseGeo = new THREE.CylinderGeometry(JAR_RADIUS, JAR_RADIUS, 0.18, 28);
    const baseMat = new THREE.MeshStandardMaterial({ color: GLASS_COLOR, roughness: 0.2, metalness: 0.0, transparent: true, opacity: 0.5 });
    // Sand: unit-height cylinder (height 1), scaled on Y by the fill fraction.
    const sandGeo = new THREE.CylinderGeometry(SAND_RADIUS, SAND_RADIUS, 1, 26);
    const onesSandMat = new THREE.MeshStandardMaterial({ color: ONES_SAND, roughness: 0.85, metalness: 0.02 });
    const tenthsSandMat = new THREE.MeshStandardMaterial({ color: TENTHS_SAND, roughness: 0.85, metalness: 0.02 });
    const hundredthsSandMat = new THREE.MeshStandardMaterial({ color: HUNDREDTHS_SAND, roughness: 0.85, metalness: 0.02 });
    // Dark bench slab under the jars (catches shadow, gives contrast).
    const benchGeo = roundedBox(JAR_GAP * 2 + JAR_RADIUS * 2 + 1.4, 0.4, JAR_RADIUS * 2 + 1.4, 0.18, 3);
    const benchMat = new THREE.MeshStandardMaterial({ color: BENCH_COLOR, roughness: 0.9, metalness: 0.03 });
    // Decimal point marker (small dark sphere) between ones & tenths.
    const pointGeo = new THREE.SphereGeometry(0.28, 18, 14);
    const pointMat = new THREE.MeshStandardMaterial({ color: POINT_COLOR, roughness: 0.5, metalness: 0.1 });

    const sceneRoot = new THREE.Group();
    ctx.scene.add(sceneRoot);

    const bench = new THREE.Mesh(benchGeo, benchMat);
    bench.position.set(TENTHS_X, FLOOR_Y - 0.2, 0);
    bench.receiveShadow = true;
    sceneRoot.add(bench);

    const decimalPoint = new THREE.Mesh(pointGeo, pointMat);
    decimalPoint.position.set(POINT_X, FLOOR_Y + 0.28, JAR_RADIUS + 0.2);
    decimalPoint.castShadow = true;
    sceneRoot.add(decimalPoint);

    function makeJar(place: Place, x: number, sandMat: THREE.MeshStandardMaterial): JarView {
      const glass = new THREE.Mesh(glassGeo, glassMat);
      glass.position.set(x, FLOOR_Y + JAR_HEIGHT / 2, 0);
      sceneRoot.add(glass);

      const base = new THREE.Mesh(baseGeo, baseMat);
      base.position.set(x, FLOOR_Y + 0.09, 0);
      base.receiveShadow = true;
      sceneRoot.add(base);

      // Wrap sand in a group so punch() (which calls scale.setScalar) animates the
      // group uniformly and never touches the non-uniform scale.y on the sand mesh.
      const sandGroup = new THREE.Group();
      sandGroup.position.set(x, FLOOR_Y, 0);
      sceneRoot.add(sandGroup);

      const sand = new THREE.Mesh(sandGeo, sandMat);
      sand.position.set(0, 0, 0); // local to sandGroup; y managed by applyJarLevel
      sand.scale.set(1, 0.0001, 1); // empty to start
      sand.castShadow = true;
      sand.receiveShadow = true;
      sandGroup.add(sand);

      return { place, x, sandGroup, sand, fillTween: null };
    }

    const jars: Record<Place, JarView> = {
      ones: makeJar('ones', ONES_X, onesSandMat),
      tenths: makeJar('tenths', TENTHS_X, tenthsSandMat),
      hundredths: makeJar('hundredths', HUNDREDTHS_X, hundredthsSandMat),
    };

    const first = quiz ? quiz.state().current : generator.next();
    const state = {
      problem: first as DecimalProblem,
      digits: { ones: 0, tenths: 0, hundredths: 0 } as DecimalDigits,
      streak: 0,
      answered: 0,
    };

    function showPrompt(): void {
      // TASK ONLY — the target decimal string; never the live built value.
      ctx.prompt.set(ctx.t('decimalBuilder.prompt', { target: formatHundredths(state.problem.targetHundredths) }));
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

    /** Target sand height for a digit: 0..9 → 0%..90% of the jar's inner height. */
    function sandHeightForDigit(digit: number): number {
      return (digit / 10) * JAR_HEIGHT;
    }

    /** Animate a jar's sand to its digit's level (unit cylinder scaled on Y). */
    function applyJarLevel(jar: JarView, animate: boolean): void {
      const digit = state.digits[jar.place];
      const targetH = Math.max(0.0001, sandHeightForDigit(digit));
      const fromH = Math.max(0.0001, jar.sand.scale.y);
      jar.fillTween?.stop();
      const setLevel = (h: number): void => {
        jar.sand.scale.y = h;
        // Keep the sand resting on the jar floor (cylinder is centered, so lift by h/2).
        // position is local to sandGroup (which sits at FLOOR_Y), so no FLOOR_Y offset here.
        jar.sand.position.y = h / 2;
      };
      if (!animate || ctx.prefersReducedMotion) {
        setLevel(targetH);
        jar.fillTween = null;
        return;
      }
      const t = tweenTo(fromH, targetH, FILL_TWEEN_MS, setLevel);
      jar.fillTween = t;
      track(t);
    }

    function applyAll(animate: boolean): void {
      applyJarLevel(jars.ones, animate);
      applyJarLevel(jars.tenths, animate);
      applyJarLevel(jars.hundredths, animate);
    }

    /** Change a place's digit by delta, clamped to 0..9 (NO carry between jars). */
    function changePlace(place: Place, delta: number): void {
      const next = state.digits[place] + delta;
      if (next < 0 || next > MAX_PER_PLACE) return; // clamp; no skip, no carry
      state.digits = { ...state.digits, [place]: next };
      applyJarLevel(jars[place], true);
      showPrompt();
    }

    function setControls(): void {
      const buttons: ControlButton[] = [
        { id: 'ones-dec', label: `${ctx.t('controls.ones')} −`, onPress: () => changePlace('ones', -1) },
        { id: 'ones-inc', label: `${ctx.t('controls.ones')} +`, onPress: () => changePlace('ones', 1) },
        { id: 'tenths-dec', label: `${ctx.t('controls.tenths')} −`, onPress: () => changePlace('tenths', -1) },
        { id: 'tenths-inc', label: `${ctx.t('controls.tenths')} +`, onPress: () => changePlace('tenths', 1) },
        { id: 'hundredths-dec', label: `${ctx.t('controls.hundredths')} −`, onPress: () => changePlace('hundredths', -1) },
        { id: 'hundredths-inc', label: `${ctx.t('controls.hundredths')} +`, onPress: () => changePlace('hundredths', 1) },
        { id: 'reset', label: ctx.t('controls.reset'), variant: 'reset', onPress: resetBuild },
        { id: 'check', label: ctx.t('controls.check'), variant: 'confirm', onPress: confirm },
      ];
      ctx.controls.set(buttons);
    }

    function resetBuild(): void {
      state.digits = { ones: 0, tenths: 0, hundredths: 0 };
      applyAll(true);
      showPrompt();
    }

    function startNewProblem(): void {
      state.digits = { ones: 0, tenths: 0, hundredths: 0 };
      applyAll(false);
      showPrompt();
      showStatus();
    }

    function onCorrect(): void {
      ctx.audio.play('success');
      ctx.feedback.correct(ctx.t('decimalBuilder.correct', { target: formatHundredths(state.problem.targetHundredths) }));
      track(punch(jars.ones.sandGroup, 0.16));
      track(punch(jars.tenths.sandGroup, 0.16));
      track(punch(jars.hundredths.sandGroup, 0.16));
      celebrate();
    }

    function onWrong(): void {
      ctx.audio.play('fail');
      ctx.feedback.wrong(ctx.t('decimalBuilder.wrong'));
      track(shake(jars.ones.sand, 0.06, 280));
      track(shake(jars.tenths.sand, 0.06, 280));
      track(shake(jars.hundredths.sand, 0.06, 280));
    }

    function confirm(): void {
      const answer: DecimalDigits = { ...state.digits };
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

    /** Which jar is under the pointer? Map NDC x (−1..1) thirds to the three jars. */
    function placeUnderPointerX(ndcX: number): Place {
      // Orbit camera keeps world-x left→right monotonic with NDC x: ones is on the
      // -x (left) end, hundredths on +x (right) — so left third = ones, right = hundredths.
      if (ndcX < -1 / 3) return 'ones';
      if (ndcX > 1 / 3) return 'hundredths';
      return 'tenths';
    }

    // Drag = fast fill. Dragging UP over a jar adds one to that jar's digit per
    // notch of upward travel; natural direction (up = more sand, never inverted).
    let lastDragY = 0;
    const offDragStart = ctx.input.on('dragStart', (p) => {
      lastDragY = p.y;
    });
    const offDrag = ctx.input.on('drag', (p) => {
      const dy = p.y - lastDragY; // NDC: +y is up
      if (dy > 0.08) {
        changePlace(placeUnderPointerX(p.x), 1);
        lastDragY = p.y;
      } else if (dy < -0.08) {
        changePlace(placeUnderPointerX(p.x), -1);
        lastDragY = p.y;
      }
    });
    // dragEnd is a secondary submit path; the Check button is the primary one.
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

        sceneRoot.clear(); // detach all jar/bench/point meshes
        ctx.scene.remove(sceneRoot);

        glassGeo.dispose();
        glassMat.dispose();
        baseGeo.dispose();
        baseMat.dispose();
        sandGeo.dispose();
        onesSandMat.dispose();
        tenthsSandMat.dispose();
        hundredthsSandMat.dispose();
        benchGeo.dispose();
        benchMat.dispose();
        pointGeo.dispose();
        pointMat.dispose();
      },
    };
  },
};
