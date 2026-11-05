/**
 * LABORATÓRIO LIVRE 🧪 — o aluno escreve JSX e vê o celular mudar na hora.
 * O código fica guardado neste navegador.
 */
import { Component, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { parseLab } from '@shared/lab';
import { actions } from '../net/socket';
import { Btn } from './Btn';
import { CodeEditor } from './CodeEditor';
import { PhoneFrame } from './PhoneFrame';
import { colors, fonts } from './theme';
import { RenderScreen } from './uiTree';

const CODE_KEY = 'rnq_lab_code';

const TEMPLATES: { name: string; code: string }[] = [
  {
    name: '📄 Em branco',
    code: "import { View, Text } from 'react-native';\n\nexport default function App() {\n  return (\n    <View>\n      <Text>Olá!</Text>\n    </View>\n  );\n}\n",
  },
  {
    name: '🪪 Cartão de perfil',
    code:
      "import { View, Text, Image, Button, StyleSheet } from 'react-native';\n\n" +
      'export default function App() {\n  return (\n    <View style={styles.card}>\n      <Image source={require(\'./avatar.png\')} style={styles.foto} />\n' +
      '      <Text style={styles.nome}>Bia Souza</Text>\n      <Text>Dev React Native 🚀</Text>\n      <Button title="Seguir" />\n    </View>\n  );\n}\n\n' +
      "const styles = StyleSheet.create({\n  card: { backgroundColor: '#e3f2fd', padding: 16, borderRadius: 16, alignItems: 'center', gap: 8 },\n" +
      "  foto: { width: 80, height: 80, borderRadius: 40 },\n  nome: { fontSize: 22, fontWeight: 'bold' },\n});\n",
  },
  {
    name: '🔐 Login',
    code:
      "import { SafeAreaView, Text, TextInput, Button } from 'react-native';\n\n" +
      'export default function App() {\n  return (\n    <SafeAreaView style={{ padding: 20, gap: 12 }}>\n' +
      "      <Text style={{ fontSize: 26, fontWeight: 'bold' }}>Entrar</Text>\n" +
      '      <TextInput placeholder="E-mail" style={{ borderWidth: 1, borderColor: \'#999\', borderRadius: 8, padding: 10 }} />\n' +
      '      <TextInput placeholder="Senha" style={{ borderWidth: 1, borderColor: \'#999\', borderRadius: 8, padding: 10 }} />\n' +
      '      <Button title="Entrar" />\n    </SafeAreaView>\n  );\n}\n',
  },
  {
    name: '↔️ Lado a lado',
    code:
      "import { View } from 'react-native';\n\n" +
      '// Troque row por column e veja o que acontece!\nexport default function App() {\n  return (\n' +
      "    <View style={{ flexDirection: 'row', gap: 8, padding: 12 }}>\n" +
      "      <View style={{ width: 60, height: 60, backgroundColor: 'tomato' }} />\n" +
      "      <View style={{ width: 60, height: 60, backgroundColor: 'gold' }} />\n" +
      "      <View style={{ width: 60, height: 60, backgroundColor: 'teal' }} />\n" +
      '    </View>\n  );\n}\n',
  },
  {
    name: '📜 Lista',
    code:
      "import { ScrollView, Text, ActivityIndicator } from 'react-native';\n\n" +
      'export default function App() {\n  return (\n    <ScrollView style={{ padding: 16 }}>\n' +
      "      <ActivityIndicator />\n      <Text style={{ fontSize: 18 }}>Item 1</Text>\n      <Text style={{ fontSize: 18 }}>Item 2</Text>\n      <Text style={{ fontSize: 18 }}>Item 3</Text>\n" +
      '    </ScrollView>\n  );\n}\n',
  },
];

const SNIPPETS: { label: string; code: string }[] = [
  { label: '<View>', code: '<View>\n\n</View>' },
  { label: '<Text>', code: '<Text>Texto</Text>' },
  { label: '<Image>', code: "<Image source={require('./avatar.png')} />" },
  { label: '<Button>', code: '<Button title="Clique" />' },
  { label: '<TextInput>', code: '<TextInput placeholder="Digite aqui" />' },
  { label: '<Switch>', code: '<Switch />' },
  { label: '<Pressable>', code: '<Pressable>\n\n</Pressable>' },
  { label: '<ScrollView>', code: '<ScrollView>\n\n</ScrollView>' },
  { label: '<ActivityIndicator>', code: '<ActivityIndicator />' },
  { label: 'style={{…}}', code: "style={{ backgroundColor: 'gold', padding: 10 }}" },
];

const IDEAS = [
  'Mude a cor de fundo do cartão (backgroundColor).',
  "Coloque três quadrados lado a lado com flexDirection: 'row'.",
  "Centralize tudo com alignItems: 'center' e justifyContent: 'center'.",
  'Faça um botão redondo com Pressable + borderRadius.',
  'Crie um estilo no StyleSheet.create e use em dois Text.',
  'Escreva um texto FORA do <Text> e veja o erro que aparece. Por quê?',
];

function loadCode() {
  try {
    return localStorage.getItem(CODE_KEY) || TEMPLATES[1].code;
  } catch {
    return TEMPLATES[1].code;
  }
}

/** se um estilo estranho quebrar a prévia, mostra o erro em vez de derrubar o jogo */
class PreviewBoundary extends Component<{ children: ReactNode; resetKey: string }, { error: string | null }> {
  state = { error: null as string | null };
  static getDerivedStateFromError(e: Error) {
    return { error: e.message };
  }
  componentDidUpdate(prev: { resetKey: string }) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null });
  }
  render() {
    if (this.state.error) {
      return (
        <View style={{ flex: 1, padding: 16, paddingTop: 44, backgroundColor: '#fff' }}>
          <Text style={{ color: '#c62828', fontWeight: '800' }}>⚠️ A tela quebrou</Text>
          <Text style={{ color: '#555', marginTop: 6 }}>{this.state.error}</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

export function LabOverlay({ onClose }: { onClose: () => void }) {
  const [code, setCode] = useState(loadCode);
  const [shown, setShown] = useState(code); // prévia atualiza com um pequeno atraso enquanto digita
  const editor = useRef<{ insert: (text: string) => void } | null>(null);
  const reported = useRef(false);

  useEffect(() => {
    const t = setTimeout(() => setShown(code), 250);
    try {
      localStorage.setItem(CODE_KEY, code);
    } catch {
      /* ignore */
    }
    return () => clearTimeout(t);
  }, [code]);

  const result = useMemo(() => parseLab(shown), [shown]);

  // primeira tela "de verdade" (4+ componentes): conquista 🧪 Cientista
  useEffect(() => {
    if (!reported.current && result.tree && result.nodes >= 4) {
      reported.current = true;
      actions.labBuilt(result.nodes);
    }
  }, [result]);

  return (
    <View style={styles.backdrop}>
      <View style={styles.window}>
        <View style={styles.header}>
          <Text style={styles.title}>🧪 Laboratório livre</Text>
          <Text style={styles.sub}>Escreva o código e veja o resultado ao lado.</Text>
          <Btn small title="✕ Fechar" onPress={onClose} />
        </View>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.cols}>
          <View style={{ flex: 1, minWidth: 420, gap: 10 }}>
            <View style={styles.row}>
              {TEMPLATES.map((t) => (
                <Btn
                  key={t.name}
                  small
                  variant="purple"
                  title={t.name}
                  onPress={() => {
                    setCode(t.code);
                  }}
                />
              ))}
            </View>
            <View style={styles.row}>
              {SNIPPETS.map((s) => (
                <Btn key={s.label} small variant="blue" title={`+ ${s.label}`} onPress={() => editor.current?.insert(s.code)} />
              ))}
            </View>
            <CodeEditor editorRef={editor} value={code} onChange={setCode} minLines={18} errorLine={result.line} problem={result.error ?? result.warnings[0]} />
            {result.warnings.slice(1).map((w) => (
              <Text key={w} style={styles.warn}>
                {w}
              </Text>
            ))}
          </View>
          <View style={{ alignItems: 'center', gap: 10, width: 300 }}>
            <Text style={styles.label}>📱 Prévia ao vivo</Text>
            <PhoneFrame width={260} height={460}>
              <PreviewBoundary resetKey={shown}>
                {result.tree ? (
                  <RenderScreen root={result.tree} styles={result.styles} pad />
                ) : (
                  <View style={{ flex: 1, padding: 16, paddingTop: 44, backgroundColor: '#fff' }}>
                    <Text style={{ color: '#c62828', fontWeight: '800' }}>⚠️ Ainda não dá para desenhar</Text>
                    <Text style={{ color: '#555', marginTop: 6 }}>{result.error}</Text>
                  </View>
                )}
              </PreviewBoundary>
            </PhoneFrame>
            <View style={styles.ideas}>
              <Text style={styles.label}>💡 Ideias para tentar</Text>
              {IDEAS.map((i) => (
                <Text key={i} style={styles.idea}>
                  • {i}
                </Text>
              ))}
            </View>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(5,6,12,0.82)', alignItems: 'center', justifyContent: 'center', padding: 14 },
  window: { width: '100%', maxWidth: 1240, height: '100%', maxHeight: 900, backgroundColor: colors.panel, borderRadius: 22, borderWidth: 3, borderColor: '#2fbf5b', overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#14532d', paddingHorizontal: 18, paddingVertical: 10, flexWrap: 'wrap' },
  title: { color: '#fff', fontFamily: fonts.game, fontWeight: '900', fontSize: 22 },
  sub: { flex: 1, minWidth: 240, color: '#c8ffd6', fontFamily: fonts.body, fontSize: 14 },
  cols: { flexDirection: 'row', flexWrap: 'wrap', gap: 20, padding: 18, alignItems: 'flex-start' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  warn: { color: colors.warn, fontFamily: fonts.body, fontSize: 13 },
  label: { color: colors.muted, fontFamily: fonts.game, fontWeight: '900', fontSize: 14 },
  ideas: { backgroundColor: '#1a1f3a', borderRadius: 14, padding: 12, gap: 6, alignSelf: 'stretch' },
  idea: { color: colors.text, fontFamily: fonts.body, fontSize: 13 },
});
