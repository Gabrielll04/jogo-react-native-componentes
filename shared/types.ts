/**
 * Tipos compartilhados entre servidor e cliente.
 * Importante: nada aqui contém respostas — os gabaritos ficam só no servidor
 * (server/src/content/challenges.ts).
 */

export type ChallengeType =
  | 'quiz_component' // descrição/efeito visual -> qual componente?
  | 'match_use' // associar componente ao uso
  | 'build_ui' // montar uma tela escolhendo componentes
  | 'fix_bug' // escolher a correção de um código
  | 'boss_challenge'; // sequência de rodadas contra o guardião do módulo

export type TeamId = 'azul' | 'verde' | 'laranja' | 'roxo';

export interface StationConfig {
  /** id único; é também a chave do desafio no servidor */
  id: string;
  title: string;
  type: ChallengeType;
  emoji: string;
}

export interface ModuleConfig {
  id: number;
  name: string;
  emoji: string;
  /** cor do prédio no mapa (hex) */
  color: string;
  /** componentes ensinados; viram cartas no inventário ao vencer o chefe */
  components: string[];
  /** ids de módulos que precisam estar concluídos antes (opcional) */
  requires: number[];
  /** texto da placa na porta do módulo */
  sign: string;
  stations: StationConfig[];
}

export interface ModuleState {
  id: number;
  unlocked: boolean;
}

/** Dados públicos de um jogador (o que os outros veem). */
export interface PublicPlayer {
  id: string;
  name: string;
  color: string;
  team: TeamId;
  x: number;
  y: number;
  inWorld: boolean;
  online: boolean;
  /** jogador travado pedindo ajuda */
  stuck: boolean;
  /** desafio em que está (para quem quiser ajudar) */
  stationId: string | null;
  level: number;
  xp: number;
  emote: string | null;
}

export interface CompletionRecord {
  at: number;
  attempts: number;
  timeMs: number;
  helped: boolean;
}

/** Progresso salvo de um jogador (servidor -> próprio jogador e painel). */
export interface PlayerProgress {
  id: string;
  name: string;
  color: string;
  team: TeamId;
  xp: number;
  coins: number;
  coopPoints: number;
  completed: Record<string, CompletionRecord>;
  modulesCompleted: number[];
  cards: string[];
  achievements: string[];
  totalAttempts: number;
  totalCorrect: number;
  createdAt: number;
  lastSeen: number;
}

// ---------- Payloads de desafio (sem gabarito) ----------

export interface QuizPayload {
  kind: 'quiz';
  prompt: string;
  /** chave de uma demonstração viva (client/src/ui/demos.tsx) */
  demo?: string;
  code?: string;
  options: string[];
}

export interface MatchPayload {
  kind: 'match';
  prompt: string;
  left: { id: string; label: string }[];
  right: { id: string; label: string }[];
}

export interface BuildPayload {
  kind: 'build';
  prompt: string;
  /** chave do "molde" de prévia (client/src/ui/blueprints.tsx) */
  blueprint: string;
  slots: { id: string; label: string }[];
  palette: string[];
}

export interface BugPayload {
  kind: 'bug';
  prompt: string;
  code: string;
  demo?: string;
  options: { id: string; code: string }[];
}

export type ChallengePayload = QuizPayload | MatchPayload | BuildPayload | BugPayload;

/** Resposta: quiz -> string; bug -> id da opção; match/build -> mapa id->valor */
export type ChallengeAnswer = string | Record<string, string>;

export interface BossState {
  round: number;
  rounds: number;
  bossHp: number;
  bossMaxHp: number;
  hearts: number;
  maxHearts: number;
  bossName: string;
}

export interface ChallengeView {
  instanceId: string;
  stationId: string;
  moduleId: number;
  title: string;
  type: ChallengeType;
  payload: ChallengePayload;
  boss?: BossState;
  allowHints: boolean;
  hints: string[];
  helped: boolean;
  attempts: number;
}

export interface AnswerResult {
  correct: boolean;
  explanation: string;
  xpGained: number;
  coinsGained: number;
  /** estação concluída (desafio terminado com sucesso) */
  completed: boolean;
  bossDefeated?: boolean;
  /** jogador perdeu todos os corações no chefe */
  bossFailed?: boolean;
  moduleCompleted?: number;
  cardsGained?: string[];
  /** próxima rodada (chefe) ou mesma questão para tentar de novo */
  next?: ChallengeView;
}

export interface HelpRequest {
  playerId: string;
  name: string;
  stationId: string;
  stationTitle: string;
  /** se o jogador que está vendo pode ajudar (já concluiu essa estação) */
  canHelp?: boolean;
}

export type SoundName =
  | 'connect'
  | 'lobby'
  | 'correct'
  | 'wrong'
  | 'hint'
  | 'door'
  | 'module'
  | 'boss'
  | 'achievement'
  | 'click';
