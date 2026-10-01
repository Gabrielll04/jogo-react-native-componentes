import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

/** Moldura de celular para mostrar componentes funcionando "como no app". */
export function PhoneFrame({ children, notch = true, width = 270, height = 330, label }: {
  children: ReactNode;
  notch?: boolean;
  width?: number;
  height?: number;
  label?: string;
}) {
  return (
    <View style={{ alignItems: 'center', gap: 6 }}>
      <View style={[styles.phone, { width, height }]}>
        <View style={styles.screen}>{children}</View>
        {notch ? <View style={styles.notch} /> : null}
      </View>
      {label ? <Text style={{ color: '#9aa1bd', fontSize: 12 }}>{label}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  phone: {
    backgroundColor: '#0b0b0f',
    borderRadius: 30,
    padding: 9,
    borderWidth: 2,
    borderColor: '#3a3f55',
  },
  screen: { flex: 1, backgroundColor: '#ffffff', borderRadius: 22, overflow: 'hidden' },
  notch: {
    position: 'absolute',
    top: 9,
    alignSelf: 'center',
    left: '50%',
    marginLeft: -45,
    width: 90,
    height: 22,
    backgroundColor: '#0b0b0f',
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
  },
});
