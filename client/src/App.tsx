import { StyleSheet, Text, View } from 'react-native';
import { ConnectScreen } from './screens/ConnectScreen';
import { LobbyScreen } from './screens/LobbyScreen';
import { WorldScreen } from './screens/WorldScreen';
import { useStore } from './state/store';
import { Appear } from './ui/Appear';
import { colors } from './ui/theme';

/** Navegação simples por estado: conexão -> lobby -> mundo. */
export default function App() {
  const screen = useStore((s) => s.screen);
  return (
    <View style={styles.root}>
      {screen === 'connect' ? <ConnectScreen /> : null}
      {screen === 'lobby' ? <LobbyScreen /> : null}
      {screen === 'world' ? <WorldScreen /> : null}
      <Toasts />
    </View>
  );
}

function Toasts() {
  const toasts = useStore((s) => s.toasts);
  return (
    <View style={styles.toasts} pointerEvents="none">
      {toasts.map((t) => (
        <Appear
          key={t.id}
          style={[styles.toast, { borderColor: t.kind === 'success' ? colors.ok : t.kind === 'warn' ? colors.warn : colors.accent }]}
        >
          <Text style={{ color: colors.text, fontWeight: '600' }}>{t.text}</Text>
        </Appear>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  toasts: { position: 'absolute', top: 132, left: 0, right: 0, alignItems: 'center', gap: 6 },
  toast: {
    backgroundColor: 'rgba(18,20,28,0.95)',
    borderWidth: 2,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    paddingVertical: 8,
    paddingHorizontal: 14,
    maxWidth: 560,
  },
});
