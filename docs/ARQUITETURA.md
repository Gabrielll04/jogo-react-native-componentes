# Arquitetura

```
 Navegador do aluno                                   PC do professor
┌──────────────────────────────────────────┐        ┌──────────────────────────────────┐
│ React + react-native-web (UI)            │        │ Node.js                          │
│  ├─ Conexão / Lobby / HUD / Desafios     │◀──────▶│  Express                         │
│  └─ demos vivas dos componentes RN       │  HTTP  │   ├─ /            jogo (dist)    │
│ Phaser 3 (mapa 2D top-down)              │        │   ├─ /admin       painel         │
│  └─ movimento, colisão, portas, avatares │◀──────▶│   └─ /health /modules /admin/*   │
│ Howler.js (sons)                         │ Socket │  Socket.io (game.ts)             │
│ socket.io-client                         │  .io   │  Estado em memória → save.json   │
└──────────────────────────────────────────┘        └──────────────────────────────────┘
                       shared/  (tipos, eventos, módulos, mapa) usado pelos dois lados
```

## Princípios

- **Servidor é a fonte da verdade.** Ele decide se o módulo está liberado, se o jogador está
  perto da estação, se o chefe já pode ser enfrentado e se a resposta está certa. O
  cliente nunca recebe o gabarito.
- **Rede econômica.** O cliente envia a posição no máximo ~15x/s e só se mudou
  (`RULES.MOVE_SEND_MS`); o servidor retransmite todas as posições 10x/s em um pacote compacto
  `[id, x, y][]`, só se algo mudou (`RULES.SYNC_MS`); os clientes interpolam o movimento dos
  outros jogadores. Posições não passam pelo React: vão direto para o Phaser pela `bridge`.
- **Conteúdo declarativo.** Módulos, estações, perguntas, demos e moldes são dados; o motor
  (`challengeEngine.ts`) transforma em rodadas.

## Ciclo de aprendizagem

1. **Lição com um Mestre** (cliente, `client/src/lessons`): Conheça → Experimente → Teste → Carta.
   Ao fim o cliente envia `lesson_complete {component}`; o servidor confere módulo liberado e
   distância até o Mestre e registra em `progress.learned` (+ carta, XP, moedas).
2. **Terminais** só abrem quando todos os componentes do módulo estão em `learned`.
3. **Chefe** só abre quando os outros terminais do módulo foram concluídos.
4. A missão atual (HUD, seta e minimapa) é calculada em `client/src/game/quest.ts` a partir do progresso.

## Duelos

Lógica em `server/src/duels.ts`, tarefas em `shared/duels.ts`. O servidor sorteia a tarefa,
controla a contagem (tempos relativos, para não depender do relógio de cada PC), confere as
respostas e transfere as moedas: `min(DUEL_STAKE, moedas do perdedor)`. Desistir, sair do mundo
ou desconectar durante o duelo = derrota; convite expira em 30 s; duelo expira em 4 min (empate).

## Fluxo de um desafio

1. Jogador perto do terminal aperta **E** → `start_challenge {stationId}`.
2. Servidor valida (módulo liberado, pré-requisitos, lições do módulo aprendidas, distância ≤ 2,5
   tiles, chefe exige os outros terminais), sorteia variante, embaralha e responde `challenge_data` (sem gabarito).
3. Cliente renderiza o tipo de desafio com componentes RN (demo viva/prévia).
4. `submit_answer` → servidor corrige → `answer_result` (+ `play_sound`, `update_inventory`,
   `team_progress_update`, `challenge_completed` para o feed dos colegas).
5. Errou: feedback educativo, alternativas reembaralhadas; após 2 erros o jogador aparece como
   "travado" (`help_requests`) e colegas que já concluíram podem enviar dica (`send_hint`).

## Eventos Socket.io (`shared/events.ts`)

| Evento | Direção | Dados |
|---|---|---|
| `player_connect` | C→S | `{ playerId?, name, color, team }` |
| `welcome` | S→C | `{ playerId, progress, modules, players, teamTotals, achievements }` |
| `lobby_update` | S→C | `PublicPlayer[]` |
| `enter_world` / `leave_world` | C→S | — |
| `player_move` | C→S | `{ x, y }` (volatile, com throttle) |
| `sync_players` | S→C | `[id, x, y][]` (10x/s) |
| `enter_area` / `leave_area` | C→S | `{ moduleId }` |
| `area_result` | S→C | `{ moduleId, allowed, reason? }` |
| `module_updated` | S→C | `ModuleState[]` |
| `start_challenge` | C→S | `{ stationId }` |
| `challenge_data` | S→C | `ChallengeView` |
| `submit_answer` | C→S | `{ instanceId, answer }` |
| `answer_result` | S→C | `AnswerResult` |
| `cancel_challenge` | C→S | — |
| `challenge_completed` | S→todos | `{ playerId, name, stationId, title }` |
| `request_help` / `buy_hint` | C→S | — |
| `send_hint` | C→S | `{ targetId }` |
| `hint_received` | S→C | `{ hint, from }` |
| `help_requests` | S→C | `HelpRequest[]` (com `canHelp` por destinatário) |
| `update_inventory` | S→C | `PlayerProgress` |
| `team_progress_update` | S→todos | `{ azul, verde, laranja, roxo }` (XP) |
| `play_sound` | S→C | nome do som |
| `notice` | S→C | `{ text, kind }` |
| `emote` | C↔S | `{ emote }` / `{ id, emote }` |
| `lesson_complete` | C→S | `{ component }` |
| `duel_invite` | C→S | `{ targetId, mode }` |
| `duel_invited` | S→C | convite (notificação no canto) |
| `duel_respond` | C→S | `{ duelId, accept }` |
| `duel_invite_closed` | S→C | `{ duelId }` (recusado/expirado/cancelado) |
| `duel_start` | S→C | `{ duelId, taskId, mode, opponent, stake, startsIn }` |
| `duel_submit` | C→S | `{ duelId, answer }` (árvore ou código) |
| `duel_feedback` / `duel_opponent` | S→C | erro do próprio aluno / tentativas do adversário |
| `duel_forfeit` | C→S | `{ duelId }` |
| `duel_end` | S→C | resultado, moedas (+/-), XP, solução |
| `feed` | S→todos | `{ text }` acontecimentos (duelos, corrida) |
| `login_error` | S→C | `{ text }` nome em uso, nome curto, aluno bloqueado/apagado |
| `shop_buy` / `shop_equip` | C→S | `{ itemId }` / `{ kind, itemId \| null }` |
| `lab_built` | C→S | `{ nodes }` (conquista Cientista) |
| `race_start` | S→C | `{ raceId, taskId, mode, startsIn, maxMs }` |
| `race_submit` | C→S | `{ raceId, answer }` |
| `race_feedback` | S→C | `{ msg, cooldownMs }` |
| `race_state` | S→mundo | `{ raceId, finishers, players, ended }` (ranking ao vivo) |
| `player_disconnect` | S→todos | `{ id }` |

## Endpoints REST

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| GET | `/health` | — | Servidor ativo |
| GET | `/modules` | — | Módulos e status |
| GET | `/admin` | — | Página do painel (pede a senha) |
| GET | `/admin/check` | ✔ | Valida a senha |
| POST | `/admin/modules/:id/unlock` | ✔ | Libera módulo |
| POST | `/admin/modules/:id/lock` | ✔ | Tranca módulo |
| GET | `/admin/players` | ✔ | Jogadores conectados |
| GET | `/admin/progress` | ✔ | Progresso de todos |
| GET | `/admin/logs` | ✔ | Últimos logs |
| POST | `/admin/announce` | ✔ | `{ text }` anúncio para todos |
| GET | `/profile?name=` | — | Perfil salvo com esse nome (tela de entrada: "Bem-vindo de volta") |
| POST | `/admin/players/:id/rename` | ✔ | `{ name }` (recusa nome repetido) |
| POST | `/admin/players/:id/ban` | ✔ | `{ banned }` bloqueia/desbloqueia (desconecta na hora) |
| DELETE | `/admin/players/:id` | ✔ | Apaga o perfil |
| GET | `/admin/insights` | ✔ | Estatísticas por desafio + alunos online (quem precisa de ajuda) |
| GET | `/admin/race` · POST `/admin/race/start` · `/admin/race/stop` | ✔ | Corrida da turma (`{ mode: 'blocks' \| 'code' }`) |
| POST | `/admin/reset` | ✔ | Apaga o progresso |
| GET | `/admin/export.json` · `/admin/export.csv` | ✔ | Exporta progresso |

Auth = cabeçalho `x-admin-senha: <ADMIN_SENHA>` (ou `?senha=` nos downloads).

## Persistência

`server/data/save.json` guarda módulos liberados, o progresso de cada jogador e as estatísticas
por desafio (gravação com *debounce* de 2 s, em arquivo temporário + rename, e ao encerrar com Ctrl+C).
Ao iniciar, o servidor faz um backup em `server/data/backups/` (20 mais recentes) e completa os
campos que saves antigos não têm (`state.load()`), então versões novas abrem saves antigos.

**Identidade = nome.** `player_connect` procura um perfil com o mesmo nome (`nameKey`: sem acentos,
minúsculo, espaços normalizados). Achou → usa esse perfil; não achou → cria um novo. Se o perfil já
está online, só entra quem manda o mesmo `playerId` guardado no navegador (mesma pessoa em outra aba:
a conexão antiga é substituída); os demais recebem `login_error`. Saves antigos com nomes repetidos:
vale o perfil com mais XP, e o painel marca ⚠️ para o professor renomear.

## Anti-trapaça e anti-decoreba (MVP)

- Gabarito só no servidor; distância até o terminal/Mestre validada no servidor.
- Árvores JSX enviadas no "Monte a tela" têm tamanho limitado (40 nós, 8 níveis).
- Variantes sorteadas, alternativas embaralhadas a cada envio, chefe troca de pergunta ao errar.
- Rejogar uma estação concluída dá só 5 XP (treino), evitando "farmar".
- **Código validado de verdade:** duelos, corrida, laboratório e "Monte a tela" por código passam por
  um parser JS/JSX real (`shared/codecheck.ts`); erro de sintaxe, import faltando ou texto fora de
  `<Text>` impedem a resposta de contar, no cliente e no servidor.
- **Chute:** errar antes de `RULES.GUESS_FAST_MS` (contado desde que a pergunta apareceu ou desde o fim
  da espera anterior) soma `GUESS_PENALTY_MS` ao tempo, tira mais XP e aumenta a espera. Toda resposta
  errada gera uma espera crescente (`WRONG_COOLDOWN_MS`) validada no servidor (`inst.lockUntil`).
  Duelos e corrida usam `RACE_COOLDOWN_MS`.
- Ajudado ganha 80% do XP; dicas custam moedas; chefe é individual.
- Limitações conhecidas: a colisão de portas é feita no cliente (o servidor só valida ao
  iniciar desafios); a autenticação do painel é uma senha simples.
