import * as THREE from 'three';
import type { Tween } from '@tweenjs/tween.js';
import type { ControlButton, Game3D } from '@/lib/games3d/types';
import { createQuizController } from '@/lib/games3d/quiz/controller';
import { applyClayLook, roundedBox, popIn, punch, shake, celebrate, bigCelebrate, computeStars, PALETTE } from '@/lib/games3d/kit';
import {
  createPlaceValueGenerator,
  normalize,
  MAX_PER_PLACE,
  type PlaceCounts,
  type PlaceValueProblem,
} from './problems';

// Theme: a WAREHOUSE with base-ten blocks stacked on three shelves. Each shelf
// is one place column, and the box SIZE encodes its value so place value reads
// at a glance:
//   ones      = small cube            (1)
//   tens      = tall rod              (10)  — ten cubes' worth, drawn as one rod
//   hundreds  = wide flat pallet      (100) — ten rods' worth, drawn as one slab
// You add blocks to a column with its −/+ control (precise) or by dragging UP
// over the column (fast). When a column hits 10, a CARRY animation bundles the
// ten small blocks into one block of the next size up and the higher place ++ —
// the total never changes, only how it's grouped. בדוק grades; the prompt only
// ever shows the TARGET number, never the live built value.

const QUIZ_LENGTH = 10;
const POINTS_PER_CORRECT = 10;
const POP_STAGGER_MS = 30; // gentle per-block delay so a stack grows alive

// Three place columns, laid left→right. With dir RTL the scene is still spatial
// (hundreds on one end, ones on the other); column LABELS come from i18n so the
// reading order is handled by the HUD/controls, not the 3D layout.
const COLUMN_GAP = 4.2; // x-distance between column centers
const ONES_X = COLUMN_GAP; // ones on the +x end
const TENS_X = 0;
const HUNDREDS_X = -COLUMN_GAP; // hundreds on the -x end

// Block dimensions (procedural; size encodes place value).
const CUBE = 0.9; // ones: small cube
const ROD_W = 0.9; // tens: a tall rod (≈ ten stacked cubes)
const ROD_H = CUBE; // one "layer" tall when stacked; rods stack like cubes
const ROD_D = 0.9;
const SLAB_W = 2.4; // hundreds: a wide flat pallet
const SLAB_H = 0.55;
const SLAB_D = 2.4;

const STACK_GAP = 0.06; // tiny gap between stacked blocks
const FLOOR_Y = 0.0; // shelf surface height (blocks sit on top)

// Column tints — distinct hues so the three places never blur together.
const ONES_COLOR = PALETTE.sun; // bright yellow small cubes
const TENS_COLOR = PALETTE.sky; // blue rods
const HUNDREDS_COLOR = PALETTE.coral; // coral pallets
const SHELF_COLOR = 0x8a5a3b; // warm wood shelf

type Place = 'hundreds' | 'tens' | 'ones';

interface ColumnView {
  place: Place;
  x: number;
  group: THREE.Group;
  geo: THREE.BufferGeometry;
  mat: THREE.MeshStandardMaterial;
  blockH: number; // vertical pitch when stacking this kind of block
}

export const placeValueBuilderGame: Game3D = {
  meta: {
    id: 'place-value-builder',
    i18nKey: 'games3d.placeValue',
    topic: 'arithmetic',
    difficulty: 2,
    gradeRange: [2, 4],
    estimatedSeconds: 120,
    supportedModes: ['practice', 'quiz'],
  },
  init(ctx) {
    // Slightly raised orbit so the three stacks have depth and a carry pop reads.
    ctx.presets.camera.orbit(new THREE.Vector3(0, 1.2, 0), 13);

    const clayLook = applyClayLook(ctx, {
      topColor: '#dDe6f2',
      bottomColor: '#f3e6c7',
      ground: true,
      shadowArea: 11,
      fog: false,
    });

    // Difficulty by grade band: grade 2 stays at tens+ones (target ≤ 99), grades
    // 3–4 use full hundreds (≤ 999). The shell doesn't pass a grade, so we use a
    // fixed mid-range here (12..999) and let the column controls cap each place.
    const generator = createPlaceValueGenerator(12, 999);
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

    // ---- Shared, reused resources (one geometry + material per block kind) ----
    const cubeGeo = roundedBox(CUBE, CUBE, CUBE, 0.12, 3);
    const cubeMat = new THREE.MeshStandardMaterial({ color: ONES_COLOR, roughness: 0.6, metalness: 0.05 });
    const rodGeo = roundedBox(ROD_W, ROD_H, ROD_D, 0.12, 3);
    const rodMat = new THREE.MeshStandardMaterial({ color: TENS_COLOR, roughness: 0.6, metalness: 0.05 });
    const slabGeo = roundedBox(SLAB_W, SLAB_H, SLAB_D, 0.14, 3);
    const slabMat = new THREE.MeshStandardMaterial({ color: HUNDREDS_COLOR, roughness: 0.6, metalness: 0.05 });

    // A wooden shelf base under each column (frames the place, catches shadow).
    const shelfGeo = roundedBox(SLAB_W + 0.8, 0.3, SLAB_D + 0.8, 0.18, 3);
    const shelfMat = new THREE.MeshStandardMaterial({ color: SHELF_COLOR, roughness: 0.9, metalness: 0.02 });

    const sceneRoot = new THREE.Group();
    ctx.scene.add(sceneRoot);

    const columns: Record<Place, ColumnView> = {
      hundreds: makeColumn('hundreds', HUNDREDS_X, slabGeo, slabMat, SLAB_H + STACK_GAP),
      tens: makeColumn('tens', TENS_X, rodGeo, rodMat, ROD_H + STACK_GAP),
      ones: makeColumn('ones', ONES_X, cubeGeo, cubeMat, CUBE + STACK_GAP),
    };

    function makeColumn(
      place: Place,
      x: number,
      geo: THREE.BufferGeometry,
      mat: THREE.MeshStandardMaterial,
      blockH: number
    ): ColumnView {
      const group = new THREE.Group();
      group.position.x = x;
      sceneRoot.add(group);
      const shelf = new THREE.Mesh(shelfGeo, shelfMat);
      shelf.position.set(x, -0.16, 0);
      shelf.receiveShadow = true;
      shelf.castShadow = true;
      sceneRoot.add(shelf);
      return { place, x, group, geo, mat, blockH };
    }

    const first = quiz ? quiz.state().current : generator.next();
    const state = {
      problem: first as PlaceValueProblem,
      counts: { hundreds: 0, tens: 0, ones: 0 } as PlaceCounts,
      streak: 0,
      answered: 0,
      busy: false, // true while a carry animation plays (blocks input churn)
    };

    // setTimeout handles for in-flight carry beats — cleared on dispose.
    const pendingTimeouts = new Set<ReturnType<typeof setTimeout>>();

    function showPrompt(): void {
      // TASK ONLY — never echoes the live built value.
      ctx.prompt.set(ctx.t('placeValue.prompt', { target: state.problem.target }));
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

    /** Y-center of the n-th (0-based) stacked block in a column. */
    function blockY(column: ColumnView, n: number, height: number): number {
      return FLOOR_Y + height / 2 + n * column.blockH;
    }

    /**
     * Rebuild every block in a column to match `state.counts[place]`. Blocks at
     * index ≥ prevCount pop in (newly added); existing ones snap to place. Each
     * column draws a different-SIZED block so place value reads at a glance.
     */
    function rebuildColumn(column: ColumnView, prevCount: number, animate: boolean): void {
      column.group.clear();
      const count = state.counts[column.place];
      const height =
        column.place === 'hundreds' ? SLAB_H : column.place === 'tens' ? ROD_H : CUBE;
      let newOrdinal = 0;
      for (let i = 0; i < count; i++) {
        const block = new THREE.Mesh(column.geo, column.mat);
        block.position.set(0, blockY(column, i, height), 0);
        block.castShadow = true;
        block.receiveShadow = true;
        if (animate && i >= prevCount) {
          track(popIn(block, { delay: newOrdinal * POP_STAGGER_MS }));
          newOrdinal += 1;
        }
        column.group.add(block);
      }
    }

    function rebuildAll(prev: PlaceCounts, animate: boolean): void {
      rebuildColumn(columns.hundreds, prev.hundreds, animate);
      rebuildColumn(columns.tens, prev.tens, animate);
      rebuildColumn(columns.ones, prev.ones, animate);
      frameCamera();
    }

    /** Dynamically adjust orbit distance so tall stacks stay in view. */
    function frameCamera(): void {
      const maxH = Math.max(
        state.counts.hundreds * (SLAB_H + STACK_GAP),
        state.counts.tens * (ROD_H + STACK_GAP),
        state.counts.ones * (CUBE + STACK_GAP),
        1,
      );
      const contentH = maxH + 1.5;
      const pitch = Math.PI / 6;
      const fovRad = (60 * Math.PI) / 180;
      const vertDist = (contentH / 2) / Math.tan(fovRad / 2) + 2;
      const dist = Math.max(10, vertDist / Math.sin(pitch));
      const targetY = maxH / 2;
      ctx.presets.camera.orbit(new THREE.Vector3(0, targetY, 0), dist);
    }

    /**
     * Add `delta` blocks to a place (delta may be negative for the − button).
     * After the change we CARRY: any place that reached 10 is bundled into one
     * block of the next size up, with a punch on the freshly-bundled block. The
     * numeric value is preserved across the carry (normalize is value-stable).
     */
    function changePlace(place: Place, delta: number): void {
      if (state.busy) return;
      const prev: PlaceCounts = { ...state.counts };
      const raw = { ...state.counts, [place]: state.counts[place] + delta };
      // A place "overflows" when it just reached 10 (ones/tens only — hundreds is
      // the top place). We allow a transient 10 so the carry animation has the ten
      // small blocks to bundle. But if the higher place is already full (9), the
      // carry would push it past 999 → block the add instead of losing value.
      const higherFull =
        (place === 'ones' && state.counts.tens >= MAX_PER_PLACE) ||
        (place === 'tens' && state.counts.hundreds >= MAX_PER_PLACE);
      const overflowed =
        place !== 'hundreds' && raw[place] === MAX_PER_PLACE + 1 && !higherFull;
      if (raw[place] < 0) return; // − below zero: ignore
      if (place === 'hundreds' && raw.hundreds > MAX_PER_PLACE) return; // cap at 900s
      if (!overflowed && raw[place] > MAX_PER_PLACE) return; // manual cap (no skip)

      state.counts = raw;
      rebuildAll(prev, true);

      if (overflowed) {
        playCarry(place);
      }
      showPrompt();
    }

    /**
     * Carry animation: the place at 10 bundles into the next size up. We pop the
     * full column (the ten small blocks), then normalize (→ that place 0, higher
     * place +1) and punch the newly-bundled bigger block. Value is unchanged.
     */
    function playCarry(fromPlace: Place): void {
      const higher: Place = fromPlace === 'ones' ? 'tens' : 'hundreds';
      state.busy = true;
      const fromColumn = columns[fromPlace];
      const higherColumn = columns[higher];

      // 1) Punch the ten blocks about to be bundled (the "gather" gesture).
      track(punch(fromColumn.group, 0.18));

      // 2) After a short beat, regroup and present the new bigger block.
      const beat = ctx.prefersReducedMotion ? 0 : 320;
      const t = setTimeout(() => {
        const before: PlaceCounts = { ...state.counts };
        const after = normalize(state.counts); // value-preserving
        state.counts = after;
        rebuildAll(before, true);
        ctx.audio.play('click');
        // Punch the column that gained a block (the freshly-bundled bigger one).
        track(punch(higherColumn.group, 0.2));
        state.busy = false;
      }, beat);
      pendingTimeouts.add(t);
    }

    function setControls(): void {
      const buttons: ControlButton[] = [
        { id: 'hundreds-dec', label: `${ctx.t('controls.hundreds')} −`, onPress: () => changePlace('hundreds', -1) },
        { id: 'hundreds-inc', label: `${ctx.t('controls.hundreds')} +`, onPress: () => changePlace('hundreds', 1) },
        { id: 'tens-dec', label: `${ctx.t('controls.tens')} −`, onPress: () => changePlace('tens', -1) },
        { id: 'tens-inc', label: `${ctx.t('controls.tens')} +`, onPress: () => changePlace('tens', 1) },
        { id: 'ones-dec', label: `${ctx.t('controls.ones')} −`, onPress: () => changePlace('ones', -1) },
        { id: 'ones-inc', label: `${ctx.t('controls.ones')} +`, onPress: () => changePlace('ones', 1) },
        { id: 'reset', label: ctx.t('controls.reset'), variant: 'reset', onPress: resetBuild },
        { id: 'check', label: ctx.t('controls.check'), variant: 'confirm', onPress: confirm },
      ];
      ctx.controls.set(buttons);
    }

    function resetBuild(): void {
      if (state.busy) return;
      const prev: PlaceCounts = { ...state.counts };
      state.counts = { hundreds: 0, tens: 0, ones: 0 };
      rebuildAll(prev, false);
      showPrompt();
    }

    function startNewProblem(): void {
      const prev: PlaceCounts = { ...state.counts };
      state.counts = { hundreds: 0, tens: 0, ones: 0 };
      rebuildAll(prev, false);
      showPrompt();
      showStatus();
    }

    function onCorrect(): void {
      ctx.audio.play('success');
      ctx.feedback.correct(ctx.t('placeValue.correct', { target: state.problem.target }));
      track(punch(columns.hundreds.group, 0.16));
      track(punch(columns.tens.group, 0.16));
      track(punch(columns.ones.group, 0.16));
      celebrate();
    }

    function onWrong(): void {
      ctx.audio.play('fail');
      ctx.feedback.wrong(ctx.t('placeValue.wrong'));
      track(shake(columns.hundreds.group, 0.07, 280));
      track(shake(columns.tens.group, 0.07, 280));
      track(shake(columns.ones.group, 0.07, 280));
    }

    function confirm(): void {
      if (state.busy) return;
      const answer: PlaceCounts = { ...state.counts };
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
     * Which column is under the pointer? Map NDC x (−1..1) to the nearest of the
     * three column world-x positions. Returns the place whose center is closest.
     */
    function placeUnderPointerX(ndcX: number): Place {
      // NDC x roughly tracks world x left→right under the orbit camera; map the
      // three thirds of the screen to the three columns (hundreds | tens | ones).
      if (ndcX < -1 / 3) return 'hundreds';
      if (ndcX > 1 / 3) return 'ones';
      return 'tens';
    }

    // Drag = fast add. Dragging UP over a column adds one block per "notch" of
    // upward travel; natural direction (up = more, never inverted). We add at
    // most one per drag event so a sweep ramps a column smoothly without spikes,
    // and let the carry animation fire when a place crosses 10.
    let lastDragY = 0;
    const offDragStart = ctx.input.on('dragStart', (p) => {
      lastDragY = p.y;
    });
    const offDrag = ctx.input.on('drag', (p) => {
      if (state.busy) return;
      const dy = p.y - lastDragY; // NDC: +y is up
      if (dy > 0.08) {
        changePlace(placeUnderPointerX(p.x), 1);
        lastDragY = p.y;
      } else if (dy < -0.08) {
        changePlace(placeUnderPointerX(p.x), -1);
        lastDragY = p.y;
      }
    });
    // dragEnd is a secondary submit path; the בדוק button is the primary one.
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
        pendingTimeouts.forEach((t) => clearTimeout(t));
        pendingTimeouts.clear();
        stopAllTweens();
        ctx.controls.clear();
        ctx.prompt.clear();
        ctx.status.clear();
        clayLook.dispose();

        for (const col of Object.values(columns)) {
          col.group.clear();
        }
        sceneRoot.clear(); // detach ALL children (column groups + shelf meshes)
        ctx.scene.remove(sceneRoot);

        cubeGeo.dispose();
        cubeMat.dispose();
        rodGeo.dispose();
        rodMat.dispose();
        slabGeo.dispose();
        slabMat.dispose();
        shelfGeo.dispose();
        shelfMat.dispose();
      },
    };
  },
};
