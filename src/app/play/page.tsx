import { Metadata } from 'next';
import Link from 'next/link';
import { Calculator, Percent, PieChart, Gamepad2, Trophy, Zap } from 'lucide-react';
import { AdSlot } from '@/components/AdSlot';

export const metadata: Metadata = {
    title: 'משחקי מתמטיקה | דפי עבודה חכמים',
    description: 'משחקי מתמטיקה אינטראקטיביים לתרגול חשבון, שברים ואחוזים. תרגול חופשי או חידון עם טיימר.',
};

const topics = [
    {
        id: 'math',
        title: 'חשבון בסיסי',
        description: 'חיבור, חיסור, כפל וחילוק',
        icon: Calculator,
        color: 'from-blue-500 to-blue-600',
        bgColor: 'bg-blue-50',
        href: '/play/math'
    },
    {
        id: 'fractions',
        title: 'שברים',
        description: 'פעולות עם שברים פשוטים ומעורבים',
        icon: PieChart,
        color: 'from-purple-500 to-purple-600',
        bgColor: 'bg-purple-50',
        href: '/play/fractions'
    },
    {
        id: 'percentage',
        title: 'אחוזים',
        description: 'חישוב אחוז מתוך שלם',
        icon: Percent,
        color: 'from-emerald-500 to-emerald-600',
        bgColor: 'bg-emerald-50',
        href: '/play/percentage'
    }
];

export default function PlayPage() {
    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 shadow-sm">
                <div className="container-custom py-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg">
                                <Gamepad2 className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-slate-800">משחקי מתמטיקה</h1>
                                <p className="text-slate-500 text-sm">בחרו נושא והתחילו לשחק!</p>
                            </div>
                        </div>
                        <Link
                            href="/"
                            className="text-slate-500 hover:text-slate-700 transition text-sm"
                        >
                            חזרה לדף הבית
                        </Link>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="container-custom py-12">
                {/* Game Mode Explanation */}
                <div className="grid md:grid-cols-2 gap-6 mb-12">
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-green-100 rounded-lg">
                                <Zap className="w-5 h-5 text-green-600" />
                            </div>
                            <h2 className="text-lg font-bold text-slate-800">תרגול חופשי</h2>
                        </div>
                        <p className="text-slate-600 text-sm leading-relaxed">
                            תרגלו ללא לחץ זמן. תרגילים אינסופיים, צברו סטריק של תשובות נכונות ושפרו את הניקוד שלכם.
                        </p>
                    </div>

                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-orange-100 rounded-lg">
                                <Trophy className="w-5 h-5 text-orange-600" />
                            </div>
                            <h2 className="text-lg font-bold text-slate-800">חידון עם טיימר</h2>
                        </div>
                        <p className="text-slate-600 text-sm leading-relaxed">
                            התחרו נגד השעון! 60/90/120 שניות לענות על כמה שיותר תרגילים. שברו שיאים!
                        </p>
                    </div>
                </div>

                {/* Topic Cards */}
                <h2 className="text-xl font-bold text-slate-800 mb-6">בחרו נושא</h2>
                <div className="grid md:grid-cols-3 gap-6">
                    {topics.map((topic) => {
                        const Icon = topic.icon;
                        return (
                            <Link
                                key={topic.id}
                                href={topic.href}
                                className="group"
                            >
                                <div className={`${topic.bgColor} rounded-2xl p-6 shadow-sm border border-slate-200 transition-all duration-300 hover:shadow-lg hover:scale-[1.02] hover:border-slate-300`}>
                                    <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${topic.color} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
                                        <Icon className="w-8 h-8 text-white" />
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-800 mb-2">{topic.title}</h3>
                                    <p className="text-slate-600 text-sm">{topic.description}</p>
                                    <div className="mt-4 flex items-center gap-2 text-sm font-medium text-slate-500 group-hover:text-slate-700 transition">
                                        <span>התחילו לשחק</span>
                                        <span className="group-hover:translate-x-[-4px] transition-transform">←</span>
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>

                {/* Ad Slot */}
                <div className="mt-12">
                    <AdSlot slotId="play-page-bottom" format="horizontal" className="mx-auto max-w-3xl" />
                </div>

                {/* Back to worksheets link */}
                <div className="mt-8 text-center">
                    <p className="text-slate-500 mb-2">רוצים להדפיס דפי עבודה?</p>
                    <Link
                        href="/"
                        className="text-indigo-600 hover:text-indigo-700 font-medium"
                    >
                        חזרו לדף הראשי להדפסה
                    </Link>
                </div>
            </div>
        </div>
    );
}
