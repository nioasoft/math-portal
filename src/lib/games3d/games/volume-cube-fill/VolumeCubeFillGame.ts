import * as THREE from 'three';
import type { Tween } from '@tweenjs/tween.js';
import type { ControlButton, Game3D } from '@/lib/games3d/types';
import { createQuizController } from '@/lib/games3d/quiz/controller';
import { applyClayLook, roundedBox, popIn, punch, shake, celebrate, bigCelebrate, computeStars, PALETTE } from '@/lib/games3d/kit';
import { createVolumeCubeFillGenerator, MAX_DIM, MIN_DIM, type VolumeProblem } from './problems';

// Theme: a transparent GLASS AQUARIUM / tank. The child fills it with glowing
// unit cubes by setting Length, Width and Height (− / + buttons, or drag — right
// = wider, up = taller). The cubes stack layer-by-layer: each unit of HEIGHT is
// one new layer of length×width cubes that pops in with a gentle stagger. The
// built volume is length·width·height; Check compares it to the target BY VALUE
// (so several different boxes can be correct). Procedural geometry only.
const CUBE = 0.92; // visual footprint of a unit cube (a small gap reads as a grid)
const STEP = 1; // grid step = one unit (dims map 1:1 to cube counts)
const QUIZ_LENGTH = 10;
const POINTS_PER_CORRECT = 10;
const POP_STAGGER_MS = 14; // gentle per-cube delay so layers fill alive, not heavy
const TANK_PAD = 0.55; // glass shell sits this far outside the cube grid

const CUBE_COLOR = PALETTE.sky; // saturated body color
const CUBE_EMISSIVE = 0x1d6fd0; // glow so cubes read against the faint glass + clay
const GLASS_COLOR = 0x9fe7ff; // pale aqua glass shell
const EDGE_COLOR = 0x2b7fb0; // tank edge wireframe (dark/saturated → reads on clay)
const BASE_COLOR = 0x355a7a; // solid tank base (catches the shadow, frames the cubes)

/** Map a normalized pointer coordinate (NDC, -1..1) to an integer dim 1..MAX. */
function pointerToDim(normalized: number): number {
  // NDC -1 → MIN, +1 → MAX (linear, no inversion).
  const t = (normalized + 1) / 2; // 0..1
  const dim = Math.round(t * (MAX_DIM - MIN_DIM)) + MIN_DIM;
  return Math.max(MIN_DIM, Math.min(MAX_DIM, dim));
}

export const volumeCubeFillGame: Game3D = {
  meta: {
    id: 'volume-cube-fill',
    i18nKey: 'games3d.volumeBuilder',
    topic: 'geometry',
    difficulty: 3,
    gradeRange: [4, 6],
    estimatedSeconds: 140,
    supportedModes: ['practice', 'quiz'],
  },
  init(ctx) {
    // Orbit so the box reads with depth (length, width AND height are visible).
    ctx.presets.camera.orbit(new THREE.Vector3(0, 1.4, 0), 12);

    // Clay/toy look — cool aquarium ambience. The engine provides the soft shadow.
    const clayLook = applyClayLook(ctx, {
      topColor: '#d4ecf7',
      bottomColor: '#eef3df',
      ground: true,
      shadowArea: 9,
      fog: false,
    });

    const generator = createVolumeCubeFillGenerator();
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

    // ---- Shared, reused resources (ONE geometry/material per visual kind) ----
    const cubeGeo = roundedBox(CUBE, CUBE, CUBE, 0.12, 3);
    const cubeMat = new THREE.MeshStandardMaterial({
      color: CUBE_COLOR,
      emissive: CUBE_EMISSIVE,
      emissiveIntensity: 0.55,
      roughness: 0.4,
      metalness: 0.05,
    });

    // Glass tank: a faint transparent shell + a saturated edge wireframe + a solid
    // base. Rebuilt (rescaled) whenever the box footprint/height changes. ONE
    // geometry + material per kind; the shell/edges are scaled, never re-created.
    const tankShellGeo = roundedBox(1, 1, 1, 0.04, 2);
    const tankShellMat = new THREE.MeshStandardMaterial({
      color: GLASS_COLOR,
      transparent: true,
      opacity: 0.12,
      roughness: 0.1,
      metalness: 0.0,
      depthWrite: false,
    });
    const tankShell = new THREE.Mesh(tankShellGeo, tankShellMat);
    ctx.scene.add(tankShell);

    // Edge wireframe of a unit box, scaled to the tank size each rebuild.
    const edgeSrcGeo = new THREE.BoxGeometry(1, 1, 1);
    const edgesGeo = new THREE.EdgesGeometry(edgeSrcGeo);
    edgeSrcGeo.dispose(); // only the derived edges are kept
    const edgesMat = new THREE.LineBasicMaterial({ color: EDGE_COLOR, transparent: true, opacity: 0.85 });
    const tankEdges = new THREE.LineSegments(edgesGeo, edgesMat);
    ctx.scene.add(tankEdges);

    // Solid tank base (frames the cubes, catches the shadow).
    const baseGeo = roundedBox(1, 0.16, 1, 0.1, 2);
    const baseMat = new THREE.MeshStandardMaterial({ color: BASE_COLOR, roughness: 0.85, metalness: 0.04 });
    const tankBase = new THREE.Mesh(baseGeo, baseMat);
    tankBase.receiveShadow = true;
    ctx.scene.add(tankBase);

    // Cubes live in their own group so it can be punched / shaken / cleared.
    const cubeGroup = new THREE.Group();
    ctx.scene.add(cubeGroup);

    const start0 = pickStart(generator, quiz);
    const state = {
      problem: start0.problem,
      length: start0.length,
      width: start0.width,
      height: start0.height,
      streak: 0,
      answered: 0,
    };

    function showPrompt(): void {
      ctx.prompt.set(ctx.t('volumeBuilder.prompt', { volume: state.problem.target }));
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

    // Center the box at the origin (resting on y=0) so it stays framed as it grows.
    function originX(): number {
      return -((state.length - 1) * STEP) / 2;
    }
    function originZ(): number {
      return -((state.width - 1) * STEP) / 2;
    }

    /**
     * Rebuild the cube grid for length × width × height. Cubes are laid out as
     * HEIGHT layers (y = 0..height-1), each a length×width sheet. Cubes whose
     * flat index ≥ prevCount are "newly added" and pop in with a stagger so the
     * tank fills layer-by-layer; existing cubes stay put. The whole grid is
     * re-centered each rebuild, so every cube's position is set, but only the new
     * ones animate.
     */
    function buildCubes(prevCount: number): void {
      cubeGroup.clear();
      const ox = originX();
      const oz = originZ();
      let index = 0;
      let newOrdinal = 0;
      for (let layer = 0; layer < state.height; layer++) {
        for (let r = 0; r < state.width; r++) {
          for (let c = 0; c < state.length; c++) {
            const cube = new THREE.Mesh(cubeGeo, cubeMat);
            cube.position.set(ox + c * STEP, CUBE / 2 + layer * STEP, oz + r * STEP);
            cube.castShadow = true;
            cube.receiveShadow = true;
            if (index >= prevCount) {
              track(popIn(cube, { delay: newOrdinal * POP_STAGGER_MS }));
              newOrdinal += 1;
            }
            cubeGroup.add(cube);
            index += 1;
          }
        }
      }
    }

    /** Rescale the glass tank to wrap the current box (footprint + height). */
    function buildTank(): void {
      const ox = originX();
      const oz = originZ();
      const spanX = state.length * STEP;
      const spanZ = state.width * STEP;
      const spanY = state.height * STEP;
      const cx = ox + ((state.length - 1) * STEP) / 2; // == 0, but explicit
      const cz = oz + ((state.width - 1) * STEP) / 2; // == 0

      tankShell.scale.set(spanX + TANK_PAD, spanY + TANK_PAD, spanZ + TANK_PAD);
      tankShell.position.set(cx, spanY / 2, cz);

      tankEdges.scale.set(spanX + TANK_PAD, spanY + TANK_PAD, spanZ + TANK_PAD);
      tankEdges.position.set(cx, spanY / 2, cz);

      tankBase.scale.set(spanX + TANK_PAD, 1, spanZ + TANK_PAD);
      tankBase.position.set(cx, -0.08, cz);
    }

    /** Apply a new box size: rebuild cubes (layer-fill stagger) + reshape tank. */
    function setSize(length: number, width: number, height: number): void {
      const prevCount = state.length * state.width * state.height;
      state.length = Math.max(MIN_DIM, Math.min(MAX_DIM, length));
      state.width = Math.max(MIN_DIM, Math.min(MAX_DIM, width));
      state.height = Math.max(MIN_DIM, Math.min(MAX_DIM, height));
      buildCubes(prevCount);
      buildTank();
      showPrompt();
    }

    function setControls(): void {
      const buttons: ControlButton[] = [
        {
          id: 'length-dec',
          label: `${ctx.t('controls.length')} −`,
          onPress: () => setSize(state.length - 1, state.width, state.height),
        },
        {
          id: 'length-inc',
          label: `${ctx.t('controls.length')} +`,
          onPress: () => setSize(state.length + 1, state.width, state.height),
        },
        {
          id: 'width-dec',
          label: `${ctx.t('controls.width')} −`,
          onPress: () => setSize(state.length, state.width - 1, state.height),
        },
        {
          id: 'width-inc',
          label: `${ctx.t('controls.width')} +`,
          onPress: () => setSize(state.length, state.width + 1, state.height),
        },
        {
          id: 'height-dec',
          label: `${ctx.t('controls.height')} −`,
          onPress: () => setSize(state.length, state.width, state.height - 1),
        },
        {
          id: 'height-inc',
          label: `${ctx.t('controls.height')} +`,
          onPress: () => setSize(state.length, state.width, state.height + 1),
        },
        {
          id: 'reset',
          label: ctx.t('controls.reset'),
          variant: 'reset',
          onPress: () => setSize(1, 1, 1),
        },
        {
          id: 'check',
          label: ctx.t('controls.check'),
          variant: 'confirm',
          onPress: confirm,
        },
      ];
      ctx.controls.set(buttons);
    }

    function startNewProblem(): void {
      const next = pickStart(generator, quiz);
      state.problem = next.problem;
      setSize(next.length, next.width, next.height);
      showStatus();
    }

    function onCorrect(): void {
      ctx.audio.play('success');
      ctx.feedback.correct(ctx.t('volumeBuilder.correct', { volume: state.problem.target }));
      track(punch(cubeGroup, 0.14));
      celebrate();
    }

    function onWrong(): void {
      ctx.audio.play('fail');
      ctx.feedback.wrong(ctx.t('volumeBuilder.wrong'));
      track(shake(cubeGroup, 0.07, 280));
    }

    function confirm(): void {
      const answer = { length: state.length, width: state.width, height: state.height };
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

      // Practice: correct → score + next problem; wrong → KEEP the box so the
      // child can fix the dimensions (no fail-out).
      if (ok) {
        state.streak += 1;
        onCorrect();
        ctx.score.add(POINTS_PER_CORRECT);
        if (state.streak > 0 && state.streak % 3 === 0) bigCelebrate();
        startNewProblem();
      } else {
        state.streak = 0;
        onWrong();
        showStatus();
      }
    }

    // Drag = fast sizing of the FOOTPRINT. Sweep out the base: right → wider (more
    // width); up → longer (more length). Under the orbit camera the length/depth
    // axis projects vertically (far = up), so NDC +y (screen-up) maps to more
    // length, matching DEFINITION 9 (drag up = more). Height stays on its buttons.
    const offDrag = ctx.input.on('drag', (p) => {
      setSize(pointerToDim(p.y), pointerToDim(p.x), state.height);
    });
    // dragEnd is a secondary submit path; the Check button is the primary one.
    const offDragEnd = ctx.input.on('dragEnd', confirm);

    setSize(state.length, state.width, state.height);
    setControls();
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

        cubeGroup.clear();
        ctx.scene.remove(cubeGroup);
        ctx.scene.remove(tankShell);
        ctx.scene.remove(tankEdges);
        ctx.scene.remove(tankBase);

        cubeGeo.dispose();
        cubeMat.dispose();
        tankShellGeo.dispose();
        tankShellMat.dispose();
        edgesGeo.dispose();
        edgesMat.dispose();
        baseGeo.dispose();
        baseMat.dispose();
      },
    };
  },
};

/**
 * Pick the next problem plus a START box whose volume differs from the target,
 * so a problem never opens already-solved. 1×1×1 (volume 1) works whenever the
 * target ≥ 2 (guaranteed by the generator); fall back to a 2×1×1 strip.
 */
function pickStart(
  generator: ReturnType<typeof createVolumeCubeFillGenerator>,
  quiz: ReturnType<typeof createQuizController<VolumeProblem>> | null
): { problem: VolumeProblem; length: number; width: number; height: number } {
  const problem = quiz ? quiz.state().current : generator.next();
  if (problem.target !== 1) return { problem, length: 1, width: 1, height: 1 };
  return { problem, length: 2, width: 1, height: 1 };
}
