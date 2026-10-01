# Adicionando conteúdo: desafios, módulos, demos e sons

Todo o conteúdo é **declarativo** (objetos TypeScript). Na maioria dos casos você só edita
dois arquivos:

| Arquivo | O que tem |
|---|---|
| `shared/modules.ts` | Módulos, estações (o que aparece no mapa), catálogo de componentes (cartas) |
| `server/src/content/challenges.ts` | Perguntas, respostas, dicas e explicações de cada estação |

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

**`build_ui`** — `build: BuildDef` (o aluno escolhe um componente para cada parte da tela)
```ts
build: {
  prompt: 'Monte um CARTÃO DE PERFIL...',
  blueprint: 'profile_card',            // molde da prévia em client/src/ui/blueprints.tsx
  slots: [
    { id: 'container', label: '📦 Caixa do cartão', accept: ['View'] },
    { id: 'photo',     label: '🖼️ Foto',            accept: ['Image'] },
    { id: 'name',      label: '🔤 Nome',            accept: ['Text'] },
    { id: 'style',     label: '🎨 Estilos',         accept: ['StyleSheet'] },
  ],
  palette: ['View', 'Text', 'Image', 'StyleSheet', 'SafeAreaView', 'Button'], // inclui distratores
  explanation: '...',
  hints: ['...'],
}
```
`accept` pode ter mais de um componente válido (ex.: `['Button', 'Pressable']`).

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
   Cada prédio comporta **4 estações + 1 chefe** (posições em `STATION_SLOTS` de `shared/map.ts`).
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

## 5. Criar um molde de montagem (build_ui)

Em `client/src/ui/blueprints.tsx` crie um componente que recebe `a` (as escolhas do aluno:
`{ slotId: 'NomeDoComponente' }`) e use o helper `<Live comp={a.slot} role="text|image|input|toggle|action" ... />`,
que já sabe desenhar cada componente certo ou "quebrado". Registre em `BLUEPRINTS`.

## 6. Regras e recompensas

- `shared/events.ts` → `RULES`: moedas iniciais, custo de dica, erros até ficar "travado", XP por nível…
- `server/src/game.ts` → `XP_BY_TYPE` e `completeStation()`: XP por tipo, desconto por erro/dica,
  bônus de cooperação.
- `server/src/state.ts` → `ACHIEVEMENTS`: conquistas.

## 7. Sons

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
| `click.wav` | clique em botões |

Para usar sons próprios, substitua o arquivo mantendo o nome (ou troque a extensão para
`.mp3` em `SOUND_FILES`) e rode `npm run build`. `npm run sounds` regera os sons 8-bit
originais. Os sons só tocam depois do primeiro clique do aluno (regra dos navegadores).
