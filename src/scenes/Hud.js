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

export default class Hud extends Phaser.Scene {
  constructor() {
    super('Hud');
  }

  create() {
    this.climb = this.scene.get('Climb');
    this.bars = this.add.graphics();
    this.banners = [];
    this.bannerBusy = false;

    this.add.image(meterX + 11, meterY - 22, tex.coil);
    this.timeText = this.add.text(480, 14, '00:00.00', { ...textStyle, fontSize: '24px' }).setOrigin(0.5, 0);
    this.altText = this.add.text(altX - 16, 0, '', textStyle).setOrigin(1, 0.5);
    this.banner = this.add.text(480, 190, '', { ...textStyle, fontSize: '32px', strokeThickness: 6 }).setOrigin(0.5).setAlpha(0);

    this.add.image(meterX + 8, meterY + meterHeight + 34, tex.yeti).setOrigin(0.5);
    this.stompText = this.add.text(meterX + 30, meterY + meterHeight + 34, 'x0', textStyle).setOrigin(0, 0.5);

    this.superIcon = this.add.image(480 - superWidth / 2 - 22, 62, tex.pretzel).setVisible(false);
    this.muteText = this.add.text(944, 16, 'MUTED', { ...textStyle, color: '#ef476f' }).setOrigin(1, 0).setVisible(false);

    const hint = this.add.text(480, 504, 'LEFT/RIGHT tilt   hold SPACE for a super bounce\nM mute', {
      ...textStyle,
      align: 'center',
      lineSpacing: 8,
    }).setOrigin(0.5);
    this.tweens.add({ targets: hint, alpha: 0, delay: 9000, duration: 1000 });

    this.climb.events.on('message', this.showBanner, this);
    this.events.once('shutdown', () => this.climb.events.off('message', this.showBanner, this));
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
    const blink = low && Math.floor(time / 180) % 2 === 0;
    let color = spring > 0.5 ? 0x80ed99 : spring > 0.25 ? 0xffd166 : 0xef476f;
    if (player.supercharged) color = 0xffd60a;
    if (blink) color = 0xffffff;
    g.fillStyle(low ? 0x9d0208 : 0x1b263b, low ? 0.9 : 0.7).fillRect(meterX - 4, meterY - 4, 30, meterHeight + 8);
    g.fillStyle(color, 1).fillRect(meterX, meterY + meterHeight * (1 - spring), 22, meterHeight * spring);

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
