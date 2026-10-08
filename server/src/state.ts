/**
 * Estado do jogo em memória + persistência simples em JSON
 * (server/data/save.json). Salva com "debounce" para não escrever
 * no disco a cada movimento.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { nameKey, RULES } from '../../shared/events';
import { MODULES } from '../../shared/modules';
import type { ModuleState, PlayerProgress, TeamId } from '../../shared/types';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '../data');
const SAVE_FILE = path.join(DATA_DIR, 'save.json');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const MAX_BACKUPS = 20;

export interface LogEntry {
  at: number;
  text: string;
}

/** Estatísticas por desafio (painel de dificuldades). Saves antigos não têm. */
export interface StationStats {
  starts: number;
  wrong: number;
  guesses: number;
  solved: number;
  quits: number;
}

interface SaveData {
  modules: ModuleState[];
  progress: Record<string, PlayerProgress>;
  stats?: Record<string, StationStats>;
}

class GameState {
  /** módulo 1 começa aberto; os demais o professor libera no painel */
  modules: ModuleState[] = MODULES.map((m) => ({ id: m.id, unlocked: m.id === 1 }));
  progress: Record<string, PlayerProgress> = {};
  stats: Record<string, StationStats> = {};
  logs: LogEntry[] = [];
  private saveTimer: NodeJS.Timeout | null = null;

  load() {
    try {
      if (!fs.existsSync(SAVE_FILE)) return;
      const raw = fs.readFileSync(SAVE_FILE, 'utf8');
      const data = JSON.parse(raw) as SaveData;
      this.backup(raw);
      this.progress = data.progress ?? {};
      this.stats = data.stats ?? {};
      for (const p of Object.values(this.progress)) {
        // saves de versões anteriores: completa os campos novos sem mexer no que já existe
        p.learned ??= [];
        p.duelsWon ??= 0;
        p.duelsLost ??= 0;
        p.totalGuesses ??= 0;
        p.owned ??= [];
        p.equipped ??= {};
        p.racesWon ??= 0;
      }
      const dups = this.duplicateNames();
      if (dups.length) {
        this.log(`⚠️ Nomes repetidos no save: ${dups.join(', ')}. Quem entrar com esse nome cai no perfil com mais XP — renomeie no painel se forem alunos diferentes.`);
      }
      for (const saved of data.modules ?? []) {
        const m = this.modules.find((x) => x.id === saved.id);
        if (m) m.unlocked = saved.unlocked;
      }
      this.log(`Progresso carregado: ${Object.keys(this.progress).length} jogador(es).`);
    } catch (err) {
      console.error('Não foi possível ler o save, começando do zero:', err);
    }
  }

  /** Cópia do save ao iniciar o servidor (server/data/backups), mantendo as 20 mais recentes. */
  private backup(raw: string) {
    try {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
      const stamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-');
      fs.writeFileSync(path.join(BACKUP_DIR, `save-${stamp}.json`), raw);
      const files = fs.readdirSync(BACKUP_DIR).filter((f) => /^save-.*\.json$/.test(f)).sort();
      for (const f of files.slice(0, Math.max(0, files.length - MAX_BACKUPS))) fs.unlinkSync(path.join(BACKUP_DIR, f));
    } catch (err) {
      console.error('Não foi possível criar o backup do save:', err);
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
      const data: SaveData = { modules: this.modules, progress: this.progress, stats: this.stats };
      // grava num arquivo temporário e renomeia: se o PC desligar no meio, o save antigo continua inteiro
      const tmp = SAVE_FILE + '.tmp';
      fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
      fs.renameSync(tmp, SAVE_FILE);
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

  /** Perfil salvo com este nome (sem diferenciar maiúsculas/acentos). Se houver repetidos, o de mais XP. */
  findByName(name: string, exceptId?: string): PlayerProgress | null {
    const key = nameKey(name);
    let best: PlayerProgress | null = null;
    for (const p of Object.values(this.progress)) {
      if (p.id === exceptId || nameKey(p.name) !== key) continue;
      if (!best || p.xp > best.xp) best = p;
    }
    return best;
  }

  duplicateNames() {
    const seen = new Map<string, number>();
    for (const p of Object.values(this.progress)) seen.set(nameKey(p.name), (seen.get(nameKey(p.name)) ?? 0) + 1);
    return [...seen.entries()].filter(([, n]) => n > 1).map(([k]) => k);
  }

  stationStats(stationId: string) {
    return (this.stats[stationId] ??= { starts: 0, wrong: 0, guesses: 0, solved: 0, quits: 0 });
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
        learned: [],
        cards: [],
        achievements: [],
        totalAttempts: 0,
        totalCorrect: 0,
        duelsWon: 0,
        duelsLost: 0,
        totalGuesses: 0,
        owned: [],
        equipped: {},
        racesWon: 0,
        createdAt: Date.now(),
        lastSeen: Date.now(),
      };
      this.progress[id] = p;
    }
    // o nome identifica o perfil (só o professor renomeia); cor e equipe o aluno escolhe ao entrar
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
    this.saveNow(); // o backup abaixo guarda o estado antes de apagar
    try {
      this.backup(fs.readFileSync(SAVE_FILE, 'utf8'));
    } catch {
      /* sem save ainda */
    }
    this.progress = {};
    this.stats = {};
    this.modules.forEach((m) => (m.unlocked = m.id === 1));
    this.log('Progresso resetado pelo professor.');
    this.saveNow();
  }
}

export const state = new GameState();

// ------------- conquistas -------------

export const ACHIEVEMENTS: Record<string, { title: string; emoji: string }> = {
  aprendiz: { title: 'Aprendiz: primeira lição com um Mestre', emoji: '📚' },
  primeiro_acerto: { title: 'Primeiro acerto', emoji: '⭐' },
  sem_erros: { title: 'De primeira! (sem errar)', emoji: '🎯' },
  mentor: { title: 'Mentor: ajudou um colega a acertar', emoji: '🤝' },
  cacador_de_chefes: { title: 'Derrotou um chefe', emoji: '⚔️' },
  colecionador: { title: '10 cartas de componentes', emoji: '🃏' },
  mestre: { title: 'Concluiu todos os módulos', emoji: '👑' },
  duelista: { title: 'Venceu um duelo', emoji: '⚔️' },
  cientista: { title: 'Cientista: montou uma tela no Laboratório', emoji: '🧪' },
  velocista: { title: 'Velocista: venceu uma corrida da turma', emoji: '🏁' },
  estiloso: { title: 'Estiloso(a): comprou um item na loja', emoji: '🛍️' },
};

/** Concede conquista; retorna true se for nova. */
export function grantAchievement(p: PlayerProgress, id: string) {
  if (p.achievements.includes(id)) return false;
  p.achievements.push(id);
  return true;
}
