/**
 * Corrida da turma 🏁: a mesma tarefa para todo mundo que está no mapa,
 * com ranking ao vivo. O aluno pode minimizar e voltar pelo botão do HUD.
 */
import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { duelTask, MODE_LABEL, racePrize } from '@shared/duels';
import type { BuildPayload } from '@shared/types';
import { playSound } from '../audio/sound';
import { actions } from '../net/socket';
import { setState, useStore } from '../state/store';
import { Appear, Fade } from './Appear';
import { Btn } from './Btn';
import { BuildView } from './challenges/BuildView';
import { CodeTaskEditor, Countdown, WrongFeedback } from './DuelOverlay';
import { colors, fonts } from './theme';

const mmss = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};
const MEDAL = ['🥇', '🥈', '🥉'];

export function RaceOverlay() {
  const race = useStore((s) => s.race)!;
  const rs = useStore((s) => s.raceState);
  const fb = useStore((s) => s.raceFeedback);
  const me = useStore((s) => s.playerId);
  const [now, setNow] = useState(Date.now());
  const task = duelTask(race.taskId)!;

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(t);
  }, []);

  const toStart = race.startAt - now;
  const started = toStart <= 0;
  const lastBeep = useRef(6);
  useEffect(() => {
    const n = Math.ceil(toStart / 1000);
    if (n < lastBeep.current && n >= 0 && n <= 3) {
      lastBeep.current = n;
      playSound(n === 0 ? 'correct' : 'click');
    }
  }, [toStart]);

  const mine = rs?.finishers.find((f) => f.playerId === me);
  const ended = Boolean(rs?.ended) || now > race.endAt;
  const wait = fb ? Math.max(0, Math.ceil((fb.until - now) / 1000)) : 0;
  const showFb = fb && now - fb.at < 6000 && !mine;

  return (
    <Fade style={styles.backdrop}>
      <Appear style={styles.window}>
        <View style={styles.header}>
          <Text style={styles.title}>🏁 Corrida da turma · {MODE_LABEL[race.mode]}</Text>
          <Text style={styles.timer}>{!started ? 'preparar…' : ended ? 'fim!' : `⏱ ${mmss(race.endAt - now)}`}</Text>
          {!ended ? <Btn small title="➖ Minimizar" onPress={() => setState({ raceOpen: false })} /> : null}
        </View>

        <View style={styles.body}>
          <View style={{ flex: 1, minWidth: 0 }}>
            {!started ? (
              <Countdown n={Math.ceil(toStart / 1000)} title={task.title} prompt={task.prompt} />
            ) : mine || ended ? (
              <View style={styles.done}>
                <Text style={{ fontSize: 76 }}>{mine ? (MEDAL[mine.place - 1] ?? '🏁') : '⌛'}</Text>
                <Text style={styles.doneTitle}>{mine ? `Você terminou em ${mine.place}º lugar!` : 'A corrida acabou.'}</Text>
                {mine ? (
                  <Text style={styles.doneText}>
                    Tempo {mmss(mine.timeMs)} · +{mine.xp} XP · +{mine.coins} 🪙
                  </Text>
                ) : (
                  <Text style={styles.doneText}>Não deu desta vez. Revise com os Mestres e tente na próxima!</Text>
                )}
                {ended ? <Btn big primary title="Voltar ao jogo" onPress={actions.closeRace} /> : <Text style={styles.doneText}>Aguardando os colegas…</Text>}
              </View>
            ) : (
              <View style={{ flex: 1 }}>
                <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 18 }}>
                  {task.mode === 'blocks' ? (
                    <BuildView
                      key={task.id}
                      p={{ kind: 'build', prompt: task.prompt, target: task.target, blocks: task.blocks, styles: {} } satisfies BuildPayload}
                      submit={(a) => actions.raceSubmit(a)}
                      locked={false}
                      wait={wait}
                    />
                  ) : (
                    <CodeTaskEditor key={task.id} task={task} onSubmit={actions.raceSubmit} wait={wait} />
                  )}
                </ScrollView>
                {showFb ? <WrongFeedback msg={fb.msg} wait={wait} /> : null}
              </View>
            )}
          </View>

          {/* ranking ao vivo */}
          <View style={styles.rank}>
            <Text style={styles.rankTitle}>🏆 Chegada</Text>
            <Text style={styles.rankSub}>
              {rs?.finishers.length ?? 0} de {rs?.players ?? '?'} terminaram
            </Text>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 6 }}>
              {(rs?.finishers ?? []).map((f) => (
                <View key={f.playerId} style={[styles.row, f.playerId === me && styles.rowMe]}>
                  <Text style={styles.place}>{MEDAL[f.place - 1] ?? `${f.place}º`}</Text>
                  <View style={[styles.dot, { backgroundColor: f.color }]} />
                  <Text style={styles.rname} numberOfLines={1}>
                    {f.name}
                  </Text>
                  <Text style={styles.rtime}>{mmss(f.timeMs)}</Text>
                </View>
              ))}
              {!rs?.finishers.length ? <Text style={styles.rankSub}>Ninguém chegou ainda. Seja o primeiro!</Text> : null}
            </ScrollView>
            <Text style={styles.prizes}>
              {[1, 2, 3, 4]
                .map((pl) => {
                  const pr = racePrize(race.taskId, pl);
                  return `${MEDAL[pl - 1] ?? 'quem terminar:'} +${pr.xp} XP +${pr.coins}🪙`;
                })
                .join(' · ')}
            </Text>
          </View>
        </View>
      </Appear>
    </Fade>
  );
}

/** Botão flutuante quando a corrida está minimizada. */
export function RaceBadge() {
  const race = useStore((s) => s.race);
  const open = useStore((s) => s.raceOpen);
  const rs = useStore((s) => s.raceState);
  if (!race || open) return null;
  return (
    <View style={styles.badge}>
      <Btn
        variant="gold"
        title={rs?.ended ? '🏁 Ver resultado da corrida' : '🏁 Corrida em andamento! Entrar'}
        onPress={() => setState({ raceOpen: true })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(5,6,12,0.82)', alignItems: 'center', justifyContent: 'center', padding: 14 },
  window: {
    width: '100%',
    maxWidth: 1300,
    height: '100%',
    maxHeight: 900,
    backgroundColor: colors.panel,
    borderRadius: 22,
    borderWidth: 3,
    borderColor: '#1cb0f6',
    overflow: 'hidden',
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#0b4f73', paddingHorizontal: 20, paddingVertical: 10 },
  title: { flex: 1, color: '#fff', fontFamily: fonts.game, fontWeight: '900', fontSize: 20 },
  timer: { color: '#fff', fontFamily: fonts.display, fontSize: 26 },
  body: { flex: 1, flexDirection: 'row' },
  rank: { width: 270, backgroundColor: '#161a33', padding: 12, gap: 6, borderLeftWidth: 2, borderLeftColor: colors.line },
  rankTitle: { color: colors.gold, fontFamily: fonts.game, fontWeight: '900', fontSize: 18 },
  rankSub: { color: colors.muted, fontFamily: fonts.body, fontSize: 13 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.panel2, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 6 },
  rowMe: { borderWidth: 2, borderColor: colors.gold },
  place: { color: '#fff', fontFamily: fonts.game, fontWeight: '900', fontSize: 16, width: 30 },
  dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: '#fff' },
  rname: { flex: 1, color: colors.text, fontFamily: fonts.game, fontWeight: '900', fontSize: 14 },
  rtime: { color: colors.muted, fontFamily: fonts.code, fontSize: 12 },
  prizes: { color: colors.muted, fontFamily: fonts.body, fontSize: 11 },
  done: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 20 },
  doneTitle: { color: colors.text, fontFamily: fonts.display, fontSize: 32, textAlign: 'center' },
  doneText: { color: colors.muted, fontFamily: fonts.body, fontSize: 17, textAlign: 'center' },
  badge: { position: 'absolute', bottom: 150, alignSelf: 'center' },
});
