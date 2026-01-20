import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'בלוג - מאמרים וטיפים ללימוד חשבון',
  description: 'מאמרים, טיפים וכלים להורים ומורים ללימוד חשבון חוויתי. הדרכות מעשיות לשיפור יכולות מתמטיות בבית.',
  keywords: ['בלוג חשבון', 'טיפים ללימוד חשבון', 'מאמרים חינוכיים', 'הורים ומורים'],
};

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return children;
}
