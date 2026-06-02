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
  createAdditionGenerator,
  normalize,
  MAX_PER_PLACE,
  type AdditionProblem,
  type PlaceCounts,
} from './problems';

// Theme: an underground ORE MINE. Three place columns (hundreds | tens | ones)
// are shafts cut into the rock; each unit you add is a glowing ore crystal that
// pops onto the column's pile. A rail track runs between the columns, and when a
// column fills past 9 a CARRY CART rides the rail from the full (lower) place to
// the next-higher place, carrying one bundled unit — value-preserving regrouping
// made literal. The child BUILDS the sum a + b with per-place −/+ controls; the
// prompt only ever shows the task "חברו: a + b", never the live built value.

const QUIZ_LENGTH = 10;
const POINTS_PER_CORRECT = 10;
const POP_STAGGER_MS = 30; // gentle per-crystal delay so a pile grows alive

// Three place columns, laid left→right along the rail (hundreds | tens | ones).
const COLUMN_GAP = 4.0; // x-distance between column centers
const ONES_X = COLUMN_GAP; // ones on the +x end
const TENS_X = 0;
const HUNDREDS_X = -COLUMN_GAP; // hundreds on the -x end

// Ore-crystal dimensions per place. Sizes grow with place value so 1 vs 10 vs
// 100 read at a glance (small nugget → chunky crystal → big geode slab).
const ONE_W = 0.7;
const ONE_H = 0.7;
const TEN_W = 0.95;
const TEN_H = 0.95;
const HUNDRED_W = 1.9;
const HUNDRED_H = 0.7;

const STACK_GAP = 0.08; // tiny gap between stacked crystals
const FLOOR_Y = 0.0; // shaft floor (crystals sit on top)

// Mine palette: saturated, glowing ore so it reads against the dark rock. Each
// place gets a distinct ore hue (warm lamp tones overall via clay look).
const ONE_COLOR = PALETTE.sun; // bright amber nuggets (ones)
const TEN_COLOR = PALETTE.sky; // blue ore (tens)
const HUNDRED_COLOR = PALETTE.coral; // red geode slabs (hundreds)
const ROCK_COLOR = 0x3a3330; // dark rocky shaft backing
const RAIL_COLOR = 0x6b5a48; // weathered wooden rail ties / iron tone
const CART_COLOR = 0xcf8a3a; // a warm, saturated ore cart so it reads on dark rock

type Place = 'hundreds' | 'tens' | 'ones';

interface ColumnView {
  place: Place;
  x: number;
  group: THREE.Group; // holds the ore crystals for this place
  geo: THREE.BufferGeometry;
  mat: THREE.MeshStandardMaterial;
  blockH: number; // vertical pitch when stacking this kind of crystal
  oreH: number; // crystal height (for y-centering)
}

export const additionMineGame: Game3D = {
  meta: {
    id: 'addition-mine',
    i18nKey: 'games3d.additionMine',
    topic: 'arithmetic',
    difficulty: 2,
    gradeRange: [2, 4],
    estimatedSeconds: 120,
    supportedModes: ['practice', 'quiz'],
  },
  init(ctx) {
    // Raised orbit so the three shafts have depth and the carry cart's travel reads.
    ctx.presets.camera.orbit(new THREE.Vector3(0, 1.0, 0), 13);

    // Clay/toy look — warm underground lamp tones (amber top, deep-brown bottom).
    const clayLook = applyClayLook(ctx, {
      topColor: '#caa86a',
      bottomColor: '#2a211c',
      ground: true,
      shadowArea: 11,
      fog: true,
    });

    const generator = createAdditionGenerator();
    const quiz =
      ctx.mode === 'quiz'
        ? createQuizController(generator, { length: QUIZ_LENGTH, pointsPerCorrect: POINTS_PER_CORRECT })
        : null;

    // ---- Tween tracking (no tween outlives its target) ----
    // {s} = popIn/punch scale, {t} = shake, {v} = tweenTo lerp (cart rail travel).
    const liveTweens = new Set<Tween<{ s: number } | { t: number } | { v: number }>>();
    function track(t: Tween<{ s: number }> | Tween<{ t: number }> | Tween<{ v: number }>): void {
      liveTweens.add(t as Tween<{ s: number } | { t: number } | { v: number }>);
    }
    function stopAllTweens(): void {
      liveTweens.forEach((t) => t.stop());
      liveTweens.clear();
    }

    // setTimeout handles for in-flight carry beats — cleared on dispose.
    const pendingTimeouts = new Set<ReturnType<typeof setTimeout>>();

    // ---- Shared, reused resources (one geometry + material per ore kind) ----
    const oneGeo = roundedBox(ONE_W, ONE_H, ONE_W, 0.18, 3);
    const oneMat = new THREE.MeshStandardMaterial({
      color: ONE_COLOR,
      roughness: 0.35,
      metalness: 0.1,
      emissive: new THREE.Color(ONE_COLOR),
      emissiveIntensity: 0.45,
    });
    const tenGeo = roundedBox(TEN_W, TEN_H, TEN_W, 0.18, 3);
    const tenMat = new THREE.MeshStandardMaterial({
      color: TEN_COLOR,
      roughness: 0.35,
      metalness: 0.1,
      emissive: new THREE.Color(TEN_COLOR),
      emissiveIntensity: 0.4,
    });
    const hundredGeo = roundedBox(HUNDRED_W, HUNDRED_H, HUNDRED_W, 0.18, 3);
    const hundredMat = new THREE.MeshStandardMaterial({
      color: HUNDRED_COLOR,
      roughness: 0.35,
      metalness: 0.1,
      emissive: new THREE.Color(HUNDRED_COLOR),
      emissiveIntensity: 0.4,
    });

    // Rock shaft backing under each column (frames the place, catches shadow).
    const rockGeo = roundedBox(HUNDRED_W + 0.7, 0.34, HUNDRED_W + 0.7, 0.16, 3);
    const rockMat = new THREE.MeshStandardMaterial({ color: ROCK_COLOR, roughness: 0.98, metalness: 0.02 });

    // Rail running the full span between the three shafts (one long tie bar).
    const railLen = COLUMN_GAP * 2 + HUNDRED_W + 1.2;
    const railGeo = roundedBox(railLen, 0.14, 0.5, 0.07, 2);
    const railMat = new THREE.MeshStandardMaterial({ color: RAIL_COLOR, roughness: 0.85, metalness: 0.15 });

    // The ore cart that rides the rail during a carry (one mesh, reused).
    const cartGeo = roundedBox(0.85, 0.7, 0.7, 0.16, 3);
    const cartMat = new THREE.MeshStandardMaterial({
      color: CART_COLOR,
      roughness: 0.45,
      metalness: 0.25,
      emissive: new THREE.Color(CART_COLOR),
      emissiveIntensity: 0.25,
    });

    const sceneRoot = new THREE.Group();
    ctx.scene.add(sceneRoot);

    // Rail sits low, in front of the shafts, between the columns.
    const RAIL_Y = -0.05;
    const RAIL_Z = 1.4;
    const rail = new THREE.Mesh(railGeo, railMat);
    rail.position.set(0, RAIL_Y, RAIL_Z);
    rail.receiveShadow = true;
    sceneRoot.add(rail);

    // The cart rides on top of the rail; hidden until a carry plays.
    const CART_Y = RAIL_Y + 0.07 + 0.35;
    const cart = new THREE.Mesh(cartGeo, cartMat);
    cart.position.set(ONES_X, CART_Y, RAIL_Z);
    cart.castShadow = true;
    cart.visible = false;
    sceneRoot.add(cart);

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
      oreH: number
    ): ColumnView {
      const group = new THREE.Group();
      group.position.x = x;
      sceneRoot.add(group);
      const rock = new THREE.Mesh(rockGeo, rockMat);
      rock.position.set(x, -0.18, 0);
      rock.receiveShadow = true;
      rock.castShadow = true;
      sceneRoot.add(rock);
      return { place, x, group, geo, mat, blockH, oreH };
    }

    const first = quiz ? quiz.state().current : generator.next();
    const state = {
      problem: first as AdditionProblem,
      counts: { hundreds: 0, tens: 0, ones: 0 } as PlaceCounts,
      streak: 0,
      answered: 0,
      busy: false, // true while a carry cart animation plays (blocks input churn)
    };

    function showPrompt(): void {
      // TASK ONLY — shows "Add: a + b", never the live built value or the sum.
      ctx.prompt.set(ctx.t('additionMine.prompt', { a: state.problem.a, b: state.problem.b }));
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

    /** Y-center of the n-th (0-based) stacked crystal in a column. */
    function blockY(column: ColumnView, n: number): number {
      return FLOOR_Y + column.oreH / 2 + n * column.blockH;
    }

    /**
     * Rebuild every crystal in a column to match `state.counts[place]`. Crystals
     * at index ≥ prevCount pop in (newly mined); existing ones snap to place. Each
     * column draws a different-SIZED crystal so place value reads at a glance.
     */
    function rebuildColumn(column: ColumnView, prevCount: number, animate: boolean): void {
      column.group.clear();
      const count = state.counts[column.place];
      let newOrdinal = 0;
      for (let i = 0; i < count; i++) {
        const ore = new THREE.Mesh(column.geo, column.mat);
        ore.position.set(0, blockY(column, i), 0);
        ore.castShadow = true;
        ore.receiveShadow = true;
        if (animate && i >= prevCount) {
          track(popIn(ore, { delay: newOrdinal * POP_STAGGER_MS }));
          newOrdinal += 1;
        }
        column.group.add(ore);
      }
    }

    function rebuildAll(prev: PlaceCounts, animate: boolean): void {
      rebuildColumn(columns.hundreds, prev.hundreds, animate);
      rebuildColumn(columns.tens, prev.tens, animate);
      rebuildColumn(columns.ones, prev.ones, animate);
    }

    /**
     * Add `delta` units to a place (delta may be negative for the − button).
     * After the change we CARRY: any place that reached 10 sends a cart up the
     * rail to bundle ten units into one unit of the next place. Value is preserved
     * across the carry (normalize is value-stable).
     */
    function changePlace(place: Place, delta: number): void {
      if (state.busy) return;
      const prev: PlaceCounts = { ...state.counts };
      const raw = { ...state.counts, [place]: state.counts[place] + delta };
      // A place "overflows" when it just reached 10 (ones/tens only — hundreds is
      // the top place). We allow a transient 10 so the cart has the ten units to
      // bundle. If the higher place is already full (9), block the add instead of
      // losing value.
      const higherFull =
        (place === 'ones' && state.counts.tens >= MAX_PER_PLACE) ||
        (place === 'tens' && state.counts.hundreds >= MAX_PER_PLACE);
      const overflowed =
        place !== 'hundreds' && raw[place] === MAX_PER_PLACE + 1 && !higherFull;
      if (raw[place] < 0) return; // − below zero: ignore
      if (place === 'hundreds' && raw.hundreds > MAX_PER_PLACE) return; // cap hundreds
      if (!overflowed && raw[place] > MAX_PER_PLACE) return; // manual cap (no skip)

      state.counts = raw;
      rebuildAll(prev, true);

      if (overflowed) {
        playCarry(place);
      }
      showPrompt();
    }

    /**
     * Carry CART animation (signature): the place at 10 sends an ore cart riding
     * the rail from its column to the next-higher place. We punch the full column
     * (the "load up" gesture), run the cart along the rail, then on arrival
     * normalize (→ that place 0, higher place +1) and pop in the freshly-bundled
     * bigger crystal. The numeric value is identical across the carry.
     */
    function playCarry(fromPlace: Place): void {
      const higher: Place = fromPlace === 'ones' ? 'tens' : 'hundreds';
      state.busy = true;
      const fromColumn = columns[fromPlace];
      const higherColumn = columns[higher];

      // 1) Load up: punch the ten units about to be bundled.
      track(punch(fromColumn.group, 0.18));

      const reduced = ctx.prefersReducedMotion;
      const travelMs = reduced ? 0 : 420;
      const startX = fromColumn.x;
      const endX = higherColumn.x;

      // 2) Send the cart along the rail from the full place to the next place.
      cart.visible = true;
      cart.position.set(startX, CART_Y, RAIL_Z);
      ctx.audio.play('click');
      track(
        tweenTo(startX, endX, travelMs, (x) => {
          cart.position.x = x;
        }, {
          onComplete: () => {
            // 3) On arrival: regroup (value-preserving) and present the new crystal.
            const before: PlaceCounts = { ...state.counts };
            const after = normalize(state.counts);
            state.counts = after;
            rebuildAll(before, true);
            cart.visible = false;
            track(punch(higherColumn.group, 0.2));
            // Settle out of busy a beat after the pop so input doesn't fight it.
            const t = setTimeout(() => {
              state.busy = false;
            }, reduced ? 0 : 120);
            pendingTimeouts.add(t);
          },
        })
      );
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
      cart.visible = false;
      rebuildAll(prev, false);
      showPrompt();
      showStatus();
    }

    function onCorrect(): void {
      ctx.audio.play('success');
      ctx.feedback.correct(ctx.t('additionMine.correct', { total: state.problem.a + state.problem.b }));
      track(punch(columns.hundreds.group, 0.16));
      track(punch(columns.tens.group, 0.16));
      track(punch(columns.ones.group, 0.16));
      celebrate();
    }

    function onWrong(): void {
      ctx.audio.play('fail');
      ctx.feedback.wrong(ctx.t('additionMine.wrong'));
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
     * three column world-x positions (hundreds | tens | ones).
     */
    function placeUnderPointerX(ndcX: number): Place {
      if (ndcX < -1 / 3) return 'hundreds';
      if (ndcX > 1 / 3) return 'ones';
      return 'tens';
    }

    // Drag = fast add. Dragging UP over a column mines one crystal per "notch" of
    // upward travel; natural direction (up = more, never inverted). We add at most
    // one per drag event so a sweep ramps a column smoothly, and let the carry
    // cart fire when a place crosses 10.
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
        sceneRoot.clear(); // detach ALL children (column groups + rock + rail + cart)
        ctx.scene.remove(sceneRoot);

        oneGeo.dispose();
        oneMat.dispose();
        tenGeo.dispose();
        tenMat.dispose();
        hundredGeo.dispose();
        hundredMat.dispose();
        rockGeo.dispose();
        rockMat.dispose();
        railGeo.dispose();
        railMat.dispose();
        cartGeo.dispose();
        cartMat.dispose();
      },
    };
  },
};
