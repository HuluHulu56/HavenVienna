import Phaser from 'phaser';
import { makeTextures } from '../assets.js';

export default class Boot extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    // real sprites go here, e.g. this.load.image('player', 'assets/player.png')
  }

  create() {
    makeTextures(this);
    const kick = new URLSearchParams(location.search).get('kick');
    this.scene.start('Climb', { kick: kick === null ? 0.5 : Number(kick) });
  }
}
