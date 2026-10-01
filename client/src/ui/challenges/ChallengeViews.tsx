/**
 * Um componente por tipo de desafio. Todos são feitos com componentes RN.
 * As respostas são enviadas ao servidor, que corrige (o cliente não tem gabarito).
 */
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { COMPONENTS } from '@shared/modules';
import type { BugPayload, BuildPayload, ChallengeAnswer, MatchPayload, QuizPayload } from '@shared/types';
import { Blueprint } from '../blueprints';
import { Btn } from '../Btn';
import { Demo } from '../demos';
import { colors, ui } from '../theme';

type Submit = (a: ChallengeAnswer) => void;

// ------------------------------------------------------------ A) quiz_component

export function QuizView({ p, submit, locked }: { p: QuizPayload; submit: Submit; locked: boolean }) {
  return (
    <View style={{ gap: 14 }}>
      <Text style={styles.prompt}>{p.prompt}</Text>
      {p.demo ? (
        <View style={styles.demoBox}>
          <Text style={[ui.muted, { marginBottom: 8 }]}>▶ Demonstração ao vivo — interaja com ela!</Text>
          <Demo id={p.demo} />
        </View>
      ) : null}
      {p.code ? <Text style={ui.code}>{p.code}</Text> : null}
      <View style={styles.options}>
        {p.options.map((o) => (
          <Pressable
            key={o}
            disabled={locked}
            onPress={() => submit(o)}
            style={({ hovered, pressed }: { hovered?: boolean; pressed: boolean }) => [
              styles.option,
              hovered && { borderColor: colors.accent, backgroundColor: '#2c3352' },
              pressed && { transform: [{ scale: 0.97 }] },
            ]}
          >
            <Text style={{ fontSize: 22 }}>{COMPONENTS[o]?.emoji ?? '🧩'}</Text>
            <Text style={styles.optionText}>{o}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

// ------------------------------------------------------------ D) fix_bug

export function BugView({ p, submit, locked }: { p: BugPayload; submit: Submit; locked: boolean }) {
  const [sel, setSel] = useState<string | null>(null);
  return (
    <View style={{ gap: 12 }}>
      <Text style={styles.prompt}>{p.prompt}</Text>
      <View>
        <Text style={[ui.muted, { marginBottom: 4 }]}>🐞 Código com bug:</Text>
        <Text style={[ui.code, { borderWidth: 2, borderColor: colors.bad }]}>{p.code}</Text>
      </View>
      {p.demo ? <Demo id={p.demo} /> : null}
      <Text style={ui.muted}>Escolha a correção:</Text>
      <View style={{ gap: 8 }}>
        {p.options.map((o) => (
          <Pressable
            key={o.id}
            onPress={() => setSel(o.id)}
            style={[styles.codeOption, sel === o.id && { borderColor: colors.accent, backgroundColor: '#17324a' }]}
          >
            <Text style={[ui.code, { backgroundColor: 'transparent', padding: 0 }]}>{o.code}</Text>
          </Pressable>
        ))}
      </View>
      <Btn primary title="🔧 Aplicar correção" disabled={!sel || locked} onPress={() => sel && submit(sel)} />
    </View>
  );
}

// ------------------------------------------------------------ B) match_use

const PAIR_COLORS = ['#ff7043', '#42a5f5', '#66bb6a', '#ab47bc', '#ffca28', '#26c6da'];

export function MatchView({ p, submit, locked }: { p: MatchPayload; submit: Submit; locked: boolean }) {
  const [links, setLinks] = useState<Record<string, string>>({});
  const [selLeft, setSelLeft] = useState<string | null>(null);

  const colorOfLeft = (id: string) => PAIR_COLORS[p.left.findIndex((l) => l.id === id) % PAIR_COLORS.length];
  const leftOfRight = (rid: string) => Object.keys(links).find((l) => links[l] === rid);

  const pickRight = (rid: string) => {
    if (!selLeft) return;
    const next = { ...links };
    // cada uso só pode ter um componente
    for (const l of Object.keys(next)) if (next[l] === rid) delete next[l];
    next[selLeft] = rid;
    setLinks(next);
    setSelLeft(null);
  };

  const complete = p.left.every((l) => links[l.id]);
  return (
    <View style={{ gap: 12 }}>
      <Text style={styles.prompt}>{p.prompt}</Text>
      <View style={{ flexDirection: 'row', gap: 16, flexWrap: 'wrap' }}>
        <View style={{ flex: 1, minWidth: 200, gap: 8 }}>
          {p.left.map((l) => {
            const linked = Boolean(links[l.id]);
            return (
              <Pressable
                key={l.id}
                onPress={() => setSelLeft(l.id)}
                style={[
                  styles.matchItem,
                  linked && { borderColor: colorOfLeft(l.id), borderWidth: 3 },
                  selLeft === l.id && { backgroundColor: '#2c3352', borderColor: colors.accent, borderWidth: 3 },
                ]}
              >
                <Text style={{ fontSize: 20 }}>{COMPONENTS[l.label]?.emoji}</Text>
                <Text style={styles.optionText}>{l.label}</Text>
                {linked ? <View style={[styles.pairDot, { backgroundColor: colorOfLeft(l.id) }]} /> : null}
              </Pressable>
            );
          })}
        </View>
        <View style={{ flex: 1.4, minWidth: 240, gap: 8 }}>
          {p.right.map((r) => {
            const owner = leftOfRight(r.id);
            return (
              <Pressable
                key={r.id}
                onPress={() => pickRight(r.id)}
                style={[styles.matchItem, owner && { borderColor: colorOfLeft(owner), borderWidth: 3 }, !selLeft && { opacity: 0.85 }]}
              >
                {owner ? <View style={[styles.pairDot, { backgroundColor: colorOfLeft(owner) }]} /> : null}
                <Text style={ui.text}>{r.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      <Text style={ui.muted}>{selLeft ? '👉 Agora toque no uso correto à direita.' : '👈 Toque em um componente à esquerda.'}</Text>
      <Btn primary title="✔ Verificar ligações" disabled={!complete || locked} onPress={() => submit(links)} />
    </View>
  );
}

// ------------------------------------------------------------ C) build_ui

export function BuildView({ p, submit, locked }: { p: BuildPayload; submit: Submit; locked: boolean }) {
  const [assign, setAssign] = useState<Record<string, string>>({});
  const [slot, setSlot] = useState<string>(p.slots[0]?.id);

  const place = (comp: string) => {
    const next = { ...assign, [slot]: comp };
    setAssign(next);
    // avança para a próxima parte vazia
    const empty = p.slots.find((s) => !next[s.id]);
    if (empty) setSlot(empty.id);
  };

  const complete = p.slots.every((s) => assign[s.id]);
  return (
    <View style={{ gap: 12 }}>
      <Text style={styles.prompt}>{p.prompt}</Text>
      <View style={{ flexDirection: 'row', gap: 18, flexWrap: 'wrap' }}>
        <View style={{ flex: 1, minWidth: 280, gap: 10 }}>
          <Text style={ui.muted}>1) Escolha uma parte da tela:</Text>
          {p.slots.map((s) => (
            <Pressable
              key={s.id}
              onPress={() => setSlot(s.id)}
              style={[styles.slot, slot === s.id && { borderColor: colors.accent, backgroundColor: '#2c3352' }]}
            >
              <Text style={[ui.text, { flex: 1 }]}>{s.label}</Text>
              <Text style={[styles.slotValue, !assign[s.id] && { color: colors.muted }]}>
                {assign[s.id] ? `<${assign[s.id]}>` : 'vazio'}
              </Text>
            </Pressable>
          ))}
          <Text style={ui.muted}>2) Escolha o componente para essa parte:</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {p.palette.map((c) => (
              <Pressable
                key={c}
                onPress={() => place(c)}
                style={({ hovered }: { hovered?: boolean }) => [styles.card, hovered && { borderColor: colors.accent }]}
              >
                <Text style={{ fontSize: 22 }}>{COMPONENTS[c]?.emoji}</Text>
                <Text style={[ui.text, { fontWeight: '800', fontSize: 12 }]}>{c}</Text>
              </Pressable>
            ))}
          </View>
          <Btn primary title="📱 Testar minha tela" disabled={!complete || locked} onPress={() => submit(assign)} />
        </View>
        <View style={{ alignItems: 'center', gap: 6 }}>
          <Text style={ui.muted}>Prévia ao vivo (componentes reais):</Text>
          <Blueprint id={p.blueprint} assign={assign} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  prompt: { color: colors.text, fontSize: 17, fontWeight: '700', lineHeight: 24 },
  demoBox: { backgroundColor: '#161925', borderRadius: 12, padding: 12, alignItems: 'center' },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  option: {
    flexGrow: 1,
    flexBasis: 180,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.panel2,
  },
  optionText: { color: colors.text, fontSize: 16, fontWeight: '800', fontFamily: 'ui-monospace, Menlo, Consolas, monospace' },
  codeOption: { borderWidth: 2, borderColor: colors.line, borderRadius: 10, padding: 10, backgroundColor: '#0d0f16' },
  matchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.panel2,
    minHeight: 50,
  },
  pairDot: { width: 14, height: 14, borderRadius: 7, marginLeft: 'auto' },
  slot: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.panel2,
    gap: 8,
  },
  slotValue: { color: colors.accent, fontWeight: '800', fontFamily: 'ui-monospace, Menlo, Consolas, monospace' },
  card: {
    width: 96,
    alignItems: 'center',
    padding: 8,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: '#2a2f47',
    gap: 2,
  },
});
