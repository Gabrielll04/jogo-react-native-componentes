import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { RULES } from '@shared/events';
import { MODULES } from '@shared/modules';
import type { AnswerResult, BossState, ChallengeType } from '@shared/types';
import { actions } from '../net/socket';
import { useStore } from '../state/store';
import { Btn } from './Btn';
import { BugView, BuildView, MatchView, QuizView } from './challenges/ChallengeViews';
import { CodeView } from './CodeView';
import { Mascot, Say } from './Mascot';
import { colors, fonts } from './theme';

const TYPE_LABEL: Record<ChallengeType, string> = {
  quiz_component: '🔮 Que componente é esse?',
  match_use: '🧩 Ligue componente e uso',
  build_ui: '🛠️ Monte a tela em JSX',
  fix_bug: '🐞 Conserte o bug',
  boss_challenge: '⚔️ Batalha contra o Guardião',
};

export function ChallengeOverlay() {
  const c = useStore((s) => s.challenge)!;
  const result = useStore((s) => s.lastResult);
  const hints = useStore((s) => s.hints);
  const coins = useStore((s) => s.progress?.coins ?? 0);
  const players = useStore((s) => s.players);
  const myId = useStore((s) => s.playerId);
  const stuck = players.find((p) => p.id === myId)?.stuck;
  const mod = MODULES.find((m) => m.id === c.moduleId)!;
  const station = mod.stations.find((s) => s.id === c.stationId);
  const [sheet, setSheet] = useState<AnswerResult | null>(null);

  // cada nova resposta abre a folha de feedback
  useEffect(() => {
    if (result && !result.completed && !result.bossFailed) setSheet(result);
  }, [result]);

  const finished = Boolean(result?.completed || result?.bossFailed);
  const p = c.payload;
  const key = `${c.instanceId}-${c.boss?.round ?? 0}-${c.boss?.hearts ?? 0}`;

  return (
    <View style={styles.backdrop}>
      <View style={[styles.window, { borderColor: c.boss ? '#c0392b' : mod.color }]}>
        <View style={[styles.header, { backgroundColor: c.boss ? '#7a1f1f' : mod.color }]}>
          <Text style={styles.headerTitle}>
            {station?.emoji} {c.title}
          </Text>
          <View style={styles.typeChip}>
            <Text style={styles.typeChipText}>{TYPE_LABEL[c.type]}</Text>
          </View>
          {c.helped ? (
            <View style={[styles.typeChip, { backgroundColor: '#0e7490' }]}>
              <Text style={styles.typeChipText}>🤝 Modo cooperação</Text>
            </View>
          ) : null}
          {!finished ? (
            <Pressable onPress={actions.closeChallenge} style={styles.close}>
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: '800' }}>✕</Text>
            </Pressable>
          ) : null}
        </View>

        {finished && result ? (
          <Finish result={result} title={c.title} boss={Boolean(c.boss)} />
        ) : (
          <>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, gap: 16 }}>
              {c.boss ? <BossArena emoji={station?.emoji ?? '👾'} boss={c.boss} lastResult={result} /> : null}
              <View key={key} pointerEvents={sheet ? 'none' : 'auto'}>
                {p.kind === 'quiz' ? <QuizView p={p} submit={actions.submit} locked={Boolean(sheet)} /> : null}
                {p.kind === 'bug' ? <BugView p={p} submit={actions.submit} locked={Boolean(sheet)} /> : null}
                {p.kind === 'match' ? <MatchView p={p} submit={actions.submit} locked={Boolean(sheet)} /> : null}
                {p.kind === 'build' ? <BuildView p={p} submit={actions.submit} locked={Boolean(sheet)} /> : null}
              </View>
              {c.allowHints ? (
                <View style={styles.hints}>
                  {hints.map((h, i) => (
                    <View key={i} style={styles.hintCard}>
                      <Text style={styles.hintText}>
                        💡 {h.from ? <Text style={{ color: '#0e7490', fontWeight: '800' }}>Dica de {h.from}: </Text> : null}
                        {h.text}
                      </Text>
                    </View>
                  ))}
                  <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
                    <Btn small variant="gold" title={`💡 Comprar dica (${RULES.HINT_COST}🪙 · tenho ${coins})`} disabled={coins < RULES.HINT_COST} onPress={actions.buyHint} />
                    <Btn small variant="blue" title={stuck ? '🆘 Ajuda pedida — aguarde um colega' : '🆘 Pedir ajuda a um colega'} disabled={stuck} onPress={actions.requestHelp} />
                  </View>
                </View>
              ) : null}
            </ScrollView>
            {sheet ? <FeedbackSheet r={sheet} onContinue={() => setSheet(null)} /> : null}
          </>
        )}
      </View>
    </View>
  );
}

// ------------------------------------------------------------ folha de feedback (estilo Duolingo)

/** segundos que faltam até `until` (atualiza sozinho) */
export function useSecondsLeft(until: number) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (until <= Date.now()) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [until]);
  return Math.max(0, Math.ceil((until - now) / 1000));
}

function FeedbackSheet({ r, onContinue }: { r: AnswerResult; onContinue: () => void }) {
  const slide = useRef(new Animated.Value(120)).current;
  const [until] = useState(() => Date.now() + (r.cooldownMs ?? 0));
  const wait = useSecondsLeft(until);
  useEffect(() => {
    Animated.spring(slide, { toValue: 0, friction: 8, useNativeDriver: false }).start();
  }, [r]);
  const good = r.correct;
  return (
    <Animated.View style={[styles.sheet, { backgroundColor: good ? '#d7ffb8' : '#ffdfe0', transform: [{ translateY: slide }] }]}>
      <View style={{ flex: 1, minWidth: 280, gap: 6 }}>
        <Text style={[styles.sheetTitle, { color: good ? '#3f8a00' : '#c93636' }]}>{good ? '💥 Acertou!' : '❌ Ainda não…'}</Text>
        <Text style={styles.sheetText}>{r.explanation}</Text>
        {r.reveal ? (
          <View style={{ marginTop: 6 }}>
            <Text style={[styles.sheetText, { fontWeight: '800' }]}>🔍 Por trás da tela:</Text>
            <CodeView code={r.reveal} title="assim se escreve" />
          </View>
        ) : null}
      </View>
      <Btn
        big
        variant={good ? 'primary' : 'danger'}
        title={good ? 'Continuar ▶' : wait > 0 ? `Tentar de novo (${wait})` : 'Tentar de novo'}
        disabled={!good && wait > 0}
        onPress={onContinue}
      />
    </Animated.View>
  );
}

// ------------------------------------------------------------ arena do chefe

function BossArena({ emoji, boss, lastResult }: { emoji: string; boss: BossState; lastResult: AnswerResult | null }) {
  const shake = useRef(new Animated.Value(0)).current;
  const flash = useRef(new Animated.Value(0)).current;
  const dmg = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!lastResult) return;
    if (lastResult.correct) {
      dmg.setValue(1);
      Animated.parallel([
        Animated.sequence([12, -12, 9, -9, 0].map((v) => Animated.timing(shake, { toValue: v, duration: 55, easing: Easing.linear, useNativeDriver: false }))),
        Animated.timing(dmg, { toValue: 0, duration: 1100, useNativeDriver: false }),
      ]).start();
    } else {
      flash.setValue(1);
      Animated.timing(flash, { toValue: 0, duration: 700, useNativeDriver: false }).start();
    }
  }, [lastResult]);
  const hp = boss.bossHp / boss.bossMaxHp;
  return (
    <View style={styles.arena}>
      <Animated.View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#ff0000', opacity: flash.interpolate({ inputRange: [0, 1], outputRange: [0, 0.35] }), borderRadius: 18 }]} />
      <View style={{ alignItems: 'center', gap: 6, width: 160 }}>
        <Animated.Text style={{ fontSize: 86, transform: [{ translateX: shake }] }}>{emoji}</Animated.Text>
        <Animated.Text
          style={{
            position: 'absolute',
            top: 0,
            color: colors.gold,
            fontFamily: fonts.display,
            fontSize: 30,
            opacity: dmg,
            transform: [{ translateY: dmg.interpolate({ inputRange: [0, 1], outputRange: [-40, 0] }) }],
          }}
        >
          -1 ❤
        </Animated.Text>
      </View>
      <View style={{ flex: 1, minWidth: 260, gap: 8 }}>
        <Text style={styles.bossName}>{boss.bossName}</Text>
        <View style={styles.hpBar}>
          <View style={[styles.hpFill, { width: `${hp * 100}%` }]} />
          <Text style={styles.hpText}>
            {boss.bossHp}/{boss.bossMaxHp} HP
          </Text>
        </View>
        <Text style={styles.arenaText}>
          Rodada {boss.round}/{boss.rounds} · Seus corações: {'❤️'.repeat(boss.hearts)}
          {'🖤'.repeat(boss.maxHearts - boss.hearts)}
        </Text>
        <Text style={[styles.arenaText, { color: '#ffb4b4' }]}>Batalha individual: sem dicas! Cada erro troca a pergunta e custa um coração.</Text>
      </View>
    </View>
  );
}

// ------------------------------------------------------------ vitória / derrota

function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 28 }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 600,
        emoji: ['🎉', '⭐', '✨', '🟦', '🟨', '🟩', '⚛️'][i % 7],
        anim: new Animated.Value(0),
      })),
    []
  );
  useEffect(() => {
    pieces.forEach((p) =>
      Animated.timing(p.anim, { toValue: 1, duration: 2200, delay: p.delay, easing: Easing.in(Easing.quad), useNativeDriver: false }).start()
    );
  }, [pieces]);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
      {pieces.map((p, i) => (
        <Animated.Text
          key={i}
          style={{
            position: 'absolute',
            left: `${p.left}%`,
            top: -30,
            fontSize: 22,
            opacity: p.anim.interpolate({ inputRange: [0, 0.85, 1], outputRange: [1, 1, 0] }),
            transform: [
              { translateY: p.anim.interpolate({ inputRange: [0, 1], outputRange: [0, 650] }) },
              { rotate: p.anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${(i % 2 ? 1 : -1) * 360}deg`] }) },
            ],
          }}
        >
          {p.emoji}
        </Animated.Text>
      ))}
    </View>
  );
}

function Finish({ result, title, boss }: { result: AnswerResult; title: string; boss: boolean }) {
  const won = result.completed;
  return (
    <View style={{ flex: 1 }}>
      {won ? <Confetti /> : null}
      <ScrollView contentContainerStyle={{ padding: 24, gap: 16, alignItems: 'center' }}>
        <Text style={{ fontSize: 76 }}>{result.bossDefeated ? '🏆' : won ? '🎉' : '💀'}</Text>
        <Text style={styles.finishTitle}>
          {result.bossDefeated ? 'Guardião derrotado!' : won ? `${title}: concluído!` : 'O Guardião venceu desta vez…'}
        </Text>
        {won ? (
          <View style={{ flexDirection: 'row', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
            <View style={styles.rewardBox}>
              <Text style={styles.rewardNum}>+{result.xpGained}</Text>
              <Text style={styles.rewardLbl}>XP</Text>
            </View>
            <View style={styles.rewardBox}>
              <Text style={styles.rewardNum}>+{result.coinsGained}</Text>
              <Text style={styles.rewardLbl}>moedas</Text>
            </View>
            {result.moduleCompleted ? (
              <View style={[styles.rewardBox, { backgroundColor: '#3a2f0a', borderColor: colors.gold }]}>
                <Text style={styles.rewardNum}>🎖️</Text>
                <Text style={styles.rewardLbl}>insígnia do módulo</Text>
              </View>
            ) : null}
          </View>
        ) : null}
        <View style={{ maxWidth: 760, width: '100%', gap: 12 }}>
          <Mascot>
            <Say>{won ? result.explanation : 'Sem problemas! Volte aos Mestres para revisar os componentes e tente de novo. Cada tentativa traz perguntas diferentes.'}</Say>
          </Mascot>
          {won && result.reveal ? (
            <>
              <Text style={styles.revealTitle}>🔍 O código por trás {boss ? 'da última rodada' : 'desta tela'}:</Text>
              <CodeView code={result.reveal} title="solução.js" />
            </>
          ) : null}
        </View>
        <Btn big primary title="Voltar ao mapa" onPress={actions.closeChallenge} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(5,6,12,0.78)', alignItems: 'center', justifyContent: 'center', padding: 14 },
  window: { width: '100%', maxWidth: 1240, height: '100%', maxHeight: 900, backgroundColor: colors.panel, borderRadius: 22, borderWidth: 3, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 18, paddingVertical: 12, flexWrap: 'wrap' },
  headerTitle: { color: '#fff', fontFamily: fonts.game, fontSize: 22, fontWeight: '900' },
  typeChip: { backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 99, paddingHorizontal: 12, paddingVertical: 4 },
  typeChipText: { color: '#fff', fontFamily: fonts.body, fontWeight: '800', fontSize: 13 },
  close: { marginLeft: 'auto', width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center' },
  hints: { gap: 10, borderTopWidth: 2, borderTopColor: colors.line, paddingTop: 14 },
  hintCard: { backgroundColor: '#fff7d6', borderRadius: 12, padding: 12, borderLeftWidth: 5, borderLeftColor: colors.gold },
  hintText: { color: '#3b2f00', fontFamily: fonts.body, fontSize: 15 },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '75%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 16,
    padding: 20,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
  },
  sheetTitle: { fontFamily: fonts.display, fontSize: 26, fontWeight: '700' },
  sheetText: { color: '#1d2340', fontFamily: fonts.body, fontSize: 16, lineHeight: 23 },
  arena: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 16,
    padding: 16,
    borderRadius: 18,
    backgroundColor: '#2a1216',
    borderWidth: 2,
    borderColor: '#7a2530',
  },
  bossName: { color: '#fff', fontFamily: fonts.display, fontSize: 24 },
  hpBar: { height: 22, backgroundColor: '#140a0c', borderRadius: 11, overflow: 'hidden', justifyContent: 'center', borderWidth: 2, borderColor: '#4a1a20' },
  hpFill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: '#ff4b4b' },
  hpText: { color: '#fff', fontFamily: fonts.game, fontWeight: '900', fontSize: 13, textAlign: 'center' },
  arenaText: { color: '#ffe0e0', fontFamily: fonts.body, fontSize: 14 },
  finishTitle: { color: colors.text, fontFamily: fonts.display, fontSize: 30, textAlign: 'center' },
  rewardBox: { alignItems: 'center', backgroundColor: colors.panel2, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 20, borderWidth: 2, borderColor: colors.line, borderBottomWidth: 5 },
  rewardNum: { color: colors.gold, fontFamily: fonts.display, fontSize: 30 },
  rewardLbl: { color: colors.muted, fontFamily: fonts.body, fontSize: 13, fontWeight: '700' },
  revealTitle: { color: colors.text, fontFamily: fonts.game, fontWeight: '900', fontSize: 17 },
});
