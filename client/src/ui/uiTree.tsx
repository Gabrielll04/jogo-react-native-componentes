/**
 * Renderiza uma árvore UINode com componentes React Native REAIS.
 * Usado para a tela-objetivo e para a tela que o aluno monta no "Monte a tela".
 */
import { useState, type ReactNode } from 'react';
import { ActivityIndicator, Button, Image, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import type { UINode } from '@shared/types';

type Styles = Record<string, Record<string, string | number>>;

function LiveSwitch() {
  const [on, setOn] = useState(false);
  return <Switch value={on} onValueChange={setOn} />;
}

function renderChildren(node: UINode, styles: Styles, key: string): ReactNode {
  return (node.children ?? []).map((c, i) => <RenderNode key={`${key}-${i}`} node={c} styles={styles} path={`${key}-${i}`} />);
}

export function RenderNode({ node, styles, path = 'r' }: { node: UINode; styles: Styles; path?: string }) {
  const st = node.style ? styles[node.style] : undefined;
  switch (node.type) {
    case 'SafeAreaView':
      // simula a área segura: empurra o conteúdo para baixo do notch
      return <View style={[{ flex: 1, paddingTop: 34 }, st, { paddingTop: 34 + Number(st?.padding ?? 0) }]}>{renderChildren(node, styles, path)}</View>;
    case 'View':
      return <View style={st}>{renderChildren(node, styles, path)}</View>;
    case 'ScrollView':
      return <ScrollView style={st}>{renderChildren(node, styles, path)}</ScrollView>;
    case 'Pressable':
      return (
        <Pressable style={({ pressed }: { pressed: boolean }) => [st, pressed && { opacity: 0.7, transform: [{ scale: 0.97 }] }]}>
          {renderChildren(node, styles, path)}
        </Pressable>
      );
    case 'Text':
      return <Text style={st}>{node.text}</Text>;
    case 'Image':
      return <Image source={{ uri: '/img/avatar.svg' }} style={[{ width: 60, height: 60 }, st]} />;
    case 'Button':
      return <Button title={node.text ?? 'Botão'} onPress={() => {}} />;
    case 'TextInput':
      return <TextInput placeholder={node.text} style={st ?? { borderWidth: 1, borderColor: '#999', padding: 6 }} />;
    case 'Switch':
      return <LiveSwitch />;
    case 'ActivityIndicator':
      return <ActivityIndicator size="large" color={typeof st?.color === 'string' ? st.color : '#2196f3'} style={st} />;
    case '__loose_text__':
      // texto solto fora de <Text>: o React Native mostra a "tela vermelha"
      return (
        <View style={{ backgroundColor: '#d32f2f', padding: 8, borderRadius: 6 }}>
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 11 }}>Error</Text>
          <Text style={{ color: '#fff', fontSize: 10 }}>Text strings must be rendered within a {'<Text>'} component: "{node.text}"</Text>
        </View>
      );
    default:
      return <Text style={{ color: '#c62828', fontSize: 11 }}>{`<${node.type}> não existe aqui (confira o nome e as maiúsculas)`}</Text>;
  }
}

/** Tela inteira (raiz ocupa o celular todo). */
/** pad: margem abaixo do "notch" (telas de duelo, que não usam estilos) */
export function RenderScreen({ root, styles, pad }: { root: UINode | null; styles: Styles; pad?: boolean }) {
  if (!root) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <Text style={{ color: '#9aa', textAlign: 'center' }}>Tela vazia.{'\n'}Adicione blocos para montar o JSX!</Text>
      </View>
    );
  }
  return (
    <View style={[{ flex: 1, backgroundColor: '#fff' }, pad && { paddingTop: 40, paddingHorizontal: 14 }]}>
      <RenderNode node={pad && root.type === 'View' && !root.style ? { ...root, style: '__pad' } : root} styles={pad ? { ...styles, __pad: { gap: 10 } } : styles} />
    </View>
  );
}
