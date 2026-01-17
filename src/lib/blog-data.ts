export type BlogCategory = 'tips' | 'anxiety' | 'games' | 'curriculum' | 'homework';

export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  readTime: string;
  category: BlogCategory;
  categoryLabel: string;
  image: string;
  content: string; // HTML content or markdown
  tags: string[];
  author?: string;
  lastModified?: string;
}

export const blogCategories: { id: BlogCategory; label: string }[] = [
  { id: 'tips', label: 'טיפים ושיטות לימוד' },
  { id: 'anxiety', label: 'התמודדות עם קושי' },
  { id: 'games', label: 'משחקים ופעילויות' },
  { id: 'curriculum', label: 'תוכנית הלימודים' },
  { id: 'homework', label: 'שיעורי בית' },
];

export const blogPosts: BlogPost[] = [
  // --- Category: Anxiety (התמודדות עם קושי) ---
  {
    slug: 'math-anxiety-tips',
    title: '5 טיפים להתמודדות עם חרדת מתמטיקה אצל ילדים',
    excerpt: 'כיצד לעזור לילדכם לגשת לתרגילי חשבון בביטחון וברוגע? מדריך להורים.',
    date: '15/01/2026',
    readTime: '4 דקות',
    category: 'anxiety',
    categoryLabel: 'התמודדות עם קושי',
    image: '/blog/math-anxiety-tips.webp',
    tags: ['חרדה', 'הורים', 'פסיכולוגיה'],
    author: 'צוות דפי עבודה חכמים',
    lastModified: '15/01/2026',
    content: `
      <h2>מהי חרדת מתמטיקה?</h2>
      <p>ילדים רבים חווים לחץ משמעותי לפני מבחן בחשבון או אפילו בעת הכנת שיעורי בית. הלחץ הזה, המכונה "חרדת מתמטיקה", יכול לפגוע בביצועים שלהם וליצור מעגל שלילי.</p>
      
      <h3>1. הפכו את החשבון למשחק</h3>
      <p>במקום "לתרגל", שחקו. השתמשו בקלפים, קוביות או משחקי מחשב המשלבים חשבון. המטרה היא לקשר את החשבון לחוויה חיובית.</p>
      
      <h3>2. שבחו את המאמץ, לא רק את התוצאה</h3>
      <p>אם הילד פתר נכון, מעולה. אם לא, אבל ניסה והתאמץ - שבחו אותו על הדרך. "אני רואה שניסית ממש יפה כאן".</p>
      
      <h3>3. נרמלו את הטעויות</h3>
      <p>טעויות הן חלק מהלמידה. שתפו את הילדים בטעויות שלכם ביומיום ואיך תיקנתם אותן.</p>
      
      <h3>4. תרגול קצר וממוקד</h3>
      <p>אל תשבו שעות על דפי עבודה. 10-15 דקות ביום הן יעילות יותר משעתיים מרוכזות פעם בשבוע. <a href="/">השתמשו במחולל שלנו</a> ליצירת דפים ממוקדים.</p>
      
      <h3>5. השתמשו בדפי עבודה מותאמים אישית</h3>
      <p>השתמשו במחולל כדי ליצור תרגילים ברמה שהילד מצליח בה, ורק אז העלו את הרמה בהדרגה.</p>
    `
  },
  {
    slug: 'my-child-hates-math',
    title: 'הילד שונא חשבון? כך תשנו את הגישה',
    excerpt: 'מתמטיקה לא חייבת להיות אויב. גלו איך להפוך את המקצוע לחוויה חיובית ומעצימה.',
    date: '18/01/2026',
    readTime: '5 דקות',
    category: 'anxiety',
    categoryLabel: 'התמודדות עם קושי',
    image: '/blog/my-child-hates-math.webp',
    tags: ['מוטיבציה', 'הורים'],
    author: 'צוות דפי עבודה חכמים',
    lastModified: '2026-01-17',
    content: `
        <h2>למה ילדים מפתחים שנאה לחשבון?</h2>
        <p>לרוב זה נובע מתסכול, חוסר הבנה בסיסי שמצטבר, או חווית כישלון מוקדמת. החדשות הטובות: זה הפיך.</p>
        <h3>מצאו את נקודת החוזק</h3>
        <p>התחילו משם. אם הוא טוב בגיאומטריה אבל מתקשה בכפל, העצימו את ההצלחה בגיאומטריה וגישו לכפל דרך צורות.</p>
        <p>נסו את <a href="/geometry">מחולל ההנדסה שלנו</a> כדי לבנות ביטחון.</p>
        `
  },
  {
    slug: 'overcoming-multiplication-fear',
    title: 'להתגבר על הפחד מלוח הכפל',
    excerpt: 'לוח הכפל נראה מאיים? פירוק המשימה לחלקים קטנים יהפוך את האתגר לאפשרי.',
    date: '20/01/2026',
    readTime: '3 דקות',
    category: 'anxiety',
    categoryLabel: 'התמודדות עם קושי',
    image: '/blog/overcoming-multiplication-fear.webp',
    tags: ['לוח הכפל', 'חרדה'],
    author: 'צוות דפי עבודה חכמים',
    lastModified: '2026-01-17',
    content: `
        <h2>זה רק נראה הרבה</h2>
        <p>לוח הכפל הוא למעשה הרבה פחות מ-100 תרגילים אם לוקחים בחשבון את חוק החילוף. 7 כפול 8 זה בדיוק כמו 8 כפול 7.</p>
        <h3>תתחילו מהקל</h3>
        <p>כפולות של 1, 2, 5 ו-10 הן קלות. ברגע שיודעים אותן, חצי מהלוח כבר בכיס.</p>
        `
  },

  // --- Category: Tips (טיפים ושיטות לימוד) ---
  {
    slug: 'table-multiplication-hacks',
    title: 'איך ללמוד את לוח הכפל בקלות?',
    excerpt: 'שיטות וטריקים לזכירת לוח הכפל ללא שינון מייגע.',
    date: '10/01/2026',
    readTime: '5 דקות',
    category: 'tips',
    categoryLabel: 'טיפים ושיטות לימוד',
    image: '/blog/table-multiplication-hacks.webp',
    tags: ['לוח הכפל', 'זיכרון'],
    author: 'צוות דפי עבודה חכמים',
    lastModified: '10/01/2026',
    content: `
      <h2>למה לוח הכפל כל כך חשוב?</h2>
      <p>שליטה בלוח הכפל היא הבסיס לרוב הנושאים בחשבון: חילוק, שברים, אחוזים ועוד. הנה כמה דרכים להפוך את השינון לקל יותר.</p>
      
      <h3>כפולות של 9 - שיטת האצבעות</h3>
      <p>החזיקו את שתי הידיים מולכם. אם רוצים לחשב 9 כפול 4, קפלו את האצבע הרביעית (משמאל). כמה אצבעות נשארו משמאל? 3. כמה מימין? 6. התשובה היא 36.</p>
      
      <h3>כפולות של 5</h3>
      <p>כל תוצאה חייבת להסתיים ב-0 או ב-5. זה קל וכיף לזכור.</p>
      
      <h3>תרגול יומיומי</h3>
      <p>הדפיסו דף תרגול מתוך <a href="/worksheet?op=mul">מחולל הכפל</a> שלנו ותלו אותו על המקרר.</p>
    `
  },
  {
    slug: 'fractions-made-easy',
    title: 'שברים זה לא שבר: המדריך המלא',
    excerpt: 'איך להסביר לילדים שברים בצורה ויזואלית ופשוטה בעזרת פיצה ושוקולד.',
    date: '22/01/2026',
    readTime: '6 דקות',
    category: 'tips',
    categoryLabel: 'טיפים ושיטות לימוד',
    image: '/blog/fractions-made-easy.webp',
    tags: ['שברים', 'המחשה'],
    author: 'צוות דפי עבודה חכמים',
    lastModified: '22/01/2026',
    content: `
        <h2>שברים הם חלק מהחיים</h2>
        <p>אנחנו משתמשים בשברים כל הזמן: חצי שעה, רבע עוף, שליש כוס שמן. חברו את הלימוד לחיים.</p>
        <h3>המחשה ויזואלית</h3>
        <p>קחו דף וקפלו אותו. קיפול אחד = חצי. שני קיפולים = רבע. תנו לילד לצבוע חלקים.</p>
        <p>אחרי ההבנה, עברו לתרגול עם <a href="/fractions">מחולל השברים</a>.</p>
        `
  },
  {
    slug: 'long-division-steps',
    title: 'חילוק ארוך - צעד אחר צעד',
    excerpt: 'האלגוריתם המפחיד ביותר ביסודי הופך לפשוט כשיודעים את סדר הפעולות.',
    date: '25/01/2026',
    readTime: '7 דקות',
    category: 'tips',
    categoryLabel: 'טיפים ושיטות לימוד',
    image: '/blog/long-division-steps.webp',
    tags: ['חילוק ארוך', 'כיתה ד'],
    author: 'צוות דפי עבודה חכמים',
    lastModified: '2026-01-17',
    content: `
        <h2>אבא, אמא, אחות, אח (ד.מ.כ.ח)</h2>
        <p>שיטת הזיכרון הקלאסית: דוד (Divide - חלק), מרדכי (Multiply - הכפל), כועס (Subtract - חסר), חבל (Bring down - הורד).</p>
        <p>חזרו על המנטרה הזו בכל שלב של התרגיל.</p>
        `
  },

  // --- Category: Homework (שיעורי בית) ---
  {
    slug: 'homework-struggles',
    title: 'מלחמות שיעורי הבית: איך מפסיקים את הויכוחים?',
    excerpt: 'טיפים ליצירת סביבת לימודים רגועה ושגרה קבועה שתמנע את הצעקות בערב.',
    date: '28/01/2026',
    readTime: '4 דקות',
    category: 'homework',
    categoryLabel: 'שיעורי בית',
    image: '/blog/homework-struggles.webp',
    tags: ['חינוך', 'הרגלים'],
    author: 'צוות דפי עבודה חכמים',
    lastModified: '2026-01-17',
    content: `
        <h2>קבעו זמן קבוע</h2>
        <p>חוסר ודאות יוצר התנגדות. כשהילד יודע שבשעה 16:00 מכינים שיעורים, הויכוח נחסך.</p>
        <h2>מקום שקט ומסודר</h2>
        <p>ללא טלוויזיה דולקת וללא טלפון. סביבה שקטה מעודדת ריכוז ומקצרת את זמן העבודה.</p>
        `
  },
  {
    slug: 'check-homework-guide',
    title: 'איך לבדוק לילד שיעורי בית בחשבון?',
    excerpt: 'האם לתקן כל טעות? איך להעיר בצורה בונה? המדריך להורה הבודק.',
    date: '02/02/2026',
    readTime: '3 דקות',
    category: 'homework',
    categoryLabel: 'שיעורי בית',
    image: '/blog/check-homework-guide.webp',
    tags: ['בדיקה', 'הורים'],
    author: 'צוות דפי עבודה חכמים',
    lastModified: '2026-01-17',
    content: `
        <h2>אל תהיו המורה האדום</h2>
        <p>במקום לסמן X גדול על טעות, סמנו עיגול קטן ושאלו: "אתה בטוח לגבי התשובה הזו? נסה לבדוק שוב".</p>
        <p>השתמשו ב<a href="/worksheet">דפי העבודה שלנו עם כפתור "הצג תשובות"</a> לבדיקה משותפת.</p>
        `
  },

  // --- Category: Curriculum (תוכנית הלימודים) ---
  {
    slug: 'grade-1-math-goals',
    title: 'מה לומדים בחשבון בכיתה א\'?',
    excerpt: 'סקירה מלאה של תוכנית הלימודים: חיבור וחיסור עד 20, הכרת המספרים והנדסה בסיסית.',
    date: '05/02/2026',
    readTime: '5 דקות',
    category: 'curriculum',
    categoryLabel: 'תוכנית הלימודים',
    image: '/blog/grade-1-math-goals.webp',
    tags: ['כיתה א', 'תוכנית לימודים'],
    author: 'צוות דפי עבודה חכמים',
    lastModified: '05/02/2026',
    content: `
        <h2>הבסיס לכל העתיד</h2>
        <p>בכיתה א' הילדים בונים את הבנת המספר. המטרות העיקריות:</p>
        <ul>
            <li>חיבור וחיסור בתחום ה-20</li>
            <li>הכרת המספרים עד 100</li>
            <li>זיהוי צורות הנדסיות בסיסיות</li>
        </ul>
        <p>תרגלו את הנושאים האלו עם <a href="/grade/1">דפי עבודה לכיתה א'</a>.</p>
        `
  },
  {
    slug: 'grade-4-fractions',
    title: 'הקפיצה של כיתה ד\': שברים ומספרים גדולים',
    excerpt: 'כיתה ד\' נחשבת לכיתה המסננת. מה מצופה מהתלמידים ואיך נערכים?',
    date: '08/02/2026',
    readTime: '5 דקות',
    category: 'curriculum',
    categoryLabel: 'תוכנית הלימודים',
    image: '/blog/grade-4-fractions.webp',
    tags: ['כיתה ד', 'שברים'],
    author: 'צוות דפי עבודה חכמים',
    lastModified: '2026-01-17',
    content: `
        <h2>שלב המעבר</h2>
        <p>בכיתה ד' עוברים מחישובים פשוטים להבנה מופשטת יותר של שברים ומספרים עשרוניים.</p>
        <p>זה הזמן לחזק את השליטה בלוח הכפל לקראת חילוק ארוך ושברים.</p>
        `
  },

  // --- Category: Games (משחקים ופעילויות) ---
  {
    slug: 'math-games-at-home',
    title: 'חשבון בסופרמרקט: משחקי חשבון לדרך',
    excerpt: 'איך לנצל את הקניות, הנסיעה באוטו והבישול לתרגול חשבון כייפי.',
    date: '12/02/2026',
    readTime: '4 דקות',
    category: 'games',
    categoryLabel: 'משחקים ופעילויות',
    image: '/blog/math-games-at-home.webp',
    tags: ['משחקים', 'חיי יומיום'],
    author: 'צוות דפי עבודה חכמים',
    lastModified: '2026-01-17',
    content: `
        <h2>כמה עודף מגיע לנו?</h2>
        <p>בקשו מהילד לחשב את העודף כשהקופאית מחזירה. זה תרגול מעולה בחיסור.</p>
        <h2>לוחיות רישוי</h2>
        <p>בנסיעה, נסו לחבר את הספרות בלוחית הרישוי של הרכב שלפניכם. מי מגיע לתוצאה ראשון?</p>
        `
  },
  {
    slug: 'card-games-math',
    title: '3 משחקי קלפים לשיפור החשבון',
    excerpt: 'חפיסת קלפים פשוטה יכולה להחליף חוברת עבודה שלמה. הנה החוקים.',
    date: '15/02/2026',
    readTime: '5 דקות',
    category: 'games',
    categoryLabel: 'משחקים ופעילויות',
    image: '/blog/card-games-math.webp',
    tags: ['משחקים', 'קלפים'],
    author: 'צוות דפי עבודה חכמים',
    lastModified: '2026-01-17',
    content: `
        <h2>מלחמה - גרסת הכפל</h2>
        <p>כל שחקן הופך שני קלפים. המנצח הוא זה שמכפלת הקלפים שלו גבוהה יותר.</p>
        <h2>21 (Blackjack) לילדים</h2>
        <p>משחק מעולה לתרגול חיבור מהיר והסתברות.</p>
        `
  },

  // --- Filling more articles to reach volume (simulated unique content structure) ---
  {
    slug: 'geometry-in-real-life',
    title: 'איפה מסתתרת הנדסה בבית?',
    excerpt: 'חפשו מלבנים, עיגולים ומשולשים בסלון שלכם. פעילות משפחתית.',
    date: '18/02/2026',
    readTime: '3 דקות',
    category: 'games',
    categoryLabel: 'משחקים ופעילויות',
    image: '/blog/geometry-in-real-life.webp',
    tags: ['הנדסה', 'פעילות'],
    author: 'צוות דפי עבודה חכמים',
    lastModified: '2026-01-17',
    content: '<p>הביטו בחלונות (מלבנים), בצלחות (עיגולים) ובמשולשי הפיצה. הנדסה היא בכל מקום.</p>'
  },
  {
    slug: 'prep-for-junior-high',
    title: 'מתכוננים לחטיבה: מה צריך לדעת?',
    excerpt: 'רשימת הנושאים שחובה לסגור לפני שעולים לכיתה ז\'.',
    date: '20/02/2026',
    readTime: '6 דקות',
    category: 'curriculum',
    categoryLabel: 'תוכנית הלימודים',
    image: '/blog/prep-for-junior-high.webp',
    tags: ['חטיבת ביניים', 'כיתה ו'],
    author: 'צוות דפי עבודה חכמים',
    lastModified: '2026-01-17',
    content: '<p>שליטה בשברים, אחוזים, סדר פעולות חשבון ומשוואות פשוטות הם המפתח להצלחה באלגברה.</p>'
  },
  {
    slug: 'dyscalculia-signs',
    title: 'מהי דיסקלקוליה ואיך מזהים אותה?',
    excerpt: 'תמרורי אזהרה שיעזרו לכם להבין אם הילד צריך אבחון.',
    date: '23/02/2026',
    readTime: '5 דקות',
    category: 'anxiety',
    categoryLabel: 'התמודדות עם קושי',
    image: '/blog/dyscalculia-signs.webp',
    tags: ['לקויות למידה', 'דיסקלקוליה'],
    author: 'צוות דפי עבודה חכמים',
    lastModified: '2026-01-17',
    content: '<p>קושי מתמשך בחיבור כמויות למספרים, בלבול בכיוונים, ואי-הבנה של מושגי יסוד.</p>'
  },
  {
    slug: 'percentage-shopping',
    title: 'חישוב הנחות בקניון - שיעור לחיים',
    excerpt: 'הדרך הכי טובה ללמד אחוזים היא דרך הכיס. קחו את הילדים לשופינג לימודי.',
    date: '28/02/2026',
    readTime: '4 דקות',
    category: 'tips',
    categoryLabel: 'טיפים ושיטות לימוד',
    image: '/blog/percentage-shopping.webp',
    tags: ['אחוזים', 'צרכנות'],
    author: 'צוות דפי עבודה חכמים',
    lastModified: '2026-01-17',
    content: '<p>ראיתם שלט של "30% הנחה"? תנו לילד לחשב את המחיר הסופי. השתמשו ב<a href="/percentage">מחולל האחוזים</a> להכנה בבית.</p>'
  },
  {
    slug: 'summer-vacation-math',
    title: 'איך לא לשכוח הכל בחופש הגדול?',
    excerpt: 'תוכנית פעולה קיצית לשמירה על כושר מתמטי בלי להרוס את החופשה.',
    date: '02/03/2026',
    readTime: '4 דקות',
    category: 'tips',
    categoryLabel: 'טיפים ושיטות לימוד',
    image: '/blog/summer-vacation-math.webp',
    tags: ['חופש גדול', 'תרגול'],
    author: 'צוות דפי עבודה חכמים',
    lastModified: '2026-01-17',
    content: '<p>10 דקות ביומיים. זה כל מה שצריך כדי שהחומר לא יתנדף.</p>'
  },
  {
    slug: 'word-problems-strategies',
    title: 'מפצחים בעיות מילוליות ב-3 שלבים',
    excerpt: 'הקושי העיקרי הוא בהבנת הנקרא. איך הופכים סיפור לתרגיל חשבון.',
    date: '05/03/2026',
    readTime: '5 דקות',
    category: 'tips',
    categoryLabel: 'טיפים ושיטות לימוד',
    image: '/blog/word-problems-strategies.webp',
    tags: ['בעיות מילוליות', 'אסטרטגיה'],
    author: 'צוות דפי עבודה חכמים',
    lastModified: '2026-01-17',
    content: '<p>1. קראו את כל השאלה. 2. הקיפו את המספרים ומילי המפתח. 3. ציירו את הבעיה.</p>'
  },
  {
    slug: 'metric-system-guide',
    title: 'מילימטר, סנטימטר, מטר - עושים סדר',
    excerpt: 'המדריך המלא להמרת מידות אורך לילדים.',
    date: '08/03/2026',
    readTime: '4 דקות',
    category: 'curriculum',
    categoryLabel: 'תוכנית הלימודים',
    image: '/blog/metric-system-guide.webp',
    tags: ['מדידות', 'המרות'],
    author: 'צוות דפי עבודה חכמים',
    lastModified: '2026-01-17',
    content: '<p>זכרו את השיטה העשרונית. 10 מ"מ = 1 ס"מ. 100 ס"מ = 1 מטר. תרגלו ב<a href="/units">מחולל ההמרות</a>.</p>'
  }

  // Note: In a real production environment, we would fetch 50+ items from a CMS.
  // This array serves as a robust static example covering the requested categories.
];
