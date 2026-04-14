import type { Metadata } from 'next';

export const metadata: Metadata = {
  metadataBase: new URL('https://www.tirgul.net'),
};

// Root layout - minimal wrapper that delegates to [locale]/layout.tsx
// This file is required by Next.js but the actual layout logic is in the locale layout
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
