/**
 * Ambiente do mundo: detalhes que quase não se notam, mas fazem falta quando somem.
 *  - pós-processamento leve na câmera (vinheta + um toque de cor), só em WebGL
 *  - sombras de nuvens passando devagar
 *  - pontinhos de luz flutuando
 *  - reflexo na água
 *  - poeirinha nos passos
 */
import Phaser from 'phaser';
import { MAP_H, MAP_W, Tile, TILE, type WorldMap } from '@shared/map';

function softTexture(scene: Phaser.Scene, key: string, size: number) {
  if (scene.textures.exists(key)) return key;
  const tex = scene.textures.createCanvas(key, size, size)!;
  const ctx = tex.getContext();
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.45, 'rgba(255,255,255,0.55)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  tex.refresh();
  return key;
}

export class Ambience {
  private clouds: Phaser.GameObjects.Image[] = [];
  private motes: { img: Phaser.GameObjects.Image; vx: number; vy: number; phase: number }[] = [];
  private water: { x: number; y: number }[] = [];
  private shimmer: Phaser.GameObjects.Graphics;
  private dustCount = 0;
  private W = MAP_W * TILE;
  private H = MAP_H * TILE;

  constructor(
    private scene: Phaser.Scene,
    world: WorldMap,
    private hideFromMinimap: (o: Phaser.GameObjects.GameObject) => void
  ) {
    const cam = scene.cameras.main;
    if (scene.game.renderer.type === Phaser.WEBGL && cam.postFX) {
      cam.postFX.addVignette(0.5, 0.5, 0.78, 0.32);
      const cm = cam.postFX.addColorMatrix();
      cm.saturate(0.1);
      cm.contrast(0.04, true);
    }

    // sombras de nuvem
    const blob = softTexture(scene, 'amb-blob', 128);
    for (let i = 0; i < 4; i++) {
      const c = scene.add
        .image(Phaser.Math.Between(0, this.W), Phaser.Math.Between(0, this.H), blob)
        .setScale(Phaser.Math.FloatBetween(4.5, 7), Phaser.Math.FloatBetween(2.6, 3.6))
        .setTint(0x0d2233)
        .setAlpha(0.07)
        .setDepth(24);
      this.hideFromMinimap(c);
      this.clouds.push(c);
    }

    // pontinhos de luz
    const dot = softTexture(scene, 'amb-dot', 16);
    for (let i = 0; i < 18; i++) {
      const img = scene.add
        .image(Phaser.Math.Between(0, this.W), Phaser.Math.Between(0, this.H), dot)
        .setScale(Phaser.Math.FloatBetween(0.25, 0.45))
        .setTint(0xfff3b0)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(23);
      this.hideFromMinimap(img);
      this.motes.push({ img, vx: Phaser.Math.FloatBetween(-6, 6), vy: Phaser.Math.FloatBetween(-8, -2), phase: Math.random() * Math.PI * 2 });
    }

    // água
    for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) if (world.tiles[y][x] === Tile.Water) this.water.push({ x, y });
    this.shimmer = scene.add.graphics().setDepth(1);
    this.hideFromMinimap(this.shimmer);
  }

  update(time: number, dt: number) {
    for (const c of this.clouds) {
      c.x += 9 * dt;
      c.y += 2.5 * dt;
      if (c.x - c.displayWidth / 2 > this.W) c.x = -c.displayWidth / 2;
      if (c.y - c.displayHeight / 2 > this.H) c.y = -c.displayHeight / 2;
    }
    for (const m of this.motes) {
      m.img.x += (m.vx + Math.sin(time / 1300 + m.phase) * 5) * dt;
      m.img.y += m.vy * dt;
      m.img.setAlpha(0.25 + 0.35 * (0.5 + 0.5 * Math.sin(time / 700 + m.phase)));
      if (m.img.y < -10) m.img.y = this.H + 10;
      if (m.img.x < -10) m.img.x = this.W + 10;
      if (m.img.x > this.W + 10) m.img.x = -10;
    }
    // reflexos que deslizam devagar na água
    const g = this.shimmer.clear();
    for (const w of this.water) {
      const px = w.x * TILE;
      const py = w.y * TILE;
      const o = (Math.sin(time / 600 + w.x * 1.7 + w.y) + 1) * 4;
      g.lineStyle(2, 0xc4e6ff, 0.35 + 0.25 * Math.sin(time / 500 + w.x + w.y * 2));
      g.lineBetween(px + 4 + o, py + 7, px + 12 + o, py + 7);
      g.lineBetween(px + 18 - o, py + 27, px + 26 - o, py + 27);
    }
  }

  /** poeirinha embaixo dos pés de quem anda */
  dust(x: number, y: number) {
    if (this.dustCount > 60) return;
    const d = this.scene.add
      .circle(x + Phaser.Math.Between(-5, 5), y + 12, Phaser.Math.Between(2, 3), 0xe8dcc0, 0.55)
      .setDepth(5);
    this.hideFromMinimap(d);
    this.dustCount++;
    this.scene.tweens.add({
      targets: d,
      alpha: 0,
      y: d.y - 4,
      scale: 1.8,
      duration: 420,
      ease: 'Quad.easeOut',
      onComplete: () => {
        d.destroy();
        this.dustCount--;
      },
    });
  }
}
