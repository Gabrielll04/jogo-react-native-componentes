import { MODULES } from './modules';

/**
 * Mapa do mundo gerado a partir da configuração dos módulos.
 * Usado pelo cliente (desenho + colisão) e pelo servidor (validar distância
 * do jogador até a estação de desafio).
 *
 * Layout (40 x 30 tiles de 32px):
 *   [M1]  [M2]  [M3]      <- prédios de cima (porta embaixo)
 *   ===== praça =====     <- spawn no centro
 *   [M4]  [M5]  [M6]      <- prédios de baixo (porta em cima)
 */

export const TILE = 32;
export const MAP_W = 40;
export const MAP_H = 30;

export const Tile = {
  Grass: 0,
  Wall: 1,
  Floor: 2,
  Path: 3,
  Door: 4,
  Water: 5,
  Tree: 6,
  Flower: 7,
} as const;
export type Tile = (typeof Tile)[keyof typeof Tile];

export interface DoorInfo {
  moduleId: number;
  x: number;
  y: number;
}
export interface StationPlacement {
  stationId: string;
  moduleId: number;
  x: number;
  y: number;
}
export interface SignPlacement {
  moduleId: number;
  x: number;
  y: number;
}
export interface BuildingInfo {
  moduleId: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface WorldMap {
  tiles: Tile[][];
  doors: DoorInfo[];
  stations: StationPlacement[];
  signs: SignPlacement[];
  buildings: BuildingInfo[];
  spawn: { x: number; y: number };
}

const BW = 10; // largura do prédio
const BH = 9; // altura do prédio

// Posições relativas das estações dentro do prédio (para prédio com porta embaixo).
// As 4 primeiras são desafios; a do meio é o chefe.
const STATION_SLOTS = [
  [2, 2],
  [7, 2],
  [2, 5],
  [7, 5],
];
const BOSS_SLOT = [5, 3];

// gerador pseudo-aleatório determinístico: todos os clientes veem as mesmas árvores
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

export function buildWorld(): WorldMap {
  const tiles: Tile[][] = [];
  for (let y = 0; y < MAP_H; y++) {
    const row: Tile[] = [];
    for (let x = 0; x < MAP_W; x++) {
      const border = x === 0 || y === 0 || x === MAP_W - 1 || y === MAP_H - 1;
      row.push(border ? Tile.Tree : Tile.Grass);
    }
    tiles.push(row);
  }

  // praça central
  for (let y = 12; y <= 17; y++) for (let x = 2; x <= MAP_W - 3; x++) tiles[y][x] = Tile.Path;
  // fonte no centro da praça
  for (let y = 13; y <= 14; y++) for (let x = 19; x <= 20; x++) tiles[y][x] = Tile.Water;

  const doors: DoorInfo[] = [];
  const stations: StationPlacement[] = [];
  const signs: SignPlacement[] = [];
  const buildings: BuildingInfo[] = [];

  MODULES.slice(0, 6).forEach((mod, i) => {
    const col = i % 3;
    const top = i < 3;
    const bx = 2 + col * 13;
    const by = top ? 2 : 19;
    buildings.push({ moduleId: mod.id, x: bx, y: by, w: BW, h: BH });

    for (let y = by; y < by + BH; y++) {
      for (let x = bx; x < bx + BW; x++) {
        const edge = x === bx || y === by || x === bx + BW - 1 || y === by + BH - 1;
        tiles[y][x] = edge ? Tile.Wall : Tile.Floor;
      }
    }
    // porta voltada para a praça
    const dx = bx + 5;
    const dy = top ? by + BH - 1 : by;
    tiles[dy][dx] = Tile.Door;
    doors.push({ moduleId: mod.id, x: dx, y: dy });
    // caminho da porta até a praça
    if (top) for (let y = dy + 1; y < 12; y++) tiles[y][dx] = Tile.Path;
    else for (let y = 18; y < dy; y++) tiles[y][dx] = Tile.Path;
    // placa ao lado da porta (do lado de fora)
    signs.push({ moduleId: mod.id, x: dx - 2, y: top ? dy + 1 : dy - 1 });

    // estações: espelha verticalmente para prédios de baixo
    const mirror = (ry: number) => (top ? ry : BH - 1 - ry);
    let slot = 0;
    for (const st of mod.stations) {
      const pos = st.type === 'boss_challenge' ? BOSS_SLOT : STATION_SLOTS[slot++];
      if (!pos) continue;
      stations.push({ stationId: st.id, moduleId: mod.id, x: bx + pos[0], y: by + mirror(pos[1]) });
    }
  });

  // decoração: árvores e flores na grama, longe dos caminhos
  const rnd = seeded(42);
  for (let y = 1; y < MAP_H - 1; y++) {
    for (let x = 1; x < MAP_W - 1; x++) {
      if (tiles[y][x] !== Tile.Grass) continue;
      const nearPath = [tiles[y - 1][x], tiles[y + 1][x], tiles[y][x - 1], tiles[y][x + 1]].some(
        (t) => t === Tile.Path || t === Tile.Door
      );
      if (nearPath || signs.some((s) => s.x === x && s.y === y)) continue;
      const r = rnd();
      if (r < 0.07) tiles[y][x] = Tile.Tree;
      else if (r < 0.14) tiles[y][x] = Tile.Flower;
    }
  }

  return { tiles, doors, stations, signs, buildings, spawn: { x: 20 * TILE, y: 16 * TILE + TILE / 2 } };
}

/** Tiles que bloqueiam movimento (a porta é tratada à parte: depende do módulo). */
export function isSolid(t: Tile) {
  return t === Tile.Wall || t === Tile.Water || t === Tile.Tree;
}

/** Em qual prédio (módulo) um ponto em pixels está, ou null se fora. */
export function buildingAt(world: WorldMap, px: number, py: number): number | null {
  const tx = Math.floor(px / TILE);
  const ty = Math.floor(py / TILE);
  for (const b of world.buildings) {
    if (tx > b.x && tx < b.x + b.w - 1 && ty > b.y && ty < b.y + b.h - 1) return b.moduleId;
  }
  return null;
}
