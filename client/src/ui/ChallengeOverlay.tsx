import { StyleSheet, Text, View } from 'react-native';
import { RULES } from '@shared/events';
import { COMPONENTS, MODULES } from '@shared/modules';
import type { ChallengeType } from '@shared/types';
import { actions } from '../net/socket';
import { useStore } from '../state/store';
import { Btn } from './Btn';
import { BugView, BuildView, MatchView, QuizView } from './challenges/ChallengeViews';
import { Overlay } from './Overlay';
import { colors, ui } from './theme';

const TYPE_LABEL: Record<ChallengeType, string> = {
  quiz_component: '🔮 Qual é o componente?',
  match_use: '🧩 Ligue o componente ao uso',
  build_ui: '🛠️ Monte a tela',
  fix_bug: '🐞 Conserte o bug',
  boss_challenge: '⚔️ Desafio do Chefe',
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

  const finished = Boolean(result?.completed || result?.bossFailed);

  // ---------------- tela de vitória / derrota
  if (finished && result) {
    return (
      <Overlay title={result.completed ? '🎉 Desafio concluído!' : '💀 Derrota'} maxWidth={620}>
        <View style={{ alignItems: 'center', gap: 12 }}>
          <Text style={{ fontSize: 60 }}>{result.bossDefeated ? '🏆' : result.completed ? '✅' : '💀'}</Text>
          <Text style={[ui.text, { textAlign: 'center', fontSize: 16, lineHeight: 23 }]}>{result.explanation}</Text>
          {result.completed ? (
            <View style={[ui.row, { gap: 16 }]}>
              <Text style={styles.reward}>+{result.xpGained} XP</Text>
              <Text style={styles.reward}>+{result.coinsGained} 🪙</Text>
            </View>
          ) : null}
          {result.cardsGained?.length ? (
            <>
              <Text style={ui.h2}>Novas cartas no inventário!</Text>
              <View style={[ui.row, { gap: 8, flexWrap: 'wrap', justifyContent: 'center' }]}>
                {result.cardsGained.map((card) => (
                  <View key={card} style={[styles.card, { borderColor: mod.color }]}>
                    <Text style={{ fontSize: 28 }}>{COMPONENTS[card]?.emoji}</Text>
                    <Text style={[ui.text, { fontWeight: '800' }]}>{card}</Text>
                  </View>
                ))}
              </View>
            </>
          ) : null}
          <Btn primary title="Voltar ao mapa" onPress={actions.closeChallenge} />
        </View>
      </Overlay>
    );
  }

  const locked = false;
  const p = c.payload;
  const key = `${c.instanceId}-${c.boss?.round ?? 0}-${c.boss?.hearts ?? 0}`;

  const header = (
    <View style={{ gap: 8, marginBottom: 10 }}>
      <View style={[ui.row, { gap: 8, flexWrap: 'wrap' }]}>
        <Text style={[ui.chip, { backgroundColor: mod.color, color: '#fff', fontWeight: '700' }]}>
          {mod.emoji} Módulo {mod.id}
        </Text>
        <Text style={[ui.chip, { backgroundColor: colors.panel2, color: colors.text }]}>{TYPE_LABEL[c.type]}</Text>
        {c.attempts > 0 ? <Text style={ui.muted}>tentativas: {c.attempts}</Text> : null}
        {c.helped ? <Text style={[ui.chip, { backgroundColor: '#1f6f8b', color: '#fff' }]}>🤝 Modo cooperação: você foi ajudado</Text> : null}
      </View>
      {c.boss ? (
        <View style={styles.bossBox}>
          <Text style={[ui.text, { fontWeight: '800' }]}>
            {MODULES.find((m) => m.id === c.moduleId)?.stations.find((s) => s.type === 'boss_challenge')?.emoji} {c.boss.bossName} — rodada{' '}
            {c.boss.round}/{c.boss.rounds}
          </Text>
          <View style={styles.hpBar}>
            <View style={[styles.hpFill, { width: `${(c.boss.bossHp / c.boss.bossMaxHp) * 100}%` }]} />
          </View>
          <Text style={ui.text}>
            Seus corações: {'❤️'.repeat(c.boss.hearts)}
            {'🖤'.repeat(c.boss.maxHearts - c.boss.hearts)} · desafio individual, sem dicas
          </Text>
        </View>
      ) : null}
      {result ? (
        <View style={[styles.feedback, { borderColor: result.correct ? colors.ok : colors.bad }]}>
          <Text style={[ui.text, { fontWeight: '700' }]}>{result.correct ? '✅ ' : '❌ '}{result.explanation}</Text>
        </View>
      ) : null}
    </View>
  );

  return (
    <Overlay title={c.title} onClose={actions.closeChallenge} maxWidth={1000} header={header}>
      <View key={key}>
        {p.kind === 'quiz' ? <QuizView p={p} submit={actions.submit} locked={locked} /> : null}
        {p.kind === 'bug' ? <BugView p={p} submit={actions.submit} locked={locked} /> : null}
        {p.kind === 'match' ? <MatchView p={p} submit={actions.submit} locked={locked} /> : null}
        {p.kind === 'build' ? <BuildView p={p} submit={actions.submit} locked={locked} /> : null}
      </View>

      {c.allowHints ? (
        <View style={styles.hints}>
          {hints.map((h, i) => (
            <Text key={i} style={ui.text}>
              💡 {h.from ? <Text style={{ color: colors.accent }}>Dica de {h.from}: </Text> : null}
              {h.text}
            </Text>
          ))}
          <View style={[ui.row, { gap: 8, flexWrap: 'wrap' }]}>
            <Btn small title={`💡 Comprar dica (${RULES.HINT_COST}🪙 · você tem ${coins})`} disabled={coins < RULES.HINT_COST} onPress={actions.buyHint} />
            <Btn small title={stuck ? '🆘 Ajuda pedida — aguarde um colega' : '🆘 Pedir ajuda a um colega'} disabled={stuck} onPress={actions.requestHelp} />
          </View>
        </View>
      ) : null}
    </Overlay>
  );
}

const styles = StyleSheet.create({
  reward: { color: colors.gold, fontSize: 24, fontWeight: '800' },
  card: { width: 110, alignItems: 'center', padding: 10, borderRadius: 12, borderWidth: 2, backgroundColor: colors.panel2, gap: 4 },
  bossBox: { backgroundColor: '#2a1418', borderRadius: 10, padding: 10, gap: 6, borderWidth: 1, borderColor: '#7a2530' },
  hpBar: { height: 12, backgroundColor: '#140a0c', borderRadius: 6, overflow: 'hidden' },
  hpFill: { height: '100%', backgroundColor: '#e5484d' },
  feedback: { borderWidth: 2, borderRadius: 10, padding: 10, backgroundColor: '#161925' },
  hints: { marginTop: 16, gap: 8, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 12 },
});
