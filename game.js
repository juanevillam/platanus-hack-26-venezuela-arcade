// Space Explorer — Platanus Hack 26: Caracas Arcade Challenge
// Tu nave perdió potencia sobre un mundo desconocido y cayó en un mar
// alienígena. Sumérgete por las piezas que la vuelven nave espacial. Y vuelve
// a casa.
//
// Vuelo LIBRE en 3D con proyección propia: tú te mueves — adelante, atrás,
// arriba, abajo, girando — por un mundo wireframe anclado (superficie, fondo
// marino, torretas, minas), con cámara de persecución. Monocromo luminoso
// sobre negro; el óxido marca el peligro.

// --- Resolución nativa 800x600: líneas y texto nítidos ---
const W = 800;
const H = 600;
const CX = W / 2;
const CY = H / 2;

// --- Proyección (cámara de persecución) ---
const FOCAL = 420;
const NEAR = 14;
const CAM_BACK = 92; // cámara detrás de la nave
const CAM_UP = 30; // y un poco arriba

// --- Paleta: neutros de marca + óxido hostil ---
const INK = 0xf5f5f5;
const INK_HI = 0xeef2f7;
const RUST = 0xa65240; // peligro
const RUST_HI = 0xc97b5a; // peligro, variante clara (disparos, ojos)
const INK_CSS = '#eef2f7';
const DIM_CSS = '#8a9099';

// --- Vuelo ---
const YAW_RATE = 1.9; // rad/s
const CLIMB = 210; // subida/bajada, unidades/s
const THRUST = 330; // aceleración adelante
const MAX_FWD = 340; // velocidad máxima adelante
const MAX_REV = 130; // y en reversa
const DRAG = 1.4; // 1/s, frena solo
const ROLL_MS = 420;
const ROLL_COOLDOWN_MS = 1100;
const ROLL_KICK = 420; // esquive lateral
const FIRE_MS = 160;
const BOLT_SPEED = 980;
const BOLT_LIFE = 1.3;

// --- El mar: un volumen, no un riel ---
const SEA_DEPTH = 3000;
const SEA_XZ = 2100; // radio jugable en x/z
const SURFACE_Y = 44; // techo de vuelo hasta reparar
const FLOOR_Y = 2950;
// Bandas: [profundidad, r, g, b] — gris pálido muriendo en negro
const BANDS = [
  [0, 0x30, 0x36, 0x3d],
  [750, 0x1c, 0x1f, 0x24],
  [1500, 0x0e, 0x10, 0x13],
  [2250, 0x06, 0x06, 0x08],
  [SEA_DEPTH, 0x04, 0x04, 0x06],
];
const ABYSS_AT = 2250;

// Las tres piezas, cada una más hondo
const PARTS = [
  { name: 'MOTOR', y: 1150 },
  { name: 'NÚCLEO NAV', y: 1950 },
  { name: 'REACTOR', y: 2780 },
];

// --- Órbita ---
const CHARGE_TIME = 40;
const KILL_CHARGE = 1.6;

const HULL_MAX = 3;
const SCORE_KEY = 'space-explorer:scores';

const STORY = [
  'Tu nave perdió potencia sobre un mundo desconocido.',
  'Cayó en un mar alienígena.',
  'El casco resistió. Los motores no.',
  'Todo lo que necesitas para salir está allá abajo.',
  'Encuéntralo. Y vuelve a casa.',
];

const HINT_MAIN = 'STICK DIRIGE · B2 AVANZA · B5 RETROCEDE · B1 DISPARA · B3 ESQUIVA';

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
const pressed = Object.create(null); // por flanco, se limpia cada frame

window.addEventListener('keydown', (e) => {
  const code = KEY_TO_ARCADE[e.key.length === 1 ? e.key.toLowerCase() : e.key];
  if (code && !held[code]) {
    held[code] = true;
    pressed[code] = true;
    Sfx.init(); // el audio solo puede arrancar con un gesto
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

// --- Persistencia (puente arcade, con localStorage de respaldo) ---
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

// Top 5 con forma validada: el storage sobrevive entre versiones
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
// Audio: todo sintetizado, todo pasa por un lowpass cuyo corte cae con la
// profundidad — el mar amortigua el mundo, el despegue lo abre.
const Sfx = {
  ctx: null,
  out: null,
  filter: null,
  thrustOsc: null,
  thrustGain: null,
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

  // El motor: un zumbido continuo que sigue al acelerador
  setThrust(level) {
    if (!this.ctx) return;
    if (!this.thrustOsc) {
      this.thrustOsc = this.ctx.createOscillator();
      this.thrustGain = this.ctx.createGain();
      this.thrustOsc.type = 'sawtooth';
      this.thrustOsc.frequency.value = 42;
      this.thrustGain.gain.value = 0;
      this.thrustOsc.connect(this.thrustGain);
      this.thrustGain.connect(this.filter);
      this.thrustOsc.start();
    }
    const t = this.ctx.currentTime;
    this.thrustGain.gain.setTargetAtTime(0.09 * level, t, 0.08);
    this.thrustOsc.frequency.setTargetAtTime(42 + 70 * level, t, 0.08);
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
    this.tone(760, 0.07, 'square', 0.1, 320);
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

  // Secuenciador a 100 BPM (una semicorchea = 150 ms): bajo synth + arpegio
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
// Modelos wireframe: [vértices, aristas]. +z es la nariz; -y es arriba.

// La nave: fuselaje con cabina, alas delta y timón — que se lea NAVE
const SHIP_MODEL = [
  [
    [0, 0, 20], // 0 nariz
    [0, -4, 6], // 1 cabina
    [0, -8, -12], // 2 timón, punta
    [0, 0, -12], // 3 cola
    [-16, 1, -10], // 4 ala izq, punta
    [16, 1, -10], // 5 ala der, punta
    [-4, 0, 4], // 6 raíz ala izq
    [4, 0, 4], // 7 raíz ala der
    [0, 3, -4], // 8 panza
    [-16, -2, -10], // 9 winglet izq
    [16, -2, -10], // 10 winglet der
  ],
  [
    [0, 1], [1, 2], [2, 3], [0, 6], [0, 7],
    [6, 4], [7, 5], [4, 3], [5, 3],
    [0, 8], [8, 3], [4, 9], [5, 10],
    [6, 8], [7, 8],
  ],
];

// Torreta: pirámide anclada al fondo, con ojo
const TURRET_MODEL = [
  [
    [-22, 0, -22], [22, 0, -22], [22, 0, 22], [-22, 0, 22], [0, -34, 0],
  ],
  [
    [0, 1], [1, 2], [2, 3], [3, 0], [0, 4], [1, 4], [2, 4], [3, 4],
  ],
];

// Dron cazador: cuña con aguijones
const DRONE_MODEL = [
  [
    [0, 0, 14], [-12, 0, -8], [12, 0, -8], [0, -6, -6], [0, 4, -6],
  ],
  [
    [0, 1], [0, 2], [0, 3], [0, 4], [1, 3], [2, 3], [1, 4], [2, 4],
  ],
];

// Mina: octaedro
const MINE_MODEL = [
  [
    [0, -12, 0], [10, 0, 0], [0, 12, 0], [-10, 0, 0], [0, 0, 10], [0, 0, -10],
  ],
  [
    [0, 1], [1, 2], [2, 3], [3, 0], [0, 4], [1, 4], [2, 4], [3, 4], [0, 5], [1, 5], [2, 5], [3, 5],
  ],
];

// Pieza: octaedro brillante (más chico que la mina, y en tinta)
const PART_MODEL = MINE_MODEL;

// Asteroide: pedrusco irregular
const ROCK_MODEL = [
  [
    [-6, -16, 4], [12, -10, -6], [18, 2, 6], [8, 14, -4], [-10, 12, 6], [-18, 0, -4], [-12, -8, -10], [4, -2, 14],
  ],
  [
    [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 0], [0, 7], [2, 7], [4, 7], [6, 1], [5, 3],
  ],
];

// Chatarra: triangulito
const SCRAP_MODEL = [
  [
    [0, -7, 0], [6, 5, 0], [-6, 5, 0], [0, 0, 6],
  ],
  [
    [0, 1], [1, 2], [2, 0], [0, 3], [1, 3], [2, 3],
  ],
];

const FONT = (size, color) => ({
  fontFamily: 'monospace',
  fontSize: size + 'px',
  color: color || INK_CSS,
});

function typeIn(scene, textObj, full, cps, onDone) {
  // El write-in: las letras simplemente llegan, de izquierda a derecha
  let i = 0;
  return scene.time.addEvent({
    delay: 1000 / cps,
    repeat: full.length - 1,
    callback: () => {
      i++;
      textObj.setText(full.slice(0, i));
      if (i >= full.length && onDone) onDone();
    },
  });
}

// --------------------------------------------------------------------------
class Story extends Phaser.Scene {
  constructor() {
    super('story');
  }

  create() {
    this.events.on('postupdate', clearPressed);
    this.left = false;
    const startY = CY - (STORY.length * 30) / 2;
    let delay = 400;
    STORY.forEach((line, i) => {
      const t = this.add.text(CX, startY + i * 30, '', FONT(16)).setOrigin(0.5, 0);
      this.time.delayedCall(delay, () => typeIn(this, t, line, 32));
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

    this.add.text(CX, 140, 'S P A C E  E X P L O R E R', FONT(36)).setOrigin(0.5);
    this.press = this.add.text(CX, H - 130, 'PRESIONA START', FONT(16)).setOrigin(0.5);
    this.add.text(CX, H - 44, HINT_MAIN, FONT(13, DIM_CSS)).setOrigin(0.5).setAlpha(0.8);

    this.scoreText = this.add.text(CX, 318, '', FONT(15, DIM_CSS)).setOrigin(0.5, 0).setLineSpacing(7);
    loadScores().then((scores) => {
      if (!scores.length || !this.scene.isActive()) return;
      this.scoreText.setText(
        scores.map((s, i) => `${i + 1}  ${s.n.padEnd(3)}  ${String(s.s).padStart(6, '0')}`).join('\n')
      );
    });
  }

  update(time, delta) {
    // la nave girando sobre el nombre — el único adorno del juego
    this.spin += delta * 0.0009;
    this.gfx.clear();
    drawModelAt(this.gfx, SHIP_MODEL, CX, 236, this.spin, -0.2, 2.6, INK, 1, 1.5);
    this.press.setAlpha(Math.floor(time / 600) % 2 ? 1 : 0.25); // 100 BPM
    if (anyStart()) {
      Sfx.music = true;
      this.scene.start('game');
    }
  }
}

// Dibuja un modelo suelto en pantalla (título): roll + pitch, sin cámara
function drawModelAt(g, model, sx, sy, roll, pitch, size, color, alpha, width) {
  const [verts, edges] = model;
  const cr = Math.cos(roll);
  const sr = Math.sin(roll);
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  const pts = verts.map(([mx, my, mz]) => {
    let x = mx * cr - my * sr;
    let y = mx * sr + my * cr;
    let z = mz;
    const y2 = y * cp - z * sp;
    z = y * sp + z * cp;
    y = y2;
    const p = (FOCAL / (FOCAL + z * size)) * size;
    return [sx + x * p, sy + y * p];
  });
  g.lineStyle(width || 1.5, color, alpha);
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

    // la nave, en coordenadas de MUNDO (y positivo = hacia abajo)
    this.pos = { x: 0, y: 260, z: 0 };
    this.yaw = 0; // rumbo en el plano x/z
    this.speed = 0; // adelante (+) / reversa (−)
    this.vy = 0; // vertical
    this.roll = 0;
    this.spin = 0;
    this.rollReadyAt = 0;
    this.fireReadyAt = 0;
    this.invulnUntil = 0;
    this.hull = HULL_MAX;

    // cámara suavizada
    this.camYaw = 0;
    this.camPitch = 0;

    this.phase = 'sea'; // sea → launch → space → out
    this.charge = 0;
    this.score = 0;
    this.partsGot = 0;
    this.launchT = 0;
    this.elapsed = 0; // el mar te deja en paz un rato
    this.droneAt = 14; // primer acecho
    this.shake = 0;

    this.ents = [];
    this.bolts = [];
    this.shots = [];
    this.booms = [];

    this.populateSea();
    this.buildMotes();
    this.buildHud();

    this.flash = this.add.rectangle(CX, CY, W, H, 0xffffff).setAlpha(0).setDepth(10);
    window.__g = this; // handle de debug — quitar antes de enviar
  }

  // El mar se puebla UNA vez: todo está anclado al mundo, tú te mueves
  populateSea() {
    const rnd = (a, b) => a + Math.random() * (b - a);
    // las piezas, cada una custodiada
    PARTS.forEach((p, i) => {
      const px = rnd(-1400, 1400);
      const pz = rnd(-1400, 1400);
      this.ents.push({ k: 'part', x: px, y: p.y, z: pz, r: 26, idx: i, t: 0 });
      // torretas al fondo bajo la pieza, y minas alrededor
      for (let j = 0; j < 2 + i; j++) {
        this.ents.push({
          k: 'turret',
          x: px + rnd(-260, 260),
          y: FLOOR_Y,
          z: pz + rnd(-260, 260),
          r: 30,
          hp: 2,
          t: 0,
          fireAt: 0,
        });
      }
      for (let j = 0; j < 4; j++) {
        this.ents.push({
          k: 'mine',
          x: px + rnd(-340, 340),
          y: p.y + rnd(-160, 160),
          z: pz + rnd(-340, 340),
          r: 20,
          hp: 1,
          t: rnd(0, 6),
        });
      }
    });
    // minas y chatarra repartidas por todo el volumen
    for (let i = 0; i < 26; i++) {
      this.ents.push({
        k: 'mine',
        x: rnd(-SEA_XZ, SEA_XZ),
        y: rnd(500, FLOOR_Y - 100),
        z: rnd(-SEA_XZ, SEA_XZ),
        r: 20,
        hp: 1,
        t: rnd(0, 6),
      });
    }
    for (let i = 0; i < 34; i++) {
      this.ents.push({
        k: 'scrap',
        x: rnd(-SEA_XZ, SEA_XZ),
        y: rnd(200, FLOOR_Y - 80),
        z: rnd(-SEA_XZ, SEA_XZ),
        r: 16,
        t: rnd(0, 6),
      });
    }
    // anguilas patrullando el abismo
    for (let i = 0; i < 5; i++) {
      this.ents.push({
        k: 'eel',
        x: rnd(-SEA_XZ, SEA_XZ),
        y: rnd(ABYSS_AT + 100, FLOOR_Y - 60),
        z: rnd(-SEA_XZ, SEA_XZ),
        r: 22,
        hp: 2,
        t: rnd(0, 9),
        yaw: rnd(0, 6.28),
      });
    }
  }

  populateSpace() {
    const rnd = (a, b) => a + Math.random() * (b - a);
    this.ents = [];
    for (let i = 0; i < 26; i++) {
      this.ents.push({
        k: 'rock',
        x: this.pos.x + rnd(-1600, 1600),
        y: this.pos.y + rnd(-900, 900),
        z: this.pos.z + rnd(-1600, 1600),
        r: 34,
        hp: 2,
        t: rnd(0, 9),
        spin: rnd(-1, 1),
        vx: rnd(-26, 26),
        vy: rnd(-16, 16),
        vz: rnd(-26, 26),
      });
    }
  }

  // Nieve marina / estrellas: puntos fijos del mundo, envueltos alrededor tuyo
  buildMotes() {
    this.motes = [];
    for (let i = 0; i < 150; i++) {
      this.motes.push({
        x: (Math.random() - 0.5) * 1300,
        y: (Math.random() - 0.5) * 1300,
        z: (Math.random() - 0.5) * 1300,
      });
    }
  }

  buildHud() {
    this.depthText = this.add.text(12, 10, '', FONT(15)).setAlpha(0.9);
    this.scoreText = this.add.text(W - 12, 10, '', FONT(15)).setOrigin(1, 0).setAlpha(0.9);
    this.partText = this.add.text(W - 12, H - 28, '', FONT(15, DIM_CSS)).setOrigin(1, 0);
    this.hullText = this.add.text(12, H - 28, '', FONT(15)).setAlpha(0.9);
    this.navText = this.add.text(CX, 34, '', FONT(14)).setOrigin(0.5).setAlpha(0.9);
    this.label = this.add.text(0, 0, '', FONT(14)).setOrigin(0.5).setVisible(false);
    this.notice = this.add.text(CX, 168, '', FONT(16)).setOrigin(0.5).setAlpha(0);
    this.hint = this.add.text(CX, H - 58, HINT_MAIN, FONT(13, DIM_CSS)).setOrigin(0.5).setAlpha(0.6);
    this.time.delayedCall(9000, () => this.tweens.add({ targets: this.hint, alpha: 0, duration: 800 }));
    this.say('BUSCA EL MOTOR. SIGUE LA MARCA.');
  }

  say(msg) {
    this.notice.setText(msg).setAlpha(1);
    this.tweens.add({ targets: this.notice, alpha: 0, delay: 2000, duration: 700 });
  }

  // --- flujo ---
  update(time, delta) {
    const dt = Math.min(delta, 50) / 1000;
    this.elapsed += dt;
    Sfx.tick();

    if (this.phase === 'sea') {
      Sfx.cutoff(4500 - (this.pos.y / SEA_DEPTH) * 4000);
      this.spawnDrones(dt, false);
      // con las tres piezas, la superficie es la salida
      if (this.partsGot >= PARTS.length && this.pos.y <= SURFACE_Y + 12) {
        this.phase = 'launch';
        this.launchT = 0;
        Sfx.launch();
      }
    } else if (this.phase === 'launch') {
      this.launchT += dt;
      this.pos.y = Math.max(-400, this.pos.y - 900 * dt);
      Sfx.cutoff(4500);
      if (this.launchT > 1.1 && !this.broke) {
        this.broke = true;
        this.flash.setAlpha(1);
        this.tweens.add({ targets: this.flash, alpha: 0, duration: 700 });
        Sfx.cutoff(8000);
      }
      if (this.launchT > 2.4) {
        this.phase = 'space';
        this.pos.y = 0;
        this.vy = 0;
        this.populateSpace();
        this.say('ÓRBITA. CARGA EL HIPERSALTO.');
      }
    } else if (this.phase === 'space') {
      this.charge = Math.min(CHARGE_TIME, this.charge + dt);
      this.spawnDrones(dt, true);
      if (this.charge >= CHARGE_TIME && !this.jumping) {
        this.jumping = true;
        Sfx.jump();
        Sfx.setThrust(0);
        this.flash.setAlpha(1);
        this.tweens.add({ targets: this.flash, alpha: 0, duration: 900 });
        this.score += 500 + this.hull * 150;
        this.phase = 'out';
        this.time.delayedCall(1100, () => this.scene.start('over', { win: true, score: this.score }));
      }
    }

    if (this.phase !== 'out' && this.phase !== 'launch') this.updatePlayer(time, dt);
    this.updateEnts(time, dt);
    this.updateBolts(dt);
    this.updateCamera(dt);
    this.draw(time);
    this.updateHud();
  }

  // Después de un rato, salen a cazarte — y más, con cada pieza a bordo
  spawnDrones(dt, space) {
    this.droneAt -= dt;
    const alive = this.ents.filter((e) => e.k === 'drone').length;
    const max = space ? 4 : 1 + this.partsGot;
    if (this.droneAt > 0 || alive >= max) return;
    this.droneAt = space ? 7 : 12;
    const ang = Math.random() * Math.PI * 2;
    this.ents.push({
      k: 'drone',
      space,
      x: this.pos.x + Math.sin(ang) * 1100,
      y: Math.max(120, this.pos.y + (Math.random() - 0.5) * 500),
      z: this.pos.z + Math.cos(ang) * 1100,
      r: 22,
      hp: 1,
      t: 0,
      yaw: 0,
      fireAt: 1.5,
    });
  }

  // --- la nave: tuya, libre ---
  updatePlayer(time, dt) {
    const turn = (held.P1_R ? 1 : 0) - (held.P1_L ? 1 : 0);
    const climb = (held.P1_D ? 1 : 0) - (held.P1_U ? 1 : 0);

    this.yaw += turn * YAW_RATE * dt;
    this.vy += (climb * CLIMB - this.vy) * Math.min(1, 6 * dt);

    // acelerador y reversa; sin nada, el agua te frena sola
    if (held.P1_2) this.speed = Math.min(MAX_FWD, this.speed + THRUST * dt);
    else if (held.P1_5) this.speed = Math.max(-MAX_REV, this.speed - THRUST * dt);
    else this.speed -= this.speed * Math.min(1, DRAG * dt);
    Sfx.setThrust(Math.abs(this.speed) / MAX_FWD);

    const fx = Math.sin(this.yaw);
    const fz = Math.cos(this.yaw);
    this.pos.x += fx * this.speed * dt;
    this.pos.z += fz * this.speed * dt;
    this.pos.y += this.vy * dt;

    // techo, fondo y una corriente que te devuelve al área
    if (this.phase === 'sea') {
      this.pos.y = Phaser.Math.Clamp(this.pos.y, SURFACE_Y, FLOOR_Y - 24);
      const rr = Math.hypot(this.pos.x, this.pos.z);
      if (rr > SEA_XZ) {
        this.pos.x -= (this.pos.x / rr) * (rr - SEA_XZ) * 2 * dt;
        this.pos.z -= (this.pos.z / rr) * (rr - SEA_XZ) * 2 * dt;
      }
    }

    // alabeo visual con el giro
    this.roll += (turn * 0.5 - this.roll) * Math.min(1, 8 * dt);

    // tonel volado: el esquive — giro completo, empujón lateral, invulnerable
    if (pressed.P1_3 && time >= this.rollReadyAt) {
      this.rollReadyAt = time + ROLL_COOLDOWN_MS;
      this.invulnUntil = Math.max(this.invulnUntil, time + ROLL_MS + 150);
      const dir = turn !== 0 ? turn : 1;
      this.pos.x += fz * dir * 0; // el empujón se aplica como velocidad lateral breve
      this.strafe = { x: fz * dir * ROLL_KICK, z: -fx * dir * ROLL_KICK, t: 0.3 };
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
    if (this.strafe && this.strafe.t > 0) {
      this.strafe.t -= dt;
      this.pos.x += this.strafe.x * dt;
      this.pos.z += this.strafe.z * dt;
    }

    // disparo: sale de la nariz, hereda tu velocidad
    if (held.P1_1 && time >= this.fireReadyAt) {
      this.fireReadyAt = time + FIRE_MS;
      Sfx.fire();
      this.bolts.push({
        x: this.pos.x + fx * 24,
        y: this.pos.y - 2,
        z: this.pos.z + fz * 24,
        vx: fx * BOLT_SPEED + fx * this.speed,
        vy: this.vy * 0.3,
        vz: fz * BOLT_SPEED + fz * this.speed,
        life: BOLT_LIFE,
      });
    }
  }

  hitPlayer(time) {
    if (time < this.invulnUntil || this.phase === 'out') return;
    this.invulnUntil = time + 1300;
    this.hull--;
    this.shake = 9;
    Sfx.hurt();
    if (this.hull <= 0) {
      this.phase = 'out';
      Sfx.setThrust(0);
      this.booms.push({ wx: this.pos.x, wy: this.pos.y, wz: this.pos.z, t: 0, big: true });
      Sfx.boom();
      this.time.delayedCall(1400, () => this.scene.start('over', { win: false, score: this.score }));
    }
  }

  // --- el mundo ---
  updateEnts(time, dt) {
    const P = this.pos;

    for (const e of this.ents) {
      e.t += dt;
      const dx = P.x - e.x;
      const dy = P.y - e.y;
      const dz = P.z - e.z;
      const dist = Math.hypot(dx, dy, dz);

      if (e.k === 'drone') {
        // te persigue de verdad, y mantiene algo de distancia para tirar
        const want = e.space ? 300 : 340;
        const sp = (e.space ? 300 : 240) * (dist > want ? 1 : -0.5);
        e.x += (dx / dist) * sp * dt;
        e.y += (dy / dist) * sp * dt;
        e.z += (dz / dist) * sp * dt;
        e.yaw = Math.atan2(dx, dz);
        e.fireAt -= dt;
        if (e.fireAt <= 0 && dist < 900) {
          e.fireAt = e.space ? 1.4 : 2.0;
          this.shootAtPlayer(e, e.space ? 460 : 380);
        }
      } else if (e.k === 'turret') {
        // anclada al fondo: te ve, se arma, dispara
        e.fireAt -= dt;
        if (dist < 850 && e.fireAt <= 0) {
          e.fireAt = 2.3;
          this.shootAtPlayer(e, 400);
        }
      } else if (e.k === 'eel') {
        // patrulla; si te acercas en lo oscuro, va por ti
        if (dist < 520) {
          e.yaw = Math.atan2(dx, dz);
          e.x += (dx / dist) * 260 * dt;
          e.y += (dy / dist) * 200 * dt;
          e.z += (dz / dist) * 260 * dt;
        } else {
          e.yaw += Math.sin(e.t * 0.7) * 0.4 * dt;
          e.x += Math.sin(e.yaw) * 120 * dt;
          e.z += Math.cos(e.yaw) * 120 * dt;
        }
        e.y = Phaser.Math.Clamp(e.y + Math.sin(e.t * 1.7) * 30 * dt, ABYSS_AT, FLOOR_Y - 40);
      } else if (e.k === 'mine') {
        e.y += Math.sin(e.t * 1.3) * 10 * dt;
      } else if (e.k === 'rock') {
        e.x += e.vx * dt;
        e.y += e.vy * dt;
        e.z += e.vz * dt;
        // el campo te envuelve: lo que queda atrás reaparece delante
        if (dist > 2400) {
          const ang = Math.random() * Math.PI * 2;
          e.x = P.x + Math.sin(ang) * 1500;
          e.y = P.y + (Math.random() - 0.5) * 800;
          e.z = P.z + Math.cos(ang) * 1500;
        }
      }

      // contacto contigo
      if (!e.dead && dist < e.r + 16) {
        if (e.k === 'scrap') {
          e.dead = true;
          this.score += 10;
          Sfx.pickup();
        } else if (e.k === 'part') {
          e.dead = true;
          this.partsGot++;
          this.score += 100;
          Sfx.part();
          if (this.partsGot >= PARTS.length) this.say('REACTOR A BORDO. SUBE A LA SUPERFICIE.');
          else this.say(PARTS[e.idx].name + ' A BORDO. ' + (PARTS.length - this.partsGot) + ' MÁS ABAJO.');
        } else {
          if (e.k !== 'turret') e.dead = true;
          this.boomAt(e);
          this.hitPlayer(time);
        }
      }
    }

    // disparos enemigos
    for (const s of this.shots) {
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.z += s.vz * dt;
      s.life -= dt;
      const d = Math.hypot(P.x - s.x, P.y - s.y, P.z - s.z);
      if (d < 20) {
        s.dead = true;
        this.hitPlayer(time);
      }
    }

    // tus disparos contra el mundo
    for (const b of this.bolts) {
      for (const e of this.ents) {
        if (e.dead || e.k === 'scrap' || e.k === 'part') continue;
        const d = Math.hypot(b.x - e.x, b.y - e.y, b.z - e.z);
        if (d < e.r + 10) {
          b.dead = true;
          e.hp--;
          if (e.hp <= 0) {
            e.dead = true;
            this.boomAt(e);
            this.score += e.k === 'turret' ? 40 : e.k === 'rock' ? 15 : 25;
            if (this.phase === 'space') this.charge = Math.min(CHARGE_TIME, this.charge + KILL_CHARGE);
            Sfx.boom();
            if (e.k === 'rock' && e.r > 20) {
              for (let i = 0; i < 2; i++) {
                this.ents.push({
                  k: 'rock',
                  x: e.x,
                  y: e.y,
                  z: e.z,
                  r: 18,
                  hp: 1,
                  t: 0,
                  spin: (Math.random() - 0.5) * 3,
                  vx: (Math.random() - 0.5) * 120,
                  vy: (Math.random() - 0.5) * 80,
                  vz: (Math.random() - 0.5) * 120,
                });
              }
            }
          } else {
            this.booms.push({ wx: b.x, wy: b.y, wz: b.z, t: 0.25 });
          }
          break;
        }
      }
    }

    for (const bm of this.booms) bm.t += dt;
    this.ents = this.ents.filter((e) => !e.dead);
    this.shots = this.shots.filter((s) => !s.dead && s.life > 0);
    this.booms = this.booms.filter((b) => b.t < 0.5);
  }

  shootAtPlayer(e, sp) {
    // apunta a donde VAS a estar, no a donde estás
    const t = Math.hypot(this.pos.x - e.x, this.pos.y - e.y, this.pos.z - e.z) / sp;
    const fx = Math.sin(this.yaw);
    const fz = Math.cos(this.yaw);
    const tx = this.pos.x + fx * this.speed * t * 0.7;
    const ty = this.pos.y + this.vy * t * 0.7;
    const tz = this.pos.z + fz * this.speed * t * 0.7;
    const dx = tx - e.x;
    const dy = ty - e.y;
    const dz = tz - e.z;
    const m = Math.hypot(dx, dy, dz);
    this.shots.push({
      x: e.x,
      y: e.y - (e.k === 'turret' ? 30 : 0),
      z: e.z,
      vx: (dx / m) * sp,
      vy: (dy / m) * sp,
      vz: (dz / m) * sp,
      life: 3.2,
    });
  }

  boomAt(e) {
    this.booms.push({ wx: e.x, wy: e.y, wz: e.z, t: 0 });
  }

  updateBolts(dt) {
    for (const b of this.bolts) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.z += b.vz * dt;
      b.life -= dt;
    }
    this.bolts = this.bolts.filter((b) => !b.dead && b.life > 0);
  }

  updateCamera(dt) {
    // la cámara persigue el rumbo con un pelo de retraso — se siente giro
    let d = this.yaw - this.camYaw;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    this.camYaw += d * Math.min(1, 5 * dt);
    this.camPitch += (this.vy / CLIMB) * 0.16 - this.camPitch * Math.min(1, 5 * dt);
    if (this.shake > 0) this.shake = Math.max(0, this.shake - 34 * dt);
  }

  // --- proyección mundo → pantalla ---
  cam() {
    const fx = Math.sin(this.camYaw);
    const fz = Math.cos(this.camYaw);
    return {
      x: this.pos.x - fx * CAM_BACK,
      y: this.pos.y - CAM_UP,
      z: this.pos.z - fz * CAM_BACK,
      cos: fz,
      sin: fx,
    };
  }

  // Devuelve [sx, sy, cz] o null si queda detrás de la cámara
  project(cm, wx, wy, wz) {
    const dx = wx - cm.x;
    const dy = wy - cm.y;
    const dz = wz - cm.z;
    const cz = dx * cm.sin + dz * cm.cos;
    if (cz < NEAR) return null;
    const cx = dx * cm.cos - dz * cm.sin;
    const cy = dy - this.camPitch * cz;
    const shx = this.shake ? (Math.random() - 0.5) * this.shake : 0;
    const shy = this.shake ? (Math.random() - 0.5) * this.shake : 0;
    return [CX + (cx * FOCAL) / cz + shx, CY + (cy * FOCAL) / cz + shy, cz];
  }

  // Línea de mundo con recorte al plano NEAR
  worldLine(g, cm, a, b) {
    let pa = this.project(cm, a[0], a[1], a[2]);
    let pb = this.project(cm, b[0], b[1], b[2]);
    if (!pa && !pb) return;
    if (!pa || !pb) {
      // recorta: interpola hasta el plano de la cámara
      const [va, vb] = pa ? [a, b] : [b, a];
      const cza = (va[0] - cm.x) * cm.sin + (va[2] - cm.z) * cm.cos;
      const czb = (vb[0] - cm.x) * cm.sin + (vb[2] - cm.z) * cm.cos;
      const t = (cza - NEAR - 0.01) / (cza - czb);
      const mx = va[0] + (vb[0] - va[0]) * t;
      const my = va[1] + (vb[1] - va[1]) * t;
      const mz = va[2] + (vb[2] - va[2]) * t;
      pa = this.project(cm, va[0], va[1], va[2]);
      pb = this.project(cm, mx, my, mz);
      if (!pa || !pb) return;
    }
    g.beginPath();
    g.moveTo(pa[0], pa[1]);
    g.lineTo(pb[0], pb[1]);
    g.strokePath();
  }

  // Niebla + linterna: en el abismo solo ves hacia donde miras
  fogAlpha(cm, wx, wy, wz, dist, cz) {
    const far = this.phase === 'space' ? 2400 : 1700;
    let a = Phaser.Math.Clamp(1.25 - dist / far, 0, 1);
    if (this.phase === 'sea' && this.pos.y > ABYSS_AT - 200) {
      const t = Phaser.Math.Clamp((this.pos.y - (ABYSS_AT - 200)) / 300, 0, 1);
      const along = cz / Math.max(dist, 1); // 1 = justo adelante
      const lamp = Phaser.Math.Clamp((along - 0.55) / 0.45, 0, 1) * Phaser.Math.Clamp(1 - dist / 950, 0, 1);
      a *= 1 - t + t * lamp;
    }
    return a;
  }

  // Modelo 3D anclado al mundo, con yaw propio
  drawWorldModel(g, cm, model, e, scale, color, baseAlpha, extraRoll) {
    const [verts, edges] = model;
    const cyw = Math.cos(e.yaw || 0);
    const syw = Math.sin(e.yaw || 0);
    const cr = Math.cos(extraRoll || 0);
    const sr = Math.sin(extraRoll || 0);
    const pts = [];
    for (const [mx0, my0, mz] of verts) {
      const mx = mx0 * cr - my0 * sr;
      const my = mx0 * sr + my0 * cr;
      const wx = e.x + (mx * cyw + mz * syw) * scale;
      const wy = e.y + my * scale;
      const wz = e.z + (-mx * syw + mz * cyw) * scale;
      pts.push([wx, wy, wz]);
    }
    g.lineStyle(1.5, color, baseAlpha);
    for (const [a, b] of edges) this.worldLine(g, cm, pts[a], pts[b]);
  }

  bg() {
    if (this.phase === 'space' || this.broke) return [0x07, 0x07, 0x09];
    const d = this.pos.y;
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
    const cm = this.cam();

    if (this.phase !== 'space') this.drawGrids(g, cm);
    this.drawMotes(g, cm);

    // entidades
    this.label.setVisible(false);
    for (const e of this.ents) this.drawEnt(g, cm, e, time);

    // tus disparos: trazos brillantes
    for (const b of this.bolts) {
      const p1 = this.project(cm, b.x, b.y, b.z);
      const p2 = this.project(cm, b.x - b.vx * 0.03, b.y - b.vy * 0.03, b.z - b.vz * 0.03);
      if (!p1 || !p2) continue;
      g.lineStyle(2, INK_HI, 0.9);
      g.beginPath();
      g.moveTo(p1[0], p1[1]);
      g.lineTo(p2[0], p2[1]);
      g.strokePath();
    }

    // disparos enemigos: brasas de óxido, siempre visibles
    for (const s of this.shots) {
      const p = this.project(cm, s.x, s.y, s.z);
      if (!p) continue;
      g.fillStyle(RUST_HI, 0.95);
      g.fillCircle(p[0], p[1], Math.max(2, 700 / p[2]));
    }

    // explosiones: anillos que crecen
    for (const bm of this.booms) {
      const p = this.project(cm, bm.wx !== undefined ? bm.wx : 0, bm.wy, bm.wz);
      if (!p) continue;
      const r = (4 + bm.t * (bm.big ? 260 : 150)) * (FOCAL / p[2]);
      g.lineStyle(1.5, bm.big ? INK_HI : RUST, 1 - bm.t / 0.5);
      g.strokeCircle(p[0], p[1], r);
    }

    this.drawShip(g, cm, time);
    this.drawNav(g, cm);

    // barra de carga del hipersalto
    if (this.phase === 'space') {
      g.lineStyle(1.5, INK, 0.8);
      g.strokeRect(CX - 110, 30, 220, 10);
      g.fillStyle(INK_HI, 0.9);
      g.fillRect(CX - 108, 32, 216 * (this.charge / CHARGE_TIME), 6);
    }
  }

  // Superficie y fondo: rejillas ancladas — al moverte, se mueven ELLAS
  drawGrids(g, cm, time) {
    const CELL = 260;
    const R = 1500;
    const planes = [];
    if (this.pos.y < 780) planes.push([0, Phaser.Math.Clamp(1 - this.pos.y / 780, 0, 1) * 0.5 + 0.12]);
    if (this.pos.y > FLOOR_Y - 950) planes.push([FLOOR_Y, Phaser.Math.Clamp(1 - (FLOOR_Y - this.pos.y) / 950, 0, 1) * 0.45 + 0.1]);
    for (const [py, alpha] of planes) {
      g.lineStyle(1, INK, alpha * 0.55);
      const x0 = Math.floor((this.pos.x - R) / CELL) * CELL;
      const z0 = Math.floor((this.pos.z - R) / CELL) * CELL;
      for (let x = x0; x <= this.pos.x + R; x += CELL) {
        this.worldLine(g, cm, [x, py, this.pos.z - R], [x, py, this.pos.z + R]);
      }
      for (let z = z0; z <= this.pos.z + R; z += CELL) {
        this.worldLine(g, cm, [this.pos.x - R, py, z], [this.pos.x + R, py, z]);
      }
    }
  }

  drawMotes(g, cm) {
    // partículas del mundo, envueltas en una caja alrededor tuyo
    const L = 1300;
    for (const m of this.motes) {
      const wx = this.pos.x + Phaser.Math.Wrap(m.x - this.pos.x, -L / 2, L / 2);
      const wy = this.pos.y + Phaser.Math.Wrap(m.y - this.pos.y, -L / 2, L / 2);
      const wz = this.pos.z + Phaser.Math.Wrap(m.z - this.pos.z, -L / 2, L / 2);
      if (this.phase !== 'space' && (wy < 10 || wy > FLOOR_Y)) continue;
      const p = this.project(cm, wx, wy, wz);
      if (!p) continue;
      const dist = Math.hypot(wx - this.pos.x, wy - this.pos.y, wz - this.pos.z);
      const a = this.fogAlpha(cm, wx, wy, wz, dist, p[2]) * 0.5;
      if (a <= 0.02) continue;
      g.fillStyle(INK, a);
      g.fillRect(p[0], p[1], 2, 2);
    }
  }

  drawEnt(g, cm, e, time) {
    const dist = Math.hypot(e.x - this.pos.x, e.y - this.pos.y, e.z - this.pos.z);
    const p = this.project(cm, e.x, e.y, e.z);
    if (!p) return;
    let a = this.fogAlpha(cm, e.x, e.y, e.z, dist, p[2]);
    if (e.k === 'part') a = Math.max(a, Phaser.Math.Clamp(1.3 - dist / 2200, 0, 1)); // la pieza brilla sola

    if (a <= 0.03) {
      // en lo oscuro, lo hostil delata un brillo de óxido
      if ((e.k === 'drone' || e.k === 'eel' || e.k === 'turret') && dist < 1400) {
        g.fillStyle(RUST_HI, 0.6);
        g.fillRect(p[0], p[1], 2.5, 2.5);
      }
      return;
    }

    const hostile = e.k !== 'scrap' && e.k !== 'part';
    const color = hostile ? RUST : e.k === 'part' ? INK_HI : INK;

    if (e.k === 'eel') {
      // una línea sinuosa nadando, con cabeza de brasa
      g.lineStyle(1.5, RUST, a);
      const fx = Math.sin(e.yaw);
      const fz = Math.cos(e.yaw);
      let prev = null;
      for (let i = 0; i < 8; i++) {
        const wx = e.x - fx * i * 16 + fz * Math.sin(e.t * 4 + i) * 8;
        const wy = e.y + Math.cos(e.t * 3 + i) * 6;
        const wz = e.z - fz * i * 16 - fx * Math.sin(e.t * 4 + i) * 8;
        if (prev) this.worldLine(g, cm, prev, [wx, wy, wz]);
        prev = [wx, wy, wz];
      }
      g.fillStyle(RUST_HI, a);
      g.fillCircle(p[0], p[1], Math.max(1.5, 320 / p[2]));
      return;
    }

    const model =
      e.k === 'turret' ? TURRET_MODEL : e.k === 'drone' ? DRONE_MODEL : e.k === 'mine' ? MINE_MODEL
      : e.k === 'rock' ? ROCK_MODEL : e.k === 'part' ? PART_MODEL : SCRAP_MODEL;
    const scale = e.k === 'rock' ? e.r / 16 : e.k === 'part' ? 1.4 : 1;
    const rot = e.k === 'rock' ? e.t * e.spin : e.k === 'part' || e.k === 'scrap' ? e.t * 1.1 : 0;
    this.drawWorldModel(g, cm, model, e, scale, color, a, rot);

    if (e.k === 'mine' && Math.floor(time / 500) % 2) {
      g.fillStyle(RUST_HI, a);
      g.fillCircle(p[0], p[1], Math.max(1.5, 300 / p[2]));
    }
    if (e.k === 'turret') {
      g.fillStyle(RUST_HI, a * (0.5 + 0.5 * Math.sin(e.t * 3)));
      const eye = this.project(cm, e.x, e.y - 34, e.z);
      if (eye) g.fillCircle(eye[0], eye[1], Math.max(2, 500 / p[2]));
    }
    if (e.k === 'part') {
      g.lineStyle(1.5, INK_HI, a * (0.4 + 0.3 * Math.sin(e.t * 4)));
      g.strokeCircle(p[0], p[1], (26 + Math.sin(e.t * 4) * 4) * (FOCAL / p[2]));
      if (dist < 1400) {
        this.label.setVisible(true).setPosition(p[0], p[1] + 34 * (FOCAL / p[2]) + 14).setText(PARTS[e.idx].name);
      }
    }
  }

  drawShip(g, cm, time) {
    if (this.phase === 'out') return;
    if (time < this.invulnUntil && Math.floor(time / 60) % 2 === 0) return;
    const e = { x: this.pos.x, y: this.pos.y, z: this.pos.z, yaw: this.yaw };
    this.drawWorldModel(g, cm, SHIP_MODEL, e, 1, INK, 1, this.roll + this.spin);
    // estela del motor
    const level = Math.abs(this.speed) / MAX_FWD;
    if (level > 0.05) {
      const fx = Math.sin(this.yaw);
      const fz = Math.cos(this.yaw);
      g.lineStyle(2, INK_HI, 0.3 + 0.5 * level * (0.6 + 0.4 * Math.sin(time * 0.04)));
      this.worldLine(
        g,
        cm,
        [this.pos.x - fx * 14, this.pos.y + 1, this.pos.z - fz * 14],
        [this.pos.x - fx * (20 + 26 * level), this.pos.y + 1, this.pos.z - fz * (20 + 26 * level)]
      );
    }
    // retícula: a donde apunta la nariz
    const fx = Math.sin(this.yaw);
    const fz = Math.cos(this.yaw);
    const rp = this.project(cm, this.pos.x + fx * 620, this.pos.y - 2, this.pos.z + fz * 620);
    if (rp && this.phase !== 'launch') {
      g.lineStyle(1.5, INK, 0.55);
      g.strokeCircle(rp[0], rp[1], 7);
      g.fillStyle(INK, 0.55);
      g.fillRect(rp[0] - 1, rp[1] - 1, 2, 2);
    }
  }

  // La marca de navegación: hacia la pieza, o hacia arriba con las tres
  drawNav(g, cm) {
    if (this.phase !== 'sea') {
      this.navText.setText('');
      return;
    }
    let target = null;
    let label = '';
    const part = this.ents.find((e) => e.k === 'part');
    if (this.partsGot >= PARTS.length) {
      target = { x: this.pos.x, y: SURFACE_Y - 300, z: this.pos.z };
      label = 'SUPERFICIE';
    } else if (part) {
      target = part;
      label = PARTS[part.idx].name;
    }
    if (!target) {
      this.navText.setText('');
      return;
    }
    const dist = Math.hypot(target.x - this.pos.x, target.y - this.pos.y, target.z - this.pos.z);
    this.navText.setText(label + '  ' + Math.round(dist) + ' M');

    const p = this.project(cm, target.x, target.y, target.z);
    const margin = 46;
    if (p && p[0] > margin && p[0] < W - margin && p[1] > margin && p[1] < H - margin) {
      // en pantalla: esquinas de mira sobre el objetivo
      g.lineStyle(1.5, INK_HI, 0.85);
      const r = 16;
      g.strokeRect(p[0] - r, p[1] - r, r * 2, r * 2);
      return;
    }
    // fuera de pantalla: flecha al borde apuntándole
    let ang;
    if (p) ang = Math.atan2(p[1] - CY, p[0] - CX);
    else {
      // detrás: usa el espacio de cámara para elegir lado
      const dx = target.x - cm.x;
      const dy = target.y - cm.y;
      const dz = target.z - cm.z;
      const cx = dx * cm.cos - dz * cm.sin;
      ang = Math.atan2(dy < 0 ? -1 : 1, cx < 0 ? -1.4 : 1.4);
    }
    const ex = CX + Math.cos(ang) * (CX - 60);
    const ey = CY + Math.sin(ang) * (CY - 60);
    g.lineStyle(2, INK_HI, 0.9);
    g.beginPath();
    g.moveTo(ex + Math.cos(ang) * 14, ey + Math.sin(ang) * 14);
    g.lineTo(ex + Math.cos(ang + 2.5) * 10, ey + Math.sin(ang + 2.5) * 10);
    g.lineTo(ex + Math.cos(ang - 2.5) * 10, ey + Math.sin(ang - 2.5) * 10);
    g.closePath();
    g.strokePath();
  }

  updateHud() {
    if (this.phase === 'space') this.depthText.setText('ÓRBITA');
    else this.depthText.setText('PROFUNDIDAD ' + String(Math.max(0, Math.floor(this.pos.y))).padStart(4, '0') + ' M');
    this.scoreText.setText(String(this.score).padStart(6, '0'));
    this.hullText.setText('CASCO ' + '▸'.repeat(this.hull) + '·'.repeat(HULL_MAX - this.hull));
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
    this.left = false;
    this.qualifies = false;
    Sfx.setThrust(0);
    if (this.win) Sfx.cutoff(8000);
    else Sfx.over();
    Sfx.music = false;

    const head = this.add.text(CX, CY - 70, '', FONT(32)).setOrigin(0.5);
    typeIn(this, head, this.win ? 'LLEGASTE A CASA.' : 'FIN DEL VIAJE', 24);
    this.add.text(CX, CY + 4, 'PUNTOS  ' + String(this.score).padStart(6, '0'), FONT(16)).setOrigin(0.5);

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
    this.letters = [0, 0, 0];
    this.slot = 0;
    this.saving = false;

    this.add.text(CX, CY - 110, 'ENTRASTE AL TOP 5', FONT(16)).setOrigin(0.5);
    this.add.text(CX, CY - 78, 'PUNTOS  ' + String(this.score).padStart(6, '0'), FONT(15, DIM_CSS)).setOrigin(0.5);
    this.slots = [0, 1, 2].map((i) => this.add.text(CX - 48 + i * 48, CY + 8, 'A', FONT(32)).setOrigin(0.5));
    this.add.text(CX, CY + 88, 'STICK ELIGE · B1 SIGUE', FONT(13, DIM_CSS)).setOrigin(0.5).setAlpha(0.8);
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
  antialias: true,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [Story, Title, Game, Over, Initials],
};

window.__game = new Phaser.Game(config); // handle de debug — quitar antes de enviar
