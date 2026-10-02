/** Lições do Módulo 2 — Mercado da Interação. */
import { Button, Pressable, Switch, Text, TextInput, View } from 'react-native';
import { B, C } from '../ui/Mascot';
import { Pad } from './m1';
import type { Lesson } from './types';

export const M2_LESSONS: Lesson[] = [
  {
    component: 'Pressable',
    tagline: 'Qualquer coisa vira clicável',
    intro: (
      <>
        O <C>{'<Pressable>'}</C> transforma <B>qualquer conteúdo</B> em área de toque: um cartão, uma imagem, um ícone. Ele
        avisa quando está sendo pressionado (<C>pressed</C>), então você pode mudar a cor ou o tamanho na hora do toque.
      </>
    ),
    when: 'Botões personalizados, cartões clicáveis, itens de lista que abrem algo.',
    code: `<Pressable
  onPress={() => setToques(toques + 1)}
  style={({ pressed }) => ({
    backgroundColor: pressed ? {{corToque}} : '#fff8e1',
    transform: [{ scale: pressed ? {{escala}} : 1 }],
  })}
>
  <Text>🍕 Pizza Grande — toques: {toques}</Text>
</Pressable>`,
    controls: [
      { key: 'corToque', options: ['#ffe082', '#b3e5fc', '#c8e6c9'] },
      { key: 'escala', options: [1, 0.95, 0.85] },
    ],
    initial: { toques: 0 },
    Preview: ({ s, set }) => (
      <Pad style={{ justifyContent: 'center' }}>
        <Pressable
          onPress={() => set('toques', (s.toques as number) + 1)}
          style={({ pressed }: { pressed: boolean }) => ({
            backgroundColor: pressed ? (s.corToque as string) : '#fff8e1',
            transform: [{ scale: pressed ? (s.escala as number) : 1 }],
            borderRadius: 14,
            borderWidth: 2,
            borderColor: '#ffb300',
            padding: 14,
            alignItems: 'center',
            gap: 4,
          })}
        >
          <Text style={{ fontSize: 40 }}>🍕</Text>
          <Text style={{ fontWeight: '800' }}>Pizza Grande</Text>
          <Text>toques: {s.toques}</Text>
        </Pressable>
        <Text style={{ textAlign: 'center', color: '#888', marginTop: 10, fontSize: 12 }}>segure o clique para ver o efeito "pressed"</Text>
      </Pad>
    ),
    tasks: [
      { text: 'Toque no cartão 3 vezes', done: (s) => (s.toques as number) >= 3 },
      { text: 'Faça o cartão encolher ao apertar (escala 0.85)', done: (s) => s.escala === 0.85 },
      { text: 'Mude a cor do toque para azul', done: (s) => s.corToque === '#b3e5fc' },
    ],
    quiz: {
      question: 'Qual a diferença entre Pressable e Button?',
      options: ['Pressable aceita qualquer conteúdo e estilo; Button só tem title', 'Nenhuma, são iguais', 'Button aceita filhos e estilos', 'Pressable só funciona no iPhone'],
      answer: 'Pressable aceita qualquer conteúdo e estilo; Button só tem title',
      why: 'Use Button para algo rápido e Pressable quando quiser controlar o visual.',
    },
  },
  {
    component: 'Button',
    tagline: 'O botão pronto para usar',
    intro: (
      <>
        O <C>{'<Button>'}</C> é o botão nativo do sistema. É só dar um <C>title</C> (o texto) e um <C>onPress</C> (o que
        acontece no toque). Ele é simples de propósito: dá para mudar a <C>color</C> e desativar com <C>disabled</C>, mas não
        aceita filhos nem estilos complexos.
      </>
    ),
    when: 'Ações simples e rápidas: "Salvar", "Enviar", "Abrir".',
    code: `<Button
  title={{titulo}}
  color={{cor}}
  disabled={{desativado}}
  onPress={() => setAberta(!aberta)}
/>`,
    controls: [
      { key: 'titulo', options: ['Abrir porta', 'Entrar', 'Enviar'], show: (v) => `"${v}"` },
      { key: 'cor', options: ['#2196f3', '#e53935', '#43a047'] },
      { key: 'desativado', options: [false, true] },
    ],
    initial: { aberta: false, cliques: 0 },
    Preview: ({ s, set }) => (
      <Pad style={{ alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <Text style={{ fontSize: 56 }}>{s.aberta ? '🚪✨' : '🚪'}</Text>
        <Button
          title={s.titulo as string}
          color={s.cor as string}
          disabled={s.desativado as boolean}
          onPress={() => {
            set('aberta', !s.aberta);
            set('cliques', (s.cliques as number) + 1);
          }}
        />
        <Text style={{ color: '#666' }}>{s.aberta ? 'Porta aberta!' : 'Porta fechada'}</Text>
      </Pad>
    ),
    tasks: [
      { text: 'Clique no botão para abrir a porta', done: (s) => (s.cliques as number) >= 1 },
      { text: 'Deixe o botão verde', done: (s) => s.cor === '#43a047' },
      { text: 'Desative o botão (disabled: true) e tente clicar', done: (s) => s.desativado === true },
    ],
    quiz: {
      question: 'Como se define o texto de um <Button>?',
      options: ['Com a prop title', 'Escrevendo entre <Button> e </Button>', 'Com a prop text', 'Com um <Text> dentro dele'],
      answer: 'Com a prop title',
      why: 'Button não aceita filhos: o texto vai sempre em title.',
    },
  },
  {
    component: 'TextInput',
    tagline: 'O aluno digita, o app recebe',
    intro: (
      <>
        O <C>{'<TextInput>'}</C> é a caixa onde o usuário digita. Ele fica ligado a um estado: <C>value</C> mostra o texto e{' '}
        <C>onChangeText</C> é chamado a cada letra digitada. Para senhas, use <C>secureTextEntry</C>.
      </>
    ),
    when: 'Login, busca, formulários, chat.',
    code: `const [valor, setValor] = useState('');

<TextInput
  value={valor}
  onChangeText={setValor}
  placeholder={{placeholder}}
  secureTextEntry={{senha}}
  maxLength={{max}}
/>
<Text>Você digitou: {valor}</Text>`,
    controls: [
      { key: 'placeholder', options: ['Digite seu nome', 'Senha secreta'], show: (v) => `"${v}"` },
      { key: 'senha', options: [false, true] },
      { key: 'max', options: [20, 5] },
    ],
    initial: { valor: '' },
    Preview: ({ s, set }) => (
      <Pad style={{ gap: 12 }}>
        <Text style={{ fontWeight: '800' }}>Cadastro</Text>
        <TextInput
          value={s.valor as string}
          onChangeText={(t: string) => set('valor', t)}
          placeholder={s.placeholder as string}
          secureTextEntry={s.senha as boolean}
          maxLength={s.max as number}
          style={{ borderWidth: 2, borderColor: '#90a4ae', borderRadius: 10, padding: 10, fontSize: 16 }}
        />
        <Text style={{ color: '#555' }}>Você digitou: {(s.valor as string) || '—'}</Text>
      </Pad>
    ),
    tasks: [
      { text: 'Digite algo no campo do celular', done: (s) => (s.valor as string).length > 0 },
      { text: 'Esconda o texto como senha (secureTextEntry)', done: (s) => s.senha === true },
      { text: 'Limite a 5 caracteres (maxLength: 5)', done: (s) => s.max === 5 },
    ],
    quiz: {
      question: 'Qual prop avisa quando o texto do TextInput muda?',
      options: ['onChangeText', 'onPress', 'onValueChange', 'onClick'],
      answer: 'onChangeText',
      why: 'onChangeText recebe o novo texto a cada letra digitada.',
    },
  },
  {
    component: 'Switch',
    tagline: 'Liga ou desliga',
    intro: (
      <>
        O <C>{'<Switch>'}</C> é o interruptor: só tem dois estados, <C>true</C> ou <C>false</C>. Ele também é controlado:{' '}
        <C>value</C> diz se está ligado e <C>onValueChange</C> avisa quando o usuário mexe.
      </>
    ),
    when: 'Configurações: modo escuro, notificações, "lembrar-me".',
    code: `const [ligado, setLigado] = useState(false);

<Switch
  value={ligado}
  onValueChange={setLigado}
  trackColor={{ true: {{trilha}} }}
  thumbColor={{bolinha}}
/>`,
    controls: [
      { key: 'trilha', options: ['#81c784', '#64b5f6', '#ffb74d'] },
      { key: 'bolinha', options: ['#ffffff', '#ffeb3b'] },
    ],
    initial: { ligado: false },
    Preview: ({ s, set }) => (
      <Pad style={{ alignItems: 'center', justifyContent: 'center', gap: 14, backgroundColor: s.ligado ? '#ffebee' : '#fff' }}>
        <Text style={{ fontSize: 56 }}>{s.ligado ? '🚨' : '🔕'}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text style={{ fontWeight: '700' }}>Alarme</Text>
          <Switch
            value={s.ligado as boolean}
            onValueChange={(v: boolean) => set('ligado', v)}
            trackColor={{ true: s.trilha as string, false: '#ccc' }}
            thumbColor={s.bolinha as string}
            activeThumbColor={s.bolinha as string}
          />
        </View>
        <Text>{s.ligado ? 'Alarme LIGADO' : 'Alarme desligado'}</Text>
      </Pad>
    ),
    tasks: [
      { text: 'Ligue o alarme no celular', done: (s) => s.ligado === true },
      { text: 'Mude a cor da trilha para azul', done: (s) => s.trilha === '#64b5f6' },
    ],
    quiz: {
      question: 'Quantos estados um Switch tem?',
      options: ['Dois: ligado ou desligado', 'Três', 'Quantos o usuário quiser', 'Nenhum'],
      answer: 'Dois: ligado ou desligado',
      why: 'O value do Switch é sempre um booleano: true ou false.',
    },
  },
];

