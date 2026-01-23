import type { Metadata } from 'next';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Link } from '@/i18n/navigation';
import {
  Calculator, Brain, ArrowLeft, Percent, Divide,
  Shapes, Scale, Star, BookOpen, GraduationCap, Printer, Zap, Gamepad2, PieChart
} from 'lucide-react';
import { FeaturedPosts } from '@/components/FeaturedPosts';
import { getBlogPosts, getHelpTopics } from '@/lib/content';
import { getTranslations, getLocale } from 'next-intl/server';
import { Locale } from '@/i18n/config';
import { generateAlternates, generateOpenGraphMeta, generateTwitterMeta } from '@/lib/seo';

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
    href: "/grade/1",
    title: t('generators.addSubtract.title'),
    desc: t('generators.addSubtract.desc'),
    icon: Calculator,
    color: "from-sky-400 to-blue-500",
    bgColor: "bg-sky-50",
    iconBg: "bg-sky-100"
  },
  {
    href: "/grade/3",
    title: t('generators.mulDiv.title'),
    desc: t('generators.mulDiv.desc'),
    icon: Divide,
    color: "from-violet-400 to-purple-500",
    bgColor: "bg-violet-50",
    iconBg: "bg-violet-100"
  },
  {
    href: "/fractions",
    title: t('generators.fractions.title'),
    desc: t('generators.fractions.desc'),
    icon: ({ size }: { size?: number }) => <span style={{ fontSize: size ? size - 4 : 20 }} className="font-black">½</span>,
    color: "from-emerald-400 to-green-500",
    bgColor: "bg-emerald-50",
    iconBg: "bg-emerald-100"
  },
  {
    href: "/geometry",
    title: t('generators.geometry.title'),
    desc: t('generators.geometry.desc'),
    icon: Shapes,
    color: "from-rose-400 to-pink-500",
    bgColor: "bg-rose-50",
    iconBg: "bg-rose-100"
  },
  {
    href: "/percentage",
    title: t('generators.percentage.title'),
    desc: t('generators.percentage.desc'),
    icon: Percent,
    color: "from-amber-400 to-orange-500",
    bgColor: "bg-amber-50",
    iconBg: "bg-amber-100"
  },
  {
    href: "/units",
    title: t('generators.units.title'),
    desc: t('generators.units.desc'),
    icon: Scale,
    color: "from-cyan-400 to-teal-500",
    bgColor: "bg-cyan-50",
    iconBg: "bg-cyan-100"
  },
];

// Floating math symbols for hero decoration
function MathSymbol({ symbol, className }: { symbol: string; className: string }) {
  return (
    <div className={`absolute text-4xl md:text-5xl font-black select-none pointer-events-none ${className}`}>
      {symbol}
    </div>
  );
}

export default async function Home() {
  const locale = await getLocale() as Locale;
  const t = await getTranslations('home');
  const tCommon = await getTranslations('common');
  const generators = getGenerators(t);

  // Fetch locale-specific content
  const allPosts = await getBlogPosts(locale);
  const helpTopics = await getHelpTopics(locale);
  const gamePosts = allPosts.filter(p => p.category === 'games').slice(0, 3);
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

      <main className="flex-1">

        {/* Hero Section - Warm & Inviting */}
        <section className="relative overflow-hidden pt-6 pb-10 md:pt-12 md:pb-16 min-h-0 flex items-center">
          {/* Background layers */}
          <div className="absolute inset-0 bg-gradient-to-b from-orange-50/80 via-[#fffbf5] to-[#fffbf5]"></div>
          <div className="absolute inset-0 grid-pattern"></div>

          {/* Decorative blobs */}
          <div className="absolute top-20 right-[10%] w-72 h-72 bg-orange-200/30 rounded-full blur-3xl animate-pulse-soft"></div>
          <div className="absolute bottom-20 left-[10%] w-96 h-96 bg-sky-200/20 rounded-full blur-3xl animate-pulse-soft" style={{ animationDelay: '2s' }}></div>

          {/* Floating math symbols */}
          <MathSymbol symbol="+" className="top-20 right-[12%] text-orange-300 animate-float opacity-70" />
          <MathSymbol symbol="×" className="top-32 left-[8%] text-sky-300 animate-float-delayed opacity-60" />
          <MathSymbol symbol="÷" className="bottom-36 right-[18%] text-emerald-300 animate-float-slow opacity-60" />
          <MathSymbol symbol="−" className="bottom-44 left-[15%] text-violet-300 animate-float-fast opacity-55" />
          <MathSymbol symbol="=" className="top-28 left-[22%] text-rose-300 animate-float opacity-50" />
          <MathSymbol symbol="%" className="top-48 right-[25%] text-amber-300 animate-float-slow opacity-65" />
          <MathSymbol symbol="π" className="bottom-28 left-[28%] text-cyan-300 animate-float-delayed opacity-55" />
          <MathSymbol symbol="√" className="top-36 right-[8%] text-pink-300 animate-float-fast opacity-50" />
          <MathSymbol symbol="∞" className="bottom-20 right-[10%] text-indigo-300 animate-float opacity-45" />
          <MathSymbol symbol="½" className="top-52 left-[30%] text-teal-300 animate-float-slow opacity-55" />
          <MathSymbol symbol="²" className="bottom-52 left-[8%] text-orange-200 animate-float-delayed opacity-50" />
          <MathSymbol symbol="Σ" className="top-16 left-[35%] text-purple-300 animate-float-fast opacity-40" />

          <div className="container-custom relative z-10">
            <div className="max-w-5xl mx-auto text-center">
              {/* Main headline */}
              <h1 className="text-4xl md:text-7xl font-black text-slate-800 mb-3 leading-tight text-display animate-slide-up">
                {t('hero.title')}
                <br className="sm:hidden" />
                <span className="hidden sm:inline">{' '}</span>
                <span className="text-gradient-warm">{t('hero.titleHighlight')}</span>
              </h1>

              {/* Subheadline */}
              <p className="text-lg md:text-2xl text-slate-600 mb-6 max-w-3xl md:max-w-4xl mx-auto leading-relaxed animate-slide-up delay-100">
                {t('hero.description')}
                <br className="hidden sm:block" />
                {t('hero.descriptionLine2')} <strong className="text-orange-600">{t('hero.free')}</strong>.
              </p>

              {/* Dual CTA Cards */}
              <div className="flex flex-col sm:flex-row gap-4 md:gap-5 max-w-3xl md:max-w-4xl mx-auto animate-slide-up delay-200">
                {/* Worksheets Card */}
                <a
                  href="#generators"
                  className="flex-1 bg-white border-2 border-orange-200 rounded-xl p-5 md:p-6 hover:border-orange-400 hover:shadow-lg transition-all group text-right"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Printer className="w-7 h-7 md:w-8 md:h-8 text-orange-500" />
                    <h3 className="text-xl md:text-2xl font-bold text-slate-800">{t('hero.worksheetCard.title')}</h3>
                  </div>
                  <p className="text-base md:text-lg text-slate-600 mb-3">{t('hero.worksheetCard.desc')}</p>
                  <span className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white px-5 py-2.5 md:px-6 md:py-3 rounded-lg font-bold text-base md:text-lg group-hover:-translate-y-0.5 transition-transform">
                    {t('hero.worksheetCard.cta')}
                    <ArrowLeft className="w-4 h-4 md:w-5 md:h-5" />
                  </span>
                </a>

                {/* Games Card */}
                <Link
                  href="/play"
                  className="flex-1 bg-white border-2 border-purple-200 rounded-xl p-5 md:p-6 hover:border-purple-400 hover:shadow-lg transition-all group text-right"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Gamepad2 className="w-7 h-7 md:w-8 md:h-8 text-purple-500" />
                    <h3 className="text-xl md:text-2xl font-bold text-slate-800">{t('hero.gamesCard.title')}</h3>
                  </div>
                  <p className="text-base md:text-lg text-slate-600 mb-3">{t('hero.gamesCard.desc')}</p>
                  <span className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-5 py-2.5 md:px-6 md:py-3 rounded-lg font-bold text-base md:text-lg group-hover:-translate-y-0.5 transition-transform">
                    {t('hero.gamesCard.cta')}
                    <ArrowLeft className="w-4 h-4 md:w-5 md:h-5" />
                  </span>
                </Link>
              </div>

              {/* Quick Games Strip */}
              <div className="mt-4 text-center animate-slide-up delay-300">
                <div className="flex items-center justify-center gap-1.5 mb-2">
                  <Gamepad2 className="w-4 h-4 text-purple-500" />
                  <span className="text-sm font-bold text-slate-700">{t('quickGames.title')}</span>
                  <span className="text-xs text-slate-400">-</span>
                  <span className="text-xs text-slate-500">{t('quickGames.subtitle')}</span>
                </div>

                <div className="flex justify-center gap-2">
                  <Link
                    href="/play/math"
                    className="flex flex-col items-center gap-1 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg px-3 py-2 transition-all hover:-translate-y-0.5"
                  >
                    <Calculator className="w-5 h-5 text-blue-600" />
                    <span className="font-bold text-xs text-blue-700">{t('quickGames.math')}</span>
                  </Link>

                  <Link
                    href="/play/fractions"
                    className="flex flex-col items-center gap-1 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg px-3 py-2 transition-all hover:-translate-y-0.5"
                  >
                    <PieChart className="w-5 h-5 text-purple-600" />
                    <span className="font-bold text-xs text-purple-700">{t('quickGames.fractions')}</span>
                  </Link>

                  <Link
                    href="/play/percentage"
                    className="flex flex-col items-center gap-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg px-3 py-2 transition-all hover:-translate-y-0.5"
                  >
                    <Percent className="w-5 h-5 text-emerald-600" />
                    <span className="font-bold text-xs text-emerald-700">{t('quickGames.percentage')}</span>
                  </Link>
                </div>
              </div>

              {/* Trust indicators */}
              <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-xs text-slate-500 animate-fade-in delay-400">
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
        <section id="generators" className="py-20 md:py-28 relative">
          <div className="absolute inset-0 dot-pattern opacity-50"></div>

          <div className="container-custom relative z-10">
            <div className="text-center mb-14">
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
                  className="group relative bg-white rounded-3xl p-7 transition-all duration-300 border-2 border-slate-100 hover:border-transparent shadow-sm hover:shadow-2xl hover:shadow-slate-200/50 card-lift overflow-hidden"
                >
                  {/* Gradient overlay on hover */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${gen.color} opacity-0 group-hover:opacity-[0.03] transition-opacity duration-300 rounded-3xl`}></div>

                  {/* Corner decoration */}
                  <div className={`absolute -top-12 -left-12 w-32 h-32 ${gen.bgColor} rounded-full opacity-0 group-hover:opacity-100 transition-all duration-500 group-hover:scale-150`}></div>

                  <div className="relative z-10">
                    {/* Icon container */}
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-5 ${gen.iconBg} group-hover:scale-110 transition-transform duration-300`}>
                      <div className={`bg-gradient-to-br ${gen.color} bg-clip-text text-transparent`}>
                        {(() => { const Icon = gen.icon; return <Icon size={30} />; })()}
                      </div>
                    </div>

                    {/* Content */}
                    <h3 className="text-2xl font-bold text-slate-800 mb-2 group-hover:text-slate-900 transition-colors">
                      {gen.title}
                    </h3>
                    <p className="text-slate-500 mb-5 leading-relaxed">
                      {gen.desc}
                    </p>

                    {/* CTA */}
                    <div className="flex items-center text-orange-600 font-bold text-sm group-hover:gap-2 transition-all">
                      <span>{t('generators.cta')}</span>
                      <ArrowLeft size={16} className="mr-1 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Games Section - Prominent for Mobile */}
        <section className="py-12 md:py-16 bg-gradient-to-br from-purple-50 via-violet-50 to-indigo-50 relative overflow-hidden">
          <div className="absolute inset-0 dot-pattern opacity-30"></div>
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-purple-200/40 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-indigo-200/40 rounded-full blur-3xl"></div>

          <div className="container-custom relative z-10">
            {/* Mobile-first prominent header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-3 bg-white/80 backdrop-blur-sm border border-purple-200 rounded-2xl px-6 py-4 shadow-lg mb-6">
                <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-200">
                  <Gamepad2 size={28} className="text-white" />
                </div>
                <div className="text-right">
                  <h2 className="text-2xl md:text-3xl font-black text-slate-800">{t('games.title')}</h2>
                  <p className="text-sm text-slate-500">{t('games.subtitle')}</p>
                </div>
              </div>
            </div>

            {/* Games Cards - horizontal scroll on mobile */}
            <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 md:mx-0 md:px-0 md:grid md:grid-cols-3 md:overflow-visible scrollbar-hide">
              {gamePosts.map((post) => (
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  className="flex-shrink-0 w-[280px] md:w-auto bg-white rounded-2xl p-5 shadow-lg hover:shadow-xl transition-all duration-300 border border-purple-100 hover:border-purple-300 group"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                      <Gamepad2 size={24} className="text-purple-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-slate-800 mb-1 line-clamp-2 group-hover:text-purple-700 transition-colors">{post.title}</h3>
                      <p className="text-sm text-slate-500 line-clamp-2">{post.excerpt}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* CTA for all games */}
            <div className="text-center mt-8">
              <Link
                href="/blog?category=games"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-8 py-4 rounded-2xl font-bold text-lg shadow-xl shadow-purple-200/50 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300"
              >
                <Gamepad2 size={22} />
                {t('games.cta')}
                <ArrowLeft size={20} />
              </Link>
            </div>
          </div>
        </section>

        {/* Grade Levels Strip */}
        <section className="py-12 border-y border-slate-100 bg-white">
          <div className="container-custom">
            <div className="flex flex-wrap items-center justify-center gap-3 md:gap-4">
              <span className="font-bold text-slate-500 text-sm">{t('grades.label')}</span>
              {[1, 2, 3, 4, 5, 6].map((grade) => (
                <Link
                  key={grade}
                  href={`/grade/${grade}`}
                  className="px-5 py-2.5 bg-slate-50 rounded-full border border-slate-100 text-slate-600 font-bold hover:bg-orange-50 hover:border-orange-200 hover:text-orange-700 transition-all duration-200"
                >
                  {tCommon(`grades.grade${grade}`)}
                </Link>
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
                <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
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
                {t('help.cta')} <ArrowLeft size={16} />
              </Link>
            </div>
          </div>
        </section>

        {/* Why Choose Us Section */}
        <section className="py-24 bg-gradient-to-b from-[#fffbf5] to-white relative overflow-hidden">
          <div className="absolute inset-0 grid-pattern opacity-30"></div>

          <div className="container-custom relative z-10">
            <div className="grid md:grid-cols-2 gap-16 items-center">
              <div>
                <h2 className="text-3xl md:text-4xl font-black text-slate-800 mb-8 text-display leading-tight">
                  {t('whyUs.title')}
                  <br />
                  <span className="text-gradient-warm">{t('whyUs.titleHighlight')}</span>
                </h2>

                <div className="space-y-6">
                  <div className="flex gap-5 group">
                    <div className="bg-emerald-100 w-14 h-14 rounded-2xl flex items-center justify-center text-emerald-600 shrink-0 group-hover:scale-110 transition-transform">
                      <Brain size={26} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-800 mb-2">{t('whyUs.feature1.title')}</h3>
                      <p className="text-slate-600 leading-relaxed">
                        {t('whyUs.feature1.desc')}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-5 group">
                    <div className="bg-sky-100 w-14 h-14 rounded-2xl flex items-center justify-center text-sky-600 shrink-0 group-hover:scale-110 transition-transform">
                      <Calculator size={26} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-800 mb-2">{t('whyUs.feature2.title')}</h3>
                      <p className="text-slate-600 leading-relaxed">
                        {t('whyUs.feature2.desc')}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-5 group">
                    <div className="bg-orange-100 w-14 h-14 rounded-2xl flex items-center justify-center text-orange-600 shrink-0 group-hover:scale-110 transition-transform">
                      <Printer size={26} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-800 mb-2">{t('whyUs.feature3.title')}</h3>
                      <p className="text-slate-600 leading-relaxed">
                        {t('whyUs.feature3.desc')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Worksheet Preview */}
              <div className="relative">
                <div className="absolute -inset-4 bg-gradient-to-br from-orange-100 to-sky-100 rounded-[2.5rem] opacity-50 blur-2xl"></div>
                <div className="relative bg-white p-5 rounded-3xl shadow-2xl shadow-slate-200/50 border border-slate-100">
                  <div className="bg-gradient-to-b from-white to-slate-50 rounded-2xl p-5 border border-slate-100">
                    {/* Worksheet Header */}
                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-dashed border-slate-200">
                      <div>
                        <h4 className="font-black text-slate-800 text-sm">{t('preview.title')}</h4>
                        <p className="text-[10px] text-slate-400">{t('preview.subtitle')}</p>
                      </div>
                      <div className="text-left">
                        <p className="text-[10px] text-slate-500">{t('preview.name')} _____________</p>
                        <p className="text-[10px] text-slate-500">{t('preview.class')} ____</p>
                      </div>
                    </div>

                    {/* Tip Box */}
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 mb-4">
                      <p className="text-[10px] text-amber-700 font-medium">
                        <span className="font-bold">{t('preview.tipLabel')}</span> {t('preview.tip')}
                      </p>
                    </div>

                    {/* Problems */}
                    <div className="space-y-2.5">
                      {[
                        { num: 1, problem: '24 + 15 =' },
                        { num: 2, problem: '67 − 23 =' },
                        { num: 3, problem: '38 + 47 =' },
                        { num: 4, problem: '91 − 36 =' },
                      ].map(item => (
                        <div key={item.num} className="flex justify-between items-center bg-white rounded-lg px-3 py-2 border border-slate-100">
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 bg-gradient-to-br from-orange-400 to-orange-500 rounded text-[10px] text-white flex items-center justify-center font-bold">{item.num}</div>
                            <span className="text-slate-800 font-mono text-xs font-medium">{item.problem}</span>
                          </div>
                          <div className="w-10 h-5 border-b-2 border-dashed border-slate-300"></div>
                        </div>
                      ))}
                    </div>

                    {/* Footer */}
                    <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center">
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-emerald-100 rounded-full flex items-center justify-center">
                          <span className="text-emerald-600 text-[8px]">✓</span>
                        </div>
                        <span className="text-[9px] text-slate-400">{t('preview.answerSheet')}</span>
                      </div>
                      <span className="text-[9px] text-slate-400 font-medium">{tCommon('siteName')}</span>
                    </div>
                  </div>
                </div>

                {/* Floating elements */}
                <div className="absolute -top-3 -right-3 w-14 h-14 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-orange-200 animate-float">
                  <span className="text-xl">✓</span>
                </div>
                <div className="absolute -bottom-3 -left-3 w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-emerald-200 animate-float-delayed">
                  100
                </div>
                <div className="absolute top-1/2 -left-6 w-10 h-10 bg-gradient-to-br from-sky-400 to-sky-500 rounded-lg flex items-center justify-center text-white text-lg shadow-md shadow-sky-200 animate-float-slow">
                  ★
                </div>
              </div>
            </div>
          </div>
        </section>

      </main>

      <Footer />
    </div>
  );
}
