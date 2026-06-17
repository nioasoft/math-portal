import * as THREE from 'three';
import type { Tween } from '@tweenjs/tween.js';
import type { ControlButton, Game3D } from '@/lib/games3d/types';
import { createQuizController } from '@/lib/games3d/quiz/controller';
import { applyClayLook, roundedBox, popIn, punch, shake, celebrate, bigCelebrate, computeStars, PALETTE } from '@/lib/games3d/kit';
import { fitDistance } from '@/lib/games3d/kit/camera';
import { createTenFrameGenerator, MAX_TARGET, type TenFrameProblem } from './problems';

// Theme: a wooden PEG BOARD with marbles, viewed top-down. Each ten-frame is a
// 2-row × 5-column board of peg holes; you drop a marble into a hole to count.
// Fill order is the standard ten-frame order — left→right across the top row,
// then left→right across the bottom row — so "five" fills a full row and "ten"
// fills a whole frame, making grouping-by-5 and grouping-by-10 read visually.
// Targets 11–20 reveal a SECOND ten-frame to the side (a double ten-frame).
// Drag across the holes to fill quickly; use −/+ for fine control; בדוק to commit.
const COLS = 5;
const ROWS = 2;
const CELLS_PER_FRAME = COLS * ROWS; // 10
const CELL = 1.0; // spacing between hole centers
const HOLE_RADIUS = 0.34; // peg-hole socket radius
const MARBLE_RADIUS = 0.4; // marble sits a touch proud of its hole
const FRAME_GAP = 1.4; // gap between the two ten-frames (double frame)
const QUIZ_LENGTH = 10;
const POINTS_PER_CORRECT = 10;
const POP_STAGGER_MS = 14; // gentle per-marble delay when many appear at once

// Marbles cycle a small playful palette per cell index so subitizing pops, but
// the FIRST five and SECOND five of each frame share a tint band would muddy the
// "group of 5" read — instead we color by frame-half (cols 0-4 = top, 5-9 bottom)
// is implicit by row; we simply rotate the series for variety.
const MARBLE_COLORS = [PALETTE.coral, PALETTE.sun, PALETTE.mint, PALETTE.sky, PALETTE.grape] as const;
const BOARD_COLOR = 0x8a5a3b; // warm wood
const HOLE_COLOR = 0x5a3a26; // darker recessed socket

const MARBLE_Y = 0.32; // marble center height above the board top
const HOLE_Y = 0.07; // socket sits just above the board surface

/**
 * Layout for the i-th cell (0-based) across up to two ten-frames. Returns world
 * x/z. Cells 0..9 are the first frame, 10..19 the second frame (shifted +x).
 * Within a frame: top row (r=0) is cols 0..4, bottom row (r=1) is cols 5..9.
 * Each frame is centered on its own origin; the pair is centered on the world.
 */
function cellPosition(i: number, frames: number): { x: number; z: number } {
  const frame = Math.floor(i / CELLS_PER_FRAME); // 0 or 1
  const within = i % CELLS_PER_FRAME;
  const row = Math.floor(within / COLS); // 0 (top) | 1 (bottom)
  const col = within % COLS; // 0..4
  const frameWidth = (COLS - 1) * CELL;
  // Local position inside the frame, centered.
  const localX = col * CELL - frameWidth / 2;
  const localZ = row * CELL - ((ROWS - 1) * CELL) / 2;
  // Pitch between the two frame centers (frame width + gap).
  const pitch = frameWidth + CELL + FRAME_GAP;
  // Center the whole set of frames on the world origin.
  const totalSpan = (frames - 1) * pitch;
  const frameCenterX = frame * pitch - totalSpan / 2;
  return { x: frameCenterX + localX, z: localZ };
}

export const tenFrameFillGame: Game3D = {
  meta: {
    id: 'ten-frame-fill',
    i18nKey: 'games3d.tenFrame',
    topic: 'arithmetic',
    difficulty: 1,
    gradeRange: [1, 2],
    estimatedSeconds: 90,
    supportedModes: ['practice', 'quiz'],
  },
  init(ctx) {
    // Top-down view so both ten-frames and the fill order are unambiguous.
    function reframe(): void {
      const dist = fitDistance(5.5, ctx.camera.aspect);
      ctx.presets.camera.topDown(new THREE.Vector3(0, 0, 0), dist);
    }
    reframe();

    const clayLook = applyClayLook(ctx, {
      topColor: '#dCe8ff',
      bottomColor: '#fdeccc',
      ground: false,
      shadowArea: 12,
      fog: false,
    });

    const generator = createTenFrameGenerator(MAX_TARGET);
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

    // ---- Shared, reused resources (one geometry/material per kind) ----
    const frameWidth = (COLS - 1) * CELL;
    const boardW = frameWidth + CELL + 0.6; // a frame's wooden plate footprint
    const boardD = (ROWS - 1) * CELL + CELL + 0.6;
    const boardGeo = roundedBox(boardW, 0.22, boardD, 0.16, 3);
    const boardMat = new THREE.MeshStandardMaterial({ color: BOARD_COLOR, roughness: 0.85, metalness: 0.03 });

    const holeGeo = new THREE.CylinderGeometry(HOLE_RADIUS, HOLE_RADIUS, 0.12, 24);
    const holeMat = new THREE.MeshStandardMaterial({ color: HOLE_COLOR, roughness: 0.9, metalness: 0.0 });

    const marbleGeo = new THREE.SphereGeometry(MARBLE_RADIUS, 24, 18);
    const marbleMats = MARBLE_COLORS.map(
      (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.25, metalness: 0.05 })
    );

    // Groups: boards + holes (static per frame-count), marbles (rebuilt on change).
    const boardGroup = new THREE.Group();
    const holeGroup = new THREE.Group();
    const marbleGroup = new THREE.Group();
    ctx.scene.add(boardGroup);
    ctx.scene.add(holeGroup);
    ctx.scene.add(marbleGroup);

    const first = quiz ? quiz.state().current : generator.next();
    const state = {
      problem: first as TenFrameProblem,
      count: 0, // marbles currently placed
      frames: 1, // 1 or 2 ten-frames shown
      streak: 0,
      answered: 0,
    };

    function showPrompt(): void {
      // TASK ONLY — never echoes the live built count; the board shows progress.
      ctx.prompt.set(ctx.t('tenFrame.prompt', { target: state.problem.target }));
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

    /** How many ten-frames a target needs (1 for ≤10, else 2). */
    function framesFor(target: number): number {
      return target > CELLS_PER_FRAME ? 2 : 1;
    }

    /** (Re)build the wooden boards + recessed holes for the current frame count. */
    function buildBoards(): void {
      boardGroup.clear();
      holeGroup.clear();
      const pitch = frameWidth + CELL + FRAME_GAP;
      const totalSpan = (state.frames - 1) * pitch;
      for (let f = 0; f < state.frames; f++) {
        const board = new THREE.Mesh(boardGeo, boardMat);
        board.position.set(f * pitch - totalSpan / 2, -0.06, 0);
        board.receiveShadow = true;
        board.castShadow = true;
        boardGroup.add(board);
      }
      const totalCells = state.frames * CELLS_PER_FRAME;
      for (let i = 0; i < totalCells; i++) {
        const pos = cellPosition(i, state.frames);
        const hole = new THREE.Mesh(holeGeo, holeMat);
        hole.position.set(pos.x, HOLE_Y, pos.z);
        hole.receiveShadow = true;
        holeGroup.add(hole);
      }
    }

    /**
     * Rebuild marbles to match `state.count`. Marbles beyond `prevCount` pop in
     * with a stagger (newly placed); existing ones snap to place (cheap). Fill
     * order follows {@link cellPosition} — top row then bottom — so grouping by 5
     * and by 10 reads visually.
     */
    function buildMarbles(prevCount: number): void {
      marbleGroup.clear();
      let newOrdinal = 0;
      for (let i = 0; i < state.count; i++) {
        const pos = cellPosition(i, state.frames);
        const marble = new THREE.Mesh(marbleGeo, marbleMats[i % marbleMats.length]);
        marble.position.set(pos.x, MARBLE_Y, pos.z);
        marble.castShadow = true;
        if (i >= prevCount) {
          track(popIn(marble, { delay: newOrdinal * POP_STAGGER_MS }));
          newOrdinal += 1;
        }
        marbleGroup.add(marble);
      }
    }

    /** Apply a new marble count, rebuilding frames + marbles as needed. */
    function setCount(next: number, prevForAnim: number): void {
      const max = state.frames * CELLS_PER_FRAME;
      const clamped = Math.max(0, Math.min(max, next));
      state.count = clamped;
      buildMarbles(prevForAnim);
    }

    function setControls(): void {
      const marblesLabel = ctx.t('controls.marbles');
      const buttons: ControlButton[] = [
        {
          id: 'marble-dec',
          label: `${marblesLabel} −`,
          onPress: () => setCount(state.count - 1, state.count),
        },
        {
          id: 'marble-inc',
          label: `${marblesLabel} +`,
          onPress: () => setCount(state.count + 1, state.count),
        },
        {
          id: 'reset',
          label: ctx.t('controls.reset'),
          variant: 'reset',
          onPress: () => setCount(0, 0),
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

    /** Set up the board + empty marbles for the current problem. */
    function layoutForProblem(): void {
      state.frames = framesFor(state.problem.target);
      buildBoards();
      state.count = 0;
      buildMarbles(0);
      showPrompt();
    }

    function startNewProblem(): void {
      layoutForProblem();
      showStatus();
    }

    function onCorrect(): void {
      ctx.audio.play('success');
      ctx.feedback.correct(ctx.t('tenFrame.correct', { target: state.problem.target }));
      track(punch(marbleGroup, 0.16));
      celebrate();
    }

    function onWrong(): void {
      ctx.audio.play('fail');
      ctx.feedback.wrong(ctx.t('tenFrame.wrong'));
      track(shake(marbleGroup, 0.07, 280));
    }

    function confirm(): void {
      const answer = state.count;
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

      // Practice: correct → score + next problem; wrong → keep the marbles to fix.
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

    // Drag = fast fill. Map the pointer's horizontal sweep (NDC x, -1..1) across
    // all available holes: the further right you drag, the more holes fill
    // (natural left→right fill order, no inversion). This lets a child sweep a
    // finger across the frame to count up quickly.
    const offDrag = ctx.input.on('drag', (p) => {
      const maxCells = state.frames * CELLS_PER_FRAME;
      const t = Math.min(1, Math.max(0, (p.x + 1) / 2)); // 0..1, left→right
      const target = Math.round(t * maxCells);
      if (target !== state.count) setCount(target, state.count);
    });
    // dragEnd is a secondary submit path; the בדוק button is the primary one.
    const offDragEnd = ctx.input.on('dragEnd', confirm);

    layoutForProblem();
    setControls();
    showStatus();

    return {
      onResize() { reframe(); },
      dispose() {
        offDrag();
        offDragEnd();
        stopAllTweens();
        ctx.controls.clear();
        ctx.prompt.clear();
        ctx.status.clear();
        clayLook.dispose();

        boardGroup.clear();
        holeGroup.clear();
        marbleGroup.clear();
        ctx.scene.remove(boardGroup);
        ctx.scene.remove(holeGroup);
        ctx.scene.remove(marbleGroup);

        boardGeo.dispose();
        boardMat.dispose();
        holeGeo.dispose();
        holeMat.dispose();
        marbleGeo.dispose();
        marbleMats.forEach((m) => m.dispose());
      },
    };
  },
};
