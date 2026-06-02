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
import {
  createSubtractionGenerator,
  decrement,
  increment,
  borrow,
  higherPlace,
  toPlaceCounts,
  type SubtractionProblem,
  type PlaceCounts,
} from './problems';

// Theme: a STONE BRIDGE spanning a gap. Three place columns (hundreds | tens |
// ones) are stacks of stone blocks — the bridge is BUILT from the minuend A. The
// child takes the bridge APART stone by stone (the − button) down to the
// difference A − B. The signature move is the BORROW: when a column has no stone
// left to remove, pressing − makes one big "ten" stone in the next-higher column
// visibly CRACK and BREAK APART into ten small stones that fall into this column
// (a ten becomes ten ones) — then one is removed. This mirrors addition-mine's
// per-place build + regroup, but the regroup runs in REVERSE (breaking, not
// bundling) and the visual is a shattering stone, not a carry cart on a rail.

const QUIZ_LENGTH = 10;
const POINTS_PER_CORRECT = 10;
const POP_STAGGER_MS = 26; // gentle per-stone delay so a column rebuild reads alive

// Three place columns, laid left→right (hundreds | tens | ones).
const COLUMN_GAP = 3.4; // x-distance between column centers
const ONES_X = COLUMN_GAP; // ones on the +x end (drag-x → world-x monotonic)
const TENS_X = 0;
const HUNDREDS_X = -COLUMN_GAP;

// Stone-block dimensions per place. Sizes grow with place value so 1 vs 10 vs 100
// read at a glance (small cobble → block → big keystone slab).
const ONE_W = 0.85;
const ONE_H = 0.62;
const TEN_W = 1.15;
const TEN_H = 0.82;
const HUNDRED_W = 1.95;
const HUNDRED_H = 0.82;
const STONE_D = 1.0; // depth (all stones share a comfy depth)

const STACK_GAP = 0.08; // tiny mortar gap between stacked stones
const FLOOR_Y = 0.35; // bridge deck sits a little above y=0 (content above ground)

// Stone palette: saturated, readable stone tones (CONTRAST — dark/saturated, never
// faint light-on-light). Each place gets a distinct hue so place value reads.
const ONE_COLOR = PALETTE.sun; // warm sandstone cobbles (ones)
const TEN_COLOR = PALETTE.sky; // blue-grey block (tens)
const HUNDRED_COLOR = PALETTE.coral; // red keystone slab (hundreds)
const PIER_COLOR = 0x4a4038; // dark stone pier under each column
const DECK_COLOR = 0x6b5a48; // weathered deck plank spanning the piers

type Place = 'hundreds' | 'tens' | 'ones';

interface ColumnView {
  place: Place;
  x: number;
  group: THREE.Group; // holds the stones for this place
  geo: THREE.BufferGeometry;
  mat: THREE.MeshStandardMaterial;
  blockH: number; // vertical pitch when stacking this kind of stone
  stoneH: number; // stone height (for y-centering)
}

export const subtractionBridgeGame: Game3D = {
  meta: {
    id: 'subtraction-bridge',
    i18nKey: 'games3d.subtractionBridge',
    topic: 'arithmetic',
    difficulty: 2,
    gradeRange: [2, 4],
    estimatedSeconds: 120,
    supportedModes: ['practice', 'quiz'],
  },
  init(ctx) {
    // Straight-on locked camera (like clock-builder): front-facing scene, keeps
    // drag-x → world-x monotonic (natural directions) and frames the three wide
    // columns centered. Distance sized for the bridge's WIDTH (the limiting extent).
    ctx.presets.camera.locked(new THREE.Vector3(0, 2.6, 12.5), new THREE.Vector3(0, 2.2, 0));

    // Clay/toy look — open sky over a canyon. ground:false so the bridge (which
    // dips toward y=0) is never occluded by the clay ground plane.
    const clayLook = applyClayLook(ctx, {
      topColor: '#bfe3ff',
      bottomColor: '#7fa8c9',
      ground: false,
      shadowArea: 12,
      fog: true,
    });

    const generator = createSubtractionGenerator();
    const quiz =
      ctx.mode === 'quiz'
        ? createQuizController(generator, { length: QUIZ_LENGTH, pointsPerCorrect: POINTS_PER_CORRECT })
        : null;

    // ---- Tween tracking (no tween outlives its target) ----
    // {s} = popIn/punch scale, {t} = shake, {v} = tweenTo lerp (stone-break fall).
    const liveTweens = new Set<Tween<{ s: number } | { t: number } | { v: number }>>();
    function track(t: Tween<{ s: number }> | Tween<{ t: number }> | Tween<{ v: number }>): void {
      liveTweens.add(t as Tween<{ s: number } | { t: number } | { v: number }>);
    }
    function stopAllTweens(): void {
      liveTweens.forEach((t) => t.stop());
      liveTweens.clear();
    }

    // setTimeout handles for in-flight break beats — cleared on dispose.
    const pendingTimeouts = new Set<ReturnType<typeof setTimeout>>();

    // ---- Shared, reused resources (one geometry + material per stone kind) ----
    const oneGeo = roundedBox(ONE_W, ONE_H, STONE_D, 0.14, 3);
    const oneMat = new THREE.MeshStandardMaterial({ color: ONE_COLOR, roughness: 0.85, metalness: 0.04 });
    const tenGeo = roundedBox(TEN_W, TEN_H, STONE_D, 0.16, 3);
    const tenMat = new THREE.MeshStandardMaterial({ color: TEN_COLOR, roughness: 0.85, metalness: 0.04 });
    const hundredGeo = roundedBox(HUNDRED_W, HUNDRED_H, STONE_D, 0.18, 3);
    const hundredMat = new THREE.MeshStandardMaterial({ color: HUNDRED_COLOR, roughness: 0.85, metalness: 0.04 });

    // Stone pier under each column (frames the place, catches shadow).
    const pierGeo = roundedBox(HUNDRED_W + 0.5, 0.6, STONE_D + 0.4, 0.16, 3);
    const pierMat = new THREE.MeshStandardMaterial({ color: PIER_COLOR, roughness: 0.97, metalness: 0.03 });

    // Deck plank spanning the three piers (the bridge surface the stones rest on).
    const deckLen = COLUMN_GAP * 2 + HUNDRED_W + 1.0;
    const deckGeo = roundedBox(deckLen, 0.22, STONE_D + 0.7, 0.1, 2);
    const deckMat = new THREE.MeshStandardMaterial({ color: DECK_COLOR, roughness: 0.9, metalness: 0.06 });

    const sceneRoot = new THREE.Group();
    ctx.scene.add(sceneRoot);

    // Deck sits just under the stones' floor; piers below it.
    const DECK_Y = FLOOR_Y - 0.18;
    const deck = new THREE.Mesh(deckGeo, deckMat);
    deck.position.set(0, DECK_Y, 0);
    deck.receiveShadow = true;
    sceneRoot.add(deck);

    const columns: Record<Place, ColumnView> = {
      hundreds: makeColumn('hundreds', HUNDREDS_X, hundredGeo, hundredMat, HUNDRED_H + STACK_GAP, HUNDRED_H),
      tens: makeColumn('tens', TENS_X, tenGeo, tenMat, TEN_H + STACK_GAP, TEN_H),
      ones: makeColumn('ones', ONES_X, oneGeo, oneMat, ONE_H + STACK_GAP, ONE_H),
    };

    function makeColumn(
      place: Place,
      x: number,
      geo: THREE.BufferGeometry,
      mat: THREE.MeshStandardMaterial,
      blockH: number,
      stoneH: number
    ): ColumnView {
      const group = new THREE.Group();
      group.position.x = x;
      sceneRoot.add(group);
      const pier = new THREE.Mesh(pierGeo, pierMat);
      pier.position.set(x, DECK_Y - 0.45, 0);
      pier.receiveShadow = true;
      pier.castShadow = true;
      sceneRoot.add(pier);
      return { place, x, group, geo, mat, blockH, stoneH };
    }

    // first problem; counts OPEN at the minuend A (never already the answer, B≥1).
    const first = (quiz ? quiz.state().current : generator.next()) as SubtractionProblem;
    const state = {
      problem: first,
      counts: toPlaceCounts(first.a) as PlaceCounts,
      streak: 0,
      answered: 0,
      busy: false, // true while a stone-break animation plays (blocks input churn)
    };

    function showPrompt(): void {
      // TASK ONLY — "Subtract: A − B", never the live built value or the answer.
      ctx.prompt.set(ctx.t('subtractionBridge.prompt', { a: state.problem.a, b: state.problem.b }));
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

    /** Y-center of the n-th (0-based) stacked stone in a column. */
    function blockY(column: ColumnView, n: number): number {
      return FLOOR_Y + column.stoneH / 2 + n * column.blockH;
    }

    /**
     * Rebuild every stone in a column to match `state.counts[place]`. Stones at
     * index ≥ prevCount pop in (newly appeared, e.g. after a borrow drops ten into
     * a column); existing ones snap to place. Each column draws a different-SIZED
     * stone so place value reads at a glance.
     */
    function rebuildColumn(column: ColumnView, prevCount: number, animate: boolean): void {
      column.group.clear();
      const count = state.counts[column.place];
      let newOrdinal = 0;
      for (let i = 0; i < count; i++) {
        const stone = new THREE.Mesh(column.geo, column.mat);
        stone.position.set(0, blockY(column, i), 0);
        stone.castShadow = true;
        stone.receiveShadow = true;
        if (animate && i >= prevCount) {
          track(popIn(stone, { delay: newOrdinal * POP_STAGGER_MS }));
          newOrdinal += 1;
        }
        column.group.add(stone);
      }
    }

    function rebuildAll(prev: PlaceCounts, animate: boolean): void {
      rebuildColumn(columns.hundreds, prev.hundreds, animate);
      rebuildColumn(columns.tens, prev.tens, animate);
      rebuildColumn(columns.ones, prev.ones, animate);
    }

    /**
     * Remove one unit from a place (the − button). If the place has a stone, it
     * just goes. Otherwise we BORROW: the next-higher stone visibly breaks apart
     * into ten stones in this column (signature animation), then one is removed —
     * net value −1, representation regrouped (e.g. {tens:5,ones:0} → {tens:4,ones:9}).
     */
    function decPlace(place: Place): void {
      if (state.busy) return;
      const prev: PlaceCounts = { ...state.counts };

      if (state.counts[place] > 0) {
        // Plain removal — no borrow needed.
        state.counts = decrement(state.counts, place);
        rebuildAll(prev, false);
        ctx.audio.play('click');
        showPrompt();
        return;
      }

      // Place is empty → need a borrow. Find what regroup borrow() would do.
      const borrowed = borrow(state.counts, place);
      if (borrowed[place] <= 0) {
        // Nothing left anywhere to break (whole number is 0) — gentle nudge, no-op.
        track(shake(columns[place].group, 0.05, 200));
        return;
      }
      playBreak(place);
    }

    /** Add one unit back on a place (the + button — UNDO an over-removal). */
    function incPlace(place: Place): void {
      if (state.busy) return;
      const prev: PlaceCounts = { ...state.counts };
      const next = increment(state.counts, place);
      if (next === state.counts) return; // at the 9 cap — no-op
      state.counts = next;
      rebuildAll(prev, true);
      ctx.audio.play('click');
      showPrompt();
    }

    /**
     * BORROW / bridge-stone-break (signature). The next-higher non-empty stone
     * "cracks": we punch (then shrink away) the higher column's top stone, then on
     * the beat regroup via borrow() (higher −1, this place +10) and pop in the ten
     * fresh small stones falling into this column, and finally remove one
     * (decrement) so the net is −1. Value-preserving regroup followed by a single
     * decrement. Distinct from addition-mine's cart-on-a-rail carry.
     */
    function playBreak(place: Place): void {
      const higher = higherPlace(place);
      if (higher === null) return; // can't happen (ones/tens only reach here)
      state.busy = true;
      const higherColumn = columns[higher];

      // 1) Crack: punch the higher column's stones — the "ten about to break".
      track(punch(higherColumn.group, 0.22));
      ctx.audio.play('click');

      const reduced = ctx.prefersReducedMotion;
      const breakMs = reduced ? 0 : 360;

      // 2) On the beat: regroup (value-preserving), then remove one → net −1.
      track(
        tweenTo(0, 1, breakMs, () => {}, {
          onComplete: () => {
            const beforeRegroup: PlaceCounts = { ...state.counts };
            const regrouped = borrow(state.counts, place); // higher −1, place +10 (value same)
            state.counts = decrement(regrouped, place); // remove one → net −1
            rebuildAll(beforeRegroup, true);
            track(shake(higherColumn.group, 0.06, 220)); // the higher stack settles
            const t = setTimeout(() => {
              state.busy = false;
            }, reduced ? 0 : 120);
            pendingTimeouts.add(t);
            showPrompt();
          },
        })
      );
    }

    function setControls(): void {
      const buttons: ControlButton[] = [
        { id: 'hundreds-dec', label: `${ctx.t('controls.hundreds')} −`, onPress: () => decPlace('hundreds') },
        { id: 'hundreds-inc', label: `${ctx.t('controls.hundreds')} +`, onPress: () => incPlace('hundreds') },
        { id: 'tens-dec', label: `${ctx.t('controls.tens')} −`, onPress: () => decPlace('tens') },
        { id: 'tens-inc', label: `${ctx.t('controls.tens')} +`, onPress: () => incPlace('tens') },
        { id: 'ones-dec', label: `${ctx.t('controls.ones')} −`, onPress: () => decPlace('ones') },
        { id: 'ones-inc', label: `${ctx.t('controls.ones')} +`, onPress: () => incPlace('ones') },
        { id: 'reset', label: ctx.t('controls.reset'), variant: 'reset', onPress: resetBuild },
        { id: 'check', label: ctx.t('controls.check'), variant: 'confirm', onPress: confirm },
      ];
      ctx.controls.set(buttons);
    }

    /** Reset returns the display to the full minuend A (re-build the whole bridge). */
    function resetBuild(): void {
      if (state.busy) return;
      const prev: PlaceCounts = { ...state.counts };
      state.counts = toPlaceCounts(state.problem.a);
      rebuildAll(prev, false);
      showPrompt();
    }

    /** Start the next problem with the display OPEN at its minuend A. */
    function startNewProblem(): void {
      const prev: PlaceCounts = { ...state.counts };
      state.counts = toPlaceCounts(state.problem.a);
      rebuildAll(prev, false);
      showPrompt();
      showStatus();
    }

    function onCorrect(): void {
      ctx.audio.play('success');
      ctx.feedback.correct(ctx.t('subtractionBridge.correct', { diff: state.problem.a - state.problem.b }));
      track(punch(columns.hundreds.group, 0.16));
      track(punch(columns.tens.group, 0.16));
      track(punch(columns.ones.group, 0.16));
      celebrate();
    }

    function onWrong(): void {
      ctx.audio.play('fail');
      ctx.feedback.wrong(ctx.t('subtractionBridge.wrong'));
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
        state.problem = qs.current as SubtractionProblem;
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
     * three column world-x positions (hundreds | tens | ones). Monotonic with the
     * locked front camera so drag directions are natural.
     */
    function placeUnderPointerX(ndcX: number): Place {
      if (ndcX < -1 / 3) return 'hundreds';
      if (ndcX > 1 / 3) return 'ones';
      return 'tens';
    }

    // Drag = fast remove/restore. Dragging DOWN over a column removes a stone per
    // "notch" (natural: down = take apart / fewer); dragging UP adds one back.
    // We change at most one per drag event so a sweep ramps a column smoothly, and
    // let the stone-break borrow fire when a column runs out.
    let lastDragY = 0;
    const offDragStart = ctx.input.on('dragStart', (p) => {
      lastDragY = p.y;
    });
    const offDrag = ctx.input.on('drag', (p) => {
      if (state.busy) return;
      const dy = p.y - lastDragY; // NDC: +y is up
      if (dy < -0.08) {
        decPlace(placeUnderPointerX(p.x)); // drag down = remove (take the bridge apart)
        lastDragY = p.y;
      } else if (dy > 0.08) {
        incPlace(placeUnderPointerX(p.x)); // drag up = add one back (undo)
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
        sceneRoot.clear(); // detach ALL children (column groups + piers + deck)
        ctx.scene.remove(sceneRoot);

        oneGeo.dispose();
        oneMat.dispose();
        tenGeo.dispose();
        tenMat.dispose();
        hundredGeo.dispose();
        hundredMat.dispose();
        pierGeo.dispose();
        pierMat.dispose();
        deckGeo.dispose();
        deckMat.dispose();
      },
    };
  },
};
