import Phaser from 'phaser';
import { pogo, gravity, maxFall, mega } from '../config.js';
import { tex } from '../assets.js';
import { sfx } from '../sfx.js';
import { textStyle } from '../util.js';

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
    this.freezeLeft = 0;
    this.megaLeft = 0;
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
    this.megaLeft = 0;
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
    let height = (pogo.minBounce + (pogo.maxBounce - pogo.minBounce) * power) * (1 + pogo.superBonus * charge) + pogo.chargeBoost * charge + bonus;
    // clamp so standing right next to a rock wall doesnt fling you backwards
    const slope = Phaser.Math.Clamp(this.mountain.slopeAt(this.x), -1, 1);

    let vx = this.tilt * pogo.launchSpeed + slope * pogo.slopePush;
    if (this.onIce && !free) {
      // no grip, so a weaker and wonkier bounce
      height = Math.max(pogo.minBounce, height * pogo.iceGrip);
      vx = vx * 0.8 + this.vx * 0.4 + Phaser.Math.Between(-70, 70);
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

  // all the grit you built up turns into one huge launch up the slope
  mega() {
    this.mode = 'air';
    this.charge = 0;
    this.onIce = false;
    this.megaLeft = mega.flight;
    this.vx = mega.speed;
    this.vy = -Math.sqrt(2 * gravity * mega.height);
    this.addSpring(mega.spring);
    this.squash = 1.5;
  }

  hurt(fromX, drain) {
    if (this.hurtLeft > 0 || this.megaLeft > 0 || this.mode === 'done') return false;
    this.addSpring(-drain);
    this.hurtLeft = pogo.hurtTime;
    if (this.mode !== 'stunned') {
      this.mode = 'air';
      this.vx = this.x < fromX ? -200 : 200;
      this.vy = -300;
    }
    sfx.hit();
    return true;
  }

  freeze(fromX, drain, duration) {
    if (!this.hurt(fromX, drain)) return false;
    if (this.mode === 'stunned') return true;
    this.mode = 'stunned';
    this.freezeLeft = duration;
    this.hurtLeft = 0;
    this.y = this.mountain.heightAt(this.x);
    this.vx = 0;
    this.vy = 0;
    this.tilt = 0;
    this.charge = 0;
    this.onIce = false;
    this.squash = 1;
    if (!this.ice) this.makeIce();
    this.ice.setPosition(this.x, this.y).setVisible(true);
    this.freezeTimer.setPosition(this.x, this.y - 60).setText(`${duration.toFixed(1)}s`).setVisible(true);
    return true;
  }

  makeIce() {
    const ice = this.scene.add.graphics().setDepth(11);
    ice.fillStyle(0x8de2ff, 0.3).lineStyle(2, 0x9be6ff, 0.95);
    ice.beginPath();
    ice.moveTo(-15, -8);
    ice.lineTo(-16, -38);
    ice.lineTo(-10, -50);
    ice.lineTo(8, -53);
    ice.lineTo(16, -43);
    ice.lineTo(17, -10);
    ice.lineTo(10, 0);
    ice.lineTo(-9, 0);
    ice.closePath();
    ice.fillPath();
    ice.strokePath();
    ice.fillStyle(0x318bc4, 0.4).fillTriangle(10, 0, 17, -10, 16, -43);
    ice.fillStyle(0xedfbff, 0.75).fillTriangle(-15, -38, -10, -50, 8, -53);
    ice.lineStyle(2, 0xedfbff, 0.9);
    ice.lineBetween(-11, -32, -11, -22);
    ice.lineBetween(-10, -32, -6, -38);
    ice.lineBetween(6, -8, 11, -14);
    this.ice = ice;
    this.freezeTimer = this.scene.add.text(0, 0, '', { ...textStyle, fontSize: '12px', color: '#caf0f8' })
      .setOrigin(0.5, 1).setDepth(25);
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

    if (dir && this.mode !== 'stunned') this.tilt = Phaser.Math.Clamp(this.tilt + dir * pogo.tiltSpeed * dt, -1, 1);
    else this.tilt -= Math.sign(this.tilt) * Math.min(Math.abs(this.tilt), pogo.tiltBack * dt);

    if (this.mode === 'air') {
      if (this.megaLeft > 0) this.megaLeft -= dt;
      else if (dir) this.vx = Phaser.Math.Clamp(this.vx + dir * pogo.airAccel * dt, -pogo.airSpeed, pogo.airSpeed);
      else this.vx *= 1 - pogo.airDrag * dt;
      this.vy = Math.min(maxFall, this.vy + gravity * dt);

      const fromX = this.x;
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this.keepInWorld();

      // bumped into a rock wall instead of clearing it, checked at the front of the sprite not the middle
      const front = Math.sign(this.vx) * 8;
      const ahead = mountain.heightAt(this.x + front);
      if (front && this.y > ahead + 2 && mountain.heightAt(fromX + front) - ahead > 10) {
        this.x = fromX;
        this.vx = -this.vx * 0.3;
        this.scene.events.emit('bonk');
      }

      const ground = mountain.heightAt(this.x);
      if (this.y >= ground) {
        this.y = ground;
        if (this.vy >= 0) this.scene.onLand(mountain.surfaceAt(this.x));
      }
    } else if (this.mode === 'crouch') {
      this.charge = Math.min(1, this.charge + dt / pogo.crouchTime);
      if (this.onIce) this.slide(dt);
      this.y = mountain.heightAt(this.x);
      if (!jump) this.bounce(this.charge);
    } else if (this.mode === 'skid') {
      this.slide(dt);
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
    if (this.mode === 'stunned') {
      this.freezeLeft = Math.max(0, this.freezeLeft - dt);
      if (this.freezeLeft === 0) this.mode = 'air';
    }
    this.updateSprite(dt);
  }

  slide(dt) {
    const mountain = this.mountain;
    const fromX = this.x;
    this.vx += Phaser.Math.Clamp(mountain.slopeAt(this.x), -1, 1) * pogo.iceSlide * dt;
    this.x += this.vx * dt;
    this.keepInWorld();
    if (mountain.heightAt(fromX) - mountain.heightAt(this.x) > 10) {
      this.x = fromX;
      this.vx = 0;
    }
  }

  keepInWorld() {
    const max = this.mountain.width - 12;
    if (this.x < 12 || this.x > max) {
      this.x = Phaser.Math.Clamp(this.x, 12, max);
      this.vx *= -0.4;
    }
  }

  updateSprite(dt) {
    const frozen = this.mode === 'stunned';
    const target = this.mode === 'crouch' ? 1 - 0.35 * this.charge : 1;
    this.squash += (target - this.squash) * Math.min(1, dt * 14);

    this.sprite.setPosition(this.x, this.y);
    this.sprite.setScale(1 + (1 - this.squash) * 0.6, this.squash);
    this.sprite.rotation = this.tilt * 0.45;
    if (this.mode === 'skid') this.sprite.rotation += Math.sin(this.scene.time.now / 25) * 0.2;
    // one big front flip during a mega bounce
    if (this.megaLeft > 0) this.sprite.rotation += (1 - this.megaLeft / mega.flight) * Math.PI * 2;
    this.sprite.setAlpha(!frozen && this.hurtLeft > 0 && Math.floor(this.hurtLeft * 20) % 2 ? 0.35 : 1);

    if (frozen) this.sprite.setTint(0xa8e4ff);
    else if (this.supercharged) this.sprite.setTint(Math.floor(this.superLeft * 10) % 2 ? 0xffe066 : 0xffffff);
    else this.sprite.clearTint();
    if (this.ice) {
      this.ice.setVisible(frozen);
      this.freezeTimer.setVisible(frozen);
      if (frozen) this.freezeTimer.setText(`${(Math.ceil(this.freezeLeft * 10) / 10).toFixed(1)}s`);
    }
  }
}
