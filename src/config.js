export const gameWidth = 960;
export const gameHeight = 540;

export const world = {
  height: 5200,
  length: 18000,
  summitY: 300,
  baseAltitude: 1000,
  summitAltitude: 2962,
};

export const gravity = 1400;
export const maxFall = 900;

export const pogo = {
  minBounce: 40,
  maxBounce: 150,
  superBonus: 0.6,
  crouchTime: 0.6,
  launchSpeed: 190,
  airAccel: 300,
  airSpeed: 210,
  airDrag: 0.6,
  slopePush: 90, // slopes nudge you back downhill
  iceSlide: 900,
  tiltSpeed: 3,
  tiltBack: 2.2,
  bounceDrain: 0.022,
  superDrain: 0.05,
  rockDrain: 0.09,
  hitDrain: 0.08,
  snowballDrain: 0.05,
  stompRecharge: 0.28,
  stompBonus: 50,
  superTime: 8,
  hurtTime: 1,
};

export const pickups = {
  golden: { spring: 1, respawn: 45000 },
  coil: { spring: 0.15, respawn: 25000 },
  pretzel: { respawn: 40000 },
};

export const enemyRespawn = 20000;

export const level = {
  seed: 2962,
  maxSlope: 0.85, // steepest uphill, still easy to hop up even with a dead spring
};
