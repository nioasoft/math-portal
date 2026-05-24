# How to Add a 3D Game

This guide explains how to add a new 3D learning game to `tirgul.net` using the games3d infrastructure.

## Prerequisites

- Familiarity with Three.js basics (Scene, Mesh, Material, Camera).
- The infrastructure is installed: see `docs/superpowers/specs/2026-05-24-three-js-games-infrastructure-design.md`.
- A working reference: `src/app/[locale]/play/canary-dev/CanaryGame.tsx` (the canary tap-the-cube demo).

## Steps

### 1. Pick an `id` and `i18nKey`

- `id` is the URL slug (kebab-case): e.g., `triangle-drag`.
- `i18nKey` is the translation namespace key: e.g., `games3d.triangleDrag`.

### 2. Add translations

Add an entry per locale in `messages/{locale}/games3d.json`:

```json
{
  "triangleDrag": {
    "title": "Drag the Triangle",
    "description": "Drag the triangle to match the outline",
    "instructions": "Use one finger to drag the triangle into the dotted shape"
  }
}
```

Required locales: `en`, `he`, `ar`, `de`, `es`, `ru`.

### 3. Implement the game

Create `src/lib/games3d/games/triangle-drag/TriangleDragGame.ts`:

```typescript
import * as THREE from 'three';
import type { Game3D } from '@/lib/games3d/types';

export const triangleDragGame: Game3D = {
  meta: {
    id: 'triangle-drag',
    i18nKey: 'games3d.triangleDrag',
    topic: 'geometry',
    difficulty: 2,
    gradeRange: [2, 4],
    estimatedSeconds: 60,
    supportedModes: ['practice'],
  },
  init(ctx) {
    // Set up camera and lighting
    ctx.presets.camera.topDown(new THREE.Vector3(0, 0, 0), 8);
    ctx.presets.lighting.soft(ctx.scene);

    // Create your meshes, geometries, materials...
    // Wire up input via ctx.input.on('drag', ...)
    // Call ctx.score.add(N), ctx.feedback.correct(), ctx.audio.play('success')
    // When done: ctx.complete({ totalPoints, accuracy, durationSec })

    return {
      onFrame(dt, elapsed) { /* animate */ },
      dispose() {
        // CRITICAL: dispose every geometry, material, texture you created,
        // remove every mesh you added to the scene, and unsubscribe every input listener.
      },
    };
  },
};
```

### 4. Create the route

Create `src/app/[locale]/play/triangle-drag/page.tsx`:

```typescript
import { getTranslations } from 'next-intl/server';
import { Game3DShell } from '@/components/games3d/Game3DShell';
import { triangleDragGame } from '@/lib/games3d/games/triangle-drag/TriangleDragGame';

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'games3d.triangleDrag' });
  return (
    <Game3DShell
      game={triangleDragGame}
      title={t('title')}
      webGLAvailable={true}
      breadcrumbItems={[
        { label: 'Home', href: '/' },
        { label: 'Games', href: '/play' },
        { label: t('title') },
      ]}
    />
  );
}
```

### 5. Register the game (optional, for catalog)

In a future catalog module:

```typescript
import { registerGame } from '@/lib/games3d/registry';
import { triangleDragGame } from '@/lib/games3d/games/triangle-drag/TriangleDragGame';
registerGame(triangleDragGame);
```

## Dispose checklist (DO NOT skip)

Every resource your game creates after `init()` must be released in `dispose()`. **Three.js does not garbage-collect WebGL resources automatically.**

For each `THREE.Mesh` you added:
- `scene.remove(mesh)`
- `mesh.geometry.dispose()`
- `mesh.material.dispose()` (or each material in an array)

For each texture you loaded yourself (not via `ctx.assets`):
- `texture.dispose()`

For each event listener registered via `ctx.input.on(...)`:
- Call the returned `Unsubscribe` function.

For any custom `setInterval`/`setTimeout`/`requestAnimationFrame` you started:
- Clear/cancel it.

**If you skip dispose, you will leak GPU memory. After a few game switches the page will crash on mid-range devices.**

## Performance budget

Aim for:
- ≤ 50,000 triangles in the scene at any time.
- ≤ 8 lights total.
- Shadow maps disabled unless essential.
- Texture sizes ≤ 1024×1024.
- One material per visually-distinct object (don't duplicate `MeshStandardMaterial` for clones — instance the material).

If the engine fires `onQualityDowngrade('low')`, your game should reduce detail (hide decorative meshes, drop particle counts).

## Accessibility checklist

- All UI text via `useTranslations('games3d.<yourKey>')` — never hardcode.
- For correct/wrong feedback, always use color + icon + sound + i18n message.
- Don't rely on color alone — pair every color cue with a shape, pattern, or label.
- Honor `ctx.prefersReducedMotion` — skip or slow down decorative animations.

## Testing your game

Manual verification at minimum:
- [ ] 60fps in Chrome DevTools Performance tab on your dev machine.
- [ ] Tap/drag responds correctly on touch (use Chrome's mobile emulation).
- [ ] Mute button silences your audio.
- [ ] Navigate to your game, navigate away, repeat 5 times — no JS heap growth.
- [ ] Switch to a different browser tab — game pauses; return — game resumes.

Run the perf benchmark on the dev server:

```bash
# Terminal 1
npm run dev
# Terminal 2 — after dev server is ready
PERF_URL=http://localhost:3000/play/your-game-id npm run perf:games3d
```

## Sourcing assets

Place per-game assets under `public/games/<game-id>/`. Declare them in `meta.assets`:

```typescript
assets: {
  textures: { brick: '/games/triangle-drag/brick.png' },
  models:   { house: '/games/triangle-drag/house.glb' },
  audio:    { magic: '/games/triangle-drag/magic.ogg' },
}
```

The engine preloads all declared assets before calling `init()`. **Use only CC0 / public-domain assets.**

## Common pitfalls

- **Calling `ctx.scene.add(mesh)` in `onFrame`**: this leaks. Add objects in `init`, not in the render loop.
- **Forgetting `dispose()` on a material**: the cheapest leak to introduce; the hardest to detect.
- **Mutating `ctx.camera` outside of `presets`**: presets reposition the camera; direct mutation may break framing on resize.
- **Hardcoded English/Hebrew strings**: every visible string must come from translations.

## Reference: the canary game

A complete minimal working example is in `src/app/[locale]/play/canary-dev/CanaryGame.tsx`. It's gated to development environments via `process.env.NODE_ENV !== 'development'` → `notFound()`. Visit `/play/canary-dev` in dev mode to see it in action.

## Available SceneContext APIs

### Input

```typescript
ctx.input.on('tap', (p: PointerInfo) => {
  // p.picked is the Three.js object the user tapped, or null
  // p.x, p.y are normalized coordinates (0–1)
  // p.pixelX, p.pixelY are viewport pixel coordinates
});

ctx.input.on('dragStart', (p) => { /* ... */ });
ctx.input.on('drag', (p) => { /* ... */ });
ctx.input.on('dragEnd', (p) => { /* ... */ });
ctx.input.on('pinch', (scale: number) => { /* ... */ });
ctx.input.on('rotate', (angle: number) => { /* ... */ });
ctx.input.on('key', (key: string) => { /* ... */ });

// Returns [x, y, z] intersections with the scene
ctx.input.pickAt(x, y); // normalized x, y
```

### Score & Feedback

```typescript
ctx.score.add(10);        // Add 10 points
ctx.score.set(0);         // Reset to 0
ctx.score.get();          // Get current score

ctx.feedback.correct('+5');  // Show "correct" animation with optional message
ctx.feedback.wrong('-1');    // Show "wrong" animation
ctx.feedback.hint('Try again'); // Show hint message
```

### Audio

```typescript
// Play shared sound effects
ctx.audio.play('success');  // or 'fail', 'click'

// Play game-specific sound
ctx.audio.play('myCustomSfx', '/games/my-game/my-sound.ogg');

// Check mute state
ctx.audio.isMuted();
ctx.audio.setMuted(true);

// Preload a custom sound (happens before init if in meta.assets)
await ctx.audio.preload('sfxKey', '/games/my-game/sound.ogg');
```

### Assets

```typescript
// All assets declared in meta.assets are preloaded before init()
const texture: THREE.Texture = ctx.assets.texture('brick');
const model: THREE.Object3D = ctx.assets.model('house');
ctx.assets.has('brick'); // true/false
```

### Completion

```typescript
ctx.complete({
  totalPoints: 100,
  accuracy: 0.95,        // 0–1
  durationSec: 45,
  streak: 10,            // optional
});
```

### Camera presets

```typescript
// Orbit: camera orbits around target at distance
ctx.presets.camera.orbit(target: THREE.Vector3, distance: number);

// Top-down: bird's-eye view
ctx.presets.camera.topDown(target: THREE.Vector3, distance: number);

// Locked: fixed position and look-at
ctx.presets.camera.locked(position: THREE.Vector3, lookAt: THREE.Vector3);
```

### Lighting presets

```typescript
ctx.presets.lighting.daylight(scene);    // Bright, evenly lit
ctx.presets.lighting.soft(scene);        // Soft shadows, gentle lighting
ctx.presets.lighting.dramatic(scene);    // High contrast, dramatic shadows
```

### Debug

```typescript
// In development, log tracked GPU resources
ctx.debug?.logTrackedResources();
```

### Metadata

```typescript
ctx.locale;                // 'en', 'he', 'ar', etc.
ctx.isRTL;                 // true for 'he', 'ar'
ctx.prefersReducedMotion;  // true if user has prefers-reduced-motion set
```
