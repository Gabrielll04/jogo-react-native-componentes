/**
 * LOJA DE COSMÉTICOS 🛍️ — o servidor confere preço, moedas e exigências.
 */
import type { Socket } from 'socket.io';
import { cannotBuy, cosmetic, COSMETIC_KINDS, type CosmeticKind } from '../../shared/cosmetics';
import { EV, RULES } from '../../shared/events';
import { afterProgressChange, award, notice, sound, type OnlinePlayer } from './game';
import { state } from './state';

export function registerShopHandlers(socket: Socket, getMe: () => OnlinePlayer | null) {
  socket.on(EV.SHOP_BUY, (data: { itemId: string }) => {
    const me = getMe();
    if (!me) return;
    const p = state.progress[me.playerId];
    const item = cosmetic(String(data?.itemId ?? ''));
    if (!item) return notice(socket, 'Item desconhecido.', 'warn');
    const why = cannotBuy(item, p, RULES.XP_PER_LEVEL);
    if (why) return notice(socket, why, 'warn');
    p.coins -= item.price;
    p.owned.push(item.id);
    p.equipped[item.kind] = item.id; // já sai usando
    sound(socket, 'achievement');
    notice(socket, `🛍️ Você comprou ${item.name}! Já está equipado.`, 'success');
    award(socket.id, p, 'estiloso');
    state.log(`🛍️ ${p.name} comprou ${item.name} (${item.price} moedas)`);
    afterProgressChange(me);
  });

  socket.on(EV.SHOP_EQUIP, (data: { kind: CosmeticKind; itemId: string | null }) => {
    const me = getMe();
    if (!me) return;
    const p = state.progress[me.playerId];
    const kind = COSMETIC_KINDS.find((k) => k.id === data?.kind)?.id;
    if (!kind) return;
    if (data.itemId === null) {
      delete p.equipped[kind];
    } else {
      const item = cosmetic(String(data.itemId));
      if (!item || item.kind !== kind || !p.owned.includes(item.id)) return notice(socket, 'Você ainda não tem esse item.', 'warn');
      p.equipped[kind] = item.id;
    }
    sound(socket, 'click');
    afterProgressChange(me);
  });
}
