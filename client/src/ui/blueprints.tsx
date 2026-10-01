/**
 * MOLDES DE MONTAGEM (desafios build_ui).
 * A prévia renderiza, com componentes reais, o que o aluno escolheu para cada parte.
 * Escolhas erradas aparecem "quebradas" de propósito — o aluno VÊ por que não funciona.
 */
import { useState, type ReactNode } from 'react';
import { Button, Image, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { PhoneFrame } from './PhoneFrame';

type Assign = Record<string, string | undefined>;
type Role = 'image' | 'text' | 'input' | 'toggle' | 'action';

const AVATAR = { uri: '/img/avatar.svg' };

function Missing({ label }: { label: string }) {
  return (
    <View style={s.missing}>
      <Text style={{ color: '#999', fontSize: 12 }}>? {label}</Text>
    </View>
  );
}

function Warn({ children }: { children: ReactNode }) {
  return (
    <View style={s.warn}>
      <Text style={{ color: '#b71c1c', fontSize: 11, fontWeight: '700' }}>{children}</Text>
    </View>
  );
}

/** "Tela vermelha" do React Native, igual a quando o app quebra */
function RedBox({ msg }: { msg: string }) {
  return (
    <View style={s.redbox}>
      <Text style={{ color: '#fff', fontWeight: '800', fontSize: 11 }}>Error</Text>
      <Text style={{ color: '#fff', fontSize: 10 }}>{msg}</Text>
    </View>
  );
}

/**
 * Renderiza um componente no papel pedido. Ex.: comp="Text", role="image"
 * mostra só o nome do arquivo (porque Text não mostra imagens).
 */
function Live({ comp, role, text, styled, onAction }: { comp?: string; role: Role; text: string; styled: boolean; onAction?: () => void }) {
  if (!comp) return <Missing label={text} />;
  switch (comp) {
    case 'Text':
      if (role === 'image') return <Text style={{ color: '#555' }}>avatar.png</Text>;
      if (role === 'input') return <Text style={{ color: '#888' }}>(não dá para digitar em um Text…)</Text>;
      if (role === 'toggle') return <Text style={{ color: '#888' }}>lembrar-me?</Text>;
      return <Text style={styled ? s.nameStyled : undefined}>{text}</Text>;
    case 'Image':
      if (role === 'image') return <Image source={AVATAR} style={styled ? s.photoStyled : { width: 72, height: 72 }} />;
      return (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Image source={AVATAR} style={{ width: 28, height: 28 }} />
          <Warn>Image não mostra "{text}"</Warn>
        </View>
      );
    case 'View':
      if (role === 'text') return <RedBox msg="Text strings must be rendered within a <Text> component." />;
      return (
        <View style={s.emptyView}>
          <Text style={{ color: '#999', fontSize: 11 }}>(caixa vazia)</Text>
        </View>
      );
    case 'Button':
      return <Button title={role === 'image' ? 'avatar' : text} onPress={() => onAction?.()} />;
    case 'Pressable':
      return (
        <Pressable
          onPress={() => onAction?.()}
          style={({ pressed }: { pressed: boolean }) => [s.pressable, pressed && { backgroundColor: '#ffb300' }]}
        >
          <Text style={{ fontWeight: '800' }}>{text}</Text>
        </Pressable>
      );
    case 'TextInput':
      return <TextInput placeholder={text} secureTextEntry={role === 'input'} style={s.input} />;
    case 'Switch':
      return <Switch />;
    case 'StyleSheet':
      return <Warn>🎨 StyleSheet não aparece na tela: ele estiliza os outros componentes</Warn>;
    case 'SafeAreaView':
      return <Warn>📱 SafeAreaView protege a tela inteira, não serve para isso</Warn>;
    default:
      return <Warn>{comp} não serve aqui</Warn>;
  }
}

// ------------------------------------------------------------ cartão de perfil (módulo 1)

function ProfileCard({ a }: { a: Assign }) {
  const styled = a.style === 'StyleSheet';
  const content = (
    <>
      <Live comp={a.photo} role="image" text="foto" styled={styled} />
      <Live comp={a.name} role="text" text="Ana Souza" styled={styled} />
      {a.name === 'Text' ? <Text style={styled ? s.bioStyled : undefined}>Dev mobile em treinamento 🚀</Text> : null}
      {a.style && a.style !== 'StyleSheet' ? <Live comp={a.style} role="text" text="estilo" styled={false} /> : null}
    </>
  );

  let card: ReactNode;
  if (!a.container) {
    card = (
      <View style={[s.missing, { padding: 10, gap: 8, alignItems: 'center' }]}>
        <Text style={{ color: '#999', fontSize: 12 }}>? container</Text>
        {content}
      </View>
    );
  } else if (a.container === 'View') {
    card = <View style={styled ? s.cardStyled : s.cardPlain}>{content}</View>;
  } else if (a.container === 'Text') {
    card = <RedBox msg="Text não organiza layout: <Image> e caixas dentro de <Text> não funcionam como container." />;
  } else if (a.container === 'Image') {
    card = <RedBox msg="Image não aceita filhos: não dá para colocar foto e nome dentro dela." />;
  } else {
    card = (
      <View style={{ gap: 6 }}>
        <Live comp={a.container} role="action" text="cartão" styled={false} />
        {content}
      </View>
    );
  }

  return (
    <PhoneFrame>
      <View style={{ flex: 1, paddingTop: 38, paddingHorizontal: 14, backgroundColor: styled ? '#f3effd' : '#fff' }}>{card}</View>
    </PhoneFrame>
  );
}

// ------------------------------------------------------------ portão da senha (módulo 2)

function PasswordGate({ a }: { a: Assign }) {
  const [opened, setOpened] = useState(false);
  const okInput = a.password === 'TextInput';
  return (
    <PhoneFrame>
      <View style={{ flex: 1, paddingTop: 40, paddingHorizontal: 16, gap: 12, backgroundColor: opened ? '#e8f5e9' : '#fff' }}>
        <Text style={{ fontSize: 34, textAlign: 'center' }}>{opened ? '🚪✨' : '🏰'}</Text>
        <Live comp={a.label} role="text" text="Senha do portão" styled />
        <Live comp={a.password} role="input" text="digite a senha" styled />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Live comp={a.remember} role="toggle" text="lembrar-me" styled />
          {a.remember === 'Switch' ? <Text>Lembrar-me</Text> : null}
        </View>
        <Live comp={a.open} role="action" text="Abrir" styled onAction={() => setOpened(okInput)} />
        {opened ? <Text style={{ color: '#2e7d32', fontWeight: '800', textAlign: 'center' }}>Portão aberto!</Text> : null}
      </View>
    </PhoneFrame>
  );
}

export const BLUEPRINTS: Record<string, (p: { a: Assign }) => ReactNode> = {
  profile_card: ProfileCard,
  password_gate: PasswordGate,
};

export function Blueprint({ id, assign }: { id: string; assign: Assign }) {
  const B = BLUEPRINTS[id];
  return B ? <B a={assign} /> : <Text style={{ color: '#f88' }}>Molde "{id}" não encontrado</Text>;
}

const s = StyleSheet.create({
  missing: { borderWidth: 2, borderStyle: 'dashed', borderColor: '#ccc', borderRadius: 8, padding: 8, marginVertical: 4 },
  warn: { backgroundColor: '#ffebee', borderRadius: 6, padding: 6, marginVertical: 4 },
  redbox: { backgroundColor: '#d32f2f', borderRadius: 6, padding: 8, marginVertical: 4 },
  emptyView: { height: 40, backgroundColor: '#eee', borderRadius: 6, justifyContent: 'center', alignItems: 'center', marginVertical: 4 },
  pressable: { backgroundColor: '#ffd54f', padding: 10, borderRadius: 10, alignItems: 'center' },
  input: { borderWidth: 1, borderColor: '#999', borderRadius: 8, padding: 8 },
  cardPlain: { gap: 2 },
  cardStyled: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 18,
    alignItems: 'center',
    gap: 8,
    shadowColor: '#6c3ce1',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    borderWidth: 1,
    borderColor: '#e4dcff',
  },
  photoStyled: { width: 96, height: 96, borderRadius: 48, borderWidth: 3, borderColor: '#6c3ce1' },
  nameStyled: { fontSize: 20, fontWeight: '800', color: '#2d1b69' },
  bioStyled: { color: '#6b6b80', fontSize: 13 },
});
