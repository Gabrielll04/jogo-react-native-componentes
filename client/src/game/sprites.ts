/**
 * Personagens em pixel art desenhados por código (sem arquivos de imagem).
 * Cada textura tem 8 quadros de 16x20: 4 direções x 2 passos de caminhada.
 * Quadros: down0 down1 up0 up1 left0 left1 right0 right1
 */
import Phaser from 'phaser';

export type Dir = 'down' | 'up' | 'left' | 'right';
const DIRS: Dir[] = ['down', 'up', 'left', 'right'];
const FW = 16;
const FH = 20;

export interface CharLook {
  shirt: string;
  hair: string;
  skin: string;
  pants: string;
  /** Mestre: túnica longa, chapéu de mago e barba */
  mentor?: boolean;
}

const SKINS = ['#f2c79b', '#d9a066', '#a8714a', '#7a4b2e', '#ffdcb5'];
const HAIRS = ['#3b2414', '#1c1c1c', '#7a4a1e', '#d9a23a', '#a33b1e', '#5b3a8a'];

function hash(s: string) {
  let h = 0;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

/** Visual de aluno: camiseta da cor escolhida; cabelo e pele variam pelo nome. */
export function playerLook(name: string, color: string): CharLook {
  const h = hash(name);
  return { shirt: color, hair: HAIRS[h % HAIRS.length], skin: SKINS[(h >> 3) % SKINS.length], pants: '#2c3e66' };
}

export function mentorLook(color: string): CharLook {
  return { shirt: color, hair: '#eeeeee', skin: '#f2c79b', pants: color, mentor: true };
}

function shade(hex: string, f: number) {
  const c = Phaser.Display.Color.HexStringToColor(hex);
  const k = (v: number) => Math.max(0, Math.min(255, Math.round(v * f)));
  return Phaser.Display.Color.RGBToString(k(c.red), k(c.green), k(c.blue), 255, '#');
}

function drawFrame(ctx: CanvasRenderingContext2D, ox: number, dir: Dir, step: number, look: CharLook) {
  const px = (x: number, y: number, w: number, h: number, c: string) => {
    ctx.fillStyle = c;
    ctx.fillRect(ox + x, y, w, h);
  };
  const outline = '#1b1b2a';
  const shirtDark = shade(look.shirt, 0.72);
  const swing = step === 1 ? 1 : 0;

  // ---- pernas / túnica
  if (look.mentor) {
    px(3, 10, 10, 9, look.shirt);
    px(3, 17, 10, 2, shirtDark);
    px(4 + swing, 19, 3, 1, outline);
    px(9 - swing, 19, 3, 1, outline);
  } else {
    const legL = step === 1 ? 4 : 5;
    const legR = step === 1 ? 4 : 5;
    px(5, 14, 2, legL, look.pants);
    px(9, 14, 2, legR, look.pants);
    px(5, 14 + legL, 2, 1, outline);
    px(9, 14 + legR, 2, 1, outline);
  }

  // ---- corpo
  px(4, 8, 8, 7, look.shirt);
  px(4, 13, 8, 2, shirtDark);
  // braços balançando
  const armA = step === 1 ? 1 : 0;
  if (dir === 'left' || dir === 'right') {
    px(dir === 'left' ? 6 + armA : 8 - armA, 9, 2, 5, shirtDark);
    px(dir === 'left' ? 6 + armA : 8 - armA, 13, 2, 1, look.skin);
  } else {
    px(3, 9 + armA, 1, 4, shirtDark);
    px(12, 9 + (1 - armA), 1, 4, shirtDark);
    px(3, 13 + armA, 1, 1, look.skin);
    px(12, 13 + (1 - armA), 1, 1, look.skin);
  }

  // ---- cabeça
  px(5, 2, 6, 6, look.skin);
  px(4, 3, 1, 4, look.skin);
  px(11, 3, 1, 4, look.skin);
  // cabelo
  if (dir === 'up') {
    px(4, 1, 8, 6, look.hair);
  } else {
    px(4, 1, 8, 2, look.hair);
    if (dir === 'left') px(9, 2, 3, 3, look.hair);
    else if (dir === 'right') px(4, 2, 3, 3, look.hair);
    else {
      px(4, 2, 1, 2, look.hair);
      px(11, 2, 1, 2, look.hair);
    }
  }
  // olhos
  if (dir === 'down') {
    px(6, 5, 1, 1, outline);
    px(9, 5, 1, 1, outline);
  } else if (dir === 'left') px(5, 5, 1, 1, outline);
  else if (dir === 'right') px(10, 5, 1, 1, outline);

  // ---- Mestre: barba e chapéu de mago
  if (look.mentor) {
    if (dir !== 'up') px(5, 6, 6, 3, '#f5f5f5');
    const hat = shade(look.shirt, 0.6);
    px(3, 1, 10, 1, hat);
    px(5, 0, 6, 1, hat);
    px(7, -1, 3, 1, hat);
    px(4, 1, 8, 1, '#ffd54a');
  }
}

/** Cria (uma vez) a textura do personagem e devolve a chave. */
export function ensureCharTexture(scene: Phaser.Scene, key: string, look: CharLook) {
  if (scene.textures.exists(key)) return key;
  const tex = scene.textures.createCanvas(key, FW * 8, FH + 1)!;
  const ctx = tex.getContext();
  ctx.translate(0, 1); // 1px de folga para o chapéu
  DIRS.forEach((dir, d) => {
    for (let step = 0; step < 2; step++) drawFrame(ctx, (d * 2 + step) * FW, dir, step, look);
  });
  DIRS.forEach((dir, d) => {
    for (let step = 0; step < 2; step++) tex.add(`${dir}${step}`, 0, (d * 2 + step) * FW, 0, FW, FH + 1);
  });
  tex.refresh();
  tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
  return key;
}
