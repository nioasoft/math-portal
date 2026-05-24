'use client';

import { useTranslations } from 'next-intl';

export function WebGLFallback(): React.ReactElement {
  const t = useTranslations('games3d');
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center text-white">
      <p className="text-lg max-w-md">{t('webglNotSupported')}</p>
    </div>
  );
}
