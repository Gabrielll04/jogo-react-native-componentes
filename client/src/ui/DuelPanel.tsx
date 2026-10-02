/** Painel "⚔️ Duelo": escolher o modo e o colega a desafiar. */
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { DUEL_STAKE, type DuelMode } from '@shared/duels';
import { actions } from '../net/socket';
import { useStore } from '../state/store';
import { Btn } from './Btn';
import { Overlay } from './Overlay';
import { colors, fonts } from './theme';

const MODES: { id: DuelMode; emoji: string; title: string; desc: string }[] = [
  { id: 'blocks', emoji: '🧱', title: 'Blocos', desc: 'Quem recria a tela mais rápido usando os bloquinhos de JSX.' },
  { id: 'code', emoji: '⌨️', title: 'Código', desc: 'Quem escreve primeiro um componente simples, como "Crie um App que mostra Hello World".' },
];

export function DuelPanel({ onClose, preselect }: { onClose: () => void; preselect?: string | null }) {
  const players = useStore((s) => s.players);
  const me = useStore((s) => s.playerId);
  const coins = useStore((s) => s.progress?.coins ?? 0);
  const [mode, setMode] = useState<DuelMode>('blocks');
  const [target, setTarget] = useState<string | null>(preselect ?? null);
  const others = players.filter((p) => p.id !== me && p.inWorld);

  return (
    <Overlay title="⚔️ Desafiar um colega" onClose={onClose} maxWidth={720}>
      <Text style={styles.rules}>
        Os dois recebem a <Text style={styles.b}>mesma tarefa sorteada</Text>. Quem acertar primeiro vence e leva até{' '}
        <Text style={styles.b}>{DUEL_STAKE} 🪙</Text> do outro (quem não tem moedas não perde nada). Você tem {coins} 🪙.
      </Text>

      <Text style={styles.h}>1. Escolha o modo</Text>
      <View style={styles.modes}>
        {MODES.map((m) => (
          <Pressable key={m.id} onPress={() => setMode(m.id)} style={[styles.mode, mode === m.id && styles.modeOn]}>
            <Text style={{ fontSize: 34 }}>{m.emoji}</Text>
            <Text style={[styles.modeTitle, mode === m.id && { color: '#1d2340' }]}>{m.title}</Text>
            <Text style={[styles.modeDesc, mode === m.id && { color: '#3b3f5c' }]}>{m.desc}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.h}>2. Escolha o adversário</Text>
      {others.length === 0 ? <Text style={styles.rules}>Ninguém no mapa agora. Chame um colega! 🙂</Text> : null}
      <View style={{ gap: 8 }}>
        {others.map((p) => (
          <Pressable
            key={p.id}
            disabled={p.dueling}
            onPress={() => setTarget(p.id)}
            style={[styles.player, target === p.id && styles.playerOn, p.dueling && { opacity: 0.5 }]}
          >
            <View style={[styles.dot, { backgroundColor: p.color }]} />
            <Text style={styles.pname}>{p.name}</Text>
            <Text style={styles.pinfo}>nv {p.level}</Text>
            <Text style={[styles.pinfo, { marginLeft: 'auto' }]}>{p.dueling ? '⚔️ duelando' : target === p.id ? '✔ escolhido' : ''}</Text>
          </Pressable>
        ))}
      </View>

      <Btn
        big
        variant="gold"
        title="⚔️ Enviar desafio"
        disabled={!target}
        onPress={() => {
          if (!target) return;
          actions.duelInvite(target, mode);
          onClose();
        }}
        style={{ marginTop: 16 }}
      />
    </Overlay>
  );
}

const styles = StyleSheet.create({
  rules: { color: colors.muted, fontFamily: fonts.body, fontSize: 14, lineHeight: 21 },
  b: { color: colors.gold, fontWeight: '900' },
  h: { color: colors.text, fontFamily: fonts.game, fontWeight: '900', fontSize: 16, marginTop: 16, marginBottom: 8 },
  modes: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  mode: {
    flex: 1,
    minWidth: 220,
    backgroundColor: colors.panel2,
    borderRadius: 16,
    padding: 14,
    gap: 4,
    borderWidth: 3,
    borderColor: colors.line,
    borderBottomWidth: 6,
  },
  modeOn: { backgroundColor: colors.gold, borderColor: '#c9a227' },
  modeTitle: { color: colors.text, fontFamily: fonts.game, fontWeight: '900', fontSize: 18 },
  modeDesc: { color: colors.muted, fontFamily: fonts.body, fontSize: 13 },
  player: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.panel2,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  playerOn: { borderColor: colors.gold },
  dot: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#fff' },
  pname: { color: colors.text, fontFamily: fonts.game, fontWeight: '900', fontSize: 16 },
  pinfo: { color: colors.muted, fontFamily: fonts.body, fontSize: 13, fontWeight: '700' },
});
