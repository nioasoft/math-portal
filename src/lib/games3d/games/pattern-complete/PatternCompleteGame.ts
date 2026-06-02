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
  createPatternCompleteGenerator,
  SEQUENCE_LENGTH,
  MAX_HEIGHT,
  type PatternCompleteProblem,
} from './problems';

// Theme: a BUILDING-BLOCKS construction site / staircase. A row of cube-towers
// whose heights follow an arithmetic rule (e.g. 2,4,6,?,…); ONE tower is empty —
// just a glowing platform marked "?". The child works out the rule and BUILDS the
// missing tower to the right height with −/+ or by dragging UP, then בדוק checks.
//
// The scene lives in the XY plane facing a locked front camera (like
// clock-builder): towers grow UP = +Y, and drag-x/-y → world-x/-y is monotonic
// (no inversion). All towers sit ON a contrasting ground slab so nothing is
// occluded by the clay ground plane.

const QUIZ_LENGTH = 10;
const POINTS_PER_CORRECT = 10;
const POP_STAGGER_MS = 26; // gentle per-cube delay so a tower grows alive
const MAX_BUILD = 10; // count input clamp upper bound (a touch above MAX_HEIGHT)

// Tower / cube geometry (procedural, front-facing in the XY plane).
const CUBE = 1.0; // edge of a unit block
const STACK_GAP = 0.06; // tiny gap between stacked cubes
const PITCH = CUBE + STACK_GAP; // vertical distance between cube centers
const TOWER_GAP = 2.4; // x-distance between tower centers
const GROUND_Y = 0; // tower bases sit at y=0 (content grows upward)
const PLATFORM_H = 0.4; // thickness of each tower's base pad
const PLATFORM_Y = GROUND_Y - PLATFORM_H / 2; // pad centered just below y=0
const Z = 0; // everything in the z=0 plane facing the camera

// Construction-site palette. GIVEN towers are a calm slate-blue; the child's
// MISSING tower is a saturated safety-orange so it clearly reads as "theirs".
// The gap platform glows so the empty slot is obvious. Strong contrast against
// the light clay sky and the dark ground slab.
const GIVEN_COLOR = PALETTE.sky; // calm blue blocks (the clues)
const BUILT_COLOR = PALETTE.coral; // saturated accent — the child's tower
const GROUND_COLOR = 0x3b3026; // dark earthy slab under the row (contrast + shadow)
const PAD_COLOR = 0x6b5a45; // wooden base pad under each given tower
const GAP_PAD_COLOR = PALETTE.sun; // glowing yellow pad marks the empty slot

interface TowerView {
  group: THREE.Group; // holds the stacked cubes for this tower
  x: number; // world-x of the tower center
}

export const patternCompleteGame: Game3D = {
  meta: {
    id: 'pattern-complete',
    i18nKey: 'games3d.patternComplete',
    topic: 'series',
    difficulty: 3,
    gradeRange: [2, 4],
    estimatedSeconds: 90,
    supportedModes: ['practice', 'quiz'],
  },
  init(ctx) {
    // Front-facing locked camera. The row is `SEQUENCE_LENGTH` towers wide and up
    // to `MAX_HEIGHT` cubes tall — frame both with margin. Distance derived from
    // the larger of width/height extents under the ~60° vertical FOV.
    const rowWidth = (SEQUENCE_LENGTH - 1) * TOWER_GAP + CUBE; // ≈ 8.2
    const towerTall = MAX_HEIGHT * PITCH; // ≈ 8.5
    // Look at the vertical middle of the content so both the bases and the tall
    // tower tops fit. Distance ~ fits ~12 units of vertical extent with margin.
    const lookY = towerTall * 0.45;
    ctx.presets.camera.locked(new THREE.Vector3(0, lookY, 17), new THREE.Vector3(0, lookY, 0));

    // Clay/toy look. ground:false because we lay our OWN dark slab at y=0 (the
    // clay ground would clash with the construction-site theme and could occlude).
    const clayLook = applyClayLook(ctx, {
      topColor: '#cfe2f2',
      bottomColor: '#f3e6c7',
      ground: false,
      shadowArea: 12,
      fog: false,
    });

    const generator = createPatternCompleteGenerator();
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

    // ---- Shared, reused resources (ONE geometry + material per visual kind) ----
    const cubeGeo = roundedBox(CUBE, CUBE, CUBE, 0.12, 3);
    const givenMat = new THREE.MeshStandardMaterial({ color: GIVEN_COLOR, roughness: 0.6, metalness: 0.04 });
    const builtMat = new THREE.MeshStandardMaterial({ color: BUILT_COLOR, roughness: 0.55, metalness: 0.05 });

    // Base pad under each tower (one geo; two mats: normal vs glowing gap pad).
    const padGeo = roundedBox(CUBE + 0.45, PLATFORM_H, CUBE + 0.45, 0.12, 3);
    const padMat = new THREE.MeshStandardMaterial({ color: PAD_COLOR, roughness: 0.85, metalness: 0.02 });
    const gapPadMat = new THREE.MeshStandardMaterial({
      color: GAP_PAD_COLOR,
      roughness: 0.5,
      metalness: 0.05,
      emissive: 0x8a6a10,
      emissiveIntensity: 0.6,
    });

    // Dark ground slab spanning the whole row (contrast backdrop, catches shadow).
    const slabW = rowWidth + 1.6;
    const slabGeo = roundedBox(slabW, 0.5, CUBE + 1.4, 0.18, 3);
    const slabMat = new THREE.MeshStandardMaterial({ color: GROUND_COLOR, roughness: 0.95, metalness: 0.02 });

    // Floating "?" marker for the empty gap tower (a flat plane with a canvas
    // texture, billboarded toward the camera by sitting in the z=0 plane).
    const markerTex = makeQuestionTexture();
    const markerGeo = new THREE.PlaneGeometry(1.4, 1.4);
    const markerMat = new THREE.MeshBasicMaterial({ map: markerTex, transparent: true });

    // ---- Scene graph (everything lives under sceneRoot, added to the scene) ----
    const sceneRoot = new THREE.Group();
    ctx.scene.add(sceneRoot);

    const slab = new THREE.Mesh(slabGeo, slabMat);
    slab.position.set(0, GROUND_Y - PLATFORM_H - 0.25, Z);
    slab.receiveShadow = true;
    sceneRoot.add(slab);

    // X of tower i, centered around the origin.
    function towerX(i: number): number {
      return (i - (SEQUENCE_LENGTH - 1) / 2) * TOWER_GAP;
    }

    // Pads + per-tower cube groups (one group per tower so each rebuilds/clears
    // independently). Pads are static, set to scale 1 (NOT popIn — §13c).
    const pads: THREE.Mesh[] = [];
    const towers: TowerView[] = [];
    for (let i = 0; i < SEQUENCE_LENGTH; i++) {
      const x = towerX(i);
      const pad = new THREE.Mesh(padGeo, padMat);
      pad.position.set(x, PLATFORM_Y, Z);
      pad.scale.setScalar(1);
      pad.receiveShadow = true;
      pad.castShadow = true;
      sceneRoot.add(pad);
      pads.push(pad);

      const group = new THREE.Group();
      group.position.set(0, 0, 0);
      sceneRoot.add(group);
      towers.push({ group, x });
    }

    // The floating "?" marker — repositioned over the gap tower each problem.
    const marker = new THREE.Mesh(markerGeo, markerMat);
    marker.scale.setScalar(1);
    marker.visible = false;
    sceneRoot.add(marker);

    const first = quiz ? quiz.state().current : generator.next();
    const state = {
      problem: first as PatternCompleteProblem,
      built: 0, // height of the child's gap tower (starts 0 — never opens solved)
      streak: 0,
      answered: 0,
    };

    function showPrompt(): void {
      // TASK ONLY — never echoes the rule, step, or the built value.
      ctx.prompt.set(ctx.t('patternComplete.prompt'));
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

    /** Y-center of the n-th (0-based) cube in a tower sitting on the pad. */
    function cubeY(n: number): number {
      return GROUND_Y + CUBE / 2 + n * PITCH;
    }

    /**
     * Stack `count` cubes in a tower group using the given material. Cubes at
     * index ≥ prevCount pop in (newly placed) when animating; existing ones snap.
     */
    function fillTower(view: TowerView, count: number, mat: THREE.Material, prevCount: number, animate: boolean): void {
      view.group.clear();
      let newOrdinal = 0;
      for (let n = 0; n < count; n++) {
        const cube = new THREE.Mesh(cubeGeo, mat);
        cube.position.set(view.x, cubeY(n), Z);
        cube.castShadow = true;
        cube.receiveShadow = true;
        if (animate && n >= prevCount) {
          track(popIn(cube, { delay: newOrdinal * POP_STAGGER_MS }));
          newOrdinal += 1;
        }
        view.group.add(cube);
      }
    }

    /** Rebuild only the child's gap tower (the given towers never change mid-problem). */
    function rebuildGap(prevBuilt: number, animate: boolean): void {
      const gap = towers[state.problem.gapIndex];
      fillTower(gap, state.built, builtMat, prevBuilt, animate);
      // Marker shows while the slot is still empty; hides once they place a cube.
      marker.visible = state.built === 0;
    }

    /** Build all given (clue) towers + reset pads/marker for the current problem. */
    function buildProblem(animateGiven: boolean): void {
      const { heights, gapIndex } = state.problem;
      for (let i = 0; i < SEQUENCE_LENGTH; i++) {
        if (i === gapIndex) {
          // Gap tower: glowing pad, no clue cubes; the child fills it.
          pads[i].material = gapPadMat;
          towers[i].group.clear();
        } else {
          pads[i].material = padMat;
          fillTower(towers[i], heights[i], givenMat, 0, animateGiven);
        }
      }
      // Park the "?" marker just above the empty gap pad.
      marker.position.set(towerX(gapIndex), GROUND_Y + 1.0, Z + 0.6);
      marker.visible = state.built === 0;
    }

    function setBuilt(next: number, animate: boolean): void {
      const prev = state.built;
      state.built = Math.max(0, Math.min(MAX_BUILD, next));
      rebuildGap(prev, animate);
    }

    function setControls(): void {
      const buttons: ControlButton[] = [
        { id: 'value-dec', label: `${ctx.t('controls.value')} −`, onPress: () => setBuilt(state.built - 1, true) },
        { id: 'value-inc', label: `${ctx.t('controls.value')} +`, onPress: () => setBuilt(state.built + 1, true) },
        { id: 'reset', label: ctx.t('controls.reset'), variant: 'reset', onPress: resetBuild },
        { id: 'check', label: ctx.t('controls.check'), variant: 'confirm', onPress: confirm },
      ];
      ctx.controls.set(buttons);
    }

    function resetBuild(): void {
      setBuilt(0, false);
    }

    function startNewProblem(): void {
      state.built = 0;
      buildProblem(true);
      rebuildGap(0, false);
      showPrompt();
      showStatus();
    }

    function onCorrect(): void {
      ctx.audio.play('success');
      ctx.feedback.correct(ctx.t('patternComplete.correct', { value: state.problem.missing }));
      track(punch(towers[state.problem.gapIndex].group, 0.18));
      celebrate();
    }

    function onWrong(): void {
      ctx.audio.play('fail');
      ctx.feedback.wrong(ctx.t('patternComplete.wrong'));
      track(shake(towers[state.problem.gapIndex].group, 0.08, 280));
    }

    function confirm(): void {
      const answer = state.built;
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

      // Practice: correct → score + next problem; wrong → KEEP the build to fix.
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

    // Drag = fast build. Dragging UP makes the gap tower taller; natural direction
    // (up = more, never inverted). Map NDC y (−1..1) to a height 0..MAX_BUILD. The
    // locked front camera keeps NDC +y = world up so this is monotonic.
    const offDrag = ctx.input.on('drag', (p) => {
      const t = (p.y + 1) / 2; // 0..1 (bottom→top of screen)
      setBuilt(Math.round(t * MAX_BUILD), false);
    });
    // dragEnd is a secondary submit path; the בדוק button is the primary one.
    const offDragEnd = ctx.input.on('dragEnd', confirm);

    startNewProblem();
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

        for (const tower of towers) tower.group.clear();
        sceneRoot.clear(); // detach ALL children (tower groups, pads, slab, marker)
        ctx.scene.remove(sceneRoot);

        cubeGeo.dispose();
        givenMat.dispose();
        builtMat.dispose();
        padGeo.dispose();
        padMat.dispose();
        gapPadMat.dispose();
        slabGeo.dispose();
        slabMat.dispose();
        markerGeo.dispose();
        markerMat.dispose();
        markerTex.dispose();
      },
    };
  },
};

/** A small canvas texture drawing a bold dark "?" on a transparent background. */
function makeQuestionTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const g = canvas.getContext('2d')!;
  g.clearRect(0, 0, size, size);
  g.fillStyle = '#2a2018'; // dark glyph — strong contrast on the light scene
  g.font = 'bold 200px sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('?', size / 2, size / 2 + 8);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}
