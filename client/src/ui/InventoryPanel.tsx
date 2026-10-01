import { StyleSheet, Text, View } from 'react-native';
import { COMPONENTS, MODULES } from '@shared/modules';
import { useStore } from '../state/store';
import { Overlay } from './Overlay';
import { colors, ui } from './theme';

/** Inventário: cartas de componentes, insígnias de módulo e conquistas. */
export function InventoryPanel({ onClose }: { onClose: () => void }) {
  const p = useStore((s) => s.progress);
  const catalog = useStore((s) => s.achievementsCatalog);
  if (!p) return null;
  const stationsDone = Object.keys(p.completed).length;
  const stationsTotal = MODULES.reduce((n, m) => n + m.stations.length, 0);

  return (
    <Overlay title="🎒 Inventário" onClose={onClose} maxWidth={860}>
      <Text style={ui.muted}>
        ⭐ {p.xp} XP · 🪙 {p.coins} moedas · 🤝 {p.coopPoints} cooperação · ✅ {stationsDone}/{stationsTotal} desafios ·{' '}
        🎯 {p.totalCorrect}/{p.totalAttempts} respostas certas
      </Text>

      <Text style={[ui.h2, { marginTop: 16 }]}>Insígnias de módulo</Text>
      <View style={styles.wrap}>
        {MODULES.map((m) => {
          const done = p.modulesCompleted.includes(m.id);
          return (
            <View key={m.id} style={[styles.badge, { borderColor: done ? m.color : colors.line, opacity: done ? 1 : 0.4 }]}>
              <Text style={{ fontSize: 26 }}>{done ? m.emoji : '❔'}</Text>
              <Text style={[ui.muted, { fontSize: 11, textAlign: 'center' }]}>{m.name}</Text>
            </View>
          );
        })}
      </View>

      <Text style={[ui.h2, { marginTop: 16 }]}>Cartas de componentes ({p.cards.length}/{Object.keys(COMPONENTS).length})</Text>
      <Text style={[ui.muted, { marginBottom: 8 }]}>Derrote o chefe de cada módulo para ganhar as cartas dos componentes.</Text>
      <View style={styles.wrap}>
        {Object.entries(COMPONENTS).map(([name, c]) => {
          const has = p.cards.includes(name);
          const mod = MODULES.find((m) => m.id === c.module)!;
          return (
            <View key={name} style={[styles.card, has ? { borderColor: mod.color, backgroundColor: '#262a3d' } : styles.cardLocked]}>
              <Text style={{ fontSize: 26 }}>{has ? c.emoji : '🂠'}</Text>
              <Text style={[ui.text, { fontWeight: '800', fontSize: 13 }]}>{has ? name : '???'}</Text>
              <Text style={[ui.muted, { fontSize: 11, textAlign: 'center' }]}>{has ? c.use : `Módulo ${c.module}`}</Text>
            </View>
          );
        })}
      </View>

      <Text style={[ui.h2, { marginTop: 16 }]}>Conquistas</Text>
      {Object.entries(catalog).map(([id, a]) => {
        const has = p.achievements.includes(id);
        return (
          <Text key={id} style={[ui.text, { opacity: has ? 1 : 0.35, paddingVertical: 2 }]}>
            {has ? a.emoji : '🔒'} {a.title}
          </Text>
        );
      })}
    </Overlay>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  badge: { width: 120, borderWidth: 2, borderRadius: 12, padding: 8, alignItems: 'center', gap: 4 },
  card: { width: 128, minHeight: 120, borderWidth: 2, borderRadius: 12, padding: 8, alignItems: 'center', gap: 4 },
  cardLocked: { borderColor: colors.line, borderStyle: 'dashed', opacity: 0.55 },
});
