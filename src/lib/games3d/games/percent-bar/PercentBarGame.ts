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
import { createPercentBarGenerator, PERCENT_STEP, type PercentTarget } from './problems';

// Theme: a STADIUM STAND. A tall vertical bar in the XY plane (facing the locked
// front camera) represents 0–100%. It is built from 20 horizontal SEAT-ROW tiers
// (one per 5%); the bottom tiers "fill with fans" — a saturated fan color rises
// from the bottom — as the percent grows, while empty rows stay a dark muted
// seat tone. A side SCALE with 0/25/50/75/100 marks (dark digits on light plates
// — never faint light-on-light) gives a reference. The child fills the stand to a
// target T% (a multiple of 5) with אחוז −/+ (±5%) OR by dragging UP (more fill),
// then בדוק to check. The prompt shows ONLY the target percent.
//
// Drag is NATURAL: dragging UP (NDC +y) raises the fill; the locked camera looks
// straight down −Z with no roll, so NDC-y maps monotonically to world-y / fill.

const QUIZ_LENGTH = 10;
const POINTS_PER_CORRECT = 10;

// Each tier is one PERCENT_STEP (5%); 100/5 = 20 rows make the full stand.
const TIER_COUNT = 100 / PERCENT_STEP; // 20
const TIER_PERCENT = PERCENT_STEP; // 5% per tier

// Stand geometry (XY plane, facing the camera at +Z).
const STAND_WIDTH = 4.6;
const TIER_GAP = 0.08; // a small gap so individual seat rows read
const TIER_HEIGHT = 0.42; // height of one seat-row tier
const TIER_DEPTH = 0.8;
const TIER_PITCH = TIER_HEIGHT + TIER_GAP;
const STAND_TOTAL_HEIGHT = TIER_COUNT * TIER_PITCH - TIER_GAP;
const STAND_BOTTOM_Y = -STAND_TOTAL_HEIGHT / 2; // center the stand on the origin
const STAND_Z = 0;

// Scale (the reference ruler) sits to the LEFT of the stand.
const SCALE_X = -STAND_WIDTH / 2 - 1.35;
const SCALE_MARKS = [0, 25, 50, 75, 100] as const;
const LABEL_W = 1.5;
const LABEL_H = 0.78;
const LABEL_Z = STAND_Z + 0.05;

// Palette: deep muted "empty seat" tone vs. a vivid saturated fan color that
// fills from the bottom. A warm frame/base anchors the stand. High contrast.
const EMPTY_SEAT_COLOR = 0x33405a; // dark slate — clearly "empty seats"
const FAN_COLORS = [PALETTE.coral, PALETTE.sun] as const; // alternating fan rows
const BASE_COLOR = 0x5a3d2b; // warm pitch-side base under the stand
const POST_COLOR = 0x3a4a66; // scale post (dark, behind the light plates)

export const percentBarGame: Game3D = {
  meta: {
    id: 'percent-bar',
    i18nKey: 'games3d.percentBar',
    topic: 'percentage',
    difficulty: 3,
    gradeRange: [5, 6],
    estimatedSeconds: 110,
    supportedModes: ['practice', 'quiz'],
  },
  init(ctx) {
    // The stand faces the viewer: lock the camera in front of the XY plane so
    // "up" on screen is +Y (more fill) and the stand reads vertically. Distance
    // sized to fit the stand's height (~9 units) with margin under a 60° FOV.
    ctx.presets.camera.locked(new THREE.Vector3(0, 0, 12.5), new THREE.Vector3(0, 0, 0));

    // Stadium-evening ambience. No ground plane — the stand floats centered on the
    // origin and would otherwise dip below y=0 into the clay floor; the engine
    // still casts the soft shadow.
    const clayLook = applyClayLook(ctx, {
      topColor: '#2e3c63',
      bottomColor: '#7fa6d8',
      ground: false,
      shadowArea: 9,
      fog: false,
    });

    const generator = createPercentBarGenerator();
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

    // ---- Shared, reused resources (one geometry + material per KIND) ----
    // ONE tier geometry reused for all 20 rows; per-row color comes from one of
    // three shared materials (empty + two alternating fan tones) — no per-update
    // allocation. We recolor by swapping which shared material a mesh references.
    const tierGeo = roundedBox(STAND_WIDTH, TIER_HEIGHT, TIER_DEPTH, 0.08, 2);
    const emptyMat = new THREE.MeshStandardMaterial({ color: EMPTY_SEAT_COLOR, roughness: 0.8, metalness: 0.04 });
    const fanMats = FAN_COLORS.map(
      (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.45, metalness: 0.08 })
    );

    // Warm base slab under the stand (catches the shadow, frames the bottom).
    const baseGeo = roundedBox(STAND_WIDTH + 1.1, 0.5, TIER_DEPTH + 0.6, 0.16, 3);
    const baseMat = new THREE.MeshStandardMaterial({ color: BASE_COLOR, roughness: 0.92, metalness: 0.02 });

    // Scale post (a thin dark bar the light label plates mount onto).
    const postGeo = roundedBox(0.18, STAND_TOTAL_HEIGHT + 0.4, 0.16, 0.05, 2);
    const postMat = new THREE.MeshStandardMaterial({ color: POST_COLOR, roughness: 0.7, metalness: 0.05 });

    // Scale labels: dark digits on light rounded plates (created once, reused).
    const labelGeo = new THREE.PlaneGeometry(LABEL_W, LABEL_H);
    const labelTextures: THREE.CanvasTexture[] = [];
    const labelMats: THREE.MeshBasicMaterial[] = [];

    // ---- Assemble the scene graph ----
    const root = new THREE.Group();
    ctx.scene.add(root);

    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.set(0, STAND_BOTTOM_Y - 0.4, STAND_Z);
    base.castShadow = true;
    base.receiveShadow = true;
    root.add(base);

    // The 20 seat-row tiers, bottom → top. Stored so we can recolor by fill level.
    const tiers: THREE.Mesh[] = [];
    for (let i = 0; i < TIER_COUNT; i++) {
      const tier = new THREE.Mesh(tierGeo, emptyMat);
      tier.position.set(0, STAND_BOTTOM_Y + TIER_HEIGHT / 2 + i * TIER_PITCH, STAND_Z);
      tier.castShadow = true;
      tier.receiveShadow = true;
      root.add(tier);
      tiers.push(tier);
    }

    // Scale post + plates to the left of the stand.
    const post = new THREE.Mesh(postGeo, postMat);
    post.position.set(SCALE_X, 0, STAND_Z - 0.1);
    post.castShadow = true;
    root.add(post);

    for (const mark of SCALE_MARKS) {
      const tex = makePercentLabelTexture(mark);
      labelTextures.push(tex);
      const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
      labelMats.push(mat);
      const plate = new THREE.Mesh(labelGeo, mat);
      // mark/100 of the stand height, measured from the bottom of the stand.
      const y = STAND_BOTTOM_Y + (mark / 100) * STAND_TOTAL_HEIGHT;
      plate.position.set(SCALE_X, y, LABEL_Z);
      root.add(plate);
    }

    const first = quiz ? quiz.state().current : generator.next();
    const state = {
      problem: first as PercentTarget,
      filled: 0, // current filled percentage (multiple of 5), starts at 0 (≠ target)
      streak: 0,
      answered: 0,
    };

    /**
     * Recolor the tiers so the bottom `filled%` of rows show as filled fan seats
     * and the rest stay empty. Reuses the shared materials (no allocation): each
     * tier just points at `emptyMat` or one of the two alternating `fanMats`.
     * `animate` does a quick scale punch on the topmost newly-changed row so the
     * fill feels alive without per-frame work.
     */
    function renderFill(animate: boolean): void {
      const filledTiers = Math.round(state.filled / TIER_PERCENT); // 0..20
      for (let i = 0; i < TIER_COUNT; i++) {
        const isFilled = i < filledTiers;
        tiers[i].material = isFilled ? fanMats[i % fanMats.length] : emptyMat;
      }
      if (animate && filledTiers > 0 && !ctx.prefersReducedMotion) {
        // Pop the current top filled row so adding fans reads as a rising crowd.
        track(punch(tiers[filledTiers - 1], 0.18));
      }
    }

    function showPrompt(): void {
      // TASK ONLY — shows the target percent, never the live fill or correctness.
      ctx.prompt.set(ctx.t('percentBar.prompt', { percent: state.problem.percent }));
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

    /** Set the filled percentage, clamped to 0..100 and snapped to a 5% step. */
    function setFilled(percent: number, animate: boolean): void {
      const snapped = Math.round(percent / PERCENT_STEP) * PERCENT_STEP;
      state.filled = Math.max(0, Math.min(100, snapped));
      renderFill(animate);
    }

    function setControls(): void {
      const buttons: ControlButton[] = [
        {
          id: 'percent-dec',
          label: `${ctx.t('controls.percent')} −`,
          onPress: () => setFilled(state.filled - PERCENT_STEP, true),
        },
        {
          id: 'percent-inc',
          label: `${ctx.t('controls.percent')} +`,
          onPress: () => setFilled(state.filled + PERCENT_STEP, true),
        },
        {
          id: 'reset',
          label: ctx.t('controls.reset'),
          variant: 'reset',
          onPress: () => setFilled(0, true),
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
      // Keep the stand fill where it is between problems; only the target changes.
      showPrompt();
      showStatus();
    }

    function onCorrect(): void {
      ctx.audio.play('success');
      ctx.feedback.correct(ctx.t('percentBar.correct', { percent: state.problem.percent }));
      track(punch(root, 0.1));
      celebrate();
    }

    function onWrong(): void {
      ctx.audio.play('fail');
      ctx.feedback.wrong(ctx.t('percentBar.wrong'));
      track(shake(root, 0.05, 280));
    }

    function confirm(): void {
      const answer = state.filled;
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

      // Practice: correct → score + next problem; wrong → KEEP the fill to fix.
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

    /**
     * Drag = fill the stand by sweeping UP. The pointer's NDC-y (−1 bottom → +1
     * top) maps monotonically to fill (0..100), snapped to 5%. Dragging UP raises
     * the crowd — never inverted (the locked camera has no roll, so NDC +y is
     * world +y is "more fill").
     */
    function pointerToPercent(ndcY: number): number {
      const t = (ndcY + 1) / 2; // 0..1 bottom→top
      return Math.max(0, Math.min(100, t * 100));
    }

    const offDrag = ctx.input.on('drag', (p) => {
      const next = Math.round(pointerToPercent(p.y) / PERCENT_STEP) * PERCENT_STEP;
      if (next === state.filled) return;
      // Snap instantly while dragging so the fill tracks the finger.
      setFilled(next, false);
    });
    // dragEnd is a SECONDARY submit path; the בדוק button is the primary one.
    const offDragEnd = ctx.input.on('dragEnd', confirm);

    // Initial render: empty stand (0%), prompt + status + controls up.
    setFilled(0, false);
    track(popIn(root, { scale: 1 }));
    setControls();
    startNewProblem();

    return {
      onResize() {},
      dispose() {
        offDrag();
        offDragEnd();
        stopAllTweens();
        ctx.controls.clear();
        ctx.prompt.clear();
        ctx.status.clear();
        clayLook.dispose();

        root.clear();
        ctx.scene.remove(root);

        tierGeo.dispose();
        emptyMat.dispose();
        fanMats.forEach((m) => m.dispose());
        baseGeo.dispose();
        baseMat.dispose();
        postGeo.dispose();
        postMat.dispose();
        labelGeo.dispose();
        labelTextures.forEach((t) => t.dispose());
        labelMats.forEach((m) => m.dispose());
      },
    };
  },
};

/**
 * Render "N%" as dark digits on a light rounded plate (high contrast on any
 * backdrop). Created once per scale mark at init and disposed on dispose().
 */
function makePercentLabelTexture(n: number): THREE.CanvasTexture {
  const w = 192;
  const h = 100;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const g = canvas.getContext('2d');
  if (g) {
    g.clearRect(0, 0, w, h);
    // Light rounded plate so the dark text stays readable on the dark sky.
    g.fillStyle = '#f4ead2';
    const r = 18;
    g.beginPath();
    g.moveTo(r, 0);
    g.arcTo(w, 0, w, h, r);
    g.arcTo(w, h, 0, h, r);
    g.arcTo(0, h, 0, 0, r);
    g.arcTo(0, 0, w, 0, r);
    g.closePath();
    g.fill();
    g.fillStyle = '#2a2018';
    g.font = 'bold 56px sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(`${n}%`, w / 2, h / 2 + 3);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}
