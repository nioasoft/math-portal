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
import { lockedCameraFrame } from '@/lib/games3d/kit/camera';
import {
  createDecimalAdditionGenerator,
  formatHundredths,
  type DecimalAdditionProblem,
  type DecimalDigits,
} from './problems';

// Theme: STACKING BLOCKS. Two decimal numbers are shown as stacked rows of
// place-value blocks (ones/tenths/hundredths). The child builds the sum
// digit-by-digit using place value buttons. Carrying between places is required.

const QUIZ_LENGTH = 10;
const POINTS_PER_CORRECT = 10;

// Block geometry
const BLOCK_W = 0.8;
const BLOCK_H = 0.6;
const BLOCK_D = 0.5;

export const decimalAdditionGame: Game3D = {
  meta: {
    id: 'decimal-addition',
    i18nKey: 'games3d.decimalAddition',
    topic: 'decimals',
    difficulty: 3,
    gradeRange: [4, 5],
    estimatedSeconds: 120,
    supportedModes: ['practice', 'quiz'],
  },
  init(ctx) {
    function reframe() {
      const { position, lookAt } = lockedCameraFrame(4, 0.3, ctx.camera.aspect);
      ctx.presets.camera.locked(position, lookAt);
    }
    reframe();

    const clayLook = applyClayLook(ctx, {
      topColor: '#e8dcc0',
      bottomColor: '#b8a88a',
      ground: false,
      shadowArea: 10,
      fog: false,
    });

    const generator = createDecimalAdditionGenerator();
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
    const blockGeo = roundedBox(BLOCK_W, BLOCK_H, BLOCK_D, 0.06, 2);
    const blockMats = [
      new THREE.MeshStandardMaterial({ color: PALETTE.coral, roughness: 0.5, metalness: 0.08 }),
      new THREE.MeshStandardMaterial({ color: PALETTE.sky, roughness: 0.5, metalness: 0.08 }),
      new THREE.MeshStandardMaterial({ color: PALETTE.mint, roughness: 0.5, metalness: 0.08 }),
    ];

    // Sign canvas
    const signCanvas = document.createElement('canvas');
    signCanvas.width = 512;
    signCanvas.height = 256;
    const signTex = new THREE.CanvasTexture(signCanvas);
    signTex.needsUpdate = true;
    const signMat = new THREE.MeshBasicMaterial({ map: signTex, transparent: true });
    const signGeo = new THREE.PlaneGeometry(5, 2.5);

    // ---- Scene graph ----
    const root = new THREE.Group();
    ctx.scene.add(root);

    // Sign
    const sign = new THREE.Mesh(signGeo, signMat);
    sign.position.set(0, 1.5, 0);
    root.add(sign);

    // ---- State ----
    const first = quiz ? quiz.state().current : generator.next();
    const state = {
      problem: first as DecimalAdditionProblem,
      answer: { ones: 0, tenths: 0, hundredths: 0 } as DecimalDigits,
      streak: 0,
      answered: 0,
    };

    function renderSign(): void {
      const g = signCanvas.getContext('2d');
      if (!g) return;
      g.clearRect(0, 0, 512, 256);

      const aStr = formatHundredths(state.problem.aHundredths);
      const bStr = formatHundredths(state.problem.bHundredths);

      g.fillStyle = '#2a1f14';
      g.font = 'bold 64px sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(`${aStr} + ${bStr} = ?`, 256, 128);
      signTex.needsUpdate = true;
    }

    function renderAnswer(): void {
      const g = signCanvas.getContext('2d');
      if (!g) return;

      // Re-render sign with answer
      g.clearRect(0, 0, 512, 256);
      const aStr = formatHundredths(state.problem.aHundredths);
      const bStr = formatHundredths(state.problem.bHundredths);
      const ansStr = `${state.answer.ones}.${state.answer.tenths}${state.answer.hundredths}`;

      g.fillStyle = '#2a1f14';
      g.font = 'bold 48px sans-serif';
      g.textAlign = 'center';
      g.fillText(`${aStr} + ${bStr} =`, 256, 80);
      g.fillStyle = '#cc2222';
      g.font = 'bold 64px sans-serif';
      g.fillText(ansStr, 256, 180);
      signTex.needsUpdate = true;
    }

    function showPrompt(): void {
      ctx.prompt.set(ctx.t('decimalAddition.prompt', {
        a: formatHundredths(state.problem.aHundredths),
        b: formatHundredths(state.problem.bHundredths),
      }));
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

    function setControls(): void {
      const buttons: ControlButton[] = [
        {
          id: 'ones-dec',
          label: `${ctx.t('controls.ones')} −`,
          onPress: () => { state.answer.ones = Math.max(0, state.answer.ones - 1); renderAnswer(); },
        },
        {
          id: 'ones-inc',
          label: `${ctx.t('controls.ones')} +`,
          onPress: () => { state.answer.ones = Math.min(9, state.answer.ones + 1); renderAnswer(); },
        },
        {
          id: 'tenths-dec',
          label: `${ctx.t('controls.tenths')} −`,
          onPress: () => { state.answer.tenths = Math.max(0, state.answer.tenths - 1); renderAnswer(); },
        },
        {
          id: 'tenths-inc',
          label: `${ctx.t('controls.tenths')} +`,
          onPress: () => { state.answer.tenths = Math.min(9, state.answer.tenths + 1); renderAnswer(); },
        },
        {
          id: 'hundredths-dec',
          label: `${ctx.t('controls.hundredths')} −`,
          onPress: () => { state.answer.hundredths = Math.max(0, state.answer.hundredths - 1); renderAnswer(); },
        },
        {
          id: 'hundredths-inc',
          label: `${ctx.t('controls.hundredths')} +`,
          onPress: () => { state.answer.hundredths = Math.min(9, state.answer.hundredths + 1); renderAnswer(); },
        },
        {
          id: 'reset',
          label: ctx.t('controls.reset'),
          variant: 'reset',
          onPress: () => { state.answer = { ones: 0, tenths: 0, hundredths: 0 }; renderAnswer(); },
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
      state.answer = { ones: 0, tenths: 0, hundredths: 0 };
      renderSign();
      showPrompt();
      showStatus();
    }

    function onCorrect(): void {
      ctx.audio.play('success');
      const expected = state.problem.aHundredths + state.problem.bHundredths;
      ctx.feedback.correct(ctx.t('decimalAddition.correct', {
        result: formatHundredths(expected),
      }));
      track(punch(root, 0.1));
      celebrate();
    }

    function onWrong(): void {
      ctx.audio.play('fail');
      ctx.feedback.wrong(ctx.t('decimalAddition.wrong'));
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

        blockGeo.dispose();
        blockMats.forEach((m) => m.dispose());
        signTex.dispose();
        signMat.dispose();
        signGeo.dispose();
      },
    };
  },
};
