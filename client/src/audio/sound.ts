/**
 * Função central de som: playSound(nome).
 *
 * Os arquivos ficam em client/public/sounds/<nome>.wav (gerados por
 * `npm run sounds`). Para trocar por sons próprios, coloque um .mp3 ou
 * .wav com o mesmo nome e ajuste a extensão em SOUND_FILES.
 *
 * Navegadores só liberam áudio depois de uma interação do usuário
 * (clique/tecla). O Howler desbloqueia sozinho no primeiro clique —
 * por isso o primeiro som toca só depois do botão "Entrar".
 */
import { Howl, Howler } from 'howler';
import type { SoundName } from '@shared/types';
import { getState, setState } from '../state/store';

const SOUND_FILES: Record<SoundName, string> = {
  connect: '/sounds/connect.wav',
  lobby: '/sounds/lobby.wav',
  correct: '/sounds/correct.wav',
  wrong: '/sounds/wrong.wav',
  hint: '/sounds/hint.wav',
  door: '/sounds/door.wav',
  module: '/sounds/module.wav',
  boss: '/sounds/boss.wav',
  achievement: '/sounds/achievement.wav',
  click: '/sounds/click.wav',
  duel: '/sounds/duel.wav',
};

const VOLUME: Partial<Record<SoundName, number>> = { click: 0.4 };
const cache = new Map<SoundName, Howl>();

export function playSound(name: SoundName) {
  if (getState().muted) return;
  let howl = cache.get(name);
  if (!howl) {
    howl = new Howl({ src: [SOUND_FILES[name]], volume: VOLUME[name] ?? 0.7 });
    cache.set(name, howl);
  }
  howl.play();
}

export function toggleMute() {
  const muted = !getState().muted;
  Howler.mute(muted);
  setState({ muted });
}
