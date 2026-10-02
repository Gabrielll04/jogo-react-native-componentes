import { StyleSheet } from 'react-native';

/** Fontes empacotadas localmente (@fontsource) — funcionam sem internet. */
export const fonts = {
  display: '"Pixelify Sans", system-ui, sans-serif', // só títulos GRANDES (pixel art)
  game: 'Nunito, system-ui, sans-serif', // botões e rótulos: negrito e legível
  body: 'Nunito, system-ui, sans-serif', // textos: arredondada e legível
  code: '"JetBrains Mono", ui-monospace, Menlo, Consolas, monospace',
};

export const colors = {
  bg: '#12141c',
  panel: '#1c2033',
  panel2: '#262b45',
  panel3: '#30365a',
  line: '#3a4170',
  text: '#f1f3fb',
  muted: '#a3abd0',
  accent: '#61dafb', // azul do React
  ok: '#58cc02',
  okDark: '#3f9a00',
  bad: '#ff4b4b',
  badDark: '#c93636',
  warn: '#ffc800',
  gold: '#ffd54a',
  blue: '#1cb0f6',
  blueDark: '#1287bf',
  purple: '#a368fc',
  purpleDark: '#7b45cf',
  // editor de código
  codeBg: '#0f1222',
  codeTag: '#7dd3fc',
  codeAttr: '#c4b5fd',
  codeStr: '#fcd34d',
  codeNum: '#fb923c',
  codeKey: '#f472b6',
  codeComment: '#6b7398',
  codePunct: '#94a3b8',
};

export const ui = StyleSheet.create({
  panel: {
    backgroundColor: colors.panel,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: colors.line,
    padding: 18,
  },
  title: { color: colors.text, fontSize: 28, fontFamily: fonts.display, fontWeight: '700', letterSpacing: 0.5 },
  h2: { color: colors.text, fontSize: 17, fontFamily: fonts.game, fontWeight: '900', marginBottom: 8 },
  text: { color: colors.text, fontSize: 15, fontFamily: fonts.body, lineHeight: 22 },
  muted: { color: colors.muted, fontSize: 13, fontFamily: fonts.body },
  row: { flexDirection: 'row', alignItems: 'center' },
  btn: {
    backgroundColor: colors.panel2,
    borderWidth: 2,
    borderColor: colors.line,
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimary: { backgroundColor: '#1f8f4e', borderColor: '#2fbf5b' },
  btnText: { color: colors.text, fontWeight: '800', fontSize: 14, fontFamily: fonts.body },
  code: {
    fontFamily: fonts.code,
    color: '#e6e6e6',
    fontSize: 13,
    backgroundColor: colors.codeBg,
    padding: 12,
    borderRadius: 10,
  },
  chip: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99, fontFamily: fonts.body },
  tag: { fontFamily: fonts.code, color: colors.codeTag, fontWeight: '700' },
});
