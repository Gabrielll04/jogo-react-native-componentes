import { Text, View } from 'react-native';
import { COMPONENTS, MODULES } from '@shared/modules';
import { colors, fonts } from './theme';

/** Carta colecionável de componente (inventário e recompensa das lições). */
export function CompCard({ name, locked, size = 'md' }: { name: string; locked?: boolean; size?: 'md' | 'lg' }) {
  const c = COMPONENTS[name];
  const mod = MODULES.find((m) => m.id === c?.module);
  const lg = size === 'lg';
  const w = lg ? 190 : 132;
  if (locked) {
    return (
      <View style={{ width: w, height: lg ? 250 : 170, borderRadius: 14, borderWidth: 2, borderStyle: 'dashed', borderColor: colors.line, alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#161a2c' }}>
        <Text style={{ fontSize: 30, opacity: 0.4 }}>❔</Text>
        <Text style={{ color: colors.muted, fontFamily: fonts.game, fontWeight: '900', fontSize: 12 }}>Módulo {c?.module}</Text>
      </View>
    );
  }
  return (
    <View
      style={{
        width: w,
        height: lg ? 250 : 170,
        borderRadius: 14,
        padding: 4,
        backgroundColor: mod?.color ?? colors.accent,
        borderBottomWidth: 5,
        borderBottomColor: 'rgba(0,0,0,0.35)',
      }}
    >
      <View style={{ flex: 1, backgroundColor: '#fdfbf4', borderRadius: 11, padding: lg ? 12 : 8, alignItems: 'center', gap: lg ? 8 : 4 }}>
        <Text style={{ fontFamily: fonts.code, fontWeight: '700', fontSize: lg ? 17 : 13, color: '#1d2340' }}>{`<${name}>`}</Text>
        <View style={{ width: lg ? 84 : 54, height: lg ? 84 : 54, borderRadius: 40, backgroundColor: (mod?.color ?? '#999') + '33', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: lg ? 46 : 28 }}>{c?.emoji}</Text>
        </View>
        <Text style={{ fontFamily: fonts.body, fontSize: lg ? 14 : 11, color: '#4a5070', textAlign: 'center', lineHeight: lg ? 19 : 14 }}>{c?.use}</Text>
        <Text style={{ marginTop: 'auto', fontFamily: fonts.game, fontWeight: '900', fontSize: lg ? 12 : 10, color: mod?.color }}>{mod?.emoji} {mod?.name}</Text>
      </View>
    </View>
  );
}
