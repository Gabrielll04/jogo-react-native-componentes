/**
 * Cena principal do mundo 2D top-down (Phaser 3).
 *  - desenha o mapa gerado em shared/map.ts
 *  - move o jogador com WASD/setas, com colisão por tiles
 *  - portas abrem/fecham conforme os módulos liberados pelo professor
 *  - jogadores remotos são interpolados entre os pacotes do servidor
 */
import Phaser from 'phaser';
import { buildWorld, buildingAt, isSolid, MAP_H, MAP_W, Tile, TILE, type WorldMap } from '@shared/map';
import { findStation, MODULES } from '@shared/modules';
import type { ModuleState, PlayerProgress, PublicPlayer } from '@shared/types';
import { actions } from '../net/socket';
import { getState, subscribe } from '../state/store';
import { bridge, type Interactable } from './bridge';

const SPEED = 170; // px/s
const HALF = 10; // meia largura da "caixa de colisão" do jogador
const INTERACT_DIST = TILE * 1.4;

interface Avatar {
  root: Phaser.GameObjects.Container;
  body: Phaser.GameObjects.Arc;
  label: Phaser.GameObjects.Text;
  status: Phaser.GameObjects.Text;
  bubble: Phaser.GameObjects.Text;
  bubbleUntil: number;
  tx: number;
  ty: number;
}

const hex = (c: string) => Phaser.Display.Color.HexStringToColor(c).color;

export class WorldScene extends Phaser.Scene {
  private world!: WorldMap;
  private me!: Avatar;
  private others = new Map<string, Avatar>();
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private doorGfx!: Phaser.GameObjects.Graphics;
  private doorIcons: Phaser.GameObjects.Text[] = [];
  private stationBadges = new Map<string, Phaser.GameObjects.Text>();
  private nearby: Interactable | null = null;
  private area: number | null = null;
  private lastBlockedToast = 0;
  private lastFrame = 0;
  private unsub: Array<() => void> = [];
  private lastModules: ModuleState[] | null = null;
  private lastProgress: PlayerProgress | null = null;
  private lastPlayers: PublicPlayer[] | null = null;

  constructor() {
    super('world');
  }

  create() {
    this.world = buildWorld();
    this.drawMap();
    this.drawStationsAndSigns();
    this.doorGfx = this.add.graphics().setDepth(2);

    const s = getState();
    const mine = s.players.find((p) => p.id === s.playerId);
    this.me = this.makeAvatar(s.progress?.name ?? 'Eu', s.progress?.color ?? '#fff', true);
    const sx = this.world.spawn.x + Phaser.Math.Between(-32, 32);
    this.me.root.setPosition(mine?.x && mine.inWorld ? mine.x : sx, mine?.y && mine.inWorld ? mine.y : this.world.spawn.y);

    // câmera segue o jogador
    const cam = this.cameras.main;
    cam.setBounds(0, 0, MAP_W * TILE, MAP_H * TILE);
    cam.startFollow(this.me.root, true, 0.12, 0.12);
    cam.setZoom(this.computeZoom());
    cam.setRoundPixels(true);
    this.scale.on('resize', () => cam.setZoom(this.computeZoom()));

    // teclado: enableCapture=false para não "roubar" teclas dos campos de texto
    const kb = this.input.keyboard!;
    this.keys = {} as Record<string, Phaser.Input.Keyboard.Key>;
    for (const k of ['W', 'A', 'S', 'D', 'UP', 'DOWN', 'LEFT', 'RIGHT', 'E', 'SPACE']) {
      this.keys[k] = kb.addKey(k, false);
    }
    this.keys.E.on('down', () => this.nearby && bridge.emit('interact', this.nearby));
    this.keys.SPACE.on('down', () => this.nearby && bridge.emit('interact', this.nearby));

    // eventos vindos da rede / React
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
    this.events.once('shutdown', () => this.unsub.forEach((u) => u()));
  }

  private computeZoom() {
    // mostra uma área confortável do mapa em qualquer resolução
    return Phaser.Math.Clamp(Math.min(this.scale.width / 900, this.scale.height / 600), 1, 2.2);
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
      this.add
        .text((b.x + b.w / 2) * TILE, ly, `${mod.emoji} ${mod.id}. ${mod.name}`, {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '13px',
          fontStyle: 'bold',
          color: '#ffffff',
          backgroundColor: mod.color,
          padding: { x: 6, y: 3 },
          resolution: 2,
        })
        .setOrigin(0.5, top ? 1 : 0)
        .setDepth(3);
    }

    this.add
      .text(20 * TILE, 12 * TILE + 6, 'Praça dos Componentes', {
        fontFamily: 'system-ui, sans-serif', fontSize: '11px', color: '#6b5a2e', resolution: 2,
      })
      .setOrigin(0.5, 0)
      .setDepth(1);
  }

  private drawStationsAndSigns() {
    for (const st of this.world.stations) {
      const info = findStation(st.stationId)!;
      const cx = st.x * TILE + TILE / 2;
      const cy = st.y * TILE + TILE / 2;
      const boss = info.station.type === 'boss_challenge';
      const ring = this.add.circle(cx, cy + 6, boss ? 17 : 13, boss ? 0x8b1e1e : 0x3b3b55, 0.85).setDepth(1);
      this.tweens.add({ targets: ring, scale: 1.12, yoyo: true, repeat: -1, duration: 900, ease: 'Sine.easeInOut' });
      this.add
        .text(cx, cy - 2, info.station.emoji, { fontSize: boss ? '30px' : '22px', resolution: 2 })
        .setOrigin(0.5)
        .setDepth(4);
      const badge = this.add
        .text(cx + 12, cy - 18, '', { fontSize: '13px', resolution: 2 })
        .setOrigin(0.5)
        .setDepth(5);
      this.stationBadges.set(st.stationId, badge);
    }
    for (const s of this.world.signs) {
      const cx = s.x * TILE + TILE / 2;
      const cy = s.y * TILE + TILE / 2;
      this.add.rectangle(cx, cy + 8, 4, 14, 0x6b4a2b).setDepth(1);
      this.add.rectangle(cx, cy - 2, 26, 16, 0xc89b5f).setStrokeStyle(2, 0x6b4a2b).setDepth(1);
      this.add.text(cx, cy - 2, 'ℹ', { fontSize: '12px', color: '#3a2a15', resolution: 2 }).setOrigin(0.5).setDepth(2);
    }
  }

  /** portas: verdes/abertas se o módulo está liberado para mim; marrons com cadeado se não */
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
        this.doorIcons.push(
          this.add.text(px + TILE / 2, py + TILE / 2, '🔒', { fontSize: '16px', resolution: 2 }).setOrigin(0.5).setDepth(3)
        );
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
    const shadow = this.add.ellipse(0, 12, 22, 8, 0x000000, 0.25);
    const body = this.add.circle(0, 0, 11, hex(color)).setStrokeStyle(isMe ? 3 : 2, isMe ? 0xffffff : 0x222222);
    const eyes = this.add.text(0, -1, '• •', { fontSize: '9px', color: '#111', resolution: 2 }).setOrigin(0.5);
    const label = this.add
      .text(0, -24, name, {
        fontFamily: 'system-ui, sans-serif', fontSize: '11px', color: '#fff',
        backgroundColor: isMe ? '#1b5e20cc' : '#000000aa', padding: { x: 4, y: 1 }, resolution: 2,
      })
      .setOrigin(0.5);
    const status = this.add.text(14, -14, '', { fontSize: '14px', resolution: 2 }).setOrigin(0.5);
    const bubble = this.add
      .text(0, -46, '', { fontSize: '20px', backgroundColor: '#ffffffee', padding: { x: 4, y: 2 }, resolution: 2 })
      .setOrigin(0.5)
      .setVisible(false);
    const root = this.add.container(0, 0, [shadow, body, eyes, label, status, bubble]).setDepth(isMe ? 11 : 10);
    return { root, body, label, status, bubble, bubbleUntil: 0, tx: 0, ty: 0 };
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
    this.others.get(id)?.root.destroy();
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
      this.drawDoors();
    }
    if (s.progress !== this.lastProgress) {
      this.lastProgress = s.progress;
      for (const [id, badge] of this.stationBadges) badge.setText(s.progress?.completed[id] ? '✅' : '');
    }
    if (s.players !== this.lastPlayers) {
      this.lastPlayers = s.players;
      const present = new Set<string>();
      for (const p of s.players) {
        if (p.id === s.playerId) {
          this.me.status.setText(p.stuck ? '❓' : '');
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
          a.body.setFillStyle(hex(p.color));
          a.status.setText(p.stuck ? '❓' : p.stationId ? '📝' : '');
        }
      }
      for (const id of [...this.others.keys()]) if (!present.has(id)) this.removeOther(id);
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
    if (vx || vy) {
      const len = Math.hypot(vx, vy);
      const nx = this.me.root.x + (vx / len) * SPEED * dt;
      const ny = this.me.root.y + (vy / len) * SPEED * dt;
      // move eixo por eixo para "deslizar" nas paredes
      if (!this.blocked(nx, this.me.root.y)) this.me.root.x = nx;
      if (!this.blocked(this.me.root.x, ny)) this.me.root.y = ny;
      this.me.body.setScale(1 + Math.sin(this.time.now / 60) * 0.06);
      actions.move(this.me.root.x, this.me.root.y);
    } else {
      this.me.body.setScale(1);
    }

    // interpolação suave dos outros jogadores
    const lerp = Math.min(1, dt * 12);
    for (const a of this.others.values()) {
      a.root.x += (a.tx - a.root.x) * lerp;
      a.root.y += (a.ty - a.root.y) * lerp;
    }
    for (const a of [this.me, ...this.others.values()]) {
      if (a.bubble.visible && this.time.now > a.bubbleUntil) a.bubble.setVisible(false);
    }

    this.checkArea();
    this.checkNearby();
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
    for (const st of this.world.stations) {
      const d = Phaser.Math.Distance.Between(x, y, st.x * TILE + TILE / 2, st.y * TILE + TILE / 2);
      if (d < bestD) {
        bestD = d;
        best = { kind: 'station', id: st.stationId, moduleId: st.moduleId };
      }
    }
    for (const s of this.world.signs) {
      const d = Phaser.Math.Distance.Between(x, y, s.x * TILE + TILE / 2, s.y * TILE + TILE / 2);
      if (d < bestD) {
        bestD = d;
        best = { kind: 'sign', moduleId: s.moduleId };
      }
    }
    const same =
      best?.kind === this.nearby?.kind &&
      (best?.kind === 'station' ? best.id === (this.nearby as { id?: string })?.id : best?.moduleId === this.nearby?.moduleId);
    if (!same) {
      this.nearby = best;
      bridge.emit('nearby', best);
    }
  }
}
