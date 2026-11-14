import Phaser from 'phaser';
import { world, pogo } from '../config.js';
import { tex } from '../assets.js';
import { sfx } from '../sfx.js';
import { formatTime, textStyle } from '../util.js';

const meterX = 28;
const meterY = 108;
const meterHeight = 200;
const altX = 920;
const altY = 120;
const altHeight = 330;
const superWidth = 200;
const touchRadius = 56;
const gritX = meterX + 36;

export default class Hud extends Phaser.Scene {
  constructor() {
    super('Hud');
  }

  create() {
    this.climb = this.scene.get('Climb');
    this.bars = this.add.graphics();
    this.banners = [];
    this.bannerBusy = false;

    this.coilIcon = this.add.image(meterX + 11, meterY - 22, tex.coil);
    this.timeText = this.add.text(480, 14, '00:00.00', { ...textStyle, fontSize: '24px' }).setOrigin(0.5, 0);
    this.altText = this.add.text(altX - 16, 0, '', textStyle).setOrigin(1, 0.5);
    this.banner = this.add.text(480, 190, '', { ...textStyle, fontSize: '32px', strokeThickness: 6 }).setOrigin(0.5).setAlpha(0);

    this.add.image(meterX + 8, meterY + meterHeight + 34, tex.yeti).setOrigin(0.5);
    this.stompText = this.add.text(meterX + 30, meterY + meterHeight + 34, 'x0', textStyle).setOrigin(0, 0.5);

    this.superIcon = this.add.image(480 - superWidth / 2 - 22, 62, tex.pretzel).setVisible(false);
    this.muteText = this.add.text(944, 16, 'MUTED', { ...textStyle, color: '#ef476f' }).setOrigin(1, 0).setVisible(false);

    const touch = this.sys.game.device.input.touch;
    this.add.text(gritX + 6, meterY - 22, 'GRIT', { ...textStyle, fontSize: '8px', strokeThickness: 3, color: '#f8961e' }).setOrigin(0.5);
    this.gritKey = this.add.text(gritX + 6, meterY + meterHeight + 14, touch ? 'TAP' : 'E', { ...textStyle, fontSize: '10px', color: '#ffd60a' })
      .setOrigin(0.5)
      .setVisible(false);
    this.gritFlash = 0;
    const onGrit = () => { this.gritFlash = 1; };
    this.climb.events.on('grit', onGrit);
    this.events.once('shutdown', () => this.climb.events.off('grit', onGrit));

    const hintText = touch
      ? 'hold JUMP for a super bounce'
      : 'LEFT/RIGHT tilt   hold SPACE for a super bounce\nE mega bounce when GRIT is full   P pause   M mute';
    const hint = this.add.text(480, touch ? 300 : 504, hintText, {
      ...textStyle,
      align: 'center',
      lineSpacing: 8,
    }).setOrigin(0.5);
    this.tweens.add({ targets: hint, alpha: 0, delay: 9000, duration: 1000 });

    this.makePause(touch);
    if (touch) this.makeTouch();

    this.climb.events.on('message', this.showBanner, this);
    this.events.once('shutdown', () => this.climb.events.off('message', this.showBanner, this));
  }

  makePause(touch) {
    this.paused = false;
    const shade = this.add.rectangle(480, 270, 960, 540, 0x0d1b2a, 0.6);
    const title = this.add.text(480, 280, touch ? 'PAUSED - tap to go on' : 'PAUSED - press P', { ...textStyle, fontSize: '24px' })
      .setOrigin(0.5);
    const back = this.add.text(480, 330, touch ? 'tap here for the intro' : 'R back to the intro', { ...textStyle, color: '#caf0f8' })
      .setOrigin(0.5)
      .setPadding(12);
    this.pauseScreen = this.add.container(0, 0, [shade, title, back]).setDepth(50).setVisible(false);

    const keys = this.input.keyboard.addKeys('P,ESC,R');
    keys.P.on('down', () => this.togglePause());
    keys.ESC.on('down', () => this.togglePause());
    keys.R.on('down', () => {
      if (this.paused) this.quit();
    });

    if (!touch) return;
    const button = this.add.text(790, 12, 'II', { ...textStyle, fontSize: '24px' }).setPadding(10).setInteractive();
    button.on('pointerdown', () => this.togglePause());
    shade.setInteractive().on('pointerdown', () => this.togglePause());
    back.setInteractive().on('pointerdown', () => this.quit());
  }

  togglePause() {
    if (this.climb.run.done) return;
    this.paused = !this.paused;
    this.pauseScreen.setVisible(this.paused);
    if (this.paused) {
      Object.keys(this.climb.touch).forEach((key) => { this.climb.touch[key] = false; });
      this.scene.pause('Climb');
    } else {
      this.scene.resume('Climb');
    }
  }

  quit() {
    this.scene.stop('Climb');
    this.scene.start('Intro');
  }

  makeTouch() {
    this.input.addPointer(2);
    this.touchButton(80, 470, 'left', (icon) => icon.fillTriangle(14, -20, 14, 20, -18, 0));
    this.touchButton(210, 470, 'right', (icon) => icon.fillTriangle(-14, -20, -14, 20, 18, 0));
    this.touchButton(850, 470, 'jump', (icon) => icon.fillTriangle(-20, 4, 20, 4, 0, -26));
    this.add.text(850, 490, 'JUMP', textStyle).setOrigin(0.5).setAlpha(0.8);

    // one tap mega bounce, only lights up once grit is full
    this.megaButton = this.add.circle(850, 350, 44, 0xf8961e, 0.15).setStrokeStyle(4, 0x1b263b, 0.5).setInteractive();
    this.megaLabel = this.add.text(850, 350, 'GRIT', textStyle).setOrigin(0.5).setAlpha(0.5);
    this.megaButton.on('pointerdown', () => this.climb.megaBounce());
  }

  touchButton(x, y, key, drawIcon) {
    const button = this.add.circle(x, y, touchRadius, 0xffffff, 0.2).setStrokeStyle(4, 0x1b263b, 0.5).setInteractive();
    const icon = this.add.graphics({ x, y }).fillStyle(0xffffff, 0.8);
    drawIcon(icon);

    const press = (down) => {
      this.climb.touch[key] = down;
      button.setFillStyle(0xffffff, down ? 0.45 : 0.2);
    };
    button.on('pointerdown', () => press(true));
    button.on('pointerup', () => press(false));
    button.on('pointerout', () => press(false));
  }

  showBanner(text, color = '#ffd60a') {
    if (this.bannerBusy) {
      if (!this.banners.some(([queued]) => queued === text)) this.banners.push([text, color]);
      if (this.banners.length > 2) this.banners.shift();
      return;
    }

    this.bannerBusy = true;
    this.banner.setText(text).setColor(color).setAlpha(1).setScale(0.6);
    this.tweens.add({ targets: this.banner, scale: 1, duration: 250, ease: 'Back.out' });
    this.tweens.add({
      targets: this.banner,
      alpha: 0,
      delay: this.banners.length ? 900 : 1400,
      duration: 350,
      onComplete: () => {
        this.bannerBusy = false;
        const next = this.banners.shift();
        if (next) this.showBanner(...next);
      },
    });
  }

  update(time) {
    const climb = this.climb;
    const player = climb.player;
    if (!player) return;

    const g = this.bars;
    g.clear();

    const spring = player.supercharged ? 1 : player.spring;
    const low = !player.supercharged && spring < 0.25;
    let color = spring > 0.5 ? 0x80ed99 : spring > 0.25 ? 0xffd166 : 0xf8961e;
    if (player.supercharged) color = 0xffd60a;
    const fillAlpha = low ? 0.7 + 0.3 * Math.sin(time / 260) : 1;
    g.fillStyle(0x1b263b, 0.7).fillRect(meterX - 4, meterY - 4, 30, meterHeight + 8);
    g.fillStyle(color, fillAlpha).fillRect(meterX, meterY + meterHeight * (1 - spring), 22, meterHeight * spring);
    this.coilIcon.setAngle(low ? Math.sin(time / 180) * 10 : 0);

    // grit bar, flashes when it fills up a bit and glows once it's full
    const gritLevel = climb.run.grit;
    const full = gritLevel >= 1;
    this.gritFlash = Math.max(0, this.gritFlash - 0.05);
    const frame = this.gritFlash > 0 ? 0xffffff : full ? 0xffd60a : 0x1b263b;
    g.fillStyle(frame, this.gritFlash > 0 || full ? 0.9 : 0.7).fillRect(gritX - 4, meterY - 4, 20, meterHeight + 8);
    g.fillStyle(0x1b263b, 1).fillRect(gritX, meterY, 12, meterHeight);
    const gritColor = full ? (Math.floor(time / 150) % 2 ? 0xffd60a : 0xfff3b0) : 0xf8961e;
    g.fillStyle(gritColor, 1).fillRect(gritX, meterY + meterHeight * (1 - gritLevel), 12, meterHeight * gritLevel);
    this.gritKey.setVisible(full).setScale(full ? 1 + Math.sin(time / 120) * 0.15 : 1);
    if (this.megaButton) {
      this.megaButton.setFillStyle(full ? 0xffd60a : 0xf8961e, full ? 0.6 : 0.15);
      this.megaLabel.setAlpha(full ? 1 : 0.5);
    }

    const superLeft = Math.max(0, player.superLeft);
    this.superIcon.setVisible(superLeft > 0);
    if (superLeft > 0) {
      const left = 480 - superWidth / 2;
      g.fillStyle(0x1b263b, 0.7).fillRect(left - 4, 54, superWidth + 8, 16);
      g.fillStyle(0xffd60a, 1).fillRect(left, 58, superWidth * Math.min(1, superLeft / pogo.superTime), 8);
    }

    const markerY = altY + altHeight * (1 - climb.height);
    g.fillStyle(0x1b263b, 0.7).fillRect(altX - 4, altY - 4, 12, altHeight + 8);
    g.fillStyle(0xffffff, 0.5).fillRect(altX, altY, 4, altHeight);
    g.fillStyle(0xffd60a, 1).fillTriangle(altX - 8, altY - 2, altX + 12, altY - 2, altX + 2, altY - 18);
    g.fillStyle(0xe63946, 1).fillCircle(altX + 2, markerY, 7);

    const altitude = world.baseAltitude + climb.height * (world.summitAltitude - world.baseAltitude);
    this.altText.setText(`${Math.round(altitude)} m`).setY(markerY);
    this.timeText.setText(formatTime(climb.run.time));
    this.stompText.setText(`x${climb.run.stomps}`);
    this.muteText.setVisible(sfx.muted);
  }
}
