/**
 * LOJA DE COSMÉTICOS 🛍️ — itens comprados com as moedas do jogo.
 * Só aparência: não dão vantagem nos desafios.
 * Alguns itens exigem uma conquista ou módulo concluído (incentivo para estudar).
 * Para criar itens novos basta acrescentar na lista COSMETICS.
 */

export type CosmeticKind = 'hat' | 'trail' | 'tag' | 'title';

export interface Cosmetic {
  id: string;
  kind: CosmeticKind;
  name: string;
  /** chapéu/rastro: emoji desenhado no mapa · título: texto · plaquinha: cor (hex) */
  value: string;
  price: number;
  /** exigência extra para comprar */
  requires?: { achievement?: string; modules?: number; level?: number; label: string };
}

export const COSMETIC_KINDS: { id: CosmeticKind; label: string; emoji: string; desc: string }[] = [
  { id: 'hat', label: 'Chapéus', emoji: '🎩', desc: 'Aparece na cabeça do seu personagem.' },
  { id: 'trail', label: 'Rastros', emoji: '✨', desc: 'Deixa um rastro quando você anda.' },
  { id: 'tag', label: 'Plaquinhas', emoji: '🏷️', desc: 'Cor da plaquinha com o seu nome.' },
  { id: 'title', label: 'Títulos', emoji: '📜', desc: 'Um título embaixo do seu nome.' },
];

export const COSMETICS: Cosmetic[] = [
  // chapéus
  { id: 'hat_bone', kind: 'hat', name: 'Boné', value: '🧢', price: 20 },
  { id: 'hat_flor', kind: 'hat', name: 'Flor', value: '🌼', price: 20 },
  { id: 'hat_laco', kind: 'hat', name: 'Laço', value: '🎀', price: 25 },
  { id: 'hat_fone', kind: 'hat', name: 'Fone de dev', value: '🎧', price: 35 },
  { id: 'hat_cowboy', kind: 'hat', name: 'Chapéu de cowboy', value: '🤠', price: 45 },
  { id: 'hat_cartola', kind: 'hat', name: 'Cartola', value: '🎩', price: 60 },
  { id: 'hat_formatura', kind: 'hat', name: 'Capelo', value: '🎓', price: 50, requires: { modules: 1, label: 'Conclua 1 módulo' } },
  { id: 'hat_coroa', kind: 'hat', name: 'Coroa', value: '👑', price: 120, requires: { modules: 3, label: 'Conclua 3 módulos' } },
  { id: 'hat_espada', kind: 'hat', name: 'Elmo do duelista', value: '⚔️', price: 60, requires: { achievement: 'duelista', label: 'Vença um duelo' } },
  // rastros
  { id: 'trail_brilho', kind: 'trail', name: 'Brilhos', value: '✨', price: 30 },
  { id: 'trail_gotas', kind: 'trail', name: 'Gotas', value: '💧', price: 30 },
  { id: 'trail_folhas', kind: 'trail', name: 'Folhas', value: '🍃', price: 35 },
  { id: 'trail_coracao', kind: 'trail', name: 'Corações', value: '💖', price: 40 },
  { id: 'trail_estrela', kind: 'trail', name: 'Estrelas', value: '⭐', price: 50, requires: { achievement: 'sem_erros', label: 'Acerte um desafio de primeira' } },
  { id: 'trail_fogo', kind: 'trail', name: 'Fogo', value: '🔥', price: 70, requires: { achievement: 'cacador_de_chefes', label: 'Derrote um Guardião' } },
  { id: 'trail_atomo', kind: 'trail', name: 'Átomos React', value: '⚛️', price: 90, requires: { level: 5, label: 'Chegue ao nível 5' } },
  // plaquinhas do nome
  { id: 'tag_azul', kind: 'tag', name: 'Azul React', value: '#0b6e99', price: 15 },
  { id: 'tag_roxa', kind: 'tag', name: 'Roxa', value: '#6a1b9a', price: 15 },
  { id: 'tag_rosa', kind: 'tag', name: 'Rosa', value: '#ad1457', price: 15 },
  { id: 'tag_laranja', kind: 'tag', name: 'Laranja', value: '#c75b00', price: 15 },
  { id: 'tag_dourada', kind: 'tag', name: 'Dourada', value: '#a67c00', price: 60, requires: { level: 3, label: 'Chegue ao nível 3' } },
  // títulos
  { id: 'title_curioso', kind: 'title', name: 'Curioso(a)', value: '🔍 Curioso(a)', price: 10 },
  { id: 'title_dev', kind: 'title', name: 'Dev Júnior', value: '💻 Dev Júnior', price: 25 },
  { id: 'title_bug', kind: 'title', name: 'Caça-bugs', value: '🐞 Caça-bugs', price: 40, requires: { achievement: 'primeiro_acerto', label: 'Acerte um desafio' } },
  { id: 'title_mentor', kind: 'title', name: 'Mentor(a)', value: '🤝 Mentor(a)', price: 30, requires: { achievement: 'mentor', label: 'Ajude um colega a acertar' } },
  { id: 'title_cientista', kind: 'title', name: 'Cientista', value: '🧪 Cientista', price: 30, requires: { achievement: 'cientista', label: 'Monte uma tela no Laboratório' } },
  { id: 'title_velocista', kind: 'title', name: 'Velocista', value: '🏁 Velocista', price: 40, requires: { achievement: 'velocista', label: 'Ganhe uma corrida da turma' } },
  { id: 'title_guardiao', kind: 'title', name: 'Guardião(ã)', value: '🛡️ Guardião(ã)', price: 100, requires: { modules: 6, label: 'Conclua todos os módulos' } },
];

export const cosmetic = (id: string | undefined | null) => (id ? COSMETICS.find((c) => c.id === id) : undefined);

/** Aparência equipada (ids dos itens), enviada para os outros jogadores. */
export type Look = Partial<Record<CosmeticKind, string>>;

/** Motivo para não poder comprar (ou null se pode). */
export function cannotBuy(
  item: Cosmetic,
  p: { coins: number; owned?: string[]; achievements: string[]; modulesCompleted: number[]; xp: number },
  xpPerLevel: number
): string | null {
  if (p.owned?.includes(item.id)) return 'Você já tem este item.';
  const r = item.requires;
  if (r?.achievement && !p.achievements.includes(r.achievement)) return `🔒 ${r.label}`;
  if (r?.modules && p.modulesCompleted.length < r.modules) return `🔒 ${r.label}`;
  if (r?.level && Math.floor(p.xp / xpPerLevel) + 1 < r.level) return `🔒 ${r.label}`;
  if (p.coins < item.price) return `Faltam ${item.price - p.coins} 🪙`;
  return null;
}
