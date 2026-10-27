import type { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Link } from '@/i18n/navigation';
import {
  Calculator, ArrowLeft, Percent, Divide,
  Shapes, Scale, Star, BookOpen, GraduationCap, Printer, Zap, Gamepad2
} from 'lucide-react';
import { FeaturedPosts } from '@/components/FeaturedPosts';
import { getBlogPosts, getHelpTopics } from '@/lib/content';
import { getTranslations, getLocale } from 'next-intl/server';
import { Locale, scriptTypography } from '@/i18n/config';
import { generateAlternates, generateOpenGraphMeta, generateTwitterMeta } from '@/lib/seo';

const GamesHub = dynamic(() => import('@/components/games3d/GamesHub').then(m => m.GamesHub), {
  loading: () => <div className="h-96 bg-slate-100 animate-pulse rounded-3xl" />,
});

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'meta' });

  const title = t('pages.home.title');
  const description = t('pages.home.description');

  return {
    title,
    description,
    alternates: generateAlternates('/', locale as Locale),
    openGraph: generateOpenGraphMeta(locale as Locale, title, description, '/'),
    twitter: generateTwitterMeta(title, description),
  };
}

const getGenerators = (t: Awaited<ReturnType<typeof getTranslations<'home'>>>) => [
  {
    href: "/worksheet/math?op=add&range=20",
    title: t('generators.addSubtract.title'),
    desc: t('generators.addSubtract.desc'),
    icon: Calculator,
    color: "from-sky-400 to-blue-500",
    bgColor: "bg-sky-50",
    iconBg: "bg-sky-100",
    iconColor: "text-sky-600"
  },
  {
    href: "/worksheet/math?op=mul&range=100",
    title: t('generators.mulDiv.title'),
    desc: t('generators.mulDiv.desc'),
    icon: Divide,
    color: "from-violet-400 to-purple-500",
    bgColor: "bg-violet-50",
    iconBg: "bg-violet-100",
    iconColor: "text-violet-600"
  },
  {
    href: "/fractions",
    title: t('generators.fractions.title'),
    desc: t('generators.fractions.desc'),
    icon: ({ size }: { size?: number }) => <span style={{ fontSize: size ? size - 4 : 20 }} className="font-black">½</span>,
    color: "from-emerald-400 to-green-500",
    bgColor: "bg-emerald-50",
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-600"
  },
  {
    href: "/geometry",
    title: t('generators.geometry.title'),
    desc: t('generators.geometry.desc'),
    icon: Shapes,
    color: "from-rose-400 to-pink-500",
    bgColor: "bg-rose-50",
    iconBg: "bg-rose-100",
    iconColor: "text-rose-600"
  },
  {
    href: "/percentage",
    title: t('generators.percentage.title'),
    desc: t('generators.percentage.desc'),
    icon: Percent,
    color: "from-amber-400 to-orange-500",
    bgColor: "bg-amber-50",
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600"
  },
  {
    href: "/units",
    title: t('generators.units.title'),
    desc: t('generators.units.desc'),
    icon: Scale,
    color: "from-cyan-400 to-teal-500",
    bgColor: "bg-cyan-50",
    iconBg: "bg-cyan-100",
    iconColor: "text-cyan-600"
  },
];

// Floating math symbols for hero decoration
function MathSymbol({ symbol, className }: { symbol: string; className: string }) {
  return (
    <div aria-hidden="true" className={`absolute text-4xl md:text-5xl font-black select-none pointer-events-none ${className}`}>
      {symbol}
    </div>
  );
}

export default async function Home() {
  const locale = await getLocale() as Locale;
  const t = await getTranslations('home');
  const tCommon = await getTranslations('common');
  const generators = getGenerators(t);
  const { gap } = scriptTypography[locale];

  // Fetch locale-specific content
  const allPosts = await getBlogPosts(locale);
  const helpTopics = await getHelpTopics(locale);
  const featuredPosts = allPosts.slice(0, 6).map(p => ({
    slug: p.slug,
    title: p.title,
    excerpt: p.excerpt,
    date: p.date,
    image: p.image,
    categoryLabel: p.categoryLabel,
  }));

  return (
    <div className="min-h-screen flex flex-col bg-[#fffbf5]">
      <Header />

      <main id="main-content" tabIndex={-1} className="flex-1">

        {/* Hero Section - Warm & Inviting */}
        <section className="relative overflow-hidden pt-6 pb-10 md:pt-12 md:pb-16 min-h-0 flex items-center">
          {/* Background layers */}
          <div className="absolute inset-0 bg-gradient-to-b from-orange-50/80 via-[#fffbf5] to-[#fffbf5]"></div>
          <div className="absolute inset-0 grid-pattern"></div>

          {/* Decorative blobs */}
          <div className="absolute top-20 end-[10%] w-72 h-72 bg-orange-200/30 rounded-full blur-3xl animate-pulse-soft"></div>
          <div className="absolute bottom-20 start-[10%] w-96 h-96 bg-sky-200/20 rounded-full blur-3xl animate-pulse-soft" style={{ animationDelay: '2s' }}></div>

          {/* Decoration stays at the edges so it never competes with the choices. */}
          <MathSymbol symbol="+" className="top-10 end-[4%] text-orange-300 opacity-40" />
          <MathSymbol symbol="×" className="top-12 start-[4%] text-sky-300 opacity-40" />
          <MathSymbol symbol="=" className="bottom-12 end-[4%] text-emerald-300 opacity-40" />
          <MathSymbol symbol="½" className="bottom-10 start-[4%] text-violet-300 opacity-40" />

          <div className="container-custom relative z-10">
            <div className="max-w-5xl mx-auto text-center">
              {/* Main headline */}
              <h1 className="text-4xl md:text-7xl font-black text-slate-800 mb-3 leading-tight text-display">
                {t('hero.title')}
                <br className="sm:hidden" />
                {gap ? <span className="hidden sm:inline">{gap}</span> : null}
                <span className="text-gradient-warm">{t('hero.titleHighlight')}</span>
              </h1>

              <p className="text-lg md:text-xl text-slate-600 mb-6 max-w-3xl mx-auto leading-relaxed">
                {t('hero.description')}
              </p>

              {/* Dual CTA Cards */}
              <div className="flex flex-col sm:flex-row gap-4 md:gap-5 max-w-3xl md:max-w-4xl mx-auto">
                {/* Both primary choices open a dedicated, filterable catalog. */}
                <Link
                  href="/worksheet"
                  data-discovery-source="home"
                  data-discovery-target="worksheets"
                  className="flex-1 bg-white border-2 border-orange-200 rounded-xl p-5 md:p-6 hover:border-orange-400 hover:shadow-lg transition-all group text-start"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Printer className="w-7 h-7 md:w-8 md:h-8 text-orange-500" />
                    <h2 className="text-xl md:text-2xl font-bold text-slate-800">{t('hero.worksheetCard.title')}</h2>
                  </div>
                  <p className="text-base md:text-lg text-slate-600 mb-3">{t('hero.worksheetCard.desc')}</p>
                  <span className="inline-flex items-center gap-2 bg-orange-700 text-white px-5 py-2.5 md:px-6 md:py-3 rounded-lg font-bold text-base md:text-lg group-hover:-translate-y-0.5 transition-transform">
                    {t('hero.worksheetCard.cta')}
                    <ArrowLeft className="w-4 h-4 md:w-5 md:h-5 ltr:-scale-x-100" />
                  </span>
                </Link>

                {/* Games Card */}
                <Link
                  href="/play"
                  data-discovery-source="home"
                  data-discovery-target="games"
                  className="flex-1 bg-white border-2 border-purple-200 rounded-xl p-5 md:p-6 hover:border-purple-400 hover:shadow-lg transition-all group text-start"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Gamepad2 className="w-7 h-7 md:w-8 md:h-8 text-purple-500" />
                    <h2 className="text-xl md:text-2xl font-bold text-slate-800">{t('hero.gamesCard.title')}</h2>
                  </div>
                  <p className="text-base md:text-lg text-slate-600 mb-3">{t('hero.gamesCard.desc')}</p>
                  <span className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-5 py-2.5 md:px-6 md:py-3 rounded-lg font-bold text-base md:text-lg group-hover:-translate-y-0.5 transition-transform">
                    {t('hero.gamesCard.cta')}
                    <ArrowLeft className="w-4 h-4 md:w-5 md:h-5 ltr:-scale-x-100" />
                  </span>
                </Link>
              </div>

              <nav aria-label={t('grades.label')} className="mt-6 rounded-2xl border border-orange-100 bg-white/80 p-4">
                <p className="mb-3 text-sm font-semibold text-slate-700">{t('grades.prompt')}</p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {[1, 2, 3, 4, 5, 6].map(grade => (
                    <Link key={grade} href={`/grade/${grade}`} data-discovery-source="home" data-discovery-target={`grade-${grade}`}
                      className="inline-flex min-h-11 items-center rounded-xl border border-slate-200 bg-white px-4 py-2 font-bold text-slate-700 hover:border-orange-400 hover:bg-orange-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600">
                      {tCommon(`grades.grade${grade}`)}
                    </Link>
                  ))}
                </div>
              </nav>

              {/* Trust indicators */}
              <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-xs text-slate-500">
                <div className="flex items-center gap-1.5">
                  <Printer size={14} className="text-slate-400" />
                  <span>{t('hero.trustPrint')}</span>
                </div>
                <div className="w-px h-3 bg-slate-200 hidden sm:block"></div>
                <div className="flex items-center gap-1.5">
                  <Zap size={14} className="text-slate-400" />
                  <span>{t('hero.trustNoSignup')}</span>
                </div>
                <div className="w-px h-3 bg-slate-200 hidden sm:block"></div>
                <div className="flex items-center gap-1.5">
                  <Star size={14} className="text-amber-400 fill-amber-400" />
                  <span>{t('hero.trustFree')}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Generators Grid - Card Design */}
        <section id="generators" className="py-10 md:py-14 relative">
          <div className="absolute inset-0 dot-pattern opacity-50"></div>

          <div className="container-custom relative z-10">
            <div className="text-center mb-8">
              <h2 className="text-3xl md:text-4xl font-black text-slate-800 mb-4 text-display">
                {t('generators.title')}
              </h2>
              <p className="text-lg text-slate-500">
                {t('generators.subtitle')}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
              {generators.map((gen, i) => (
                <Link
                  key={i}
                  href={gen.href}
                  data-discovery-source="home"
                  data-discovery-target={`worksheet-topic-${i}`}
                  className="group relative bg-white rounded-2xl p-5 transition-all duration-300 border-2 border-slate-100 hover:border-transparent shadow-sm hover:shadow-2xl hover:shadow-slate-200/50 card-lift overflow-hidden"
                >
                  {/* Gradient overlay on hover */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${gen.color} opacity-0 group-hover:opacity-[0.03] transition-opacity duration-300 rounded-3xl`}></div>

                  {/* Corner decoration */}
                  <div className={`absolute -top-12 -start-12 w-32 h-32 ${gen.bgColor} rounded-full opacity-0 group-hover:opacity-100 transition-all duration-500 group-hover:scale-150`}></div>

                  <div className="relative z-10">
                    {/* Icon container — the colour lives here, not on a
                        `bg-clip-text text-transparent` wrapper: lucide icons
                        stroke with currentColor, so clipping the background to
                        the text made every glyph fully transparent. */}
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 ${gen.iconBg} ${gen.iconColor} group-hover:scale-110 transition-transform duration-300`}>
                      {(() => { const Icon = gen.icon; return <Icon size={30} />; })()}
                    </div>

                    {/* Content */}
                    <h3 className="text-2xl font-bold text-slate-800 mb-2 group-hover:text-slate-900 transition-colors">
                      {gen.title}
                    </h3>
                    <p className="text-slate-500 mb-5 leading-relaxed">
                      {gen.desc}
                    </p>

                    {/* CTA */}
                    <div className="flex items-center text-orange-800 font-bold text-sm group-hover:gap-2 transition-all">
                      <span>{t('generators.cta')}</span>
                      <ArrowLeft size={16} className="opacity-0 group-hover:opacity-100 transition-opacity ltr:-scale-x-100" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            <div className="mt-6 text-center">
              <Link href="/worksheet" data-discovery-source="home" data-discovery-target="all-worksheets" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-orange-300 bg-white px-5 py-3 font-bold text-orange-800 hover:bg-orange-50">
                {t('generators.all')}<ArrowLeft size={18} className="ltr:-scale-x-100" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>

        <GamesHub />

        {/* How it works - quick-start so first-timers know the flow (choose → customize → print/play) */}
        <section className="py-12 bg-white border-y border-slate-100">
          <div className="container-custom">
            <div className="text-center mb-8">
              <h2 className="text-2xl md:text-3xl font-black text-slate-800 text-display">{t('howItWorks.title')}</h2>
            </div>
            <div className="grid md:grid-cols-3 gap-5 max-w-4xl mx-auto">
              {[
                { n: '1', grad: 'from-sky-400 to-sky-500', shadow: 'shadow-sky-200' },
                { n: '2', grad: 'from-violet-400 to-violet-500', shadow: 'shadow-violet-200' },
                { n: '3', grad: 'from-emerald-400 to-emerald-500', shadow: 'shadow-emerald-200' },
              ].map((s) => (
                <div key={s.n} className="bg-slate-50 p-6 rounded-2xl border border-slate-100 text-center">
                  <div className={`w-12 h-12 bg-gradient-to-br ${s.grad} text-white rounded-xl flex items-center justify-center mx-auto mb-4 text-xl font-black shadow-lg ${s.shadow}`}>{s.n}</div>
                  <h3 className="text-lg font-bold mb-2 text-slate-800">{t(`howItWorks.step${s.n}.title`)}</h3>
                  <p className="text-slate-500 text-sm">{t(`howItWorks.step${s.n}.desc`)}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Featured Blog Posts */}
        <FeaturedPosts posts={featuredPosts} />

        {/* Parents Help Section */}
        <section className="py-20 bg-white">
          <div className="container-custom">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-12">
              <div>
                <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-full text-sm font-bold mb-4">
                  <GraduationCap size={16} />
                  {t('help.badge')}
                </div>
                <h2 className="text-3xl font-bold text-slate-800 mb-2">{t('help.title')}</h2>
                <p className="text-slate-500">{t('help.subtitle')}</p>
              </div>
              <Link href="/help" className="hidden sm:flex items-center gap-1 font-bold text-emerald-600 hover:gap-2 transition-all group">
                {t('help.cta')}
                <ArrowLeft size={16} className="ltr:-scale-x-100" />
              </Link>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {helpTopics.slice(0, 8).map((topic) => (
                <Link
                  key={topic.slug}
                  href={`/help/${topic.slug}`}
                  className="group bg-slate-50 hover:bg-emerald-50 rounded-2xl p-5 transition-all duration-200 border border-transparent hover:border-emerald-200"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="bg-white w-11 h-11 rounded-xl flex items-center justify-center text-emerald-600 shadow-sm border border-slate-100 group-hover:bg-emerald-100 group-hover:border-emerald-200 transition-all">
                      <BookOpen size={20} />
                    </div>
                    <h3 className="font-bold text-slate-800 group-hover:text-emerald-700 transition-colors">{topic.title}</h3>
                  </div>
                  <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed">{topic.shortDescription}</p>
                </Link>
              ))}
            </div>

            <div className="mt-8 text-center sm:hidden">
              <Link href="/help" className="inline-flex items-center gap-2 font-bold text-emerald-600">
                {t('help.cta')} <ArrowLeft size={16} className="ltr:-scale-x-100" />
              </Link>
            </div>
          </div>
        </section>

      </main>

      <Footer />
    </div>
  );
}
