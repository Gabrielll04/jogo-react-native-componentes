# Instalação e execução

## Pré-requisitos

- **Node.js 20 ou mais novo** (https://nodejs.org — baixe a versão LTS). Confira com `node -v`.
- Um navegador moderno (Chrome, Edge ou Firefox) em cada computador de aluno.
- Todos os computadores na **mesma rede** (Wi-Fi ou cabo) do computador do professor.

## Instalação (uma vez)

Na pasta do projeto:

```bash
npm install
```

Isso instala as dependências do servidor (`server/`) e do cliente (`client/`) de uma vez
(o projeto usa *npm workspaces*). Não é preciso acesso à internet depois disso.

## Rodar na aula

```bash
npm start
```

- Compila o jogo (`client/dist`) e inicia o servidor na porta **3000**, escutando em `0.0.0.0`.
- O terminal mostra o endereço para os alunos e um QR Code.
- Para parar: `Ctrl + C` (o progresso é salvo em `server/data/save.json`).

Se o cliente já estiver compilado e você só quer subir o servidor: `npm run serve`.

### Variáveis de ambiente

| Variável | Padrão | Uso |
|---|---|---|
| `PORT` | `3000` | Porta HTTP/Socket.io |
| `ADMIN_SENHA` | `professor123` | Senha do painel `/admin` |

Linux/macOS: `ADMIN_SENHA=segredo PORT=4000 npm start`
Windows (PowerShell): `$env:ADMIN_SENHA="segredo"; $env:PORT="4000"; npm start`
Windows (cmd): `set ADMIN_SENHA=segredo && npm start`

## Endereços úteis

| Endereço | O quê |
|---|---|
| `http://IP:3000/` | O jogo |
| `http://IP:3000/admin` | Painel do professor |
| `http://IP:3000/demos.html` | Galeria com todas as demos de componentes (para projetar) |
| `http://IP:3000/health` | Verificação rápida do servidor |
| `http://IP:3000/modules` | Lista de módulos e se estão liberados |

## Modo desenvolvimento (para quem vai mexer no código)

Dois terminais:

```bash
npm run dev:server   # servidor com recarga automática (porta 3000)
npm run dev:client   # Vite com hot reload (porta 5173)
```

Abra `http://localhost:5173`. O Vite repassa `/socket.io`, `/admin`, `/modules` e `/health`
para a porta 3000 (configurado em `client/vite.config.ts`).

Outros comandos:

```bash
npm run typecheck    # checagem de tipos TypeScript (servidor e cliente)
npm run build        # só compila o cliente
npm run sounds       # regera os efeitos sonoros em client/public/sounds
```

## Como o React Native roda no navegador?

`client/vite.config.ts` cria um alias:

```ts
resolve: {
  alias: { 'react-native': 'react-native-web' },
  extensions: ['.web.tsx', '.web.ts', '.web.js', '.tsx', '.ts', ...],
}
```

Assim o código escreve `import { View, Text, FlatList } from 'react-native'` exatamente como
num app de celular, e o Vite entrega a implementação web desses componentes. Toda a
interface do jogo (lobby, HUD, desafios) é feita com componentes React Native; só o mapa
2D usa Phaser.

Observações de compatibilidade no navegador:
- `Alert.alert` não existe no react-native-web; a demo usa o diálogo nativo do navegador (`window.confirm`) para mostrar a mesma ideia.
- `AsyncStorage` é simulado com `localStorage` (que é o que a biblioteca usa na web).
- Stack/BottomTabs/Drawer são simulados com `View`/`Pressable` (no app real viriam do React Navigation).
- `SafeAreaView` é mostrado numa moldura de celular com "notch".

## Estrutura de pastas

```
react-native-quest/
├── package.json              scripts e workspaces
├── shared/                   código usado pelo servidor e pelo cliente
│   ├── types.ts              tipos (jogador, desafio, resposta…)
│   ├── events.ts             nomes dos eventos Socket.io, equipes, regras (custos, XP)
│   ├── modules.ts            módulos, estações e catálogo de componentes
│   ├── map.ts                gerador do mapa (tiles, portas, Mestres, terminais, placas)
│   └── jsx.ts                árvore JSX do "Monte a tela": gera o código e compara com o objetivo
├── server/
│   ├── src/index.ts          Express, rotas, IP local + QR Code
│   ├── src/game.ts           eventos Socket.io e regras do jogo
│   ├── src/challengeEngine.ts
│   ├── src/content/challenges.ts   banco de desafios (gabaritos)
│   ├── src/state.ts          estado + persistência JSON + conquistas
│   ├── public/admin.html     painel do professor
│   └── data/                 save.json (criado automaticamente)
├── client/
│   ├── index.html / demos.html
│   ├── vite.config.ts
│   ├── public/sounds, public/img
│   └── src/
│       ├── main.tsx, App.tsx, gallery.tsx
│       ├── net/socket.ts     conexão e ações do jogador
│       ├── state/store.ts    estado global (useSyncExternalStore)
│       ├── audio/sound.ts    playSound(nome) com Howler
│       ├── game/             Phaser: WorldScene, sprites (pixel art), quest (missões), bridge
│       ├── lessons/          lições dos Mestres (21 componentes)
│       ├── screens/          ConnectScreen, LobbyScreen, WorldScreen (HUD, tutorial)
│       └── ui/               lição, desafios, editor de código, demos, cartas, painéis
├── scripts/generate-sounds.mjs
└── docs/
```
