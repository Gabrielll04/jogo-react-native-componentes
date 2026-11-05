/**
 * Conexão Socket.io. O jogo é servido pelo próprio servidor
 * (http://IP_DO_PROFESSOR:3000), então conectamos na mesma origem.
 * Em dev (Vite na 5173) o proxy do Vite repassa para a porta 3000.
 */
import { io, type Socket } from 'socket.io-client';
import { EV, RULES } from '@shared/events';
import { MODULES } from '@shared/modules';
import type { DuelMode } from '@shared/duels';
import type {
  AnswerResult,
  ChallengeAnswer,
  ChallengeView,
  DuelEnd,
  DuelInvite,
  DuelStart,
  HelpRequest,
  ModuleState,
  PlayerProgress,
  PublicPlayer,
  RaceStart,
  RaceState,
  SoundName,
  TeamId,
} from '@shared/types';
import type { CosmeticKind } from '@shared/cosmetics';
import { playSound } from '../audio/sound';
import { bridge } from '../game/bridge';
import { getState, setState, toast } from '../state/store';

let socket: Socket | null = null;
let profile: { name: string; color: string; team: TeamId } | null = null;

const ID_KEY = 'rnq_playerId';

/** últimas posições conhecidas dos jogadores (para o painel de duelo saber quem está dentro de uma vila) */
export const livePositions = new Map<string, { x: number; y: number }>();

/** id do jogador: por aba (sessionStorage) com fallback no navegador (localStorage) */
function savedPlayerId() {
  try {
    return sessionStorage.getItem(ID_KEY) || localStorage.getItem(ID_KEY) || undefined;
  } catch {
    return undefined;
  }
}

/** guarda o nome oficial (o professor pode ter renomeado) para a próxima entrada */
function rememberName(name: string) {
  try {
    const saved = JSON.parse(localStorage.getItem('rnq_profile') || '{}');
    if (saved.name !== name) localStorage.setItem('rnq_profile', JSON.stringify({ ...saved, name }));
  } catch {
    /* ignore */
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
  setState({ loginError: null });
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
    returning?: boolean;
  }) => {
    rememberPlayerId(data.playerId);
    rememberName(data.progress.name);
    if (profile) profile = { ...profile, name: data.progress.name };
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
    else if (data.returning) toast(`👋 Bem-vindo(a) de volta, ${data.progress.name}! Seu progresso foi carregado.`, 'success', 5000);
    playSound('connect');
  });

  socket.on(EV.LOGIN_ERROR, (e: { text: string }) => {
    setState({ loginError: e.text, screen: 'connect', challenge: null, duel: null, race: null });
  });

  socket.on(EV.LOBBY_UPDATE, (players: PublicPlayer[]) => setState({ players }));

  socket.on(EV.SYNC_PLAYERS, (packet: [string, number, number][]) => {
    for (const [id, x, y] of packet) livePositions.set(id, { x, y });
    bridge.emit('sync', packet);
  });

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

  socket.on(EV.UPDATE_INVENTORY, (progress: PlayerProgress) => {
    rememberName(progress.name);
    if (profile) profile = { ...profile, name: progress.name };
    setState({ progress });
  });

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

  socket.on(EV.FEED, (f: { text: string }) => setState((s) => ({ feed: [...s.feed.slice(-5), f.text] })));

  // ---- duelos
  socket.on(EV.DUEL_INVITED, (inv: DuelInvite) => {
    setState((s) => ({ duelInvites: [...s.duelInvites.filter((x) => x.duelId !== inv.duelId), { ...inv, expiresAt: Date.now() + inv.expiresIn }] }));
  });
  socket.on(EV.DUEL_INVITE_CLOSED, (d: { duelId: string }) => {
    setState((s) => ({ duelInvites: s.duelInvites.filter((x) => x.duelId !== d.duelId) }));
  });
  socket.on(EV.DUEL_START, (d: DuelStart) => {
    // o duelo substitui o desafio de terminal que estiver aberto
    setState({
      duel: { ...d, startAt: Date.now() + d.startsIn },
      duelEnd: null,
      duelFeedback: null,
      duelOppAttempts: 0,
      duelInvites: [],
      challenge: null,
      lastResult: null,
    });
  });
  socket.on(EV.DUEL_FEEDBACK, (f: { msg: string; cooldownMs?: number }) =>
    setState({ duelFeedback: { msg: f.msg, at: Date.now(), until: Date.now() + (f.cooldownMs ?? 0) } })
  );
  socket.on(EV.DUEL_OPPONENT, (o: { attempts: number }) => setState({ duelOppAttempts: o.attempts }));
  socket.on(EV.DUEL_END, (e: DuelEnd) => setState({ duelEnd: e }));

  // ---- corrida da turma
  socket.on(EV.RACE_START, (r: RaceStart) => {
    const startAt = Date.now() + r.startsIn;
    // em duelo: a corrida fica minimizada (o aluno abre depois pelo botão)
    setState({ race: { ...r, startAt, endAt: startAt + r.maxMs }, raceFeedback: null, raceState: null, raceOpen: !getState().duel });
  });
  socket.on(EV.RACE_STATE, (raceState: RaceState) => setState({ raceState }));
  socket.on(EV.RACE_FEEDBACK, (f: { msg: string; cooldownMs: number }) =>
    setState({ raceFeedback: { msg: f.msg, at: Date.now(), until: Date.now() + f.cooldownMs } })
  );
}

// ---------------- ações do jogador ----------------

const emit = (ev: string, data?: unknown) => socket?.emit(ev, data);

export const actions = {
  enterWorld() {
    emit(EV.ENTER_WORLD);
    setState({ screen: 'world' });
  },
  leaveWorld() {
    emit(EV.LEAVE_WORLD); // durante um duelo, sair conta como desistência
    setState({ screen: 'lobby', challenge: null, lastResult: null, duel: null, duelEnd: null, duelInvites: [], race: null, raceState: null, raceOpen: false });
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
  duelInvite(targetId: string, mode: DuelMode) {
    emit(EV.DUEL_INVITE, { targetId, mode });
  },
  duelRespond(duelId: string, accept: boolean) {
    emit(EV.DUEL_RESPOND, { duelId, accept });
    setState((s) => ({ duelInvites: s.duelInvites.filter((x) => x.duelId !== duelId) }));
  },
  duelSubmit(answer: unknown) {
    const d = getState().duel;
    if (d) emit(EV.DUEL_SUBMIT, { duelId: d.duelId, answer });
  },
  duelForfeit() {
    const d = getState().duel;
    if (d) emit(EV.DUEL_FORFEIT, { duelId: d.duelId });
  },
  closeDuel() {
    setState({ duel: null, duelEnd: null, duelFeedback: null });
  },
  raceSubmit(answer: unknown) {
    const r = getState().race;
    if (r) emit(EV.RACE_SUBMIT, { raceId: r.raceId, answer });
  },
  closeRace() {
    setState({ race: null, raceState: null, raceFeedback: null, raceOpen: false });
  },
  shopBuy(itemId: string) {
    emit(EV.SHOP_BUY, { itemId });
  },
  shopEquip(kind: CosmeticKind, itemId: string | null) {
    emit(EV.SHOP_EQUIP, { kind, itemId });
  },
  setLook(look: { color: string; skin: string; hair: string }) {
    emit(EV.PROFILE_LOOK, look);
  },
  labBuilt(nodes: number) {
    emit(EV.LAB_BUILT, { nodes });
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
