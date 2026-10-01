import type { ModuleConfig } from './types';

/**
 * Catálogo de componentes. Cada componente vira uma "carta" no inventário
 * quando o aluno derrota o chefe do módulo.
 */
export const COMPONENTS: Record<string, { emoji: string; use: string; module: number }> = {
  View: { emoji: '🟦', use: 'Criar áreas, caixas e containers', module: 1 },
  Text: { emoji: '🔤', use: 'Mostrar textos', module: 1 },
  Image: { emoji: '🖼️', use: 'Mostrar imagens', module: 1 },
  StyleSheet: { emoji: '🎨', use: 'Estilizar componentes', module: 1 },
  SafeAreaView: { emoji: '📱', use: 'Respeitar as áreas seguras do celular (notch, barra de status)', module: 1 },

  Pressable: { emoji: '👆', use: 'Criar áreas clicáveis personalizadas', module: 2 },
  Button: { emoji: '🔘', use: 'Botão simples e pronto', module: 2 },
  TextInput: { emoji: '⌨️', use: 'Entrada de texto', module: 2 },
  Switch: { emoji: '🎚️', use: 'Botão liga/desliga', module: 2 },

  ScrollView: { emoji: '📜', use: 'Rolar conteúdo (poucos itens)', module: 3 },
  FlatList: { emoji: '📋', use: 'Lista grande de itens (renderiza sob demanda)', module: 3 },
  SectionList: { emoji: '🗂️', use: 'Lista agrupada em seções', module: 3 },

  Alert: { emoji: '⚠️', use: 'Aviso rápido do sistema', module: 4 },
  Modal: { emoji: '🪟', use: 'Diálogo ou sobreposição sobre a tela', module: 4 },
  ActivityIndicator: { emoji: '⏳', use: 'Indicar carregamento', module: 4 },

  Stack: { emoji: '🥞', use: 'Navegar empilhando telas (ir e voltar)', module: 5 },
  BottomTabs: { emoji: '🧭', use: 'Menu de abas na parte inferior', module: 5 },
  Drawer: { emoji: '🗄️', use: 'Menu lateral que desliza', module: 5 },

  useState: { emoji: '🔁', use: 'Guardar e atualizar informações da tela', module: 6 },
  AsyncStorage: { emoji: '💾', use: 'Salvar dados simples no aparelho (persistente)', module: 6 },
  Context: { emoji: '🌐', use: 'Compartilhar dados entre várias telas', module: 6 },
};

/**
 * Módulos do jogo. Para adicionar um módulo novo veja docs/CONTEUDO.md.
 * - stations: estações de desafio dentro do prédio (máx. 5: 4 desafios + chefe)
 * - o chefe (boss_challenge) só libera após as outras estações do módulo
 */
export const MODULES: ModuleConfig[] = [
  {
    id: 1,
    name: 'Vila dos Componentes Fundamentais',
    emoji: '🏡',
    color: '#3f9b4f',
    components: ['View', 'Text', 'Image', 'StyleSheet', 'SafeAreaView'],
    requires: [],
    sign: 'Aqui moram os blocos de tudo: View (caixas), Text (textos), Image (imagens), StyleSheet (estilos) e SafeAreaView (área segura).',
    stations: [
      { id: 'm1_quiz', title: 'Oráculo dos Componentes', type: 'quiz_component', emoji: '🔮' },
      { id: 'm1_match', title: 'Mural dos Usos', type: 'match_use', emoji: '🧩' },
      { id: 'm1_build', title: 'Oficina do Cartão de Perfil', type: 'build_ui', emoji: '🛠️' },
      { id: 'm1_bug', title: 'Ferreiro de Bugs', type: 'fix_bug', emoji: '🐞' },
      { id: 'm1_boss', title: 'Guardião da Vila', type: 'boss_challenge', emoji: '🗿' },
    ],
  },
  {
    id: 2,
    name: 'Mercado da Interação',
    emoji: '🛒',
    color: '#c47a1c',
    components: ['Pressable', 'Button', 'TextInput', 'Switch'],
    requires: [],
    sign: 'No mercado tudo responde ao toque: Pressable, Button, TextInput e Switch.',
    stations: [
      { id: 'm2_quiz', title: 'Balcão das Interações', type: 'quiz_component', emoji: '🔮' },
      { id: 'm2_match', title: 'Mural dos Usos', type: 'match_use', emoji: '🧩' },
      { id: 'm2_build', title: 'Portão da Senha', type: 'build_ui', emoji: '🛠️' },
      { id: 'm2_bug', title: 'Ferreiro de Bugs', type: 'fix_bug', emoji: '🐞' },
      { id: 'm2_boss', title: 'Mercador Supremo', type: 'boss_challenge', emoji: '👺' },
    ],
  },
  {
    id: 3,
    name: 'Biblioteca das Listas',
    emoji: '📚',
    color: '#5b6bd6',
    components: ['ScrollView', 'FlatList', 'SectionList'],
    requires: [],
    sign: 'Listas pequenas, grandes e agrupadas: ScrollView, FlatList e SectionList.',
    stations: [
      { id: 'm3_quiz', title: 'Estante Misteriosa', type: 'quiz_component', emoji: '🔮' },
      { id: 'm3_match', title: 'Mural dos Usos', type: 'match_use', emoji: '🧩' },
      { id: 'm3_bug', title: 'Ferreiro de Bugs', type: 'fix_bug', emoji: '🐞' },
      { id: 'm3_boss', title: 'Bibliotecária Ancestral', type: 'boss_challenge', emoji: '🦉' },
    ],
  },
  {
    id: 4,
    name: 'Torre do Feedback',
    emoji: '🗼',
    color: '#c0392b',
    components: ['Alert', 'Modal', 'ActivityIndicator'],
    requires: [],
    sign: 'Avise, pergunte e mostre que está carregando: Alert, Modal e ActivityIndicator.',
    stations: [
      { id: 'm4_quiz', title: 'Sino dos Avisos', type: 'quiz_component', emoji: '🔮' },
      { id: 'm4_match', title: 'Mural dos Usos', type: 'match_use', emoji: '🧩' },
      { id: 'm4_bug', title: 'Ferreiro de Bugs', type: 'fix_bug', emoji: '🐞' },
      { id: 'm4_boss', title: 'Sentinela da Torre', type: 'boss_challenge', emoji: '🤖' },
    ],
  },
  {
    id: 5,
    name: 'Templo da Navegação',
    emoji: '⛩️',
    color: '#8e44ad',
    components: ['Stack', 'BottomTabs', 'Drawer'],
    requires: [],
    sign: 'Caminhos entre telas: Stack (pilha), BottomTabs (abas embaixo) e Drawer (menu lateral). Simulados aqui com componentes do React Native.',
    stations: [
      { id: 'm5_quiz', title: 'Altar dos Caminhos', type: 'quiz_component', emoji: '🔮' },
      { id: 'm5_match', title: 'Mural dos Usos', type: 'match_use', emoji: '🧩' },
      { id: 'm5_boss', title: 'Monge Navegador', type: 'boss_challenge', emoji: '🧘' },
    ],
  },
  {
    id: 6,
    name: 'Cofre de Dados',
    emoji: '🔐',
    color: '#16818a',
    components: ['useState', 'AsyncStorage', 'Context'],
    requires: [],
    sign: 'Guarde informações: useState (na tela), AsyncStorage (no aparelho) e Context (entre telas).',
    stations: [
      { id: 'm6_quiz', title: 'Fechadura do Estado', type: 'quiz_component', emoji: '🔮' },
      { id: 'm6_match', title: 'Mural dos Usos', type: 'match_use', emoji: '🧩' },
      { id: 'm6_bug', title: 'Ferreiro de Bugs', type: 'fix_bug', emoji: '🐞' },
      { id: 'm6_boss', title: 'Dragão do Cofre', type: 'boss_challenge', emoji: '🐉' },
    ],
  },
];

export function findStation(stationId: string) {
  for (const m of MODULES) {
    const s = m.stations.find((st) => st.id === stationId);
    if (s) return { module: m, station: s };
  }
  return null;
}

export function levelFromXp(xp: number, xpPerLevel = 100) {
  return Math.floor(xp / xpPerLevel) + 1;
}
