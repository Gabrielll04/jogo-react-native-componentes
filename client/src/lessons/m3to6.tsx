/** Lições dos Módulos 3 a 6 — listas, feedback, navegação e dados. */
import { createContext, useContext, useEffect } from 'react';
import { ActivityIndicator, Button, FlatList, Modal, Pressable, ScrollView, SectionList, StyleSheet, Text, TextInput, View } from 'react-native';
import { B, C } from '../ui/Mascot';
import { Pad } from './m1';
import { type Lesson, raw } from './types';

const CORES = ['#ef9a9a', '#90caf9', '#a5d6a7', '#fff59d', '#ce93d8', '#ffcc80', '#80deea', '#f48fb1'];

// ============================================================ MÓDULO 3

const LIVROS = Array.from({ length: 1000 }, (_, i) => ({ id: String(i), titulo: `Livro nº ${i + 1}` }));

const M3: Lesson[] = [
  {
    component: 'ScrollView',
    tagline: 'Conteúdo que não cabe? Role!',
    intro: (
      <>
        A <C>{'<ScrollView>'}</C> é uma caixa que <B>rola</B>. Coloque dentro o que quiser; se não couber, o usuário arrasta.
        Com <C>horizontal</C> ela rola para o lado. Atenção: ela desenha <B>tudo de uma vez</B>, então é ótima para pouco
        conteúdo, mas pesada para listas enormes.
      </>
    ),
    when: 'Telas de "Sobre", formulários longos, carrosséis com poucos itens.',
    code: `<ScrollView horizontal={{horizontal}}>
  {cards.map((cor) => (
    <View key={cor} style={[styles.card, { backgroundColor: cor }]} />
  ))}
</ScrollView>
// cards: {{qtd}} itens`,
    controls: [
      { key: 'horizontal', options: [false, true] },
      { key: 'qtd', options: [3, 8] },
    ],
    Preview: ({ s }) => (
      <View style={{ flex: 1, paddingTop: 36 }}>
        <ScrollView key={String(s.horizontal)} horizontal={s.horizontal as boolean} contentContainerStyle={{ padding: 12, gap: 10 }}>
          {CORES.slice(0, s.qtd as number).map((c, i) => (
            <View key={c} style={{ width: s.horizontal ? 140 : undefined, height: 90, backgroundColor: c, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontWeight: '800' }}>Card {i + 1}</Text>
            </View>
          ))}
        </ScrollView>
      </View>
    ),
    tasks: [
      { text: 'Coloque 8 cards (e role a tela!)', done: (s) => s.qtd === 8 },
      { text: 'Faça a rolagem ser para o lado (horizontal)', done: (s) => s.horizontal === true },
    ],
    quiz: {
      question: 'Quando a ScrollView é uma boa escolha?',
      options: ['Pouco conteúdo que não cabe na tela', 'Listas com milhares de itens', 'Para salvar dados', 'Para navegar entre telas'],
      answer: 'Pouco conteúdo que não cabe na tela',
      why: 'Ela renderiza tudo de uma vez. Para muitos itens use FlatList.',
    },
  },
  {
    component: 'FlatList',
    tagline: 'Listas enormes sem travar',
    intro: (
      <>
        A <C>{'<FlatList>'}</C> recebe os dados em <C>data</C> e uma função <C>renderItem</C> que desenha cada item. O segredo:
        ela só desenha os itens que <B>aparecem na tela</B> (virtualização). Por isso aguenta 1000, 10 000 itens!
      </>
    ),
    when: 'Feeds, mensagens, produtos, inventários — qualquer lista grande.',
    code: `<FlatList
  data={livros}   // {{qtd}} livros
  numColumns={{colunas}}
  keyExtractor={(livro) => livro.id}
  renderItem={({ item }) => (
    <Text style={styles.livro}>📕 {item.titulo}</Text>
  )}
/>`,
    controls: [
      { key: 'qtd', options: [10, 1000], show: raw },
      { key: 'colunas', options: [1, 2, 3] },
    ],
    Preview: ({ s }) => (
      <View style={{ flex: 1, paddingTop: 36 }}>
        <FlatList
          key={`c${s.colunas}`}
          data={LIVROS.slice(0, s.qtd as number)}
          numColumns={s.colunas as number}
          keyExtractor={(l: { id: string }) => l.id}
          initialNumToRender={20}
          renderItem={({ item }: { item: { titulo: string } }) => (
            <View style={{ flex: 1, margin: 4, padding: 8, backgroundColor: '#ede7f6', borderRadius: 8 }}>
              <Text style={{ fontSize: s.colunas === 3 ? 10 : 13 }}>📕 {item.titulo}</Text>
            </View>
          )}
        />
      </View>
    ),
    tasks: [
      { text: 'Mostre 1000 livros e role até bem longe', done: (s) => s.qtd === 1000 },
      { text: 'Organize em 3 colunas (numColumns)', done: (s) => s.colunas === 3 },
    ],
    quiz: {
      question: 'Por que a FlatList aguenta listas enormes?',
      options: ['Ela só desenha os itens que aparecem na tela', 'Ela é mais colorida', 'Ela salva no AsyncStorage', 'Ela usa menos estilos'],
      answer: 'Ela só desenha os itens que aparecem na tela',
      why: 'Isso se chama virtualização: itens fora da tela não são desenhados.',
    },
  },
  {
    component: 'SectionList',
    tagline: 'Listas com grupos e títulos',
    intro: (
      <>
        A <C>{'<SectionList>'}</C> é uma FlatList com <B>seções</B>. Os dados vêm como lista de seções, cada uma com{' '}
        <C>title</C> e <C>data</C>. Com <C>stickySectionHeadersEnabled</C> o título da seção "gruda" no topo ao rolar.
      </>
    ),
    when: 'Contatos por letra, cardápio por categoria, livros por gênero.',
    code: `<SectionList
  sections={[
    { title: '🚀 Ficção', data: ['Duna', 'Fundação', …] },
    { title: '🔬 Ciência', data: ['Cosmos', 'O Gene', …] },
  ]}
  stickySectionHeadersEnabled={{grudar}}
  renderSectionHeader={({ section }) => (
    <Text style={{ backgroundColor: {{cor}} }}>{section.title}</Text>
  )}
  renderItem={({ item }) => <Text>{item}</Text>}
/>`,
    controls: [
      { key: 'grudar', options: [false, true] },
      { key: 'cor', options: ['#ede7f6', '#e3f2fd', '#fff3e0'] },
    ],
    Preview: ({ s }) => (
      <View style={{ flex: 1, paddingTop: 34 }}>
        <SectionList
          key={String(s.grudar)}
          sections={[
            { title: '🚀 Ficção', data: ['Duna', 'Fundação', 'Neuromancer', 'Eu, Robô', 'O Guia do Mochileiro', 'Solaris'] },
            { title: '🔬 Ciência', data: ['Cosmos', 'O Gene', 'Breves Respostas', 'Sapiens', 'O Universo Elegante'] },
            { title: '💻 Programação', data: ['Código Limpo', 'O Programador Pragmático', 'Refatoração', 'Entendendo Algoritmos'] },
          ]}
          stickySectionHeadersEnabled={s.grudar as boolean}
          keyExtractor={(item: string) => item}
          renderSectionHeader={({ section }: { section: { title: string } }) => (
            <Text style={{ backgroundColor: s.cor as string, padding: 8, fontWeight: '800' }}>{section.title}</Text>
          )}
          renderItem={({ item }: { item: string }) => <Text style={{ padding: 9, paddingLeft: 18 }}>{item}</Text>}
        />
      </View>
    ),
    tasks: [
      { text: 'Ative os cabeçalhos grudentos e role a lista', done: (s) => s.grudar === true },
      { text: 'Troque a cor dos cabeçalhos', done: (s) => s.cor !== '#ede7f6' },
    ],
    quiz: {
      question: 'Qual formato de dados a SectionList usa?',
      options: ['Uma lista de seções, cada uma com title e data', 'Um texto grande', 'Um único número', 'Uma imagem'],
      answer: 'Uma lista de seções, cada uma com title e data',
      why: 'sections={[{ title, data: [...] }, ...]}',
    },
  },
];

// ============================================================ MÓDULO 4

/** Diálogo no estilo do sistema, desenhado dentro do celular (Alert.alert real não existe no navegador). */
function SystemAlert({ title, buttons, onPress }: { title: string; buttons: number; onPress: (b: string) => void }) {
  const labels = buttons === 2 ? ['Cancelar', 'OK'] : ['OK'];
  return (
    <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' }]}>
      <View style={{ width: 220, backgroundColor: '#f2f2f7', borderRadius: 14, overflow: 'hidden' }}>
        <View style={{ padding: 16, alignItems: 'center', gap: 4 }}>
          <Text style={{ fontWeight: '800', fontSize: 16 }}>{title}</Text>
          <Text style={{ fontSize: 13, textAlign: 'center' }}>Essa ação não pode ser desfeita.</Text>
        </View>
        <View style={{ flexDirection: 'row', borderTopWidth: 1, borderColor: '#d1d1d6' }}>
          {labels.map((l, i) => (
            <Pressable key={l} onPress={() => onPress(l)} style={{ flex: 1, padding: 11, alignItems: 'center', borderLeftWidth: i ? 1 : 0, borderColor: '#d1d1d6' }}>
              <Text style={{ color: '#007aff', fontWeight: l === 'OK' ? '800' : '400', fontSize: 16 }}>{l}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}

const M4: Lesson[] = [
  {
    component: 'Alert',
    tagline: 'Um aviso rápido do sistema',
    intro: (
      <>
        O <C>Alert</C> não é uma tag: é uma <B>função</B>. Você chama <C>Alert.alert(título, mensagem, botões)</C> e o celular
        mostra o diálogo nativo do sistema. Ótimo para confirmar ações perigosas.
      </>
    ),
    when: '"Excluir foto?", "Sair sem salvar?", "Erro de conexão".',
    code: `Alert.alert(
  {{titulo}},
  'Essa ação não pode ser desfeita.',
  {{botoes}}
);`,
    controls: [
      { key: 'titulo', options: ['Excluir foto?', 'Sair do jogo?'] },
      { key: 'botoes', options: [1, 2], show: (v) => (v === 2 ? "[{ text: 'Cancelar' }, { text: 'OK' }]" : "[{ text: 'OK' }]") },
    ],
    initial: { aberto: false, escolha: '', vezes: 0 },
    Preview: ({ s, set }) => (
      <View style={{ flex: 1 }}>
        <Pad style={{ alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <Text style={{ fontSize: 46 }}>🖼️</Text>
          <Text>{s.escolha ? `Você tocou em: ${s.escolha}` : 'foto_praia.png'}</Text>
          <Button title="Excluir" color="#d32f2f" onPress={() => { set('aberto', true); set('vezes', (s.vezes as number) + 1); }} />
        </Pad>
        {s.aberto ? (
          <SystemAlert
            title={s.titulo as string}
            buttons={s.botoes as number}
            onPress={(b) => {
              set('aberto', false);
              set('escolha', b);
            }}
          />
        ) : null}
      </View>
    ),
    tasks: [
      { text: 'Toque em "Excluir" para chamar o Alert', done: (s) => (s.vezes as number) >= 1 },
      { text: 'Use 2 botões e toque em "Cancelar"', done: (s) => s.botoes === 2 && s.escolha === 'Cancelar' },
    ],
    quiz: {
      question: 'O que é o Alert no React Native?',
      options: ['Uma função que abre o aviso do sistema', 'Um componente que vai dentro do JSX', 'Um tipo de lista', 'Um estilo'],
      answer: 'Uma função que abre o aviso do sistema',
      why: 'Chamamos Alert.alert(...) dentro de um onPress, por exemplo.',
    },
  },
  {
    component: 'Modal',
    tagline: 'Uma janela por cima de tudo',
    intro: (
      <>
        O <C>{'<Modal>'}</C> mostra uma tela <B>por cima</B> da atual, com o conteúdo que você quiser (diferente do Alert, que
        é sempre igual). A prop <C>visible</C> controla se ele aparece, e <C>animationType</C> escolhe a animação.
      </>
    ),
    when: 'Comentários, formulários rápidos, detalhes de um item, confirmações personalizadas.',
    code: `<Modal
  visible={aberto}
  animationType={{animacao}}
  transparent={{transparente}}
>
  <View style={styles.caixa}>
    <Text>💬 Comentários</Text>
    <Button title="Fechar" onPress={() => setAberto(false)} />
  </View>
</Modal>`,
    controls: [
      { key: 'animacao', options: ['fade', 'slide', 'none'] },
      { key: 'transparente', options: [true, false] },
    ],
    initial: { aberto: false, aberturas: 0 },
    Preview: ({ s, set }) => (
      <Pad style={{ alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <Text style={{ fontSize: 16 }}>📷 Post do Lucas</Text>
        <Button title="💬 Ver comentários" onPress={() => { set('aberto', true); set('aberturas', (s.aberturas as number) + 1); }} />
        <Modal visible={s.aberto as boolean} animationType={s.animacao as 'fade'} transparent={s.transparente as boolean} onRequestClose={() => set('aberto', false)}>
          <View style={{ flex: 1, backgroundColor: s.transparente ? 'rgba(0,0,0,0.5)' : '#eceff1', alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 20, width: 320, gap: 10 }}>
              <Text style={{ fontWeight: '800', fontSize: 20 }}>💬 Comentários</Text>
              <Text>Ana: Que foto linda!</Text>
              <Text>Bruno: Onde é isso? 😍</Text>
              <Text style={{ color: '#888', fontSize: 12 }}>Este Modal cobre a tela inteira — no celular é igual.</Text>
              <Button title="Fechar" onPress={() => set('aberto', false)} />
            </View>
          </View>
        </Modal>
      </Pad>
    ),
    tasks: [
      { text: 'Abra o Modal e feche', done: (s) => (s.aberturas as number) >= 1 && !s.aberto },
      { text: "Use animationType 'slide' e abra de novo", done: (s) => s.animacao === 'slide' && (s.aberturas as number) >= 2 },
    ],
    quiz: {
      question: 'Qual prop controla se o Modal aparece?',
      options: ['visible', 'show', 'open', 'display'],
      answer: 'visible',
      why: 'visible={true} mostra; normalmente ligamos ela a um estado com useState.',
    },
  },
  {
    component: 'ActivityIndicator',
    tagline: 'Carregando… aguarde!',
    intro: (
      <>
        O <C>{'<ActivityIndicator>'}</C> é a "rodinha" de carregamento. Mostre enquanto busca dados para o usuário saber que
        algo está acontecendo. Props principais: <C>size</C>, <C>color</C> e <C>animating</C>.
      </>
    ),
    when: 'Enquanto carrega uma lista, faz login, envia uma foto…',
    code: `{carregando ? (
  <ActivityIndicator
    size={{tamanho}}
    color={{cor}}
    animating={{animando}}
  />
) : (
  <Text>✅ 12 mensagens novas</Text>
)}`,
    controls: [
      { key: 'tamanho', options: ['small', 'large'] },
      { key: 'cor', options: ['#6c3ce1', '#e53935', '#43a047'] },
      { key: 'animando', options: [true, false] },
    ],
    initial: { carregando: true, recarregou: false },
    Preview: ({ s, set }) => {
      useEffect(() => {
        if (!s.carregando) return;
        const t = setTimeout(() => set('carregando', false), 2500);
        return () => clearTimeout(t);
      }, [s.carregando]);
      return (
        <Pad style={{ alignItems: 'center', justifyContent: 'center', gap: 14 }}>
          {s.carregando ? (
            <>
              <ActivityIndicator size={s.tamanho as 'large'} color={s.cor as string} animating={s.animando as boolean} />
              <Text>Buscando mensagens…</Text>
            </>
          ) : (
            <>
              <Text style={{ fontSize: 16 }}>✅ 12 mensagens novas</Text>
              <Button title="Recarregar" onPress={() => { set('carregando', true); set('recarregou', true); }} />
            </>
          )}
        </Pad>
      );
    },
    tasks: [
      { text: "Deixe o indicador grande ('large')", done: (s) => s.tamanho === 'large' },
      { text: 'Pinte de verde', done: (s) => s.cor === '#43a047' },
      { text: 'Espere carregar e toque em "Recarregar"', done: (s) => s.recarregou === true },
    ],
    quiz: {
      question: 'Quando usar o ActivityIndicator?',
      options: ['Enquanto algo está carregando', 'Para confirmar uma exclusão', 'Para mostrar imagens', 'Para o usuário digitar'],
      answer: 'Enquanto algo está carregando',
      why: 'Ele dá feedback de que o app está trabalhando.',
    },
  },
];

// ============================================================ MÓDULO 5 (simulações de React Navigation)

const M5: Lesson[] = [
  {
    component: 'Stack',
    tagline: 'Telas empilhadas: vai e volta',
    intro: (
      <>
        O <C>Stack</C> (da biblioteca React Navigation) <B>empilha</B> telas como cartas. <C>navigation.navigate('Detalhes')</C>{' '}
        coloca uma tela por cima; <C>navigation.goBack()</C> tira a de cima e volta. Aqui simulamos com componentes RN.
      </>
    ),
    when: 'Lista → detalhes, carrinho → pagamento: fluxos com "voltar".',
    code: `const Stack = createNativeStackNavigator();

<Stack.Navigator screenOptions={{
  headerShown: {{cabecalho}},
  headerStyle: { backgroundColor: {{cor}} },
}}>
  <Stack.Screen name="Produtos" component={Produtos} />
  <Stack.Screen name="Detalhes" component={Detalhes} />
</Stack.Navigator>

// tocar em um produto:
navigation.navigate('Detalhes');`,
    controls: [
      { key: 'cabecalho', options: [true, false] },
      { key: 'cor', options: ['#1976d2', '#6c3ce1', '#2e7d32'] },
    ],
    initial: { pilha: 'Produtos', voltou: false, abriu: false },
    Preview: ({ s, set }) => {
      const pilha = (s.pilha as string).split('|');
      const topo = pilha[pilha.length - 1];
      return (
        <View style={{ flex: 1, paddingTop: 30 }}>
          {s.cabecalho ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10, backgroundColor: s.cor as string }}>
              {pilha.length > 1 ? (
                <Pressable onPress={() => { set('pilha', pilha.slice(0, -1).join('|')); set('voltou', true); }}>
                  <Text style={{ color: '#fff', fontWeight: '800' }}>‹ Voltar</Text>
                </Pressable>
              ) : null}
              <Text style={{ color: '#fff', fontWeight: '800' }}>{topo === 'Produtos' ? 'Produtos' : 'Detalhes'}</Text>
              <Text style={{ marginLeft: 'auto', color: '#ffffffaa', fontSize: 11 }}>pilha: {pilha.length}</Text>
            </View>
          ) : null}
          {topo === 'Produtos' ? (
            ['🎧 Fone', '⌚ Relógio', '📷 Câmera'].map((p) => (
              <Pressable key={p} onPress={() => { set('pilha', `${s.pilha}|${p}`); set('abriu', true); }} style={{ padding: 14, borderBottomWidth: 1, borderColor: '#eee' }}>
                <Text>{p} ›</Text>
              </Pressable>
            ))
          ) : (
            <View style={{ padding: 16, gap: 8 }}>
              <Text style={{ fontSize: 44 }}>{topo.split(' ')[0]}</Text>
              <Text style={{ fontWeight: '800', fontSize: 18 }}>{topo}</Text>
              <Text>Esta tela entrou por cima da lista.</Text>
              {!s.cabecalho ? <Text style={{ color: '#e53935' }}>Sem cabeçalho não há botão de voltar!</Text> : null}
            </View>
          )}
        </View>
      );
    },
    tasks: [
      { text: 'Toque em um produto para empilhar a tela de detalhes', done: (s) => s.abriu === true },
      { text: 'Volte para a lista com "‹ Voltar"', done: (s) => s.voltou === true },
      { text: 'Mude a cor do cabeçalho', done: (s) => s.cor !== '#1976d2' },
    ],
    quiz: {
      question: 'No Stack, o que navigation.goBack() faz?',
      options: ['Volta para a tela anterior da pilha', 'Fecha o app', 'Abre o menu lateral', 'Troca de aba'],
      answer: 'Volta para a tela anterior da pilha',
      why: 'Ele remove a tela do topo da pilha.',
    },
  },
  {
    component: 'BottomTabs',
    tagline: 'Abas na parte de baixo',
    intro: (
      <>
        As <C>BottomTabs</C> mostram as <B>seções principais</B> do app em abas fixas embaixo — como Instagram e WhatsApp. Cada
        aba é uma tela. (Também vem do React Navigation; aqui simulamos.)
      </>
    ),
    when: 'Apps com 3 a 5 áreas principais usadas o tempo todo.',
    code: `const Tab = createBottomTabNavigator();

<Tab.Navigator screenOptions={{
  tabBarActiveTintColor: {{cor}},
  tabBarShowLabel: {{rotulos}},
}}>
  <Tab.Screen name="Início" component={Inicio} />
  <Tab.Screen name="Busca" component={Busca} />
  <Tab.Screen name="Perfil" component={Perfil} />
  {{abas}}
</Tab.Navigator>`,
    controls: [
      { key: 'cor', options: ['#1976d2', '#e53935', '#8e24aa'] },
      { key: 'rotulos', options: [true, false] },
      { key: 'abas', options: [3, 4], show: (v) => (v === 4 ? '<Tab.Screen name="Loja" component={Loja} />' : '{/* + uma aba? */}') },
    ],
    initial: { aba: 'Início', visitouPerfil: false },
    Preview: ({ s, set }) => {
      const tabs = [
        { id: 'Início', icon: '🏠' },
        { id: 'Busca', icon: '🔎' },
        { id: 'Perfil', icon: '👤' },
        { id: 'Loja', icon: '🛍️' },
      ].slice(0, s.abas as number);
      const atual = tabs.find((t) => t.id === s.aba) ?? tabs[0];
      return (
        <View style={{ flex: 1, paddingTop: 30 }}>
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 48 }}>{atual.icon}</Text>
            <Text style={{ fontWeight: '800', fontSize: 18 }}>Tela {atual.id}</Text>
          </View>
          <View style={{ flexDirection: 'row', borderTopWidth: 1, borderColor: '#ddd', paddingBottom: 6 }}>
            {tabs.map((t) => (
              <Pressable key={t.id} onPress={() => { set('aba', t.id); if (t.id === 'Perfil') set('visitouPerfil', true); }} style={{ flex: 1, alignItems: 'center', padding: 8 }}>
                <Text style={{ fontSize: 20, opacity: atual.id === t.id ? 1 : 0.5 }}>{t.icon}</Text>
                {s.rotulos ? (
                  <Text style={{ fontSize: 11, color: atual.id === t.id ? (s.cor as string) : '#888', fontWeight: atual.id === t.id ? '800' : '400' }}>{t.id}</Text>
                ) : null}
              </Pressable>
            ))}
          </View>
        </View>
      );
    },
    tasks: [
      { text: 'Visite a aba Perfil', done: (s) => s.visitouPerfil === true },
      { text: 'Adicione uma 4ª aba (Loja)', done: (s) => s.abas === 4 },
      { text: 'Mude a cor da aba ativa', done: (s) => s.cor !== '#1976d2' },
    ],
    quiz: {
      question: 'BottomTabs é ideal quando…',
      options: ['O app tem poucas seções principais usadas o tempo todo', 'O app tem uma tela só', 'Você quer mostrar um aviso', 'Você quer salvar dados'],
      answer: 'O app tem poucas seções principais usadas o tempo todo',
      why: 'As abas deixam as áreas principais sempre a um toque.',
    },
  },
  {
    component: 'Drawer',
    tagline: 'O menu que desliza da lateral',
    intro: (
      <>
        O <C>Drawer</C> ("gaveta") é um menu escondido na lateral que abre com o ícone ☰ ou arrastando. Cabe <B>muitas</B>{' '}
        opções sem ocupar espaço na tela. (React Navigation; simulado aqui.)
      </>
    ),
    when: 'Muitas seções secundárias: configurações, ajuda, sobre, sair…',
    code: `const Drawer = createDrawerNavigator();

<Drawer.Navigator screenOptions={{
  drawerPosition: {{lado}},
  drawerStyle: { width: {{largura}} },
}}>
  <Drawer.Screen name="Início" component={Inicio} />
  <Drawer.Screen name="Configurações" component={Config} />
  <Drawer.Screen name="Ajuda" component={Ajuda} />
</Drawer.Navigator>`,
    controls: [
      { key: 'lado', options: ['left', 'right'] },
      { key: 'largura', options: [160, 210] },
    ],
    initial: { aberto: false, pagina: 'Início', abriu: false },
    Preview: ({ s, set }) => {
      const direita = s.lado === 'right';
      return (
        <View style={{ flex: 1, paddingTop: 30 }}>
          <View style={{ flexDirection: direita ? 'row-reverse' : 'row', alignItems: 'center', gap: 10, padding: 12, backgroundColor: '#37474f' }}>
            <Pressable onPress={() => { set('aberto', true); set('abriu', true); }}>
              <Text style={{ color: '#fff', fontSize: 22 }}>☰</Text>
            </Pressable>
            <Text style={{ color: '#fff', fontWeight: '800' }}>{s.pagina}</Text>
          </View>
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Text>Conteúdo de "{s.pagina}"</Text>
          </View>
          {s.aberto ? (
            <View style={[StyleSheet.absoluteFillObject, { top: 30, flexDirection: direita ? 'row-reverse' : 'row' }]}>
              <View style={{ width: s.largura as number, backgroundColor: '#fff', padding: 12, gap: 4 }}>
                <Text style={{ fontWeight: '800', marginBottom: 6 }}>📱 Menu</Text>
                {['Início', 'Configurações', 'Ajuda', 'Sobre'].map((p) => (
                  <Pressable key={p} onPress={() => { set('pagina', p); set('aberto', false); }} style={{ padding: 8, borderRadius: 6, backgroundColor: p === s.pagina ? '#eceff1' : 'transparent' }}>
                    <Text>{p}</Text>
                  </Pressable>
                ))}
              </View>
              <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' }} onPress={() => set('aberto', false)} />
            </View>
          ) : null}
        </View>
      );
    },
    tasks: [
      { text: 'Abra o menu tocando em ☰', done: (s) => s.abriu === true },
      { text: 'Vá para "Configurações" pelo menu', done: (s) => s.pagina === 'Configurações' },
      { text: "Coloque o menu do lado direito ('right')", done: (s) => s.lado === 'right' },
    ],
    quiz: {
      question: 'O Drawer é…',
      options: ['Um menu lateral que desliza', 'Uma lista com seções', 'Abas na parte de baixo', 'Um aviso do sistema'],
      answer: 'Um menu lateral que desliza',
      why: 'Drawer = gaveta: ela "sai" da lateral da tela.',
    },
  },
];

// ============================================================ MÓDULO 6

const STORAGE_PREFIX = 'rnq_licao_';

const TemaCtx = createContext<{ tema: string; trocar: () => void }>({ tema: 'claro', trocar: () => {} });

function TelaMini({ nome }: { nome: string }) {
  const { tema, trocar } = useContext(TemaCtx);
  const escuro = tema === 'escuro';
  return (
    <View style={{ flex: 1, margin: 6, borderRadius: 12, padding: 10, gap: 6, backgroundColor: escuro ? '#263238' : '#fafafa', borderWidth: 1, borderColor: '#ccc' }}>
      <Text style={{ color: escuro ? '#fff' : '#222', fontWeight: '800' }}>📱 {nome}</Text>
      <Text style={{ color: escuro ? '#cfd8dc' : '#555', fontSize: 12 }}>useContext(Tema) → "{tema}"</Text>
      {nome === 'Tela A' ? <Button title="Trocar tema daqui" onPress={trocar} /> : null}
    </View>
  );
}

const M6: Lesson[] = [
  {
    component: 'useState',
    tagline: 'A memória da tela',
    intro: (
      <>
        <C>useState</C> é um <B>hook</B> que guarda um valor dentro do componente. Ele devolve o valor e uma função para
        mudá-lo: <C>const [pontos, setPontos] = useState(0)</C>. Toda vez que você chama <C>setPontos</C>, a tela é{' '}
        <B>redesenhada</B> com o valor novo. Variável comum não faz isso!
      </>
    ),
    when: 'Contadores, campos de formulário, abrir/fechar Modal, itens selecionados.',
    code: `const [pontos, setPontos] = useState({{inicio}});

<Text>{pontos}</Text>
<Button
  title="+{{passo}}"
  onPress={() => setPontos(pontos + {{passo}})}
/>`,
    controls: [
      { key: 'inicio', options: [0, 10, 100] },
      { key: 'passo', options: [1, 5, 10] },
    ],
    initial: { pontos: 0 },
    Preview: ({ s, set }) => {
      // quando o valor inicial muda, "recriamos" o componente
      useEffect(() => set('pontos', s.inicio as number), [s.inicio]);
      return (
        <Pad style={{ alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <Text style={{ fontSize: 13, color: '#888' }}>pontos</Text>
          <Text style={{ fontSize: 60, fontWeight: '800', color: '#6c3ce1' }}>{s.pontos}</Text>
          <Button title={`+${s.passo}`} onPress={() => set('pontos', (s.pontos as number) + (s.passo as number))} />
        </Pad>
      );
    },
    tasks: [
      { text: 'Chegue a 20 pontos ou mais', done: (s) => (s.pontos as number) >= 20 },
      { text: 'Faça o botão somar de 10 em 10', done: (s) => s.passo === 10 },
      { text: 'Comece o contador em 100', done: (s) => s.inicio === 100 },
    ],
    quiz: {
      question: 'O que acontece quando chamamos setPontos(…)?',
      options: ['O valor muda e a tela é redesenhada', 'Nada acontece', 'O app fecha', 'O valor fica salvo para sempre no celular'],
      answer: 'O valor muda e a tela é redesenhada',
      why: 'O setter atualiza o estado e o React redesenha o componente.',
    },
  },
  {
    component: 'AsyncStorage',
    tagline: 'Guardar dados no celular',
    intro: (
      <>
        O estado do <C>useState</C> some quando o app fecha. Para <B>guardar de verdade</B>, use o <C>AsyncStorage</C>:{' '}
        <C>setItem(chave, valor)</C> salva e <C>getItem(chave)</C> lê. Ele é assíncrono, por isso usamos <C>await</C>. (No
        navegador, por baixo, ele usa o localStorage.)
      </>
    ),
    when: 'Lembrar o nome do usuário, preferências, rascunhos, recordes.',
    code: `// salvar
await AsyncStorage.setItem({{chave}}, nome);

// ao abrir o app de novo
const salvo = await AsyncStorage.getItem({{chave}});`,
    controls: [{ key: 'chave', options: ['nome', 'apelido'] }],
    initial: { texto: '', memoria: '', salvou: false, reabriu: false, recuperado: '' },
    Preview: ({ s, set }) => {
      const key = STORAGE_PREFIX + s.chave;
      return (
        <Pad style={{ gap: 10 }}>
          <Text style={{ fontWeight: '800' }}>📲 Meu App</Text>
          <Text style={{ fontSize: 12, color: '#666' }}>
            Valor salvo em "{s.chave}": <Text style={{ color: '#2e7d32', fontWeight: '800' }}>{(s.recuperado as string) || '—'}</Text>
          </Text>
          <TextInput
            value={s.texto as string}
            onChangeText={(t: string) => set('texto', t)}
            placeholder="seu nome"
            style={{ borderWidth: 1, borderColor: '#999', borderRadius: 8, padding: 8 }}
          />
          <Button
            title="💾 Salvar (setItem)"
            onPress={() => {
              try { localStorage.setItem(key, s.texto as string); } catch { /* ignore */ }
              set('recuperado', s.texto as string);
              set('salvou', true);
            }}
          />
          <Button
            title="🔄 Fechar e reabrir o app"
            color="#757575"
            onPress={() => {
              // "reinicia": o estado some, mas o armazenamento continua
              set('texto', '');
              let v = '';
              try { v = localStorage.getItem(key) ?? ''; } catch { /* ignore */ }
              set('recuperado', v);
              set('reabriu', Boolean(v));
            }}
          />
        </Pad>
      );
    },
    tasks: [
      { text: 'Digite um nome e salve', done: (s) => s.salvou === true },
      { text: 'Feche e reabra o app: o nome continua lá!', done: (s) => s.reabriu === true },
    ],
    quiz: {
      question: 'O que acontece com os dados do AsyncStorage ao fechar o app?',
      options: ['Continuam salvos no aparelho', 'Somem', 'Viram imagens', 'Vão para outra tela'],
      answer: 'Continuam salvos no aparelho',
      why: 'É armazenamento persistente: só some se o app apagar ou for desinstalado.',
    },
  },
  {
    component: 'Context',
    tagline: 'Dados compartilhados entre telas',
    intro: (
      <>
        Passar um dado de tela em tela por props cansa. O <C>Context</C> resolve: você cria com <C>createContext</C>, envolve
        as telas com um <C>{'<Provider value={...}>'}</C> e qualquer tela lá dentro lê com <C>useContext</C>. Mudou no
        Provider → <B>todas</B> as telas mudam.
      </>
    ),
    when: 'Tema claro/escuro, usuário logado, idioma, carrinho de compras.',
    code: `const Tema = createContext('claro');

<Tema.Provider value={{tema}}>
  <TelaA />  // useContext(Tema)
  <TelaB />  // useContext(Tema)
</Tema.Provider>`,
    controls: [{ key: 'tema', options: ['claro', 'escuro'], show: (v) => `{'${v}'}` }],
    initial: { trocouDeDentro: false },
    Preview: ({ s, set }) => (
      <TemaCtx.Provider
        value={{
          tema: s.tema as string,
          trocar: () => {
            set('tema', s.tema === 'claro' ? 'escuro' : 'claro');
            set('trocouDeDentro', true);
          },
        }}
      >
        <View style={{ flex: 1, paddingTop: 32 }}>
          <TelaMini nome="Tela A" />
          <TelaMini nome="Tela B" />
        </View>
      </TemaCtx.Provider>
    ),
    tasks: [
      { text: "Mude o value do Provider para 'escuro' e veja as DUAS telas mudarem", done: (s) => s.tema === 'escuro' },
      { text: 'Troque o tema pelo botão de dentro da Tela A', done: (s) => s.trocouDeDentro === true },
    ],
    quiz: {
      question: 'Para que serve o Context?',
      options: ['Compartilhar dados entre várias telas sem passar props uma a uma', 'Salvar dados no aparelho', 'Mostrar listas', 'Estilizar componentes'],
      answer: 'Compartilhar dados entre várias telas sem passar props uma a uma',
      why: 'Provider "fornece" o valor; useContext "lê" em qualquer tela dentro dele.',
    },
  },
];

export const M3TO6_LESSONS: Lesson[] = [...M3, ...M4, ...M5, ...M6];
