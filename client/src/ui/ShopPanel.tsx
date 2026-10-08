/** Loja de cosméticos 🛍️: comprar e equipar chapéus, rastros, plaquinhas e títulos. */
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { cannotBuy, cosmetic, COSMETIC_KINDS, COSMETICS, type Cosmetic, type CosmeticKind } from '@shared/cosmetics';
import { RULES } from '@shared/events';
import { actions } from '../net/socket';
import { useStore } from '../state/store';
import { Btn } from './Btn';
import { Overlay } from './Overlay';
import { colors, fonts } from './theme';

export function ShopPanel({ onClose }: { onClose: () => void }) {
  const p = useStore((s) => s.progress)!;
  const [kind, setKind] = useState<CosmeticKind>('hat');
  const items = COSMETICS.filter((c) => c.kind === kind);
  const k = COSMETIC_KINDS.find((x) => x.id === kind)!;

  return (
    <Overlay
      title="🛍️ Loja de cosméticos"
      onClose={onClose}
      maxWidth={860}
      header={
        <View style={{ gap: 10, marginBottom: 10 }}>
          <View style={styles.top}>
            <Preview look={p.equipped} name={p.name} color={p.color} />
            <View style={{ flex: 1, gap: 4, minWidth: 220 }}>
              <Text style={styles.coins}>🪙 {p.coins} moedas</Text>
              <Text style={styles.muted}>
                Ganhe moedas aprendendo com os Mestres, vencendo desafios (sem chutar!), corridas e duelos. Itens com 🔒 pedem uma conquista.
              </Text>
            </View>
          </View>
          <View style={styles.tabs}>
            {COSMETIC_KINDS.map((t) => (
              <Pressable key={t.id} onPress={() => setKind(t.id)} style={[styles.tab, kind === t.id && styles.tabOn]}>
                <Text style={[styles.tabText, kind === t.id && { color: '#1d2340' }]}>
                  {t.emoji} {t.label}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.muted}>{k.desc}</Text>
        </View>
      }
    >
      <View style={styles.grid}>
        {items.map((item) => (
          <ItemCard key={item.id} item={item} />
        ))}
      </View>
      {p.equipped[kind] ? (
        <Btn small title={`Tirar ${k.label.toLowerCase().replace(/s$/, '')}`} onPress={() => actions.shopEquip(kind, null)} style={{ marginTop: 12, alignSelf: 'flex-start' }} />
      ) : null}
    </Overlay>
  );
}

function ItemCard({ item }: { item: Cosmetic }) {
  const p = useStore((s) => s.progress)!;
  const owned = p.owned.includes(item.id);
  const equipped = p.equipped[item.kind] === item.id;
  const why = owned ? null : cannotBuy(item, p, RULES.XP_PER_LEVEL);
  const locked = Boolean(why?.startsWith('🔒'));
  return (
    <View style={[styles.card, equipped && styles.cardOn, locked && { opacity: 0.6 }]}>
      <ItemIcon item={item} />
      <Text style={styles.itemName}>{item.name}</Text>
      {owned ? (
        equipped ? (
          <Text style={styles.equipped}>✔ Equipado</Text>
        ) : (
          <Btn small variant="blue" title="Usar" onPress={() => actions.shopEquip(item.kind, item.id)} />
        )
      ) : (
        <>
          <Btn small variant="gold" title={`Comprar · ${item.price} 🪙`} disabled={Boolean(why)} onPress={() => actions.shopBuy(item.id)} />
          {why ? <Text style={styles.why}>{why}</Text> : null}
        </>
      )}
    </View>
  );
}

function ItemIcon({ item }: { item: Cosmetic }) {
  if (item.kind === 'tag') {
    return (
      <View style={[styles.tagPreview, { backgroundColor: item.value }]}>
        <Text style={styles.tagText}>Seu nome</Text>
      </View>
    );
  }
  if (item.kind === 'title') return <Text style={styles.titlePreview}>{item.value}</Text>;
  return <Text style={{ fontSize: 40 }}>{item.value}</Text>;
}

/** Bonequinho com o visual equipado. */
function Preview({ look, name, color }: { look: Partial<Record<CosmeticKind, string>>; name: string; color: string }) {
  const hat = cosmetic(look.hat);
  const trail = cosmetic(look.trail);
  const tag = cosmetic(look.tag);
  const title = cosmetic(look.title);
  return (
    <View style={styles.preview}>
      <View style={[styles.nameTag, { backgroundColor: tag?.value ?? '#000000aa' }]}>
        <Text style={styles.nameTagText}>{name}</Text>
      </View>
      <Text style={{ fontSize: 26, height: 30 }}>{hat?.value ?? ' '}</Text>
      <View style={[styles.body, { backgroundColor: color }]}>
        <Text style={{ fontSize: 11 }}>• •</Text>
      </View>
      {title ? <Text style={styles.titleUnder}>{title.value}</Text> : null}
      {trail ? <Text style={styles.trail}>{`${trail.value} ${trail.value} ${trail.value}`}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', gap: 16, alignItems: 'center', flexWrap: 'wrap' },
  coins: { color: colors.gold, fontFamily: fonts.game, fontWeight: '900', fontSize: 22 },
  muted: { color: colors.muted, fontFamily: fonts.body, fontSize: 13 },
  tabs: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  tab: { backgroundColor: colors.panel2, borderRadius: 99, paddingHorizontal: 14, paddingVertical: 7, borderWidth: 2, borderColor: colors.line },
  tabOn: { backgroundColor: colors.gold, borderColor: '#c9a227' },
  tabText: { color: colors.text, fontFamily: fonts.game, fontWeight: '900', fontSize: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card: {
    width: 180,
    alignItems: 'center',
    gap: 6,
    padding: 12,
    backgroundColor: colors.panel2,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: colors.line,
    borderBottomWidth: 6,
  },
  cardOn: { borderColor: colors.ok },
  itemName: { color: colors.text, fontFamily: fonts.game, fontWeight: '900', fontSize: 15, textAlign: 'center' },
  equipped: { color: colors.ok, fontFamily: fonts.game, fontWeight: '900', fontSize: 14, paddingVertical: 6 },
  why: { color: '#ffb4b4', fontFamily: fonts.body, fontSize: 12, textAlign: 'center' },
  tagPreview: { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4, marginVertical: 8 },
  tagText: { color: '#fff', fontFamily: fonts.game, fontWeight: '900', fontSize: 14 },
  titlePreview: { color: colors.gold, fontFamily: fonts.game, fontWeight: '900', fontSize: 15, marginVertical: 12, textAlign: 'center' },
  preview: { width: 150, alignItems: 'center', backgroundColor: '#24603a', borderRadius: 16, paddingVertical: 10, borderWidth: 3, borderColor: '#1b4a2c' },
  nameTag: { borderRadius: 5, paddingHorizontal: 6, paddingVertical: 1 },
  nameTagText: { color: '#fff', fontFamily: fonts.game, fontWeight: '900', fontSize: 12 },
  body: { width: 36, height: 36, borderRadius: 18, borderWidth: 3, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  titleUnder: { color: colors.gold, fontFamily: fonts.game, fontWeight: '900', fontSize: 11, marginTop: 4 },
  trail: { fontSize: 13, opacity: 0.8, marginTop: 2 },
});
