# איך להוסיף משחק תלת-ממדי

מדריך זה מסביר איך להוסיף משחק לימוד תלת-ממדי חדש לאתר `tirgul.net` באמצעות תשתית games3d.

## דרישות מקדימות

- היכרות עם בסיסי Three.js (Scene, Mesh, Material, Camera).
- התשתית מותקנת — ראה `docs/superpowers/specs/2026-05-24-three-js-games-infrastructure-design.md`.
- דוגמה עובדת: `src/app/[locale]/play/canary-dev/CanaryGame.tsx` (canary של "לחץ על הקובייה").

## שלבים

### 1. בחר `id` ו-`i18nKey`

- `id` — slug של ה-URL (kebab-case): למשל `triangle-drag`.
- `i18nKey` — מפתח namespace לתרגום: למשל `games3d.triangleDrag`.

### 2. הוסף תרגומים

הוסף ערך לכל locale ב-`messages/{locale}/games3d.json`:

```json
{
  "triangleDrag": {
    "title": "גרור את המשולש",
    "description": "גרור את המשולש כדי להתאים למתאר",
    "instructions": "השתמש באצבע אחת לגרור את המשולש לתוך הצורה המקווקווית"
  }
}
```

Locales חובה: `en`, `he`, `ar`, `de`, `es`, `ru`.

### 3. מימוש המשחק

צור את `src/lib/games3d/games/triangle-drag/TriangleDragGame.ts`:

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
    // הגדר את המצלמה והתאורה
    ctx.presets.camera.topDown(new THREE.Vector3(0, 0, 0), 8);
    ctx.presets.lighting.soft(ctx.scene);

    // צור את הרשתות, גיאומטריות, חומרים שלך...
    // חבר input דרך ctx.input.on('drag', ...)
    // קרא ל-ctx.score.add(N), ctx.feedback.correct(), ctx.audio.play('success')
    // כשמסיים: ctx.complete({ totalPoints, accuracy, durationSec })

    return {
      onFrame(dt, elapsed) { /* עדכון אנימציה */ },
      dispose() {
        // חובה: שחרר כל geometry, material, texture שיצרת,
        // הסר כל mesh שהוספת לסצנה, וביטל כל input listener.
      },
    };
  },
};
```

### 4. צור route

צור `src/app/[locale]/play/triangle-drag/page.tsx`:

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

### 5. רשום את המשחק (אופציונלי, לקטלוג עתידי)

בספרייה קטלוג עתידית:

```typescript
import { registerGame } from '@/lib/games3d/registry';
import { triangleDragGame } from '@/lib/games3d/games/triangle-drag/TriangleDragGame';
registerGame(triangleDragGame);
```

## רשימת dispose — חובה לא לדלג!

כל משאב שהמשחק שלך יוצר אחרי `init()` חייב להשתחרר ב-`dispose()`. **Three.js לא מנקה משאבי WebGL אוטומטית.**

לכל `THREE.Mesh` שהוספת:
- `scene.remove(mesh)`
- `mesh.geometry.dispose()`
- `mesh.material.dispose()` (או כל חומר במערך)

לכל texture שטענת בעצמך (לא דרך `ctx.assets`):
- `texture.dispose()`

לכל listener שרשמת דרך `ctx.input.on(...)`:
- קרא לפונקציית ה-`Unsubscribe` המוחזרת.

לכל `setInterval` / `setTimeout` / `requestAnimationFrame` שלך:
- בטל אותם.

**אם תדלג על dispose — תיווצר דליפת זיכרון GPU. אחרי כמה החלפות משחק העמוד יקרוס במכשירים בינוניים.**

## תקציב ביצועים

יעד:
- עד 50,000 משולשים בסצנה בו-זמנית.
- עד 8 מקורות אור.
- צללים מבוטלים אלא אם חיוניים.
- גודל texture עד 1024×1024.
- material אחד לכל אובייקט שונה ויזואלית — אל תכפיל materials לעותקים, השתמש באותו instance.

אם המנוע משדר `onQualityDowngrade('low')` — המשחק שלך צריך להפחית פירוט (להסתיר רשתות דקורטיביות, להוריד כמות חלקיקים).

## רשימת נגישות

- כל טקסט UI דרך `useTranslations('games3d.<yourKey>')` — לעולם לא לקודד טקסט בקוד.
- למשוב נכון/שגוי השתמש תמיד בצבע + אייקון + צליל + הודעה מתורגמת.
- אל תסתמך על צבע בלבד — צמד כל רמז צבעוני עם צורה, דפוס או תווית.
- כבד את `ctx.prefersReducedMotion` — דלג או האט אנימציות דקורטיביות.

## בדיקת המשחק

לפחות בדיקה ידנית:
- [ ] 60fps ב-Chrome DevTools Performance על מחשב הפיתוח.
- [ ] tap/drag מגיב נכון במגע (השתמש ב-mobile emulation של Chrome).
- [ ] כפתור mute משתיק את האודיו שלך.
- [ ] נווט למשחק, נווט החוצה, חזור — 5 פעמים. ה-JS heap לא גדל.
- [ ] עבור ל-tab אחר — המשחק עוצר. חזור — ממשיך.

הרץ את ה-perf benchmark על dev server:

```bash
# טרמינל 1
npm run dev
# טרמינל 2 — אחרי שהשרת מוכן
PERF_URL=http://localhost:3000/play/your-game-id npm run perf:games3d
```

## מקור נכסים

מקם נכסים פר-משחק תחת `public/games/<game-id>/`. הצהר עליהם ב-`meta.assets`:

```typescript
assets: {
  textures: { brick: '/games/triangle-drag/brick.png' },
  models:   { house: '/games/triangle-drag/house.glb' },
  audio:    { magic: '/games/triangle-drag/magic.ogg' },
}
```

המנוע טוען מראש את כל הנכסים שהוצהרו לפני קריאה ל-`init()`. **השתמש רק בנכסי CC0 / נחלת הכלל.**

## טעויות נפוצות

- **קריאה ל-`ctx.scene.add(mesh)` בתוך `onFrame`**: דליפה. הוסף אובייקטים ב-`init`, לא בלולאת הרינדור.
- **שכחת `dispose()` על חומר**: הדליפה הקלה ביותר להוסיף, הקשה ביותר לאיתור.
- **שינוי `ctx.camera` ישירות מחוץ ל-`presets`**: ה-presets ממקמים את המצלמה; שינוי ישיר יכול לשבור את ה-framing ב-resize.
- **טקסט באנגלית/עברית קשיח**: כל מחרוזת גלויה חייבת לבוא מתרגומים.

## הפניה: משחק canary

דוגמה מינימלית מלאה ועובדת נמצאת ב-`src/app/[locale]/play/canary-dev/CanaryGame.tsx`. היא חסומה לסביבת dev בלבד דרך `process.env.NODE_ENV !== 'development'` → `notFound()`. בקר ב-`/play/canary-dev` במצב dev כדי לראות אותו פועל.

## ממשקי SceneContext זמינים

### Input

```typescript
ctx.input.on('tap', (p: PointerInfo) => {
  // p.picked הוא Three.js object שהמשתמש לחץ עליו, או null
  // p.x, p.y הם קואורדינטות מנורמלות (0–1)
  // p.pixelX, p.pixelY הן קואורדינטות pixel של viewport
});

ctx.input.on('dragStart', (p) => { /* ... */ });
ctx.input.on('drag', (p) => { /* ... */ });
ctx.input.on('dragEnd', (p) => { /* ... */ });
ctx.input.on('pinch', (scale: number) => { /* ... */ });
ctx.input.on('rotate', (angle: number) => { /* ... */ });
ctx.input.on('key', (key: string) => { /* ... */ });

// החזר [x, y, z] intersections עם הסצנה
ctx.input.pickAt(x, y); // x, y מנורמלות
```

### Score & Feedback

```typescript
ctx.score.add(10);        // הוסף 10 נקודות
ctx.score.set(0);         // אפס ל-0
ctx.score.get();          // קבל נקודות עכשוויות

ctx.feedback.correct('+5');  // הצג אנימציית "נכון" עם הודעה אופציונלית
ctx.feedback.wrong('-1');    // הצג אנימציית "שגוי"
ctx.feedback.hint('נסה שוב'); // הצג הודעת עזרה
```

### Audio

```typescript
// נגן אפקטים קול משותפים
ctx.audio.play('success');  // או 'fail', 'click'

// נגן קול ספציפי למשחק
ctx.audio.play('myCustomSfx', '/games/my-game/my-sound.ogg');

// בדוק מצב mute
ctx.audio.isMuted();
ctx.audio.setMuted(true);

// טען מראש קול מותאם (קורה לפני init אם ב-meta.assets)
await ctx.audio.preload('sfxKey', '/games/my-game/sound.ogg');
```

### Assets

```typescript
// כל נכסים שהוצהרו ב-meta.assets טעונים מראש לפני init()
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
  streak: 10,            // אופציונלי
});
```

### Camera presets

```typescript
// Orbit: המצלמה מקיפה את היעד במרחק
ctx.presets.camera.orbit(target: THREE.Vector3, distance: number);

// Top-down: תצוגת ציפור
ctx.presets.camera.topDown(target: THREE.Vector3, distance: number);

// Locked: מיקום וכיוון קבועים
ctx.presets.camera.locked(position: THREE.Vector3, lookAt: THREE.Vector3);
```

### Lighting presets

```typescript
ctx.presets.lighting.daylight(scene);    // מואר בהיר וזהה
ctx.presets.lighting.soft(scene);        // צללים רכים, תאורה עדינה
ctx.presets.lighting.dramatic(scene);    // קונטרסט גבוה, צללים דרמטיים
```

### Debug

```typescript
// בפיתוח, הדפס משאבי GPU עקובים
ctx.debug?.logTrackedResources();
```

### Metadata

```typescript
ctx.locale;                // 'en', 'he', 'ar', וכו'
ctx.isRTL;                 // true עבור 'he', 'ar'
ctx.prefersReducedMotion;  // true אם למשתמש יש prefers-reduced-motion מוגדר
```
