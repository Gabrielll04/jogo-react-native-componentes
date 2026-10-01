# ⚛️ React Native Quest: Component Guardians

Jogo educacional **multiplayer local**, 2D visto de cima, para ensinar componentes do
React Native. Roda **no navegador do computador** — o professor inicia o servidor e os
alunos abrem `http://IP_DO_PROFESSOR:3000`. Não precisa de celular nem do Expo Go.

Os desafios mostram **componentes reais do React Native funcionando** (via
`react-native-web`): uma FlatList com 1000 itens, um Modal que abre de verdade, um
TextInput em que se digita, a "tela vermelha" de erro quando se coloca texto fora de
`<Text>`…

## Recursos

- 🏰 Lobby com jogadores conectados, equipes, placar e emotes
- 🗺️ Mundo 2D (Phaser 3) com 6 prédios-módulo, portas, placas explicativas e estações de desafio
- 🎮 Movimento com **WASD/setas**, câmera que segue o jogador, outros alunos aparecem em tempo real
- 🔒 Portas abrem/fecham na hora quando o professor libera/tranca módulos no painel
- 🧩 5 tipos de desafio: `quiz_component`, `match_use`, `build_ui`, `fix_bug`, `boss_challenge`
- ⚔️ Chefe por módulo (individual, sem dicas, com corações) — vencer dá **cartas** dos componentes
- 🤝 Cooperação: colega travado aparece com ❓; quem já concluiu pode enviar uma dica (custa moedas, nunca entrega a resposta); se ele acertar, ambos ganham pontos
- ⭐ XP, níveis, moedas, conquistas, insígnias e inventário de cartas
- 🔊 Efeitos sonoros (Howler.js) após interação do usuário
- 👩‍🏫 Painel do professor em `/admin`: liberar módulos, ver progresso/quem completou cada desafio, logs, anúncios, exportar JSON/CSV, resetar
- 🖼️ Galeria de componentes em `/demos.html` para projetar durante a aula

## Início rápido

Pré-requisito: **Node.js 20+** na máquina do professor.

```bash
npm install          # instala servidor e cliente (npm workspaces)
npm start            # compila o cliente e inicia o servidor na porta 3000
```

O terminal mostra os endereços e um QR Code:

```
Professor (esta máquina): http://localhost:3000
Alunos (mesma rede):      http://192.168.0.10:3000
Painel do professor:      http://192.168.0.10:3000/admin   (senha: professor123)
```

Troque a senha: `ADMIN_SENHA=minhaSenha npm start` (no Windows PowerShell:
`$env:ADMIN_SENHA="minhaSenha"; npm start`).

## Documentação

| Documento | Conteúdo |
|---|---|
| [docs/INSTALACAO.md](docs/INSTALACAO.md) | Instalação, comandos, modo desenvolvimento, estrutura de pastas |
| [docs/REDE_LOCAL.md](docs/REDE_LOCAL.md) | Descobrir IP, firewall, conectar alunos, (opcional) ngrok/Cloudflare Tunnel |
| [docs/TESTE_MULTIPLAYER.md](docs/TESTE_MULTIPLAYER.md) | Roteiro para testar com dois navegadores antes da aula |
| [docs/CONTEUDO.md](docs/CONTEUDO.md) | Como adicionar desafios, módulos, demos e sons |
| [docs/ARQUITETURA.md](docs/ARQUITETURA.md) | Visão geral técnica, eventos Socket.io, endpoints REST |

## Estrutura

```
├── server/            Node + Express + Socket.io (fonte da verdade do jogo)
│   ├── src/index.ts           rotas REST, painel, IP/QR, serve o cliente compilado
│   ├── src/game.ts            multiplayer: lobby, movimento, desafios, dicas, recompensas
│   ├── src/challengeEngine.ts transforma conteúdo em rodadas (sorteio, embaralhamento, correção)
│   ├── src/content/challenges.ts  ← BANCO DE DESAFIOS (com gabarito, só no servidor)
│   ├── src/state.ts           estado em memória + save em server/data/save.json
│   └── public/admin.html      painel do professor
├── client/            Vite + React + TypeScript + react-native-web + Phaser 3 + Howler
│   ├── vite.config.ts         alias react-native → react-native-web
│   ├── src/game/              cena Phaser (mapa, colisão, portas, jogadores)
│   ├── src/screens/           Conexão, Lobby, Mundo (UI feita com componentes RN)
│   ├── src/ui/demos.tsx       demonstrações vivas dos componentes
│   ├── src/ui/blueprints.tsx  prévias dos desafios "monte a tela"
│   └── public/sounds/         efeitos sonoros (.wav)
├── shared/            tipos, eventos, módulos e mapa usados pelos dois lados
├── scripts/generate-sounds.mjs  gera os sons 8-bit
└── docs/
```
