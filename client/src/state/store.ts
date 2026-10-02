/**
 * Store global minimalista (sem bibliotecas): um objeto de estado +
 * assinantes, lido nos componentes com useStore(selector).
 */
import { useSyncExternalStore } from 'react';
import type {
  AnswerResult,
  ChallengeView,
  DuelEnd,
  DuelInvite,
  DuelStart,
  HelpRequest,
  ModuleState,
  PlayerProgress,
  PublicPlayer,
} from '@shared/types';

export type Screen = 'connect' | 'lobby' | 'world';

export interface Toast {
  id: number;
  text: string;
  kind: 'info' | 'success' | 'warn';
}

export interface GameStore {
  screen: Screen;
  connected: boolean;
  playerId: string | null;
  progress: PlayerProgress | null;
  modules: ModuleState[];
  players: PublicPlayer[];
  teamTotals: Record<string, number>;
  achievementsCatalog: Record<string, { title: string; emoji: string }>;
  challenge: ChallengeView | null;
  lastResult: AnswerResult | null;
  /** dicas recebidas no desafio atual */
  hints: { text: string; from: string | null }[];
  helpRequests: HelpRequest[];
  toasts: Toast[];
  emotes: Record<string, { emote: string; at: number }>;
  feed: string[];
  muted: boolean;
  /** convites de duelo recebidos (notificações no canto) */
  duelInvites: (DuelInvite & { expiresAt: number })[];
  /** duelo em andamento (startAt = hora local do "JÁ!") */
  duel: (DuelStart & { startAt: number }) | null;
  duelEnd: DuelEnd | null;
  duelFeedback: { msg: string; at: number } | null;
  duelOppAttempts: number;
}

let state: GameStore = {
  screen: 'connect',
  connected: false,
  playerId: null,
  progress: null,
  modules: [],
  players: [],
  teamTotals: {},
  achievementsCatalog: {},
  challenge: null,
  lastResult: null,
  hints: [],
  helpRequests: [],
  toasts: [],
  emotes: {},
  feed: [],
  muted: false,
  duelInvites: [],
  duel: null,
  duelEnd: null,
  duelFeedback: null,
  duelOppAttempts: 0,
};

const listeners = new Set<() => void>();

export function getState() {
  return state;
}

export function setState(patch: Partial<GameStore> | ((s: GameStore) => Partial<GameStore>)) {
  const next = typeof patch === 'function' ? patch(state) : patch;
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useStore<T>(selector: (s: GameStore) => T): T {
  return useSyncExternalStore(subscribe, () => selector(state));
}

let toastId = 1;
export function toast(text: string, kind: Toast['kind'] = 'info', ms = 4000) {
  const id = toastId++;
  setState((s) => ({ toasts: [...s.toasts.slice(-4), { id, text, kind }] }));
  setTimeout(() => setState((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), ms);
}
