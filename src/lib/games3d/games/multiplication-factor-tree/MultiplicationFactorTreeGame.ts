import * as THREE from 'three';
import type { Tween } from '@tweenjs/tween.js';
import type { ControlButton, Game3D } from '@/lib/games3d/types';
import { createQuizController } from '@/lib/games3d/quiz/controller';
import { applyClayLook, roundedBox, popIn, punch, shake, celebrate, bigCelebrate, computeStars, PALETTE } from '@/lib/games3d/kit';
import {
  createMultiplicationFactorTreeGenerator,
  isProperFactor,
  type FactorTreeProblem,
} from './problems';

// Theme: a FACTOR TREE. A round-cornered "trunk" node at the TOP carries the
// number N. Two wooden branches angle down to two child nodes: the LEFT child is
// the factor `a` the child dials in, the RIGHT child is the derived partner
// b = N / a. When `a` divides N evenly the right node shows b on a healthy
// (green) leaf; when it does NOT, the right node shows "?" on a dimmed/red leaf —
// the split is invalid, so the child can SEE the factor must divide evenly. The
// scene only ever shows the live built state, never a correctness verdict; the
// child commits with בדוק (Check) and success is revealed only by the toast.
//
// Framing (DEF 12b): the whole tree (top node + two children + branches) is
// centered on the origin and the camera is a straight-on `locked` view at
// (0,0,D) so drag-x → world-x is monotonic and the tree fills the central
// viewport. ground:false (the assembly straddles y=0) so the clay ground plane
// never slices through and occludes it (blank-clay regression).

const NODE_W = 2.4; // node face width
const NODE_H = 2.0; // node face height
const NODE_D = 0.55; // node thickness
const TOP_Y = 2.6; // top (N) node center
const CHILD_Y = -2.6; // child nodes center
const CHILD_DX = 3.4; // horizontal offset of each child from center
const BRANCH_W = 0.22; // branch (edge) cross-section

const QUIZ_LENGTH = 10;
const POINTS_PER_CORRECT = 10;
const MAX_A = 35; // upper drag/clamp bound (covers every N in the set; validity-gated)

// Palette: dark numerals on light/saturated plates (DEF 12). The top node is a
// warm trunk tone; the left (factor) node is sky; the right node is green when
// the split is VALID and a dimmed red when invalid — a clear visual signal.
const TRUNK_COLOR = PALETTE.sun; // top N node body
const FACTOR_COLOR = PALETTE.sky; // left a node body
const VALID_COLOR = PALETTE.mint; // right node body when a | N
const INVALID_COLOR = 0xb05a5a; // right node body when a does NOT divide N
const BRANCH_COLOR = 0x6f4e37; // wooden branch
const TEXT_FG = '#241a0c'; // dark numerals (legible on light plates)
const TEXT_FG_DIM = '#3a1414'; // dark glyph on the invalid (red) plate
const TRUNK_BG = '#f2c94c';
const FACTOR_BG = '#7fc8e8';
const VALID_BG = '#9fe0a8';
const INVALID_BG = '#d79898';

/** Map a normalized pointer coordinate (NDC, -1..1) to an integer 0..MAX_A. */
function pointerToA(normalized: number): number {
  const t = (normalized + 1) / 2; // 0..1, left→right with no inversion
  return Math.max(0, Math.min(MAX_A, Math.round(t * MAX_A)));
}

/**
 * Render a numeral (or "?") as dark glyph on a colored rounded plate
 * (CanvasTexture). Used for every node's front face; the body color and the
 * plate background match so the node reads as one solid object.
 */
function makeGlyphTexture(text: string, bg: string, fg: string): THREE.CanvasTexture {
  const w = 192;
  const h = 160;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const g = canvas.getContext('2d');
  if (g) {
    g.clearRect(0, 0, w, h);
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(36,26,12,0.28)';
    g.lineWidth = 6;
    g.strokeRect(10, 10, w - 20, h - 20);
    g.fillStyle = fg;
    g.font = 'bold 96px Georgia, "Times New Roman", serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(text, w / 2, h / 2 + 4);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

export const multiplicationFactorTreeGame: Game3D = {
  meta: {
    id: 'multiplication-factor-tree',
    i18nKey: 'games3d.factorTree',
    topic: 'arithmetic',
    difficulty: 3,
    gradeRange: [3, 5],
    estimatedSeconds: 90,
    supportedModes: ['practice', 'quiz'],
  },
  init(ctx) {
    // Straight-on front camera. The tree spans ~2*CHILD_DX + NODE_W ≈ 9.2 wide and
    // ~ (TOP_Y - CHILD_Y) + NODE_H ≈ 7.2 tall, centered on the origin. At 60° FOV the
    // half-height at distance D is D*tan(30°); to fit half-height ~3.6 with margin →
    // D ≈ 9. Use 10 so the whole tree fills the viewport with a little margin.
    ctx.presets.camera.locked(new THREE.Vector3(0, 0, 10), new THREE.Vector3(0, 0, 0));

    // Warm orchard ambience. No ground plane — the tree straddles y=0, so a ground
    // plane at y=0 would slice through and occlude the lower (child) nodes.
    const clayLook = applyClayLook(ctx, {
      topColor: '#e7f3d8',
      bottomColor: '#cfe4b0',
      ground: false,
      shadowArea: 12,
      fog: false,
    });

    const generator = createMultiplicationFactorTreeGenerator();
    const quiz =
      ctx.mode === 'quiz'
        ? createQuizController(generator, { length: QUIZ_LENGTH, pointsPerCorrect: POINTS_PER_CORRECT })
        : null;

    // ---- Tween tracking (DEF 14) ----
    type KitTween = Tween<{ s: number }> | Tween<{ t: number }> | Tween<{ v: number }>;
    const liveTweens = new Set<KitTween>();
    function track<T extends KitTween>(t: T): T {
      liveTweens.add(t);
      return t;
    }
    function stopAllTweens(): void {
      liveTweens.forEach((t) => t.stop());
      liveTweens.clear();
    }

    // ---- Shared, reused resources (one geo/mat per KIND) ----
    // Plain BoxGeometry (NOT roundedBox) so the +Z front face (group index 4) can
    // carry the numeral texture as a per-face material — the roundedBox gotcha
    // (single material group) would silently drop a per-face array.
    const nodeGeo = new THREE.BoxGeometry(NODE_W, NODE_H, NODE_D);
    const trunkSideMat = new THREE.MeshStandardMaterial({ color: TRUNK_COLOR, roughness: 0.7, metalness: 0.04 });
    const factorSideMat = new THREE.MeshStandardMaterial({ color: FACTOR_COLOR, roughness: 0.7, metalness: 0.04 });
    const validSideMat = new THREE.MeshStandardMaterial({ color: VALID_COLOR, roughness: 0.7, metalness: 0.04 });
    const invalidSideMat = new THREE.MeshStandardMaterial({ color: INVALID_COLOR, roughness: 0.85, metalness: 0.02 });

    // Two branches (left + right) — a unit branch geo rotated/scaled per edge.
    const branchGeo = roundedBox(BRANCH_W, 1, BRANCH_W, 0.05, 2);
    const branchMat = new THREE.MeshStandardMaterial({ color: BRANCH_COLOR, roughness: 0.85, metalness: 0.03 });

    // The TOP node's number texture is static per problem (disposed + recreated on
    // new problem). The two child front-face textures change as `a` changes, so we
    // track the CURRENT texture+material for each and dispose the old one on update.
    let topTex: THREE.CanvasTexture | null = null;
    let topMat: THREE.MeshBasicMaterial | null = null;
    let aTex: THREE.CanvasTexture | null = null;
    let aMat: THREE.MeshBasicMaterial | null = null;
    let bTex: THREE.CanvasTexture | null = null;
    let bMat: THREE.MeshBasicMaterial | null = null;

    // ---- Tree assembly ----
    const treeRoot = new THREE.Group(); // whole tree (centered on origin)
    ctx.scene.add(treeRoot);

    // Build the two branches once (their geometry is constant); they connect the
    // top node center to each child node center. Each branch is a thin box scaled
    // to the edge length and rotated to point from top to child.
    const branchGroup = new THREE.Group();
    treeRoot.add(branchGroup);
    function buildBranches(): void {
      branchGroup.clear();
      for (const dir of [-1, 1] as const) {
        const top = new THREE.Vector3(0, TOP_Y - NODE_H / 2, 0);
        const child = new THREE.Vector3(dir * CHILD_DX, CHILD_Y + NODE_H / 2, 0);
        const mid = top.clone().add(child).multiplyScalar(0.5);
        const delta = child.clone().sub(top);
        const len = delta.length();
        const branch = new THREE.Mesh(branchGeo, branchMat);
        branch.position.copy(mid);
        // Unit branch points along +Y; rotate so it aligns with `delta`.
        branch.scale.set(1, len, 1);
        const angle = Math.atan2(delta.x, delta.y); // angle from +Y toward +X
        branch.rotation.z = -angle;
        branch.castShadow = true;
        branch.receiveShadow = true;
        branchGroup.add(branch);
      }
    }

    // The three node meshes (top N, left a, right b). Built once; their bodies are
    // permanent (their front-face material is swapped as values change).
    const topNode = new THREE.Mesh(nodeGeo, sideArray(trunkSideMat, null));
    topNode.position.set(0, TOP_Y, 0);
    const aNode = new THREE.Mesh(nodeGeo, sideArray(factorSideMat, null));
    aNode.position.set(-CHILD_DX, CHILD_Y, 0);
    const bNode = new THREE.Mesh(nodeGeo, sideArray(validSideMat, null));
    bNode.position.set(CHILD_DX, CHILD_Y, 0);
    for (const node of [topNode, aNode, bNode]) {
      node.castShadow = true;
      node.receiveShadow = true;
      treeRoot.add(node);
    }

    /** Build a 6-material array for a BoxGeometry; index 4 (+z front) carries the
     *  number plate (or the side material when no plate yet). */
    function sideArray(side: THREE.Material, front: THREE.Material | null): THREE.Material[] {
      return [side, side, side, side, front ?? side, side];
    }

    const first = quiz ? quiz.state().current : generator.next();
    const state = {
      problem: first as FactorTreeProblem,
      a: 0, // START at 0 — invalid (0 not in 2..N-1), so a problem never opens solved (DEF 6)
      streak: 0,
      answered: 0,
    };

    /** Set the top node's number plate for the current N (static per problem). */
    function refreshTopNode(): void {
      if (topTex) topTex.dispose();
      if (topMat) topMat.dispose();
      topTex = makeGlyphTexture(String(state.problem.n), TRUNK_BG, TEXT_FG);
      topMat = new THREE.MeshBasicMaterial({ map: topTex });
      (topNode.material as THREE.Material[])[4] = topMat;
    }

    /**
     * Refresh BOTH child nodes for the current `a`. The LEFT node shows `a`. The
     * RIGHT node shows b = N/a on a GREEN (valid) plate when `a` divides N evenly,
     * or "?" on a DIMMED RED (invalid) plate otherwise — so the child sees the
     * split must divide evenly. The previous child textures/materials are disposed
     * here so updating `a` never leaks (DEF 14, b-node texture update).
     */
    function refreshChildNodes(): void {
      const n = state.problem.n;
      const a = state.a;
      // Left (a) node — always sky.
      if (aTex) aTex.dispose();
      if (aMat) aMat.dispose();
      aTex = makeGlyphTexture(String(a), FACTOR_BG, TEXT_FG);
      aMat = new THREE.MeshBasicMaterial({ map: aTex });
      (aNode.material as THREE.Material[])[4] = aMat;

      // Right (b) node — green b when `a` is a proper factor of N (the SAME rule
      // the Check uses), else dimmed-red "?". Single source of truth (DEF 16).
      const divides = isProperFactor(n, a);
      if (bTex) bTex.dispose();
      if (bMat) bMat.dispose();
      if (divides) {
        bTex = makeGlyphTexture(String(n / a), VALID_BG, TEXT_FG);
      } else {
        bTex = makeGlyphTexture('?', INVALID_BG, TEXT_FG_DIM);
      }
      bMat = new THREE.MeshBasicMaterial({ map: bTex });
      // Swap the whole side material so the body color (green vs red) tracks validity.
      const bMats = bNode.material as THREE.Material[];
      const bodyMat = divides ? validSideMat : invalidSideMat;
      for (let i = 0; i < 6; i++) bMats[i] = i === 4 ? bMat : bodyMat;
    }

    function showPrompt(): void {
      // TASK ONLY (DEF 11) — uses {n} (allowed for prompt); reveals nothing about success.
      ctx.prompt.set(ctx.t('factorTree.prompt', { n: state.problem.n }));
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

    /** Change the factor `a`, clamped to [0, MAX_A], and refresh the child nodes. */
    function setA(value: number): void {
      const next = Math.max(0, Math.min(MAX_A, value));
      if (next === state.a) return;
      state.a = next;
      refreshChildNodes();
    }

    function resetA(): void {
      if (state.a === 0) return;
      state.a = 0;
      refreshChildNodes();
    }

    function setControls(): void {
      const buttons: ControlButton[] = [
        {
          id: 'value-dec',
          label: `${ctx.t('controls.value')} −`,
          onPress: () => setA(state.a - 1),
        },
        {
          id: 'value-inc',
          label: `${ctx.t('controls.value')} +`,
          onPress: () => setA(state.a + 1),
        },
        {
          id: 'reset',
          label: ctx.t('controls.reset'),
          variant: 'reset',
          onPress: resetA,
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
      state.a = 0; // never opens solved
      refreshTopNode();
      refreshChildNodes();
      buildBranches();
      showPrompt();
      showStatus();
    }

    function onCorrect(): void {
      ctx.audio.play('success');
      ctx.feedback.correct(
        ctx.t('factorTree.correct', { n: state.problem.n, a: state.a, b: state.problem.n / state.a })
      );
      // Punch the whole tree (uniform scale on a group is safe — DEF 13b).
      track(punch(treeRoot, 0.14));
      celebrate();
    }

    function onWrong(): void {
      ctx.audio.play('fail');
      ctx.feedback.wrong(ctx.t('factorTree.wrong', { n: state.problem.n }));
      track(shake(treeRoot, 0.06, 280));
    }

    function confirm(): void {
      const answer = state.a;
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

      // Practice: correct → score + next; wrong → KEEP the split so the child fixes it.
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

    // Drag = fast factor dial. Drag RIGHT (NDC +x) raises `a`, LEFT lowers it —
    // natural (DEF 9), straight-on camera keeps drag-x → world-x monotonic.
    const offDrag = ctx.input.on('drag', (p) => {
      setA(pointerToA(p.x));
    });
    // dragEnd is a secondary submit; the בדוק button is the primary one.
    const offDragEnd = ctx.input.on('dragEnd', confirm);

    // Initial build (static props get scale.setScalar(1) implicitly — we DON'T
    // popIn static bodies; popIn the whole tree once for a gentle entrance, which
    // is safe because no stopAllTweens() runs mid-lifecycle — DEF 13c).
    refreshTopNode();
    refreshChildNodes();
    buildBranches();
    track(popIn(treeRoot));
    showPrompt();
    setControls();
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

        branchGroup.clear();
        treeRoot.clear();
        ctx.scene.remove(treeRoot);

        nodeGeo.dispose();
        trunkSideMat.dispose();
        factorSideMat.dispose();
        validSideMat.dispose();
        invalidSideMat.dispose();
        branchGeo.dispose();
        branchMat.dispose();

        // Dispose the live (current) number plates + their textures.
        topTex?.dispose();
        topMat?.dispose();
        aTex?.dispose();
        aMat?.dispose();
        bTex?.dispose();
        bMat?.dispose();
      },
    };
  },
};
