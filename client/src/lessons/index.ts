import { M1_LESSONS } from './m1';
import { M2_LESSONS } from './m2';
import { M3TO6_LESSONS } from './m3to6';
import type { Lesson } from './types';

/** Todas as lições, por componente. Para criar uma nova, veja docs/CONTEUDO.md. */
export const LESSONS: Record<string, Lesson> = Object.fromEntries(
  [...M1_LESSONS, ...M2_LESSONS, ...M3TO6_LESSONS].map((l) => [l.component, l])
);
