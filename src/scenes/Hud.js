import Phaser from 'phaser';
import { world } from '../config.js';
import { formatTime, textStyle } from '../util.js';

export default class Hud extends Phaser.Scene {
  constructor() {
    super('Hud');
  }

  create() {
    this.climb = this.scene.get('Climb');
    this.bars = this.add.graphics();

    this.add.text(20, 84, 'SPRING', { ...textStyle, fontSize: '14px' });
    this.timeText = this.add.text(480, 14, '00:00.00', { ...textStyle, fontSize: '28px' }).setOrigin(0.5, 0);
    this.altText = this.add.text(900, 0, '', { ...textStyle, fontSize: '15px' }).setOrigin(1, 0.5);
    this.banner = this.add.text(480, 190, '', { ...textStyle, fontSize: '44px', strokeThickness: 8 }).setOrigin(0.5).setAlpha(0);

    const hint = this.add.text(480, 515, '← → tilt     hold SPACE for a super bounce     M mute', { ...textStyle, fontSize: '15px' })
      .setOrigin(0.5);
    this.tweens.add({ targets: hint, alpha: 0, delay: 9000, duration: 1000 });

    this.climb.events.on('message', this.showBanner, this);
    this.events.once('shutdown', () => this.climb.events.off('message', this.showBanner, this));
  }

  showBanner(text, color = '#ffd60a') {
    this.tweens.killTweensOf(this.banner);
    this.banner.setText(text).setColor(color).setAlpha(1).setScale(0.6);
    this.tweens.add({ targets: this.banner, scale: 1, duration: 250, ease: 'Back.out' });
    this.tweens.add({ targets: this.banner, alpha: 0, delay: 1400, duration: 500 });
  }

  update() {
    const climb = this.climb;
    const player = climb.player;
    if (!player) return;

    const g = this.bars;
    g.clear();

    const x = 28;
    const y = 108;
    const height = 200;
    const spring = player.supercharged ? 1 : player.spring;
    const color = player.supercharged ? 0xffd60a : spring > 0.5 ? 0x80ed99 : spring > 0.25 ? 0xffd166 : 0xef476f;
    g.fillStyle(0x1b263b, 0.7).fillRect(x - 4, y - 4, 30, height + 8);
    g.fillStyle(color, 1).fillRect(x, y + height * (1 - spring), 22, height * spring);

    const barX = 920;
    const barY = 120;
    const barH = 330;
    const markerY = barY + barH * (1 - climb.height);
    g.fillStyle(0x1b263b, 0.7).fillRect(barX - 4, barY - 4, 12, barH + 8);
    g.fillStyle(0xffffff, 0.5).fillRect(barX, barY, 4, barH);
    g.fillStyle(0xffd60a, 1).fillTriangle(barX - 8, barY - 2, barX + 12, barY - 2, barX + 2, barY - 18);
    g.fillStyle(0xe63946, 1).fillCircle(barX + 2, markerY, 7);

    const altitude = world.baseAltitude + climb.height *(world.summitAltitude - world.baseAltitude);
    this.altText.setText(`${Math.round(altitude)} m`).setY(markerY);
    this.timeText.setText(formatTime(climb.run.time));
  }
}
