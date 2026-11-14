import { rollers } from './config.js';

export const tex = {
  player: 'player',
  yeti: 'yeti',
  fox: 'fox',
  tourist: 'tourist',
  snowball: 'snowball',
  coil: 'coil',
  golden: 'golden',
  pretzel: 'pretzel',
  beer: 'beer',
  dot: 'dot',
  cloud: 'cloud',
  farHills: 'farHills',
  nearHills: 'nearHills',
  pine: 'pine',
  boulder: 'boulder',
  dust: 'dust',
  sparkle: 'sparkle',
  splat: 'splat',
  hut: 'hut',
  flowers: 'flowers',
  cablePylon: 'cablePylon',
  groundMeadow: 'groundMeadow',
  groundCliffs: 'groundCliffs',
  groundGlacier: 'groundGlacier',
  bigSnowball: 'bigSnowball',
};

// everything else comes from public/assets, these two are simple enough to draw here
export function makeTextures(scene) {
  if (!scene.textures.exists(tex.dot)) {
    const canvas = scene.textures.createCanvas(tex.dot, 4, 4);
    const ctx = canvas.getContext();
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, 4, 4);
    canvas.refresh();
  }

  // rolling snowball on the same 2x pixel grid as the sprites, lit from the top left
  if (!scene.textures.exists(tex.bigSnowball)) {
    // 2px per cell, so the sprite ends up exactly as wide as the snowball
    const cells = rollers.radius;
    const canvas = scene.textures.createCanvas(tex.bigSnowball, cells * 2, cells * 2);
    const ctx = canvas.getContext();
    const mid = (cells - 1) / 2;
    for (let y = 0; y < cells; y++) {
      for (let x = 0; x < cells; x++) {
        const dist = Math.hypot(x - mid, y - mid);
        if (dist > mid + 0.5) continue;
        const light = (-(x - mid) - (y - mid)) / (mid * 1.4);
        let color = light > 0.35 ? '#ffffff' : light > -0.25 ? '#e3eef8' : '#b4c8dd';
        if (dist > mid - 0.6) color = '#2b3a55';
        else if ((x * 7 + y * 13) % 17 === 0) color = '#c6d8ea';
        ctx.fillStyle = color;
        ctx.fillRect(x * 2, y * 2, 2, 2);
      }
    }
    canvas.refresh();
  }
}

export function drawCross(scene, x, groundY, size = 1) {
  const g = scene.add.graphics();
  g.fillStyle(0xffd60a, 0.25);
  g.fillCircle(x, groundY - 46 * size, 30 * size);
  g.fillStyle(0xe0a800, 1);
  g.fillRect(x - 3 * size, groundY - 70 * size, 6 * size, 70 * size);
  g.fillRect(x - 18 * size, groundY - 56 * size, 36 * size, 6 * size);
  g.fillStyle(0xffd60a, 1);
  g.fillRect(x - 2 * size, groundY - 70 * size, 3 * size, 70 * size);
  g.fillRect(x - 18 * size, groundY - 56 * size, 36 * size, 3 * size);
  return g;
}
