import * as THREE from 'three';
import type { Tween } from '@tweenjs/tween.js';
import type { ControlButton, Game3D } from '@/lib/games3d/types';
import { createQuizController } from '@/lib/games3d/quiz/controller';
import { applyClayLook, roundedBox, popIn, punch, shake, celebrate, bigCelebrate, computeStars } from '@/lib/games3d/kit';
import { lockedCameraFrame } from '@/lib/games3d/kit/camera';
import { createNumberSequenceGenerator, MAX_VALUE, type NumberSequenceProblem } from './problems';

// Theme: an ancient TEMPLE. A row of engraved stone tablets stands on a low
// plinth; each tablet shows one number of a sequence. ONE tablet is missing its
// number (the "?" stone) — the child sets it with the −/+ buttons (or drags up to
// raise / down to lower). A glowing arc arches between two consecutive stones to
// hint that "the same step joins each pair". When the filled value completes the
// rule (arithmetic add-d or geometric ×r), בדוק accepts it.
//
// Framing (DEF 12b): the row is centered on the origin and the camera is a
// straight-on `locked` view at (0,0,D) so drag-x → world-x is monotonic and the
// stones fill the central viewport. ground:false (tablets sit at y≈0, the plinth
// is the visible surface) so the clay ground plane never occludes them.

const TABLET_W = 1.7;
const TABLET_H = 2.05;
const TABLET_D = 0.45;
const GAP = 0.55; // gap between tablets
const PITCH = TABLET_W + GAP; // center-to-center spacing
const TABLET_Y = TABLET_H / 2 + 0.18; // rest on the plinth, above y=0

const QUIZ_LENGTH = 10;
const POINTS_PER_CORRECT = 10;

// Stone palette: light sandstone tablets with dark-engraved numerals, a warmer
// "active" stone for the missing one, and a saturated amber for the hint arc.
const STONE_LIGHT = 0xe8dcc0; // sandstone face/sides
const STONE_ACTIVE = 0xd9a441; // the missing tablet (warm, stands out)
const PLINTH_COLOR = 0x8a7a5c; // darker base course
const ARC_COLOR = 0xc25b2e; // terracotta hint arc (saturated, reads on light)
const TEXT_FG = '#3a2c14'; // dark engraving
const TEXT_BG_LIGHT = '#e8dcc0';
const TEXT_BG_ACTIVE = '#f0c463';
const TEXT_Q = '#8a5a1a'; // the "?" glyph color

// Texture cache key: a number 0..MAX_VALUE, or 'q' for the question mark.
const TEX_KEYS = (() => {
  const keys: Array<number | 'q'> = ['q'];
  for (let n = 0; n <= MAX_VALUE; n++) keys.push(n);
  return keys;
})();

/** Start guess for the missing tablet — deliberately NOT the answer so it never
 *  opens solved (DEF 6). We use 1 unless the answer is 1, in which case 0. */
function startGuessFor(answer: number): number {
  return answer === 1 ? 0 : 1;
}

export const numberSequenceGame: Game3D = {
  meta: {
    id: 'number-sequence',
    i18nKey: 'games3d.numberSequence',
    topic: 'series',
    difficulty: 3,
    gradeRange: [3, 5],
    estimatedSeconds: 110,
    supportedModes: ['practice', 'quiz'],
  },
  init(ctx) {
    // Straight-on front camera; distance sized so a 5-tablet row (the widest case)
    // fills the viewport. Width of 5 tablets ≈ 5*PITCH - GAP ≈ 10.7; at 60° FOV the
    // half-height visible at distance D is D*tan(30°); with aspect ~1.4 the
    // half-width ≈ 1.4*D*tan(30°). For half-width ~5.9 → D ≈ 7.3. Use 10 for margin.
    function reframe() {
      const { position, lookAt } = lockedCameraFrame(5.35, 0, ctx.camera.aspect);
      ctx.presets.camera.locked(position, lookAt);
    }
    reframe();

    // Warm temple ambience. No ground plane — the plinth is the visible surface and
    // the tablets sit just above y=0, so the clay ground would only occlude them.
    const clayLook = applyClayLook(ctx, {
      topColor: '#efe3c6',
      bottomColor: '#cdb98c',
      ground: false,
      shadowArea: 12,
      fog: false,
    });

    const generator = createNumberSequenceGenerator();
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

    // ---- Shared, reused resources (one per KIND) ----
    // Plain BoxGeometry (NOT roundedBox) so the +Z front face (group index 4) can
    // carry the engraved-number texture as a per-face material; the roundedBox
    // gotcha (single material group) would silently drop a per-face array.
    const tabletGeo = new THREE.BoxGeometry(TABLET_W, TABLET_H, TABLET_D);
    const sideLightMat = new THREE.MeshStandardMaterial({ color: STONE_LIGHT, roughness: 0.95, metalness: 0.02 });
    const sideActiveMat = new THREE.MeshStandardMaterial({ color: STONE_ACTIVE, roughness: 0.85, metalness: 0.04 });

    // One number texture per key (0..MAX_VALUE on a light face, plus a light "?"
    // and an active-face "?"), created once and reused; disposed on dispose().
    const texLight = new Map<number | 'q', THREE.CanvasTexture>();
    const matLight = new Map<number | 'q', THREE.MeshBasicMaterial>();
    const texActive = new Map<number | 'q', THREE.CanvasTexture>();
    const matActive = new Map<number | 'q', THREE.MeshBasicMaterial>();
    for (const key of TEX_KEYS) {
      const tl = makeGlyphTexture(key, TEXT_BG_LIGHT, key === 'q' ? TEXT_Q : TEXT_FG);
      texLight.set(key, tl);
      matLight.set(key, new THREE.MeshBasicMaterial({ map: tl }));
      const ta = makeGlyphTexture(key, TEXT_BG_ACTIVE, key === 'q' ? TEXT_Q : TEXT_FG);
      texActive.set(key, ta);
      matActive.set(key, new THREE.MeshBasicMaterial({ map: ta }));
    }

    // Plinth: a long dark base course under the tablets (catches the shadow,
    // frames the row). One geo + one mat, rescaled per problem by its length.
    const plinthGeo = roundedBox(1, 0.36, TABLET_D + 0.5, 0.08, 3);
    const plinthMat = new THREE.MeshStandardMaterial({ color: PLINTH_COLOR, roughness: 0.95, metalness: 0.02 });
    const plinth = new THREE.Mesh(plinthGeo, plinthMat);
    plinth.position.y = -0.18 + 0.18; // top of plinth at ~y=0.18 (tablets rest on it)
    plinth.receiveShadow = true;
    ctx.scene.add(plinth);

    // Hint arc: a thin torus segment (half-circle) bridging two consecutive
    // tablets. One geo + one mat, repositioned per problem.
    const arcGeo = new THREE.TorusGeometry(PITCH / 2, 0.07, 10, 40, Math.PI);
    const arcMat = new THREE.MeshStandardMaterial({
      color: ARC_COLOR,
      emissive: ARC_COLOR,
      emissiveIntensity: 0.35,
      roughness: 0.5,
      metalness: 0.05,
    });
    const arc = new THREE.Mesh(arcGeo, arcMat);
    ctx.scene.add(arc);

    // Tablets live in a group rebuilt per problem.
    const tabletGroup = new THREE.Group();
    ctx.scene.add(tabletGroup);

    interface TabletRec {
      mesh: THREE.Mesh; // material[4] = front number plate
      isMissing: boolean;
    }
    let tablets: TabletRec[] = [];

    const first = quiz ? quiz.state().current : generator.next();
    const state = {
      problem: first as NumberSequenceProblem,
      guess: startGuessFor((first as NumberSequenceProblem).answer),
      streak: 0,
      answered: 0,
    };

    /** Front-face material for a given displayed number/glyph on a given stone. */
    function frontMat(key: number | 'q', active: boolean): THREE.Material {
      const map = active ? matActive : matLight;
      return map.get(key) ?? (matLight.get('q') as THREE.Material);
    }

    /** Build the per-face material array for one tablet. */
    function faceMatsFor(key: number | 'q', active: boolean): THREE.Material[] {
      const side = active ? sideActiveMat : sideLightMat;
      return [side, side, side, side, frontMat(key, active), side]; // +z front = index 4
    }

    /** Center the row on the origin: tablet i sits at x = (i - (n-1)/2) * PITCH. */
    function tabletX(i: number, n: number): number {
      return (i - (n - 1) / 2) * PITCH;
    }

    /** Build the tablets for the current problem (numbers + the active "?"). */
    function buildTablets(): void {
      tabletGroup.clear();
      tablets = [];
      const n = state.problem.terms.length;
      for (let i = 0; i < n; i++) {
        const isMissing = i === state.problem.missingIndex;
        const key: number | 'q' = isMissing ? glyphForGuess(state.guess) : state.problem.terms[i];
        const mesh = new THREE.Mesh(tabletGeo, faceMatsFor(key, isMissing));
        mesh.position.set(tabletX(i, n), TABLET_Y, 0);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        tabletGroup.add(mesh);
        tablets.push({ mesh, isMissing });
        track(popIn(mesh, { delay: i * 40 }));
      }
      // Plinth spans the full row plus a margin.
      const span = (n - 1) * PITCH + TABLET_W + 0.7;
      plinth.scale.set(span, 1, 1);
      // Hint arc bridges the pair just LEFT of the missing tablet when possible,
      // otherwise the pair just right — so it always sits between two filled stones.
      const mi = state.problem.missingIndex;
      const leftPairStart = mi >= 2 ? mi - 2 : mi + 1; // index of the left stone of the bridged pair
      const a = Math.min(leftPairStart, n - 2);
      const aClamped = Math.max(0, a);
      const arcX = (tabletX(aClamped, n) + tabletX(aClamped + 1, n)) / 2;
      arc.position.set(arcX, TABLET_Y + TABLET_H / 2 + 0.1, 0.05);
      track(popIn(arc, { delay: n * 40 }));
    }

    /** Update ONLY the missing tablet's front face to reflect the current guess. */
    function refreshMissingTablet(): void {
      const rec = tablets[state.problem.missingIndex];
      if (!rec) return;
      const mats = rec.mesh.material as THREE.Material[];
      mats[4] = frontMat(glyphForGuess(state.guess), true);
    }

    function showPrompt(): void {
      // TASK ONLY (DEF 11) — never reveals the answer or the rule.
      ctx.prompt.set(ctx.t('numberSequence.prompt'));
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

    /** Change the guess by delta, clamped to [0, MAX_VALUE], and refresh the stone. */
    function setGuess(value: number): void {
      const next = Math.max(0, Math.min(MAX_VALUE, value));
      if (next === state.guess) return;
      state.guess = next;
      refreshMissingTablet();
    }

    function resetGuess(): void {
      state.guess = startGuessFor(state.problem.answer);
      refreshMissingTablet();
    }

    function setControls(): void {
      const buttons: ControlButton[] = [
        {
          id: 'value-dec',
          label: `${ctx.t('controls.value')} −`,
          onPress: () => setGuess(state.guess - 1),
        },
        {
          id: 'value-inc',
          label: `${ctx.t('controls.value')} +`,
          onPress: () => setGuess(state.guess + 1),
        },
        {
          id: 'reset',
          label: ctx.t('controls.reset'),
          variant: 'reset',
          onPress: resetGuess,
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
      const next = quiz ? quiz.state().current : generator.next();
      state.problem = next;
      state.guess = startGuessFor(next.answer);
      buildTablets();
      showPrompt();
      showStatus();
    }

    function onCorrect(): void {
      ctx.audio.play('success');
      ctx.feedback.correct(ctx.t('numberSequence.correct', { value: state.problem.answer }));
      track(punch(tabletGroup, 0.12));
      celebrate();
    }

    function onWrong(): void {
      ctx.audio.play('fail');
      ctx.feedback.wrong(ctx.t('numberSequence.wrong'));
      const rec = tablets[state.problem.missingIndex];
      if (rec) track(shake(rec.mesh, 0.08, 280));
    }

    function confirm(): void {
      const ok = generator.check(state.problem, state.guess);

      if (quiz) {
        if (ok) {
          state.streak += 1;
          onCorrect();
        } else {
          state.streak = 0;
          onWrong();
        }
        quiz.submit(state.guess);
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

      // Practice: correct → score + next; wrong → KEEP the guess so the child can fix it.
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

    // Drag = fast value set. Drag UP (NDC +y) raises the guess, DOWN lowers it —
    // natural (DEF 9). Map the full vertical sweep across [0, MAX_VALUE].
    const offDrag = ctx.input.on('drag', (p) => {
      const t = (p.y + 1) / 2; // 0 (bottom) .. 1 (top)
      setGuess(Math.round(t * MAX_VALUE));
    });
    // dragEnd is a secondary submit; the בדוק button is the primary one.
    const offDragEnd = ctx.input.on('dragEnd', confirm);

    buildTablets();
    showPrompt();
    setControls();
    showStatus();

    return {
      onResize() { reframe(); },
      dispose() {
        offDrag();
        offDragEnd();
        stopAllTweens();
        ctx.controls.clear();
        ctx.prompt.clear();
        ctx.status.clear();
        clayLook.dispose();

        tabletGroup.clear();
        ctx.scene.remove(tabletGroup);
        ctx.scene.remove(plinth);
        ctx.scene.remove(arc);

        tabletGeo.dispose();
        sideLightMat.dispose();
        sideActiveMat.dispose();
        texLight.forEach((t) => t.dispose());
        matLight.forEach((m) => m.dispose());
        texActive.forEach((t) => t.dispose());
        matActive.forEach((m) => m.dispose());
        plinthGeo.dispose();
        plinthMat.dispose();
        arcGeo.dispose();
        arcMat.dispose();
      },
    };
  },
};

/** Map a guess to the texture key shown on the missing tablet (numbers only;
 *  0 is allowed as a low starting value and rendered as "0"). */
function glyphForGuess(guess: number): number | 'q' {
  return guess;
}

/**
 * Render a numeral (or "?") as dark engraving on a stone-colored rounded plate
 * (CanvasTexture), kept dark-on-light so it stays legible. Created once per key
 * at init and reused; disposed on dispose().
 */
function makeGlyphTexture(key: number | 'q', bg: string, fg: string): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const g = canvas.getContext('2d');
  if (g) {
    g.clearRect(0, 0, size, size);
    g.fillStyle = bg;
    g.fillRect(0, 0, size, size);
    // A faint inset border for an engraved-tablet feel.
    g.strokeStyle = 'rgba(58,44,20,0.25)';
    g.lineWidth = 5;
    g.strokeRect(9, 9, size - 18, size - 18);
    g.fillStyle = fg;
    g.font = 'bold 72px Georgia, "Times New Roman", serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(key === 'q' ? '?' : String(key), size / 2, size / 2 + 4);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}
