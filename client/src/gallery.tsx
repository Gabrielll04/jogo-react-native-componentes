/**
 * Galeria de componentes (http://IP:3000/demos.html)
 * Mostra todas as demonstrações vivas e moldes de montagem, com o nome do
 * componente — útil para o professor projetar durante a explicação.
 */
import { createRoot } from 'react-dom/client';
import { ScrollView, Text, View } from 'react-native';
import { COMPONENTS, MODULES } from '@shared/modules';
import { Blueprint } from './ui/blueprints';
import { DEMOS } from './ui/demos';
import { colors, ui } from './ui/theme';

/** qual componente cada demo ilustra (aqui pode revelar: é material de aula) */
const DEMO_COMPONENT: Record<string, string> = {
  text_label: 'Text', image_photo: 'Image', view_boxes: 'View', stylesheet_before_after: 'StyleSheet', safearea_notch: 'SafeAreaView',
  pressable_card: 'Pressable', button_simple: 'Button', textinput_typing: 'TextInput', switch_toggle: 'Switch',
  scrollview_few: 'ScrollView', flatlist_many: 'FlatList', sectionlist_groups: 'SectionList',
  alert_confirm: 'Alert', modal_dialog: 'Modal', activity_spinner: 'ActivityIndicator',
  nav_stack: 'Stack', nav_tabs: 'BottomTabs', nav_drawer: 'Drawer',
  state_counter: 'useState', storage_save: 'AsyncStorage', context_theme: 'Context',
};

function Gallery() {
  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 24, gap: 28 }}>
      <View>
        <Text style={ui.title}>⚛️ Galeria de Componentes</Text>
        <Text style={ui.muted}>Todas as demonstrações do jogo, funcionando de verdade com react-native-web. Interaja com elas!</Text>
      </View>
      {MODULES.map((m) => (
        <View key={m.id} style={{ gap: 12 }}>
          <Text style={[ui.h2, { fontSize: 20, color: m.color }]}>
            {m.emoji} Módulo {m.id} — {m.name}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 20 }}>
            {Object.entries(DEMOS)
              .filter(([key]) => COMPONENTS[DEMO_COMPONENT[key]]?.module === m.id)
              .map(([key, Demo]) => (
                <View key={key} style={[ui.panel, { alignItems: 'center', gap: 8 }]}>
                  <Text style={[ui.text, { fontWeight: '800', fontSize: 16 }]}>
                    {COMPONENTS[DEMO_COMPONENT[key]].emoji} {DEMO_COMPONENT[key]}
                  </Text>
                  <Text style={[ui.muted, { maxWidth: 260, textAlign: 'center' }]}>{COMPONENTS[DEMO_COMPONENT[key]].use}</Text>
                  <Demo />
                </View>
              ))}
          </View>
        </View>
      ))}
      <View style={{ gap: 12 }}>
        <Text style={[ui.h2, { fontSize: 20 }]}>🛠️ Moldes de montagem (respostas certas)</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 20 }}>
          <View style={[ui.panel, { alignItems: 'center', gap: 8 }]}>
            <Text style={ui.text}>Cartão de perfil: View + Image + Text + StyleSheet</Text>
            <Blueprint id="profile_card" assign={{ container: 'View', photo: 'Image', name: 'Text', style: 'StyleSheet' }} />
          </View>
          <View style={[ui.panel, { alignItems: 'center', gap: 8 }]}>
            <Text style={ui.text}>Portão da senha: Text + TextInput + Switch + Button</Text>
            <Blueprint id="password_gate" assign={{ label: 'Text', password: 'TextInput', remember: 'Switch', open: 'Button' }} />
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

createRoot(document.getElementById('root')!).render(<Gallery />);
