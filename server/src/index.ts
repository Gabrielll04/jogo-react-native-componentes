/**
 * React Native Quest — servidor
 *  - Express: rotas REST, painel do professor (/admin) e o jogo compilado (client/dist)
 *  - Socket.io: multiplayer em tempo real (ver game.ts)
 *
 * Variáveis de ambiente:
 *   PORT=3000            porta (padrão 3000)
 *   ADMIN_SENHA=...      senha do painel (padrão "professor123")
 */
import express, { type NextFunction, type Request, type Response } from 'express';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import qrcode from 'qrcode-terminal';
import { Server } from 'socket.io';
import { nameKey } from '../../shared/events';
import { levelFromXp, MODULES } from '../../shared/modules';
import { validateContent } from './challengeEngine';
import { announce, kickPlayer, onlineDetails, onlinePlayers, playerRenamed, resetAll, setModuleLock, setupGame } from './game';
import { raceInfo, startRace, stopRace } from './race';
import { state } from './state';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0'; // escuta em todas as interfaces: acessível na rede local
const ADMIN_SENHA = process.env.ADMIN_SENHA || 'professor123';
const CLIENT_DIST = path.resolve(__dirname, '../../client/dist');

const problems = validateContent();
if (problems.length) {
  console.warn('⚠️  Problemas no conteúdo dos desafios:\n - ' + problems.join('\n - '));
}

state.load();

const app = express();
app.use(express.json());

// ---------------------------------------------------------------- rotas públicas

app.get('/health', (_req, res) => {
  res.json({ ok: true, uptime: process.uptime(), players: onlinePlayers().length });
});

app.get('/modules', (_req, res) => {
  res.json(
    MODULES.map((m) => ({
      id: m.id,
      name: m.name,
      emoji: m.emoji,
      components: m.components,
      unlocked: state.isUnlocked(m.id),
    }))
  );
});

/** Tela de entrada: "Bem-vindo de volta!" quando o nome já tem progresso salvo neste servidor. */
app.get('/profile', (req, res) => {
  const name = String(req.query.name ?? '').slice(0, 32);
  const p = nameKey(name).length >= 2 ? state.findByName(name) : null;
  if (!p) {
    res.json({ found: false });
    return;
  }
  res.json({
    found: true,
    name: p.name,
    level: levelFromXp(p.xp),
    xp: p.xp,
    color: p.color,
    team: p.team,
    banned: Boolean(p.banned),
    online: onlinePlayers().some((o) => o.id === p.id),
  });
});

// ---------------------------------------------------------------- painel do professor

app.get('/admin', (_req, res) => {
  res.sendFile(path.resolve(__dirname, '../public/admin.html'));
});

/** autenticação simples por senha (cabeçalho x-admin-senha ou ?senha=) */
function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const senha = req.header('x-admin-senha') ?? (req.query.senha as string | undefined);
  if (senha !== ADMIN_SENHA) {
    res.status(401).json({ error: 'Senha inválida' });
    return;
  }
  next();
}

const admin = express.Router();
admin.use(requireAdmin);

admin.get('/check', (_req, res) => {
  res.json({ ok: true });
});

admin.post('/modules/:id/unlock', (req, res) => {
  const ok = setModuleLock(Number(req.params.id), true);
  res.status(ok ? 200 : 404).json({ ok, modules: state.modules });
});

admin.post('/modules/:id/lock', (req, res) => {
  const ok = setModuleLock(Number(req.params.id), false);
  res.status(ok ? 200 : 404).json({ ok, modules: state.modules });
});

admin.get('/players', (_req, res) => {
  res.json(onlinePlayers());
});

admin.get('/progress', (_req, res) => {
  res.json({
    modules: MODULES.map((m) => ({ ...m, unlocked: state.isUnlocked(m.id) })),
    players: Object.values(state.progress),
    online: onlinePlayers().map((p) => p.id),
    teamTotals: state.teamTotals(),
  });
});

// ---- alunos: renomear, bloquear, apagar
admin.post('/players/:id/rename', (req, res) => {
  const p = state.progress[req.params.id];
  const name = String(req.body?.name ?? '').replace(/\s+/g, ' ').trim().slice(0, 16);
  if (!p) return void res.status(404).json({ ok: false, error: 'Aluno não encontrado' });
  if (nameKey(name).length < 2) return void res.status(400).json({ ok: false, error: 'Nome muito curto' });
  const clash = state.findByName(name, p.id);
  if (clash) return void res.status(409).json({ ok: false, error: `Já existe um aluno chamado "${clash.name}"` });
  const old = p.name;
  p.name = name;
  state.log(`✏️ Professor renomeou "${old}" para "${name}"`);
  state.save();
  playerRenamed(p.id);
  res.json({ ok: true });
});

admin.post('/players/:id/ban', (req, res) => {
  const p = state.progress[req.params.id];
  if (!p) return void res.status(404).json({ ok: false, error: 'Aluno não encontrado' });
  p.banned = Boolean(req.body?.banned);
  state.log(`${p.banned ? '🚫 Professor bloqueou' : '✅ Professor desbloqueou'} ${p.name}`);
  state.save();
  if (p.banned) kickPlayer(p.id, '🚫 Você foi bloqueado(a) pelo professor.');
  res.json({ ok: true });
});

admin.delete('/players/:id', (req, res) => {
  const p = state.progress[req.params.id];
  if (!p) return void res.status(404).json({ ok: false, error: 'Aluno não encontrado' });
  kickPlayer(p.id, 'O professor apagou este perfil. Entre de novo para começar do zero.');
  delete state.progress[p.id];
  state.log(`🗑️ Professor apagou o perfil de ${p.name} (${p.xp} XP)`);
  state.save();
  res.json({ ok: true });
});

// ---- painel de dificuldades: o que a turma mais erra e quem precisa de ajuda
admin.get('/insights', (_req, res) => {
  const players = Object.values(state.progress);
  const stations = MODULES.flatMap((m) =>
    m.stations.map((st) => {
      const recs = players.map((p) => p.completed[st.id]).filter(Boolean);
      const s = state.stats[st.id] ?? { starts: 0, wrong: 0, guesses: 0, solved: 0, quits: 0 };
      const avg = (f: (r: (typeof recs)[number]) => number) => (recs.length ? recs.reduce((a, r) => a + f(r), 0) / recs.length : 0);
      return {
        id: st.id,
        title: st.title,
        emoji: st.emoji,
        module: m.id,
        moduleName: m.name,
        solvedBy: recs.length,
        avgAttempts: avg((r) => r.attempts),
        avgTimeMs: avg((r) => r.timeMs),
        helpedPct: recs.length ? recs.filter((r) => r.helped).length / recs.length : 0,
        guesses: s.guesses,
        wrong: s.wrong,
        starts: s.starts,
        quits: s.quits,
      };
    })
  );
  res.json({ stations, online: onlineDetails() });
});

// ---- corrida da turma
admin.get('/race', (_req, res) => {
  res.json(raceInfo());
});

admin.post('/race/start', (req, res) => {
  const mode = req.body?.mode === 'code' ? 'code' : 'blocks';
  const r = startRace(mode, req.body?.taskId ? String(req.body.taskId) : undefined);
  res.status(r.ok ? 200 : 409).json(r);
});

admin.post('/race/stop', (_req, res) => {
  stopRace(true);
  res.json({ ok: true });
});

admin.get('/logs', (_req, res) => {
  res.json(state.logs.slice(-150).reverse());
});

admin.post('/announce', (req, res) => {
  const text = String(req.body?.text ?? '').trim().slice(0, 200);
  if (text) announce(text);
  res.json({ ok: Boolean(text) });
});

admin.post('/reset', (_req, res) => {
  resetAll();
  res.json({ ok: true });
});

admin.get('/export.json', (_req, res) => {
  res.setHeader('Content-Disposition', 'attachment; filename="progresso.json"');
  res.json({ exportedAt: new Date().toISOString(), modules: state.modules, players: state.progress });
});

admin.get('/export.csv', (_req, res) => {
  const stations = MODULES.flatMap((m) => m.stations.map((s) => s.id));
  const header = ['nome', 'equipe', 'xp', 'moedas', 'cooperacao', 'tentativas', 'acertos', 'chutes', 'licoes', 'duelos_vencidos', 'duelos_perdidos', 'corridas_vencidas', 'bloqueado', 'modulos_concluidos', ...stations];
  const rows = Object.values(state.progress).map((p) => [
    p.name,
    p.team,
    p.xp,
    p.coins,
    p.coopPoints,
    p.totalAttempts,
    p.totalCorrect,
    p.totalGuesses ?? 0,
    (p.learned ?? []).length,
    p.duelsWon ?? 0,
    p.duelsLost ?? 0,
    p.racesWon ?? 0,
    p.banned ? 'sim' : '',
    p.modulesCompleted.join(' '),
    ...stations.map((s) => {
      const c = p.completed[s];
      return c ? `ok (${c.attempts}x${c.guesses ? `, ${c.guesses} chute(s)` : ''}${c.helped ? ', ajuda' : ''})` : '';
    }),
  ]);
  const csv = [header, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="progresso.csv"');
  res.send('﻿' + csv); // BOM para o Excel abrir acentos corretamente
});

app.use('/admin', admin);

// ---------------------------------------------------------------- jogo (front-end compilado)

if (fs.existsSync(CLIENT_DIST)) {
  app.use(express.static(CLIENT_DIST));
  app.get(/^(?!\/(socket\.io|admin)).*/, (_req, res) => res.sendFile(path.join(CLIENT_DIST, 'index.html')));
} else {
  app.get('/', (_req, res) => {
    res
      .type('html')
      .send(
        '<h2>React Native Quest</h2><p>O cliente ainda não foi compilado. Rode <code>npm run build</code> na raiz do projeto ' +
          '(ou use <code>npm run dev:client</code> e acesse a porta 5173).</p><p><a href="/admin">Painel do professor</a></p>'
      );
  });
}

// ---------------------------------------------------------------- start

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
setupGame(io);

function localIPs() {
  const ips: string[] = [];
  for (const list of Object.values(os.networkInterfaces())) {
    for (const net of list ?? []) {
      if (net.family === 'IPv4' && !net.internal) ips.push(net.address);
    }
  }
  return ips;
}

server.listen(PORT, HOST, () => {
  const ips = localIPs();
  const main = ips[0] ? `http://${ips[0]}:${PORT}` : `http://localhost:${PORT}`;
  console.log('\n🎮  React Native Quest: Component Guardians');
  console.log('──────────────────────────────────────────');
  console.log(`Professor (esta máquina): http://localhost:${PORT}`);
  for (const ip of ips) console.log(`Alunos (mesma rede):      http://${ip}:${PORT}`);
  console.log(`Painel do professor:      ${main}/admin   (senha: ${ADMIN_SENHA === 'professor123' ? 'professor123 — troque com ADMIN_SENHA' : 'definida em ADMIN_SENHA'})`);
  console.log('\nPeça aos alunos para abrir o endereço acima no navegador (Chrome/Firefox/Edge).');
  console.log('Se não abrir em outro computador, libere a porta no firewall (veja docs/REDE_LOCAL.md).\n');
  if (ips[0]) qrcode.generate(main, { small: true });
});

// salva o progresso ao encerrar com Ctrl+C
for (const sig of ['SIGINT', 'SIGTERM'] as const) {
  process.on(sig, () => {
    state.saveNow();
    console.log('\nProgresso salvo. Até a próxima aula!');
    process.exit(0);
  });
}
