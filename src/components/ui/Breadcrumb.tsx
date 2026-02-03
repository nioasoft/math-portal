import Link from 'next/link';

export interface BreadcrumbItem {
    label: string;
    href?: string;
}

interface BreadcrumbProps {
    items: BreadcrumbItem[];
    className?: string;
}

export function Breadcrumb({ items, className = '' }: BreadcrumbProps) {
    return (
        <nav
            aria-label="Breadcrumb"
            className={`flex items-center gap-2 text-sm text-slate-500 ${className}`}
        >
            {items.map((item, index) => (
                <span key={index} className="flex items-center gap-2">
                    {index > 0 && <span aria-hidden="true">/</span>}
                    {item.href ? (
                        <Link
                            href={item.href}
                            className="hover:text-orange-600 transition-colors"
                        >
                            {item.label}
                        </Link>
                    ) : (
                        <span className="text-slate-800 font-medium">{item.label}</span>
                    )}
                </span>
            ))}
        </nav>
    );
}
