import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { EMOTES, TEAMS } from '@shared/events';
import { MODULES } from '@shared/modules';
import { actions } from '../net/socket';
import { useStore } from '../state/store';
import { Btn } from '../ui/Btn';
import { colors, ui } from '../ui/theme';

export function LobbyScreen() {
  const players = useStore((s) => s.players);
  const me = useStore((s) => s.playerId);
  const connected = useStore((s) => s.connected);
  const modules = useStore((s) => s.modules);
  const teamTotals = useStore((s) => s.teamTotals);
  const emotes = useStore((s) => s.emotes);
  const progress = useStore((s) => s.progress);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={styles.wrap}>
      <View style={[ui.row, { justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }]}>
        <View>
          <Text style={ui.title}>🏰 Lobby</Text>
          <Text style={ui.muted}>
            Olá, {progress?.name}! Nível {Math.floor((progress?.xp ?? 0) / 100) + 1} · {progress?.xp ?? 0} XP · 🪙 {progress?.coins ?? 0}
          </Text>
        </View>
        <View style={[ui.row, { gap: 8 }]}>
          <View style={[styles.dot, { backgroundColor: connected ? colors.ok : colors.bad }]} />
          <Text style={ui.muted}>{connected ? 'Conectado ao servidor' : 'Desconectado'}</Text>
        </View>
      </View>

      <View style={styles.grid}>
        <View style={[ui.panel, styles.col]}>
          <Text style={ui.h2}>Jogadores conectados ({players.length})</Text>
          {players.map((p) => {
            const team = TEAMS.find((t) => t.id === p.team);
            const em = emotes[p.id];
            const showEmote = em && Date.now() - em.at < 4000;
            return (
              <View key={p.id} style={styles.player}>
                <View style={[styles.avatar, { backgroundColor: p.color }]} />
                <Text style={[ui.text, { fontWeight: p.id === me ? '800' : '500' }]}>
                  {p.name}
                  {p.id === me ? ' (você)' : ''}
                </Text>
                <View style={[ui.chip, { backgroundColor: team?.color }]}>
                  <Text style={{ color: '#fff', fontSize: 11 }}>{team?.name}</Text>
                </View>
                <Text style={ui.muted}>nv {p.level}</Text>
                <Text style={[ui.muted, { marginLeft: 'auto' }]}>{p.inWorld ? '🗺️ no mundo' : '🏰 no lobby'}</Text>
                {showEmote ? <Text style={{ fontSize: 20 }}>{em.emote}</Text> : null}
              </View>
            );
          })}
          <Text style={[ui.muted, { marginTop: 12 }]}>Emotes:</Text>
          <View style={[ui.row, { gap: 6, marginTop: 6, flexWrap: 'wrap' }]}>
            {EMOTES.map((e) => (
              <Btn key={e} title={e} small onPress={() => actions.emote(e)} />
            ))}
          </View>
        </View>

        <View style={[styles.col, { gap: 16 }]}>
          <View style={ui.panel}>
            <Text style={ui.h2}>Módulos</Text>
            {MODULES.map((m) => {
              const open = modules.find((x) => x.id === m.id)?.unlocked;
              const done = progress?.modulesCompleted.includes(m.id);
              return (
                <View key={m.id} style={[ui.row, { gap: 8, paddingVertical: 4 }]}>
                  <Text style={{ fontSize: 18 }}>{open ? '🔓' : '🔒'}</Text>
                  <Text style={[ui.text, !open && { color: colors.muted }]}>
                    {m.emoji} {m.id}. {m.name}
                  </Text>
                  {done ? <Text>🏆</Text> : null}
                </View>
              );
            })}
          </View>
          <View style={ui.panel}>
            <Text style={ui.h2}>Placar das equipes</Text>
            {TEAMS.map((t) => (
              <View key={t.id} style={[ui.row, { gap: 8, paddingVertical: 3 }]}>
                <View style={[styles.dot, { backgroundColor: t.color, width: 12, height: 12 }]} />
                <Text style={ui.text}>{t.name}</Text>
                <Text style={[ui.muted, { marginLeft: 'auto' }]}>{teamTotals[t.id] ?? 0} XP</Text>
              </View>
            ))}
          </View>
          <Btn title="Entrar no mundo ▶" primary onPress={actions.enterWorld} style={{ paddingVertical: 16 }} />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 24, maxWidth: 1100, width: '100%', alignSelf: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  col: { flexGrow: 1, flexBasis: 380 },
  dot: { width: 10, height: 10, borderRadius: 6 },
  player: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  avatar: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#fff' },
});
