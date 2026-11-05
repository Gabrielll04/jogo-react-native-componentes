# Adicionando conteúdo: desafios, módulos, demos e sons

Todo o conteúdo é **declarativo** (objetos TypeScript). Na maioria dos casos você só edita
dois arquivos:

| Arquivo | O que tem |
|---|---|
| `shared/modules.ts` | Módulos, estações (o que aparece no mapa), catálogo de componentes (cartas) |
| `client/src/lessons/*.tsx` | **Lições dos Mestres**: explicação, código editável, prévia, missões e teste |
| `server/src/content/challenges.ts` | Perguntas, respostas, dicas e explicações dos terminais e chefes |

O gabarito fica **só no servidor**: o navegador recebe as perguntas sem a resposta e com as
alternativas embaralhadas, e é o servidor que corrige. Depois de editar, reinicie o servidor
(`Ctrl+C` e `npm start`). Ao iniciar, o servidor avisa se alguma estação está sem conteúdo.

---

## 1. Adicionar uma pergunta a uma estação existente (o mais comum)

Em `server/src/content/challenges.ts`, ache a lista do módulo (ex.: `m1Quiz`) e acrescente:

```ts
{
  prompt: 'Qual componente você usaria para mostrar o logo da escola?',
  demo: 'image_photo',          // opcional: demonstração viva (ver seção 4)
  answer: 'Image',
  distractors: ['Text', 'View', 'StyleSheet'],
  explanation: 'Image mostra imagens locais (require) ou da internet ({ uri }).',
  hints: ['Esse componente tem a prop "source".'],
},
```

- A cada tentativa nova o servidor **sorteia** uma das perguntas da estação e **embaralha**
  as alternativas. Quanto mais variantes, menos "decoreba".
- `hints`: dicas pré-escritas usadas tanto na compra de dica quanto quando um colega envia
  ajuda. **Escreva dicas que guiam sem entregar a resposta.**
- O chefe do módulo usa automaticamente todas as perguntas de `quiz_component` e `fix_bug` do
  módulo, então novas perguntas também deixam o chefe mais variado.

### Os 5 tipos

**`quiz_component`** — `variants: QuizDef[]` (exemplo acima). Também aceita `code: '...'`
para mostrar um trecho de código na pergunta.

**`fix_bug`** — `variants: BugDef[]`
```ts
{
  prompt: 'O botão não mostra nada escrito. Qual a correção?',
  code: '<Button onPress={abrir}>Abrir</Button>',
  fix: '<Button title="Abrir" onPress={abrir} />',
  wrong: ['<Button text="Abrir" />', '<Button onClick={abrir}>Abrir</Button>'],
  explanation: 'Button usa a prop title e não aceita filhos.',
  hints: ['O texto vai em uma prop.'],
}
```

**`match_use`** — `match: MatchDef`
```ts
match: {
  prompt: 'Ligue cada componente ao seu uso.',
  pairs: [['View', 'Criar containers'], ['Text', 'Mostrar textos'], ['Image', 'Mostrar imagens']],
  pick: 3,                 // quantos pares sortear por rodada
  explanation: '...',
  hints: ['...'],
}
```

**`build_ui`** — `build: BuildDef` ("Monte a tela": o aluno escreve o JSX com blocos)
```ts
build: {
  prompt: 'Monte o CARTÃO DE PERFIL igual à tela-objetivo…',
  // a tela-objetivo: o aluno vê o RESULTADO renderizado e precisa montar a mesma árvore
  target: {
    type: 'SafeAreaView', style: 'tela',
    children: [
      { type: 'View', style: 'cartao', children: [
        { type: 'Image', style: 'foto' },
        { type: 'Text', text: 'Ana Souza', style: 'nome' },
      ] },
    ],
  },
  // blocos da paleta (inclua distratores!)
  blocks: [
    { id: 'safe', type: 'SafeAreaView' }, { id: 'view', type: 'View' }, { id: 'img', type: 'Image' },
    { id: 'nome', type: 'Text', text: 'Ana Souza' }, { id: 'btn', type: 'Button', text: 'Seguir' },
  ],
  // o StyleSheet.create do desafio (o aluno escolhe styles.X para cada componente)
  styles: { tela: { flex: 1, padding: 16 }, cartao: { … }, foto: { width: 96, height: 96 }, nome: { fontSize: 20 } },
  explanation: '...',
  hints: ['...'],
}
```
Componentes que aceitam filhos: `View`, `SafeAreaView`, `ScrollView`, `Pressable`; folhas:
`Text`, `Image`, `Button`, `TextInput`, `Switch` (renderizados em `client/src/ui/uiTree.tsx`).
A correção (`shared/jsx.ts → compareTree`) confere tipo, texto, estilo e ordem, e devolve
uma pista sobre o **primeiro** ponto diferente. O JSX completo é mostrado ao acertar.

**`boss_challenge`** — `{ type: 'boss_challenge', bossName: 'Guardião', rounds: 4, hearts: 3 }`.
Rodadas sorteadas das perguntas do módulo. Errar custa um coração e troca a pergunta.
Sem dicas (desafio individual). Só libera depois das outras estações do módulo. Vencer dá
as cartas de `components` do módulo.

---

## 2. Adicionar uma estação nova num módulo

1. Em `shared/modules.ts`, acrescente no `stations` do módulo:
   ```ts
   { id: 'm3_build', title: 'Montador de Inventário', type: 'build_ui', emoji: '🛠️' },
   ```
   Cada prédio comporta **4 terminais + 1 chefe** (posições em `STATION_XS`/`BOSS_SLOT` de
   `shared/map.ts`) e até **5 Mestres** (um por componente de `components`).
2. Em `server/src/content/challenges.ts`, adicione em `STATION_CONTENT` a chave `m3_build`
   com o conteúdo do tipo correspondente.

## 3. Adicionar um módulo novo

1. `shared/modules.ts`:
   - registre os componentes novos em `COMPONENTS` (viram cartas);
   - adicione um objeto em `MODULES` (id, nome, emoji, cor, `components`, `requires`, `sign`, `stations`).
2. `server/src/content/challenges.ts`: conteúdo de cada estação.
3. Mapa: `shared/map.ts` desenha 6 prédios (2 fileiras de 3). Para um 7º módulo, aumente
   `MAP_W`/`MAP_H` e ajuste o cálculo de posição (`bx`, `by`) no `buildWorld()` — por
   exemplo, uma terceira fileira de prédios abaixo.

### Pré-requisitos
`requires: [1, 2]` faz a porta do módulo só abrir para quem já venceu os chefes dos módulos
1 e 2 (além do professor ter liberado). Por padrão todos estão `[]`: o professor controla
tudo pelo painel.

### Qual módulo começa liberado
Em `server/src/state.ts`: `modules = MODULES.map((m) => ({ id: m.id, unlocked: m.id === 1 }))`.

## 4. Criar uma demonstração viva

Em `client/src/ui/demos.tsx`, crie um componente usando componentes reais do React Native e
registre em `DEMOS`:

```tsx
function MeuDemo() {
  const [n, setN] = useState(0);
  return (
    <PhoneFrame>
      <Screen>
        <Button title={`Cliques: ${n}`} onPress={() => setN(n + 1)} />
      </Screen>
    </PhoneFrame>
  );
}

export const DEMOS = { ..., meu_demo: MeuDemo };
```

Use a chave no campo `demo` de uma pergunta. Dica: não escreva o nome do componente dentro
da demo, para não entregar a resposta. Para a galeria `/demos.html`, associe a chave ao
componente em `DEMO_COMPONENT` (`client/src/gallery.tsx`).

## 5. Criar ou editar uma lição de Mestre

As lições ficam em `client/src/lessons/` (`m1.tsx`, `m2.tsx`, `m3to6.tsx`). Cada componente de
um módulo **precisa** de uma lição (o Mestre aparece no mapa automaticamente). Formato:

```tsx
{
  component: 'Text',
  tagline: 'Todo texto da tela mora aqui',
  intro: <>Para mostrar texto você precisa do <C>{'<Text>'}</C>…</>,   // fala do Mestre
  when: 'Títulos, parágrafos, rótulos…',
  // {{chave}} vira um valor CLICÁVEL dentro do código
  code: `<Text style={{ fontSize: {{fontSize}}, color: {{color}} }}>\n  Olá!\n</Text>`,
  controls: [
    { key: 'fontSize', options: [14, 20, 32] },
    { key: 'color', options: ['#222222', '#e53935'] },
  ],
  // prévia com componentes reais; s = valores atuais, set = alterar estado (ex.: contar toques)
  Preview: ({ s }) => <Pad><Text style={{ fontSize: s.fontSize, color: s.color }}>Olá!</Text></Pad>,
  tasks: [{ text: 'Aumente a fonte para 32', done: (s) => s.fontSize === 32 }],
  quiz: { question: '…', options: ['…'], answer: '…', why: '…' },
}
```

Para projetar uma lição na aula: `http://IP:3000/demos.html?licao=Text`.

### Código revelado nos quizzes
Depois do acerto o aluno vê "🔍 Por trás da tela". Para quizzes com `demo`, o código vem de
`DEMO_CODE` em `server/src/content/challenges.ts` (ou do campo `reveal` da pergunta); no
`fix_bug` é a própria correção; no `build_ui` é o JSX gerado da tela-objetivo.

## 6. Tarefas de duelo ⚔️

Na maioria das partidas a tarefa é **gerada** (`shared/taskgen.ts`): tema (login, compras, perfil,
clima…), componentes, textos e estrutura são sorteados, em 3 níveis de exigência (1: um componente;
2: uma caixa com 2–3 componentes; 3: caixas dentro de caixas e, no código, estilo e/ou `export default`).
O id da tarefa (`g-code-2-123456`) é a semente: cliente e servidor geram a mesma tarefa.
Temas e textos ficam em `THEMES`. Em ~20% das partidas sai uma das tarefas escritas à mão abaixo
(`DUEL_TASKS` em `shared/duels.ts`).

**Blocos** — uma tela-objetivo SEM estilos (só estrutura) e os blocos disponíveis:
```ts
{
  id: 'b_ola', mode: 'blocks', title: 'Olá, mundo!',
  prompt: 'Recrie a tela: uma caixa com um texto dentro.',
  target: { type: 'View', children: [{ type: 'Text', text: 'Olá, mundo!' }] },
  blocks: [B('v', 'View'), B('t', 'Text', 'Olá, mundo!'), B('t2', 'Text', 'Tchau!')],
}
```

**Código** — código inicial, checklist e uma solução (mostrada no fim):
```ts
{
  id: 'c_hello', mode: 'code', title: 'Hello World',
  prompt: 'Complete o componente App para escrever Hello World na tela.',
  starter: "import { Text } from 'react-native';\n\nexport default function App() {\n  return (\n    \n  );\n}",
  checks: [
    declaresApp,                                              // "Criar um componente chamado App"
    has('Usar um <Text>', (n) => n.type === 'Text'),          // procura na árvore JSX
    has('O texto é "Hello World"', (n) => n.type === 'Text' && norm(n.text) === 'hello world'),
  ],
  solution: "import { Text } from 'react-native';\n\nexport default function App() {\n  return <Text>Hello World</Text>;\n}",
}
```
O código do aluno é lido por um parser JavaScript/JSX de verdade (`analyzeCode` em `shared/codecheck.ts`,
com acorn + acorn-jsx). Só conta como resolvido se o código for válido para o React Native:
sem erro de sintaxe, componentes importados de `'react-native'`, todo texto dentro de `<Text>`,
`<Button>` com `title`, tags com o nome certo (maiúsculas contam), variáveis declaradas…
Os `checks` recebem essa análise (`a.tree`, `a.app.declared`, `a.app.exported`, `a.imports`).
O mesmo validador é usado no laboratório e na prévia do celular.

Aposta, tempos e XP: constantes no topo de `shared/duels.ts` (`DUEL_STAKE`, `DUEL_INVITE_MS`…).

## 7. Regras e recompensas

- `shared/events.ts` → `RULES`: moedas iniciais, custo de dica, erros até ficar "travado", XP por nível,
  e as regras contra o chute (`GUESS_FAST_MS`, `GUESS_PENALTY_MS`, `WRONG_COOLDOWN_MS`…)
- `server/src/game.ts` → `XP_BY_TYPE` e `completeStation()`: XP por tipo, desconto por erro/dica,
  bônus de cooperação.
- `server/src/state.ts` → `ACHIEVEMENTS`: conquistas.

## 8. Loja de cosméticos 🛍️

Itens em `shared/cosmetics.ts` (`COSMETICS`). Cada item tem `kind` (`hat`, `trail`, `tag`, `title`),
`value` (emoji do chapéu/rastro, cor da plaquinha ou texto do título), `price` e, se quiser, `requires`
(`{ achievement }`, `{ modules }` ou `{ level }` + `label`). O servidor confere tudo em `server/src/shop.ts`.
Prefira emojis antigos (Windows 10 não mostra os mais novos).

## 9. Laboratório livre 🧪

`client/src/ui/LabOverlay.tsx`: modelos (`TEMPLATES`), botões de inserir (`SNIPPETS`) e ideias (`IDEAS`).
O código é lido por `shared/lab.ts` (JSX + `style={{...}}` + `StyleSheet.create`). Componentes desenhados:
`client/src/ui/uiTree.tsx`.

## 10. Corrida da turma 🏁

Usa as mesmas tarefas dos duelos (`DUEL_TASKS` em `shared/duels.ts`). Prêmios e duração no topo de
`server/src/race.ts`.

## 11. Sons

`client/src/audio/sound.ts` tem a função central `playSound(nome)`. Os arquivos ficam em
`client/public/sounds/`:

| Nome | Quando toca |
|---|---|
| `connect.wav` | conexão estabelecida |
| `lobby.wav` | entrada no lobby |
| `correct.wav` / `wrong.wav` | acerto / erro |
| `hint.wav` | dica enviada/recebida |
| `door.wav` | módulo liberado (porta abrindo) |
| `boss.wav` | chefe derrotado |
| `module.wav` | módulo concluído |
| `achievement.wav` | conquista |
| `duel.wav` | convite de duelo e início do duelo |
| `click.wav` | clique em botões |

Para usar sons próprios, substitua o arquivo mantendo o nome (ou troque a extensão para
`.mp3` em `SOUND_FILES`) e rode `npm run build`. `npm run sounds` regera os sons 8-bit
originais. Os sons só tocam depois do primeiro clique do aluno (regra dos navegadores).
