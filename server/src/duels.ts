/**
 * DUELOS ⚔️ entre alunos.
 *  1. A desafia B (modo blocos ou código)        -> B recebe notificação no canto (não trava o jogo)
 *  2. B aceita em até 30s                          -> servidor sorteia a MESMA tarefa para os dois
 *  3. contagem 3-2-1; quem acertar primeiro vence -> leva até DUEL_STAKE moedas do perdedor
 *  Desistir, sair do mundo ou desconectar = derrota. Depois de DUEL_MAX_MS: empate.
 * O servidor confere as respostas (não confia no cliente).
 */
import { randomUUID } from 'node:crypto';
import type { Socket } from 'socket.io';
import {
  checkCode,
  DUEL_COUNTDOWN_MS,
  DUEL_INVITE_MS,
  DUEL_MAX_MS,
  DUEL_PLAY_XP,
  DUEL_STAKE,
  DUEL_WIN_XP,
  duelTask,
  MODE_LABEL,
  randomDuelTask,
  type DuelMode,
} from '../../shared/duels';
import { EV } from '../../shared/events';
import { compareTree, countNodes, treeToCode } from '../../shared/jsx';
import type { DuelEnd, DuelInvite, DuelStart } from '../../shared/types';
import { afterProgressChange, award, broadcastLobby, findOnlineByPlayer, getIo, notice, sound, type OnlinePlayer } from './game';
import { state } from './state';

interface Duel {
  id: string;
  a: string; // quem desafiou (playerId)
  b: string; // quem foi desafiado
  mode: DuelMode;
  status: 'pending' | 'active';
  taskId: string;
  startsAt: number;
  attempts: Record<string, number>;
  timer: NodeJS.Timeout | null;
}

const duels = new Map<string, Duel>();

const nameOf = (playerId: string) => state.progress[playerId]?.name ?? '???';
const other = (d: Duel, playerId: string) => (d.a === playerId ? d.b : d.a);

/** fecha convites pendentes que envolvem este jogador (ex.: aceitou outro duelo) */
function closePendingOf(playerId: string, except?: string) {
  for (const d of duels.values()) {
    if (d.status !== 'pending' || d.id === except || (d.a !== playerId && d.b !== playerId)) continue;
    cancelPending(d, d.a === playerId ? `${nameOf(playerId)} entrou em outro duelo.` : `${nameOf(d.b)} está em outro duelo.`);
  }
}

function cancelPending(d: Duel, msgToChallenger: string | null) {
  if (d.timer) clearTimeout(d.timer);
  duels.delete(d.id);
  const io = getIo();
  const b = findOnlineByPlayer(d.b);
  if (b) io.to(b.socketId).emit(EV.DUEL_INVITE_CLOSED, { duelId: d.id });
  const a = findOnlineByPlayer(d.a);
  if (a && msgToChallenger) notice(a.socketId, msgToChallenger, 'warn');
}

function start(d: Duel) {
  const io = getIo();
  const a = findOnlineByPlayer(d.a);
  const b = findOnlineByPlayer(d.b);
  if (!a || !b) return cancelPending(d, 'O colega saiu do jogo.');
  if (a.duelId || b.duelId) return cancelPending(d, 'Um de vocês já está em outro duelo.');

  d.status = 'active';
  d.taskId = randomDuelTask(d.mode).id;
  d.startsAt = Date.now() + DUEL_COUNTDOWN_MS;
  d.attempts = { [d.a]: 0, [d.b]: 0 };
  if (d.timer) clearTimeout(d.timer);
  d.timer = setTimeout(() => finish(d, null, 'timeout'), DUEL_COUNTDOWN_MS + DUEL_MAX_MS);
  for (const o of [a, b]) {
    o.duelId = d.id;
    // o duelo substitui qualquer desafio de terminal aberto
    o.instance = null;
    o.stuck = false;
    closePendingOf(o.playerId, d.id);
  }
  for (const [me, opp] of [
    [a, b],
    [b, a],
  ] as const) {
    const pp = state.progress[opp.playerId];
    const payload: DuelStart = {
      duelId: d.id,
      taskId: d.taskId,
      mode: d.mode,
      opponent: { id: opp.playerId, name: pp.name, color: pp.color },
      stake: DUEL_STAKE,
      startsIn: DUEL_COUNTDOWN_MS,
      maxMs: DUEL_MAX_MS,
    };
    io.to(me.socketId).emit(EV.DUEL_START, payload);
    sound(me.socketId, 'duel');
  }
  state.log(`⚔️ Duelo (${MODE_LABEL[d.mode]}): ${nameOf(d.a)} x ${nameOf(d.b)} — tarefa ${d.taskId}`);
  io.emit(EV.FEED, { text: `⚔️ ${nameOf(d.a)} e ${nameOf(d.b)} começaram um duelo!` });
  broadcastLobby();
}

function finish(d: Duel, winnerId: string | null, reason: DuelEnd['reason']) {
  if (!duels.has(d.id)) return;
  duels.delete(d.id);
  if (d.timer) clearTimeout(d.timer);
  const io = getIo();
  const task = duelTask(d.taskId)!;
  const solution = task.mode === 'blocks' ? treeToCode(task.target) : task.solution;
  const timeMs = Math.max(0, Date.now() - d.startsAt);
  const loserId = winnerId ? other(d, winnerId) : null;
  const wp = winnerId ? state.progress[winnerId] : undefined;
  const lp = loserId ? state.progress[loserId] : undefined;

  // aposta: o vencedor leva até DUEL_STAKE moedas do perdedor (quem tem 0 continua com 0)
  let amount = 0;
  if (wp && lp) {
    amount = Math.min(DUEL_STAKE, Math.max(0, lp.coins));
    lp.coins -= amount;
    wp.coins += amount;
    wp.xp += DUEL_WIN_XP;
    wp.duelsWon += 1;
    lp.duelsLost += 1;
    if (reason === 'solved') lp.xp += DUEL_PLAY_XP; // participou até o fim
  }

  for (const pid of [d.a, d.b]) {
    const o = findOnlineByPlayer(pid);
    if (o) o.duelId = null;
    if (!o) continue;
    const result: DuelEnd['result'] = !winnerId ? 'draw' : pid === winnerId ? 'win' : 'lose';
    const end: DuelEnd = {
      duelId: d.id,
      result,
      reason,
      opponentName: nameOf(other(d, pid)),
      coins: result === 'win' ? amount : result === 'lose' ? -amount : 0,
      xp: result === 'win' ? DUEL_WIN_XP : result === 'lose' && reason === 'solved' ? DUEL_PLAY_XP : 0,
      timeMs,
      solution,
    };
    io.to(o.socketId).emit(EV.DUEL_END, end);
    sound(o.socketId, result === 'win' ? 'boss' : result === 'lose' ? 'wrong' : 'click');
    if (result === 'win' && wp) award(o.socketId, wp, 'duelista');
    if (state.progress[pid]) afterProgressChange(o);
  }

  if (winnerId) {
    const how = reason === 'solved' ? `em ${(timeMs / 1000).toFixed(0)}s` : reason === 'forfeit' ? '(desistência)' : '(saiu do jogo)';
    state.log(`⚔️ ${nameOf(winnerId)} venceu ${nameOf(loserId!)} ${how} e levou ${amount} moeda(s)`);
    io.emit(EV.FEED, { text: `🏆 ${nameOf(winnerId)} venceu o duelo contra ${nameOf(loserId!)}!` });
  } else {
    state.log(`⚔️ Duelo ${nameOf(d.a)} x ${nameOf(d.b)} terminou empatado (tempo esgotado)`);
  }
  broadcastLobby();
  state.save();
}

/** jogador saiu do mundo ou desconectou: perde o duelo ativo e cancela convites */
export function playerGone(me: OnlinePlayer) {
  for (const d of [...duels.values()]) {
    if (d.a !== me.playerId && d.b !== me.playerId) continue;
    if (d.status === 'active') finish(d, other(d, me.playerId), 'disconnect');
    else cancelPending(d, d.b === me.playerId ? `${nameOf(me.playerId)} saiu do jogo.` : null);
  }
}

export function clearAllDuels() {
  for (const d of duels.values()) if (d.timer) clearTimeout(d.timer);
  duels.clear();
}

export function registerDuelHandlers(socket: Socket, getMe: () => OnlinePlayer | null) {
  const io = getIo();

  socket.on(EV.DUEL_INVITE, (data: { targetId: string; mode: DuelMode }) => {
    const me = getMe();
    if (!me || !me.inWorld) return;
    const mode: DuelMode = data?.mode === 'code' ? 'code' : 'blocks';
    const target = findOnlineByPlayer(String(data?.targetId ?? ''));
    if (!target || target.playerId === me.playerId || !target.inWorld) return notice(socket, 'Esse colega não está no mapa agora.', 'warn');
    if (me.duelId) return notice(socket, 'Você já está em um duelo!', 'warn');
    if (target.duelId) return notice(socket, `${nameOf(target.playerId)} já está duelando. Tente daqui a pouco!`, 'warn');
    for (const d of duels.values()) {
      if (d.status === 'pending' && d.a === me.playerId) return notice(socket, 'Espere a resposta do seu convite anterior.', 'warn');
    }

    const d: Duel = {
      id: randomUUID(),
      a: me.playerId,
      b: target.playerId,
      mode,
      status: 'pending',
      taskId: '',
      startsAt: 0,
      attempts: {},
      timer: null,
    };
    d.timer = setTimeout(() => cancelPending(d, `⌛ ${nameOf(d.b)} não respondeu ao duelo.`), DUEL_INVITE_MS);
    duels.set(d.id, d);

    const p = state.progress[me.playerId];
    const invite: DuelInvite = { duelId: d.id, fromId: me.playerId, fromName: p.name, fromColor: p.color, mode, stake: DUEL_STAKE, expiresIn: DUEL_INVITE_MS };
    io.to(target.socketId).emit(EV.DUEL_INVITED, invite);
    sound(target.socketId, 'duel');
    notice(socket, `⚔️ Convite enviado para ${nameOf(d.b)} (${MODE_LABEL[mode]}). Aguardando resposta…`, 'info');
  });

  socket.on(EV.DUEL_RESPOND, (data: { duelId: string; accept: boolean }) => {
    const me = getMe();
    const d = duels.get(String(data?.duelId ?? ''));
    if (!me || !d || d.status !== 'pending' || d.b !== me.playerId) {
      socket.emit(EV.DUEL_INVITE_CLOSED, { duelId: data?.duelId });
      return;
    }
    if (!data.accept) return cancelPending(d, `🙅 ${nameOf(d.b)} recusou o duelo.`);
    start(d);
  });

  socket.on(EV.DUEL_SUBMIT, (data: { duelId: string; answer: unknown }) => {
    const me = getMe();
    const d = duels.get(String(data?.duelId ?? ''));
    if (!me || !d || d.status !== 'active' || (d.a !== me.playerId && d.b !== me.playerId)) return;
    if (Date.now() < d.startsAt) return; // ainda na contagem
    const task = duelTask(d.taskId)!;
    d.attempts[me.playerId] = (d.attempts[me.playerId] ?? 0) + 1;

    let wrong: string | null = null;
    if (task.mode === 'blocks') {
      wrong = countNodes(data.answer) > 40 ? 'Tela grande demais!' : compareTree(data.answer, task.target);
    } else {
      const code = typeof data.answer === 'string' ? data.answer.slice(0, 4000) : '';
      const r = checkCode(task, code);
      if (!r.ok) {
        const missing = task.checks.filter((_, i) => !r.passed[i]).map((c) => c.label);
        wrong = r.error ? `${r.error}` : `Ainda falta: ${missing.join(' · ')}`;
      }
    }

    if (wrong) {
      socket.emit(EV.DUEL_FEEDBACK, { msg: wrong });
      sound(socket, 'wrong');
      const opp = findOnlineByPlayer(other(d, me.playerId));
      if (opp) io.to(opp.socketId).emit(EV.DUEL_OPPONENT, { attempts: d.attempts[me.playerId] });
      return;
    }
    finish(d, me.playerId, 'solved');
  });

  socket.on(EV.DUEL_FORFEIT, (data: { duelId: string }) => {
    const me = getMe();
    const d = duels.get(String(data?.duelId ?? ''));
    if (!me || !d || d.status !== 'active' || (d.a !== me.playerId && d.b !== me.playerId)) return;
    finish(d, other(d, me.playerId), 'forfeit');
  });
}
