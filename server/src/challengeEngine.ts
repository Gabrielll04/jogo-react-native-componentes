/**
 * Motor de desafios: transforma o conteúdo declarativo em "rodadas"
 * (payload sem gabarito para o cliente + função de correção no servidor).
 */
import { randomUUID } from 'node:crypto';
import { compareTree, countNodes, treeToCode } from '../../shared/jsx';
import { COMPONENTS, findStation, MODULES } from '../../shared/modules';
import { analyzeCode } from '../../shared/codecheck';
import type { BossState, ChallengeAnswer, ChallengePayload, ChallengeType, ChallengeView, UINode } from '../../shared/types';
import { DEMO_CODE, STATION_CONTENT, type BugDef, type BuildDef, type MatchDef, type QuizDef } from './content/challenges';

export interface Round {
  payload: ChallengePayload;
  check: (answer: ChallengeAnswer) => boolean;
  /** feedback educativo quando erra (nunca entrega a resposta) */
  wrongFeedback: (answer: ChallengeAnswer) => string;
  explanation: string;
  hints: string[];
  /** código mostrado depois do acerto */
  reveal?: string;
}

export interface Instance {
  id: string;
  playerId: string;
  stationId: string;
  moduleId: number;
  type: ChallengeType;
  title: string;
  startedAt: number;
  attempts: number;
  wrong: number;
  hintsShown: string[];
  helped: boolean;
  helperIds: string[];
  /** quando a pergunta atual apareceu (para medir o "tempo pensando") */
  shownAt: number;
  /** não aceita respostas antes disto (espera depois de errar) */
  lockUntil: number;
  /** erros seguidos (a espera cresce) */
  streak: number;
  /** erros rápidos demais = chutes */
  guesses: number;
  /** tempo extra somado ao tempo final */
  penaltyMs: number;
  /** "Monte a tela" resolvido escrevendo o código (vale mais) */
  byCode?: boolean;
  round: Round;
  boss?: BossState & { pool: (QuizDef | BugDef)[] };
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const pickOne = <T>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

function describe(component: string) {
  const c = COMPONENTS[component];
  return c ? `${component} serve para: ${c.use.toLowerCase()}.` : `${component} não é a melhor escolha aqui.`;
}

// ---------------- fábricas de rodada ----------------

function quizRound(def: QuizDef): Round {
  return {
    payload: {
      kind: 'quiz',
      prompt: def.prompt,
      demo: def.demo,
      code: def.code,
      options: shuffle([def.answer, ...def.distractors]),
    },
    check: (a) => a === def.answer,
    wrongFeedback: (a) => `Não é esse! ${typeof a === 'string' ? describe(a) : ''}`,
    explanation: def.explanation,
    hints: def.hints,
    reveal: def.reveal ?? (def.demo ? DEMO_CODE[def.demo] : undefined),
  };
}

function bugRound(def: BugDef): Round {
  const opts = shuffle([def.fix, ...def.wrong]).map((code, i) => ({ id: String.fromCharCode(97 + i), code }));
  const correctId = opts.find((o) => o.code === def.fix)!.id;
  return {
    payload: { kind: 'bug', prompt: def.prompt, code: def.code, demo: def.demo, options: opts },
    check: (a) => a === correctId,
    wrongFeedback: () => 'Essa correção ainda não resolve o problema. Leia a mensagem de erro de novo!',
    explanation: def.explanation,
    hints: def.hints,
    reveal: def.fix,
  };
}

function matchRound(def: MatchDef): Round {
  const pairs = shuffle(def.pairs).slice(0, Math.min(def.pick, def.pairs.length));
  const left = pairs.map(([comp], i) => ({ id: `l${i}`, label: comp }));
  const rightRaw = pairs.map(([, use], i) => ({ id: `r${i}`, label: use, owner: `l${i}` }));
  // ids da direita são embaralhados para não revelar o par pelo número
  const right = shuffle(rightRaw).map((r, i) => ({ ...r, id: `u${i}` }));
  const answerKey: Record<string, string> = {};
  for (const r of right) answerKey[r.owner] = r.id;
  const countCorrect = (a: ChallengeAnswer) =>
    typeof a === 'object' ? left.filter((l) => (a as Record<string, string>)[l.id] === answerKey[l.id]).length : 0;
  return {
    payload: { kind: 'match', prompt: def.prompt, left, right: right.map(({ id, label }) => ({ id, label })) },
    check: (a) => countCorrect(a) === left.length,
    wrongFeedback: (a) => `${countCorrect(a)} de ${left.length} ligações corretas. Continue!`,
    explanation: def.explanation,
    hints: def.hints,
  };
}

function buildRound(def: BuildDef): Round {
  const styleSheet =
    'const styles = StyleSheet.create({\n' +
    Object.keys(def.styles)
      .map((k) => `  ${k}: { ... },`)
      .join('\n') +
    '\n});';
  return {
    payload: { kind: 'build', prompt: def.prompt, target: def.target, blocks: shuffle(def.blocks), styles: def.styles },
    // blocos: compara a árvore enviada · código: valida o código de verdade e compara a tela que ele desenha
    check: (a) => judgeBuild(a, def.target) === null,
    wrongFeedback: (a) => judgeBuild(a, def.target) ?? '',
    explanation: def.explanation,
    hints: def.hints,
    reveal: treeToCode(def.target) + '\n\n' + styleSheet,
  };
}

/** resposta escrita em código no "Monte a tela" */
export const isCodeAnswer = (a: ChallengeAnswer): a is { code: string } =>
  typeof a === 'object' && a !== null && typeof (a as Record<string, unknown>).code === 'string';

function judgeBuild(a: ChallengeAnswer, target: UINode): string | null {
  if (isCodeAnswer(a)) {
    const r = analyzeCode(a.code.slice(0, 8000));
    return r.error ?? compareTree(r.tree, target);
  }
  return countNodes(a) > 40 ? 'Tela grande demais!' : compareTree(a, target);
}

function roundFromDef(def: QuizDef | BugDef): Round {
  return 'fix' in def ? bugRound(def) : quizRound(def);
}

// ---------------- instâncias ----------------

export function createInstance(playerId: string, stationId: string): Instance | null {
  const found = findStation(stationId);
  const content = STATION_CONTENT[stationId];
  if (!found || !content) return null;

  const base = {
    id: randomUUID(),
    playerId,
    stationId,
    moduleId: found.module.id,
    type: found.station.type,
    title: found.station.title,
    startedAt: Date.now(),
    attempts: 0,
    wrong: 0,
    hintsShown: [] as string[],
    helped: false,
    helperIds: [] as string[],
    shownAt: Date.now(),
    lockUntil: 0,
    streak: 0,
    guesses: 0,
    penaltyMs: 0,
  };

  switch (content.type) {
    case 'quiz_component':
      return { ...base, round: quizRound(pickOne(content.variants)) };
    case 'fix_bug':
      return { ...base, round: bugRound(pickOne(content.variants)) };
    case 'match_use':
      return { ...base, round: matchRound(content.match) };
    case 'build_ui':
      return { ...base, round: buildRound(content.build) };
    case 'boss_challenge': {
      // o chefe mistura perguntas de todas as estações de quiz/bug do módulo
      const pool: (QuizDef | BugDef)[] = [];
      for (const st of found.module.stations) {
        const c = STATION_CONTENT[st.id];
        if (c?.type === 'quiz_component' || c?.type === 'fix_bug') pool.push(...c.variants);
      }
      const shuffled = shuffle(pool);
      const first = shuffled.shift()!;
      return {
        ...base,
        round: roundFromDef(first),
        boss: {
          bossName: content.bossName,
          round: 1,
          rounds: content.rounds,
          bossHp: content.rounds,
          bossMaxHp: content.rounds,
          hearts: content.hearts,
          maxHearts: content.hearts,
          pool: shuffled,
        },
      };
    }
  }
}

/** Avança o chefe para uma nova pergunta (após acerto ou erro). */
export function nextBossRound(inst: Instance) {
  if (!inst.boss) return;
  if (inst.boss.pool.length === 0) {
    // acabou o banco: reembaralha tudo de novo
    const mod = MODULES.find((m) => m.id === inst.moduleId)!;
    for (const st of mod.stations) {
      const c = STATION_CONTENT[st.id];
      if (c?.type === 'quiz_component' || c?.type === 'fix_bug') inst.boss.pool.push(...shuffle<QuizDef | BugDef>(c.variants));
    }
  }
  inst.round = roundFromDef(inst.boss.pool.shift()!);
}

/** Reembaralha as alternativas da mesma pergunta (evita decorar posição). */
export function reshuffleRound(inst: Instance) {
  const p = inst.round.payload;
  if (p.kind === 'quiz') p.options = shuffle(p.options);
  if (p.kind === 'match') p.right = shuffle(p.right);
  if (p.kind === 'build') p.blocks = shuffle(p.blocks);
}

export function toView(inst: Instance): ChallengeView {
  const boss = inst.boss
    ? (({ pool: _pool, ...rest }) => rest)(inst.boss)
    : undefined;
  return {
    instanceId: inst.id,
    stationId: inst.stationId,
    moduleId: inst.moduleId,
    title: inst.title,
    type: inst.type,
    payload: inst.round.payload,
    boss,
    // desafios críticos (chefe) são individuais: sem dicas
    allowHints: inst.type !== 'boss_challenge',
    hints: inst.hintsShown,
    helped: inst.helped,
    attempts: inst.attempts,
  };
}

/** Próxima dica disponível (que ainda não foi mostrada), ou null. */
export function nextHint(inst: Instance): string | null {
  return inst.round.hints.find((h) => !inst.hintsShown.includes(h)) ?? null;
}

/** Valida que todo id de estação em shared/modules.ts tem conteúdo. */
export function validateContent(): string[] {
  const problems: string[] = [];
  for (const m of MODULES) {
    for (const st of m.stations) {
      const c = STATION_CONTENT[st.id];
      if (!c) problems.push(`Estação ${st.id} sem conteúdo em content/challenges.ts`);
      else if (c.type !== st.type) problems.push(`Estação ${st.id}: tipo ${st.type} != conteúdo ${c.type}`);
    }
  }
  return problems;
}
