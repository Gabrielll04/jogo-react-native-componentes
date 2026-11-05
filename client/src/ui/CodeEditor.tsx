/**
 * Editor de código usado no laboratório, nos duelos/corrida e no "Monte a tela":
 * números de linha, Tab indenta, Ctrl+Enter envia e a linha com problema fica marcada.
 */
import { useRef, useState, type MutableRefObject } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, fonts } from './theme';

const LINE_H = 22;
const PAD = 12;

export function CodeEditor({
  value,
  onChange,
  title = 'App.js',
  minLines = 12,
  errorLine,
  problem,
  onSubmit,
  autoFocus,
  editorRef,
}: {
  value: string;
  onChange: (code: string) => void;
  title?: string;
  minLines?: number;
  errorLine?: number;
  /** mensagem do validador (aparece embaixo, como o painel de problemas de uma IDE) */
  problem?: string | null;
  onSubmit?: () => void;
  autoFocus?: boolean;
  /** permite inserir texto na posição do cursor por fora (botões de snippet) */
  editorRef?: MutableRefObject<{ insert: (text: string) => void } | null>;
}) {
  const sel = useRef({ start: value.length, end: value.length });
  const [forced, setForced] = useState<{ start: number; end: number } | undefined>();
  const lines = Math.max(minLines, value.split('\n').length + 1);

  const insert = (text: string) => {
    const { start, end } = sel.current;
    const next = value.slice(0, start) + text + value.slice(end);
    onChange(next);
    const at = start + text.length;
    sel.current = { start: at, end: at };
    setForced({ start: at, end: at });
  };

  if (editorRef) editorRef.current = { insert };

  return (
    <View style={styles.box}>
      <View style={styles.bar}>
        <View style={[styles.dot, { backgroundColor: '#ff5f57' }]} />
        <View style={[styles.dot, { backgroundColor: '#febc2e' }]} />
        <View style={[styles.dot, { backgroundColor: '#28c840' }]} />
        <Text style={styles.title}>{title}</Text>
      </View>
      <View style={{ flexDirection: 'row' }}>
        <View style={styles.gutter}>
          {Array.from({ length: lines }, (_, i) => (
            <Text key={i} style={[styles.num, errorLine === i + 1 && styles.numErr]}>
              {i + 1}
            </Text>
          ))}
        </View>
        <TextInput
          value={value}
          onChangeText={onChange}
          multiline
          autoFocus={autoFocus}
          autoCorrect={false}
          autoCapitalize="none"
          spellCheck={false}
          selection={forced}
          onSelectionChange={(e: { nativeEvent: { selection: { start: number; end: number } } }) => {
            sel.current = e.nativeEvent.selection;
            if (forced) setForced(undefined);
          }}
          onKeyPress={(e: { nativeEvent: { key: string; ctrlKey?: boolean; metaKey?: boolean }; preventDefault?: () => void }) => {
            const k = e.nativeEvent;
            if (k.key === 'Tab') {
              e.preventDefault?.();
              insert('  ');
            } else if (k.key === 'Enter' && (k.ctrlKey || k.metaKey) && onSubmit) {
              e.preventDefault?.();
              onSubmit();
            }
          }}
          style={[styles.input, { height: lines * LINE_H + PAD * 2 }]}
        />
      </View>
      {problem ? (
        <View style={styles.problem}>
          <Text style={styles.problemText} numberOfLines={3}>
            {problem}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { backgroundColor: colors.codeBg, borderRadius: 14, borderWidth: 2, borderColor: '#262c4d', overflow: 'hidden' },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#181c33' },
  dot: { width: 11, height: 11, borderRadius: 6 },
  title: { color: colors.muted, fontFamily: fonts.code, fontSize: 12, marginLeft: 8 },
  gutter: { paddingTop: PAD, paddingHorizontal: 8, backgroundColor: 'rgba(255,255,255,0.02)', borderRightWidth: 1, borderRightColor: '#23284a', minWidth: 38 },
  num: { color: '#4b5380', fontFamily: fonts.code, fontSize: 12, lineHeight: LINE_H, textAlign: 'right' },
  numErr: { color: '#ff6b6b', fontWeight: '800' },
  input: {
    flex: 1,
    color: '#e2e8f0',
    fontFamily: fonts.code,
    fontSize: 14,
    lineHeight: LINE_H,
    padding: PAD,
    outlineStyle: 'none',
    whiteSpace: 'pre',
    overflowX: 'auto',
  },
  problem: { backgroundColor: '#2a1418', borderTopWidth: 1, borderTopColor: '#5a2229', paddingHorizontal: 12, paddingVertical: 8 },
  problemText: { color: '#ffb4b4', fontFamily: fonts.code, fontSize: 12, lineHeight: 18 },
});
