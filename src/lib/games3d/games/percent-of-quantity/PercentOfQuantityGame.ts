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
  PALETTE_SERIES,
} from '@/lib/games3d/kit';
import { lockedCameraFrame } from '@/lib/games3d/kit/camera';
import {
  createPercentOfQuantityGenerator,
  type PercentOfQuantityProblem,
} from './problems';

// Theme: FACTORY LINE. A horizontal conveyor belt carries colored boxes. A large
// glowing sign above shows "X% of Y". The child dials the numeric answer with
// −/+ buttons. The belt animates subtly (boxes drift left) but is non-interactive
// — the answer is always a number entered via controls.

const QUIZ_LENGTH = 10;
const POINTS_PER_CORRECT = 10;
const ANSWER_STEP = 1;
const MAX_DIAL = 200;

// Belt geometry
const BELT_W = 7;
const BELT_H = 0.3;
const BELT_D = 1.6;
const BELT_Y = -1.2;

// Box geometry
const BOX_SIZE = 0.7;
const BOX_GAP = 1.1;
const BOX_COUNT = 6;

// Sign
const SIGN_W = 4.5;
const SIGN_H = 1.8;
const SIGN_Y = 1.6;

export const percentOfQuantityGame: Game3D = {
  meta: {
    id: 'percent-of-quantity',
    i18nKey: 'games3d.percentOfQuantity',
    topic: 'percentage',
    difficulty: 3,
    gradeRange: [5, 6],
    estimatedSeconds: 110,
    supportedModes: ['practice', 'quiz'],
  },
  init(ctx) {
    function reframe() {
      const { position, lookAt } = lockedCameraFrame(3.2, 0, ctx.camera.aspect);
      ctx.presets.camera.locked(position, lookAt);
    }
    reframe();

    const clayLook = applyClayLook(ctx, {
      topColor: '#4a3728',
      bottomColor: '#c4a882',
      ground: false,
      shadowArea: 10,
      fog: false,
    });

    const generator = createPercentOfQuantityGenerator();
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

    // ---- Shared resources ----
    const beltGeo = roundedBox(BELT_W, BELT_H, BELT_D, 0.06, 2);
    const beltMat = new THREE.MeshStandardMaterial({ color: 0x5a4a3a, roughness: 0.85, metalness: 0.05 });
    const boxGeo = roundedBox(BOX_SIZE, BOX_SIZE, BOX_SIZE, 0.08, 2);
    const boxMats = PALETTE_SERIES.slice(0, 4).map(
      (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.5, metalness: 0.08 })
    );

    // Sign background
    const signGeo = roundedBox(SIGN_W, SIGN_H, 0.2, 0.12, 3);
    const signMat = new THREE.MeshStandardMaterial({ color: 0x2a1f14, roughness: 0.6, metalness: 0.1 });

    // Sign text (canvas texture)
    const signTexSize = { w: 512, h: 200 };
    const signCanvas = document.createElement('canvas');
    signCanvas.width = signTexSize.w;
    signCanvas.height = signTexSize.h;
    const signTex = new THREE.CanvasTexture(signCanvas);
    signTex.needsUpdate = true;
    const signTextMat = new THREE.MeshBasicMaterial({ map: signTex, transparent: true });
    const signTextGeo = new THREE.PlaneGeometry(SIGN_W - 0.4, SIGN_H - 0.3);

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

    // Belt
    const belt = new THREE.Mesh(beltGeo, beltMat);
    belt.position.set(0, BELT_Y, 0);
    belt.castShadow = true;
    belt.receiveShadow = true;
    root.add(belt);

    // Boxes on belt
    const boxes: THREE.Mesh[] = [];
    const startX = -(BOX_COUNT - 1) * BOX_GAP / 2;
    for (let i = 0; i < BOX_COUNT; i++) {
      const box = new THREE.Mesh(boxGeo, boxMats[i % boxMats.length]);
      box.position.set(startX + i * BOX_GAP, BELT_Y + BELT_H / 2 + BOX_SIZE / 2, 0);
      box.castShadow = true;
      box.receiveShadow = true;
      root.add(box);
      boxes.push(box);
    }

    // Sign
    const sign = new THREE.Mesh(signGeo, signMat);
    sign.position.set(0, SIGN_Y, -0.2);
    sign.castShadow = true;
    root.add(sign);

    const signText = new THREE.Mesh(signTextGeo, signTextMat);
    signText.position.set(0, SIGN_Y, 0.01);
    root.add(signText);

    // Answer display
    const ansBg = new THREE.Mesh(ansGeo, ansBgMat);
    ansBg.position.set(0, -0.1, 0.1);
    ansBg.castShadow = true;
    root.add(ansBg);

    const ansText = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 0.8), ansMat);
    ansText.position.set(0, -0.1, 0.2);
    root.add(ansText);

    // ---- State ----
    const first = quiz ? quiz.state().current : generator.next();
    const state = {
      problem: first as PercentOfQuantityProblem,
      answer: 0,
      streak: 0,
      answered: 0,
    };

    function renderSign(): void {
      const g = signCanvas.getContext('2d');
      if (!g) return;
      g.clearRect(0, 0, signTexSize.w, signTexSize.h);
      g.fillStyle = '#f5d442';
      g.font = 'bold 72px sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(`${state.problem.percent}%  של  ${state.problem.total}`, signTexSize.w / 2, signTexSize.h / 2);
      signTex.needsUpdate = true;
    }

    function renderAnswer(): void {
      const g = ansCanvas.getContext('2d');
      if (!g) return;
      g.clearRect(0, 0, 256, 128);
      g.fillStyle = '#2a1f14';
      g.font = 'bold 64px sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(String(state.answer), 128, 64);
      ansTex.needsUpdate = true;
    }

    function showPrompt(): void {
      ctx.prompt.set(ctx.t('percentOfQuantity.prompt', {
        percent: state.problem.percent,
        total: state.problem.total,
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
      renderSign();
      setAnswer(0);
      showPrompt();
      showStatus();
    }

    function onCorrect(): void {
      ctx.audio.play('success');
      ctx.feedback.correct(ctx.t('percentOfQuantity.correct', {
        percent: state.problem.percent,
        total: state.problem.total,
        result: Math.round((state.problem.total * state.problem.percent) / 100),
      }));
      track(punch(root, 0.1));
      celebrate();
    }

    function onWrong(): void {
      ctx.audio.play('fail');
      ctx.feedback.wrong(ctx.t('percentOfQuantity.wrong'));
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

    // Subtle box floating animation
    const floatOffsets = boxes.map((_, i) => i * 1.2);

    return {
      onFrame(_dt, elapsed) {
        for (let i = 0; i < boxes.length; i++) {
          boxes[i].position.y = BELT_Y + BELT_H / 2 + BOX_SIZE / 2 + Math.sin(elapsed * 1.5 + floatOffsets[i]) * 0.04;
        }
      },
      onResize() { reframe(); },
      dispose() {
        stopAllTweens();
        ctx.controls.clear();
        ctx.prompt.clear();
        ctx.status.clear();
        clayLook.dispose();

        root.clear();
        ctx.scene.remove(root);

        beltGeo.dispose();
        beltMat.dispose();
        boxGeo.dispose();
        boxMats.forEach((m) => m.dispose());
        signGeo.dispose();
        signMat.dispose();
        signTex.dispose();
        signTextMat.dispose();
        signTextGeo.dispose();
        ansTex.dispose();
        ansMat.dispose();
        ansGeo.dispose();
        ansBgMat.dispose();
      },
    };
  },
};
