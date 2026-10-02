/**
 * Tipos de desafio (feitos com componentes RN). As respostas vão para o
 * servidor, que corrige — o cliente não tem gabarito.
 * O "Monte a tela" fica em BuildView.tsx.
 */
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { COMPONENTS } from '@shared/modules';
import type { BugPayload, ChallengeAnswer, MatchPayload, QuizPayload } from '@shared/types';
import { playSound } from '../../audio/sound';
import { Btn } from '../Btn';
import { CodeView } from '../CodeView';
import { Demo } from '../demos';
import { colors, fonts } from '../theme';

export { BuildView } from './BuildView';

type Submit = (a: ChallengeAnswer) => void;

// ------------------------------------------------------------ A) quiz_component

export function QuizView({ p, submit, locked }: { p: QuizPayload; submit: Submit; locked: boolean }) {
  return (
    <View style={styles.cols}>
      {p.demo ? (
        <View style={styles.demoBox}>
          <Text style={styles.demoLabel}>▶ DEMONSTRAÇÃO AO VIVO — interaja!</Text>
          <Demo id={p.demo} />
        </View>
      ) : null}
      <View style={{ flex: 1, minWidth: 320, gap: 16 }}>
        <Text style={styles.prompt}>{p.prompt}</Text>
        {p.code ? <CodeView code={p.code} /> : null}
        <View style={styles.grid}>
          {p.options.map((o) => (
            <Pressable
              key={o}
              disabled={locked}
              onPress={() => {
                playSound('click');
                submit(o);
              }}
              style={({ hovered, pressed }: { hovered?: boolean; pressed: boolean }) => [
                styles.bigOption,
                hovered && { borderColor: colors.accent },
                pressed && { borderBottomWidth: 2, marginTop: 3 },
              ]}
            >
              <Text style={{ fontSize: 30 }}>{COMPONENTS[o]?.emoji ?? '🧩'}</Text>
              <Text style={styles.optionCode}>{`<${o}>`}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}

// ------------------------------------------------------------ D) fix_bug

export function BugView({ p, submit, locked }: { p: BugPayload; submit: Submit; locked: boolean }) {
  const [sel, setSel] = useState<string | null>(null);
  const nLines = p.code.split('\n').length;
  return (
    <View style={styles.cols}>
      <View style={{ flex: 1, minWidth: 340, gap: 12 }}>
        <Text style={styles.prompt}>{p.prompt}</Text>
        <CodeView code={p.code} title="App.js — 🐞 com bug" highlight={Array.from({ length: nLines }, (_, i) => i + 1)} />
        <View style={styles.console}>
          <Text style={styles.consoleTitle}>⛔ Console</Text>
          <Text style={styles.consoleText}>O app não funciona como deveria. Encontre a correção!</Text>
        </View>
        {p.demo ? <Demo id={p.demo} /> : null}
      </View>
      <View style={{ flex: 1, minWidth: 340, gap: 10 }}>
        <Text style={styles.colTitle}>🔧 Qual correção resolve?</Text>
        {p.options.map((o, i) => (
          <Pressable key={o.id} onPress={() => setSel(o.id)} style={[styles.fix, sel === o.id && styles.fixOn]}>
            <Text style={[styles.fixLetter, sel === o.id && { backgroundColor: colors.accent, color: '#0b1020' }]}>{String.fromCharCode(65 + i)}</Text>
            <View style={{ flex: 1 }}>
              <CodeView code={o.code} title={`correção ${String.fromCharCode(65 + i)}`} />
            </View>
          </Pressable>
        ))}
        <Btn big primary title="🔧 Aplicar correção" disabled={!sel || locked} onPress={() => sel && submit(sel)} />
      </View>
    </View>
  );
}

// ------------------------------------------------------------ B) match_use

const PAIR_COLORS = ['#ff9600', '#1cb0f6', '#58cc02', '#a368fc', '#ff4b4b', '#ffc800'];

export function MatchView({ p, submit, locked }: { p: MatchPayload; submit: Submit; locked: boolean }) {
  const [links, setLinks] = useState<Record<string, string>>({});
  const [selLeft, setSelLeft] = useState<string | null>(null);
  const colorOfLeft = (id: string) => PAIR_COLORS[p.left.findIndex((l) => l.id === id) % PAIR_COLORS.length];
  const leftOfRight = (rid: string) => Object.keys(links).find((l) => links[l] === rid);

  const pickRight = (rid: string) => {
    if (!selLeft) return;
    playSound('click');
    const next = { ...links };
    for (const l of Object.keys(next)) if (next[l] === rid) delete next[l];
    next[selLeft] = rid;
    setLinks(next);
    // seleciona automaticamente o próximo componente sem par
    setSelLeft(p.left.find((l) => !next[l.id])?.id ?? null);
  };

  const complete = p.left.every((l) => links[l.id]);
  return (
    <View style={{ gap: 14 }}>
      <Text style={styles.prompt}>{p.prompt}</Text>
      <Text style={styles.hintLine}>{selLeft ? '👉 Agora clique no USO correto à direita' : '👈 Clique em um COMPONENTE à esquerda'}</Text>
      <View style={{ flexDirection: 'row', gap: 22, flexWrap: 'wrap' }}>
        <View style={{ flex: 1, minWidth: 220, gap: 10 }}>
          {p.left.map((l) => {
            const linked = links[l.id];
            const c = colorOfLeft(l.id);
            return (
              <Pressable
                key={l.id}
                onPress={() => setSelLeft(l.id)}
                style={[styles.matchItem, linked && { borderColor: c, backgroundColor: c + '22' }, selLeft === l.id && styles.matchSel]}
              >
                <Text style={{ fontSize: 26 }}>{COMPONENTS[l.label]?.emoji}</Text>
                <Text style={styles.optionCode}>{`<${l.label}>`}</Text>
                {linked ? <View style={[styles.pairDot, { backgroundColor: c }]} /> : null}
              </Pressable>
            );
          })}
        </View>
        <View style={{ flex: 1.5, minWidth: 260, gap: 10 }}>
          {p.right.map((r) => {
            const owner = leftOfRight(r.id);
            const c = owner ? colorOfLeft(owner) : undefined;
            return (
              <Pressable key={r.id} onPress={() => pickRight(r.id)} style={[styles.matchItem, c ? { borderColor: c, backgroundColor: c + '22' } : null]}>
                {c ? <View style={[styles.pairDot, { backgroundColor: c, marginLeft: 0 }]} /> : <View style={[styles.pairDot, { backgroundColor: colors.line, marginLeft: 0 }]} />}
                <Text style={styles.useText}>{r.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      <Btn big primary title="✔ Verificar ligações" disabled={!complete || locked} onPress={() => submit(links)} />
    </View>
  );
}

const styles = StyleSheet.create({
  cols: { flexDirection: 'row', flexWrap: 'wrap', gap: 20, alignItems: 'flex-start' },
  prompt: { color: colors.text, fontSize: 20, fontFamily: fonts.body, fontWeight: '800', lineHeight: 28 },
  colTitle: { color: colors.text, fontFamily: fonts.game, fontWeight: '900', fontSize: 18 },
  hintLine: { color: colors.gold, fontFamily: fonts.body, fontWeight: '700', fontSize: 15 },
  demoBox: { backgroundColor: '#181c33', borderRadius: 18, padding: 14, alignItems: 'center', gap: 10, borderWidth: 2, borderColor: '#2b3263' },
  demoLabel: { color: colors.accent, fontFamily: fonts.game, fontWeight: '900', fontSize: 14, letterSpacing: 0.5 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  bigOption: {
    flexGrow: 1,
    flexBasis: 200,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.line,
    borderBottomWidth: 5,
    backgroundColor: colors.panel2,
  },
  optionCode: { color: colors.codeTag, fontSize: 18, fontWeight: '800', fontFamily: fonts.code },
  console: { backgroundColor: '#2a0f14', borderRadius: 12, padding: 12, borderLeftWidth: 4, borderLeftColor: colors.bad },
  consoleTitle: { color: '#ff8a8a', fontFamily: fonts.code, fontWeight: '700' },
  consoleText: { color: '#ffd0d0', fontFamily: fonts.code, fontSize: 13 },
  fix: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', borderRadius: 16, padding: 6, borderWidth: 3, borderColor: 'transparent' },
  fixOn: { borderColor: colors.accent, backgroundColor: 'rgba(97,218,251,0.08)' },
  fixLetter: {
    width: 32,
    height: 32,
    borderRadius: 16,
    textAlign: 'center',
    lineHeight: 32,
    backgroundColor: colors.panel3,
    color: colors.text,
    fontFamily: fonts.game, fontWeight: '900',
    fontSize: 16,
    marginTop: 8,
  },
  matchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 3,
    borderColor: colors.line,
    borderBottomWidth: 5,
    backgroundColor: colors.panel2,
    minHeight: 60,
  },
  matchSel: { borderColor: colors.gold, backgroundColor: '#3a3420' },
  useText: { color: colors.text, fontFamily: fonts.body, fontSize: 16, fontWeight: '700', flex: 1 },
  pairDot: { width: 16, height: 16, borderRadius: 8, marginLeft: 'auto' },
});
