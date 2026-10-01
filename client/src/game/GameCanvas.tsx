import Phaser from 'phaser';
import { useEffect, useRef } from 'react';
import { WorldScene } from './WorldScene';

/** Monta o Phaser dentro de uma <div> e destrói ao sair do mundo. */
export function GameCanvas() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: ref.current,
      backgroundColor: '#1d2b1f',
      scale: { mode: Phaser.Scale.RESIZE, width: '100%', height: '100%' },
      scene: [WorldScene],
      // som fica com o Howler; o Phaser não precisa de áudio
      audio: { noAudio: true },
      banner: false,
    });
    return () => game.destroy(true);
  }, []);

  return <div ref={ref} style={{ position: 'absolute', inset: 0 }} />;
}
