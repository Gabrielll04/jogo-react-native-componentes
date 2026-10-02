/**
 * Gera efeitos sonoros "8-bit" em WAV, sem dependências, em client/public/sounds.
 * Uso: npm run sounds
 * Para usar sons próprios, basta substituir os arquivos (mesmo nome).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../client/public/sounds');
const RATE = 22050;

/** notas: [frequência Hz (0 = pausa), duração s, onda] */
function synth(notes, { volume = 0.35 } = {}) {
  const samples = [];
  for (const [freq, dur, wave = 'square'] of notes) {
    const n = Math.floor(dur * RATE);
    for (let i = 0; i < n; i++) {
      const t = i / RATE;
      const env = Math.min(1, i / 200) * Math.max(0, 1 - i / n) ** 0.6; // ataque curto + decaimento
      let v = 0;
      if (freq > 0) {
        const phase = (t * freq) % 1;
        if (wave === 'square') v = phase < 0.5 ? 1 : -1;
        else if (wave === 'triangle') v = 4 * Math.abs(phase - 0.5) - 1;
        else if (wave === 'sine') v = Math.sin(2 * Math.PI * freq * t);
        else if (wave === 'noise') v = Math.random() * 2 - 1;
      }
      samples.push(v * env * volume);
    }
  }
  return samples;
}

/** varredura de frequência (para portas/whoosh) */
function sweep(from, to, dur, wave = 'square', volume = 0.3) {
  const n = Math.floor(dur * RATE);
  const out = [];
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const f = from + ((to - from) * i) / n;
    phase = (phase + f / RATE) % 1;
    const env = Math.min(1, i / 200) * (1 - i / n);
    const v = wave === 'noise' ? Math.random() * 2 - 1 : wave === 'triangle' ? 4 * Math.abs(phase - 0.5) - 1 : phase < 0.5 ? 1 : -1;
    out.push(v * env * volume);
  }
  return out;
}

function wav(samples) {
  const data = Buffer.alloc(samples.length * 2);
  samples.forEach((s, i) => data.writeInt16LE(Math.max(-1, Math.min(1, s)) * 32767, i * 2));
  const h = Buffer.alloc(44);
  h.write('RIFF', 0);
  h.writeUInt32LE(36 + data.length, 4);
  h.write('WAVE', 8);
  h.write('fmt ', 12);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20); // PCM
  h.writeUInt16LE(1, 22); // mono
  h.writeUInt32LE(RATE, 24);
  h.writeUInt32LE(RATE * 2, 28);
  h.writeUInt16LE(2, 32);
  h.writeUInt16LE(16, 34);
  h.write('data', 36);
  h.writeUInt32LE(data.length, 40);
  return Buffer.concat([h, data]);
}

const C5 = 523.25, D5 = 587.33, E5 = 659.25, G5 = 783.99, A5 = 880, C6 = 1046.5, E6 = 1318.5, G4 = 392, C4 = 261.6, E4 = 329.6;

const SOUNDS = {
  connect: synth([[C5, 0.08], [E5, 0.08], [G5, 0.14]]),
  lobby: synth([[G4, 0.1, 'triangle'], [C5, 0.1, 'triangle'], [E5, 0.1, 'triangle'], [G5, 0.22, 'triangle']]),
  correct: synth([[E5, 0.07], [G5, 0.07], [C6, 0.18]]),
  wrong: synth([[220, 0.12], [165, 0.25]], { volume: 0.3 }),
  hint: synth([[A5, 0.06, 'sine'], [E6, 0.06, 'sine'], [A5, 0.06, 'sine'], [E6, 0.14, 'sine']]),
  door: [...sweep(120, 60, 0.25, 'noise', 0.25), ...synth([[C4, 0.08], [E4, 0.08], [G4, 0.08], [C5, 0.2]])],
  module: synth([[C5, 0.1], [E5, 0.1], [G5, 0.1], [C6, 0.1], [G5, 0.1], [C6, 0.3]]),
  boss: synth([[G4, 0.12], [C5, 0.12], [E5, 0.12], [G5, 0.12], [0, 0.05], [E5, 0.1], [G5, 0.1], [C6, 0.45]]),
  achievement: synth([[D5, 0.06, 'triangle'], [G5, 0.06, 'triangle'], [D5, 0.06, 'triangle'], [G5, 0.06, 'triangle'], [C6, 0.25, 'triangle']]),
  click: synth([[900, 0.025]], { volume: 0.2 }),
  // convite de duelo: "toque de corneta" curto
  duel: synth([[G4, 0.09, 'square'], [0, 0.03], [G4, 0.09, 'square'], [0, 0.03], [C5, 0.12, 'square'], [E5, 0.12, 'square'], [G5, 0.28, 'square']], { volume: 0.3 }),
};

fs.mkdirSync(OUT, { recursive: true });
for (const [name, samples] of Object.entries(SOUNDS)) {
  fs.writeFileSync(path.join(OUT, `${name}.wav`), wav(samples));
}
console.log(`✔ ${Object.keys(SOUNDS).length} sons gerados em ${OUT}`);
