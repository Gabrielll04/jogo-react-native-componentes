/**
 * DUELOS ⚔️ — dois alunos recebem a MESMA tarefa; ganha quem acertar primeiro.
 * O vencedor leva até DUEL_STAKE moedas do perdedor (quem tem 0 continua com 0).
 *
 * Dois modos:
 *  - 'blocks': recriar uma tela simples com os blocos (como o "Monte a tela", sem estilos)
 *  - 'code'  : escrever um componente bem simples (ex.: "Crie um componente chamado App")
 *
 * As tarefas ficam aqui (compartilhadas) porque a tela-objetivo e o checklist são
 * mostrados ao aluno de qualquer forma; quem confere a resposta é o servidor.
 * Para criar tarefas novas basta acrescentar itens em DUEL_TASKS.
 */
import { findNode, parseJsx, type ParsedNode } from './jsx';
import type { UIBlock, UINode } from './types';

export type DuelMode = 'blocks' | 'code';

export const DUEL_STAKE = 10; // moedas em jogo
export const DUEL_INVITE_MS = 30_000; // tempo para aceitar o convite
export const DUEL_COUNTDOWN_MS = 3_500; // 3, 2, 1, já!
export const DUEL_MAX_MS = 4 * 60_000; // depois disso: empate
export const DUEL_WIN_XP = 20;
export const DUEL_PLAY_XP = 5;

export interface BlocksTask {
  id: string;
  mode: 'blocks';
  title: string;
  prompt: string;
  target: UINode;
  blocks: UIBlock[];
}

export interface CodeCheck {
  label: string;
  test: (code: string, tree: ParsedNode | null) => boolean;
}

export interface CodeTask {
  id: string;
  mode: 'code';
  title: string;
  prompt: string;
  starter: string;
  checks: CodeCheck[];
  solution: string;
}

export type DuelTask = BlocksTask | CodeTask;

// ---------------------------------------------------------------- blocos

const B = (id: string, type: string, text?: string): UIBlock => ({ id, type, text });

const BLOCKS: BlocksTask[] = [
  {
    id: 'b_ola',
    mode: 'blocks',
    title: 'Olá, mundo!',
    prompt: 'Recrie a tela: uma caixa com um texto dentro.',
    target: { type: 'View', children: [{ type: 'Text', text: 'Olá, mundo!' }] },
    blocks: [B('v', 'View'), B('t', 'Text', 'Olá, mundo!'), B('t2', 'Text', 'Tchau!'), B('i', 'Image')],
  },
  {
    id: 'b_perfil',
    mode: 'blocks',
    title: 'Perfil simples',
    prompt: 'Recrie a tela: foto e nome dentro de uma caixa.',
    target: { type: 'View', children: [{ type: 'Image' }, { type: 'Text', text: 'Bia' }] },
    blocks: [B('v', 'View'), B('i', 'Image'), B('t', 'Text', 'Bia'), B('b', 'Button', 'Bia')],
  },
  {
    id: 'b_entrar',
    mode: 'blocks',
    title: 'Boas-vindas',
    prompt: 'Recrie a tela: um texto de boas-vindas e um botão.',
    target: { type: 'View', children: [{ type: 'Text', text: 'Bem-vindo!' }, { type: 'Button', text: 'Entrar' }] },
    blocks: [B('v', 'View'), B('t', 'Text', 'Bem-vindo!'), B('b', 'Button', 'Entrar'), B('t2', 'Text', 'Entrar'), B('s', 'Switch')],
  },
  {
    id: 'b_login',
    mode: 'blocks',
    title: 'Login',
    prompt: 'Recrie a tela de login: dois campos e um botão.',
    target: {
      type: 'View',
      children: [{ type: 'TextInput', text: 'E-mail' }, { type: 'TextInput', text: 'Senha' }, { type: 'Button', text: 'Entrar' }],
    },
    blocks: [B('v', 'View'), B('e', 'TextInput', 'E-mail'), B('s', 'TextInput', 'Senha'), B('b', 'Button', 'Entrar'), B('t', 'Text', 'Senha')],
  },
  {
    id: 'b_config',
    mode: 'blocks',
    title: 'Configuração',
    prompt: 'Recrie a tela: um texto e um interruptor.',
    target: { type: 'View', children: [{ type: 'Text', text: 'Modo escuro' }, { type: 'Switch' }] },
    blocks: [B('v', 'View'), B('t', 'Text', 'Modo escuro'), B('s', 'Switch'), B('b', 'Button', 'Modo escuro')],
  },
  {
    id: 'b_seguro',
    mode: 'blocks',
    title: 'Fuja do notch',
    prompt: 'Recrie a tela: área segura com um título e uma imagem.',
    target: { type: 'SafeAreaView', children: [{ type: 'Text', text: 'Meu app' }, { type: 'Image' }] },
    blocks: [B('sa', 'SafeAreaView'), B('v', 'View'), B('t', 'Text', 'Meu app'), B('i', 'Image')],
  },
  {
    id: 'b_lista',
    mode: 'blocks',
    title: 'Listinha',
    prompt: 'Recrie a tela: três textos dentro de uma área que rola.',
    target: {
      type: 'ScrollView',
      children: [{ type: 'Text', text: 'Item 1' }, { type: 'Text', text: 'Item 2' }, { type: 'Text', text: 'Item 3' }],
    },
    blocks: [B('sc', 'ScrollView'), B('v', 'View'), B('t1', 'Text', 'Item 1'), B('t2', 'Text', 'Item 2'), B('t3', 'Text', 'Item 3')],
  },
  {
    id: 'b_card',
    mode: 'blocks',
    title: 'Cartão clicável',
    prompt: 'Recrie a tela: um cartão clicável com foto e texto.',
    target: { type: 'Pressable', children: [{ type: 'Image' }, { type: 'Text', text: 'Ver perfil' }] },
    blocks: [B('p', 'Pressable'), B('v', 'View'), B('i', 'Image'), B('t', 'Text', 'Ver perfil'), B('b', 'Button', 'Ver perfil')],
  },
];

// ---------------------------------------------------------------- código

const declaresApp: CodeCheck = {
  label: 'Criar um componente chamado App',
  test: (code) => /\bfunction\s+App\s*\(/.test(code) || /\b(const|let|var)\s+App\s*=/.test(code),
};
const has = (label: string, pred: (n: ParsedNode) => boolean): CodeCheck => ({ label, test: (_c, tree) => Boolean(findNode(tree, pred)) });
const norm = (s?: string) => (s ?? '').trim().toLowerCase().replace(/[!.]/g, '');

const CODE: CodeTask[] = [
  {
    id: 'c_app',
    mode: 'code',
    title: 'Componente App',
    prompt: 'Crie um componente chamado App que retorna uma <View />.',
    starter: "import { View } from 'react-native';\n\n",
    checks: [declaresApp, { label: 'Retornar uma <View>', test: (_c, t) => t?.type === 'View' }],
    solution: "export default function App() {\n  return <View />;\n}",
  },
  {
    id: 'c_hello',
    mode: 'code',
    title: 'Hello World',
    prompt: 'Complete o componente App para escrever Hello World na tela.',
    starter: "import { Text } from 'react-native';\n\nexport default function App() {\n  return (\n    \n  );\n}",
    checks: [declaresApp, has('Usar um <Text>', (n) => n.type === 'Text'), has('O texto é "Hello World"', (n) => n.type === 'Text' && norm(n.text).replace(',', '') === 'hello world')],
    solution: "export default function App() {\n  return <Text>Hello World</Text>;\n}",
  },
  {
    id: 'c_button',
    mode: 'code',
    title: 'Botão',
    prompt: 'Crie um App que mostra um <Button> com o título Clique aqui.',
    starter: "import { Button } from 'react-native';\n\n",
    checks: [declaresApp, has('Usar um <Button>', (n) => n.type === 'Button'), has('title="Clique aqui"', (n) => n.type === 'Button' && norm(n.text) === 'clique aqui')],
    solution: 'export default function App() {\n  return <Button title="Clique aqui" />;\n}',
  },
  {
    id: 'c_nome',
    mode: 'code',
    title: 'Nome na caixa',
    prompt: 'Dentro de uma <View>, mostre um <Text> com o seu nome.',
    starter: "import { View, Text } from 'react-native';\n\nexport default function App() {\n  return (\n\n  );\n}",
    checks: [
      declaresApp,
      { label: 'Retornar uma <View>', test: (_c, t) => t?.type === 'View' },
      { label: 'Um <Text> com texto dentro da View', test: (_c, t) => Boolean(t?.type === 'View' && findNode(t, (n) => n.type === 'Text' && Boolean(n.text))) },
    ],
    solution: 'export default function App() {\n  return (\n    <View>\n      <Text>Bia</Text>\n    </View>\n  );\n}',
  },
  {
    id: 'c_export',
    mode: 'code',
    title: 'Exporte o App',
    prompt: 'Crie e EXPORTE (export default) um componente App que retorna <Text>Oi</Text>.',
    starter: "import { Text } from 'react-native';\n\n",
    checks: [
      declaresApp,
      { label: 'Usar export default', test: (code) => /export\s+default\s+(function\s+)?App\b/.test(code) },
      has('Mostrar <Text>Oi</Text>', (n) => n.type === 'Text' && norm(n.text) === 'oi'),
    ],
    solution: 'export default function App() {\n  return <Text>Oi</Text>;\n}',
  },
  {
    id: 'c_input',
    mode: 'code',
    title: 'Campo de nome',
    prompt: 'Crie um App com um <TextInput> cujo placeholder seja Seu nome.',
    starter: "import { TextInput } from 'react-native';\n\n",
    checks: [declaresApp, has('Usar um <TextInput>', (n) => n.type === 'TextInput'), has('placeholder="Seu nome"', (n) => n.type === 'TextInput' && norm(n.text) === 'seu nome')],
    solution: 'export default function App() {\n  return <TextInput placeholder="Seu nome" />;\n}',
  },
  {
    id: 'c_dois',
    mode: 'code',
    title: 'Dois textos',
    prompt: 'Crie um App que retorna uma <View> com DOIS <Text> dentro.',
    starter: "import { View, Text } from 'react-native';\n\n",
    checks: [
      declaresApp,
      { label: 'Retornar uma <View>', test: (_c, t) => t?.type === 'View' },
      { label: 'Dois <Text> dentro da View', test: (_c, t) => (t?.children ?? []).filter((n) => n.type === 'Text').length >= 2 },
    ],
    solution: 'export default function App() {\n  return (\n    <View>\n      <Text>Primeiro</Text>\n      <Text>Segundo</Text>\n    </View>\n  );\n}',
  },
  {
    id: 'c_img',
    mode: 'code',
    title: 'Mostre a imagem',
    prompt: "Crie um App que mostra uma <Image> com source={require('./avatar.png')}.",
    starter: "import { Image } from 'react-native';\n\n",
    checks: [declaresApp, has('Usar uma <Image>', (n) => n.type === 'Image'), has('Com a prop source', (n) => n.type === 'Image' && Boolean(n.props.source))],
    solution: "export default function App() {\n  return <Image source={require('./avatar.png')} />;\n}",
  },
];

export const DUEL_TASKS: DuelTask[] = [...BLOCKS, ...CODE];

export const duelTask = (id: string) => DUEL_TASKS.find((t) => t.id === id);

export function randomDuelTask(mode: DuelMode, avoid?: string) {
  const pool = DUEL_TASKS.filter((t) => t.mode === mode && t.id !== avoid);
  return pool[Math.floor(Math.random() * pool.length)];
}

/** Confere o código: resultado de cada item do checklist + a árvore para a prévia. */
export function checkCode(task: CodeTask, code: string) {
  const parsed = parseJsx(code);
  const passed = task.checks.map((c) => {
    try {
      return c.test(code, parsed.tree);
    } catch {
      return false;
    }
  });
  return { passed, ok: passed.every(Boolean), tree: parsed.tree, error: parsed.error };
}

export const MODE_LABEL: Record<DuelMode, string> = { blocks: '🧱 Blocos', code: '⌨️ Código' };
