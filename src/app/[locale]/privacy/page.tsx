import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Shield, ArrowRight } from 'lucide-react';
import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
    title: 'מדיניות פרטיות | דפי עבודה חכמים',
    description: 'מדיניות הפרטיות של אתר דפי עבודה חכמים - מחולל דפי עבודה בחשבון',
};

export default function PrivacyPage() {
    return (
        <div className="min-h-screen flex flex-col bg-[#fffbf5]">
            <Header />

            <main className="flex-1">
                {/* Hero Section */}
                <section className="relative py-16 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-b from-slate-100 to-[#fffbf5]"></div>
                    <div className="absolute inset-0 dot-pattern opacity-30"></div>

                    <div className="container-custom max-w-3xl relative z-10">
                        <Link
                            href="/"
                            className="inline-flex items-center gap-2 text-slate-500 hover:text-orange-600 font-medium mb-6 transition-colors"
                        >
                            <ArrowRight size={18} />
                            <span>חזרה לדף הבית</span>
                        </Link>

                        <div className="flex items-start gap-4">
                            <div className="w-14 h-14 bg-gradient-to-br from-slate-600 to-slate-700 rounded-2xl flex items-center justify-center shadow-lg shadow-slate-200 flex-shrink-0">
                                <Shield size={28} className="text-white" />
                            </div>
                            <div>
                                <h1 className="text-3xl md:text-4xl font-black text-slate-800 mb-2">מדיניות פרטיות</h1>
                                <p className="text-slate-500">עודכן לאחרונה: ינואר 2026</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Content */}
                <section className="pb-16">
                    <div className="container-custom max-w-3xl">
                        <article className="bg-white rounded-3xl shadow-sm p-8 md:p-12 border border-slate-100">
                            <div className="prose prose-lg prose-slate max-w-none prose-headings:font-bold prose-headings:text-slate-800 prose-a:text-orange-600 prose-strong:text-slate-800">
                                <h2>מבוא</h2>
                                <p>
                                    אתר &quot;דפי עבודה חכמים&quot; (להלן: &quot;האתר&quot;) מחויב לשמירה על פרטיותכם.
                                    מדיניות פרטיות זו מסבירה כיצד אנו אוספים, משתמשים ומגינים על המידע שלכם.
                                </p>

                                <h2>איסוף מידע</h2>
                                <p>האתר אוסף את סוגי המידע הבאים:</p>
                                <ul>
                                    <li><strong>מידע טכני:</strong> כתובת IP, סוג דפדפן, מערכת הפעלה, עמודים שנצפו וזמני גישה.</li>
                                    <li><strong>עוגיות (Cookies):</strong> קבצים קטנים הנשמרים במכשירכם לצורך שיפור חווית הגלישה.</li>
                                    <li><strong>מידע אנליטי:</strong> נתוני שימוש אנונימיים באמצעות כלי ניתוח כמו Google Analytics.</li>
                                </ul>

                                <h2>שימוש במידע</h2>
                                <p>המידע שנאסף משמש אותנו ל:</p>
                                <ul>
                                    <li>שיפור חווית המשתמש באתר</li>
                                    <li>ניתוח דפוסי שימוש ושיפור התכנים</li>
                                    <li>הצגת פרסומות רלוונטיות</li>
                                    <li>עמידה בדרישות חוקיות</li>
                                </ul>

                                <h2>פרסומות</h2>
                                <p>
                                    האתר משתמש בשירותי פרסום של צד שלישי, כולל Google AdSense.
                                    ספקים אלו עשויים להשתמש בעוגיות להצגת פרסומות המבוססות על ביקורים קודמים שלכם באתר זה או באתרים אחרים.
                                </p>
                                <p>
                                    Google משתמשת בעוגיות כדי להציג מודעות המבוססות על ביקוריכם הקודמים באתר זה ובאתרים אחרים.
                                    תוכלו לבטל את השימוש בעוגיות של Google לפרסום מותאם אישית על ידי ביקור ב
                                    <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer">הגדרות המודעות של Google</a>.
                                </p>

                                <h2>עוגיות</h2>
                                <p>האתר משתמש בסוגי עוגיות הבאים:</p>
                                <ul>
                                    <li><strong>עוגיות חיוניות:</strong> נדרשות לתפעול בסיסי של האתר.</li>
                                    <li><strong>עוגיות ניתוח:</strong> עוזרות לנו להבין כיצד מבקרים משתמשים באתר.</li>
                                    <li><strong>עוגיות פרסום:</strong> משמשות להצגת פרסומות רלוונטיות.</li>
                                </ul>
                                <p>
                                    תוכלו לנהל את העדפות העוגיות שלכם דרך הגדרות הדפדפן.
                                </p>

                                <h2>שיתוף מידע</h2>
                                <p>
                                    איננו מוכרים, משכירים או משתפים מידע אישי עם צדדים שלישיים,
                                    למעט כפי שנדרש לספק את השירותים שלנו או כפי שנדרש על פי חוק.
                                </p>

                                <h2>אבטחת מידע</h2>
                                <p>
                                    אנו נוקטים באמצעי אבטחה סבירים להגנה על המידע הנאסף.
                                    עם זאת, אין שיטת העברה דרך האינטרנט שהיא בטוחה ב-100%.
                                </p>

                                <h2>זכויות המשתמש</h2>
                                <p>יש לכם את הזכות:</p>
                                <ul>
                                    <li>לבקש מידע על הנתונים שאספנו עליכם</li>
                                    <li>לבקש תיקון או מחיקה של המידע</li>
                                    <li>להתנגד לעיבוד מידע לצרכי שיווק</li>
                                </ul>

                                <h2>שינויים במדיניות</h2>
                                <p>
                                    אנו עשויים לעדכן מדיניות זו מעת לעת.
                                    נפרסם כל שינוי בעמוד זה עם תאריך העדכון האחרון.
                                </p>

                                <h2>יצירת קשר</h2>
                                <p>
                                    לשאלות בנוגע למדיניות פרטיות זו, ניתן לפנות אלינו דרך עמוד <a href="/contact">יצירת קשר</a>.
                                </p>
                            </div>
                        </article>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    );
}
