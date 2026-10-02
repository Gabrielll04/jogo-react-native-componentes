/**
 * Conexão Socket.io. O jogo é servido pelo próprio servidor
 * (http://IP_DO_PROFESSOR:3000), então conectamos na mesma origem.
 * Em dev (Vite na 5173) o proxy do Vite repassa para a porta 3000.
 */
import { io, type Socket } from 'socket.io-client';
import { EV, RULES } from '@shared/events';
import { MODULES } from '@shared/modules';
import type {
  AnswerResult,
  ChallengeAnswer,
  ChallengeView,
  HelpRequest,
  ModuleState,
  PlayerProgress,
  PublicPlayer,
  SoundName,
  TeamId,
} from '@shared/types';
import { playSound } from '../audio/sound';
import { bridge } from '../game/bridge';
import { getState, setState, toast } from '../state/store';

let socket: Socket | null = null;
let profile: { name: string; color: string; team: TeamId } | null = null;

const ID_KEY = 'rnq_playerId';

/** id do jogador: por aba (sessionStorage) com fallback no navegador (localStorage) */
function savedPlayerId() {
  try {
    return sessionStorage.getItem(ID_KEY) || localStorage.getItem(ID_KEY) || undefined;
  } catch {
    return undefined;
  }
}

function rememberPlayerId(id: string) {
  try {
    sessionStorage.setItem(ID_KEY, id);
    localStorage.setItem(ID_KEY, id);
  } catch {
    /* modo privado: ignora */
  }
}

export function connect(p: { name: string; color: string; team: TeamId }) {
  profile = p;
  if (socket) {
    socket.connect();
    return;
  }
  socket = io({ transports: ['websocket', 'polling'] });

  socket.on('connect', () => {
    setState({ connected: true });
    // envia (ou reenvia após queda de conexão) os dados do jogador
    socket!.emit(EV.PLAYER_CONNECT, { playerId: getState().playerId ?? savedPlayerId(), ...profile });
  });

  socket.on('disconnect', (reason) => {
    setState({ connected: false });
    if (reason === 'io server disconnect') {
      setState({ screen: 'connect', challenge: null });
    } else {
      toast('Conexão perdida… tentando reconectar', 'warn');
    }
  });

  socket.on(EV.WELCOME, (data: {
    playerId: string;
    progress: PlayerProgress;
    modules: ModuleState[];
    players: PublicPlayer[];
    teamTotals: Record<string, number>;
    achievements: Record<string, { title: string; emoji: string }>;
  }) => {
    rememberPlayerId(data.playerId);
    const wasInWorld = getState().screen === 'world';
    setState({
      playerId: data.playerId,
      progress: data.progress,
      modules: data.modules,
      players: data.players,
      teamTotals: data.teamTotals,
      achievementsCatalog: data.achievements,
      screen: wasInWorld ? 'world' : 'lobby',
    });
    if (wasInWorld) socket!.emit(EV.ENTER_WORLD);
    playSound('connect');
  });

  socket.on(EV.LOBBY_UPDATE, (players: PublicPlayer[]) => setState({ players }));

  socket.on(EV.SYNC_PLAYERS, (packet: [string, number, number][]) => bridge.emit('sync', packet));

  socket.on(EV.MODULE_UPDATED, (modules: ModuleState[]) => setState({ modules }));

  socket.on(EV.AREA_RESULT, (r: { moduleId: number; allowed: boolean; reason?: string }) => {
    if (!r.allowed && r.reason) toast(r.reason, 'warn');
  });

  socket.on(EV.CHALLENGE_DATA, (view: ChallengeView) => {
    setState({ challenge: view, lastResult: null, hints: view.hints.map((text) => ({ text, from: null })) });
  });

  socket.on(EV.ANSWER_RESULT, (result: AnswerResult) => {
    setState((s) => ({
      lastResult: result,
      // continua no desafio se houver próxima rodada
      challenge: result.next ?? s.challenge,
    }));
  });

  socket.on(EV.HINT_RECEIVED, (h: { hint: string; from: string | null }) => {
    setState((s) => ({ hints: [...s.hints, { text: h.hint, from: h.from }] }));
    if (h.from) toast(`💡 ${h.from} te enviou uma dica!`, 'success');
  });

  socket.on(EV.HELP_REQUESTS, (helpRequests: HelpRequest[]) => setState({ helpRequests }));

  socket.on(EV.UPDATE_INVENTORY, (progress: PlayerProgress) => setState({ progress }));

  socket.on(EV.TEAM_PROGRESS_UPDATE, (teamTotals: Record<string, number>) => setState({ teamTotals }));

  socket.on(EV.PLAY_SOUND, (name: SoundName) => playSound(name));

  socket.on(EV.NOTICE, (n: { text: string; kind: 'info' | 'success' | 'warn' }) => toast(n.text, n.kind));

  socket.on(EV.CHALLENGE_COMPLETED, (c: { playerId: string; name: string; title: string }) => {
    if (c.playerId === getState().playerId) return;
    setState((s) => ({ feed: [...s.feed.slice(-5), `✅ ${c.name} concluiu "${c.title}"`] }));
  });

  socket.on(EV.EMOTE, (e: { id: string; emote: string }) => {
    setState((s) => ({ emotes: { ...s.emotes, [e.id]: { emote: e.emote, at: Date.now() } } }));
    bridge.emit('emote', e);
  });

  socket.on(EV.PLAYER_DISCONNECT, (d: { id: string }) => bridge.emit('left', d.id));
}

// ---------------- ações do jogador ----------------

const emit = (ev: string, data?: unknown) => socket?.emit(ev, data);

export const actions = {
  enterWorld() {
    emit(EV.ENTER_WORLD);
    setState({ screen: 'world' });
  },
  leaveWorld() {
    emit(EV.LEAVE_WORLD);
    setState({ screen: 'lobby', challenge: null, lastResult: null });
  },
  move: (() => {
    // throttle: no máximo uma mensagem a cada RULES.MOVE_SEND_MS,
    // sempre enviando a ÚLTIMA posição quando o jogador para (trailing)
    let last = 0;
    let pending: { x: number; y: number } | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const flush = () => {
      timer = null;
      if (!pending) return;
      last = performance.now();
      socket?.emit(EV.PLAYER_MOVE, { x: Math.round(pending.x), y: Math.round(pending.y) });
      pending = null;
    };
    return (x: number, y: number) => {
      pending = { x, y };
      const wait = RULES.MOVE_SEND_MS - (performance.now() - last);
      if (wait <= 0) flush();
      else if (!timer) timer = setTimeout(flush, wait);
    };
  })(),
  enterArea(moduleId: number) {
    emit(EV.ENTER_AREA, { moduleId });
  },
  leaveArea(moduleId: number) {
    emit(EV.LEAVE_AREA, { moduleId });
  },
  startChallenge(stationId: string) {
    emit(EV.START_CHALLENGE, { stationId });
  },
  submit(answer: ChallengeAnswer) {
    const c = getState().challenge;
    if (c) emit(EV.SUBMIT_ANSWER, { instanceId: c.instanceId, answer });
  },
  closeChallenge() {
    const s = getState();
    // só cancela no servidor se o desafio ainda está em andamento
    if (s.challenge && !s.lastResult?.completed && !s.lastResult?.bossFailed) emit(EV.CANCEL_CHALLENGE);
    setState({ challenge: null, lastResult: null, hints: [] });
  },
  requestHelp() {
    emit(EV.REQUEST_HELP);
  },
  buyHint() {
    emit(EV.BUY_HINT);
  },
  sendHint(targetId: string) {
    emit(EV.SEND_HINT, { targetId });
  },
  emote(emote: string) {
    emit(EV.EMOTE, { emote });
  },
};

export function moduleName(id: number) {
  const m = MODULES.find((x) => x.id === id);
  return m ? `${m.emoji} ${m.name}` : `Módulo ${id}`;
}

/** Lição com um Mestre concluída (o servidor registra a carta e o XP). */
export function lessonComplete(component: string) {
  socket?.emit(EV.LESSON_COMPLETE, { component });
}
