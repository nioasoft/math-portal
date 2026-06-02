import * as THREE from 'three';
import type { Tween } from '@tweenjs/tween.js';
import type { ControlButton, Game3D } from '@/lib/games3d/types';
import { createQuizController } from '@/lib/games3d/quiz/controller';
import {
  applyClayLook,
  popIn,
  punch,
  shake,
  celebrate,
  bigCelebrate,
  computeStars,
  PALETTE,
} from '@/lib/games3d/kit';
// `tweenTo` drives a numeric proxy on the kit's shared, engine-updated tween
// group — we use it to drive the fold parameter t (0=flat net → 1=assembled
// solid). The kit's popIn/punch/shake only touch scale uniformly.
import { tweenTo } from '@/lib/games3d/kit/juice';
import { createNetFoldGenerator, type NetFoldProblem } from './problems';
import { buildSolid, panelGeometry, type FacePanel } from './solids';

// Theme: a PAPERCRAFT / ORIGAMI workbench. A flat paper NET of colored polygon
// panels lies on a dark cutting mat; pressing "fold" tweens every panel from its
// flat net layout up into the assembled 3D solid, which then gently auto-rotates
// so every face becomes visible. The child counts the faces and enters the
// number with −/+ or by dragging up, then בדוק. The prompt asks the TASK ONLY —
// never the solid name or count. A front-facing locked camera keeps the net and
// the solid both readable; "up" on screen is +Y (drag up = more, no inversion).

const QUIZ_LENGTH = 10;
const POINTS_PER_CORRECT = 10;
const MAX_INPUT = 8; // count input clamp upper bound (faces are 4..6)
const FOLD_MS = 900; // fold / unfold tween duration
const PANEL_THICKNESS = 0.07; // paper slab thickness
const AUTO_ROTATE_SPEED = 0.55; // rad/s of the folded solid's gentle spin
const CAMERA_MARGIN = 1.35; // extra room so neither the net nor the solid clips

// Papercraft palette: six saturated paper tints, strongly contrasting against
// the dark cutting mat so each face is countable. Edges are darkened per panel
// via a separate dark edge band material is overkill — instead the visible slab
// thickness + tints + dark background give clear inter-face separation.
const PAPER_TINTS = [
  PALETTE.coral,
  PALETTE.sky,
  PALETTE.sun,
  PALETTE.mint,
  PALETTE.grape,
  0xef7d54, // warm orange (6th, for the box's last face)
] as const;
const EDGE_COLOR = 0x14101f; // dark edge so panels read as separate paper pieces

/**
 * Per-face render record: the slab mesh, its own geometry (one per face — face
 * outlines differ), and its flat/folded transforms for the fold tween.
 */
interface FaceRender {
  mesh: THREE.Mesh;
  geo: THREE.ExtrudeGeometry;
  flatPos: THREE.Vector3;
  foldedPos: THREE.Vector3;
  flatQuat: THREE.Quaternion;
  foldedQuat: THREE.Quaternion;
}

export const netFoldGame: Game3D = {
  meta: {
    id: 'net-fold',
    i18nKey: 'games3d.netFold',
    topic: 'geometry',
    difficulty: 3,
    gradeRange: [3, 5],
    estimatedSeconds: 100,
    supportedModes: ['practice', 'quiz'],
  },
  init(ctx) {
    // Front-facing locked camera: the net/solid faces the viewer, "up" is +Y.
    // Distance sized to fit the WIDEST layout (the flat net) with margin so the
    // net never clips (the solid is always smaller, so it fits comfortably too).
    ctx.presets.camera.locked(new THREE.Vector3(0, 0, 12), new THREE.Vector3(0, 0, 0));

    // Dark papercraft-workbench ambience: a deep mat behind, saturated paper in
    // front. No ground plane (content is centered on the origin, framed by the
    // dark gradient); the engine still provides the soft shadow.
    const clayLook = applyClayLook(ctx, {
      topColor: '#241c33',
      bottomColor: '#0d0a16',
      ground: false,
      shadowArea: 9,
      fog: false,
    });

    const generator = createNetFoldGenerator();
    const quiz =
      ctx.mode === 'quiz'
        ? createQuizController(generator, { length: QUIZ_LENGTH, pointsPerCorrect: POINTS_PER_CORRECT })
        : null;

    // ---- Tween tracking (no tween outlives its target) ----
    const liveTweens = new Set<Tween<{ s: number } | { t: number } | { v: number }>>();
    function track(t: Tween<{ s: number }> | Tween<{ t: number }> | Tween<{ v: number }>): void {
      liveTweens.add(t as Tween<{ s: number } | { t: number } | { v: number }>);
    }
    function stopAllTweens(): void {
      liveTweens.forEach((t) => t.stop());
      liveTweens.clear();
    }

    // ---- Shared materials (one per paper tint + one edge material) ----
    const paperMats = PAPER_TINTS.map(
      (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0.02 })
    );
    const edgeMat = new THREE.LineBasicMaterial({ color: EDGE_COLOR });

    // ---- Scene graph ----
    // spinner: a UNIFORM wrapper group that the auto-rotation spins (uniform
    // scale on a group is harmless for popIn/punch). netGroup holds every face
    // panel and is the thing we punch/shake. Reusable temp objects avoid per-
    // frame allocation in onFrame.
    const spinner = new THREE.Group();
    const netGroup = new THREE.Group();
    spinner.add(netGroup);
    ctx.scene.add(spinner); // ← the ONLY scene.add of game content; every face is parented under here.

    let faceRenders: FaceRender[] = [];
    const edgeLines: THREE.LineSegments[] = [];

    const first = quiz ? quiz.state().current : generator.next();
    const state = {
      problem: first as NetFoldProblem,
      count: 0, // entered face count starts at 0 (≠ faceCount, since faceCount≥4)
      folded: false, // is the solid currently folded up?
      foldT: 0, // 0 = flat net, 1 = assembled solid (drives panel transforms)
      streak: 0,
      answered: 0,
    };

    const tmpPos = new THREE.Vector3();
    const tmpQuat = new THREE.Quaternion();
    const flatIdentity = new THREE.Quaternion(); // identity: flat panels face +Z

    /** Dispose + clear all face meshes/geometries and their edge outlines. */
    function clearFaces(): void {
      for (const fr of faceRenders) {
        fr.geo.dispose();
      }
      for (const e of edgeLines) {
        e.geometry.dispose();
      }
      edgeLines.length = 0;
      netGroup.clear();
      faceRenders = [];
    }

    /**
     * Build the face panels for the current solid in their FLAT net layout, and
     * record each panel's flat & folded transforms for the fold tween. Every
     * panel mesh is added to netGroup (which is added to spinner, added to the
     * scene) — so no orphan meshes (paranoid visibility check).
     */
    function buildProblem(): void {
      clearFaces();
      const shape = buildSolid(state.problem.solid);
      shape.faces.forEach((f: FacePanel) => {
        const geo = panelGeometry(f.outline, PANEL_THICKNESS);
        const mesh = new THREE.Mesh(geo, paperMats[f.tint % paperMats.length]);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        // Start FLAT (foldT begins at 0): flat position, identity orientation.
        mesh.position.copy(f.flatPosition);
        mesh.quaternion.copy(flatIdentity);
        netGroup.add(mesh);

        // A dark edge outline so each paper panel reads as a distinct face.
        const edgeGeo = new THREE.EdgesGeometry(geo);
        const line = new THREE.LineSegments(edgeGeo, edgeMat);
        mesh.add(line); // child of the panel → inherits its transform
        edgeLines.push(line);

        faceRenders.push({
          mesh,
          geo,
          flatPos: f.flatPosition.clone(),
          foldedPos: f.foldedPosition.clone(),
          flatQuat: flatIdentity.clone(),
          foldedQuat: f.foldedQuaternion.clone(),
        });
      });

      // Frame the camera to the WIDER flat net (the solid is always smaller).
      // 60° vertical FOV, aspect ~1.4 → horizontal half-angle governs width.
      // distance = halfExtent / tan(horizFov/2). We use the conservative larger
      // of width/height fit, plus a margin, and keep the locked front view.
      frameCamera(shape.flatHalfExtent);

      applyFold(); // place panels per current foldT (0 on a fresh build)
    }

    /** Position the locked camera to fit a content half-extent with margin. */
    function frameCamera(halfExtent: number): void {
      const cam = ctx.camera;
      const vFov = (cam.fov * Math.PI) / 180;
      const aspect = cam.aspect || 1.4;
      const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);
      const fitV = halfExtent / Math.tan(vFov / 2);
      const fitH = halfExtent / Math.tan(hFov / 2);
      const dist = Math.max(fitV, fitH) * CAMERA_MARGIN;
      ctx.presets.camera.locked(new THREE.Vector3(0, 0, dist), new THREE.Vector3(0, 0, 0));
    }

    /**
     * Apply the current foldT (0..1) to every face panel: lerp position from
     * flat→folded and slerp orientation from identity→folded. NOT a hinge sim —
     * a clean simultaneous interpolation (robust across all solids). Position &
     * quaternion only (NOT scale), so popIn/punch on the GROUP stay safe (§13b).
     */
    function applyFold(): void {
      const t = state.foldT;
      for (const fr of faceRenders) {
        tmpPos.copy(fr.flatPos).lerp(fr.foldedPos, t);
        fr.mesh.position.copy(tmpPos);
        tmpQuat.slerpQuaternions(fr.flatQuat, fr.foldedQuat, t);
        fr.mesh.quaternion.copy(tmpQuat);
      }
    }

    /** Tween the fold parameter to a target (0 unfold, 1 fold). */
    function setFolded(folded: boolean): void {
      state.folded = folded;
      const target = folded ? 1 : 0;
      if (ctx.prefersReducedMotion) {
        state.foldT = target;
        applyFold();
        if (!folded) spinner.rotation.set(0, 0, 0);
        return;
      }
      track(
        tweenTo(state.foldT, target, FOLD_MS, (v) => {
          state.foldT = v;
          applyFold();
        })
      );
      if (!folded) spinner.rotation.set(0, 0, 0); // reset spin when laying flat
    }

    function toggleFold(): void {
      setFolded(!state.folded);
    }

    function showPrompt(): void {
      // TASK ONLY — never echoes the solid name or face count.
      ctx.prompt.set(ctx.t('netFold.prompt'));
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
        { id: 'value-dec', label: `${ctx.t('controls.value')} −`, onPress: () => stepValue(-1) },
        { id: 'value-inc', label: `${ctx.t('controls.value')} +`, onPress: () => stepValue(1) },
        { id: 'fold', label: ctx.t('controls.fold'), onPress: toggleFold },
        { id: 'reset', label: ctx.t('controls.reset'), variant: 'reset', onPress: resetProblem },
        { id: 'check', label: ctx.t('controls.check'), variant: 'confirm', onPress: confirm },
      ];
      ctx.controls.set(buttons);
    }

    /** Adjust the entered count, clamped 0..MAX_INPUT. */
    function stepValue(delta: number): void {
      state.count = Math.max(0, Math.min(MAX_INPUT, state.count + delta));
    }

    /** Reset: count back to 0 AND unfold the net flat. */
    function resetProblem(): void {
      state.count = 0;
      setFolded(false);
    }

    function startNewProblem(): void {
      state.count = 0;
      state.foldT = 0;
      state.folded = false;
      spinner.rotation.set(0, 0, 0);
      buildProblem();
      // Same staggered papery entrance as the first load, so EVERY new problem
      // animates in. Safe re §13c: popIn is only stopped by dispose()'s
      // stopAllTweens (never by a synchronous race here), so panels grow to 1.
      faceRenders.forEach((fr, i) => {
        fr.mesh.scale.setScalar(0.001);
        track(popIn(fr.mesh, { delay: i * 40, scale: 1 }));
      });
      showPrompt();
      showStatus();
    }

    function onCorrect(): void {
      ctx.audio.play('success');
      ctx.feedback.correct(ctx.t('netFold.correct', { count: state.problem.faceCount }));
      // Punch the whole net group (uniform group scale → safe for punch).
      track(punch(netGroup, 0.14));
      celebrate();
    }

    function onWrong(): void {
      ctx.audio.play('fail');
      ctx.feedback.wrong(ctx.t('netFold.wrong'));
      track(shake(netGroup, 0.06, 280));
    }

    function confirm(): void {
      const answer = state.count;
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

      // Practice: correct → score + next problem; wrong → KEEP the built state
      // so the child can fold/rotate, recount, and fix it (no fail-out).
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

    // Drag = set the entered count, in addition to the −/+ buttons (DEFINITION
    // §8). Vertical drag with NATURAL mapping (§9): dragging UP steps the count
    // up, dragging DOWN steps it down (NDC +y is up), one step per ~0.09 NDC of
    // travel, clamped to the SAME 0..MAX_INPUT range and writing the SAME
    // state.count the buttons drive.
    let lastDragY = 0;
    const offDragStart = ctx.input.on('dragStart', (p) => {
      lastDragY = p.y;
    });
    const offDrag = ctx.input.on('drag', (p) => {
      const dy = p.y - lastDragY; // +y is up → up = more (no inversion)
      if (dy > 0.09) {
        stepValue(1);
        lastDragY = p.y;
      } else if (dy < -0.09) {
        stepValue(-1);
        lastDragY = p.y;
      }
    });

    // Initial build. The net group's scale is fixed at 1 (we do NOT popIn the
    // group, because startNewProblem isn't called with a stopAllTweens race
    // here; but to be safe and per §13c we set scale explicitly and pop in the
    // panels gently AFTER they exist). We pop in each face panel for a papery
    // entrance — these are NOT raced by any synchronous stopAllTweens (only
    // dispose() stops tweens), so they grow back fine.
    netGroup.scale.setScalar(1);
    spinner.scale.setScalar(1);
    buildProblem();
    // Gentle staggered entrance for the freshly-laid net panels.
    faceRenders.forEach((fr, i) => {
      fr.mesh.scale.setScalar(0.001);
      track(popIn(fr.mesh, { delay: i * 40, scale: 1 }));
    });
    setControls();
    showPrompt();
    showStatus();

    return {
      onFrame(dt: number) {
        // Gentle auto-rotation while folded so every face becomes visible over
        // time. Applied to the UNIFORM spinner wrapper (§13b: rotation, not
        // scale). When flat (foldT≈0) we keep it still so the net reads cleanly.
        if (state.foldT > 0.02 && !ctx.prefersReducedMotion) {
          spinner.rotation.y += AUTO_ROTATE_SPEED * dt;
          // A slight tilt so top/bottom faces also come into view.
          spinner.rotation.x = 0.35 * Math.sin(spinner.rotation.y * 0.5);
        }
      },
      onResize() {},
      dispose() {
        offDragStart();
        offDrag();
        stopAllTweens();
        ctx.controls.clear();
        ctx.prompt.clear();
        ctx.status.clear();
        clayLook.dispose();

        clearFaces();
        spinner.clear();
        ctx.scene.remove(spinner);

        paperMats.forEach((m) => m.dispose());
        edgeMat.dispose();
      },
    };
  },
};
