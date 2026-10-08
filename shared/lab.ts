/**
 * LABORATÓRIO LIVRE 🧪 — transforma o código do aluno em uma árvore para a prévia,
 * agora entendendo estilos:
 *   style={{ backgroundColor: 'tomato', padding: 12 }}
 *   style={styles.card}            (com const styles = StyleSheet.create({ card: {...} }))
 *   style={[styles.card, { margin: 4 }]}
 * Sem nota e sem servidor: é só para experimentar.
 */
import { parseJsx, type ParsedNode } from './jsx';
import type { UINode } from './types';

type StyleObj = Record<string, string | number>;

// ---------------------------------------------------------------- mini leitor de objetos JS

class ObjReader {
  i = 0;
  constructor(private s: string) {}
  ws() {
    while (this.i < this.s.length && /[\s,]/.test(this.s[this.i])) this.i++;
  }
  value(): unknown {
    this.ws();
    const c = this.s[this.i];
    if (c === '{') return this.object();
    if (c === '[') return this.array();
    if (c === '"' || c === "'" || c === '`') {
      const end = this.s.indexOf(c, this.i + 1);
      if (end < 0) throw new Error('Faltou fechar as aspas num estilo.');
      const v = this.s.slice(this.i + 1, end);
      this.i = end + 1;
      return v;
    }
    const m = this.s.slice(this.i).match(/^-?\d+(\.\d+)?|^[A-Za-z_$][\w$.]*/);
    if (!m) throw new Error(`Não entendi o valor "${this.s.slice(this.i, this.i + 12)}" no estilo.`);
    this.i += m[0].length;
    if (/^-?\d/.test(m[0])) return Number(m[0]);
    if (m[0] === 'true') return true;
    if (m[0] === 'false') return false;
    return { __ref: m[0] }; // ex.: styles.card
  }
  object(): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    this.i++; // {
    for (let guard = 0; guard < 200; guard++) {
      this.ws();
      if (this.i >= this.s.length) throw new Error('Faltou fechar uma chave } no estilo.');
      if (this.s[this.i] === '}') {
        this.i++;
        return out;
      }
      const m = this.s.slice(this.i).match(/^(['"]?)([A-Za-z_$][\w$-]*)\1\s*:/);
      if (!m) throw new Error(`Esperava "propriedade: valor" no estilo, perto de "${this.s.slice(this.i, this.i + 14)}".`);
      this.i += m[0].length;
      out[m[2]] = this.value();
    }
    throw new Error('Estilo grande demais.');
  }
  array(): unknown[] {
    const out: unknown[] = [];
    this.i++; // [
    for (let guard = 0; guard < 50; guard++) {
      this.ws();
      if (this.s[this.i] === ']') {
        this.i++;
        return out;
      }
      if (this.i >= this.s.length) throw new Error('Faltou fechar um colchete ] no estilo.');
      out.push(this.value());
    }
    throw new Error('Lista grande demais no estilo.');
  }
}

function readValue(src: string) {
  return new ObjReader(src).value();
}

/** só valores simples (número/texto) viram estilo — o resto é ignorado */
function cleanStyle(o: unknown): StyleObj {
  const out: StyleObj = {};
  if (!o || typeof o !== 'object' || Array.isArray(o)) return out;
  for (const [k, v] of Object.entries(o)) if (typeof v === 'string' || typeof v === 'number') out[k] = v;
  return out;
}

/** encontra o objeto dentro de StyleSheet.create({...}) */
function readStyleSheet(code: string): Record<string, StyleObj> {
  const at = code.search(/StyleSheet\s*\.\s*create\s*\(/);
  if (at < 0) return {};
  const open = code.indexOf('{', at);
  if (open < 0) return {};
  const obj = new ObjReader(code.slice(open)).object();
  const sheet: Record<string, StyleObj> = {};
  for (const [k, v] of Object.entries(obj)) sheet[k] = cleanStyle(v);
  return sheet;
}

export interface LabResult {
  tree: UINode | null;
  styles: Record<string, StyleObj>;
  error?: string;
  /** avisos que não impedem a prévia (ex.: styles.xyz não existe) */
  warnings: string[];
  nodes: number;
}

export function parseLab(code: string): LabResult {
  const warnings: string[] = [];
  let sheet: Record<string, StyleObj> = {};
  try {
    sheet = readStyleSheet(code);
  } catch (e) {
    return { tree: null, styles: {}, error: `StyleSheet: ${(e as Error).message}`, warnings, nodes: 0 };
  }
  // o JSX vem antes do StyleSheet: corta para o parser não se confundir
  const ss = code.search(/const\s+\w+\s*=\s*StyleSheet/);
  const ret = code.search(/\breturn\b/);
  const parsed = parseJsx(ss > 0 && ss > ret ? code.slice(0, ss) : code);
  if (!parsed.tree) return { tree: null, styles: sheet, error: parsed.error, warnings, nodes: 0 };

  const styles: Record<string, StyleObj> = { ...sheet };
  let n = 0;
  let nodes = 0;
  const resolve = (v: unknown): StyleObj => {
    if (Array.isArray(v)) return Object.assign({}, ...v.map(resolve));
    if (v && typeof v === 'object' && '__ref' in v) {
      const ref = String((v as { __ref: string }).__ref);
      const key = ref.replace(/^styles\./, '');
      if (sheet[key]) return sheet[key];
      warnings.push(`${ref} não existe no StyleSheet.create`);
      return {};
    }
    return cleanStyle(v);
  };
  const walk = (node: ParsedNode): UINode => {
    nodes++;
    const out: UINode = { type: node.type, text: node.text };
    const raw = node.props?.style;
    if (raw) {
      try {
        // style={{...}} chega como "{...}"; style={styles.x} chega como "styles.x"
        const st = resolve(readValue(raw));
        if (Object.keys(st).length) {
          const key = `__s${n++}`;
          styles[key] = st;
          out.style = key;
        }
      } catch (e) {
        warnings.push((e as Error).message);
      }
    }
    if (node.children) out.children = node.children.map(walk);
    return out;
  };
  const tree = walk(parsed.tree);
  return { tree, styles, warnings, nodes };
}
