/**
 * Estado do jogo em memória + persistência simples em JSON
 * (server/data/save.json). Salva com "debounce" para não escrever
 * no disco a cada movimento.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { RULES } from '../../shared/events';
import { MODULES } from '../../shared/modules';
import type { ModuleState, PlayerProgress, TeamId } from '../../shared/types';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '../data');
const SAVE_FILE = path.join(DATA_DIR, 'save.json');

export interface LogEntry {
  at: number;
  text: string;
}

interface SaveData {
  modules: ModuleState[];
  progress: Record<string, PlayerProgress>;
}

class GameState {
  /** módulo 1 começa aberto; os demais o professor libera no painel */
  modules: ModuleState[] = MODULES.map((m) => ({ id: m.id, unlocked: m.id === 1 }));
  progress: Record<string, PlayerProgress> = {};
  logs: LogEntry[] = [];
  private saveTimer: NodeJS.Timeout | null = null;

  load() {
    try {
      if (!fs.existsSync(SAVE_FILE)) return;
      const data = JSON.parse(fs.readFileSync(SAVE_FILE, 'utf8')) as SaveData;
      this.progress = data.progress ?? {};
      for (const saved of data.modules ?? []) {
        const m = this.modules.find((x) => x.id === saved.id);
        if (m) m.unlocked = saved.unlocked;
      }
      this.log(`Progresso carregado: ${Object.keys(this.progress).length} jogador(es).`);
    } catch (err) {
      console.error('Não foi possível ler o save, começando do zero:', err);
    }
  }

  /** agenda gravação no disco (no máx. 1x a cada 2s) */
  save() {
    if (this.saveTimer) return;
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      this.saveNow();
    }, 2000);
  }

  saveNow() {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      const data: SaveData = { modules: this.modules, progress: this.progress };
      fs.writeFileSync(SAVE_FILE, JSON.stringify(data, null, 2));
    } catch (err) {
      console.error('Erro ao salvar progresso:', err);
    }
  }

  log(text: string) {
    const entry = { at: Date.now(), text };
    this.logs.push(entry);
    if (this.logs.length > 300) this.logs.shift();
    console.log(`[${new Date(entry.at).toLocaleTimeString('pt-BR')}] ${text}`);
  }

  isUnlocked(moduleId: number) {
    return this.modules.find((m) => m.id === moduleId)?.unlocked ?? false;
  }

  setUnlocked(moduleId: number, unlocked: boolean) {
    const m = this.modules.find((x) => x.id === moduleId);
    if (!m) return false;
    m.unlocked = unlocked;
    this.save();
    return true;
  }

  getOrCreate(id: string, name: string, color: string, team: TeamId): PlayerProgress {
    let p = this.progress[id];
    if (!p) {
      p = {
        id,
        name,
        color,
        team,
        xp: 0,
        coins: RULES.START_COINS,
        coopPoints: 0,
        completed: {},
        modulesCompleted: [],
        cards: [],
        achievements: [],
        totalAttempts: 0,
        totalCorrect: 0,
        createdAt: Date.now(),
        lastSeen: Date.now(),
      };
      this.progress[id] = p;
    }
    // o aluno pode trocar nome/cor/equipe ao reconectar
    p.name = name;
    p.color = color;
    p.team = team;
    p.lastSeen = Date.now();
    this.save();
    return p;
  }

  /** pré-requisitos do módulo cumpridos por este jogador? */
  meetsRequirements(p: PlayerProgress, moduleId: number) {
    const mod = MODULES.find((m) => m.id === moduleId);
    if (!mod) return false;
    return mod.requires.every((r) => p.modulesCompleted.includes(r));
  }

  teamTotals() {
    const totals: Record<string, number> = { azul: 0, verde: 0, laranja: 0, roxo: 0 };
    for (const p of Object.values(this.progress)) totals[p.team] = (totals[p.team] ?? 0) + p.xp;
    return totals;
  }

  reset() {
    this.progress = {};
    this.modules.forEach((m) => (m.unlocked = m.id === 1));
    this.log('Progresso resetado pelo professor.');
    this.saveNow();
  }
}

export const state = new GameState();

// ------------- conquistas -------------

export const ACHIEVEMENTS: Record<string, { title: string; emoji: string }> = {
  primeiro_acerto: { title: 'Primeiro acerto', emoji: '⭐' },
  sem_erros: { title: 'De primeira! (sem errar)', emoji: '🎯' },
  mentor: { title: 'Mentor: ajudou um colega a acertar', emoji: '🤝' },
  cacador_de_chefes: { title: 'Derrotou um chefe', emoji: '⚔️' },
  colecionador: { title: '10 cartas de componentes', emoji: '🃏' },
  mestre: { title: 'Concluiu todos os módulos', emoji: '👑' },
};

/** Concede conquista; retorna true se for nova. */
export function grantAchievement(p: PlayerProgress, id: string) {
  if (p.achievements.includes(id)) return false;
  p.achievements.push(id);
  return true;
}
