import * as THREE from 'three';
import type { Tween } from '@tweenjs/tween.js';
import type { ControlButton, Game3D } from '@/lib/games3d/types';
import { createQuizController } from '@/lib/games3d/quiz/controller';
import { applyClayLook, roundedBox, popIn, punch, shake, celebrate, bigCelebrate, computeStars, PALETTE } from '@/lib/games3d/kit';
import {
  createSymmetryGenerator,
  mirror,
  cellKey,
  ROWS,
  COLS_PER_SIDE,
  type SymmetryProblem,
} from './problems';

// Theme: a BUTTERFLY at a mirror. A bright vertical mirror line runs down the
// centre of the board. The LEFT wing is GIVEN (filled tiles in a saturated wing
// colour). The child completes the SYMMETRIC right wing by tapping / dragging on
// the right-side tiles to fill the cells that reflect the left wing across the
// line. Teaches line symmetry / reflection across a vertical axis.
//
// Cell coords use the problems.ts "distance-from-the-line" convention: column c
// is how far a cell sits from the mirror (c=0 nearest the line). The reflected
// right cell shares the SAME (r,c) — only the side flips — so a left cell at
// (r,c) must be matched by a right cell at (r,c).
const CELL = 1.0; // pitch between tile centres
const TILE = 0.92; // tile footprint (a small gap reads as a grid)
const TILE_DEPTH = 0.3; // a little thickness so tiles read as standing blocks
const FILL_DEPTH = 0.34; // the fill cap sits a touch proud of the frame
const QUIZ_LENGTH = 10;
const POINTS_PER_CORRECT = 10;
const POP_STAGGER_MS = 18;

// Palette: the given LEFT wing is one saturated colour; the child's RIGHT fills a
// distinct accent; empty tiles are a pale outlined frame; the mirror line glows.
const GIVEN_COLOR = PALETTE.grape; // the given (left) wing — saturated purple
const FILL_COLOR = PALETTE.coral; // the child's right-wing fills — warm coral
const FRAME_COLOR = 0x3a3358; // dark outlined empty tile (contrast on light clay)
const MIRROR_COLOR = PALETTE.sun; // bright golden mirror line
const BODY_COLOR = 0x2c2a3a; // butterfly body down the mirror line

/** World X for a cell. Left side is negative x, right side positive; mirror at x=0. */
function cellX(c: number, side: 'left' | 'right'): number {
  const dist = (c + 0.5) * CELL; // distance from the mirror line
  return side === 'left' ? -dist : dist;
}
/** World Y for a row (row 0 = top → highest y). Straight-on camera, so y is vertical. */
function cellY(r: number): number {
  return ((ROWS - 1) / 2 - r) * CELL;
}

export const symmetryMirrorGame: Game3D = {
  meta: {
    id: 'symmetry-mirror',
    i18nKey: 'games3d.symmetryMirror',
    topic: 'geometry',
    difficulty: 3,
    gradeRange: [2, 4],
    estimatedSeconds: 90,
    supportedModes: ['practice', 'quiz'],
  },
  init(ctx) {
    // Straight-on locked camera: drag-x → world-x and drag-y → world-y are both
    // monotonic (natural, no inversion). The board's binding extent is its WIDTH
    // (2*COLS_PER_SIDE = 8 units); distance D is sized to fit that with margin.
    const halfWidth = COLS_PER_SIDE * CELL; // 4
    const halfHeight = COLS_PER_SIDE * CELL; // board is square
    const aspect = ctx.camera.aspect;
    const fovRad = Math.PI / 3; // 60° vertical FOV
    const distForW = halfWidth / (Math.tan(fovRad / 2) * aspect);
    const distForH = halfHeight / Math.tan(fovRad / 2);
    const D = Math.max(distForW, distForH) + 2.2;
    ctx.presets.camera.locked(new THREE.Vector3(0, 0, D), new THREE.Vector3(0, 0, 0));

    // Content sits centred on the origin and spans y ∈ [-2, 2] (above and below 0),
    // so ground MUST be off or the clay floor plane would occlude the lower rows.
    const clayLook = applyClayLook(ctx, {
      topColor: '#e7ddff',
      bottomColor: '#ffe4d6',
      ground: false,
      shadowArea: 10,
      fog: false,
    });

    const generator = createSymmetryGenerator();
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
    const frameGeo = roundedBox(TILE, TILE, TILE_DEPTH, 0.12, 3);
    const frameMat = new THREE.MeshStandardMaterial({ color: FRAME_COLOR, roughness: 0.85, metalness: 0.03 });
    const fillGeo = roundedBox(TILE, TILE, FILL_DEPTH, 0.12, 3);
    const givenMat = new THREE.MeshStandardMaterial({ color: GIVEN_COLOR, roughness: 0.4, metalness: 0.06, emissive: GIVEN_COLOR, emissiveIntensity: 0.18 });
    const fillMat = new THREE.MeshStandardMaterial({ color: FILL_COLOR, roughness: 0.4, metalness: 0.06, emissive: FILL_COLOR, emissiveIntensity: 0.22 });

    // Bright mirror line + butterfly body down x=0.
    const mirrorGeo = roundedBox(0.16, ROWS * CELL + 0.4, 0.2, 0.05, 2);
    const mirrorMat = new THREE.MeshStandardMaterial({ color: MIRROR_COLOR, roughness: 0.3, metalness: 0.1, emissive: MIRROR_COLOR, emissiveIntensity: 0.5 });
    const mirrorLine = new THREE.Mesh(mirrorGeo, mirrorMat);
    mirrorLine.position.set(0, 0, 0.05);
    mirrorLine.scale.setScalar(1); // static prop: explicit scale, never popIn (§13c)
    ctx.scene.add(mirrorLine);

    const bodyGeo = roundedBox(0.36, ROWS * CELL + 0.2, 0.5, 0.16, 3);
    const bodyMat = new THREE.MeshStandardMaterial({ color: BODY_COLOR, roughness: 0.6, metalness: 0.04 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.set(0, 0, -0.05);
    body.scale.setScalar(1);
    body.castShadow = true;
    ctx.scene.add(body);

    // Groups — everything added to the scene via these (paranoid visibility).
    const frameGroup = new THREE.Group(); // static outlined tiles (both sides)
    const leftFillGroup = new THREE.Group(); // given left-wing fills
    const rightFillGroup = new THREE.Group(); // child's right-wing fills (rebuilt on toggle)
    frameGroup.scale.setScalar(1);
    leftFillGroup.scale.setScalar(1);
    rightFillGroup.scale.setScalar(1);
    ctx.scene.add(frameGroup);
    ctx.scene.add(leftFillGroup);
    ctx.scene.add(rightFillGroup);

    // Right-cell fill meshes indexed by "r,c" key so we can toggle visibility cheaply.
    const rightFills = new Map<string, THREE.Mesh>();
    const filled = new Set<string>(); // "r,c" keys the child has filled on the RIGHT

    const state = {
      problem: (quiz ? quiz.state().current : generator.next()) as SymmetryProblem,
      streak: 0,
      answered: 0,
    };

    function showPrompt(): void {
      // TASK ONLY — does not reveal which cells or whether solved.
      ctx.prompt.set(ctx.t('symmetryMirror.prompt'));
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

    /** Build the static outlined frame tiles for BOTH sides (one mesh per cell). */
    function buildFrames(): void {
      frameGroup.clear();
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS_PER_SIDE; c++) {
          for (const side of ['left', 'right'] as const) {
            const tile = new THREE.Mesh(frameGeo, frameMat);
            tile.position.set(cellX(c, side), cellY(r), 0);
            tile.castShadow = true;
            tile.receiveShadow = true;
            // Back-reference so tap/drag hit-testing can identify the cell. Only the
            // RIGHT frames are interactive; left ones are tagged but ignored on tap.
            tile.userData.cell = { r, c, side };
            frameGroup.add(tile);
          }
        }
      }
    }

    /** Place the GIVEN left wing (always-visible saturated fills). */
    function buildGivenWing(): void {
      leftFillGroup.clear();
      const left = new Set(state.problem.leftCells);
      let ordinal = 0;
      for (const key of left) {
        const [r, c] = key.split(',').map(Number);
        const mesh = new THREE.Mesh(fillGeo, givenMat);
        mesh.position.set(cellX(c, 'left'), cellY(r), 0.06);
        mesh.castShadow = true;
        // Uniform scale group member — popIn (uniform) is safe here.
        track(popIn(mesh, { delay: ordinal * POP_STAGGER_MS }));
        ordinal += 1;
        leftFillGroup.add(mesh);
      }
    }

    /**
     * Build the child's RIGHT fill meshes — ONE per right cell, hidden by default,
     * visibility toggled by `filled`. Built once per problem (reused on toggle, not
     * re-allocated), so toggling is just a visibility + popIn flip.
     */
    function buildRightFills(): void {
      rightFillGroup.clear();
      rightFills.clear();
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS_PER_SIDE; c++) {
          const mesh = new THREE.Mesh(fillGeo, fillMat);
          mesh.position.set(cellX(c, 'right'), cellY(r), 0.06);
          mesh.castShadow = true;
          mesh.visible = false;
          mesh.scale.setScalar(1);
          mesh.userData.cell = { r, c, side: 'right' };
          rightFills.set(cellKey(r, c), mesh);
          rightFillGroup.add(mesh);
        }
      }
    }

    /** Toggle / set a right cell's filled state, syncing its mesh + the `filled` set. */
    function setCellFilled(r: number, c: number, fill: boolean): void {
      const key = cellKey(r, c);
      const mesh = rightFills.get(key);
      if (!mesh) return;
      if (fill) {
        if (filled.has(key)) return;
        filled.add(key);
        mesh.visible = true;
        track(popIn(mesh, { scale: 1 })); // uniform popIn on its own mesh — safe
      } else {
        if (!filled.has(key)) return;
        filled.delete(key);
        mesh.visible = false;
        mesh.scale.setScalar(1); // reset (popIn may have shrunk-then-grown it)
      }
    }

    function toggleCell(r: number, c: number): void {
      const key = cellKey(r, c);
      setCellFilled(r, c, !filled.has(key));
      ctx.audio.play('click');
    }

    function clearRight(): void {
      if (filled.size === 0) return;
      [...filled].forEach((key) => {
        const [r, c] = key.split(',').map(Number);
        setCellFilled(r, c, false);
      });
      ctx.audio.play('click');
    }

    /** Lay out a fresh problem: frames + given wing + empty (≠ target) right side. */
    function layoutForProblem(): void {
      stopAllTweens();
      filled.clear();
      buildFrames();
      buildGivenWing();
      buildRightFills(); // all hidden → right side starts empty (target has ≥1 cell)
      showPrompt();
    }

    function startNewProblem(): void {
      if (quiz) {
        state.problem = quiz.state().current;
      } else {
        state.problem = generator.next();
      }
      layoutForProblem();
      showStatus();
    }

    function setControls(): void {
      const buttons: ControlButton[] = [
        {
          id: 'reset',
          label: ctx.t('controls.reset'),
          variant: 'reset',
          onPress: clearRight,
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

    function onCorrect(): void {
      ctx.audio.play('success');
      ctx.feedback.correct(ctx.t('symmetryMirror.correct'));
      // Punch the whole completed butterfly (both wings) on uniform groups.
      track(punch(leftFillGroup, 0.16));
      track(punch(rightFillGroup, 0.16));
      celebrate();
    }

    function onWrong(): void {
      ctx.audio.play('fail');
      ctx.feedback.wrong(ctx.t('symmetryMirror.wrong'));
      // Gentle shake of the right wing the child is building; briefly flash mismatches.
      track(shake(rightFillGroup, 0.07, 280));
      flashMismatches();
    }

    /** Briefly highlight cells that are wrong (missing target OR extra). */
    function flashMismatches(): void {
      const target = mirror(state.problem.leftCells);
      const wrongKeys = new Set<string>();
      for (const key of target) if (!filled.has(key)) wrongKeys.add(key); // missing
      for (const key of filled) if (!target.has(key)) wrongKeys.add(key); // extra
      for (const key of wrongKeys) {
        const mesh = rightFills.get(key);
        if (mesh) track(shake(mesh, 0.12, 260));
      }
    }

    function confirm(): void {
      const answer = [...filled];
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
        startNewProblem();
        return;
      }

      // Practice: correct → score + next problem; wrong → KEEP the built wing to fix.
      if (ok) {
        state.streak += 1;
        onCorrect();
        ctx.score.add(POINTS_PER_CORRECT);
        if (state.streak > 0 && state.streak % 3 === 0) bigCelebrate();
        state.problem = generator.next();
        layoutForProblem();
        showStatus();
      } else {
        state.streak = 0;
        onWrong();
        showStatus();
      }
    }

    /** Identify the RIGHT cell under a picked object (frame OR existing fill). */
    function cellFromPicked(picked: THREE.Object3D | null): { r: number; c: number } | null {
      const cell = picked?.userData?.cell as { r: number; c: number; side: string } | undefined;
      if (!cell || cell.side !== 'right') return null;
      return { r: cell.r, c: cell.c };
    }

    // TAP a right-side cell → toggle it. Tapping a left/given cell does nothing.
    const offTap = ctx.input.on('tap', (p) => {
      const cell = cellFromPicked(p.picked ?? null);
      if (!cell) return;
      toggleCell(cell.r, cell.c);
    });

    // DRAG across right-side cells → PAINT them filled (each cell the pointer passes
    // over is filled; never un-filled, so a sweep reliably adds the wing). Natural:
    // the straight-on camera keeps pointer→world monotonic, no inverted axis.
    const offDrag = ctx.input.on('drag', (p) => {
      const cell = cellFromPicked(p.picked ?? null);
      if (!cell) return;
      setCellFilled(cell.r, cell.c, true);
    });

    layoutForProblem();
    setControls();
    showStatus();

    return {
      onResize() {},
      dispose() {
        offTap();
        offDrag();
        stopAllTweens();
        ctx.controls.clear();
        ctx.prompt.clear();
        ctx.status.clear();
        clayLook.dispose();

        frameGroup.clear();
        leftFillGroup.clear();
        rightFillGroup.clear();
        rightFills.clear();
        ctx.scene.remove(frameGroup);
        ctx.scene.remove(leftFillGroup);
        ctx.scene.remove(rightFillGroup);
        ctx.scene.remove(mirrorLine);
        ctx.scene.remove(body);

        frameGeo.dispose();
        frameMat.dispose();
        fillGeo.dispose();
        givenMat.dispose();
        fillMat.dispose();
        mirrorGeo.dispose();
        mirrorMat.dispose();
        bodyGeo.dispose();
        bodyMat.dispose();
      },
    };
  },
};
