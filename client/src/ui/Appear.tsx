/** Entrada suave das janelas: fundo escurece e o painel "assenta" (160ms). */
import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, Easing } from 'react-native';

export function useAppear(duration = 170) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, []);
  return {
    backdrop: { opacity: v },
    panel: {
      opacity: v,
      transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }, { scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.975, 1] }) }],
    },
  };
}

/** Atalho: envolve o conteúdo e aplica a entrada. */
export function Appear({ style, children }: { style?: object; children: ReactNode }) {
  const a = useAppear();
  return <Animated.View style={[style, a.panel]}>{children}</Animated.View>;
}

/** Só aparece (opacidade) — usado no fundo escurecido das janelas. */
export function Fade({ style, children }: { style?: object; children: ReactNode }) {
  const a = useAppear(140);
  return <Animated.View style={[style, a.backdrop]}>{children}</Animated.View>;
}
