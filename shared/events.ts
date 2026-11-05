/**
 * Nomes dos eventos Socket.io — use sempre estas constantes
 * para cliente e servidor não divergirem.
 */
export const EV = {
  // cliente -> servidor
  PLAYER_CONNECT: 'player_connect', // {playerId?, name, color, team}
  PLAYER_JOIN_LOBBY: 'player_join_lobby',
  ENTER_WORLD: 'enter_world',
  LEAVE_WORLD: 'leave_world',
  PLAYER_MOVE: 'player_move', // {x, y}
  ENTER_AREA: 'enter_area', // {moduleId}
  LEAVE_AREA: 'leave_area', // {moduleId}
  START_CHALLENGE: 'start_challenge', // {stationId}
  SUBMIT_ANSWER: 'submit_answer', // {instanceId, answer}
  CANCEL_CHALLENGE: 'cancel_challenge',
  REQUEST_HELP: 'request_help',
  BUY_HINT: 'buy_hint',
  SEND_HINT: 'send_hint', // {targetId}
  EMOTE: 'emote', // {emote}
  LESSON_COMPLETE: 'lesson_complete', // {component}
  DUEL_INVITE: 'duel_invite', // {targetId, mode}
  DUEL_RESPOND: 'duel_respond', // {duelId, accept}
  DUEL_SUBMIT: 'duel_submit', // {duelId, answer}
  DUEL_FORFEIT: 'duel_forfeit', // {duelId}
  SHOP_BUY: 'shop_buy', // {itemId}
  SHOP_EQUIP: 'shop_equip', // {kind, itemId|null}
  PROFILE_LOOK: 'profile_look', // {color, skin, hair} — menu "Personagem"
  LAB_BUILT: 'lab_built', // {nodes} — montou uma tela no Laboratório
  RACE_SUBMIT: 'race_submit', // {raceId, answer}

  // servidor -> cliente
  WELCOME: 'welcome', // {playerId, progress, modules, players}
  LOBBY_UPDATE: 'lobby_update', // PublicPlayer[]
  PLAYER_DISCONNECT: 'player_disconnect', // {id}
  SYNC_PLAYERS: 'sync_players', // [id, x, y][] (compacto)
  MODULE_UPDATED: 'module_updated', // ModuleState[]
  AREA_RESULT: 'area_result', // {moduleId, allowed, reason?}
  CHALLENGE_DATA: 'challenge_data', // ChallengeView
  ANSWER_RESULT: 'answer_result', // AnswerResult
  CHALLENGE_COMPLETED: 'challenge_completed', // {playerId, name, stationId, title}
  HINT_RECEIVED: 'hint_received', // {hint, from}
  HELP_REQUESTS: 'help_requests', // HelpRequest[]
  UPDATE_INVENTORY: 'update_inventory', // PlayerProgress
  TEAM_PROGRESS_UPDATE: 'team_progress_update', // Record<TeamId, number>
  PLAY_SOUND: 'play_sound', // SoundName
  NOTICE: 'notice', // {text, kind}
  FEED: 'feed', // {text} — acontecimentos dos colegas
  DUEL_INVITED: 'duel_invited', // DuelInvite (notificação no canto)
  DUEL_INVITE_CLOSED: 'duel_invite_closed', // {duelId}
  DUEL_START: 'duel_start', // DuelStart
  DUEL_FEEDBACK: 'duel_feedback', // {msg}
  DUEL_OPPONENT: 'duel_opponent', // {attempts}
  DUEL_END: 'duel_end', // DuelEnd
  LOGIN_ERROR: 'login_error', // {text} — nome em uso, aluno bloqueado…
  RACE_START: 'race_start', // RaceStart
  RACE_FEEDBACK: 'race_feedback', // {msg, cooldownMs}
  RACE_STATE: 'race_state', // RaceState (ranking ao vivo)
} as const;

export const TEAMS = [
  { id: 'azul', name: 'Equipe Azul', color: '#2f7bff' },
  { id: 'verde', name: 'Equipe Verde', color: '#2fbf5b' },
  { id: 'laranja', name: 'Equipe Laranja', color: '#ff8a1f' },
  { id: 'roxo', name: 'Equipe Roxa', color: '#9b4dff' },
] as const;

export const AVATAR_COLORS = ['#e74c3c', '#f39c12', '#f1c40f', '#2ecc71', '#1abc9c', '#3498db', '#9b59b6', '#ec407a'];

export const EMOTES = ['👋', '🎉', '🤔', '👍', '🆘', '😂'];

/** Regras de jogo ajustáveis */
export const RULES = {
  START_COINS: 30,
  HINT_COST: 10, // custo para comprar dica própria
  SEND_HINT_COST: 10, // custo para enviar dica a um colega
  WRONG_TO_STUCK: 2, // erros até o jogador aparecer como "travado"
  XP_PER_LEVEL: 100,
  MOVE_SEND_MS: 66, // cliente envia posição no máx. ~15x/s
  SYNC_MS: 100, // servidor retransmite posições 10x/s
  // ---- contra o "chute" (tentar combinações até acertar)
  /** errar mais rápido que isto (desde que a pergunta apareceu) = chute */
  GUESS_FAST_MS: { quiz_component: 4000, fix_bug: 5000, match_use: 6000, build_ui: 6000, boss_challenge: 4000 },
  /** tempo extra somado ao tempo final por erro / por chute */
  WRONG_PENALTY_MS: 10_000,
  GUESS_PENALTY_MS: 30_000,
  /** espera antes de poder tentar de novo: cresce a cada erro seguido (ms) */
  WRONG_COOLDOWN_MS: [3000, 6000, 10000, 15000],
  GUESS_EXTRA_COOLDOWN_MS: 5000,
  /** duelos e corrida (contra o relógio): esperas menores */
  RACE_COOLDOWN_MS: [2000, 4000, 6000, 8000],
};

/** Normaliza um nome para comparar ("  Ána  Clara " == "ana clara"). */
export function nameKey(name: string) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}
