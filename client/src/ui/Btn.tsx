import { Pressable, Text } from 'react-native';
import { playSound } from '../audio/sound';
import { colors, ui } from './theme';

/** Botão do jogo feito com Pressable (o próprio jogo usa componentes RN!). */
export function Btn(props: {
  title: string;
  onPress: () => void;
  primary?: boolean;
  disabled?: boolean;
  color?: string;
  small?: boolean;
  style?: object;
}) {
  return (
    <Pressable
      disabled={props.disabled}
      onPress={() => {
        playSound('click');
        props.onPress();
      }}
      style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
        ui.btn,
        props.primary && ui.btnPrimary,
        props.color ? { backgroundColor: props.color, borderColor: props.color } : null,
        props.small && { paddingVertical: 5, paddingHorizontal: 10 },
        hovered && { borderColor: colors.accent },
        pressed && { transform: [{ scale: 0.97 }] },
        props.disabled && { opacity: 0.45 },
        props.style,
      ]}
    >
      <Text style={[ui.btnText, props.small && { fontSize: 12 }]}>{props.title}</Text>
    </Pressable>
  );
}
