import Phaser from 'phaser';
import { world, gameWidth, gameHeight } from '../config.js';
import { tex, drawCross } from '../assets.js';
import { textStyle } from '../util.js';
import { sfx } from '../sfx.js';

const groundY = 440;
const startX = 120;
const heroX = 500;
const beerX = 600;
const yetiX = 700;
const crossX = 840;
const towerX = 110;
const towerTop = 120;
const towerBottom = 400;
const needleSpeed = 3.6;
const sky = [0x3f8fd2, 0x4f9fda, 0x62ade0, 0x77bbe6, 0x8ecae6, 0xa8d8ec];

const ridge = [
  [-10, 560], [70, 526], [150, 530], [220, 500], [290, 482], [350, 458], [400, groundY], [gameWidth + 10, groundY],
];

const grades = [
  { upTo: 0.2, name: 'BUSSI', color: 0x80ed99 },
  { upTo: 0.4, name: 'SCHUBSER', color: 0xc5e17a },
  { upTo: 0.6, name: 'TRITT', color: 0xffd166 },
  { upTo: 0.8, name: 'WATSCHN', color: 0xf8961e },
  { upTo: 2, name: 'AB INS TAL!', color: 0xef476f },
];

const ink = { ...textStyle, color: '#3d2b1f', strokeThickness: 0 };
const toHex = (color) => `#${color.toString(16).padStart(6, '0')}`;

function groundAt(x) {
  for (let i = 1; i < ridge.length; i++) {
    const [x1, y1] = ridge[i];
    const [x0, y0] = ridge[i - 1];
    if (x <= x1) return y0 + ((x - x0) / (x1 - x0)) * (y1 - y0);
  }
  return groundY;
}

export default class Intro extends Phaser.Scene {
  constructor() {
    super('Intro');
  }

  create() {
    this.step = 'title';
    this.kick = 0;
    this.meterTime = 0;
    this.hopping = true;
    this.beerHeld = false;

    this.makeSky();
    this.makeSummit();
    this.makeTitle();

    this.input.keyboard.on('keydown-SPACE', this.onSpace, this);
    this.input.on('pointerdown', this.onSpace, this);
    this.input.keyboard.on('keydown', () => sfx.unlock());
  }

  makeSky() {
    // stepped gradient, more steps than colours so the bands stay soft
    const steps = 18;
    const bandHeight = gameHeight / steps;
    const g = this.add.graphics();
    for (let i = 0; i < steps; i++) {
      const t = (i / (steps - 1)) * (sky.length - 1);
      const a = Phaser.Display.Color.ValueToColor(sky[Math.floor(t)]);
      const b = Phaser.Display.Color.ValueToColor(sky[Math.ceil(t)]);
      const mix = Phaser.Display.Color.Interpolate.ColorWithColor(a, b, 100, (t % 1) * 100);
      g.fillStyle(Phaser.Display.Color.GetColor(mix.r, mix.g, mix.b)).fillRect(0, i * bandHeight, gameWidth, bandHeight + 1);
    }

    this.add.tileSprite(0, gameHeight + 40, gameWidth, 360, tex.farHills).setOrigin(0, 1);
    this.add.tileSprite(0, gameHeight + 110, gameWidth, 260, tex.nearHills).setOrigin(0, 1).setTilePosition(300, 0);

    this.clouds = [];
    for (let i = 0; i < 6; i++) {
      const cloud = this.add.image(i * 180 + Phaser.Math.Between(0, 80), Phaser.Math.Between(40, 260), tex.cloud)
        .setScale(Phaser.Math.FloatBetween(0.6, 1.3))
        .setAlpha(Phaser.Math.FloatBetween(0.5, 0.9));
      cloud.speed = Phaser.Math.Between(6, 16);
      this.clouds.push(cloud);
    }

    this.add.particles(0, 0, tex.dot, {
      x: { min: 0, max: gameWidth + 200 },
      y: -8,
      lifespan: 12000,
      speedY: { min: 20, max: 50 },
      speedX: { min: -40, max: -5 },
      scale: { min: 0.3, max: 0.7 },
      alpha: { start: 0.8, end: 0.2 },
      frequency: 220,
    }).setDepth(20);
  }

  makeSummit() {
    const top = ridge.map(([x, y]) => new Phaser.Math.Vector2(x, y));

    const shape = this.make.graphics({ add: false });
    shape.fillStyle(0xffffff);
    shape.fillPoints([...top, new Phaser.Math.Vector2(gameWidth + 10, gameHeight), new Phaser.Math.Vector2(-10, gameHeight)], true);
    this.add.tileSprite(0, 400, gameWidth, gameHeight - 400, tex.groundGlacier)
      .setOrigin(0, 0)
      .setDepth(2)
      .setMask(shape.createGeometryMask());

    const edge = this.add.graphics().setDepth(3);
    edge.lineStyle(14, 0xffffff);
    edge.strokePoints(top.map((p) => new Phaser.Math.Vector2(p.x, p.y + 5)));
    edge.lineStyle(3, 0x000000, 0.15);
    edge.strokePoints(top.map((p) => new Phaser.Math.Vector2(p.x, p.y + 12)));

    drawCross(this, crossX, groundY, 1.6).setDepth(1);

    // the yeti waits below the ridge until he's needed
    const yetiKey = this.textures.exists('yetiBig') ? 'yetiBig' : tex.yeti;
    this.yeti = this.add.image(yetiX, groundY + 240, yetiKey).setOrigin(0.5, 1).setFlipX(true).setDepth(1.5);
    this.yeti.setScale(Math.max(1, Math.round(150 / this.yeti.height)));

    this.beer = this.add.image(beerX, groundY + 4, tex.beer).setOrigin(0.5, 1).setDepth(4);
    this.tweens.add({ targets: this.beer, y: groundY + 1, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    this.hero = this.add.sprite(startX, groundAt(startX) + 4, tex.player).setOrigin(0.5, 1).setDepth(5);

    this.snowBurst = this.add.particles(0, 0, tex.dot, {
      speed: { min: 80, max: 260 },
      angle: { min: 200, max: 340 },
      gravityY: 500,
      lifespan: 900,
      scale: { start: 1.2, end: 0 },
      tint: [0xffffff, 0xcfe2f3],
      emitting: false,
    }).setDepth(6);
  }

  makeTitle() {
    this.title = this.add.text(gameWidth / 2, 92, 'ZUGSPITZE POGO', { ...textStyle, fontSize: '44px', strokeThickness: 10 })
      .setOrigin(0.5)
      .setDepth(30);
    this.prompt = this.add.text(gameWidth / 2, 160, 'press SPACE', textStyle).setOrigin(0.5).setDepth(30);
    this.tweens.add({ targets: this.title, y: 100, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.tweens.add({ targets: this.prompt, alpha: 0.2, duration: 600, yoyo: true, repeat: -1 });
  }

  onSpace() {
    if (this.step === 'title') this.startStory();
    else if (this.step === 'story') this.skipStory();
    else if (this.step === 'meter') this.stopMeter();
    else if (this.step === 'postcard') this.go();
  }

  startStory() {
    this.step = 'story';
    this.tweens.killTweensOf([this.title, this.prompt]);
    this.tweens.add({ targets: [this.title, this.prompt], alpha: 0, y: '-=40', duration: 300 });

    const beats = [
      [0, () => this.tweens.add({ targets: this.hero, x: heroX, duration: 2000, ease: 'Sine.inOut' })],
      [2100, () => {
        this.hopping = false;
        this.bubble(this.hero, (c) => c.add(this.add.text(0, -2, '...', { ...ink, fontSize: '14px' }).setOrigin(0.5)));
      }],
      [3300, () => this.bubble(this.hero, (c) => {
        c.add(this.add.image(-12, 0, tex.beer).setScale(0.8));
        c.add(this.heart(16, -2));
      }, 1300)],
      [4800, () => this.tweens.add({ targets: this.hero, x: heroX + 22, angle: 14, duration: 500, ease: 'Sine.out' })],
      [5400, () => this.yetiRises()],
      [6500, () => {
        this.bubble(this.yeti, (c) => c.add(this.add.text(0, -2, '!', { ...ink, fontSize: '22px', color: '#d62828' }).setOrigin(0.5)), 900, -150);
        this.tweens.add({ targets: this.hero, x: heroX, angle: 0, duration: 250 });
      }],
      [7200, () => {
        this.bubble(this.hero, (c) => c.add(this.add.text(0, -2, '...', { ...ink, fontSize: '14px' }).setOrigin(0.5)), 1100);
        this.sweat();
      }],
      [8500, () => this.yetiTakesBeer()],
      [10200, () => this.bubble(this.yeti, (c) => c.add(this.pointer()), 1200, -150)],
      [11600, () => this.showMeter()],
    ];
    this.beats = beats.map(([delay, beat]) => this.time.delayedCall(delay, beat));
  }

  // space during the cutscene jumps straight to the kick meter
  skipStory() {
    this.beats.forEach((beat) => beat.remove());
    this.tweens.killTweensOf([this.hero, this.yeti, this.beer]);
    if (this.currentBubble) this.currentBubble.destroy();
    this.hopping = false;
    this.hero.setPosition(heroX, groundY + 4).setAngle(0);
    this.yeti.setPosition(yetiX, groundY + 4).setDepth(4);
    this.holdBeer();
    this.showMeter();
  }

  bubble(target, fill, duration = 1000, offsetY = -70) {
    if (this.currentBubble) this.currentBubble.destroy();
    const g = this.add.graphics();
    g.fillStyle(0xffffff).lineStyle(3, 0x1b263b);
    g.fillRoundedRect(-34, -24, 68, 46, 10).strokeRoundedRect(-34, -24, 68, 46, 10);
    g.fillTriangle(-8, 20, 6, 20, -4, 34);
    g.lineBetween(-8, 22, -4, 34).lineBetween(6, 22, -4, 34);

    const bubble = this.add.container(target.x, target.y + offsetY - 30, [g]).setDepth(30).setScale(0);
    fill(bubble);
    this.currentBubble = bubble;
    sfx.tick();
    this.tweens.add({ targets: bubble, scale: 1, duration: 180, ease: 'Back.out' });
    this.tweens.add({ targets: bubble, scale: 0, delay: duration, duration: 150, ease: 'Back.in' });
  }

  heart(x, y) {
    const g = this.add.graphics({ x, y });
    g.fillStyle(0xe63946);
    g.fillCircle(-4, -3, 5).fillCircle(4, -3, 5).fillTriangle(-9, -1, 9, -1, 0, 9);
    return g;
  }

  pointer() {
    // arrow pointing down the mountain
    const g = this.add.graphics();
    g.fillStyle(0x1b263b);
    g.fillRect(-4, -6, 22, 8);
    g.fillTriangle(-4, -14, -4, 10, -20, -2);
    g.setAngle(-30);
    return g;
  }

  sweat() {
    const drop = this.add.graphics({ x: this.hero.x + 12, y: this.hero.y - 52 }).setDepth(31);
    drop.fillStyle(0x8ecae6).fillCircle(0, 4, 4).fillTriangle(-4, 3, 4, 3, 0, -5);
    this.tweens.add({ targets: drop, y: drop.y + 18, alpha: 0, duration: 900, onComplete: () => drop.destroy() });
  }

  yetiRises() {
    this.cameras.main.shake(900, 0.006);
    sfx.kick();
    this.snowBurst.explode(30, yetiX, groundY);
    this.tweens.add({
      targets: this.yeti,
      y: groundY + 4,
      duration: 900,
      ease: 'Back.out',
      onComplete: () => this.yeti.setDepth(3.5),
    });
  }

  yetiTakesBeer() {
    this.tweens.killTweensOf(this.beer);
    this.tweens.add({
      targets: this.beer,
      x: yetiX - 46,
      y: groundY - 70,
      duration: 500,
      ease: 'Sine.inOut',
      onComplete: () => {
        // slow sip
        this.tweens.add({ targets: this.beer, angle: 35, x: yetiX - 30, y: groundY - 96, duration: 500, yoyo: true, hold: 500 });
        this.tweens.add({ targets: this.yeti, angle: -6, duration: 500, yoyo: true, hold: 500, onComplete: () => this.holdBeer() });
      },
    });
  }

  holdBeer() {
    this.tweens.killTweensOf(this.beer);
    this.beerHeld = true;
    this.beer.setAngle(0).setDepth(5);
  }

  showMeter() {
    if (this.step === 'meter') return;
    this.step = 'meter';
    const g = this.add.graphics();
    const height = towerBottom - towerTop;
    const bandHeight = height / grades.length;

    // hau den lukas: wooden tower, coloured scale, bell on top
    g.fillStyle(0x5c3b1e).fillRect(towerX - 26, towerTop - 6, 52, height + 46);
    g.fillStyle(0x8b5a2b).fillRect(towerX - 22, towerTop - 2, 44, height + 38);
    grades.forEach((grade, i) => {
      const y = towerBottom - (i + 1) * bandHeight;
      g.fillStyle(grade.color).fillRect(towerX - 16, y, 32, bandHeight - 2);
    });
    g.fillStyle(0x3d2b1f).fillRect(towerX - 3, towerTop, 6, height);
    g.fillStyle(0xe0a800).fillCircle(towerX, towerTop - 22, 18);
    g.fillStyle(0xffd60a).fillCircle(towerX - 4, towerTop - 26, 9);
    g.fillStyle(0x6c757d).fillRect(towerX - 34, towerBottom + 34, 68, 14);

    const labels = grades.map((grade, i) => this.add.text(towerX + 34, towerBottom - (i + 0.5) * bandHeight, grade.name, {
      ...textStyle,
      fontSize: '10px',
      color: toHex(grade.color),
    }).setOrigin(0, 0.5));

    this.puck = this.add.rectangle(towerX, towerBottom, 40, 12, 0xd62828).setStrokeStyle(3, 0x1b263b);
    const heading = this.add.text(gameWidth / 2, 54, 'HAU DEN LUKAS!', { ...textStyle, fontSize: '24px' }).setOrigin(0.5);
    const hint = this.add.text(gameWidth / 2, 92, 'SPACE stops the yeti\'s kick - keep it LOW', { ...textStyle, fontSize: '12px' }).setOrigin(0.5);
    this.tweens.add({ targets: hint, alpha: 0.3, duration: 500, yoyo: true, repeat: -1 });
    this.landText = this.add.text(gameWidth / 2, 124, '', { ...textStyle, fontSize: '12px', color: '#caf0f8' }).setOrigin(0.5);

    this.meter = this.add.container(0, 0, [g, ...labels, this.puck, heading, hint, this.landText]).setDepth(30).setAlpha(0);
    this.tweens.add({ targets: this.meter, alpha: 1, duration: 250 });
  }

  gradeOf(kick) {
    return grades.find((grade) => kick < grade.upTo);
  }

  landAltitude(kick) {
    // same landing spot Climb uses
    const drop = (0.35 + 0.6 * kick) * (world.summitAltitude - world.baseAltitude);
    return Math.round(world.summitAltitude - drop);
  }

  stopMeter() {
    this.step = 'busy';
    const grade = this.gradeOf(this.kick);
    this.tweens.add({ targets: this.puck, alpha: 0.2, duration: 70, yoyo: true, repeat: 3 });

    if (this.kick > 0.85) {
      sfx.clink();
      this.cameras.main.shake(200, 0.005);
    }

    const call = this.add.text(yetiX - 40, groundY - 200, grade.name, {
      ...textStyle,
      fontSize: '24px',
      color: toHex(grade.color),
      strokeThickness: 6,
    }).setOrigin(0.5).setDepth(31).setScale(0);
    this.tweens.add({ targets: call, scale: 1, angle: { from: -12, to: -5 }, duration: 300, ease: 'Back.out' });
    this.tweens.add({ targets: call, alpha: 0, delay: 1100, duration: 300 });

    this.time.delayedCall(700, () => {
      this.tweens.add({ targets: this.meter, alpha: 0, duration: 250 });
      this.tweens.add({
        targets: this.yeti,
        x: heroX + 120,
        angle: -8,
        duration: 140,
        ease: 'Quad.in',
        onComplete: () => this.kickOff(),
      });
    });
  }

  kickOff() {
    const kick = this.kick;
    const startY = this.hero.y;
    const arc = 140 + 220 * kick;
    const spins = 2 + 3 * kick;

    sfx.kick();
    this.cameras.main.flash(90, 255, 255, 255);
    this.cameras.main.shake(350, 0.01 + 0.02 * kick);
    this.snowBurst.explode(20, heroX, groundY);
    this.comicBurst(heroX + 20, groundY - 70, kick > 0.6 ? 'WUMMS!' : 'BOINK!');
    this.tweens.add({ targets: this.yeti, x: yetiX, angle: 0, duration: 600, delay: 250, ease: 'Sine.inOut' });

    const trail = this.add.particles(0, 0, this.textures.exists(tex.sparkle) ? tex.sparkle : tex.dot, {
      lifespan: 400,
      speed: 20,
      scale: { start: 1, end: 0 },
      tint: 0xffd166,
      frequency: 30,
    }).setDepth(4);
    trail.startFollow(this.hero);

    this.tweens.addCounter({
      duration: 1300 + 600 * kick,
      onUpdate: (tween) => {
        const t = tween.getValue();
        this.hero.x = Phaser.Math.Linear(heroX, -80, t);
        this.hero.y = Phaser.Math.Linear(startY, gameHeight + 80, t * t) - arc * 4 * t * (1 - t);
        this.hero.rotation = -t * spins * Math.PI * 2;
      },
      onComplete: () => {
        trail.stop();
        this.showPostcard();
      },
    });
  }

  comicBurst(x, y, word) {
    const g = this.add.graphics();
    const points = [];
    for (let i = 0; i < 16; i++) {
      const r = i % 2 ? 34 : 62;
      const a = (i / 16) * Math.PI * 2;
      points.push(new Phaser.Math.Vector2(Math.cos(a) * r * 1.3, Math.sin(a) * r));
    }
    g.fillStyle(0xffd60a).fillPoints(points, true);
    g.lineStyle(4, 0xd62828).strokePoints(points, true);
    const text = this.add.text(0, 0, word, { ...textStyle, fontSize: '18px', color: '#d62828', stroke: '#ffffff', strokeThickness: 4 })
      .setOrigin(0.5);
    const burst = this.add.container(x, y, [g, text]).setDepth(32).setScale(0).setAngle(-8);
    this.tweens.add({ targets: burst, scale: 1, duration: 160, ease: 'Back.out' });
    this.tweens.add({ targets: burst, alpha: 0, scale: 1.3, delay: 700, duration: 250, onComplete: () => burst.destroy() });
  }

  showPostcard() {
    const land = this.landAltitude(this.kick);
    const toGo = world.summitAltitude - land;

    const dim = this.add.rectangle(0, 0, gameWidth, gameHeight, 0x0d1b2a, 0).setOrigin(0).setDepth(40);
    this.tweens.add({ targets: dim, fillAlpha: 0.45, duration: 300 });

    const card = this.add.container(gameWidth / 2, gameHeight + 200).setDepth(41).setAngle(-8);
    const width = 460;
    const height = 280;

    if (this.textures.exists('postcard')) {
      card.add(this.add.image(0, 0, 'postcard').setDisplaySize(width, height));
    } else {
      const g = this.add.graphics();
      g.fillStyle(0x000000, 0.25).fillRect(-width / 2 + 8, -height / 2 + 8, width, height);
      g.fillStyle(0xfff4dc).fillRect(-width / 2, -height / 2, width, height);
      g.lineStyle(3, 0xd9c7a3).strokeRect(-width / 2 + 10, -height / 2 + 10, width - 20, height - 20);
      g.lineStyle(2, 0xd9c7a3).lineBetween(10, -height / 2 + 30, 10, height / 2 - 30);
      for (let i = 0; i < 4; i++) g.lineBetween(30, -10 + i * 30, width / 2 - 24, -10 + i * 30);

      // little picture of the summit on the left half
      g.fillStyle(0x8ecae6).fillRect(-width / 2 + 24, -height / 2 + 60, 190, 140);
      g.fillStyle(0x9db4c8).fillTriangle(-width / 2 + 24, -height / 2 + 200, -width / 2 + 120, -height / 2 + 84, -width / 2 + 214, -height / 2 + 200);
      g.fillStyle(0xffffff).fillTriangle(-width / 2 + 96, -height / 2 + 112, -width / 2 + 120, -height / 2 + 84, -width / 2 + 144, -height / 2 + 112);
      g.fillStyle(0xe0a800).fillRect(-width / 2 + 118, -height / 2 + 66, 4, 22).fillRect(-width / 2 + 112, -height / 2 + 72, 16, 3);
      card.add(g);
    }

    const stamp = this.add.graphics();
    stamp.fillStyle(0xffffff).fillRect(width / 2 - 86, -height / 2 + 18, 64, 76);
    stamp.fillStyle(0x4ea8de).fillRect(width / 2 - 80, -height / 2 + 24, 52, 64);
    stamp.lineStyle(2, 0x9d0208, 0.7).strokeCircle(width / 2 - 92, -height / 2 + 70, 30);
    const stampYeti = this.add.image(width / 2 - 54, -height / 2 + 80, tex.yeti).setOrigin(0.5, 1);
    const postmark = this.add.text(width / 2 - 92, -height / 2 + 70, '2962m', { ...ink, fontSize: '8px', color: '#9d0208' })
      .setOrigin(0.5)
      .setAngle(-20)
      .setAlpha(0.8);

    const heading = this.add.text(-width / 2 + 24, -height / 2 + 24, 'GRUSS VON DER ZUGSPITZE!', { ...ink, fontSize: '12px', color: '#9d0208' });
    const note = this.add.text(26, -height / 2 + 100, [
      'Dear Yeti,',
      `landed at ${land} m.`,
      `only ${toGo} m to go.`,
      'save me a beer!',
    ], { ...ink, fontSize: '10px', lineSpacing: 18 });

    card.add([stamp, stampYeti, postmark, heading, note]);
    this.tweens.add({ targets: card, y: gameHeight / 2 - 10, angle: -3, duration: 600, ease: 'Back.out' });

    this.time.delayedCall(900, () => {
      this.step = 'postcard';
      const go = this.add.text(gameWidth / 2, gameHeight - 30, 'press SPACE to bounce back', textStyle).setOrigin(0.5).setDepth(42);
      this.tweens.add({ targets: go, alpha: 0.2, duration: 600, yoyo: true, repeat: -1 });
    });
  }

  go() {
    this.step = 'done';
    this.cameras.main.fadeOut(400, 255, 255, 255);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Climb', { kick: this.kick }));
  }

  update(time, delta) {
    const dt = Math.min(delta, 50) / 1000;

    for (const cloud of this.clouds) {
      cloud.x -= cloud.speed * dt;
      if (cloud.x < -80) cloud.x = gameWidth + 80;
    }

    // little pogo hops while he climbs up and while waiting
    if (this.hopping) {
      this.hero.y = groundAt(this.hero.x) + 4 - Math.abs(Math.sin(time / 170)) * 14;
    } else if (this.step === 'story' || this.step === 'meter') {
      this.hero.y = groundAt(this.hero.x) + 4;
    }

    if (this.beerHeld) {
      this.beer.x = this.yeti.x - 46;
      this.beer.y = this.yeti.y - 74;
      this.beer.angle = this.yeti.angle;
    }

    if (this.step !== 'meter') return;
    this.meterTime += dt;
    this.kick = (1 - Math.cos(this.meterTime * needleSpeed)) / 2;
    this.puck.y = towerBottom - this.kick * (towerBottom - towerTop);

    // yeti winds up his kick along with the puck
    this.yeti.angle = -this.kick * 12;
    this.yeti.x = yetiX + this.kick * 20;

    const grade = this.gradeOf(this.kick);
    this.landText.setText(`${grade.name}  -  you'd land at ${this.landAltitude(this.kick)} m`);
  }
}
