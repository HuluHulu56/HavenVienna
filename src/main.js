import Phaser from 'phaser';
import { gameWidth, gameHeight } from './config.js';
import Boot from './scenes/Boot.js';
import Climb from './scenes/Climb.js';
import Hud from './scenes/Hud.js';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: gameWidth,
  height: gameHeight,
  backgroundColor: '#87c5e8',
  pixelArt: true,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [Boot, Climb, Hud],
});

window.game = game;
