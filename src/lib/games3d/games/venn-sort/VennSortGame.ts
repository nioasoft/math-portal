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
import { createVennGenerator, type VennProblem, type VennRegion } from './problems';

// Theme: SORTING TABLE. Two overlapping circles (Venn diagram) with properties
// displayed above each (e.g., "÷3" and "÷5"). A number appears at the top.
// The player taps one of four buttons: Left only, Right only, Both, Neither.

const QUIZ_LENGTH = 10;
const POINTS_PER_CORRECT = 10;

const REGION_LABELS_HE = ['אף אחד', 'שמאל בלבד', 'ימין בלבד', 'שניהם'];
const REGION_LABELS_EN = ['Neither', 'Left only', 'Right only', 'Both'];

export const vennSortGame: Game3D = {
  meta: {
    id: 'venn-sort',
    i18nKey: 'games3d.vennSort',
    topic: 'misc',
    difficulty: 3,
    gradeRange: [4, 6],
    estimatedSeconds: 110,
    supportedModes: ['practice', 'quiz'],
  },
  init(ctx) {
    function reframe() {
      const { position, lookAt } = lockedCameraFrame(4, 0, ctx.camera.aspect);
      ctx.presets.camera.locked(position, lookAt);
    }
    reframe();

    const clayLook = applyClayLook(ctx, {
      topColor: '#e8e0f0',
      bottomColor: '#c8b8d8',
      ground: false,
      shadowArea: 10,
      fog: false,
    });

    const generator = createVennGenerator();
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

    // Venn display
    const vennCanvas = document.createElement('canvas');
    vennCanvas.width = 512;
    vennCanvas.height = 400;
    const vennTex = new THREE.CanvasTexture(vennCanvas);
    vennTex.needsUpdate = true;
    const vennMat = new THREE.MeshBasicMaterial({ map: vennTex, transparent: true });
    const vennGeo = new THREE.PlaneGeometry(5, 4);

    // Number display
    const numCanvas = document.createElement('canvas');
    numCanvas.width = 256;
    numCanvas.height = 200;
    const numTex = new THREE.CanvasTexture(numCanvas);
    numTex.needsUpdate = true;
    const numMat = new THREE.MeshBasicMaterial({ map: numTex, transparent: true });
    const numGeo = roundedBox(2, 1.5, 0.15, 0.1, 2);
    const numBgMat = new THREE.MeshStandardMaterial({ color: 0xf5eed8, roughness: 0.7, metalness: 0.02 });

    // ---- Scene graph ----
    const root = new THREE.Group();
    ctx.scene.add(root);

    const numBg = new THREE.Mesh(numGeo, numBgMat);
    numBg.position.set(0, 2, 0.1);
    numBg.castShadow = true;
    root.add(numBg);

    const numText = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.3), numMat);
    numText.position.set(0, 2, 0.2);
    root.add(numText);

    const venn = new THREE.Mesh(vennGeo, vennMat);
    venn.position.set(0, -0.5, 0);
    root.add(venn);

    // ---- State ----
    const first = quiz ? quiz.state().current : generator.next();
    const state = {
      problem: first as VennProblem,
      streak: 0,
      answered: 0,
    };

    function renderNumber(): void {
      const g = numCanvas.getContext('2d');
      if (!g) return;
      g.clearRect(0, 0, 256, 200);
      g.fillStyle = '#2a1f14';
      g.font = 'bold 96px sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(String(state.problem.value), 128, 100);
      numTex.needsUpdate = true;
    }

    function renderVenn(): void {
      const g = vennCanvas.getContext('2d');
      if (!g) return;
      g.clearRect(0, 0, 512, 400);

      // Left circle
      g.strokeStyle = '#cc4444';
      g.lineWidth = 3;
      g.beginPath();
      g.arc(200, 200, 120, 0, Math.PI * 2);
      g.stroke();

      // Right circle
      g.strokeStyle = '#4488cc';
      g.beginPath();
      g.arc(312, 200, 120, 0, Math.PI * 2);
      g.stroke();

      // Labels
      g.fillStyle = '#cc4444';
      g.font = 'bold 36px sans-serif';
      g.textAlign = 'center';
      g.fillText(`÷${state.problem.divisorA}`, 160, 100);

      g.fillStyle = '#4488cc';
      g.fillText(`÷${state.problem.divisorB}`, 352, 100);

      vennTex.needsUpdate = true;
    }

    function showPrompt(): void {
      ctx.prompt.set(ctx.t('vennSort.prompt', {
        value: state.problem.value,
        a: state.problem.divisorA,
        b: state.problem.divisorB,
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

    function getRegionLabel(region: VennRegion): string {
      return ctx.locale === 'he' ? REGION_LABELS_HE[region] : REGION_LABELS_EN[region];
    }

    function setControls(): void {
      const buttons: ControlButton[] = [
        {
          id: 'neither',
          label: getRegionLabel(0),
          onPress: () => submitAnswer(0),
        },
        {
          id: 'left-only',
          label: getRegionLabel(1),
          onPress: () => submitAnswer(1),
        },
        {
          id: 'right-only',
          label: getRegionLabel(2),
          onPress: () => submitAnswer(2),
        },
        {
          id: 'both',
          label: getRegionLabel(3),
          variant: 'confirm',
          onPress: () => submitAnswer(3),
        },
      ];
      ctx.controls.set(buttons);
    }

    function startNewProblem(): void {
      renderNumber();
      renderVenn();
      showPrompt();
      showStatus();
    }

    function onCorrect(): void {
      ctx.audio.play('success');
      ctx.feedback.correct(ctx.t('vennSort.correct', { value: state.problem.value }));
      track(punch(root, 0.1));
      celebrate();
    }

    function onWrong(): void {
      ctx.audio.play('fail');
      ctx.feedback.wrong(ctx.t('vennSort.wrong'));
      track(shake(root, 0.05, 280));
    }

    function submitAnswer(region: VennRegion): void {
      const ok = generator.check(state.problem, region);

      if (quiz) {
        if (ok) {
          state.streak += 1;
          onCorrect();
        } else {
          state.streak = 0;
          onWrong();
        }
        quiz.submit(region);
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

        vennTex.dispose();
        vennMat.dispose();
        vennGeo.dispose();
        numTex.dispose();
        numMat.dispose();
        numGeo.dispose();
        numBgMat.dispose();
      },
    };
  },
};
