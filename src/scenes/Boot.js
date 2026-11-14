import Phaser from 'phaser';
import { makeTextures } from '../assets.js';

export default class Boot extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    this.load.image('player', 'assets/player.png');
    this.load.image('yeti', 'assets/yeti.png');
    this.load.image('yetiBig', 'assets/yetiBig.png');
    this.load.image('fox', 'assets/fox.png');
    this.load.image('tourist', 'assets/tourist.png');
    this.load.image('snowball', 'assets/snowball.png');
  }

  create() {
    makeTextures(this);
    const kick = new URLSearchParams(location.search).get('kick');
    if (kick === null) {
      this.scene.start('Intro');
    } else {
      this.scene.start('Climb', { kick: Number(kick) });
    }
  }
}
