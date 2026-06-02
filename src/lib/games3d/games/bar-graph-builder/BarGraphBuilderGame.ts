import * as THREE from 'three';
import type { Tween } from '@tweenjs/tween.js';
import type { ControlButton, Game3D } from '@/lib/games3d/types';
import { createQuizController } from '@/lib/games3d/quiz/controller';
import { applyClayLook, roundedBox, popIn, punch, shake, celebrate, bigCelebrate, computeStars, PALETTE } from '@/lib/games3d/kit';
import { createBarGraphGenerator, MAX_COUNT, type BarGraphProblem } from './problems';

// Theme: a CLASSROOM bar graph pinned to the wall. Three colored bars stand on a
// base against a Y-axis scale with tick numbers (0,2,4,6,8,10). The bars carry NO
// number labels — the child READS each height off the scale, computes "how many
// more {a} than {b}?", and dials the answer with the −/+ buttons, then בדוק.
//
// Framing (DEF 12b): the chart is centered on the origin and the camera is a
// straight-on `locked` view at (0,0,D) so drag-x → world-x stays monotonic and
// the chart fills the central viewport. ground:false (the base plate is the
// visible surface; all content sits above y=0) so the clay ground never occludes.

const BAR_W = 1.5; // bar face width (x)
const BAR_D = 0.02; // bar DEPTH (z) — FLAT panel. The chart is rendered COPLANAR at
// z=0: a near-zero depth means the bar's top edge sits on z≈0 exactly where the
// gridlines/ticks live. Under the perspective camera two points at the same world-Y
// must share a Z to project to the same screen-Y — coplanarity is what makes a bar of
// value N top out EXACTLY on the N gridline (DEF readability). A 3D cap (large BAR_D)
// would lift the apparent top via parallax; a flat panel removes it.
const BAR_PITCH = 2.6; // center-to-center spacing of the three bars
const UNIT_H = 0.62; // world height of ONE count unit on the Y axis
const AXIS_X = -BAR_PITCH - 1.0; // x position of the vertical Y-axis post
const BASE_Y = 0; // top of the base plate (bars grow up from here)
const AXIS_TICKS = [0, 2, 4, 6, 8, 10] as const; // numbered ticks on the scale
// Faint horizontal gridlines at EVERY integer level 1..10 span the full plot width
// so each bar's top aligns to a visible line (DEF readability — heights unambiguous).
const GRID_LEVELS = Array.from({ length: MAX_COUNT }, (_, k) => k + 1); // 1..10
const GRID_COLOR = 0x9aa6b6; // low-contrast slate against the light backdrop
const GRID_RIGHT_X = BAR_PITCH + BAR_W / 2 + 0.3; // right edge of the plotted region
const GRID_W = GRID_RIGHT_X - AXIS_X; // full width from the axis to the right edge

const QUIZ_LENGTH = 10;
const POINTS_PER_CORRECT = 10;

// Saturated, distinct bar colors (DEF 12 contrast) — readable against the light
// clay backdrop; the axis numbers are dark-on-light plates.
const BAR_COLORS = [PALETTE.coral, PALETTE.sun, PALETTE.grape] as const;
const BASE_COLOR = 0x6b5b45; // dark wood base course (catches the shadow)
const AXIS_COLOR = 0x3a3026; // dark vertical axis post + ticks
const TICK_FG = '#2a2118'; // dark axis numerals
const TICK_BG = '#f3ead6'; // light plate behind the numerals

/** Start the answer at 0 — never the answer (diff ≥ 1), so it never opens solved. */
const START_ANSWER = 0;

export const barGraphBuilderGame: Game3D = {
  meta: {
    id: 'bar-graph-builder',
    i18nKey: 'games3d.barGraph',
    topic: 'misc',
    difficulty: 2,
    gradeRange: [2, 5],
    estimatedSeconds: 110,
    supportedModes: ['practice', 'quiz'],
  },
  init(ctx) {
    // STRAIGHT-ON front camera (look horizontally — eye y == lookAt y), so there is
    // NO downward tilt. Bar tops and gridlines both sit on the z=0 plane, so a bar of
    // value N projects to EXACTLY the N gridline regardless of camera height — the
    // thin bar depth (BAR_D) removes any top-face foreshortening. The chart spans the
    // axis (x≈AXIS_X≈-3.6) to the rightmost bar (x≈+3.05) → width ≈ 6.7, and up to
    // MAX_COUNT*UNIT_H ≈ 6.2. Aim the camera at the chart's mid-height for symmetric
    // framing; z=11 fits the full width/height with margin.
    const midY = BASE_Y + (MAX_COUNT * UNIT_H) / 2;
    ctx.presets.camera.locked(new THREE.Vector3(0, midY, 11), new THREE.Vector3(0, midY, 0));

    // Warm classroom ambience. No ground plane — the base plate is the surface and
    // everything sits above y=0, so the clay ground would only occlude the chart.
    const clayLook = applyClayLook(ctx, {
      topColor: '#eef3fb',
      bottomColor: '#dfe7f2',
      ground: false,
      shadowArea: 14,
      fog: false,
    });

    const generator = createBarGraphGenerator();
    const quiz =
      ctx.mode === 'quiz'
        ? createQuizController(generator, { length: QUIZ_LENGTH, pointsPerCorrect: POINTS_PER_CORRECT })
        : null;

    // ---- Tween tracking (DEF 14) ----
    type KitTween = Tween<{ s: number }> | Tween<{ t: number }> | Tween<{ v: number }>;
    const liveTweens = new Set<KitTween>();
    function track<T extends KitTween>(t: T): T {
      liveTweens.add(t);
      return t;
    }
    function stopAllTweens(): void {
      liveTweens.forEach((t) => t.stop());
      liveTweens.clear();
    }

    // ---- Shared, reused resources (one per KIND) ----
    // Unit-cube bar geometry, scaled per bar by its count (one geo for all bars).
    const barGeo = roundedBox(BAR_W, 1, BAR_D, 0.06, 3);
    const barMats = BAR_COLORS.map(
      (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.04 })
    );

    // Base plate spanning the three bars (frames them, catches the shadow).
    const baseGeo = roundedBox(BAR_PITCH * 3 + 0.6, 0.3, BAR_W + 0.4, 0.12, 3);
    const baseMat = new THREE.MeshStandardMaterial({ color: BASE_COLOR, roughness: 0.95, metalness: 0.02 });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.set(0, -0.15, 0); // centered under the three bars; top of base at y=0
    base.receiveShadow = true;
    ctx.scene.add(base);

    // Y-axis: a tall dark post (one mesh) with short tick stubs (shared geo) and a
    // dark-on-light numeral plate at each labeled tick (shared per-value materials).
    const axisMat = new THREE.MeshStandardMaterial({ color: AXIS_COLOR, roughness: 0.85, metalness: 0.05 });
    const axisHeight = MAX_COUNT * UNIT_H + 0.4;
    const axisPostGeo = roundedBox(0.12, axisHeight, 0.12, 0.04, 2);
    const axisPost = new THREE.Mesh(axisPostGeo, axisMat);
    axisPost.position.set(AXIS_X, BASE_Y + axisHeight / 2, 0);
    axisPost.castShadow = true;
    ctx.scene.add(axisPost);

    const tickGeo = roundedBox(0.42, 0.07, 0.07, 0.02, 2); // a short horizontal stub
    const tickGroup = new THREE.Group();
    ctx.scene.add(tickGroup);

    // Numeral plates for the axis numbers (CanvasTexture, dark-on-light). One per
    // labeled tick value, created once and reused; disposed on dispose().
    const plateGeo = new THREE.PlaneGeometry(0.7, 0.5);
    const tickTextures: THREE.CanvasTexture[] = [];
    const tickMats: THREE.MeshBasicMaterial[] = [];
    for (const value of AXIS_TICKS) {
      const tex = makeLabelTexture(String(value), TICK_BG, TICK_FG, 'bold 64px Arial, sans-serif');
      tickTextures.push(tex);
      tickMats.push(new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
      // tick stub
      const stub = new THREE.Mesh(tickGeo, axisMat);
      stub.position.set(AXIS_X + 0.27, BASE_Y + value * UNIT_H, 0.0);
      tickGroup.add(stub);
      // numeral plate just left of the post
      const plate = new THREE.Mesh(plateGeo, tickMats[tickMats.length - 1]);
      plate.position.set(AXIS_X - 0.6, BASE_Y + value * UNIT_H, 0.05);
      tickGroup.add(plate);
    }

    // Faint horizontal gridlines at EACH integer level 1..10, spanning the full plot
    // width (axis → right edge). Thin, low-contrast slate boxes COPLANAR with the bars
    // at z≈0 — the bar tops and the gridlines must share the SAME z so that under the
    // perspective camera a bar of value N projects to EXACTLY the N gridline (no
    // parallax). Sit a hair behind the bar front face (z=-0.005) purely so the bars
    // read in front; the offset is negligible vs the old -0.12. One shared geo + one
    // shared material, disposed below.
    const gridGeo = roundedBox(GRID_W, 0.025, 0.02, 0.01, 1);
    const gridMat = new THREE.MeshBasicMaterial({ color: GRID_COLOR, transparent: true, opacity: 0.45 });
    const gridGroup = new THREE.Group();
    ctx.scene.add(gridGroup);
    const gridCenterX = (AXIS_X + GRID_RIGHT_X) / 2;
    for (const level of GRID_LEVELS) {
      const line = new THREE.Mesh(gridGeo, gridMat);
      line.position.set(gridCenterX, BASE_Y + level * UNIT_H, -0.005);
      gridGroup.add(line);
    }

    // Emoji label plates under each bar (CanvasTexture). One per bar slot, built
    // once and reused; the texture is redrawn per problem (same emoji set order, so
    // they actually stay constant, but we keep the slot stable). Disposed on dispose.
    const emojiGeo = new THREE.PlaneGeometry(1.1, 1.1);
    const emojiTextures: THREE.CanvasTexture[] = [];
    const emojiMats: THREE.MeshBasicMaterial[] = [];
    const emojiGroup = new THREE.Group();
    ctx.scene.add(emojiGroup);

    // Numeric VALUE plates that sit ON TOP of each bar (CanvasTexture, dark-on-
    // light — the RoundedBox gotcha: text goes on a flat Plane, not a box face).
    // One material+texture per possible count (0..MAX_COUNT), built lazily and
    // reused across problems; disposed on dispose(). This makes the value
    // unambiguous regardless of how the eye reads the height off the scale.
    const valueGeo = new THREE.PlaneGeometry(0.62, 0.44);
    const valueTextures = new Map<number, THREE.CanvasTexture>();
    const valueMats = new Map<number, THREE.MeshBasicMaterial>();
    function valueMaterial(count: number): THREE.MeshBasicMaterial {
      let mat = valueMats.get(count);
      if (!mat) {
        const tex = makeLabelTexture(String(count), TICK_BG, TICK_FG, 'bold 64px Arial, sans-serif');
        valueTextures.set(count, tex);
        mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
        valueMats.set(count, mat);
      }
      return mat;
    }
    const valueGroup = new THREE.Group();
    ctx.scene.add(valueGroup);

    // Bars live in a group rebuilt (re-sized) per problem.
    const barGroup = new THREE.Group();
    ctx.scene.add(barGroup);

    interface BarRec {
      // The parent GROUP is what we animate (popIn/punch use uniform scale, so we
      // must NOT touch the inner mesh whose y-scale encodes the bar height).
      group: THREE.Group;
      mesh: THREE.Mesh;
      count: number;
    }
    let bars: BarRec[] = [];

    /** x position of bar slot i (three bars centered on the origin). */
    function barX(i: number): number {
      return (i - 1) * BAR_PITCH;
    }

    const first = (quiz ? quiz.state().current : generator.next()) as BarGraphProblem;
    const state = {
      problem: first,
      answer: START_ANSWER,
      streak: 0,
      answered: 0,
    };

    /** Build/rebuild the three bars + emoji labels for the current problem. */
    function buildChart(): void {
      barGroup.clear();
      valueGroup.clear();
      bars = [];
      const data = state.problem.bars;
      for (let i = 0; i < data.length; i++) {
        const count = data[i].count;
        const h = Math.max(0.0001, count * UNIT_H);
        // The bar is a UNIT-height geometry scaled to its real height ONLY on Y.
        // CRITICAL: popIn/punch animate scale UNIFORMLY (setScalar), which would
        // clobber this non-uniform (1,h,1) y-scale and leave every bar at a fixed
        // unit height floating at its center — the original bug. Fix: keep the
        // height scale on the inner MESH and animate a PARENT GROUP instead. The
        // group sits ON the baseline (y=0); the mesh is offset up by h/2 so its
        // BOTTOM is exactly at y=0 and its TOP at N*UNIT_H. popIn scales the group
        // about y=0, so the bar grows UP from the baseline and settles full-height.
        const mesh = new THREE.Mesh(barGeo, barMats[i % barMats.length]);
        mesh.scale.set(1, h, 1);
        mesh.position.set(0, h / 2, 0); // local: bottom at group origin (y=0)
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        const group = new THREE.Group();
        group.position.set(barX(i), BASE_Y, 0); // group origin ON the 0 baseline
        group.add(mesh);
        barGroup.add(group);
        bars.push({ group, mesh, count });
        track(popIn(group, { delay: i * 70 }));

        // Numeric value plate centered just above the bar's top.
        const valuePlate = new THREE.Mesh(valueGeo, valueMaterial(count));
        valuePlate.position.set(barX(i), BASE_Y + h + 0.35, 0.1);
        valueGroup.add(valuePlate);
      }
      // Emoji labels under each bar (rebuilt to match data order; textures pooled).
      emojiGroup.clear();
      for (let i = 0; i < data.length; i++) {
        if (!emojiTextures[i]) {
          const tex = makeLabelTexture(data[i].emoji, 'rgba(0,0,0,0)', '#000', '80px "Apple Color Emoji","Noto Color Emoji",sans-serif');
          emojiTextures[i] = tex;
          emojiMats[i] = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
        }
        const plate = new THREE.Mesh(emojiGeo, emojiMats[i]);
        plate.position.set(barX(i), BASE_Y - 0.85, 0.2);
        emojiGroup.add(plate);
      }
    }

    function showPrompt(): void {
      // TASK ONLY (DEF 11): the reading question, with the two category emoji. Does
      // NOT reveal the difference; the scene + scale show the data to read.
      const p = state.problem;
      ctx.prompt.set(
        ctx.t('barGraph.prompt', {
          a: p.bars[p.aIndex].emoji,
          b: p.bars[p.bIndex].emoji,
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

    /** Set the answer counter, clamped to [0, MAX_COUNT], and refresh the status. */
    function setAnswer(value: number): void {
      const next = Math.max(0, Math.min(MAX_COUNT, value));
      if (next === state.answer) return;
      state.answer = next;
      // The live answer is intentionally NOT echoed in the prompt (DEF 11); the
      // child reads the bars and commits via Check. The −/+ closures read the
      // fresh `state.answer`, so no control re-set is needed here.
    }

    function resetAnswer(): void {
      state.answer = START_ANSWER;
    }

    function setControls(): void {
      const buttons: ControlButton[] = [
        {
          id: 'value-dec',
          label: `${ctx.t('controls.value')} −`,
          onPress: () => setAnswer(state.answer - 1),
        },
        {
          id: 'value-inc',
          label: `${ctx.t('controls.value')} +`,
          onPress: () => setAnswer(state.answer + 1),
        },
        {
          id: 'reset',
          label: ctx.t('controls.reset'),
          variant: 'reset',
          onPress: resetAnswer,
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
      const next = (quiz ? quiz.state().current : generator.next()) as BarGraphProblem;
      state.problem = next;
      state.answer = START_ANSWER;
      buildChart();
      showPrompt();
      showStatus();
    }

    function onCorrect(): void {
      ctx.audio.play('success');
      ctx.feedback.correct(ctx.t('barGraph.correct', { diff: state.problem.diff }));
      // Punch the two compared bars so the read pair reacts. Punch the GROUP
      // (uniform scale) — NOT the inner mesh, whose (1,h,1) y-scale must survive.
      const a = bars[state.problem.aIndex];
      const b = bars[state.problem.bIndex];
      if (a) track(punch(a.group, 0.14));
      if (b) track(punch(b.group, 0.14));
      celebrate();
    }

    function onWrong(): void {
      ctx.audio.play('fail');
      ctx.feedback.wrong(ctx.t('barGraph.wrong'));
      track(shake(barGroup, 0.06, 280));
    }

    function confirm(): void {
      const ok = generator.check(state.problem, state.answer);

      if (quiz) {
        if (ok) {
          state.streak += 1;
          onCorrect();
        } else {
          state.streak = 0;
          onWrong();
        }
        quiz.submit(state.answer);
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
        startNewProblem();
        return;
      }

      // Practice: correct → score + next; wrong → KEEP the answer so the child can fix it.
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

    // Drag = fast answer set. Drag UP (NDC +y) raises the answer, DOWN lowers it —
    // natural (DEF 9). Map the full vertical sweep across [0, MAX_COUNT].
    const offDrag = ctx.input.on('drag', (p) => {
      const t = (p.y + 1) / 2; // 0 (bottom) .. 1 (top)
      setAnswer(Math.round(t * MAX_COUNT));
    });
    // dragEnd is a secondary submit; the בדוק button is the primary one.
    const offDragEnd = ctx.input.on('dragEnd', confirm);

    buildChart();
    showPrompt();
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

        barGroup.clear();
        emojiGroup.clear();
        valueGroup.clear();
        tickGroup.clear();
        gridGroup.clear();
        ctx.scene.remove(barGroup);
        ctx.scene.remove(emojiGroup);
        ctx.scene.remove(valueGroup);
        ctx.scene.remove(tickGroup);
        ctx.scene.remove(gridGroup);
        ctx.scene.remove(axisPost);
        ctx.scene.remove(base);

        barGeo.dispose();
        barMats.forEach((m) => m.dispose());
        baseGeo.dispose();
        baseMat.dispose();
        axisMat.dispose();
        axisPostGeo.dispose();
        tickGeo.dispose();
        gridGeo.dispose();
        gridMat.dispose();
        plateGeo.dispose();
        tickTextures.forEach((t) => t.dispose());
        tickMats.forEach((m) => m.dispose());
        emojiGeo.dispose();
        emojiTextures.forEach((t) => t.dispose());
        emojiMats.forEach((m) => m.dispose());
        valueGeo.dispose();
        valueTextures.forEach((t) => t.dispose());
        valueMats.forEach((m) => m.dispose());
      },
    };
  },
};

/**
 * Render a string (numeral or emoji) on a CanvasTexture. Numbers use a dark-on-
 * light plate (legible, DEF 12); emoji use a transparent background so only the
 * glyph shows. Created once per slot and reused; disposed on dispose().
 */
function makeLabelTexture(text: string, bg: string, fg: string, font: string): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const g = canvas.getContext('2d');
  if (g) {
    g.clearRect(0, 0, size, size);
    if (bg !== 'rgba(0,0,0,0)') {
      g.fillStyle = bg;
      // rounded-ish plate via a plain rect (kept simple; plane is small)
      g.fillRect(8, 28, size - 16, size - 56);
      g.strokeStyle = 'rgba(42,33,24,0.3)';
      g.lineWidth = 4;
      g.strokeRect(8, 28, size - 16, size - 56);
    }
    g.fillStyle = fg;
    g.font = font;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(text, size / 2, size / 2 + 2);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}
