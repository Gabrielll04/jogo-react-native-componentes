import type { ComponentType, ReactNode } from 'react';

export type Val = string | number | boolean;
export type LessonState = Record<string, Val>;

/** Valor editável do código (vira uma "pill" clicável no editor). */
export interface Control {
  key: string;
  /** opções que o aluno pode escolher */
  options: Val[];
  /** como mostrar o valor no código (padrão: strings com aspas) */
  show?: (v: Val) => string;
}

export interface Lesson {
  component: string;
  /** frase curta abaixo do nome */
  tagline: string;
  /** fala do Mestre na etapa "Conheça" (use <C> para código) */
  intro: ReactNode;
  /** quando usar */
  when: string;
  /** código com {{chave}} nos valores editáveis */
  code: string;
  controls: Control[];
  /** estado inicial extra (contadores, flags de interação...) */
  initial?: LessonState;
  /** prévia viva com componentes reais; pode alterar o estado (ex.: contou toques) */
  Preview: ComponentType<{ s: LessonState; set: (k: string, v: Val) => void }>;
  /** mini-missões do playground */
  tasks: { text: string; done: (s: LessonState) => boolean }[];
  /** teste rápido no fim */
  quiz: { question: string; options: string[]; answer: string; why: string };
}

/** helpers de exibição */
export const raw = (v: Val) => String(v);
export const quoted = (v: Val) => (typeof v === 'string' ? `'${v}'` : String(v));
