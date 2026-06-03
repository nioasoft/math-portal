import type { GameMeta } from './types';
import { BASE_URL, getLocalizedUrl } from '@/lib/seo';
import type { Locale } from '@/i18n/config';

export const topicPracticePath: Record<string, string> = {
  arithmetic: '/worksheet/math',
  fractions: '/fractions',
  geometry: '/geometry',
  units: '/units',
  percentage: '/percentage',
  decimals: '/decimals',
  ratio: '/ratio',
  series: '/series',
  wordProblems: '/word-problems',
  misc: '/play',
};

const localizedCopy = {
  he: {
    gameType: 'משחק מתמטיקה תלת-ממדי',
    grades: 'מתאים לכיתות {from}-{to}',
    practiceTitle: 'מה מתרגלים במשחק',
    parentTitle: 'איך להשתמש בבית או בכיתה',
    relatedTitle: 'תרגול קשור',
    relatedWorksheet: 'דפי עבודה ותרגול בנושא',
    relatedGames: 'משחקים נוספים באותו נושא',
    faqTitle: 'שאלות נפוצות',
    faqGameQuestion: 'למי המשחק מתאים?',
    faqGameAnswer: 'המשחק מתאים לתלמידים בכיתות {from}-{to} שרוצים לתרגל {topic} בצורה אינטראקטיבית.',
    faqCostQuestion: 'האם המשחק בחינם?',
    faqCostAnswer: 'כן. אפשר לשחק ולתרגל באתר ללא הרשמה.',
    faqUseQuestion: 'איך כדאי לתרגל?',
    faqUseAnswer: 'כדאי להתחיל במצב תרגול, לפתור כמה סיבובים בקצב רגוע, ואז לעבור לחידון קצר לבדיקה עצמית.',
    skillPrefix: 'המשחק מחזק הבנה של',
    classroomUse: 'אפשר לשחק לבד, בזוגות או כהדגמה קצרה לפני דף עבודה בנושא.',
    playCta: 'התחילו במשחק למעלה, ואז המשיכו לתרגול כתוב כדי לבסס את המיומנות.',
  },
  en: {
    gameType: '3D math game',
    grades: 'Best for grades {from}-{to}',
    practiceTitle: 'What students practice',
    parentTitle: 'How to use it at home or in class',
    relatedTitle: 'Related practice',
    relatedWorksheet: 'Worksheets and practice for this topic',
    relatedGames: 'More games in this topic',
    faqTitle: 'Common questions',
    faqGameQuestion: 'Who is this game for?',
    faqGameAnswer: 'This game is designed for grades {from}-{to} students who want to practice {topic} interactively.',
    faqCostQuestion: 'Is the game free?',
    faqCostAnswer: 'Yes. Students can play and practice on the site without signing up.',
    faqUseQuestion: 'What is the best way to practice?',
    faqUseAnswer: 'Start with Practice mode, solve a few rounds slowly, then switch to a short Quiz for self-checking.',
    skillPrefix: 'The game builds understanding of',
    classroomUse: 'Use it for individual practice, paired work, or a short class demonstration before worksheets.',
    playCta: 'Start with the game above, then continue with written practice to reinforce the skill.',
  },
  ar: {
    gameType: 'لعبة رياضيات ثلاثية الأبعاد',
    grades: 'مناسبة للصفوف {from}-{to}',
    practiceTitle: 'ما الذي يتدرب عليه الطلاب',
    parentTitle: 'كيف نستخدمها في البيت أو الصف',
    relatedTitle: 'تدريب مرتبط',
    relatedWorksheet: 'أوراق عمل وتدريبات لهذا الموضوع',
    relatedGames: 'ألعاب أخرى في الموضوع نفسه',
    faqTitle: 'أسئلة شائعة',
    faqGameQuestion: 'لمن تناسب هذه اللعبة؟',
    faqGameAnswer: 'اللعبة مناسبة لطلاب الصفوف {from}-{to} الذين يريدون تدريب {topic} بطريقة تفاعلية.',
    faqCostQuestion: 'هل اللعبة مجانية؟',
    faqCostAnswer: 'نعم. يمكن اللعب والتدرب في الموقع بدون تسجيل.',
    faqUseQuestion: 'كيف يُفضّل التدريب؟',
    faqUseAnswer: 'ابدأوا بوضع التدريب، حلوا عدة جولات بهدوء، ثم انتقلوا إلى اختبار قصير للتقييم الذاتي.',
    skillPrefix: 'تساعد اللعبة على فهم',
    classroomUse: 'يمكن استخدامها للتدريب الفردي، العمل الثنائي، أو كتمهيد قصير قبل ورقة عمل.',
    playCta: 'ابدأوا باللعبة في الأعلى، ثم تابعوا بتدريب كتابي لترسيخ المهارة.',
  },
  de: {
    gameType: '3D-Mathe-Spiel',
    grades: 'Geeignet für Klassen {from}-{to}',
    practiceTitle: 'Was geübt wird',
    parentTitle: 'Einsatz zu Hause oder im Unterricht',
    relatedTitle: 'Passende Übungen',
    relatedWorksheet: 'Arbeitsblätter und Übungen zu diesem Thema',
    relatedGames: 'Weitere Spiele zu diesem Thema',
    faqTitle: 'Häufige Fragen',
    faqGameQuestion: 'Für wen ist dieses Spiel geeignet?',
    faqGameAnswer: 'Das Spiel eignet sich für Lernende der Klassen {from}-{to}, die {topic} interaktiv üben möchten.',
    faqCostQuestion: 'Ist das Spiel kostenlos?',
    faqCostAnswer: 'Ja. Das Spiel kann ohne Anmeldung kostenlos genutzt werden.',
    faqUseQuestion: 'Wie übt man am besten?',
    faqUseAnswer: 'Beginnen Sie mit dem Übungsmodus, lösen Sie einige Runden in Ruhe und wechseln Sie dann zu einem kurzen Quiz.',
    skillPrefix: 'Das Spiel stärkt das Verständnis von',
    classroomUse: 'Es eignet sich für Einzelarbeit, Partnerarbeit oder eine kurze Einführung vor einem Arbeitsblatt.',
    playCta: 'Starten Sie mit dem Spiel oben und festigen Sie die Fähigkeit anschließend mit schriftlichen Übungen.',
  },
  es: {
    gameType: 'Juego de matemáticas en 3D',
    grades: 'Recomendado para grados {from}-{to}',
    practiceTitle: 'Qué practican los estudiantes',
    parentTitle: 'Cómo usarlo en casa o en clase',
    relatedTitle: 'Práctica relacionada',
    relatedWorksheet: 'Hojas de trabajo y práctica de este tema',
    relatedGames: 'Más juegos de este tema',
    faqTitle: 'Preguntas frecuentes',
    faqGameQuestion: '¿Para quién es este juego?',
    faqGameAnswer: 'El juego está pensado para estudiantes de grados {from}-{to} que quieren practicar {topic} de forma interactiva.',
    faqCostQuestion: '¿El juego es gratis?',
    faqCostAnswer: 'Sí. Se puede jugar y practicar en el sitio sin registrarse.',
    faqUseQuestion: '¿Cuál es la mejor forma de practicar?',
    faqUseAnswer: 'Empieza con el modo Práctica, resuelve algunas rondas con calma y luego pasa a un Quiz corto.',
    skillPrefix: 'El juego desarrolla la comprensión de',
    classroomUse: 'Puede usarse para práctica individual, trabajo en parejas o una demostración breve antes de una hoja de trabajo.',
    playCta: 'Empieza con el juego de arriba y continúa con práctica escrita para reforzar la habilidad.',
  },
  ru: {
    gameType: '3D-игра по математике',
    grades: 'Подходит для {from}-{to} классов',
    practiceTitle: 'Что тренирует ученик',
    parentTitle: 'Как использовать дома или в классе',
    relatedTitle: 'Связанная практика',
    relatedWorksheet: 'Рабочие листы и задания по этой теме',
    relatedGames: 'Другие игры по этой теме',
    faqTitle: 'Частые вопросы',
    faqGameQuestion: 'Кому подходит эта игра?',
    faqGameAnswer: 'Игра подходит ученикам {from}-{to} классов, которые хотят тренировать {topic} в интерактивной форме.',
    faqCostQuestion: 'Игра бесплатная?',
    faqCostAnswer: 'Да. Играть и тренироваться на сайте можно без регистрации.',
    faqUseQuestion: 'Как лучше заниматься?',
    faqUseAnswer: 'Начните с режима тренировки, решите несколько раундов спокойно, затем перейдите к короткой викторине.',
    skillPrefix: 'Игра развивает понимание темы',
    classroomUse: 'Ее можно использовать для самостоятельной работы, работы в парах или короткой демонстрации перед рабочим листом.',
    playCta: 'Начните с игры выше, затем закрепите навык письменными заданиями.',
  },
} as const;

type SeoLocale = keyof typeof localizedCopy;

export function getGameSeoCopy(locale: string) {
  return localizedCopy[(locale in localizedCopy ? locale : 'en') as SeoLocale];
}

type TopicGuide = { focus: string; method: string; outcome: string };

const topicGuides: Record<SeoLocale, Record<string, TopicGuide>> = {
  he: {
    arithmetic: { focus: 'חישוב, פירוק מספרים, ערך מקום ופעולות בסיסיות.', method: 'התלמיד רואה את הכמות, משנה אותה בידיים ובודק את התוצאה מיד.', outcome: 'כך נבנית הבנה מספרית ולא רק זכירת תשובה.' },
    fractions: { focus: 'שברים כחלק משלם, השוואה בין שברים ומיקום על ציר.', method: 'הייצוג החזותי עוזר לראות מונה, מכנה ושברים שקולים.', outcome: 'המטרה היא להפוך סימון כמו 3/4 לכמות שאפשר להבין.' },
    geometry: { focus: 'צורות, שטח, היקף, זוויות ומבנים תלת-ממדיים.', method: 'המשחק מחבר בין פעולה במרחב לבין מושג גאומטרי מדויק.', outcome: 'התלמיד מתרגל לראות, לבנות ולהסביר את הצורה.' },
    units: { focus: 'מדידה, אורך, נפח, משקל וקריאת סרגלים.', method: 'במקום לנחש, מודדים ומשווים מול סימון ברור.', outcome: 'התרגול מחזק דיוק ותחושת מידה.' },
    percentage: { focus: 'אחוזים כחלק מתוך 100 והשוואה בין כמות לאחוז.', method: 'המילוי החזותי מראה מיד מה המשמעות של 25%, 50% או 75%.', outcome: 'האחוז הופך מתרגיל מופשט ליחס נראה לעין.' },
    decimals: { focus: 'אחדות, עשיריות ומאיות במספרים עשרוניים.', method: 'התלמיד בונה את המספר לפי ספרות ומיקום.', outcome: 'כך קל יותר להבין מה הערך של כל ספרה.' },
    ratio: { focus: 'יחסים ויחסים שקולים בין שתי כמויות.', method: 'שינוי הכמויות מראה איך יחס נשאר זהה גם כשמגדילים אותו.', outcome: 'התרגול מחזק חשיבה פרופורציונלית.' },
    series: { focus: 'דפוסים, סדרות וספירת דילוגים.', method: 'התלמיד מזהה חוקיות וממשיך אותה צעד אחר צעד.', outcome: 'היכולת לחזות את האיבר הבא מתחזקת.' },
    wordProblems: { focus: 'הבנת סיפור מתמטי ותרגום שלו לפעולה.', method: 'הייצוג החזותי מפרק את הבעיה לחלקים ברורים.', outcome: 'כך קל יותר לבחור פעולה ולבדוק אם התשובה הגיונית.' },
    misc: { focus: 'מיומנויות מתמטיות מגוונות.', method: 'המשחק נותן דרך קצרה ואינטראקטיבית לתרגל.', outcome: 'המטרה היא ביטחון ודיוק בתרגול.' },
  },
  en: {
    arithmetic: { focus: 'calculation, number composition, place value, and basic operations.', method: 'Students see the quantity, adjust it directly, and check the result immediately.', outcome: 'This builds number sense instead of relying only on memorized answers.' },
    fractions: { focus: 'fractions as parts of a whole, comparison, and placement on a number line.', method: 'The visual model makes numerator, denominator, and equivalent fractions concrete.', outcome: 'A symbol such as 3/4 becomes a quantity students can reason about.' },
    geometry: { focus: 'shapes, area, perimeter, angles, and three-dimensional structures.', method: 'Students connect spatial action with precise geometric language.', outcome: 'They learn to see, build, and explain the shape.' },
    units: { focus: 'measurement, length, volume, weight, and reading scales.', method: 'Students measure and compare against clear marks instead of guessing.', outcome: 'The practice builds accuracy and measurement sense.' },
    percentage: { focus: 'percent as a part out of 100 and the link between amount and percent.', method: 'The visual fill shows what 25%, 50%, or 75% means immediately.', outcome: 'Percent becomes a visible relationship rather than an abstract rule.' },
    decimals: { focus: 'ones, tenths, and hundredths in decimal numbers.', method: 'Students build the number through digits and place value.', outcome: 'Each digit’s value becomes easier to understand.' },
    ratio: { focus: 'ratios and equivalent ratios between two quantities.', method: 'Changing the amounts shows how a ratio can stay the same when scaled.', outcome: 'The activity strengthens proportional reasoning.' },
    series: { focus: 'patterns, sequences, and skip counting.', method: 'Students identify the rule and extend it step by step.', outcome: 'Predicting the next term becomes more fluent.' },
    wordProblems: { focus: 'understanding a math story and translating it into an operation.', method: 'The visual model breaks the problem into clear parts.', outcome: 'Students choose an operation and check whether the answer makes sense.' },
    misc: { focus: 'a mix of useful math skills.', method: 'The game gives a short interactive way to practice.', outcome: 'The goal is confidence and accuracy.' },
  },
  ar: {
    arithmetic: { focus: 'الحساب، تركيب الأعداد، القيمة المكانية والعمليات الأساسية.', method: 'يرى الطالب الكمية ويغيّرها مباشرة ثم يفحص النتيجة فورًا.', outcome: 'هذا يبني الحس العددي بدل حفظ الإجابات فقط.' },
    fractions: { focus: 'الكسور كجزء من كل، المقارنة، والتمثيل على خط الأعداد.', method: 'النموذج البصري يجعل البسط والمقام والكسور المتكافئة أوضح.', outcome: 'يتحول الكسر مثل 3/4 إلى كمية يمكن فهمها.' },
    geometry: { focus: 'الأشكال، المساحة، المحيط، الزوايا والمجسمات.', method: 'يربط الطالب بين الحركة في الفراغ والمفهوم الهندسي الدقيق.', outcome: 'يتعلم أن يرى الشكل ويبنيه ويشرحه.' },
    units: { focus: 'القياس، الطول، الحجم، الوزن وقراءة المقاييس.', method: 'يتدرب الطالب على القياس والمقارنة بدل التخمين.', outcome: 'يقوي التدريب الدقة والإحساس بالمقادير.' },
    percentage: { focus: 'النسبة المئوية كجزء من 100 والعلاقة بين الكمية والنسبة.', method: 'يعرض الملء البصري معنى 25% أو 50% أو 75% فورًا.', outcome: 'تصبح النسبة علاقة مرئية لا قاعدة مجردة.' },
    decimals: { focus: 'الآحاد والأعشار والمئات في الأعداد العشرية.', method: 'يبني الطالب العدد حسب الأرقام والقيمة المكانية.', outcome: 'تصبح قيمة كل رقم أوضح.' },
    ratio: { focus: 'النسب والنسب المتكافئة بين كميتين.', method: 'تغيير الكميات يوضح كيف تبقى النسبة ثابتة عند التكبير.', outcome: 'يقوي النشاط التفكير التناسبي.' },
    series: { focus: 'الأنماط والمتتاليات والعد بالقفز.', method: 'يحدد الطالب القاعدة ويكملها خطوة بخطوة.', outcome: 'تتحسن القدرة على توقع الحد التالي.' },
    wordProblems: { focus: 'فهم قصة رياضية وتحويلها إلى عملية.', method: 'النموذج البصري يقسم المسألة إلى أجزاء واضحة.', outcome: 'يسهل اختيار العملية وفحص منطقية الإجابة.' },
    misc: { focus: 'مهارات رياضية متنوعة.', method: 'تقدم اللعبة طريقة قصيرة وتفاعلية للتدريب.', outcome: 'الهدف هو الثقة والدقة.' },
  },
  de: {
    arithmetic: { focus: 'Rechnen, Zahlzerlegung, Stellenwert und Grundoperationen.', method: 'Lernende sehen die Menge, verändern sie direkt und prüfen das Ergebnis sofort.', outcome: 'So entsteht Zahlverständnis statt nur auswendig gelernter Antworten.' },
    fractions: { focus: 'Brüche als Teile eines Ganzen, Vergleichen und Einordnen am Zahlenstrahl.', method: 'Das visuelle Modell macht Zähler, Nenner und gleichwertige Brüche greifbar.', outcome: 'Ein Ausdruck wie 3/4 wird zu einer verständlichen Menge.' },
    geometry: { focus: 'Formen, Fläche, Umfang, Winkel und räumliche Körper.', method: 'Räumliches Handeln wird mit präziser geometrischer Sprache verbunden.', outcome: 'Lernende sehen, bauen und erklären Formen bewusster.' },
    units: { focus: 'Messen, Länge, Volumen, Gewicht und Skalen lesen.', method: 'Es wird gemessen und verglichen statt geraten.', outcome: 'Das stärkt Genauigkeit und Größenvorstellung.' },
    percentage: { focus: 'Prozent als Anteil von 100 und die Verbindung zwischen Menge und Prozentwert.', method: 'Die visuelle Füllung zeigt sofort, was 25%, 50% oder 75% bedeutet.', outcome: 'Prozent wird als sichtbares Verhältnis verständlich.' },
    decimals: { focus: 'Einer, Zehntel und Hundertstel in Dezimalzahlen.', method: 'Die Zahl wird über Ziffern und Stellenwert aufgebaut.', outcome: 'Der Wert jeder Stelle wird klarer.' },
    ratio: { focus: 'Verhältnisse und gleichwertige Verhältnisse zwischen zwei Mengen.', method: 'Beim Verändern der Mengen bleibt das Verhältnis sichtbar erhalten.', outcome: 'Das fördert proportionales Denken.' },
    series: { focus: 'Muster, Folgen und Zählschritte.', method: 'Die Regel wird erkannt und Schritt für Schritt fortgesetzt.', outcome: 'Das Vorhersagen des nächsten Glieds wird sicherer.' },
    wordProblems: { focus: 'Eine mathematische Geschichte verstehen und in eine Operation übersetzen.', method: 'Das Modell zerlegt die Aufgabe in klare Teile.', outcome: 'Die passende Operation und die Plausibilität der Antwort werden leichter erkennbar.' },
    misc: { focus: 'verschiedene mathematische Fähigkeiten.', method: 'Das Spiel bietet eine kurze interaktive Übung.', outcome: 'Ziel sind Sicherheit und Genauigkeit.' },
  },
  es: {
    arithmetic: { focus: 'cálculo, composición de números, valor posicional y operaciones básicas.', method: 'El estudiante ve la cantidad, la ajusta directamente y comprueba el resultado al instante.', outcome: 'Así desarrolla sentido numérico, no solo memoria.' },
    fractions: { focus: 'fracciones como partes de un todo, comparación y ubicación en la recta numérica.', method: 'El modelo visual concreta numerador, denominador y fracciones equivalentes.', outcome: 'Un símbolo como 3/4 se convierte en una cantidad razonable.' },
    geometry: { focus: 'figuras, área, perímetro, ángulos y cuerpos tridimensionales.', method: 'La acción espacial se conecta con vocabulario geométrico preciso.', outcome: 'El estudiante aprende a ver, construir y explicar la figura.' },
    units: { focus: 'medición, longitud, volumen, peso y lectura de escalas.', method: 'Se mide y compara con marcas claras en lugar de adivinar.', outcome: 'La práctica fortalece precisión y sentido de medida.' },
    percentage: { focus: 'porcentaje como parte de 100 y relación entre cantidad y porcentaje.', method: 'El llenado visual muestra enseguida qué significa 25%, 50% o 75%.', outcome: 'El porcentaje deja de ser una regla abstracta.' },
    decimals: { focus: 'unidades, décimas y centésimas en números decimales.', method: 'El número se construye con dígitos y valor posicional.', outcome: 'El valor de cada dígito se entiende con más claridad.' },
    ratio: { focus: 'razones y razones equivalentes entre dos cantidades.', method: 'Cambiar las cantidades muestra cómo una razón puede conservarse al escalar.', outcome: 'La actividad fortalece el razonamiento proporcional.' },
    series: { focus: 'patrones, secuencias y conteo por saltos.', method: 'El estudiante identifica la regla y la continúa paso a paso.', outcome: 'Mejora la capacidad de predecir el siguiente término.' },
    wordProblems: { focus: 'comprender una historia matemática y convertirla en una operación.', method: 'El modelo visual divide el problema en partes claras.', outcome: 'Es más fácil elegir la operación y comprobar si la respuesta tiene sentido.' },
    misc: { focus: 'habilidades matemáticas variadas.', method: 'El juego ofrece una práctica breve e interactiva.', outcome: 'El objetivo es confianza y precisión.' },
  },
  ru: {
    arithmetic: { focus: 'вычисления, состав числа, разрядный состав и базовые действия.', method: 'Ученик видит количество, меняет его напрямую и сразу проверяет результат.', outcome: 'Так развивается числовое понимание, а не только память.' },
    fractions: { focus: 'дроби как части целого, сравнение и размещение на числовой прямой.', method: 'Визуальная модель делает числитель, знаменатель и равные дроби понятными.', outcome: 'Запись вроде 3/4 становится осмысленным количеством.' },
    geometry: { focus: 'фигуры, площадь, периметр, углы и пространственные тела.', method: 'Действие в пространстве связывается с точным геометрическим понятием.', outcome: 'Ученик учится видеть, строить и объяснять фигуру.' },
    units: { focus: 'измерение, длина, объем, вес и чтение шкал.', method: 'Ученик измеряет и сравнивает по ясным отметкам, а не угадывает.', outcome: 'Тренируются точность и чувство меры.' },
    percentage: { focus: 'процент как часть от 100 и связь между количеством и процентом.', method: 'Визуальное заполнение сразу показывает смысл 25%, 50% или 75%.', outcome: 'Процент становится видимым отношением, а не абстрактным правилом.' },
    decimals: { focus: 'единицы, десятые и сотые в десятичных числах.', method: 'Ученик собирает число через цифры и разряды.', outcome: 'Значение каждой цифры становится понятнее.' },
    ratio: { focus: 'отношения и равные отношения между двумя величинами.', method: 'Изменение величин показывает, как отношение сохраняется при масштабировании.', outcome: 'Укрепляется пропорциональное мышление.' },
    series: { focus: 'закономерности, последовательности и счет с шагом.', method: 'Ученик находит правило и продолжает его шаг за шагом.', outcome: 'Становится легче предсказывать следующий элемент.' },
    wordProblems: { focus: 'понимание математического сюжета и перевод его в действие.', method: 'Визуальная модель делит задачу на понятные части.', outcome: 'Проще выбрать действие и проверить разумность ответа.' },
    misc: { focus: 'разные математические навыки.', method: 'Игра дает короткую интерактивную тренировку.', outcome: 'Цель — уверенность и точность.' },
  },
};

export function getTopicSeoGuide(locale: string, topic: string): TopicGuide {
  const seoLocale = (locale in topicGuides ? locale : 'en') as SeoLocale;
  return topicGuides[seoLocale][topic] ?? topicGuides[seoLocale].misc;
}

const gameSpecificGuides: Record<string, Record<SeoLocale, string>> = {
  'multiplication-array': {
    he: 'במשחק הזה התלמיד בונה מערך שורות ועמודות, ולכן רואה שכפל הוא ארגון של קבוצות שוות ולא רק תרגיל בעל פה.',
    en: 'In this game, students build rows and columns, so multiplication becomes an arrangement of equal groups rather than a fact to recite.',
    ar: 'في هذه اللعبة يبني الطالب صفوفًا وأعمدة، فيرى أن الضرب هو تنظيم لمجموعات متساوية وليس مجرد حقيقة محفوظة.',
    de: 'In diesem Spiel bauen Lernende Reihen und Spalten, sodass Multiplikation als Anordnung gleicher Gruppen sichtbar wird.',
    es: 'En este juego, el estudiante construye filas y columnas, por lo que la multiplicación se ve como grupos iguales organizados.',
    ru: 'В этой игре ученик строит ряды и столбцы, поэтому умножение становится расположением равных групп, а не только фактом на память.',
  },
  'measure-fill': {
    he: 'הילד ממלא מיכל עד סימון מדויק ולומד לקשר בין נפח מספרי לבין גובה נראה לעין.',
    en: 'Students fill a container to an exact mark and connect a numeric volume with a visible liquid level.',
    ar: 'يملأ الطالب الوعاء حتى علامة دقيقة ويربط بين الحجم العددي ومستوى السائل المرئي.',
    de: 'Lernende füllen einen Behälter bis zu einer genauen Markierung und verbinden Volumen mit einem sichtbaren Füllstand.',
    es: 'El estudiante llena un recipiente hasta una marca exacta y relaciona el volumen numérico con un nivel visible.',
    ru: 'Ученик наполняет емкость до точной отметки и связывает числовой объем с видимым уровнем жидкости.',
  },
  'fraction-build': {
    he: 'התלמיד מסמן פרוסות מתוך שלם ורואה איך המונה והמכנה קובעים את גודל החלק המבוקש.',
    en: 'Students shade slices of a whole and see how numerator and denominator define the requested part.',
    ar: 'يظلل الطالب أجزاء من الكل ويرى كيف يحدد البسط والمقام الجزء المطلوب.',
    de: 'Lernende markieren Teile eines Ganzen und sehen, wie Zähler und Nenner den gesuchten Anteil bestimmen.',
    es: 'El estudiante marca partes de un todo y ve cómo numerador y denominador definen la parte pedida.',
    ru: 'Ученик закрашивает части целого и видит, как числитель и знаменатель задают нужную долю.',
  },
  'area-perimeter': {
    he: 'שינוי רוחב וגובה הגינה ממחיש את ההבדל בין שטח שממלאים לבין היקף שמקיף את הצורה.',
    en: 'Changing the garden’s width and height clarifies the difference between area inside a shape and perimeter around it.',
    ar: 'تغيير عرض الحديقة وارتفاعها يوضح الفرق بين المساحة داخل الشكل والمحيط حوله.',
    de: 'Das Verändern von Breite und Höhe zeigt den Unterschied zwischen Fläche im Inneren und Umfang außen herum.',
    es: 'Cambiar el ancho y la altura del jardín aclara la diferencia entre área interior y perímetro exterior.',
    ru: 'Изменение ширины и высоты сада показывает разницу между площадью внутри фигуры и периметром вокруг нее.',
  },
  'ten-frame-fill': {
    he: 'מסגרת העשר עוזרת לראות מספרים קטנים כקבוצות מסודרות, בסיס חשוב לחיבור ולחיסור בראש.',
    en: 'The ten-frame helps students see small numbers as organized groups, a foundation for mental addition and subtraction.',
    ar: 'يساعد إطار العشرة الطالب على رؤية الأعداد الصغيرة كمجموعات منظمة، وهو أساس للحساب الذهني.',
    de: 'Der Zehnerrahmen zeigt kleine Zahlen als geordnete Gruppen und unterstützt Kopfrechnen bei Addition und Subtraktion.',
    es: 'El marco de diez ayuda a ver números pequeños como grupos ordenados, base para sumar y restar mentalmente.',
    ru: 'Десятичная рамка помогает видеть маленькие числа как упорядоченные группы, что важно для устного сложения и вычитания.',
  },
  'place-value-builder': {
    he: 'בניית מאות, עשרות ואחדות הופכת ערך מקום למבנה מוחשי שהתלמיד יכול לפרק ולחבר מחדש.',
    en: 'Building hundreds, tens, and ones turns place value into a concrete structure students can compose and decompose.',
    ar: 'بناء المئات والعشرات والآحاد يجعل القيمة المكانية بنية ملموسة يمكن تركيبها وتفكيكها.',
    de: 'Hunderter, Zehner und Einer machen Stellenwert zu einer greifbaren Struktur, die zerlegt und aufgebaut werden kann.',
    es: 'Construir centenas, decenas y unidades convierte el valor posicional en una estructura concreta.',
    ru: 'Построение сотен, десятков и единиц превращает разрядный состав в наглядную структуру.',
  },
  'clock-builder': {
    he: 'כיוון מחוגים מחבר בין שעה דיגיטלית לשעון אנלוגי ומחזק הבנה של שעות ודקות.',
    en: 'Setting the hands links digital time with an analog clock and strengthens understanding of hours and minutes.',
    ar: 'تحريك العقارب يربط الوقت الرقمي بالساعة التناظرية ويقوي فهم الساعات والدقائق.',
    de: 'Das Einstellen der Zeiger verbindet digitale Zeit mit der analogen Uhr und stärkt das Verständnis von Stunden und Minuten.',
    es: 'Ajustar las manecillas conecta la hora digital con el reloj analógico y refuerza horas y minutos.',
    ru: 'Настройка стрелок связывает цифровое время с аналоговыми часами и укрепляет понимание часов и минут.',
  },
  'fraction-number-line': {
    he: 'הצבת שבר על ציר מספרים מדגישה ששבר הוא גם נקודה בעלת ערך, לא רק חלק מציור.',
    en: 'Placing a fraction on a number line shows that a fraction is also a value, not only a shaded part of a picture.',
    ar: 'وضع الكسر على خط الأعداد يوضح أن الكسر قيمة أيضًا، وليس فقط جزءًا مظللًا من شكل.',
    de: 'Ein Bruch auf dem Zahlenstrahl zeigt, dass ein Bruch auch ein Wert ist, nicht nur ein Teil einer Zeichnung.',
    es: 'Ubicar una fracción en la recta muestra que también es un valor, no solo una parte sombreada.',
    ru: 'Размещение дроби на числовой прямой показывает, что дробь является значением, а не только частью рисунка.',
  },
  'algebra-balance': {
    he: 'המאזניים מציגים פתרון משוואה כפעולה שווה בשני הצדדים עד שהנעלם נשאר לבד.',
    en: 'The balance model presents equation solving as doing the same action on both sides until the unknown stands alone.',
    ar: 'يعرض الميزان حل المعادلة كتنفيذ العملية نفسها في الجانبين حتى يبقى المجهول وحده.',
    de: 'Das Waagemodell zeigt Gleichungen als gleiche Handlung auf beiden Seiten, bis die Unbekannte allein steht.',
    es: 'La balanza muestra que resolver una ecuación es hacer lo mismo en ambos lados hasta aislar la incógnita.',
    ru: 'Модель весов показывает решение уравнения как одинаковое действие с обеих сторон до изоляции неизвестного.',
  },
  'money-shop': {
    he: 'תשלום מדויק במטבעות ושטרות מחזק ספירה בדילוגים, פירוק סכומים וקבלת החלטות כספיות פשוטות.',
    en: 'Paying exact amounts with coins and bills builds skip counting, amount decomposition, and simple money decisions.',
    ar: 'الدفع الدقيق بالعملات والأوراق يقوي العد بالقفز وتفكيك المبالغ واتخاذ قرارات مالية بسيطة.',
    de: 'Exaktes Bezahlen mit Münzen und Scheinen trainiert Zählschritte, Zerlegen von Beträgen und einfache Geldentscheidungen.',
    es: 'Pagar cantidades exactas con monedas y billetes refuerza conteo por saltos y descomposición de cantidades.',
    ru: 'Точная оплата монетами и купюрами развивает счет с шагом, разложение суммы и простые денежные решения.',
  },
  'addition-mine': {
    he: 'העברת עשרות ומאות במכרה הופכת נשיאה בחיבור לתנועה נראית בין עמודות.',
    en: 'Carrying tens and hundreds in the mine turns regrouping in addition into visible movement between columns.',
    ar: 'نقل العشرات والمئات في المنجم يجعل إعادة التجميع في الجمع حركة مرئية بين الخانات.',
    de: 'Das Übertragen von Zehnern und Hundertern macht Bündeln beim Addieren als Bewegung zwischen Stellen sichtbar.',
    es: 'Llevar decenas y centenas en la mina convierte el reagrupamiento de la suma en un movimiento visible.',
    ru: 'Перенос десятков и сотен в шахте делает перегруппировку при сложении видимым движением между разрядами.',
  },
  'volume-cube-fill': {
    he: 'בניית תיבה מקוביות יחידה מראה שנפח הוא מספר הקוביות שממלאות אורך, רוחב וגובה.',
    en: 'Building a box from unit cubes shows that volume counts cubes across length, width, and height.',
    ar: 'بناء صندوق من مكعبات وحدة يوضح أن الحجم هو عدد المكعبات عبر الطول والعرض والارتفاع.',
    de: 'Ein Körper aus Einheitswürfeln zeigt Volumen als Anzahl der Würfel in Länge, Breite und Höhe.',
    es: 'Construir una caja con cubos unitarios muestra que el volumen cuenta cubos en largo, ancho y alto.',
    ru: 'Построение коробки из единичных кубов показывает объем как число кубиков по длине, ширине и высоте.',
  },
  'ruler-measure': {
    he: 'מדידה בין שני קצוות, גם כשהעצם לא מתחיל באפס, מחזקת קריאה אמיתית של סרגל.',
    en: 'Measuring between two endpoints, even when the object does not start at zero, builds real ruler-reading skill.',
    ar: 'القياس بين طرفين، حتى عندما لا يبدأ الجسم من الصفر، يقوي قراءة المسطرة الحقيقية.',
    de: 'Messen zwischen zwei Endpunkten, auch ohne Start bei null, stärkt echtes Linealverständnis.',
    es: 'Medir entre dos extremos, incluso si el objeto no empieza en cero, desarrolla lectura real de regla.',
    ru: 'Измерение между двумя концами, даже когда предмет не начинается с нуля, развивает настоящее чтение линейки.',
  },
  'decimal-place-value': {
    he: 'מילוי אחדות, עשיריות ומאיות מדגיש את הערך של כל ספרה במספר עשרוני.',
    en: 'Filling ones, tenths, and hundredths highlights the value of each digit in a decimal number.',
    ar: 'ملء الآحاد والأعشار والمئات يبرز قيمة كل رقم في العدد العشري.',
    de: 'Einer, Zehntel und Hundertstel hervorzuheben zeigt den Wert jeder Ziffer in einer Dezimalzahl.',
    es: 'Llenar unidades, décimas y centésimas resalta el valor de cada dígito decimal.',
    ru: 'Заполнение единиц, десятых и сотых подчеркивает значение каждой цифры в десятичном числе.',
  },
  'number-bond-split': {
    he: 'פירוק מספר לשני חלקים מאפשר לראות שיש כמה דרכים נכונות להרכיב אותו שלם.',
    en: 'Splitting a number into two parts shows that one whole can be composed in several correct ways.',
    ar: 'تفكيك العدد إلى جزأين يوضح أن الكل يمكن تركيبه بعدة طرق صحيحة.',
    de: 'Das Zerlegen einer Zahl in zwei Teile zeigt, dass ein Ganzes auf mehrere richtige Arten entstehen kann.',
    es: 'Dividir un número en dos partes muestra que un todo puede componerse de varias maneras correctas.',
    ru: 'Разложение числа на две части показывает, что целое можно составить несколькими правильными способами.',
  },
  'number-line-jump': {
    he: 'קפיצות קדימה ואחורה על ציר המספרים מחזקות מרחק, כיוון והפרש בין מספרים.',
    en: 'Jumping forward and backward on the number line strengthens distance, direction, and differences between numbers.',
    ar: 'القفز للأمام والخلف على خط الأعداد يقوي فهم المسافة والاتجاه والفرق بين الأعداد.',
    de: 'Vorwärts- und Rückwärtssprünge auf dem Zahlenstrahl stärken Abstand, Richtung und Differenzen.',
    es: 'Saltar hacia adelante y atrás en la recta refuerza distancia, dirección y diferencia entre números.',
    ru: 'Прыжки вперед и назад по числовой прямой укрепляют понимание расстояния, направления и разности чисел.',
  },
  'exploding-dots': {
    he: 'נקודות שמתפוצצות לעמודה הבאה ממחישות את בסיס עשר ואת רעיון ההמרה בין אחדות לעשרות.',
    en: 'Dots that explode into the next column make base-ten regrouping and exchange between ones and tens visible.',
    ar: 'النقاط التي تنتقل إلى الخانة التالية توضح نظام العشرة والتحويل بين الآحاد والعشرات.',
    de: 'Punkte, die in die nächste Stelle wechseln, machen das Dezimalsystem und den Tausch zwischen Einern und Zehnern sichtbar.',
    es: 'Los puntos que explotan hacia la siguiente columna hacen visible el sistema decimal y el cambio entre unidades y decenas.',
    ru: 'Точки, переходящие в следующий разряд, показывают десятичную систему и обмен единиц на десятки.',
  },
  'balance-scale-equations': {
    he: 'איזון משקולות מפתח הבנה של שוויון: שני צדדים יכולים להיראות שונים ועדיין להיות שווים בערך.',
    en: 'Balancing weights develops equality: two sides can look different and still have the same value.',
    ar: 'موازنة الأوزان تطور فهم المساواة: قد يختلف الجانبان في الشكل ويملكان القيمة نفسها.',
    de: 'Das Ausbalancieren von Gewichten zeigt Gleichheit: Zwei Seiten können verschieden aussehen und denselben Wert haben.',
    es: 'Equilibrar pesos desarrolla la idea de igualdad: dos lados pueden verse distintos y valer lo mismo.',
    ru: 'Балансировка гирь развивает понимание равенства: стороны могут выглядеть по-разному, но иметь одно значение.',
  },
  'factris-blocks': {
    he: 'סידור קוביות למדף מלא מחבר בין גורמים, מלבנים ודרך חזותית לראות מכפלה.',
    en: 'Arranging blocks to fill a shelf connects factors, rectangles, and a visual view of multiplication.',
    ar: 'ترتيب المكعبات لملء الرف يربط بين العوامل والمستطيلات ورؤية الضرب بصريًا.',
    de: 'Blöcke passend ins Regal zu legen verbindet Faktoren, Rechtecke und eine visuelle Sicht auf Multiplikation.',
    es: 'Ordenar bloques para llenar el estante conecta factores, rectángulos y una vista visual de la multiplicación.',
    ru: 'Размещение блоков на полке связывает множители, прямоугольники и наглядное представление умножения.',
  },
  'subtraction-bridge': {
    he: 'פירוק גשר בזמן חיסור מראה כיצד פריטה מעמודה גבוהה עוזרת כשאין מספיק אחדות או עשרות.',
    en: 'Taking apart the bridge during subtraction shows how borrowing from a higher place helps when a column is short.',
    ar: 'تفكيك الجسر أثناء الطرح يوضح كيف يساعد الاستلاف من خانة أعلى عندما لا تكفي الخانة الحالية.',
    de: 'Das Zerlegen der Brücke beim Subtrahieren zeigt, wie Entbündeln aus einer höheren Stelle hilft.',
    es: 'Desarmar el puente al restar muestra cómo pedir prestado de una posición mayor ayuda cuando falta cantidad.',
    ru: 'Разбор моста при вычитании показывает, как заем из старшего разряда помогает, когда в разряде не хватает единиц.',
  },
  'skip-count-track': {
    he: 'סימון דילוגים במסלול הופך כפולות לרצף נראה ומחזק הכנה ללוח הכפל.',
    en: 'Marking skips on the track turns multiples into a visible sequence and prepares students for multiplication facts.',
    ar: 'تحديد القفزات على المسار يحول المضاعفات إلى تسلسل مرئي ويمهد لجداول الضرب.',
    de: 'Sprünge auf der Strecke machen Vielfache als sichtbare Folge erkennbar und bereiten das Einmaleins vor.',
    es: 'Marcar saltos en la pista convierte los múltiplos en una secuencia visible y prepara las tablas de multiplicar.',
    ru: 'Отметки прыжков на дорожке превращают кратные числа в видимую последовательность и готовят к таблице умножения.',
  },
  'weight-balance': {
    he: 'איזון פרי במשקולות גרם מחבר בין חיבור כמויות לבין תחושת משקל אמיתית.',
    en: 'Balancing fruit with gram weights connects adding quantities with a concrete sense of weight.',
    ar: 'موازنة الفاكهة بأوزان الغرام تربط جمع الكميات بإحساس ملموس بالوزن.',
    de: 'Obst mit Grammgewichten auszugleichen verbindet Addieren von Mengen mit konkretem Gewichtssinn.',
    es: 'Equilibrar fruta con pesos en gramos conecta sumar cantidades con una sensación concreta de peso.',
    ru: 'Балансировка фруктов граммовыми гирями связывает сложение величин с конкретным ощущением веса.',
  },
  'percent-bar': {
    he: 'מילוי יציע עד אחוז מסוים מציג אחוזים כחלק מוחשי מתוך מאה.',
    en: 'Filling the stand to a target percent shows percent as a concrete part out of one hundred.',
    ar: 'ملء المدرج حتى نسبة معينة يوضح النسبة المئوية كجزء ملموس من مئة.',
    de: 'Das Füllen der Tribüne bis zu einem Prozentwert zeigt Prozent als konkreten Anteil von hundert.',
    es: 'Llenar la grada hasta un porcentaje muestra el porcentaje como parte concreta de cien.',
    ru: 'Заполнение трибуны до заданного процента показывает процент как конкретную часть из ста.',
  },
  'ratio-mixer': {
    he: 'ערבוב שני מיצים ביחס נכון מדגים שיחסים שקולים יכולים להשתמש בכמויות שונות.',
    en: 'Mixing two juices to the target ratio shows that equivalent ratios can use different amounts.',
    ar: 'خلط عصيرين بالنسبة المطلوبة يوضح أن النسب المتكافئة قد تستخدم كميات مختلفة.',
    de: 'Das Mischen zweier Säfte im Zielverhältnis zeigt, dass gleichwertige Verhältnisse verschiedene Mengen haben können.',
    es: 'Mezclar dos jugos con la razón indicada muestra que razones equivalentes pueden usar cantidades distintas.',
    ru: 'Смешивание двух соков в нужном отношении показывает, что равные отношения могут иметь разные количества.',
  },
  'number-sequence': {
    he: 'השלמת סדרה דורשת לזהות חוקיות ולא רק לנחש את המספר הבא.',
    en: 'Completing a sequence requires identifying the rule instead of guessing the next number.',
    ar: 'إكمال المتتالية يتطلب اكتشاف القاعدة بدل تخمين العدد التالي.',
    de: 'Eine Folge zu ergänzen verlangt, die Regel zu erkennen statt die nächste Zahl zu raten.',
    es: 'Completar una secuencia exige identificar la regla, no solo adivinar el siguiente número.',
    ru: 'Продолжение последовательности требует найти правило, а не просто угадать следующее число.',
  },
  'fraction-strip-compare': {
    he: 'השוואת רצועות שברים עוזרת לראות מדוע מכנים שונים יכולים לייצג גדלים קרובים או שווים.',
    en: 'Comparing fraction strips helps students see why different denominators can represent close or equal sizes.',
    ar: 'مقارنة شرائط الكسور تساعد على رؤية كيف قد تمثل المقامات المختلفة أحجامًا متقاربة أو متساوية.',
    de: 'Bruchstreifen zu vergleichen zeigt, warum verschiedene Nenner ähnliche oder gleiche Größen darstellen können.',
    es: 'Comparar tiras de fracciones ayuda a ver por qué denominadores distintos pueden representar tamaños cercanos o iguales.',
    ru: 'Сравнение дробных полос помогает понять, почему разные знаменатели могут давать близкие или равные величины.',
  },
  'angle-builder': {
    he: 'בניית זווית ביד מחזקת אומדן זוויות והבנה של מעלות כסיבוב.',
    en: 'Building an angle by hand strengthens angle estimation and the idea of degrees as rotation.',
    ar: 'بناء الزاوية يدويًا يقوي تقدير الزوايا وفهم الدرجات كدوران.',
    de: 'Einen Winkel selbst zu bauen stärkt Winkelschätzung und das Verständnis von Grad als Drehung.',
    es: 'Construir un ángulo a mano refuerza la estimación y la idea de grados como giro.',
    ru: 'Построение угла вручную развивает оценку углов и понимание градусов как поворота.',
  },
  'division-share': {
    he: 'חלוקה שווה של מטבעות לתיבות ממחישה שחילוק הוא שיתוף הוגן בין קבוצות.',
    en: 'Sharing coins equally into chests shows division as fair sharing between groups.',
    ar: 'تقسيم العملات بالتساوي بين الصناديق يوضح القسمة كتوزيع عادل بين مجموعات.',
    de: 'Münzen gleichmäßig auf Kisten zu verteilen zeigt Division als gerechtes Teilen.',
    es: 'Repartir monedas por igual en cofres muestra la división como reparto justo.',
    ru: 'Равное распределение монет по сундукам показывает деление как справедливое распределение по группам.',
  },
  'bar-graph-builder': {
    he: 'קריאת עמודות בגרף מחזקת השוואה בין נתונים ושאלות “כמה יותר”.',
    en: 'Reading bars in a graph strengthens data comparison and “how many more” reasoning.',
    ar: 'قراءة الأعمدة في الرسم البياني تقوي مقارنة البيانات وأسئلة كم أكثر.',
    de: 'Balken im Diagramm zu lesen stärkt Datenvergleich und Fragen nach dem Unterschied.',
    es: 'Leer barras en un gráfico refuerza la comparación de datos y preguntas de cuánto más.',
    ru: 'Чтение столбцов диаграммы развивает сравнение данных и рассуждения “на сколько больше”.',
  },
  'subitize-dots': {
    he: 'זיהוי מהיר של נקודות מחזק תפיסה כמותית בלי ספירה אחת-אחת.',
    en: 'Quickly recognizing dot patterns builds quantity perception without counting one by one.',
    ar: 'التعرف السريع على أنماط النقاط يقوي إدراك الكمية دون العد واحدًا واحدًا.',
    de: 'Punktmuster schnell zu erkennen stärkt Mengenerfassung ohne einzelnes Abzählen.',
    es: 'Reconocer patrones de puntos rápidamente desarrolla percepción de cantidad sin contar uno por uno.',
    ru: 'Быстрое распознавание точечных узоров развивает восприятие количества без счета по одному.',
  },
  'array-multiply-slice': {
    he: 'חיתוך מערך כפל עוזר לראות איך אפשר לפרק מכפלה לחלקים נוחים יותר.',
    en: 'Slicing a multiplication array shows how a product can be broken into easier parts.',
    ar: 'تقطيع مصفوفة الضرب يوضح كيف يمكن تفكيك حاصل الضرب إلى أجزاء أسهل.',
    de: 'Ein Multiplikationsfeld zu teilen zeigt, wie ein Produkt in einfachere Teile zerlegt werden kann.',
    es: 'Cortar una matriz de multiplicación muestra cómo descomponer un producto en partes más fáciles.',
    ru: 'Разрезание массива умножения показывает, как разбить произведение на более удобные части.',
  },
  'fraction-slice': {
    he: 'חלוקת עיגול לפרוסות שוות מדגישה שהמכנה קובע את גודל כל חלק.',
    en: 'Dividing a circle into equal slices emphasizes that the denominator determines each part’s size.',
    ar: 'تقسيم الدائرة إلى شرائح متساوية يوضح أن المقام يحدد حجم كل جزء.',
    de: 'Einen Kreis in gleiche Stücke zu teilen zeigt, dass der Nenner die Größe jedes Teils bestimmt.',
    es: 'Dividir un círculo en partes iguales muestra que el denominador determina el tamaño de cada parte.',
    ru: 'Деление круга на равные части показывает, что знаменатель определяет размер каждой части.',
  },
  'pattern-complete': {
    he: 'השלמת דגם חזותי מחזקת זיהוי חוקיות, מחזוריות ותכנון הצעד הבא.',
    en: 'Completing a visual pattern strengthens rule detection, repetition, and planning the next step.',
    ar: 'إكمال النمط البصري يقوي اكتشاف القاعدة والتكرار وتخطيط الخطوة التالية.',
    de: 'Ein Muster zu ergänzen stärkt Regelerkennung, Wiederholung und Planung des nächsten Schritts.',
    es: 'Completar un patrón visual refuerza la detección de reglas, repetición y planificación.',
    ru: 'Завершение визуального узора развивает поиск правила, повторение и планирование следующего шага.',
  },
  'net-fold': {
    he: 'קיפול פריסה לצורה תלת-ממדית מחבר בין ציור שטוח לבין גוף במרחב.',
    en: 'Folding a net into a solid connects a flat drawing with a three-dimensional object.',
    ar: 'طي الشبكة إلى مجسم يربط الرسم المسطح بالجسم ثلاثي الأبعاد.',
    de: 'Ein Netz zu einem Körper zu falten verbindet eine flache Zeichnung mit einem räumlichen Objekt.',
    es: 'Plegar una red para formar un sólido conecta un dibujo plano con un objeto tridimensional.',
    ru: 'Складывание развертки в тело связывает плоский рисунок с трехмерным объектом.',
  },
  'symmetry-mirror': {
    he: 'שיקוף צורות סביב קו סימטריה מחזק דיוק במרחק, כיוון והתאמה.',
    en: 'Reflecting shapes across a symmetry line strengthens precision with distance, direction, and matching.',
    ar: 'عكس الأشكال حول خط التماثل يقوي الدقة في المسافة والاتجاه والمطابقة.',
    de: 'Formen an einer Symmetrieachse zu spiegeln stärkt Genauigkeit bei Abstand, Richtung und Zuordnung.',
    es: 'Reflejar figuras sobre un eje de simetría refuerza distancia, dirección y correspondencia.',
    ru: 'Отражение фигур относительно оси симметрии развивает точность расстояния, направления и соответствия.',
  },
  'hundred-chart-colour': {
    he: 'צביעת לוח מאה עוזרת לזהות כפולות, דפוסים ומיקום מספרים בתוך טבלה.',
    en: 'Coloring a hundred chart helps students notice multiples, patterns, and number positions in a grid.',
    ar: 'تلوين جدول المئة يساعد على ملاحظة المضاعفات والأنماط ومواقع الأعداد.',
    de: 'Das Färben einer Hundertertafel hilft, Vielfache, Muster und Zahlpositionen zu erkennen.',
    es: 'Colorear la tabla del cien ayuda a notar múltiplos, patrones y posiciones de números.',
    ru: 'Раскрашивание сотенной таблицы помогает видеть кратные числа, закономерности и положение чисел.',
  },
  'geoboard-shapes': {
    he: 'בניית צורות על לוח נקודות מחזקת תפיסה של שטח, קודקודים וצלעות.',
    en: 'Building shapes on a geoboard strengthens understanding of area, vertices, and sides.',
    ar: 'بناء الأشكال على لوحة النقاط يقوي فهم المساحة والرؤوس والأضلاع.',
    de: 'Formen auf dem Geobrett zu bauen stärkt Verständnis für Fläche, Ecken und Seiten.',
    es: 'Construir figuras en un geoplano refuerza área, vértices y lados.',
    ru: 'Построение фигур на геодоске укрепляет понимание площади, вершин и сторон.',
  },
  'shape-sort-3d': {
    he: 'מיון גופים תלת-ממדיים לפי תכונות מלמד לזהות צורות מעבר לשם בלבד.',
    en: 'Sorting 3D solids by properties teaches students to identify shapes beyond their names.',
    ar: 'تصنيف المجسمات حسب خصائصها يساعد على التعرف إليها بما يتجاوز الاسم فقط.',
    de: '3D-Körper nach Eigenschaften zu sortieren lehrt, Formen über den Namen hinaus zu erkennen.',
    es: 'Clasificar sólidos 3D por propiedades enseña a reconocer formas más allá del nombre.',
    ru: 'Сортировка объемных тел по свойствам учит распознавать фигуры не только по названию.',
  },
  'coordinate-plot': {
    he: 'סימון נקודות במערכת צירים מחזק קריאת זוגות סדורים וכיוון במישור.',
    en: 'Plotting points on a coordinate grid strengthens ordered pairs and orientation on the plane.',
    ar: 'رسم النقاط على شبكة الإحداثيات يقوي فهم الأزواج المرتبة والاتجاه في المستوى.',
    de: 'Punkte im Koordinatensystem einzutragen stärkt geordnete Paare und Orientierung in der Ebene.',
    es: 'Ubicar puntos en una cuadrícula fortalece pares ordenados y orientación en el plano.',
    ru: 'Нанесение точек на координатную сетку развивает понимание упорядоченных пар и ориентацию на плоскости.',
  },
  'word-problem-bar': {
    he: 'תרשים עמודות לבעיה מילולית עוזר להפריד בין ידוע, חסר ופעולה מתאימה.',
    en: 'A bar model for a word problem helps separate what is known, what is missing, and which operation fits.',
    ar: 'نموذج الشريط للمسألة الكلامية يساعد على فصل المعطى والمطلوب والعملية المناسبة.',
    de: 'Ein Balkenmodell für Sachaufgaben trennt Bekanntes, Gesuchtes und passende Rechenoperation.',
    es: 'Un modelo de barras ayuda a separar lo conocido, lo faltante y la operación adecuada.',
    ru: 'Ленточная модель текстовой задачи помогает отделить известное, неизвестное и подходящее действие.',
  },
  'estimation-land': {
    he: 'אומדן כמות גדולה מלמד לבחור תשובה סבירה גם כשאי אפשר לספור הכול בדיוק.',
    en: 'Estimating a large quantity teaches students to choose a reasonable answer when exact counting is impractical.',
    ar: 'تقدير كمية كبيرة يعلم اختيار إجابة معقولة عندما لا يكون العد الدقيق عمليًا.',
    de: 'Das Schätzen großer Mengen lehrt, eine sinnvolle Antwort zu wählen, wenn genaues Zählen unpraktisch ist.',
    es: 'Estimar una cantidad grande enseña a elegir una respuesta razonable cuando contar exactamente no conviene.',
    ru: 'Оценка большого количества учит выбирать разумный ответ, когда точный счет неудобен.',
  },
  'multiplication-factor-tree': {
    he: 'פירוק מספר לגורמים בעץ מדגיש שמכפלה יכולה להיבנות בכמה שלבים.',
    en: 'Breaking a number into factors with a tree shows that a product can be built in several steps.',
    ar: 'تفكيك العدد إلى عوامل بواسطة شجرة يوضح أن حاصل الضرب يمكن بناؤه على مراحل.',
    de: 'Eine Zahl im Faktorenbaum zu zerlegen zeigt, dass ein Produkt in mehreren Schritten entstehen kann.',
    es: 'Descomponer un número en factores con un árbol muestra que un producto se construye por pasos.',
    ru: 'Разложение числа на множители деревом показывает, что произведение можно строить в несколько шагов.',
  },
  'long-division-tower': {
    he: 'חלוקת קוביות למגדלים שווים מציגה חילוק ארוך כארגון עקבי של קבוצות.',
    en: 'Dividing blocks into equal towers presents long division as consistent organization into groups.',
    ar: 'تقسيم المكعبات إلى أبراج متساوية يعرض القسمة الطويلة كتنظيم ثابت لمجموعات.',
    de: 'Blöcke in gleiche Türme zu teilen zeigt schriftliche Division als geordnetes Gruppieren.',
    es: 'Dividir bloques en torres iguales muestra la división larga como organización constante en grupos.',
    ru: 'Деление блоков на равные башни показывает деление столбиком как упорядоченное группирование.',
  },
  'tangram-build': {
    he: 'הרכבת טנגרם מחזקת תפיסה מרחבית, סיבוב צורות והתאמה בין חלקים לשלם.',
    en: 'Building a tangram strengthens spatial reasoning, shape rotation, and matching parts to a whole.',
    ar: 'تركيب التانغرام يقوي التفكير المكاني ودوران الأشكال ومطابقة الأجزاء مع الكل.',
    de: 'Ein Tangram zu bauen stärkt räumliches Denken, Drehung von Formen und das Zuordnen von Teilen zum Ganzen.',
    es: 'Construir un tangram refuerza razonamiento espacial, rotación de formas y relación parte-todo.',
    ru: 'Сборка танграма развивает пространственное мышление, поворот фигур и соотнесение частей с целым.',
  },
};

export function getGameSpecificSeoGuide(locale: string, gameId: string): string {
  const seoLocale = (locale in localizedCopy ? locale : 'en') as SeoLocale;
  return gameSpecificGuides[gameId]?.[seoLocale] ?? gameSpecificGuides[gameId]?.en ?? '';
}

export function interpolate(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ''));
}

export function getTopicPracticePath(topic: string): string {
  return topicPracticePath[topic] ?? '/play';
}

export function buildGameJsonLd(args: {
  locale: Locale;
  gameId: string;
  meta: GameMeta;
  title: string;
  description: string;
  topicLabel: string;
}) {
  const { locale, gameId, meta, title, description, topicLabel } = args;
  const url = getLocalizedUrl(`/play/${gameId}`, locale);

  return {
    '@context': 'https://schema.org',
    '@type': 'LearningResource',
    '@id': `${url}#learning-resource`,
    name: title,
    description,
    url,
    inLanguage: locale,
    learningResourceType: 'Game',
    educationalUse: ['Practice', 'Quiz'],
    educationalLevel: `Grades ${meta.gradeRange[0]}-${meta.gradeRange[1]}`,
    teaches: topicLabel,
    isAccessibleForFree: true,
    provider: {
      '@type': 'EducationalOrganization',
      name: 'Tirgul',
      url: BASE_URL,
    },
  };
}

export function buildGameFaqJsonLd(args: {
  locale: Locale;
  meta: GameMeta;
  topicLabel: string;
}) {
  const copy = getGameSeoCopy(args.locale);
  const values = {
    from: args.meta.gradeRange[0],
    to: args.meta.gradeRange[1],
    topic: args.topicLabel,
  };

  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: copy.faqGameQuestion,
        acceptedAnswer: {
          '@type': 'Answer',
          text: interpolate(copy.faqGameAnswer, values),
        },
      },
      {
        '@type': 'Question',
        name: copy.faqCostQuestion,
        acceptedAnswer: {
          '@type': 'Answer',
          text: copy.faqCostAnswer,
        },
      },
      {
        '@type': 'Question',
        name: copy.faqUseQuestion,
        acceptedAnswer: {
          '@type': 'Answer',
          text: copy.faqUseAnswer,
        },
      },
    ],
  };
}

export function buildGameBreadcrumbJsonLd(args: {
  locale: Locale;
  title: string;
  gameId: string;
}) {
  const base = args.locale === 'he' ? BASE_URL : `${BASE_URL}/${args.locale}`;
  const gameUrl = getLocalizedUrl(`/play/${args.gameId}`, args.locale);

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Tirgul', item: base },
      { '@type': 'ListItem', position: 2, name: 'Play', item: getLocalizedUrl('/play', args.locale) },
      { '@type': 'ListItem', position: 3, name: args.title, item: gameUrl },
    ],
  };
}
