/**
 * LABORATÓRIO LIVRE 🧪 — lê o código do aluno com o validador de verdade (codecheck.ts)
 * e devolve a tela + os estilos para a prévia.
 */
import { analyzeCode } from './codecheck';
import type { UINode } from './types';

type StyleObj = Record<string, string | number>;

export interface LabResult {
  tree: UINode | null;
  styles: Record<string, StyleObj>;
  /** erro que impede de desenhar (sintaxe, App ausente) */
  error?: string;
  /** problemas que o React Native acusaria, mas a prévia ainda mostra algo */
  warnings: string[];
  nodes: number;
  /** linha do primeiro problema */
  line?: number;
}

export function parseLab(code: string): LabResult {
  const a = analyzeCode(code);
  const blocking = a.syntaxError || !a.app.returnsJsx;
  return {
    tree: blocking ? null : a.tree,
    styles: a.styles,
    error: blocking ? (a.error ?? undefined) : undefined,
    warnings: blocking ? [] : a.issues.map((i) => (i.line ? `Linha ${i.line}: ${i.message}` : i.message)),
    nodes: a.issues.length ? 0 : a.nodes,
    line: a.syntaxError?.line ?? a.issues[0]?.line,
  };
}
