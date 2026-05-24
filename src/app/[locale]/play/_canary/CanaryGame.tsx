'use client';

import * as THREE from 'three';
import type { Game3D } from '@/lib/games3d/types';

export const canaryGame: Game3D = {
  meta: {
    id: 'canary-tap-cube',
    i18nKey: 'games3d.canary',
    topic: 'misc',
    difficulty: 1,
    gradeRange: [1, 6],
    estimatedSeconds: 30,
    supportedModes: ['practice'],
  },

  init(ctx) {
    ctx.presets.camera.orbit(new THREE.Vector3(0, 0, 0), 5);
    ctx.presets.lighting.daylight(ctx.scene);

    const geo = new THREE.BoxGeometry(1, 1, 1);
    const mat = new THREE.MeshStandardMaterial({ color: 0x4f46e5 });
    const cube = new THREE.Mesh(geo, mat);
    ctx.scene.add(cube);

    let points = 0;
    const startTime = performance.now();

    const off = ctx.input.on('tap', (p) => {
      if (p.picked === cube) {
        points++;
        ctx.score.add(1);
        ctx.audio.play('success');
        ctx.feedback.correct('+1');
        mat.color.setHex(Math.floor(Math.random() * 0xffffff));
        if (points >= 5) {
          const durationSec = (performance.now() - startTime) / 1000;
          ctx.complete({ totalPoints: points, accuracy: 1, durationSec });
        }
      } else {
        ctx.audio.play('click');
        ctx.feedback.hint('Tap the cube');
      }
    });

    return {
      onFrame(dt) {
        cube.rotation.y += dt * 0.5;
        cube.rotation.x += dt * 0.2;
      },
      dispose() {
        off();
        ctx.scene.remove(cube);
        geo.dispose();
        mat.dispose();
      },
    };
  },
};
