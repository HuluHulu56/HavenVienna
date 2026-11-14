import Phaser from 'phaser';
import { makeTextures } from '../assets.js';
import { sfx } from '../sfx.js';

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
    this.load.image('coil', 'assets/coil.png');
    this.load.image('golden', 'assets/golden.png');
    this.load.image('pretzel', 'assets/pretzel.png');
    this.load.image('beer', 'assets/beer.png');
    this.load.image('cloud', 'assets/cloud.png');
    this.load.image('farHills', 'assets/farHills.png');
    this.load.image('nearHills', 'assets/nearHills.png');
    this.load.image('groundMeadow', 'assets/groundMeadow.png');
    this.load.image('groundCliffs', 'assets/groundCliffs.png');
    this.load.image('groundGlacier', 'assets/groundGlacier.png');
    this.load.image('pine', 'assets/pine.png');
    this.load.image('boulder', 'assets/boulder.png');

    for (const name of ['boing', 'stomp', 'pickup', 'power', 'hit', 'rock', 'slip', 'kick', 'clink', 'fanfare', 'music']) {
      this.load.audio(name, `assets/sounds/${name}.ogg`);
    }
  }

  create() {
    makeTextures(this);
    sfx.use(this.sound);
    sfx.music();
    const kick = new URLSearchParams(location.search).get('kick');
    if (kick === null) {
      this.scene.start('Intro');
    } else {
      this.scene.start('Climb', { kick: Number(kick) });
    }
  }
}
