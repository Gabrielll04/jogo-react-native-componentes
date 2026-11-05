import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { EMOTES, RULES } from '@shared/events';
import { findStation, levelFromXp, MODULES } from '@shared/modules';
import { toggleMute } from '../audio/sound';
import { bridge, type Interactable } from '../game/bridge';
import { GameCanvas } from '../game/GameCanvas';
import { currentObjective, moduleProgress, stationLock } from '../game/quest';
import { actions, moduleName } from '../net/socket';
import { getState, toast, useStore } from '../state/store';
import { Btn } from '../ui/Btn';
import { ChallengeOverlay } from '../ui/ChallengeOverlay';
import { CharacterPanel } from '../ui/CharacterPanel';
import { DuelInvites } from '../ui/DuelInvites';
import { DuelOverlay } from '../ui/DuelOverlay';
import { DuelPanel } from '../ui/DuelPanel';
import { HelpPanel } from '../ui/HelpPanel';
import { InventoryPanel } from '../ui/InventoryPanel';
import { LabOverlay } from '../ui/LabOverlay';
import { RaceBadge, RaceOverlay } from '../ui/RaceOverlay';
import { ShopPanel } from '../ui/ShopPanel';
import { LessonOverlay } from '../ui/LessonOverlay';
import { Mascot, Say } from '../ui/Mascot';
import { SignDialog } from '../ui/SignDialog';
import { colors, fonts } from '../ui/theme';

const TUTORIAL_KEY = 'rnq_tutorial_ok';

export function WorldScreen() {
  const progress = useStore((s) => s.progress);
  const modules = useStore((s) => s.modules);
  const challenge = useStore((s) => s.challenge);
  const duel = useStore((s) => s.duel);
  const race = useStore((s) => s.race);
  const raceOpen = useStore((s) => s.raceOpen);
  const muted = useStore((s) => s.muted);
  const helpCount = useStore((s) => s.helpRequests.length);
  const feed = useStore((s) => s.feed);
  const [nearby, setNearby] = useState<Interactable | null>(null);
  const [area, setArea] = useState<number | null>(null);
  const [sign, setSign] = useState<number | null>(null);
  const [lesson, setLesson] = useState<string | null>(null);
  const [panel, setPanel] = useState<'inv' | 'help' | 'duel' | 'shop' | 'lab' | 'char' | null>(null);
  const [duelTarget, setDuelTarget] = useState<string | null>(null);
  const [tutorial, setTutorial] = useState<number>(() => {
    try {
      return localStorage.getItem(TUTORIAL_KEY) ? -1 : 0;
    } catch {
      return 0;
    }
  });

  const showRace = Boolean(race && raceOpen && !duel);
  const overlayOpen = Boolean(challenge || sign !== null || panel || lesson || duel || showRace);

  // ao começar um duelo, fecha lição/painéis abertos (o duelo vira a tela principal)
  useEffect(() => {
    if (!duel) return;
    setLesson(null);
    setSign(null);
    setPanel(null);
  }, [duel?.duelId]);

  // desliga o teclado do Phaser enquanto há janelas abertas (para digitar nos TextInput)
  useEffect(() => {
    bridge.emit('input', !overlayOpen);
  }, [overlayOpen]);

  const finishTutorial = () => {
    setTutorial(-1);
    try {
      localStorage.setItem(TUTORIAL_KEY, '1');
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    const interact = (it: Interactable) => {
      if (it.kind === 'sign') setSign(it.moduleId);
      else if (it.kind === 'player') {
        setDuelTarget(it.id);
        setPanel('duel');
      }
      else if (it.kind === 'mentor') {
        setLesson(it.component);
        setTutorial((t) => (t >= 0 ? 3 : t));
      } else {
        const lock = stationLock(useStoreSnapshot(), it.id);
        if (lock) toast(`🔒 ${lock}`, 'warn', 3500);
        else actions.startChallenge(it.id);
      }
    };
    const offs = [
      bridge.on('nearby', setNearby),
      bridge.on('area', setArea),
      bridge.on('interact', interact),
      bridge.on('moved', () => setTutorial((t) => (t === 1 ? 2 : t))),
      bridge.on('blocked', (id: number) => toast(`🔒 ${moduleName(id)} está trancado. Aguarde o professor liberar!`, 'warn', 2500)),
    ];
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'Escape') {
        setPanel(null);
        setSign(null);
      }
      if (challenge || lesson || getState().duel || (getState().race && getState().raceOpen)) return;
      if (e.key.toLowerCase() === 'i') setPanel((p) => (p === 'inv' ? null : 'inv'));
      if (e.key.toLowerCase() === 'h') setPanel((p) => (p === 'help' ? null : 'help'));
      if (e.key.toLowerCase() === 'l') setPanel((p) => (p === 'lab' ? null : 'lab'));
      if (e.key.toLowerCase() === 'k') setPanel((p) => (p === 'shop' ? null : 'shop'));
      if (e.key.toLowerCase() === 'p') setPanel((p) => (p === 'char' ? null : 'char'));
      if (e.key.toLowerCase() === 'x') {
        setDuelTarget(null);
        setPanel((p) => (p === 'duel' ? null : 'duel'));
      }
      const n = Number(e.key);
      if (n >= 1 && n <= EMOTES.length) actions.emote(EMOTES[n - 1]);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      offs.forEach((off) => off());
      window.removeEventListener('keydown', onKey);
    };
  }, [challenge, lesson]);

  const level = levelFromXp(progress?.xp ?? 0, RULES.XP_PER_LEVEL);
  const xpInLevel = (progress?.xp ?? 0) % RULES.XP_PER_LEVEL;
  const objective = currentObjective(progress, modules);
  const objModule = 'moduleId' in objective ? MODULES.find((m) => m.id === objective.moduleId) : null;
  const mp = objModule ? moduleProgress(progress, objModule.id) : null;

  return (
    <View style={{ flex: 1 }}>
      <GameCanvas />

      {/* ---------- jogador */}
      <View style={[styles.card, { top: 12, left: 12, width: 250 }]} pointerEvents="box-none">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={[styles.levelBadge]}>
            <Text style={styles.levelNum}>{level}</Text>
            <Text style={styles.levelLbl}>nível</Text>
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={styles.name} numberOfLines={1}>
              {progress?.name}
            </Text>
            <View style={styles.xpBar}>
              <View style={[styles.xpFill, { width: `${xpInLevel}%` }]} />
            </View>
            <Text style={styles.stats}>
              ⭐ {xpInLevel}/100 · 🪙 {progress?.coins} · 🃏 {progress?.cards.length} · 🤝 {progress?.coopPoints}
            </Text>
          </View>
        </View>
      </View>

      {/* ---------- missão atual */}
      <View style={styles.questWrap} pointerEvents="none">
        <View style={styles.quest}>
          <Text style={styles.questTag}>📜 MISSÃO</Text>
          <Text style={styles.questText}>{objective.text}</Text>
          {objModule && mp ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <Text style={styles.questMod}>
                {objModule.emoji} {objModule.name}
              </Text>
              <View style={styles.questBar}>
                <View style={[styles.questFill, { width: `${(mp.done / mp.total) * 100}%`, backgroundColor: objModule.color }]} />
              </View>
              <Text style={styles.questMod}>
                {mp.done}/{mp.total}
              </Text>
            </View>
          ) : null}
          {'moduleId' in objective ? <Text style={styles.questHint}>Siga a seta amarela ➜</Text> : null}
        </View>
      </View>

      {/* ---------- botões + moldura do minimapa */}
      <View style={styles.buttons} pointerEvents="box-none">
        <Btn
          small
          variant="gold"
          title="⚔️ Duelo (X)"
          onPress={() => {
            setDuelTarget(null);
            setPanel(panel === 'duel' ? null : 'duel');
          }}
        />
        <Btn small variant="purple" title="🎒 Cartas (I)" onPress={() => setPanel(panel === 'inv' ? null : 'inv')} />
        <Btn small variant={helpCount ? 'gold' : 'neutral'} title={`🆘 ${helpCount}`} onPress={() => setPanel(panel === 'help' ? null : 'help')} />
        <Btn small title={muted ? '🔇' : '🔊'} onPress={toggleMute} />
        <Btn small title="⬅ Lobby" onPress={actions.leaveWorld} />
      </View>
      <View style={styles.minimapFrame} pointerEvents="none">
        <Text style={styles.minimapLabel}>MAPA</Text>
      </View>
      <View style={styles.sideButtons} pointerEvents="box-none">
 <Btn small variant="purple" title="🎨 Personagem (P)" onPress={() => setPanel(panel === 'char' ? null : 'char')} />
        <Btn small variant="gold" title="🛍️ Loja (K)" onPress={() => setPanel(panel === 'shop' ? null : 'shop')} />
        <Btn small variant="primary" title="🧪 Laboratório (L)" onPress={() => setPanel(panel === 'lab' ? null : 'lab')} />
      </View>

      <AreaTitle area={area} />

      {/* ---------- feed dos colegas */}
      <View style={styles.feed} pointerEvents="none">
        {feed.slice(-3).map((f, i) => (
          <Text key={i} style={styles.feedItem}>
            {f}
          </Text>
        ))}
      </View>

      {/* ---------- prompt de interação */}
      {nearby && !overlayOpen ? <Prompt it={nearby} /> : null}

      {/* ---------- controles + emotes */}
      <View style={styles.controls} pointerEvents="box-none">
        <Text style={styles.controlsText}>
          <Key k="WASD" /> andar  <Key k="E" /> interagir  <Key k="I" /> cartas  <Key k="X" /> duelo  <Key k="L" /> laboratório  <Key k="K" /> loja  <Key k="1-6" /> emotes
        </Text>
        <View style={{ flexDirection: 'row', gap: 4, marginTop: 6 }}>
          {EMOTES.map((e) => (
            <Btn key={e} small title={e} onPress={() => actions.emote(e)} />
          ))}
        </View>
      </View>

      {tutorial >= 0 && !overlayOpen ? <Tutorial step={tutorial} name={progress?.name ?? ''} setStep={setTutorial} finish={finishTutorial} /> : null}

      {sign !== null ? <SignDialog moduleId={sign} onClose={() => setSign(null)} /> : null}
      {panel === 'inv' ? <InventoryPanel onClose={() => setPanel(null)} /> : null}
      {panel === 'help' ? <HelpPanel onClose={() => setPanel(null)} /> : null}
      {panel === 'duel' ? <DuelPanel preselect={duelTarget} onClose={() => setPanel(null)} /> : null}
      {panel === 'char' ? <CharacterPanel onClose={() => setPanel(null)} /> : null}
      {panel === 'shop' ? <ShopPanel onClose={() => setPanel(null)} /> : null}
      {panel === 'lab' ? <LabOverlay onClose={() => setPanel(null)} /> : null}
      {lesson ? (
        <LessonOverlay
          component={lesson}
          onClose={() => {
            setLesson(null);
            if (tutorial === 3) finishTutorial();
          }}
        />
      ) : null}
      {challenge ? <ChallengeOverlay /> : null}
      {showRace ? <RaceOverlay /> : null}
      {duel ? <DuelOverlay /> : null}
      {!overlayOpen ? <RaceBadge /> : null}
      {/* convites de duelo: no canto, por cima de tudo, sem travar o jogo */}
      <DuelInvites />
    </View>
  );
}

// leitura pontual do progresso (fora do ciclo de render)
const useStoreSnapshot = () => getState().progress;

function Key({ k }: { k: string }) {
  return <Text style={styles.key}> {k} </Text>;
}

function Prompt({ it }: { it: Interactable }) {
  const progress = useStore((s) => s.progress);
  let title = '';
  let action = '';
  let lock: string | null = null;
  if (it.kind === 'mentor') {
    const learned = progress?.learned.includes(it.component);
    title = `🧙 Mestre ${it.component}`;
    action = learned ? 'Revisar a lição' : 'Aprender <' + it.component + '>';
  } else if (it.kind === 'station') {
    const st = findStation(it.id)!;
    lock = stationLock(progress, it.id);
    const done = progress?.completed[it.id];
    title = `${st.station.emoji} ${st.station.title}${done ? ' ✅' : ''}`;
    action = st.station.type === 'boss_challenge' ? 'Enfrentar o Guardião!' : done ? 'Treinar de novo' : 'Iniciar desafio';
  } else if (it.kind === 'player') {
    title = `🧑 ${it.name}`;
    action = 'Desafiar para um duelo ⚔️';
  } else {
    title = `ℹ️ Placa: ${MODULES.find((m) => m.id === it.moduleId)?.name}`;
    action = 'Ler a placa';
  }
  return (
    <View style={styles.prompt}>
      <Text style={styles.promptTitle}>{title}</Text>
      {lock ? <Text style={styles.promptLock}>🔒 {lock}</Text> : null}
      <Pressable onPress={() => bridge.emit('interact', it)} style={[styles.promptBtn, lock ? { backgroundColor: '#555a70', borderBottomColor: '#3a3e52' } : null]}>
        <Text style={styles.keyBig}>E</Text>
        <Text style={styles.promptAction}>{action}</Text>
      </Pressable>
    </View>
  );
}

function AreaTitle({ area }: { area: number | null }) {
  const anim = useRef(new Animated.Value(0)).current;
  const [shown, setShown] = useState<number | null>(null);
  useEffect(() => {
    if (area === null) return;
    setShown(area);
    anim.setValue(0);
    Animated.sequence([
      Animated.timing(anim, { toValue: 1, duration: 350, useNativeDriver: false }),
      Animated.delay(1600),
      Animated.timing(anim, { toValue: 0, duration: 500, useNativeDriver: false }),
    ]).start();
  }, [area]);
  const mod = MODULES.find((m) => m.id === shown);
  if (!mod) return null;
  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.areaTitle, { opacity: anim, transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }] }]}
    >
      <Text style={styles.areaSmall}>Módulo {mod.id}</Text>
      <Text style={[styles.areaBig, { textShadowColor: mod.color }]}>
        {mod.emoji} {mod.name}
      </Text>
      <Text style={styles.areaSmall}>{mod.components.map((c) => `<${c}>`).join('  ')}</Text>
    </Animated.View>
  );
}

function Tutorial({ step, name, setStep, finish }: { step: number; name: string; setStep: (n: number) => void; finish: () => void }) {
  const steps: { text: string; next?: string }[] = [
    {
      text: `Oi, ${name}! Eu sou o Reacto ⚛️, seu guia. Aqui você aprende os componentes do React Native conversando com os MESTRES 🧙 e vencendo desafios nos terminais 💻.`,
      next: 'Vamos lá!',
    },
    { text: 'Ande com WASD ou com as setas do teclado. Experimente andar um pouco!' },
    {
      text: 'Lá em cima está sua MISSÃO. Siga a seta amarela ➜ até um Mestre com ❗ e aperte E para começar a lição.',
    },
    { text: 'Isso! Faça a lição até o fim para ganhar a carta do componente.' },
  ];
  const s = steps[step] ?? steps[0];
  return (
    <View style={styles.tutorial}>
      <Mascot size={70}>
        <Say>{s.text}</Say>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
          {s.next ? <Btn small primary title={s.next} onPress={() => setStep(step + 1)} /> : null}
          <Btn small title="Pular tutorial" onPress={finish} />
        </View>
      </Mascot>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    backgroundColor: 'rgba(20,23,40,0.92)',
    borderRadius: 16,
    padding: 10,
    borderWidth: 2,
    borderColor: colors.line,
    borderBottomWidth: 5,
  },
  levelBadge: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: colors.blue,
    borderBottomWidth: 4,
    borderBottomColor: colors.blueDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelNum: { color: '#fff', fontFamily: fonts.display, fontSize: 24, lineHeight: 26 },
  levelLbl: { color: '#e0f4ff', fontFamily: fonts.game, fontWeight: '900', fontSize: 10 },
  name: { color: colors.text, fontFamily: fonts.game, fontWeight: '900', fontSize: 17 },
  xpBar: { height: 10, backgroundColor: '#0d0f1c', borderRadius: 5, overflow: 'hidden' },
  xpFill: { height: '100%', backgroundColor: colors.gold },
  stats: { color: colors.muted, fontFamily: fonts.body, fontSize: 12, fontWeight: '700' },
  questWrap: { position: 'absolute', top: 12, left: 280, right: 300, alignItems: 'center' },
  quest: {
    backgroundColor: '#fdf6e3',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 3,
    borderColor: '#c9a227',
    borderBottomWidth: 6,
    maxWidth: 520,
    minWidth: 300,
  },
  questTag: { color: '#a0700f', fontFamily: fonts.game, fontWeight: '900', fontSize: 12, letterSpacing: 1 },
  questText: { color: '#2a2140', fontFamily: fonts.body, fontWeight: '800', fontSize: 16 },
  questMod: { color: '#6b5a2e', fontFamily: fonts.body, fontSize: 12, fontWeight: '700' },
  questBar: { flex: 1, height: 8, backgroundColor: '#e8dcc0', borderRadius: 4, overflow: 'hidden' },
  questFill: { height: '100%' },
  questHint: { color: '#a0700f', fontFamily: fonts.body, fontSize: 11, marginTop: 2 },
  buttons: { position: 'absolute', top: 12, right: 12, flexDirection: 'row', gap: 6 },
  minimapFrame: {
    position: 'absolute',
    top: 62,
    right: 8,
    width: 228,
    height: Math.round((220 * 34) / 46) + 8,
    borderWidth: 4,
    borderColor: '#2b3263',
    borderRadius: 8,
  },
  sideButtons: { position: 'absolute', top: 262, right: 12, gap: 6, alignItems: 'flex-end' },
  minimapLabel: {
    position: 'absolute',
    bottom: -20,
    right: 0,
    color: '#fff',
    fontFamily: fonts.game, fontWeight: '900',
    fontSize: 11,
    backgroundColor: '#2b3263',
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  areaTitle: { position: 'absolute', top: '28%', left: 0, right: 0, alignItems: 'center' },
  areaBig: { color: '#fff', fontFamily: fonts.display, fontSize: 40, textShadowRadius: 0, textShadowOffset: { width: 3, height: 3 } },
  areaSmall: { color: '#fff', fontFamily: fonts.code, fontSize: 14, textShadowColor: '#000', textShadowRadius: 6 },
  feed: { position: 'absolute', top: 100, left: 12, gap: 4 },
  feedItem: { color: '#fff', fontSize: 12, fontFamily: fonts.body, backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  prompt: {
    position: 'absolute',
    bottom: 96,
    alignSelf: 'center',
    backgroundColor: 'rgba(20,23,40,0.95)',
    borderRadius: 16,
    padding: 12,
    gap: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.gold,
    maxWidth: 460,
  },
  promptTitle: { color: colors.text, fontFamily: fonts.game, fontWeight: '900', fontSize: 18 },
  promptLock: { color: '#ffb4b4', fontFamily: fonts.body, fontSize: 13, textAlign: 'center' },
  promptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.ok,
    borderBottomWidth: 4,
    borderBottomColor: colors.okDark,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  keyBig: {
    color: '#1d2340',
    backgroundColor: '#fff',
    fontFamily: fonts.game, fontWeight: '900',
    fontSize: 16,
    width: 26,
    height: 26,
    lineHeight: 26,
    textAlign: 'center',
    borderRadius: 6,
    borderBottomWidth: 3,
    borderBottomColor: '#b8c0e0',
  },
  promptAction: { color: '#fff', fontFamily: fonts.game, fontWeight: '900', fontSize: 17 },
  controls: { position: 'absolute', bottom: 12, left: 12, backgroundColor: 'rgba(20,23,40,0.85)', borderRadius: 12, padding: 8 },
  controlsText: { color: colors.muted, fontFamily: fonts.body, fontSize: 12 },
  key: { fontFamily: fonts.game, fontWeight: '900', color: '#1d2340', backgroundColor: '#e6e9f5', borderRadius: 4, fontSize: 11 },
  tutorial: { position: 'absolute', top: 128, alignSelf: 'center', width: 560, maxWidth: '92%' },
});
