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
} from '@/lib/games3d/kit';
import { lockedCameraFrame } from '@/lib/games3d/kit/camera';
import { createGeometricSequenceGenerator, type GeometricSequenceProblem } from './problems';

// Theme: WATERFALL STEPPING STONES. Five stone platforms descend in a cascade;
// each shows a number. The pattern multiplies by a constant (×2 or ×3). One
// stone is missing its number (the "?" stone) — the child sets it with −/+ buttons
// (or drags up/down). A glowing arc between consecutive stones hints at the rule.

const QUIZ_LENGTH = 10;
const POINTS_PER_CORRECT = 10;
const ANSWER_STEP = 1;
const MAX_DIAL = 300;

// Stone geometry
const STONE_W = 1.5;
const STONE_H = 1.8;
const STONE_D = 0.4;
const GAP = 0.6;
const PITCH = STONE_W + GAP;

// Waterfall cascade: each stone is slightly lower and offset
const CASCADE_DROP = 0.6;
const CASCADE_OFFSET_X = 0.3;

export const geometricSequenceGame: Game3D = {
  meta: {
    id: 'geometric-sequence',
    i18nKey: 'games3d.geometricSequence',
    topic: 'series',
    difficulty: 3,
    gradeRange: [4, 6],
    estimatedSeconds: 110,
    supportedModes: ['practice', 'quiz'],
  },
  init(ctx) {
    function reframe() {
      const { position, lookAt } = lockedCameraFrame(4.5, -0.5, ctx.camera.aspect);
      ctx.presets.camera.locked(position, lookAt);
    }
    reframe();

    const clayLook = applyClayLook(ctx, {
      topColor: '#87CEEB',
      bottomColor: '#4a8a6a',
      ground: false,
      shadowArea: 12,
      fog: false,
    });

    const generator = createGeometricSequenceGenerator();
    const quiz =
      ctx.mode === 'quiz'
        ? createQuizController(generator, { length: QUIZ_LENGTH, pointsPerCorrect: POINTS_PER_CORRECT })
        : null;

    const liveTweens = new Set<Tween<{ s: number } | { t: number } | { v: number }>>();
    function track(t: Tween<{ s: number }> | Tween<{ t: number }> | Tween<{ v: number }>): void {
      liveTweens.add(t as Tween<{ s: number } | { t: number } | { v: number }>);
    }
    function stopAllTweens(): void {
      liveTweens.forEach((t) => t.stop());
      liveTweens.clear();
    }

    // ---- Shared resources ----
    const stoneGeo = roundedBox(STONE_W, STONE_H, STONE_D, 0.1, 2);
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0xb8a88a, roughness: 0.8, metalness: 0.05 });
    const activeStoneMat = new THREE.MeshStandardMaterial({ color: 0xd9a441, roughness: 0.6, metalness: 0.08 });

    // Text canvases for each stone
    const stoneCanvases: HTMLCanvasElement[] = [];
    const stoneTextures: THREE.CanvasTexture[] = [];
    const stoneTextMats: THREE.MeshBasicMaterial[] = [];
    const stoneTextGeo = new THREE.PlaneGeometry(STONE_W - 0.3, STONE_H - 0.3);

    // Arc geometry (hint)
    const arcMat = new THREE.MeshStandardMaterial({ color: 0xc25b2e, roughness: 0.5, metalness: 0.1 });

    // ---- Scene graph ----
    const root = new THREE.Group();
    ctx.scene.add(root);

    // Stones
    const stones: THREE.Mesh[] = [];
    const startX = -(4 * PITCH) / 2;
    for (let i = 0; i < 5; i++) {
      const x = startX + i * PITCH + i * CASCADE_OFFSET_X;
      const y = -i * CASCADE_DROP;

      const canvas = document.createElement('canvas');
      canvas.width = 192;
      canvas.height = 240;
      stoneCanvases.push(canvas);
      const tex = new THREE.CanvasTexture(canvas);
      tex.needsUpdate = true;
      stoneTextures.push(tex);
      const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
      stoneTextMats.push(mat);

      const stone = new THREE.Mesh(stoneGeo, stoneMat);
      stone.position.set(x, y, 0);
      stone.castShadow = true;
      stone.receiveShadow = true;
      root.add(stone);
      stones.push(stone);

      const textMesh = new THREE.Mesh(stoneTextGeo, mat);
      textMesh.position.set(x, y, 0.05);
      root.add(textMesh);
    }

    // ---- State ----
    const first = quiz ? quiz.state().current : generator.next();
    const state = {
      problem: first as GeometricSequenceProblem,
      answer: 0,
      streak: 0,
      answered: 0,
    };

    function renderStones(): void {
      for (let i = 0; i < 5; i++) {
        const g = stoneCanvases[i].getContext('2d');
        if (!g) continue;
        g.clearRect(0, 0, 192, 240);

        const isMissing = i === state.problem.missingIndex;
        stones[i].material = isMissing ? activeStoneMat : stoneMat;

        if (isMissing) {
          g.fillStyle = '#8a5a1a';
          g.font = 'bold 80px sans-serif';
          g.textAlign = 'center';
          g.textBaseline = 'middle';
          g.fillText('?', 96, 120);
        } else {
          g.fillStyle = '#3a2c14';
          g.font = 'bold 56px sans-serif';
          g.textAlign = 'center';
          g.textBaseline = 'middle';
          g.fillText(String(state.problem.terms[i]), 96, 120);
        }
        stoneTextures[i].needsUpdate = true;
      }
    }

    function showPrompt(): void {
      ctx.prompt.set(ctx.t('geometricSequence.prompt'));
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

    function setAnswer(val: number): void {
      state.answer = Math.max(0, Math.min(MAX_DIAL, Math.round(val)));
      // Update the missing stone text
      const g = stoneCanvases[state.problem.missingIndex].getContext('2d');
      if (g) {
        g.clearRect(0, 0, 192, 240);
        g.fillStyle = '#8a5a1a';
        g.font = 'bold 56px sans-serif';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText(String(state.answer), 96, 120);
        stoneTextures[state.problem.missingIndex].needsUpdate = true;
      }
    }

    function setControls(): void {
      const buttons: ControlButton[] = [
        {
          id: 'ans-dec',
          label: '−',
          onPress: () => setAnswer(state.answer - ANSWER_STEP),
        },
        {
          id: 'ans-inc',
          label: '+',
          onPress: () => setAnswer(state.answer + ANSWER_STEP),
        },
        {
          id: 'reset',
          label: ctx.t('controls.reset'),
          variant: 'reset',
          onPress: () => setAnswer(0),
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
      renderStones();
      setAnswer(0);
      showPrompt();
      showStatus();
    }

    function onCorrect(): void {
      ctx.audio.play('success');
      ctx.feedback.correct(ctx.t('geometricSequence.correct', {
        value: state.problem.terms[state.problem.missingIndex],
      }));
      track(punch(root, 0.1));
      celebrate();
    }

    function onWrong(): void {
      ctx.audio.play('fail');
      ctx.feedback.wrong(ctx.t('geometricSequence.wrong'));
      track(shake(root, 0.05, 280));
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
        state.problem = qs.current;
        startNewProblem();
        return;
      }

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

    // Initial render
    setAnswer(0);
    track(popIn(root, { scale: 1 }));
    setControls();
    startNewProblem();

    return {
      onResize() { reframe(); },
      dispose() {
        stopAllTweens();
        ctx.controls.clear();
        ctx.prompt.clear();
        ctx.status.clear();
        clayLook.dispose();

        root.clear();
        ctx.scene.remove(root);

        stoneGeo.dispose();
        stoneMat.dispose();
        activeStoneMat.dispose();
        stoneTextures.forEach((t) => t.dispose());
        stoneTextMats.forEach((m) => m.dispose());
        stoneTextGeo.dispose();
        arcMat.dispose();
      },
    };
  },
};
