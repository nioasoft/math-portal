import * as THREE from 'three';
import type { Tween } from '@tweenjs/tween.js';
import type { ControlButton, Game3D } from '@/lib/games3d/types';
import { createQuizController } from '@/lib/games3d/quiz/controller';
import { applyClayLook, roundedBox, popIn, punch, shake, celebrate, bigCelebrate, computeStars, PALETTE } from '@/lib/games3d/kit';
import { createNumberBondGenerator, MAX_TARGET, type NumberBondProblem } from './problems';

// Theme: two floating STONE platforms hover over a dark chasm. The whole T is
// the gap between them (T units wide). A CRYSTAL BRIDGE grows from each platform:
// A glowing crystal segments reach out from the LEFT platform, B from the RIGHT.
// The two halves MEET exactly when A + B === T (a gap if too few, an overlap if
// too many). The scene shows the live built state — NOT a correctness verdict.
// The child commits with בדוק (Check); only then is success revealed.
const UNIT = 1; // one crystal segment = one unit of the whole
const SEG_W = 0.92; // visual width of a segment (small gap reads as discrete units)
const SEG_H = 1.0; // chunky deck so the bridge reads as a solid mass, not specks
const SEG_D = 0.95;
const BRIDGE_Y = 0; // bridge deck centerline — the assembly's vertical center (y=0)
const PLATFORM_W = 3.4; // substantial stone slab on each side
const PLATFORM_H = 2.6; // tall enough to read as a cliff the bridge springs from
const PLATFORM_D = 3.2;
const PLATFORM_CENTER_Y = BRIDGE_Y; // platforms centered on the bridge deck centerline (y=0)
const GAP_PAD = 0.7; // padding between platform inner edge and the chasm span
const QUIZ_LENGTH = 10;
const POINTS_PER_CORRECT = 10;
const SEG_STAGGER_MS = 22; // gentle per-segment delay so the bridge extends alive

// Crystal bridge: two saturated/glowing tones (left vs right part) so the child
// reads which side each segment belongs to. Stone is a dark, matte tone so the
// crystals and any labels pop (def 12).
const CRYSTAL_LEFT = PALETTE.sky; // part A — glassy blue
const CRYSTAL_RIGHT = PALETTE.grape; // part B — glassy purple
const STONE_COLOR = 0x5b6b80; // mid slate platforms — light enough to read against the dark backdrop
const CHASM_COLOR = 0x161b24; // near-black chasm floor far below

/** Map a normalized pointer coordinate (NDC, -1..1) to an integer 0..target. */
function pointerToCount(normalized: number, target: number): number {
  const t = (normalized + 1) / 2; // 0..1, left→right with no inversion
  return Math.max(0, Math.min(target, Math.round(t * target)));
}

export const numberBondSplitGame: Game3D = {
  meta: {
    id: 'number-bond-split',
    i18nKey: 'games3d.numberBond',
    topic: 'arithmetic',
    difficulty: 1,
    gradeRange: [1, 2],
    estimatedSeconds: 90,
    supportedModes: ['practice', 'quiz'],
  },
  init(ctx) {
    // Straight-on locked camera over the XY plane (mirrors clock-builder): the
    // chasm runs along X (left platform on the left, right on the right), "up" on
    // screen is +Y. Looking straight down −Z at the origin keeps drag-x → world-x
    // monotonic (no inversion). The assembly is wide-and-flat and CENTERED on the
    // origin (deck + both platforms straddle y=0), so the camera distance is sized
    // off its half-WIDTH (outer platform edge) PER TARGET — fitCamera() reframes on
    // every problem so the platforms + bridge fill the central viewport at any T
    // (not tiny specks, not clipped).

    // Clay/toy look — cool cavern ambience. Ground DISABLED: the assembly is
    // centered on y=0, so a ground plane at y=0 would slice through and occlude it
    // (blank-clay regression). The dark gradient backdrop alone frames the glowing
    // crystals (mirrors clock-builder, where the clock "hangs on a wall").
    const clayLook = applyClayLook(ctx, {
      topColor: '#1b2430',
      bottomColor: '#2e3b4e',
      ground: false,
      shadowArea: 16,
      fog: false,
    });

    const generator = createNumberBondGenerator();
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

    // ---- Shared, reused resources (one geometry/material per visual kind) ----
    const segGeo = roundedBox(SEG_W, SEG_H, SEG_D, 0.12, 3);
    const leftSegMat = new THREE.MeshStandardMaterial({
      color: CRYSTAL_LEFT,
      roughness: 0.25,
      metalness: 0.1,
      emissive: new THREE.Color(CRYSTAL_LEFT),
      emissiveIntensity: 0.28,
      transparent: true,
      opacity: 0.92,
    });
    const rightSegMat = new THREE.MeshStandardMaterial({
      color: CRYSTAL_RIGHT,
      roughness: 0.25,
      metalness: 0.1,
      emissive: new THREE.Color(CRYSTAL_RIGHT),
      emissiveIntensity: 0.28,
      transparent: true,
      opacity: 0.92,
    });
    // A unit platform geometry, scaled per side (one geo + one mat reused).
    const platformGeo = roundedBox(PLATFORM_W, PLATFORM_H, PLATFORM_D, 0.18, 3);
    const platformMat = new THREE.MeshStandardMaterial({ color: STONE_COLOR, roughness: 0.9, metalness: 0.05 });
    // Chasm backdrop: a wide, tall dark slab sitting BEHIND the assembly (−Z),
    // centered on the origin so it frames the gap as a dark void behind the
    // crystals. With no ground plane and a straight-on camera, this (plus the
    // gradient) is what the glowing crystals read against.
    const chasmGeo = roundedBox(MAX_TARGET + PLATFORM_W * 2 + 6, PLATFORM_H + 6, 0.4, 0.2, 2);
    const chasmMat = new THREE.MeshStandardMaterial({ color: CHASM_COLOR, roughness: 1, metalness: 0 });

    const leftPlatform = new THREE.Mesh(platformGeo, platformMat);
    const rightPlatform = new THREE.Mesh(platformGeo, platformMat);
    leftPlatform.castShadow = true;
    leftPlatform.receiveShadow = true;
    rightPlatform.castShadow = true;
    rightPlatform.receiveShadow = true;
    const chasm = new THREE.Mesh(chasmGeo, chasmMat);
    chasm.position.z = -2.6; // sit behind the assembly as a dark void backdrop
    chasm.receiveShadow = true;

    // Two groups so each half of the bridge punches/clears independently.
    const leftBridge = new THREE.Group();
    const rightBridge = new THREE.Group();
    ctx.scene.add(chasm, leftPlatform, rightPlatform, leftBridge, rightBridge);

    const state = {
      problem: (quiz ? quiz.state().current : generator.next()) as NumberBondProblem,
      a: 0, // left part
      b: 0, // right part
      streak: 0,
      answered: 0,
    };

    function showPrompt(): void {
      // TASK ONLY — the target and nothing that reveals success (def 11).
      ctx.prompt.set(ctx.t('numberBond.prompt', { target: state.problem.target }));
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

    // The chasm spans `target` units, centered on the origin. The left platform's
    // inner edge sits at -halfGap, the right platform's at +halfGap. Crystal
    // segments tile inward from each edge: A from the left, B from the right.
    function halfGap(): number {
      return (state.problem.target * UNIT) / 2 + GAP_PAD;
    }

    function layoutPlatforms(): void {
      const hg = halfGap();
      // Inner edge of left platform at -hg → its center is further left by PLATFORM_W/2.
      // Platforms are centered on y=0 (straddle the bridge deck), so nothing hangs
      // below the view center — the whole assembly sits symmetrically around origin.
      leftPlatform.position.set(-hg - PLATFORM_W / 2, PLATFORM_CENTER_Y, 0);
      rightPlatform.position.set(hg + PLATFORM_W / 2, PLATFORM_CENTER_Y, 0);
      fitCamera();
    }

    /**
     * Frame the camera so the whole assembly (chasm span + both platforms) fills
     * the central viewport for the CURRENT target. The scene is a wide, flat strip
     * CENTERED on the origin, so distance is driven by its half-WIDTH (outer
     * platform edge). The viewport is wider than tall, so the binding constraint is
     * the HORIZONTAL extent: the camera's vertical FOV is 60°, and the horizontal
     * half-extent at distance D is ≈ D·tan(30°)·aspect (aspect ≈ 1.4). Solving for D
     * to fit `outerHalf` with padding gives the formula below. A straight-on camera
     * at (0,0,D) looking at the origin keeps NDC-x → world-x monotonic (no inversion,
     * so the drag mapping stays natural) — mirrors clock-builder's framing.
     */
    function fitCamera(): void {
      const outerHalf = halfGap() + PLATFORM_W; // X of each platform's outer edge
      // Size by half-width through the (approx) horizontal half-FOV, plus padding.
      const distance = outerHalf / 1.3 / Math.tan((60 * Math.PI) / 180 / 2) + 3;
      ctx.presets.camera.locked(
        new THREE.Vector3(0, 0, distance),
        new THREE.Vector3(0, 0, 0)
      );
    }

    /**
     * Rebuild the crystal bridge to reflect the live A and B. A segments tile
     * rightward starting at the left platform edge (-halfGap); B segments tile
     * leftward starting at the right platform edge (+halfGap). New segments (index
     * >= prevCount on that side) pop in with a stagger so growth feels alive.
     * This is GEOMETRY SHOWING THE NUMBERS — it shows progress (a gap if A+B<T, an
     * overlap if A+B>T), NOT a success state.
     */
    function buildBridge(prevA: number, prevB: number): void {
      leftBridge.clear();
      rightBridge.clear();
      const hg = halfGap();
      let newOrdinal = 0;
      // Left part A: segment i centered at (-hg + (i + 0.5)*UNIT).
      for (let i = 0; i < state.a; i++) {
        const seg = new THREE.Mesh(segGeo, leftSegMat);
        seg.position.set(-hg + (i + 0.5) * UNIT, BRIDGE_Y, 0);
        seg.castShadow = true;
        seg.receiveShadow = true;
        if (i >= prevA) {
          track(popIn(seg, { delay: newOrdinal * SEG_STAGGER_MS }));
          newOrdinal += 1;
        }
        leftBridge.add(seg);
      }
      // Right part B: segment j centered at (+hg - (j + 0.5)*UNIT), reaching left.
      for (let j = 0; j < state.b; j++) {
        const seg = new THREE.Mesh(segGeo, rightSegMat);
        seg.position.set(hg - (j + 0.5) * UNIT, BRIDGE_Y, 0);
        seg.castShadow = true;
        seg.receiveShadow = true;
        if (j >= prevB) {
          track(popIn(seg, { delay: newOrdinal * SEG_STAGGER_MS }));
          newOrdinal += 1;
        }
        rightBridge.add(seg);
      }
    }

    /** Apply new parts: clamp 0..T, rebuild the bridge, refresh prompt. */
    function setParts(a: number, b: number): void {
      const prevA = state.a;
      const prevB = state.b;
      state.a = Math.max(0, Math.min(state.problem.target, a));
      state.b = Math.max(0, Math.min(state.problem.target, b));
      buildBridge(prevA, prevB);
      showPrompt();
    }

    function setControls(): void {
      const buttons: ControlButton[] = [
        {
          id: 'left-dec',
          label: `${ctx.t('controls.left')} −`,
          onPress: () => setParts(state.a - 1, state.b),
        },
        {
          id: 'left-inc',
          label: `${ctx.t('controls.left')} +`,
          onPress: () => setParts(state.a + 1, state.b),
        },
        {
          id: 'right-dec',
          label: `${ctx.t('controls.right')} −`,
          onPress: () => setParts(state.a, state.b - 1),
        },
        {
          id: 'right-inc',
          label: `${ctx.t('controls.right')} +`,
          onPress: () => setParts(state.a, state.b + 1),
        },
        {
          id: 'reset',
          label: ctx.t('controls.reset'),
          variant: 'reset',
          onPress: () => setParts(0, 0),
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
      state.problem = quiz ? quiz.state().current : generator.next();
      state.a = 0;
      state.b = 0;
      layoutPlatforms();
      buildBridge(0, 0); // starts empty (0+0 ≠ T) — never opens solved
      showPrompt();
      showStatus();
    }

    function onCorrect(): void {
      ctx.audio.play('success');
      ctx.feedback.correct(ctx.t('numberBond.correct', { target: state.problem.target }));
      // The bridge LOCKS: both halves punch together and the crystals celebrate —
      // this gold/glow moment happens ONLY here, after a correct Check (def 11).
      track(punch(leftBridge, 0.16));
      track(punch(rightBridge, 0.16));
      celebrate();
    }

    function onWrong(): void {
      ctx.audio.play('fail');
      ctx.feedback.wrong(ctx.t('numberBond.wrong'));
      track(shake(leftBridge, 0.06, 280));
      track(shake(rightBridge, 0.06, 280));
    }

    function confirm(): void {
      const answer = { a: state.a, b: state.b };
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
        startNewProblem();
        return;
      }

      // Practice: correct → score + next; wrong → KEEP the built bridge to fix.
      if (ok) {
        state.streak += 1;
        onCorrect();
        ctx.score.add(POINTS_PER_CORRECT);
        if (state.streak > 0 && state.streak % 3 === 0) bigCelebrate();
        startNewProblem();
      } else {
        state.streak = 0;
        onWrong();
        showStatus();
      }
    }

    // Drag = fast building. The pointer's horizontal position picks how far the
    // NEARER half reaches: dragging on the LEFT side sets A (left part), on the
    // RIGHT side sets B (right part). Right/up = more (no inversion): for the left
    // half, further right = more A; for the right half, further left = more B
    // (it grows from the right edge inward), still "toward more crystals".
    const offDrag = ctx.input.on('drag', (p) => {
      const target = state.problem.target;
      if (p.x <= 0) {
        // Left half: NDC -1..0 → A 0..target.
        const a = pointerToCount(p.x * 2 + 1, target);
        setParts(a, state.b);
      } else {
        // Right half: NDC 1..0 → B 0..target (mirror so dragging toward center grows B).
        const b = pointerToCount((1 - p.x) * 2 - 1, target);
        setParts(state.a, b);
      }
    });
    // dragEnd is a secondary submit path; the בדוק button is the primary one.
    const offDragEnd = ctx.input.on('dragEnd', confirm);

    layoutPlatforms();
    track(popIn(leftPlatform));
    track(popIn(rightPlatform));
    buildBridge(0, 0);
    setControls();
    showPrompt();
    showStatus();

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

        leftBridge.clear();
        rightBridge.clear();
        ctx.scene.remove(leftBridge, rightBridge, leftPlatform, rightPlatform, chasm);

        segGeo.dispose();
        leftSegMat.dispose();
        rightSegMat.dispose();
        platformGeo.dispose();
        platformMat.dispose();
        chasmGeo.dispose();
        chasmMat.dispose();
      },
    };
  },
};
