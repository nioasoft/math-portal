'use client';

import { useTranslations } from 'next-intl';

export interface DocumentSettings {
    title: string;
    name: string;
    limit: number;
    density: 'spacious' | 'standard' | 'compact';
    answersOnly: boolean;
}
interface WorksheetSettingsProps {
    settings: DocumentSettings;
    onChange: (settings: DocumentSettings) => void;
    count: number;
    perPage: number;
    pages: number;
    includeAnswers: boolean;
}

export function WorksheetSettings({ settings, onChange, count, perPage, pages, includeAnswers }: WorksheetSettingsProps): React.ReactElement {
    const t = useTranslations('worksheet');
    const update = (next: Partial<DocumentSettings>) => onChange({ ...settings, ...next });
    const counts = [...new Set([4, 6, 8, 10, 12, 16, perPage, settings.limit].filter(n => n > 0 && n < count))].sort((a, b) => a - b);
    return (
        <div className="worksheet-settings print:hidden">
            <div className="worksheet-settings-fields">
                <label>{t('document.customTitle')}<input maxLength={60} value={settings.title} onChange={e => update({ title: e.target.value })} placeholder={t('document.optional')} /></label>
                <label>{t('document.childName')}<input maxLength={40} value={settings.name} onChange={e => update({ name: e.target.value })} placeholder={t('document.optional')} autoComplete="off" /></label>
                <label>{t('controls.problemCount')}<select value={settings.limit >= count ? 0 : settings.limit} onChange={e => update({ limit: Number(e.target.value) })}>
                    <option value={0}>{t('document.all', { count })}</option>
                    {counts.map(n => <option key={n} value={n}>{n === perPage ? t('document.onePage', { count: n }) : n}</option>)}
                </select></label>
            </div>
            <div className="worksheet-settings-options">
                <label>{t('document.density')}<select value={settings.density} onChange={e => update({ density: e.target.value as DocumentSettings['density'] })}>
                    <option value="spacious">{t('document.spacious')}</option>
                    <option value="standard">{t('document.standard')}</option>
                    <option value="compact">{t('document.compact')}</option>
                </select></label>
                {includeAnswers && <label><input type="checkbox" checked={settings.answersOnly} onChange={e => update({ answersOnly: e.target.checked })} />{t('document.answersOnly')}</label>}
            </div>
            <p aria-live="polite">{t('document.summary', { count: settings.limit ? Math.min(settings.limit, count) : count, pages: includeAnswers && settings.answersOnly ? 0 : pages, answers: includeAnswers ? pages : 0 })}</p>
            <p className="worksheet-print-hint">{t('document.printHint')}</p>
        </div>
    );
}
