/**
 * Tipos mínimos para "react-native" (resolvido para react-native-web pelo Vite).
 * Mantém o projeto leve: não precisamos instalar o pacote react-native inteiro
 * só para ter as tipagens.
 */
declare module 'react-native' {
  import type { ComponentType } from 'react';

  type AnyComponent = ComponentType<any>;
  export const View: AnyComponent;
  export const Text: AnyComponent;
  export const Image: AnyComponent;
  export const Pressable: AnyComponent;
  export const Button: AnyComponent;
  export const TextInput: AnyComponent;
  export const Switch: AnyComponent;
  export const ScrollView: AnyComponent;
  export const FlatList: AnyComponent;
  export const SectionList: AnyComponent;
  export const Modal: AnyComponent;
  export const ActivityIndicator: AnyComponent;
  export const SafeAreaView: AnyComponent;

  export const StyleSheet: {
    create<T extends Record<string, any>>(styles: T): T;
    flatten(style: any): any;
    absoluteFillObject: any;
    absoluteFill: any;
    hairlineWidth: number;
  };
  export const Alert: { alert(title: string, message?: string, buttons?: any[]): void };
  export const Platform: { OS: 'web' | 'ios' | 'android'; select<T>(spec: Record<string, T>): T };
  export const Animated: any;
  export const Easing: any;
  export function useWindowDimensions(): { width: number; height: number };
}

declare module 'react-native-web';
