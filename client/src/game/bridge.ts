/**
 * Ponte de eventos entre o React (HUD, desafios) e a cena Phaser (mundo 2D).
 * Posições de jogadores passam por aqui direto para o Phaser, sem re-renderizar React.
 */
type Handler = (...args: any[]) => void;

class Bridge {
  private handlers = new Map<string, Set<Handler>>();

  on(event: string, fn: Handler) {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    this.handlers.get(event)!.add(fn);
    return () => this.off(event, fn);
  }

  off(event: string, fn: Handler) {
    this.handlers.get(event)?.delete(fn);
  }

  emit(event: string, ...args: any[]) {
    this.handlers.get(event)?.forEach((fn) => fn(...args));
  }
}

export const bridge = new Bridge();

/** Eventos usados:
 *  'sync'         [id,x,y][]           servidor -> Phaser (posições)
 *  'emote'        {id, emote}          servidor -> Phaser (balão)
 *  'nearby'       Interactable | null  Phaser -> React (o que está perto)
 *  'interact'     Interactable         Phaser/React -> React (apertou E)
 *  'area'         moduleId | null      Phaser -> React (entrou/saiu de prédio)
 *  'blocked'      moduleId             Phaser -> React (bateu em porta trancada)
 *  'input'        boolean              React -> Phaser (liga/desliga teclado)
 *  'moved'        —                    Phaser -> React (andou; usado no tutorial)
 */
export type Interactable =
  | { kind: 'station'; id: string; moduleId: number }
  | { kind: 'mentor'; component: string; moduleId: number }
  | { kind: 'sign'; moduleId: number }
  | { kind: 'player'; id: string; name: string };

/** Chave estável para comparar interagíveis. */
export const interactKey = (i: Interactable | null) =>
  !i
    ? ''
    : i.kind === 'station'
      ? `s:${i.id}`
      : i.kind === 'mentor'
        ? `m:${i.component}`
        : i.kind === 'player'
          ? `p:${i.id}`
          : `g:${i.moduleId}`;
