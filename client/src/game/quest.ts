/**
 * Sistema de missões: calcula qual é o PRÓXIMO passo do aluno
 * (aprender com um Mestre -> desafios -> chefe -> próximo módulo).
 * Usado pelo HUD (texto da missão) e pela cena (seta guia e marcador).
 */
import { buildWorld, TILE } from '@shared/map';
import { MODULES } from '@shared/modules';
import type { ModuleState, PlayerProgress } from '@shared/types';

export const WORLD = buildWorld();

export type Objective =
  | { kind: 'mentor'; component: string; moduleId: number; x: number; y: number; text: string }
  | { kind: 'station'; stationId: string; moduleId: number; x: number; y: number; text: string }
  | { kind: 'wait'; text: string }
  | { kind: 'done'; text: string };

const center = (t: { x: number; y: number }) => ({ x: t.x * TILE + TILE / 2, y: t.y * TILE + TILE / 2 });

export function currentObjective(progress: PlayerProgress | null, modules: ModuleState[]): Objective {
  if (!progress) return { kind: 'wait', text: 'Conectando…' };
  for (const mod of MODULES) {
    if (!modules.find((m) => m.id === mod.id)?.unlocked) continue;
    if (progress.modulesCompleted.includes(mod.id)) continue;
    for (const comp of mod.components) {
      if (!progress.learned.includes(comp)) {
        const m = WORLD.mentors.find((x) => x.component === comp)!;
        return { kind: 'mentor', component: comp, moduleId: mod.id, ...center(m), text: `Aprenda <${comp}> com o Mestre ${comp}` };
      }
    }
    for (const st of mod.stations) {
      if (st.type === 'boss_challenge' || progress.completed[st.id]) continue;
      const p = WORLD.stations.find((x) => x.stationId === st.id)!;
      return { kind: 'station', stationId: st.id, moduleId: mod.id, ...center(p), text: `Desafio: ${st.title}` };
    }
    const boss = mod.stations.find((s) => s.type === 'boss_challenge');
    if (boss) {
      const p = WORLD.stations.find((x) => x.stationId === boss.id)!;
      return { kind: 'station', stationId: boss.id, moduleId: mod.id, ...center(p), text: `⚔️ Derrote o ${boss.title}!` };
    }
  }
  const locked = MODULES.some((m) => !modules.find((x) => x.id === m.id)?.unlocked);
  return locked
    ? { kind: 'wait', text: 'Módulos liberados concluídos! Aguarde o professor abrir o próximo 🔒' }
    : { kind: 'done', text: 'Você concluiu todos os módulos! 👑' };
}

/** Passos concluídos de um módulo: lições + desafios + chefe. */
export function moduleProgress(progress: PlayerProgress | null, moduleId: number) {
  const mod = MODULES.find((m) => m.id === moduleId)!;
  const total = mod.components.length + mod.stations.length;
  if (!progress) return { done: 0, total };
  const done = mod.components.filter((c) => progress.learned.includes(c)).length + mod.stations.filter((s) => progress.completed[s.id]).length;
  return { done, total };
}

/** Por que uma estação está trancada (ou null se pode jogar). */
export function stationLock(progress: PlayerProgress | null, stationId: string): string | null {
  if (!progress) return null;
  const mod = MODULES.find((m) => m.stations.some((s) => s.id === stationId))!;
  const missing = mod.components.filter((c) => !progress.learned.includes(c));
  if (missing.length) return `Aprenda antes com os Mestres: ${missing.map((c) => `<${c}>`).join(' ')}`;
  const st = mod.stations.find((s) => s.id === stationId)!;
  if (st.type === 'boss_challenge') {
    const pending = mod.stations.filter((s) => s.type !== 'boss_challenge' && !progress.completed[s.id]);
    if (pending.length) return `Vença antes os terminais: ${pending.map((s) => s.title).join(', ')}`;
  }
  return null;
}

/** Ponto do lado de fora da porta do prédio (para guiar quem está na praça). */
export function doorOutside(moduleId: number) {
  const d = WORLD.doors.find((x) => x.moduleId === moduleId)!;
  const b = WORLD.buildings.find((x) => x.moduleId === moduleId)!;
  const top = d.y === b.y + b.h - 1;
  return { x: d.x * TILE + TILE / 2, y: (d.y + (top ? 1.5 : -0.5)) * TILE };
}
