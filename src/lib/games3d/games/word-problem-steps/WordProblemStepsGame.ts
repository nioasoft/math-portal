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
import { createMultiStepGenerator, type MultiStepProblem } from './problems';

// Theme: CONSTRUCTION SITE. A two-part word problem is displayed on a blueprint.
// Step 1 result is shown as blocks on a platform. The child dials the final
// answer for Step 2 using −/+ buttons.

const QUIZ_LENGTH = 10;
const POINTS_PER_CORRECT = 10;
const ANSWER_STEP = 1;
const MAX_DIAL = 30;

const NAMES_HE = ['דני', 'שרה', 'יוסי', 'מיכל', 'אבי'];
const ITEMS_HE = ['תפוחים', 'ספרים', 'כדורים', 'מדבקות', 'פרחים'];
const NAMES_EN = ['Danny', 'Sarah', 'Yossi', 'Michal', 'Avi'];
const ITEMS_EN = ['apples', 'books', 'balls', 'stickers', 'flowers'];

export const wordProblemStepsGame: Game3D = {
  meta: {
    id: 'word-problem-steps',
    i18nKey: 'games3d.wordProblemSteps',
    topic: 'wordProblems',
    difficulty: 4,
    gradeRange: [3, 5],
    estimatedSeconds: 120,
    supportedModes: ['practice', 'quiz'],
  },
  init(ctx) {
    function reframe() {
      const { position, lookAt } = lockedCameraFrame(3.5, 0, ctx.camera.aspect);
      ctx.presets.camera.locked(position, lookAt);
    }
    reframe();

    const clayLook = applyClayLook(ctx, {
      topColor: '#87CEEB',
      bottomColor: '#f5e6d0',
      ground: false,
      shadowArea: 10,
      fog: false,
    });

    const generator = createMultiStepGenerator();
    const quiz =
      ctx.mode === 'quiz'
        ? createQuizController(generator, { length: QUIZ_LENGTH, pointsPerCorrect: POINTS_PER_CORRECT })
        : null;

    const liveTweens = new Set<Tween<{ s: number } | { t: number }>>();
    function track(t: Tween<{ s: number }> | Tween<{ t: number }>): void {
      liveTweens.add(t as Tween<{ s: number } | { t: number }>);
    }
    function stopAllTweens(): void {
      liveTweens.forEach((t) => t.stop());
      liveTweens.clear();
    }

    // Blueprint display
    const blueprintCanvas = document.createElement('canvas');
    blueprintCanvas.width = 512;
    blueprintCanvas.height = 320;
    const blueprintTex = new THREE.CanvasTexture(blueprintCanvas);
    blueprintTex.needsUpdate = true;
    const blueprintMat = new THREE.MeshBasicMaterial({ map: blueprintTex, transparent: true });
    const blueprintGeo = new THREE.PlaneGeometry(5, 3);

    // Answer display
    const ansCanvas = document.createElement('canvas');
    ansCanvas.width = 256;
    ansCanvas.height = 128;
    const ansTex = new THREE.CanvasTexture(ansCanvas);
    ansTex.needsUpdate = true;
    const ansMat = new THREE.MeshBasicMaterial({ map: ansTex, transparent: true });
    const ansGeo = roundedBox(2.2, 1.0, 0.15, 0.1, 2);
    const ansBgMat = new THREE.MeshStandardMaterial({ color: 0xf5eed8, roughness: 0.7, metalness: 0.02 });

    // ---- Scene graph ----
    const root = new THREE.Group();
    ctx.scene.add(root);

    const blueprint = new THREE.Mesh(blueprintGeo, blueprintMat);
    blueprint.position.set(0, 0.8, 0);
    root.add(blueprint);

    const ansBg = new THREE.Mesh(ansGeo, ansBgMat);
    ansBg.position.set(0, -1.2, 0.1);
    ansBg.castShadow = true;
    root.add(ansBg);

    const ansText = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 0.8), ansMat);
    ansText.position.set(0, -1.2, 0.2);
    root.add(ansText);

    // ---- State ----
    const first = quiz ? quiz.state().current : generator.next();
    const state = {
      problem: first as MultiStepProblem,
      answer: 0,
      streak: 0,
      answered: 0,
    };

    function getName(index: number): string {
      return ctx.locale === 'he' ? NAMES_HE[index % NAMES_HE.length] : NAMES_EN[index % NAMES_EN.length];
    }

    function getItem(index: number): string {
      return ctx.locale === 'he' ? ITEMS_HE[index % ITEMS_HE.length] : ITEMS_EN[index % ITEMS_EN.length];
    }

    function renderBlueprint(): void {
      const g = blueprintCanvas.getContext('2d');
      if (!g) return;
      g.clearRect(0, 0, 512, 320);

      // Background
      g.fillStyle = '#e8f4f8';
      g.beginPath();
      g.roundRect(10, 10, 492, 300, 12);
      g.fill();

      const name = getName(state.problem.storyIndex);
      const item = getItem(state.problem.storyIndex);

      g.fillStyle = '#2a1f14';
      g.font = '24px sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'top';

      if (ctx.locale === 'he') {
        const op1Text = state.problem.op1 === 'add'
          ? `${name} התחיל/ה עם ${state.problem.stepA} ${item} וקיבל/ה עוד ${state.problem.stepB}`
          : `${name} התחיל/ה עם ${state.problem.stepA} ${item} ונתן/ה ${state.problem.stepB} לחבר/ה`;
        const op2Text = state.problem.op2 === 'add'
          ? `ואז קיבל/ה עוד ${state.problem.stepB} ${item}`
          : `ואז נתן/ה ${state.problem.stepB} לחבר/ה אחר/ת`;

        g.fillText(op1Text, 256, 60);
        g.fillText(op2Text, 256, 120);
        g.font = 'bold 32px sans-serif';
        g.fillText('כמה יש בסוף?', 256, 200);
      } else {
        const op1Text = state.problem.op1 === 'add'
          ? `${name} started with ${state.problem.stepA} ${item} and received ${state.problem.stepB} more`
          : `${name} started with ${state.problem.stepA} ${item} and gave ${state.problem.stepB} to a friend`;
        const op2Text = state.problem.op2 === 'add'
          ? `then received ${state.problem.stepB} more`
          : `then gave ${state.problem.stepB} to another friend`;

        g.fillText(op1Text, 256, 60);
        g.fillText(op2Text, 256, 120);
        g.font = 'bold 32px sans-serif';
        g.fillText('How many at the end?', 256, 200);
      }

      blueprintTex.needsUpdate = true;
    }

    function renderAnswer(): void {
      const g = ansCanvas.getContext('2d');
      if (!g) return;
      g.clearRect(0, 0, 256, 128);
      g.fillStyle = '#2a1f14';
      g.font = 'bold 56px sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(String(state.answer), 128, 64);
      ansTex.needsUpdate = true;
    }

    function showPrompt(): void {
      ctx.prompt.set(ctx.t('wordProblemSteps.prompt'));
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
      renderAnswer();
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
      renderBlueprint();
      setAnswer(0);
      showPrompt();
      showStatus();
    }

    function onCorrect(): void {
      ctx.audio.play('success');
      const expected = (() => {
        let r = state.problem.stepA;
        if (state.problem.op1 === 'add') r += state.problem.stepB;
        else r -= state.problem.stepB;
        if (state.problem.op2 === 'add') r += state.problem.stepB;
        else r -= state.problem.stepB;
        return r;
      })();
      ctx.feedback.correct(ctx.t('wordProblemSteps.correct', { result: expected }));
      track(punch(root, 0.1));
      celebrate();
    }

    function onWrong(): void {
      ctx.audio.play('fail');
      ctx.feedback.wrong(ctx.t('wordProblemSteps.wrong'));
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

        blueprintTex.dispose();
        blueprintMat.dispose();
        blueprintGeo.dispose();
        ansTex.dispose();
        ansMat.dispose();
        ansGeo.dispose();
        ansBgMat.dispose();
      },
    };
  },
};
