/**
 * DEMONSTRAÇÕES VIVAS — componentes React Native de verdade (via react-native-web)
 * mostrados dentro dos desafios. O servidor manda só a chave (ex.: "flatlist_many").
 *
 * Para criar uma demo nova: adicione uma entrada em DEMOS e use a chave no
 * campo `demo` de um desafio em server/src/content/challenges.ts.
 * (Os textos aqui nunca citam o nome do componente, para não entregar a resposta.)
 */
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Button,
  FlatList,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  SectionList,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { PhoneFrame } from './PhoneFrame';

const AVATAR = { uri: '/img/avatar.svg' };
const BOOK = { uri: '/img/book.svg' };

/** área de conteúdo abaixo do "notch" */
function Screen({ children, style }: { children: ReactNode; style?: object }) {
  return <View style={[{ flex: 1, paddingTop: 36, paddingHorizontal: 14 }, style]}>{children}</View>;
}

// ------------------------------------------------------------ módulo 1

function TextLabel() {
  return (
    <PhoneFrame>
      <Screen style={{ justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontSize: 26, fontWeight: '800', color: '#222' }}>Olá, turma! 👋</Text>
        <Text style={{ fontSize: 14, color: '#666', marginTop: 8 }}>Bem-vindos à aula de hoje.</Text>
      </Screen>
    </PhoneFrame>
  );
}

function ImagePhoto() {
  return (
    <PhoneFrame>
      <Screen style={{ alignItems: 'center', justifyContent: 'center' }}>
        <Image source={AVATAR} style={{ width: 140, height: 140, borderRadius: 16 }} />
      </Screen>
    </PhoneFrame>
  );
}

function ViewBoxes() {
  return (
    <PhoneFrame>
      <Screen style={{ alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: 200, height: 200, backgroundColor: '#ffcdd2', padding: 16, borderRadius: 12 }}>
          <View style={{ flex: 1, backgroundColor: '#90caf9', padding: 16, borderRadius: 10 }}>
            <View style={{ flex: 1, flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1, backgroundColor: '#a5d6a7', borderRadius: 8 }} />
              <View style={{ flex: 1, backgroundColor: '#fff59d', borderRadius: 8 }} />
            </View>
          </View>
        </View>
      </Screen>
    </PhoneFrame>
  );
}

const pretty = StyleSheet.create({
  card: { backgroundColor: '#6c3ce1', borderRadius: 14, padding: 16, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 8 },
  title: { color: '#fff', fontSize: 20, fontWeight: '800' },
  sub: { color: '#e0d7ff', marginTop: 4 },
});

function StyleSheetBeforeAfter() {
  return (
    <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
      <PhoneFrame width={220} height={260} label="Antes">
        <Screen>
          <View>
            <Text>Promoção de hoje</Text>
            <Text>Pizza grande por R$ 30</Text>
          </View>
        </Screen>
      </PhoneFrame>
      <PhoneFrame width={220} height={260} label="Depois">
        <Screen>
          <View style={pretty.card}>
            <Text style={pretty.title}>Promoção de hoje</Text>
            <Text style={pretty.sub}>Pizza grande por R$ 30</Text>
          </View>
        </Screen>
      </PhoneFrame>
    </View>
  );
}

function SafeAreaNotch() {
  const header = (
    <View style={{ backgroundColor: '#1976d2', padding: 10 }}>
      <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>Minhas Mensagens</Text>
    </View>
  );
  return (
    <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
      <PhoneFrame width={220} height={260} label="❌ Sem área segura">
        <View style={{ flex: 1 }}>{header}</View>
      </PhoneFrame>
      <PhoneFrame width={220} height={260} label="✅ Com área segura">
        <View style={{ flex: 1, paddingTop: 34, backgroundColor: '#1976d2' }}>
          {header}
          <View style={{ flex: 1, backgroundColor: '#fff' }} />
        </View>
      </PhoneFrame>
    </View>
  );
}

// ------------------------------------------------------------ módulo 2

function PressableCard() {
  const [likes, setLikes] = useState(0);
  return (
    <PhoneFrame>
      <Screen>
        <Pressable
          onPress={() => setLikes(likes + 1)}
          style={({ pressed }: { pressed: boolean }) => ({
            backgroundColor: pressed ? '#ffe082' : '#fff8e1',
            borderRadius: 14,
            padding: 12,
            borderWidth: 2,
            borderColor: '#ffb300',
            flexDirection: 'row',
            gap: 10,
            alignItems: 'center',
            transform: [{ scale: pressed ? 0.97 : 1 }],
          })}
        >
          <Text style={{ fontSize: 40 }}>🍕</Text>
          <View>
            <Text style={{ fontWeight: '800', fontSize: 16 }}>Pizza Grande</Text>
            <Text>R$ 30 · toque para curtir</Text>
            <Text style={{ color: '#e65100', marginTop: 4 }}>❤️ {likes}</Text>
          </View>
        </Pressable>
      </Screen>
    </PhoneFrame>
  );
}

function ButtonSimple() {
  const [open, setOpen] = useState(false);
  return (
    <PhoneFrame>
      <Screen style={{ alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <Text style={{ fontSize: 50 }}>{open ? '🚪✨' : '🚪'}</Text>
        <Button title={open ? 'Fechar porta' : 'Abrir porta'} onPress={() => setOpen(!open)} />
      </Screen>
    </PhoneFrame>
  );
}

function TextInputTyping() {
  const [txt, setTxt] = useState('');
  return (
    <PhoneFrame>
      <Screen style={{ gap: 10 }}>
        <Text style={{ fontWeight: '700' }}>Qual é a senha do portão?</Text>
        <TextInput
          value={txt}
          onChangeText={setTxt}
          placeholder="digite aqui…"
          style={{ borderWidth: 1, borderColor: '#999', borderRadius: 8, padding: 10, fontSize: 16 }}
        />
        <Text style={{ color: '#555' }}>Você digitou: {txt || '—'}</Text>
      </Screen>
    </PhoneFrame>
  );
}

function SwitchToggle() {
  const [on, setOn] = useState(false);
  return (
    <PhoneFrame>
      <Screen style={{ alignItems: 'center', justifyContent: 'center', gap: 14, backgroundColor: on ? '#ffebee' : '#fff' }}>
        <Text style={{ fontSize: 54 }}>{on ? '🚨' : '🔕'}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text style={{ fontWeight: '700' }}>Alarme</Text>
          <Switch value={on} onValueChange={setOn} />
        </View>
        <Text>{on ? 'Alarme LIGADO' : 'Alarme desligado'}</Text>
      </Screen>
    </PhoneFrame>
  );
}

// ------------------------------------------------------------ módulo 3

const BOOKS = Array.from({ length: 1000 }, (_, i) => ({ id: String(i), title: `Livro nº ${i + 1}` }));

function FlatListMany() {
  return (
    <PhoneFrame>
      <View style={{ flex: 1, paddingTop: 34 }}>
        <Text style={{ fontWeight: '800', paddingHorizontal: 12, paddingBottom: 6 }}>📚 1000 livros (role!)</Text>
        <FlatList
          data={BOOKS}
          keyExtractor={(b: { id: string }) => b.id}
          initialNumToRender={12}
          renderItem={({ item }: { item: { title: string } }) => (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 8, borderBottomWidth: 1, borderColor: '#eee' }}>
              <Image source={BOOK} style={{ width: 24, height: 24 }} />
              <Text>{item.title}</Text>
            </View>
          )}
        />
      </View>
    </PhoneFrame>
  );
}

function SectionListGroups() {
  const sections = [
    { title: '🚀 Ficção', data: ['Duna', 'Fundação', 'Neuromancer'] },
    { title: '🔬 Ciência', data: ['Cosmos', 'O Gene', 'Breves Respostas'] },
    { title: '💻 Programação', data: ['Código Limpo', 'O Programador Pragmático'] },
  ];
  return (
    <PhoneFrame>
      <View style={{ flex: 1, paddingTop: 34 }}>
        <SectionList
          sections={sections}
          keyExtractor={(item: string) => item}
          renderSectionHeader={({ section }: { section: { title: string } }) => (
            <Text style={{ backgroundColor: '#ede7f6', padding: 6, fontWeight: '800' }}>{section.title}</Text>
          )}
          renderItem={({ item }: { item: string }) => <Text style={{ padding: 8, paddingLeft: 16 }}>{item}</Text>}
        />
      </View>
    </PhoneFrame>
  );
}

function ScrollViewFew() {
  return (
    <PhoneFrame>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 14, paddingTop: 36, gap: 10 }}>
        <Text style={{ fontWeight: '800', fontSize: 18 }}>Sobre a escola</Text>
        {['Fundada em 1990, nossa escola forma desenvolvedores.', 'Temos laboratórios com computadores modernos.', 'Os alunos criam apps reais durante o curso.', 'Role até o fim para ver o contato! 👇', 'Contato: contato@escola.com'].map((t) => (
          <Text key={t} style={{ fontSize: 15, lineHeight: 22, backgroundColor: '#f5f5f5', padding: 12, borderRadius: 8 }}>
            {t}
          </Text>
        ))}
      </ScrollView>
    </PhoneFrame>
  );
}

// ------------------------------------------------------------ módulo 4

function AlertConfirm() {
  const [status, setStatus] = useState('Item: foto_praia.png');
  const ask = () => {
    // No celular, Alert.alert abre o diálogo nativo. No navegador o react-native-web
    // não implementa Alert, então usamos o diálogo nativo do browser (mesma ideia).
    if (Platform.OS === 'web') {
      const ok = window.confirm('Excluir item?\n\nEssa ação não pode ser desfeita.');
      setStatus(ok ? '🗑️ Item excluído!' : '✋ Exclusão cancelada');
    }
  };
  return (
    <PhoneFrame>
      <Screen style={{ alignItems: 'center', justifyContent: 'center', gap: 14 }}>
        <Text style={{ fontSize: 44 }}>🖼️</Text>
        <Text>{status}</Text>
        <Button title="Excluir" color="#d32f2f" onPress={ask} />
      </Screen>
    </PhoneFrame>
  );
}

function ModalDialog() {
  const [open, setOpen] = useState(false);
  return (
    <PhoneFrame>
      <Screen style={{ alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <Text style={{ fontSize: 16 }}>📷 Post do Lucas</Text>
        <Button title="💬 Ver comentários" onPress={() => setOpen(true)} />
        <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ backgroundColor: '#fff', borderRadius: 14, padding: 18, width: 300, gap: 8 }}>
              <Text style={{ fontWeight: '800', fontSize: 18 }}>💬 Comentários</Text>
              <Text>Ana: Que foto linda!</Text>
              <Text>Bruno: Onde é isso? 😍</Text>
              <Button title="Fechar" onPress={() => setOpen(false)} />
            </View>
          </View>
        </Modal>
      </Screen>
    </PhoneFrame>
  );
}

function ActivitySpinner() {
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!loading) return;
    const t = setTimeout(() => setLoading(false), 2500);
    return () => clearTimeout(t);
  }, [loading]);
  return (
    <PhoneFrame>
      <Screen style={{ alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        {loading ? (
          <>
            <ActivityIndicator size="large" color="#6c3ce1" />
            <Text>Buscando dados…</Text>
          </>
        ) : (
          <>
            <Text style={{ fontSize: 16 }}>✅ 12 mensagens novas</Text>
            <Button title="Recarregar" onPress={() => setLoading(true)} />
          </>
        )}
      </Screen>
    </PhoneFrame>
  );
}

// ------------------------------------------------------------ módulo 5 (simulações)

function NavStack() {
  const [stack, setStack] = useState<string[]>(['Produtos']);
  const top = stack[stack.length - 1];
  return (
    <PhoneFrame>
      <View style={{ flex: 1, paddingTop: 30 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', padding: 10, borderBottomWidth: 1, borderColor: '#ddd', gap: 8 }}>
          {stack.length > 1 ? (
            <Pressable onPress={() => setStack(stack.slice(0, -1))}>
              <Text style={{ color: '#1976d2', fontWeight: '700' }}>‹ Voltar</Text>
            </Pressable>
          ) : null}
          <Text style={{ fontWeight: '800' }}>{top}</Text>
          <Text style={{ marginLeft: 'auto', color: '#999', fontSize: 11 }}>telas: {stack.length}</Text>
        </View>
        {top === 'Produtos' ? (
          ['🎧 Fone', '⌚ Relógio', '📷 Câmera'].map((p) => (
            <Pressable key={p} onPress={() => setStack([...stack, p])} style={{ padding: 14, borderBottomWidth: 1, borderColor: '#eee' }}>
              <Text>{p} ›</Text>
            </Pressable>
          ))
        ) : (
          <View style={{ padding: 16, gap: 8 }}>
            <Text style={{ fontSize: 40 }}>{top.split(' ')[0]}</Text>
            <Text style={{ fontWeight: '800', fontSize: 18 }}>Detalhes: {top}</Text>
            <Text>Esta tela entrou por cima da lista.</Text>
          </View>
        )}
      </View>
    </PhoneFrame>
  );
}

function NavTabs() {
  const tabs = [
    { id: 'Início', icon: '🏠' },
    { id: 'Busca', icon: '🔎' },
    { id: 'Perfil', icon: '👤' },
  ];
  const [tab, setTab] = useState('Início');
  return (
    <PhoneFrame>
      <View style={{ flex: 1, paddingTop: 30 }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 44 }}>{tabs.find((t) => t.id === tab)?.icon}</Text>
          <Text style={{ fontWeight: '800', fontSize: 18 }}>Tela {tab}</Text>
        </View>
        <View style={{ flexDirection: 'row', borderTopWidth: 1, borderColor: '#ddd' }}>
          {tabs.map((t) => (
            <Pressable key={t.id} onPress={() => setTab(t.id)} style={{ flex: 1, alignItems: 'center', padding: 8 }}>
              <Text style={{ fontSize: 18 }}>{t.icon}</Text>
              <Text style={{ fontSize: 11, color: tab === t.id ? '#1976d2' : '#888', fontWeight: tab === t.id ? '800' : '400' }}>{t.id}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </PhoneFrame>
  );
}

function NavDrawer() {
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState('Início');
  return (
    <PhoneFrame>
      <View style={{ flex: 1, paddingTop: 30 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, backgroundColor: '#37474f' }}>
          <Pressable onPress={() => setOpen(true)}>
            <Text style={{ color: '#fff', fontSize: 20 }}>☰</Text>
          </Pressable>
          <Text style={{ color: '#fff', fontWeight: '800' }}>{page}</Text>
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text>Conteúdo de "{page}"</Text>
        </View>
        {open ? (
          <View style={[StyleSheet.absoluteFillObject, { top: 30, flexDirection: 'row' }]}>
            <View style={{ width: 170, backgroundColor: '#fff', padding: 12, gap: 4, borderRightWidth: 1, borderColor: '#ccc' }}>
              {['Início', 'Configurações', 'Ajuda', 'Sobre', 'Sair'].map((p) => (
                <Pressable key={p} onPress={() => { setPage(p); setOpen(false); }} style={{ padding: 8 }}>
                  <Text style={{ fontWeight: p === page ? '800' : '400' }}>{p}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' }} onPress={() => setOpen(false)} />
          </View>
        ) : null}
      </View>
    </PhoneFrame>
  );
}

// ------------------------------------------------------------ módulo 6

function StateCounter() {
  const [count, setCount] = useState(0);
  return (
    <PhoneFrame>
      <Screen style={{ alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <Text style={{ fontSize: 56, fontWeight: '800' }}>{count}</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Button title="-1" onPress={() => setCount(count - 1)} />
          <Button title="+1" onPress={() => setCount(count + 1)} />
        </View>
      </Screen>
    </PhoneFrame>
  );
}

function StorageSave() {
  // No celular seria AsyncStorage; no navegador o equivalente é o localStorage.
  const KEY = 'rnq_demo_nome';
  const [name, setName] = useState('');
  const [saved, setSaved] = useState<string | null>(() => localStorage.getItem(KEY));
  return (
    <PhoneFrame>
      <Screen style={{ gap: 10 }}>
        <Text style={{ fontWeight: '700' }}>Nome salvo no aparelho:</Text>
        <Text style={{ fontSize: 18, color: '#2e7d32' }}>{saved ?? '(nada salvo ainda)'}</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="seu nome"
          style={{ borderWidth: 1, borderColor: '#999', borderRadius: 8, padding: 8 }}
        />
        <Button title="💾 Salvar" onPress={() => { localStorage.setItem(KEY, name); setSaved(name); }} />
        <Text style={{ color: '#777', fontSize: 12 }}>Recarregue a página (F5) e veja que continua salvo.</Text>
      </Screen>
    </PhoneFrame>
  );
}

const ThemeCtx = createContext<{ dark: boolean; toggle: () => void }>({ dark: false, toggle: () => {} });

function MiniScreen({ title }: { title: string }) {
  const { dark, toggle } = useContext(ThemeCtx);
  return (
    <View style={{ flex: 1, backgroundColor: dark ? '#263238' : '#fafafa', margin: 6, borderRadius: 10, padding: 10, gap: 6 }}>
      <Text style={{ color: dark ? '#fff' : '#222', fontWeight: '800' }}>{title}</Text>
      <Text style={{ color: dark ? '#cfd8dc' : '#555', fontSize: 12 }}>Tema: {dark ? 'escuro' : 'claro'}</Text>
      <Button title="Trocar tema" onPress={toggle} />
    </View>
  );
}

function ContextTheme() {
  const [dark, setDark] = useState(false);
  return (
    <ThemeCtx.Provider value={{ dark, toggle: () => setDark(!dark) }}>
      <PhoneFrame>
        <View style={{ flex: 1, paddingTop: 30 }}>
          <MiniScreen title="📱 Tela A" />
          <MiniScreen title="📱 Tela B" />
        </View>
      </PhoneFrame>
    </ThemeCtx.Provider>
  );
}

export const DEMOS: Record<string, () => ReactNode> = {
  text_label: TextLabel,
  image_photo: ImagePhoto,
  view_boxes: ViewBoxes,
  stylesheet_before_after: StyleSheetBeforeAfter,
  safearea_notch: SafeAreaNotch,
  pressable_card: PressableCard,
  button_simple: ButtonSimple,
  textinput_typing: TextInputTyping,
  switch_toggle: SwitchToggle,
  flatlist_many: FlatListMany,
  sectionlist_groups: SectionListGroups,
  scrollview_few: ScrollViewFew,
  alert_confirm: AlertConfirm,
  modal_dialog: ModalDialog,
  activity_spinner: ActivitySpinner,
  nav_stack: NavStack,
  nav_tabs: NavTabs,
  nav_drawer: NavDrawer,
  state_counter: StateCounter,
  storage_save: StorageSave,
  context_theme: ContextTheme,
};

export function Demo({ id }: { id: string }) {
  const D = DEMOS[id];
  return D ? <D /> : <Text style={{ color: '#f88' }}>Demo "{id}" não encontrada</Text>;
}
