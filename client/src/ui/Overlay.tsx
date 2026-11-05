import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Appear, Fade } from './Appear';
import { Btn } from './Btn';
import { colors, ui } from './theme';

/** Janela sobre o mapa (fundo escurecido + painel rolável). */
export function Overlay(props: { title: string; onClose?: () => void; children: ReactNode; maxWidth?: number; header?: ReactNode }) {
  return (
    <Fade style={styles.backdrop}>
      <Appear style={[ui.panel, styles.panel, { maxWidth: props.maxWidth ?? 720 }]}>
        <View style={[ui.row, { justifyContent: 'space-between', marginBottom: 10, gap: 8 }]}>
          <Text style={[ui.title, { fontSize: 19, flexShrink: 1 }]}>{props.title}</Text>
          {props.onClose ? <Btn small title="✕ Fechar" onPress={props.onClose} /> : null}
        </View>
        {props.header}
        <ScrollView style={{ flexGrow: 0 }} contentContainerStyle={{ paddingBottom: 6 }}>
          {props.children}
        </ScrollView>
      </Appear>
    </Fade>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(5,6,10,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  panel: { width: '100%', maxHeight: '100%', borderColor: colors.accent },
});
