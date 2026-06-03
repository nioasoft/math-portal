import { Link } from '@/i18n/navigation';
import { getRegisteredGames } from '@/lib/games3d/games';
import { topicStyle } from './topicMeta';
import { getTranslations } from 'next-intl/server';

const copy = {
  he: {
    title: 'משחקים לתרגול הנושא',
    subtitle: 'תרגול אינטראקטיבי לפני או אחרי דף העבודה',
    allGames: 'לכל משחקי התלת-ממד',
  },
  en: {
    title: 'Games for this topic',
    subtitle: 'Interactive practice before or after the worksheet',
    allGames: 'All 3D games',
  },
} as const;

interface FeaturedTopicGamesProps {
  locale: string;
  topic: string;
  limit?: number;
}

export async function FeaturedTopicGames({
  locale,
  topic,
  limit = 4,
}: FeaturedTopicGamesProps) {
  const c = locale === 'he' ? copy.he : copy.en;
  const t = await getTranslations({ locale, namespace: 'games3d' });
  const games = getRegisteredGames()
    .filter((game) => game.meta.topic === topic)
    .slice(0, limit)
    .map((game) => {
      const key = game.meta.i18nKey.replace('games3d.', '');
      const block = t.raw(key) as { title?: string; description?: string } | undefined;
      return {
        id: game.meta.id,
        title: block?.title ?? game.meta.id,
        description: block?.description ?? '',
        gradeRange: game.meta.gradeRange,
      };
    });

  if (games.length === 0) return null;

  const style = topicStyle(topic);

  return (
    <section className="bg-white py-10">
      <div className="container-custom">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black text-slate-900">{c.title}</h2>
            <p className="mt-1 text-sm text-slate-500">{c.subtitle}</p>
          </div>
          <Link href="/play" className="text-sm font-bold text-indigo-600 hover:text-indigo-700">
            {c.allGames}
          </Link>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {games.map((game) => (
            <Link
              key={game.id}
              href={`/play/${game.id}`}
              className="group rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-indigo-200 hover:bg-white hover:shadow-md"
            >
              <span className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${style.gradient} text-white`}>
                {game.title.slice(0, 1)}
              </span>
              <h3 className="font-black text-slate-900 group-hover:text-indigo-700">{game.title}</h3>
              <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">{game.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
