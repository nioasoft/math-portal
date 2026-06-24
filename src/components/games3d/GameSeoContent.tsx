import { Link } from '@/i18n/navigation';
import type { GameMeta } from '@/lib/games3d/types';
import type { GameSeo } from '@/lib/games3d/gameSeo';
import {
  getGameSeoCopy,
  getTopicPracticePath,
  interpolate,
} from '@/lib/games3d/seo';

interface RelatedGame {
  id: string;
  title: string;
}

interface GameSeoContentProps {
  locale: string;
  meta: GameMeta;
  title: string;
  topicLabel: string;
  relatedGames: RelatedGame[];
  seo: GameSeo;
}

export function GameSeoContent({
  locale,
  meta,
  title,
  topicLabel,
  relatedGames,
  seo,
}: GameSeoContentProps) {
  const copy = getGameSeoCopy(locale);
  const gradeValues = { from: meta.gradeRange[0], to: meta.gradeRange[1], topic: topicLabel };
  const practicePath = getTopicPracticePath(meta.topic);

  return (
    <section className="bg-white text-slate-800">
      <div className="container-custom grid gap-8 py-10 md:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.6fr)] md:py-14">
        <div>
          <p className="mb-2 text-sm font-bold text-indigo-600">
            {copy.gameType} · {interpolate(copy.grades, gradeValues)}
          </p>
          <h2 className="text-2xl font-black text-slate-900 md:text-3xl">{title}</h2>
          <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">{seo.intro}</p>

          <div className="mt-6">
            <h3 className="text-lg font-bold text-slate-900">{copy.practiceTitle}</h3>
            <p className="mt-2 leading-7 text-slate-600">{seo.skills}</p>
            <ol className="mt-3 list-decimal space-y-1 ps-5 leading-7 text-slate-600">
              {seo.howToPlay.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <div>
              <h3 className="text-lg font-bold text-slate-900">{copy.parentTitle}</h3>
              <p className="mt-2 leading-7 text-slate-600">{seo.example}</p>
            </div>
            <div>
              <p className="mt-2 leading-7 text-slate-600">{seo.mistakes}</p>
              <p className="mt-2 leading-7 text-slate-600">{copy.classroomUse}</p>
              <p className="mt-2 leading-7 text-slate-600">{copy.playCta}</p>
            </div>
          </div>
        </div>

        <aside className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <h3 className="text-lg font-black text-slate-900">{copy.relatedTitle}</h3>
          <div className="mt-4 space-y-3">
            <Link
              href={practicePath}
              className="block rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-indigo-700 transition hover:border-indigo-200 hover:bg-indigo-50"
            >
              {copy.relatedWorksheet}
            </Link>
            <Link
              href="/play"
              className="block rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:border-slate-300"
            >
              {copy.relatedGames}
            </Link>
          </div>

          {relatedGames.length > 0 && (
            <ul className="mt-5 space-y-2">
              {relatedGames.map((game) => (
                <li key={game.id}>
                  <Link href={`/play/${game.id}`} className="text-sm font-medium text-slate-600 hover:text-indigo-700">
                    {game.title}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <div className="md:col-span-2">
          <h3 className="text-lg font-black text-slate-900">{copy.faqTitle}</h3>
          <dl className="mt-4 grid gap-4 md:grid-cols-3">
            {seo.faqs.map((faq, i) => (
              <div key={i} className="rounded-xl border border-slate-200 p-4">
                <dt className="font-bold text-slate-900">{faq.q}</dt>
                <dd className="mt-2 text-sm leading-6 text-slate-600">{faq.a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
