/**
 * Leitura de VERDADE do código do aluno (duelos, corrida, laboratório, "Monte a tela" por código).
 *
 * Usa um parser JavaScript + JSX de verdade (acorn + acorn-jsx). Só vale o que o React Native
 * aceitaria: erro de sintaxe, componente não importado, texto fora de <Text>, Button sem title,
 * tag em minúsculo… tudo isso é apontado com a linha, e o desafio não conta como resolvido.
 * A partir da árvore sintática montamos a árvore UINode para a prévia e para a correção.
 */
import { Parser } from 'acorn';
import jsx from 'acorn-jsx';
import { isContainer } from './jsx';
import type { UINode } from './types';

const JSXParser = Parser.extend(jsx());

type StyleObj = Record<string, string | number>;
// a árvore do acorn não é tipada aqui: lemos os campos que precisamos
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type N = any;

export interface CodeIssue {
  message: string;
  line?: number;
}

export interface CodeNode extends UINode {
  props: Record<string, string>;
  children?: CodeNode[];
}

export interface CodeAnalysis {
  /** erro de sintaxe (o código nem roda) */
  syntaxError: CodeIssue | null;
  /** problemas que fariam o app quebrar ou não aparecer */
  issues: CodeIssue[];
  /** primeiro problema, pronto para mostrar ao aluno (ou null se está tudo certo) */
  error: string | null;
  /** tela que o componente App desenha */
  tree: CodeNode | null;
  styles: Record<string, StyleObj>;
  app: { declared: boolean; exported: boolean; returnsJsx: boolean };
  /** componentes importados de 'react-native' */
  imports: string[];
  nodes: number;
}

/** Componentes do React Native que o jogo sabe desenhar. */
export const RN_COMPONENTS = [
  'View',
  'Text',
  'Image',
  'Button',
  'TextInput',
  'Switch',
  'Pressable',
  'ScrollView',
  'SafeAreaView',
  'ActivityIndicator',
  'TouchableOpacity',
  'FlatList',
  'SectionList',
  'Modal',
];

const GLOBALS = new Set(['require', 'console', 'undefined', 'null', 'Math', 'JSON', 'Number', 'String', 'Boolean', 'Array', 'Object', 'Date', 'alert', 'setTimeout']);

// ---------------------------------------------------------------- mensagens de erro em português

function translate(msg: string): string {
  const m = msg.replace(/\s*\(\d+:\d+\)$/, '');
  let r: RegExpMatchArray | null;
  if ((r = m.match(/Expected corresponding JSX closing tag for <(.+)>/))) return `faltou fechar <${r[1]}> com </${r[1]}>.`;
  if (/Adjacent JSX elements must be wrapped/.test(m)) return 'dois elementos lado a lado precisam estar dentro de um só (ex.: <View>…</View>).';
  if (/Unexpected token `[}>]`\. Did you mean/.test(m)) return 'alguma tag não foi fechada antes deste ponto (confira se cada <Tag> tem o seu </Tag>).';
  if (/Unterminated string constant/.test(m)) return 'faltou fechar as aspas.';
  if (/Unterminated JSX contents/.test(m)) return 'uma tag JSX não foi fechada.';
  if (/Unterminated template/.test(m)) return 'faltou fechar a crase `.';
  if ((r = m.match(/Identifier '(.+)' has already been declared/))) return `"${r[1]}" foi declarado duas vezes.`;
  if (/Unexpected keyword/.test(m)) return 'palavra reservada no lugar errado.';
  if (/Unexpected character/.test(m)) return 'caractere inválido.';
  if (/Unexpected token/.test(m)) return 'tem algo inesperado aqui (confira parênteses, chaves, vírgulas e o fechamento das tags).';
  if (/'return' outside of function/.test(m)) return 'o return precisa estar dentro de uma função.';
  if (/Unexpected end of input|Unexpected token \(\d+/.test(m)) return 'o código terminou antes da hora (faltou fechar algo).';
  return m;
}

// ---------------------------------------------------------------- utilidades da árvore

function walk(node: N, visit: (n: N, parent: N | null) => void, parent: N | null = null) {
  if (!node || typeof node.type !== 'string') return;
  visit(node, parent);
  for (const key of Object.keys(node)) {
    if (key === 'loc' || key === 'start' || key === 'end') continue;
    const v = node[key];
    if (Array.isArray(v)) v.forEach((c) => c && typeof c.type === 'string' && walk(c, visit, node));
    else if (v && typeof v.type === 'string') walk(v, visit, node);
  }
}

const isFn = (n: N) => n && (n.type === 'FunctionDeclaration' || n.type === 'FunctionExpression' || n.type === 'ArrowFunctionExpression');
const isJsx = (n: N) => n && (n.type === 'JSXElement' || n.type === 'JSXFragment');

/** JSX que a função devolve (return no corpo dela, ou corpo de arrow function) */
function returnedJsx(fn: N): N | null {
  if (fn.type === 'ArrowFunctionExpression' && fn.expression) return isJsx(fn.body) ? fn.body : null;
  for (const st of fn.body?.body ?? []) {
    if (st.type === 'ReturnStatement') return isJsx(st.argument) ? st.argument : null;
  }
  return null;
}

// ---------------------------------------------------------------- análise

export function analyzeCode(source: string): CodeAnalysis {
  const out: CodeAnalysis = {
    syntaxError: null,
    issues: [],
    error: null,
    tree: null,
    styles: {},
    app: { declared: false, exported: false, returnsJsx: false },
    imports: [],
    nodes: 0,
  };
  const code = source.slice(0, 8000);
  let ast: N;
  try {
    ast = JSXParser.parse(code, { ecmaVersion: 'latest', sourceType: 'module', locations: true });
  } catch (e) {
    const err = e as Error & { loc?: { line: number } };
    out.syntaxError = { message: translate(err.message), line: err.loc?.line };
    out.error = `Linha ${err.loc?.line ?? '?'}: ${out.syntaxError.message}`;
    return out;
  }

  const issue = (message: string, node?: N) => {
    if (out.issues.length < 8 && !out.issues.some((i) => i.message === message)) out.issues.push({ message, line: node?.loc?.start.line });
  };

  // ---- imports, declarações e componentes locais
  const rnImports = new Set<string>();
  const declared = new Set<string>();
  const functions = new Map<string, N>();
  const constants = new Map<string, string>();
  let styleSheetVar: string | null = null;
  let sheet: Record<string, StyleObj> = {};

  for (const st of ast.body) {
    if (st.type === 'ImportDeclaration') {
      for (const sp of st.specifiers) {
        declared.add(sp.local.name);
        if (st.source.value === 'react-native') rnImports.add(sp.imported?.name ?? sp.local.name);
      }
    }
    const decl = st.type === 'ExportDefaultDeclaration' || st.type === 'ExportNamedDeclaration' ? st.declaration : st;
    if (!decl) continue;
    if (decl.type === 'FunctionDeclaration' && decl.id) {
      declared.add(decl.id.name);
      functions.set(decl.id.name, decl);
    }
    if (decl.type === 'VariableDeclaration') {
      for (const d of decl.declarations) {
        if (d.id.type !== 'Identifier') continue;
        declared.add(d.id.name);
        if (isFn(d.init)) functions.set(d.id.name, d.init);
        if (d.init?.type === 'Literal' && typeof d.init.value === 'string') constants.set(d.id.name, d.init.value);
        const c = d.init;
        if (c?.type === 'CallExpression' && c.callee.type === 'MemberExpression' && c.callee.object.name === 'StyleSheet' && c.callee.property.name === 'create') {
          if (!rnImports.has('StyleSheet')) issue('StyleSheet foi usado mas não foi importado de \'react-native\'.', c);
          styleSheetVar = d.id.name;
          sheet = evalStyleSheet(c.arguments[0]);
        }
      }
    }
  }
  // nomes declarados em qualquer lugar (parâmetros, variáveis internas, useState…)
  walk(ast, (n) => {
    if (n.type === 'VariableDeclarator') collectPattern(n.id, declared);
    if (isFn(n)) {
      if (n.id) declared.add(n.id.name);
      n.params.forEach((p: N) => collectPattern(p, declared));
    }
    if (n.type === 'CatchClause' && n.param) collectPattern(n.param, declared);
  });
  out.imports = [...rnImports];
  out.styles = { ...sheet };

  // ---- o componente App
  const appFn = functions.get('App');
  out.app.declared = Boolean(appFn);
  for (const st of ast.body) {
    if (st.type !== 'ExportDefaultDeclaration') continue;
    const d = st.declaration;
    if ((d.type === 'FunctionDeclaration' && d.id?.name === 'App') || (d.type === 'Identifier' && d.name === 'App')) out.app.exported = true;
  }
  if (!appFn) {
    out.error = 'Não encontrei o componente App (ex.: function App() { … }).';
    return out;
  }
  const root = returnedJsx(appFn);
  out.app.returnsJsx = Boolean(root);
  if (!root) {
    out.error = 'O App precisa retornar JSX (ex.: return <View>…</View>).';
    return out;
  }

  // ---- identificadores usados em expressões precisam existir
  walk(appFn, (n, parent) => {
    if (n.type !== 'Identifier' || !parent) return;
    if (parent.type === 'MemberExpression' && parent.property === n && !parent.computed) return;
    if (parent.type === 'Property' && parent.key === n && !parent.computed) return;
    if (parent.type === 'JSXAttribute') return;
    if (declared.has(n.name) || GLOBALS.has(n.name)) return;
    issue(`"${n.name}" não existe: declare essa variável/função antes de usar.`, n);
  });

  // ---- monta a tela
  let count = 0;
  const inlineStack: string[] = [];
  let styleSeq = 0;

  const styleOf = (expr: N): StyleObj => {
    if (!expr) return {};
    if (expr.type === 'ObjectExpression') return evalObject(expr);
    if (expr.type === 'ArrayExpression') return Object.assign({}, ...expr.elements.map(styleOf));
    if (expr.type === 'MemberExpression' && expr.object.type === 'Identifier') {
      const key = expr.property.name ?? expr.property.value;
      if (expr.object.name !== styleSheetVar) {
        if (!declared.has(expr.object.name)) issue(`"${expr.object.name}" não existe (o StyleSheet.create foi salvo em outra variável?).`, expr);
        return {};
      }
      if (!sheet[key]) issue(`styles.${key} não existe no StyleSheet.create.`, expr);
      return sheet[key] ?? {};
    }
    return {};
  };

  const textOf = (expr: N): string | null => {
    if (!expr) return null;
    if (expr.type === 'Literal' && (typeof expr.value === 'string' || typeof expr.value === 'number')) return String(expr.value);
    if (expr.type === 'TemplateLiteral' && expr.expressions.length === 0) return expr.quasis[0].value.cooked;
    if (expr.type === 'Identifier' && constants.has(expr.name)) return constants.get(expr.name)!;
    return null;
  };

  const element = (el: N, parentType: string | null): CodeNode[] => {
    if (++count > 80) {
      if (count === 81) issue('Tela grande demais (máximo de 80 componentes).');
      return [];
    }
    if (el.type === 'JSXFragment') return [{ type: 'View', props: {}, children: kids(el.children, 'View') }];
    const nameNode = el.openingElement.name;
    if (nameNode.type !== 'JSXIdentifier') {
      issue('Use o nome do componente direto, como <View>.', el);
      return [];
    }
    const name: string = nameNode.name;
    if (/^[a-z]/.test(name)) {
      const fix = RN_COMPONENTS.find((c) => c.toLowerCase() === name.toLowerCase());
      issue(`<${name}> não existe no React Native${fix ? `: o certo é <${fix}>, com letra maiúscula` : ''}.`, el);
      return [];
    }
    // componente criado pelo aluno: desenha o que ele retorna
    if (functions.has(name) && !rnImports.has(name)) {
      if (inlineStack.includes(name)) return [];
      const ret = returnedJsx(functions.get(name));
      if (!ret) {
        issue(`O componente ${name} precisa retornar JSX.`, el);
        return [];
      }
      inlineStack.push(name);
      const r = element(ret, parentType);
      inlineStack.pop();
      return r;
    }
    if (!rnImports.has(name)) {
      issue(
        RN_COMPONENTS.includes(name)
          ? `<${name}> é usado mas não foi importado: import { ${name} } from 'react-native';`
          : `<${name}> não existe. Confira o nome (maiúsculas contam) e o import.`,
        el
      );
    }
    const props: Record<string, string> = {};
    const node: CodeNode = { type: name, props };
    let style: StyleObj = {};
    let sheetName: string | null = null;
    for (const a of el.openingElement.attributes) {
      if (a.type !== 'JSXAttribute') continue;
      const key = a.name.name;
      const v = a.value;
      if (v === null) props[key] = 'true';
      else if (v.type === 'Literal') props[key] = String(v.value);
      else if (v.type === 'JSXExpressionContainer') {
        if (key === 'style') {
          style = styleOf(v.expression);
          // style={styles.card}: guarda o NOME do estilo (o "Monte a tela" compara pelo nome)
          const e = v.expression;
          if (e.type === 'MemberExpression' && e.object.type === 'Identifier' && e.object.name === styleSheetVar && sheet[e.property.name]) {
            sheetName = e.property.name;
          }
        }
        const t = textOf(v.expression);
        props[key] = t ?? (v.expression.type === 'JSXEmptyExpression' ? '' : '{…}');
      }
    }
    if (sheetName) node.style = sheetName;
    else if (Object.keys(style).length) {
      const k = `__s${styleSeq++}`;
      out.styles[k] = style;
      node.style = k;
    }
    if (name === 'Button') {
      if (!('title' in props)) issue('O <Button> precisa da prop title (ex.: <Button title="OK" />).', el);
      node.text = props.title ?? '';
    } else if (name === 'TextInput') node.text = props.placeholder ?? '';
    else if (name === 'Image' && !('source' in props)) issue('A <Image> precisa da prop source.', el);

    const children = kids(el.children, name);
    if (name === 'Text') {
      node.text = flattenText(children);
    } else if (children.length) {
      if (!isContainer(name) && !['Modal'].includes(name)) issue(`<${name}> não aceita componentes dentro dele.`, el);
      node.children = children;
    } else if (isContainer(name)) node.children = [];
    return [node];
  };

  const kids = (list: N[], parentType: string): CodeNode[] => {
    const res: CodeNode[] = [];
    for (const c of list) {
      if (c.type === 'JSXText') {
        // regra do JSX: linhas só com espaços somem; quebras de linha viram um espaço
        if (/^\s*$/.test(c.value) && c.value.includes('\n')) continue;
        const t = c.value.replace(/\s*\n\s*/g, ' ').replace(/\s+/g, ' ');
        if (!t.trim()) continue;
        if (parentType !== 'Text') issue(`O texto "${t.trim().slice(0, 30)}" está fora de um <Text>: no React Native todo texto precisa estar dentro de <Text>.`, c);
        res.push({ type: parentType === 'Text' ? '__text__' : '__loose_text__', text: parentType === 'Text' ? t : t.trim(), props: {} });
      } else if (c.type === 'JSXExpressionContainer') {
        if (c.expression.type === 'JSXEmptyExpression') continue; // comentário
        const t = textOf(c.expression);
        if (isJsx(c.expression)) res.push(...element(c.expression, parentType));
        else if (t !== null) {
          if (parentType !== 'Text') issue(`O texto "${t.slice(0, 30)}" está fora de um <Text>.`, c);
          res.push({ type: parentType === 'Text' ? '__text__' : '__loose_text__', text: t, props: {} });
        } else if (parentType === 'Text') res.push({ type: '__text__', text: '…', props: {} }); // valor que só existe quando o app roda
      } else if (isJsx(c)) res.push(...element(c, parentType));
    }
    return res;
  };

  const tree = element(root, null)[0] ?? null;
  out.tree = tree;
  out.nodes = count;
  if (out.issues.length) out.error = `${out.issues[0].line ? `Linha ${out.issues[0].line}: ` : ''}${out.issues[0].message}`;
  return out;
}

function flattenText(children: CodeNode[]): string {
  return children
    .map((c) => (c.type === 'Text' ? (c.text ?? '') : (c.text ?? '')))
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
}

function collectPattern(p: N, into: Set<string>) {
  if (!p) return;
  if (p.type === 'Identifier') into.add(p.name);
  else if (p.type === 'ArrayPattern') p.elements.forEach((e: N) => collectPattern(e, into));
  else if (p.type === 'ObjectPattern') p.properties.forEach((pr: N) => collectPattern(pr.value ?? pr.argument, into));
  else if (p.type === 'AssignmentPattern') collectPattern(p.left, into);
  else if (p.type === 'RestElement') collectPattern(p.argument, into);
}

function evalValue(v: N): string | number | undefined {
  if (!v) return undefined;
  if (v.type === 'Literal' && (typeof v.value === 'string' || typeof v.value === 'number')) return v.value;
  if (v.type === 'UnaryExpression' && v.operator === '-' && v.argument.type === 'Literal' && typeof v.argument.value === 'number') return -v.argument.value;
  if (v.type === 'TemplateLiteral' && v.expressions.length === 0) return v.quasis[0].value.cooked;
  return undefined;
}

function evalObject(o: N): StyleObj {
  const out: StyleObj = {};
  for (const p of o.properties ?? []) {
    if (p.type !== 'Property') continue;
    const key = p.key.type === 'Identifier' ? p.key.name : p.key.value;
    const v = evalValue(p.value);
    if (key !== undefined && v !== undefined) out[String(key)] = v;
  }
  return out;
}

function evalStyleSheet(o: N): Record<string, StyleObj> {
  const out: Record<string, StyleObj> = {};
  if (o?.type !== 'ObjectExpression') return out;
  for (const p of o.properties) {
    if (p.type !== 'Property' || p.value.type !== 'ObjectExpression') continue;
    const key = p.key.type === 'Identifier' ? p.key.name : p.key.value;
    out[String(key)] = evalObject(p.value);
  }
  return out;
}

/** Procura um nó na árvore (busca em profundidade). */
export function findCodeNode(tree: CodeNode | null, pred: (n: CodeNode) => boolean): CodeNode | null {
  if (!tree) return null;
  if (pred(tree)) return tree;
  for (const c of tree.children ?? []) {
    const f = findCodeNode(c, pred);
    if (f) return f;
  }
  return null;
}
