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
};

// everything else comes from public/assets, this is just the plain white particle
export function makeTextures(scene) {
  if (scene.textures.exists(tex.dot)) return;
  const canvas = scene.textures.createCanvas(tex.dot, 4, 4);
  const ctx = canvas.getContext();
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, 4, 4);
  canvas.refresh();
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
