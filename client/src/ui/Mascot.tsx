import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, Easing, Image, Text, View } from 'react-native';
import { colors, fonts } from './theme';

/** Reacto, o mascote-guia (um átomo do React) com balão de fala. */
export function Mascot({ size = 84, children, name = 'Reacto' }: { size?: number; children?: ReactNode; name?: string }) {
  const bob = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
        Animated.timing(bob, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [bob]);
  const translateY = bob.interpolate({ inputRange: [0, 1], outputRange: [0, -6] });
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
      <Animated.View style={{ transform: [{ translateY }] }}>
        <Image source={{ uri: '/img/reacto.svg' }} style={{ width: size, height: size }} />
      </Animated.View>
      {children ? (
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.accent, fontFamily: fonts.game, fontWeight: '900', fontSize: 14, marginBottom: 4 }}>{name}</Text>
          <View
            style={{
              backgroundColor: '#f7f9ff',
              borderRadius: 16,
              borderTopLeftRadius: 4,
              padding: 14,
              borderBottomWidth: 4,
              borderBottomColor: '#c9d2f0',
            }}
          >
            {children}
          </View>
        </View>
      ) : null}
    </View>
  );
}

/** Texto padrão dentro do balão do mascote. */
export function Say({ children }: { children: ReactNode }) {
  return <Text style={{ color: '#1d2340', fontFamily: fonts.body, fontSize: 16, lineHeight: 24 }}>{children}</Text>;
}

/** Negrito dentro do texto. */
export function B({ children }: { children: ReactNode }) {
  return <Text style={{ fontWeight: '800' }}>{children}</Text>;
}

/** Destaque de código inline dentro de um texto. */
export function C({ children }: { children: ReactNode }) {
  return (
    <Text style={{ fontFamily: fonts.code, backgroundColor: '#e3e9ff', color: '#3a2fb8', fontWeight: '700', paddingHorizontal: 4, borderRadius: 4 }}>
      {children}
    </Text>
  );
}
