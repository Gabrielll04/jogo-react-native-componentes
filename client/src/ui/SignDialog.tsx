import { Text, View } from 'react-native';
import { COMPONENTS, MODULES } from '@shared/modules';
import { useStore } from '../state/store';
import { Overlay } from './Overlay';
import { colors, ui } from './theme';

/** Placa na porta do módulo: NPC que explica os componentes. */
export function SignDialog({ moduleId, onClose }: { moduleId: number; onClose: () => void }) {
  const mod = MODULES.find((m) => m.id === moduleId)!;
  const unlocked = useStore((s) => s.modules.find((m) => m.id === moduleId)?.unlocked);
  return (
    <Overlay title={`${mod.emoji} ${mod.name}`} onClose={onClose} maxWidth={560}>
      <Text style={[ui.text, { marginBottom: 12, lineHeight: 21 }]}>{mod.sign}</Text>
      {mod.components.map((c) => (
        <View key={c} style={[ui.row, { gap: 10, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.line }]}>
          <Text style={{ fontSize: 22 }}>{COMPONENTS[c]?.emoji}</Text>
          <Text style={[ui.text, { fontWeight: '800', width: 130 }]}>{c}</Text>
          <Text style={[ui.muted, { flex: 1 }]}>{COMPONENTS[c]?.use}</Text>
        </View>
      ))}
      <Text style={[ui.muted, { marginTop: 12 }]}>
        {unlocked
          ? `🔓 Porta aberta! Lá dentro há ${mod.stations.length - 1} estações e o chefe ${mod.stations.find((s) => s.type === 'boss_challenge')?.emoji}. Vença o chefe para ganhar as cartas.`
          : '🔒 Este módulo ainda está trancado. O professor vai liberar quando a turma chegar nesse conteúdo.'}
      </Text>
    </Overlay>
  );
}
