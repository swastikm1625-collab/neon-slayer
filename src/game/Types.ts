/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Vector2D {
  x: number;
  y: number;
}

export interface PlayerState {
  pos: Vector2D;
  dir: Vector2D;
  plane: Vector2D;
  health: number;
  armor: number; // Added armor
  ammo: number;
  isShooting: boolean;
  shootCooldown: number;
  selectedWeapon: number;
}

export interface GameItem {
  pos: Vector2D;
  type: 'health' | 'ammo' | 'armor';
  collected: boolean;
}

export interface GameMap {
  grid: number[][];
  width: number;
  height: number;
}

export interface Sprite {
  pos: Vector2D;
  texture: string;
  isEnemy: boolean;
  isBoss?: boolean; // Added for progression
  health: number;
  alive: boolean;
  lastFired?: number;
}
