import { StyleSheet } from 'react-native';

export const colors = {
  bg: '#12141c',
  panel: '#1e2130',
  panel2: '#262a3d',
  line: '#353a55',
  text: '#eef0f8',
  muted: '#9aa1bd',
  accent: '#61dafb', // azul do React
  ok: '#2fbf5b',
  bad: '#e5484d',
  warn: '#ffb020',
  gold: '#ffd54a',
};

export const ui = StyleSheet.create({
  panel: {
    backgroundColor: colors.panel,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 16,
  },
  title: { color: colors.text, fontSize: 22, fontWeight: '800' },
  h2: { color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: 8 },
  text: { color: colors.text, fontSize: 14 },
  muted: { color: colors.muted, fontSize: 13 },
  row: { flexDirection: 'row', alignItems: 'center' },
  btn: {
    backgroundColor: colors.panel2,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimary: { backgroundColor: '#1f8f4e', borderColor: '#2fbf5b' },
  btnText: { color: colors.text, fontWeight: '700', fontSize: 14 },
  code: {
    fontFamily: 'ui-monospace, Menlo, Consolas, monospace',
    color: '#e6e6e6',
    fontSize: 13,
    backgroundColor: '#0d0f16',
    padding: 12,
    borderRadius: 8,
  },
  chip: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99 },
});
