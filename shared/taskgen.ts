/**
 * GERADOR DE TAREFAS para duelos e corridas.
 *
 * Em vez de uma lista fixa (que os alunos acabam decorando), cada partida sorteia uma tela:
 * tema (login, compras, perfil…), componentes, textos e estrutura. A tarefa é reconstruída a
 * partir do id ("g-code-2-12345") com um gerador pseudoaleatório com semente, então cliente e
 * servidor chegam exatamente na mesma tarefa sem precisar trafegar nada além do id.
 *
 * Níveis de exigência:
 *  1 — um componente (ou uma caixa com um componente)
 *  2 — uma caixa com 2 ou 3 componentes de tipos diferentes
 *  3 — caixas dentro de caixas; no código, também estilo e/ou export default
 */
import type { CodeAnalysis, CodeNode } from './codecheck';
import type { BlocksTask, CodeCheck, CodeTask, DuelMode } from './duels';
import type { UIBlock, UINode } from './types';

export type Level = 1 | 2 | 3;

// ---------------------------------------------------------------- aleatório com semente

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
type R = () => number;
const pick = <T>(r: R, arr: readonly T[]) => arr[Math.floor(r() * arr.length)];
const int = (r: R, min: number, max: number) => min + Math.floor(r() * (max - min + 1));
function shuffle<T>(r: R, arr: T[]) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---------------------------------------------------------------- conteúdo

interface Theme {
  title: string[];
  items: string[];
  inputs: string[];
  buttons: string[];
}

const NAMES = ['Bia', 'Leo', 'Caio', 'Duda', 'Rafa', 'Nina', 'Theo', 'Malu', 'Enzo', 'Lara'];

const THEMES: Record<string, Theme> = {
  login: { title: ['Entrar', 'Login', 'Bem-vindo de volta'], items: ['Lembrar de mim', 'Primeiro acesso?'], inputs: ['E-mail', 'Senha', 'Usuário'], buttons: ['Entrar', 'Criar conta', 'Esqueci a senha'] },
  compras: { title: ['Lista de compras', 'Mercado'], items: ['Arroz', 'Feijão', 'Leite', 'Pão', 'Ovos', 'Café'], inputs: ['Novo item', 'Quantidade'], buttons: ['Adicionar', 'Limpar lista'] },
  perfil: { title: NAMES, items: ['12 posts', '340 seguidores', 'Dev React Native', 'São Paulo'], inputs: ['Bio', 'Cidade'], buttons: ['Seguir', 'Mensagem', 'Editar perfil'] },
  config: { title: ['Configurações', 'Preferências'], items: ['Modo escuro', 'Notificações', 'Som', 'Vibração'], inputs: ['Apelido'], buttons: ['Salvar', 'Sair'] },
  musica: { title: ['Tocando agora', 'Minhas músicas'], items: ['Faixa 1', 'Faixa 2', 'Faixa 3', '3:45'], inputs: ['Buscar música'], buttons: ['Play', 'Próxima', 'Curtir'] },
  clima: { title: ['Clima', 'Previsão do tempo'], items: ['Hoje: 25°', 'Amanhã: 22°', 'Chuva: 30%', 'Vento: 12 km/h'], inputs: ['Cidade'], buttons: ['Atualizar'] },
  pet: { title: ['Meu pet', 'Adote um amigo'], items: ['Rex', 'Mia', 'Thor', 'Luna', '2 anos'], inputs: ['Nome do pet'], buttons: ['Adotar', 'Ver fotos'] },
  escola: { title: ['Minhas notas', 'Agenda'], items: ['Matemática: 9', 'Física: 8', 'Prova na sexta', 'Trabalho de artes'], inputs: ['Matéria'], buttons: ['Ver mais', 'Enviar'] },
};
const THEME_NAMES = Object.keys(THEMES);

const LEAF_TYPES = ['Text', 'Text', 'Button', 'TextInput', 'Image', 'Switch'] as const;
const CONTAINERS = ['View', 'View', 'SafeAreaView', 'ScrollView'] as const;

function leaf(r: R, th: Theme, type: string, used: Set<string>): UINode {
  const fresh = (pool: string[]) => {
    const free = pool.filter((x) => !used.has(x));
    const v = pick(r, free.length ? free : pool);
    used.add(v);
    return v;
  };
  if (type === 'Text') return { type, text: fresh([...th.items, ...th.title]) };
  if (type === 'Button') return { type, text: fresh(th.buttons) };
  if (type === 'TextInput') return { type, text: fresh(th.inputs) };
  return { type };
}

function leaves(r: R, th: Theme, n: number, used: Set<string>) {
  const out: UINode[] = [];
  for (let i = 0; i < n; i++) {
    let t: string = pick(r, LEAF_TYPES);
    // evita telas só com imagens/switches
    if ((t === 'Image' || t === 'Switch') && out.some((x) => x.type === t)) t = 'Text';
    out.push(leaf(r, th, t, used));
  }
  return out;
}

function buildTarget(r: R, level: Level, mode: DuelMode, th: Theme): UINode {
  const used = new Set<string>();
  const title = (): UINode => leaf(r, th, 'Text', used);
  if (level === 1) {
    if (mode === 'code' && r() < 0.5) return leaves(r, th, 1, used)[0];
    return { type: pick(r, CONTAINERS), children: [title(), ...leaves(r, th, mode === 'blocks' ? 1 : 0, used)] };
  }
  if (level === 2) {
    return { type: pick(r, CONTAINERS), children: [title(), ...leaves(r, th, int(r, 1, 2), used)] };
  }
  // nível 3: uma caixa (ou Pressable) dentro da tela
  const inner: UINode = { type: r() < 0.3 ? 'Pressable' : 'View', children: leaves(r, th, 2, used) };
  const kids = [title(), inner, ...leaves(r, th, int(r, 0, 1), used)];
  return { type: pick(r, ['View', 'SafeAreaView', 'ScrollView']), children: r() < 0.5 ? kids : [kids[0], ...kids.slice(1).reverse()] };
}

// ---------------------------------------------------------------- textos para o aluno

const art = (t: string) => (['Image', 'View', 'SafeAreaView', 'ScrollView'].includes(t) ? 'uma' : 'um');

function describe(n: UINode): string {
  switch (n.type) {
    case 'Text':
      return `um <Text> "${n.text}"`;
    case 'Button':
      return `um <Button> com title "${n.text}"`;
    case 'TextInput':
      return `um <TextInput> com placeholder "${n.text}"`;
    case 'Image':
      return `uma <Image> com source={require('./avatar.png')}`;
    case 'Switch':
      return 'um <Switch>';
    default: {
      const kids = n.children ?? [];
      const list = kids.map(describe);
      const joined = list.length > 1 ? `${list.slice(0, -1).join(', ')} e ${list[list.length - 1]}` : list[0] ?? 'nada dentro';
      return `${art(n.type)} <${n.type}> com ${kids.length > 1 ? '(nesta ordem) ' : ''}${joined}`;
    }
  }
}

const short = (n: UINode) => (n.text ? `<${n.type}> "${n.text}"` : `<${n.type}>`);

// ---------------------------------------------------------------- correção

const norm = (s?: string) => (s ?? '').trim().toLowerCase().replace(/[!.,]/g, '').replace(/\s+/g, ' ');

/** mesma estrutura (tipos, ordem, textos) — tolerante só a maiúsculas e pontuação final */
export function sameTree(a: CodeNode | UINode | null | undefined, b: UINode): boolean {
  if (!a || a.type !== b.type) return false;
  if (['Text', 'Button', 'TextInput'].includes(b.type) && norm(a.text) !== norm(b.text)) return false;
  const ac = a.children ?? [];
  const bc = b.children ?? [];
  return ac.length === bc.length && bc.every((c, i) => sameTree(ac[i], c));
}

function walk(n: UINode, f: (n: UINode) => void) {
  f(n);
  (n.children ?? []).forEach((c) => walk(c, f));
}

function findIn(t: CodeNode | null, pred: (n: CodeNode) => boolean): CodeNode | null {
  if (!t) return null;
  if (pred(t)) return t;
  for (const c of t.children ?? []) {
    const f = findIn(c, pred);
    if (f) return f;
  }
  return null;
}

const matches = (want: UINode) => (n: CodeNode) => n.type === want.type && (!['Text', 'Button', 'TextInput'].includes(want.type) || norm(n.text) === norm(want.text));

// ---------------------------------------------------------------- gerador de código-solução

function jsxOf(n: UINode, indent: number, style?: { node: UINode; css: string }): string {
  const pad = '  '.repeat(indent);
  const st = style && style.node === n ? ` style={{ ${style.css} }}` : '';
  switch (n.type) {
    case 'Text':
      return `${pad}<Text${st}>${n.text}</Text>`;
    case 'Button':
      return `${pad}<Button title="${n.text}" onPress={() => {}} />`;
    case 'TextInput':
      return `${pad}<TextInput placeholder="${n.text}"${st} />`;
    case 'Image':
      return `${pad}<Image source={require('./avatar.png')}${st} />`;
    case 'Switch':
      return `${pad}<Switch />`;
    default: {
      const kids = n.children ?? [];
      if (!kids.length) return `${pad}<${n.type}${st} />`;
      return [`${pad}<${n.type}${st}>`, ...kids.map((c) => jsxOf(c, indent + 1, style)), `${pad}</${n.type}>`].join('\n');
    }
  }
}

function importsOf(t: UINode) {
  const set = new Set<string>();
  walk(t, (n) => set.add(n.type));
  return [...set].sort();
}

// ---------------------------------------------------------------- tarefas

export const genId = (mode: DuelMode, level: Level, seed: number) => `g-${mode}-${level}-${seed}`;

export function parseGenId(id: string): { mode: DuelMode; level: Level; seed: number } | null {
  const m = id.match(/^g-(blocks|code)-([123])-(\d{1,10})$/);
  return m ? { mode: m[1] as DuelMode, level: Number(m[2]) as Level, seed: Number(m[3]) } : null;
}

const LEVEL_NAME: Record<Level, string> = { 1: 'Aquecimento', 2: 'Intermediário', 3: 'Avançado' };

export function generateTask(mode: DuelMode, level: Level, seed: number): BlocksTask | CodeTask {
  const r = rng(seed);
  const themeName = pick(r, THEME_NAMES);
  const th = THEMES[themeName];
  const target = buildTarget(r, level, mode, th);
  const id = genId(mode, level, seed);
  const title = `${LEVEL_NAME[level]}: ${target.children?.[0]?.text ?? target.text ?? 'Tela'}`;

  if (mode === 'blocks') {
    const blocks: UIBlock[] = [];
    const seen = new Set<string>();
    const add = (type: string, text?: string) => {
      const k = `${type}|${text ?? ''}`;
      if (seen.has(k)) return;
      seen.add(k);
      blocks.push({ id: `b${blocks.length}`, type, text });
    };
    walk(target, (n) => add(n.type, n.text));
    // distrações: mesmo texto em outro componente, outro container, outro texto do tema
    const textual = blocks.filter((b) => b.text);
    for (let i = 0; i < Math.min(level + 1, textual.length); i++) {
      const b = pick(r, textual);
      add(b.type === 'Text' ? 'Button' : 'Text', b.text);
    }
    add(pick(r, ['View', 'SafeAreaView', 'ScrollView', 'Pressable']));
    if (level >= 2) add('Text', pick(r, [...th.items, ...th.title]));
    const inner = (target.children ?? []).filter((c) => c.children);
    const prompt =
      `Recrie a tela: a parte de fora é ${art(target.type)} <${target.type}>` +
      (inner.length ? `, com ${art(inner[0].type)} <${inner[0].type}> (contorno tracejado) agrupando ${inner[0].children!.length} itens.` : '.');
    return { id, mode: 'blocks', title, prompt, target, blocks: shuffle(r, blocks) };
  }

  // ---- código
  const checks: CodeCheck[] = [{ label: 'Criar um componente chamado App que retorna JSX', test: (a: CodeAnalysis) => a.app.declared && a.app.returnsJsx }];
  const wanted: UINode[] = [];
  walk(target, (n) => wanted.push(n));
  for (const n of wanted.slice(0, 6)) {
    if (checks.some((c) => c.label === `Usar ${short(n)}`)) continue;
    checks.push({ label: `Usar ${short(n)}`, test: (a) => Boolean(findIn(a.tree, matches(n))) });
  }
  if (target.children?.length) checks.push({ label: 'Tudo na ordem e no lugar pedidos', test: (a) => sameTree(a.tree, target) });

  let extra = '';
  let style: { node: UINode; css: string } | undefined;
  if (level === 3) {
    const texts = wanted.filter((n) => n.type === 'Text');
    if (texts.length && r() < 0.75) {
      const node = pick(r, texts);
      const [prop, value] = pick(r, [
        ['fontSize', 24],
        ['fontSize', 20],
        ['color', 'tomato'],
        ['fontWeight', 'bold'],
        ['color', 'teal'],
      ] as const);
      style = { node, css: `${prop}: ${typeof value === 'number' ? value : `'${value}'`}` };
      extra += ` O <Text> "${node.text}" deve ter ${prop}: ${typeof value === 'number' ? value : `'${value}'`}.`;
      checks.push({
        label: `${prop}: ${typeof value === 'number' ? value : `'${value}'`} no <Text> "${node.text}"`,
        test: (a) => {
          const found = findIn(a.tree, matches(node));
          const st = found?.style ? a.styles[found.style] : undefined;
          return Boolean(st && String(st[prop]) === String(value));
        },
      });
    }
    if (r() < 0.5) {
      extra += ' Exporte o App com export default.';
      checks.push({ label: 'Usar export default', test: (a) => a.app.exported });
    }
  }

  const imports = importsOf(target);
  const solution =
    `import { ${imports.join(', ')} } from 'react-native';\n\n` +
    `export default function App() {\n  return (\n${jsxOf(target, 2, style)}\n  );\n}`;
  const starter =
    level === 3 ? "import {  } from 'react-native';\n\n" : "import {  } from 'react-native';\n\nexport default function App() {\n  return (\n    \n  );\n}";
  return {
    id,
    mode: 'code',
    title,
    prompt: `Crie um App que retorna ${describe(target)}.${extra}`,
    starter,
    checks,
    solution,
  };
}

/** Sorteia uma tarefa gerada (nível 1 a 3, mais vezes o 2). */
export function randomGenerated(mode: DuelMode, level?: Level) {
  const lv = level ?? (pick(Math.random, [1, 2, 2, 2, 3, 3]) as Level);
  return generateTask(mode, lv, Math.floor(Math.random() * 1e9));
}
