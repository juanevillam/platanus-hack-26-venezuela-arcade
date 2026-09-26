// Space Explorer — Platanus Hack 26: Caracas Arcade Challenge
// Your ship lost power over an unknown world and came down in an alien sea.
// Dive for the parts that make it a spaceship again. Then go home.
//
// Single-player rail shooter with hand-rolled 3D projection: the camera dives
// into the screen, enemies grow out of the deep, everything is luminous
// wireframe on near-black. Full run: story → title → sea → launch → orbit →
// scores.

// --- Logical resolution: 400x300, integer-scaled to the 800x600 cabinet ---
const W = 400;
const H = 300;
const CX = W / 2;
const CY = H / 2;

// --- Projection ---
const FOCAL = 140;
const SHIP_Z = 70; // player's distance from camera
const FAR = 1000; // fog limit

// --- Palette: monochrome brand neutrals + hostile rust ---
const INK = 0xf5f5f5;
const INK_HI = 0xeef2f7;
const RUST = 0xa65240; // danger only
const INK_CSS = '#eef2f7';
const DIM_CSS = '#8a9099';

// --- Feel ---
const RAIL_SPEED = 520; // forward speed, camera units/s
const ACCEL = 1400;
const MAX_V = 170;
const DAMP = 7;
const BANK = 0.005;
const ROLL_MS = 450;
const ROLL_COOLDOWN_MS = 1100;
const ROLL_KICK = 300;
const FIRE_MS = 170;
const BOLT_SPEED = 1300;

const BOUND_X = 34;
const BOUND_TOP = 44;
const BOUND_BOTTOM = 34;

// --- The sea ---
const SEA_DEPTH = 3000; // metres to the bottom of the run
const DESCENT = 55; // metres/s
// Depth bands: [start, r, g, b] — pale grey-lit shallows dying into black
const BANDS = [
  [0, 0x30, 0x36, 0x3d],
  [750, 0x1c, 0x1f, 0x24],
  [1500, 0x0e, 0x10, 0x13],
  [2250, 0x06, 0x06, 0x08],
  [SEA_DEPTH, 0x04, 0x04, 0x06],
];
// The three parts, one per deeper band
const PARTS = [
  { name: 'ENGINE', depth: 1100 },
  { name: 'NAV CORE', depth: 1900 },
  { name: 'REACTOR', depth: 2750 },
];
const ABYSS_AT = 2250;

// --- Orbit ---
const CHARGE_TIME = 40; // seconds of hyperjump charge
const KILL_CHARGE = 1.5; // seconds of charge per kill

const HULL_MAX = 3;
const SCORE_KEY = 'space-explorer:scores';

const STORY = [
  'Your ship lost power over an unknown world.',
  'It came down in an alien sea.',
  'The hull held. The engines didn’t.',
  'Everything you need to leave is somewhere below.',
  'Find it. Then go home.',
];

// --------------------------------------------------------------------------
// Arcade cabinet button → keyboard key mapping.
// DO NOT modify this mapping — it matches the real arcade cabinet wiring.
// To add local testing shortcuts, append extra keys to any array.
const CABINET_KEYS = {
  P1_U: ['w'],
  P1_D: ['s'],
  P1_L: ['a'],
  P1_R: ['d'],
  P1_1: ['u'],
  P1_2: ['i'],
  P1_3: ['o'],
  P1_4: ['j'],
  P1_5: ['k'],
  P1_6: ['l'],
  P2_U: ['ArrowUp'],
  P2_D: ['ArrowDown'],
  P2_L: ['ArrowLeft'],
  P2_R: ['ArrowRight'],
  P2_1: ['r'],
  P2_2: ['t'],
  P2_3: ['y'],
  P2_4: ['f'],
  P2_5: ['g'],
  P2_6: ['h'],
  START1: ['Enter'],
  START2: ['2'],
};

const KEY_TO_ARCADE = {};
for (const [code, keys] of Object.entries(CABINET_KEYS)) {
  for (const key of keys) {
    KEY_TO_ARCADE[key.length === 1 ? key.toLowerCase() : key] = code;
  }
}

const held = Object.create(null);
const pressed = Object.create(null); // edge-triggered, cleared each frame

window.addEventListener('keydown', (e) => {
  const code = KEY_TO_ARCADE[e.key.length === 1 ? e.key.toLowerCase() : e.key];
  if (code && !held[code]) {
    held[code] = true;
    pressed[code] = true;
    Sfx.init(); // audio may only start on a user gesture
  }
});
window.addEventListener('keyup', (e) => {
  const code = KEY_TO_ARCADE[e.key.length === 1 ? e.key.toLowerCase() : e.key];
  if (code) held[code] = false;
});

function clearPressed() {
  for (const k in pressed) pressed[k] = false;
}

function anyStart() {
  return pressed.START1 || pressed.START2 || pressed.P1_1;
}

// --- Storage (arcade bridge, localStorage fallback) ---
function getStorage() {
  if (window.platanusArcadeStorage) return window.platanusArcadeStorage;
  return {
    async get(key) {
      try {
        const raw = window.localStorage.getItem(key);
        return raw === null
          ? { found: false, value: null }
          : { found: true, value: JSON.parse(raw) };
      } catch {
        return { found: false, value: null };
      }
    },
    async set(key, value) {
      try {
        window.localStorage.setItem(key, JSON.stringify(value));
      } catch {}
    },
  };
}

// Top-5 scores, shape-validated: storage persists across releases
async function loadScores() {
  const res = await getStorage().get(SCORE_KEY);
  if (!res.found || !res.value || !Array.isArray(res.value.scores)) return [];
  return res.value.scores
    .filter((s) => s && typeof s.n === 'string' && typeof s.s === 'number')
    .map((s) => ({ n: s.n.slice(0, 3).toUpperCase(), s: Math.floor(s.s) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, 5);
}

async function saveScores(scores) {
  await getStorage().set(SCORE_KEY, { v: 1, scores });
}

// --------------------------------------------------------------------------
// Audio: everything synthesised, everything routed through one lowpass whose
// cutoff falls with depth — the sea muffles the world, launch opens it up.
const Sfx = {
  ctx: null,
  out: null,
  filter: null,
  nextStep: 0,
  step: 0,
  music: false,

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.out = this.ctx.createGain();
    this.out.gain.value = 0.45;
    this.filter = this.ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.value = 8000;
    this.filter.connect(this.out);
    this.out.connect(this.ctx.destination);
  },

  cutoff(hz) {
    if (this.ctx) this.filter.frequency.setTargetAtTime(hz, this.ctx.currentTime, 0.12);
  },

  tone(f0, dur, type, vol, f1, at) {
    if (!this.ctx) return;
    const t = (at || this.ctx.currentTime) + 0.001;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type || 'square';
    osc.frequency.setValueAtTime(f0, t);
    if (f1) osc.frequency.linearRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(vol || 0.2, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(g);
    g.connect(this.filter);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  },

  noise(dur, vol) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    const g = this.ctx.createGain();
    src.buffer = buf;
    g.gain.value = vol;
    src.connect(g);
    g.connect(this.filter);
    src.start(t);
  },

  fire() {
    this.tone(760, 0.07, 'square', 0.11, 320);
  },
  boom() {
    this.noise(0.3, 0.4);
    this.tone(110, 0.28, 'sawtooth', 0.22, 40);
  },
  hurt() {
    this.noise(0.2, 0.4);
    this.tone(140, 0.3, 'sawtooth', 0.32, 55);
  },
  pickup() {
    this.tone(660, 0.06, 'square', 0.14);
    this.tone(990, 0.09, 'square', 0.14, 0, this.ctx && this.ctx.currentTime + 0.07);
  },
  part() {
    const t = this.ctx && this.ctx.currentTime;
    [440, 554, 659, 880].forEach((f, i) => this.tone(f, 0.5, 'triangle', 0.16, 0, t + i * 0.09));
  },
  roll() {
    this.tone(280, 0.22, 'sine', 0.16, 900);
  },
  launch() {
    this.noise(1.6, 0.35);
    this.tone(90, 2.2, 'sawtooth', 0.25, 700);
  },
  jump() {
    const t = this.ctx && this.ctx.currentTime;
    [330, 440, 554, 659, 880, 1108].forEach((f, i) => this.tone(f, 0.4, 'triangle', 0.16, 0, t + i * 0.09));
  },
  over() {
    this.tone(160, 1.1, 'sawtooth', 0.2, 55);
  },

  // A tiny step sequencer at 100 BPM (a 16th = 150 ms): synth bass + arpeggio
  BASS: [55, 0, 0, 0, 55, 0, 0, 0, 65.4, 0, 0, 0, 49, 0, 49, 0],
  ARP: [220, 330, 440, 330, 262, 330, 523, 440, 220, 330, 440, 330, 196, 294, 440, 587],

  tick() {
    if (!this.ctx || !this.music) return;
    const now = this.ctx.currentTime;
    if (this.nextStep < now) this.nextStep = now + 0.05;
    while (this.nextStep < now + 0.12) {
      const s = this.step % 16;
      const bass = this.BASS[s];
      if (bass) this.tone(bass, 0.26, 'triangle', 0.2, 0, this.nextStep);
      this.tone(this.ARP[s], 0.1, 'sine', 0.06, 0, this.nextStep);
      this.step++;
      this.nextStep += 0.15;
    }
  },
};

// --------------------------------------------------------------------------
// The player's ship: wireframe dart. +z is the nose, into the screen; -y up.
const SHIP_MODEL = [
  [
    [0, 0, 13],
    [-9, 0, -8],
    [9, 0, -8],
    [0, -6, -8],
    [0, 1.5, -6],
  ],
  [
    [0, 1],
    [0, 2],
    [0, 3],
    [0, 4],
    [1, 4],
    [2, 4],
    [1, 3],
    [2, 3],
  ],
];
const PITCH_BASE = -0.22; // the camera sits a touch above and behind

// Flat wireframe outlines for everything that comes out of the deep
const SHAPES = {
  mine: [
    [0, -7], [5, -2], [7, 0], [5, 2], [0, 7], [-5, 2], [-7, 0], [-5, -2],
  ],
  drone: [
    [0, -3], [8, 2], [3, 1], [0, 4], [-3, 1], [-8, 2],
  ],
  rock: [
    [-2, -8], [5, -6], [8, 0], [4, 7], [-4, 6], [-8, 1], [-6, -5],
  ],
  scrap: [
    [0, -3], [3, 2], [-3, 2],
  ],
  part: [
    [0, -8], [6, 0], [0, 8], [-6, 0],
  ],
};

function typeIn(scene, textObj, full, cps, onDone) {
  // The write-in: letters simply arrive, left to right
  let i = 0;
  const ev = scene.time.addEvent({
    delay: 1000 / cps,
    repeat: full.length - 1,
    callback: () => {
      i++;
      textObj.setText(full.slice(0, i));
      if (i >= full.length && onDone) onDone();
    },
  });
  return ev;
}

const FONT = (size, color) => ({
  fontFamily: 'monospace',
  fontSize: size + 'px',
  color: color || INK_CSS,
});

// --------------------------------------------------------------------------
class Story extends Phaser.Scene {
  constructor() {
    super('story');
  }

  create() {
    this.events.on('postupdate', clearPressed);
    this.lines = [];
    this.done = false;
    const startY = CY - (STORY.length * 16) / 2;
    let delay = 400;
    STORY.forEach((line, i) => {
      const t = this.add.text(CX, startY + i * 16, '', FONT(8)).setOrigin(0.5, 0);
      this.lines.push(t);
      this.time.delayedCall(delay, () => {
        typeIn(this, t, line, 32, i === STORY.length - 1 ? () => (this.done = true) : null);
      });
      delay += line.length * (1000 / 32) + 500;
    });
    this.time.delayedCall(delay + 2600, () => this.next());
  }

  next() {
    if (this.left) return;
    this.left = true;
    this.scene.start('title');
  }

  update() {
    if (anyStart()) this.next();
  }
}

// --------------------------------------------------------------------------
class Title extends Phaser.Scene {
  constructor() {
    super('title');
  }

  create() {
    this.events.on('postupdate', clearPressed);
    this.gfx = this.add.graphics();
    this.spin = 0;

    this.add.text(CX, 74, 'S P A C E  E X P L O R E R', FONT(16)).setOrigin(0.5);
    this.press = this.add.text(CX, H - 62, 'PRESS START', FONT(8)).setOrigin(0.5);
    this.add
      .text(CX, H - 20, 'STICK MOVE · BTN 1 FIRE · BTN 2 ROLL', FONT(8, DIM_CSS))
      .setOrigin(0.5)
      .setAlpha(0.7);

    this.scoreText = this.add.text(CX, 158, '', FONT(8, DIM_CSS)).setOrigin(0.5, 0).setLineSpacing(4);
    loadScores().then((scores) => {
      if (!scores.length || !this.scene.isActive()) return;
      this.scoreText.setText(scores.map((s, i) => `${i + 1}  ${s.n.padEnd(3)}  ${String(s.s).padStart(6, '0')}`).join('\n'));
    });
  }

  update(time, delta) {
    // the ship, slowly rolling over the wordmark — the game's one ornament
    this.spin += delta * 0.0009;
    this.gfx.clear();
    drawShipModel(this.gfx, CX, 118, this.spin, 0, PITCH_BASE, 1.4);
    this.press.setAlpha(Math.floor(time / 600) % 2 ? 1 : 0.25); // 100 BPM blink
    if (anyStart()) {
      Sfx.music = true;
      this.scene.start('game');
    }
  }
}

function drawShipModel(g, sx, sy, roll, yaw, pitch, size) {
  const [verts, edges] = SHIP_MODEL;
  const cr = Math.cos(roll);
  const sr = Math.sin(roll);
  const cyw = Math.cos(yaw);
  const syw = Math.sin(yaw);
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  const pts = verts.map(([mx, my, mz]) => {
    let x = mx * cr - my * sr;
    let y = mx * sr + my * cr;
    let z = mz;
    const x2 = x * cyw + z * syw;
    z = -x * syw + z * cyw;
    x = x2;
    const y2 = y * cp - z * sp;
    z = y * sp + z * cp;
    y = y2;
    const p = (FOCAL / (SHIP_Z + z)) * 0.9 * size;
    return [sx + x * p, sy + y * p];
  });
  g.lineStyle(1, INK, 1);
  for (const [a, b] of edges) {
    g.beginPath();
    g.moveTo(pts[a][0], pts[a][1]);
    g.lineTo(pts[b][0], pts[b][1]);
    g.strokePath();
  }
}

// --------------------------------------------------------------------------
class Game extends Phaser.Scene {
  constructor() {
    super('game');
  }

  create() {
    this.events.on('postupdate', clearPressed);
    this.gfx = this.add.graphics();

    // player
    this.px = CX;
    this.py = CY + 40;
    this.pvx = 0;
    this.pvy = 0;
    this.roll = 0;
    this.spin = 0;
    this.rollReadyAt = 0;
    this.fireReadyAt = 0;
    this.invulnUntil = 0;
    this.hull = HULL_MAX;

    // world
    this.phase = 'sea'; // sea → launch → space → out (dead or home)
    this.depth = 0;
    this.charge = 0;
    this.score = 0;
    this.partsGot = 0;
    this.partLive = false; // the current part is on screen
    this.launchT = 0;
    this.spawnAt = 0;
    this.shake = 0;
    this.vp = { x: CX, y: CY - 20 };

    this.ents = []; // everything that comes out of the deep
    this.bolts = []; // player fire
    this.shots = []; // enemy fire, rust
    this.booms = []; // expanding wireframe blasts

    this.buildStreaks();
    this.buildHud();

    this.flash = this.add.rectangle(CX, CY, W, H, 0xffffff).setAlpha(0).setDepth(10);
    window.__g = this; // debug handle — remove before submission
  }

  buildStreaks() {
    this.streaks = [];
    for (let i = 0; i < 90; i++) {
      this.streaks.push({
        x: (Math.random() - 0.5) * 520,
        y: (Math.random() - 0.5) * 380,
        z: 20 + Math.random() * (FAR - 20),
        w: Math.random(), // bubble wobble phase
      });
    }
  }

  buildHud() {
    this.depthText = this.add.text(6, 5, '', FONT(8)).setAlpha(0.85);
    this.scoreText = this.add.text(W - 6, 5, '', FONT(8)).setOrigin(1, 0).setAlpha(0.85);
    this.partText = this.add.text(W - 6, H - 13, '', FONT(8, DIM_CSS)).setOrigin(1, 0);
    this.hullText = this.add.text(6, H - 13, '', FONT(8)).setAlpha(0.85);
    this.label = this.add.text(0, 0, '', FONT(8)).setOrigin(0.5).setVisible(false);
    this.notice = this.add.text(CX, 92, '', FONT(8)).setOrigin(0.5).setAlpha(0);
    this.hint = this.add
      .text(CX, H - 28, 'STICK MOVE · BTN 1 FIRE · BTN 2 ROLL', FONT(8, DIM_CSS))
      .setOrigin(0.5)
      .setAlpha(0.5);
    this.time.delayedCall(6000, () => this.tweens.add({ targets: this.hint, alpha: 0, duration: 800 }));
  }

  say(msg) {
    this.notice.setText(msg).setAlpha(1);
    this.tweens.add({ targets: this.notice, alpha: 0, delay: 1600, duration: 700 });
  }

  // --- flow ---
  update(time, delta) {
    const dt = Math.min(delta, 50) / 1000;
    Sfx.tick();

    if (this.phase === 'sea') this.updateSea(dt);
    else if (this.phase === 'launch') this.updateLaunch(dt);
    else if (this.phase === 'space') this.updateSpace(dt);

    if (this.phase !== 'out') this.updatePlayer(time, dt);
    this.updateEnts(time, dt);
    this.updateBolts(dt);
    this.updateStreaks(dt);

    // camera sway from the ship
    const tx = CX - (this.px - CX) * 0.14;
    const ty = CY - 20 - (this.py - CY) * 0.1;
    this.vp.x += (tx - this.vp.x) * Math.min(1, 4 * dt);
    this.vp.y += (ty - this.vp.y) * Math.min(1, 4 * dt);
    if (this.shake > 0) {
      this.vp.x += (Math.random() - 0.5) * this.shake;
      this.vp.y += (Math.random() - 0.5) * this.shake;
      this.shake = Math.max(0, this.shake - 30 * dt);
    }

    this.draw(time);
    this.updateHud();
  }

  updateSea(dt) {
    // the rail descends; it stalls at each part until the part is aboard
    const next = PARTS[this.partsGot];
    const cap = next ? next.depth + 40 : SEA_DEPTH;
    this.depth = Math.min(this.depth + DESCENT * dt, cap);

    // the sea muffles the music as you sink
    Sfx.cutoff(4500 - (this.depth / SEA_DEPTH) * 4000);

    // the current part surfaces near its depth, and returns if missed
    if (next && !this.partLive && this.depth > next.depth - 120) {
      this.partLive = true;
      this.ents.push({
        k: 'part',
        x: (Math.random() - 0.5) * 200,
        y: (Math.random() - 0.5) * 120,
        z: FAR,
        r: 8,
        hp: 1,
        t: 0,
        name: next.name,
      });
    }

    this.spawnSea(dt);
  }

  spawnSea(dt) {
    this.spawnAt -= dt;
    if (this.spawnAt > 0) return;
    const band = Math.min(3, Math.floor((this.depth / SEA_DEPTH) * 4));
    this.spawnAt = [2.0, 1.6, 1.3, 1.1][band];
    const roll = Math.random();
    const e = {
      x: (Math.random() - 0.5) * 300,
      y: (Math.random() - 0.5) * 200,
      z: FAR,
      t: 0,
      hp: 1,
    };
    if (roll < 0.3) {
      e.k = 'scrap';
      e.r = 5;
    } else if (roll < 0.62 || band === 0) {
      e.k = 'mine';
      e.r = 8;
      e.vy = 6 + Math.random() * 8; // tethered bob
    } else if (band >= 3 && roll < 0.85) {
      e.k = 'eel';
      e.r = 7;
      e.dir = Math.random() < 0.5 ? 1 : -1;
      e.x = -e.dir * 260;
    } else {
      e.k = 'drone';
      e.r = 8;
      e.standoff = 240 + Math.random() * 120;
      e.fireAt = 1.2 + Math.random();
      e.leaveAt = 6 + Math.random() * 3;
    }
    this.ents.push(e);
  }

  updateLaunch(dt) {
    // the money shot: full throttle up through every band into the sky
    this.launchT += dt;
    this.depth = Math.max(0, this.depth - 1400 * dt);
    Sfx.cutoff(4500 - (this.depth / SEA_DEPTH) * 4000);
    if (this.launchT > 2.4 && !this.broke) {
      this.broke = true; // the surface breaks
      this.flash.setAlpha(1);
      this.tweens.add({ targets: this.flash, alpha: 0, duration: 700 });
      Sfx.cutoff(8000);
    }
    if (this.launchT > 3.4) {
      this.phase = 'space';
      this.say('ORBIT. CHARGE THE HYPERJUMP.');
    }
  }

  updateSpace(dt) {
    this.charge = Math.min(CHARGE_TIME, this.charge + dt);
    this.spawnSpace(dt);
    if (this.charge >= CHARGE_TIME && !this.jumping) {
      this.jumping = true;
      Sfx.jump();
      this.flash.setAlpha(1);
      this.tweens.add({ targets: this.flash, alpha: 0, duration: 900 });
      this.score += 500 + this.hull * 150;
      this.phase = 'out';
      this.time.delayedCall(1000, () => this.scene.start('over', { win: true, score: this.score }));
    }
  }

  spawnSpace(dt) {
    this.spawnAt -= dt;
    if (this.spawnAt > 0) return;
    this.spawnAt = 1.0 + Math.random() * 0.5;
    const roll = Math.random();
    const e = {
      x: (Math.random() - 0.5) * 300,
      y: (Math.random() - 0.5) * 200,
      z: FAR,
      t: 0,
    };
    if (roll < 0.45) {
      e.k = 'rock';
      e.r = 12;
      e.hp = 2;
      e.spin = (Math.random() - 0.5) * 2;
      e.vx = (Math.random() - 0.5) * 30;
      e.vyy = (Math.random() - 0.5) * 30;
    } else {
      e.k = 'drone';
      e.space = true;
      e.r = 8;
      e.hp = 1;
      e.standoff = 200 + Math.random() * 140;
      e.fireAt = 0.9 + Math.random() * 0.7;
      e.leaveAt = 6 + Math.random() * 3;
    }
    this.ents.push(e);
  }

  // --- player ---
  updatePlayer(time, dt) {
    const ix = (held.P1_R ? 1 : 0) - (held.P1_L ? 1 : 0);
    const iy = (held.P1_D ? 1 : 0) - (held.P1_U ? 1 : 0);

    this.pvx += ix * ACCEL * dt;
    this.pvy += iy * ACCEL * dt;
    if (!ix) this.pvx -= this.pvx * Math.min(1, DAMP * dt);
    if (!iy) this.pvy -= this.pvy * Math.min(1, DAMP * dt);
    const v = Math.hypot(this.pvx, this.pvy);
    if (v > MAX_V) {
      this.pvx = (this.pvx / v) * MAX_V;
      this.pvy = (this.pvy / v) * MAX_V;
    }
    this.px = Phaser.Math.Clamp(this.px + this.pvx * dt, BOUND_X, W - BOUND_X);
    this.py = Phaser.Math.Clamp(this.py + this.pvy * dt, BOUND_TOP, H - BOUND_BOTTOM);
    this.roll += (this.pvx * BANK - this.roll) * Math.min(1, 12 * dt);

    // barrel roll: the dodge — full spin, lateral kick, a moment untouchable
    if (pressed.P1_2 && time >= this.rollReadyAt) {
      this.rollReadyAt = time + ROLL_COOLDOWN_MS;
      this.invulnUntil = Math.max(this.invulnUntil, time + ROLL_MS + 150);
      const dir = ix !== 0 ? ix : this.pvx >= 0 ? 1 : -1;
      this.pvx += dir * ROLL_KICK;
      this.spin = 0;
      Sfx.roll();
      this.tweens.add({
        targets: this,
        spin: dir * Math.PI * 2,
        duration: ROLL_MS,
        ease: 'Cubic.easeOut',
        onComplete: () => (this.spin = 0),
      });
    }

    if (held.P1_1 && time >= this.fireReadyAt && this.phase !== 'launch') {
      this.fireReadyAt = time + FIRE_MS;
      Sfx.fire();
      this.bolts.push({
        x: ((this.px - this.vp.x) * SHIP_Z) / FOCAL,
        y: ((this.py - this.vp.y) * SHIP_Z) / FOCAL,
        z: SHIP_Z + 14,
      });
    }
  }

  playerCam() {
    return [((this.px - this.vp.x) * SHIP_Z) / FOCAL, ((this.py - this.vp.y) * SHIP_Z) / FOCAL];
  }

  hitPlayer(time) {
    if (time < this.invulnUntil || this.phase === 'out') return;
    this.invulnUntil = time + 1300;
    this.hull--;
    this.shake = 7;
    Sfx.hurt();
    if (this.hull <= 0) {
      this.phase = 'out';
      this.booms.push({ x: this.px, y: this.py, t: 0, big: true });
      Sfx.boom();
      this.time.delayedCall(1400, () => this.scene.start('over', { win: false, score: this.score }));
    }
  }

  // --- the deep ---
  updateEnts(time, dt) {
    const rail = this.phase === 'launch' ? RAIL_SPEED * 3 : RAIL_SPEED;
    const [pcx, pcy] = this.playerCam();

    for (const e of this.ents) {
      e.t += dt;
      // approach on the rail, minus any standoff a drone holds
      let vz = rail;
      if (e.k === 'drone') {
        if (e.t < e.leaveAt && e.z < e.standoff + 60) vz = (e.z - e.standoff) * 2;
        // strafe, and track the player a little
        e.x += (pcx - e.x) * 0.4 * dt + Math.sin(e.t * 2.4) * 26 * dt;
        e.y += (pcy - e.y) * 0.3 * dt;
        e.fireAt -= dt;
        if (e.fireAt <= 0 && e.z < 500) {
          e.fireAt = e.space ? 1.3 : 1.9;
          const dx = pcx - e.x;
          const dy = pcy - e.y;
          const dz = SHIP_Z - e.z;
          const m = Math.hypot(dx, dy, dz);
          const sp = e.space ? 420 : 330;
          this.shots.push({ x: e.x, y: e.y, z: e.z, vx: (dx / m) * sp, vy: (dy / m) * sp, vz: (dz / m) * sp });
        }
      } else if (e.k === 'eel') {
        e.x += e.dir * 60 * dt;
        e.y += Math.sin(e.t * 3) * 18 * dt;
        vz = rail * 0.55;
      } else if (e.k === 'mine') {
        e.y += Math.sin(e.t * 2) * e.vy * dt;
      } else if (e.k === 'rock') {
        e.x += e.vx * dt;
        e.y += e.vyy * dt;
      } else if (e.k === 'part') {
        e.y += Math.sin(e.t * 2) * 6 * dt;
        vz = rail * 0.8;
      }
      e.z -= vz * dt;

      // reached the player's plane: collide or slip past
      if (e.z < SHIP_Z + 10 && e.z > SHIP_Z - 14 && !e.dead) {
        const [sx, sy, p] = this.project(e.x, e.y, Math.max(e.z, 24));
        const rr = e.r * p * 0.8 + 7;
        if (Phaser.Math.Distance.Between(sx, sy, this.px, this.py) < rr) {
          if (e.k === 'scrap') {
            e.dead = true;
            this.score += 10;
            Sfx.pickup();
          } else if (e.k === 'part') {
            e.dead = true;
            this.partsGot++;
            this.partLive = false;
            this.score += 100;
            Sfx.part();
            if (this.partsGot >= PARTS.length) {
              this.say('REACTOR IN. TAKE HER UP.');
              this.phase = 'launch';
              this.launchT = 0;
              Sfx.launch();
            } else {
              this.say(e.name + ' IN. ' + (PARTS.length - this.partsGot) + ' BELOW.');
            }
          } else {
            e.dead = true;
            this.booms.push({ x: sx, y: sy, t: 0 });
            this.hitPlayer(time);
          }
        }
      }

      // a missed part swims back for another pass
      if (e.k === 'part' && e.z < 26 && !e.dead) {
        e.z = FAR;
        e.x = (Math.random() - 0.5) * 200;
        e.y = (Math.random() - 0.5) * 120;
      }
    }

    // enemy shots fly straight at where you were
    for (const s of this.shots) {
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.z += (s.vz - (rail - RAIL_SPEED)) * dt;
      if (s.z < SHIP_Z + 8 && s.z > SHIP_Z - 8) {
        const [sx, sy] = this.project(s.x, s.y, Math.max(s.z, 24));
        if (Phaser.Math.Distance.Between(sx, sy, this.px, this.py) < 8) {
          s.dead = true;
          this.hitPlayer(time);
        }
      }
    }

    // player bolts vs the deep
    for (const b of this.bolts) {
      for (const e of this.ents) {
        if (e.dead || e.k === 'scrap' || e.k === 'part') continue;
        if (Math.abs(b.z - e.z) > 40) continue;
        const [ex, ey, p] = this.project(e.x, e.y, e.z);
        const [bx, by] = this.project(b.x, b.y, b.z);
        if (Phaser.Math.Distance.Between(ex, ey, bx, by) < e.r * p + 4) {
          b.dead = true;
          e.hp--;
          if (e.hp <= 0) {
            e.dead = true;
            this.booms.push({ x: ex, y: ey, t: 0 });
            this.score += e.k === 'rock' ? 15 : 25;
            if (this.phase === 'space') this.charge = Math.min(CHARGE_TIME, this.charge + KILL_CHARGE);
            Sfx.boom();
            if (e.k === 'rock' && e.r > 7) {
              for (let i = 0; i < 2; i++) {
                this.ents.push({
                  k: 'rock',
                  x: e.x + (Math.random() - 0.5) * 20,
                  y: e.y + (Math.random() - 0.5) * 20,
                  z: e.z,
                  r: 6,
                  hp: 1,
                  t: 0,
                  spin: (Math.random() - 0.5) * 4,
                  vx: (Math.random() - 0.5) * 60,
                  vyy: (Math.random() - 0.5) * 60,
                });
              }
            }
          }
          break;
        }
      }
    }

    for (const bm of this.booms) bm.t += dt;
    this.ents = this.ents.filter((e) => !e.dead && e.z > 24);
    this.shots = this.shots.filter((s) => !s.dead && s.z > 20 && s.z < FAR);
    this.booms = this.booms.filter((b) => b.t < 0.45);
  }

  updateBolts(dt) {
    for (const b of this.bolts) b.z += BOLT_SPEED * dt;
    this.bolts = this.bolts.filter((b) => !b.dead && b.z < FAR);
  }

  updateStreaks(dt) {
    const speed = this.phase === 'launch' ? RAIL_SPEED * 3.4 : RAIL_SPEED;
    const water = this.phase === 'sea' || (this.phase === 'launch' && !this.broke);
    for (const s of this.streaks) {
      s.z -= speed * dt;
      if (water) {
        // bubbles rise and wobble — the sea, not a starfield
        s.y -= 26 * dt;
        s.x += Math.sin(s.w * 6 + s.y * 0.05) * 14 * dt;
      }
      if (s.z < 16 || s.y < -200) {
        s.z = FAR - Math.random() * 100;
        s.x = (Math.random() - 0.5) * 520;
        s.y = (Math.random() - 0.5) * 380;
      }
    }
  }

  // --- render ---
  project(x, y, z) {
    const p = FOCAL / z;
    return [this.vp.x + x * p, this.vp.y + y * p, p];
  }

  // In the abyss you see by headlamp: things fade with distance from the beam
  lamp(sx, sy) {
    if (this.phase !== 'sea' || this.depth < ABYSS_AT) return 1;
    const t = Math.min(1, (this.depth - ABYSS_AT) / 300);
    const d = Phaser.Math.Distance.Between(sx, sy, this.px, this.py - 24);
    return 1 - t * Phaser.Math.Clamp((d - 60) / 110, 0, 0.92);
  }

  bg() {
    if (this.phase === 'space' || this.broke) return [0x07, 0x07, 0x09];
    const d = this.depth;
    for (let i = 0; i < BANDS.length - 1; i++) {
      if (d <= BANDS[i + 1][0]) {
        const t = (d - BANDS[i][0]) / (BANDS[i + 1][0] - BANDS[i][0]);
        return [0, 1, 2].map((c) => Math.round(BANDS[i][c + 1] + (BANDS[i + 1][c + 1] - BANDS[i][c + 1]) * t));
      }
    }
    return [4, 4, 6];
  }

  draw(time) {
    const g = this.gfx;
    g.clear();
    const [br, bgc, bb] = this.bg();
    this.cameras.main.setBackgroundColor(Phaser.Display.Color.GetColor(br, bgc, bb));
    const water = this.phase === 'sea';

    // streaks: bubbles in the sea, star lines in orbit
    for (const s of this.streaks) {
      const [x1, y1] = this.project(s.x, s.y, s.z);
      const [x2, y2] = this.project(s.x, s.y, s.z + (water ? 14 : 30));
      const fog = 1 - s.z / FAR;
      g.lineStyle(1, INK, 0.4 * fog * fog * this.lamp(x1, y1));
      g.beginPath();
      g.moveTo(x1, y1);
      g.lineTo(x2, y2);
      g.strokePath();
    }

    // player bolts
    for (const b of this.bolts) {
      const [x1, y1] = this.project(b.x, b.y, b.z);
      const [x2, y2] = this.project(b.x, b.y, b.z + 34);
      g.lineStyle(1, INK_HI, 0.9 * (1 - b.z / FAR));
      g.beginPath();
      g.moveTo(x1, y1);
      g.lineTo(x2, y2);
      g.strokePath();
    }

    // enemy shots: rust, always visible — bioluminescent danger
    for (const s of this.shots) {
      const [x1, y1] = this.project(s.x, s.y, s.z);
      g.lineStyle(1, RUST, 0.95);
      g.strokeCircle(x1, y1, Math.max(1.2, 90 / s.z));
    }

    this.label.setVisible(false);
    for (const e of this.ents) this.drawEnt(g, e, time);

    // blasts: expanding wireframe rings
    for (const bm of this.booms) {
      const r = 4 + bm.t * (bm.big ? 90 : 55);
      g.lineStyle(1, bm.big ? INK_HI : RUST, 1 - bm.t / 0.45);
      g.strokeCircle(bm.x, bm.y, r);
    }

    // the ship (blinks while untouchable)
    if (this.phase !== 'out' && (time >= this.invulnUntil || Math.floor(time / 60) % 2)) {
      drawShipModel(g, this.px, this.py, this.roll + this.spin, this.pvx * 0.0016, PITCH_BASE + this.pvy * 0.0016, 1);
      const ember = 0.5 + 0.5 * Math.sin(time * 0.04);
      g.fillStyle(INK_HI, 0.4 + 0.4 * ember);
      g.fillRect(this.px - 1, this.py + 1, 2, 2);
    }

    // hyperjump charge bar
    if (this.phase === 'space') {
      g.lineStyle(1, INK, 0.8);
      g.strokeRect(CX - 50, 16, 100, 5);
      g.fillStyle(INK_HI, 0.9);
      g.fillRect(CX - 49, 17, 98 * (this.charge / CHARGE_TIME), 3);
    }
  }

  drawEnt(g, e, time) {
    const [sx, sy, p] = this.project(e.x, e.y, e.z);
    const fog = Phaser.Math.Clamp(1.15 - e.z / FAR, 0, 1);
    const lamp = e.k === 'part' ? 1 : this.lamp(sx, sy);
    const a = fog * lamp;
    if (a <= 0.02) {
      // in the dark, hunters show only a rust glint
      if (e.k !== 'scrap' && e.k !== 'part' && fog > 0.1) {
        g.fillStyle(RUST, 0.5 * fog);
        g.fillRect(sx, sy, 1.5, 1.5);
      }
      return;
    }

    if (e.k === 'eel') {
      // a sinuous line, swimming
      g.lineStyle(1, RUST, a);
      g.beginPath();
      for (let i = 0; i < 7; i++) {
        const ex = sx - i * 9 * e.dir * p * 3;
        const ey = sy + Math.sin(e.t * 4 + i * 0.9) * 5 * p * 3;
        if (i === 0) g.moveTo(ex, ey);
        else g.lineTo(ex, ey);
      }
      g.strokePath();
      g.fillStyle(RUST, a);
      g.fillRect(sx - 1, sy - 1, 2, 2);
      return;
    }

    const shape = SHAPES[e.k];
    const hostile = e.k !== 'scrap' && e.k !== 'part';
    const rot = e.k === 'rock' ? e.t * e.spin : e.k === 'part' ? e.t * 1.2 : 0;
    const cr = Math.cos(rot);
    const sr = Math.sin(rot);
    const sc = p * (e.k === 'part' ? 3.4 : 3);
    g.lineStyle(1, hostile ? RUST : e.k === 'part' ? INK_HI : INK, a);
    g.beginPath();
    shape.forEach(([mx, my], i) => {
      const rx = sx + (mx * cr - my * sr) * sc;
      const ry = sy + (mx * sr + my * cr) * sc;
      if (i === 0) g.moveTo(rx, ry);
      else g.lineTo(rx, ry);
    });
    g.closePath();
    g.strokePath();

    if (e.k === 'mine') {
      // the tether, and a slow-blinking eye
      g.lineStyle(1, RUST, a * 0.4);
      g.beginPath();
      g.moveTo(sx, sy + 7 * sc);
      g.lineTo(sx, sy + 16 * sc);
      g.strokePath();
      if (Math.floor(time / 500) % 2) {
        g.fillStyle(RUST, a);
        g.fillRect(sx - 1, sy - 1, 2, 2);
      }
    }
    if (e.k === 'part') {
      // a pulsing ring says "this one matters"
      g.lineStyle(1, INK_HI, a * (0.4 + 0.3 * Math.sin(e.t * 4)));
      g.strokeCircle(sx, sy, 11 * sc + Math.sin(e.t * 4) * 2);
      if (e.z < 520) {
        this.label.setVisible(true).setPosition(sx, sy + 12 * sc + 8).setText(e.name);
      }
    }
  }

  updateHud() {
    if (this.phase === 'space') this.depthText.setText('ORBIT');
    else this.depthText.setText('DEPTH ' + String(Math.floor(this.depth)).padStart(4, '0') + 'M');
    this.scoreText.setText(String(this.score).padStart(6, '0'));
    this.hullText.setText('HULL ' + '▸'.repeat(this.hull) + '·'.repeat(HULL_MAX - this.hull));
    this.partText.setText(PARTS.map((p, i) => (i < this.partsGot ? p.name[0] : '·')).join(' '));
  }
}

// --------------------------------------------------------------------------
class Over extends Phaser.Scene {
  constructor() {
    super('over');
  }

  init(data) {
    this.win = data.win;
    this.score = data.score || 0;
  }

  create() {
    this.events.on('postupdate', clearPressed);
    this.ready = false;
    if (this.win) Sfx.cutoff(8000);
    else Sfx.over();
    Sfx.music = false;

    const head = this.add.text(CX, CY - 40, '', FONT(16)).setOrigin(0.5);
    typeIn(this, head, this.win ? 'YOU MADE IT HOME.' : 'GAME OVER', 24);
    this.add.text(CX, CY, 'SCORE  ' + String(this.score).padStart(6, '0'), FONT(8)).setOrigin(0.5);

    loadScores().then((scores) => {
      this.qualifies = scores.length < 5 || this.score > scores[scores.length - 1].s;
      this.time.delayedCall(1200, () => (this.ready = true));
    });
    this.time.delayedCall(9000, () => this.next());
  }

  next() {
    if (this.left) return;
    this.left = true;
    if (this.qualifies && this.score > 0) this.scene.start('initials', { score: this.score });
    else this.scene.start('title');
  }

  update() {
    if (this.ready && anyStart()) this.next();
  }
}

// --------------------------------------------------------------------------
class Initials extends Phaser.Scene {
  constructor() {
    super('initials');
  }

  init(data) {
    this.score = data.score || 0;
  }

  create() {
    this.events.on('postupdate', clearPressed);
    this.letters = [0, 0, 0]; // indices into A–Z
    this.slot = 0;
    this.saving = false;

    this.add.text(CX, CY - 56, 'YOU MADE THE TOP 5', FONT(8)).setOrigin(0.5);
    this.add.text(CX, CY - 40, 'SCORE  ' + String(this.score).padStart(6, '0'), FONT(8, DIM_CSS)).setOrigin(0.5);
    this.slots = [0, 1, 2].map((i) => this.add.text(CX - 24 + i * 24, CY + 4, 'A', FONT(16)).setOrigin(0.5));
    this.add.text(CX, CY + 44, 'STICK PICK · BTN 1 NEXT', FONT(8, DIM_CSS)).setOrigin(0.5).setAlpha(0.7);
  }

  update(time) {
    if (this.saving) return;
    const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (pressed.P1_U) this.letters[this.slot] = (this.letters[this.slot] + 25) % 26;
    if (pressed.P1_D) this.letters[this.slot] = (this.letters[this.slot] + 1) % 26;
    if (pressed.P1_L) this.slot = Math.max(0, this.slot - 1);
    if (pressed.P1_R) this.slot = Math.min(2, this.slot + 1);
    if (pressed.P1_U || pressed.P1_D) Sfx.pickup();

    if (pressed.P1_1 || pressed.START1) {
      if (this.slot < 2) this.slot++;
      else {
        this.saving = true;
        const name = this.letters.map((l) => A[l]).join('');
        loadScores().then((scores) => {
          scores.push({ n: name, s: this.score });
          scores.sort((a, b) => b.s - a.s);
          saveScores(scores.slice(0, 5)).then(() => this.scene.start('title'));
        });
      }
    }

    this.slots.forEach((t, i) => {
      t.setText(A[this.letters[i]]);
      t.setAlpha(i === this.slot ? (Math.floor(time / 300) % 2 ? 1 : 0.35) : 0.8);
    });
  }
}

// --------------------------------------------------------------------------
const config = {
  type: Phaser.AUTO,
  width: W,
  height: H,
  parent: 'game-root',
  backgroundColor: '#070709',
  pixelArt: true,
  roundPixels: true,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [Story, Title, Game, Over, Initials],
};

new Phaser.Game(config);
