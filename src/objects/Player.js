import Phaser from 'phaser';
import { pogo, gravity, maxFall } from '../config.js';
import { tex } from '../assets.js';
import { sfx } from '../sfx.js';

// x, y is the rubber foot of the pogo stick
export default class Player {
  constructor(scene, mountain, x, y) {
    this.scene = scene;
    this.mountain = mountain;
    this.sprite = scene.add.sprite(x, y, tex.player).setOrigin(0.5, 1).setDepth(10);

    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.spring = 1;
    this.tilt = 0;
    this.mode = 'air';
    this.charge = 0;
    this.superLeft = 0;
    this.hurtLeft = 0;
    this.squash = 1;
    this.onIce = false;
    this.controls = { left: false, right: false, jump: false };
  }

  get supercharged() { return this.superLeft > 0; }

  get bounds() {
    return { left: this.x - 7, right: this.x + 7, top: this.y - 44, bottom: this.y };
  }

  addSpring(amount) {
    this.spring = Phaser.Math.Clamp(this.spring + amount, 0, 1);
  }

  land(surface) {
    this.onIce = surface === 'ice';
    this.squash = 0.7;
    if (this.onIce) {
      this.mode = 'skid';
      this.skidLeft = pogo.iceSkid;
      this.vx *= 0.9;
      this.scene.events.emit('slip');
    } else if (this.controls.jump) {
      this.mode = 'crouch';
      this.charge = 0;
      if (!this.onIce) this.vx = 0;
    } else {
      this.bounce();
    }
  }

  bounce(charge = 0, bonus = 0, free = false) {
    const power = this.supercharged ? 1 : this.spring;
    let height = (pogo.minBounce + (pogo.maxBounce - pogo.minBounce) * power) * (1 + pogo.superBonus * charge) + bonus;
    const slope = this.mountain.slopeAt(this.x);

    let vx = this.tilt * pogo.launchSpeed + slope * pogo.slopePush;
    if (this.onIce && !free) {
      // no grip, so a weaker and wonkier bounce
      height = Math.max(pogo.minBounce, height * pogo.iceGrip);
      vx = vx * 0.5 + this.vx * 0.7 + slope * 250 + Phaser.Math.Between(-120, 120);
    }

    this.vx = Phaser.Math.Clamp(vx, -pogo.airSpeed, pogo.airSpeed);
    this.vy = -Math.sqrt(2 * gravity * height);
    if (!free && !this.supercharged) this.addSpring(-(pogo.bounceDrain + pogo.superDrain * charge));

    this.mode = 'air';
    this.charge = 0;
    this.onIce = false;
    this.squash = 1.3;
    sfx.boing(power, charge);
  }

  stomp() {
    this.addSpring(pogo.stompRecharge);
    this.squash = 0.7;
    this.bounce(0, pogo.stompBonus, true);
  }

  hurt(fromX, drain) {
    if (this.hurtLeft > 0 || this.mode === 'done') return false;
    this.addSpring(-drain);
    this.hurtLeft = pogo.hurtTime;
    this.mode = 'air';
    this.vx = this.x < fromX ? -200 : 200;
    this.vy = -300;
    sfx.hit();
    return true;
  }

  supercharge() {
    this.superLeft = pogo.superTime;
  }

  finish() {
    this.mode = 'done';
    this.vx = 0;
    this.vy = 0;
    this.tilt = 0;
  }

  update(dt) {
    const { left, right, jump } = this.controls;
    const dir = (right ? 1 : 0) - (left ? 1 : 0);
    const mountain = this.mountain;

    if (dir) this.tilt = Phaser.Math.Clamp(this.tilt + dir * pogo.tiltSpeed * dt, -1, 1);
    else this.tilt -= Math.sign(this.tilt) * Math.min(Math.abs(this.tilt), pogo.tiltBack * dt);

    if (this.mode === 'air') {
      if (dir) this.vx = Phaser.Math.Clamp(this.vx + dir * pogo.airAccel * dt, -pogo.airSpeed, pogo.airSpeed);
      else this.vx *= 1 - pogo.airDrag * dt;
      this.vy = Math.min(maxFall, this.vy + gravity * dt);

      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this.keepInWorld();

      const ground = mountain.heightAt(this.x);
      if (this.y >= ground) {
        this.y = ground;
        if (this.vy >= 0) this.scene.onLand(mountain.surfaceAt(this.x));
      }
    } else if (this.mode === 'crouch') {
      this.charge = Math.min(1, this.charge + dt / pogo.crouchTime);
      if (this.onIce) {
        this.vx += mountain.slopeAt(this.x) * pogo.iceSlide * dt;
        this.x += this.vx * dt;
        this.keepInWorld();
      }
      this.y = mountain.heightAt(this.x);
      if (!jump) this.bounce(this.charge);
    } else if (this.mode === 'skid') {
      this.vx += mountain.slopeAt(this.x) * pogo.iceSlide * dt;
      this.x += this.vx * dt;
      this.keepInWorld();
      this.y = mountain.heightAt(this.x);
      this.skidLeft -= dt;
      if (this.skidLeft <= 0 || mountain.surfaceAt(this.x) !== 'ice') {
        this.onIce = mountain.surfaceAt(this.x) === 'ice';
        if (jump) {
          this.mode = 'crouch';
          this.charge = 0;
        } else {
          this.bounce();
        }
      }
    } else {
      this.y = mountain.heightAt(this.x);
    }

    if (this.superLeft > 0) this.superLeft -= dt;
    if (this.hurtLeft > 0) this.hurtLeft -= dt;
    this.updateSprite(dt);
  }

  keepInWorld() {
    const max = this.mountain.width - 12;
    if (this.x < 12 || this.x > max) {
      this.x = Phaser.Math.Clamp(this.x, 12, max);
      this.vx *= -0.4;
    }
  }

  updateSprite(dt) {
    const target = this.mode === 'crouch' ? 1 - 0.35 * this.charge : 1;
    this.squash += (target - this.squash) * Math.min(1, dt * 14);

    this.sprite.setPosition(this.x, this.y);
    this.sprite.setScale(1 + (1 - this.squash) * 0.6, this.squash);
    this.sprite.rotation = this.tilt * 0.45;
    if (this.mode === 'skid') this.sprite.rotation += Math.sin(this.scene.time.now / 25) * 0.2;
    this.sprite.setAlpha(this.hurtLeft > 0 && Math.floor(this.hurtLeft * 20) % 2 ? 0.35 : 1);

    if (this.supercharged) this.sprite.setTint(Math.floor(this.superLeft * 10) % 2 ? 0xffe066 : 0xffffff);
    else this.sprite.clearTint();
  }
}
