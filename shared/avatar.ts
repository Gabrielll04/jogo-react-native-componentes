/**
 * Aparência do personagem (menu "Personagem"): tom de pele, cor do cabelo e cor da roupa.
 * Quem nunca escolheu fica com pele/cabelo sorteados pelo nome (como nas versões anteriores).
 */

/** tons de pele, do mais claro ao mais escuro */
export const SKIN_TONES = ['#ffe0c4', '#ffdcb5', '#f2c79b', '#e8b48a', '#d9a066', '#c68642', '#a8714a', '#8d5a3b', '#7a4b2e', '#5a3620'];
export const HAIR_COLORS = ['#1c1c1c', '#3b2414', '#7a4a1e', '#a33b1e', '#d9a23a', '#f0d58c', '#e8e1d4', '#5b3a8a', '#2f6fd6', '#d6458a'];

// paletas antigas (a ordem importa: é o que o sorteio pelo nome sempre usou)
const LEGACY_SKINS = ['#f2c79b', '#d9a066', '#a8714a', '#7a4b2e', '#ffdcb5'];
const LEGACY_HAIRS = ['#3b2414', '#1c1c1c', '#7a4a1e', '#d9a23a', '#a33b1e', '#5b3a8a'];

function hash(s: string) {
  let h = 0;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

/** pele e cabelo efetivos (escolhidos no menu ou sorteados pelo nome) */
export function resolveLook(name: string, skin?: string, hair?: string) {
  const h = hash(name);
  return {
    skin: skin && SKIN_TONES.includes(skin) ? skin : LEGACY_SKINS[(h >> 3) % LEGACY_SKINS.length],
    hair: hair && HAIR_COLORS.includes(hair) ? hair : LEGACY_HAIRS[h % LEGACY_HAIRS.length],
  };
}
