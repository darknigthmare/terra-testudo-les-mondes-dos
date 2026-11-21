import { BUILDINGS, MAX_GRID, TERRAIN, TIERS } from './data.js';
import { enemyIconPath } from './icons.js';
import { activeBounds, clamp, getTile, isTileActive, lerp, validateBuild } from './state.js';

const TERRAIN_COLORS = {
  grass: { top: '#4c8a65', side: '#275541', accent: '#78b47f' },
  fertile: { top: '#7c8453', side: '#4c4c30', accent: '#b7ae67' },
  forest: { top: '#356f55', side: '#1d493a', accent: '#6aa56d' },
  rock: { top: '#687a78', side: '#3b4a4a', accent: '#a9b2aa' },
  spring: { top: '#3c8790', side: '#23565d', accent: '#8bd1c9' },
  ridge: { top: '#596867', side: '#313e3f', accent: '#8f9994' },
};

const CATEGORY_COLORS = {
  habitat: '#d9b779', production: '#7fac6f', support: '#65a6a1', commerce: '#cfaa55',
  defense: '#a8796b', military: '#ad735f', industry: '#8d8e9d', science: '#7f92ba',
  spirit: '#9a82c0', monument: '#d4c279',
};

// Sprite height in local building space, used to keep damage bars above each roof.
const BUILDING_TOP = {
  home: -30, farm: -27, lumberCamp: -24, quarry: -25, well: -25,
  watchtower: -38, market: -33, harbor: -30, palisade: -23, healer: -30,
  workshop: -29, ballista: -27, skyDock: -45, reservoir: -25, academy: -30,
  temple: -40, aerie: -29, stoneWall: -23, greatMarket: -33, worldRoot: -44,
  citadel: -50, stormCannon: -35, grandSanctuary: -49, worldGate: -33,
};

const MIN_ZOOM = 0.68;
const MAX_ZOOM = 1.55;

function roundedRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function mixColor(a, b, t) {
  const parse = (hex) => {
    const value = hex.replace('#', '');
    return [parseInt(value.slice(0, 2), 16), parseInt(value.slice(2, 4), 16), parseInt(value.slice(4, 6), 16)];
  };
  const [ar, ag, ab] = parse(a);
  const [br, bg, bb] = parse(b);
  const r = Math.round(lerp(ar, br, t));
  const g = Math.round(lerp(ag, bg, t));
  const bl = Math.round(lerp(ab, bb, t));
  return `rgb(${r}, ${g}, ${bl})`;
}

function drawShadow(ctx, x, y, rx, ry, alpha = 0.24) {
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, rx);
  gradient.addColorStop(0, `rgba(5, 18, 24, ${alpha})`);
  gradient.addColorStop(1, 'rgba(5, 18, 24, 0)');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

export class TurtleRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.width = 0;
    this.height = 0;
    this.dpr = 1;
    this.mode = 'shell';
    this.hoverTile = null;
    this.selectedTile = null;
    this.hoverNodeId = null;
    this.selectedNodeId = null;
    this.tileCenters = new Map();
    this.nodePositions = new Map();
    this.enemyPositions = new Map();
    this.layout = null;
    this.time = 0;
    this.camera = { zoom: 1, panX: 0, panY: 0 };
    this.pointer = { x: -999, y: -999 };
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas.parentElement);
    this.resize();
  }

  resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.width = Math.max(320, rect.width);
    this.height = Math.max(320, rect.height);
    this.canvas.width = Math.floor(this.width * this.dpr);
    this.canvas.height = Math.floor(this.height * this.dpr);
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  setMode(mode) {
    this.mode = mode;
    this.hoverTile = null;
    this.hoverNodeId = null;
  }

  setPointer(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.x = clientX - rect.left;
    this.pointer.y = clientY - rect.top;
  }

  setZoom(delta) {
    this.camera.zoom = clamp(this.camera.zoom * (delta > 0 ? 0.92 : 1.08), MIN_ZOOM, MAX_ZOOM);
  }

  applyPinch({ scale, startZoom, startOriginX, startOriginY, startMidX, startMidY, midX, midY }) {
    if (!this.layout) return;
    const newZoom = clamp(startZoom * scale, MIN_ZOOM, MAX_ZOOM);
    const applied = newZoom / startZoom;
    const originX = midX - (startMidX - startOriginX) * applied;
    const originY = midY - (startMidY - startOriginY) * applied;
    const baseY = this.height * 0.42 - (this.layout.size - 1) * this.layout.tileH / 2;
    this.camera.zoom = newZoom;
    this.camera.panX = clamp(originX - this.width * 0.5, -this.width * 0.45, this.width * 0.45);
    this.camera.panY = clamp(originY - baseY, -this.height * 0.35, this.height * 0.35);
  }

  recenter() {
    this.camera.panX = 0;
    this.camera.panY = 0;
  }

  resetCamera() {
    this.camera = { zoom: 1, panX: 0, panY: 0 };
  }

  hitTestTile(state, clientX, clientY) {
    this.setPointer(clientX, clientY);
    if (this.mode !== 'shell' || !this.layout) return null;
    const { originX, originY, tileW, tileH, start, size, zoom, bob } = this.layout;
    const worldX = (this.pointer.x - originX) / zoom;
    const worldY = (this.pointer.y - originY - (bob || 0)) / zoom;
    const localX = (worldY / (tileH / 2) + worldX / (tileW / 2)) / 2;
    const localY = (worldY / (tileH / 2) - worldX / (tileW / 2)) / 2;
    const rx = Math.round(localX);
    const ry = Math.round(localY);
    const x = start + rx;
    const y = start + ry;
    if (rx < 0 || ry < 0 || rx >= size || ry >= size || !isTileActive(state, x, y)) return null;
    const center = this.tileCenters.get(`${x},${y}`);
    if (!center) return null;
    const dx = Math.abs(this.pointer.x - center.x) / (tileW * zoom / 2);
    const dy = Math.abs(this.pointer.y - center.y) / (tileH * zoom / 2);
    return dx + dy <= 1.08 ? { x, y } : null;
  }

  hitTestWorldNode(clientX, clientY) {
    this.setPointer(clientX, clientY);
    if (this.mode !== 'world') return null;
    let closest = null;
    let distance = Infinity;
    for (const [id, position] of this.nodePositions.entries()) {
      const d = Math.hypot(this.pointer.x - position.x, this.pointer.y - position.y);
      if (d < position.radius + 10 && d < distance) {
        distance = d;
        closest = id;
      }
    }
    return closest;
  }

  updateHover(state, clientX, clientY) {
    if (this.mode === 'shell') {
      this.hoverTile = this.hitTestTile(state, clientX, clientY);
      return this.hoverTile;
    }
    this.hoverNodeId = this.hitTestWorldNode(clientX, clientY);
    return this.hoverNodeId;
  }

  render(state, ui, delta = 0.016) {
    this.time += delta;
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.width, this.height);
    this.drawOcean(state);
    if (this.mode === 'world') this.drawWorldMap(state, ui);
    else this.drawShellWorld(state, ui);
    this.drawVignette();
  }

  drawOcean(state) {
    const ctx = this.ctx;
    const daylight = (Math.sin(state.dayProgress * Math.PI * 2 - Math.PI / 2) + 1) / 2;
    const top = mixColor('#071c31', '#4c8e9d', daylight);
    const bottom = mixColor('#092231', '#164b5a', daylight);
    const gradient = ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, top);
    gradient.addColorStop(1, bottom);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);

    if (daylight < 0.42) {
      const alpha = clamp((0.42 - daylight) * 1.8, 0, 0.65);
      ctx.fillStyle = `rgba(236, 244, 226, ${alpha})`;
      for (let i = 0; i < 58; i += 1) {
        const x = ((i * 131 + 47) % 997) / 997 * this.width;
        const y = ((i * 73 + 19) % 443) / 443 * this.height * 0.62;
        const twinkle = 0.4 + Math.sin(this.time * 1.7 + i) * 0.25;
        ctx.globalAlpha = alpha * twinkle;
        ctx.fillRect(x, y, i % 9 === 0 ? 2 : 1, i % 9 === 0 ? 2 : 1);
      }
      ctx.globalAlpha = 1;
    }

    const sunAngle = state.dayProgress * Math.PI * 2 + Math.PI;
    const sunX = this.width * (0.5 + Math.cos(sunAngle) * 0.42);
    const sunY = this.height * (0.54 - Math.sin(sunAngle) * 0.38);
    if (sunY < this.height * 0.62) {
      const sunRadius = 15 + daylight * 10;
      const glow = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunRadius * 4);
      glow.addColorStop(0, daylight > 0.4 ? 'rgba(255,235,166,.95)' : 'rgba(210,226,240,.8)');
      glow.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(sunX, sunY, sunRadius * 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = daylight > 0.4 ? '#f5dda2' : '#c9d8df';
      ctx.beginPath();
      ctx.arc(sunX, sunY, sunRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    const waveAlpha = 0.07 + daylight * 0.09;
    ctx.lineWidth = 1;
    for (let row = 0; row < 16; row += 1) {
      const y = this.height * 0.14 + row * 38 + Math.sin(this.time * 0.5 + row) * 5;
      ctx.strokeStyle = `rgba(214, 244, 233, ${waveAlpha * (0.65 + row / 30)})`;
      ctx.beginPath();
      for (let x = -30; x <= this.width + 30; x += 18) {
        const yy = y + Math.sin(x * 0.025 + this.time * 0.7 + row * 0.6) * 3.5;
        if (x === -30) ctx.moveTo(x, yy);
        else ctx.lineTo(x, yy);
      }
      ctx.stroke();
    }

    this.drawClouds(state, daylight);
  }

  drawClouds(state, daylight) {
    const ctx = this.ctx;
    const count = this.width < 700 ? 4 : 7;
    for (let i = 0; i < count; i += 1) {
      const span = this.width + 280;
      const x = ((this.time * (5 + i * 0.4) + i * 211) % span) - 140;
      const y = 40 + ((i * 97) % Math.max(120, this.height * 0.52));
      const scale = 0.55 + (i % 4) * 0.16;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(scale, scale);
      ctx.globalAlpha = 0.10 + daylight * 0.10;
      ctx.fillStyle = '#e8f4eb';
      ctx.beginPath();
      ctx.ellipse(-32, 0, 42, 18, 0, 0, Math.PI * 2);
      ctx.ellipse(8, -8, 48, 25, 0, 0, Math.PI * 2);
      ctx.ellipse(49, 2, 36, 16, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  shellLayout(state) {
    const bounds = activeBounds(state);
    // Keep the whole silhouette, head and flippers included, inside the canvas at every age.
    const size = Math.max(6, bounds.size);
    const widthCap = (this.width * 0.72) / size;
    // The shell is 1.26 times the grid height and the grid is 2:1, so short viewports also cap the tile.
    const heightCap = (this.height * 0.60) / (size * 0.63);
    const maxW = clamp(Math.min(78, widthCap, heightCap), 12, 78);
    const maxH = maxW * 0.50;
    const zoom = this.camera.zoom;
    const gridHeight = (size - 1) * maxH + maxH;
    // The idle bob lives in the layout so hovering and tapping stay aligned with the drawn tiles.
    const bob = Math.sin(this.time * 0.82) * 4;
    const originX = this.width * 0.50 + this.camera.panX;
    const originY = this.height * 0.42 - (size - 1) * maxH / 2 + this.camera.panY;
    this.layout = { start: bounds.start, end: bounds.end, size: bounds.size, tileW: maxW, tileH: maxH, originX, originY, gridHeight, zoom, bob };
    return this.layout;
  }

  tilePosition(x, y) {
    if (!this.layout) return { x: 0, y: 0 };
    const { start, tileW, tileH, originX, originY, zoom, bob } = this.layout;
    const rx = x - start;
    const ry = y - start;
    return {
      x: originX + (rx - ry) * tileW / 2 * zoom,
      y: originY + (bob || 0) + (rx + ry) * tileH / 2 * zoom,
    };
  }

  drawShellWorld(state, ui) {
    const ctx = this.ctx;
    const layout = this.shellLayout(state);
    const { size, tileW, tileH, zoom } = layout;
    this.tileCenters.clear();
    this.enemyPositions.clear();

    const gridWidth = size * tileW * zoom;
    const gridHeight = size * tileH * zoom;
    // One shared centre for the shell, the grid and the raid ring.
    const centerX = layout.originX;
    const centerY = layout.originY + layout.bob + (size - 1) * tileH * zoom / 2;
    const shellW = gridWidth * 0.94;
    const shellH = gridHeight * 1.26;

    drawShadow(ctx, centerX - shellW * 0.04, centerY + shellH * 0.43 + 26, shellW * 0.68, shellH * 0.25, 0.30);
    this.drawTurtleBody(state, centerX, centerY, shellW, shellH);

    const tiles = [];
    for (let y = layout.start; y <= layout.end; y += 1) {
      for (let x = layout.start; x <= layout.end; x += 1) {
        const position = this.tilePosition(x, y);
        this.tileCenters.set(`${x},${y}`, position);
        tiles.push({ tile: getTile(state, x, y), position, order: x + y });
      }
    }
    tiles.sort((a, b) => a.order - b.order || a.tile.x - b.tile.x);

    for (const item of tiles) this.drawTile(state, item.tile, item.position.x, item.position.y, tileW * zoom, tileH * zoom, ui);
    // Buildings and standing props share one depth order: a tree in front of a house hides its base.
    for (const item of tiles) {
      if (item.tile.building) this.drawBuilding(item.tile, item.position.x, item.position.y, tileW * zoom, tileH * zoom);
      else this.drawTileProps(item.tile, item.position.x, item.position.y, tileW * zoom, tileH * zoom);
    }

    // The name plate is scenery for the shell: raiders arriving from the bottom pass in front of it.
    this.drawShellLabels(state, centerX, centerY, shellW, shellH);
    if (state.combat) this.drawCombat(state, centerX, centerY, shellW, shellH);
  }

  drawTurtleBody(state, cx, cy, shellW, shellH) {
    const ctx = this.ctx;
    const tier = state.tier;
    const breath = 1 + Math.sin(this.time * 0.72) * 0.01;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(breath, breath);

    const skinDark = mixColor('#315d54', '#25443f', tier / 4);
    const skin = mixColor('#4b8068', '#557d6b', tier / 4);
    const shellDark = mixColor('#254b3d', '#3f4932', tier / 4);
    const shell = mixColor('#49745a', '#686546', tier / 4);

    ctx.fillStyle = skinDark;
    ctx.beginPath();
    ctx.ellipse(-shellW * 0.43, shellH * 0.06, shellW * 0.23, shellH * 0.15, -0.35, 0, Math.PI * 2);
    ctx.ellipse(shellW * 0.26, shellH * 0.31, shellW * 0.24, shellH * 0.12, 0.35, 0, Math.PI * 2);
    ctx.ellipse(-shellW * 0.25, shellH * 0.34, shellW * 0.24, shellH * 0.11, -0.30, 0, Math.PI * 2);
    ctx.ellipse(shellW * 0.30, -shellH * 0.31, shellW * 0.21, shellH * 0.10, -0.30, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.ellipse(shellW * 0.55, shellH * 0.02, shellW * 0.19, shellH * 0.14, 0.05, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = skinDark;
    ctx.beginPath();
    ctx.moveTo(-shellW * 0.55, 0);
    ctx.lineTo(-shellW * 0.69, shellH * 0.04);
    ctx.lineTo(-shellW * 0.55, shellH * 0.11);
    ctx.closePath();
    ctx.fill();

    const shellGradient = ctx.createRadialGradient(-shellW * 0.12, -shellH * 0.18, shellW * 0.05, 0, 0, shellW * 0.58);
    shellGradient.addColorStop(0, mixColor('#6e9b70', '#91865c', tier / 4));
    shellGradient.addColorStop(0.72, shell);
    shellGradient.addColorStop(1, shellDark);
    ctx.fillStyle = shellGradient;
    ctx.beginPath();
    ctx.ellipse(0, 0, shellW * 0.53, shellH * 0.48, -0.02, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(22, 47, 39, .48)';
    ctx.lineWidth = Math.max(1, shellW * 0.006);
    for (let ring = 0; ring < 3 + tier; ring += 1) {
      ctx.beginPath();
      ctx.ellipse(0, 0, shellW * (0.15 + ring * 0.085), shellH * (0.13 + ring * 0.075), 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    for (let spoke = 0; spoke < 12; spoke += 1) {
      const angle = (Math.PI * 2 * spoke) / 12;
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * shellW * 0.08, Math.sin(angle) * shellH * 0.07);
      ctx.lineTo(Math.cos(angle) * shellW * 0.49, Math.sin(angle) * shellH * 0.43);
      ctx.stroke();
    }

    ctx.fillStyle = '#d7e2bd';
    ctx.beginPath();
    ctx.arc(shellW * 0.64, -shellH * 0.035, Math.max(2.2, shellW * 0.009), 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#182a28';
    ctx.beginPath();
    ctx.arc(shellW * 0.642, -shellH * 0.035, Math.max(1.1, shellW * 0.004), 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  drawTile(state, tile, x, y, tileW, tileH, ui) {
    const ctx = this.ctx;
    const colors = TERRAIN_COLORS[tile.terrain] || TERRAIN_COLORS.grass;
    const depth = Math.max(4, tileH * 0.18);
    const selected = ui.selectedTile?.x === tile.x && ui.selectedTile?.y === tile.y;
    const hovered = this.hoverTile?.x === tile.x && this.hoverTile?.y === tile.y;
    const placement = ui.selectedBuildId && hovered;

    ctx.fillStyle = colors.side;
    ctx.beginPath();
    ctx.moveTo(x - tileW / 2, y);
    ctx.lineTo(x, y + tileH / 2);
    ctx.lineTo(x, y + tileH / 2 + depth);
    ctx.lineTo(x - tileW / 2, y + depth);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + tileW / 2, y);
    ctx.lineTo(x, y + tileH / 2);
    ctx.lineTo(x, y + tileH / 2 + depth);
    ctx.lineTo(x + tileW / 2, y + depth);
    ctx.closePath();
    ctx.fillStyle = mixColor(colors.side, '#101d1d', 0.18);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(x, y - tileH / 2);
    ctx.lineTo(x + tileW / 2, y);
    ctx.lineTo(x, y + tileH / 2);
    ctx.lineTo(x - tileW / 2, y);
    ctx.closePath();
    ctx.fillStyle = colors.top;
    ctx.fill();

    ctx.globalAlpha = 0.20;
    ctx.fillStyle = colors.accent;
    const textureSeed = (tile.x * 31 + tile.y * 17) % 7;
    for (let i = 0; i < 3; i += 1) {
      const tx = x + ((textureSeed + i * 2) % 7 - 3) * tileW * 0.055;
      const ty = y + ((textureSeed * 2 + i * 3) % 5 - 2) * tileH * 0.08;
      ctx.beginPath();
      ctx.arc(tx, ty, Math.max(0.7, tileW * 0.012), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    this.drawTerrainSurface(tile, x, y, tileW, tileH);

    if (selected || hovered) {
      let stroke = selected ? '#f1d589' : 'rgba(233,246,224,.72)';
      if (placement) {
        // The preview follows the real placement rules, not just the terrain filter.
        stroke = validateBuild(state, ui.selectedBuildId, tile.x, tile.y).ok ? '#bce791' : '#e4877f';
      }
      ctx.strokeStyle = stroke;
      ctx.lineWidth = selected ? 2.5 : 1.8;
      ctx.beginPath();
      ctx.moveTo(x, y - tileH / 2);
      ctx.lineTo(x + tileW / 2, y);
      ctx.lineTo(x, y + tileH / 2);
      ctx.lineTo(x - tileW / 2, y);
      ctx.closePath();
      ctx.stroke();
    } else {
      ctx.strokeStyle = 'rgba(18, 39, 34, .22)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(x, y - tileH / 2);
      ctx.lineTo(x + tileW / 2, y);
      ctx.lineTo(x, y + tileH / 2);
      ctx.lineTo(x - tileW / 2, y);
      ctx.closePath();
      ctx.stroke();
    }
  }

  drawTerrainSurface(tile, x, y, tileW, tileH) {
    const ctx = this.ctx;
    const seed = (tile.x * 13 + tile.y * 29) % 5;
    if (tile.terrain === 'fertile') {
      // Furrows read as worked soil even before a farm is built.
      ctx.save();
      ctx.lineCap = 'round';
      for (let row = -1; row <= 1; row += 1) {
        const offset = row * tileW * 0.13 + (seed - 2) * tileW * 0.012;
        ctx.strokeStyle = `rgba(198, 188, 122, ${0.30 - Math.abs(row) * 0.06})`;
        ctx.lineWidth = Math.max(0.9, tileW * 0.016);
        ctx.beginPath();
        ctx.moveTo(x - tileW * 0.24 + offset, y + tileH * 0.12);
        ctx.lineTo(x - tileW * 0.02 + offset, y - tileH * 0.06);
        ctx.stroke();
      }
      ctx.restore();
    } else if (tile.terrain === 'spring') {
      ctx.fillStyle = 'rgba(14, 55, 60, .55)';
      ctx.beginPath();
      ctx.ellipse(x, y, tileW * 0.23, tileH * 0.24, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(112, 208, 201, .78)';
      ctx.beginPath();
      ctx.ellipse(x, y, tileW * 0.17, tileH * 0.18, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(200, 246, 234, .45)';
      ctx.lineWidth = Math.max(0.8, tileW * 0.012);
      ctx.beginPath();
      ctx.ellipse(x, y, tileW * 0.18, tileH * 0.19, 0, Math.PI * 0.85, Math.PI * 1.85);
      ctx.stroke();
    } else if (tile.terrain === 'grass' && !tile.building) {
      ctx.strokeStyle = 'rgba(108, 168, 120, .38)';
      ctx.lineWidth = Math.max(0.8, tileW * 0.012);
      for (let blade = 0; blade < 2; blade += 1) {
        const bx = x + ((seed + blade * 3) % 5 - 2) * tileW * 0.07;
        const by = y + ((seed + blade) % 3 - 1) * tileH * 0.09;
        ctx.beginPath();
        ctx.moveTo(bx, by + tileH * 0.05);
        ctx.lineTo(bx + tileW * 0.02, by - tileH * 0.04);
        ctx.stroke();
      }
    }
  }

  drawTileProps(tile, x, y, tileW, tileH) {
    if (tile.building) return;
    const seed = (tile.x * 37 + tile.y * 53) % 5;
    if (tile.terrain === 'forest') {
      const trees = [
        { dx: -0.15, dy: -0.03, size: 0.20 },
        { dx: 0.04, dy: 0.03, size: 0.15 },
        { dx: 0.15, dy: -0.06, size: 0.12 },
      ];
      for (let index = 0; index < trees.length; index += 1) {
        const tree = trees[index];
        const jitter = ((seed + index * 2) % 3 - 1) * 0.014;
        const tx = x + (tree.dx + jitter) * tileW;
        const ty = y + (tree.dy + jitter) * tileH;
        const size = tileW * tree.size;
        this.drawPropShadow(tx, ty + size * 0.40, size * 0.36, size * 0.15);
        this.drawMiniTree(tx, ty, size);
      }
    } else if (tile.terrain === 'rock') {
      const size = tileW * 0.19;
      this.drawPropShadow(x + tileW * 0.03, y + tileH * 0.17, size * 0.45, size * 0.18);
      this.drawRock(x + tileW * 0.02, y, size);
    } else if (tile.terrain === 'ridge') {
      const size = tileW * 0.20;
      this.drawPropShadow(x - tileW * 0.03, y + tileH * 0.20, size * 0.62, size * 0.20);
      this.drawRock(x - tileW * 0.09, y, size);
      this.drawRock(x + tileW * 0.10, y + tileH * 0.03, size * 0.7);
    }
  }

  drawPropShadow(x, y, rx, ry) {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(8, 24, 22, .28)';
    ctx.beginPath();
    ctx.ellipse(x, y, Math.max(1, rx), Math.max(0.8, ry), 0, 0, Math.PI * 2);
    ctx.fill();
  }

  drawMiniTree(x, y, size) {
    const ctx = this.ctx;
    ctx.fillStyle = '#5c4b35';
    ctx.fillRect(x - size * 0.08, y, size * 0.16, size * 0.45);
    ctx.fillStyle = '#244d3a';
    ctx.beginPath();
    ctx.moveTo(x, y - size * 0.75);
    ctx.lineTo(x + size * 0.48, y + size * 0.12);
    ctx.lineTo(x - size * 0.48, y + size * 0.12);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#4c7b52';
    ctx.beginPath();
    ctx.moveTo(x, y - size * 0.55);
    ctx.lineTo(x + size * 0.38, y + size * 0.02);
    ctx.lineTo(x - size * 0.38, y + size * 0.02);
    ctx.closePath();
    ctx.fill();
  }

  drawRock(x, y, size) {
    const ctx = this.ctx;
    ctx.fillStyle = '#87918d';
    ctx.beginPath();
    ctx.moveTo(x - size * 0.55, y + size * 0.18);
    ctx.lineTo(x - size * 0.18, y - size * 0.45);
    ctx.lineTo(x + size * 0.38, y - size * 0.22);
    ctx.lineTo(x + size * 0.55, y + size * 0.30);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(215,225,214,.32)';
    ctx.beginPath();
    ctx.moveTo(x - size * 0.17, y - size * 0.41);
    ctx.lineTo(x + size * 0.34, y - size * 0.18);
    ctx.lineTo(x + size * 0.10, y);
    ctx.closePath();
    ctx.fill();
  }

  drawBuilding(tile, x, y, tileW, tileH) {
    const ctx = this.ctx;
    const data = BUILDINGS[tile.building.id];
    if (!data) return;
    const scale = clamp(tileW / 64, 0.28, 1.22);
    const hp = clamp(tile.building.hp / 100, 0, 1);
    const baseY = y - tileH * 0.08;
    const color = CATEGORY_COLORS[data.category] || '#b8a982';

    ctx.save();
    ctx.translate(x, baseY);
    ctx.scale(scale, scale);
    ctx.globalAlpha = 0.58 + hp * 0.42;
    drawShadow(ctx, 0, 12, 23, 8, 0.18);

    const id = tile.building.id;
    if (id === 'home') this.drawHouse(color);
    else if (id === 'farm') this.drawFarm(color);
    else if (id === 'lumberCamp') this.drawLumber(color);
    else if (id === 'quarry') this.drawQuarry(color);
    else if (id === 'well') this.drawWell(color);
    else if (id === 'watchtower') this.drawTower(color, false);
    else if (id === 'market') this.drawMarket(color, false);
    else if (id === 'harbor') this.drawHarbor(color);
    else if (id === 'palisade') this.drawWall(color, false);
    else if (id === 'healer') this.drawHealer(color);
    else if (id === 'workshop') this.drawWorkshop(color);
    else if (id === 'ballista') this.drawBallista(color, false);
    else if (id === 'skyDock') this.drawSkyDock(color);
    else if (id === 'reservoir') this.drawReservoir(color);
    else if (id === 'academy') this.drawAcademy(color);
    else if (id === 'temple') this.drawTemple(color, false);
    else if (id === 'aerie') this.drawAerie(color);
    else if (id === 'stoneWall') this.drawWall(color, true);
    else if (id === 'greatMarket') this.drawMarket(color, true);
    else if (id === 'worldRoot') this.drawWorldRoot(color);
    else if (id === 'citadel') this.drawCitadel(color);
    else if (id === 'stormCannon') this.drawBallista(color, true);
    else if (id === 'grandSanctuary') this.drawTemple(color, true);
    else if (id === 'worldGate') this.drawWorldGate(color);

    if (hp < 0.99) {
      const barTop = BUILDING_TOP[id] ?? -32;
      ctx.globalAlpha = 1;
      ctx.fillStyle = 'rgba(10,18,20,.78)';
      roundedRect(ctx, -19, barTop, 38, 5, 2.5);
      ctx.fill();
      ctx.fillStyle = hp > 0.5 ? '#a6ce78' : '#d47f6d';
      roundedRect(ctx, -18, barTop + 1, 36 * hp, 3, 1.5);
      ctx.fill();
    }
    ctx.restore();
  }

  drawHouse(color) {
    const ctx = this.ctx;
    ctx.fillStyle = '#d5c69c';
    ctx.fillRect(-14, -10, 28, 22);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(-18, -9);
    ctx.lineTo(0, -25);
    ctx.lineTo(18, -9);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#4f3827';
    ctx.fillRect(-4, 1, 8, 11);
    ctx.fillStyle = '#8eb6ad';
    ctx.fillRect(7, -4, 5, 6);
    ctx.fillStyle = '#6a5036';
    ctx.fillRect(9, -25, 4, 10);
  }

  drawFarm(color) {
    const ctx = this.ctx;
    ctx.fillStyle = '#4c5b31';
    ctx.beginPath();
    ctx.ellipse(0, 5, 25, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    for (let i = -16; i <= 16; i += 8) {
      ctx.beginPath();
      ctx.moveTo(i, -2);
      ctx.lineTo(i + 5, 11);
      ctx.stroke();
    }
    ctx.fillStyle = '#d0b97c';
    ctx.fillRect(-8, -13, 16, 14);
    ctx.fillStyle = '#805a3f';
    ctx.beginPath();
    ctx.moveTo(-11, -12);
    ctx.lineTo(0, -22);
    ctx.lineTo(11, -12);
    ctx.closePath();
    ctx.fill();
  }

  drawLumber(color) {
    this.drawMiniTree(-8, -4, 20);
    this.drawMiniTree(7, -1, 17);
    const ctx = this.ctx;
    ctx.fillStyle = color;
    ctx.fillRect(-18, 7, 36, 7);
    ctx.strokeStyle = '#3e3228';
    ctx.lineWidth = 2;
    ctx.strokeRect(-18, 7, 36, 7);
  }

  drawQuarry(color) {
    const ctx = this.ctx;
    this.drawRock(-8, 3, 20);
    this.drawRock(8, 5, 16);
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, -20);
    ctx.lineTo(0, 10);
    ctx.moveTo(-8, -14);
    ctx.lineTo(8, -14);
    ctx.stroke();
  }

  drawWell(color) {
    const ctx = this.ctx;
    ctx.fillStyle = '#6f7772';
    ctx.beginPath();
    ctx.ellipse(0, 4, 16, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2c6f7a';
    ctx.beginPath();
    ctx.ellipse(0, 2, 11, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-13, 0);
    ctx.lineTo(-13, -20);
    ctx.lineTo(13, -20);
    ctx.lineTo(13, 0);
    ctx.stroke();
  }

  drawTower(color, heavy) {
    const ctx = this.ctx;
    ctx.fillStyle = '#8f8d7f';
    ctx.fillRect(-11, -20, 22, 32);
    ctx.fillStyle = color;
    ctx.fillRect(-15, -27, 30, 9);
    for (let i = -13; i <= 9; i += 11) ctx.fillRect(i, -33, 7, 7);
    ctx.fillStyle = '#243334';
    ctx.fillRect(-4, -8, 8, 20);
    if (heavy) {
      ctx.strokeStyle = '#d7c87f';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, -28);
      ctx.lineTo(20, -38);
      ctx.stroke();
    }
  }

  drawMarket(color, large) {
    const ctx = this.ctx;
    const w = large ? 25 : 19;
    ctx.fillStyle = '#d4c392';
    ctx.fillRect(-w, -5, w * 2, 17);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(-w - 4, -4);
    ctx.lineTo(0, large ? -28 : -22);
    ctx.lineTo(w + 4, -4);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#eee2b7';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-w * 0.45, -6);
    ctx.lineTo(0, large ? -28 : -22);
    ctx.lineTo(w * 0.45, -6);
    ctx.stroke();
  }

  drawHarbor(color) {
    const ctx = this.ctx;
    ctx.fillStyle = '#6c5138';
    ctx.fillRect(-23, 4, 46, 8);
    ctx.fillRect(-18, -2, 4, 16);
    ctx.fillRect(14, -2, 4, 16);
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-5, 5);
    ctx.lineTo(-5, -25);
    ctx.lineTo(16, -9);
    ctx.lineTo(-5, -9);
    ctx.stroke();
    ctx.fillStyle = '#d4c991';
    ctx.beginPath();
    ctx.moveTo(-4, -23);
    ctx.lineTo(13, -10);
    ctx.lineTo(-4, -10);
    ctx.closePath();
    ctx.fill();
  }

  drawWall(color, stone) {
    const ctx = this.ctx;
    ctx.fillStyle = stone ? '#777d79' : '#6a5035';
    ctx.fillRect(-27, -5, 54, 14);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    for (let i = -24; i <= 24; i += stone ? 12 : 8) {
      ctx.beginPath();
      ctx.moveTo(i, -12);
      ctx.lineTo(i, 10);
      ctx.stroke();
    }
    if (stone) {
      ctx.fillStyle = '#8e958e';
      for (let i = -26; i < 26; i += 13) ctx.fillRect(i, -12, 11, 7);
    }
  }

  drawHealer(color) {
    this.drawHouse(color);
    const ctx = this.ctx;
    ctx.fillStyle = '#d8eee0';
    ctx.fillRect(-3, -14, 6, 18);
    ctx.fillRect(-9, -8, 18, 6);
  }

  drawWorkshop(color) {
    const ctx = this.ctx;
    ctx.fillStyle = '#777a76';
    ctx.fillRect(-19, -12, 38, 24);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(-23, -11);
    ctx.lineTo(-8, -24);
    ctx.lineTo(4, -11);
    ctx.lineTo(15, -22);
    ctx.lineTo(23, -11);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#343b3b';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(0, 4, 6, 0, Math.PI * 2);
    ctx.stroke();
    for (let tooth = 0; tooth < 6; tooth += 1) {
      const angle = (tooth * Math.PI) / 3;
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * 8.4, Math.sin(angle) * 8.4 + 4);
      ctx.lineTo(Math.cos(angle) * 11, Math.sin(angle) * 11 + 4);
      ctx.stroke();
    }
  }

  drawBallista(color, storm) {
    const ctx = this.ctx;
    ctx.fillStyle = '#5d4e3a';
    ctx.fillRect(-18, 7, 36, 6);
    ctx.strokeStyle = color;
    ctx.lineWidth = storm ? 6 : 4;
    ctx.beginPath();
    ctx.moveTo(-16, -2);
    ctx.quadraticCurveTo(0, -22, 16, -2);
    ctx.stroke();
    ctx.strokeStyle = storm ? '#c6e7dc' : '#d8c99a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-1, 10);
    ctx.lineTo(20, -22);
    ctx.stroke();
    if (storm) {
      ctx.fillStyle = 'rgba(178,231,226,.8)';
      ctx.beginPath();
      ctx.arc(19, -22, 6 + Math.sin(this.time * 5) * 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawSkyDock(color) {
    const ctx = this.ctx;
    this.drawTower(color, false);
    ctx.strokeStyle = '#d9e4d2';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -28);
    ctx.lineTo(26, -40);
    ctx.lineTo(18, -23);
    ctx.closePath();
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(26, -40);
    ctx.lineTo(30, -26);
    ctx.lineTo(18, -23);
    ctx.closePath();
    ctx.fill();
  }

  drawReservoir(color) {
    const ctx = this.ctx;
    ctx.fillStyle = '#737d78';
    ctx.beginPath();
    ctx.ellipse(0, 3, 22, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#4fa0a5';
    ctx.beginPath();
    ctx.ellipse(0, 0, 16, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 20, Math.PI, Math.PI * 2);
    ctx.stroke();
  }

  drawAcademy(color) {
    const ctx = this.ctx;
    ctx.fillStyle = '#d1c9a8';
    ctx.beginPath();
    ctx.moveTo(-22, -9);
    ctx.lineTo(0, -25);
    ctx.lineTo(22, -9);
    ctx.closePath();
    ctx.fill();
    for (let i = -15; i <= 15; i += 10) ctx.fillRect(i - 2, -8, 4, 20);
    ctx.fillStyle = color;
    ctx.fillRect(-23, 10, 46, 5);
  }

  drawTemple(color, grand) {
    const ctx = this.ctx;
    ctx.fillStyle = grand ? '#e1d6b1' : '#c9c2a5';
    const width = grand ? 27 : 22;
    ctx.beginPath();
    ctx.moveTo(-width, -8);
    ctx.lineTo(0, grand ? -32 : -26);
    ctx.lineTo(width, -8);
    ctx.closePath();
    ctx.fill();
    for (let i = -16; i <= 16; i += 8) ctx.fillRect(i - 2, -7, 4, 20);
    ctx.fillStyle = color;
    ctx.fillRect(-width - 2, 11, (width + 2) * 2, 5);
    ctx.globalAlpha *= 0.75;
    ctx.fillStyle = '#d7c8ff';
    ctx.beginPath();
    ctx.arc(0, grand ? -36 : -30, grand ? 8 : 5, 0, Math.PI * 2);
    ctx.fill();
  }

  drawAerie(color) {
    const ctx = this.ctx;
    ctx.strokeStyle = '#6b5139';
    ctx.lineWidth = 4;
    for (let i = 0; i < 7; i += 1) {
      const angle = (Math.PI * 2 * i) / 7;
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * 8, Math.sin(angle) * 4);
      ctx.lineTo(Math.cos(angle) * 23, Math.sin(angle) * 11);
      ctx.stroke();
    }
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(0, 2, 17, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#d8e4dc';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-4, -7);
    ctx.quadraticCurveTo(-18, -24, -28, -10);
    ctx.moveTo(4, -7);
    ctx.quadraticCurveTo(18, -24, 28, -10);
    ctx.stroke();
  }

  drawWorldRoot(color) {
    const ctx = this.ctx;
    ctx.strokeStyle = '#6c5138';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(0, 12);
    ctx.quadraticCurveTo(-6, -3, 0, -24);
    ctx.stroke();
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    for (let i = -2; i <= 2; i += 1) {
      ctx.beginPath();
      ctx.moveTo(0, -12);
      ctx.quadraticCurveTo(i * 9, -22 - Math.abs(i) * 3, i * 13, -28);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(199,174,239,.75)';
    ctx.beginPath();
    ctx.arc(0, -27, 10 + Math.sin(this.time * 2) * 2, 0, Math.PI * 2);
    ctx.fill();
  }

  drawCitadel(color) {
    const ctx = this.ctx;
    ctx.fillStyle = '#a8a38f';
    ctx.fillRect(-24, -11, 48, 24);
    ctx.fillRect(-19, -31, 12, 30);
    ctx.fillRect(7, -31, 12, 30);
    ctx.fillRect(-6, -40, 12, 39);
    ctx.fillStyle = color;
    ctx.fillRect(-22, -35, 18, 7);
    ctx.fillRect(4, -35, 18, 7);
    ctx.fillRect(-9, -45, 18, 7);
    ctx.fillStyle = '#2d3435';
    ctx.fillRect(-4, 2, 8, 11);
  }

  drawWorldGate(color) {
    const ctx = this.ctx;
    ctx.strokeStyle = '#777f7b';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(0, -6, 22, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, -6, 15 + Math.sin(this.time * 2.5) * 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(138,220,218,.22)';
    ctx.beginPath();
    ctx.arc(0, -6, 14, 0, Math.PI * 2);
    ctx.fill();
  }

  drawCombat(state, centerX, centerY, shellW, shellH) {
    const ctx = this.ctx;
    const combat = state.combat;
    // Raids travel between an outer ring and the shell rim, which is where they actually breach.
    const rimX = shellW * 0.50;
    const rimY = shellH * 0.46;
    const outerX = shellW * 0.74;
    const outerY = shellH * 0.58;
    const spawnDistance = 1.20;
    const breachDistance = 0.14;
    this.enemyPositions.clear();

    for (const enemy of combat.enemies) {
      if (enemy.hp <= 0 && enemy.counted) continue;
      const wobble = Math.sin(this.time * 3 + enemy.angle * 2) * 5;
      const approach = clamp((enemy.distance - breachDistance) / (spawnDistance - breachDistance), 0, 1);
      const radiusX = rimX + (outerX - rimX) * approach;
      const radiusY = rimY + (outerY - rimY) * approach;
      const lane = (enemy.laneOffset || 0) * shellW * 0.10;
      const tangentX = -Math.sin(enemy.angle) * radiusX;
      const tangentY = Math.cos(enemy.angle) * radiusY * 0.6;
      const tangentLength = Math.hypot(tangentX, tangentY) || 1;
      const x = centerX + Math.cos(enemy.angle) * radiusX + tangentX / tangentLength * lane;
      const y = centerY + Math.sin(enemy.angle) * radiusY + tangentY / tangentLength * lane
        + (enemy.type === 'air' ? -35 + wobble : wobble * 0.25);
      const scale = clamp(0.70 + (1 - approach) * 0.36, 0.70, 1.06);
      // Keep the whole badge on screen: a raid that spawns half outside the
      // canvas cannot be identified at the moment it matters.
      const padX = 24 * scale + 3;
      const padTop = 26 * scale + 8;
      const padBottom = 16 * scale + 6;
      const shownX = clamp(x, padX, this.width - padX);
      const shownY = clamp(y, padTop, this.height - padBottom);
      this.enemyPositions.set(enemy.uid, { x: shownX, y: shownY });

      if (enemy.type === 'air') {
        drawShadow(ctx, shownX, shownY + 35, 28 * scale, 8 * scale, 0.18);
      } else {
        ctx.fillStyle = 'rgba(198, 236, 231, .20)';
        ctx.beginPath();
        ctx.ellipse(shownX, shownY + 13 * scale, 24 * scale, 6 * scale, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.save();
      ctx.translate(shownX, shownY);
      ctx.scale(scale, scale);
      ctx.globalAlpha = enemy.hp > 0 ? 1 : 0.25;
      ctx.fillStyle = enemy.hitFlash > 0 ? '#f3d7bd' : enemy.type === 'air' ? '#b88b78' : '#9b8163';
      roundedRect(ctx, -22, -14, 44, 28, 8);
      ctx.fill();
      ctx.save();
      ctx.translate(-9.6, -9.6);
      ctx.scale(0.8, 0.8);
      ctx.strokeStyle = '#100e0e';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke(new Path2D(enemyIconPath(enemy.id)));
      ctx.restore();
      ctx.restore();

      if (enemy.hp > 0) {
        const hp = clamp(enemy.hp / enemy.maxHp, 0, 1);
        ctx.fillStyle = 'rgba(10,18,20,.72)';
        roundedRect(ctx, shownX - 20, shownY - 25, 40, 5, 2.5);
        ctx.fill();
        ctx.fillStyle = hp > 0.55 ? '#a7c77a' : '#d87768';
        roundedRect(ctx, shownX - 19, shownY - 24, 38 * hp, 3, 1.5);
        ctx.fill();
      }
    }

    for (const projectile of combat.projectiles) {
      const from = this.tileCenters.get(`${projectile.fromX},${projectile.fromY}`);
      const to = this.enemyPositions.get(projectile.targetId);
      if (!from || !to) continue;
      const t = clamp(projectile.age / projectile.duration, 0, 1);
      const x = lerp(from.x, to.x, t);
      const y = lerp(from.y - 22, to.y, t) - Math.sin(t * Math.PI) * 24;
      ctx.strokeStyle = projectile.heavy ? 'rgba(190,235,226,.82)' : 'rgba(242,214,151,.84)';
      ctx.lineWidth = projectile.heavy ? 3 : 2;
      ctx.beginPath();
      ctx.moveTo(lerp(from.x, to.x, Math.max(0, t - 0.08)), lerp(from.y - 22, to.y, Math.max(0, t - 0.08)) - Math.sin(Math.max(0, t - 0.08) * Math.PI) * 24);
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.fillStyle = projectile.heavy ? '#c7f0e7' : '#f3d28a';
      ctx.beginPath();
      ctx.arc(x, y, projectile.heavy ? 4 : 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

  }

  drawShellLabels(state, centerX, centerY, shellW, shellH) {
    const ctx = this.ctx;
    ctx.save();
    ctx.textAlign = 'center';
    const width = Math.min(270, Math.max(180, this.width - 24));
    const boxX = clamp(centerX - width / 2, 12, this.width - width - 12);
    const y = Math.min(this.height - 22, Math.max(30, centerY + shellH * 0.61));
    ctx.fillStyle = 'rgba(4, 16, 20, .78)';
    roundedRect(ctx, boxX, y - 17, width, 34, 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(203, 189, 143, .3)';
    ctx.lineWidth = 1;
    roundedRect(ctx, boxX + 0.5, y - 16.5, width - 1, 33, 2);
    ctx.stroke();
    ctx.fillStyle = '#e8e0c2';
    ctx.font = '600 14px "Palatino Linotype", Palatino, Georgia, serif';
    ctx.fillText(`${state.turtleName} · ${TIERS[state.tier].name}`, boxX + width / 2, y + 5);
    ctx.restore();
  }

  drawWorldMap(state, ui) {
    const ctx = this.ctx;
    this.nodePositions.clear();
    // Creatures and the player turtle keep the same relative size on every screen.
    const mapScale = clamp(Math.min(this.width / 960, this.height / 640), 0.55, 1.15);
    const cx = this.width * 0.5;
    const cy = this.height * 0.51;
    const rx = this.width * 0.43;
    const ry = this.height * 0.38;

    ctx.save();
    ctx.strokeStyle = 'rgba(190, 224, 215, .10)';
    ctx.lineWidth = 1;
    for (let ring = 1; ring <= 4; ring += 1) {
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx * ring / 4, ry * ring / 4, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 6) {
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(angle) * rx, cy + Math.sin(angle) * ry);
      ctx.stroke();
    }
    ctx.restore();

    for (const node of state.worldNodes) {
      if (!node.discovered) continue;
      const drift = Math.sin(this.time * 0.26 + node.angle * 3) * 0.012;
      // Worlds sit on a ring outside the player turtle so no name collides with the city label.
      const radial = 0.36 + node.distance * 0.64;
      const x = cx + Math.cos(node.angle + drift) * radial * rx;
      const y = cy + Math.sin(node.angle + drift) * radial * ry + (node.altitude === 'air' ? Math.sin(this.time + node.angle) * 10 - 18 : 0);
      const radius = (node.kind === 'island' ? 24 : 29) * mapScale;
      this.nodePositions.set(node.id, { x, y, radius });
      const selected = ui.selectedWorldNodeId === node.id;
      const hovered = this.hoverNodeId === node.id;

      if (node.visited || selected) {
        ctx.strokeStyle = selected ? 'rgba(241, 210, 134, .72)' : 'rgba(179, 219, 198, .18)';
        ctx.lineWidth = selected ? 2 : 1;
        ctx.setLineDash(selected ? [8, 6] : [4, 8]);
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      this.drawWorldCreature(node, x, y, radius, selected, hovered, mapScale);
    }

    this.drawPlayerTurtleMap(state, cx, cy, mapScale);
  }

  drawPlayerTurtleMap(state, x, y, scale = 1) {
    const ctx = this.ctx;
    drawShadow(ctx, x, y + 28 * scale, 65 * scale, 18 * scale, 0.28);
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.fillStyle = '#507b63';
    ctx.beginPath();
    ctx.ellipse(0, 0, 56, 36, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3e6754';
    ctx.beginPath();
    ctx.ellipse(55, 1, 24, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(230,222,178,.55)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, 40, 25, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#d4c27d';
    ctx.beginPath();
    ctx.moveTo(-10, -8);
    ctx.lineTo(0, -25);
    ctx.lineTo(10, -8);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#f1e7c8';
    ctx.font = `700 ${Math.max(10, Math.round(13 * scale))}px system-ui`;
    ctx.fillText(state.cityName, x, y + 56 * scale);
    ctx.font = `500 ${Math.max(9, Math.round(11 * scale))}px system-ui`;
    ctx.fillStyle = 'rgba(241,231,200,.72)';
    ctx.fillText(state.turtleName, x, y + 71 * scale);
  }

  drawWorldCreature(node, x, y, radius, selected, hovered, mapScale = 1) {
    const ctx = this.ctx;
    const relationColor = node.relation >= 25 ? '#7bb78d' : node.relation <= -25 ? '#c46f65' : '#c6b77e';
    if (node.altitude === 'air') drawShadow(ctx, x, y + radius + 15, radius * 1.1, radius * 0.30, 0.16);
    else drawShadow(ctx, x, y + radius * 0.74, radius * 1.02, radius * 0.30, 0.14);
    if (selected || hovered) {
      ctx.strokeStyle = selected ? '#f1d589' : '#d9e7d8';
      ctx.lineWidth = selected ? 3 : 2;
      ctx.beginPath();
      ctx.arc(x, y, radius + 8 * mapScale + Math.sin(this.time * 3) * 2, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.save();
    ctx.translate(x, y);
    ctx.globalAlpha = node.defeated ? 0.38 : 1;
    if (node.kind === 'turtle') {
      ctx.fillStyle = '#4f775d';
      ctx.beginPath();
      ctx.ellipse(0, 0, radius, radius * 0.67, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#42634f';
      ctx.beginPath();
      ctx.ellipse(radius * 0.9, 1, radius * 0.42, radius * 0.29, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#9aa875';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, 0, radius * 0.68, radius * 0.46, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else if (node.kind === 'whale') {
      ctx.fillStyle = '#4d6d78';
      ctx.beginPath();
      ctx.ellipse(0, 0, radius * 1.12, radius * 0.55, 0.05, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-radius, 0);
      ctx.lineTo(-radius * 1.45, -radius * 0.5);
      ctx.lineTo(-radius * 1.28, radius * 0.2);
      ctx.closePath();
      ctx.fill();
    } else if (node.kind === 'crab') {
      ctx.fillStyle = '#846254';
      ctx.beginPath();
      ctx.ellipse(0, 0, radius * 0.8, radius * 0.58, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#846254';
      ctx.lineWidth = 5;
      for (let side of [-1, 1]) {
        for (let i = -1; i <= 1; i += 1) {
          ctx.beginPath();
          ctx.moveTo(side * radius * 0.55, i * radius * 0.25);
          ctx.lineTo(side * radius * 1.2, i * radius * 0.48);
          ctx.stroke();
        }
      }
    } else if (node.kind === 'manta') {
      ctx.fillStyle = '#6e7184';
      ctx.beginPath();
      ctx.moveTo(0, radius * 0.22);
      ctx.quadraticCurveTo(-radius * 0.7, radius * 0.8, -radius * 1.18, -radius * 0.22);
      ctx.quadraticCurveTo(-radius * 0.45, -radius * 0.6, 0, -radius * 0.18);
      ctx.quadraticCurveTo(radius * 0.45, -radius * 0.6, radius * 1.18, -radius * 0.22);
      ctx.quadraticCurveTo(radius * 0.7, radius * 0.8, 0, radius * 0.22);
      ctx.fill();
      ctx.strokeStyle = '#6e7184';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, radius * 0.15);
      ctx.lineTo(0, radius * 1.1);
      ctx.stroke();
    } else if (node.kind === 'leviathan') {
      ctx.strokeStyle = '#634e57';
      ctx.lineWidth = radius * 0.62;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-radius, radius * 0.35);
      ctx.bezierCurveTo(-radius * 0.3, -radius, radius * 0.4, radius, radius, -radius * 0.3);
      ctx.stroke();
      ctx.lineCap = 'butt';
    } else {
      ctx.fillStyle = '#6d7e61';
      ctx.beginPath();
      ctx.moveTo(-radius, radius * 0.45);
      ctx.lineTo(-radius * 0.35, -radius * 0.52);
      ctx.lineTo(0, -radius * 0.25);
      ctx.lineTo(radius * 0.35, -radius * 0.64);
      ctx.lineTo(radius, radius * 0.45);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    ctx.fillStyle = relationColor;
    ctx.beginPath();
    ctx.arc(x + radius * 0.72, y - radius * 0.62, Math.max(3.5, 5 * mapScale), 0, Math.PI * 2);
    ctx.fill();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ede5cb';
    ctx.font = `700 ${Math.max(10, Math.round(11 * mapScale))}px system-ui`;
    ctx.fillText(node.name, x, y + radius + 18 * mapScale);
  }

  drawVignette() {
    const ctx = this.ctx;
    const gradient = ctx.createRadialGradient(this.width / 2, this.height / 2, this.width * 0.2, this.width / 2, this.height / 2, Math.max(this.width, this.height) * 0.72);
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(1, 'rgba(0,8,12,.30)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);
  }
}
