import Phaser from 'phaser';
import { gameWidth, gameHeight } from '../config.js';
import { tex, drawCross } from '../assets.js';
import { formatTime, textStyle } from '../util.js';
import { sfx } from '../sfx.js';

const groundY = 430;
const playerX = 540;
const yetiX = 660;
const yetiHeight = 140;
const bestKey = 'zugspitzeBest';
const sunsetBands = [0x355070, 0x6d597a, 0xb56576, 0xe56b6f, 0xeaac8b, 0xf6bd60];

export default class End extends Phaser.Scene {
  constructor() {
    super('End');
  }

  init(data) {
    this.result = {
      time: data.time ?? 0,
      stomps: data.stomps ?? 0,
      kick: data.kick ?? 0.5,
    };
    this.ready = false;
    this.prosted = false;
  }

  create() {
    this.makeSky();
    this.makeSummit();
    this.makeMugs();
    this.saveBest();

    this.cameras.main.fadeIn(500, 255, 255, 255);
    this.input.keyboard.on('keydown-SPACE', () => {
      if (this.ready) this.scene.start('Intro');
    });
  }

  makeSky() {
    const bandHeight = 70;
    const sky = this.add.graphics();
    sunsetBands.forEach((color, i) => sky.fillStyle(color).fillRect(0, i * bandHeight, gameWidth, bandHeight));
    sky.fillStyle(0xf6bd60).fillRect(0, sunsetBands.length * bandHeight, gameWidth, gameHeight);
    sky.fillStyle(0xffe8a3).fillCircle(260, 330, 70);

    this.add.tileSprite(0, gameHeight + 40, gameWidth, 360, tex.farHills).setOrigin(0, 1).setTint(0xd8a7b1);
    this.add.tileSprite(0, gameHeight + 110, gameWidth, 260, tex.nearHills).setOrigin(0, 1).setTilePosition(300, 0).setTint(0x9c7a97);

    for (let i = 0; i < 5; i++) {
      this.add.image(Phaser.Math.Between(0, gameWidth), Phaser.Math.Between(40, 260), tex.cloud)
        .setScale(Phaser.Math.FloatBetween(0.6, 1.2))
        .setAlpha(0.7)
        .setTint(0xffc9b9);
    }
  }

  makeSummit() {
    const top = [
      [-10, 560], [60, 520], [130, 534], [200, 488], [260, 470], [320, 446], [380, groundY], [gameWidth + 10, groundY],
    ].map(([x, y]) => new Phaser.Math.Vector2(x, y));

    const shape = this.make.graphics({ add: false });
    shape.fillStyle(0xffffff);
    shape.fillPoints([...top, new Phaser.Math.Vector2(gameWidth + 10, gameHeight), new Phaser.Math.Vector2(-10, gameHeight)], true);
    this.add.tileSprite(0, 400, gameWidth, gameHeight - 400, tex.groundGlacier)
      .setOrigin(0, 0)
      .setTint(0xf2c4b8)
      .setMask(shape.createGeometryMask());

    const edge = this.add.graphics();
    edge.lineStyle(14, 0xffe3d3);
    edge.strokePoints(top.map((p) => new Phaser.Math.Vector2(p.x, p.y + 5)));
    edge.lineStyle(3, 0x000000, 0.15);
    edge.strokePoints(top.map((p) => new Phaser.Math.Vector2(p.x, p.y + 12)));

    drawCross(this, 850, groundY, 1.6);
    this.add.particles(850, groundY - 75, tex.dot, {
      x: { min: -40, max: 40 },
      y: { min: -40, max: 40 },
      lifespan: 900,
      scale: { start: 0.8, end: 0 },
      tint: 0xffd60a,
      frequency: 260,
    });

    const yetiKey = this.textures.exists('yetiBig') ? 'yetiBig' : tex.yeti;
    this.yeti = this.add.image(yetiX, groundY + 4, yetiKey).setOrigin(0.5, 1).setFlipX(true).setDepth(4);
    this.yeti.setScale(Math.max(1, Math.round(yetiHeight / this.yeti.height)));
    this.tweens.add({ targets: this.yeti, scaleY: this.yeti.scaleY * 1.03, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    this.player = this.add.sprite(playerX, groundY + 4, tex.player).setOrigin(0.5, 1).setDepth(5);
    this.tweens.add({ targets: this.player, y: groundY - 10, duration: 320, yoyo: true, repeat: -1, ease: 'Quad.out' });
  }

  makeMugs() {
    const handY = groundY - this.yeti.displayHeight * 0.45;
    const meetX = (playerX + yetiX) / 2;
    const meetY = handY - 20;

    const mugLeft = this.add.image(playerX + 18, groundY - 34, tex.beer).setFlipX(true).setDepth(6);
    const mugRight = this.add.image(yetiX - this.yeti.displayWidth * 0.4, handY, tex.beer).setScale(2).setDepth(6);

    this.foam = this.add.particles(0, 0, tex.dot, {
      speed: { min: 60, max: 200 },
      angle: { min: 200, max: 340 },
      gravityY: 500,
      lifespan: 800,
      scale: { start: 1, end: 0.2 },
      tint: [0xffffff, 0xfff3d6],
      emitting: false,
    }).setDepth(7);

    this.tweens.add({
      targets: mugLeft,
      x: meetX - 14,
      y: meetY + 8,
      angle: 25,
      duration: 500,
      delay: 900,
      ease: 'Back.in',
      yoyo: true,
      hold: 150,
      repeat: -1,
      repeatDelay: 1800,
    });
    this.tweens.add({
      targets: mugRight,
      x: meetX + 22,
      y: meetY,
      angle: -25,
      duration: 500,
      delay: 900,
      ease: 'Back.in',
      yoyo: true,
      hold: 150,
      repeat: -1,
      repeatDelay: 1800,
      onYoyo: () => this.clink(meetX, meetY - 20),
    });
  }

  clink(x, y) {
    sfx.clink();
    this.foam.explode(24, x, y);
    this.cameras.main.shake(120, 0.004);
    if (this.prosted) return;

    this.prosted = true;
    sfx.fanfare();
    const prost = this.add.text(gameWidth / 2, 80, 'PROST!', { ...textStyle, fontSize: '64px', color: '#ffd60a', strokeThickness: 10 })
      .setOrigin(0.5)
      .setDepth(30)
      .setScale(0);
    this.tweens.add({ targets: prost, scale: 1, angle: { from: -12, to: -4 }, duration: 450, ease: 'Back.out' });
    this.tweens.add({ targets: prost, scale: 1.08, duration: 500, delay: 450, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.time.delayedCall(600, () => this.showResults());
  }

  saveBest() {
    const time = this.result.time;
    let saved = 0;
    try {
      saved = Number(localStorage.getItem(bestKey)) || 0;
    } catch {}

    this.newBest = time > 0 && (!saved || time < saved);
    this.best = this.newBest ? time : saved || null;
    if (this.newBest) {
      try {
        localStorage.setItem(bestKey, String(time));
      } catch {}
    }
  }

  showResults() {
    const { time, stomps, kick } = this.result;
    const rows = [
      ['time', formatTime(time)],
      ['stomps', String(stomps)],
      ['kick', `${Math.round(kick * 100)}%`],
      ['best', this.best === null ? '--:--.--' : formatTime(this.best)],
    ];

    const left = 40;
    const top = 150;
    const panel = this.add.graphics().setDepth(20).setAlpha(0);
    panel.fillStyle(0x1b263b, 0.75).fillRoundedRect(left, top, 300, 190, 10);
    this.tweens.add({ targets: panel, alpha: 1, duration: 250 });

    rows.forEach(([name, value], i) => {
      const y = top + 22 + i * 40;
      const label = this.add.text(left + 20, y, name, { ...textStyle, color: '#caf0f8' }).setDepth(21);
      const number = this.add.text(left + 280, y, value, textStyle).setOrigin(1, 0).setDepth(21);
      [label, number].forEach((text) => {
        text.setAlpha(0).x -= 20;
        this.tweens.add({ targets: text, alpha: 1, x: '+=20', duration: 250, delay: 300 + i * 250 });
      });
      this.time.delayedCall(300 + i * 250, () => sfx.tick());
    });

    const done = 300 + rows.length * 250;
    if (this.newBest) {
      const banner = this.add.text(left + 150, top + 220, 'NEW BEST!', { ...textStyle, fontSize: '24px', color: '#80ed99', strokeThickness: 6 })
        .setOrigin(0.5)
        .setDepth(21)
        .setScale(0);
      this.tweens.add({ targets: banner, scale: 1, duration: 400, delay: done, ease: 'Back.out' });
      this.tweens.add({ targets: banner, angle: { from: -4, to: 4 }, duration: 300, delay: done + 400, yoyo: true, repeat: -1 });
    }

    this.time.delayedCall(done + 400, () => {
      this.ready = true;
      const again = this.add.text(gameWidth / 2, 505, 'press SPACE to go again', textStyle).setOrigin(0.5).setDepth(21);
      this.tweens.add({ targets: again, alpha: 0.2, duration: 600, yoyo: true, repeat: -1 });
    });
  }
}
