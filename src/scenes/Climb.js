import Phaser from 'phaser';
import { world, gameWidth, gameHeight, pogo, pickups } from '../config.js';
import { tex, drawCross } from '../assets.js';
import { buildMountain, zones, zoneAt } from '../level/mountain.js';
import Player from '../objects/Player.js';
import Enemy from '../objects/Enemy.js';
import Pickup from '../objects/Pickup.js';
import { sfx } from '../sfx.js';
import { textStyle } from '../util.js';

const lowSky = Phaser.Display.Color.ValueToColor(0x8ecae6);
const highSky = Phaser.Display.Color.ValueToColor(0x274c77);

const surfaceColors = {
  grass: 0x6a994e,
  stone: 0x9aa3b0,
  snow: 0xf8f9fa,
  ice: 0xa5e6f3,
  rock: 0x8a7560,
  summit: 0xffffff,
};

const chunkSize = 1024;

export default class Climb extends Phaser.Scene {
  constructor() {
    super('Climb');
  }

  init(data) {
    this.kick = Phaser.Math.Clamp(data.kick ?? 0.5, 0, 1);
  }

  create() {
    this.mountain = buildMountain();
    const mountain = this.mountain;

    this.makeBackground();
    this.makeTerrain();
    this.makeSummit();

    // harder kick sends you further back down the slope
    const startX = mountain.summit.x * (1 - (0.35 + 0.6 * this.kick));
    this.player = new Player(this, mountain, startX, mountain.heightAt(startX) - 300);
    this.makeCritters();
    this.makeEffects();

    const cam = this.cameras.main;
    cam.setBounds(0, 0, mountain.width, world.height);
    cam.startFollow(this.player.sprite, true, 0.1, 0.1);
    cam.setFollowOffset(-180, 60);
    cam.setDeadzone(60, 60);
    cam.centerOn(startX + 180, this.player.y);

    this.keys = this.input.keyboard.addKeys('LEFT,RIGHT,UP,A,D,W,SPACE,M');
    this.keys.M.on('down', () => sfx.toggleMute());
    this.input.keyboard.on('keydown', () => sfx.unlock());

    this.touch = { left: false, right: false, jump: false };
    this.run = { time: 0, stomps: 0, started: false, done: false, topZone: -1 };
    this.updateProgress();

    this.scene.launch('Hud');
    this.events.once('shutdown', () => this.scene.stop('Hud'));
  }

  makeBackground() {
    const mountain = this.mountain;
    this.farHills = this.add.tileSprite(0, gameHeight, gameWidth, 360, tex.farHills).setOrigin(0, 1).setScrollFactor(0).setDepth(-10);
    this.nearHills = this.add.tileSprite(0, gameHeight, gameWidth, 260, tex.nearHills).setOrigin(0, 1).setScrollFactor(0).setDepth(-9);

    for (let i = 0; i < 60; i++) {
      this.add.image(Phaser.Math.Between(0, mountain.width * 0.35 + gameWidth), Phaser.Math.Between(0, world.height * 0.35 + gameHeight), tex.cloud)
        .setScrollFactor(0.35)
        .setScale(Phaser.Math.FloatBetween(0.6, 1.4))
        .setAlpha(Phaser.Math.FloatBetween(0.4, 0.85))
        .setDepth(-8);
    }

    this.snow = this.add.particles(0, 0, tex.dot, {
      x: { min: 0, max: gameWidth + 200 },
      y: -8,
      lifespan: 14000,
      speedY: { min: 25, max: 60 },
      speedX: { min: -40, max: -5 },
      scale: { min: 0.3, max: 0.8 },
      alpha: { start: 0.9, end: 0.3 },
      frequency: 220,
    }).setScrollFactor(0).setDepth(20);
  }

  surfacePoints(from, to) {
    const { lineAt, spacing } = this.mountain;
    const points = [];
    for (let x = from; x <= to; x += spacing) points.push(new Phaser.Math.Vector2(x, lineAt(x)));
    return points;
  }

  makeTerrain() {
    const mountain = this.mountain;
    this.chunks = [];

    const zoneOf = (from) => zoneAt(mountain.progressAt(Math.min(mountain.width, from + chunkSize / 2)));
    const borders = [];
    for (let from = chunkSize; from < mountain.width; from += chunkSize) {
      if (zoneOf(from) !== zoneOf(from - chunkSize)) borders.push({ x: from, before: zoneOf(from - chunkSize), after: zoneOf(from) });
    }

    // surface colour fades into the next zone's colour over the last bit before a border
    const blend = 260;
    const surfaceColor = (x) => {
      const border = borders.find((b) => x > b.x - blend && x <= b.x);
      if (!border) return surfaceColors[zones[zoneOf(Math.floor(x / chunkSize) * chunkSize)].surface];
      const from = Phaser.Display.Color.ValueToColor(surfaceColors[zones[border.before].surface]);
      const to = Phaser.Display.Color.ValueToColor(surfaceColors[zones[border.after].surface]);
      const mix = Phaser.Display.Color.Interpolate.ColorWithColor(from, to, blend, x - (border.x - blend));
      return Phaser.Display.Color.GetColor(mix.r, mix.g, mix.b);
    };

    // each chunk is a tiled ground texture cut to the slope shape with a mask
    for (let from = 0; from < mountain.width; from += chunkSize) {
      const to = Math.min(mountain.width, from + chunkSize);
      const top = this.surfacePoints(from, to);
      const minY = Math.min(...top.map((p) => p.y));

      const shape = this.make.graphics({ add: false });
      shape.fillStyle(0xffffff);
      shape.fillPoints([...top, new Phaser.Math.Vector2(to, world.height), new Phaser.Math.Vector2(from, world.height)], true);

      const zone = zones[zoneOf(from)];
      const fill = this.add.tileSprite(from, minY, to - from + 2, world.height - minY, tex[zone.fill])
        .setOrigin(0, 0)
        .setTilePosition(from, minY)
        .setDepth(1);
      fill.setMask(shape.createGeometryMask());

      // the surface strip is drawn as long runs of one colour instead of one piece per segment, way cheaper to render
      const edge = this.add.graphics().setDepth(3);
      let run = [];
      let runColor = null;
      const flush = () => {
        if (run.length > 1) {
          edge.lineStyle(14, runColor).strokePoints(run.map((p) => new Phaser.Math.Vector2(p.x, p.y + 5)));
          edge.fillStyle(runColor).fillCircle(run[0].x, run[0].y + 5, 7).fillCircle(run[run.length - 1].x, run[run.length - 1].y + 5, 7);
          edge.lineStyle(3, 0x000000, 0.15).strokePoints(run.map((p) => new Phaser.Math.Vector2(p.x, p.y + 12)));
        }
        run = [];
        runColor = null;
      };
      for (let i = 1; i < top.length; i++) {
        const a = top[i - 1];
        const b = top[i];
        // no grass strip down the face of a rock wall
        if (Math.abs(b.y - a.y) > 30) {
          flush();
          continue;
        }
        const color = surfaceColor((a.x + b.x) / 2);
        if (color !== runColor) {
          flush();
          run.push(a);
          runColor = color;
        }
        run.push(b);
      }
      flush();

      this.chunks.push({ from, to, parts: [fill, edge] });
    }

    for (const border of borders) this.makeSeam(border);

    // everything below gets its own graphics and only draws while it's near the camera
    for (const patch of mountain.patches) {
      const g = this.add.graphics().setDepth(3);
      if (patch.kind === 'ice') this.drawIce(g, patch);
      else this.drawScree(g, patch);
      this.chunks.push({ from: patch.from - 20, to: patch.to + 20, parts: [g] });
    }

    for (const tree of mountain.trees) {
      this.add.image(tree.x, mountain.lineAt(tree.x) + 6, tex.pine).setOrigin(0.5, 1).setScale(tree.size).setDepth(2);
    }

    for (const boulder of mountain.boulders) {
      this.add.image(boulder.x, boulder.y, tex.boulder).setDisplaySize(boulder.r * 2, boulder.r * 2).setDepth(0);
    }

    const sink = { hut: 8, flowers: 5 };
    for (const item of mountain.decor) {
      if (item.kind === 'signpost') {
        this.chunks.push({ from: item.x - 20, to: item.x + 130, parts: this.drawSign(item.x, mountain.lineAt(item.x) + 6) });
        continue;
      }
      this.add.image(item.x, mountain.lineAt(item.x) + sink[item.kind], tex[item.kind])
        .setOrigin(0.5, 1)
        .setDepth(item.kind === 'flowers' ? 3.5 : 2);
    }

    for (const wall of mountain.walls) this.chunks.push({ from: wall.x - 60, to: wall.x + 140, parts: [this.drawWall(wall)] });

    this.makeCable();
  }

  // yellow alpine trail sign on a wooden post
  drawSign(x, groundY) {
    const g = this.add.graphics().setDepth(2);
    g.fillStyle(0x3d2b1f).fillRect(x - 4, groundY - 62, 8, 62);
    g.fillStyle(0x8b5a2b).fillRect(x - 2, groundY - 62, 4, 62);

    const board = (y, width) => {
      g.fillStyle(0x3d2b1f).fillPoints([
        { x: x - 8, y: y - 2 }, { x: x + width, y: y - 2 }, { x: x + width + 12, y: y + 8 },
        { x: x + width, y: y + 18 }, { x: x - 8, y: y + 18 },
      ], true);
      g.fillStyle(0xffd60a).fillPoints([
        { x: x - 6, y }, { x: x + width, y }, { x: x + width + 9, y: y + 8 }, { x: x + width, y: y + 16 }, { x: x - 6, y: y + 16 },
      ], true);
      g.fillStyle(0xfff3b0).fillRect(x - 6, y, width + 2, 2);
    };
    board(groundY - 60, 96);
    board(groundY - 38, 64);

    // red white red trail marker
    g.fillStyle(0xd62828).fillRect(x - 4, groundY - 16, 8, 3).fillRect(x - 4, groundY - 10, 8, 3);
    g.fillStyle(0xffffff).fillRect(x - 4, groundY - 13, 8, 3);

    const ink = { ...textStyle, fontSize: '8px', color: '#3d2b1f', strokeThickness: 0 };
    return [
      g,
      this.add.text(x, groundY - 56, 'ZUGSPITZE', ink).setDepth(2.1),
      this.add.text(x, groundY - 34, '2962 m', ink).setDepth(2.1),
    ];
  }

  // lumpy stack of rock chunks, drawn on the solid side of the wall so it matches where you bump
  drawWall(wall) {
    const { lineAt, progressAt } = this.mountain;
    const top = lineAt(wall.x);
    const bottom = lineAt(wall.x - 2);
    const zone = zoneAt(progressAt(wall.x));
    const [base, shade, light] = [
      [0x8a7a68, 0x4a3f35, 0xb3a28c],
      [0x949dab, 0x4f5666, 0xc9d0da],
      [0xa3b0c1, 0x5a6780, 0xe2e9f1],
    ][zone];
    let seed = wall.x;
    const rand = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };

    const g = this.add.graphics().setDepth(3.2);
    const depth = 36;
    g.fillStyle(0x000000, 0.18).fillEllipse(wall.x - 12, bottom + 2, 44, 8);

    // chunks with slanted joints, from the bottom up
    let low = bottom + 4;
    let lowRight = bottom + 4;
    while (low > top + 4) {
      const h = 12 + rand() * 22;
      const high = Math.max(top, low - h);
      const highRight = Math.max(top, lowRight - h + (rand() - 0.5) * 14);
      const left = wall.x - 3 + rand() * 7;
      const bulge = wall.x - 3 - rand() * 2;
      const mid = (low + high) / 2 + (rand() - 0.5) * 6;
      // the back of each chunk is ragged and a different length so it melts into the soil
      const reach = wall.x + 14 + rand() * (depth - 4);
      const backMid = (highRight + lowRight) / 2;
      const outer = [
        { x: left, y: low }, { x: bulge, y: mid }, { x: left + rand() * 3, y: high },
        { x: reach - 4 + rand() * 4, y: highRight }, { x: reach + 4 + rand() * 6, y: backMid },
        { x: reach - 6 + rand() * 4, y: lowRight },
      ];
      g.fillStyle(shade).fillPoints(outer, true);
      g.fillStyle(base).fillPoints([
        { x: left + 3, y: low - 3 }, { x: bulge + 4, y: mid }, { x: outer[2].x + 3, y: high + 3 },
        { x: outer[3].x - 3, y: highRight + 3 }, { x: outer[4].x - 4, y: backMid }, { x: outer[5].x - 3, y: lowRight - 3 },
      ], true);
      g.fillStyle(light).fillPoints([
        { x: outer[2].x + 3, y: high + 2 }, { x: outer[3].x - 3, y: highRight + 2 },
        { x: outer[3].x - 4, y: highRight + 4 }, { x: outer[2].x + 5, y: high + 4 },
      ], true);
      for (let i = 0; i < 4; i++) {
        g.fillStyle(i % 2 ? light : shade).fillRect(wall.x + 2 + rand() * (reach - wall.x - 8), high + 5 + rand() * Math.max(1, h - 10), 2, 2);
      }
      if (h > 20) g.fillStyle(shade).fillRect(wall.x + 4 + rand() * 18, mid - 6, 2, 10);
      g.lineStyle(2, 0x2b2d42, 0.75).lineBetween(left, low, bulge, mid).lineBetween(bulge, mid, outer[2].x, high);
      low = high;
      lowRight = highRight;
    }

    // stones stuck in the soil behind the wall, thinning out the further back they are
    for (let i = 0; i < 22; i++) {
      const x = wall.x + depth - 4 + Math.pow(rand(), 1.6) * 90;
      const y = top + 8 + rand() * (bottom - top + 10);
      if (y < lineAt(x) + 10) continue;
      const size = 2 + rand() * 4;
      g.fillStyle(shade).fillRect(x - 1, y - 1, size + 2, size * 0.7 + 2);
      g.fillStyle(rand() < 0.5 ? base : light).fillRect(x, y, size, size * 0.7);
    }

    // rubble at the foot
    for (let i = 0; i < 7; i++) {
      g.fillStyle(i % 2 ? base : shade).fillCircle(wall.x - 6 - rand() * 30, bottom + 1 - rand() * 2, 2 + rand() * 3);
    }

    // grass or snow lip with a few bits hanging over
    g.fillStyle(surfaceColors[zones[zone].surface]).fillRect(wall.x - 5, top - 3, depth + 8, 8);
    for (let i = 0; i < 4; i++) g.fillRect(wall.x - 4 + i * 5, top + 4, 2, 2 + rand() * 5);
    return g;
  }

  // hides the straight cut between two soil types behind a ragged pixel edge
  makeSeam(border) {
    const { lineAt } = this.mountain;
    const width = 240;
    const from = border.x - width;
    const step = 8;
    const snap = (v) => Math.round(v / step) * step;

    const edge = [];
    for (let y = world.height; ; y -= step) {
      const wobble = Math.sin(y / 53) * 55 + Math.sin(y / 19) * 22;
      const x = snap(border.x - width / 2 + wobble);
      if (y <= lineAt(x)) {
        edge.push(new Phaser.Math.Vector2(x, lineAt(x)));
        break;
      }
      edge.push(new Phaser.Math.Vector2(x, y));
    }

    const right = border.x + 16;
    const top = this.surfacePoints(edge[edge.length - 1].x, right);
    const minY = Math.min(...top.map((p) => p.y));
    const shape = this.make.graphics({ add: false });
    shape.fillStyle(0xffffff);
    shape.fillPoints([...top, new Phaser.Math.Vector2(right, world.height), ...edge], true);

    // loose crumbs of the new soil past the ragged edge
    for (let i = 0; i < 70; i++) {
      const x = snap(from + Math.random() * width * 0.7);
      const y = snap(lineAt(x) + 14 + Math.random() * 500);
      shape.fillRect(x, y, step, step);
    }

    const fill = this.add.tileSprite(from, minY, width + 16, world.height - minY, tex[zones[border.after].fill])
      .setOrigin(0, 0)
      .setTilePosition(from, minY)
      .setDepth(1.1);
    fill.setMask(shape.createGeometryMask());
    this.chunks.push({ from, to: right, parts: [fill] });
  }

  makeCable() {
    const { pylons, lineAt } = this.mountain;
    if (!pylons.length) return;

    // cables hang off the tips of the crossarm, 13px down from the top of the sprite
    const tops = pylons.map((x) => {
      const base = lineAt(x) + 10;
      this.add.image(x, base, tex.cablePylon).setOrigin(0.5, 1).setDepth(0.5);
      return { x, y: base - 120 + 13 };
    });

    // anchor both ends in the ground so the line doesnt stop in mid air
    const first = pylons[0] - 260;
    const last = pylons[pylons.length - 1] + 260;
    const route = [{ x: first, y: lineAt(first) }, ...tops, { x: last, y: lineAt(last) }];

    // one graphics per span so only the spans on screen get drawn
    for (let i = 1; i < route.length; i++) {
      const a = route[i - 1];
      const b = route[i];
      const span = this.add.graphics().setDepth(0.6);
      span.lineStyle(2, 0x2b2d42, 0.9);
      for (const [side, sagSize] of [[-12, 50], [13, 60]]) {
        const ax = i === 1 ? a.x : a.x + side;
        const bx = i === route.length - 1 ? b.x : b.x + side;
        const sag = i === 1 || i === route.length - 1 ? 10 : sagSize;
        const points = [];
        for (let t = 0; t <= 1.001; t += 0.05) {
          points.push(new Phaser.Math.Vector2(ax + (bx - ax) * t, a.y + (b.y - a.y) * t + Math.sin(t * Math.PI) * sag));
        }
        span.strokePoints(points);
      }
      this.chunks.push({ from: a.x - 20, to: b.x + 20, parts: [span] });
    }
  }

  makeCritters() {
    this.enemies = this.mountain.enemies.map((data) => new Enemy(this, this.mountain, data));
    this.pickups = this.mountain.pickups.map((data) => new Pickup(this, this.mountain, data));
    this.snowballs = [];
  }

  makeEffects() {
    const orDot = (key) => (this.textures.exists(key) ? key : tex.dot);

    this.dust = this.add.particles(0, 0, orDot(tex.dust), {
      speed: { min: 30, max: 110 },
      angle: { min: 200, max: 340 },
      gravityY: 300,
      lifespan: 450,
      scale: { start: 1, end: 0.2 },
      alpha: { start: 1, end: 0 },
      emitting: false,
    }).setDepth(9);

    this.sparkle = this.add.particles(0, 0, orDot(tex.sparkle), {
      speed: { min: 20, max: 60 },
      lifespan: 500,
      scale: { start: 1, end: 0 },
      rotate: { min: 0, max: 90 },
      tint: [0xffd60a, 0xffffff],
      frequency: 40,
      emitting: false,
    }).setDepth(9);
    this.sparkle.startFollow(this.player.sprite, 0, -24);

    this.events.on('slip', () => {
      sfx.slip();
      this.puff(this.player.x, this.player.y, 0xcaf0f8, 10);
    });
    let nextBonk = 0;
    const bonk = () => {
      if (this.time.now < nextBonk) return;
      nextBonk = this.time.now + 400;
      sfx.rock();
      this.puff(this.player.x, this.player.y - 20, 0x8d99ae, 6);
    };
    this.events.on('bonk', bonk);
    this.events.once('shutdown', () => this.events.off('bonk', bonk));
  }

  // first time you reach a wall without enough spring, tell them about charging
  checkWallHint() {
    if (this.wallHinted) return;
    const player = this.player;
    const wall = this.mountain.walls.find((w) => player.x > w.from - 60 && player.x < w.x);
    if (!wall) return;
    const normal = pogo.minBounce + (pogo.maxBounce - pogo.minBounce) * player.spring;
    if (normal >= wall.h + 10 || player.supercharged) return;
    this.wallHinted = true;
    this.message('HOLD SPACE TO CHARGE!', '#caf0f8');
  }

  puff(x, y, color, count = 6) {
    this.dust.setParticleTint(color);
    this.dust.explode(count, x, y);
  }

  splat(x, y) {
    this.puff(x, y, 0xffffff, 4);
    if (!this.textures.exists(tex.splat)) return;
    const mark = this.add.image(x, y, tex.splat).setOrigin(0.5, 1).setDepth(4);
    this.tweens.add({ targets: mark, alpha: 0, delay: 600, duration: 500, onComplete: () => mark.destroy() });
  }

  floatText(x, y, text, color = '#ffffff') {
    const label = this.add.text(x, y, text, { ...textStyle, fontSize: '16px', color }).setOrigin(0.5).setDepth(25);
    this.tweens.add({ targets: label, y: y - 40, alpha: 0, duration: 900, onComplete: () => label.destroy() });
  }

  throwSnowball(tourist) {
    const player = this.player;
    const fromY = tourist.y - 30;
    const time = Phaser.Math.Clamp(Math.abs(player.x - tourist.x) / 340, 0.4, 1.1);
    // aim a bit ahead of where you're going
    const dx = player.x + player.vx * time * 0.8 - tourist.x;
    const dy = player.y - 22 - fromY;
    const sprite = this.add.image(tourist.x, fromY, tex.snowball).setDepth(9);
    this.snowballs.push({ sprite, x: tourist.x, y: fromY, vx: dx / time, vy: (dy - 300 * time * time) / time, age: 0 });
    sfx.throwBall();
  }

  stomp(enemy) {
    enemy.squash();
    this.player.stomp();
    this.run.stomps += 1;
    sfx.stomp();
    this.puff(enemy.x, enemy.y - 10, 0xffffff, 14);
    this.floatText(enemy.x, enemy.y - 40, '+SPRING', '#80ed99');
  }

  grab(pickup) {
    const player = this.player;
    pickup.take();
    if (pickup.kind === 'pretzel') {
      player.supercharge();
      sfx.power();
      this.message('SUPERCHARGED!', '#ffd60a');
    } else {
      player.addSpring(pickups[pickup.kind].spring);
      sfx.pickup();
      this.floatText(pickup.x, pickup.y - 20, pickup.kind === 'golden' ? 'FULL SPRING!' : '+SPRING', '#ffd60a');
    }
  }

  updateCritters(dt) {
    const player = this.player;
    const me = player.bounds;
    const overlaps = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;

    for (const enemy of this.enemies) {
      enemy.update(dt, player);
      if (enemy.dead || player.mode === 'done' || !overlaps(me, enemy.bounds)) continue;
      if (player.mode === 'air' && player.vy > 0 && player.y < enemy.bounds.top + 16) this.stomp(enemy);
      else if (player.hurt(enemy.x, enemy.kind === 'yeti' ? pogo.yetiDrain : pogo.hitDrain)) this.floatText(player.x, player.y - 60, '-SPRING', '#ef476f');
    }

    for (const pickup of this.pickups) {
      if (!pickup.taken && player.mode !== 'done' && pickup.touches(player)) this.grab(pickup);
    }

    for (const ball of this.snowballs) {
      ball.age += dt;
      ball.vy += 600 * dt;
      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;
      ball.sprite.setPosition(ball.x, ball.y);

      const hitPlayer = Math.abs(ball.x - player.x) < 12 && ball.y > me.top && ball.y < me.bottom;
      if (hitPlayer && player.hurt(ball.x, pogo.snowballDrain)) this.floatText(player.x, player.y - 60, 'SPLAT!', '#caf0f8');
      if (hitPlayer || ball.age > 3 || ball.y > this.mountain.heightAt(ball.x)) {
        this.splat(ball.x, Math.min(ball.y, this.mountain.heightAt(ball.x)));
        ball.sprite.destroy();
        ball.done = true;
      }
    }
    this.snowballs = this.snowballs.filter((ball) => !ball.done);

    if (player.supercharged !== this.sparkle.emitting) {
      if (player.supercharged) this.sparkle.start();
      else this.sparkle.stop();
    }
  }

  // thickness that fades out at both ends so patches melt into the ground
  taper(points, thickness) {
    return points.map((p, i) => thickness * Math.sqrt(Math.sin((i / (points.length - 1)) * Math.PI)));
  }

  sheet(g, points, depths, offset = 0) {
    const top = points.map((p) => new Phaser.Math.Vector2(p.x, p.y + offset));
    const bottom = points.map((p, i) => new Phaser.Math.Vector2(p.x, p.y + offset + depths[i])).reverse();
    g.fillPoints([...top, ...bottom], true);
  }

  drawIce(g, patch) {
    const points = this.surfacePoints(patch.from, patch.to);
    const depths = this.taper(points, 20);

    g.fillStyle(0x5fa8d3, 0.55);
    this.sheet(g, points, depths.map((d) => d + 4), -2);
    g.fillStyle(0xbde6f5, 0.95);
    this.sheet(g, points, depths, -3);
    g.fillStyle(0xf1fbff, 0.9);
    this.sheet(g, points, this.taper(points, 4), -3);

    // shine streaks
    g.fillStyle(0xffffff, 0.9);
    for (let i = 2; i < points.length - 2; i += 4) {
      const p = points[i];
      const d = depths[i];
      if (d < 8) continue;
      g.fillRect(p.x - 4, p.y + d * 0.35, 8, 2);
      g.fillRect(p.x + 2, p.y + d * 0.35 + 3, 4, 2);
    }
  }

  drawScree(g, patch) {
    const points = this.surfacePoints(patch.from, patch.to);
    const depths = this.taper(points, 12);

    g.fillStyle(0x6b5a48, 0.9);
    this.sheet(g, points, depths, -1);
    for (let i = 1; i < points.length - 1; i++) {
      const p = points[i];
      const size = depths[i] * 0.7;
      if (size < 3) continue;
      const shift = ((i * 7) % 5) - 2;
      g.fillStyle(i % 2 ? 0x8a7560 : 0xa39171);
      g.fillTriangle(p.x + shift - size, p.y + 3, p.x + shift, p.y - size, p.x + shift + size * 0.8, p.y + 3);
      g.fillStyle(0x4a3f35);
      g.fillRect(p.x + shift - 1, p.y + 1, 3, 2);
    }
  }

  makeSummit() {
    const summit = this.mountain.summit;
    drawCross(this, summit.x + 260, summit.y, 1.4).setDepth(2);
    this.yeti = this.add.image(summit.x + 420, summit.y + 4, tex.yeti).setOrigin(0.5, 1).setScale(3).setFlipX(true).setDepth(4);
  }

  onLand(surface) {
    const player = this.player;
    if (player.mode !== 'air') return;

    if (!this.run.started) {
      this.run.started = true;
      this.message('BOUNCE BACK!');
    }
    if (surface === 'summit') {
      this.finish();
      return;
    }

    if (surface === 'rock' && !player.supercharged) {
      player.addSpring(-pogo.rockDrain);
      sfx.rock();
      this.cameras.main.shake(120, 0.004);
      this.puff(player.x, player.y, 0x8a7560, 10);
      this.floatText(player.x, player.y - 60, 'OUCH -SPRING', '#ef476f');
    } else {
      this.puff(player.x, player.y, surfaceColors[surface] ?? 0xffffff);
    }
    player.land(surface);
  }

  finish() {
    if (this.run.done) return;
    this.run.done = true;
    this.player.finish();
    sfx.fanfare();
    this.message('YOU MADE IT!');
    this.time.delayedCall(2200, () => {
      const result = { time: this.run.time, stomps: this.run.stomps, kick: this.kick };
      if (this.scene.manager.keys.End) this.scene.start('End', result);
      else this.scene.restart({ kick: this.kick });
    });
  }

  message(text, color) {
    this.events.emit('message', text, color);
  }

  updateProgress() {
    const { bottomY, summit, progressAt } = this.mountain;
    this.progress = progressAt(this.player.x);
    this.height = Phaser.Math.Clamp((bottomY - this.player.y) / (bottomY - summit.y), 0, 1);
  }

  checkZone() {
    const zone = zoneAt(this.progress);
    if (zone <= this.run.topZone) return;
    if (this.run.topZone >= 0) this.message(zones[zone].name, '#caf0f8');
    this.run.topZone = zone;
  }

  updateBackground() {
    const cam = this.cameras.main;
    const sky = Phaser.Display.Color.Interpolate.ColorWithColor(lowSky, highSky, 100, this.height * 100);
    cam.setBackgroundColor(Phaser.Display.Color.GetColor(sky.r, sky.g, sky.b));
    this.farHills.tilePositionX = cam.scrollX * 0.08;
    this.nearHills.tilePositionX = cam.scrollX * 0.2;
    this.farHills.y = gameHeight + this.height * 200;
    this.nearHills.y = gameHeight + this.height * 380;
    this.snow.frequency = 220 - this.height * 170;

    // only draw the chunks near the camera
    const left = cam.scrollX - 100;
    const right = cam.scrollX + gameWidth + 100;
    for (const chunk of this.chunks) {
      const visible = chunk.to > left && chunk.from < right;
      chunk.parts.forEach((part) => part.setVisible(visible));
    }
  }

  update(time, delta) {
    const dt = Math.min(delta, 50) / 1000;
    const k = this.keys;
    const controls = this.player.controls;
    controls.left = k.LEFT.isDown || k.A.isDown || this.touch.left;
    controls.right = k.RIGHT.isDown || k.D.isDown || this.touch.right;
    controls.jump = k.SPACE.isDown || k.UP.isDown || k.W.isDown || this.touch.jump;

    this.player.update(dt);
    this.updateCritters(dt);
    if (this.player.mode === 'skid') this.puff(this.player.x, this.player.y, 0xe0f7ff, 1);
    if (this.run.started && !this.run.done) this.run.time += dt;

    this.updateProgress();
    this.updateBackground();
    this.checkZone();
    this.checkWallHint();
  }
}
