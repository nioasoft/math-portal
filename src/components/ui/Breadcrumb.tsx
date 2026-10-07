import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';

export interface BreadcrumbItem {
    label: string;
    href?: string;
}

interface BreadcrumbProps {
    items: BreadcrumbItem[];
    className?: string;
}

export function Breadcrumb({ items, className = '' }: BreadcrumbProps) {
    const t = useTranslations('common');

    return (
        <nav aria-label={t('nav.breadcrumb')} className={`text-sm text-slate-500 ${className}`}>
            <ol className="flex items-center gap-2">
                {items.map((item, index) => (
                    <li key={index} className="flex items-center gap-2">
                        {index > 0 && <span aria-hidden="true">/</span>}
                        {item.href ? (
                            <Link
                                href={item.href}
                                className="hover:text-orange-600 transition-colors"
                            >
                                {item.label}
                            </Link>
                        ) : (
                            <span aria-current="page" className="text-slate-800 font-medium">
                                {item.label}
                            </span>
                        )}
                    </li>
                ))}
            </ol>
        </nav>
    );
}
