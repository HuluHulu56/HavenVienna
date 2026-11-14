// placeholder art, real sprites can be loaded under the same keys in Boot

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
  groundMeadow: 'groundMeadow',
  groundCliffs: 'groundCliffs',
  groundGlacier: 'groundGlacier',
};

const colors = {
  k: '#1b1b1f', s: '#f1c27d', h: '#d62828', w: '#f8f9fa', j: '#1d70b8',
  p: '#3a3a44', g: '#a7b1bc', y: '#f4c430', b: '#5c3b1e',
};

function drawPixels(scene, key, rows, palette, size = 2) {
  if (scene.textures.exists(key)) return;
  const width = Math.max(...rows.map((r) => r.length));
  const canvas = scene.textures.createCanvas(key, width * size, rows.length * size);
  const ctx = canvas.getContext();
  rows.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      if (!palette[ch]) return;
      ctx.fillStyle = palette[ch];
      ctx.fillRect(x * size, y * size, size, size);
    });
  });
  canvas.refresh();
}

function drawCanvas(scene, key, width, height, draw) {
  if (scene.textures.exists(key)) return;
  const canvas = scene.textures.createCanvas(key, width, height);
  draw(canvas.getContext(), width, height);
  canvas.refresh();
}

const playerPixels = [
  '....hhhh....',
  '...hhhhhh...',
  '...wwwwww...',
  '...skssks...',
  '...ssssss...',
  '....ssss....',
  '..yjjjjjjy..',
  '..yyjjjjyy..',
  '....jjjj....',
  '....jggj....',
  '....pggp....',
  '...ppggpp...',
  '...p.gg.p...',
  '..bbggggbb..',
  '.....gg.....',
  '.....kk.....',
  '....gkkg....',
  '.....kk.....',
  '....gkkg....',
  '.....kk.....',
  '....gkkg....',
  '.....gg.....',
  '.....gg.....',
  '....kkkk....',
];

const yetiPixels = [
  '....wwwwwww.....',
  '...wwwwwwwww....',
  '..wwbbbbbbbww...',
  '..wwbkbbbkbww...',
  '..wwbbbbbbbww...',
  '..wwbbrrrbbww...',
  '.wwwwbbbbbwwwww.',
  'wwwwwwwwwwwwwwww',
  'ww.wwwwwwwwww.ww',
  'ww.wwwwwwwwww.ww',
  '...wwwwwwwwww...',
  '...wwwwwwwwww...',
  '...www....www...',
  '..llll....llll..',
];

const foxPixels = [
  '..............o.o.',
  '.............oooo.',
  'ww...........okook',
  'ooo.oooooooooooww.',
  '.oooooooooooooo...',
  '..oooooooooooo....',
  '..owwwwwwwwwo.....',
  '..o.o......o.o....',
  '..k.k......k.k....',
];

const touristPixels = [
  '...tttttt...',
  '.tttttttttt.',
  '...ssssss...',
  '...skssks...',
  '...ssssss...',
  '...sskkss...',
  '..rrrrrrrr..',
  '.srfrrrrfrs.',
  '.srrccccrrs.',
  '.s.rcckcr.s.',
  '...rrfrrr...',
  '...nnnnnn...',
  '...nnnnnn...',
  '...nn..nn...',
  '...ss..ss...',
  '...ss..ss...',
  '...ww..ww...',
  '...ww..ww...',
  '..bbb..bbb..',
];

const coilPixels = [
  '.gggggg.',
  'g......g',
  '.gggggg.',
  'g......g',
  '.gggggg.',
  'g......g',
  '.gggggg.',
  'g......g',
  '.gggggg.',
];

const pretzelPixels = [
  '..bbb..bbb..',
  '.bwbbbbbwbb.',
  'bb...bb...bb',
  'b...b..b...b',
  '.b.b....b.b.',
  '..bb....bb..',
  '.b.b....b.b.',
  'bw..bbbb..wb',
  '.bbb....bbb.',
];

const beerPixels = [
  '.wwwwww...',
  'wwwwwwww..',
  'ayyyyyya..',
  'ayyyyyyaaa',
  'ayyyyyya.a',
  'ayyyyyya.a',
  'ayyyyyyaaa',
  'ayyyyyya..',
  'aaaaaaaa..',
];

function drawPeaks(ctx, width, height, peaks, rock, snow) {
  ctx.fillStyle = rock;
  ctx.beginPath();
  ctx.moveTo(0, height);
  peaks.forEach(([x, y]) => ctx.lineTo(x, y));
  ctx.lineTo(width, height);
  ctx.fill();

  ctx.fillStyle = snow;
  for (let i = 1; i < peaks.length - 1; i++) {
    const [x, y] = peaks[i];
    const [lx, ly] = peaks[i - 1];
    const [rx, ry] = peaks[i + 1];
    if (y > ly || y > ry) continue;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (rx - x) * 0.28, y + (ry - y) * 0.28);
    ctx.lineTo(x + (rx - x) * 0.14, y + (ry - y) * 0.22);
    ctx.lineTo(x, y + (ry - y) * 0.17);
    ctx.lineTo(x + (lx - x) * 0.14, y + (ly - y) * 0.22);
    ctx.lineTo(x + (lx - x) * 0.28, y + (ly - y) * 0.28);
    ctx.fill();
  }
}

function speckle(ctx, size, base, spots) {
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);
  spots.forEach(([color, count, w, h]) => {
    ctx.fillStyle = color;
    for (let i = 0; i < count; i++) {
      ctx.fillRect(Math.floor(Math.random() * size), Math.floor(Math.random() * size), w, h);
    }
  });
}

function drawGround(scene) {
  drawCanvas(scene, tex.groundMeadow, 64, 64, (ctx) => {
    speckle(ctx, 64, '#7f5539', [['#6b4630', 40, 3, 2], ['#946644', 25, 2, 2], ['#a39171', 6, 4, 3]]);
  });
  drawCanvas(scene, tex.groundCliffs, 64, 64, (ctx) => {
    speckle(ctx, 64, '#6c7486', [['#5c677d', 40, 4, 2], ['#7d8597', 30, 3, 2], ['#4a5263', 10, 6, 1]]);
  });
  drawCanvas(scene, tex.groundGlacier, 64, 64, (ctx) => {
    speckle(ctx, 64, '#9aa8bb', [['#b8c4d4', 40, 4, 2], ['#ffffff', 18, 3, 1], ['#7d8aa0', 14, 3, 2]]);
  });

  drawCanvas(scene, tex.pine, 32, 56, (ctx) => {
    ctx.fillStyle = '#5c3b1e';
    ctx.fillRect(14, 44, 4, 12);
    [[16, 0, 8, 18], [16, 10, 11, 32], [16, 22, 14, 46]].forEach(([x, top, half, bottom]) => {
      ctx.fillStyle = '#2d6a4f';
      ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x + half, bottom); ctx.lineTo(x - half, bottom); ctx.fill();
      ctx.fillStyle = '#40916c';
      ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x - half, bottom); ctx.lineTo(x - 2, bottom); ctx.fill();
    });
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(14, 2, 4, 3);
  });

  drawCanvas(scene, tex.boulder, 32, 32, (ctx) => {
    ctx.fillStyle = '#3d3d44';
    ctx.beginPath(); ctx.arc(16, 16, 16, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#7a7a85';
    ctx.beginPath(); ctx.arc(16, 16, 14, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#9a9aa6';
    ctx.beginPath(); ctx.arc(12, 11, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#5c5c66';
    ctx.fillRect(18, 18, 6, 2); ctx.fillRect(9, 21, 4, 2);
  });
}

export function makeTextures(scene) {
  drawPixels(scene, tex.player, playerPixels, colors);
  drawPixels(scene, tex.yeti, yetiPixels, { w: '#eef3f7', l: '#b9c7d3', b: '#9fb3c8', k: colors.k, r: '#c1121f' });
  drawPixels(scene, tex.fox, foxPixels, { o: '#e76f51', w: '#fdf0d5', k: colors.k });
  drawPixels(scene, tex.tourist, touristPixels, {
    t: '#e9c46a', s: colors.s, k: colors.k, r: '#e63946', f: '#ffd166', c: '#2b2d42', n: '#b08968', w: '#ffffff', b: '#6f4518',
  });
  drawPixels(scene, tex.coil, coilPixels, { g: '#c0c8d0' });
  drawPixels(scene, tex.golden, coilPixels, { g: '#ffcc33' });
  drawPixels(scene, tex.pretzel, pretzelPixels, { b: '#a0522d', w: '#ffffff' });
  drawPixels(scene, tex.beer, beerPixels, { w: '#ffffff', a: '#cfe8ef', y: '#f2a541' }, 3);

  drawCanvas(scene, tex.dot, 4, 4, (ctx) => { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 4, 4); });

  drawCanvas(scene, tex.snowball, 10, 10, (ctx) => {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(5, 5, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#cfe2f3'; ctx.fillRect(5, 6, 3, 2);
  });

  drawCanvas(scene, tex.cloud, 120, 48, (ctx) => {
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    [[30, 30, 22], [60, 22, 26], [92, 30, 20], [60, 34, 22]].forEach(([x, y, r]) => {
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    });
  });

  drawCanvas(scene, tex.farHills, 960, 360, (ctx, w, h) => {
    drawPeaks(ctx, w, h, [[0, 230], [90, 150], [170, 210], [260, 90], [340, 190], [430, 120], [520, 200],
      [600, 60], [700, 180], [780, 110], [870, 200], [960, 230]], '#9db4c8', '#eef4fa');
  });

  drawCanvas(scene, tex.nearHills, 960, 260, (ctx, w, h) => {
    drawPeaks(ctx, w, h, [[0, 150], [120, 70], [230, 160], [330, 100], [450, 190], [560, 80],
      [690, 170], [800, 90], [960, 150]], '#5f7a8c', '#dfe9f2');
  });

  drawGround(scene);
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
