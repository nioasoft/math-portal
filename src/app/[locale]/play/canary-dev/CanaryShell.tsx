'use client';

import { Game3DShell } from '@/components/games3d/Game3DShell';
import type { BreadcrumbItem } from '@/components/ui/Breadcrumb';
import { canaryGame } from './CanaryGame';

interface Props {
  title: string;
  breadcrumbItems: BreadcrumbItem[];
}

/**
 * Dev-only client wrapper for the canary game. Supplies the game via a client-side
 * loader because the game object holds functions and cannot cross the
 * server→client boundary as a prop.
 */
export function CanaryShell({ title, breadcrumbItems }: Props): React.ReactElement {
  return (
    <Game3DShell
      gameId={canaryGame.meta.id}
      meta={canaryGame.meta}
      title={title}
      webGLAvailable={true}
      breadcrumbItems={breadcrumbItems}
      gameLoader={() => Promise.resolve({ default: canaryGame })}
    />
  );
}
