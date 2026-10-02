/**
 * Lógica multiplayer (Socket.io): lobby, movimento, áreas, desafios,
 * dicas/cooperação e recompensas. O servidor é a fonte da verdade:
 * valida módulo liberado, distância até a estação e as respostas.
 */
import { randomUUID } from 'node:crypto';
import type { Server, Socket } from 'socket.io';
import { AVATAR_COLORS, EMOTES, EV, RULES, TEAMS } from '../../shared/events';
import { buildWorld, MAP_H, MAP_W, TILE } from '../../shared/map';
import { COMPONENTS, findStation, levelFromXp, MODULES } from '../../shared/modules';
import type {
  AnswerResult,
  ChallengeAnswer,
  HelpRequest,
  PlayerProgress,
  PublicPlayer,
  SoundName,
  TeamId,
} from '../../shared/types';
import { createInstance, nextBossRound, nextHint, reshuffleRound, toView, type Instance } from './challengeEngine';
import { ACHIEVEMENTS, grantAchievement, state } from './state';

const world = buildWorld();

interface OnlinePlayer {
  socketId: string;
  playerId: string;
  x: number;
  y: number;
  inWorld: boolean;
  area: number | null;
  stuck: boolean;
  instance: Instance | null;
  lastEmoteAt: number;
}

/** socketId -> jogador online */
const online = new Map<string, OnlinePlayer>();
let positionsDirty = false;
let io: Server;

const XP_BY_TYPE = { quiz_component: 20, fix_bug: 25, match_use: 30, build_ui: 40, boss_challenge: 100 } as const;

// ------------------------------------------------------------------ helpers

function findOnlineByPlayer(playerId: string) {
  for (const o of online.values()) if (o.playerId === playerId) return o;
  return null;
}

function toPublic(o: OnlinePlayer): PublicPlayer {
  const p = state.progress[o.playerId];
  return {
    id: o.playerId,
    name: p.name,
    color: p.color,
    team: p.team,
    x: Math.round(o.x),
    y: Math.round(o.y),
    inWorld: o.inWorld,
    online: true,
    stuck: o.stuck,
    stationId: o.instance?.stationId ?? null,
    level: levelFromXp(p.xp, RULES.XP_PER_LEVEL),
    xp: p.xp,
    emote: null,
  };
}

export function onlinePlayers() {
  return [...online.values()].map(toPublic);
}

function broadcastLobby() {
  io.emit(EV.LOBBY_UPDATE, onlinePlayers());
}

function sound(socket: Socket | string, name: SoundName) {
  if (typeof socket === 'string') io.to(socket).emit(EV.PLAY_SOUND, name);
  else socket.emit(EV.PLAY_SOUND, name);
}

function notice(target: Socket | string | null, text: string, kind: 'info' | 'success' | 'warn' = 'info') {
  if (target === null) io.emit(EV.NOTICE, { text, kind });
  else if (typeof target === 'string') io.to(target).emit(EV.NOTICE, { text, kind });
  else target.emit(EV.NOTICE, { text, kind });
}

function sendProgress(socketId: string, p: PlayerProgress) {
  io.to(socketId).emit(EV.UPDATE_INVENTORY, p);
}

/** Lista de pedidos de ajuda personalizada (canHelp depende de quem vê). */
function broadcastHelpRequests() {
  const requests: HelpRequest[] = [];
  for (const o of online.values()) {
    if (o.stuck && o.instance && o.instance.type !== 'boss_challenge') {
      requests.push({
        playerId: o.playerId,
        name: state.progress[o.playerId].name,
        stationId: o.instance.stationId,
        stationTitle: o.instance.title,
      });
    }
  }
  for (const viewer of online.values()) {
    const vp = state.progress[viewer.playerId];
    io.to(viewer.socketId).emit(
      EV.HELP_REQUESTS,
      requests
        .filter((r) => r.playerId !== viewer.playerId)
        .map((r) => ({ ...r, canHelp: Boolean(vp.completed[r.stationId]) }))
    );
  }
}

function award(socketId: string, p: PlayerProgress, achievementId: string) {
  if (grantAchievement(p, achievementId)) {
    const a = ACHIEVEMENTS[achievementId];
    notice(socketId, `${a.emoji} Conquista desbloqueada: ${a.title}`, 'success');
    sound(socketId, 'achievement');
    state.log(`${p.name} ganhou a conquista "${a.title}"`);
  }
}

function afterProgressChange(o: OnlinePlayer) {
  const p = state.progress[o.playerId];
  sendProgress(o.socketId, p);
  io.emit(EV.TEAM_PROGRESS_UPDATE, state.teamTotals());
  broadcastLobby();
  state.save();
}

// ------------------------------------------------------------------ módulos (usado pelo painel admin)

export function setModuleLock(moduleId: number, unlocked: boolean) {
  if (!state.setUnlocked(moduleId, unlocked)) return false;
  const mod = MODULES.find((m) => m.id === moduleId)!;
  io.emit(EV.MODULE_UPDATED, state.modules);
  if (unlocked) {
    io.emit(EV.PLAY_SOUND, 'door');
    notice(null, `🚪 ${mod.emoji} ${mod.name} foi LIBERADO pelo professor!`, 'success');
  } else {
    notice(null, `🔒 ${mod.name} foi bloqueado.`, 'warn');
  }
  state.log(`Professor ${unlocked ? 'liberou' : 'bloqueou'} o módulo ${moduleId} (${mod.name})`);
  return true;
}

export function announce(text: string) {
  notice(null, `📢 Professor: ${text}`, 'info');
  state.log(`Anúncio: ${text}`);
}

export function resetAll() {
  state.reset();
  for (const o of online.values()) {
    o.instance = null;
    o.stuck = false;
    // recria progresso zerado para quem está online
    const s = io.sockets.sockets.get(o.socketId);
    s?.emit(EV.NOTICE, { text: 'O professor reiniciou o progresso. Entre novamente.', kind: 'warn' });
    s?.disconnect(true);
  }
  online.clear();
}

// ------------------------------------------------------------------ socket

export function setupGame(server: Server) {
  io = server;

  io.on('connection', (socket) => {
    let me: OnlinePlayer | null = null;

    // ---- entrada do jogador
    socket.on(EV.PLAYER_CONNECT, (data: { playerId?: string; name?: string; color?: string; team?: string }) => {
      if (me) return;
      const name = String(data?.name ?? '').trim().slice(0, 16) || `Aluno${Math.floor(Math.random() * 900 + 100)}`;
      const color = AVATAR_COLORS.includes(String(data?.color)) ? String(data.color) : AVATAR_COLORS[0];
      const team = (TEAMS.some((t) => t.id === data?.team) ? data.team : 'azul') as TeamId;
      // reaproveita o id salvo no navegador, a menos que já esteja em uso (ex.: 2 abas)
      let playerId = typeof data?.playerId === 'string' && /^[\w-]{6,64}$/.test(data.playerId) ? data.playerId : '';
      if (!playerId || findOnlineByPlayer(playerId)) playerId = randomUUID();

      const p = state.getOrCreate(playerId, name, color, team);
      me = {
        socketId: socket.id,
        playerId,
        x: world.spawn.x + (Math.random() * 64 - 32),
        y: world.spawn.y,
        inWorld: false,
        area: null,
        stuck: false,
        instance: null,
        lastEmoteAt: 0,
      };
      online.set(socket.id, me);
      socket.emit(EV.WELCOME, {
        playerId,
        progress: p,
        modules: state.modules,
        players: onlinePlayers(),
        teamTotals: state.teamTotals(),
        achievements: ACHIEVEMENTS,
      });
      sound(socket, 'lobby');
      state.log(`${name} entrou no lobby (${team})`);
      broadcastLobby();
      broadcastHelpRequests();
    });

    // ---- lobby <-> mundo
    socket.on(EV.ENTER_WORLD, () => {
      if (!me) return;
      me.inWorld = true;
      socket.join('world');
      positionsDirty = true;
      broadcastLobby();
    });

    socket.on(EV.LEAVE_WORLD, () => {
      if (!me) return;
      me.inWorld = false;
      me.instance = null;
      me.stuck = false;
      socket.leave('world');
      broadcastLobby();
      broadcastHelpRequests();
    });

    // ---- movimento (cliente já envia com throttle; aqui só validamos limites)
    socket.on(EV.PLAYER_MOVE, (pos: { x: number; y: number }) => {
      if (!me || !me.inWorld) return;
      const x = Number(pos?.x);
      const y = Number(pos?.y);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;
      me.x = Math.max(0, Math.min(MAP_W * TILE, x));
      me.y = Math.max(0, Math.min(MAP_H * TILE, y));
      positionsDirty = true;
    });

    // ---- portas dos módulos
    socket.on(EV.ENTER_AREA, (data: { moduleId: number }) => {
      if (!me) return;
      const moduleId = Number(data?.moduleId);
      const p = state.progress[me.playerId];
      const mod = MODULES.find((m) => m.id === moduleId);
      if (!mod) return;
      let reason: string | undefined;
      if (!state.isUnlocked(moduleId)) reason = 'Este módulo ainda está trancado. Aguarde o professor liberar!';
      else if (!state.meetsRequirements(p, moduleId))
        reason = `Conclua antes o(s) módulo(s): ${mod.requires.join(', ')}`;
      socket.emit(EV.AREA_RESULT, { moduleId, allowed: !reason, reason });
      if (!reason && me.area !== moduleId) {
        me.area = moduleId;
        state.log(`${p.name} entrou em ${mod.name}`);
      }
    });

    socket.on(EV.LEAVE_AREA, () => {
      if (me) me.area = null;
    });

    // ---- desafios
    socket.on(EV.START_CHALLENGE, (data: { stationId: string }) => {
      if (!me || !me.inWorld) return;
      const p = state.progress[me.playerId];
      const stationId = String(data?.stationId ?? '');
      const found = findStation(stationId);
      if (!found) return notice(socket, 'Estação desconhecida.', 'warn');
      if (!state.isUnlocked(found.module.id)) return notice(socket, '🔒 Módulo trancado pelo professor.', 'warn');
      if (!state.meetsRequirements(p, found.module.id)) return notice(socket, 'Pré-requisitos não concluídos.', 'warn');

      // o jogador precisa estar perto da estação (não confiar só no cliente)
      const place = world.stations.find((s) => s.stationId === stationId);
      if (place) {
        const cx = place.x * TILE + TILE / 2;
        const cy = place.y * TILE + TILE / 2;
        if (Math.hypot(cx - me.x, cy - me.y) > TILE * 2.5) return notice(socket, 'Chegue mais perto da estação!', 'warn');
      }

      // aprender antes de praticar: todas as lições do módulo com os Mestres
      const notLearned = found.module.components.filter((c) => !p.learned.includes(c));
      if (notLearned.length) {
        return notice(socket, `📚 Primeiro aprenda com os Mestres: ${notLearned.map((c) => `<${c}>`).join(', ')}`, 'warn');
      }

      // chefe só depois das outras estações do módulo
      if (found.station.type === 'boss_challenge') {
        const missing = found.module.stations.filter((s) => s.type !== 'boss_challenge' && !p.completed[s.id]);
        if (missing.length) {
          return notice(socket, `⚔️ O guardião exige que você conclua antes: ${missing.map((s) => s.title).join(', ')}`, 'warn');
        }
      }

      const inst = createInstance(me.playerId, stationId);
      if (!inst) return notice(socket, 'Desafio sem conteúdo configurado.', 'warn');
      me.instance = inst;
      me.stuck = false;
      socket.emit(EV.CHALLENGE_DATA, toView(inst));
      broadcastLobby();
    });

    socket.on(EV.SUBMIT_ANSWER, (data: { instanceId: string; answer: ChallengeAnswer }) => {
      if (!me || !me.instance || me.instance.id !== data?.instanceId) return;
      const inst = me.instance;
      const p = state.progress[me.playerId];
      const answer = data.answer;
      if (typeof answer !== 'string' && (typeof answer !== 'object' || answer === null)) return;

      inst.attempts++;
      p.totalAttempts++;
      const correct = inst.round.check(answer);
      let result: AnswerResult;

      if (correct) {
        p.totalCorrect++;
        award(socket.id, p, 'primeiro_acerto');
        if (inst.boss) {
          inst.boss.bossHp--;
          if (inst.boss.bossHp > 0) {
            // dano no chefe: próxima rodada
            inst.boss.round++;
            const { reveal, explanation } = inst.round;
            nextBossRound(inst);
            sound(socket, 'correct');
            result = {
              correct: true,
              explanation: `💥 Golpe certeiro! ${explanation}`,
              xpGained: 0,
              coinsGained: 0,
              completed: false,
              next: toView(inst),
              reveal,
            };
          } else {
            result = completeStation(me, inst, p);
          }
        } else {
          result = completeStation(me, inst, p);
        }
      } else {
        inst.wrong++;
        sound(socket, 'wrong');
        if (inst.boss) {
          inst.boss.hearts--;
          if (inst.boss.hearts <= 0) {
            me.instance = null;
            state.log(`${p.name} foi derrotado(a) por ${inst.boss.bossName}`);
            result = {
              correct: false,
              explanation: `💀 ${inst.boss.bossName} venceu desta vez! Revise as estações e tente de novo.`,
              xpGained: 0,
              coinsGained: 0,
              completed: false,
              bossFailed: true,
            };
          } else {
            const fb = inst.round.wrongFeedback(answer);
            nextBossRound(inst); // nova pergunta: não dá para "chutar" até acertar
            result = { correct: false, explanation: `💔 ${fb}`, xpGained: 0, coinsGained: 0, completed: false, next: toView(inst) };
          }
        } else {
          const fb = inst.round.wrongFeedback(answer);
          reshuffleRound(inst);
          if (inst.wrong >= RULES.WRONG_TO_STUCK && !me.stuck) {
            me.stuck = true;
            broadcastHelpRequests();
            broadcastLobby();
          }
          result = { correct: false, explanation: fb, xpGained: 0, coinsGained: 0, completed: false, next: toView(inst) };
        }
        state.save();
      }
      socket.emit(EV.ANSWER_RESULT, result);
      afterProgressChange(me);
    });

    socket.on(EV.CANCEL_CHALLENGE, () => {
      if (!me) return;
      me.instance = null;
      if (me.stuck) {
        me.stuck = false;
        broadcastHelpRequests();
      }
      broadcastLobby();
    });

    // ---- cooperação
    socket.on(EV.REQUEST_HELP, () => {
      if (!me?.instance) return;
      if (me.instance.type === 'boss_challenge') return notice(socket, '⚔️ Desafio de chefe é individual!', 'warn');
      me.stuck = true;
      const name = state.progress[me.playerId].name;
      socket.broadcast.emit(EV.NOTICE, { text: `🆘 ${name} pediu ajuda em "${me.instance.title}"`, kind: 'info' });
      broadcastHelpRequests();
      broadcastLobby();
    });

    socket.on(EV.BUY_HINT, () => {
      if (!me?.instance) return;
      const inst = me.instance;
      const p = state.progress[me.playerId];
      if (inst.type === 'boss_challenge') return notice(socket, 'Sem dicas contra o chefe!', 'warn');
      const hint = nextHint(inst);
      if (!hint) return notice(socket, 'Não há mais dicas para este desafio.', 'warn');
      if (p.coins < RULES.HINT_COST) return notice(socket, `Você precisa de ${RULES.HINT_COST} moedas.`, 'warn');
      p.coins -= RULES.HINT_COST;
      inst.hintsShown.push(hint);
      socket.emit(EV.HINT_RECEIVED, { hint, from: null });
      sound(socket, 'hint');
      afterProgressChange(me);
    });

    socket.on(EV.SEND_HINT, (data: { targetId: string }) => {
      if (!me) return;
      const helper = state.progress[me.playerId];
      const target = findOnlineByPlayer(String(data?.targetId ?? ''));
      if (!target || target.playerId === me.playerId || !target.instance) return notice(socket, 'Esse colega não está em um desafio.', 'warn');
      const inst = target.instance;
      if (inst.type === 'boss_challenge') return notice(socket, 'Desafio de chefe é individual.', 'warn');
      if (!helper.completed[inst.stationId]) return notice(socket, 'Você só pode ajudar em desafios que já concluiu.', 'warn');
      if (helper.coins < RULES.SEND_HINT_COST) return notice(socket, `Enviar dica custa ${RULES.SEND_HINT_COST} moedas.`, 'warn');
      const hint = nextHint(inst);
      if (!hint) return notice(socket, 'Esse colega já recebeu todas as dicas. Incentive-o a revisar a explicação!', 'warn');

      helper.coins -= RULES.SEND_HINT_COST;
      inst.hintsShown.push(hint);
      inst.helped = true;
      if (!inst.helperIds.includes(me.playerId)) inst.helperIds.push(me.playerId);
      // a dica é pré-escrita pelo professor: nunca entrega a resposta
      io.to(target.socketId).emit(EV.HINT_RECEIVED, { hint, from: helper.name });
      sound(target.socketId, 'hint');
      sound(socket, 'hint');
      notice(socket, `🤝 Dica enviada para ${state.progress[target.playerId].name}! Se acertar, os dois ganham pontos de cooperação.`, 'success');
      state.log(`${helper.name} enviou dica para ${state.progress[target.playerId].name} (${inst.title})`);
      afterProgressChange(me);
    });

    // ---- lições dos Mestres (aprender um componente)
    socket.on(EV.LESSON_COMPLETE, (data: { component: string }) => {
      if (!me || !me.inWorld) return;
      const p = state.progress[me.playerId];
      const component = String(data?.component ?? '');
      const info = COMPONENTS[component];
      const mentor = world.mentors.find((m) => m.component === component);
      if (!info || !mentor) return;
      if (!state.isUnlocked(info.module)) return notice(socket, '🔒 Módulo trancado pelo professor.', 'warn');
      const cx = mentor.x * TILE + TILE / 2;
      const cy = mentor.y * TILE + TILE / 2;
      if (Math.hypot(cx - me.x, cy - me.y) > TILE * 3) return notice(socket, 'Volte até o Mestre para concluir a lição.', 'warn');
      if (p.learned.includes(component)) return; // revisão: sem recompensa

      p.learned.push(component);
      if (!p.cards.includes(component)) p.cards.push(component);
      p.xp += 15;
      p.coins += 5;
      sound(socket, 'achievement');
      notice(socket, `🃏 Nova carta: <${component}>! +15 XP`, 'success');
      award(socket.id, p, 'aprendiz');
      if (p.cards.length >= 10) award(socket.id, p, 'colecionador');
      const mod = MODULES.find((m) => m.id === info.module)!;
      if (mod.components.every((c) => p.learned.includes(c))) {
        notice(socket, `🎓 Você aprendeu todos os componentes de ${mod.name}! Os terminais de desafio foram liberados.`, 'success');
      }
      state.log(`${p.name} aprendeu <${component}>`);
      io.emit(EV.CHALLENGE_COMPLETED, { playerId: p.id, name: p.name, stationId: `lesson:${component}`, title: `aprendeu <${component}>` });
      afterProgressChange(me);
    });

    // ---- emotes
    socket.on(EV.EMOTE, (data: { emote: string }) => {
      if (!me) return;
      const now = Date.now();
      if (now - me.lastEmoteAt < 800 || !EMOTES.includes(String(data?.emote))) return;
      me.lastEmoteAt = now;
      io.emit(EV.EMOTE, { id: me.playerId, emote: data.emote });
    });

    socket.on('disconnect', () => {
      if (!me) return;
      const p = state.progress[me.playerId];
      online.delete(socket.id);
      if (p) {
        p.lastSeen = Date.now();
        state.log(`${p.name} saiu`);
      }
      io.emit(EV.PLAYER_DISCONNECT, { id: me.playerId });
      broadcastLobby();
      broadcastHelpRequests();
      state.save();
    });
  });

  // retransmite posições em frequência controlada (10x/s) e só se algo mudou
  setInterval(() => {
    if (!positionsDirty) return;
    positionsDirty = false;
    const packet: [string, number, number][] = [];
    for (const o of online.values()) if (o.inWorld) packet.push([o.playerId, Math.round(o.x), Math.round(o.y)]);
    io.to('world').volatile.emit(EV.SYNC_PLAYERS, packet);
  }, RULES.SYNC_MS);
}

/** Calcula recompensas e registra a conclusão de uma estação. */
function completeStation(me: OnlinePlayer, inst: Instance, p: PlayerProgress): AnswerResult {
  const firstTime = !p.completed[inst.stationId];
  const timeMs = Date.now() - inst.startedAt;
  let xp: number;
  let coins: number;
  if (firstTime) {
    const base = XP_BY_TYPE[inst.type];
    xp = Math.max(Math.round(base / 2), base - inst.wrong * 5 - inst.hintsShown.length * 5);
    if (inst.helped) xp = Math.round(xp * 0.8); // ajudado ganha um pouco menos: responder pelo colega não compensa
    coins = inst.type === 'boss_challenge' ? 30 : inst.wrong === 0 ? 10 : 5;
    p.completed[inst.stationId] = { at: Date.now(), attempts: inst.attempts, timeMs, helped: inst.helped };
  } else {
    // treino: rejogar dá pouca recompensa (evita "farmar" XP)
    xp = 5;
    coins = 1;
  }
  p.xp += xp;
  p.coins += coins;
  me.instance = null;
  me.stuck = false;

  const result: AnswerResult = {
    correct: true,
    explanation: inst.round.explanation,
    xpGained: xp,
    coinsGained: coins,
    completed: true,
    reveal: inst.round.reveal,
  };

  if (firstTime && inst.wrong === 0) award(me.socketId, p, 'sem_erros');

  // cooperação: quem ajudou e quem foi ajudado ganham pontos
  if (inst.helped) {
    p.coopPoints += 1;
    for (const helperId of inst.helperIds) {
      const hp = state.progress[helperId];
      if (!hp) continue;
      hp.coopPoints += 2;
      hp.xp += 10;
      const ho = findOnlineByPlayer(helperId);
      if (ho) {
        notice(ho.socketId, `🤝 ${p.name} acertou com a sua dica! +10 XP e +2 cooperação`, 'success');
        award(ho.socketId, hp, 'mentor');
        sendProgress(ho.socketId, hp);
      }
      state.log(`Cooperação: ${hp.name} ajudou ${p.name} em ${inst.title}`);
    }
  }

  if (inst.type === 'boss_challenge') {
    const mod = MODULES.find((m) => m.id === inst.moduleId)!;
    result.bossDefeated = true;
    if (!p.modulesCompleted.includes(mod.id)) {
      p.modulesCompleted.push(mod.id);
      result.moduleCompleted = mod.id;
      // fanfarra de "módulo concluído" logo depois do som do chefe
      setTimeout(() => sound(me.socketId, 'module'), 1400);
      state.log(`🏆 ${p.name} concluiu o módulo ${mod.id} (${mod.name})`);
      io.emit(EV.NOTICE, { text: `🏆 ${p.name} derrotou ${inst.boss?.bossName} e concluiu ${mod.name}!`, kind: 'success' });
    }
    sound(me.socketId, 'boss');
    award(me.socketId, p, 'cacador_de_chefes');
    if (p.cards.length >= 10) award(me.socketId, p, 'colecionador');
    if (MODULES.every((m) => p.modulesCompleted.includes(m.id))) award(me.socketId, p, 'mestre');
  } else {
    sound(me.socketId, 'correct');
  }

  state.log(`${p.name} ${firstTime ? 'concluiu' : 'treinou'} "${inst.title}" (${inst.attempts} tentativa(s), ${(timeMs / 1000).toFixed(0)}s${inst.helped ? ', com ajuda' : ''})`);
  io.emit(EV.CHALLENGE_COMPLETED, { playerId: p.id, name: p.name, stationId: inst.stationId, title: inst.title });
  broadcastHelpRequests();
  return result;
}
