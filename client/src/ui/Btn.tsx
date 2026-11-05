import { Pressable, Text } from 'react-native';
import { playSound } from '../audio/sound';
import { colors, fonts } from './theme';

const VARIANTS = {
  neutral: { bg: colors.panel2, edge: '#151933', text: colors.text },
  primary: { bg: colors.ok, edge: colors.okDark, text: '#ffffff' },
  blue: { bg: colors.blue, edge: colors.blueDark, text: '#ffffff' },
  purple: { bg: colors.purple, edge: colors.purpleDark, text: '#ffffff' },
  danger: { bg: colors.bad, edge: colors.badDark, text: '#ffffff' },
  gold: { bg: colors.gold, edge: '#c9a227', text: '#3b2a00' },
} as const;

export type BtnVariant = keyof typeof VARIANTS;

/**
 * Botão "gordinho" com efeito 3D (borda inferior que afunda ao apertar).
 * Feito com Pressable — o próprio jogo usa componentes React Native!
 */
export function Btn(props: {
  title: string;
  onPress: () => void;
  primary?: boolean;
  variant?: BtnVariant;
  disabled?: boolean;
  color?: string;
  small?: boolean;
  big?: boolean;
  style?: object;
}) {
  const v = VARIANTS[props.variant ?? (props.primary ? 'primary' : 'neutral')];
  const bg = props.color ?? v.bg;
  const edge = props.color ? 'rgba(0,0,0,0.35)' : v.edge;
  return (
    <Pressable
      disabled={props.disabled}
      onPress={() => {
        playSound('click');
        props.onPress();
      }}
      style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
        {
          backgroundColor: bg,
          borderRadius: props.small ? 10 : 14,
          borderBottomWidth: pressed ? 2 : props.small ? 3 : 5,
          borderBottomColor: edge,
          marginTop: pressed ? (props.small ? 1 : 3) : 0,
          paddingVertical: props.big ? 16 : props.small ? 6 : 11,
          paddingHorizontal: props.big ? 28 : props.small ? 10 : 18,
          alignItems: 'center',
          justifyContent: 'center',
          filter: hovered && !props.disabled ? 'brightness(1.08)' : undefined,
          cursor: props.disabled ? 'not-allowed' : 'pointer',
          transitionProperty: 'filter, opacity, background-color',
          transitionDuration: '120ms',
        },
        props.disabled && { opacity: 0.45 },
        props.style,
      ]}
    >
      <Text
        style={{
          color: v.text,
          fontFamily: fonts.game,
          fontWeight: '900',
          fontSize: props.big ? 20 : props.small ? 13 : 16,
          letterSpacing: 0.4,
        }}
      >
        {props.title}
      </Text>
    </Pressable>
  );
}
