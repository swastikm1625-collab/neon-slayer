/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Vector2D, PlayerState, GameMap, Sprite, GameItem } from './Types';
import { SCREEN_WIDTH, SCREEN_HEIGHT, COLORS, DEFAULT_MAP, FOV, ROTATION_SPEED, MOVEMENT_SPEED, COLLISION_MARGIN } from './Constants';

export class GameEngine {
  private ctx: CanvasRenderingContext2D;
  private player: PlayerState;
  private map: GameMap;
  private canvas: HTMLCanvasElement;
  private keys: Set<string> = new Set();
  private sprites: Sprite[] = [];
  private items: GameItem[] = [];
  private zBuffer: number[] = new Array(SCREEN_WIDTH).fill(0);
  private bossSpawned = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not get canvas context');
    this.ctx = context;

    this.player = {
      pos: { x: 12, y: 12 },
      dir: { x: -1, y: 0 },
      plane: { x: 0, y: FOV },
      health: 100,
      armor: 0,
      ammo: 50,
      isShooting: false,
      shootCooldown: 0,
      selectedWeapon: 1,
    };

    this.map = {
      grid: DEFAULT_MAP,
      width: DEFAULT_MAP[0].length,
      height: DEFAULT_MAP.length,
    };

    this.setupControls();
    this.spawnEnemies();
    this.spawnItems();
  }

  private spawnItems() {
      this.items = [
          { pos: { x: 15.5, y: 15.5 }, type: 'health', collected: false },
          { pos: { x: 5.5, y: 5.5 }, type: 'ammo', collected: false },
          { pos: { x: 5.5, y: 15.5 }, type: 'armor', collected: false },
          { pos: { x: 15.5, y: 5.5 }, type: 'health', collected: false },
          { pos: { x: 12.5, y: 2.5 }, type: 'ammo', collected: false },
      ];
  }

  private setupControls() {
    window.addEventListener('keydown', (e) => {
        this.keys.add(e.code);
        if (e.code.startsWith('Digit')) {
            const weaponNum = parseInt(e.code.replace('Digit', ''));
            if (weaponNum >= 1 && weaponNum <= 6) {
                this.player.selectedWeapon = weaponNum;
            }
        }
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    this.canvas.addEventListener('mousedown', () => this.handleShoot());
    window.addEventListener('keydown', (e) => {
        if (e.code === 'Space') this.handleShoot();
    });
  }

  private handleShoot() {
    if (this.player.shootCooldown > 0) return;
    if (this.player.selectedWeapon !== 1 && this.player.ammo <= 0) return;
    this.player.isShooting = true;
    
    if (this.player.selectedWeapon === 1) {
        this.player.shootCooldown = 20;
    } else if (this.player.selectedWeapon === 2) {
        this.player.shootCooldown = 12;
        this.player.ammo--;
    } else if (this.player.selectedWeapon === 3) {
        this.player.shootCooldown = 45;
        this.player.ammo = Math.max(0, this.player.ammo - 2);
    } else {
        this.player.shootCooldown = 5;
        this.player.ammo--;
    }
    
    this.checkHit();
    setTimeout(() => {
        this.player.isShooting = false;
    }, 100);
  }

  private checkHit() {
      const weaponRange = this.player.selectedWeapon === 1 ? 1.5 : 20;
      const weaponSpread = this.player.selectedWeapon === 3 ? 0.4 : 0.2;

      this.sprites.forEach(sprite => {
          if (!sprite.alive) return;
          const dx = sprite.pos.x - this.player.pos.x;
          const dy = sprite.pos.y - this.player.pos.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > weaponRange) return;
          const invDet = 1.0 / (this.player.plane.x * this.player.dir.y - this.player.dir.x * this.player.plane.y);
          const transformX = invDet * (this.player.dir.y * dx - this.player.dir.x * dy);
          const transformY = invDet * (-this.player.plane.y * dx + this.player.plane.x * dy); 
          if (transformY > 0 && Math.abs(transformX) < weaponSpread) {
              let damage = 50;
              if (this.player.selectedWeapon === 1) damage = 75;
              if (this.player.selectedWeapon === 2) damage = 40;
              if (this.player.selectedWeapon === 3) damage = 150;
              if (this.player.selectedWeapon >= 4) damage = 200;
              sprite.health -= damage;
              if (sprite.health <= 0) sprite.alive = false;
          }
      });
  }

  public update() {
    this.handleMovement();
    this.updateEnemies();
    this.updateItems();
    if (this.player.shootCooldown > 0) this.player.shootCooldown--;
    if (!this.bossSpawned && this.sprites.every(s => !s.isBoss && !s.alive)) {
        this.spawnBoss();
    }
  }

  private spawnBoss() {
      this.bossSpawned = true;
      this.sprites.push({
          pos: { x: 20.5, y: 12.5 },
          health: 2000,
          alive: true,
          texture: 'boss',
          isEnemy: true,
          isBoss: true
      });
  }

  private updateItems() {
      for (const item of this.items) {
          if (item.collected) continue;
          const dist = Math.sqrt((item.pos.x - this.player.pos.x) ** 2 + (item.pos.y - this.player.pos.y) ** 2);
          if (dist < 0.8) {
              item.collected = true;
              if (item.type === 'health') this.player.health = Math.min(100, this.player.health + 25);
              if (item.type === 'ammo') this.player.ammo += 20;
              if (item.type === 'armor') this.player.armor = Math.min(100, this.player.armor + 50);
          }
      }
  }

  private updateEnemies() {
      const currentTime = Date.now();
      for (const sprite of this.sprites) {
          if (!sprite.alive) continue;
          const dx = this.player.pos.x - sprite.pos.x;
          const dy = this.player.pos.y - sprite.pos.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < (sprite.isBoss ? 20 : 10)) {
              const speed = sprite.isBoss ? 0.03 : 0.02;
              const moveX = (dx / dist) * speed;
              const moveY = (dy / dist) * speed;
              const mX = Math.floor(sprite.pos.x + moveX);
              const mY = Math.floor(sprite.pos.y);
              const mX2 = Math.floor(sprite.pos.x);
              const mY2 = Math.floor(sprite.pos.y + moveY);

              if (mX >= 0 && mX < this.map.height && mY >= 0 && mY < this.map.width && this.map.grid[mX][mY] === 0) sprite.pos.x += moveX;
              if (mX2 >= 0 && mX2 < this.map.height && mY2 >= 0 && mY2 < this.map.width && this.map.grid[mX2][mY2] === 0) sprite.pos.y += moveY;
              if (dist < 1.5 && (!sprite.lastFired || currentTime - sprite.lastFired > (sprite.isBoss ? 500 : 2000))) {
                  const damage = sprite.isBoss ? 20 : 10;
                  if (this.player.armor > 0) {
                      this.player.armor -= damage;
                      if (this.player.armor < 0) {
                          this.player.health += this.player.armor;
                          this.player.armor = 0;
                      }
                  } else {
                      this.player.health -= damage;
                  }
                  sprite.lastFired = currentTime;
                  if (this.player.health < 0) this.player.health = 0;
              }
          }
      }
  }

  private handleMovement() {
    const moveX = this.player.dir.x * MOVEMENT_SPEED;
    const moveY = this.player.dir.y * MOVEMENT_SPEED;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) {
      const nextX = Math.floor(this.player.pos.x + moveX * 2);
      const nextY = Math.floor(this.player.pos.y + moveY * 2);
      if (nextX >= 0 && nextX < this.map.height && nextY >= 0 && nextY < this.map.width) {
          if (this.map.grid[nextX][Math.floor(this.player.pos.y)] === 0) this.player.pos.x += moveX;
          if (this.map.grid[Math.floor(this.player.pos.x)][nextY] === 0) this.player.pos.y += moveY;
      }
    }
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) {
      const nextX = Math.floor(this.player.pos.x - moveX * 2);
      const nextY = Math.floor(this.player.pos.y - moveY * 2);
      if (nextX >= 0 && nextX < this.map.height && nextY >= 0 && nextY < this.map.width) {
          if (this.map.grid[nextX][Math.floor(this.player.pos.y)] === 0) this.player.pos.x -= moveX;
          if (this.map.grid[Math.floor(this.player.pos.x)][nextY] === 0) this.player.pos.y -= moveY;
      }
    }
    const rotSpeed = ROTATION_SPEED;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) {
      const oldDirX = this.player.dir.x;
      this.player.dir.x = this.player.dir.x * Math.cos(rotSpeed) - this.player.dir.y * Math.sin(rotSpeed);
      this.player.dir.y = oldDirX * Math.sin(rotSpeed) + this.player.dir.y * Math.cos(rotSpeed);
      const oldPlaneX = this.player.plane.x;
      this.player.plane.x = this.player.plane.x * Math.cos(rotSpeed) - this.player.plane.y * Math.sin(rotSpeed);
      this.player.plane.y = oldPlaneX * Math.sin(rotSpeed) + this.player.plane.y * Math.cos(rotSpeed);
    }
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) {
      const oldDirX = this.player.dir.x;
      this.player.dir.x = this.player.dir.x * Math.cos(-rotSpeed) - this.player.dir.y * Math.sin(-rotSpeed);
      this.player.dir.y = oldDirX * Math.sin(-rotSpeed) + this.player.dir.y * Math.cos(-rotSpeed);
      const oldPlaneX = this.player.plane.x;
      this.player.plane.x = this.player.plane.x * Math.cos(-rotSpeed) - this.player.plane.y * Math.sin(-rotSpeed);
      this.player.plane.y = oldPlaneX * Math.sin(-rotSpeed) + this.player.plane.y * Math.cos(-rotSpeed);
    }
  }

  public render() {
    const shakeX = this.player.isShooting ? Math.random() * 8 - 4 : 0;
    const shakeY = this.player.isShooting ? Math.random() * 8 - 4 : 0;
    this.ctx.save();
    this.ctx.translate(shakeX, shakeY);
    const ceilingGradient = this.ctx.createLinearGradient(0, 0, 0, SCREEN_HEIGHT / 2);
    ceilingGradient.addColorStop(0, '#110000');
    ceilingGradient.addColorStop(1, '#331100');
    this.ctx.fillStyle = ceilingGradient;
    this.ctx.fillRect(-10, -10, SCREEN_WIDTH + 20, SCREEN_HEIGHT / 2 + 10);
    this.ctx.fillStyle = '#221100';
    this.ctx.fillRect(-10, SCREEN_HEIGHT / 2, SCREEN_WIDTH + 20, SCREEN_HEIGHT / 2 + 10);
    
    // Add simple floor noise/grit for 90s feel
    this.ctx.fillStyle = 'rgba(0,0,0,0.2)';
    for (let i = 0; i < 400; i++) {
        const xNoise = Math.random() * SCREEN_WIDTH;
        const yNoise = (SCREEN_HEIGHT / 2) + Math.random() * (SCREEN_HEIGHT / 2);
        this.ctx.fillRect(xNoise, yNoise, 2, 2);
    }
    for (let x = 0; x < SCREEN_WIDTH; x++) {
      const cameraX = 2 * x / SCREEN_WIDTH - 1;
      const rayDirX = this.player.dir.x + this.player.plane.x * cameraX;
      const rayDirY = this.player.dir.y + this.player.plane.y * cameraX;
      let mapX = Math.floor(this.player.pos.x);
      let mapY = Math.floor(this.player.pos.y);
      const deltaDistX = Math.abs(1 / rayDirX);
      const deltaDistY = Math.abs(RAY_DIR_Y_PROTECT(rayDirY));
      function RAY_DIR_Y_PROTECT(y: number) { return Math.abs(1 / (y === 0 ? 0.000001 : y)); }
      let sideDistX, sideDistY, stepX, stepY;
      if (rayDirX < 0) { stepX = -1; sideDistX = (this.player.pos.x - mapX) * deltaDistX; }
      else { stepX = 1; sideDistX = (mapX + 1.0 - this.player.pos.x) * deltaDistX; }
      if (rayDirY < 0) { stepY = -1; sideDistY = (this.player.pos.y - mapY) * deltaDistY; }
      else { stepY = 1; sideDistY = (mapY + 1.0 - this.player.pos.y) * deltaDistY; }
      let hit = 0, side = 0;
      while (hit === 0) {
        if (sideDistX < sideDistY) { sideDistX += deltaDistX; mapX += stepX; side = 0; }
        else { sideDistY += deltaDistY; mapY += stepY; side = 1; }
        
        // Safety break
        if (mapX < 0 || mapX >= this.map.height || mapY < 0 || mapY >= this.map.width) {
            hit = 1;
            break;
        }
        
        if (this.map.grid[mapX][mapY] > 0) hit = 1;
      }
      let perpWallDist;
      if (side === 0) perpWallDist = (mapX - this.player.pos.x + (1 - stepX) / 2) / rayDirX;
      else perpWallDist = (mapY - this.player.pos.y + (1 - stepY) / 2) / rayDirY;
      this.zBuffer[x] = perpWallDist;
      const lineHeight = Math.floor(SCREEN_HEIGHT / perpWallDist);
      let drawStart = Math.max(0, -lineHeight / 2 + SCREEN_HEIGHT / 2);
      let drawEnd = Math.min(SCREEN_HEIGHT - 1, lineHeight / 2 + SCREEN_HEIGHT / 2);
      let color = side === 1 ? '#4a3d34' : '#5e4d41';
      // Clamp values to prevent crash if hit triggered by safety break
      const safeMapX = Math.max(0, Math.min(this.map.height - 1, mapX));
      const safeMapY = Math.max(0, Math.min(this.map.width - 1, mapY));
      const wallType = this.map.grid[safeMapX][safeMapY];
      if (wallType === 2) color = side === 1 ? '#007777' : '#00AAAA';
      else if (wallType === 3) color = side === 1 ? '#770077' : '#AA00AA';
      const brightness = Math.max(0.1, 1 - (perpWallDist / 20));
      this.ctx.globalAlpha = brightness;
      this.ctx.strokeStyle = color;
      this.ctx.beginPath(); this.ctx.moveTo(x, drawStart); this.ctx.lineTo(x, drawEnd); this.ctx.stroke();
      if (brightness > 0.4 && x % 4 === 0) {
          this.ctx.strokeStyle = 'rgba(0,0,0,0.15)';
          this.ctx.beginPath(); this.ctx.moveTo(x, drawStart); this.ctx.lineTo(x, drawEnd); this.ctx.stroke();
      }
      this.ctx.globalAlpha = 1.0;
    }
    this.renderSprites();
    this.renderItems();
    this.renderWeapon();
    this.ctx.restore();
    this.renderMinimap();
  }

  private renderMinimap() {
      const size = 120;
      const margin = 10;
      const scale = size / Math.max(this.map.width, this.map.height);
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      this.ctx.fillRect(SCREEN_WIDTH - size - margin, margin, size, size);
      this.ctx.strokeStyle = '#666';
      this.ctx.strokeRect(SCREEN_WIDTH - size - margin, margin, size, size);
      for (let x = 0; x < this.map.height; x++) {
          for (let y = 0; y < this.map.width; y++) {
              if (this.map.grid[x] && this.map.grid[x][y] > 0) {
                  this.ctx.fillStyle = '#444';
                  this.ctx.fillRect(SCREEN_WIDTH - size - margin + x * scale, margin + y * scale, scale, scale);
              }
          }
      }
      for (const item of this.items) {
          if (!item.collected) {
              this.ctx.fillStyle = item.type === 'health' ? '#0f0' : item.type === 'ammo' ? '#ff0' : '#00f';
              this.ctx.fillRect(SCREEN_WIDTH - size - margin + item.pos.x * scale - 1, margin + item.pos.y * scale - 1, 2, 2);
          }
      }
      for (const sprite of this.sprites) {
          if (sprite.alive) {
              this.ctx.fillStyle = sprite.isBoss ? '#f0f' : '#f00';
              this.ctx.fillRect(SCREEN_WIDTH - size - margin + sprite.pos.x * scale - 1, margin + sprite.pos.y * scale - 1, 2, 2);
          }
      }
      this.ctx.fillStyle = '#fff';
      this.ctx.fillRect(SCREEN_WIDTH - size - margin + this.player.pos.x * scale - 1.5, margin + this.player.pos.y * scale - 1.5, 3, 3);
  }

  private renderItems() {
      const itemsCopy = [...this.items].sort((a, b) => {
          const distA = ((this.player.pos.x - a.pos.x) ** 2 + (this.player.pos.y - a.pos.y) ** 2);
          const distB = ((this.player.pos.x - b.pos.x) ** 2 + (this.player.pos.y - b.pos.y) ** 2);
          return distB - distA;
      });
      for (const item of itemsCopy) {
          if (item.collected) continue;
          this.renderSpriteLike(item.pos.x, item.pos.y, item.type === 'health' ? '#0f0' : item.type === 'ammo' ? '#ff0' : '#00f', 0.3);
      }
  }

  private renderSpriteLike(x: number, y: number, color: string, scale: number) {
      const spriteX = x - this.player.pos.x;
      const spriteY = y - this.player.pos.y;
      const invDet = 1.0 / (this.player.plane.x * this.player.dir.y - this.player.dir.x * this.player.plane.y);
      const tx = invDet * (this.player.dir.y * spriteX - this.player.dir.x * spriteY);
      const ty = invDet * (-this.player.plane.y * spriteX + this.player.plane.x * spriteY); 
      if (ty <= 0) return;
      const sx = Math.floor((SCREEN_WIDTH / 2) * (1 + tx / ty));
      const h = Math.abs(Math.floor(SCREEN_HEIGHT / ty)) * scale;
      const w = Math.abs(Math.floor(SCREEN_HEIGHT / ty)) * scale;
      const dy = Math.floor(-h / 2 + SCREEN_HEIGHT / 2 + (SCREEN_HEIGHT / ty) * (1-scale) / 2);
      const ds = Math.floor(-w / 2 + sx);
      const de = Math.floor(w / 2 + sx);
      for (let stripe = ds; stripe < de; stripe++) {
          if (stripe >= 0 && stripe < SCREEN_WIDTH && ty < this.zBuffer[stripe]) {
              this.ctx.fillStyle = color;
              this.ctx.fillRect(stripe, dy, 1, h);
          }
      }
  }

  private renderSprites() {
    this.sprites.sort((a, b) => {
      const distA = ((this.player.pos.x - a.pos.x) ** 2 + (this.player.pos.y - a.pos.y) ** 2);
      const distB = ((this.player.pos.x - b.pos.x) ** 2 + (this.player.pos.y - b.pos.y) ** 2);
      return distB - distA;
    });
    const cur = Date.now();
    for (const s of this.sprites) {
      if (!s.alive) continue;
      const scale = s.isBoss ? 1.5 : 1.0;
      const dx = s.pos.x - this.player.pos.x, dy = s.pos.y - this.player.pos.y;
      const invDet = 1.0 / (this.player.plane.x * this.player.dir.y - this.player.dir.x * this.player.plane.y);
      const tx = invDet * (this.player.dir.y * dx - this.player.dir.x * dy);
      const ty = invDet * (-this.player.plane.y * dx + this.player.plane.x * dy); 
      if (ty <= 0) continue;
      const sx = Math.floor((SCREEN_WIDTH / 2) * (1 + tx / ty));
      const h = Math.abs(Math.floor(SCREEN_HEIGHT / ty)) * scale;
      const w = Math.abs(Math.floor(SCREEN_HEIGHT / ty)) * scale;
      const dY = Math.floor(-h / 2 + SCREEN_HEIGHT / 2);
      const dX = Math.floor(-w / 2 + sx);
      const dXe = Math.floor(w / 2 + sx);
      const attacking = s.lastFired && (cur - s.lastFired < 300);
      for (let stripe = dX; stripe < dXe; stripe++) {
        if (stripe >= 0 && stripe < SCREEN_WIDTH && ty < this.zBuffer[stripe]) {
          this.ctx.fillStyle = s.isBoss ? (attacking ? '#fff' : '#800') : (attacking ? '#f66' : '#9b111e');
          this.ctx.fillRect(stripe, dY, 1, h);
          const rx = (stripe - dX) / w;
          if ((rx > 0.3 && rx < 0.4) || (rx > 0.6 && rx < 0.7)) {
              this.ctx.fillStyle = '#fff';
              this.ctx.fillRect(stripe, dY + h * 0.2, 1, h * 0.1);
          }
        }
      }
    }
  }

  public spawnEnemies() {
      this.sprites = [
          { pos: { x: 10.5, y: 10.5 }, health: 150, alive: true, texture: 'enemy', isEnemy: true },
          { pos: { x: 14.5, y: 10.5 }, health: 150, alive: true, texture: 'enemy', isEnemy: true },
          { pos: { x: 12.5, y: 18.5 }, health: 150, alive: true, texture: 'enemy', isEnemy: true },
          { pos: { x: 18.5, y: 12.5 }, health: 150, alive: true, texture: 'enemy', isEnemy: true },
      ];
      this.bossSpawned = false;
  }

  private renderWeapon() {
      const cx = SCREEN_WIDTH / 2, cy = SCREEN_HEIGHT;
      const rec = this.player.isShooting ? Math.random() * 20 : 0;
      this.ctx.save();
      if (this.player.selectedWeapon === 1) {
          this.ctx.fillStyle = '#e8b284'; this.ctx.fillRect(cx - 60, cy - 80 - rec, 40, 100);
          this.ctx.strokeStyle = '#000'; this.ctx.strokeRect(cx - 60, cy - 80 - rec, 40, 100);
      } else if (this.player.selectedWeapon === 2) {
          this.ctx.fillStyle = '#222'; this.ctx.fillRect(cx - 15, cy - 100 - rec, 30, 100);
          this.ctx.strokeStyle = '#000'; this.ctx.strokeRect(cx - 15, cy - 100 - rec, 30, 100);
      } else if (this.player.selectedWeapon === 3) {
          this.ctx.fillStyle = '#1a1a1a';
          this.ctx.fillRect(cx - 35, cy - 120 - rec, 30, 120); this.ctx.fillRect(cx + 5, cy - 120 - rec, 30, 120);
          this.ctx.strokeStyle = '#000';
          this.ctx.strokeRect(cx - 35, cy - 120 - rec, 30, 120); this.ctx.strokeRect(cx + 5, cy - 120 - rec, 30, 120);
      } else {
          this.ctx.fillStyle = '#0a0a0a'; this.ctx.fillRect(cx - 40, cy - 140 - rec, 80, 140);
          this.ctx.strokeStyle = '#00f'; this.ctx.lineWidth = 2; this.ctx.strokeRect(cx - 40, cy - 140 - rec, 80, 140);
      }
      if (this.player.isShooting) {
          const fs = this.player.selectedWeapon === 3 ? 60 : 30;
          const g = this.ctx.createRadialGradient(cx, cy - 110 - rec, 0, cx, cy - 110 - rec, fs);
          g.addColorStop(0, '#fff'); g.addColorStop(0.3, '#ff0'); g.addColorStop(1, 'transparent');
          this.ctx.fillStyle = g; this.ctx.beginPath(); this.ctx.arc(cx, cy - 110 - rec, fs, 0, Math.PI * 2); this.ctx.fill();
      }
      this.ctx.restore();
  }

  public getPlayerState() { return this.player; }
  public getSprites() { return this.sprites; }
}
