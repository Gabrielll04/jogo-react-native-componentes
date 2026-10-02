/**
 * Cena principal do mundo 2D top-down (Phaser 3).
 *  - desenha o mapa gerado em shared/map.ts
 *  - personagens em pixel art animados (4 direções), Mestres e terminais de desafio
 *  - move o jogador com WASD/setas, com colisão por tiles
 *  - portas abrem/fecham conforme os módulos liberados pelo professor
 *  - missão atual: marcador ▼ no alvo + seta guia em volta do jogador + minimapa
 *  - jogadores remotos são interpolados entre os pacotes do servidor
 */
import Phaser from 'phaser';
import { buildingAt, isSolid, MAP_H, MAP_W, Tile, TILE, type WorldMap } from '@shared/map';
import { findStation, MODULES } from '@shared/modules';
import type { ChallengeType, ModuleState, PlayerProgress, PublicPlayer } from '@shared/types';
import { actions } from '../net/socket';
import { getState, subscribe } from '../state/store';
import { bridge, interactKey, type Interactable } from './bridge';
import { currentObjective, doorOutside, stationLock, WORLD } from './quest';
import { ensureCharTexture, mentorLook, playerLook, type Dir } from './sprites';

const SPEED = 170; // px/s
const HALF = 10; // meia largura da "caixa de colisão" do jogador
const INTERACT_DIST = TILE * 1.5;
const FONT = 'Nunito, system-ui, sans-serif';
const CODE_FONT = '"JetBrains Mono", monospace';

const STATION_STYLE: Record<Exclude<ChallengeType, 'boss_challenge'>, { label: string; color: number }> = {
  quiz_component: { label: '🔮 QUIZ', color: 0xa368fc },
  match_use: { label: '🧩 LIGUE', color: 0xff9600 },
  build_ui: { label: '🛠️ MONTAR', color: 0x1cb0f6 },
  fix_bug: { label: '🐞 BUG', color: 0xff4b4b },
};

interface Avatar {
  root: Phaser.GameObjects.Container;
  sprite: Phaser.GameObjects.Sprite;
  label: Phaser.GameObjects.Text;
  status: Phaser.GameObjects.Text;
  bubble: Phaser.GameObjects.Text;
  mini: Phaser.GameObjects.Arc;
  bubbleUntil: number;
  tx: number;
  ty: number;
  dir: Dir;
  moving: boolean;
}

interface MentorObj {
  component: string;
  moduleId: number;
  marker: Phaser.GameObjects.Text;
}

interface StationObj {
  stationId: string;
  type: ChallengeType;
  cx: number;
  cy: number;
  screen: Phaser.GameObjects.Graphics;
  badge: Phaser.GameObjects.Text;
}

const hex = (c: string) => Phaser.Display.Color.HexStringToColor(c).color;

export class WorldScene extends Phaser.Scene {
  private world!: WorldMap;
  private me!: Avatar;
  private others = new Map<string, Avatar>();
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private doorGfx!: Phaser.GameObjects.Graphics;
  private doorIcons: Phaser.GameObjects.Text[] = [];
  private mentors: MentorObj[] = [];
  private stations: StationObj[] = [];
  private questMarker!: Phaser.GameObjects.Text;
  private guide!: Phaser.GameObjects.Graphics;
  private miniMe!: Phaser.GameObjects.Arc;
  private miniGoal!: Phaser.GameObjects.Star;
  private minimap!: Phaser.Cameras.Scene2D.Camera;
  /** objetos que só aparecem na câmera principal (textos, marcadores) */
  private mainOnly: Phaser.GameObjects.GameObject[] = [];
  private miniOnly: Phaser.GameObjects.GameObject[] = [];
  private nearby: Interactable | null = null;
  private area: number | null = null;
  private lastBlockedToast = 0;
  private lastFrame = 0;
  private walked = 0;
  private unsub: Array<() => void> = [];
  private lastModules: ModuleState[] | null = null;
  private lastProgress: PlayerProgress | null = null;
  private lastPlayers: PublicPlayer[] | null = null;
  private goal: { x: number; y: number } | null = null;

  constructor() {
    super('world');
  }

  create() {
    this.world = WORLD;
    this.drawMap();
    this.drawSigns();
    this.drawMentors();
    this.drawStations();
    this.doorGfx = this.add.graphics().setDepth(2);

    const s = getState();
    const mine = s.players.find((p) => p.id === s.playerId);
    this.me = this.makeAvatar(s.progress?.name ?? 'Eu', s.progress?.color ?? '#fff', true);
    const sx = this.world.spawn.x + Phaser.Math.Between(-32, 32);
    this.me.root.setPosition(mine?.inWorld && mine.x ? mine.x : sx, mine?.inWorld && mine.y ? mine.y : this.world.spawn.y);

    // missão: marcador ▼ sobre o alvo e seta guia em volta do jogador
    this.questMarker = this.add
      .text(0, 0, '▼', { fontFamily: FONT, fontSize: '26px', color: '#ffd54a', stroke: '#5a3b00', strokeThickness: 5, resolution: 3 })
      .setOrigin(0.5, 1)
      .setDepth(30)
      .setVisible(false);
    this.tweens.add({ targets: this.questMarker, y: '-=8', yoyo: true, repeat: -1, duration: 450, ease: 'Sine.easeInOut' });
    this.guide = this.add.graphics().setDepth(29);
    this.mainOnly.push(this.questMarker, this.guide);

    // câmera segue o jogador
    const cam = this.cameras.main;
    cam.setBounds(0, 0, MAP_W * TILE, MAP_H * TILE);
    cam.startFollow(this.me.root, true, 0.12, 0.12);
    cam.setZoom(this.computeZoom());
    cam.setRoundPixels(true);

    // minimapa (segunda câmera mostrando o mapa todo)
    this.miniMe = this.add.circle(0, 0, 34, 0xffffff).setStrokeStyle(10, 0x000000).setDepth(50);
    this.miniGoal = this.add.star(0, 0, 5, 26, 60, 0xffd54a).setStrokeStyle(8, 0x5a3b00).setDepth(49).setVisible(false);
    this.miniOnly.push(this.miniMe, this.miniGoal);
    this.minimap = this.cameras.add(0, 0, 220, Math.round((220 * MAP_H) / MAP_W)).setZoom(220 / (MAP_W * TILE)).setName('mini');
    this.minimap.setBackgroundColor('#1d2b1f').centerOn((MAP_W * TILE) / 2, (MAP_H * TILE) / 2);
    this.placeMinimap();
    this.scale.on('resize', () => {
      cam.setZoom(this.computeZoom());
      this.placeMinimap();
    });

    // teclado: enableCapture=false para não "roubar" teclas dos campos de texto
    const kb = this.input.keyboard!;
    this.keys = {} as Record<string, Phaser.Input.Keyboard.Key>;
    for (const k of ['W', 'A', 'S', 'D', 'UP', 'DOWN', 'LEFT', 'RIGHT', 'E', 'SPACE']) this.keys[k] = kb.addKey(k, false);
    this.keys.E.on('down', () => this.nearby && bridge.emit('interact', this.nearby));
    this.keys.SPACE.on('down', () => this.nearby && bridge.emit('interact', this.nearby));

    this.unsub.push(
      bridge.on('sync', (packet: [string, number, number][]) => this.onSync(packet)),
      bridge.on('emote', (e: { id: string; emote: string }) => this.showEmote(e.id, e.emote)),
      bridge.on('left', (id: string) => this.removeOther(id)),
      bridge.on('input', (enabled: boolean) => {
        kb.enabled = enabled;
        if (!enabled) kb.resetKeys();
      }),
      subscribe(() => this.onStore())
    );
    this.onStore();
    this.applyCameraFilters();
    this.events.once('shutdown', () => this.unsub.forEach((u) => u()));
  }

  private computeZoom() {
    return Phaser.Math.Clamp(Math.min(this.scale.width / 900, this.scale.height / 620), 1, 2.2);
  }

  private placeMinimap() {
    this.minimap.setPosition(this.scale.width - 232, 66);
  }

  /** textos e marcadores só na câmera principal; pontos do minimapa só no minimapa */
  private applyCameraFilters() {
    this.minimap.ignore(this.mainOnly);
    this.cameras.main.ignore(this.miniOnly);
  }

  private mainText(x: number, y: number, text: string, style: Phaser.Types.GameObjects.Text.TextStyle) {
    const t = this.add.text(x, y, text, { resolution: 3, fontStyle: '900', ...style });
    this.mainOnly.push(t);
    return t;
  }

  // ------------------------------------------------------------- desenho do mapa
  private drawMap() {
    const g = this.add.graphics().setDepth(0);
    const floorColors = new Map<number, number>();
    for (const b of this.world.buildings) {
      const mod = MODULES.find((m) => m.id === b.moduleId)!;
      const c = Phaser.Display.Color.HexStringToColor(mod.color);
      floorColors.set(b.moduleId, Phaser.Display.Color.GetColor(
        Math.round(c.red * 0.35 + 150), Math.round(c.green * 0.35 + 140), Math.round(c.blue * 0.35 + 125)
      ));
    }

    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        const t = this.world.tiles[y][x];
        const px = x * TILE;
        const py = y * TILE;
        const checker = (x + y) % 2 === 0;
        switch (t) {
          case Tile.Grass:
          case Tile.Flower:
          case Tile.Tree:
            g.fillStyle(checker ? 0x6fbf5a : 0x68b754).fillRect(px, py, TILE, TILE);
            break;
          case Tile.Path:
          case Tile.Door:
            g.fillStyle(checker ? 0xd9c38f : 0xd2bb86).fillRect(px, py, TILE, TILE);
            break;
          case Tile.Water:
            g.fillStyle(0x3d8fd6).fillRect(px, py, TILE, TILE);
            g.lineStyle(2, 0x7cc0f5).lineBetween(px + 6, py + 12, px + 16, py + 12).lineBetween(px + 14, py + 22, px + 26, py + 22);
            break;
          case Tile.Floor: {
            const id = buildingAt(this.world, px + 1, py + 1) ?? 1;
            const base = floorColors.get(id) ?? 0xcccccc;
            g.fillStyle(base).fillRect(px, py, TILE, TILE);
            if (checker) g.fillStyle(0x000000, 0.05).fillRect(px, py, TILE, TILE);
            break;
          }
          case Tile.Wall:
            g.fillStyle(0x5a4a3f).fillRect(px, py, TILE, TILE);
            g.fillStyle(0x7a6656).fillRect(px, py, TILE, TILE - 8);
            g.lineStyle(1, 0x4a3b31).strokeRect(px + 0.5, py + 0.5, TILE - 1, TILE - 1);
            break;
        }
        if (t === Tile.Tree) {
          g.fillStyle(0x6b4a2b).fillRect(px + 13, py + 18, 6, 12);
          g.fillStyle(0x2f7d32).fillCircle(px + 16, py + 14, 12);
          g.fillStyle(0x3f9b42).fillCircle(px + 12, py + 11, 6);
        } else if (t === Tile.Flower) {
          const colors = [0xff6b9a, 0xfff176, 0xffffff, 0xb388ff];
          const c = colors[(x * 7 + y * 3) % colors.length];
          g.fillStyle(c).fillCircle(px + 10, py + 12, 3).fillCircle(px + 22, py + 20, 3);
        }
      }
    }

    // nomes dos prédios sobre a parede superior
    for (const b of this.world.buildings) {
      const mod = MODULES.find((m) => m.id === b.moduleId)!;
      const top = b.y < MAP_H / 2;
      const ly = top ? b.y * TILE - 4 : (b.y + b.h) * TILE + 4;
      this.mainText((b.x + b.w / 2) * TILE, ly, `${mod.emoji} ${mod.id}. ${mod.name}`, {
          fontFamily: FONT,
          fontSize: '15px',
          color: '#ffffff',
          backgroundColor: mod.color,
          padding: { x: 8, y: 3 },
        })
        .setOrigin(0.5, top ? 1 : 0)
        .setDepth(3);
    }

    this.mainText(23 * TILE, 13 * TILE + 6, 'Praça dos Componentes', { fontFamily: FONT, fontSize: '12px', color: '#6b5a2e' })
      .setOrigin(0.5, 0)
      .setDepth(1);
  }

  private drawSigns() {
    for (const s of this.world.signs) {
      const cx = s.x * TILE + TILE / 2;
      const cy = s.y * TILE + TILE / 2;
      this.add.rectangle(cx, cy + 8, 4, 14, 0x6b4a2b).setDepth(1);
      this.add.rectangle(cx, cy - 2, 26, 16, 0xc89b5f).setStrokeStyle(2, 0x6b4a2b).setDepth(1);
      this.mainText(cx, cy - 2, 'ℹ', { fontSize: '12px', color: '#3a2a15' }).setOrigin(0.5).setDepth(2);
    }
  }

  private drawMentors() {
    for (const m of this.world.mentors) {
      const mod = MODULES.find((x) => x.id === m.moduleId)!;
      const cx = m.x * TILE + TILE / 2;
      const cy = m.y * TILE + TILE / 2;
      // tapete mágico embaixo do Mestre
      this.add.ellipse(cx, cy + 12, 34, 12, hex(mod.color), 0.35).setDepth(1);
      const key = ensureCharTexture(this, `mentor-${mod.id}`, mentorLook(mod.color));
      const top = m.y < MAP_H / 2;
      const sprite = this.add.sprite(cx, cy + 4, key, top ? 'down0' : 'up0').setScale(2).setOrigin(0.5, 0.75).setDepth(8);
      this.tweens.add({ targets: sprite, y: '-=2', yoyo: true, repeat: -1, duration: 700 + Math.random() * 300, ease: 'Sine.easeInOut' });
      // rótulos alternam de altura para não se sobreporem
      const k = this.world.mentors.filter((o) => o.moduleId === m.moduleId).indexOf(m);
      this.mainText(cx, cy + 16 + (k % 2) * 13, `<${m.component}>`, {
        fontFamily: CODE_FONT,
        fontSize: '9px',
        fontStyle: 'bold',
        color: '#ffffff',
        backgroundColor: '#1b1f38dd',
        padding: { x: 3, y: 1 },
      })
        .setOrigin(0.5, 0)
        .setDepth(9);
      const marker = this.mainText(cx, cy - 30, '!', {
        fontFamily: FONT,
        fontSize: '18px',
        color: '#3b2a00',
        backgroundColor: '#ffd54a',
        padding: { x: 6, y: 0 },
      })
        .setOrigin(0.5, 1)
        .setDepth(12);
      this.tweens.add({ targets: marker, y: '-=4', yoyo: true, repeat: -1, duration: 500, ease: 'Sine.easeInOut' });
      this.mentors.push({ component: m.component, moduleId: m.moduleId, marker });
    }
  }

  private drawStations() {
    for (const st of this.world.stations) {
      const info = findStation(st.stationId)!;
      const cx = st.x * TILE + TILE / 2;
      const cy = st.y * TILE + TILE / 2;
      const boss = info.station.type === 'boss_challenge';
      if (boss) {
        const aura = this.add.circle(cx, cy + 6, 22, 0xff3b3b, 0.25).setDepth(1);
        this.tweens.add({ targets: aura, scale: 1.25, alpha: 0.1, yoyo: true, repeat: -1, duration: 900 });
        this.add.ellipse(cx, cy + 14, 44, 14, 0x4a1218).setDepth(1);
        this.mainText(cx, cy, info.station.emoji, { fontSize: '36px' }).setOrigin(0.5, 0.6).setDepth(8);
        this.mainText(cx, cy - 34, '⚔ CHEFE', { fontFamily: FONT, fontSize: '11px', color: '#fff', backgroundColor: '#8b1e1e', padding: { x: 4, y: 1 } })
          .setOrigin(0.5, 1)
          .setDepth(9);
      } else {
        const style = STATION_STYLE[info.station.type as keyof typeof STATION_STYLE];
        const g = this.add.graphics().setDepth(4);
        // mesa + gabinete do terminal
        g.fillStyle(0x6b4a2b).fillRoundedRect(cx - 16, cy + 2, 32, 12, 3);
        g.fillStyle(0x4a3220).fillRect(cx - 14, cy + 12, 4, 6).fillRect(cx + 10, cy + 12, 4, 6);
        g.fillStyle(0x23263d).fillRoundedRect(cx - 13, cy - 18, 26, 20, 3);
        g.fillStyle(0x3a3f63).fillRect(cx - 3, cy + 1, 6, 3);
        const screen = this.add.graphics().setDepth(5);
        // alterna a altura dos rótulos de terminais vizinhos
        const stagger = this.stations.filter((o) => o.type !== 'boss_challenge' && Math.abs(o.cy - cy) < 4 && Math.abs(o.cx - cx) < 80).length % 2;
        this.mainText(cx, cy - 22 - stagger * 14, style.label, {
          fontFamily: FONT,
          fontSize: '10px',
          color: '#ffffff',
          backgroundColor: '#1b1f38dd',
          padding: { x: 4, y: 1 },
        })
          .setOrigin(0.5, 1)
          .setDepth(9);
        const badge = this.mainText(cx + 14, cy - 18, '', { fontSize: '12px' }).setOrigin(0.5).setDepth(10);
        this.stations.push({ stationId: st.stationId, type: info.station.type, cx, cy, screen, badge });
        continue;
      }
      const badge = this.mainText(cx + 18, cy - 20, '', { fontSize: '14px' }).setOrigin(0.5).setDepth(10);
      this.stations.push({ stationId: st.stationId, type: 'boss_challenge', cx, cy, screen: this.add.graphics(), badge });
    }
  }

  /** atualiza visual de Mestres e terminais conforme o progresso */
  private refreshObjects() {
    const s = getState();
    const p = s.progress;
    for (const m of this.mentors) {
      const unlocked = s.modules.find((x) => x.id === m.moduleId)?.unlocked;
      const learned = p?.learned.includes(m.component);
      m.marker.setText(learned ? '✓' : unlocked ? '!' : '…');
      m.marker.setBackgroundColor(learned ? '#58cc02' : unlocked ? '#ffd54a' : '#777777');
      m.marker.setColor(learned ? '#ffffff' : '#3b2a00');
    }
    for (const st of this.stations) {
      const done = Boolean(p?.completed[st.stationId]);
      const lock = stationLock(p, st.stationId);
      st.badge.setText(done ? (st.type === 'boss_challenge' ? '🏆' : '✅') : lock ? '🔒' : '');
      if (st.type === 'boss_challenge') continue;
      const color = done ? 0x58cc02 : lock ? 0x555a70 : STATION_STYLE[st.type as keyof typeof STATION_STYLE].color;
      st.screen.clear();
      st.screen.fillStyle(color).fillRect(st.cx - 10, st.cy - 15, 20, 14);
      st.screen.fillStyle(0xffffff, lock ? 0.1 : 0.35).fillRect(st.cx - 8, st.cy - 13, 7, 2).fillRect(st.cx - 8, st.cy - 9, 11, 2);
    }
  }

  /** portas: abertas (contorno verde) se o módulo está liberado para mim; com cadeado se não */
  private drawDoors() {
    this.doorGfx.clear();
    this.doorIcons.forEach((t) => t.destroy());
    this.doorIcons = [];
    for (const d of this.world.doors) {
      const open = this.doorOpen(d.moduleId);
      const px = d.x * TILE;
      const py = d.y * TILE;
      if (open) {
        this.doorGfx.fillStyle(0x2b2118).fillRect(px + 2, py, TILE - 4, TILE);
        this.doorGfx.lineStyle(3, 0x4cff7a, 0.9).strokeRect(px + 2, py + 1, TILE - 4, TILE - 2);
      } else {
        this.doorGfx.fillStyle(0x8a5a2b).fillRect(px + 2, py, TILE - 4, TILE);
        this.doorGfx.lineStyle(2, 0x5a3a1b).strokeRect(px + 2, py + 1, TILE - 4, TILE - 2);
        const t = this.mainText(px + TILE / 2, py + TILE / 2, '🔒', { fontSize: '16px' }).setOrigin(0.5).setDepth(3);
        this.minimap?.ignore(t);
        this.doorIcons.push(t);
      }
    }
  }

  private doorOpen(moduleId: number) {
    const s = getState();
    const mod = MODULES.find((m) => m.id === moduleId);
    const unlocked = s.modules.find((m) => m.id === moduleId)?.unlocked ?? false;
    const reqs = mod?.requires.every((r) => s.progress?.modulesCompleted.includes(r)) ?? true;
    return unlocked && reqs;
  }

  // ------------------------------------------------------------- avatares

  private makeAvatar(name: string, color: string, isMe: boolean): Avatar {
    const key = ensureCharTexture(this, `p-${color}-${name}`, playerLook(name, color));
    const shadow = this.add.ellipse(0, 13, 22, 8, 0x000000, 0.28);
    const sprite = this.add.sprite(0, 0, key, 'down0').setScale(2).setOrigin(0.5, 0.75);
    const label = this.add
      .text(0, -36, name, {
        fontFamily: FONT,
        fontStyle: '900',
        fontSize: '11px',
        color: '#fff',
        backgroundColor: isMe ? '#1b5e20dd' : '#000000aa',
        padding: { x: 4, y: 1 },
        resolution: 3,
      })
      .setOrigin(0.5);
    const status = this.add.text(16, -28, '', { fontSize: '14px', resolution: 3 }).setOrigin(0.5);
    const bubble = this.add
      .text(0, -60, '', { fontSize: '20px', backgroundColor: '#ffffffee', padding: { x: 4, y: 2 }, resolution: 3 })
      .setOrigin(0.5)
      .setVisible(false);
    const root = this.add.container(0, 0, [shadow, sprite, label, status, bubble]).setDepth(isMe ? 21 : 20);
    // ponto no minimapa
    const mini = this.add.circle(0, 0, isMe ? 0 : 26, hex(color)).setStrokeStyle(8, 0x000000).setDepth(48);
    this.mainOnly.push(root);
    this.miniOnly.push(mini);
    this.minimap?.ignore(root);
    this.cameras.main.ignore(mini);
    return { root, sprite, label, status, bubble, mini, bubbleUntil: 0, tx: 0, ty: 0, dir: 'down', moving: false };
  }

  private animate(a: Avatar, dx: number, dy: number) {
    const moving = Math.abs(dx) + Math.abs(dy) > 0.3;
    if (moving) a.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : dy < 0 ? 'up' : 'down';
    const step = moving ? Math.floor(this.time.now / 140) % 2 : 0;
    a.sprite.setFrame(`${a.dir}${step}`);
    a.mini.setPosition(a.root.x, a.root.y);
  }

  private onSync(packet: [string, number, number][]) {
    const myId = getState().playerId;
    for (const [id, x, y] of packet) {
      if (id === myId) continue;
      let a = this.others.get(id);
      if (!a) {
        const info = getState().players.find((p) => p.id === id);
        a = this.makeAvatar(info?.name ?? '???', info?.color ?? '#999', false);
        a.root.setPosition(x, y);
        this.others.set(id, a);
      }
      a.tx = x;
      a.ty = y;
    }
  }

  private removeOther(id: string) {
    const a = this.others.get(id);
    a?.root.destroy();
    a?.mini.destroy();
    this.others.delete(id);
  }

  private showEmote(id: string, emote: string) {
    const a = id === getState().playerId ? this.me : this.others.get(id);
    if (!a) return;
    a.bubble.setText(emote).setVisible(true);
    a.bubbleUntil = this.time.now + 2500;
  }

  /** reage a mudanças no store (módulos, progresso, lista de jogadores) */
  private onStore() {
    const s = getState();
    if (s.modules !== this.lastModules || s.progress !== this.lastProgress) {
      this.lastModules = s.modules;
      this.lastProgress = s.progress;
      this.drawDoors();
      this.refreshObjects();
      this.updateGoal();
    }
    if (s.players !== this.lastPlayers) {
      this.lastPlayers = s.players;
      const present = new Set<string>();
      for (const p of s.players) {
        if (p.id === s.playerId) {
          this.me.status.setText(p.dueling ? '⚔️' : p.stuck ? '❓' : '');
          this.me.label.setText(`${p.name} · nv${p.level}`);
          continue;
        }
        if (!p.inWorld) {
          this.removeOther(p.id);
          continue;
        }
        present.add(p.id);
        const a = this.others.get(p.id);
        if (a) {
          a.label.setText(`${p.name} · nv${p.level}`);
          a.status.setText(p.dueling ? '⚔️' : p.stuck ? '❓' : p.stationId ? '📝' : '');
        }
      }
      for (const id of [...this.others.keys()]) if (!present.has(id)) this.removeOther(id);
    }
  }

  private updateGoal() {
    const s = getState();
    const obj = currentObjective(s.progress, s.modules);
    if (obj.kind === 'mentor' || obj.kind === 'station') {
      this.goal = { x: obj.x, y: obj.y };
      this.questMarker.setPosition(obj.x, obj.y - (obj.kind === 'mentor' ? 50 : 40)).setVisible(true);
      this.miniGoal.setPosition(obj.x, obj.y).setVisible(true);
    } else {
      this.goal = null;
      this.questMarker.setVisible(false);
      this.miniGoal.setVisible(false);
    }
  }

  // ------------------------------------------------------------- loop

  private blocked(px: number, py: number) {
    const corners = [
      [px - HALF, py - HALF],
      [px + HALF, py - HALF],
      [px - HALF, py + HALF],
      [px + HALF, py + HALF],
    ];
    for (const [cx, cy] of corners) {
      const tx = Math.floor(cx / TILE);
      const ty = Math.floor(cy / TILE);
      if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) return true;
      const t = this.world.tiles[ty][tx];
      if (isSolid(t)) return true;
      if (t === Tile.Door) {
        const door = this.world.doors.find((d) => d.x === tx && d.y === ty);
        if (door && !this.doorOpen(door.moduleId)) {
          if (this.time.now - this.lastBlockedToast > 2500) {
            this.lastBlockedToast = this.time.now;
            bridge.emit('blocked', door.moduleId);
          }
          return true;
        }
      }
    }
    // Mestres e terminais são sólidos (a gente conversa com eles, não atravessa)
    for (const m of this.world.mentors) if (Math.abs(px - (m.x * TILE + 16)) < 16 && Math.abs(py - (m.y * TILE + 16)) < 16) return true;
    for (const st of this.world.stations) if (Math.abs(px - (st.x * TILE + 16)) < 18 && Math.abs(py - (st.y * TILE + 18)) < 14) return true;
    return false;
  }

  update() {
    // tempo real entre quadros (o delta do Phaser é suavizado e "mente" quando o FPS cai).
    // Limitado a 0.1s: 170px/s * 0.1s = 17px < meio tile, então ninguém atravessa paredes.
    const now = performance.now();
    const dt = Math.min(now - (this.lastFrame || now), 100) / 1000;
    this.lastFrame = now;
    const k = this.keys;
    let vx = 0;
    let vy = 0;
    if (this.input.keyboard?.enabled) {
      if (k.A.isDown || k.LEFT.isDown) vx -= 1;
      if (k.D.isDown || k.RIGHT.isDown) vx += 1;
      if (k.W.isDown || k.UP.isDown) vy -= 1;
      if (k.S.isDown || k.DOWN.isDown) vy += 1;
    }
    const ox = this.me.root.x;
    const oy = this.me.root.y;
    if (vx || vy) {
      const len = Math.hypot(vx, vy);
      const nx = ox + (vx / len) * SPEED * dt;
      const ny = oy + (vy / len) * SPEED * dt;
      // move eixo por eixo para "deslizar" nas paredes
      if (!this.blocked(nx, oy)) this.me.root.x = nx;
      if (!this.blocked(this.me.root.x, ny)) this.me.root.y = ny;
      actions.move(this.me.root.x, this.me.root.y);
      this.walked += Math.hypot(this.me.root.x - ox, this.me.root.y - oy);
      if (this.walked > 80 && this.walked < 1e9) {
        bridge.emit('moved');
        this.walked = 1e9;
      }
    }
    this.animate(this.me, vx, vy);
    this.miniMe.setPosition(this.me.root.x, this.me.root.y);

    // interpolação suave dos outros jogadores
    const lerp = Math.min(1, dt * 12);
    for (const a of this.others.values()) {
      const dx = (a.tx - a.root.x) * lerp;
      const dy = (a.ty - a.root.y) * lerp;
      a.root.x += dx;
      a.root.y += dy;
      this.animate(a, dx * 10, dy * 10);
    }
    for (const a of [this.me, ...this.others.values()]) {
      if (a.bubble.visible && this.time.now > a.bubbleUntil) a.bubble.setVisible(false);
    }

    this.checkArea();
    this.checkNearby();
    this.drawGuide();
  }

  /** seta amarela em volta do jogador apontando para a missão (ou para a porta do prédio) */
  private drawGuide() {
    this.guide.clear();
    if (!this.goal) return;
    const s = getState();
    const obj = currentObjective(s.progress, s.modules);
    if (obj.kind !== 'mentor' && obj.kind !== 'station') return;
    const target = this.area === obj.moduleId ? this.goal : doorOutside(obj.moduleId);
    const { x, y } = this.me.root;
    const d = Phaser.Math.Distance.Between(x, y, target.x, target.y);
    if (this.area === obj.moduleId && d < 110) return;
    if (this.area !== obj.moduleId && this.area !== null) {
      // está em outro prédio: aponta para a própria porta para sair
      const out = doorOutside(this.area);
      return this.arrowTo(out.x, out.y);
    }
    if (d < 40) return;
    this.arrowTo(target.x, target.y);
  }

  private arrowTo(tx: number, ty: number) {
    const { x, y } = this.me.root;
    const ang = Phaser.Math.Angle.Between(x, y, tx, ty);
    const r = 40;
    const cx = x + Math.cos(ang) * r;
    const cy = y - 6 + Math.sin(ang) * r;
    const pulse = 1 + Math.sin(this.time.now / 150) * 0.12;
    const p = (a: number, len: number) => ({ x: cx + Math.cos(ang + a) * len * pulse, y: cy + Math.sin(ang + a) * len * pulse });
    const tip = p(0, 13);
    const l = p(2.5, 11);
    const rr = p(-2.5, 11);
    this.guide.fillStyle(0x5a3b00, 1).fillTriangle(tip.x + 1, tip.y + 2, l.x + 1, l.y + 2, rr.x + 1, rr.y + 2);
    this.guide.fillStyle(0xffd54a, 1).fillTriangle(tip.x, tip.y, l.x, l.y, rr.x, rr.y);
  }

  private checkArea() {
    const area = buildingAt(this.world, this.me.root.x, this.me.root.y);
    if (area === this.area) return;
    if (this.area !== null) actions.leaveArea(this.area);
    if (area !== null) actions.enterArea(area);
    this.area = area;
    bridge.emit('area', area);
  }

  private checkNearby() {
    const { x, y } = this.me.root;
    let best: Interactable | null = null;
    let bestD = INTERACT_DIST;
    const consider = (tx: number, ty: number, it: Interactable) => {
      const d = Phaser.Math.Distance.Between(x, y, tx * TILE + TILE / 2, ty * TILE + TILE / 2);
      if (d < bestD) {
        bestD = d;
        best = it;
      }
    };
    for (const m of this.world.mentors) consider(m.x, m.y, { kind: 'mentor', component: m.component, moduleId: m.moduleId });
    for (const st of this.world.stations) consider(st.x, st.y, { kind: 'station', id: st.stationId, moduleId: st.moduleId });
    for (const s of this.world.signs) consider(s.x, s.y, { kind: 'sign', moduleId: s.moduleId });
    // colegas por perto: dá para desafiar para um duelo
    for (const [id, a] of this.others) {
      const d = Phaser.Math.Distance.Between(x, y, a.root.x, a.root.y);
      if (d < bestD) {
        bestD = d;
        best = { kind: 'player', id, name: getState().players.find((p) => p.id === id)?.name ?? '???' };
      }
    }
    if (interactKey(best) !== interactKey(this.nearby)) {
      this.nearby = best;
      bridge.emit('nearby', best);
    }
  }
}
