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
};
