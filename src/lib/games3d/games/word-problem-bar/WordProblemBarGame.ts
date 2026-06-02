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
import { createWordProblemBarGenerator, MAX_VALUE, type WordProblemBarProblem } from './problems';

// Theme: a BAR MODEL on a chalk/paper board. A word problem is shown as a
// part–part–whole strip diagram facing a locked, straight-on camera (so the XY
// plane is the board and drag-right is natural "longer / more").
//
//   ADD (find the whole): the TOP row shows two KNOWN part-bars laid end to end
//     (part A coral + part B sky, each labelled with its number). The BOTTOM row
//     is the child's WHOLE bar that must grow to span both parts (= a + b).
//   SUB (whole − part = remaining): the TOP row shows the KNOWN whole-bar with
//     the known part `a` shaded out (muted) at its start; the remaining length is
//     the gap. The BOTTOM row is the child's bar that must grow to fill that gap
//     (= whole − a).
//
// The child sets the answer with value −/+ buttons OR by dragging RIGHT (longer
// = more), then בדוק. Every bar's LENGTH is a value × UNIT_W; bars whose length
// changes live inside a parent Group so popIn/punch (uniform scale) never crush
// the non-uniform length scale (§13b). The board, the part-bars and their number
// labels stay above y=0 and the camera is locked straight-on (§12b).

const QUIZ_LENGTH = 10;
const POINTS_PER_CORRECT = 10;

// Bar-model layout (XY plane, board facing +Z). The full reference frame width
// spans MAX_VALUE units so the longest possible answer (18) — and the child's
// dial up to 20 — always fit on screen with margin (§12b framing).
const FRAME_W = 8.4; // world width of the full MAX_VALUE-unit reference frame
const UNIT_W = FRAME_W / MAX_VALUE; // world width of one unit (so value→length is linear)
const FRAME_LEFT = -FRAME_W / 2; // bars all start at this x (grow rightward = more)
const BAR_H = 0.95; // height of a bar
const BAR_D = 0.5; // depth (slight thickness so bars read as 3D blocks)
const ROW_GAP = 1.7; // vertical gap between the "given" row and the answer row
const GIVEN_Y = ROW_GAP / 2; // given diagram sits above centre
const ANSWER_Y = -ROW_GAP / 2; // child's bar sits below centre
const LABEL_Z = BAR_D / 2 + 0.06; // number labels float just in front of bars
const TICK_H = 0.16; // thin unit guide-ticks under the answer bar
const TICK_D = 0.12;

// Board (behind the bars) so text/blocks never sit light-on-light (§12 contrast).
const BOARD_W = FRAME_W + 1.6;
const BOARD_H = ROW_GAP + BAR_H + 1.7;
const BOARD_COLOR = 0x2c3a4f; // dark slate board — high contrast behind labels
const FRAME_TRACK_COLOR = 0x40526e; // faint track marking the full reference frame

// Bar palette — distinct, saturated colours per role (§12 contrast):
const PART_A_COLOR = PALETTE.coral; // known part A
const PART_B_COLOR = PALETTE.sky; // known part B
const KNOWN_PART_COLOR = 0x4a5a72; // muted: the "given/taken" shaded part in SUB
const CHILD_COLOR = PALETTE.sun; // the child's answer bar (the one they grow)
const TICK_COLOR = 0x6f82a0;

/** Build a unit-length (1 world unit wide) bar geometry centred on its origin. */
function unitBarGeo(): THREE.BufferGeometry {
  return roundedBox(1, BAR_H, BAR_D, 0.12, 3);
}

/**
 * Position + size a bar that starts at FRAME_LEFT and runs `valueUnits` long.
 * The mesh's own geometry is 1 unit wide, so scale.x = world length; we offset
 * x so the LEFT edge stays anchored at the frame start (bars grow rightward).
 */
function layoutBar(mesh: THREE.Object3D, startUnits: number, valueUnits: number, y: number): void {
  const lenWorld = Math.max(0.0001, valueUnits * UNIT_W);
  const startX = FRAME_LEFT + startUnits * UNIT_W;
  mesh.scale.set(lenWorld, 1, 1);
  mesh.position.set(startX + lenWorld / 2, y, 0);
}

export const wordProblemBarGame: Game3D = {
  meta: {
    id: 'word-problem-bar',
    i18nKey: 'games3d.wordProblemBar',
    topic: 'wordProblems',
    difficulty: 3,
    gradeRange: [2, 4],
    estimatedSeconds: 110,
    supportedModes: ['practice', 'quiz'],
  },
  init(ctx) {
    // Straight-on locked camera in front of the XY board: drag-right → world +x
    // (longer bar = more), drag is never inverted. Distance fits BOARD_W width.
    ctx.presets.camera.locked(new THREE.Vector3(0, 0, 11.5), new THREE.Vector3(0, 0, 0));

    // Paper/chalkboard ambience. No ground plane — the board is the surface and
    // the answer bar sits below origin (would dip into the clay floor otherwise).
    const clayLook = applyClayLook(ctx, {
      topColor: '#e7eef6',
      bottomColor: '#c7d6e6',
      ground: false,
      shadowArea: 9,
      fog: false,
    });

    const generator = createWordProblemBarGenerator();
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

    // ---- Shared, reused resources (ONE geometry per kind) ----
    const barGeo = unitBarGeo();
    const tickGeo = roundedBox(1, TICK_H, TICK_D, 0.04, 1);

    const partAMat = new THREE.MeshStandardMaterial({ color: PART_A_COLOR, roughness: 0.5, metalness: 0.05 });
    const partBMat = new THREE.MeshStandardMaterial({ color: PART_B_COLOR, roughness: 0.5, metalness: 0.05 });
    const knownPartMat = new THREE.MeshStandardMaterial({ color: KNOWN_PART_COLOR, roughness: 0.85, metalness: 0.02 });
    const childMat = new THREE.MeshStandardMaterial({ color: CHILD_COLOR, roughness: 0.45, metalness: 0.08 });
    const tickMat = new THREE.MeshStandardMaterial({ color: TICK_COLOR, roughness: 0.8, metalness: 0.02 });

    const boardGeo = roundedBox(BOARD_W, BOARD_H, 0.3, 0.25, 3);
    const boardMat = new THREE.MeshStandardMaterial({ color: BOARD_COLOR, roughness: 0.9, metalness: 0.03 });
    const trackGeo = roundedBox(FRAME_W + 0.12, BAR_H + 0.16, 0.14, 0.1, 2);
    const trackMat = new THREE.MeshStandardMaterial({ color: FRAME_TRACK_COLOR, roughness: 0.9, metalness: 0.02 });

    // Number-label resources. ONE texture + material per digit 0..MAX_VALUE,
    // built once and reused (no per-update / per-problem allocation, §14). A
    // label is just a plane (shared geometry) that points at the cached material
    // for its number.
    const labelGeo = new THREE.PlaneGeometry(0.95, 0.95);
    const digitTextures: THREE.CanvasTexture[] = [];
    const digitMats: THREE.MeshBasicMaterial[] = [];
    for (let n = 0; n <= MAX_VALUE; n++) {
      const tex = makeNumberTexture(n);
      digitTextures.push(tex);
      digitMats.push(new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
    }

    // ---- Scene graph (everything under one root that we add to the scene) ----
    const root = new THREE.Group();
    ctx.scene.add(root);

    const board = new THREE.Mesh(boardGeo, boardMat);
    board.position.set(0, 0, -0.4);
    board.receiveShadow = true;
    root.add(board);

    // Faint reference track on the answer row showing the full MAX_VALUE frame.
    const track0 = new THREE.Mesh(trackGeo, trackMat);
    track0.position.set(0, ANSWER_Y, -0.18);
    track0.receiveShadow = true;
    root.add(track0);

    // Unit guide-ticks under the answer bar (every unit, full frame). Cheap,
    // static — built once, helps the child count their bar length.
    const ticksGroup = new THREE.Group();
    for (let u = 1; u < MAX_VALUE; u++) {
      const tick = new THREE.Mesh(tickGeo, tickMat);
      tick.scale.set(0.06, 1, 1);
      tick.position.set(FRAME_LEFT + u * UNIT_W, ANSWER_Y - BAR_H / 2 - 0.18, 0);
      ticksGroup.add(tick);
    }
    root.add(ticksGroup);

    // GIVEN diagram (the known part-bars / whole-bar) — rebuilt per problem.
    const givenGroup = new THREE.Group();
    givenGroup.position.set(0, 0, 0);
    root.add(givenGroup);

    // The child's answer bar lives in its own parent group: the inner mesh gets
    // the NON-uniform length scale; the parent group is what we popIn/punch so a
    // uniform scale never crushes the bar's length (§13b).
    const childWrap = new THREE.Group();
    childWrap.position.set(0, ANSWER_Y, 0);
    const childBar = new THREE.Mesh(barGeo, childMat);
    childBar.castShadow = true;
    childBar.receiveShadow = true;
    childWrap.add(childBar);
    root.add(childWrap);

    // Label for the child's current value (always visible, follows the bar end).
    // Reused single mesh — only its material (cached per digit) swaps on change.
    const childLabel = new THREE.Mesh(labelGeo, digitMats[0]);
    childLabel.position.set(0, ANSWER_Y, LABEL_Z);
    root.add(childLabel);

    const first = (quiz ? quiz.state().current : generator.next()) as WordProblemBarProblem;
    const state = {
      problem: first,
      value: 0, // child's current answer; starts at 0 (≠ answer, since answer >= 1)
      streak: 0,
      answered: 0,
    };

    /** A number-label plane reusing the cached per-digit material (no allocation). */
    function makeLabel(n: number): THREE.Mesh {
      return new THREE.Mesh(labelGeo, digitMats[Math.max(0, Math.min(MAX_VALUE, n))]);
    }

    /**
     * Rebuild the GIVEN diagram for the current problem. ADD: two part-bars laid
     * end to end with their number labels. SUB: the whole-bar with the known part
     * `a` shaded (muted) at its start, the remaining gap left open.
     */
    function buildGiven(): void {
      givenGroup.clear();
      const p = state.problem;

      if (p.type === 'add') {
        const a = p.a;
        const b = p.b as number;
        // Part A: starts at 0, length a.
        const barA = new THREE.Mesh(barGeo, partAMat);
        layoutBar(barA, 0, a, GIVEN_Y);
        barA.castShadow = true;
        givenGroup.add(barA);
        const labA = makeLabel(a);
        labA.position.set(FRAME_LEFT + (a / 2) * UNIT_W, GIVEN_Y, LABEL_Z);
        givenGroup.add(labA);
        // Part B: starts at a, length b.
        const barB = new THREE.Mesh(barGeo, partBMat);
        layoutBar(barB, a, b, GIVEN_Y);
        barB.castShadow = true;
        givenGroup.add(barB);
        const labB = makeLabel(b);
        labB.position.set(FRAME_LEFT + (a + b / 2) * UNIT_W, GIVEN_Y, LABEL_Z);
        givenGroup.add(labB);
      } else {
        const whole = p.whole as number;
        const a = p.a;
        // Known shaded part `a` (given/taken away): muted, at the start.
        const barKnown = new THREE.Mesh(barGeo, knownPartMat);
        layoutBar(barKnown, 0, a, GIVEN_Y);
        barKnown.castShadow = true;
        givenGroup.add(barKnown);
        const labKnown = makeLabel(a);
        labKnown.position.set(FRAME_LEFT + (a / 2) * UNIT_W, GIVEN_Y, LABEL_Z);
        givenGroup.add(labKnown);
        // Whole label sits centred over the full whole span (the total).
        const labWhole = makeLabel(whole);
        labWhole.position.set(FRAME_LEFT + (whole / 2) * UNIT_W, GIVEN_Y + BAR_H / 2 + 0.62, LABEL_Z);
        givenGroup.add(labWhole);
        // A thin outline of the full whole span so the gap (remaining) is visible.
        const outline = new THREE.Mesh(barGeo, trackMat);
        layoutBar(outline, 0, whole, GIVEN_Y);
        outline.position.z = -0.12;
        outline.scale.y = 1.08;
        givenGroup.add(outline);
      }
      track(popIn(givenGroup, { scale: 1 }));
    }

    /** Re-render the child's answer bar to its current value (length = value units). */
    function renderChild(animate: boolean): void {
      // Inner mesh carries the non-uniform length scale (parent wrap is uniform).
      layoutBar(childBar, 0, state.value, 0);
      // Reuse the single label mesh: just swap to the cached material for the
      // current digit and reposition it just past the END of the bar (or near
      // the start when value is 0 so it's never hidden behind a zero-length bar).
      childLabel.material = digitMats[state.value];
      const endUnits = Math.max(state.value, 0.6);
      childLabel.position.set(FRAME_LEFT + endUnits * UNIT_W + 0.55, ANSWER_Y, LABEL_Z);
      if (animate && !ctx.prefersReducedMotion && state.value > 0) {
        track(punch(childWrap, 0.12)); // punch the PARENT wrap, never the scaled bar (§13b)
      }
    }

    function showPrompt(): void {
      // TASK ONLY — the word problem text. Numbers/name/item ARE the task (§11).
      const p = state.problem;
      const name = ctx.t(`wordProblemBar.name${p.nameIndex}`);
      const item = ctx.t(`wordProblemBar.item${p.itemIndex}`);
      if (p.type === 'add') {
        ctx.prompt.set(ctx.t('wordProblemBar.promptAdd', { name, item, a: p.a, b: p.b as number }));
      } else {
        ctx.prompt.set(ctx.t('wordProblemBar.promptSub', { name, item, a: p.a, whole: p.whole as number }));
      }
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

    /** Set the child's value, clamped 0..MAX_VALUE (integer). */
    function setValue(value: number, animate: boolean): void {
      const clamped = Math.max(0, Math.min(MAX_VALUE, Math.round(value)));
      state.value = clamped;
      renderChild(animate);
    }

    function setControls(): void {
      const buttons: ControlButton[] = [
        {
          id: 'value-dec',
          label: `${ctx.t('controls.value')} −`,
          onPress: () => setValue(state.value - 1, true),
        },
        {
          id: 'value-inc',
          label: `${ctx.t('controls.value')} +`,
          onPress: () => setValue(state.value + 1, true),
        },
        {
          id: 'reset',
          label: ctx.t('controls.reset'),
          variant: 'reset',
          onPress: () => setValue(0, true),
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
      buildGiven();
      setValue(0, false); // fresh bar; 0 ≠ answer so never opens solved
      showPrompt();
      showStatus();
    }

    function onCorrect(): void {
      ctx.audio.play('success');
      ctx.feedback.correct(ctx.t('wordProblemBar.correct', { answer: state.problem.answer }));
      track(punch(childWrap, 0.16)); // punch the completed bar's PARENT wrap (§13b)
      celebrate();
    }

    function onWrong(): void {
      ctx.audio.play('fail');
      ctx.feedback.wrong(ctx.t('wordProblemBar.wrong'));
      track(shake(childWrap, 0.06, 280)); // gentle shake on the wrap, not punishing
    }

    function confirm(): void {
      const answer = state.value;
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
        state.problem = qs.current as WordProblemBarProblem;
        startNewProblem();
        return;
      }

      // Practice: correct → score + next problem; wrong → KEEP the bar to fix.
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
     * Drag = grow the bar by sweeping RIGHT. The pointer's NDC-x (−1 left → +1
     * right) maps monotonically to value (0..MAX_VALUE). Dragging right makes the
     * bar longer — never inverted (the locked camera has no roll, so NDC +x is
     * world +x is "more / longer").
     */
    function pointerToValue(ndcX: number): number {
      const t = (ndcX + 1) / 2; // 0..1 left→right
      return Math.max(0, Math.min(MAX_VALUE, Math.round(t * MAX_VALUE)));
    }

    const offDrag = ctx.input.on('drag', (p) => {
      const next = pointerToValue(p.x);
      if (next === state.value) return;
      setValue(next, false); // snap instantly so the bar tracks the finger
    });
    // dragEnd is a SECONDARY submit path; the בדוק button is the primary one.
    const offDragEnd = ctx.input.on('dragEnd', confirm);

    // Initial render: given diagram + empty answer bar + prompt/status/controls.
    buildGiven();
    setValue(0, false);
    track(popIn(childWrap, { scale: 1 }));
    setControls();
    showPrompt();
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

        givenGroup.clear();
        ticksGroup.clear();
        childWrap.clear();
        root.clear();
        ctx.scene.remove(root);

        barGeo.dispose();
        tickGeo.dispose();
        partAMat.dispose();
        partBMat.dispose();
        knownPartMat.dispose();
        childMat.dispose();
        tickMat.dispose();
        boardGeo.dispose();
        boardMat.dispose();
        trackGeo.dispose();
        trackMat.dispose();
        labelGeo.dispose();
        digitTextures.forEach((t) => t.dispose());
        digitMats.forEach((m) => m.dispose());
      },
    };
  },
};

/**
 * Render an integer as dark digits on a light rounded plate (high contrast on
 * the dark board / any backdrop). Created per active label, disposed on dispose().
 */
function makeNumberTexture(n: number): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const g = canvas.getContext('2d');
  if (g) {
    g.clearRect(0, 0, size, size);
    // Light rounded plate so the dark text stays readable on the dark board.
    g.fillStyle = '#f4ead2';
    const r = 22;
    const w = size;
    const h = size;
    g.beginPath();
    g.moveTo(r, 0);
    g.arcTo(w, 0, w, h, r);
    g.arcTo(w, h, 0, h, r);
    g.arcTo(0, h, 0, 0, r);
    g.arcTo(0, 0, w, 0, r);
    g.closePath();
    g.fill();
    g.fillStyle = '#2a2018';
    g.font = 'bold 74px sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(String(n), size / 2, size / 2 + 4);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}
