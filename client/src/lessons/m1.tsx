/**
 * Lições do Módulo 1 — Vila dos Componentes Fundamentais.
 * Cada prévia usa componentes React Native reais (via react-native-web).
 */
import type { ReactNode } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { B, C } from '../ui/Mascot';
import { type Lesson, raw } from './types';

/** área útil abaixo do "notch" da moldura de celular */
export function Pad({ children, style }: { children: ReactNode; style?: object }) {
  return <View style={[{ flex: 1, paddingTop: 40, paddingHorizontal: 14 }, style]}>{children}</View>;
}

const IMAGES: Record<string, { uri: string }> = { avatar: { uri: '/img/avatar.svg' }, livro: { uri: '/img/book.svg' } };

export const M1_LESSONS: Lesson[] = [
  {
    component: 'View',
    tagline: 'A caixa que organiza tudo',
    intro: (
      <>
        A <C>{'<View>'}</C> é a peça mais usada do React Native. Ela é uma <B>caixa</B>: agrupa outros componentes e define o
        layout — cor de fundo, espaçamento, bordas e se os filhos ficam em coluna ou lado a lado. É parecida com a{' '}
        <C>{'<div>'}</C> do HTML.
      </>
    ),
    when: 'Sempre que precisar agrupar, alinhar ou dar fundo/borda a um pedaço da tela.',
    code: `<View style={{
  backgroundColor: {{backgroundColor}},
  padding: {{padding}},
  borderRadius: {{borderRadius}},
  flexDirection: {{flexDirection}},
}}>
  <View style={styles.quadrado} />
  <View style={styles.quadrado} />
  <View style={styles.quadrado} />
</View>`,
    controls: [
      { key: 'backgroundColor', options: ['#ffcdd2', '#bbdefb', '#c8e6c9', '#fff59d'] },
      { key: 'padding', options: [0, 8, 24] },
      { key: 'borderRadius', options: [0, 12, 40] },
      { key: 'flexDirection', options: ['column', 'row'] },
    ],
    Preview: ({ s }) => (
      <Pad style={{ alignItems: 'center', justifyContent: 'center' }}>
        <View
          style={{
            backgroundColor: s.backgroundColor as string,
            padding: s.padding as number,
            borderRadius: s.borderRadius as number,
            flexDirection: s.flexDirection as 'row' | 'column',
            gap: 6,
          }}
        >
          {['#7e57c2', '#26a69a', '#ffa726'].map((c) => (
            <View key={c} style={{ width: 44, height: 44, backgroundColor: c, borderRadius: 6 }} />
          ))}
        </View>
      </Pad>
    ),
    tasks: [
      { text: "Coloque os quadrados lado a lado (flexDirection: 'row')", done: (s) => s.flexDirection === 'row' },
      { text: 'Dê bastante espaço interno (padding: 24)', done: (s) => s.padding === 24 },
      { text: 'Arredonde bem os cantos (borderRadius: 40)', done: (s) => s.borderRadius === 40 },
    ],
    quiz: {
      question: 'Qual é a principal função da View?',
      options: ['Agrupar e organizar outros componentes', 'Mostrar textos na tela', 'Mostrar imagens', 'Salvar dados no celular'],
      answer: 'Agrupar e organizar outros componentes',
      why: 'A View é o container: ela não mostra conteúdo sozinha, ela organiza os filhos.',
    },
  },
  {
    component: 'Text',
    tagline: 'Todo texto da tela mora aqui',
    intro: (
      <>
        Para mostrar qualquer palavra na tela você <B>precisa</B> do <C>{'<Text>'}</C>. Texto solto dentro de uma{' '}
        <C>{'<View>'}</C> quebra o app com um erro! O Text também recebe estilos de fonte: tamanho, cor, negrito e
        alinhamento.
      </>
    ),
    when: 'Títulos, parágrafos, rótulos, números… qualquer texto visível.',
    code: `<Text style={{
  fontSize: {{fontSize}},
  color: {{color}},
  fontWeight: {{fontWeight}},
  textAlign: {{textAlign}},
}}>
  {{texto}}
</Text>`,
    controls: [
      { key: 'texto', options: ['Olá, turma!', 'React Native é demais', 'Bom dia ☀️'], show: raw },
      { key: 'fontSize', options: [14, 20, 32] },
      { key: 'color', options: ['#222222', '#e53935', '#1e88e5'] },
      { key: 'fontWeight', options: ['400', '800'] },
      { key: 'textAlign', options: ['left', 'center'] },
    ],
    Preview: ({ s }) => (
      <Pad style={{ justifyContent: 'center' }}>
        <Text
          style={{
            fontSize: s.fontSize as number,
            color: s.color as string,
            fontWeight: s.fontWeight as '400',
            textAlign: s.textAlign as 'left',
          }}
        >
          {s.texto}
        </Text>
      </Pad>
    ),
    tasks: [
      { text: 'Aumente a fonte para 32', done: (s) => s.fontSize === 32 },
      { text: "Pinte o texto de vermelho ('#e53935')", done: (s) => s.color === '#e53935' },
      { text: "Deixe em negrito (fontWeight: '800') e centralizado", done: (s) => s.fontWeight === '800' && s.textAlign === 'center' },
    ],
    quiz: {
      question: 'Onde um texto precisa estar para aparecer na tela?',
      options: ['Dentro de <Text>', 'Direto dentro de <View>', 'Dentro de <Image>', 'Em qualquer lugar do JSX'],
      answer: 'Dentro de <Text>',
      why: 'Texto fora de <Text> gera o erro "Text strings must be rendered within a <Text> component".',
    },
  },
  {
    component: 'Image',
    tagline: 'Fotos, ícones e ilustrações',
    intro: (
      <>
        O <C>{'<Image>'}</C> mostra imagens. A prop <C>source</C> diz QUAL imagem: <C>{"require('./foto.png')"}</C> para
        arquivos do projeto ou <C>{"{ uri: 'https://...' }"}</C> para imagens da internet. Atenção: imagens precisam de{' '}
        <B>largura e altura</B> no estilo!
      </>
    ),
    when: 'Avatares, fotos de produtos, logos, ilustrações.',
    code: `<Image
  source={{{source}}}
  style={{
    width: {{width}},
    height: {{width}},
    borderRadius: {{borderRadius}},
  }}
/>`,
    controls: [
      { key: 'source', options: ['avatar', 'livro'], show: (v) => `require('./${v}.png')` },
      { key: 'width', options: [60, 120, 180] },
      { key: 'borderRadius', options: [0, 16, 90] },
    ],
    Preview: ({ s }) => (
      <Pad style={{ alignItems: 'center', justifyContent: 'center' }}>
        <Image
          source={IMAGES[s.source as string]}
          style={{ width: s.width as number, height: s.width as number, borderRadius: s.borderRadius as number }}
        />
      </Pad>
    ),
    tasks: [
      { text: 'Deixe a imagem grande (180)', done: (s) => s.width === 180 },
      { text: 'Deixe a imagem redonda (borderRadius 90 com tamanho 180)', done: (s) => s.width === 180 && s.borderRadius === 90 },
      { text: "Troque a imagem para o livro", done: (s) => s.source === 'livro' },
    ],
    quiz: {
      question: 'Qual prop diz ao <Image> QUAL imagem mostrar?',
      options: ['source', 'src', 'image', 'file'],
      answer: 'source',
      why: 'No HTML é src, mas no React Native é source.',
    },
  },
  {
    component: 'StyleSheet',
    tagline: 'Estilos organizados e reutilizáveis',
    intro: (
      <>
        O <C>StyleSheet.create</C> guarda seus estilos em um só lugar, com nomes. Depois é só usar{' '}
        <C>{'style={styles.card}'}</C> em quantos componentes quiser. Mudou o estilo uma vez → <B>todos</B> os componentes
        que usam mudam juntos!
      </>
    ),
    when: 'Em praticamente toda tela: deixa o código limpo e evita repetir estilos.',
    code: `const styles = StyleSheet.create({
  card: {
    backgroundColor: {{cor}},
    borderRadius: {{raio}},
    padding: 16,
  },
  titulo: { color: '#fff', fontSize: {{tamanho}} },
});

<View style={styles.card}>
  <Text style={styles.titulo}>Card 1</Text>
</View>
<View style={styles.card}>
  <Text style={styles.titulo}>Card 2</Text>
</View>`,
    controls: [
      { key: 'cor', options: ['#6c3ce1', '#2e7d32', '#ef6c00'] },
      { key: 'raio', options: [0, 12, 24] },
      { key: 'tamanho', options: [16, 22, 28] },
    ],
    Preview: ({ s }) => {
      // estilos criados de verdade com StyleSheet.create
      const styles = StyleSheet.create({
        card: { backgroundColor: s.cor as string, borderRadius: s.raio as number, padding: 16 },
        titulo: { color: '#fff', fontSize: s.tamanho as number, fontWeight: '700' },
      });
      return (
        <Pad style={{ gap: 12 }}>
          <View style={styles.card}>
            <Text style={styles.titulo}>Card 1</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.titulo}>Card 2</Text>
          </View>
        </Pad>
      );
    },
    tasks: [
      { text: "Mude a cor do card para verde ('#2e7d32') — veja os DOIS mudarem", done: (s) => s.cor === '#2e7d32' },
      { text: 'Aumente o título para 28', done: (s) => s.tamanho === 28 },
      { text: 'Arredonde os cards (raio 24)', done: (s) => s.raio === 24 },
    ],
    quiz: {
      question: 'Qual a grande vantagem do StyleSheet.create?',
      options: ['Organizar e reutilizar estilos em vários componentes', 'Mostrar imagens', 'Criar telas novas', 'Guardar dados do usuário'],
      answer: 'Organizar e reutilizar estilos em vários componentes',
      why: 'Você define o estilo uma vez e reutiliza com styles.nome em quantos componentes quiser.',
    },
  },
  {
    component: 'SafeAreaView',
    tagline: 'Fuja do notch!',
    intro: (
      <>
        Celulares modernos têm <B>notch</B>, câmera e barra de status no topo. Se você usar só uma <C>{'<View>'}</C>, o
        conteúdo pode ficar escondido atrás deles. A <C>{'<SafeAreaView>'}</C> adiciona o espaço certo para tudo ficar na
        área segura. (Hoje o recomendado é a versão da biblioteca <C>react-native-safe-area-context</C>.)
      </>
    ),
    when: 'Como componente de fora (raiz) das telas.',
    code: `<{{raiz}} style={{ flex: 1 }}>
  <View style={styles.cabecalho}>
    <Text>{{titulo}}</Text>
  </View>
  <Text>Conteúdo da tela…</Text>
</{{raiz}}>`,
    controls: [
      { key: 'raiz', options: ['View', 'SafeAreaView'], show: raw },
      { key: 'titulo', options: ['Minhas Mensagens', 'Meu Perfil'], show: raw },
    ],
    Preview: ({ s }) => (
      <View style={{ flex: 1, paddingTop: s.raiz === 'SafeAreaView' ? 34 : 0, backgroundColor: '#1976d2' }}>
        <View style={{ backgroundColor: '#1976d2', padding: 12 }}>
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 17 }}>{s.titulo}</Text>
        </View>
        <View style={{ flex: 1, backgroundColor: '#fff', padding: 12 }}>
          <Text>Conteúdo da tela…</Text>
          {s.raiz === 'View' ? <Text style={{ color: '#e53935', marginTop: 10, fontSize: 12 }}>⚠️ O título está escondido atrás do notch!</Text> : null}
        </View>
      </View>
    ),
    tasks: [
      { text: 'Troque a View de fora por SafeAreaView e veja o título aparecer', done: (s) => s.raiz === 'SafeAreaView' },
      { text: "Mude o título para 'Meu Perfil'", done: (s) => s.titulo === 'Meu Perfil' },
    ],
    quiz: {
      question: 'Para que serve a SafeAreaView?',
      options: ['Evitar que o conteúdo fique atrás do notch e da barra de status', 'Proteger o app contra hackers', 'Salvar dados com segurança', 'Criar listas grandes'],
      answer: 'Evitar que o conteúdo fique atrás do notch e da barra de status',
      why: '"Safe area" é a área segura da tela, longe de notch, câmera e cantos arredondados.',
    },
  },
];

