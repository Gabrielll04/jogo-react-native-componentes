/**
 * Editor de código "de mentirinha" com destaque de sintaxe JSX, números de linha
 * e — nas lições — valores clicáveis ("pills") dentro do próprio código.
 */
import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { colors, fonts } from './theme';

type Tok = { t: string; c: string };

const RULES: [RegExp, string][] = [
  [/^\/\/.*/, colors.codeComment],
  [/^(['"`])(?:\\.|(?!\1).)*\1/, colors.codeStr],
  [/^<\/?[A-Za-z][\w.]*/, colors.codeTag],
  [/^\/?>/, colors.codeTag],
  [/^\b(const|let|await|return|import|from|export|function|true|false|null)\b/, colors.codeKey],
  [/^[A-Za-z_]\w*(?==)/, colors.codeAttr],
  [/^\d+(\.\d+)?/, colors.codeNum],
  [/^[{}()[\],;:=.?]/, colors.codePunct],
  [/^[A-Za-z_$][\w$]*/, '#e2e8f0'],
  [/^\s+/, '#e2e8f0'],
];

/** Tokenizador simples (bom o bastante para os trechos do jogo). */
export function tokenize(line: string): Tok[] {
  const out: Tok[] = [];
  let rest = line;
  while (rest.length) {
    let matched = false;
    for (const [re, c] of RULES) {
      const m = rest.match(re);
      if (m && m[0].length) {
        out.push({ t: m[0], c });
        rest = rest.slice(m[0].length);
        matched = true;
        break;
      }
    }
    if (!matched) {
      out.push({ t: rest[0], c: '#e2e8f0' });
      rest = rest.slice(1);
    }
  }
  return out;
}

function Line({ text, renderPill }: { text: string; renderPill?: (key: string) => ReactNode }) {
  // separa {{chave}} (valores editáveis) do resto do código
  const parts = text.split(/(\{\{\w+\}\})/g).filter((p) => p !== '');
  return (
    <Text style={{ fontFamily: fonts.code, fontSize: 14, lineHeight: 24, color: '#e2e8f0' }}>
      {parts.map((part, i) => {
        const pill = part.match(/^\{\{(\w+)\}\}$/);
        if (pill && renderPill) return <Text key={i}>{renderPill(pill[1])}</Text>;
        return tokenize(part).map((tok, j) => (
          <Text key={`${i}-${j}`} style={{ color: tok.c }}>
            {tok.t}
          </Text>
        ));
      })}
      {text === '' ? ' ' : null}
    </Text>
  );
}

export function CodeView(props: {
  code: string;
  renderPill?: (key: string) => ReactNode;
  /** linhas destacadas (1 = primeira) */
  highlight?: number[];
  /** linha clicável (editor de blocos) */
  onLinePress?: (index: number) => void;
  selectedLine?: number;
  renderLineActions?: (index: number) => ReactNode;
  title?: string;
  minHeight?: number;
}) {
  const lines = props.code.split('\n');
  return (
    <View style={{ backgroundColor: colors.codeBg, borderRadius: 14, borderWidth: 2, borderColor: '#262c4d', overflow: 'hidden', minHeight: props.minHeight }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#181c33' }}>
        <View style={{ width: 11, height: 11, borderRadius: 6, backgroundColor: '#ff5f57' }} />
        <View style={{ width: 11, height: 11, borderRadius: 6, backgroundColor: '#febc2e' }} />
        <View style={{ width: 11, height: 11, borderRadius: 6, backgroundColor: '#28c840' }} />
        <Text style={{ color: colors.muted, fontFamily: fonts.code, fontSize: 12, marginLeft: 8 }}>{props.title ?? 'App.js'}</Text>
      </View>
      <View style={{ paddingVertical: 8 }}>
        {lines.map((l, i) => {
          const hl = props.highlight?.includes(i + 1);
          const sel = props.selectedLine === i;
          const content = (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingRight: 8,
                backgroundColor: sel ? 'rgba(97,218,251,0.16)' : hl ? 'rgba(255,75,75,0.16)' : 'transparent',
                borderLeftWidth: 3,
                borderLeftColor: sel ? colors.accent : hl ? colors.bad : 'transparent',
              }}
            >
              <Text style={{ width: 34, textAlign: 'right', paddingRight: 10, color: '#4b5380', fontFamily: fonts.code, fontSize: 12 }}>{i + 1}</Text>
              <View style={{ flex: 1 }}>
                <Line text={l} renderPill={props.renderPill} />
              </View>
              {props.renderLineActions ? props.renderLineActions(i) : null}
            </View>
          );
          return props.onLinePress ? (
            <Pressable key={i} onPress={() => props.onLinePress!(i)}>
              {content}
            </Pressable>
          ) : (
            <View key={i}>{content}</View>
          );
        })}
      </View>
    </View>
  );
}
