'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { WorksheetSettings, type DocumentSettings } from './WorksheetSettings';

interface WorksheetDocumentProps<T> {
    title: string;
    instruction?: string;
    items: T[];
    perPage: number;
    variant: string;
    includeAnswers: boolean;
    renderPage: (items: T[], answers: boolean, offset: number) => ReactNode;
}

/** A single source of truth for screen preview and physical A4 pagination. */
export function WorksheetDocument<T>({ title, instruction, items, perPage, variant, includeAnswers, renderPage }: WorksheetDocumentProps<T>): React.ReactElement {
    const t = useTranslations('worksheet');
    const container = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(1);
    const [settings, setSettings] = useState<DocumentSettings>({ title: '', name: '', limit: -1, density: 'standard', answersOnly: false });
    const compactSize = variant === 'geometry' ? 8 : variant === 'series' ? 10 : Math.floor(perPage * 1.5);
    const pageSize = settings.density === 'spacious' ? Math.max(2, Math.floor(perPage / 2)) : settings.density === 'compact' ? compactSize : perPage;
    useEffect(() => {
        const element = container.current;
        if (!element) return;
        const observer = new ResizeObserver(([entry]) => {
            setScale(Math.min(1, entry.contentRect.width / (210 * 96 / 25.4)));
        });
        observer.observe(element);
        return () => observer.disconnect();
    }, []);
    const selected = settings.limit === -1 ? items.slice(0, pageSize) : settings.limit ? items.slice(0, settings.limit) : items;
    const pages = Array.from({ length: Math.ceil(selected.length / pageSize) }, (_, i) => selected.slice(i * pageSize, (i + 1) * pageSize));
    return (
        <div className="worksheet-document" ref={container}>
            <WorksheetSettings settings={settings} onChange={setSettings} count={items.length} selectedCount={selected.length} perPage={pageSize} pages={pages.length} includeAnswers={includeAnswers} />
            <div className="worksheet-preview" style={{ zoom: scale }}>
                {[...(includeAnswers && settings.answersOnly ? [] : [false]), ...(includeAnswers ? [true] : [])].flatMap(answers => pages.map((page, index) => (
                    <section className={`worksheet-page worksheet-${variant}`} key={`${answers}-${index}`} data-answers={answers} data-density={settings.density}>
                        <header className="worksheet-page-header">
                            <div className="worksheet-page-kicker"><span>{answers ? t('print.answerKey') : t('print.title')}</span><bdi>tirgul.net</bdi></div>
                            <h2>{settings.title.trim() || title}</h2>
                            {instruction && <p>{instruction}</p>}
                            {!answers && <div className="worksheet-personal"><span>{t('print.name')} {settings.name.trim() ? <bdi>{settings.name}</bdi> : <i />}</span><span>{t('print.date')} <i /></span></div>}
                        </header>
                        <div className="worksheet-exercises">
                            {renderPage(page, answers, index * pageSize)}
                        </div>
                        <footer className="worksheet-page-footer"><span>{t('print.copyright')}</span><span>{t('document.page', { page: index + 1, pages: pages.length })}</span></footer>
                    </section>
                )))}
            </div>
        </div>
    );
}
