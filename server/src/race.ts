/**
 * CORRIDA DA TURMA 🏁 — o professor inicia pelo painel; todos que estão no mapa
 * recebem a MESMA tarefa (blocos ou código). Ranking ao vivo por ordem de chegada.
 *  Prêmios em racePrize (shared/duels.ts): 1º/2º/3º e quem terminar; código e tarefas mais exigentes valem mais.
 * Errar dá uma espera crescente (contra o "chute"). A corrida acaba quando o tempo
 * esgota, quando todos terminam ou quando o professor encerra.
 */
import { randomUUID } from 'node:crypto';
import type { Socket } from 'socket.io';
import { duelTask, judgeTask, MODE_LABEL, racePrize, randomDuelTask, type DuelMode } from '../../shared/duels';
import { EV, RULES } from '../../shared/events';
import type { RaceRankEntry, RaceStart, RaceState } from '../../shared/types';
import { afterProgressChange, award, getIo, notice, onlinePlayers, sound, type OnlinePlayer } from './game';
import { state } from './state';

export const RACE_COUNTDOWN_MS = 5000;
export const RACE_MAX_MS = 3 * 60_000;

interface Race {
  id: string;
  taskId: string;
  mode: DuelMode;
  startsAt: number;
  endsAt: number;
  finishers: RaceRankEntry[];
  streak: Record<string, number>;
  lockUntil: Record<string, number>;
  timer: NodeJS.Timeout;
  ended: boolean;
}

let race: Race | null = null;
let lastTaskId: string | undefined;
/** última corrida (o painel mostra o resultado depois do fim) */
let lastResult: { mode: DuelMode; title: string; finishers: RaceRankEntry[]; endedAt: number } | null = null;

const inWorldCount = () => onlinePlayers().filter((p) => p.inWorld).length;

function snapshot(): RaceState | null {
  if (!race) return null;
  return { raceId: race.id, finishers: race.finishers, players: inWorldCount(), ended: race.ended };
}

function broadcastState() {
  const s = snapshot();
  if (s) getIo().to('world').emit(EV.RACE_STATE, s);
}

function startPayload(r: Race): RaceStart {
  return {
    raceId: r.id,
    taskId: r.taskId,
    mode: r.mode,
    startsIn: Math.max(0, r.startsAt - Date.now()),
    maxMs: r.endsAt - r.startsAt,
  };
}

export function startRace(mode: DuelMode, taskId?: string) {
  if (race && !race.ended) return { ok: false, error: 'Já existe uma corrida em andamento.' };
  const task = (taskId && duelTask(taskId)) || randomDuelTask(mode, lastTaskId);
  if (!task) return { ok: false, error: 'Tarefa desconhecida.' };
  const now = Date.now();
  lastTaskId = task.id;
  race = {
    id: randomUUID(),
    taskId: task.id,
    mode: task.mode,
    startsAt: now + RACE_COUNTDOWN_MS,
    endsAt: now + RACE_COUNTDOWN_MS + RACE_MAX_MS,
    finishers: [],
    streak: {},
    lockUntil: {},
    ended: false,
    timer: setTimeout(() => stopRace(true), RACE_COUNTDOWN_MS + RACE_MAX_MS),
  };
  const io = getIo();
  io.to('world').emit(EV.RACE_START, startPayload(race));
  io.to('world').emit(EV.PLAY_SOUND, 'duel');
  io.emit(EV.NOTICE, { text: `🏁 CORRIDA DA TURMA (${MODE_LABEL[task.mode]}): "${task.title}" — começa em 5 segundos!`, kind: 'success' });
  broadcastState();
  state.log(`🏁 Professor iniciou uma corrida (${MODE_LABEL[task.mode]}): ${task.title}`);
  return { ok: true };
}

/** Encerra a corrida (tempo esgotado, todos terminaram ou o professor parou). */
export function stopRace(announce: boolean) {
  if (!race || race.ended) return;
  clearTimeout(race.timer);
  race.ended = true;
  const task = duelTask(race.taskId)!;
  lastResult = { mode: race.mode, title: task.title, finishers: race.finishers, endedAt: Date.now() };
  if (announce) {
    broadcastState();
    const top = race.finishers.slice(0, 3).map((f) => `${['🥇', '🥈', '🥉'][f.place - 1]} ${f.name}`).join('  ');
    getIo().emit(EV.NOTICE, { text: `🏁 Fim da corrida! ${top || 'Ninguém terminou desta vez.'}`, kind: 'success' });
    state.log(`🏁 Corrida encerrada: ${race.finishers.length} aluno(s) terminaram`);
  }
  race = null;
}

/** Entrou no mapa durante a corrida: recebe a tarefa também. */
export function raceJoined(o: OnlinePlayer) {
  if (!race || race.ended) return;
  const io = getIo();
  io.to(o.socketId).emit(EV.RACE_START, startPayload(race));
  io.to(o.socketId).emit(EV.RACE_STATE, snapshot());
}

export function raceGone(_o: OnlinePlayer) {
  // quem sai simplesmente não termina; só atualiza a contagem de participantes
  if (race && !race.ended) setTimeout(broadcastState, 0);
}

export function raceInfo() {
  if (race) {
    const task = duelTask(race.taskId)!;
    return {
      active: true,
      mode: race.mode,
      title: task.title,
      startsAt: race.startsAt,
      endsAt: race.endsAt,
      finishers: race.finishers,
      players: inWorldCount(),
    };
  }
  return { active: false, last: lastResult };
}

export function registerRaceHandlers(socket: Socket, getMe: () => OnlinePlayer | null) {
  socket.on(EV.RACE_SUBMIT, (data: { raceId: string; answer: unknown }) => {
    const me = getMe();
    const r = race;
    if (!me || !me.inWorld || !r || r.ended || r.id !== data?.raceId) return;
    const now = Date.now();
    if (now < r.startsAt) return;
    if (r.finishers.some((f) => f.playerId === me.playerId)) return;
    if (now < (r.lockUntil[me.playerId] ?? 0)) return;

    const wrong = judgeTask(duelTask(r.taskId)!, data.answer);
    if (wrong) {
      const n = (r.streak[me.playerId] = (r.streak[me.playerId] ?? 0) + 1);
      const steps = RULES.RACE_COOLDOWN_MS;
      const cooldownMs = steps[Math.min(n, steps.length) - 1];
      r.lockUntil[me.playerId] = now + cooldownMs;
      socket.emit(EV.RACE_FEEDBACK, { msg: wrong, cooldownMs });
      sound(socket, 'wrong');
      return;
    }

    const p = state.progress[me.playerId];
    const place = r.finishers.length + 1;
    const prize = racePrize(r.taskId, place);
    p.xp += prize.xp;
    p.coins += prize.coins;
    me.lastProgressAt = now;
    if (place === 1) {
      p.racesWon += 1;
      award(socket.id, p, 'velocista');
    }
    r.finishers.push({ playerId: p.id, name: p.name, color: p.color, timeMs: now - r.startsAt, place, xp: prize.xp, coins: prize.coins });
    sound(socket, place <= 3 ? 'boss' : 'correct');
    if (place <= 3) {
      getIo().emit(EV.FEED, { text: `${['🥇', '🥈', '🥉'][place - 1]} ${p.name} terminou a corrida em ${place}º lugar!` });
    }
    state.log(`🏁 ${p.name} terminou a corrida em ${place}º (${((now - r.startsAt) / 1000).toFixed(1)}s)`);
    afterProgressChange(me);
    broadcastState();

    // todos que estão no mapa terminaram? encerra
    const inWorld = onlinePlayers().filter((x) => x.inWorld).map((x) => x.id);
    if (inWorld.every((id) => r.finishers.some((f) => f.playerId === id))) {
      setTimeout(() => {
        if (race === r) stopRace(true);
      }, 1500);
    }
  });
}

