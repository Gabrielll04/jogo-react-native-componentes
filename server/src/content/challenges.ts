/**
 * CONTEÚDO DOS DESAFIOS (com gabarito) — fica só no servidor.
 *
 * Cada estação declarada em shared/modules.ts precisa de uma entrada aqui
 * com o mesmo id. Para adicionar desafios basta acrescentar objetos nas
 * listas `variants` — veja docs/CONTEUDO.md.
 *
 * Regras anti-decoreba aplicadas automaticamente:
 *  - uma variante é sorteada a cada tentativa nova da estação;
 *  - as alternativas são embaralhadas a cada envio;
 *  - o chefe mistura perguntas de todas as estações do módulo.
 */

import type { UIBlock, UINode } from '../../../shared/types';

export interface QuizDef {
  prompt: string;
  /** código mostrado depois do acerto (padrão: o código da demo, em DEMO_CODE) */
  reveal?: string;
  /** demonstração viva no cliente (client/src/ui/demos.tsx) */
  demo?: string;
  code?: string;
  answer: string;
  distractors: string[];
  explanation: string;
  hints: string[];
}

export interface BugDef {
  prompt: string;
  code: string;
  demo?: string;
  fix: string;
  wrong: string[];
  explanation: string;
  hints: string[];
}

export interface MatchDef {
  prompt: string;
  pairs: [string, string][];
  /** quantos pares sortear por rodada */
  pick: number;
  explanation: string;
  hints: string[];
}

export interface BuildDef {
  prompt: string;
  /** tela-objetivo: o aluno precisa montar a mesma árvore de componentes */
  target: UINode;
  /** blocos da paleta (inclua distratores!) */
  blocks: UIBlock[];
  /** estilos do StyleSheet.create do desafio */
  styles: Record<string, Record<string, string | number>>;
  explanation: string;
  hints: string[];
}

export type StationContent =
  | { type: 'quiz_component'; variants: QuizDef[] }
  | { type: 'fix_bug'; variants: BugDef[] }
  | { type: 'match_use'; match: MatchDef }
  | { type: 'build_ui'; build: BuildDef }
  | { type: 'boss_challenge'; bossName: string; rounds: number; hearts: number };

// ======================================================================
// MÓDULO 1 — Vila dos Componentes Fundamentais
// ======================================================================

const m1Quiz: QuizDef[] = [
  {
    prompt: 'Olhe a demonstração: qual componente está mostrando essa frase na tela?',
    demo: 'text_label',
    answer: 'Text',
    distractors: ['View', 'Image', 'StyleSheet'],
    explanation: 'Todo texto visível em React Native precisa estar dentro de <Text>.',
    hints: ['Em React Native, você não pode colocar texto solto dentro de uma caixa.', 'O nome do componente é literalmente a palavra "texto" em inglês.'],
  },
  {
    prompt: 'Qual componente exibe essa foto de avatar?',
    demo: 'image_photo',
    answer: 'Image',
    distractors: ['View', 'Text', 'SafeAreaView'],
    explanation: '<Image source={...} /> mostra imagens locais (require) ou remotas ({ uri }).',
    hints: ['Esse componente recebe a prop "source".'],
  },
  {
    prompt: 'Essas caixas coloridas, uma dentro da outra, são feitas com qual componente?',
    demo: 'view_boxes',
    answer: 'View',
    distractors: ['Text', 'Image', 'StyleSheet'],
    explanation: '<View> é o container básico: cria caixas, áreas e agrupa outros componentes (como uma <div>).',
    hints: ['É o componente mais usado como "container".', 'Pense em "visão/área" em inglês.'],
  },
  {
    prompt: 'O mesmo texto aparece feio e depois bonito. O que foi usado para criar os estilos do segundo?',
    demo: 'stylesheet_before_after',
    answer: 'StyleSheet',
    distractors: ['View', 'SafeAreaView', 'Image'],
    explanation: 'StyleSheet.create({...}) organiza os estilos (cores, tamanhos, margens) e é passado na prop style.',
    hints: ['Ele não aparece na tela: ele organiza estilos.', 'Usamos com .create({ ... }).'],
  },
  {
    prompt: 'No celular com "notch", o conteúdo da esquerda ficou escondido. Qual componente evita isso (direita)?',
    demo: 'safearea_notch',
    answer: 'SafeAreaView',
    distractors: ['View', 'StyleSheet', 'Text'],
    explanation: 'SafeAreaView adiciona espaço para não invadir notch, barra de status e cantos arredondados. (Hoje recomenda-se a versão da biblioteca react-native-safe-area-context.)',
    hints: ['O nome fala de uma "área segura".'],
  },
  {
    prompt: 'Qual componente é usado para mostrar textos?',
    answer: 'Text',
    distractors: ['View', 'Image', 'SafeAreaView'],
    explanation: '<Text> é o único jeito de exibir texto em React Native.',
    hints: ['Não é um container.'],
  },
  {
    prompt: 'Você precisa de uma caixa para agrupar a foto e o nome do usuário. Qual componente usar?',
    answer: 'View',
    distractors: ['Text', 'StyleSheet', 'Image'],
    explanation: '<View> agrupa outros componentes e recebe estilos de layout (flex, padding, borda...).',
    hints: ['É o "container" do React Native.'],
  },
];

const m1Bug: BugDef[] = [
  {
    prompt: 'O app quebrou com "Text strings must be rendered within a <Text> component". Qual é a correção?',
    code: '<View>\n  Olá, aluno!\n</View>',
    fix: '<View>\n  <Text>Olá, aluno!</Text>\n</View>',
    wrong: ['<View text="Olá, aluno!" />', '<Image>\n  Olá, aluno!\n</Image>', '<View>\n  {"Olá, aluno!"}\n</View>'],
    explanation: 'Texto só pode aparecer dentro de <Text>. A View é apenas a caixa em volta.',
    hints: ['A mensagem de erro diz exatamente qual componente falta.'],
  },
  {
    prompt: 'A imagem não aparece. O que está errado?',
    code: '<Image src="avatar.png" />',
    fix: "<Image source={require('./avatar.png')} />",
    wrong: ['<Image>avatar.png</Image>', '<Text source="avatar.png" />', '<View image="avatar.png" />'],
    explanation: 'Image usa a prop source: require() para imagens locais ou { uri: "..." } para imagens da internet.',
    hints: ['No React Native a prop não se chama "src" como no HTML.'],
  },
  {
    prompt: 'O estilo não foi aplicado no título. Qual a correção?',
    code: "const styles = StyleSheet.create({\n  titulo: { fontSize: 24 }\n});\n\n<Text estilo={styles.titulo}>Oi</Text>",
    fix: '<Text style={styles.titulo}>Oi</Text>',
    wrong: ['<Text class="titulo">Oi</Text>', '<Text>{styles.titulo}Oi</Text>', '<StyleSheet><Text>Oi</Text></StyleSheet>'],
    explanation: 'Os estilos criados com StyleSheet.create são passados na prop style.',
    hints: ['Os componentes recebem estilos sempre pela mesma prop, em inglês.'],
  },
  {
    prompt: 'A imagem remota ficou invisível (tamanho 0). Como corrigir?',
    code: "<Image source={{ uri: 'https://site.com/foto.png' }} />",
    fix: "<Image\n  source={{ uri: 'https://site.com/foto.png' }}\n  style={{ width: 80, height: 80 }}\n/>",
    wrong: ["<Image uri='https://site.com/foto.png' />", "<View source={{ uri: 'https://site.com/foto.png' }} />", "<Text>{'https://site.com/foto.png'}</Text>"],
    explanation: 'Imagens remotas não sabem seu tamanho antes de carregar: informe width e height no style.',
    hints: ['Falta dizer o tamanho.'],
  },
];

// ======================================================================
// MÓDULO 2 — Mercado da Interação
// ======================================================================

const m2Quiz: QuizDef[] = [
  {
    prompt: 'Toque no cartão da demonstração. Qual componente deixa uma área qualquer clicável e personalizável?',
    demo: 'pressable_card',
    answer: 'Pressable',
    distractors: ['Button', 'Switch', 'View'],
    explanation: 'Pressable transforma qualquer conteúdo em área de toque, com estados como "pressed" para personalizar o visual.',
    hints: ['Diferente do botão pronto, ele aceita qualquer coisa dentro.'],
  },
  {
    prompt: 'Qual componente é esse botão simples e pronto, com título e onPress?',
    demo: 'button_simple',
    answer: 'Button',
    distractors: ['Pressable', 'Text', 'Switch'],
    explanation: '<Button title="..." onPress={...} /> é o botão padrão: rápido de usar, mas pouco personalizável.',
    hints: ['Ele recebe a prop "title".'],
  },
  {
    prompt: 'Digite algo na demonstração. Que componente recebe o texto digitado?',
    demo: 'textinput_typing',
    answer: 'TextInput',
    distractors: ['Text', 'Button', 'Pressable'],
    explanation: 'TextInput é a caixa de entrada de texto; use value + onChangeText para controlar o que foi digitado.',
    hints: ['É um "Text" que recebe "Input".'],
  },
  {
    prompt: 'Ligue e desligue o alarme. Qual componente é esse?',
    demo: 'switch_toggle',
    answer: 'Switch',
    distractors: ['Button', 'Pressable', 'TextInput'],
    explanation: 'Switch é o interruptor liga/desliga, controlado por value e onValueChange.',
    hints: ['Em inglês, "interruptor".'],
  },
  {
    prompt: 'Você quer um cartão de produto inteiro (imagem + preço) que reage ao toque mudando de cor. O melhor é:',
    answer: 'Pressable',
    distractors: ['Button', 'Switch', 'TextInput'],
    explanation: 'Button só aceita um título. Para áreas clicáveis com conteúdo e visual próprios, use Pressable.',
    hints: ['Button só aceita "title"...'],
  },
];

const m2Bug: BugDef[] = [
  {
    prompt: 'O botão não mostra nada escrito. Qual a correção?',
    code: '<Button onPress={abrir}>Abrir porta</Button>',
    fix: '<Button title="Abrir porta" onPress={abrir} />',
    wrong: ['<Button text="Abrir porta" click={abrir} />', '<Button onClick={abrir}>Abrir porta</Button>', '<Text onPress={abrir} title="Abrir porta" />'],
    explanation: 'Button usa a prop title para o texto e onPress para a ação. Ele não aceita filhos.',
    hints: ['O texto do Button vai em uma prop, não entre as tags.'],
  },
  {
    prompt: 'O texto digitado não aparece no estado. O que corrigir?',
    code: "const [senha, setSenha] = useState('');\n\n<TextInput value={senha} />",
    fix: '<TextInput value={senha} onChangeText={setSenha} />',
    wrong: ['<TextInput value={senha} onPress={setSenha} />', '<TextInput>{senha}</TextInput>', '<Text value={senha} onChangeText={setSenha} />'],
    explanation: 'Um TextInput controlado precisa de value e de onChangeText para atualizar o estado.',
    hints: ['Falta o evento chamado quando o texto muda.'],
  },
  {
    prompt: 'O Switch não muda quando clicamos. Como corrigir?',
    code: 'const [ligado, setLigado] = useState(false);\n\n<Switch value={ligado} />',
    fix: '<Switch value={ligado} onValueChange={setLigado} />',
    wrong: ['<Switch value={ligado} onPress={setLigado} />', '<Switch checked={ligado} />', '<Button value={ligado} onValueChange={setLigado} />'],
    explanation: 'Switch é controlado: value mostra o estado e onValueChange avisa a mudança.',
    hints: ['O nome do evento tem "Value" e "Change".'],
  },
];

// ======================================================================
// MÓDULO 3 — Biblioteca das Listas
// ======================================================================

const m3Quiz: QuizDef[] = [
  {
    prompt: 'Essa lista tem 1000 livros e continua leve. Qual componente renderiza só o que está visível?',
    demo: 'flatlist_many',
    answer: 'FlatList',
    distractors: ['ScrollView', 'SectionList', 'View'],
    explanation: 'FlatList renderiza itens sob demanda (virtualização), ideal para listas grandes.',
    hints: ['Usa as props data e renderItem.'],
  },
  {
    prompt: 'Livros agrupados por categoria, com títulos de seção. Qual componente?',
    demo: 'sectionlist_groups',
    answer: 'SectionList',
    distractors: ['FlatList', 'ScrollView', 'View'],
    explanation: 'SectionList recebe sections=[{ title, data }] e renderiza cabeçalhos de seção.',
    hints: ['Pense em "seções".'],
  },
  {
    prompt: 'Uma tela de "Sobre" com poucos parágrafos que não cabem na tela. O suficiente é:',
    demo: 'scrollview_few',
    answer: 'ScrollView',
    distractors: ['FlatList', 'SectionList', 'Image'],
    explanation: 'ScrollView rola qualquer conteúdo, mas renderiza tudo de uma vez — ótimo para pouco conteúdo.',
    hints: ['Não precisa de data nem renderItem.'],
  },
  {
    prompt: 'Você precisa mostrar o inventário do jogador com centenas de itens. Qual escolher?',
    answer: 'FlatList',
    distractors: ['ScrollView', 'View', 'Text'],
    explanation: 'Para muitos itens, FlatList é mais eficiente que ScrollView.',
    hints: ['Centenas de itens = performance importa.'],
  },
];

const m3Bug: BugDef[] = [
  {
    prompt: 'A FlatList não mostra nada. O que falta?',
    code: '<FlatList data={livros} />',
    fix: '<FlatList\n  data={livros}\n  renderItem={({ item }) => <Text>{item.titulo}</Text>}\n/>',
    wrong: ['<FlatList data={livros}>{livros}</FlatList>', '<FlatList items={livros} />', '<ScrollView data={livros} />'],
    explanation: 'FlatList precisa de data (os itens) e renderItem (como desenhar cada item).',
    hints: ['Ela sabe os dados, mas não sabe como desenhar cada um.'],
  },
  {
    prompt: 'Aviso: "VirtualizedList: missing keys for items". Como corrigir?',
    code: '<FlatList\n  data={livros}\n  renderItem={({ item }) => <Text>{item.titulo}</Text>}\n/>',
    fix: '<FlatList\n  data={livros}\n  keyExtractor={(item) => item.id}\n  renderItem={({ item }) => <Text>{item.titulo}</Text>}\n/>',
    wrong: ['<FlatList data={livros} key="livros" renderItem={...} />', '<FlatList data={livros} id={1} renderItem={...} />', '<SectionList data={livros} renderItem={...} />'],
    explanation: 'keyExtractor dá uma chave única para cada item, ajudando a lista a se atualizar corretamente.',
    hints: ['Cada item precisa de uma chave única.'],
  },
  {
    prompt: 'A SectionList quebra. Qual formato de dados está certo?',
    code: "<SectionList sections={['Ficção', 'Ciência']} ... />",
    fix: "<SectionList\n  sections={[\n    { title: 'Ficção', data: ['Duna'] },\n    { title: 'Ciência', data: ['Cosmos'] },\n  ]}\n  ...\n/>",
    wrong: ["<SectionList data={['Ficção', 'Ciência']} />", "<SectionList sections={{ Ficção: ['Duna'] }} />", "<FlatList sections={['Ficção', 'Ciência']} />"],
    explanation: 'Cada seção é um objeto com title e data (a lista de itens da seção).',
    hints: ['Cada seção precisa de um título e de seus itens.'],
  },
];

// ======================================================================
// MÓDULO 4 — Torre do Feedback
// ======================================================================

const m4Quiz: QuizDef[] = [
  {
    prompt: 'Aperte "Excluir": aparece um aviso rápido do sistema com Cancelar/OK. Qual API faz isso?',
    demo: 'alert_confirm',
    answer: 'Alert',
    distractors: ['Modal', 'ActivityIndicator', 'Switch'],
    explanation: 'Alert.alert(título, mensagem, botões) mostra o diálogo nativo do sistema.',
    hints: ['Não é um componente que você coloca no JSX: é chamado como função.'],
  },
  {
    prompt: 'Abra a janela de comentários. Qual componente cria essa sobreposição personalizada?',
    demo: 'modal_dialog',
    answer: 'Modal',
    distractors: ['Alert', 'View', 'ScrollView'],
    explanation: 'Modal mostra conteúdo personalizado por cima da tela, controlado pela prop visible.',
    hints: ['Diferente do aviso do sistema, aqui você desenha o conteúdo que quiser.'],
  },
  {
    prompt: 'Qual componente mostra esse indicador girando enquanto os dados carregam?',
    demo: 'activity_spinner',
    answer: 'ActivityIndicator',
    distractors: ['Modal', 'Alert', 'Switch'],
    explanation: 'ActivityIndicator é o "spinner" de carregamento (props size e color).',
    hints: ['Indica "atividade" em andamento.'],
  },
  {
    prompt: 'O usuário vai apagar a conta. Qual feedback rápido de confirmação é o mais simples?',
    answer: 'Alert',
    distractors: ['ActivityIndicator', 'FlatList', 'Switch'],
    explanation: 'Uma confirmação simples com Sim/Não é o caso clássico de Alert.',
    hints: ['Simples, com botões do sistema.'],
  },
];

const m4Bug: BugDef[] = [
  {
    prompt: 'O Modal nunca fecha. O que está faltando?',
    code: '<Modal visible={true}>\n  <Text>Comentários</Text>\n</Modal>',
    fix: '<Modal visible={aberto} onRequestClose={() => setAberto(false)}>\n  <Text>Comentários</Text>\n  <Button title="Fechar" onPress={() => setAberto(false)} />\n</Modal>',
    wrong: ['<Modal open>\n  <Text>Comentários</Text>\n</Modal>', '<Alert visible={true}>\n  <Text>Comentários</Text>\n</Alert>', '<Modal>\n  <Text>Comentários</Text>\n</Modal>'],
    explanation: 'A visibilidade do Modal deve vir do estado, e algo precisa mudar esse estado para fechá-lo.',
    hints: ['"true" fixo nunca vai mudar...'],
  },
  {
    prompt: 'Como mostrar o Alert com título e mensagem corretamente?',
    code: "<Alert title=\"Ops\" message=\"Sem internet\" />",
    fix: "Alert.alert('Ops', 'Sem internet');",
    wrong: ["alert.show('Ops')", "<Modal alert='Sem internet' />", "Alert('Ops', 'Sem internet')"],
    explanation: 'Alert é uma API: chamamos Alert.alert(título, mensagem, botões?).',
    hints: ['É uma chamada de função, não uma tag.'],
  },
  {
    prompt: 'O carregamento aparece mesmo depois de os dados chegarem. Corrija:',
    code: '<ActivityIndicator />\n<FlatList data={dados} ... />',
    fix: '{carregando ? <ActivityIndicator /> : <FlatList data={dados} ... />}',
    wrong: ['<ActivityIndicator visible={dados} />', '<Modal><ActivityIndicator /></Modal>', '<ActivityIndicator stop />'],
    explanation: 'Mostre o ActivityIndicator só enquanto carregando for true (renderização condicional).',
    hints: ['Use um estado "carregando" e uma condição.'],
  },
];

// ======================================================================
// MÓDULO 5 — Templo da Navegação
// ======================================================================

const m5Quiz: QuizDef[] = [
  {
    prompt: 'Toque em um produto: a tela de detalhes entra por cima e há um "voltar". Que navegação é essa?',
    demo: 'nav_stack',
    answer: 'Stack',
    distractors: ['BottomTabs', 'Drawer', 'Modal'],
    explanation: 'Stack empilha telas: navigate() coloca uma por cima e goBack() volta.',
    hints: ['Pense em uma pilha de cartas.'],
  },
  {
    prompt: 'Abas fixas na parte de baixo (Início, Busca, Perfil). Qual navegação?',
    demo: 'nav_tabs',
    answer: 'BottomTabs',
    distractors: ['Stack', 'Drawer', 'FlatList'],
    explanation: 'BottomTabs mostra as seções principais do app em abas inferiores.',
    hints: ['Fica "embaixo" e tem "abas".'],
  },
  {
    prompt: 'Toque no ☰: um menu desliza pela lateral. Qual navegação?',
    demo: 'nav_drawer',
    answer: 'Drawer',
    distractors: ['Stack', 'BottomTabs', 'Modal'],
    explanation: 'Drawer é a "gaveta" lateral, boa para muitas seções secundárias.',
    hints: ['Em inglês, "gaveta".'],
  },
  {
    prompt: 'Um app de banco com 4 áreas principais sempre acessíveis. A navegação ideal é:',
    answer: 'BottomTabs',
    distractors: ['Drawer', 'Stack', 'Alert'],
    explanation: 'Poucas áreas principais e muito usadas: abas inferiores deixam tudo a um toque.',
    hints: ['Áreas principais sempre visíveis.'],
  },
];

// ======================================================================
// MÓDULO 6 — Cofre de Dados
// ======================================================================

const m6Quiz: QuizDef[] = [
  {
    prompt: 'Clique no contador. O que guarda o número e redesenha a tela quando ele muda?',
    demo: 'state_counter',
    answer: 'useState',
    distractors: ['AsyncStorage', 'Context', 'StyleSheet'],
    explanation: 'useState guarda um valor do componente; chamar o setter atualiza a tela.',
    hints: ['É um hook que começa com "use".'],
  },
  {
    prompt: 'Salve seu nome e recarregue a página: ele continua lá. Que recurso salva dados no aparelho?',
    demo: 'storage_save',
    answer: 'AsyncStorage',
    distractors: ['useState', 'Context', 'Modal'],
    explanation: 'AsyncStorage salva pares chave/valor (texto) de forma persistente: setItem e getItem.',
    hints: ['Os dados sobrevivem a fechar o app.'],
  },
  {
    prompt: 'Troque o tema: as duas "telas" mudam juntas. Que recurso compartilha o dado entre elas?',
    demo: 'context_theme',
    answer: 'Context',
    distractors: ['useState', 'AsyncStorage', 'FlatList'],
    explanation: 'Context (createContext + Provider + useContext) compartilha dados sem passar props tela por tela.',
    hints: ['Um Provider envolve as telas.'],
  },
  {
    prompt: 'Um valor temporário de um formulário, que pode sumir ao sair da tela, deve ficar em:',
    answer: 'useState',
    distractors: ['AsyncStorage', 'Context', 'SectionList'],
    explanation: 'Dados temporários de uma tela ficam no estado local (useState).',
    hints: ['Temporário e local.'],
  },
];

const m6Bug: BugDef[] = [
  {
    prompt: 'O contador não atualiza na tela. Corrija:',
    code: 'let pontos = 0;\n\n<Button title="+1" onPress={() => pontos++} />\n<Text>{pontos}</Text>',
    fix: 'const [pontos, setPontos] = useState(0);\n\n<Button title="+1" onPress={() => setPontos(pontos + 1)} />\n<Text>{pontos}</Text>',
    wrong: ['const pontos = useState(0);\n<Button onPress={() => pontos++} />', 'AsyncStorage.pontos++', 'useState.pontos = pontos + 1'],
    explanation: 'Variáveis comuns não redesenham a tela. Use useState e o setter.',
    hints: ['Precisa de um hook.'],
  },
  {
    prompt: 'O nome salvo some ao reabrir o app. Corrija:',
    code: "const [nome, setNome] = useState('');\n// ...guardar só no estado",
    fix: "await AsyncStorage.setItem('nome', nome);\n// ao abrir:\nconst salvo = await AsyncStorage.getItem('nome');",
    wrong: ["useState.save('nome')", "Context.setItem('nome', nome)", "localState.persist('nome')"],
    explanation: 'Para persistir entre aberturas do app use AsyncStorage (setItem/getItem são assíncronos).',
    hints: ['Precisa salvar no aparelho, não na memória.'],
  },
  {
    prompt: 'useContext retorna undefined. O que falta?',
    code: 'const Tema = createContext();\n\n<App>\n  <Tela />  // useContext(Tema)\n</App>',
    fix: "<Tema.Provider value={{ cor: 'escuro' }}>\n  <Tela />\n</Tema.Provider>",
    wrong: ['<Tema><Tela /></Tema>', '<Tela context={Tema} />', 'useState(Tema)'],
    explanation: 'Os componentes só recebem o valor do Context se estiverem dentro do Provider.',
    hints: ['Alguém precisa "prover" o valor.'],
  },
];

// ======================================================================
// Código "por trás da tela" de cada demo (mostrado depois do acerto)
// ======================================================================

export const DEMO_CODE: Record<string, string> = {
  text_label: "<Text style={{ fontSize: 26, fontWeight: '800' }}>\n  Olá, turma! 👋\n</Text>",
  image_photo: "<Image\n  source={require('./avatar.png')}\n  style={{ width: 140, height: 140, borderRadius: 16 }}\n/>",
  view_boxes: "<View style={{ backgroundColor: '#ffcdd2', padding: 16 }}>\n  <View style={{ backgroundColor: '#90caf9', padding: 16 }}>\n    <View style={{ flexDirection: 'row' }}>\n      <View style={{ flex: 1, backgroundColor: '#a5d6a7' }} />\n      <View style={{ flex: 1, backgroundColor: '#fff59d' }} />\n    </View>\n  </View>\n</View>",
  stylesheet_before_after: "const styles = StyleSheet.create({\n  card: { backgroundColor: '#6c3ce1', borderRadius: 14, padding: 16 },\n  titulo: { color: '#fff', fontSize: 20, fontWeight: '800' },\n});\n\n<View style={styles.card}>\n  <Text style={styles.titulo}>Promoção de hoje</Text>\n</View>",
  safearea_notch: "<SafeAreaView style={{ flex: 1 }}>\n  <View style={styles.cabecalho}>\n    <Text>Minhas Mensagens</Text>\n  </View>\n</SafeAreaView>",
  pressable_card: "<Pressable\n  onPress={() => setLikes(likes + 1)}\n  style={({ pressed }) => ({\n    backgroundColor: pressed ? '#ffe082' : '#fff8e1',\n  })}\n>\n  <Text>🍕 Pizza Grande</Text>\n</Pressable>",
  button_simple: "<Button\n  title={aberta ? 'Fechar porta' : 'Abrir porta'}\n  onPress={() => setAberta(!aberta)}\n/>",
  textinput_typing: "const [senha, setSenha] = useState('');\n\n<TextInput\n  value={senha}\n  onChangeText={setSenha}\n  placeholder=\"digite aqui…\"\n/>",
  switch_toggle: "const [ligado, setLigado] = useState(false);\n\n<Switch value={ligado} onValueChange={setLigado} />",
  flatlist_many: "<FlatList\n  data={livros}  // 1000 itens\n  keyExtractor={(livro) => livro.id}\n  renderItem={({ item }) => <Text>{item.titulo}</Text>}\n/>",
  sectionlist_groups: "<SectionList\n  sections={[\n    { title: '🚀 Ficção', data: ['Duna', 'Fundação'] },\n    { title: '🔬 Ciência', data: ['Cosmos'] },\n  ]}\n  renderSectionHeader={({ section }) => <Text>{section.title}</Text>}\n  renderItem={({ item }) => <Text>{item}</Text>}\n/>",
  scrollview_few: "<ScrollView>\n  <Text>Sobre a escola</Text>\n  <Text>Fundada em 1990…</Text>\n  <Text>Contato: contato@escola.com</Text>\n</ScrollView>",
  alert_confirm: "Alert.alert('Excluir item?', 'Essa ação não pode ser desfeita.', [\n  { text: 'Cancelar', style: 'cancel' },\n  { text: 'Excluir', onPress: excluir },\n]);",
  modal_dialog: "<Modal visible={aberto} transparent animationType=\"fade\">\n  <View style={styles.caixa}>\n    <Text>💬 Comentários</Text>\n    <Button title=\"Fechar\" onPress={() => setAberto(false)} />\n  </View>\n</Modal>",
  activity_spinner: "{carregando\n  ? <ActivityIndicator size=\"large\" color=\"#6c3ce1\" />\n  : <Text>✅ 12 mensagens novas</Text>}",
  nav_stack: "// React Navigation\nconst Stack = createNativeStackNavigator();\n\n<Stack.Navigator>\n  <Stack.Screen name=\"Produtos\" component={Produtos} />\n  <Stack.Screen name=\"Detalhes\" component={Detalhes} />\n</Stack.Navigator>\n\nnavigation.navigate('Detalhes');",
  nav_tabs: "// React Navigation\nconst Tab = createBottomTabNavigator();\n\n<Tab.Navigator>\n  <Tab.Screen name=\"Início\" component={Inicio} />\n  <Tab.Screen name=\"Busca\" component={Busca} />\n  <Tab.Screen name=\"Perfil\" component={Perfil} />\n</Tab.Navigator>",
  nav_drawer: "// React Navigation\nconst Drawer = createDrawerNavigator();\n\n<Drawer.Navigator>\n  <Drawer.Screen name=\"Início\" component={Inicio} />\n  <Drawer.Screen name=\"Configurações\" component={Config} />\n</Drawer.Navigator>",
  state_counter: "const [contador, setContador] = useState(0);\n\n<Text>{contador}</Text>\n<Button title=\"+1\" onPress={() => setContador(contador + 1)} />",
  storage_save: "await AsyncStorage.setItem('nome', nome);\n\n// ao abrir o app:\nconst salvo = await AsyncStorage.getItem('nome');",
  context_theme: "const Tema = createContext();\n\n<Tema.Provider value={{ escuro, alternar }}>\n  <TelaA />\n  <TelaB />\n</Tema.Provider>\n\n// dentro das telas:\nconst { escuro } = useContext(Tema);",
};

// ======================================================================
// Mapa estação -> conteúdo
// ======================================================================

export const STATION_CONTENT: Record<string, StationContent> = {
  // ---- Módulo 1
  m1_quiz: { type: 'quiz_component', variants: m1Quiz },
  m1_match: {
    type: 'match_use',
    match: {
      prompt: 'Ligue cada componente ao seu uso. Toque em um componente e depois no uso correto.',
      pairs: [
        ['View', 'Criar áreas, caixas e containers'],
        ['Text', 'Mostrar textos'],
        ['Image', 'Mostrar imagens'],
        ['StyleSheet', 'Estilizar componentes'],
        ['SafeAreaView', 'Respeitar as áreas seguras do celular'],
      ],
      pick: 4,
      explanation: 'Esses cinco são a base de quase toda tela em React Native.',
      hints: ['Comece pelos mais óbvios: o que mostra texto? O que mostra imagem?'],
    },
  },
  m1_build: {
    type: 'build_ui',
    build: {
      prompt: 'Monte o CARTÃO DE PERFIL igual à tela-objetivo. Use os blocos para escrever o JSX e escolha o estilo de cada componente.',
      target: {
        type: 'SafeAreaView',
        style: 'tela',
        children: [
          {
            type: 'View',
            style: 'cartao',
            children: [
              { type: 'Image', style: 'foto' },
              { type: 'Text', text: 'Ana Souza', style: 'nome' },
              { type: 'Text', text: 'Dev mobile em treinamento 🚀', style: 'bio' },
            ],
          },
        ],
      },
      blocks: [
        { id: 'safe', type: 'SafeAreaView' },
        { id: 'view', type: 'View' },
        { id: 'img', type: 'Image' },
        { id: 'nome', type: 'Text', text: 'Ana Souza' },
        { id: 'bio', type: 'Text', text: 'Dev mobile em treinamento 🚀' },
        { id: 'btn', type: 'Button', text: 'Seguir' },
        { id: 'oi', type: 'Text', text: 'Olá!' },
      ],
      styles: {
        tela: { flex: 1, backgroundColor: '#f3effd', padding: 16 },
        cartao: { backgroundColor: '#ffffff', borderRadius: 18, padding: 18, alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#e4dcff' },
        foto: { width: 96, height: 96, borderRadius: 48, borderWidth: 3, borderColor: '#6c3ce1' },
        nome: { fontSize: 20, fontWeight: '800', color: '#2d1b69' },
        bio: { fontSize: 13, color: '#6b6b80' },
      },
      explanation: 'SafeAreaView protege a tela do notch, a View agrupa o cartão, Image mostra a foto, Text mostra os textos e o StyleSheet deixa tudo com cara de app!',
      hints: [
        'Comece de fora para dentro: o componente que envolve a tela inteira e respeita o notch.',
        'Os textos e a foto ficam DENTRO da caixa do cartão. Selecione a View antes de inserir.',
        'Cada componente tem um estilo com o mesmo "papel": o cartão usa styles.cartao, a foto styles.foto…',
      ],
    },
  },
  m1_bug: { type: 'fix_bug', variants: m1Bug },
  m1_boss: { type: 'boss_challenge', bossName: 'Guardião da Vila', rounds: 4, hearts: 3 },

  // ---- Módulo 2
  m2_quiz: { type: 'quiz_component', variants: m2Quiz },
  m2_match: {
    type: 'match_use',
    match: {
      prompt: 'Ligue cada componente de interação ao seu uso.',
      pairs: [
        ['Pressable', 'Área clicável personalizada'],
        ['Button', 'Botão simples com título'],
        ['TextInput', 'Digitar texto'],
        ['Switch', 'Ligar e desligar uma opção'],
      ],
      pick: 4,
      explanation: 'Interação = tocar (Pressable/Button), digitar (TextInput) e alternar (Switch).',
      hints: ['Qual deles tem só dois estados?'],
    },
  },
  m2_build: {
    type: 'build_ui',
    build: {
      prompt: 'Monte o PORTÃO DA SENHA do mercado igual à tela-objetivo: título, campo de senha, "lembrar-me" e um botão personalizado.',
      target: {
        type: 'View',
        style: 'tela',
        children: [
          { type: 'Text', text: '🔐 Portão do Mercado', style: 'titulo' },
          { type: 'TextInput', text: 'Digite a senha', style: 'campo' },
          {
            type: 'View',
            style: 'linha',
            children: [{ type: 'Switch' }, { type: 'Text', text: 'Lembrar-me' }],
          },
          { type: 'Pressable', style: 'botao', children: [{ type: 'Text', text: 'Entrar', style: 'textoBotao' }] },
        ],
      },
      blocks: [
        { id: 'view', type: 'View' },
        { id: 'titulo', type: 'Text', text: '🔐 Portão do Mercado' },
        { id: 'campo', type: 'TextInput', text: 'Digite a senha' },
        { id: 'switch', type: 'Switch' },
        { id: 'lembrar', type: 'Text', text: 'Lembrar-me' },
        { id: 'press', type: 'Pressable' },
        { id: 'entrar', type: 'Text', text: 'Entrar' },
        { id: 'btn', type: 'Button', text: 'Entrar' },
        { id: 'img', type: 'Image' },
      ],
      styles: {
        tela: { flex: 1, backgroundColor: '#fff8e1', padding: 20, paddingTop: 44, gap: 14 },
        titulo: { fontSize: 20, fontWeight: '800', color: '#e65100' },
        campo: { borderWidth: 2, borderColor: '#ffb300', borderRadius: 10, padding: 10, backgroundColor: '#fff' },
        linha: { flexDirection: 'row', alignItems: 'center', gap: 8 },
        botao: { backgroundColor: '#ff8f00', padding: 12, borderRadius: 12, alignItems: 'center' },
        textoBotao: { color: '#fff', fontWeight: '800', fontSize: 16 },
      },
      explanation: 'TextInput recebe a senha, Switch liga/desliga e o Pressable cria um botão com o visual que você quiser — o Button pronto não aceita estilos assim!',
      hints: [
        'Uma View com styles.linha coloca o Switch e o texto lado a lado.',
        'O botão laranja tem um Text DENTRO dele. Qual componente clicável aceita filhos?',
        'Button só tem "title": não dá para estilizar nem colocar filhos.',
      ],
    },
  },
  m2_bug: { type: 'fix_bug', variants: m2Bug },
  m2_boss: { type: 'boss_challenge', bossName: 'Mercador Supremo', rounds: 4, hearts: 3 },

  // ---- Módulo 3
  m3_quiz: { type: 'quiz_component', variants: m3Quiz },
  m3_match: {
    type: 'match_use',
    match: {
      prompt: 'Ligue cada lista ao melhor uso.',
      pairs: [
        ['ScrollView', 'Pouco conteúdo que precisa rolar'],
        ['FlatList', 'Lista grande de itens'],
        ['SectionList', 'Lista agrupada por categorias'],
      ],
      pick: 3,
      explanation: 'Pouco conteúdo: ScrollView. Muitos itens: FlatList. Grupos: SectionList.',
      hints: ['Qual delas tem "seções"?'],
    },
  },
  m3_bug: { type: 'fix_bug', variants: m3Bug },
  m3_boss: { type: 'boss_challenge', bossName: 'Bibliotecária Ancestral', rounds: 4, hearts: 3 },

  // ---- Módulo 4
  m4_quiz: { type: 'quiz_component', variants: m4Quiz },
  m4_match: {
    type: 'match_use',
    match: {
      prompt: 'Ligue cada feedback à situação certa.',
      pairs: [
        ['Alert', 'Confirmar uma ação rapidamente'],
        ['Modal', 'Janela personalizada sobre a tela'],
        ['ActivityIndicator', 'Mostrar que está carregando'],
      ],
      pick: 3,
      explanation: 'Feedback certo na hora certa deixa o app claro para o usuário.',
      hints: ['Qual deles gira?'],
    },
  },
  m4_bug: { type: 'fix_bug', variants: m4Bug },
  m4_boss: { type: 'boss_challenge', bossName: 'Sentinela da Torre', rounds: 4, hearts: 3 },

  // ---- Módulo 5
  m5_quiz: { type: 'quiz_component', variants: m5Quiz },
  m5_match: {
    type: 'match_use',
    match: {
      prompt: 'Ligue cada navegação ao seu uso.',
      pairs: [
        ['Stack', 'Ir para uma tela de detalhes e voltar'],
        ['BottomTabs', 'Abas principais na parte de baixo'],
        ['Drawer', 'Menu lateral que desliza'],
      ],
      pick: 3,
      explanation: 'Na prática esses navegadores vêm da biblioteca React Navigation.',
      hints: ['Qual delas é uma "pilha"?'],
    },
  },
  m5_boss: { type: 'boss_challenge', bossName: 'Monge Navegador', rounds: 3, hearts: 3 },

  // ---- Módulo 6
  m6_quiz: { type: 'quiz_component', variants: m6Quiz },
  m6_match: {
    type: 'match_use',
    match: {
      prompt: 'Ligue cada recurso de dados ao seu uso.',
      pairs: [
        ['useState', 'Valor temporário da tela'],
        ['AsyncStorage', 'Salvar dados no aparelho'],
        ['Context', 'Compartilhar dados entre telas'],
      ],
      pick: 3,
      explanation: 'Estado local, persistência e compartilhamento: três necessidades diferentes.',
      hints: ['Qual deles sobrevive a fechar o app?'],
    },
  },
  m6_bug: { type: 'fix_bug', variants: m6Bug },
  m6_boss: { type: 'boss_challenge', bossName: 'Dragão do Cofre', rounds: 4, hearts: 3 },
};
