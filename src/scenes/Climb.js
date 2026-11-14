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

    // each chunk is a tiled ground texture cut to the slope shape with a mask
    for (let from = 0; from < mountain.width; from += chunkSize) {
      const to = Math.min(mountain.width, from + chunkSize);
      const top = this.surfacePoints(from, to);
      const minY = Math.min(...top.map((p) => p.y));

      const shape = this.make.graphics({ add: false });
      shape.fillStyle(0xffffff);
      shape.fillPoints([...top, new Phaser.Math.Vector2(to, world.height), new Phaser.Math.Vector2(from, world.height)], true);

      const zone = zones[zoneAt(mountain.progressAt((from + to) / 2))];
      const fill = this.add.tileSprite(from, minY, to - from + 2, world.height - minY, tex[zone.fill]).setOrigin(0, 0).setDepth(1);
      fill.setMask(shape.createGeometryMask());

      const edge = this.add.graphics().setDepth(3);
      edge.lineStyle(14, surfaceColors[zone.surface]);
      edge.strokePoints(top.map((p) => new Phaser.Math.Vector2(p.x, p.y + 5)));
      edge.lineStyle(3, 0x000000, 0.15);
      edge.strokePoints(top.map((p) => new Phaser.Math.Vector2(p.x, p.y + 12)));

      this.chunks.push({ from, to, parts: [fill, edge] });
    }

    const patches = this.add.graphics().setDepth(3);
    for (const patch of mountain.patches) {
      if (patch.kind === 'ice') this.drawIce(patches, patch);
      else this.drawScree(patches, patch);
    }

    for (const tree of mountain.trees) {
      this.add.image(tree.x, mountain.lineAt(tree.x) + 6, tex.pine).setOrigin(0.5, 1).setScale(tree.size).setDepth(2);
    }

    for (const boulder of mountain.boulders) {
      this.add.image(boulder.x, boulder.y, tex.boulder).setDisplaySize(boulder.r * 2, boulder.r * 2).setDepth(0);
    }
  }

  makeCritters() {
    this.enemies = this.mountain.enemies.map((data) => new Enemy(this, this.mountain, data));
    this.pickups = this.mountain.pickups.map((data) => new Pickup(this, this.mountain, data));
    this.snowballs = [];
  }

  makeEffects() {
    this.dust = this.add.particles(0, 0, tex.dot, {
      speed: { min: 30, max: 110 },
      angle: { min: 200, max: 340 },
      gravityY: 300,
      lifespan: 450,
      scale: { start: 0.9, end: 0 },
      emitting: false,
    }).setDepth(9);

    this.sparkle = this.add.particles(0, 0, tex.dot, {
      speed: { min: 20, max: 60 },
      lifespan: 500,
      scale: { start: 0.8, end: 0 },
      tint: [0xffd60a, 0xffffff],
      frequency: 40,
      emitting: false,
    }).setDepth(9);
    this.sparkle.startFollow(this.player.sprite, 0, -24);

    this.events.on('slip', () => {
      sfx.slip();
      this.puff(this.player.x, this.player.y, 0xcaf0f8, 10);
    });
  }

  puff(x, y, color, count = 6) {
    this.dust.setParticleTint(color);
    this.dust.explode(count, x, y);
  }

  floatText(x, y, text, color = '#ffffff') {
    const label = this.add.text(x, y, text, { ...textStyle, fontSize: '16px', color }).setOrigin(0.5).setDepth(25);
    this.tweens.add({ targets: label, y: y - 40, alpha: 0, duration: 900, onComplete: () => label.destroy() });
  }

  throwSnowball(tourist) {
    const player = this.player;
    const fromY = tourist.y - 30;
    const dx = player.x - tourist.x;
    const dy = player.y - 22 - fromY;
    const time = Phaser.Math.Clamp(Math.abs(dx) / 260, 0.5, 1.4);
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
        this.puff(ball.x, ball.y, 0xffffff, 6);
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
  }
}
