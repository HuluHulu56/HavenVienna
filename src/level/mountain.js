import { world, level } from '../config.js';

export const zones = [
  { name: 'Alpine Meadows', upTo: 0.34, surface: 'grass', fill: 'groundMeadow' },
  { name: 'Höllental Cliffs', upTo: 0.68, surface: 'stone', fill: 'groundCliffs' },
  { name: 'Summit Glacier', upTo: 2, surface: 'snow', fill: 'groundGlacier' },
];

export function zoneAt(progress) {
  return zones.findIndex((zone) => progress < zone.upTo);
}

function seeded(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const enemyMix = [
  ['tourist', 'tourist', 'fox', 'fox', 'yeti'],
  ['fox', 'fox', 'yeti', 'tourist', 'yeti'],
  ['yeti', 'yeti', 'yeti', 'fox', 'tourist'],
];

const spacing = 16;

export function buildMountain() {
  const random = seeded(level.seed);
  const between = (a, b) => a + random() * (b - a);

  const bottomY = world.height - 300;
  const flatStart = 600;
  const climb = bottomY - world.summitY;
  const phase = [random() * 6.28, random() * 6.28, random() * 6.28];

  const heights = [];
  for (let x = 0; x <= world.length; x += spacing) {
    const t = Math.max(0, x - flatStart) / (world.length - flatStart);
    const fade = Math.min(1, t * 8, (1 - t) * 8);
    const wobble = Math.sin(x / 700 + phase[0]) * 200 + Math.sin(x / 260 + phase[1]) * 60 + Math.sin(x / 90 + phase[2]) * 10;
    heights.push(bottomY - t * climb + wobble * fade);
  }

  // keep it climbable
  for (let i = 1; i < heights.length; i++) {
    const rise = heights[i - 1] - heights[i];
    if (rise > level.maxSlope * spacing) heights[i] = heights[i - 1] - level.maxSlope * spacing;
    if (rise < -1.2 * spacing) heights[i] = heights[i - 1] + 1.2 * spacing;
  }

  // ramp up the rest of the way if the clamping left us short
  let lastY = heights[heights.length - 1];
  while (lastY > world.summitY + 1) {
    lastY = Math.max(world.summitY, lastY - level.maxSlope * 0.8 * spacing);
    heights.push(lastY);
  }

  const summit = { x: (heights.length - 1) * spacing, y: world.summitY, w: 700 };
  for (let x = 0; x < summit.w; x += spacing) heights.push(world.summitY);
  const width = (heights.length - 1) * spacing;

  const heightAt = (x) => {
    const i = Math.min(heights.length - 2, Math.max(0, Math.floor(x / spacing)));
    const t = Math.min(1, Math.max(0, x / spacing - i));
    return heights[i] + (heights[i + 1] - heights[i]) * t;
  };

  // boulders are bumps in the ground, small enough to hop over
  const boulders = [];
  for (let x = 1400; x < summit.x - 800; x += between(350, 900)) {
    const r = Math.round(between(16, 34));
    const centerY = heightAt(x) + r * 0.45;
    boulders.push({ x, y: centerY, r });
    for (let i = Math.floor((x - r) / spacing); i <= Math.ceil((x + r) / spacing); i++) {
      const dx = i * spacing - x;
      if (Math.abs(dx) < r) heights[i] = Math.min(heights[i], centerY - Math.sqrt(r * r - dx * dx));
    }
  }

  const progressAt = (x) => Math.min(1, Math.max(0, x / summit.x));

  const patches = [];
  for (let x = 1600; x < summit.x - 400; x += between(500, 1100)) {
    const zone = zoneAt(progressAt(x));
    const r = random();
    const kind = zone === 0 ? (r < 0.6 ? 'rock' : 'ice') : zone === 1 ? (r < 0.55 ? 'rock' : 'ice') : (r < 0.25 ? 'rock' : 'ice');
    patches.push({ from: x, to: x + between(120, 320), kind });
  }

  const surfaceAt = (x) => {
    if (x >= summit.x) return 'summit';
    const patch = patches.find((p) => x >= p.from && x <= p.to);
    return patch ? patch.kind : zones[zoneAt(progressAt(x))].surface;
  };

  const slopeAt = (x) => (heightAt(x + 6) - heightAt(x - 6)) / 12;

  const enemies = [];
  for (let x = 1500; x < summit.x - 300; x += between(450, 900)) {
    const zone = zoneAt(progressAt(x));
    const range = between(60, 140);
    enemies.push({ kind: enemyMix[zone][Math.floor(random() * 5)], x, minX: x - range, maxX: x + range });
  }

  const pickups = [];
  for (let x = 900; x < summit.x - 200; x += between(300, 700)) {
    const r = random();
    pickups.push({ kind: r < 0.12 ? 'golden' : r < 0.3 ? 'pretzel' : 'coil', x });
  }

  const trees = [];
  for (let x = 40; x < summit.x * 0.6; x += between(70, 260)) {
    if (random() < progressAt(x) * 1.5) continue;
    trees.push({ x, size: between(0.7, 1.3) });
  }

  return {
    heights, spacing, width, bottomY, summit,
    boulders, patches, enemies, pickups, trees,
    heightAt, slopeAt, surfaceAt, progressAt,
  };
}
