'use client';

import Link from 'next/link';
import { BookOpen, ArrowLeft } from 'lucide-react';
import { HelpTopicJSON } from '@/lib/content';

interface HelpIndexClientProps {
    topics: HelpTopicJSON[];
}

export function HelpIndexClient({ topics }: HelpIndexClientProps) {
    return (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {topics.map((topic, index) => (
                <Link
                    key={topic.slug}
                    href={`/help/${topic.slug}`}
                    className="group bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-xl hover:border-emerald-200 transition-all card-lift"
                    style={{ animationDelay: `${index * 50}ms` }}
                >
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 group-hover:bg-emerald-100 group-hover:scale-110 transition-all">
                            <BookOpen size={24} />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-xl font-bold text-slate-800 mb-2 group-hover:text-emerald-600 transition-colors">
                                {topic.title}
                            </h3>
                            <p className="text-slate-500 text-sm leading-relaxed line-clamp-2">
                                {topic.shortDescription}
                            </p>
                        </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-slate-100 flex items-center text-emerald-600 font-bold text-sm">
                        <span>קראו עוד</span>
                        <ArrowLeft size={16} className="mr-2 opacity-0 group-hover:opacity-100 group-hover:-translate-x-1 transition-all" />
                    </div>
                </Link>
            ))}
        </div>
    );
}
