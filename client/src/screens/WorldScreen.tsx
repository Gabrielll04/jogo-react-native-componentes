import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { EMOTES, RULES } from '@shared/events';
import { findStation, levelFromXp, MODULES } from '@shared/modules';
import { toggleMute } from '../audio/sound';
import { GameCanvas } from '../game/GameCanvas';
import { bridge, type Interactable } from '../game/bridge';
import { actions, moduleName } from '../net/socket';
import { toast, useStore } from '../state/store';
import { Btn } from '../ui/Btn';
import { ChallengeOverlay } from '../ui/ChallengeOverlay';
import { HelpPanel } from '../ui/HelpPanel';
import { InventoryPanel } from '../ui/InventoryPanel';
import { SignDialog } from '../ui/SignDialog';
import { colors, ui } from '../ui/theme';

export function WorldScreen() {
  const progress = useStore((s) => s.progress);
  const challenge = useStore((s) => s.challenge);
  const muted = useStore((s) => s.muted);
  const helpCount = useStore((s) => s.helpRequests.length);
  const feed = useStore((s) => s.feed);
  const [nearby, setNearby] = useState<Interactable | null>(null);
  const [area, setArea] = useState<number | null>(null);
  const [sign, setSign] = useState<number | null>(null);
  const [panel, setPanel] = useState<'inv' | 'help' | null>(null);

  const overlayOpen = Boolean(challenge || sign !== null || panel);

  // desliga o teclado do Phaser enquanto há painéis abertos (para digitar nos TextInput)
  useEffect(() => {
    bridge.emit('input', !overlayOpen);
  }, [overlayOpen]);

  useEffect(() => {
    const interact = (it: Interactable) => {
      if (it.kind === 'sign') setSign(it.moduleId);
      else actions.startChallenge(it.id);
    };
    const offs = [
      bridge.on('nearby', setNearby),
      bridge.on('area', setArea),
      bridge.on('interact', interact),
      bridge.on('blocked', (id: number) => toast(`🔒 ${moduleName(id)} está trancado. Aguarde o professor liberar!`, 'warn', 2500)),
    ];
    // atalhos: I = inventário, H = pedidos de ajuda, Esc = fechar
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'Escape') {
        setPanel(null);
        setSign(null);
      }
      if (e.key.toLowerCase() === 'i' && !challenge) setPanel((p) => (p === 'inv' ? null : 'inv'));
      if (e.key.toLowerCase() === 'h' && !challenge) setPanel((p) => (p === 'help' ? null : 'help'));
      const n = Number(e.key);
      if (n >= 1 && n <= EMOTES.length && !challenge) actions.emote(EMOTES[n - 1]);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      offs.forEach((off) => off());
      window.removeEventListener('keydown', onKey);
    };
  }, [challenge]);

  const level = levelFromXp(progress?.xp ?? 0, RULES.XP_PER_LEVEL);
  const xpInLevel = (progress?.xp ?? 0) % RULES.XP_PER_LEVEL;
  const station = nearby?.kind === 'station' ? findStation(nearby.id) : null;
  const done = station && progress?.completed[station.station.id];

  return (
    <View style={{ flex: 1 }}>
      <GameCanvas />

      {/* ---------- HUD superior esquerdo: status do jogador */}
      <View style={[styles.hudBox, { top: 12, left: 12 }]} pointerEvents="box-none">
        <View style={[ui.row, { gap: 8 }]}>
          <View style={[styles.avatar, { backgroundColor: progress?.color }]} />
          <Text style={[ui.text, { fontWeight: '800' }]}>{progress?.name}</Text>
          <Text style={[ui.chip, { backgroundColor: colors.accent, color: '#000', fontWeight: '800', fontSize: 12 }]}>nv {level}</Text>
        </View>
        <View style={styles.xpBar}>
          <View style={[styles.xpFill, { width: `${xpInLevel}%` }]} />
        </View>
        <Text style={ui.muted}>
          ⭐ {progress?.xp} XP · 🪙 {progress?.coins} · 🤝 {progress?.coopPoints} · 🃏 {progress?.cards.length}
        </Text>
      </View>

      {/* ---------- HUD superior direito: botões */}
      <View style={[styles.hudButtons]} pointerEvents="box-none">
        <Btn small title="🎒 Inventário (I)" onPress={() => setPanel(panel === 'inv' ? null : 'inv')} />
        <Btn small title={`🆘 Pedidos (${helpCount})`} color={helpCount ? '#b5651d' : undefined} onPress={() => setPanel(panel === 'help' ? null : 'help')} />
        <Btn small title={muted ? '🔇' : '🔊'} onPress={toggleMute} />
        <Btn small title="⬅ Lobby" onPress={actions.leaveWorld} />
      </View>

      {/* ---------- nome da área */}
      {area !== null ? (
        <View style={styles.areaBanner} pointerEvents="none">
          <Text style={[ui.text, { fontWeight: '800' }]}>{moduleName(area)}</Text>
        </View>
      ) : null}

      {/* ---------- feed de conquistas dos colegas */}
      <View style={styles.feed} pointerEvents="none">
        {feed.slice(-3).map((f, i) => (
          <Text key={i} style={styles.feedItem}>
            {f}
          </Text>
        ))}
      </View>

      {/* ---------- prompt de interação */}
      {nearby && !overlayOpen ? (
        <View style={styles.prompt}>
          {nearby.kind === 'station' && station ? (
            <>
              <Text style={[ui.text, { fontWeight: '700' }]}>
                {station.station.emoji} {station.station.title} {done ? '✅' : ''}
              </Text>
              <Btn
                primary
                title={`[E] ${done ? 'Treinar de novo' : station.station.type === 'boss_challenge' ? 'Enfrentar o chefe!' : 'Iniciar desafio'}`}
                onPress={() => bridge.emit('interact', nearby)}
              />
            </>
          ) : (
            <>
              <Text style={[ui.text, { fontWeight: '700' }]}>ℹ️ Placa: {MODULES.find((m) => m.id === nearby.moduleId)?.name}</Text>
              <Btn title="[E] Ler placa" onPress={() => bridge.emit('interact', nearby)} />
            </>
          )}
        </View>
      ) : null}

      {/* ---------- dicas de controle + emotes */}
      <View style={styles.controls} pointerEvents="box-none">
        <Text style={ui.muted}>WASD/setas: andar · E: interagir · I: inventário · H: ajuda · 1-6: emotes</Text>
        <View style={[ui.row, { gap: 4, marginTop: 6 }]}>
          {EMOTES.map((e) => (
            <Btn key={e} small title={e} onPress={() => actions.emote(e)} />
          ))}
        </View>
      </View>

      {sign !== null ? <SignDialog moduleId={sign} onClose={() => setSign(null)} /> : null}
      {panel === 'inv' ? <InventoryPanel onClose={() => setPanel(null)} /> : null}
      {panel === 'help' ? <HelpPanel onClose={() => setPanel(null)} /> : null}
      {challenge ? <ChallengeOverlay /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  hudBox: {
    position: 'absolute',
    backgroundColor: 'rgba(18,20,28,0.88)',
    borderRadius: 12,
    padding: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.line,
  },
  avatar: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#fff' },
  xpBar: { height: 8, width: 220, backgroundColor: '#0d0f16', borderRadius: 4, overflow: 'hidden' },
  xpFill: { height: '100%', backgroundColor: colors.gold },
  hudButtons: { position: 'absolute', top: 12, right: 12, flexDirection: 'row', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' },
  areaBanner: {
    position: 'absolute',
    top: 12,
    alignSelf: 'center',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  feed: { position: 'absolute', top: 100, left: 12, gap: 4 },
  feedItem: { color: '#fff', fontSize: 12, backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  prompt: {
    position: 'absolute',
    bottom: 90,
    alignSelf: 'center',
    backgroundColor: 'rgba(18,20,28,0.94)',
    borderRadius: 12,
    padding: 12,
    gap: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.accent,
  },
  controls: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    backgroundColor: 'rgba(18,20,28,0.8)',
    borderRadius: 10,
    padding: 8,
  },
});
