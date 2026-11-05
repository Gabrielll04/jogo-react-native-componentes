/** Menu "Personagem": cor da roupa, tom de pele e cor do cabelo, com prévia animada. */
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { HAIR_COLORS, resolveLook, SKIN_TONES } from '@shared/avatar';
import { AVATAR_COLORS } from '@shared/events';
import { cosmetic } from '@shared/cosmetics';
import { paintCharPreview, playerLook, type Dir } from '../game/sprites';
import { actions } from '../net/socket';
import { useStore } from '../state/store';
import { Btn } from './Btn';
import { Overlay } from './Overlay';
import { colors, fonts } from './theme';

const TURN: Dir[] = ['down', 'right', 'up', 'left'];

export function CharacterPanel({ onClose }: { onClose: () => void }) {
  const p = useStore((s) => s.progress)!;
  const start = resolveLook(p.name, p.skin, p.hair);
  const [color, setColor] = useState(p.color);
  const [skin, setSkin] = useState(start.skin);
  const [hair, setHair] = useState(start.hair);
  const changed = color !== p.color || skin !== start.skin || hair !== start.hair;

  return (
    <Overlay title="Personagem" onClose={onClose} maxWidth={640}>
      <View style={styles.row}>
        <Preview color={color} skin={skin} hair={hair} name={p.name} hat={cosmetic(p.equipped.hat)?.value} />
        <View style={{ flex: 1, minWidth: 260, gap: 14 }}>
          <Swatches label="Pele" values={SKIN_TONES} value={skin} onChange={setSkin} />
          <Swatches label="Cabelo" values={HAIR_COLORS} value={hair} onChange={setHair} />
          <Swatches label="Roupa" values={AVATAR_COLORS} value={color} onChange={setColor} />
        </View>
      </View>
      <View style={[styles.row, { justifyContent: 'flex-end', marginTop: 16 }]}>
        <Btn title="Cancelar" onPress={onClose} />
        <Btn
          primary
          title="Salvar"
          disabled={!changed}
          onPress={() => {
            actions.setLook({ color, skin, hair });
            onClose();
          }}
        />
      </View>
    </Overlay>
  );
}

function Swatches({ label, values, value, onChange }: { label: string; values: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.swatches}>
        {values.map((v) => (
          <Pressable
            key={v}
            accessibilityRole="button"
            accessibilityLabel={`${label} ${v}`}
            onPress={() => onChange(v)}
            style={({ hovered }: { hovered?: boolean }) => [
              styles.swatch,
              { backgroundColor: v },
              hovered && { transform: [{ scale: 1.08 }] },
              v === value && styles.swatchOn,
            ]}
          />
        ))}
      </View>
    </View>
  );
}

/** Bonequinho girando (frente, lado, costas) com os passos de caminhada. */
function Preview({ color, skin, hair, name, hat }: { color: string; skin: string; hair: string; name: string; hat?: string }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 220);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (!ref.current) return;
    const dir = TURN[Math.floor(tick / 8) % TURN.length];
    paintCharPreview(ref.current, playerLook(name, color, skin, hair), dir, tick % 2);
  }, [tick, color, skin, hair, name]);
  return (
    <View style={styles.stage}>
      {hat ? <Text style={styles.hat}>{hat}</Text> : null}
      <canvas ref={ref} width={160} height={190} style={{ imageRendering: 'pixelated' }} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 18, alignItems: 'center' },
  stage: {
    width: 180,
    height: 210,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2c6b3f',
    borderWidth: 3,
    borderColor: '#1f4f2e',
    borderBottomWidth: 6,
    overflow: 'hidden',
  },
  hat: { position: 'absolute', top: 6, fontSize: 30 },
  label: { color: colors.muted, fontFamily: fonts.game, fontWeight: '900', fontSize: 13, letterSpacing: 0.5, textTransform: 'uppercase' },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  swatch: { width: 30, height: 30, borderRadius: 15, borderWidth: 3, borderColor: 'rgba(255,255,255,0.15)' },
  swatchOn: { borderColor: '#fff', transform: [{ scale: 1.12 }] },
});
