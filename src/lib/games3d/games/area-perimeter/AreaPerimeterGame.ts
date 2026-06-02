import * as THREE from 'three';
import type { Tween } from '@tweenjs/tween.js';
import type { ControlButton, Game3D } from '@/lib/games3d/types';
import { createQuizController } from '@/lib/games3d/quiz/controller';
import { applyClayLook, roundedBox, popIn, punch, shake, celebrate, bigCelebrate, computeStars, PALETTE } from '@/lib/games3d/kit';
import { createAreaPerimeterGenerator, MAX_SIDE, type AreaPerimeterProblem } from './problems';

// Theme: a GARDEN PLOT viewed top-down. The rectangle is a planted patch built
// from unit grass tiles (area = how many tiles are planted). A low wooden fence
// frames the current rectangle so the perimeter — the boundary you'd walk around
// — is visually obvious. The prompt says whether the goal is AREA (tiles) or
// PERIMETER (the fence around the edge). Resize by dragging or with the overlay
// width/height ± buttons, then בדוק to check. Consistent with the sibling games.
const TILE = 0.95; // visual footprint of a unit tile (a small gap reads as rows)
const STEP = 1; // grid step = one unit (so width/height map 1:1 to tile counts)
const TILE_HEIGHT = 0.22; // a little thickness so tiles read as planted beds
const TILE_Y = TILE_HEIGHT / 2;
const MIN_SIDE = 1;
const QUIZ_LENGTH = 10;
const POINTS_PER_CORRECT = 10;
const POP_STAGGER_MS = 16; // gentle per-tile delay so the plot grows alive, not heavy

// Garden palette: two greens cycled by row for a planted-bed feel, plus a warm
// wood tone for the perimeter fence so the boundary stands apart from the fill.
const GRASS_COLORS = [PALETTE.mint, 0x57b86a] as const;
const SOIL_COLOR = 0x6f4e37; // matte soil tray under the plot (catches the shadow)
const FENCE_COLOR = 0xb07a45; // wooden fence posts/rails
const FENCE_POST_W = 0.12; // square cross-section of a rail
const FENCE_HEIGHT = 0.5; // how tall the fence rails stand
const FENCE_Y = FENCE_HEIGHT / 2;

/** Map a normalized pointer coordinate (NDC, -1..1) to an integer side 1..MAX. */
function pointerToSide(normalized: number): number {
  // NDC -1 → 1 unit, +1 → MAX units (linear, no inversion).
  const t = (normalized + 1) / 2; // 0..1
  const side = Math.round(t * (MAX_SIDE - 1)) + 1;
  return Math.max(MIN_SIDE, Math.min(MAX_SIDE, side));
}

export const areaPerimeterGame: Game3D = {
  meta: {
    id: 'area-perimeter',
    i18nKey: 'games3d.areaPerimeter',
    topic: 'geometry',
    difficulty: 3,
    gradeRange: [3, 4],
    estimatedSeconds: 150,
    supportedModes: ['practice', 'quiz'],
  },
  init(ctx) {
    // Top-down view centered on the buildable grid so width/height are unambiguous.
    ctx.presets.camera.topDown(new THREE.Vector3(0, 0, 0), 13);

    // Clay/toy look — warm garden ambience. Ground disabled (top-down: the soil
    // tray reads as the surface). The engine provides the soft shadow.
    const clayLook = applyClayLook(ctx, {
      topColor: '#d7f0d0',
      bottomColor: '#f3e6c7',
      ground: false,
      shadowArea: 9,
      fog: false,
    });

    const generator = createAreaPerimeterGenerator();
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

    // ---- Shared, reused resources ----
    const tileGeo = roundedBox(TILE, TILE_HEIGHT, TILE, 0.1, 3);
    const tileMats = GRASS_COLORS.map(
      (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.75, metalness: 0.02 })
    );
    // Fence rails are unit cubes scaled per segment (one geometry, one material).
    const fenceGeo = roundedBox(1, FENCE_HEIGHT, 1, 0.05, 2);
    const fenceMat = new THREE.MeshStandardMaterial({ color: FENCE_COLOR, roughness: 0.7, metalness: 0.03 });

    // Soil tray: a thin matte base under the plot (frames the area, catches shadow).
    const traySize = MAX_SIDE * STEP + 0.6;
    const trayGeo = roundedBox(traySize, 0.14, traySize, 0.2, 3);
    const trayMat = new THREE.MeshStandardMaterial({ color: SOIL_COLOR, roughness: 0.95, transparent: true, opacity: 0.5 });
    const tray = new THREE.Mesh(trayGeo, trayMat);
    tray.position.y = -0.08;
    tray.receiveShadow = true;
    ctx.scene.add(tray);

    // Tiles and fence live in their own groups so each can be punched/cleared.
    const tileGroup = new THREE.Group();
    const fenceGroup = new THREE.Group();
    ctx.scene.add(tileGroup);
    ctx.scene.add(fenceGroup);

    const start0 = pickStart(generator, quiz);
    const state = {
      problem: start0.problem,
      width: start0.width,
      height: start0.height,
      streak: 0,
      answered: 0,
    };

    function kindLabel(): string {
      return state.problem.kind === 'area'
        ? ctx.t('areaPerimeter.kindArea')
        : ctx.t('areaPerimeter.kindPerimeter');
    }
    function metric(): number {
      return state.problem.kind === 'area'
        ? state.width * state.height
        : 2 * (state.width + state.height);
    }
    function showPrompt(): void {
      ctx.prompt.set(
        ctx.t('areaPerimeter.prompt', {
          kindLabel: kindLabel(),
          target: state.problem.target,
          w: state.width,
          h: state.height,
          value: metric(),
        })
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

    // Center the plot at the origin so the camera frames it whatever the size.
    function offsetX(): number {
      return -((state.width - 1) * STEP) / 2;
    }
    function offsetZ(): number {
      return -((state.height - 1) * STEP) / 2;
    }

    /**
     * Rebuild grass tiles for width × height. Tiles at index >= prevCount are
     * "newly planted" and pop in with a slight stagger; existing tiles stay put so
     * resizing feels smooth and cheap. (Positions still shift because the plot is
     * re-centered, so we set every tile's position but only animate the new ones.)
     */
    function buildTiles(prevCount: number): void {
      tileGroup.clear();
      const ox = offsetX();
      const oz = offsetZ();
      let index = 0;
      let newOrdinal = 0;
      for (let r = 0; r < state.height; r++) {
        for (let c = 0; c < state.width; c++) {
          const tile = new THREE.Mesh(tileGeo, tileMats[(r + c) % tileMats.length]);
          tile.position.set(ox + c * STEP, TILE_Y, oz + r * STEP);
          tile.castShadow = true;
          tile.receiveShadow = true;
          if (index >= prevCount) {
            track(popIn(tile, { delay: newOrdinal * POP_STAGGER_MS }));
            newOrdinal += 1;
          }
          tileGroup.add(tile);
          index += 1;
        }
      }
    }

    /**
     * Rebuild the perimeter fence framing the current rectangle. Four rails (one
     * per side), each a scaled cube spanning that edge, sitting just outside the
     * tiles. Rebuilt whenever the rectangle changes so "perimeter" stays visible.
     */
    function buildFence(animate: boolean): void {
      fenceGroup.clear();
      const ox = offsetX();
      const oz = offsetZ();
      // Outer bounds of the planted area = tile centers ± half a unit. The rails
      // run a touch longer (FENCE_POST_W) so the four corners overlap cleanly.
      const lenX = state.width * STEP + FENCE_POST_W;
      const lenZ = state.height * STEP + FENCE_POST_W;
      const minX = ox - STEP / 2;
      const maxX = ox + (state.width - 1) * STEP + STEP / 2;
      const minZ = oz - STEP / 2;
      const maxZ = oz + (state.height - 1) * STEP + STEP / 2;
      // One rail per edge, as { scaleX, scaleZ, posX, posZ }.
      const railSpecs: Array<{ sx: number; sz: number; x: number; z: number }> = [
        { sx: lenX, sz: FENCE_POST_W, x: 0, z: minZ }, // top edge (-Z)
        { sx: lenX, sz: FENCE_POST_W, x: 0, z: maxZ }, // bottom edge (+Z)
        { sx: FENCE_POST_W, sz: lenZ, x: minX, z: 0 }, // left edge (-X)
        { sx: FENCE_POST_W, sz: lenZ, x: maxX, z: 0 }, // right edge (+X)
      ];
      for (const spec of railSpecs) {
        const rail = new THREE.Mesh(fenceGeo, fenceMat);
        rail.scale.set(spec.sx, 1, spec.sz);
        rail.position.set(spec.x, FENCE_Y, spec.z);
        rail.castShadow = true;
        rail.receiveShadow = true;
        fenceGroup.add(rail);
      }
      if (animate) track(popIn(fenceGroup, { scale: 1 }));
    }

    /** Apply a new rectangle size: re-plant tiles + reframe the fence + prompt. */
    function setSize(width: number, height: number, animateFence: boolean): void {
      const prevCount = state.width * state.height;
      state.width = Math.max(MIN_SIDE, Math.min(MAX_SIDE, width));
      state.height = Math.max(MIN_SIDE, Math.min(MAX_SIDE, height));
      buildTiles(prevCount);
      buildFence(animateFence);
      showPrompt();
    }

    function setControls(): void {
      const buttons: ControlButton[] = [
        {
          id: 'width-dec',
          label: `${ctx.t('controls.width')} −`,
          onPress: () => setSize(state.width - 1, state.height, true),
        },
        {
          id: 'width-inc',
          label: `${ctx.t('controls.width')} +`,
          onPress: () => setSize(state.width + 1, state.height, true),
        },
        {
          id: 'height-dec',
          label: `${ctx.t('controls.height')} −`,
          onPress: () => setSize(state.width, state.height - 1, true),
        },
        {
          id: 'height-inc',
          label: `${ctx.t('controls.height')} +`,
          onPress: () => setSize(state.width, state.height + 1, true),
        },
        {
          id: 'reset',
          label: ctx.t('controls.reset'),
          variant: 'reset',
          onPress: () => setSize(1, 1, true),
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
      setSize(next.width, next.height, false);
      showStatus();
    }

    function onCorrect(): void {
      ctx.audio.play('success');
      ctx.feedback.correct(
        ctx.t('areaPerimeter.correct', {
          kindLabel: kindLabel(),
          target: state.problem.target,
        })
      );
      // Punch the whole plot (tiles + fence) so both the area and boundary react.
      track(punch(tileGroup, 0.14));
      track(punch(fenceGroup, 0.14));
      celebrate();
    }

    function onWrong(): void {
      ctx.audio.play('fail');
      ctx.feedback.wrong(ctx.t('areaPerimeter.wrong'));
      track(shake(tileGroup, 0.07, 280));
      track(shake(fenceGroup, 0.07, 280));
    }

    function confirm(): void {
      const answer = { width: state.width, height: state.height };
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

      // Practice: correct → score + next problem; wrong → keep the plot to fix.
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

    // Drag = fast resize. Sweep out the rectangle: right → wider; toward the
    // viewer (NDC -y, bottom of screen) → taller. Under the top-down camera NDC +y
    // is the far/top edge, so negating y makes dragging downward grow the plot.
    const offDrag = ctx.input.on('drag', (p) => {
      setSize(pointerToSide(p.x), pointerToSide(-p.y), false);
    });
    // dragEnd is a secondary submit path; the בדוק button is the primary one.
    const offDragEnd = ctx.input.on('dragEnd', confirm);

    setSize(state.width, state.height, true);
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

        tileGroup.clear();
        fenceGroup.clear();
        ctx.scene.remove(tileGroup);
        ctx.scene.remove(fenceGroup);
        ctx.scene.remove(tray);

        tileGeo.dispose();
        tileMats.forEach((m) => m.dispose());
        fenceGeo.dispose();
        fenceMat.dispose();
        trayGeo.dispose();
        trayMat.dispose();
      },
    };
  },
};

/**
 * Pick the next problem plus a START rectangle whose area AND perimeter both
 * differ from the target, so a problem never opens already-solved. Tries a few
 * small shapes, falls back to a guaranteed-mismatch 1×k strip.
 */
function pickStart(
  generator: ReturnType<typeof createAreaPerimeterGenerator>,
  quiz: ReturnType<typeof createQuizController<AreaPerimeterProblem>> | null
): { problem: AreaPerimeterProblem; width: number; height: number } {
  const problem = quiz ? quiz.state().current : generator.next();
  const target = problem.target;
  const candidates: Array<[number, number]> = [
    [1, 1],
    [1, 2],
    [2, 1],
    [1, 3],
  ];
  for (const [w, h] of candidates) {
    if (w * h !== target && 2 * (w + h) !== target) return { problem, width: w, height: h };
  }
  for (let k = 1; k <= MAX_SIDE; k++) {
    if (k !== target && 2 * (1 + k) !== target) return { problem, width: 1, height: k };
  }
  return { problem, width: 1, height: 1 };
}
