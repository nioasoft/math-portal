import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import Link from 'next/link';
import {
  Calculator, Brain, ArrowLeft, Percent, Divide,
  Shapes, Scale, Star, BookOpen, GraduationCap, Sparkles, Printer, Zap
} from 'lucide-react';
import { FeaturedPosts } from '@/components/FeaturedPosts';
import { HELP_TOPICS } from '@/lib/help-data';
import { AdSlot } from '@/components/AdSlot';

const generators = [
  {
    href: "/grade/1",
    title: "חיבור וחיסור",
    desc: "עד 20, 100 ומספרים גדולים",
    icon: Calculator,
    color: "from-sky-400 to-blue-500",
    bgColor: "bg-sky-50",
    iconBg: "bg-sky-100"
  },
  {
    href: "/grade/3",
    title: "כפל וחילוק",
    desc: "לוח הכפל, חילוק ארוך וחזקות",
    icon: Divide,
    color: "from-violet-400 to-purple-500",
    bgColor: "bg-violet-50",
    iconBg: "bg-violet-100"
  },
  {
    href: "/fractions",
    title: "שברים",
    desc: "מתחילים ומתקדמים, צמצום והרחבה",
    icon: ({ size }: { size?: number }) => <span style={{ fontSize: size ? size - 4 : 20 }} className="font-black">½</span>,
    color: "from-emerald-400 to-green-500",
    bgColor: "bg-emerald-50",
    iconBg: "bg-emerald-100"
  },
  {
    href: "/geometry",
    title: "הנדסה",
    desc: "שטחים, היקפים ומצולעים",
    icon: Shapes,
    color: "from-rose-400 to-pink-500",
    bgColor: "bg-rose-50",
    iconBg: "bg-rose-100"
  },
  {
    href: "/percentage",
    title: "אחוזים",
    desc: "חישובי אחוזים, הנחות וריבית",
    icon: Percent,
    color: "from-amber-400 to-orange-500",
    bgColor: "bg-amber-50",
    iconBg: "bg-amber-100"
  },
  {
    href: "/units",
    title: "המרת מידות",
    desc: "אורך, משקל וזמן",
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

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-[#fffbf5]">
      <Header />

      <main className="flex-1">

        {/* Hero Section - Warm & Inviting */}
        <section className="relative overflow-hidden pt-20 pb-32 md:pt-32 md:pb-44 min-h-[85vh] flex items-center">
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
            <div className="max-w-4xl mx-auto text-center">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm border border-orange-200 rounded-full px-5 py-2.5 shadow-sm mb-8 animate-slide-up">
                <Sparkles size={16} className="text-orange-500" />
                <span className="text-sm font-bold text-slate-700">חדש: מחולל סדרות חשבוניות להדפסה</span>
              </div>

              {/* Main headline */}
              <h1 className="text-5xl md:text-7xl font-black text-slate-800 mb-6 leading-tight text-display animate-slide-up delay-100">
                לתרגל חשבון{' '}
                <span className="text-gradient-warm">בכיף ובקלות</span>
              </h1>

              {/* Subheadline */}
              <p className="text-xl md:text-2xl text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed animate-slide-up delay-200">
                צרו דפי עבודה מותאמים אישית בכמה שניות.
                <br className="hidden sm:block" />
                בחרו נושא, לחצו &quot;הדפס&quot; וקבלו דף תרגול מושלם – <strong className="text-orange-600">בחינם</strong>.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up delay-300">
                <a
                  href="#generators"
                  className="w-full sm:w-auto bg-gradient-to-r from-orange-500 to-orange-600 text-white px-8 py-4 rounded-2xl font-bold text-lg shadow-xl shadow-orange-200/50 hover:shadow-2xl hover:shadow-orange-300/50 hover:-translate-y-1 transition-all duration-300 flex items-center justify-center gap-3"
                >
                  התחילו לתרגל
                  <ArrowLeft className="w-5 h-5" />
                </a>
                <a
                  href="/about"
                  className="w-full sm:w-auto bg-white text-slate-700 border-2 border-slate-200 px-8 py-4 rounded-2xl font-bold text-lg hover:border-orange-300 hover:bg-orange-50 transition-all duration-300 flex items-center justify-center"
                >
                  איך זה עובד?
                </a>
              </div>

              {/* Trust indicators */}
              <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-sm text-slate-500 animate-fade-in delay-500">
                <div className="flex items-center gap-2">
                  <Printer size={18} className="text-slate-400" />
                  <span>הדפסה ישירה</span>
                </div>
                <div className="w-px h-4 bg-slate-200 hidden sm:block"></div>
                <div className="flex items-center gap-2">
                  <Zap size={18} className="text-slate-400" />
                  <span>ללא הרשמה</span>
                </div>
                <div className="w-px h-4 bg-slate-200 hidden sm:block"></div>
                <div className="flex items-center gap-2">
                  <Star size={18} className="text-amber-400 fill-amber-400" />
                  <span>100% חינם</span>
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
                מה רוצים לתרגל היום?
              </h2>
              <p className="text-lg text-slate-500">
                בחרו נושא והתחילו ליצור דפי עבודה מותאמים אישית
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
                      <span>צור דף עבודה</span>
                      <ArrowLeft size={16} className="mr-1 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Ad Slot - After Generators */}
        <div className="container-custom py-8">
          <AdSlot slotId="home-after-generators" format="horizontal" className="mx-auto max-w-3xl" />
        </div>

        {/* Grade Levels Strip */}
        <section className="py-12 border-y border-slate-100 bg-white">
          <div className="container-custom">
            <div className="flex flex-wrap items-center justify-center gap-3 md:gap-4">
              <span className="font-bold text-slate-400 text-sm">לפי כיתה:</span>
              {[1, 2, 3, 4, 5, 6].map((grade) => (
                <Link
                  key={grade}
                  href={`/grade/${grade}`}
                  className="px-5 py-2.5 bg-slate-50 rounded-full border border-slate-100 text-slate-600 font-bold hover:bg-orange-50 hover:border-orange-200 hover:text-orange-700 transition-all duration-200"
                >
                  כיתה {String.fromCharCode(1488 + grade - 1)}&apos;
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Featured Blog Posts */}
        <FeaturedPosts />

        {/* Ad Slot - After Blog Posts */}
        <div className="container-custom py-8 bg-slate-50">
          <AdSlot slotId="home-after-blog" format="horizontal" className="mx-auto max-w-3xl" />
        </div>

        {/* Parents Help Section */}
        <section className="py-20 bg-white">
          <div className="container-custom">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-12">
              <div>
                <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-full text-sm font-bold mb-4">
                  <GraduationCap size={16} />
                  מדריך להורים
                </div>
                <h2 className="text-3xl font-bold text-slate-800 mb-2">איך ללמד את הילד?</h2>
                <p className="text-slate-500">הסברים פשוטים, דוגמאות מפורטות וטיפים מעשיים</p>
              </div>
              <Link href="/help" className="hidden sm:flex items-center gap-1 font-bold text-emerald-600 hover:gap-2 transition-all group">
                לכל ההסברים
                <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
              </Link>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {HELP_TOPICS.slice(0, 8).map((topic) => (
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
                לכל ההסברים <ArrowLeft size={16} />
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
                  למה הורים ומורים בוחרים
                  <br />
                  <span className="text-gradient-warm">&quot;דפי עבודה חכמים&quot;?</span>
                </h2>

                <div className="space-y-6">
                  <div className="flex gap-5 group">
                    <div className="bg-emerald-100 w-14 h-14 rounded-2xl flex items-center justify-center text-emerald-600 shrink-0 group-hover:scale-110 transition-transform">
                      <Brain size={26} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-800 mb-2">מותאם אישית לילד</h3>
                      <p className="text-slate-600 leading-relaxed">
                        בניגוד לחוברות עבודה סטנדרטיות, כאן אתם שולטים ברמת הקושי. אפשר להתחיל קל ולהעלות את הרמה בהדרגה.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-5 group">
                    <div className="bg-sky-100 w-14 h-14 rounded-2xl flex items-center justify-center text-sky-600 shrink-0 group-hover:scale-110 transition-transform">
                      <Calculator size={26} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-800 mb-2">אינסוף תרגול</h3>
                      <p className="text-slate-600 leading-relaxed">
                        נגמרו הדפים בחוברת? הילד צריך עוד חיזוק בלוח הכפל? בלחיצת כפתור אחת מקבלים דף חדש.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-5 group">
                    <div className="bg-orange-100 w-14 h-14 rounded-2xl flex items-center justify-center text-orange-600 shrink-0 group-hover:scale-110 transition-transform">
                      <Printer size={26} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-800 mb-2">הדפסה מיידית</h3>
                      <p className="text-slate-600 leading-relaxed">
                        ללא הרשמה, ללא תשלום. פשוט בוחרים נושא, מגדירים את הרמה ומדפיסים ישירות מהדפדפן.
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
                        <h4 className="font-black text-slate-800 text-sm">תרגול חיבור וחיסור</h4>
                        <p className="text-[10px] text-slate-400">מספרים עד 100 | רמה: בינונית</p>
                      </div>
                      <div className="text-left">
                        <p className="text-[10px] text-slate-500">שם: _____________</p>
                        <p className="text-[10px] text-slate-500">כיתה: ____</p>
                      </div>
                    </div>

                    {/* Tip Box */}
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 mb-4">
                      <p className="text-[10px] text-amber-700 font-medium">
                        <span className="font-bold">טיפ:</span> בחיבור עם נשיאה, זכרו להוסיף 1 לטור השמאלי!
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
                        <span className="text-[9px] text-slate-400">דף תשובות בנפרד</span>
                      </div>
                      <span className="text-[9px] text-slate-400 font-medium">דפי עבודה חכמים</span>
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
