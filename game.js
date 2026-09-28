// Space Explorer — Platanus Hack 26: Caracas Arcade Challenge
// Tu nave quedó varada en un sector alienígena. Encuentra las tres piezas del
// hipersalto entre los restos, y vuelve a casa.
//
// Vuelo libre 3D con proyección propia: tú te mueves — adelante, atrás,
// arriba, abajo, girando — por un sector anclado (planeta, asteroides,
// centinelas, minas), con cámara de persecución estable. Wireframe luminoso
// sobre el cosmos; el óxido marca el peligro.

// --- Resolución nativa 800x600: líneas y texto nítidos ---
const W = 800;
const H = 600;
const CX = W / 2;
const CY = H / 2;

// --- Proyección (cámara de persecución) ---
const FOCAL = 420;
const NEAR = 14;
const CAM_BACK = 104;
const CAM_UP = 32;

// --- Paleta: neutros de marca + óxido hostil ---
const INK = 0xf5f5f5;
const INK_HI = 0xeef2f7;
const RUST = 0xa65240; // peligro
const RUST_HI = 0xc97b5a; // peligro, variante clara (disparos, ojos)
const INK_CSS = '#eef2f7';
const DIM_CSS = '#8a9099';

// MODO PRUEBA: vidas infinitas mientras se ajusta el juego — apagar al enviar
const GOD = true;

// --- Vuelo: la nave SIEMPRE avanza; el stick dirige, el turbo se recarga.
// Arriba/abajo es CABECEO real: mantenlo y la nave hace la vuelta completa. ---
const YAW_RATE = 2.1; // rad/s tope
const YAW_EASE = 7; // 1/s, el giro entra y sale suave
const PITCH_RATE = 1.7; // rad/s de cabeceo
const MAX_PITCH = 1.05; // ~60°: nunca pasa la vertical
const LEVEL_EASE = 1.3; // 1/s: suelta el stick y se endereza
const CRUISE = 235; // crucero constante — la nave NUNCA se detiene
const TURBO_SPEED = 470;
const SPEED_EASE = 3; // 1/s hacia la velocidad objetivo
const BOOST_MAX = 100;
const BOOST_DRAIN = 42; // por segundo de turbo
const BOOST_REGEN = 17; // por segundo de recarga
const FIRE_MS = 160;
const BOLT_SPEED = 980;
const BOLT_LIFE = 1.3;
const MISSILE_SPEED = 640;
const MISSILE_TURN = 3.4; // 1/s de corrección hacia el blanco
const MISSILE_MAX = 5;
const SCRAP_PER_MISSILE = 3;

// --- El sector: una esfera de juego alrededor del origen ---
const SECTOR_R = 2400;
const CHARGE_TIME = 30; // segundos de carga del hipersalto
const KILL_CHARGE = 1.6;

const HULL_MAX = 3;
const SCORE_KEY = 'space-explorer:scores';

// Las tres piezas del hipersalto
const PARTS = ['MOTOR', 'NÚCLEO NAV', 'REACTOR'];

const HINT_MAIN = 'STICK DIRIGE · B1 DISPARA · B2 TURBO · B3 MISIL';

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
// Audio: solo efectos puntuales, sintetizados. La música llega al final.
const Sfx = {
  ctx: null,
  out: null,

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
    this.out.connect(this.ctx.destination);
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
    g.connect(this.out);
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
    g.connect(this.out);
    src.start(t);
  },

  fire() {
    this.tone(760, 0.07, 'square', 0.09, 320);
  },
  missile() {
    this.tone(520, 0.35, 'sawtooth', 0.14, 90);
    this.noise(0.25, 0.12);
  },
  boom() {
    this.noise(0.3, 0.38);
    this.tone(110, 0.28, 'sawtooth', 0.2, 40);
  },
  hurt() {
    this.noise(0.2, 0.38);
    this.tone(140, 0.3, 'sawtooth', 0.3, 55);
  },
  pickup() {
    this.tone(660, 0.06, 'square', 0.13);
    this.tone(990, 0.09, 'square', 0.13, 0, this.ctx && this.ctx.currentTime + 0.07);
  },
  ammo() {
    this.tone(440, 0.08, 'triangle', 0.16);
    this.tone(880, 0.12, 'triangle', 0.16, 0, this.ctx && this.ctx.currentTime + 0.09);
  },
  part() {
    const t = this.ctx && this.ctx.currentTime;
    [440, 554, 659, 880].forEach((f, i) => this.tone(f, 0.5, 'triangle', 0.15, 0, t + i * 0.09));
  },
  jump() {
    const t = this.ctx && this.ctx.currentTime;
    [330, 440, 554, 659, 880, 1108].forEach((f, i) => this.tone(f, 0.4, 'triangle', 0.15, 0, t + i * 0.09));
  },
  over() {
    this.tone(160, 1.1, 'sawtooth', 0.18, 55);
  },
};

// --------------------------------------------------------------------------
// Modelos wireframe: [vértices, aristas]. +z es la nariz; -y es arriba.

// La nave: fuselaje con cabina, alas delta y timón
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

// Centinela: pirámide vigilante, con ojo
const SENTRY_MODEL = [
  [
    [-22, 14, -22], [22, 14, -22], [22, 14, 22], [-22, 14, 22], [0, -26, 0],
  ],
  [
    [0, 1], [1, 2], [2, 3], [3, 0], [0, 4], [1, 4], [2, 4], [3, 4], [0, 2], [1, 3],
  ],
];

// Dron cazador: caza con cabina, alas y aletas en las puntas
const DRONE_MODEL = [
  [
    [0, 0, 16], // 0 nariz
    [0, -6, 2], // 1 cabina
    [0, 0, -10], // 2 cola
    [-18, 1, -8], // 3 ala izq
    [18, 1, -8], // 4 ala der
    [-5, 0, 2], // 5 raíz izq
    [5, 0, 2], // 6 raíz der
    [-18, -7, -11], // 7 aleta izq
    [18, -7, -11], // 8 aleta der
    [0, 5, -4], // 9 panza
  ],
  [
    [0, 1], [1, 2], [0, 5], [0, 6], [5, 3], [6, 4], [3, 2], [4, 2],
    [3, 7], [4, 8], [0, 9], [9, 2], [5, 9], [6, 9],
  ],
];
const HUNTER_SCALE = 2; // cazadores e interceptores: grandes, fáciles de seguir

// Mina: octaedro
const MINE_MODEL = [
  [
    [0, -12, 0], [10, 0, 0], [0, 12, 0], [-10, 0, 0], [0, 0, 10], [0, 0, -10],
  ],
  [
    [0, 1], [1, 2], [2, 3], [3, 0], [0, 4], [1, 4], [2, 4], [3, 4], [0, 5], [1, 5], [2, 5], [3, 5],
  ],
];

const PART_MODEL = MINE_MODEL; // la pieza: el mismo octaedro, en tinta y girando

// Asteroide: icosaedro con cada vértice desplazado — cada roca es única,
// facetada como piedra en vez de un contorno plano
const ICO_PHI = (1 + Math.sqrt(5)) / 2;
const ICO_VERTS = [
  [-1, ICO_PHI, 0], [1, ICO_PHI, 0], [-1, -ICO_PHI, 0], [1, -ICO_PHI, 0],
  [0, -1, ICO_PHI], [0, 1, ICO_PHI], [0, -1, -ICO_PHI], [0, 1, -ICO_PHI],
  [ICO_PHI, 0, -1], [ICO_PHI, 0, 1], [-ICO_PHI, 0, -1], [-ICO_PHI, 0, 1],
];
const ICO_EDGES = [];
for (let i = 0; i < 12; i++) {
  for (let j = i + 1; j < 12; j++) {
    const [a, b] = [ICO_VERTS[i], ICO_VERTS[j]];
    if (Math.abs(Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) - 2) < 0.01) ICO_EDGES.push([i, j]);
  }
}
function makeRockModel() {
  const k = 16 / Math.hypot(1, ICO_PHI);
  return [
    ICO_VERTS.map(([x, y, z]) => {
      const j = (0.68 + Math.random() * 0.5) * k;
      return [x * j, y * j * 0.8, z * j];
    }),
    ICO_EDGES,
  ];
}

// Interceptor: aguja con cuchillas hacia adelante
const INTER_MODEL = [
  [
    [0, 0, 24], // 0 nariz
    [0, -4, -4], // 1 lomo
    [0, 4, -4], // 2 quilla
    [-4, 0, -4], // 3 flanco izq
    [4, 0, -4], // 4 flanco der
    [0, 0, -14], // 5 cola
    [-15, 0, 7], // 6 cuchilla izq
    [15, 0, 7], // 7 cuchilla der
  ],
  [
    [0, 1], [0, 2], [0, 3], [0, 4], [1, 5], [2, 5], [3, 5], [4, 5],
    [3, 6], [6, 5], [4, 7], [7, 5],
  ],
];

// La nave capital: casco alargado con quilla y puente
const BOSS_MODEL = [
  [
    [0, 0, 130], // 0 proa
    [38, 10, 44], [38, 10, -92], [-38, 10, -92], [-38, 10, 44], // 1-4 cubierta
    [0, -22, 24], [0, -22, -76], // 5-6 puente
    [0, 26, -30], // 7 quilla
    [0, 0, -104], // 8 popa
  ],
  [
    [0, 1], [0, 4], [1, 2], [4, 3], [2, 8], [3, 8],
    [0, 5], [5, 6], [6, 8], [1, 5], [4, 5], [2, 6], [3, 6],
    [0, 7], [7, 8], [1, 7], [4, 7],
  ],
];
// Torretas montadas en el casco (coordenadas locales)
const BOSS_TURRETS = [
  [46, -4, 30],
  [-46, -4, 30],
  [0, -30, -40],
];

// Mejoras: escudo (anillo), reparación (cruz), cañón doble (dos rayas)
const POW_MODELS = {
  shield: [
    [[0, -10, 0], [9, 0, 0], [0, 10, 0], [-9, 0, 0], [0, 0, 0]],
    [[0, 1], [1, 2], [2, 3], [3, 0]],
  ],
  hull: [
    [[0, -9, 0], [0, 9, 0], [-9, 0, 0], [9, 0, 0]],
    [[0, 1], [2, 3]],
  ],
  twin: [
    [[-5, -9, 0], [-5, 9, 0], [5, -9, 0], [5, 9, 0]],
    [[0, 1], [2, 3]],
  ],
};
const POW_NAMES = { shield: 'ESCUDO ARRIBA', hull: 'CASCO REPARADO', twin: 'CAÑÓN DOBLE' };

// Chatarra: un trozo de casco — placa con borde, puntal y una solapa doblada
const SCRAP_MODEL = [
  [
    [-8, -6, 0], [7, -7, 0], [9, 4, 0], [-6, 6, 0], // 0-3 placa
    [13, 8, -6], [-2, 11, -6], // 4-5 solapa doblada
    [-8, -6, -4], [7, -7, -4], // 6-7 borde
  ],
  [
    [0, 1], [1, 2], [2, 3], [3, 0], [2, 4], [4, 5], [5, 3],
    [0, 6], [1, 7], [6, 7], [0, 2],
  ],
];

const FONT = (size, color) => ({
  fontFamily: 'monospace',
  fontSize: size + 'px',
  color: color || INK_CSS,
});

function typeIn(scene, textObj, full, cps) {
  let i = 0;
  return scene.time.addEvent({
    delay: 1000 / cps,
    repeat: full.length - 1,
    callback: () => {
      i++;
      textObj.setText(full.slice(0, i));
    },
  });
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
    this.add
      .text(CX, 186, 'Encuentra las tres piezas. Y vuelve a casa.', FONT(15, DIM_CSS))
      .setOrigin(0.5)
      .setAlpha(0.9);
    this.press = this.add.text(CX, H - 130, 'PRESIONA START', FONT(16)).setOrigin(0.5);
    this.add.text(CX, H - 44, HINT_MAIN, FONT(13, DIM_CSS)).setOrigin(0.5).setAlpha(0.8);

    this.scoreText = this.add.text(CX, 330, '', FONT(15, DIM_CSS)).setOrigin(0.5, 0).setLineSpacing(7);
    loadScores().then((scores) => {
      if (!scores.length || !this.scene.isActive()) return;
      this.scoreText.setText(
        scores.map((s, i) => `${i + 1}  ${s.n.padEnd(3)}  ${String(s.s).padStart(6, '0')}`).join('\n')
      );
    });
  }

  update(time, delta) {
    // la nave girando sobre el nombre — el único adorno
    this.spin += delta * 0.0009;
    this.gfx.clear();
    drawModelAt(this.gfx, SHIP_MODEL, CX, 254, this.spin, -0.2, 2.6, INK, 1, 1.5);
    this.press.setAlpha(Math.floor(time / 600) % 2 ? 1 : 0.25);
    if (anyStart()) this.scene.start('game');
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
    this.pos = { x: 0, y: 0, z: -1600 };
    this.yaw = 0;
    this.yawVel = 0;
    this.pitch = 0;
    this.pitchVel = 0;
    this.speed = CRUISE;
    this.boost = BOOST_MAX;
    this.roll = 0;
    this.spin = 0;
    this.fireReadyAt = 0;
    this.invulnUntil = 0;
    this.hull = HULL_MAX;
    this.ammo = 3;
    this.scrapRun = 0;

    // cámara: sigue rumbo y cabeceo con un pelo de retraso; nunca alabea
    this.camYaw = 0;
    this.camPitch = 0;

    this.phase = 'play'; // play → charge → out
    this.jumping = false; // Phaser reuses the scene instance across runs
    this.charge = 0;
    this.score = 0;
    this.partsGot = 0;
    this.elapsed = 0;
    this.droneAt = 6; // el sector te nota pronto: la caza es el juego
    this.shake = 0;

    this.ents = [];
    this.bolts = [];
    this.missiles = [];
    this.shots = [];
    this.booms = [];
    this.shards = []; // fragmentos de explosión

    // arcade extra
    this.paused = false;
    this.mult = 1; // multiplicador de combo
    this.multT = 0;
    this.shield = false;
    this.twinUntil = 0;
    this.muzzleT = 0;
    this.boss = null;

    this.populate();
    this.buildStars();
    this.buildHud();

    this.flash = this.add.rectangle(CX, CY, W, H, 0xffffff).setAlpha(0).setDepth(10);
    window.__g = this; // handle de debug — quitar antes de enviar
  }

  // El sector se puebla UNA vez: todo anclado al mundo, tú te mueves
  populate() {
    const rnd = (a, b) => a + Math.random() * (b - a);
    // las piezas, cada una custodiada y cada una más lejos
    for (let i = 0; i < PARTS.length; i++) {
      const ang = rnd(0, Math.PI * 2);
      const rr = 800 + i * 500;
      const px = Math.sin(ang) * rr;
      const pz = Math.cos(ang) * rr;
      const py = rnd(-500, 500);
      this.ents.push({ k: 'part', x: px, y: py, z: pz, r: 26, idx: i, t: 0, yaw: 0 });
      // un centinela custodia la primera pieza, dos las siguientes — pocos, grandes
      for (let j = 0; j < 1 + Math.min(i, 1); j++) {
        this.ents.push({
          k: 'sentry',
          x: px + rnd(-280, 280),
          y: py + rnd(-200, 200),
          z: pz + rnd(-280, 280),
          r: 44,
          hp: 3,
          t: rnd(0, 6),
          yaw: rnd(0, 6.3),
          fireAt: 0,
        });
      }
    }
    // asteroides, chatarra y serpientes del vacío — pocos y grandes: que se lean
    for (let i = 0; i < 14; i++) {
      const p = this.randIn(SECTOR_R * 0.95);
      this.ents.push({
        k: 'rock', x: p[0], y: p[1] * 0.5, z: p[2], r: 42, hp: 2, t: rnd(0, 9), model: makeRockModel(),
        spin: rnd(-0.5, 0.5), vx: rnd(-16, 16), vy: rnd(-10, 10), vz: rnd(-16, 16), yaw: 0,
      });
    }
    for (let i = 0; i < 16; i++) {
      const p = this.randIn(SECTOR_R * 0.9);
      this.ents.push({ k: 'scrap', x: p[0], y: p[1] * 0.5, z: p[2], r: 16, t: rnd(0, 6), yaw: 0 });
    }
    for (let i = 0; i < 2; i++) {
      const p = this.randIn(SECTOR_R * 0.8);
      this.ents.push({ k: 'eel', x: p[0], y: p[1] * 0.4, z: p[2], r: 22, hp: 2, t: rnd(0, 9), yaw: rnd(0, 6.3) });
    }
  }

  randIn(r) {
    const ang = Math.random() * Math.PI * 2;
    const rr = 300 + Math.random() * (r - 300);
    return [Math.sin(ang) * rr, (Math.random() - 0.5) * 2 * r * 0.5, Math.cos(ang) * rr];
  }

  // Estrellas: puntos fijos del mundo, envueltos en una caja alrededor tuyo
  buildStars() {
    this.stars = [];
    for (let i = 0; i < 240; i++) {
      this.stars.push({
        x: (Math.random() - 0.5) * 1700,
        y: (Math.random() - 0.5) * 1700,
        z: (Math.random() - 0.5) * 1700,
        s: Math.random() < 0.12 ? 3 : Math.random() < 0.45 ? 2 : 1,
        tw: Math.random() < 0.25 ? 1 + Math.random() * 2 : 0, // parpadeo
        ph: Math.random() * 6.3,
      });
    }
    // the galaxy's band: dense faint stars hugging the horizon
    this.band = [];
    for (let i = 0; i < 260; i++) {
      const u = Math.random() + Math.random() + Math.random() - 1.5;
      this.band.push({
        yaw: Math.random() * Math.PI * 2,
        el: u * 26,
        s: Math.random() < 0.2 ? 2 : 1,
        a: 0.2 + Math.random() * 0.45,
      });
    }
    // el polvo: motas cercanas que convierten la velocidad en estelas
    this.dust = [];
    for (let i = 0; i < 34; i++) {
      this.dust.push({
        x: (Math.random() - 0.5) * 560,
        y: (Math.random() - 0.5) * 560,
        z: (Math.random() - 0.5) * 560,
      });
    }
  }

  buildHud() {
    this.velText = this.add.text(12, 10, '', FONT(15)).setAlpha(0.9);
    this.scoreText = this.add.text(W - 12, 10, '', FONT(15)).setOrigin(1, 0).setAlpha(0.9);
    this.partText = this.add.text(W - 12, H - 28, '', FONT(15, DIM_CSS)).setOrigin(1, 0);
    this.hullText = this.add.text(12, H - 28, '', FONT(15)).setAlpha(0.9);
    this.navText = this.add.text(CX, 64, '', FONT(14)).setOrigin(0.5).setAlpha(0.9);
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

    // pausa: START congela el sector
    if (pressed.START1 && this.phase !== 'out') {
      this.paused = !this.paused;
      this.tweens.killTweensOf(this.notice);
      this.notice.setText(this.paused ? 'PAUSA — START CONTINÚA' : '').setAlpha(this.paused ? 1 : 0);
    }
    if (this.paused) return;

    // el combo se enfría
    this.multT -= dt;
    if (this.multT <= 0) this.mult = 1;
    this.muzzleT -= dt;

    if (this.phase === 'play') {
      this.spawnDrones(dt, 2 + this.partsGot, 8);
    } else if (this.phase === 'charge') {
      this.charge = Math.min(CHARGE_TIME, this.charge + dt);
      this.spawnDrones(dt, 3, 7);
      if (this.charge >= CHARGE_TIME && !this.jumping) {
        this.jumping = true;
        Sfx.jump();
        this.flash.setAlpha(1);
        this.tweens.add({ targets: this.flash, alpha: 0, duration: 900 });
        this.score += 500 + this.hull * 150;
        this.phase = 'out';
        this.time.delayedCall(1100, () => this.scene.start('over', { win: true, score: this.score }));
      }
    }

    if (this.phase !== 'out') this.updatePlayer(time, dt);
    this.updateEnts(time, dt);
    this.updateBolts(dt);
    this.updateMissiles(dt, time);
    this.updateCamera(dt);
    this.draw(time);
    this.updateHud();
  }

  // Después de un rato, salen a cazarte — y más, con cada pieza a bordo.
  // Con la primera pieza aparecen también interceptores, que embisten.
  spawnDrones(dt, max, every) {
    this.droneAt -= dt;
    const alive = this.ents.filter((e) => e.k === 'drone' || e.k === 'inter').length;
    if (this.droneAt > 0 || alive >= max) return;
    this.droneAt = every;
    const ang = Math.random() * Math.PI * 2;
    const inter = this.partsGot >= 1 && Math.random() < 0.45;
    this.ents.push({
      k: inter ? 'inter' : 'drone',
      x: this.pos.x + Math.sin(ang) * 1200,
      y: this.pos.y + (Math.random() - 0.5) * 500,
      z: this.pos.z + Math.cos(ang) * 1200,
      r: 22 * HUNTER_SCALE,
      hp: 1,
      t: 0,
      yaw: 0,
      fireAt: 1.5,
      vx: 0,
      vy: 0,
      vz: 0,
    });
  }

  // La nave capital llega a defender el hipersalto: tres torretas, luego el núcleo
  spawnBoss() {
    const ang = Math.random() * Math.PI * 2;
    this.boss = {
      k: 'boss',
      x: this.pos.x + Math.sin(ang) * 1500,
      y: this.pos.y - 100,
      z: this.pos.z + Math.cos(ang) * 1500,
      r: 120,
      t: 0,
      yaw: 0,
      core: 6,
      turrets: BOSS_TURRETS.map(([ox, oy, oz]) => ({ ox, oy, oz, hp: 2, fireAt: 1 + Math.random() * 2 })),
    };
    this.ents.push(this.boss);
  }

  // Punto mundial de una torreta del jefe, girada con el casco
  bossTurretPos(b, tu) {
    const c = Math.cos(b.yaw);
    const s = Math.sin(b.yaw);
    return [b.x + tu.ox * c + tu.oz * s, b.y + tu.oy, b.z - tu.ox * s + tu.oz * c];
  }

  // Daño al jefe: primero caen las torretas, después se abre el núcleo
  bossHit(b, n, wx, wy, wz) {
    const alive = b.turrets.filter((t) => t.hp > 0);
    if (alive.length) {
      let best = alive[0];
      let bd = 1e9;
      for (const tu of alive) {
        const [tx, ty, tz] = this.bossTurretPos(b, tu);
        const d = Math.hypot(wx - tx, wy - ty, wz - tz);
        if (d < bd) {
          bd = d;
          best = tu;
        }
      }
      best.hp -= n;
      b.flashT = 0.08;
      if (best.hp <= 0) {
        const [tx, ty, tz] = this.bossTurretPos(b, best);
        this.booms.push({ wx: tx, wy: ty, wz: tz, t: 0 });
        this.addScore(60);
        this.dropPow(tx, ty, tz, 0.7);
        Sfx.boom();
        if (!b.turrets.some((t) => t.hp > 0)) this.say('NÚCLEO EXPUESTO.');
      }
      return;
    }
    b.core -= n;
    b.flashT = 0.08;
    if (b.core <= 0 && !b.dead) {
      b.dead = true;
      this.boss = null;
      for (let i = 0; i < 4; i++) {
        this.booms.push({ wx: b.x + (Math.random() - 0.5) * 160, wy: b.y + (Math.random() - 0.5) * 60, wz: b.z + (Math.random() - 0.5) * 160, t: -i * 0.08, big: true });
      }
      this.spray(b.x, b.y, b.z, 14);
      this.addScore(400);
      Sfx.boom();
      // la capital custodiaba el salto: cae y el hipersalto termina de cargar
      this.charge = CHARGE_TIME;
      this.say('NAVE CAPITAL DESTRUIDA.');
    }
  }

  addScore(pts) {
    this.score += pts * this.mult;
    if (this.multT > 0) this.mult = Math.min(5, this.mult + 1);
    else this.mult = 2;
    this.multT = 4;
  }

  dropPow(x, y, z, chance) {
    if (Math.random() > chance) return;
    const subs = ['shield', 'hull', 'twin'];
    this.ents.push({
      k: 'pow',
      sub: subs[Math.floor(Math.random() * subs.length)],
      x, y, z,
      r: 20,
      t: 0,
      yaw: 0,
      life: 14,
    });
  }

  spray(x, y, z, n) {
    for (let i = 0; i < n; i++) {
      const a1 = Math.random() * Math.PI * 2;
      const a2 = (Math.random() - 0.5) * Math.PI;
      const sp = 120 + Math.random() * 240;
      this.shards.push({
        x, y, z,
        vx: Math.sin(a1) * Math.cos(a2) * sp,
        vy: Math.sin(a2) * sp,
        vz: Math.cos(a1) * Math.cos(a2) * sp,
        life: 0.5 + Math.random() * 0.3,
      });
    }
  }

  // --- la nave: tuya, libre ---
  // La dirección de la nariz, en 3D: yaw en el plano, pitch hacia el cielo
  forward() {
    const cp = Math.cos(this.pitch);
    return {
      x: Math.sin(this.yaw) * cp,
      y: -Math.sin(this.pitch),
      z: Math.cos(this.yaw) * cp,
    };
  }

  updatePlayer(time, dt) {
    const turn = (held.P1_R ? 1 : 0) - (held.P1_L ? 1 : 0);
    const pit = (held.P1_U ? 1 : 0) - (held.P1_D ? 1 : 0); // arriba = nariz arriba

    // giro y cabeceo con inercia: sin golpes de cámara
    this.yawVel += (turn * YAW_RATE - this.yawVel) * Math.min(1, YAW_EASE * dt);
    this.yaw += this.yawVel * dt;
    // Pitch stops short of vertical: past it the ship either flies inverted
    // (left/right swap) or has to flip itself, and yawing near vertical spins
    // the view around a point overhead. Turning around is done with the stick.
    this.pitchVel += (pit * PITCH_RATE - this.pitchVel) * Math.min(1, YAW_EASE * dt);
    this.pitch += this.pitchVel * dt;
    if (Math.abs(this.pitch) > MAX_PITCH) {
      this.pitch = Math.sign(this.pitch) * MAX_PITCH;
      this.pitchVel = 0;
    }
    if (!pit) this.pitch -= this.pitch * Math.min(1, LEVEL_EASE * dt);

    // la nave siempre avanza; B2 es turbo con reserva
    const boosting = held.P1_2 && this.boost > 0;
    if (boosting) this.boost = Math.max(0, this.boost - BOOST_DRAIN * dt);
    else this.boost = Math.min(BOOST_MAX, this.boost + BOOST_REGEN * dt);
    const want = boosting ? TURBO_SPEED : CRUISE;
    this.speed += (want - this.speed) * Math.min(1, SPEED_EASE * dt);

    const f = this.forward();
    this.pos.x += f.x * this.speed * dt;
    this.pos.y += f.y * this.speed * dt;
    this.pos.z += f.z * this.speed * dt;

    // el borde del sector te devuelve, suave
    const rr = Math.hypot(this.pos.x, this.pos.y * 1.6, this.pos.z);
    if (rr > SECTOR_R) {
      this.pos.x -= (this.pos.x / rr) * (rr - SECTOR_R) * 2 * dt;
      this.pos.y -= (this.pos.y / rr) * (rr - SECTOR_R) * 2 * dt;
      this.pos.z -= (this.pos.z / rr) * (rr - SECTOR_R) * 2 * dt;
    }

    // alabeo con el giro
    this.roll += (this.yawVel * 0.34 - this.roll) * Math.min(1, 8 * dt);

    // B1: cañón — sale de la nariz, hereda tu velocidad (doble con la mejora)
    if (held.P1_1 && time >= this.fireReadyAt) {
      this.fireReadyAt = time + FIRE_MS;
      this.muzzleT = 0.05;
      Sfx.fire();
      const sp = BOLT_SPEED + this.speed;
      const twin = time < this.twinUntil;
      const rx = Math.cos(this.yaw);
      const rz = -Math.sin(this.yaw);
      for (const off of twin ? [-9, 9] : [0]) {
        this.bolts.push({
          x: this.pos.x + f.x * 24 + rx * off,
          y: this.pos.y + f.y * 24 - 2,
          z: this.pos.z + f.z * 24 + rz * off,
          vx: f.x * sp,
          vy: f.y * sp,
          vz: f.z * sp,
          life: BOLT_LIFE,
        });
      }
    }

    // B3: misil — busca el blanco más alineado con tu nariz
    if (pressed.P1_3 && this.ammo > 0) {
      this.ammo--;
      Sfx.missile();
      const target = this.bestTarget(f);
      this.missiles.push({
        x: this.pos.x + f.x * 26,
        y: this.pos.y + f.y * 26 + 4,
        z: this.pos.z + f.z * 26,
        vx: f.x * MISSILE_SPEED,
        vy: f.y * MISSILE_SPEED,
        vz: f.z * MISSILE_SPEED,
        target,
        life: 4.5,
      });
    }
  }

  bestTarget(f) {
    let best = null;
    let bestDot = 0.75; // solo lo que ya tienes bastante de frente
    for (const e of this.ents) {
      if (e.k === 'scrap' || e.k === 'part' || e.k === 'pow' || e.dead) continue;
      const dx = e.x - this.pos.x;
      const dy = e.y - this.pos.y;
      const dz = e.z - this.pos.z;
      const d = Math.hypot(dx, dy, dz);
      if (d > 1700) continue;
      const dot = (dx * f.x + dy * f.y + dz * f.z) / Math.max(d, 1);
      if (dot > bestDot) {
        bestDot = dot;
        best = e;
      }
    }
    return best;
  }

  hitPlayer(time) {
    if (time < this.invulnUntil || this.phase === 'out') return;
    this.invulnUntil = time + 1300;
    this.shake = 9;
    Sfx.hurt();
    if (this.shield) {
      // el escudo se lleva el golpe
      this.shield = false;
      return;
    }
    if (GOD) return; // modo prueba: duele, pero no mata
    this.hull--;
    if (this.hull <= 0) {
      this.phase = 'out';
      this.booms.push({ wx: this.pos.x, wy: this.pos.y, wz: this.pos.z, t: 0, big: true });
      Sfx.boom();
      this.time.delayedCall(1400, () => this.scene.start('over', { win: false, score: this.score }));
    }
  }

  // --- el sector ---
  updateEnts(time, dt) {
    const P = this.pos;

    for (const e of this.ents) {
      e.t += dt;
      if (e.flashT) e.flashT -= dt;
      const dx = P.x - e.x;
      const dy = P.y - e.y;
      const dz = P.z - e.z;
      const dist = Math.hypot(dx, dy, dz);

      if (e.k === 'drone') {
        const want = 320;
        const sp = 270 * (dist > want ? 1 : -0.5);
        e.x += (dx / dist) * sp * dt;
        e.y += (dy / dist) * sp * dt;
        e.z += (dz / dist) * sp * dt;
        e.yaw = Math.atan2(dx, dz);
        e.fireAt -= dt;
        if (e.fireAt <= 0 && dist < 900) {
          e.fireAt = 1.8;
          this.shootAtPlayer(e, 420);
        }
      } else if (e.k === 'inter') {
        // el interceptor toma carrerilla, embiste y pasa de largo
        if (dist > 420 || e.t < 0.5) {
          const k = Math.min(1, 2.2 * dt);
          e.vx += ((dx / dist) * 430 - e.vx) * k;
          e.vy += ((dy / dist) * 430 - e.vy) * k;
          e.vz += ((dz / dist) * 430 - e.vz) * k;
        }
        e.x += e.vx * dt;
        e.y += e.vy * dt;
        e.z += e.vz * dt;
        e.yaw = Math.atan2(e.vx, e.vz);
      } else if (e.k === 'boss') {
        // la capital avanza pesada hacia ti y abre fuego por torretas
        e.yaw += Phaser.Math.Angle.Wrap(Math.atan2(dx, dz) - e.yaw) * Math.min(1, 0.5 * dt);
        if (dist > 620) {
          e.x += Math.sin(e.yaw) * 90 * dt;
          e.z += Math.cos(e.yaw) * 90 * dt;
        }
        for (const tu of e.turrets) {
          if (tu.hp <= 0) continue;
          tu.fireAt -= dt;
          if (tu.fireAt <= 0 && dist < 1400) {
            tu.fireAt = 2.6;
            const [tx, ty, tz] = this.bossTurretPos(e, tu);
            this.shootAtPlayer({ x: tx, y: ty, z: tz, k: 'bossTurret' }, 430);
          }
        }
      } else if (e.k === 'pow') {
        e.life -= dt;
        if (e.life <= 0) e.dead = true;
      } else if (e.k === 'sentry') {
        e.yaw += 0.5 * dt; // gira, vigilando
        e.y += Math.sin(e.t * 1.1) * 8 * dt;
        e.fireAt -= dt;
        if (dist < 900 && e.fireAt <= 0) {
          e.fireAt = 2.4;
          this.shootAtPlayer(e, 400);
        }
      } else if (e.k === 'eel') {
        if (dist < 560) {
          e.yaw = Math.atan2(dx, dz);
          e.x += (dx / dist) * 265 * dt;
          e.y += (dy / dist) * 210 * dt;
          e.z += (dz / dist) * 265 * dt;
        } else {
          e.yaw += Math.sin(e.t * 0.7) * 0.4 * dt;
          e.x += Math.sin(e.yaw) * 120 * dt;
          e.z += Math.cos(e.yaw) * 120 * dt;
          e.y += Math.sin(e.t * 1.7) * 26 * dt;
        }
      } else if (e.k === 'mine') {
        e.y += Math.sin(e.t * 1.3) * 10 * dt;
      } else if (e.k === 'rock') {
        e.x += e.vx * dt;
        e.y += e.vy * dt;
        e.z += e.vz * dt;
        if (dist > 2600) {
          const ang = Math.random() * Math.PI * 2;
          e.x = P.x + Math.sin(ang) * 1600;
          e.y = P.y + (Math.random() - 0.5) * 900;
          e.z = P.z + Math.cos(ang) * 1600;
        }
      }

      // contacto contigo
      if (!e.dead && dist < e.r + 16) {
        if (e.k === 'scrap') {
          e.dead = true;
          this.score += 10;
          this.scrapRun++;
          if (this.scrapRun >= SCRAP_PER_MISSILE && this.ammo < MISSILE_MAX) {
            this.scrapRun = 0;
            this.ammo++;
            Sfx.ammo();
          } else {
            Sfx.pickup();
          }
        } else if (e.k === 'pow') {
          e.dead = true;
          Sfx.ammo();
          this.say(POW_NAMES[e.sub]);
          if (e.sub === 'shield') this.shield = true;
          else if (e.sub === 'hull') this.hull = Math.min(HULL_MAX, this.hull + 1);
          else this.twinUntil = time + 12000;
        } else if (e.k === 'part') {
          e.dead = true;
          this.partsGot++;
          this.score += 100;
          Sfx.part();
          if (this.partsGot >= PARTS.length) {
            this.phase = 'charge';
            this.say('PIEZAS COMPLETAS. CARGANDO EL HIPERSALTO — RESISTE.');
            this.spawnBoss();
          } else {
            this.say(PARTS[e.idx] + ' A BORDO. ' + (PARTS.length - this.partsGot) + ' MÁS.');
          }
        } else {
          if (e.k !== 'sentry' && e.k !== 'boss') e.dead = true;
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

    // tus disparos contra el sector
    for (const b of this.bolts) {
      for (const e of this.ents) {
        if (e.dead || e.k === 'scrap' || e.k === 'part' || e.k === 'pow') continue;
        const d = Math.hypot(b.x - e.x, b.y - e.y, b.z - e.z);
        if (d < e.r + 10) {
          b.dead = true;
          this.damage(e, 1, b.x, b.y, b.z);
          break;
        }
      }
    }

    // los fragmentos vuelan y se apagan
    for (const s of this.shards) {
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.z += s.vz * dt;
      s.life -= dt;
    }
    this.shards = this.shards.filter((s) => s.life > 0);

    for (const bm of this.booms) bm.t += dt;
    this.ents = this.ents.filter((e) => !e.dead);
    this.shots = this.shots.filter((s) => !s.dead && s.life > 0);
    this.booms = this.booms.filter((b) => b.t < 0.5);
  }

  damage(e, n, wx, wy, wz) {
    if (e.k === 'boss') {
      this.bossHit(e, n, wx !== undefined ? wx : e.x, wy !== undefined ? wy : e.y, wz !== undefined ? wz : e.z);
      return;
    }
    e.hp -= n;
    e.flashT = 0.08;
    if (e.hp > 0) {
      this.booms.push({ wx: e.x, wy: e.y, wz: e.z, t: 0.3 });
      return;
    }
    e.dead = true;
    this.boomAt(e);
    this.spray(e.x, e.y, e.z, 6);
    this.addScore(e.k === 'sentry' ? 40 : e.k === 'rock' ? 15 : 25);
    if (e.k === 'drone' || e.k === 'inter') this.dropPow(e.x, e.y, e.z, 0.25);
    if (this.phase === 'charge') this.charge = Math.min(CHARGE_TIME, this.charge + KILL_CHARGE);
    Sfx.boom();
    if (e.k === 'rock' && e.r > 20) {
      for (let i = 0; i < 2; i++) {
        this.ents.push({
          k: 'rock', x: e.x, y: e.y, z: e.z, r: 18, hp: 1, t: 0, yaw: 0, model: makeRockModel(),
          spin: (Math.random() - 0.5) * 3,
          vx: (Math.random() - 0.5) * 120,
          vy: (Math.random() - 0.5) * 80,
          vz: (Math.random() - 0.5) * 120,
        });
      }
    }
  }

  shootAtPlayer(e, sp) {
    // apunta a donde VAS a estar, no a donde estás
    const t = Math.hypot(this.pos.x - e.x, this.pos.y - e.y, this.pos.z - e.z) / sp;
    const f = this.forward();
    const tx = this.pos.x + f.x * this.speed * t * 0.7;
    const ty = this.pos.y + f.y * this.speed * t * 0.7;
    const tz = this.pos.z + f.z * this.speed * t * 0.7;
    const dx = tx - e.x;
    const dy = ty - e.y;
    const dz = tz - e.z;
    const m = Math.hypot(dx, dy, dz);
    this.shots.push({
      x: e.x,
      y: e.y - (e.k === 'sentry' ? 26 : 0),
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

  updateMissiles(dt, time) {
    for (const m of this.missiles) {
      if (m.target && !m.target.dead) {
        // corrige el rumbo hacia el blanco
        const dx = m.target.x - m.x;
        const dy = m.target.y - m.y;
        const dz = m.target.z - m.z;
        const d = Math.hypot(dx, dy, dz);
        const k = Math.min(1, MISSILE_TURN * dt);
        m.vx += ((dx / d) * MISSILE_SPEED - m.vx) * k;
        m.vy += ((dy / d) * MISSILE_SPEED - m.vy) * k;
        m.vz += ((dz / d) * MISSILE_SPEED - m.vz) * k;
        if (d < m.target.r + 16) {
          m.dead = true;
          this.damage(m.target, 3, m.x, m.y, m.z);
        }
      }
      m.x += m.vx * dt;
      m.y += m.vy * dt;
      m.z += m.vz * dt;
      m.life -= dt;
    }
    this.missiles = this.missiles.filter((m) => !m.dead && m.life > 0);
  }

  updateCamera(dt) {
    let d = this.yaw - this.camYaw;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    this.camYaw += d * Math.min(1, 9 * dt);
    let dp = this.pitch - this.camPitch;
    while (dp > Math.PI) dp -= Math.PI * 2;
    while (dp < -Math.PI) dp += Math.PI * 2;
    this.camPitch += dp * Math.min(1, 8 * dt);
    if (this.shake > 0) this.shake = Math.max(0, this.shake - 34 * dt);
  }

  // --- proyección mundo → pantalla: la cámara sigue rumbo Y cabeceo,
  // pero nunca alabea — el horizonte no rota ---
  cam() {
    const sinY = Math.sin(this.camYaw);
    const cosY = Math.cos(this.camYaw);
    const sinP = Math.sin(this.camPitch);
    const cosP = Math.cos(this.camPitch);
    // detrás de la nariz, y desplazada hacia el "arriba" de la cámara
    const fx = sinY * cosP;
    const fy = -sinP;
    const fz = cosY * cosP;
    const ux = -sinY * sinP;
    const uy = -cosP;
    const uz = -cosY * sinP;
    return {
      x: this.pos.x - fx * CAM_BACK + ux * CAM_UP,
      y: this.pos.y - fy * CAM_BACK + uy * CAM_UP,
      z: this.pos.z - fz * CAM_BACK + uz * CAM_UP,
      sinY,
      cosY,
      sinP,
      cosP,
    };
  }

  czOf(cm, wx, wy, wz) {
    const dx = wx - cm.x;
    const dy = wy - cm.y;
    const dz = wz - cm.z;
    const cz1 = dx * cm.sinY + dz * cm.cosY;
    return cz1 * cm.cosP - dy * cm.sinP;
  }

  project(cm, wx, wy, wz) {
    const dx = wx - cm.x;
    const dy = wy - cm.y;
    const dz = wz - cm.z;
    const cx = dx * cm.cosY - dz * cm.sinY;
    const cz1 = dx * cm.sinY + dz * cm.cosY;
    const cz = cz1 * cm.cosP - dy * cm.sinP;
    if (cz < NEAR) return null;
    const cy = dy * cm.cosP + cz1 * cm.sinP;
    const shx = this.shake ? (Math.random() - 0.5) * this.shake : 0;
    const shy = this.shake ? (Math.random() - 0.5) * this.shake : 0;
    return [CX + (cx * FOCAL) / cz + shx, CY + (cy * FOCAL) / cz + shy, cz];
  }

  worldLine(g, cm, a, b) {
    let pa = this.project(cm, a[0], a[1], a[2]);
    let pb = this.project(cm, b[0], b[1], b[2]);
    if (!pa && !pb) return;
    if (!pa || !pb) {
      const [va, vb] = pa ? [a, b] : [b, a];
      const cza = this.czOf(cm, va[0], va[1], va[2]);
      const czb = this.czOf(cm, vb[0], vb[1], vb[2]);
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

  fogAlpha(dist) {
    return Phaser.Math.Clamp(1.25 - dist / 2600, 0, 1);
  }

  // Modelo 3D anclado al mundo, con yaw propio y roll/pitch opcionales
  drawWorldModel(g, cm, model, e, scale, color, baseAlpha, extraRoll, pitch) {
    const [verts, edges] = model;
    const cyw = Math.cos(e.yaw || 0);
    const syw = Math.sin(e.yaw || 0);
    const cr = Math.cos(extraRoll || 0);
    const sr = Math.sin(extraRoll || 0);
    const cp = Math.cos(pitch || 0);
    const sp = Math.sin(pitch || 0);
    const pts = [];
    for (const [mx0, my0, mz0] of verts) {
      const mx = mx0 * cr - my0 * sr;
      let my = mx0 * sr + my0 * cr;
      let mz = mz0;
      const my2 = my * cp - mz * sp;
      mz = my * sp + mz * cp;
      my = my2;
      const wx = e.x + (mx * cyw + mz * syw) * scale;
      const wy = e.y + my * scale;
      const wz = e.z + (-mx * syw + mz * cyw) * scale;
      pts.push([wx, wy, wz]);
    }
    // dos pasadas: un halo ancho y tenue bajo la línea viva — luz, no alambre
    g.lineStyle(4.5, color, baseAlpha * 0.18);
    for (const [a, b] of edges) this.worldLine(g, cm, pts[a], pts[b]);
    g.lineStyle(1.5, color, baseAlpha);
    for (const [a, b] of edges) this.worldLine(g, cm, pts[a], pts[b]);
  }

  draw(time) {
    const g = this.gfx;
    g.clear();
    this.cameras.main.setBackgroundColor(0x070709);
    const cm = this.cam();

    this.drawSky(g);
    this.drawStars(g, cm, time);
    this.drawDust(g, cm);

    this.label.setVisible(false);
    for (const e of this.ents) this.drawEnt(g, cm, e, time);

    // cañón: trazos brillantes
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

    // misiles: punta brillante con estela
    for (const m of this.missiles) {
      const p1 = this.project(cm, m.x, m.y, m.z);
      const p2 = this.project(cm, m.x - m.vx * 0.06, m.y - m.vy * 0.06, m.z - m.vz * 0.06);
      if (!p1) continue;
      if (p2) {
        g.lineStyle(1.5, INK, 0.5);
        g.beginPath();
        g.moveTo(p1[0], p1[1]);
        g.lineTo(p2[0], p2[1]);
        g.strokePath();
      }
      g.fillStyle(INK_HI, 0.95);
      g.fillCircle(p1[0], p1[1], Math.max(2, 900 / p1[2]));
    }

    // disparos enemigos: brasas de óxido
    for (const s of this.shots) {
      const p = this.project(cm, s.x, s.y, s.z);
      if (!p) continue;
      g.fillStyle(RUST_HI, 0.95);
      g.fillCircle(p[0], p[1], Math.max(2, 700 / p[2]));
    }

    // explosiones: anillos que crecen y fragmentos que vuelan
    for (const bm of this.booms) {
      if (bm.t < 0) continue;
      const p = this.project(cm, bm.wx, bm.wy, bm.wz);
      if (!p) continue;
      const r = (4 + bm.t * (bm.big ? 260 : 150)) * (FOCAL / p[2]);
      g.lineStyle(1.5, bm.big ? INK_HI : RUST, 1 - bm.t / 0.5);
      g.strokeCircle(p[0], p[1], r);
    }
    for (const s of this.shards) {
      const p1 = this.project(cm, s.x, s.y, s.z);
      const p2 = this.project(cm, s.x - s.vx * 0.05, s.y - s.vy * 0.05, s.z - s.vz * 0.05);
      if (!p1 || !p2) continue;
      g.lineStyle(1, INK, s.life * 1.6);
      g.beginPath();
      g.moveTo(p1[0], p1[1]);
      g.lineTo(p2[0], p2[1]);
      g.strokePath();
    }

    this.drawShip(g, cm, time);
    this.drawNav(g, cm);

    // barra de carga del hipersalto
    if (this.phase === 'charge') {
      g.lineStyle(1.5, INK, 0.8);
      g.strokeRect(CX - 110, 30, 220, 10);
      g.fillStyle(INK_HI, 0.9);
      g.fillRect(CX - 108, 32, 216 * (this.charge / CHARGE_TIME), 6);
    }

    this.drawRadar(g);
  }

  // El radar: el sector alrededor tuyo, con tu nariz siempre hacia arriba
  drawRadar(g) {
    const rx = W - 66;
    const ry = H - 92;
    const R = 44;
    const RANGE = 1600;
    g.lineStyle(1, INK, 0.35);
    g.strokeCircle(rx, ry, R);
    g.fillStyle(INK_HI, 0.9);
    g.fillRect(rx - 1, ry - 1, 2, 2);
    const c = Math.cos(this.yaw);
    const s = Math.sin(this.yaw);
    for (const e of this.ents) {
      if (e.k === 'scrap' || e.k === 'rock') continue;
      const dx = e.x - this.pos.x;
      const dz = e.z - this.pos.z;
      const lx = dx * c - dz * s;
      const lz = dx * s + dz * c;
      const d = Math.hypot(lx, lz);
      if (d > RANGE) continue;
      const k = (d / RANGE) * R;
      const px = rx + (lx / (d || 1)) * k;
      const py = ry - (lz / (d || 1)) * k;
      if (e.k === 'part') {
        g.fillStyle(INK_HI, 0.5 + 0.5 * Math.sin(e.t * 5));
        g.fillRect(px - 1.5, py - 1.5, 3, 3);
      } else if (e.k === 'pow') {
        g.fillStyle(INK, 0.8);
        g.fillRect(px - 1, py - 1, 2, 2);
      } else {
        g.fillStyle(RUST_HI, 0.9);
        g.fillRect(px - 1.5, py - 1.5, e.k === 'boss' ? 5 : 3, e.k === 'boss' ? 5 : 3);
      }
    }
  }

  // Un punto del CIELO (infinitamente lejos): solo gira con la cámara
  skyPoint(yawDir, elev) {
    let d = yawDir - this.camYaw;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    if (Math.abs(d) > 1.7) return null;
    // cabecear también mueve el cielo
    return [CX + d * FOCAL, this.horizonY() + elev];
  }

  // Where the sector's level plane meets the sky; the camera never rolls,
  // so it is always a horizontal line
  horizonY() {
    return CY + Math.tan(this.camPitch) * FOCAL;
  }

  // Up and down must always read: a hazy floor below the horizon and the
  // galaxy's band lying along it
  drawHorizon(g) {
    const hy = this.horizonY();
    for (let i = 0; i < 10; i++) {
      const y0 = hy + i * i * 7;
      if (y0 > H) break;
      g.fillStyle(0x2c323c, 0.17 - i * 0.016);
      g.fillRect(0, Math.max(0, y0), W, H - Math.max(0, y0));
    }
    g.fillStyle(0x3a4452, 0.1);
    g.fillRect(0, hy - 18, W, 36);
    g.fillStyle(0x5a6878, 0.1);
    g.fillRect(0, hy - 6, W, 12);
    g.lineStyle(1, INK, 0.22);
    g.beginPath();
    g.moveTo(0, hy);
    g.lineTo(W, hy);
    g.strokePath();
    for (const b of this.band) {
      let d = b.yaw - this.camYaw;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      if (Math.abs(d) > 1.1) continue;
      g.fillStyle(INK, b.a);
      g.fillRect(CX + d * FOCAL, hy + b.el, b.s, b.s);
    }
  }

  // El cielo: nebulosas tenues y un gigante gaseoso con bandas, más su luna
  drawSky(g) {
    this.drawHorizon(g);
    // nebulosas: manchas apenas visibles que dan fondo al negro
    const nebs = [
      [0.9, -60, 300, 0x33506a, 0.05],
      [4.1, 90, 260, 0x33506a, 0.04],
      [5.3, -140, 220, 0x5e4038, 0.04],
    ];
    for (const [yw, ey, r, col, al] of nebs) {
      const p = this.skyPoint(yw, ey);
      if (!p) continue;
      g.fillStyle(col, al);
      g.fillCircle(p[0], p[1], r);
      g.fillStyle(col, al * 0.7);
      g.fillCircle(p[0] + r * 0.4, p[1] - r * 0.25, r * 0.6);
    }

    const p = this.skyPoint(2.4, -200);
    if (!p) return;
    const [sx, sy] = p;
    const R = 150;
    // atmósfera
    g.lineStyle(6, 0x6a89a0, 0.14);
    g.strokeCircle(sx, sy, R + 4);
    g.lineStyle(2, 0x8fb0c4, 0.3);
    g.strokeCircle(sx, sy, R + 1);
    // la esfera, en franjas: cada una respeta el contorno
    const BANDS_P = [0x2a4658, 0x22384a, 0x35566a, 0x1c2e3c, 0x2f4d5f, 0x22384a, 0x2a4658, 0x1a2a36];
    const N = 22;
    for (let i = 0; i < N; i++) {
      const y0 = -R + (2 * R * i) / N;
      const y1 = y0 + (2 * R) / N;
      const ym = (y0 + y1) / 2;
      const hw = Math.sqrt(Math.max(0, R * R - ym * ym));
      if (hw < 2) continue;
      g.fillStyle(BANDS_P[Math.floor((i / N) * BANDS_P.length)], 1);
      g.fillRect(sx - hw, sy + y0, hw * 2, y1 - y0 + 1);
      // el terminador: la noche entra por la derecha
      const tx = sx + hw * 0.3;
      g.fillStyle(0x05060a, 0.72);
      g.fillRect(tx, sy + y0, sx + hw - tx, y1 - y0 + 1);
    }
    // la luna: pequeña, con su propia noche
    const mp = this.skyPoint(2.04, -300);
    if (mp) {
      g.fillStyle(0x474d55, 1);
      g.fillCircle(mp[0], mp[1], 20);
      g.fillStyle(0x05060a, 0.7);
      g.fillCircle(mp[0] + 7, mp[1], 17);
    }
  }

  drawStars(g, cm, time) {
    const L = 1700;
    for (const m of this.stars) {
      const wx = this.pos.x + Phaser.Math.Wrap(m.x - this.pos.x, -L / 2, L / 2);
      const wy = this.pos.y + Phaser.Math.Wrap(m.y - this.pos.y, -L / 2, L / 2);
      const wz = this.pos.z + Phaser.Math.Wrap(m.z - this.pos.z, -L / 2, L / 2);
      const p = this.project(cm, wx, wy, wz);
      if (!p) continue;
      const dist = Math.hypot(wx - this.pos.x, wy - this.pos.y, wz - this.pos.z);
      let a = this.fogAlpha(dist) * 0.55;
      if (m.tw) a *= 0.6 + 0.4 * Math.sin(time * 0.001 * m.tw + m.ph);
      if (a <= 0.02) continue;
      g.fillStyle(INK, a);
      g.fillRect(p[0], p[1], m.s, m.s);
      if (m.s === 3) {
        // las grandes destellan en cruz
        g.lineStyle(1, INK, a * 0.5);
        g.beginPath();
        g.moveTo(p[0] - 4, p[1] + 1);
        g.lineTo(p[0] + 6, p[1] + 1);
        g.moveTo(p[0] + 1, p[1] - 4);
        g.lineTo(p[0] + 1, p[1] + 6);
        g.strokePath();
      }
    }
  }

  // El polvo convierte tu velocidad en estelas: se SIENTE volar
  drawDust(g, cm) {
    const L = 560;
    const f = this.forward();
    const trail = 0.012 + (this.speed / TURBO_SPEED) * 0.05;
    for (const m of this.dust) {
      const wx = this.pos.x + Phaser.Math.Wrap(m.x - this.pos.x, -L / 2, L / 2);
      const wy = this.pos.y + Phaser.Math.Wrap(m.y - this.pos.y, -L / 2, L / 2);
      const wz = this.pos.z + Phaser.Math.Wrap(m.z - this.pos.z, -L / 2, L / 2);
      const p1 = this.project(cm, wx, wy, wz);
      const p2 = this.project(cm, wx + f.x * this.speed * trail, wy + f.y * this.speed * trail, wz + f.z * this.speed * trail);
      if (!p1 || !p2) continue;
      const dist = Math.hypot(wx - this.pos.x, wy - this.pos.y, wz - this.pos.z);
      const a = Phaser.Math.Clamp(1 - dist / 420, 0, 1) * 0.4 * (this.speed / TURBO_SPEED + 0.3);
      if (a <= 0.02) continue;
      g.lineStyle(1, INK, a);
      g.beginPath();
      g.moveTo(p1[0], p1[1]);
      g.lineTo(p2[0], p2[1]);
      g.strokePath();
    }
  }

  drawEnt(g, cm, e, time) {
    const dist = Math.hypot(e.x - this.pos.x, e.y - this.pos.y, e.z - this.pos.z);
    const p = this.project(cm, e.x, e.y, e.z);
    if (!p) return;
    let a = this.fogAlpha(dist);
    if (e.k === 'part') a = Math.max(a, 0.5); // la pieza brilla sola

    if (a <= 0.03) {
      if ((e.k === 'drone' || e.k === 'eel' || e.k === 'sentry') && dist < 3000) {
        g.fillStyle(RUST_HI, 0.6);
        g.fillRect(p[0], p[1], 2.5, 2.5);
      }
      return;
    }

    // el óxido es solo para lo que te ataca; una roca es paisaje que golpea
    const flash = e.flashT > 0;
    const color = flash
      ? INK_HI
      : e.k === 'part' || e.k === 'pow' ? INK_HI : e.k === 'rock' || e.k === 'scrap' ? INK : RUST;
    if (e.k === 'rock' && !flash) a *= 0.62;

    if (e.k === 'boss') {
      a = Math.max(a, 0.5);
      this.drawWorldModel(g, cm, BOSS_MODEL, e, 1, color, a);
      for (const tu of e.turrets) {
        if (tu.hp <= 0) continue;
        const [tx, ty, tz] = this.bossTurretPos(e, tu);
        this.drawWorldModel(g, cm, SENTRY_MODEL, { x: tx, y: ty, z: tz, yaw: e.yaw }, 0.7, color, a);
        const eye = this.project(cm, tx, ty - 14, tz);
        if (eye) {
          g.fillStyle(RUST_HI, a);
          g.fillCircle(eye[0], eye[1], Math.max(2, 700 / eye[2]));
        }
      }
      if (!e.turrets.some((t) => t.hp > 0)) {
        // el núcleo, expuesto y latiendo
        const core = this.project(cm, e.x, e.y, e.z);
        if (core) {
          g.fillStyle(RUST_HI, 0.6 + 0.4 * Math.sin(e.t * 6));
          g.fillCircle(core[0], core[1], Math.max(3, 2400 / core[2]));
        }
      }
      return;
    }

    if (e.k === 'eel') {
      // la serpiente del vacío: una línea sinuosa con cabeza de brasa
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
      e.k === 'sentry' ? SENTRY_MODEL : e.k === 'drone' ? DRONE_MODEL : e.k === 'inter' ? INTER_MODEL
      : e.k === 'pow' ? POW_MODELS[e.sub] : e.k === 'rock' ? e.model : e.k === 'part' ? PART_MODEL : SCRAP_MODEL;
    const scale = e.k === 'rock' ? e.r / 16 : e.k === 'part' ? 1.4 : e.k === 'sentry' ? 1.6
      : e.k === 'drone' || e.k === 'inter' ? HUNTER_SCALE : 1;
    const rot = e.k === 'rock' ? e.t * e.spin : e.k === 'part' || e.k === 'scrap' || e.k === 'pow' ? e.t * 1.1 : 0;
    this.drawWorldModel(g, cm, model, e, scale, color, a, rot);

    if (e.k === 'mine' && Math.floor(time / 500) % 2) {
      g.fillStyle(RUST_HI, a);
      g.fillCircle(p[0], p[1], Math.max(1.5, 300 / p[2]));
    }
    if (e.k === 'sentry') {
      // el ojo late y su anillo de vigilancia respira: se ve venir de lejos
      const pulse = 0.5 + 0.5 * Math.sin(e.t * 3);
      g.fillStyle(RUST_HI, a * (0.6 + 0.4 * pulse));
      const eye = this.project(cm, e.x, e.y - 20, e.z);
      if (eye) g.fillCircle(eye[0], eye[1], Math.max(3, 1100 / p[2]));
      g.lineStyle(1.5, RUST, a * (0.25 + 0.3 * pulse));
      g.strokeCircle(p[0], p[1], (70 + pulse * 10) * (FOCAL / p[2]));
    }
    if (e.k === 'part') {
      g.lineStyle(1.5, INK_HI, a * (0.4 + 0.3 * Math.sin(e.t * 4)));
      g.strokeCircle(p[0], p[1], (26 + Math.sin(e.t * 4) * 4) * (FOCAL / p[2]));
      if (dist < 1500) {
        this.label.setVisible(true).setPosition(p[0], p[1] + 34 * (FOCAL / p[2]) + 14).setText(PARTS[e.idx]);
      }
    }
  }

  drawShip(g, cm, time) {
    if (this.phase === 'out') return;
    if (time < this.invulnUntil && Math.floor(time / 60) % 2 === 0) return;
    const e = { x: this.pos.x, y: this.pos.y, z: this.pos.z, yaw: this.yaw };
    this.drawWorldModel(g, cm, SHIP_MODEL, e, 1, INK, 1, this.roll + this.spin, this.pitch);
    const f = this.forward();
    // el escudo envuelve la nave; el fogonazo vive en la nariz
    const sp0 = this.project(cm, this.pos.x, this.pos.y, this.pos.z);
    if (this.shield && sp0) {
      g.lineStyle(1.5, INK_HI, 0.4 + 0.2 * Math.sin(time * 0.008));
      g.strokeCircle(sp0[0], sp0[1], 30 * (FOCAL / sp0[2]));
    }
    if (this.muzzleT > 0) {
      const mp = this.project(cm, this.pos.x + f.x * 26, this.pos.y + f.y * 26 - 2, this.pos.z + f.z * 26);
      if (mp) {
        g.fillStyle(INK_HI, 0.9);
        g.fillCircle(mp[0], mp[1], Math.max(2, 500 / mp[2]));
      }
    }
    // estela del motor
    const level = Math.abs(this.speed) / TURBO_SPEED;
    if (level > 0.05) {
      g.lineStyle(2, INK_HI, 0.3 + 0.5 * level * (0.6 + 0.4 * Math.sin(time * 0.04)));
      const tail = 20 + 26 * level;
      this.worldLine(
        g,
        cm,
        [this.pos.x - f.x * 14, this.pos.y - f.y * 14 + 1, this.pos.z - f.z * 14],
        [this.pos.x - f.x * tail, this.pos.y - f.y * tail + 1, this.pos.z - f.z * tail]
      );
    }
    // retícula: a donde apunta la nariz — y avisa si un misil tiene blanco
    const rp = this.project(cm, this.pos.x + f.x * 620, this.pos.y + f.y * 620, this.pos.z + f.z * 620);
    if (rp) {
      const locked = this.ammo > 0 && this.bestTarget(f);
      g.lineStyle(1.5, locked ? RUST_HI : INK, 0.6);
      g.strokeCircle(rp[0], rp[1], locked ? 10 : 7);
      g.fillStyle(locked ? RUST_HI : INK, 0.6);
      g.fillRect(rp[0] - 1, rp[1] - 1, 2, 2);
    }
  }

  // La marca de navegación: hacia la pieza que falta
  drawNav(g, cm) {
    let target = null;
    let label = '';
    if (this.phase === 'play') {
      target = this.ents.find((e) => e.k === 'part');
      if (target) label = PARTS[target.idx];
    } else if (this.phase === 'charge' && this.boss) {
      target = this.boss;
      label = 'NAVE CAPITAL';
    } else if (this.phase === 'charge') {
      this.navText.setText('RESISTE');
      return;
    }
    if (!target) {
      this.navText.setText('');
      return;
    }
    const part = target;
    const dist = Math.hypot(part.x - this.pos.x, part.y - this.pos.y, part.z - this.pos.z);
    this.navText.setText(label + '  ' + Math.round(dist) + ' M');

    const p = this.project(cm, part.x, part.y, part.z);
    const margin = 46;
    if (p && p[0] > margin && p[0] < W - margin && p[1] > margin && p[1] < H - margin) {
      g.lineStyle(1.5, INK_HI, 0.85);
      const r = 16;
      g.strokeRect(p[0] - r, p[1] - r, r * 2, r * 2);
      return;
    }
    let ang;
    if (p) ang = Math.atan2(p[1] - CY, p[0] - CX);
    else {
      const dx = part.x - cm.x;
      const dy = part.y - cm.y;
      const dz = part.z - cm.z;
      const cx = dx * cm.cosY - dz * cm.sinY;
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
    this.velText.setText('VEL ' + String(Math.abs(Math.round(this.speed))).padStart(3, '0'));
    this.scoreText.setText(String(this.score).padStart(6, '0') + (this.mult > 1 ? '  x' + this.mult : ''));
    this.hullText.setText(
      'CASCO ' + (GOD ? '∞' : '▸'.repeat(this.hull) + '·'.repeat(HULL_MAX - this.hull)) +
      '   MISILES ' + '▴'.repeat(this.ammo) + '·'.repeat(MISSILE_MAX - this.ammo)
    );
    this.partText.setText(PARTS.map((p, i) => (i < this.partsGot ? p[0] : '·')).join(' '));
    // la reserva de turbo, junto a la velocidad
    const g = this.gfx;
    g.lineStyle(1, INK, 0.5);
    g.strokeRect(12, 34, 90, 6);
    g.fillStyle(INK_HI, 0.7);
    g.fillRect(13, 35, 88 * (this.boost / BOOST_MAX), 4);
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
    if (!this.win) Sfx.over();

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
  scene: [Title, Game, Over, Initials],
};

window.__game = new Phaser.Game(config); // handle de debug — quitar antes de enviar
