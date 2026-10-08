/**
 * Desafio "Monte a tela" (build_ui): o aluno escreve o JSX com blocos,
 * escolhe estilos do StyleSheet e compara o celular dele com a tela-objetivo.
 */
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { isContainer, openTag } from '@shared/jsx';
import type { BuildPayload, ChallengeAnswer, UIBlock, UINode } from '@shared/types';
import { playSound } from '../../audio/sound';
import { Btn } from '../Btn';
import { CodeView } from '../CodeView';
import { PhoneFrame } from '../PhoneFrame';
import { colors, fonts } from '../theme';
import { RenderScreen } from '../uiTree';

interface ENode extends UINode {
  uid: number;
  children?: ENode[];
}

let uidSeq = 1;

const CATEGORY: Record<string, { color: string; label: string }> = {
  SafeAreaView: { color: '#1cb0f6', label: 'container' },
  View: { color: '#1cb0f6', label: 'container' },
  ScrollView: { color: '#1cb0f6', label: 'container' },
  Pressable: { color: '#ff9600', label: 'toque (container)' },
  Text: { color: '#58cc02', label: 'texto' },
  Image: { color: '#a368fc', label: 'mídia' },
  Button: { color: '#ff9600', label: 'toque' },
  TextInput: { color: '#ff4b4b', label: 'entrada' },
  Switch: { color: '#ff4b4b', label: 'entrada' },
};

function strip(n: ENode): UINode {
  const out: UINode = { type: n.type };
  if (n.text !== undefined) out.text = n.text;
  if (n.style) out.style = n.style;
  if (n.children?.length) out.children = n.children.map(strip);
  return out;
}

/** Achata a árvore em linhas de código, lembrando qual nó cada linha representa. */
function toLines(n: ENode, depth = 0, out: { text: string; uid: number; open: boolean }[] = []) {
  const pad = '  '.repeat(depth);
  out.push({ text: pad + openTag(n), uid: n.uid, open: true });
  if (isContainer(n.type) && n.children?.length) {
    n.children.forEach((c) => toLines(c, depth + 1, out));
    out.push({ text: `${pad}</${n.type}>`, uid: n.uid, open: false });
  }
  return out;
}

function findParent(root: ENode, uid: number): ENode | null {
  for (const c of root.children ?? []) {
    if (c.uid === uid) return root;
    const p = findParent(c, uid);
    if (p) return p;
  }
  return null;
}

function findNode(root: ENode | null, uid: number | null): ENode | null {
  if (!root || uid === null) return null;
  if (root.uid === uid) return root;
  for (const c of root.children ?? []) {
    const f = findNode(c, uid);
    if (f) return f;
  }
  return null;
}

const clone = (n: ENode): ENode => ({ ...n, children: n.children?.map(clone) });

export function BuildView({ p, submit, locked, wait = 0 }: { p: BuildPayload; submit: (a: ChallengeAnswer) => void; locked: boolean; wait?: number }) {
  const [root, setRoot] = useState<ENode | null>(null);
  const [sel, setSel] = useState<number | null>(null);
  const lines = useMemo(() => (root ? toLines(root) : []), [root]);
  const selected = findNode(root, sel);
  const styleNames = Object.keys(p.styles);
  const noStyles = styleNames.length === 0; // duelos: só estrutura, sem estilos

  const mutate = (fn: (r: ENode) => void) => {
    if (!root) return;
    const r = clone(root);
    fn(r);
    setRoot(r);
  };

  const insert = (b: UIBlock) => {
    playSound('click');
    const node: ENode = { uid: uidSeq++, type: b.type, text: b.text, children: isContainer(b.type) ? [] : undefined };
    if (!root) {
      setRoot(node);
      setSel(node.uid);
      return;
    }
    const r = clone(root);
    const target = findNode(r, sel) ?? r;
    if (isContainer(target.type)) {
      target.children = [...(target.children ?? []), node];
    } else {
      const parent = findParent(r, target.uid);
      if (!parent) return; // raiz é folha: não dá para inserir ao lado
      const idx = parent.children!.findIndex((c) => c.uid === target.uid);
      parent.children!.splice(idx + 1, 0, node);
    }
    setRoot(r);
    // containers novos ficam selecionados (os próximos blocos entram neles)
    if (isContainer(node.type) || !isContainer(target.type)) setSel(node.uid);
  };

  const remove = (uid: number) => {
    if (!root) return;
    if (root.uid === uid) {
      setRoot(null);
      setSel(null);
      return;
    }
    mutate((r) => {
      const parent = findParent(r, uid)!;
      parent.children = parent.children!.filter((c) => c.uid !== uid);
      setSel(parent.uid);
    });
  };

  const move = (uid: number, dir: -1 | 1) =>
    mutate((r) => {
      const parent = findParent(r, uid);
      if (!parent) return;
      const arr = parent.children!;
      const i = arr.findIndex((c) => c.uid === uid);
      const j = i + dir;
      if (j < 0 || j >= arr.length) return;
      [arr[i], arr[j]] = [arr[j], arr[i]];
    });

  const setStyle = (style: string | undefined) =>
    mutate((r) => {
      const n = findNode(r, sel);
      if (n) n.style = style;
    });

  const selectedLine = lines.findIndex((l) => l.uid === sel && l.open);
  const where = selected ? (isContainer(selected.type) ? `dentro de <${selected.type}>` : `depois de <${selected.type}>`) : 'como raiz da tela';

  const styleSheetCode =
    'const styles = StyleSheet.create({\n' +
    styleNames
      .map((k) => `  ${k}: { ${Object.entries(p.styles[k]).map(([a, v]) => `${a}: ${typeof v === 'string' ? `'${v}'` : v}`).join(', ')} },`)
      .join('\n') +
    '\n});';

  return (
    <View style={{ gap: 14 }}>
      <Text style={styles.prompt}>{p.prompt}</Text>
      <View style={styles.cols}>
        {/* ---------- paleta */}
        <View style={styles.palette}>
          <Text style={styles.colTitle}>🧱 Blocos</Text>
          <Text style={styles.hint}>Clique para inserir {where}</Text>
          {p.blocks.map((b) => {
            const cat = CATEGORY[b.type] ?? { color: '#888', label: '' };
            return (
              <Pressable
                key={b.id}
                onPress={() => insert(b)}
                style={({ hovered }: { hovered?: boolean }) => [styles.block, { backgroundColor: cat.color }, hovered && { filter: 'brightness(1.12)' }]}
              >
                <Text style={styles.blockText} numberOfLines={1}>
                  {b.text !== undefined && b.type === 'Text' ? `<Text>${b.text}</Text>` : b.text ? `<${b.type}> ${b.text}` : `<${b.type}>`}
                </Text>
                <Text style={styles.blockCat}>{cat.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* ---------- editor */}
        <View style={{ flex: 1, minWidth: 330, gap: 10 }}>
          <Text style={styles.colTitle}>✍️ Seu código</Text>
          <CodeView
            title="MinhaTela.js"
            minHeight={160}
            code={lines.length ? lines.map((l) => l.text).join('\n') : '// clique em um bloco para começar'}
            selectedLine={selectedLine}
            onLinePress={(i) => lines[i] && setSel(lines[i].uid)}
            renderLineActions={(i) =>
              lines[i] && lines[i].open && lines[i].uid === sel ? (
                <View style={{ flexDirection: 'row', gap: 4 }}>
                  <Mini label="↑" onPress={() => move(lines[i].uid, -1)} />
                  <Mini label="↓" onPress={() => move(lines[i].uid, 1)} />
                  <Mini label="✕" danger onPress={() => remove(lines[i].uid)} />
                </View>
              ) : null
            }
          />
          {!noStyles && selected && !['Switch', 'Button'].includes(selected.type) ? (
            <View style={styles.styleBox}>
              <Text style={styles.styleLabel}>
                🎨 style de <Text style={{ fontFamily: fonts.code, color: colors.codeTag }}>{`<${selected.type}>`}</Text>:
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {[undefined, ...styleNames].map((n) => (
                  <Pressable key={n ?? 'none'} onPress={() => setStyle(n)} style={[styles.styleChip, selected.style === n && styles.styleChipOn]}>
                    <Text style={[styles.styleChipText, selected.style === n && { color: '#1d2340' }]}>{n ? `styles.${n}` : 'sem estilo'}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}
          {noStyles ? null : <CodeView title="estilos.js" code={styleSheetCode} />}
        </View>

        {/* ---------- celulares */}
        <View style={{ gap: 10, alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ alignItems: 'center', gap: 6 }}>
              <Text style={[styles.colTitle, { color: colors.gold }]}>🎯 Objetivo</Text>
              <PhoneFrame width={220} height={360}>
                <RenderScreen root={p.target} styles={p.styles} pad={noStyles} />
              </PhoneFrame>
            </View>
            <View style={{ alignItems: 'center', gap: 6 }}>
              <Text style={[styles.colTitle, { color: colors.accent }]}>📱 Seu app</Text>
              <PhoneFrame width={220} height={360}>
                <RenderScreen root={root ? strip(root) : null} styles={p.styles} pad={noStyles} />
              </PhoneFrame>
            </View>
          </View>
          <Btn big primary title={wait > 0 ? `🧠 Pense… ${wait}s` : '▶ Executar e conferir'} disabled={!root || locked || wait > 0} onPress={() => root && submit(strip(root))} style={{ alignSelf: 'stretch' }} />
        </View>
      </View>
    </View>
  );
}

function Mini({ label, onPress, danger }: { label: string; onPress: () => void; danger?: boolean }) {
  return (
    <Pressable onPress={onPress} style={{ width: 24, height: 22, borderRadius: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: danger ? colors.bad : colors.panel3 }}>
      <Text style={{ color: '#fff', fontWeight: '800', fontSize: 12 }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  prompt: { color: colors.text, fontFamily: fonts.body, fontSize: 17, fontWeight: '700', lineHeight: 24 },
  cols: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start' },
  palette: { width: 230, gap: 8 },
  colTitle: { color: colors.text, fontFamily: fonts.game, fontWeight: '900', fontSize: 17 },
  hint: { color: colors.muted, fontFamily: fonts.body, fontSize: 12 },
  block: { borderRadius: 10, paddingVertical: 8, paddingHorizontal: 10, borderBottomWidth: 4, borderBottomColor: 'rgba(0,0,0,0.3)' },
  blockText: { color: '#fff', fontFamily: fonts.code, fontWeight: '700', fontSize: 13 },
  blockCat: { color: 'rgba(255,255,255,0.8)', fontFamily: fonts.body, fontSize: 11 },
  styleBox: { backgroundColor: '#24294a', borderRadius: 12, padding: 10, gap: 8 },
  styleLabel: { color: colors.text, fontFamily: fonts.body, fontWeight: '700', fontSize: 14 },
  styleChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: colors.panel3, borderBottomWidth: 3, borderBottomColor: '#171b33' },
  styleChipOn: { backgroundColor: colors.gold, borderBottomColor: '#c9a227' },
  styleChipText: { color: colors.text, fontFamily: fonts.code, fontSize: 12, fontWeight: '700' },
});
