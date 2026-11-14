import Phaser from 'phaser';
import { world, gameWidth, gameHeight } from '../config.js';
import { tex, drawCross } from '../assets.js';
import { formatTime, textStyle } from '../util.js';
import { sfx } from '../sfx.js';

const groundY = 440;
const playerX = 200;
const yetiX = 275;
const crossX = 410;
const bookX = 720;
const bookY = 292;
const bestKey = 'zugspitzeBest';
const skyBands = [0x6d8fc4, 0x93acd3, 0xe3cfae, 0xf3d9a4, 0xf6c177, 0xf2a65a];
const ink = '#3b2414';
const pencil = '#8b6b4a';
const reclinkDelay = 4000;

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
    this.clinks = 0;
  }

  create() {
    this.saveBest();
    this.makeSky();
    this.makeSummit();
    this.makeCharacters();
    this.makeTitle();
    this.makeBook();

    this.cameras.main.fadeIn(500, 255, 255, 255);
    this.input.keyboard.on('keydown-SPACE', () => {
      if (this.ready) this.scene.start('Intro');
    });
    this.hopIn();
  }

  makeSky() {
    const bandHeight = 64;
    const sky = this.add.graphics();
    skyBands.forEach((color, i) => sky.fillStyle(color).fillRect(0, i * bandHeight, gameWidth, bandHeight));
    sky.fillStyle(skyBands[skyBands.length - 1]).fillRect(0, skyBands.length * bandHeight, gameWidth, gameHeight);
    sky.fillStyle(0xfff3c4, 0.4).fillCircle(110, 352, 76);
    sky.fillStyle(0xffe7a0).fillCircle(110, 352, 56);

    this.add.tileSprite(0, gameHeight + 40, gameWidth, 360, tex.farHills).setOrigin(0, 1).setTint(0xf1c79b);
    this.add.tileSprite(0, gameHeight + 100, gameWidth, 260, tex.nearHills).setOrigin(0, 1).setTilePosition(300, 0).setTint(0xc9937a);

    this.clouds = [];
    for (let i = 0; i < 5; i++) {
      const cloud = this.add.image(i * 210 + Phaser.Math.Between(0, 60), Phaser.Math.Between(110, 250), tex.cloud)
        .setScale(Phaser.Math.FloatBetween(0.7, 1.2))
        .setAlpha(0.75)
        .setTint(0xffe2c4);
      cloud.speed = Phaser.Math.Between(4, 10);
      this.clouds.push(cloud);
    }

    this.add.particles(0, 0, tex.dot, {
      x: { min: 0, max: gameWidth },
      y: { min: 160, max: groundY },
      lifespan: 4000,
      speedY: { min: -12, max: -4 },
      speedX: { min: -6, max: 6 },
      scale: { start: 0.5, end: 0 },
      alpha: { start: 0.6, end: 0 },
      tint: 0xfff0b0,
      frequency: 300,
    });
  }

  makeSummit() {
    const top = [[-10, 474], [40, 456], [90, groundY], [gameWidth + 10, groundY]].map(([x, y]) => new Phaser.Math.Vector2(x, y));

    const shape = this.make.graphics({ add: false });
    shape.fillStyle(0xffffff);
    shape.fillPoints([...top, new Phaser.Math.Vector2(gameWidth + 10, gameHeight), new Phaser.Math.Vector2(-10, gameHeight)], true);
    this.add.tileSprite(0, groundY - 10, gameWidth, gameHeight - groundY + 10, tex.groundGlacier)
      .setOrigin(0, 0)
      .setTint(0xf6d7b0)
      .setMask(shape.createGeometryMask());

    const edge = this.add.graphics();
    edge.lineStyle(14, 0xfff0d8);
    edge.strokePoints(top.map((p) => new Phaser.Math.Vector2(p.x, p.y + 5)));
    edge.lineStyle(3, 0x000000, 0.12);
    edge.strokePoints(top.map((p) => new Phaser.Math.Vector2(p.x, p.y + 12)));

    drawCross(this, crossX, groundY, 1.4);
    this.add.particles(crossX, groundY - 70, tex.dot, {
      x: { min: -36, max: 36 },
      y: { min: -36, max: 36 },
      lifespan: 900,
      scale: { start: 0.8, end: 0 },
      tint: 0xffd60a,
      frequency: 280,
    });
  }

  makeCharacters() {
    this.cheers = this.textures.exists('yetiCheers') && this.textures.exists('playerCheers');
    const yetiKey = this.textures.exists('yetiBig') ? 'yetiBig' : tex.yeti;

    this.yeti = this.add.sprite(yetiX, groundY + 4, this.cheers ? 'yetiCheers' : yetiKey, 0).setOrigin(0.5, 1).setDepth(4);
    this.player = this.add.sprite(-30, groundY + 4, this.cheers ? 'playerCheers' : tex.player, 0).setOrigin(0.5, 1).setDepth(5);

    // mug spots in the art, measured from the feet
    this.yetiMug = { chest: [-30, -40], raised: [-31, -76] };
    this.playerMug = { chest: [10, -24], raised: [8, -36] };
    this.raised = false;

    this.mugs = [];
    if (this.cheers) {
      for (const sprite of [this.player, this.yeti]) {
        sprite.anims.create({
          key: 'chug',
          frameRate: 10,
          frames: [2, 3, 4, 3, 4, 3, 4, 3, 2].map((frame) => ({
            key: sprite.texture.key,
            frame,
            duration: frame === 4 ? 130 : 0,
          })),
        });
      }
    } else {
      this.mugs.push({ sprite: this.player, spot: this.playerMug, image: this.add.image(0, 0, tex.beer).setFlipX(true).setDepth(6) });
      this.mugs.push({ sprite: this.yeti, spot: this.yetiMug, image: this.add.image(0, 0, tex.beer).setScale(2).setDepth(6) });
      if (this.yeti.height < 60) this.yeti.setScale(3);
    }

    this.foam = this.add.particles(0, 0, tex.dot, {
      speed: { min: 60, max: 180 },
      angle: { min: 200, max: 340 },
      gravityY: 500,
      lifespan: 800,
      scale: { start: 1, end: 0.2 },
      tint: [0xffffff, 0xfff3d6],
      emitting: false,
    }).setDepth(7);
  }

  makeTitle() {
    const parts = [];
    if (this.textures.exists('banner')) parts.push(this.add.image(0, 0, 'banner'));
    parts.push(this.add.text(0, 2, 'PROST!', { ...textStyle, fontSize: '32px', color: '#ffd60a', strokeThickness: 8 }).setOrigin(0.5));
    this.title = this.add.container(gameWidth / 2, 64, parts).setDepth(20).setScale(0);
  }

  makeBook() {
    const page = this.textures.exists('logbook')
      ? this.add.image(0, 0, 'logbook')
      : this.add.rectangle(0, 0, 360, 260, 0xf6e7c8).setStrokeStyle(6, 0x5c3b1e);

    const today = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const date = `${pad(today.getDate())}.${pad(today.getMonth() + 1)}.${String(today.getFullYear()).slice(2)}`;
    const { time, stomps, kick } = this.result;
    const lines = [
      [-148, -86, `Zugspitze ${world.summitAltitude} m`, pencil, 8],
      [-148, -64, 'date', pencil, 8],
      [-148, -50, date, ink, 16],
      [-148, -18, 'time', pencil, 8],
      [-148, -4, formatTime(time), ink, 16],
      [24, -64, 'stomps', pencil, 8],
      [24, -50, String(stomps), ink, 16],
      [24, -18, 'kick', pencil, 8],
      [24, -4, `${Math.round(kick * 100)}%`, ink, 16],
      [24, 28, 'best', pencil, 8],
      [24, 42, this.best ? formatTime(this.best) : '--:--.--', ink, 16],
    ];

    this.lines = lines.map(([x, y, full, color, size]) => {
      const text = this.add.text(x, y, '', { ...textStyle, fontSize: `${size}px`, color, strokeThickness: 0 });
      return { text, full };
    });

    this.stamp = this.textures.exists('stampBest')
      ? this.add.image(-84, 58, 'stampBest')
      : this.add.text(-84, 58, 'Best!', { ...textStyle, color: '#c1121f', strokeThickness: 0 }).setOrigin(0.5);
    this.stamp.setAngle(-10).setAlpha(0);

    this.book = this.add.container(bookX, gameHeight + 160, [page, ...this.lines.map((line) => line.text), this.stamp]).setDepth(10);
  }

  hopIn() {
    const hops = 4;
    let lastHop = -1;
    this.tweens.addCounter({
      duration: 1500,
      delay: 300,
      onUpdate: (tween) => {
        const t = tween.getValue();
        const hop = Math.min(hops - 1, Math.floor(t * hops));
        if (hop !== lastHop) {
          lastHop = hop;
          sfx.boing(0.6);
        }
        this.player.x = Phaser.Math.Linear(-30, playerX, t);
        this.player.y = groundY + 4 - Math.abs(Math.sin(t * Math.PI * hops)) * 34;
      },
      onComplete: () => {
        this.tweens.add({ targets: this.player, scaleY: 0.85, scaleX: 1.1, duration: 90, yoyo: true });
        this.breathe();
        this.time.delayedCall(400, () => this.raise());
      },
    });
  }

  breathe() {
    this.tweens.add({ targets: this.yeti, scaleY: this.yeti.scaleY * 1.03, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.tweens.add({ targets: this.player, scaleY: 1.03, duration: 900, delay: 200, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
  }

  setRaised(raised) {
    this.raised = raised;
    if (this.cheers) {
      this.player.setFrame(raised ? 1 : 0);
      this.yeti.setFrame(raised ? 1 : 0);
    }
  }

  mugPoint(sprite, spot) {
    const [dx, dy] = this.raised ? spot.raised : spot.chest;
    const point = new Phaser.Math.Vector2(dx, dy).rotate(sprite.rotation);
    return point.add(new Phaser.Math.Vector2(sprite.x, sprite.y));
  }

  raise() {
    this.setRaised(true);
    this.tweens.add({ targets: this.player, angle: -6, duration: 220, ease: 'Sine.out' });
    this.tweens.add({
      targets: this.yeti,
      angle: 4,
      duration: 220,
      ease: 'Sine.out',
      onComplete: () => this.swing(),
    });
  }

  swing() {
    this.tweens.add({ targets: this.player, x: playerX + 8, y: groundY + 4 - 36, angle: 14, duration: 260, ease: 'Quad.in' });
    this.tweens.add({
      targets: this.yeti,
      x: yetiX - 6,
      angle: -10,
      duration: 260,
      ease: 'Quad.in',
      onComplete: () => this.clink(),
    });
  }

  clink() {
    const a = this.mugPoint(this.player, this.playerMug);
    const b = this.mugPoint(this.yeti, this.yetiMug);
    sfx.clink();
    this.foam.explode(22, (a.x + b.x) / 2, (a.y + b.y) / 2 - 6);
    this.cameras.main.shake(110, 0.003);

    this.clinks += 1;
    if (this.clinks === 1) {
      sfx.fanfare();
      this.tweens.add({ targets: this.title, scale: 1, duration: 450, ease: 'Back.out' });
      this.tweens.add({ targets: this.title, y: 70, duration: 1200, delay: 450, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      this.time.delayedCall(500, () => this.openBook());
    }

    this.tweens.add({ targets: this.player, x: playerX, y: groundY + 4, angle: 0, duration: 320, ease: 'Sine.out' });
    this.tweens.add({
      targets: this.yeti,
      x: yetiX,
      angle: 0,
      duration: 320,
      ease: 'Sine.out',
      onComplete: () => this.chug(),
    });
  }

  chug() {
    const lowerMugs = () => {
      this.setRaised(false);
      this.time.delayedCall(reclinkDelay, () => this.raise());
    };

    if (this.cheers) {
      this.yeti.once('animationcomplete-chug', lowerMugs);
      this.player.play('chug');
      this.yeti.play('chug');
      return;
    }

    this.tweens.add({ targets: this.player, angle: -10, duration: 220, yoyo: true, repeat: 2, ease: 'Sine.inOut' });
    this.tweens.add({
      targets: this.yeti,
      angle: 9,
      duration: 220,
      yoyo: true,
      repeat: 2,
      ease: 'Sine.inOut',
      onComplete: lowerMugs,
    });
  }

  openBook() {
    this.tweens.add({
      targets: this.book,
      y: bookY,
      duration: 650,
      ease: 'Back.out',
      onComplete: () => this.writeLine(0),
    });
  }

  writeLine(index) {
    if (index >= this.lines.length) {
      if (this.newBest) this.stampBest();
      else this.showPrompt();
      return;
    }

    const { text, full } = this.lines[index];
    sfx.tick();
    let shown = 0;
    this.time.addEvent({
      delay: 35,
      repeat: full.length - 1,
      callback: () => {
        shown += 1;
        text.setText(full.slice(0, shown));
        if (shown === full.length) this.time.delayedCall(140, () => this.writeLine(index + 1));
      },
    });
  }

  stampBest() {
    this.stamp.setScale(2.6);
    this.tweens.add({
      targets: this.stamp,
      scale: 1,
      alpha: 1,
      duration: 170,
      delay: 200,
      ease: 'Quad.in',
      onComplete: () => {
        sfx.stomp();
        this.cameras.main.shake(160, 0.006);
        this.time.delayedCall(400, () => this.showPrompt());
      },
    });
  }

  showPrompt() {
    this.ready = true;
    const again = this.add.text(gameWidth / 2, 512, 'press SPACE to climb again', textStyle).setOrigin(0.5).setDepth(20);
    this.tweens.add({ targets: again, alpha: 0.3, duration: 600, yoyo: true, repeat: -1 });
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

  update(time, delta) {
    const dt = Math.min(delta, 50) / 1000;
    for (const cloud of this.clouds) {
      cloud.x -= cloud.speed * dt;
      if (cloud.x < -80) cloud.x = gameWidth + 80;
    }

    for (const mug of this.mugs) {
      const point = this.mugPoint(mug.sprite, mug.spot);
      mug.image.setPosition(point.x, point.y).setAngle(mug.sprite.angle);
    }
  }
}
