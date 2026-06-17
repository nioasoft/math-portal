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
import { createRatioTableGenerator, type RatioTableProblem } from './problems';

// Theme: LABORATORY TABLE. A 4-column ratio table (A | B) with the base ratio
// in row 1 and a scaled ratio in row 2. One cell is missing ("?"). The child
// dials the missing value with −/+ buttons.

const QUIZ_LENGTH = 10;
const POINTS_PER_CORRECT = 10;
const ANSWER_STEP = 1;
const MAX_DIAL = 50;

export const ratioTableGame: Game3D = {
  meta: {
    id: 'ratio-table',
    i18nKey: 'games3d.ratioTable',
    topic: 'ratio',
    difficulty: 2,
    gradeRange: [4, 6],
    estimatedSeconds: 100,
    supportedModes: ['practice', 'quiz'],
  },
  init(ctx) {
    function reframe() {
      const { position, lookAt } = lockedCameraFrame(3.5, 0, ctx.camera.aspect);
      ctx.presets.camera.locked(position, lookAt);
    }
    reframe();

    const clayLook = applyClayLook(ctx, {
      topColor: '#e8f0e8',
      bottomColor: '#a8c8a8',
      ground: false,
      shadowArea: 10,
      fog: false,
    });

    const generator = createRatioTableGenerator();
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

    // Table display
    const tableCanvas = document.createElement('canvas');
    tableCanvas.width = 512;
    tableCanvas.height = 320;
    const tableTex = new THREE.CanvasTexture(tableCanvas);
    tableTex.needsUpdate = true;
    const tableMat = new THREE.MeshBasicMaterial({ map: tableTex, transparent: true });
    const tableGeo = new THREE.PlaneGeometry(5, 3);

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

    const table = new THREE.Mesh(tableGeo, tableMat);
    table.position.set(0, 0.8, 0);
    root.add(table);

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
      problem: first as RatioTableProblem,
      answer: 0,
      streak: 0,
      answered: 0,
    };

    function renderTable(): void {
      const g = tableCanvas.getContext('2d');
      if (!g) return;
      g.clearRect(0, 0, 512, 320);

      // Background
      g.fillStyle = '#f5eed8';
      g.beginPath();
      g.roundRect(10, 10, 492, 300, 12);
      g.fill();

      // Header
      g.fillStyle = '#2a1f14';
      g.font = 'bold 36px sans-serif';
      g.textAlign = 'center';
      g.fillText('A', 170, 55);
      g.fillText('B', 340, 55);

      // Divider line
      g.strokeStyle = '#8a7a6a';
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(256, 30);
      g.lineTo(256, 290);
      g.stroke();

      // Row 1 (base ratio)
      g.font = 'bold 48px sans-serif';
      g.fillText(String(state.problem.baseA), 170, 130);
      g.fillText(String(state.problem.baseB), 340, 130);

      // Row 2 (scaled ratio)
      const scaledA = state.problem.baseA * state.problem.multiplier;
      const scaledB = state.problem.baseB * state.problem.multiplier;

      const showA = state.problem.askFor !== 'scaledA';
      const showB = state.problem.askFor !== 'scaledB';
      const showMult = state.problem.askFor !== 'multiplier';

      if (showA) g.fillText(String(scaledA), 170, 230);
      if (showB) g.fillText(String(scaledB), 340, 230);

      // Show multiplier
      if (showMult) {
        g.fillStyle = '#6a5a4a';
        g.font = '32px sans-serif';
        g.fillText(`×${state.problem.multiplier}`, 256, 180);
      }

      // Highlight missing cell
      g.fillStyle = '#cc2222';
      g.font = 'bold 48px sans-serif';
      if (state.problem.askFor === 'scaledA') {
        g.fillText('?', 170, 230);
      } else if (state.problem.askFor === 'scaledB') {
        g.fillText('?', 340, 230);
      } else {
        g.fillStyle = '#6a5a4a';
        g.font = '32px sans-serif';
        g.fillText('×?', 256, 180);
      }

      tableTex.needsUpdate = true;
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
      ctx.prompt.set(ctx.t('ratioTable.prompt', {
        a: state.problem.baseA,
        b: state.problem.baseB,
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
      renderTable();
      setAnswer(0);
      showPrompt();
      showStatus();
    }

    function onCorrect(): void {
      ctx.audio.play('success');
      const expected = state.problem.askFor === 'multiplier'
        ? state.problem.multiplier
        : state.problem.askFor === 'scaledA'
          ? state.problem.baseA * state.problem.multiplier
          : state.problem.baseB * state.problem.multiplier;
      ctx.feedback.correct(ctx.t('ratioTable.correct', { value: expected }));
      track(punch(root, 0.1));
      celebrate();
    }

    function onWrong(): void {
      ctx.audio.play('fail');
      ctx.feedback.wrong(ctx.t('ratioTable.wrong'));
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

        tableTex.dispose();
        tableMat.dispose();
        tableGeo.dispose();
        ansTex.dispose();
        ansMat.dispose();
        ansGeo.dispose();
        ansBgMat.dispose();
      },
    };
  },
};
