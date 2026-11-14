import Phaser from 'phaser';
import { world, gameWidth, gameHeight } from '../config.js';
import { tex, drawCross } from '../assets.js';
import { textStyle } from '../util.js';
import { sfx } from '../sfx.js';

const groundY = 430;
const yetiX = 660;
const playerX = 560;
const yetiHeight = 140;
const needleSpeed = 4.2;
const meterX = 280;
const meterY = 150;
const meterWidth = 400;
const meterBands = [0x80ed99, 0xc5e17a, 0xffd166, 0xf8961e, 0xef476f];

export default class Intro extends Phaser.Scene {
  constructor() {
    super('Intro');
  }

  create() {
    this.step = 'title';
    this.kick = 0;
    this.meterTime = 0;
    this.band = 0;

    this.makeBackground();
    this.makeSummit();
    this.makeTitle();

    this.input.keyboard.on('keydown-SPACE', this.onSpace, this);
    this.input.keyboard.on('keydown', () => sfx.unlock());
  }

  makeBackground() {
    this.cameras.main.setBackgroundColor(0x6fb3dc);
    this.add.tileSprite(0, gameHeight + 40, gameWidth, 360, tex.farHills).setOrigin(0, 1);
    this.add.tileSprite(0, gameHeight + 110, gameWidth, 260, tex.nearHills).setOrigin(0, 1).setTilePosition(300, 0);

    this.clouds = [];
    for (let i = 0; i < 6; i++) {
      const cloud = this.add.image(i * 180 + Phaser.Math.Between(0, 80), Phaser.Math.Between(40, 300), tex.cloud)
        .setScale(Phaser.Math.FloatBetween(0.6, 1.3))
        .setAlpha(Phaser.Math.FloatBetween(0.5, 0.9));
      cloud.speed = Phaser.Math.Between(6, 16);
      this.clouds.push(cloud);
    }

    this.add.particles(0, 0, tex.dot, {
      x: { min: 0, max: gameWidth + 200 },
      y: -8,
      lifespan: 12000,
      speedY: { min: 25, max: 60 },
      speedX: { min: -40, max: -5 },
      scale: { min: 0.3, max: 0.8 },
      alpha: { start: 0.9, end: 0.3 },
      frequency: 160,
    }).setDepth(20);
  }

  makeSummit() {
    const top = [
      [-10, 560], [60, 520], [130, 534], [200, 488], [260, 470], [320, 446], [380, groundY], [gameWidth + 10, groundY],
    ].map(([x, y]) => new Phaser.Math.Vector2(x, y));

    const shape = this.make.graphics({ add: false });
    shape.fillStyle(0xffffff);
    shape.fillPoints([...top, new Phaser.Math.Vector2(gameWidth + 10, gameHeight), new Phaser.Math.Vector2(-10, gameHeight)], true);
    this.add.tileSprite(0, 400, gameWidth, gameHeight - 400, tex.groundGlacier).setOrigin(0, 0).setMask(shape.createGeometryMask());

    const edge = this.add.graphics();
    edge.lineStyle(14, 0xffffff);
    edge.strokePoints(top.map((p) => new Phaser.Math.Vector2(p.x, p.y + 5)));
    edge.lineStyle(3, 0x000000, 0.15);
    edge.strokePoints(top.map((p) => new Phaser.Math.Vector2(p.x, p.y + 12)));

    drawCross(this, 850, groundY, 1.6);

    const yetiKey = this.textures.exists('yetiBig') ? 'yetiBig' : tex.yeti;
    this.yeti = this.add.image(yetiX, groundY + 4, yetiKey).setOrigin(0.5, 1).setFlipX(true).setDepth(4);
    this.yeti.setScale(Math.max(1, Math.round(yetiHeight / this.yeti.height)));
    this.tweens.add({ targets: this.yeti, scaleY: this.yeti.scaleY * 1.03, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    this.player = this.add.sprite(playerX, groundY + 4, tex.player).setOrigin(0.5, 1).setDepth(5);
    this.hop = this.tweens.add({ targets: this.player, y: groundY - 14, duration: 260, yoyo: true, repeat: -1, ease: 'Quad.out' });

    this.dust = this.add.particles(0, 0, tex.dot, {
      speed: { min: 60, max: 200 },
      angle: { min: 180, max: 360 },
      lifespan: 500,
      scale: { start: 1, end: 0 },
      tint: [0xffffff, 0xcfe2f3],
      emitting: false,
    }).setDepth(6);
  }

  makeTitle() {
    this.title = this.add.text(gameWidth / 2, 90, 'ZUGSPITZE POGO', { ...textStyle, fontSize: '48px', strokeThickness: 8 })
      .setOrigin(0.5)
      .setDepth(30);
    this.prompt = this.add.text(gameWidth / 2, 160, 'press SPACE', { ...textStyle }).setOrigin(0.5).setDepth(30);
    this.tweens.add({ targets: this.title, y: 100, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.tweens.add({ targets: this.prompt, alpha: 0.2, duration: 600, yoyo: true, repeat: -1 });
  }

  onSpace() {
    if (this.step === 'title') this.yell();
    else if (this.step === 'meter') this.stopMeter();
  }

  yell() {
    this.step = 'yell';
    this.tweens.killTweensOf([this.title, this.prompt]);
    this.tweens.add({ targets: [this.title, this.prompt], alpha: 0, y: '-=40', duration: 300 });

    const text = this.add.text(0, 0, 'GET OFF MY MOUNTAIN!', { ...textStyle, color: '#1b263b', strokeThickness: 0 })
      .setOrigin(0.5);
    const width = text.width + 40;
    const height = text.height + 28;
    const bubble = this.add.graphics();
    bubble.fillStyle(0xffffff).lineStyle(4, 0x1b263b);
    bubble.fillRoundedRect(-width / 2, -height / 2, width, height, 12).strokeRoundedRect(-width / 2, -height / 2, width, height, 12);
    bubble.fillTriangle(width / 2 - 70, height / 2 - 2, width / 2 - 30, height / 2 - 2, width / 2 - 10, height / 2 + 30);
    bubble.lineBetween(width / 2 - 30, height / 2, width / 2 - 10, height / 2 + 30);
    bubble.lineBetween(width / 2 - 70, height / 2, width / 2 - 10, height / 2 + 30);

    this.bubble = this.add.container(yetiX - 170, groundY - this.yeti.displayHeight - 70, [bubble, text]).setDepth(30).setScale(0);
    this.tweens.add({ targets: this.bubble, scale: 1, duration: 300, ease: 'Back.out' });
    this.tweens.add({
      targets: this.yeti,
      angle: { from: -4, to: 4 },
      duration: 70,
      yoyo: true,
      repeat: 5,
      onComplete: () => this.yeti.setAngle(0),
    });
    this.cameras.main.shake(400, 0.006);
    sfx.kick();

    this.time.delayedCall(1700, () => {
      this.tweens.add({ targets: this.bubble, scale: 0, duration: 200, ease: 'Back.in' });
      this.showMeter();
    });
  }

  showMeter() {
    this.step = 'meter';
    const bandWidth = meterWidth / meterBands.length;
    const bar = this.add.graphics();
    bar.fillStyle(0x1b263b).fillRect(meterX - 6, meterY - 6, meterWidth + 12, 40);
    meterBands.forEach((color, i) => bar.fillStyle(color).fillRect(meterX + i * bandWidth, meterY, bandWidth, 28));

    this.needle = this.add.graphics();
    this.needle.fillStyle(0xffffff).lineStyle(3, 0x1b263b);
    this.needle.fillTriangle(-12, -26, 12, -26, 0, -6).strokeTriangle(-12, -26, 12, -26, 0, -6);
    this.needle.fillRect(-2, -6, 4, 40).strokeRect(-2, -6, 4, 40);
    this.needle.setPosition(meterX, meterY);

    const label = this.add.text(gameWidth / 2, meterY - 76, 'KICK POWER', { ...textStyle, fontSize: '24px' }).setOrigin(0.5);
    const stop = this.add.text(gameWidth / 2, meterY - 44, 'SPACE to stop the needle', textStyle).setOrigin(0.5);
    this.tweens.add({ targets: stop, alpha: 0.2, duration: 500, yoyo: true, repeat: -1 });
    const soft = this.add.text(meterX, meterY + 46, 'SOFT', { ...textStyle, color: '#80ed99' });
    const hard = this.add.text(meterX + meterWidth, meterY + 46, 'HARD', { ...textStyle, color: '#ef476f' }).setOrigin(1, 0);
    const tip = this.add.text(gameWidth / 2, meterY + 86, 'softer kick = land higher!', { ...textStyle, color: '#ffd60a' }).setOrigin(0.5);
    this.landText = this.add.text(gameWidth / 2, meterY + 118, '', textStyle).setOrigin(0.5);

    this.meter = this.add.container(0, 0, [bar, this.needle, label, stop, soft, hard, tip, this.landText]).setDepth(30).setAlpha(0);
    this.tweens.add({ targets: this.meter, alpha: 1, duration: 250 });
  }

  landAltitude(kick) {
    // same landing spot Climb uses
    const drop = (0.35 + 0.6 * kick) * (world.summitAltitude - world.baseAltitude);
    return Math.round(world.summitAltitude - drop);
  }

  stopMeter() {
    this.step = 'kick';
    this.landText.setText(`kick ${Math.round(this.kick * 100)}% - landing at ${this.landAltitude(this.kick)} m`);
    this.tweens.add({ targets: this.needle, alpha: 0.2, duration: 80, yoyo: true, repeat: 3 });

    this.time.delayedCall(700, () => {
      this.tweens.add({ targets: this.meter, alpha: 0, duration: 250 });
      this.tweens.add({
        targets: this.yeti,
        x: yetiX + 24,
        angle: 8,
        duration: 350,
        ease: 'Sine.out',
        onComplete: () => {
          this.tweens.add({ targets: this.yeti, x: yetiX - 40, angle: -14, duration: 90, ease: 'Quad.in', onComplete: () => this.kickOff() });
        },
      });
    });
  }

  kickOff() {
    const kick = this.kick;
    const startY = this.player.y;
    const endX = -80;
    const endY = gameHeight + 80;
    const arc = 140 + 240 * kick;
    const spins = 2 + 3 * kick;

    sfx.kick();
    this.cameras.main.shake(350, 0.008 + 0.02 * kick);
    this.dust.explode(20, playerX, groundY);
    this.hop.stop();
    this.tweens.add({ targets: this.yeti, x: yetiX, angle: 0, duration: 500, delay: 200, ease: 'Sine.inOut' });

    const trail = this.add.particles(0, 0, tex.dot, {
      lifespan: 400,
      speed: 20,
      scale: { start: 0.8, end: 0 },
      tint: 0xffd166,
      frequency: 25,
    }).setDepth(4);
    trail.startFollow(this.player);

    this.tweens.addCounter({
      duration: 1100 + 700 * kick,
      onUpdate: (tween) => {
        const t = tween.getValue();
        this.player.x = Phaser.Math.Linear(playerX, endX, t);
        this.player.y = Phaser.Math.Linear(startY, endY, t * t) - arc * 4 * t * (1 - t);
        this.player.rotation = -t * spins * Math.PI * 2;
      },
      onComplete: () => trail.stop(),
    });

    this.time.delayedCall(700, () => this.showFlight());
  }

  showFlight() {
    const flight = world.summitAltitude - this.landAltitude(this.kick);
    const text = this.add.text(gameWidth / 2, 200, `he flew ${flight} m!`, { ...textStyle, fontSize: '32px', color: '#ffd60a', strokeThickness: 6 })
      .setOrigin(0.5)
      .setDepth(30)
      .setScale(0);
    this.tweens.add({ targets: text, scale: 1, angle: { from: -10, to: -3 }, duration: 400, ease: 'Back.out' });

    this.time.delayedCall(2000, () => {
      this.cameras.main.fadeOut(400, 255, 255, 255);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Climb', { kick: this.kick }));
    });
  }

  update(time, delta) {
    const dt = Math.min(delta, 50) / 1000;

    for (const cloud of this.clouds) {
      cloud.x -= cloud.speed * dt;
      if (cloud.x < -80) cloud.x = gameWidth + 80;
    }

    if (this.step !== 'meter') return;
    this.meterTime += dt;
    this.kick = (1 - Math.cos(this.meterTime * needleSpeed)) / 2;
    this.needle.x = meterX + this.kick * meterWidth;
    this.landText.setText(`landing at ${this.landAltitude(this.kick)} m`);

    const band = Math.min(meterBands.length - 1, Math.floor(this.kick * meterBands.length));
    if (band !== this.band) {
      this.band = band;
      sfx.tick();
    }
  }
}
