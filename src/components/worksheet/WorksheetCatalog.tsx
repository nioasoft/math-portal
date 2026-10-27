'use client';

import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowLeft, Search, Calculator, Shapes, Brain, PieChart } from 'lucide-react';
import { Link } from '@/i18n/navigation';

const topics = [
    { id: 'addition', route: '/worksheet/math?op=add', title: 'operations.addition', category: 'arithmetic' },
    { id: 'subtraction', route: '/worksheet/math?op=sub', title: 'operations.subtraction', category: 'arithmetic' },
    { id: 'multiplication', route: '/worksheet/math?op=mul&range=100', title: 'operations.multiplication', category: 'arithmetic' },
    { id: 'division', route: '/worksheet/math?op=div&range=100', title: 'operations.division', category: 'arithmetic' },
    { id: 'fractions', route: '/fractions', title: 'fractions.title', category: 'parts' },
    { id: 'decimals', route: '/decimals', title: 'decimals.title', category: 'parts' },
    { id: 'percentage', route: '/percentage', title: 'percentage.title', category: 'parts' },
    { id: 'ratio', route: '/ratio', title: 'ratio.title', category: 'parts' },
    { id: 'geometry', route: '/geometry', title: 'geometry.title', category: 'measurement' },
    { id: 'units', route: '/units', title: 'units.title', category: 'measurement' },
    { id: 'word-problems', route: '/word-problems', title: 'wordProblems.title', category: 'thinking' },
    { id: 'series', route: '/series', title: 'series.title', category: 'thinking' },
] as const;
const categories = ['all', 'arithmetic', 'parts', 'measurement', 'thinking'] as const;
const icons = { arithmetic: Calculator, parts: PieChart, measurement: Shapes, thinking: Brain };
const normalize = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase().trim();

/** Local filters: searchable translated content stays on the device. */
export function WorksheetCatalog() {
    const t = useTranslations('worksheet');
    const search = useRef<HTMLInputElement>(null);
    const [query, setQuery] = useState('');
    const [category, setCategory] = useState<string>('all');
    const words = normalize(query).split(/\s+/).filter(Boolean);
    const shown = topics.filter(topic => {
        const text = normalize(`${t(topic.title)} ${t(`catalog.descriptions.${topic.id}`)} ${t(`catalog.categories.${topic.category}`)}`);
        return (category === 'all' || category === topic.category) && words.every(word => text.includes(word));
    });
    const reset = () => { setQuery(''); setCategory('all'); search.current?.focus(); };
    return (
        <section aria-labelledby="worksheet-catalog-title">
            <h2 id="worksheet-catalog-title" className="mb-5 text-2xl font-bold text-slate-900">{t('catalog.chooseTopic')}</h2>
            <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
                <label htmlFor="worksheet-search" className="mb-2 block text-sm font-bold text-slate-700">{t('catalog.searchLabel')}</label>
                <div className="relative max-w-xl">
                    <Search size={20} className="pointer-events-none absolute start-3 top-3 text-slate-500" aria-hidden="true" />
                    <input ref={search} id="worksheet-search" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder={t('catalog.searchPlaceholder')}
                        maxLength={100} autoComplete="off" className="min-h-11 w-full rounded-xl border border-slate-400 bg-white py-2 pe-3 ps-10 text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600" />
                </div>
                <div role="group" aria-label={t('catalog.categoryLabel')} className="mt-4 flex flex-wrap gap-2">
                    {categories.map(item => <button key={item} type="button" aria-pressed={category === item} onClick={() => setCategory(item)}
                        className={`min-h-11 rounded-full border px-4 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600 ${category === item ? 'border-orange-700 bg-orange-700 text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}>
                        {t(`catalog.categories.${item}`)}
                    </button>)}
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                    <p role="status" className="text-sm text-slate-600">{t('catalog.resultCount', { count: shown.length })}</p>
                    {(query || category !== 'all') && <button type="button" onClick={reset} className="min-h-11 rounded-lg px-2 text-sm font-bold text-orange-800 underline focus-visible:outline-2 focus-visible:outline-orange-600">{t('catalog.reset')}</button>}
                </div>
            </div>
            {shown.length ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {shown.map(topic => <TopicCard key={topic.id} topic={topic} />)}
            </div> : <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
                <h3 className="mb-2 text-xl font-bold text-slate-900">{t('catalog.noResults')}</h3>
                <p className="text-slate-600">{t('catalog.noResultsHint')}</p>
                <button type="button" onClick={reset} className="mt-5 min-h-11 rounded-xl bg-orange-700 px-5 py-3 font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-700">{t('catalog.showAll')}</button>
            </div>}
        </section>
    );
}

function TopicCard({ topic }: { topic: typeof topics[number] }) {
    const t = useTranslations('worksheet');
    const Icon = icons[topic.category];
    return <Link href={topic.route} data-discovery-source="worksheet_catalog" data-discovery-target={topic.id}
        className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-6 transition hover:border-orange-400 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600">
        <Icon size={24} className="mb-4 text-orange-700" aria-hidden="true" />
        <h3 className="mb-2 text-xl font-bold text-slate-900">{t(topic.title)}</h3>
        <p className="mb-5 flex-1 text-base leading-relaxed text-slate-600">{t(`catalog.descriptions.${topic.id}`)}</p>
        <span className="flex items-center gap-2 font-bold text-orange-800">{t('catalog.open')}<ArrowLeft size={18} className="ltr:rotate-180" aria-hidden="true" /></span>
    </Link>;
}
