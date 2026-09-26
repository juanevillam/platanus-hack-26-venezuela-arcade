// Space Explorer — Platanus Hack 26: Caracas Arcade Challenge
// Two explorers down in an alien sea. Dive for the parts, then go home.
//
// Co-op rail shooter with hand-rolled 3D projection: the camera flies into
// the screen, enemies grow out of the deep, everything is luminous wireframe
// on near-black. Milestone: rail engine + two-ship flight feel.

// --- Logical resolution: 400x300, integer-scaled to the 800x600 cabinet ---
const W = 400;
const H = 300;
const CX = W / 2;
const CY = H / 2;

// --- Projection ---
const FOCAL = 140; // focal length
const SHIP_Z = 70; // players' distance from camera
const FAR = 1000; // fog limit

// --- Palette: monochrome brand neutrals + hostile rust ---
const INK = 0xf5f5f5; // luminous line-work
const INK_HI = 0xeef2f7; // bright glints
const RUST = 0xa65240; // danger only — enemies, when they arrive

// --- Feel ---
const RAIL_SPEED = 520; // forward speed, camera units/s
const ACCEL = 1400; // screen-plane acceleration, px/s²
const MAX_V = 170; // screen-plane max speed, px/s
const DAMP = 7; // 1/s, drift decay with stick released
const BANK = 0.005; // roll per px/s of lateral speed
const ROLL_MS = 450; // barrel roll duration
const ROLL_COOLDOWN_MS = 1100;
const ROLL_KICK = 300; // lateral impulse from a barrel roll
const FIRE_MS = 150; // time between bolts
const BOLT_SPEED = 1300; // camera units/s into the screen

// Screen-plane flight box
const BOUND_X = 34;
const BOUND_TOP = 44;
const BOUND_BOTTOM = 34;

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
  }
});
window.addEventListener('keyup', (e) => {
  const code = KEY_TO_ARCADE[e.key.length === 1 ? e.key.toLowerCase() : e.key];
  if (code) held[code] = false;
});

function clearPressed() {
  for (const k in pressed) pressed[k] = false;
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

// --------------------------------------------------------------------------
// Wireframe ship models: [vertices, edges]. +z is the nose, into the screen.
// -y is up. Two silhouettes so the players read apart at a glance.

// P1 — the dart: single dorsal fin
const MODEL_P1 = [
  [
    [0, 0, 13], // 0 nose
    [-9, 0, -8], // 1 wing L
    [9, 0, -8], // 2 wing R
    [0, -6, -8], // 3 fin tip
    [0, 1.5, -6], // 4 keel
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

// P2 — the manta: wide diamond wing with twin tail fins
const MODEL_P2 = [
  [
    [0, 0, 12], // 0 nose
    [-13, 1, -7], // 1 wingtip L
    [13, 1, -7], // 2 wingtip R
    [0, 0.5, -6], // 3 tail
    [-6, -5, -8], // 4 fin tip L
    [6, -5, -8], // 5 fin tip R
  ],
  [
    [0, 1],
    [0, 2],
    [1, 3],
    [2, 3],
    [1, 4],
    [3, 4],
    [2, 5],
    [3, 5],
  ],
];

// The camera sits a touch above and behind, so ships show their top surface
const PITCH_BASE = -0.22;

// --------------------------------------------------------------------------
class Boot extends Phaser.Scene {
  constructor() {
    super('boot');
  }
  create() {
    this.scene.start('rail');
  }
}

// --------------------------------------------------------------------------
class Rail extends Phaser.Scene {
  constructor() {
    super('rail');
  }

  create() {
    this.gfx = this.add.graphics();
    this.ships = [
      this.makeShip(1, CX - 60, CY + 30, MODEL_P1),
      this.makeShip(2, CX + 60, CY + 30, MODEL_P2),
    ];
    this.bolts = [];
    this.buildStreaks();
    this.buildHud();
    this.vp = { x: CX, y: CY - 20 }; // vanishing point, sways with flight
    this.events.on('postupdate', clearPressed);
    window.__rail = this; // debug handle — remove before submission
  }

  makeShip(player, x, y, model) {
    return {
      player,
      x,
      y,
      vx: 0,
      vy: 0,
      roll: 0, // banking
      spin: 0, // barrel roll offset
      spinTween: null,
      rollReadyAt: 0,
      fireReadyAt: 0,
      alive: true,
      model,
    };
  }

  buildStreaks() {
    // Marine snow streaming past the camera: points in camera space
    this.streaks = [];
    for (let i = 0; i < 90; i++) {
      this.streaks.push({
        x: (Math.random() - 0.5) * 520,
        y: (Math.random() - 0.5) * 380,
        z: 20 + Math.random() * (FAR - 20),
      });
    }
  }

  buildHud() {
    const style = { fontFamily: 'monospace', fontSize: '8px', color: '#eef2f7' };
    this.hintText = this.add
      .text(CX, H - 14, 'STICK MOVE · BTN 1 FIRE · BTN 2 ROLL', style)
      .setOrigin(0.5, 0)
      .setAlpha(0.5);
    this.time.delayedCall(7000, () => {
      this.tweens.add({ targets: this.hintText, alpha: 0, duration: 900 });
    });
  }

  // --- per-player input, read through arcade codes only ---
  stick(p) {
    const pre = 'P' + p + '_';
    return {
      x: (held[pre + 'R'] ? 1 : 0) - (held[pre + 'L'] ? 1 : 0),
      y: (held[pre + 'D'] ? 1 : 0) - (held[pre + 'U'] ? 1 : 0),
      fire: held[pre + '1'],
      rollPressed: pressed[pre + '2'],
    };
  }

  update(time, delta) {
    const dt = Math.min(delta, 50) / 1000;

    for (const ship of this.ships) this.updateShip(ship, time, dt);
    this.updateBolts(dt);
    this.updateStreaks(dt);
    this.updateVanishingPoint(dt);

    this.draw(time);
  }

  updateShip(ship, time, dt) {
    const input = this.stick(ship.player);

    // screen-plane flight: accelerate toward the stick, drift-damp without it
    ship.vx += input.x * ACCEL * dt;
    ship.vy += input.y * ACCEL * dt;
    if (!input.x) ship.vx -= ship.vx * Math.min(1, DAMP * dt);
    if (!input.y) ship.vy -= ship.vy * Math.min(1, DAMP * dt);
    const v = Math.hypot(ship.vx, ship.vy);
    if (v > MAX_V) {
      ship.vx = (ship.vx / v) * MAX_V;
      ship.vy = (ship.vy / v) * MAX_V;
    }

    ship.x = Phaser.Math.Clamp(ship.x + ship.vx * dt, BOUND_X, W - BOUND_X);
    ship.y = Phaser.Math.Clamp(ship.y + ship.vy * dt, BOUND_TOP, H - BOUND_BOTTOM);

    // bank into the turn
    ship.roll += (ship.vx * BANK - ship.roll) * Math.min(1, 12 * dt);

    // barrel roll: full spin + lateral kick + brief invulnerability
    if (input.rollPressed && time >= ship.rollReadyAt) {
      ship.rollReadyAt = time + ROLL_COOLDOWN_MS;
      const dir = input.x !== 0 ? input.x : ship.vx >= 0 ? 1 : -1;
      ship.vx += dir * ROLL_KICK;
      ship.spin = 0;
      ship.spinTween = this.tweens.add({
        targets: ship,
        spin: dir * Math.PI * 2,
        duration: ROLL_MS,
        ease: 'Cubic.easeOut',
        onComplete: () => (ship.spin = 0),
      });
    }

    // fire: a bolt into the deep from the nose
    if (input.fire && time >= ship.fireReadyAt) {
      ship.fireReadyAt = time + FIRE_MS;
      this.bolts.push({
        // camera-space position derived from the ship's screen position
        x: ((ship.x - this.vp.x) * SHIP_Z) / FOCAL,
        y: ((ship.y - this.vp.y) * SHIP_Z) / FOCAL,
        z: SHIP_Z + 14,
      });
    }
  }

  updateBolts(dt) {
    for (const b of this.bolts) b.z += BOLT_SPEED * dt;
    this.bolts = this.bolts.filter((b) => b.z < FAR);
  }

  updateStreaks(dt) {
    for (const s of this.streaks) {
      s.z -= RAIL_SPEED * dt;
      if (s.z < 16) {
        s.z += FAR - 16;
        s.x = (Math.random() - 0.5) * 520;
        s.y = (Math.random() - 0.5) * 380;
      }
    }
  }

  updateVanishingPoint(dt) {
    // the horizon leans away from where the pack flies — cheap camera sway
    let ax = 0;
    let ay = 0;
    for (const ship of this.ships) {
      ax += ship.x;
      ay += ship.y;
    }
    ax /= this.ships.length;
    ay /= this.ships.length;
    const tx = CX - (ax - CX) * 0.14;
    const ty = CY - 20 - (ay - CY) * 0.1;
    this.vp.x += (tx - this.vp.x) * Math.min(1, 4 * dt);
    this.vp.y += (ty - this.vp.y) * Math.min(1, 4 * dt);
  }

  // --- projection ---
  project(x, y, z) {
    const p = FOCAL / z;
    return [this.vp.x + x * p, this.vp.y + y * p, p];
  }

  draw(time) {
    const g = this.gfx;
    g.clear();

    // streaks: short speed lines, fogged by distance
    for (const s of this.streaks) {
      const [x1, y1] = this.project(s.x, s.y, s.z);
      const [x2, y2] = this.project(s.x, s.y, s.z + 26);
      const fog = 1 - s.z / FAR;
      g.lineStyle(1, INK, 0.42 * fog * fog);
      g.beginPath();
      g.moveTo(x1, y1);
      g.lineTo(x2, y2);
      g.strokePath();
    }

    // bolts: bright segments running away from the camera
    for (const b of this.bolts) {
      const [x1, y1] = this.project(b.x, b.y, b.z);
      const [x2, y2] = this.project(b.x, b.y, b.z + 34);
      g.lineStyle(1, INK_HI, 0.9 * (1 - b.z / FAR));
      g.beginPath();
      g.moveTo(x1, y1);
      g.lineTo(x2, y2);
      g.strokePath();
    }

    for (const ship of this.ships) this.drawShip(g, ship, time);
  }

  drawShip(g, ship, time) {
    const [verts, edges] = ship.model;
    const roll = ship.roll + ship.spin;
    const yaw = ship.vx * 0.0016;
    const pitch = PITCH_BASE + ship.vy * 0.0016;
    const cr = Math.cos(roll);
    const sr = Math.sin(roll);
    const cyw = Math.cos(yaw);
    const syw = Math.sin(yaw);
    const cp = Math.cos(pitch);
    const sp = Math.sin(pitch);

    const pts = verts.map(([mx, my, mz]) => {
      // roll around the nose axis
      let x = mx * cr - my * sr;
      let y = mx * sr + my * cr;
      let z = mz;
      // slight yaw and pitch into the movement
      const x2 = x * cyw + z * syw;
      z = -x * syw + z * cyw;
      x = x2;
      const y2 = y * cp - z * sp;
      z = y * sp + z * cp;
      y = y2;
      // perspective around the ship's screen anchor
      const p = FOCAL / (SHIP_Z + z);
      return [ship.x + x * p * 0.9, ship.y + y * p * 0.9];
    });

    g.lineStyle(1, INK, 1);
    for (const [a, b] of edges) {
      g.beginPath();
      g.moveTo(pts[a][0], pts[a][1]);
      g.lineTo(pts[b][0], pts[b][1]);
      g.strokePath();
    }

    // engine glow: a flickering ember at the tail
    const ember = 0.5 + 0.5 * Math.sin(time * 0.04 + ship.player);
    g.fillStyle(INK_HI, 0.4 + 0.4 * ember);
    g.fillRect(ship.x - 1, ship.y + 1, 2, 2);
  }
}

// --------------------------------------------------------------------------
const config = {
  type: Phaser.AUTO,
  width: W,
  height: H,
  parent: 'game-root',
  backgroundColor: '#0a0d10',
  pixelArt: true,
  roundPixels: true,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [Boot, Rail],
};

new Phaser.Game(config);
