import Phaser from 'phaser';
import { world, gameWidth, gameHeight } from '../config.js';
import { tex, drawCross } from '../assets.js';
import { textStyle } from '../util.js';
import { sfx } from '../sfx.js';

const groundY = 440;
const startX = 120;
const heroX = 500;
const benchX = 590;
const yetiX = 700;
const crossX = 840;
const ringStart = 190;
const ringTarget = 36;
const ringTime = 1.6;
const sky = [0x3f8fd2, 0x4f9fda, 0x62ade0, 0x77bbe6, 0x8ecae6, 0xa8d8ec];

const ridge = [
  [-10, 560], [70, 526], [150, 530], [220, 500], [290, 482], [350, 458], [400, groundY], [gameWidth + 10, groundY],
];

const grades = [
  { upTo: 0.12, name: 'PERFECT!', color: 0x80ed99 },
  { upTo: 0.35, name: 'GREAT', color: 0xc5e17a },
  { upTo: 0.6, name: 'GOOD', color: 0xffd166 },
  { upTo: 0.85, name: 'MEH', color: 0xf8961e },
  { upTo: 2, name: 'OUCH', color: 0xef476f },
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
    this.kick = 1;
    this.hopping = true;
    this.ringLeft = 0;
    this.braced = false;

    this.makeSky();
    this.makeSummit();
    this.makeTitle();

    this.input.keyboard.on('keydown-SPACE', this.onSpace, this);
    this.input.keyboard.on('keydown-ENTER', this.onSpace, this);
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
    this.makeBench();

    // the yeti waits below the ridge until he's needed
    const yetiKey = this.textures.exists('yetiBig') ? 'yetiBig' : tex.yeti;
    this.yeti = this.add.sprite(yetiX, groundY + 240, yetiKey).setOrigin(0.5, 1).setDepth(1.5);
    this.yeti.setScale(Math.max(1, Math.round(150 / this.yeti.height)));

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

  // little wooden summit bench with the beer standing on it
  makeBench() {
    const seat = groundY - 22;
    const g = this.add.graphics().setDepth(3.5);
    g.fillStyle(0x000000, 0.12).fillEllipse(benchX, groundY + 2, 70, 8);
    g.fillStyle(0x3d2b1f).fillRect(benchX - 30, seat, 6, 24).fillRect(benchX + 24, seat, 6, 24);
    g.fillStyle(0x3d2b1f).fillRect(benchX - 36, seat - 6, 72, 8);
    g.fillStyle(0x8b5a2b).fillRect(benchX - 34, seat - 4, 68, 4);
    g.fillStyle(0xa9713b).fillRect(benchX - 34, seat - 4, 68, 1);
    this.beer = this.add.image(benchX + 8, seat - 5, tex.beer).setOrigin(0.5, 1).setDepth(3.6);
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
    else if (this.step === 'brace') this.brace();
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
      [10600, () => this.bubble(this.yeti, (c) => c.add(this.pointer()), 1200, -150)],
      [12000, () => this.showBrace()],
    ];
    this.beats = beats.map(([delay, beat]) => this.time.delayedCall(delay, beat));
  }

  // space during the cutscene jumps straight to the kick
  skipStory() {
    this.beats.forEach((beat) => beat.remove());
    this.tweens.killTweensOf([this.hero, this.yeti]);
    if (this.currentBubble) this.currentBubble.destroy();
    this.hopping = false;
    this.hero.setPosition(heroX, groundY + 4).setAngle(0);
    this.yeti.setPosition(yetiX, groundY + 4).setAngle(0).setDepth(4);
    this.holdBeer();
    this.showBrace();
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
      onComplete: () => this.yeti.setDepth(4),
    });
  }

  // he leans over, picks the beer off the bench and takes a long sip
  yetiTakesBeer() {
    this.tweens.add({
      targets: this.yeti,
      angle: -10,
      x: yetiX - 16,
      duration: 350,
      ease: 'Sine.inOut',
      yoyo: true,
      onYoyo: () => {
        sfx.tick();
        this.holdBeer();
      },
      onComplete: () => {
        if (this.cheers) this.yeti.setFrame(1);
        this.tweens.add({
          targets: this.yeti,
          angle: 6,
          duration: 400,
          yoyo: true,
          hold: 700,
          ease: 'Sine.inOut',
          onComplete: () => this.cheers && this.yeti.setFrame(0),
        });
      },
    });
  }

  holdBeer() {
    this.cheers = this.textures.exists('yetiCheers');
    if (this.cheers) {
      this.beer.setVisible(false);
      this.yeti.setTexture('yetiCheers', 0);
    } else {
      this.beer.setPosition(this.yeti.x - 46, this.yeti.y - 74).setDepth(5);
      this.beerFollows = true;
    }
  }

  showBrace() {
    if (this.step === 'brace') return;
    this.step = 'brace';
    this.ringLeft = ringTime;
    this.braced = false;
    this.kick = 1;

    const centerY = groundY - 24;
    this.target = this.add.circle(heroX, centerY, ringTarget).setStrokeStyle(4, 0xffffff, 0.9).setDepth(29);
    this.ring = this.add.circle(heroX, centerY, ringStart).setStrokeStyle(5, 0xffd60a).setDepth(29);
    this.braceTitle = this.add.text(gameWidth / 2, 70, 'BRACE YOURSELF!', { ...textStyle, fontSize: '28px' }).setOrigin(0.5).setDepth(30);
    this.braceHint = this.add.text(gameWidth / 2, 112, 'press SPACE when the rings meet', { ...textStyle, fontSize: '12px' })
      .setOrigin(0.5)
      .setDepth(30);
    this.tweens.add({ targets: this.braceHint, alpha: 0.3, duration: 450, yoyo: true, repeat: -1 });
  }

  brace(missed = false) {
    if (this.braced) return;
    this.braced = true;
    const radius = this.ring.radius;
    // late counts double since there's less room to be late than early
    const off = radius < ringTarget ? (ringTarget - radius) * 2 : radius - ringTarget;
    this.kick = missed ? 1 : Phaser.Math.Clamp(off / 70, 0, 1);
    const grade = grades.find((g) => this.kick < g.upTo);

    sfx.tick();
    this.ring.setStrokeStyle(5, grade.color);
    this.target.setStrokeStyle(4, grade.color, 0.9);
    this.tweens.add({ targets: this.hero, scaleY: 0.8, scaleX: 1.15, duration: 80 });

    const call = this.add.text(heroX, groundY - 130, grade.name, {
      ...textStyle,
      fontSize: '22px',
      color: toHex(grade.color),
      strokeThickness: 6,
    }).setOrigin(0.5).setDepth(31).setScale(0);
    this.tweens.add({ targets: call, scale: 1, duration: 220, ease: 'Back.out' });
    this.tweens.add({ targets: call, alpha: 0, y: call.y - 20, delay: 1000, duration: 300 });
  }

  landAltitude(kick) {
    // same landing spot Climb uses
    const drop = (0.35 + 0.6 * kick) * (world.summitAltitude - world.baseAltitude);
    return Math.round(world.summitAltitude - drop);
  }

  kickNow() {
    this.step = 'busy';
    this.tweens.killTweensOf(this.braceHint);
    [this.ring, this.target, this.braceTitle, this.braceHint].forEach((item) => {
      this.tweens.add({ targets: item, alpha: 0, duration: 150, onComplete: () => item.destroy() });
    });
    if (!this.braced) this.brace(true);

    this.tweens.add({
      targets: this.yeti,
      x: heroX + 120,
      angle: -8,
      duration: 120,
      ease: 'Quad.in',
      onComplete: () => this.kickOff(),
    });
  }

  kickOff() {
    const kick = this.kick;
    const startY = this.hero.y;
    const arc = 140 + 220 * kick;
    const spins = 2 + 3 * kick;

    sfx.kick();
    this.cameras.main.flash(80, 255, 255, 255);
    this.cameras.main.shake(300, 0.008 + 0.02 * kick);
    this.snowBurst.explode(24, heroX, groundY);
    this.impact(heroX + 14, groundY - 30);
    this.hero.setScale(1);
    this.tweens.add({ targets: this.yeti, x: yetiX, angle: 0, duration: 600, delay: 250, ease: 'Sine.inOut' });

    const trail = this.add.particles(0, 0, this.textures.exists(tex.sparkle) ? tex.sparkle : tex.dot, {
      lifespan: 400,
      speed: 20,
      scale: { start: 1, end: 0 },
      tint: 0xffffff,
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

  // white shockwave ring and speed lines, no comic text
  impact(x, y) {
    const ring = this.add.circle(x, y, 12).setStrokeStyle(6, 0xffffff).setDepth(32);
    this.tweens.add({ targets: ring, radius: 90, alpha: 0, duration: 320, ease: 'Quad.out', onComplete: () => ring.destroy() });

    const lines = this.add.graphics({ x, y }).setDepth(32);
    lines.fillStyle(0xffffff);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + 0.2;
      const near = 26;
      const far = 26 + Phaser.Math.Between(26, 48);
      lines.fillTriangle(
        Math.cos(a - 0.06) * near, Math.sin(a - 0.06) * near,
        Math.cos(a + 0.06) * near, Math.sin(a + 0.06) * near,
        Math.cos(a) * far, Math.sin(a) * far,
      );
    }
    this.tweens.add({ targets: lines, scale: 1.4, alpha: 0, duration: 260, onComplete: () => lines.destroy() });
  }

  // the view on the front of the postcard, built from the real game art
  postcardPicture(width, height) {
    const parts = [];
    const sky = this.add.graphics();
    const colors = [0x4f9fda, 0x77bbe6, 0x9fd3ee, 0xc7e6f2];
    colors.forEach((color, i) => sky.fillStyle(color).fillRect(-width / 2, -height / 2 + (i * height) / colors.length, width, height / colors.length + 1));
    parts.push(sky);

    parts.push(this.add.tileSprite(-width / 2, height / 2 - 120, width, 120, tex.farHills).setOrigin(0, 0).setTileScale(0.5).setTilePosition(80, 0));

    const peak = this.add.graphics();
    peak.fillStyle(0x9aa8bb).fillTriangle(-width / 2 + 20, height / 2, 20, -height / 2 + 46, width / 2 - 10, height / 2);
    peak.fillStyle(0xf8f9fa).fillTriangle(-16, -height / 2 + 82, 20, -height / 2 + 46, 58, -height / 2 + 84);
    peak.fillStyle(0xf8f9fa).fillTriangle(-6, -height / 2 + 78, 10, -height / 2 + 96, 22, -height / 2 + 78);
    peak.fillStyle(0xe0a800).fillRect(18, -height / 2 + 24, 4, 24).fillRect(12, -height / 2 + 30, 16, 3);
    parts.push(peak);

    // tiny guy flying off with a dotted trail
    const trail = this.add.graphics();
    trail.fillStyle(0xffffff);
    for (let i = 0; i < 9; i++) trail.fillRect(10 - i * 13, -height / 2 + 48 - Math.sin(i / 3) * 18 + i * 4, 3, 3);
    parts.push(trail);
    parts.push(this.add.image(-width / 2 + 34, -height / 2 + 66, tex.player).setScale(0.7).setAngle(-60));

    const frame = this.add.graphics();
    frame.lineStyle(6, 0xffffff).strokeRect(-width / 2, -height / 2, width, height);
    parts.push(frame);
    return parts;
  }

  showPostcard() {
    const land = this.landAltitude(this.kick);

    const dim = this.add.rectangle(0, 0, gameWidth, gameHeight, 0x0d1b2a, 0).setOrigin(0).setDepth(40);
    this.tweens.add({ targets: dim, fillAlpha: 0.45, duration: 300 });

    const width = 600;
    const height = 300;
    const card = this.add.container(gameWidth / 2, gameHeight + 220).setDepth(41).setAngle(-8);

    if (this.textures.exists('postcard')) {
      card.add(this.add.image(0, 0, 'postcard').setDisplaySize(width, height));
    } else {
      const g = this.add.graphics();
      g.fillStyle(0x000000, 0.25).fillRect(-width / 2 + 8, -height / 2 + 8, width, height);
      g.fillStyle(0xfff4dc).fillRect(-width / 2, -height / 2, width, height);
      g.lineStyle(3, 0xd9c7a3).strokeRect(-width / 2 + 10, -height / 2 + 10, width - 20, height - 20);
      g.lineStyle(2, 0xd9c7a3).lineBetween(40, -height / 2 + 40, 40, height / 2 - 30);
      for (let i = 0; i < 5; i++) g.lineBetween(56, -36 + i * 32, width / 2 - 26, -36 + i * 32);
      card.add(g);

      const picture = this.add.container(-width / 2 + 160, 12, this.postcardPicture(280, 220));
      card.add(picture);
    }

    const stamp = this.add.graphics();
    stamp.fillStyle(0xffffff).fillRect(width / 2 - 86, -height / 2 + 22, 64, 76);
    stamp.fillStyle(0x4ea8de).fillRect(width / 2 - 80, -height / 2 + 28, 52, 64);
    stamp.lineStyle(2, 0x9d0208, 0.7).strokeCircle(width / 2 - 96, -height / 2 + 74, 30);
    const stampYeti = this.add.image(width / 2 - 54, -height / 2 + 84, tex.yeti).setOrigin(0.5, 1);
    const postmark = this.add.text(width / 2 - 96, -height / 2 + 74, '2962m', { ...ink, fontSize: '8px', color: '#9d0208' })
      .setOrigin(0.5)
      .setAngle(-20)
      .setAlpha(0.8);

    const heading = this.add.text(-width / 2 + 24, -height / 2 + 24, 'GREETINGS FROM THE ZUGSPITZE!', { ...ink, fontSize: '12px', color: '#9d0208' });
    const note = this.add.text(60, -50, [
      'Dear Yeti,',
      'nice kick.',
      `landed at ${land} m.`,
      'coming back for',
      'that beer.',
    ], { ...ink, fontSize: '10px', lineSpacing: 22 });

    card.add([stamp, stampYeti, postmark, heading, note]);
    this.tweens.add({ targets: card, y: gameHeight / 2 - 10, angle: -3, duration: 600, ease: 'Back.out' });

    this.time.delayedCall(900, () => {
      this.step = 'postcard';
      const go = this.add.text(gameWidth / 2, gameHeight - 26, 'press SPACE to bounce back', textStyle).setOrigin(0.5).setDepth(42);
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

    // little pogo hops while he climbs up
    if (this.hopping) {
      this.hero.y = groundAt(this.hero.x) + 4 - Math.abs(Math.sin(time / 170)) * 14;
    } else if (this.step === 'story' || this.step === 'brace') {
      this.hero.y = groundAt(this.hero.x) + 4;
    }

    if (this.beerFollows) {
      this.beer.setPosition(this.yeti.x - 46, this.yeti.y - 74).setAngle(this.yeti.angle);
    }

    if (this.step !== 'brace') return;

    // ring closes in while the yeti winds up his kick
    this.ringLeft -= dt;
    const t = Phaser.Math.Clamp(1 - this.ringLeft / ringTime, 0, 1);
    this.ring.setRadius(Math.max(2, ringStart * (1 - t)));
    this.yeti.angle = -t * 12;
    this.yeti.x = yetiX + t * 20;
    if (this.ringLeft <= 0) this.kickNow();
  }
}
