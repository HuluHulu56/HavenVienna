import { pickups } from '../config.js';
import { tex } from '../assets.js';

export default class Pickup {
  constructor(scene, mountain, data) {
    this.scene = scene;
    this.kind = data.kind;
    this.x = data.x;
    this.y = mountain.heightAt(data.x) - 30;
    this.taken = false;

    this.sprite = scene.add.image(this.x, this.y, tex[this.kind]).setDepth(7);
    scene.tweens.add({ targets: this.sprite, y: this.y - 6, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    if (this.kind === 'golden') {
      scene.tweens.add({ targets: this.sprite, scale: 1.2, duration: 400, yoyo: true, repeat: -1 });
    }
  }

  touches(player) {
    return Math.abs(player.x - this.x) < 20 && Math.abs(player.y - 22 - this.y) < 30;
  }

  take() {
    this.taken = true;
    this.sprite.setVisible(false);
    this.scene.time.delayedCall(pickups[this.kind].respawn, () => {
      this.taken = false;
      this.sprite.setVisible(true);
    });
  }
}
