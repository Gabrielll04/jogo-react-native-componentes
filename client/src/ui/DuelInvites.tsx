/**
 * Convites de duelo: notificações no CANTO inferior direito.
 * Não abrem janela nem travam o jogo — o aluno continua andando e responde quando quiser.
 */
import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { MODE_LABEL } from '@shared/duels';
import type { DuelInvite } from '@shared/types';
import { actions } from '../net/socket';
import { setState, useStore } from '../state/store';
import { Btn } from './Btn';
import { colors, fonts } from './theme';

export function DuelInvites() {
  const invites = useStore((s) => s.duelInvites);
  if (!invites.length) return null;
  return (
    <View style={styles.stack} pointerEvents="box-none">
      {invites.slice(-3).map((inv) => (
        <InviteCard key={inv.duelId} inv={inv} />
      ))}
    </View>
  );
}

function InviteCard({ inv }: { inv: DuelInvite & { expiresAt: number } }) {
  const slide = useRef(new Animated.Value(1)).current;
  const timeLeft = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const remaining = Math.max(0, inv.expiresAt - Date.now());
    timeLeft.setValue(remaining / inv.expiresIn);
    Animated.spring(slide, { toValue: 0, friction: 7, useNativeDriver: false }).start();
    Animated.timing(timeLeft, { toValue: 0, duration: remaining, easing: Easing.linear, useNativeDriver: false }).start();
    // expira sozinho (o servidor também cancela)
    const t = setTimeout(() => setState((s) => ({ duelInvites: s.duelInvites.filter((x) => x.duelId !== inv.duelId) })), remaining);
    return () => clearTimeout(t);
  }, [inv.duelId]);

  return (
    <Animated.View style={[styles.card, { transform: [{ translateX: slide.interpolate({ inputRange: [0, 1], outputRange: [0, 380] }) }] }]}>
      <View style={styles.row}>
        <Text style={styles.swords}>⚔️</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>
            <Text style={{ color: inv.fromColor }}>●</Text> {inv.fromName} te desafiou!
          </Text>
          <Text style={styles.sub}>
            {MODE_LABEL[inv.mode]} · quem vencer leva até {inv.stake} 🪙 do outro
          </Text>
        </View>
      </View>
      <View style={styles.bar}>
        <Animated.View style={[styles.barFill, { width: timeLeft.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
      </View>
      <View style={[styles.row, { gap: 8 }]}>
        <Btn small primary title="✔ Aceitar" onPress={() => actions.duelRespond(inv.duelId, true)} style={{ flex: 1 }} />
        <Btn small variant="danger" title="✕ Recusar" onPress={() => actions.duelRespond(inv.duelId, false)} style={{ flex: 1 }} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  stack: { position: 'absolute', right: 14, bottom: 14, gap: 10, width: 340, zIndex: 50 },
  card: {
    backgroundColor: 'rgba(28,32,51,0.97)',
    borderRadius: 16,
    padding: 12,
    gap: 10,
    borderWidth: 3,
    borderColor: colors.gold,
    borderBottomWidth: 6,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  swords: { fontSize: 30 },
  title: { color: colors.text, fontFamily: fonts.game, fontWeight: '900', fontSize: 16 },
  sub: { color: colors.muted, fontFamily: fonts.body, fontSize: 12, fontWeight: '700' },
  bar: { height: 6, backgroundColor: '#0d0f1c', borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: colors.gold },
});
