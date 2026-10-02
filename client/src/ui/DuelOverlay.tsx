/**
 * Tela do duelo ⚔️: contagem 3-2-1, a mesma tarefa para os dois alunos,
 * feedback a cada tentativa e o resultado (com as moedas ganhas/perdidas).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { checkCode, duelTask, MODE_LABEL, type CodeTask } from '@shared/duels';
import type { BuildPayload } from '@shared/types';
import { playSound } from '../audio/sound';
import { actions } from '../net/socket';
import { useStore } from '../state/store';
import { Btn } from './Btn';
import { BuildView } from './challenges/BuildView';
import { CodeView } from './CodeView';
import { PhoneFrame } from './PhoneFrame';
import { colors, fonts } from './theme';
import { RenderScreen } from './uiTree';

const mmss = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

export function DuelOverlay() {
  const duel = useStore((s) => s.duel)!;
  const end = useStore((s) => s.duelEnd);
  const me = useStore((s) => s.progress);
  const oppAttempts = useStore((s) => s.duelOppAttempts);
  const feedback = useStore((s) => s.duelFeedback);
  const [now, setNow] = useState(Date.now());
  const task = duelTask(duel.taskId)!;

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(t);
  }, []);

  const toStart = duel.startAt - now;
  const started = toStart <= 0;
  const lastBeep = useRef(4);
  useEffect(() => {
    const n = Math.ceil(toStart / 1000);
    if (n < lastBeep.current && n >= 0) {
      lastBeep.current = n;
      playSound(n === 0 ? 'correct' : 'click');
    }
  }, [toStart]);

  const showFeedback = feedback && now - feedback.at < 6000;

  return (
    <View style={styles.backdrop}>
      <View style={styles.window}>
        {/* ---------- placar */}
        <View style={styles.header}>
          <View style={styles.side}>
            <View style={[styles.dot, { backgroundColor: me?.color }]} />
            <Text style={styles.name}>Você</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.vs}>⚔️ DUELO · {MODE_LABEL[duel.mode]}</Text>
            <Text style={styles.timer}>{started && !end ? mmss(now - duel.startAt) : end ? 'fim!' : 'preparar…'}</Text>
          </View>
          <View style={[styles.side, { justifyContent: 'flex-end' }]}>
            <Text style={styles.name}>{duel.opponent.name}</Text>
            <View style={[styles.dot, { backgroundColor: duel.opponent.color }]} />
          </View>
        </View>
        <View style={styles.subHeader}>
          <Text style={styles.subText}>
            🎯 {task.title} · aposta: até {duel.stake} 🪙 · {duel.opponent.name} errou {oppAttempts} vez(es)
          </Text>
          {!end ? <Btn small variant="danger" title="🏳️ Desistir" onPress={actions.duelForfeit} /> : null}
        </View>

        {end ? (
          <DuelResult />
        ) : !started ? (
          <Countdown n={Math.ceil(toStart / 1000)} title={task.title} prompt={task.prompt} />
        ) : (
          <View style={{ flex: 1 }}>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 18 }}>
              {task.mode === 'blocks' ? (
                <BuildView
                  p={{ kind: 'build', prompt: task.prompt, target: task.target, blocks: task.blocks, styles: {} } satisfies BuildPayload}
                  submit={(a) => actions.duelSubmit(a)}
                  locked={false}
                />
              ) : (
                <CodeDuel task={task} />
              )}
            </ScrollView>
            {showFeedback ? (
              <View style={styles.feedback}>
                <Text style={styles.feedbackTitle}>❌ Ainda não…</Text>
                <Text style={styles.feedbackText}>{feedback.msg}</Text>
              </View>
            ) : null}
          </View>
        )}
      </View>
    </View>
  );
}

function Countdown({ n, title, prompt }: { n: number; title: string; prompt: string }) {
  const scale = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    scale.setValue(0.3);
    Animated.timing(scale, { toValue: 1, duration: 450, easing: Easing.out(Easing.back(2)), useNativeDriver: false }).start();
  }, [n]);
  return (
    <View style={styles.countdown}>
      <Text style={styles.countTitle}>{title}</Text>
      <Text style={styles.countPrompt}>{prompt}</Text>
      <Animated.Text style={[styles.countNum, { transform: [{ scale }] }]}>{n > 0 ? n : 'JÁ!'}</Animated.Text>
    </View>
  );
}

// ------------------------------------------------------------ modo código

function CodeDuel({ task }: { task: CodeTask }) {
  const [code, setCode] = useState(task.starter);
  const result = useMemo(() => checkCode(task, code), [task, code]);
  const allOk = result.ok;
  return (
    <View style={styles.codeCols}>
      <View style={{ flex: 1, minWidth: 380, gap: 12 }}>
        <Text style={styles.prompt}>{task.prompt}</Text>
        <View style={styles.checklist}>
          {task.checks.map((c, i) => (
            <View key={c.label} style={styles.check}>
              <View style={[styles.box, result.passed[i] && styles.boxOn]}>
                {result.passed[i] ? <Text style={{ color: '#fff', fontWeight: '900' }}>✓</Text> : null}
              </View>
              <Text style={[styles.checkText, result.passed[i] && { color: colors.ok }]}>{c.label}</Text>
            </View>
          ))}
        </View>
        <View style={styles.editor}>
          <View style={styles.editorBar}>
            <Text style={styles.editorTitle}>App.js — digite aqui ✍️</Text>
          </View>
          <TextInput
            value={code}
            onChangeText={setCode}
            multiline
            autoFocus
            autoCorrect={false}
            autoCapitalize="none"
            spellCheck={false}
            onKeyPress={(e: { nativeEvent: { key: string; ctrlKey?: boolean; metaKey?: boolean } }) => {
              if (e.nativeEvent.key === 'Enter' && (e.nativeEvent.ctrlKey || e.nativeEvent.metaKey)) actions.duelSubmit(code);
            }}
            style={styles.input}
          />
        </View>
        <Btn big variant={allOk ? 'primary' : 'blue'} title={allOk ? '▶ Enviar (tudo certo!)' : '▶ Enviar  (Ctrl+Enter)'} onPress={() => actions.duelSubmit(code)} />
      </View>
      <View style={{ alignItems: 'center', gap: 8 }}>
        <Text style={styles.label}>📱 O que o seu código mostra</Text>
        <PhoneFrame width={240} height={380}>
          {result.tree ? (
            <RenderScreen root={result.tree} styles={{}} pad />
          ) : (
            <View style={{ flex: 1, padding: 16, paddingTop: 44 }}>
              <Text style={{ color: '#c62828', fontWeight: '800' }}>⚠️ Ainda não dá para desenhar</Text>
              <Text style={{ color: '#555', marginTop: 6 }}>{result.error}</Text>
            </View>
          )}
        </PhoneFrame>
      </View>
    </View>
  );
}

// ------------------------------------------------------------ resultado

function DuelResult() {
  const end = useStore((s) => s.duelEnd)!;
  const scale = useRef(new Animated.Value(0.2)).current;
  useEffect(() => {
    Animated.spring(scale, { toValue: 1, friction: 5, useNativeDriver: false }).start();
  }, []);
  const win = end.result === 'win';
  const draw = end.result === 'draw';
  const why =
    end.reason === 'solved'
      ? win
        ? `Você terminou em ${mmss(end.timeMs)}!`
        : `${end.opponentName} terminou primeiro (${mmss(end.timeMs)}).`
      : end.reason === 'forfeit'
        ? win
          ? `${end.opponentName} desistiu.`
          : 'Você desistiu.'
        : end.reason === 'disconnect'
          ? win
            ? `${end.opponentName} saiu do jogo.`
            : 'Você saiu do duelo.'
          : 'O tempo acabou: empate!';
  return (
    <View style={styles.result}>
      <Animated.Text style={{ fontSize: 80, transform: [{ scale }] }}>{draw ? '🤝' : win ? '🏆' : '😵'}</Animated.Text>
      <Text style={styles.resultTitle}>{draw ? 'Empate!' : win ? 'Você venceu o duelo!' : `${end.opponentName} venceu…`}</Text>
      <Text style={styles.resultWhy}>{why}</Text>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={styles.rewardBox}>
          <Text style={[styles.rewardNum, { color: end.coins < 0 ? colors.bad : colors.gold }]}>
            {end.coins > 0 ? '+' : ''}
            {end.coins} 🪙
          </Text>
          <Text style={styles.rewardLbl}>{end.coins < 0 ? `foram para ${end.opponentName}` : end.coins > 0 ? `de ${end.opponentName}` : 'moedas'}</Text>
        </View>
        {end.xp ? (
          <View style={styles.rewardBox}>
            <Text style={styles.rewardNum}>+{end.xp}</Text>
            <Text style={styles.rewardLbl}>XP</Text>
          </View>
        ) : null}
      </View>
      <View style={{ width: '100%', maxWidth: 620, gap: 6 }}>
        <Text style={styles.label}>🔍 Uma solução possível:</Text>
        <CodeView code={end.solution} title="solução.js" />
      </View>
      <Btn big primary title="Voltar ao jogo" onPress={actions.closeDuel} />
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(5,6,12,0.82)', alignItems: 'center', justifyContent: 'center', padding: 14 },
  window: {
    width: '100%',
    maxWidth: 1240,
    height: '100%',
    maxHeight: 900,
    backgroundColor: colors.panel,
    borderRadius: 22,
    borderWidth: 3,
    borderColor: colors.gold,
    overflow: 'hidden',
  },
  header: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#3a2f0a', paddingHorizontal: 20, paddingVertical: 10 },
  side: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 26, height: 26, borderRadius: 13, borderWidth: 3, borderColor: '#fff' },
  name: { color: '#fff', fontFamily: fonts.game, fontWeight: '900', fontSize: 20 },
  vs: { color: colors.gold, fontFamily: fonts.game, fontWeight: '900', fontSize: 14, letterSpacing: 1 },
  timer: { color: '#fff', fontFamily: fonts.display, fontSize: 30 },
  subHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingVertical: 8, backgroundColor: '#24294a' },
  subText: { flex: 1, color: colors.text, fontFamily: fonts.body, fontWeight: '700', fontSize: 14 },
  countdown: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 20 },
  countTitle: { color: colors.text, fontFamily: fonts.display, fontSize: 34 },
  countPrompt: { color: colors.muted, fontFamily: fonts.body, fontSize: 18, textAlign: 'center' },
  countNum: { color: colors.gold, fontFamily: fonts.display, fontSize: 140 },
  codeCols: { flexDirection: 'row', flexWrap: 'wrap', gap: 20, alignItems: 'flex-start' },
  prompt: { color: colors.text, fontFamily: fonts.body, fontWeight: '800', fontSize: 20, lineHeight: 28 },
  checklist: { backgroundColor: '#1a1f3a', borderRadius: 14, padding: 12, gap: 8, borderWidth: 2, borderColor: '#2c335e' },
  check: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  box: { width: 24, height: 24, borderRadius: 7, borderWidth: 2, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  boxOn: { backgroundColor: colors.ok, borderColor: colors.ok },
  checkText: { color: colors.text, fontFamily: fonts.body, fontSize: 15, fontWeight: '700' },
  editor: { backgroundColor: colors.codeBg, borderRadius: 14, borderWidth: 2, borderColor: '#262c4d', overflow: 'hidden' },
  editorBar: { backgroundColor: '#181c33', paddingHorizontal: 12, paddingVertical: 8 },
  editorTitle: { color: colors.muted, fontFamily: fonts.code, fontSize: 12 },
  input: {
    minHeight: 230,
    color: '#e2e8f0',
    fontFamily: fonts.code,
    fontSize: 15,
    lineHeight: 24,
    padding: 14,
    outlineStyle: 'none',
  },
  label: { color: colors.muted, fontFamily: fonts.game, fontWeight: '900', fontSize: 14 },
  feedback: { backgroundColor: '#ffdfe0', padding: 16, gap: 4, borderTopLeftRadius: 18, borderTopRightRadius: 18 },
  feedbackTitle: { color: '#c93636', fontFamily: fonts.display, fontSize: 22 },
  feedbackText: { color: '#1d2340', fontFamily: fonts.body, fontSize: 16 },
  result: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 20 },
  resultTitle: { color: colors.text, fontFamily: fonts.display, fontSize: 34, textAlign: 'center' },
  resultWhy: { color: colors.muted, fontFamily: fonts.body, fontSize: 17 },
  rewardBox: { alignItems: 'center', backgroundColor: colors.panel2, borderRadius: 16, paddingVertical: 10, paddingHorizontal: 20, borderWidth: 2, borderColor: colors.line, borderBottomWidth: 5 },
  rewardNum: { color: colors.gold, fontFamily: fonts.display, fontSize: 30 },
  rewardLbl: { color: colors.muted, fontFamily: fonts.body, fontSize: 13, fontWeight: '700' },
});
