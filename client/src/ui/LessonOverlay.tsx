/**
 * Lição com um Mestre: Conheça -> Experimente (playground) -> Teste -> Carta.
 * O aluno edita valores DENTRO do código e vê o componente real mudar no celular.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { COMPONENTS, MODULES } from '@shared/modules';
import { playSound } from '../audio/sound';
import { LESSONS } from '../lessons';
import { quoted, type LessonState, type Val } from '../lessons/types';
import { lessonComplete } from '../net/socket';
import { useStore } from '../state/store';
import { Btn } from './Btn';
import { CodeView } from './CodeView';
import { CompCard } from './CompCard';
import { Mascot, Say } from './Mascot';
import { PhoneFrame } from './PhoneFrame';
import { colors, fonts } from './theme';

type Step = 0 | 1 | 2 | 3;
const STEPS = ['Conheça', 'Experimente', 'Teste', 'Carta'];

export function LessonOverlay({ component, onClose }: { component: string; onClose: () => void }) {
  const lesson = LESSONS[component];
  const learned = useStore((s) => s.progress?.learned.includes(component) ?? false);
  const mod = MODULES.find((m) => m.id === COMPONENTS[component]?.module)!;
  const [step, setStep] = useState<Step>(0);
  const initialState = useMemo<LessonState>(() => {
    const st: LessonState = { ...(lesson?.initial ?? {}) };
    for (const c of lesson?.controls ?? []) st[c.key] = c.options[0];
    return st;
  }, [lesson]);
  const [s, setS] = useState<LessonState>(initialState);
  const set = (k: string, v: Val) => setS((prev) => ({ ...prev, [k]: v }));
  const [wasLearned] = useState(learned);

  if (!lesson) return null;

  const fillCode = (code: string, st: LessonState) =>
    code.replace(/\{\{(\w+)\}\}/g, (_, k) => {
      const ctrl = lesson.controls.find((c) => c.key === k);
      return (ctrl?.show ?? quoted)(st[k]);
    });

  return (
    <View style={styles.backdrop}>
      <View style={[styles.window, { borderColor: mod.color }]}>
        {/* ---------- cabeçalho */}
        <View style={[styles.header, { backgroundColor: mod.color }]}>
          <Text style={styles.headerTitle}>
            🧙 Mestre {component} <Text style={{ fontFamily: fonts.code, fontSize: 15 }}>{`<${component}>`}</Text>
          </Text>
          <View style={{ flexDirection: 'row', gap: 6, marginLeft: 'auto', alignItems: 'center' }}>
            {STEPS.map((label, i) => (
              <View key={label} style={[styles.stepPill, i === step && styles.stepPillOn, i < step && styles.stepPillDone]}>
                <Text style={[styles.stepText, i === step && { color: '#1d2340' }]}>
                  {i < step ? '✓' : i + 1} {label}
                </Text>
              </View>
            ))}
            <Pressable onPress={onClose} style={styles.close}>
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: '800' }}>✕</Text>
            </Pressable>
          </View>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
          {step === 0 ? (
            <Intro lesson={lesson} code={fillCode(lesson.code, initialState)} s={initialState} onNext={() => setStep(1)} />
          ) : null}
          {step === 1 ? <Playground lesson={lesson} s={s} set={set} onNext={() => setStep(2)} /> : null}
          {step === 2 ? <Quiz lesson={lesson} onNext={() => setStep(3)} /> : null}
          {step === 3 ? <Reward component={component} firstTime={!wasLearned} onClose={onClose} /> : null}
        </ScrollView>
      </View>
    </View>
  );
}

// ------------------------------------------------------------ 1. Conheça

function Intro({ lesson, code, s, onNext }: { lesson: (typeof LESSONS)[string]; code: string; s: LessonState; onNext: () => void }) {
  const P = lesson.Preview;
  return (
    <View style={styles.cols}>
      <View style={{ flex: 1, minWidth: 340, gap: 16 }}>
        <Text style={styles.bigTitle}>{lesson.tagline}</Text>
        <Mascot name={`Mestre ${lesson.component}`}>
          <Say>{lesson.intro}</Say>
        </Mascot>
        <View style={styles.whenBox}>
          <Text style={styles.whenTitle}>💡 Quando usar?</Text>
          <Text style={styles.whenText}>{lesson.when}</Text>
        </View>
        <CodeView code={code} title="exemplo.js" />
        <Btn big primary title="Experimentar ▶" onPress={onNext} />
      </View>
      <View style={{ alignItems: 'center', gap: 8 }}>
        <Text style={styles.label}>Resultado no celular</Text>
        <PhoneFrame>
          <P s={s} set={() => {}} />
        </PhoneFrame>
      </View>
    </View>
  );
}

// ------------------------------------------------------------ 2. Experimente

function Playground({ lesson, s, set, onNext }: { lesson: (typeof LESSONS)[string]; s: LessonState; set: (k: string, v: Val) => void; onNext: () => void }) {
  const [editing, setEditing] = useState<string>(lesson.controls[0]?.key);
  const ctrl = lesson.controls.find((c) => c.key === editing);
  const show = (k: string, v: Val) => (lesson.controls.find((c) => c.key === k)?.show ?? quoted)(v);
  const doneCount = lesson.tasks.filter((t) => t.done(s)).length;
  const allDone = doneCount === lesson.tasks.length;
  const prevDone = useRef(doneCount);
  useEffect(() => {
    if (doneCount > prevDone.current) playSound('correct');
    prevDone.current = doneCount;
  }, [doneCount]);
  const P = lesson.Preview;

  return (
    <View style={styles.cols}>
      <View style={{ flex: 1, minWidth: 360, gap: 14 }}>
        <Text style={styles.bigTitle}>Mexa no código! ✍️</Text>
        <Text style={styles.sub}>Clique nos valores coloridos dentro do código para trocar — o celular ao lado muda na hora.</Text>
        <CodeView
          code={lesson.code}
          title="playground.js"
          renderPill={(k) => (
            <Text
              onPress={() => setEditing(k)}
              style={[styles.pill, editing === k && styles.pillOn]}
            >
              {show(k, s[k])} ▾
            </Text>
          )}
        />
        {ctrl ? (
          <View style={styles.optionsBox}>
            <Text style={styles.optionsLabel}>
              Valor de <Text style={{ fontFamily: fonts.code, color: colors.codeAttr }}>{editing}</Text>:
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {ctrl.options.map((o) => {
                const on = s[ctrl.key] === o;
                return (
                  <Pressable
                    key={String(o)}
                    onPress={() => {
                      playSound('click');
                      set(ctrl.key, o);
                    }}
                    style={[styles.option, on && styles.optionOn]}
                  >
                    {typeof o === 'string' && /^#[0-9a-f]{6}$/i.test(o) ? (
                      <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: o, borderWidth: 1, borderColor: '#0006' }} />
                    ) : null}
                    <Text style={[styles.optionText, on && { color: '#1d2340' }]}>{show(ctrl.key, o)}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        <View style={styles.tasks}>
          <Text style={styles.whenTitle}>
            🎯 Missões ({doneCount}/{lesson.tasks.length})
          </Text>
          {lesson.tasks.map((t) => {
            const ok = t.done(s);
            return (
              <View key={t.text} style={styles.task}>
                <View style={[styles.check, ok && styles.checkOn]}>{ok ? <Text style={{ color: '#fff', fontWeight: '900' }}>✓</Text> : null}</View>
                <Text style={[styles.taskText, ok && { color: colors.ok, textDecorationLine: 'line-through' }]}>{t.text}</Text>
              </View>
            );
          })}
        </View>
        <Btn big primary disabled={!allDone} title={allDone ? 'Ir para o teste ▶' : 'Complete as missões'} onPress={onNext} />
      </View>
      <View style={{ alignItems: 'center', gap: 8 }}>
        <Text style={styles.label}>📱 Ao vivo (componente real)</Text>
        <PhoneFrame>
          <P s={s} set={set} />
        </PhoneFrame>
      </View>
    </View>
  );
}

// ------------------------------------------------------------ 3. Teste

function Quiz({ lesson, onNext }: { lesson: (typeof LESSONS)[string]; onNext: () => void }) {
  const options = useMemo(() => [...lesson.quiz.options].sort(() => Math.random() - 0.5), [lesson]);
  const [picked, setPicked] = useState<string | null>(null);
  const correct = picked === lesson.quiz.answer;
  const shake = useRef(new Animated.Value(0)).current;

  const pick = (o: string) => {
    setPicked(o);
    if (o === lesson.quiz.answer) playSound('correct');
    else {
      playSound('wrong');
      Animated.sequence(
        [10, -10, 8, -8, 0].map((v) => Animated.timing(shake, { toValue: v, duration: 60, easing: Easing.linear, useNativeDriver: false }))
      ).start();
    }
  };

  return (
    <View style={{ maxWidth: 760, alignSelf: 'center', width: '100%', gap: 16 }}>
      <Mascot name={`Mestre ${lesson.component}`}>
        <Say>Agora me diga: {lesson.quiz.question}</Say>
      </Mascot>
      <Animated.View style={{ gap: 10, transform: [{ translateX: shake }] }}>
        {options.map((o) => {
          const isPicked = picked === o;
          const good = isPicked && correct;
          const bad = isPicked && !correct;
          return (
            <Pressable
              key={o}
              disabled={correct}
              onPress={() => pick(o)}
              style={[styles.answer, good && styles.answerGood, bad && styles.answerBad]}
            >
              <Text style={[styles.answerText, (good || bad) && { color: '#fff' }]}>{o}</Text>
            </Pressable>
          );
        })}
      </Animated.View>
      {picked ? (
        <View style={[styles.feedback, { backgroundColor: correct ? '#d7ffb8' : '#ffdfe0' }]}>
          <Text style={[styles.feedbackTitle, { color: correct ? '#3f8a00' : '#c93636' }]}>
            {correct ? '🎉 Mandou bem!' : '🤔 Quase! Pense de novo…'}
          </Text>
          {correct ? <Text style={styles.feedbackText}>{lesson.quiz.why}</Text> : null}
          {correct ? <Btn big primary title="Pegar minha carta ▶" onPress={onNext} /> : null}
        </View>
      ) : null}
    </View>
  );
}

// ------------------------------------------------------------ 4. Carta

function Reward({ component, firstTime, onClose }: { component: string; firstTime: boolean; onClose: () => void }) {
  const scale = useRef(new Animated.Value(0.2)).current;
  const rot = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (firstTime) lessonComplete(component);
    playSound(firstTime ? 'achievement' : 'correct');
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, friction: 5, useNativeDriver: false }),
      Animated.timing(rot, { toValue: 0, duration: 600, easing: Easing.out(Easing.back(1.5)), useNativeDriver: false }),
    ]).start();
  }, []);
  const rotate = rot.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-25deg'] });
  return (
    <View style={{ alignItems: 'center', gap: 16, paddingVertical: 10 }}>
      <Text style={styles.bigTitle}>{firstTime ? 'Nova carta desbloqueada!' : 'Revisão concluída!'}</Text>
      <Animated.View style={{ transform: [{ scale }, { rotate }] }}>
        <CompCard name={component} size="lg" />
      </Animated.View>
      {firstTime ? <Text style={styles.xp}>+15 XP · +5 🪙</Text> : null}
      <Text style={[styles.sub, { textAlign: 'center', maxWidth: 520 }]}>
        Aprenda todos os componentes deste prédio para liberar os terminais de desafio. 💻
      </Text>
      <Btn big primary title="Voltar ao mapa" onPress={onClose} />
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(5,6,12,0.78)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
  },
  window: {
    width: '100%',
    maxWidth: 1180,
    height: '100%',
    maxHeight: 860,
    backgroundColor: colors.panel,
    borderRadius: 22,
    borderWidth: 3,
    overflow: 'hidden',
  },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 12, gap: 10, flexWrap: 'wrap' },
  headerTitle: { color: '#fff', fontFamily: fonts.game, fontSize: 22, fontWeight: '900' },
  stepPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99, backgroundColor: 'rgba(0,0,0,0.25)' },
  stepPillOn: { backgroundColor: '#fff' },
  stepPillDone: { backgroundColor: 'rgba(255,255,255,0.35)' },
  stepText: { color: '#fff', fontFamily: fonts.game, fontWeight: '900', fontSize: 13 },
  close: { marginLeft: 6, width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center' },
  cols: { flexDirection: 'row', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start' },
  bigTitle: { color: colors.text, fontFamily: fonts.display, fontSize: 28, fontWeight: '700' },
  sub: { color: colors.muted, fontFamily: fonts.body, fontSize: 15, lineHeight: 22 },
  label: { color: colors.muted, fontFamily: fonts.game, fontWeight: '900', fontSize: 14 },
  whenBox: { backgroundColor: '#24294a', borderRadius: 14, padding: 14, borderLeftWidth: 5, borderLeftColor: colors.gold },
  whenTitle: { color: colors.gold, fontFamily: fonts.game, fontWeight: '900', fontSize: 16, marginBottom: 6 },
  whenText: { color: colors.text, fontFamily: fonts.body, fontSize: 15, lineHeight: 22 },
  pill: {
    backgroundColor: '#2b3a7a',
    color: '#ffe79a',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
    fontFamily: fonts.code,
    fontWeight: '700',
    cursor: 'pointer',
    borderWidth: 1,
    borderColor: '#5468c9',
  },
  pillOn: { backgroundColor: colors.gold, color: '#1d2340', borderColor: '#fff' },
  optionsBox: { backgroundColor: '#24294a', borderRadius: 14, padding: 12, gap: 10 },
  optionsLabel: { color: colors.text, fontFamily: fonts.body, fontSize: 14, fontWeight: '700' },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: colors.panel3,
    borderBottomWidth: 3,
    borderBottomColor: '#171b33',
  },
  optionOn: { backgroundColor: colors.gold, borderBottomColor: '#c9a227' },
  optionText: { color: colors.text, fontFamily: fonts.code, fontWeight: '700', fontSize: 14 },
  tasks: { backgroundColor: '#1a1f3a', borderRadius: 14, padding: 14, gap: 8, borderWidth: 2, borderColor: '#2c335e' },
  task: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  check: { width: 24, height: 24, borderRadius: 7, borderWidth: 2, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  checkOn: { backgroundColor: colors.ok, borderColor: colors.ok },
  taskText: { color: colors.text, fontFamily: fonts.body, fontSize: 15, flex: 1 },
  answer: {
    backgroundColor: colors.panel2,
    borderRadius: 14,
    padding: 16,
    borderWidth: 2,
    borderColor: colors.line,
    borderBottomWidth: 5,
  },
  answerGood: { backgroundColor: colors.ok, borderColor: colors.okDark },
  answerBad: { backgroundColor: colors.bad, borderColor: colors.badDark },
  answerText: { color: colors.text, fontFamily: fonts.body, fontSize: 17, fontWeight: '700' },
  feedback: { borderRadius: 16, padding: 16, gap: 10 },
  feedbackTitle: { fontFamily: fonts.game, fontSize: 22, fontWeight: '900' },
  feedbackText: { color: '#1d2340', fontFamily: fonts.body, fontSize: 16, lineHeight: 23 },
  xp: { color: colors.gold, fontFamily: fonts.display, fontSize: 26 },
});
