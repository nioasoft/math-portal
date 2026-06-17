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
  createDecimalLineGenerator,
  formatDecimal,
  type DecimalLineProblem,
} from './problems';

const QUIZ_LENGTH = 10;
const POINTS_PER_CORRECT = 10;

// Track geometry
const TRACK_W = 8;
const TRACK_H = 0.15;
const TRACK_D = 0.3;
const TRACK_Y = -0.5;

// Marker (train engine)
const MARKER_W = 0.4;
const MARKER_H = 0.6;
const MARKER_D = 0.4;

// Labels
const LABEL_Y = TRACK_Y - 0.8;

export const decimalNumberLineGame: Game3D = {
  meta: {
    id: 'decimal-number-line',
    i18nKey: 'games3d.decimalNumberLine',
    topic: 'decimals',
    difficulty: 2,
    gradeRange: [3, 5],
    estimatedSeconds: 100,
    supportedModes: ['practice', 'quiz'],
  },
  init(ctx) {
    function reframe() {
      const { position, lookAt } = lockedCameraFrame(4.5, 0, ctx.camera.aspect);
      ctx.presets.camera.locked(position, lookAt);
    }
    reframe();

    const clayLook = applyClayLook(ctx, {
      topColor: '#87CEEB',
      bottomColor: '#90EE90',
      ground: false,
      shadowArea: 12,
      fog: false,
    });

    const generator = createDecimalLineGenerator();
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
    const trackGeo = roundedBox(TRACK_W, TRACK_H, TRACK_D, 0.04, 2);
    const trackMat = new THREE.MeshStandardMaterial({ color: 0x8a7a6a, roughness: 0.8, metalness: 0.05 });
    const markerGeo = roundedBox(MARKER_W, MARKER_H, MARKER_D, 0.08, 2);
    const markerMat = new THREE.MeshStandardMaterial({ color: PALETTE.coral, roughness: 0.5, metalness: 0.1 });

    // Tick marks
    const majorTickGeo = new THREE.BoxGeometry(0.04, 0.5, 0.08);
    const minorTickGeo = new THREE.BoxGeometry(0.03, 0.3, 0.06);
    const tickMat = new THREE.MeshStandardMaterial({ color: 0x4a3a2a, roughness: 0.7, metalness: 0.1 });

    // Labels (0.0, 0.1, 0.2, ..., 1.0)
    const labelGeo = new THREE.PlaneGeometry(0.8, 0.5);
    const labelTextures: THREE.CanvasTexture[] = [];
    const labelMats: THREE.MeshBasicMaterial[] = [];

    // ---- Scene graph ----
    const root = new THREE.Group();
    ctx.scene.add(root);

    // Track
    const trackMesh = new THREE.Mesh(trackGeo, trackMat);
    trackMesh.position.set(0, TRACK_Y, 0);
    trackMesh.castShadow = true;
    trackMesh.receiveShadow = true;
    root.add(trackMesh);

    // Ticks and labels
    const halfW = TRACK_W / 2;
    for (let i = 0; i <= 10; i++) {
      const x = -halfW + (i / 10) * TRACK_W;
      const isMajor = true;
      const tick = new THREE.Mesh(isMajor ? majorTickGeo : minorTickGeo, tickMat);
      tick.position.set(x, TRACK_Y + (isMajor ? 0.25 : 0.15), 0);
      tick.castShadow = true;
      root.add(tick);

      // Label
      const tex = makeLabelTexture(i / 10);
      labelTextures.push(tex);
      const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
      labelMats.push(mat);
      const label = new THREE.Mesh(labelGeo, mat);
      label.position.set(x, LABEL_Y, 0.05);
      root.add(label);
    }

    // Minor ticks (0.05, 0.15, 0.25, ..., 0.95)
    for (let i = 0; i < 10; i++) {
      const x = -halfW + ((i + 0.5) / 10) * TRACK_W;
      const tick = new THREE.Mesh(minorTickGeo, tickMat);
      tick.position.set(x, TRACK_Y + 0.15, 0);
      tick.castShadow = true;
      root.add(tick);
    }

    // Marker
    const marker = new THREE.Mesh(markerGeo, markerMat);
    marker.position.set(-halfW, TRACK_Y + MARKER_H / 2 + TRACK_H / 2, 0);
    marker.castShadow = true;
    root.add(marker);

    // ---- State ----
    const first = quiz ? quiz.state().current : generator.next();
    const state = {
      problem: first as DecimalLineProblem,
      answerHundredths: 0,
      streak: 0,
      answered: 0,
    };

    function setMarkerPosition(hundredths: number): void {
      const x = -halfW + (hundredths / 100) * TRACK_W;
      marker.position.x = x;
      state.answerHundredths = Math.round(hundredths);
    }

    function ndcToHundredths(ndcX: number): number {
      const t = (ndcX + 1) / 2; // 0..1
      return Math.max(0, Math.min(100, Math.round(t * 100)));
    }

    function showPrompt(): void {
      ctx.prompt.set(ctx.t('decimalNumberLine.prompt', {
        decimal: formatDecimal(state.problem.targetHundredths),
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
          id: 'check',
          label: ctx.t('controls.check'),
          variant: 'confirm',
          onPress: confirm,
        },
      ];
      ctx.controls.set(buttons);
    }

    function startNewProblem(): void {
      setMarkerPosition(0);
      showPrompt();
      showStatus();
    }

    function onCorrect(): void {
      ctx.audio.play('success');
      ctx.feedback.correct(ctx.t('decimalNumberLine.correct', {
        decimal: formatDecimal(state.problem.targetHundredths),
      }));
      track(punch(root, 0.1));
      celebrate();
    }

    function onWrong(): void {
      ctx.audio.play('fail');
      ctx.feedback.wrong(ctx.t('decimalNumberLine.wrong'));
      track(shake(root, 0.05, 280));
    }

    function confirm(): void {
      const ok = generator.check(state.problem, state.answerHundredths);

      if (quiz) {
        if (ok) {
          state.streak += 1;
          onCorrect();
        } else {
          state.streak = 0;
          onWrong();
        }
        quiz.submit(state.answerHundredths);
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

    // Drag input
    const offDrag = ctx.input.on('drag', (p) => {
      const hundredths = ndcToHundredths(p.x);
      setMarkerPosition(hundredths);
    });

    // Initial render
    setMarkerPosition(0);
    track(popIn(root, { scale: 1 }));
    setControls();
    startNewProblem();

    return {
      onResize() { reframe(); },
      dispose() {
        offDrag();
        stopAllTweens();
        ctx.controls.clear();
        ctx.prompt.clear();
        ctx.status.clear();
        clayLook.dispose();

        root.clear();
        ctx.scene.remove(root);

        trackGeo.dispose();
        trackMat.dispose();
        markerGeo.dispose();
        markerMat.dispose();
        majorTickGeo.dispose();
        minorTickGeo.dispose();
        tickMat.dispose();
        labelGeo.dispose();
        labelTextures.forEach((t) => t.dispose());
        labelMats.forEach((m) => m.dispose());
      },
    };
  },
};

function makeLabelTexture(value: number): THREE.CanvasTexture {
  const w = 128;
  const h = 80;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const g = canvas.getContext('2d');
  if (g) {
    g.clearRect(0, 0, w, h);
    g.fillStyle = '#2a1f14';
    g.font = 'bold 36px sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(value.toFixed(1), w / 2, h / 2);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}
