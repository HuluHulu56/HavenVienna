import Phaser from 'phaser';
import { enemyRespawn } from '../config.js';
import { tex } from '../assets.js';

const speeds = { yeti: 40, fox: 110, tourist: 0 };
const chaseSpeed = 95;
const chaseRange = 280;
const leash = 320;

export default class Enemy {
  constructor(scene, mountain, data) {
    this.scene = scene;
    this.mountain = mountain;
    this.kind = data.kind;
    this.home = data.x;
    this.minX = data.minX;
    this.maxX = data.maxX;
    this.x = data.x;
    this.y = mountain.heightAt(data.x);
    this.dir = Math.random() < 0.5 ? -1 : 1;
    this.hopLeft = 0;
    this.hopTime = 0.5;
    this.hopHeight = 36;
    this.hopWait = Phaser.Math.FloatBetween(1, 3);
    this.throwWait = Phaser.Math.FloatBetween(1.5, 3);
    this.chasing = false;
    this.dead = false;

    this.sprite = scene.add.image(this.x, this.y, tex[this.kind]).setOrigin(0.5, 1).setDepth(8);
  }

  get bounds() {
    const halfWidth = this.sprite.displayWidth / 2 - 3;
    return { left: this.x - halfWidth, right: this.x + halfWidth, top: this.y - this.sprite.displayHeight + 4, bottom: this.y };
  }

  hop(time, height) {
    this.hopTime = time;
    this.hopLeft = time;
    this.hopHeight = height;
  }

  update(dt, player) {
    if (this.dead) return;

    if (this.kind === 'yeti') this.updateYeti(dt, player);
    else if (speeds[this.kind]) this.patrol(dt, speeds[this.kind]);

    if (this.kind === 'fox') {
      this.hopWait -= dt;
      if (this.hopWait <= 0) {
        this.hop(0.5, 36);
        this.hopWait = Phaser.Math.FloatBetween(1.5, 3.5);
      }
    }

    if (this.kind === 'tourist') {
      this.sprite.setFlipX(player.x < this.x);
      this.sprite.angle = Math.sin(this.scene.time.now / 90) * 4;
      this.throwWait -= dt;
      const close = Math.abs(player.x - this.x) < 520 && Math.abs(player.y - this.y) < 300;
      if (close && this.throwWait <= 0) {
        this.throwWait = Phaser.Math.FloatBetween(1.3, 2.2);
        this.scene.throwSnowball(this);
        if (Math.random() < 0.35) this.scene.time.delayedCall(180, () => !this.dead && this.scene.throwSnowball(this));
      }
    }

    let lift = 0;
    if (this.hopLeft > 0) {
      this.hopLeft = Math.max(0, this.hopLeft - dt);
      lift = Math.sin((this.hopLeft / this.hopTime) * Math.PI) * this.hopHeight;
    }

    this.y = this.mountain.heightAt(this.x) - lift;
    this.sprite.setPosition(this.x, this.y);
  }

  patrol(dt, speed) {
    this.x += this.dir * speed * dt;
    if (this.x < this.minX) this.dir = 1;
    if (this.x > this.maxX) this.dir = -1;
    this.sprite.setFlipX(this.dir < 0);
  }

  updateYeti(dt, player) {
    const dx = player.x - this.x;
    const sees = Math.abs(dx) < chaseRange && Math.abs(player.y - this.y) < 200 && player.mode !== 'done';
    const tooFar = Math.abs(this.x - this.home) > leash;

    if (sees && !tooFar) {
      if (!this.chasing) this.scene.floatText(this.x, this.y - 40, '!', '#ef476f');
      this.chasing = true;
      this.dir = Math.sign(dx) || 1;
      const speed = this.hopLeft > 0 ? chaseSpeed * 1.8 : chaseSpeed;
      this.x += this.dir * speed * dt;
      this.sprite.setFlipX(this.dir < 0);
      this.sprite.setTint(Math.floor(this.scene.time.now / 120) % 2 ? 0xffb3b3 : 0xffffff);

      // lunge when close
      this.hopWait -= dt;
      if (Math.abs(dx) < 110 && this.hopWait <= 0 && this.hopLeft === 0) {
        this.hop(0.45, 46);
        this.hopWait = 1.4;
      }
    } else {
      if (this.chasing) this.sprite.clearTint();
      this.chasing = false;
      if (tooFar) this.dir = Math.sign(this.home - this.x);
      this.patrol(dt, speeds.yeti);
    }
  }

  squash() {
    this.dead = true;
    this.chasing = false;
    this.sprite.clearTint();
    this.scene.tweens.add({ targets: this.sprite, scaleY: 0.2, alpha: 0, duration: 250 });
    this.scene.time.delayedCall(enemyRespawn, () => {
      this.x = this.home;
      this.y = this.mountain.heightAt(this.x);
      this.hopLeft = 0;
      this.sprite.setPosition(this.x, this.y).setScale(1);
      this.scene.tweens.add({ targets: this.sprite, alpha: 1, duration: 400 });
      this.dead = false;
    });
  }
}
