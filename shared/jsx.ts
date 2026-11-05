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
      return `<Button title="${node.text ?? ''}" onPress={() => {}} />`;
    case 'TextInput':
      return `<TextInput placeholder="${node.text ?? ''}"${st} />`;
    case 'Image':
      return `<Image source={require('./avatar.png')}${st} />`;
    case 'Switch':
      return `<Switch />`;
    default:
      if (isContainer(node.type)) {
        const press = node.type === 'Pressable' ? ' onPress={() => {}}' : '';
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
    const now = !s.style ? 'está sem estilo' : s.style.startsWith('__') ? 'tem um estilo escrito direto (use um do StyleSheet)' : `usa styles.${s.style}`;
    return `${label(s)} ${now} — compare com a tela-objetivo.`;
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
