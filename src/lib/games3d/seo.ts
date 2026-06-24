import type { GameMeta } from './types';
import { BASE_URL, getLocalizedUrl } from '@/lib/seo';
import type { Locale } from '@/i18n/config';
import type { GameFaq } from './gameSeo';

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
    skillPrefix: 'Игра развивает понимание темы',
    classroomUse: 'Ее можно использовать для самостоятельной работы, работы в парах или короткой демонстрации перед рабочим листом.',
    playCta: 'Начните с игры выше, затем закрепите навык письменными заданиями.',
  },
} as const;

type SeoLocale = keyof typeof localizedCopy;

export function getGameSeoCopy(locale: string) {
  return localizedCopy[(locale in localizedCopy ? locale : 'en') as SeoLocale];
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

/** Build FAQPage JSON-LD from a game's own FAQ list (unique per game). */
export function buildGameFaqJsonLd(args: { faqs: GameFaq[] }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: args.faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.a,
      },
    })),
  } as const;
}

export function buildGameBreadcrumbJsonLd(args: {
  locale: Locale;
  title: string;
  gameId: string;
  homeName?: string;
  playName?: string;
}) {
  const base = args.locale === 'he' ? BASE_URL : `${BASE_URL}/${args.locale}`;
  const gameUrl = getLocalizedUrl(`/play/${args.gameId}`, args.locale);

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: args.homeName ?? 'Tirgul', item: base },
      { '@type': 'ListItem', position: 2, name: args.playName ?? 'Play', item: getLocalizedUrl('/play', args.locale) },
      { '@type': 'ListItem', position: 3, name: args.title, item: gameUrl },
    ],
  };
}
