import React from 'react';

interface ContentSectionProps {
    title: string;
    description: string;
    featuresTitle?: string;
    features?: string[];
    benefitsTitle?: string;
    benefits?: { title: string; text: string }[];
    tipsTitle?: string;
    tips?: string[];
}

export default function ContentSection({
    title,
    description,
    featuresTitle = "מה אפשר לתרגל?",
    features,
    benefitsTitle = "למה להשתמש במחולל דפי העבודה?",
    benefits,
    tipsTitle = "טיפים לתרגול מוצלח עם הילדים",
    tips
}: ContentSectionProps) {
    // Generate HowTo Schema for worksheet generation instructions
    const howToSchema = {
        "@context": "https://schema.org",
        "@type": "HowTo",
        "name": title,
        "description": description,
        "step": tips ? tips.map((tip, index) => ({
            "@type": "HowToStep",
            "position": index + 1,
            "text": tip
        })) : []
    };

    return (
        <>
            {tips && tips.length > 0 && (
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{
                        __html: JSON.stringify(howToSchema)
                    }}
                />
            )}
            <article className="max-w-4xl mx-auto mt-16 px-4 print:hidden space-y-12 pb-20 text-slate-700">
            {/* Main Header & Intro */}
            <section className="text-center space-y-4">
                <h2 className="text-3xl font-bold text-slate-900">{title}</h2>
                <p className="text-lg leading-relaxed max-w-2xl mx-auto">{description}</p>
            </section>

            <div className="grid md:grid-cols-2 gap-12">
                {/* Features List */}
                {features && features.length > 0 && (
                    <section className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
                        <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <span className="text-blue-500 text-2xl">•</span> {featuresTitle}
                        </h3>
                        <ul className="space-y-3">
                            {features.map((feature, idx) => (
                                <li key={idx} className="flex items-start gap-3">
                                    <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0"></div>
                                    <span>{feature}</span>
                                </li>
                            ))}
                        </ul>
                    </section>
                )}

                {/* Benefits / FAQ */}
                {benefits && benefits.length > 0 && (
                    <section className="space-y-6">
                        <h3 className="text-xl font-bold text-slate-800 mb-4">{benefitsTitle}</h3>
                        <div className="space-y-6">
                            {benefits.map((item, idx) => (
                                <div key={idx}>
                                    <h4 className="font-bold text-slate-900 mb-1">{item.title}</h4>
                                    <p className="text-slate-600 text-sm leading-relaxed">{item.text}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                )}
            </div>

            {/* Educational Tips */}
            {tips && tips.length > 0 && (
                <section className="bg-blue-50 p-8 rounded-2xl border border-blue-100">
                    <h3 className="text-xl font-bold text-blue-900 mb-6 text-center">{tipsTitle}</h3>
                    <div className="grid sm:grid-cols-2 gap-6">
                        {tips.map((tip, idx) => (
                            <div key={idx} className="bg-white p-4 rounded-xl shadow-sm border border-blue-100/50">
                                <p className="text-slate-700 font-medium">💡 {tip}</p>
                            </div>
                        ))}
                    </div>
                </section>
            )}
            </article>
        </>
    );
}
