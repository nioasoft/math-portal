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
import { createRecipeGenerator, type RecipeProblem } from './problems';

// Theme: KITCHEN COUNTER. A recipe card sits on a wooden counter showing
// ingredient amounts for 2 servings. A target serving count (e.g., "Make 8!")
// is displayed on a sign. The child dials the scaled amount for one highlighted
// ingredient using −/+ buttons.

const QUIZ_LENGTH = 10;
const POINTS_PER_CORRECT = 10;
const ANSWER_STEP = 1;
const MAX_DIAL = 50;

// Counter
const COUNTER_W = 7;
const COUNTER_H = 0.3;
const COUNTER_D = 3;
const COUNTER_Y = -1.5;

// Recipe card
const CARD_W = 3.5;
const CARD_H = 2.5;
const CARD_Y = 0.5;

// Sign
const SIGN_W = 3;
const SIGN_H = 1.0;
const SIGN_Y = 2.2;

const INGREDIENT_COLORS = [PALETTE.sun, PALETTE.coral, PALETTE.mint, PALETTE.sky, PALETTE.grape] as const;

export const ratioRecipeGame: Game3D = {
  meta: {
    id: 'ratio-recipe',
    i18nKey: 'games3d.ratioRecipe',
    topic: 'ratio',
    difficulty: 3,
    gradeRange: [5, 6],
    estimatedSeconds: 120,
    supportedModes: ['practice', 'quiz'],
  },
  init(ctx) {
    function reframe() {
      const { position, lookAt } = lockedCameraFrame(3.8, 0.3, ctx.camera.aspect);
      ctx.presets.camera.locked(position, lookAt);
    }
    reframe();

    const clayLook = applyClayLook(ctx, {
      topColor: '#f5e6d0',
      bottomColor: '#d4a574',
      ground: false,
      shadowArea: 10,
      fog: false,
    });

    const generator = createRecipeGenerator();
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
    const counterGeo = roundedBox(COUNTER_W, COUNTER_H, COUNTER_D, 0.08, 2);
    const counterMat = new THREE.MeshStandardMaterial({ color: 0x8a6a4a, roughness: 0.85, metalness: 0.03 });
    const cardGeo = roundedBox(CARD_W, CARD_H, 0.12, 0.1, 2);
    const cardMat = new THREE.MeshStandardMaterial({ color: 0xf5eed8, roughness: 0.7, metalness: 0.02 });

    // Sign
    const signGeo = roundedBox(SIGN_W, SIGN_H, 0.15, 0.08, 2);
    const signMat = new THREE.MeshStandardMaterial({ color: 0xcc4444, roughness: 0.6, metalness: 0.1 });
    const signCanvas = document.createElement('canvas');
    signCanvas.width = 384;
    signCanvas.height = 128;
    const signTex = new THREE.CanvasTexture(signCanvas);
    signTex.needsUpdate = true;
    const signTextMat = new THREE.MeshBasicMaterial({ map: signTex, transparent: true });
    const signTextGeo = new THREE.PlaneGeometry(SIGN_W - 0.3, SIGN_H - 0.2);

    // Recipe text canvas
    const recipeCanvas = document.createElement('canvas');
    recipeCanvas.width = 400;
    recipeCanvas.height = 300;
    const recipeTex = new THREE.CanvasTexture(recipeCanvas);
    recipeTex.needsUpdate = true;
    const recipeMat = new THREE.MeshBasicMaterial({ map: recipeTex, transparent: true });
    const recipeTextGeo = new THREE.PlaneGeometry(CARD_W - 0.4, CARD_H - 0.3);

    // Answer display
    const ansCanvas = document.createElement('canvas');
    ansCanvas.width = 256;
    ansCanvas.height = 128;
    const ansTex = new THREE.CanvasTexture(ansCanvas);
    ansTex.needsUpdate = true;
    const ansMat = new THREE.MeshBasicMaterial({ map: ansTex, transparent: true });
    const ansGeo = roundedBox(2.2, 1.0, 0.15, 0.1, 2);
    const ansBgMat = new THREE.MeshStandardMaterial({ color: 0xf5eed8, roughness: 0.7, metalness: 0.02 });

    // Ingredient jars
    const jarGeo = roundedBox(0.5, 0.8, 0.5, 0.06, 2);
    const jarMats = INGREDIENT_COLORS.map(
      (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.5, metalness: 0.08 })
    );

    // ---- Scene graph ----
    const root = new THREE.Group();
    ctx.scene.add(root);

    // Counter
    const counter = new THREE.Mesh(counterGeo, counterMat);
    counter.position.set(0, COUNTER_Y, 0);
    counter.castShadow = true;
    counter.receiveShadow = true;
    root.add(counter);

    // Recipe card
    const card = new THREE.Mesh(cardGeo, cardMat);
    card.position.set(-1.5, CARD_Y, 0);
    card.castShadow = true;
    root.add(card);

    const recipeText = new THREE.Mesh(recipeTextGeo, recipeMat);
    recipeText.position.set(-1.5, CARD_Y, 0.1);
    root.add(recipeText);

    // Sign
    const sign = new THREE.Mesh(signGeo, signMat);
    sign.position.set(1.5, SIGN_Y, -0.2);
    sign.castShadow = true;
    root.add(sign);

    const signText = new THREE.Mesh(signTextGeo, signTextMat);
    signText.position.set(1.5, SIGN_Y, 0.01);
    root.add(signText);

    // Answer display
    const ansBg = new THREE.Mesh(ansGeo, ansBgMat);
    ansBg.position.set(1.5, 0.3, 0.1);
    ansBg.castShadow = true;
    root.add(ansBg);

    const ansText = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 0.8), ansMat);
    ansText.position.set(1.5, 0.3, 0.2);
    root.add(ansText);

    // Ingredient jars (decorative)
    const jars: THREE.Mesh[] = [];
    for (let i = 0; i < 5; i++) {
      const jar = new THREE.Mesh(jarGeo, jarMats[i]);
      jar.position.set(-3.5 + i * 0.8, COUNTER_Y + COUNTER_H / 2 + 0.4, 1.0);
      jar.castShadow = true;
      root.add(jar);
      jars.push(jar);
    }

    // ---- State ----
    const first = quiz ? quiz.state().current : generator.next();
    const state = {
      problem: first as RecipeProblem,
      answer: 0,
      streak: 0,
      answered: 0,
    };

    const INGREDIENT_NAMES_HE = ['קמח', 'סוכר', 'חמאה', 'ביצים', 'חלב'];
    const INGREDIENT_NAMES_EN = ['Flour', 'Sugar', 'Butter', 'Eggs', 'Milk'];

    function getIngredientName(index: number): string {
      if (ctx.locale === 'he') return INGREDIENT_NAMES_HE[index % INGREDIENT_NAMES_HE.length];
      return INGREDIENT_NAMES_EN[index % INGREDIENT_NAMES_EN.length];
    }

    function renderRecipe(): void {
      const g = recipeCanvas.getContext('2d');
      if (!g) return;
      g.clearRect(0, 0, 400, 300);
      g.fillStyle = '#2a1f14';
      g.font = 'bold 28px sans-serif';
      g.textAlign = 'center';
      g.fillText(ctx.locale === 'he' ? `מתכון ל-${state.problem.baseServings} מנות` : `Recipe for ${state.problem.baseServings} servings`, 200, 35);

      g.font = '24px sans-serif';
      g.textAlign = 'right';
      const isRTL = ctx.isRTL;
      const xBase = isRTL ? 350 : 300;
      for (let i = 0; i < 5; i++) {
        const name = getIngredientName(i);
        const amount = state.problem.baseAmount + i;
        const y = 80 + i * 40;
        g.fillStyle = i === 0 ? '#cc2222' : '#2a1f14';
        g.font = i === 0 ? 'bold 24px sans-serif' : '24px sans-serif';
        if (isRTL) {
          g.textAlign = 'right';
          g.fillText(`${amount} — ${name}`, xBase, y);
        } else {
          g.textAlign = 'left';
          g.fillText(`${name}: ${amount}`, 50, y);
        }
      }
      recipeTex.needsUpdate = true;
    }

    function renderSign(): void {
      const g = signCanvas.getContext('2d');
      if (!g) return;
      g.clearRect(0, 0, 384, 128);
      g.fillStyle = '#ffffff';
      g.font = 'bold 48px sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      const text = ctx.locale === 'he'
        ? `${state.problem.targetServings} מנות!`
        : `${state.problem.targetServings} servings!`;
      g.fillText(text, 192, 64);
      signTex.needsUpdate = true;
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
      ctx.prompt.set(ctx.t('ratioRecipe.prompt', {
        servings: state.problem.targetServings,
        ingredient: getIngredientName(0),
        baseAmount: state.problem.baseAmount,
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
      renderRecipe();
      renderSign();
      setAnswer(0);
      showPrompt();
      showStatus();
    }

    function onCorrect(): void {
      ctx.audio.play('success');
      const expected = state.problem.baseAmount * (state.problem.targetServings / state.problem.baseServings);
      ctx.feedback.correct(ctx.t('ratioRecipe.correct', {
        ingredient: getIngredientName(0),
        amount: expected,
      }));
      track(punch(root, 0.1));
      celebrate();
    }

    function onWrong(): void {
      ctx.audio.play('fail');
      ctx.feedback.wrong(ctx.t('ratioRecipe.wrong'));
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

    // Subtle jar floating
    const floatOffsets = jars.map((_, i) => i * 1.5);

    return {
      onFrame(_dt, elapsed) {
        for (let i = 0; i < jars.length; i++) {
          jars[i].position.y = COUNTER_Y + COUNTER_H / 2 + 0.4 + Math.sin(elapsed * 1.2 + floatOffsets[i]) * 0.03;
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

        counterGeo.dispose();
        counterMat.dispose();
        cardGeo.dispose();
        cardMat.dispose();
        signGeo.dispose();
        signMat.dispose();
        signTex.dispose();
        signTextMat.dispose();
        signTextGeo.dispose();
        recipeTex.dispose();
        recipeMat.dispose();
        recipeTextGeo.dispose();
        ansTex.dispose();
        ansMat.dispose();
        ansGeo.dispose();
        ansBgMat.dispose();
        jarGeo.dispose();
        jarMats.forEach((m) => m.dispose());
      },
    };
  },
};
