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
  createPercentDiscountGenerator,
  type PercentDiscountProblem,
} from './problems';

// Theme: SHOP SHELF. Three product boxes sit on a shelf. A "SALE −X%" banner
// hangs above. The child dials the sale price with −/+ buttons. The original
// price is shown on a price tag attached to each product.

const QUIZ_LENGTH = 10;
const POINTS_PER_CORRECT = 10;
const ANSWER_STEP = 1;
const MAX_DIAL = 300;

// Shelf geometry
const SHELF_W = 6;
const SHELF_H = 0.25;
const SHELF_D = 1.4;
const SHELF_Y = -0.8;

// Product boxes
const BOX_W = 1.2;
const BOX_H = 1.6;
const BOX_D = 0.9;
const BOX_GAP = 1.8;

// Banner
const BANNER_W = 5;
const BANNER_H = 1.2;
const BANNER_Y = 1.8;

// Price tag
const TAG_W = 1.0;
const TAG_H = 0.6;

const PRODUCT_COLORS = [PALETTE.coral, PALETTE.sky, PALETTE.mint] as const;

export const percentDiscountGame: Game3D = {
  meta: {
    id: 'percent-discount',
    i18nKey: 'games3d.percentDiscount',
    topic: 'percentage',
    difficulty: 4,
    gradeRange: [5, 6],
    estimatedSeconds: 120,
    supportedModes: ['practice', 'quiz'],
  },
  init(ctx) {
    function reframe() {
      const { position, lookAt } = lockedCameraFrame(3.5, 0.2, ctx.camera.aspect);
      ctx.presets.camera.locked(position, lookAt);
    }
    reframe();

    const clayLook = applyClayLook(ctx, {
      topColor: '#5a3d2b',
      bottomColor: '#d4b896',
      ground: false,
      shadowArea: 10,
      fog: false,
    });

    const generator = createPercentDiscountGenerator();
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
    const shelfGeo = roundedBox(SHELF_W, SHELF_H, SHELF_D, 0.06, 2);
    const shelfMat = new THREE.MeshStandardMaterial({ color: 0x8a6a4a, roughness: 0.85, metalness: 0.03 });
    const boxGeo = roundedBox(BOX_W, BOX_H, BOX_D, 0.1, 2);
    const boxMats = PRODUCT_COLORS.map(
      (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.5, metalness: 0.08 })
    );

    // Banner
    const bannerGeo = roundedBox(BANNER_W, BANNER_H, 0.15, 0.08, 2);
    const bannerMat = new THREE.MeshStandardMaterial({ color: 0xcc2222, roughness: 0.6, metalness: 0.1 });
    const bannerCanvas = document.createElement('canvas');
    bannerCanvas.width = 512;
    bannerCanvas.height = 128;
    const bannerTex = new THREE.CanvasTexture(bannerCanvas);
    bannerTex.needsUpdate = true;
    const bannerTextMat = new THREE.MeshBasicMaterial({ map: bannerTex, transparent: true });
    const bannerTextGeo = new THREE.PlaneGeometry(BANNER_W - 0.4, BANNER_H - 0.2);

    // Price tags
    const tagGeo = new THREE.PlaneGeometry(TAG_W, TAG_H);
    const tagCanvases: HTMLCanvasElement[] = [];
    const tagTextures: THREE.CanvasTexture[] = [];
    const tagMats: THREE.MeshBasicMaterial[] = [];

    // Answer display
    const ansCanvas = document.createElement('canvas');
    ansCanvas.width = 256;
    ansCanvas.height = 128;
    const ansTex = new THREE.CanvasTexture(ansCanvas);
    ansTex.needsUpdate = true;
    const ansMat = new THREE.MeshBasicMaterial({ map: ansTex, transparent: true });
    const ansGeo = roundedBox(2.4, 1.0, 0.15, 0.1, 2);
    const ansBgMat = new THREE.MeshStandardMaterial({ color: 0xf5eed8, roughness: 0.7, metalness: 0.02 });

    // ---- Scene graph ----
    const root = new THREE.Group();
    ctx.scene.add(root);

    // Shelf
    const shelf = new THREE.Mesh(shelfGeo, shelfMat);
    shelf.position.set(0, SHELF_Y, 0);
    shelf.castShadow = true;
    shelf.receiveShadow = true;
    root.add(shelf);

    // Products on shelf
    const boxes: THREE.Mesh[] = [];
    for (let i = 0; i < 3; i++) {
      const box = new THREE.Mesh(boxGeo, boxMats[i]);
      const x = (i - 1) * BOX_GAP;
      box.position.set(x, SHELF_Y + SHELF_H / 2 + BOX_H / 2, 0);
      box.castShadow = true;
      box.receiveShadow = true;
      root.add(box);
      boxes.push(box);

      // Price tag
      const tagCanvas = document.createElement('canvas');
      tagCanvas.width = 128;
      tagCanvas.height = 80;
      tagCanvases.push(tagCanvas);
      const tagTex = new THREE.CanvasTexture(tagCanvas);
      tagTex.needsUpdate = true;
      tagTextures.push(tagTex);
      const tagMat = new THREE.MeshBasicMaterial({ map: tagTex, transparent: true });
      tagMats.push(tagMat);
      const tag = new THREE.Mesh(tagGeo, tagMat);
      tag.position.set(x, SHELF_Y + SHELF_H / 2 + BOX_H + 0.4, 0.1);
      root.add(tag);
    }

    // Banner
    const banner = new THREE.Mesh(bannerGeo, bannerMat);
    banner.position.set(0, BANNER_Y, -0.2);
    banner.castShadow = true;
    root.add(banner);

    const bannerText = new THREE.Mesh(bannerTextGeo, bannerTextMat);
    bannerText.position.set(0, BANNER_Y, 0.01);
    root.add(bannerText);

    // Answer display
    const ansBg = new THREE.Mesh(ansGeo, ansBgMat);
    ansBg.position.set(0, -2.0, 0.1);
    ansBg.castShadow = true;
    root.add(ansBg);

    const ansText = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.8), ansMat);
    ansText.position.set(0, -2.0, 0.2);
    root.add(ansText);

    // ---- State ----
    const first = quiz ? quiz.state().current : generator.next();
    const state = {
      problem: first as PercentDiscountProblem,
      answer: 0,
      streak: 0,
      answered: 0,
    };

    function renderBanner(): void {
      const g = bannerCanvas.getContext('2d');
      if (!g) return;
      g.clearRect(0, 0, 512, 128);
      g.fillStyle = '#ffffff';
      g.font = 'bold 56px sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(`SALE  −${state.problem.discount}%`, 256, 64);
      bannerTex.needsUpdate = true;
    }

    function renderPriceTags(): void {
      for (let i = 0; i < 3; i++) {
        const g = tagCanvases[i].getContext('2d');
        if (!g) continue;
        g.clearRect(0, 0, 128, 80);
        g.fillStyle = '#f5eed8';
        g.beginPath();
        g.roundRect(4, 4, 120, 72, 8);
        g.fill();
        g.fillStyle = '#2a1f14';
        g.font = 'bold 32px sans-serif';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText(`₪${state.problem.original}`, 64, 40);
        tagTextures[i].needsUpdate = true;
      }
    }

    function renderAnswer(): void {
      const g = ansCanvas.getContext('2d');
      if (!g) return;
      g.clearRect(0, 0, 256, 128);
      g.fillStyle = '#2a1f14';
      g.font = 'bold 56px sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(`₪${state.answer}`, 128, 64);
      ansTex.needsUpdate = true;
    }

    function showPrompt(): void {
      ctx.prompt.set(ctx.t('percentDiscount.prompt', {
        discount: state.problem.discount,
        original: state.problem.original,
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
      renderBanner();
      renderPriceTags();
      setAnswer(0);
      showPrompt();
      showStatus();
    }

    function onCorrect(): void {
      ctx.audio.play('success');
      const salePrice = state.problem.original - Math.round((state.problem.original * state.problem.discount) / 100);
      ctx.feedback.correct(ctx.t('percentDiscount.correct', {
        original: state.problem.original,
        discount: state.problem.discount,
        salePrice,
      }));
      track(punch(root, 0.1));
      celebrate();
    }

    function onWrong(): void {
      ctx.audio.play('fail');
      ctx.feedback.wrong(ctx.t('percentDiscount.wrong'));
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

        shelfGeo.dispose();
        shelfMat.dispose();
        boxGeo.dispose();
        boxMats.forEach((m) => m.dispose());
        bannerGeo.dispose();
        bannerMat.dispose();
        bannerTex.dispose();
        bannerTextMat.dispose();
        bannerTextGeo.dispose();
        tagGeo.dispose();
        tagTextures.forEach((t) => t.dispose());
        tagMats.forEach((m) => m.dispose());
        ansTex.dispose();
        ansMat.dispose();
        ansGeo.dispose();
        ansBgMat.dispose();
      },
    };
  },
};
