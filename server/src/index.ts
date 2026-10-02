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
import { MODULES } from '../../shared/modules';
import { validateContent } from './challengeEngine';
import { announce, onlinePlayers, resetAll, setModuleLock, setupGame } from './game';
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
  const header = ['nome', 'equipe', 'xp', 'moedas', 'cooperacao', 'tentativas', 'acertos', 'licoes', 'duelos_vencidos', 'duelos_perdidos', 'modulos_concluidos', ...stations];
  const rows = Object.values(state.progress).map((p) => [
    p.name,
    p.team,
    p.xp,
    p.coins,
    p.coopPoints,
    p.totalAttempts,
    p.totalCorrect,
    (p.learned ?? []).length,
    p.duelsWon ?? 0,
    p.duelsLost ?? 0,
    p.modulesCompleted.join(' '),
    ...stations.map((s) => (p.completed[s] ? `ok (${p.completed[s].attempts}x${p.completed[s].helped ? ', ajuda' : ''})` : '')),
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
