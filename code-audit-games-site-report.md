# דוח בדיקת קוד - משחקים ואתר

תאריך בדיקה: 2026-06-03

עדכון טיפול: 2026-06-03

היקף: מערכת המשחקים תחת `src/lib/games3d`, עמודי `play`, מעטפת המשחקים, בדיקות, build, i18n, sitemap ותשתית אתר כללית.

## סטטוס טיפול

כל הממצאים שנרשמו בדוח טופלו בקוד:

- `npm run build` עובר כעת באמצעות `next build --webpack`.
- הוסרו תלויות build-time ב-`next/font/google`, כך שה-build לא תלוי בגישה ל-`fonts.googleapis.com`.
- `middleware.ts` הוחלף ב-`proxy.ts` לפי Next 16.
- ה-sitemap כולל כעת את כל דפי משחקי ה-3D.
- בדיקות E2E הורחבו מ-4 משחקים לכל 44 משחקי ה-3D.
- רעש בדיקות Canvas/WebGL ו-React `act(...)` נוקה.
- `coverage/` הוחרג מ-eslint.

סיכון ידוע שנשאר: Turbopack production build עדיין נתקע בסביבה הזו. לכן סקריפט ה-build הועבר ל-webpack, שעובר בהצלחה. כדאי לחזור לבדוק Turbopack אחרי שדרוג Next או תיקון upstream.

## תקציר

לא נמצאו כשלים מיידיים בבדיקות היחידה או בבדיקות ה-E2E הקיימות. עם זאת נמצאו כמה תקלות וסיכונים חשובים:

- `npm run build` לא הסתיים בזמן סביר ונתקע ללא CPU אחרי יותר מ-7 דקות.
- ה-sitemap לא כולל את 44 דפי משחקי ה-3D.
- בדיקות ה-E2E מכסות רק 4 מתוך 44 משחקי 3D.
- בדיקות היחידה עוברות, אבל מדפיסות שגיאות `jsdom` ו-React `act`, מה שמסתיר כשלים אמיתיים בעתיד.
- יש שימוש בקובץ `middleware.ts` עם אזהרת deprecation ב-Next 16.

## ממצאים חשובים

### 1. Production build נתקע

חומרה: גבוהה

פקודה:

```bash
npm run build
```

תוצאה: ה-build הגיע ל:

```text
Creating an optimized production build ...
```

ולא התקדם במשך יותר מ-7 דקות. תהליך `next build` נשאר עם 0% CPU ונאלצתי לעצור אותו ידנית.

השפעה: אי אפשר לסמוך כרגע על build production תקין או על פריסה מלאה עד שמבינים למה התהליך נתקע.

קבצים רלוונטיים לבדיקה ראשונית:

- `next.config.ts`
- `src/middleware.ts`
- `src/lib/games3d/games/index.ts`
- `src/lib/games3d/games/loaders.ts`

הערה: במהלך build הופיעה גם אזהרה על `middleware` מיושן.

### 2. Sitemap לא כולל דפי משחקי 3D

חומרה: בינונית-גבוהה

ב-`src/app/sitemap.ts`, תחת `playRoutes`, קיימים רק:

- `/play`
- `/play/math`
- `/play/fractions`
- `/play/percentage`

אבל קיימים 44 משחקי 3D ב-`src/lib/games3d/games/loaders.ts`, וכל אחד מהם מקבל עמוד דרך `src/app/[locale]/play/[gameId]/page.tsx`.

השפעה: דפי המשחקים החדשים לא מופיעים ב-sitemap, ולכן מנועי חיפוש יקבלו אות חלש יותר לגילוי ואינדוקס שלהם.

תיקון מומלץ: לייבא את `GAME_IDS` או מקור server-safe אחר, ולהוסיף ל-sitemap נתיבים מהצורה:

```text
/play/{gameId}
```

לכל locale.

### 3. כיסוי E2E נמוך מדי ביחס למספר המשחקים

חומרה: בינונית

ב-`e2e/games3d.spec.ts` נבדקים רק 4 משחקים:

```ts
const GAMES = ['multiplication-array', 'measure-fill', 'fraction-build', 'area-perimeter'];
```

בפועל קיימים 44 loaderים ב-`src/lib/games3d/games/loaders.ts`.

השפעה: רוב המשחקים יכולים להישבר בטעינת דפדפן, canvas, תרגום, או mode picker בלי שה-CI יתפוס זאת.

תיקון מומלץ: לבנות בדיקת smoke שמריצה את כל `GAME_IDS`, או לפחות מדגם לפי topic ורמת קושי. אם זמן הרצה בעייתי, אפשר לפצל ל-smoke קצר לכל משחק ול-flow מלא למספר משחקים מייצגים.

### 4. רעש שגיאות בבדיקות יחידה סביב Canvas/WebGL

חומרה: בינונית

`npm run test` עבר: 65 קבצי בדיקה, 399 בדיקות.

אבל הפלט כולל שגיאות `jsdom` חוזרות:

```text
Error: Not implemented: HTMLCanvasElement.prototype.getContext
```

מקורות רלוונטיים:

- `src/lib/games3d/engine/WebGLCheck.ts`
- `src/lib/games3d/kit/scene.ts`

ב-`scene.ts` יש `try/catch`, אבל ב-jsdom הקריאה ל-`getContext` עדיין מדפיסה שגיאת not implemented לפני שהבדיקה ממשיכה.

השפעה: רעש כזה גורם לכך שקל לפספס שגיאה אמיתית בפלט CI. הוא גם מקשה להבין אם בדיקות canvas באמת מכסות התנהגות תקינה.

תיקון מומלץ: להוסיף mock גלובלי ל-`HTMLCanvasElement.prototype.getContext` ב-`vitest.setup.ts`, או לעדכן את הבדיקות כך שלא יקראו ל-canvas API לא ממומש ב-jsdom.

### 5. אזהרות React `act(...)` בבדיקות Game3DShell

חומרה: בינונית

`npm run test` עבר, אבל הדפיס:

```text
An update to Game3DShell inside a test was not wrapped in act(...)
```

מקור רלוונטי:

- `src/components/games3d/__tests__/Game3DShell.test.tsx`

השפעה: הבדיקה עשויה לא לשקף במדויק את מצב המסך שהמשתמש רואה לאחר עדכוני state אסינכרוניים.

תיקון מומלץ: להשתמש ב-`await screen.findBy...`, `waitFor`, או לעטוף פעולות אסינכרוניות כראוי.

## ממצאים משניים

### 6. `middleware.ts` מיושן לפי Next 16

חומרה: נמוכה-בינונית

גם `next build` וגם `npm run e2e` הציגו:

```text
The "middleware" file convention is deprecated. Please use "proxy" instead.
```

מקור:

- `src/middleware.ts`

השפעה: לא שובר כרגע, אבל זה חוב תחזוקה שיכול להפוך לשבירה בשדרוג עתידי.

תיקון מומלץ: להעביר את הקונפיגורציה ל-convention החדש של Next 16 (`proxy`) לפי ההנחיות הרשמיות.

### 7. תלות עדינה בין `Game3DShell` ל-`Canvas3D`

חומרה: נמוכה

`Canvas3D` מאתחל את המנוע ב-`useEffect` שתלוי רק ב-`game`, למרות שהמנוע מקבל גם `locale`, `isRTL`, `mode`, `t` ו-callbacks.

כרגע זה עובד כי `Game3DShell` נותן ל-`Canvas3D` מפתח:

```tsx
key={`${reloadKey}-${mode}`}
```

כלומר שינוי mode גורם remount מלא. אבל אם בעתיד ישנו את ה-key או יאפשרו החלפת locale בתוך המשחק, המנוע עלול להמשיך לרוץ עם ערכים ישנים.

תיקון מומלץ: לתעד את החוזה הזה בבדיקה, או להרחיב dependency/remount strategy בצורה מפורשת יותר.

### 8. `coverage/` נכנס ל-eslint

חומרה: נמוכה

`npm run lint` עבר ללא errors, אבל נתן warning:

```text
coverage/block-navigation.js
Unused eslint-disable directive
```

השפעה: תיקיית coverage לא אמורה להיות חלק מ-lint רגיל. זה מייצר רעש מיותר.

תיקון מומלץ: להחריג `coverage/` ב-`eslint.config.mjs` או למחוק artifactים לפני lint.

## בדיקות שבוצעו

```bash
npm run lint
```

תוצאה: עבר עם warning אחד על `coverage/block-navigation.js`.

```bash
npm run test
```

תוצאה: עבר. 65 קבצי בדיקה, 399 בדיקות. קיימות אזהרות/שגיאות stderr סביב Canvas/WebGL ו-React `act`.

```bash
npm run i18n:check
```

תוצאה: עבר. parity תקין עבור `games3d`, `home`, `games` בכל השפות.

```bash
npm run e2e
```

תוצאה: עבר. 5 בדיקות Chromium. כיסוי רק ל-4 משחקי 3D.

```bash
npm run build
```

תוצאה: לא הסתיים בזמן סביר. נעצר ידנית אחרי יותר מ-7 דקות.

## סיכום עדיפויות

1. לטפל קודם בתקיעת `npm run build`.
2. להוסיף את כל דפי משחקי ה-3D ל-sitemap.
3. להרחיב smoke E2E לכל המשחקים או למדגם רחב בהרבה.
4. לנקות רעש בדיקות סביב Canvas/WebGL ו-React `act`.
5. להעביר `middleware.ts` ל-convention החדש של Next 16.
