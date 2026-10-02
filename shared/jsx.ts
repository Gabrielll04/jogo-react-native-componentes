/**
 * Utilidades da árvore de interface (UINode) do desafio "Monte a tela":
 *  - treeToCode: gera o JSX que o aluno vê no editor (e o código revelado no fim)
 *  - compareTree: compara a tela do aluno com a tela-objetivo (usado no servidor)
 */
import type { UINode } from './types';

/** Componentes que aceitam filhos */
export const CONTAINERS = ['View', 'SafeAreaView', 'ScrollView', 'Pressable'];

export const isContainer = (type: string) => CONTAINERS.includes(type);

function styleAttr(node: UINode) {
  return node.style ? ` style={styles.${node.style}}` : '';
}

/** Uma linha de JSX para um nó (sem filhos) — usado também pelo editor linha a linha. */
export function openTag(node: UINode): string {
  const st = styleAttr(node);
  switch (node.type) {
    case 'Text':
      return `<Text${st}>${node.text ?? ''}</Text>`;
    case 'Button':
      return `<Button title="${node.text ?? ''}" onPress={entrar} />`;
    case 'TextInput':
      return `<TextInput placeholder="${node.text ?? ''}"${st} />`;
    case 'Image':
      return `<Image source={require('./avatar.png')}${st} />`;
    case 'Switch':
      return `<Switch value={lembrar} onValueChange={setLembrar} />`;
    default:
      if (isContainer(node.type)) {
        const press = node.type === 'Pressable' ? ' onPress={entrar}' : '';
        return node.children?.length ? `<${node.type}${press}${st}>` : `<${node.type}${press}${st} />`;
      }
      return `<${node.type}${st} />`;
  }
}

export function treeToCode(node: UINode, indent = 0): string {
  const pad = '  '.repeat(indent);
  const line = pad + openTag(node);
  if (isContainer(node.type) && node.children?.length) {
    return [line, ...node.children.map((c) => treeToCode(c, indent + 1)), `${pad}</${node.type}>`].join('\n');
  }
  return line;
}

function label(n: UINode) {
  return n.text ? `<${n.type}> "${n.text}"` : `<${n.type}>`;
}

/**
 * Compara a árvore do aluno com o objetivo. Retorna null se igual, ou uma
 * pista do PRIMEIRO ponto diferente (sem entregar a resposta inteira).
 */
export function compareTree(student: unknown, target: UINode, where = 'a tela'): string | null {
  const s = student as UINode | undefined;
  if (!s || typeof s !== 'object' || typeof s.type !== 'string') return 'A tela está vazia: comece pelo componente de fora (a raiz).';
  if (s.type !== target.type) {
    return where === 'a tela'
      ? `O componente de fora (raiz) não é ${label(s)}. Que componente envolve a tela toda?`
      : `Em ${where}, ${label(s)} não é o componente certo nessa posição.`;
  }
  if (target.text !== undefined && s.text !== target.text) return `Em ${where}, o texto de ${label(s)} está no lugar errado.`;
  if (target.style && s.style !== target.style) {
    return `${label(s)} ${s.style ? `usa styles.${s.style}` : 'está sem estilo'} — compare com a tela-objetivo.`;
  }
  const sc = Array.isArray(s.children) ? s.children : [];
  const tc = target.children ?? [];
  if (sc.length !== tc.length) {
    return `Dentro de ${label(s)} deveria haver ${tc.length} componente(s), mas há ${sc.length}.`;
  }
  for (let i = 0; i < tc.length; i++) {
    const diff = compareTree(sc[i], tc[i], `dentro de ${label(s)} (posição ${i + 1})`);
    if (diff) return diff;
  }
  return null;
}

/** Conta nós (limite de segurança para respostas enviadas pelo cliente). */
export function countNodes(n: unknown, depth = 0): number {
  const node = n as UINode;
  if (!node || typeof node !== 'object' || depth > 8) return 999;
  return 1 + (Array.isArray(node.children) ? node.children.reduce((a, c) => a + countNodes(c, depth + 1), 0) : 0);
}

// ======================================================================
// Mini-interpretador de JSX (duelos de código): transforma o código que o
// aluno digitou em uma árvore UINode para mostrar a prévia no celular e
// para conferir as tarefas. Bem tolerante — só precisa entender JSX simples.
// ======================================================================

export interface ParsedNode extends UINode {
  props: Record<string, string>;
  children?: ParsedNode[];
}

export interface ParseResult {
  tree: ParsedNode | null;
  error?: string;
}

function stripComments(code: string) {
  return code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"])\/\/.*$/gm, '$1');
}

/** Encontra o JSX devolvido pelo componente (depois do return ou da arrow function). */
function jsxStart(code: string) {
  const ret = code.search(/\breturn\b/);
  const from = ret >= 0 ? ret : 0;
  const re = /<(?=[A-Za-z>])/g;
  re.lastIndex = from;
  const m = re.exec(code);
  return m ? m.index : -1;
}

export function parseJsx(source: string): ParseResult {
  const code = stripComments(source).slice(0, 4000);
  const start = jsxStart(code);
  if (start < 0) return { tree: null, error: 'Não encontrei nenhum JSX. O componente precisa retornar algo como <View>…</View>.' };
  let i = start;
  let count = 0;

  const fail = (msg: string): never => {
    throw new Error(msg);
  };
  const ws = () => {
    while (i < code.length && /\s/.test(code[i])) i++;
  };
  const skipBraces = () => {
    // i aponta para "{": avança até o "}" correspondente
    let depth = 0;
    const begin = i;
    for (; i < code.length; i++) {
      if (code[i] === '{') depth++;
      else if (code[i] === '}') {
        depth--;
        if (depth === 0) {
          i++;
          return code.slice(begin + 1, i - 1).trim();
        }
      }
    }
    return fail('Faltou fechar uma chave }.');
  };
  const unquote = (v: string) => {
    const m = v.match(/^(['"`])([\s\S]*)\1$/);
    return m ? m[2] : v;
  };

  const element = (depth: number): ParsedNode => {
    if (depth > 10 || ++count > 60) fail('Tela grande demais para um duelo!');
    i++; // "<"
    let name = 'Fragment';
    if (code[i] !== '>') {
      const m = code.slice(i).match(/^[A-Za-z][\w.]*/);
      if (!m) fail('Nome de tag inválido depois de "<".');
      name = m![0];
      i += name.length;
    }
    const props: Record<string, string> = {};
    for (;;) {
      ws();
      if (i >= code.length) fail(`Faltou fechar a tag <${name}> com ">".`);
      if (code.startsWith('/>', i)) {
        i += 2;
        return build(name, props, [], []);
      }
      if (code[i] === '>') {
        i++;
        break;
      }
      const m = code.slice(i).match(/^[A-Za-z_][\w-]*/);
      if (!m) fail(`Algo estranho dentro da tag <${name}>.`);
      const attr = m![0];
      i += attr.length;
      ws();
      if (code[i] !== '=') {
        props[attr] = 'true';
        continue;
      }
      i++;
      ws();
      if (code[i] === '"' || code[i] === "'") {
        const q = code[i];
        const end = code.indexOf(q, i + 1);
        if (end < 0) fail(`Faltou fechar as aspas em ${attr}.`);
        props[attr] = code.slice(i + 1, end);
        i = end + 1;
      } else if (code[i] === '{') {
        props[attr] = unquote(skipBraces());
      } else fail(`Valor inválido em ${attr}=`);
    }
    // filhos
    const kids: ParsedNode[] = [];
    const texts: string[] = [];
    for (;;) {
      if (i >= code.length) fail(`Faltou fechar a tag <${name}> com </${name === 'Fragment' ? '' : name}>.`);
      if (code.startsWith('</', i)) {
        i += 2;
        const m = code.slice(i).match(/^[A-Za-z][\w.]*/);
        const close = m ? m[0] : 'Fragment';
        if (close !== name) fail(`A tag <${name}> foi fechada com </${close === 'Fragment' ? '' : close}>.`);
        i += m ? close.length : 0;
        ws();
        if (code[i] !== '>') fail(`Faltou ">" em </${close}.`);
        i++;
        return build(name, props, kids, texts);
      }
      if (code[i] === '<') {
        kids.push(element(depth + 1));
      } else if (code[i] === '{') {
        const expr = skipBraces();
        const lit = unquote(expr);
        if (lit !== expr) texts.push(lit);
      } else {
        const end = code.slice(i).search(/[<{]/);
        const raw = end < 0 ? code.slice(i) : code.slice(i, i + end);
        i += raw.length;
        const t = raw.replace(/\s+/g, ' ').trim();
        if (t) texts.push(t);
      }
    }
  };

  const build = (name: string, props: Record<string, string>, kids: ParsedNode[], texts: string[]): ParsedNode => {
    const type = name === 'Fragment' ? 'View' : name;
    const node: ParsedNode = { type, props };
    if (type === 'Text') node.text = [...texts, ...kids.map((k) => k.text ?? '')].join(' ').trim();
    else if (type === 'Button') node.text = props.title ?? '';
    else if (type === 'TextInput') node.text = props.placeholder ?? '';
    else if (texts.length && isContainer(type)) node.children = [...kids, { type: '__loose_text__', text: texts.join(' '), props: {} }];
    if (isContainer(type) && !node.children) node.children = kids;
    return node;
  };

  try {
    return { tree: element(0) };
  } catch (e) {
    return { tree: null, error: (e as Error).message };
  }
}

/** Procura um nó na árvore (busca em profundidade). */
export function findNode(tree: ParsedNode | null, pred: (n: ParsedNode) => boolean): ParsedNode | null {
  if (!tree) return null;
  if (pred(tree)) return tree;
  for (const c of tree.children ?? []) {
    const f = findNode(c, pred);
    if (f) return f;
  }
  return null;
}
