import Phaser from 'phaser';
import { world, gameWidth, gameHeight } from '../config.js';
import { tex, drawCross } from '../assets.js';
import { buildMountain, zones, zoneAt } from '../level/mountain.js';
import Player from '../objects/Player.js';
import { sfx } from '../sfx.js';

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

    const cam = this.cameras.main;
    cam.setBounds(0, 0, mountain.width, world.height);
    cam.startFollow(this.player.sprite, true, 0.1, 0.1);
    cam.setFollowOffset(-180, 60);
    cam.setDeadzone(60, 60);
    cam.centerOn(startX + 180, this.player.y);

    this.keys = this.input.keyboard.addKeys('LEFT,RIGHT,UP,A,D,W,SPACE,M');
    this.keys.M.on('down', () => sfx.toggleMute());
    this.input.keyboard.on('keydown', () => sfx.unlock());

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
    const { heightAt, spacing } = this.mountain;
    const points = [];
    for (let x = from; x <= to; x += spacing) points.push(new Phaser.Math.Vector2(x, heightAt(x)));
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
      const points = this.surfacePoints(patch.from, patch.to);
      patches.lineStyle(14, surfaceColors[patch.kind]);
      patches.strokePoints(points.map((p) => new Phaser.Math.Vector2(p.x, p.y + 5)));
      if (patch.kind === 'ice') {
        patches.fillStyle(0xffffff, 0.8);
        for (let i = 1; i < points.length; i += 3) patches.fillRect(points[i].x, points[i].y + 2, 6, 2);
      } else {
        patches.fillStyle(0x5e503f);
        for (const p of points) patches.fillTriangle(p.x - 6, p.y + 2, p.x, p.y - 7, p.x + 6, p.y + 2);
      }
    }

    for (const tree of mountain.trees) {
      this.add.image(tree.x, mountain.heightAt(tree.x) + 6, tex.pine).setOrigin(0.5, 1).setScale(tree.size).setDepth(2);
    }

    for (const boulder of mountain.boulders) {
      this.add.image(boulder.x, boulder.y, tex.boulder).setDisplaySize(boulder.r * 2, boulder.r * 2).setDepth(4);
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
    controls.left = k.LEFT.isDown || k.A.isDown;
    controls.right = k.RIGHT.isDown || k.D.isDown;
    controls.jump = k.SPACE.isDown || k.UP.isDown || k.W.isDown;

    this.player.update(dt);
    if (this.run.started && !this.run.done) this.run.time += dt;

    this.updateProgress();
    this.updateBackground();
    this.checkZone();
  }
}
