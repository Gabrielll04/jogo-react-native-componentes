import Phaser from 'phaser';
import { useEffect, useRef } from 'react';
import { WorldScene } from './WorldScene';

/** Monta o Phaser dentro de uma <div> e destrói ao sair do mundo. */
export function GameCanvas() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let game: Phaser.Game | null = null;
    let cancelled = false;
    // garante que as fontes do jogo carregaram antes de o Phaser desenhar textos
    const ready = Promise.race([
      Promise.all(['900 14px Nunito', '700 12px "JetBrains Mono"'].map((f) => document.fonts.load(f))),
      new Promise((r) => setTimeout(r, 1500)),
    ]);
    ready.then(() => {
      if (cancelled || !ref.current) return;
      game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: ref.current,
        backgroundColor: '#1d2b1f',
        scale: { mode: Phaser.Scale.RESIZE, width: '100%', height: '100%' },
        scene: [WorldScene],
        // som fica com o Howler; o Phaser não precisa de áudio
        audio: { noAudio: true },
        banner: false,
      });
    });
    return () => {
      cancelled = true;
      game?.destroy(true);
    };
  }, []);

  return <div ref={ref} style={{ position: 'absolute', inset: 0 }} />;
}
