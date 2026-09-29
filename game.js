// Space Explorer — Platanus Hack 26: Caracas Arcade Challenge
// Tu nave quedó varada en un sector alienígena. Encuentra las tres piezas del
// hipersalto entre los restos, y vuelve a casa.
//
// Vuelo libre 3D con proyección propia: la nave siempre avanza y el stick la
// dirige, con loops completos; la cámara va pegada a ella. Tres etapas:
// TUTORIAL — mandos guiados, objetivo a objetivo (B5 lo salta). NIVEL 0 —
// las piezas en cadena, custodiadas, con el camino marcado; al completarlas,
// hipersalto (túnel de estrellas). NIVEL 1 — un destructor sale del
// hiperespacio, todo se oscurece y suelta una salva de cohetes al cielo que
// cae sobre ti; derríbalo y resiste la carga. Todo el sector flota sobre un
// agujero negro: bajar demasiado es no volver. Wireframe luminoso; el óxido
// marca el peligro.

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
// Arriba/abajo cabecea sin tope: mantenlo y das la vuelta completa. La cámara
// va pegada a la nave, así que izquierda es izquierda aun de cabeza. ---
const YAW_RATE = 2.4; // rad/s tope
const YAW_EASE = 9; // 1/s, el giro entra y sale suave
const PITCH_RATE = 2.1; // rad/s de cabeceo
const ROLL_LEVEL = 1.5; // rad/s: suelto el stick, la nave rota sobre su eje hasta quedar derecha
const CRUISE = 235; // crucero constante — la nave NUNCA se detiene
const TURBO_SPEED = 470; // referencia de "rápido" para estelas y cámara
const NITRO_MAX = 760; // manteniendo B2 la nave acelera sin parar hasta aquí
const NITRO_ACCEL = 260; // unidades/s²
const SPEED_EASE = 3; // 1/s de vuelta al crucero
const BOOST_MAX = 100;
const BOOST_DRAIN = 16; // por segundo de nitro — la reserva da ~6 s seguidos
const BOOST_REGEN = 28; // por segundo de recarga
const DASH_COST = 16; // cada toque de B2: un dash, intocable un instante
const DASH_KICK = 260;
const DASH_INVULN_MS = 450;
const RAM_SPEED = 430; // por encima, embistes a los cazadores y los destrozas
// B4/B6: ESCUDO — una burbuja que come todo lo que te llega mientras dura.
// La respuesta a las ráfagas del destructor: levantarlo en el momento justo.
const SHIELD_MS = 2600;
const SHIELD_COOLDOWN_MS = 4000;
const SHIELD_R = 52; // radio en mundo dentro del que la burbuja come disparos
const SHIELD_INK = 0xb8dbe4; // el azul de los domos: el color que ya dice "escudo"
const LEVEL_CRUISE = [180, 210, 235]; // tutorial, nivel 0, nivel 1
const MAGNET_R = 240; // lo recogible viene hacia ti
const FIRE_MS = 160;
const BOLT_SPEED = 980;
const BOLT_LIFE = 1.3;
const MISSILE_SPEED = 560;
const MISSILE_TURN = 3.4; // 1/s de corrección hacia el blanco
const MISSILE_MAX = 5;
const MISSILE_DMG = 4;
const MISSILE_SPLASH = 150; // todo lo que esté cerca del impacto también cae
const MISSILE_REGEN = 12; // segundos por misil recuperado solo
const SCRAP_PER_MISSILE = 3;

// --- Enemigos: pocos, grandes, disparos lentos que se pueden esquivar ---
const SHOT_SPEED = 250;
const DRONE_FIRE = 3.0; // segundos entre disparos de un cazador

// --- El sector: una esfera de juego alrededor del origen ---
const SECTOR_R = 2400;
// El suelo es un agujero negro: siempre debajo de ti. Bajar lo acerca; a
// BH_PULL de distancia empieza a tirar, y a BH_KILL te tragó.
const BH_Y = 3600;
const BH_PULL = 1800;
const BH_KILL = 900;
const JUMP_TIME = 2; // segundos de túnel antes del flash
const CHARGE_TIME = 12; // tras derribar al destructor, resiste mientras carga el salto
const KILL_CHARGE = 1;

const HULL_MAX = 3;
const SCORE_KEY = 'space-explorer:scores';

// Las cuatro piezas del hipersalto
const PARTS = ['MOTOR', 'NÚCLEO NAV', 'CELDA DE SALTO', 'REACTOR'];

const HINT_MAIN = 'STICK DIRIGE · B1 DISPARA · B2 NITRO · B3 MISIL · B4/B6 ESCUDO';

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
  dash() {
    this.noise(0.18, 0.18);
    this.tone(220, 0.25, 'sawtooth', 0.12, 880);
  },
  turn() {
    this.tone(330, 0.3, 'sine', 0.12, 160);
  },
  shieldUp() {
    this.tone(240, 0.28, 'sine', 0.15, 520);
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

// La nave: caza esbelto — parabrisas marcado, alas en flecha con winglets,
// timón alto y dos góndolas de motor bajo las alas
const SHIP_MODEL = [
  [
    [0, 0, 26], // 0 nariz
    [0, -3.5, 14], // 1 parabrisas
    [0, -5.5, 2], // 2 techo de cabina
    [0, -4, -8], // 3 lomo
    [0, -11, -17], // 4 timón, punta
    [0, 0, -16], // 5 cola
    [-5, -1, 8], // 6 raíz ala izq
    [5, -1, 8], // 7 raíz ala der
    [-22, 1, -13], // 8 punta ala izq
    [22, 1, -13], // 9 punta ala der
    [-22, -4, -15], // 10 winglet izq
    [22, -4, -15], // 11 winglet der
    [0, 3, -6], // 12 panza
    [-9, 1, -2], // 13 góndola izq, frente
    [9, 1, -2], // 14 góndola der, frente
    [-11, 1, -15], // 15 góndola izq, tobera
    [11, 1, -15], // 16 góndola der, tobera
    [-3, -1.5, 19], // 17 arista de proa izq
    [3, -1.5, 19], // 18 arista de proa der
  ],
  [
    [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [3, 5],
    [0, 6], [0, 7], [6, 8], [7, 9], [8, 5], [9, 5],
    [8, 10], [9, 11],
    [0, 12], [12, 5], [6, 12], [7, 12],
    [6, 13], [13, 15], [7, 14], [14, 16], [15, 5], [16, 5],
    [0, 17], [17, 6], [0, 18], [18, 7], // la proa facetada
    [2, 6], [2, 7], // los laterales de la cabina bajan al ala
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

// Dron cazador: alas quebradas en codo con garras hacia adelante — una
// silueta agresiva que no se confunde con la tuya
const DRONE_MODEL = [
  [
    [0, 0, 18], // 0 nariz
    [0, -6, 4], // 1 cabina
    [0, -3, -8], // 2 lomo trasero
    [0, 0, -12], // 3 cola
    [-6, 0, 2], // 4 raíz izq
    [6, 0, 2], // 5 raíz der
    [-18, 1, -6], // 6 codo ala izq
    [18, 1, -6], // 7 codo der
    [-24, 0, 8], // 8 garra izq, hacia adelante
    [24, 0, 8], // 9 garra der
    [-18, -8, -9], // 10 aleta izq
    [18, -8, -9], // 11 aleta der
    [0, 5, -4], // 12 panza
  ],
  [
    [0, 1], [1, 2], [2, 3],
    [0, 4], [0, 5], [4, 6], [5, 7], [6, 3], [7, 3],
    [6, 8], [7, 9],
    [6, 10], [7, 11],
    [0, 12], [12, 3], [4, 12], [5, 12],
  ],
];
const HUNTER_SCALE = 3; // cazadores e interceptores: grandes, fáciles de seguir

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

// Interceptor: aguja con cuchillas hacia adelante, canards junto a la nariz
// y una aleta dorsal — un dardo con filo
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
    [-9, -1, 14], // 8 canard izq
    [9, -1, 14], // 9 canard der
    [0, -8, -12], // 10 aleta dorsal
  ],
  [
    [0, 1], [0, 2], [0, 3], [0, 4], [1, 5], [2, 5], [3, 5], [4, 5],
    [3, 6], [6, 5], [4, 7], [7, 5],
    [0, 8], [8, 3], [0, 9], [9, 4],
    [1, 10], [10, 5],
  ],
];

// El destructor: una cuña de casi mil unidades con su torre de mando atrás.
// Local: x derecha, y abajo, z hacia la proa.
const SD_SCALE = 1.6; // todo el destructor, a esta escala
const SD_NOSE = 560;
const SD_REAR = -400;
const SD_HALF_W = 300; // media manga en la popa
const SD_RIDGE = -80; // altura del lomo en la popa
const SD_KEEL = 70;
const DESTROYER_MODEL = [
  [
    [0, 0, SD_NOSE], // 0 proa
    [-SD_HALF_W, 0, SD_REAR], // 1 popa, borde babor
    [SD_HALF_W, 0, SD_REAR], // 2 popa, borde estribor
    [0, SD_RIDGE, SD_REAR], // 3 lomo en popa
    [0, SD_KEEL, SD_REAR], // 4 quilla en popa
    [-280, 24, SD_REAR], // 5 babor bajo
    [280, 24, SD_REAR], // 6 estribor bajo
    [0, -45, 80], // 7 lomo a media eslora
    [-80, -70, -250], [80, -70, -250], [80, -70, SD_REAR], [-80, -70, SD_REAR], // 8-11 base de la torre
    [-60, -150, -290], [60, -150, -290], [60, -150, SD_REAR], [-60, -150, SD_REAR], // 12-15 techo de la torre
    [-130, -165, -340], [130, -165, -340], // 16-17 puente
    [-150, -40, SD_REAR], [150, -40, SD_REAR], // 18-19 líneas de paneles
    [-36, -30, 420], [36, -30, 420], // 20-21 trinchera dorsal, proa
    [-56, -56, -250], [56, -56, -250], // 22-23 trinchera dorsal, popa
    [-60, 38, 60], [60, 38, 60], // 24-25 hangar de la quilla, frente
    [-60, 44, -120], [60, 44, -120], // 26-27 hangar, fondo
    [-110, -180, -340], [110, -180, -340], // 28-29 mástiles de los domos
    [-150, -6, 180], [150, -6, 180], // 30-31 quillas laterales del casco
    [-95, -142, -338], [95, -142, -338], // 32-33 ventanas del puente
    [-70, -110, -272], [70, -110, -272], [70, -110, SD_REAR], [-70, -110, SD_REAR], // 34-37 banda media de la torre
  ],
  [
    [0, 1], [0, 2], [0, 7], [7, 3], [0, 4], [1, 3], [2, 3], [1, 5], [2, 6], [5, 4], [6, 4],
    [0, 5], [0, 6], [0, 18], [0, 19],
    [8, 9], [9, 10], [10, 11], [11, 8], [12, 13], [13, 14], [14, 15], [15, 12],
    [8, 12], [9, 13], [10, 14], [11, 15], [16, 17], [12, 16], [13, 17],
    [20, 22], [21, 23], [20, 21], // la trinchera que corre hasta la torre
    [24, 25], [25, 27], [27, 26], [26, 24], // la boca del hangar
    [12, 28], [13, 29], // los mástiles que sostienen los domos de escudo
    [0, 30], [30, 1], [0, 31], [31, 2], // las quillas que facetan el casco
    [32, 33], // la fila de ventanas del puente
    [34, 35], [35, 36], [36, 37], [37, 34], // la banda media de la torre
  ],
];
// Puntos débiles: torretas en la cubierta, dos domos de escudo sobre el puente,
// y el puente mismo, que solo recibe daño con los domos caídos
const SD_PARTS = [
  ['turret', 90, -14, 150, 3], ['turret', -90, -14, 150, 3],
  ['turret', 140, -20, -80, 3], ['turret', -140, -20, -80, 3],
  ['turret', 190, -25, -300, 3], ['turret', -190, -25, -300, 3],
  ['dome', 110, -185, -340, 8], ['dome', -110, -185, -340, 8],
  ['bridge', 0, -150, -345, 20],
];
const SD_PART_R = { turret: 42 * SD_SCALE, dome: 46 * SD_SCALE, bridge: 72 * SD_SCALE };

// Misil: cuerpo largo con cuatro aletas atrás — se tiene que ver como poder
const MISSILE_MODEL = [
  [
    [0, 0, 16], [0, 0, -12], // 0-1 eje
    [-3, 0, 8], [3, 0, 8], [0, -3, 8], [0, 3, 8], // 2-5 hombros
    [-8, 0, -14], [8, 0, -14], [0, -8, -14], [0, 8, -14], // 6-9 aletas
    [-3, 0, -6], [3, 0, -6], [0, -3, -6], [0, 3, -6], // 10-13 raíz de aletas
  ],
  [
    [0, 2], [0, 3], [0, 4], [0, 5], [2, 10], [3, 11], [4, 12], [5, 13],
    [10, 6], [11, 7], [12, 8], [13, 9], [6, 1], [7, 1], [8, 1], [9, 1],
  ],
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
  missile: [
    [[0, -12, 0], [0, 10, 0], [-6, 10, 0], [6, 10, 0], [-3, -6, 0], [3, -6, 0]],
    [[0, 1], [1, 2], [1, 3], [0, 4], [0, 5]],
  ],
};
const POW_NAMES = { shield: 'ESCUDO ARRIBA', hull: 'CASCO REPARADO', twin: 'CAÑÓN DOBLE', missile: '+2 MISILES' };

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

    // el título también está en el espacio: estrellas que titilan
    this.tstars = [];
    for (let i = 0; i < 110; i++) {
      this.tstars.push({
        x: Math.random() * W,
        y: Math.random() * H,
        s: Math.random() < 0.12 ? 2 : 1,
        a: 0.12 + Math.random() * 0.45,
        tw: Math.random() < 0.3 ? 1 + Math.random() * 2 : 0,
        ph: Math.random() * 6.3,
      });
    }

    const title = this.add.text(CX, 96, 'S P A C E  E X P L O R E R', FONT(36)).setOrigin(0.5);
    title.setShadow(0, 0, INK_CSS, 16, false, true);

    // los controles, de verdad — no una sola línea
    [
      ['STICK', 'DIRIGE LA NAVE — LOOPS COMPLETOS'],
      ['B1', 'CAÑÓN, CON PUNTERÍA ASISTIDA'],
      ['B2', 'TOQUE: DASH · MANTENIDO: NITRO QUE EMBISTE'],
      ['B3', 'MISIL TELEDIRIGIDO'],
      ['B4/B6', 'ESCUDO'],
      ['START', 'PAUSA'],
    ].forEach(([k, v], i) => {
      const y = 372 + i * 27;
      this.add.text(160, y, k, FONT(14)).setOrigin(1, 0.5);
      this.add.text(180, y, v, FONT(13, DIM_CSS)).setOrigin(0, 0.5);
    });

    // el top 5, a la derecha
    this.add.text(596, 372, 'TOP 5', FONT(14)).setOrigin(0, 0.5);
    this.scoreText = this.add.text(596, 394, '', FONT(14, DIM_CSS)).setOrigin(0, 0).setLineSpacing(9);
    loadScores().then((scores) => {
      if (!scores.length || !this.scene.isActive()) return;
      this.scoreText.setText(
        scores.map((s, i) => `${i + 1}  ${s.n.padEnd(3)}  ${String(s.s).padStart(6, '0')}`).join('\n')
      );
    });

    this.press = this.add.text(CX, H - 52, 'PRESIONA START', FONT(16)).setOrigin(0.5);
  }

  update(time, delta) {
    this.spin += delta * 0.0009;
    const g = this.gfx;
    g.clear();
    for (const m of this.tstars) {
      let a = m.a;
      if (m.tw) a *= 0.55 + 0.45 * Math.sin(time * 0.001 * m.tw + m.ph);
      g.fillStyle(INK, a);
      g.fillRect(m.x, m.y, m.s, m.s);
    }
    // tu nave, girando en su eje como en una vitrina — vista desde ARRIBA,
    // que se le vea el lomo: es la misma vista que tendrás en vuelo
    drawModelAt(g, SHIP_MODEL, CX, 236, 0, 0.38, 2.4, INK, 1, 1.5, this.spin);
    this.press.setAlpha(Math.floor(time / 600) % 2 ? 1 : 0.25);
    if (anyStart()) this.scene.start('game', { level: 0 });
  }
}

// Dibuja un modelo suelto en pantalla (título): yaw + roll + pitch, sin cámara
function drawModelAt(g, model, sx, sy, roll, pitch, size, color, alpha, width, yaw) {
  const [verts, edges] = model;
  const cr = Math.cos(roll);
  const sr = Math.sin(roll);
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  const cy = Math.cos(yaw || 0);
  const sy2 = Math.sin(yaw || 0);
  const pts = verts.map(([mx0, my, mz0]) => {
    const mx = mx0 * cy + mz0 * sy2;
    const mz = -mx0 * sy2 + mz0 * cy;
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

// --- vectores {x,y,z} ---
const vdot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
const vcross = (a, b) => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x });
const vmix = (a, sa, b, sb) => ({ x: a.x * sa + b.x * sb, y: a.y * sa + b.y * sb, z: a.z * sa + b.z * sb });
const vnorm = (a) => {
  const m = Math.hypot(a.x, a.y, a.z) || 1;
  return { x: a.x / m, y: a.y / m, z: a.z / m };
};
const WORLD_UP = { x: 0, y: -1, z: 0 };
// Rota v un ángulo alrededor del eje unitario A (Rodrigues)
function rotAxis(v, A, ang) {
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  const k = vdot(A, v) * (1 - c);
  const x = vcross(A, v);
  return { x: v.x * c + x.x * s + A.x * k, y: v.y * c + x.y * s + A.y * k, z: v.z * c + x.z * s + A.z * k };
}

// Re-ortonormaliza una base (F, U) → [F, U, R], para que los errores de
// redondeo de rotar cada frame nunca la deformen
function orthoBasis(F, U) {
  const f = vnorm(F);
  const u = vnorm(vmix(U, 1, f, -vdot(U, f)));
  return [f, u, vcross(f, u)];
}

// Dirección del cielo: rumbo en el plano del sector y elevación sobre él
const skyDir = (yaw, el) => ({ x: Math.sin(yaw) * Math.cos(el), y: -Math.sin(el), z: Math.cos(yaw) * Math.cos(el) });

// Recorta un polígono de pantalla al lado f(p) >= 0 de una recta
function clipHalf(poly, f) {
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const fa = f(a);
    const fb = f(b);
    if (fa >= 0) out.push(a);
    if (fa >= 0 !== fb >= 0) {
      const t = fa / (fa - fb);
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
  }
  return out;
}

// --- El cielo, pintado en coordenadas locales (0,0 al centro) ---

// Esfera en franjas: cada franja respeta el contorno; la noche entra por la derecha
function drawBandedSphere(g, R, bands, night) {
  const N = 22;
  for (let i = 0; i < N; i++) {
    const y0 = -R + (2 * R * i) / N;
    const y1 = y0 + (2 * R) / N;
    const ym = (y0 + y1) / 2;
    const hw = Math.sqrt(Math.max(0, R * R - ym * ym));
    if (hw < 2) continue;
    g.fillStyle(bands[Math.floor((i / N) * bands.length)], 1);
    g.fillRect(-hw, y0, hw * 2, y1 - y0 + 1);
    const tx = hw * night;
    g.fillStyle(0x05060a, 0.72);
    g.fillRect(tx, y0, hw - tx, y1 - y0 + 1);
  }
}

function drawGasGiant(g) {
  const R = 150;
  g.lineStyle(6, 0x6a89a0, 0.14);
  g.strokeCircle(0, 0, R + 4);
  g.lineStyle(2, 0x8fb0c4, 0.3);
  g.strokeCircle(0, 0, R + 1);
  drawBandedSphere(g, R, [0x2a4658, 0x22384a, 0x35566a, 0x1c2e3c, 0x2f4d5f, 0x22384a, 0x2a4658, 0x1a2a36], 0.3);
}

// Planeta óxido con anillos: la mitad de atrás del anillo va detrás de la esfera
function drawRingedPlanet(g) {
  const R = 64;
  const ring = (from) => {
    for (let k = 0; k < 4; k++) {
      g.lineStyle(k === 1 ? 3 : 1.5, [0xd8b08a, 0xc9956a, 0xa6765a, 0x8a5c48][k], 0.55);
      g.beginPath();
      for (let j = 0; j <= 20; j++) {
        const a = from + (j / 20) * Math.PI;
        const x = R * (1.55 + k * 0.18) * Math.cos(a);
        const y = R * (0.32 + k * 0.035) * Math.sin(a) - x * 0.28;
        if (j === 0) g.moveTo(x, y);
        else g.lineTo(x, y);
      }
      g.strokePath();
    }
  };
  ring(Math.PI);
  g.lineStyle(4, 0xc97b5a, 0.12);
  g.strokeCircle(0, 0, R + 3);
  drawBandedSphere(g, R, [0x8a4a36, 0x6b3a2c, 0x9a5a40, 0x7a4432, 0x5a3024, 0x8a4a36], 0.25);
  ring(0);
}

function drawIcePlanet(g) {
  const R = 30;
  g.lineStyle(3, 0xb8dbe4, 0.18);
  g.strokeCircle(0, 0, R + 2);
  drawBandedSphere(g, R, [0x9fc2cc, 0x8fb4c0, 0xb4d4dc, 0x86aab6], 0.1);
}

// --------------------------------------------------------------------------
class Game extends Phaser.Scene {
  constructor() {
    super('game');
  }

  // El casco, los puntos y los misiles viajan contigo entre niveles
  init(data) {
    this.level = data.level || 0;
    this.carry = data;
  }

  create() {
    this.events.on('postupdate', clearPressed);
    this.gfx = this.add.graphics();

    // la nave, en coordenadas de MUNDO (y positivo = hacia abajo). Su actitud
    // es una base: F nariz, U techo, R ala derecha.
    this.pos = { x: 0, y: 0, z: -1600 };
    this.F = { x: 0, y: 0, z: 1 };
    this.U = { x: 0, y: -1, z: 0 };
    this.R = { x: 1, y: 0, z: 0 };
    this.yawVel = 0;
    this.pitchVel = 0;
    this.cruise = LEVEL_CRUISE[this.level] || CRUISE;
    this.speed = this.cruise;
    this.boost = BOOST_MAX;
    this.roll = 0; // alabeo solo visual, al girar
    this.shieldUntil = 0;
    this.shieldReady = 0;
    this.dashUntil = 0;
    this.fireReadyAt = 0;
    this.invulnUntil = 0;
    this.hull = this.carry.hull ?? HULL_MAX;
    this.ammo = this.carry.ammo ?? 3;
    this.ammoRegen = 0;
    this.scrapRun = 0;

    // cámara: la misma base, suavizada — sigue la nave también de cabeza
    this.camF = { ...this.F };
    this.camU = { ...this.U };
    this.camR = { ...this.R };

    // TUTORIAL y NIVEL 0: play → jump; NIVEL 1: play → boss → charge → out
    this.phase = 'play';
    this.jumping = false; // Phaser reuses the scene instance across runs
    this.jumpT = 0;
    this.enterT = this.level ? 1 : 0; // llegando: el túnel se deshace
    this.bossAt = 6; // nivel 1: el destructor tarda esto en llegar
    this.tutStep = -1; // el tutorial avanza objetivo a objetivo
    this.tut = null;
    this.tutWait = 0.6;
    this.skipArm = 0; // B5 arma el salto del tutorial; START lo confirma
    this.shieldEats = 0;
    this.shieldHitT = 0;
    this.bhWarnAt = 0;
    this.charge = 0;
    this.score = this.carry.score || 0;
    this.partsGot = 0;
    this.elapsed = 0;
    this.droneAt = 12; // al principio te dejan orientarte
    this.shake = 0;
    if (this.level) this.speed = 999; // sales del salto lanzado

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
    if (this.level) {
      // el destello de salir del hiperespacio
      this.flash.setAlpha(0.9);
      this.tweens.add({ targets: this.flash, alpha: 0, duration: 700 });
    }
    window.__g = this; // handle de debug — quitar antes de enviar
  }

  // El sector se puebla UNA vez: todo anclado al mundo, tú te mueves
  populate() {
    const rnd = (a, b) => a + Math.random() * (b - a);
    if (this.level === 1) {
      // NIVEL 0: las piezas DISPERSAS por el sector, cada una en su rincón
      // y custodiada — ningún camino fácil; la marca te lleva de una en una
      const base = rnd(0, Math.PI * 2);
      for (let i = 0; i < PARTS.length; i++) {
        const ang = base + (i * Math.PI * 2) / PARTS.length + rnd(-0.45, 0.45);
        const rr = 900 + i * 360 + rnd(-120, 120);
        const px = Math.sin(ang) * rr;
        const py = rnd(-600, 450);
        const pz = Math.cos(ang) * rr;
        this.ents.push({ k: 'part', x: px, y: py, z: pz, r: 26, idx: i, t: 0, yaw: 0 });
        // un centinela custodia la primera pieza, dos las siguientes
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
      for (let i = 0; i < 2; i++) {
        const p = this.randIn(SECTOR_R * 0.8);
        this.ents.push({ k: 'eel', x: p[0], y: p[1] * 0.4, z: p[2], r: 22, hp: 2, t: rnd(0, 9), yaw: rnd(0, 6.3) });
      }
    }
    // asteroides y chatarra suelta — pocos y grandes: que se lean. El
    // tutorial va casi vacío (los objetivos los pone la secuencia) y el
    // nivel 1 es la arena del destructor: despejada a propósito.
    const rocks = [5, 10, 8][this.level] || 8;
    const scraps = [4, 12, 8][this.level] || 8;
    for (let i = 0; i < rocks; i++) {
      const p = this.randIn(SECTOR_R * 0.95);
      this.ents.push({
        k: 'rock', x: p[0], y: p[1] * 0.5, z: p[2], r: 42, hp: 2, t: rnd(0, 9), model: makeRockModel(),
        spin: rnd(-0.5, 0.5), vx: rnd(-16, 16), vy: rnd(-10, 10), vz: rnd(-16, 16), yaw: 0,
      });
    }
    for (let i = 0; i < scraps; i++) {
      const p = this.randIn(SECTOR_R * 0.9);
      this.ents.push({ k: 'scrap', x: p[0], y: p[1] * 0.5, z: p[2], r: 16, t: rnd(0, 6), yaw: 0 });
    }
  }

  randIn(r) {
    const ang = Math.random() * Math.PI * 2;
    const rr = 300 + Math.random() * (r - 300);
    return [Math.sin(ang) * rr, (Math.random() - 0.5) * 2 * r * 0.5, Math.cos(ang) * rr];
  }

  // Estrellas: puntos fijos del mundo, envueltos en una caja alrededor tuyo
  buildStars() {
    // Stars sit at infinity: they only turn with the view and never slide
    // past, so the one thing moving through the sector is you
    this.stars = [];
    for (let i = 0; i < 320; i++) {
      const v = vnorm({ x: Math.random() - 0.5, y: Math.random() - 0.5, z: Math.random() - 0.5 });
      this.stars.push({
        v,
        s: Math.random() < 0.1 ? 3 : Math.random() < 0.4 ? 2 : 1,
        a: 0.25 + Math.random() * 0.45,
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
        el: (u * 26) / FOCAL,
        s: Math.random() < 0.2 ? 2 : 1,
        a: 0.2 + Math.random() * 0.45,
      });
    }
    // el polvo: motas cercanas que convierten la velocidad en estelas —
    // son la referencia principal de hacia dónde te mueves
    this.dust = [];
    for (let i = 0; i < 96; i++) {
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
    this.missileText = this.add.text(150, H - 28, '', FONT(15)).setAlpha(0.9);
    this.navText = this.add.text(CX, 64, '', FONT(14)).setOrigin(0.5).setAlpha(0.9);
    this.label = this.add.text(0, 0, '', FONT(14)).setOrigin(0.5).setVisible(false);
    this.notice = this.add.text(CX, 168, '', FONT(16)).setOrigin(0.5).setAlpha(0);
    this.hint = this.add
      .text(CX, H - 58, this.level === 0 ? 'B5 SALTA EL TUTORIAL' : HINT_MAIN, FONT(13, DIM_CSS))
      .setOrigin(0.5)
      .setAlpha(0.6);
    this.time.delayedCall(9000, () => this.tweens.add({ targets: this.hint, alpha: 0, duration: 800 }));
    // etiqueta del escudo, junto a su barra
    this.add.text(106, 41, 'ESCUDO', FONT(9, DIM_CSS)).setAlpha(0.7);
    if (this.level === 1) this.say('NIVEL 0 — BUSCA EL MOTOR. SIGUE LA MARCA.');
    else if (this.level === 2) this.say('NIVEL 1 — ALGO SE ACERCA.');
    // el tutorial anuncia su primer objetivo solo
  }

  say(msg) {
    this.notice.setText(msg).setAlpha(1);
    this.tweens.add({ targets: this.notice, alpha: 0, delay: 2000, duration: 700 });
  }

  // --- flujo ---
  update(time, delta) {
    const dt = Math.min(delta, 50) / 1000;
    this.elapsed += dt;

    // pausa: START congela el sector — salvo que esté confirmando el salto
    // del tutorial (B5 arma, START confirma: dos botones, sin accidentes)
    if (pressed.START1 && this.phase !== 'out') {
      if (this.level === 0 && this.phase === 'play' && this.elapsed < this.skipArm) {
        this.startJump('TUTORIAL SALTADO.');
      } else {
        this.paused = !this.paused;
        this.tweens.killTweensOf(this.notice);
        this.notice.setText(this.paused ? 'PAUSA — START CONTINÚA' : '').setAlpha(this.paused ? 1 : 0);
      }
    }
    if (this.paused) return;

    // el combo se enfría
    this.multT -= dt;
    if (this.multT <= 0) this.mult = 1;
    this.muzzleT -= dt;
    this.shieldHitT = Math.max(0, this.shieldHitT - dt);

    if (this.phase === 'play') {
      if (this.level === 0) {
        this.updateTutorial(dt);
        if (pressed.P1_5) {
          this.skipArm = this.elapsed + 3.5;
          this.say('¿SALTAR EL TUTORIAL? START CONFIRMA.');
        }
      } else if (this.level === 1) {
        // dos desde el principio; uno más por cada pieza a bordo
        this.spawnDrones(dt, Math.min(5, 2 + this.partsGot), 10);
      } else {
        this.spawnDrones(dt, 1, 9);
        const was = this.bossAt;
        this.bossAt -= dt;
        // el aviso llega antes que la nave: que se sienta venir
        if (was > 2.5 && this.bossAt <= 2.5) this.say('SEÑAL MASIVA DETECTADA.');
        if (this.bossAt <= 0) {
          this.phase = 'boss';
          this.say('UN DESTRUCTOR BLOQUEA EL SALTO. DERRÍBALO.');
          this.spawnBoss();
        }
      }
    } else if (this.phase === 'jump') {
      // el hipersalto: sin control, derecho y cada vez más rápido, hasta el flash
      this.jumpT += dt;
      this.speed = Math.min(999, this.speed + 800 * dt);
      const f = this.F;
      this.pos.x += f.x * this.speed * dt;
      this.pos.y += f.y * this.speed * dt;
      this.pos.z += f.z * this.speed * dt;
      if (this.jumpT > JUMP_TIME && !this.jumping) {
        this.jumping = true;
        this.flash.setAlpha(1);
        this.time.delayedCall(160, () =>
          this.scene.restart({ level: this.level + 1, score: this.score, hull: this.hull, ammo: this.ammo })
        );
      }
    } else if (this.phase === 'boss') {
      // durante la llegada y la salva cinemática, la escena es del destructor
      if (!(this.boss && (this.boss.arrive > 0 || this.boss.cine))) this.spawnDrones(dt, 2, 14);
    } else if (this.phase === 'charge') {
      this.charge = Math.min(CHARGE_TIME, this.charge + dt);
      this.spawnDrones(dt, 3, 6);
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

    this.enterT = Math.max(0, this.enterT - dt);
    if (this.phase !== 'out' && this.phase !== 'jump') this.updatePlayer(time, dt);
    this.updateEnts(time, dt);
    this.updateBolts(dt);
    this.updateMissiles(dt, time);
    this.updateCamera(dt);
    this.draw(time);
    this.updateHud();
  }

  // El hipersalto arranca: túnel de estrellas, sin control, y al siguiente nivel
  startJump(msg) {
    if (this.phase === 'jump') return;
    this.phase = 'jump';
    this.jumpT = 0;
    this.invulnUntil = 1e9;
    Sfx.jump();
    this.say(msg);
  }

  // --- El tutorial: un objetivo a la vez, la marca de navegación te lleva ---
  tutAdvance() {
    this.tutStep++;
    const rnd = (a, b) => a + Math.random() * (b - a);
    // los objetivos se plantan delante de donde estés, dentro del sector
    const ahead = (d, ox, oy) => {
      const o = {
        x: this.pos.x + this.F.x * d + this.R.x * (ox || 0),
        y: this.pos.y + this.F.y * d + (oy || 0),
        z: this.pos.z + this.F.z * d + this.R.z * (ox || 0),
      };
      const h = Math.hypot(o.x, o.z);
      if (h > 1900) {
        o.x *= 1900 / h;
        o.z *= 1900 / h;
      }
      o.y = Phaser.Math.Clamp(o.y, -900, 900);
      return o;
    };
    const mk = (e) => {
      this.ents.push(e);
      return e;
    };
    switch (this.tutStep) {
      case 0:
        this.say('TUTORIAL — STICK: VUELA A LA MARCA.');
        this.tut = mk({ k: 'ring', ...ahead(700, 0, -80), r: 70, t: 0, yaw: 0 });
        break;
      case 1:
        this.say('BIEN. OTRA MARCA — GIRA Y SUBE.');
        this.tut = mk({ k: 'ring', ...ahead(800, 560, -300), r: 70, t: 0, yaw: 0 });
        break;
      case 2:
        this.say('B2 MANTENIDO: NITRO. ALCANZA LA MARCA LEJANA.');
        this.tut = mk({ k: 'ring', ...ahead(2100, 0, 0), r: 90, t: 0, yaw: 0 });
        break;
      case 3:
        this.say('B1: DERRIBA EL DRON DE PRÁCTICA.');
        this.tut = mk({
          k: 'drone', ...ahead(700, 0, 0), r: 22 * HUNTER_SCALE, hp: 3, t: 0, yaw: 0,
          fireAt: 1e9, orbit: 1, vx: 0, vy: 0, vz: 0,
        });
        break;
      case 4:
        this.say('B4/B6: ESCUDO — BLOQUEA LA RÁFAGA DE LA TORRETA.');
        this.shieldEats = 0;
        this.tut = mk({ k: 'sentry', ...ahead(750, 0, 0), r: 44, hp: 1e9, t: 0, yaw: rnd(0, 6), fireAt: 1.4 });
        break;
      case 5:
        this.say('B3: MISIL AL BLANCO.');
        this.tut = mk({
          k: 'rock', ...ahead(1000, 0, 0), r: 42, hp: 4, t: 0, yaw: 0, model: makeRockModel(),
          spin: 0.4, vx: 0, vy: 0, vz: 0,
        });
        break;
      default:
        this.startJump('TUTORIAL COMPLETO. SALTANDO...');
    }
  }

  updateTutorial(dt) {
    if (!this.tut) {
      this.tutWait -= dt;
      if (this.tutWait <= 0) this.tutAdvance();
      return;
    }
    const e = this.tut;
    const d = Math.hypot(e.x - this.pos.x, e.y - this.pos.y, e.z - this.pos.z);
    const done = e.k === 'ring' ? d < 100 : this.tutStep === 4 ? this.shieldEats > 0 : e.dead;
    if (!done) return;
    if (!e.dead) {
      e.dead = true;
      if (e.k === 'ring') Sfx.pickup();
      else Sfx.ammo();
    }
    this.score += 25;
    this.tut = null;
    this.tutWait = 1.1; // un respiro entre objetivo y objetivo
  }

  // Después de un rato, salen a cazarte — y más, con cada pieza a bordo.
  // Con la primera pieza aparecen también interceptores, que embisten.
  spawnDrones(dt, max, every) {
    this.droneAt -= dt;
    const alive = this.ents.filter((e) => e.k === 'drone' || e.k === 'inter').length;
    if (this.droneAt > 0 || alive >= max) return;
    this.droneAt = every;
    const ang = Math.random() * Math.PI * 2;
    const inter = this.partsGot >= 1 && Math.random() < 0.4;
    this.ents.push({
      k: inter ? 'inter' : 'drone',
      x: this.pos.x + Math.sin(ang) * 1300,
      y: this.pos.y + (Math.random() - 0.5) * 500,
      z: this.pos.z + Math.cos(ang) * 1300,
      r: 22 * HUNTER_SCALE,
      hp: inter ? 2 : 3,
      t: 0,
      yaw: 0,
      fireAt: 2,
      orbit: Math.random() < 0.5 ? 1 : -1,
      vx: 0,
      vy: 0,
      vz: 0,
    });
  }

  // El destructor sale del hiperespacio y bloquea el salto. Llega ANCLADO
  // CERCA DEL CENTRO del sector (la pelea nunca vive contra el borde, que
  // te empuja de vuelta), y al punto del anillo MÁS LEJANO de ti: la
  // entrada y la salva se ven enteras, de lejos, como una escena.
  spawnBoss() {
    // Aparece LEJOS (fuera del anillo de pelea, al lado opuesto de ti) y a
    // TU MISMA ALTURA: lo ves de lado, entero, imponente. Después de la
    // escena, él solo navega hacia el anillo de batalla.
    const ph = Math.hypot(this.pos.x, this.pos.z);
    let bx;
    let bz;
    if (ph > 300) {
      bx = (-this.pos.x / ph) * 1900;
      bz = (-this.pos.z / ph) * 1900;
    } else {
      const f = this.F;
      const h = Math.hypot(f.x, f.z) || 1;
      bx = (f.x / h) * 1900;
      bz = (f.z / h) * 1900;
    }
    this.boss = {
      k: 'boss',
      x: bx,
      y: Phaser.Math.Clamp(this.pos.y, -500, 500),
      z: bz,
      r: 520 * SD_SCALE,
      t: 0,
      yaw: Math.atan2(this.pos.x - bx, this.pos.z - bz), // la proa hacia ti
      hangarAt: 6,
      cannonAt: 9,
      missileAt: 4,
      charging: 0,
      arrive: 2.2, // sale del hiperespacio DESPACIO: la estela se ve llegar
      parts: SD_PARTS.map(([kind, ox, oy, oz, hp]) => ({ kind, ox, oy, oz, hp, max: hp, fireAt: 1 + Math.random() * 3, burst: 0 })),
    };
    this.ents.push(this.boss);
  }

  // Del casco del destructor al mundo, y de vuelta
  bossToWorld(b, ox, oy, oz) {
    const c = Math.cos(b.yaw) * SD_SCALE;
    const s = Math.sin(b.yaw) * SD_SCALE;
    return [b.x + ox * c + oz * s, b.y + oy * SD_SCALE, b.z - ox * s + oz * c];
  }
  worldToBoss(b, wx, wy, wz) {
    const c = Math.cos(b.yaw) / SD_SCALE;
    const s = Math.sin(b.yaw) / SD_SCALE;
    const dx = wx - b.x;
    const dz = wz - b.z;
    return [dx * c - dz * s, (wy - b.y) / SD_SCALE, dx * s + dz * c];
  }

  // ¿Está este punto dentro del casco o de la torre?
  insideBoss(b, wx, wy, wz, pad) {
    const [lx, ly, lz] = this.worldToBoss(b, wx, wy, wz);
    if (lz > SD_NOSE + pad || lz < SD_REAR - pad) return false;
    const k = (SD_NOSE - lz) / (SD_NOSE - SD_REAR);
    if (Math.abs(lx) < SD_HALF_W * k + pad && ly > SD_RIDGE * k - pad && ly < SD_KEEL * k + pad) return true;
    return Math.abs(lx) < 90 + pad && ly > -175 - pad && ly < -60 && lz < -240 + pad;
  }

  // Un punto débil puede recibir daño si está vivo y, en el caso del puente,
  // si ya cayeron los dos domos que lo escudan
  bossPartOpen(b, pt) {
    if (pt.hp <= 0) return false;
    if (pt.kind !== 'bridge') return true;
    return !b.parts.some((q) => q.kind === 'dome' && q.hp > 0);
  }

  bossAimPart(b, f) {
    let best = null;
    let bestDot = -2;
    for (const pt of b.parts) {
      if (!this.bossPartOpen(b, pt)) continue;
      const [wx, wy, wz] = this.bossToWorld(b, pt.ox, pt.oy, pt.oz);
      const d = Math.hypot(wx - this.pos.x, wy - this.pos.y, wz - this.pos.z) || 1;
      const dot = ((wx - this.pos.x) * f.x + (wy - this.pos.y) * f.y + (wz - this.pos.z) * f.z) / d;
      if (dot > bestDot) {
        bestDot = dot;
        best = pt;
      }
    }
    return best;
  }

  // Daño a una pieza del destructor. Cae el puente, cae el destructor.
  bossHitPart(b, pt, n) {
    if (!this.bossPartOpen(b, pt)) return;
    pt.hp -= n;
    b.flashT = 0.06;
    pt.flashT = 0.1;
    const [wx, wy, wz] = this.bossToWorld(b, pt.ox, pt.oy, pt.oz);
    if (pt.hp > 0) {
      this.booms.push({ wx, wy, wz, t: 0.3 });
      return;
    }
    this.booms.push({ wx, wy, wz, t: 0, big: true });
    this.spray(wx, wy, wz, 8);
    Sfx.boom();
    if (pt.kind === 'turret') {
      this.addScore(60);
      this.dropPow(wx, wy, wz, 0.5);
    } else if (pt.kind === 'dome') {
      this.addScore(150);
      this.say(b.parts.some((q) => q.kind === 'dome' && q.hp > 0) ? 'UN DOMO MENOS.' : 'ESCUDO CAÍDO. DISPARA AL PUENTE.');
    } else {
      this.killBoss(b);
    }
  }

  updateBoss(b, dx, dz, dist, dt) {
    // mientras llega, solo es una estela: no dispara, no choca, no recibe
    if (b.arrive > 0) {
      b.arrive -= dt;
      if (b.arrive <= 0) {
        this.flash.setAlpha(0.7);
        this.tweens.add({ targets: this.flash, alpha: 0, duration: 700 });
        this.shake = 12;
        Sfx.boom();
        // y entra la escena: todo se apaga, solo él — y su salva al cielo
        b.cine = 1;
        b.cineT = 0;
        b.salvoAt = 0;
        this.say('SALVA ENTRANTE — ESCUDO O ESQUIVA.');
      }
      return;
    }
    // La escena: quieto, el sector en negro, y una lluvia de cohetes que
    // primero SUBE alto en columnas de óxido, se abre en direcciones
    // distintas, y después se curva hacia ti. Lenta a propósito: es cine.
    if (b.cine) {
      b.cineT += dt;
      const ct = b.cineT;
      b.cineDark = ct < 1.4 ? ct / 1.4 : ct < 4.4 ? 1 : Math.max(0, 1 - (ct - 4.4) / 1.8);
      if (ct > 1.2 && ct < 4.0) {
        b.salvoAt -= dt;
        if (b.salvoAt <= 0) {
          b.salvoAt = 0.18;
          const [wx, wy, wz] = this.bossToWorld(b, (Math.random() - 0.5) * 160, -175, -330);
          this.ents.push({
            k: 'emis', x: wx, y: wy, z: wz, r: 22, hp: 1, t: 0, yaw: 0,
            vx: (Math.random() - 0.5) * 560,
            vy: -(650 + Math.random() * 350),
            vz: (Math.random() - 0.5) * 560,
            rise: 1.6 + Math.random() * 1.0,
            life: 16,
          });
          if (Math.random() < 0.35) Sfx.missile();
        }
      }
      if (ct > 6.4) {
        b.cine = 0;
        b.cineDark = 0;
      }
      return;
    }
    for (const pt of b.parts) if (pt.flashT) pt.flashT -= dt;
    // gira lento para ponerte la proa — más lento que tu órbita, así ganarle
    // la espalda es cuestión de volar. Avanza si te alejas, nunca retrocede,
    // y no se deja arrastrar lejos del centro del sector.
    b.yaw += Phaser.Math.Angle.Wrap(Math.atan2(dx, dz) - b.yaw) * Math.min(1, 0.14 * dt);
    const move = dist > 1900 ? 90 : 0;
    b.x += Math.sin(b.yaw) * move * dt;
    b.z += Math.cos(b.yaw) * move * dt;
    // navega SOLO de vuelta al anillo de batalla — sin teletransportes
    const bh = Math.hypot(b.x, b.z);
    if (bh > 1300) {
      const pull = Math.min(bh - 1300, 150 * dt);
      b.x -= (b.x / bh) * pull;
      b.z -= (b.z / bh) * pull;
    }
    b.y += Math.sin(b.t * 0.4) * 6 * dt;

    // torretas: ráfagas de tres, lentas y esquivables — pero son seis
    for (const pt of b.parts) {
      if (pt.kind !== 'turret' || pt.hp <= 0 || dist > 2600) continue;
      pt.fireAt -= dt;
      if (pt.burst > 0 && pt.fireAt <= 0) {
        pt.burst--;
        pt.fireAt = pt.burst ? 0.18 : 3.2 + Math.random() * 1.4;
        const [wx, wy, wz] = this.bossToWorld(b, pt.ox, pt.oy - 30, pt.oz);
        this.shootAtPlayer({ x: wx, y: wy, z: wz }, SHOT_SPEED);
      } else if (pt.burst === 0 && pt.fireAt <= 0) pt.burst = 3;
    }

    // el hangar suelta interceptores
    b.hangarAt -= dt;
    if (b.hangarAt <= 0) {
      b.hangarAt = 9;
      if (this.ents.filter((e) => e.k === 'inter').length < 4) {
        const [wx, wy, wz] = this.bossToWorld(b, 0, SD_KEEL + 30, -100);
        this.ents.push({ k: 'inter', x: wx, y: wy, z: wz, r: 22 * HUNTER_SCALE, hp: 2, t: 0, yaw: b.yaw, vx: 0, vy: 120, vz: 0 });
      }
    }

    // la torre suelta una pareja de misiles que te persiguen
    b.missileAt -= dt;
    if (b.missileAt <= 0 && dist < 2600) {
      b.missileAt = 7;
      for (const side of [-1, 1]) {
        const [wx, wy, wz] = this.bossToWorld(b, side * 60, -170, -330);
        const [ox, , oz] = this.bossToWorld(b, side * 400, 0, -330);
        const vx = (ox - b.x) * 0.3;
        const vz = (oz - b.z) * 0.3;
        this.ents.push({ k: 'emis', x: wx, y: wy, z: wz, r: 22, hp: 1, t: 0, yaw: 0, vx, vy: -160, vz, life: 9 });
      }
      Sfx.missile();
    }

    // el cañón de proa: carga a la vista y suelta una esfera enorme y lenta
    if (b.charging > 0) {
      b.charging -= dt;
      if (b.charging <= 0) {
        const [wx, wy, wz] = this.bossToWorld(b, 0, 10, SD_NOSE);
        this.shootAtPlayer({ x: wx, y: wy, z: wz }, 190, true);
        this.shake = 6;
        Sfx.missile();
      }
    } else {
      b.cannonAt -= dt;
      if (b.cannonAt <= 0 && dist < 2800) {
        b.cannonAt = 11;
        b.charging = 1.8;
      }
    }
  }

  killBoss(b) {
    b.dead = true;
    this.boss = null;
    for (let i = 0; i < 9; i++) {
      const [wx, wy, wz] = this.bossToWorld(b, (Math.random() - 0.5) * 400, (Math.random() - 0.7) * 150, SD_REAR + Math.random() * 900);
      this.booms.push({ wx, wy, wz, t: -i * 0.12, big: true });
    }
    this.spray(b.x, b.y, b.z, 24);
    this.shake = 16;
    this.addScore(1000);
    Sfx.boom();
    this.phase = 'charge';
    this.charge = 0;
    this.say('DESTRUCTOR DERRIBADO. CARGANDO EL SALTO — RESISTE.');
  }

  addScore(pts) {
    this.score += pts * this.mult;
    if (this.multT > 0) this.mult = Math.min(5, this.mult + 1);
    else this.mult = 2;
    this.multT = 4;
  }

  dropPow(x, y, z, chance) {
    if (Math.random() > chance) return;
    const subs = ['shield', 'hull', 'twin', 'missile', 'missile'];
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
  forward() {
    return this.F;
  }

  updatePlayer(time, dt) {
    // la entrada del destructor es una escena: motores al mínimo, sin dash
    // ni nitro, y la nave se NIVELA Y ENCUADRA al destructor sola — lo ves
    // de lado, entero, y recuperas el mando cuando la luz vuelve
    const sceneHold = this.boss && (this.boss.arrive > 0 || this.boss.cine);
    if (sceneHold) {
      const b = this.boss;
      const to = vnorm({ x: b.x - this.pos.x, y: b.y - this.pos.y, z: b.z - this.pos.z });
      const k = Math.min(1, 2.2 * dt);
      const [F, U, R] = orthoBasis(vmix(this.F, 1 - k, to, k), vmix(this.U, 1 - k, WORLD_UP, k));
      this.F = F;
      this.U = U;
      this.R = R;
      this.yawVel = 0;
      this.pitchVel = 0;
    }

    const turn = sceneHold ? 0 : (held.P1_R ? 1 : 0) - (held.P1_L ? 1 : 0);
    const pit = sceneHold ? 0 : (held.P1_U ? 1 : 0) - (held.P1_D ? 1 : 0); // arriba = nariz arriba

    // B4/B6: el escudo — mientras dura, nada te toca y los disparos se
    // deshacen contra la burbuja. Se levanta en el momento, no se guarda.
    if ((pressed.P1_4 || pressed.P1_6) && time >= this.shieldReady) {
      this.shieldUntil = time + SHIELD_MS;
      this.shieldReady = time + SHIELD_MS + SHIELD_COOLDOWN_MS;
      Sfx.shieldUp();
    }

    // cabeceo sobre el ala de la nave: arriba es arriba de la pantalla aun de cabeza
    this.yawVel += (turn * YAW_RATE - this.yawVel) * Math.min(1, YAW_EASE * dt);
    this.pitchVel += (pit * PITCH_RATE - this.pitchVel) * Math.min(1, YAW_EASE * dt);
    const pa = this.pitchVel * dt;
    const ya = this.yawVel * dt;
    let F = vmix(this.F, Math.cos(pa), this.U, Math.sin(pa));
    let U = vmix(this.U, Math.cos(pa), this.F, -Math.sin(pa));
    // Turning happens around the sector's vertical while the ship is roughly
    // upright (or inverted), like a banked aircraft: the view pans and never
    // rolls, so the sky stays put. Near vertical there is no sensible
    // "vertical", so it falls back to the ship's own axis.
    const upness = vdot(U, WORLD_UP);
    if (Math.abs(upness) > 0.25) {
      const A = upness > 0 ? WORLD_UP : { x: 0, y: 1, z: 0 };
      F = rotAxis(F, A, -ya);
      U = rotAxis(U, A, -ya);
    } else F = vmix(F, Math.cos(ya), vcross(F, U), Math.sin(ya));
    let R;
    [F, U, R] = orthoBasis(F, U);

    // Stick suelto: la nave rota SOLO sobre su eje hasta quedar derecha.
    // No baja la nariz ni cambia el rumbo — sigue volando a donde apuntaba.
    if (!pit) {
      const up = vdot(F, WORLD_UP);
      if (Math.abs(up) < 0.97) {
        const D = vnorm(vmix(WORLD_UP, 1, F, -up));
        const phi = Math.atan2(vdot(F, vcross(U, D)), vdot(U, D));
        const th = Math.sign(phi) * Math.min(Math.abs(phi), ROLL_LEVEL * dt);
        [F, U, R] = orthoBasis(F, vmix(U, Math.cos(th), R, Math.sin(th)));
      }
    }
    this.F = F;
    this.U = U;
    this.R = R;

    // B2: cada toque es un dash — un tirón hacia adelante, intocable un
    // instante. Mantenido es nitro: la nave acelera sin parar mientras dure la
    // reserva, y a esa velocidad embistes a los cazadores.
    if (!sceneHold && pressed.P1_2 && this.boost >= DASH_COST) {
      this.boost -= DASH_COST;
      this.speed = Math.max(this.speed, this.cruise) + DASH_KICK;
      this.dashUntil = time + DASH_INVULN_MS;
      Sfx.dash();
    }
    if (sceneHold) {
      this.boost = Math.min(BOOST_MAX, this.boost + BOOST_REGEN * dt);
      this.speed += (25 - this.speed) * Math.min(1, 4 * dt);
    } else if (held.P1_2 && this.boost > 0) {
      this.boost = Math.max(0, this.boost - BOOST_DRAIN * dt);
      this.speed = Math.min(NITRO_MAX, this.speed + NITRO_ACCEL * dt);
    } else {
      if (!held.P1_2) this.boost = Math.min(BOOST_MAX, this.boost + BOOST_REGEN * dt);
      this.speed += (this.cruise - this.speed) * Math.min(1, SPEED_EASE * dt);
    }

    const f = this.forward();
    this.pos.x += f.x * this.speed * dt;
    this.pos.y += f.y * this.speed * dt;
    this.pos.z += f.z * this.speed * dt;

    // el borde del sector te devuelve, suave — pero hacia abajo no hay borde:
    // abajo está el agujero negro, y él pone el límite
    const yc = Math.min(this.pos.y, 0);
    const rr = Math.hypot(this.pos.x, yc * 1.6, this.pos.z);
    if (rr > SECTOR_R) {
      this.pos.x -= (this.pos.x / rr) * (rr - SECTOR_R) * 2 * dt;
      this.pos.y -= (yc / rr) * (rr - SECTOR_R) * 2 * dt;
      this.pos.z -= (this.pos.z / rr) * (rr - SECTOR_R) * 2 * dt;
    }

    // el agujero negro: cuanto más bajas, más tira — y muy abajo, te traga
    const bhd = BH_Y - this.pos.y;
    if (bhd < BH_PULL) {
      const k = 1 - bhd / BH_PULL;
      this.pos.y += k * k * 620 * dt;
      this.shake = Math.max(this.shake, k * 4);
      if (this.elapsed > this.bhWarnAt) {
        this.bhWarnAt = this.elapsed + 4;
        this.say('GRAVEDAD DEL AGUJERO NEGRO — SUBE.');
      }
    }
    // el horizonte de sucesos no negocia: ni el escudo ni el modo prueba
    if (bhd < BH_KILL && this.phase !== 'out') {
      this.phase = 'out';
      this.booms.push({ wx: this.pos.x, wy: this.pos.y, wz: this.pos.z, t: 0, big: true });
      Sfx.boom();
      this.time.delayedCall(1400, () => this.scene.start('over', { win: false, score: this.score }));
    }

    // alabeo con el giro
    const bank = this.yawVel * 0.34;
    this.roll += (bank - this.roll) * Math.min(1, 8 * dt);

    // B1: cañón — sale de la nariz, hereda tu velocidad (doble con la mejora)
    if (held.P1_1 && time >= this.fireReadyAt) {
      this.fireReadyAt = time + FIRE_MS;
      this.muzzleT = 0.05;
      Sfx.fire();
      const sp = BOLT_SPEED + this.speed;
      const twin = time < this.twinUntil;
      const R = this.R;
      // contra el destructor, el cañón corrige hacia el punto débil abierto
      // que tengas casi de frente — pegarle es cuestión de apuntar cerca
      let aim = f;
      if (this.boss) {
        const pt = this.bossAimPart(this.boss, f);
        if (pt) {
          const [wx, wy, wz] = this.bossToWorld(this.boss, pt.ox, pt.oy, pt.oz);
          const to = vnorm({ x: wx - this.pos.x, y: wy - this.pos.y, z: wz - this.pos.z });
          if (vdot(to, f) > 0.985) aim = to;
        }
      }
      for (const off of twin ? [-9, 9] : [0]) {
        this.bolts.push({
          x: this.pos.x + f.x * 24 + R.x * off,
          y: this.pos.y + f.y * 24 + R.y * off,
          z: this.pos.z + f.z * 24 + R.z * off,
          vx: aim.x * sp,
          vy: aim.y * sp,
          vz: aim.z * sp,
          life: BOLT_LIFE,
        });
      }
    }

    // los misiles vuelven solos, uno cada tanto
    if (this.ammo < MISSILE_MAX) {
      this.ammoRegen += dt;
      if (this.ammoRegen >= MISSILE_REGEN) {
        this.ammoRegen = 0;
        this.ammo++;
        Sfx.ammo();
      }
    } else this.ammoRegen = 0;

    // B3: misil — busca el blanco más alineado con tu nariz; contra el
    // destructor apunta al punto débil vivo más a tiro
    if (pressed.P1_3 && this.ammo > 0) {
      this.ammo--;
      Sfx.missile();
      const target = this.bestTarget(f);
      this.missiles.push({
        x: this.pos.x + f.x * 26 - this.U.x * 6,
        y: this.pos.y + f.y * 26 - this.U.y * 6,
        z: this.pos.z + f.z * 26 - this.U.z * 6,
        vx: f.x * MISSILE_SPEED,
        vy: f.y * MISSILE_SPEED,
        vz: f.z * MISSILE_SPEED,
        target,
        part: target && target.k === 'boss' ? this.bossAimPart(target, f) : null,
        trail: [],
        life: 5,
      });
    }
  }

  bestTarget(f) {
    let best = null;
    let bestDot = 0.75; // solo lo que ya tienes bastante de frente
    for (const e of this.ents) {
      if (e.k === 'scrap' || e.k === 'part' || e.k === 'pow' || e.k === 'ring' || e.dead) continue;
      const dx = e.x - this.pos.x;
      const dy = e.y - this.pos.y;
      const dz = e.z - this.pos.z;
      const d = Math.hypot(dx, dy, dz);
      if (d > (e.k === 'boss' ? 2600 : 1700)) continue;
      // el destructor es enorme: cuenta como "de frente" aunque su centro no lo esté
      const dot = (dx * f.x + dy * f.y + dz * f.z) / Math.max(d, 1) + (e.k === 'boss' ? 0.45 : 0);
      if (dot > bestDot) {
        bestDot = dot;
        best = e;
      }
    }
    return best;
  }

  hitPlayer(time) {
    if (this.phase === 'out') return;
    if (time < this.shieldUntil) {
      // la burbuja se lleva el golpe: se ve dónde pegó
      this.shieldHitT = 0.3;
      return;
    }
    if (time < this.invulnUntil || time < this.dashUntil) return;
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
        // se acerca y te orbita a distancia de tiro: perseguirlo es pilotar
        const want = 460;
        const radial = Phaser.Math.Clamp((dist - want) / 200, -1, 1) * 240;
        const tx = dz / dist;
        const tz = -dx / dist;
        e.vx += ((dx / dist) * radial + tx * e.orbit * 170 - e.vx) * Math.min(1, 1.5 * dt);
        e.vy += ((dy / dist) * radial - e.vy) * Math.min(1, 1.5 * dt);
        e.vz += ((dz / dist) * radial + tz * e.orbit * 170 - e.vz) * Math.min(1, 1.5 * dt);
        e.x += e.vx * dt;
        e.y += e.vy * dt;
        e.z += e.vz * dt;
        e.yaw = Math.atan2(dx, dz);
        e.fireAt -= dt;
        if (e.fireAt <= 0 && dist < 1000) {
          e.fireAt = DRONE_FIRE;
          this.shootAtPlayer(e, SHOT_SPEED);
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
      } else if (e.k === 'emis') {
        // misil del destructor: te sigue, pero gira mal — un giro cerrado,
        // el escudo o el nitro lo dejan atrás; también se puede derribar.
        // Los de la salva primero SUBEN en columna y luego se curvan a ti.
        if (e.rise > 0) {
          e.rise -= dt;
        } else {
          const k = Math.min(1, 1.1 * dt);
          e.vx += ((dx / dist) * 330 - e.vx) * k;
          e.vy += ((dy / dist) * 330 - e.vy) * k;
          e.vz += ((dz / dist) * 330 - e.vz) * k;
        }
        e.x += e.vx * dt;
        e.y += e.vy * dt;
        e.z += e.vz * dt;
        e.life -= dt;
        if (e.life <= 0) {
          e.dead = true;
          this.boomAt(e);
        }
      } else if (e.k === 'boss') {
        this.updateBoss(e, dx, dz, dist, dt);
      } else if (e.k === 'pow') {
        e.life -= dt;
        if (e.life <= 0) e.dead = true;
      } else if (e.k === 'sentry') {
        e.yaw += 0.5 * dt; // gira, vigilando
        e.y += Math.sin(e.t * 1.1) * 8 * dt;
        e.fireAt -= dt;
        if (dist < 1000 && e.fireAt <= 0) {
          e.fireAt = 3.2;
          this.shootAtPlayer(e, SHOT_SPEED);
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

      // lo que se mueve deja estela: se lee hacia dónde va
      if (e.vx !== undefined && e.k !== 'rock') {
        e.tt = (e.tt || 0) + dt;
        if (e.tt > 0.05) {
          e.tt = 0;
          (e.trail = e.trail || []).push([e.x, e.y, e.z]);
          if (e.trail.length > 12) e.trail.shift();
        }
      }

      // lo recogible viene hacia ti cuando pasas cerca
      if ((e.k === 'scrap' || e.k === 'pow' || e.k === 'part') && dist < MAGNET_R) {
        const pull = (560 * dt) / dist;
        e.x += dx * pull;
        e.y += dy * pull;
        e.z += dz * pull;
      }

      // contra el destructor chocas con su casco, no con una esfera — y
      // estrellarse contra un kilómetro de acero no se sobrevive: ni el
      // escudo ni el modo prueba te salvan de esa
      if (e.k === 'boss') {
        if (!(e.arrive > 0) && this.insideBoss(e, P.x, P.y, P.z, 14) && this.phase !== 'out') {
          this.phase = 'out';
          this.booms.push({ wx: P.x, wy: P.y, wz: P.z, t: 0, big: true });
          this.shake = 14;
          Sfx.boom();
          this.time.delayedCall(1400, () => this.scene.start('over', { win: false, score: this.score }));
        }
        continue;
      }

      // contacto contigo (el aro del tutorial no es un cuerpo: se atraviesa)
      if (!e.dead && e.k !== 'ring' && dist < e.r + 16) {
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
          else if (e.sub === 'missile') this.ammo = Math.min(MISSILE_MAX, this.ammo + 2);
          else this.twinUntil = time + 12000;
        } else if (e.k === 'part') {
          e.dead = true;
          this.partsGot++;
          this.score += 100;
          Sfx.part();
          if (this.partsGot >= PARTS.length) {
            this.startJump('PIEZAS COMPLETAS. SALTANDO...');
          } else {
            this.say(PARTS[e.idx] + ' A BORDO. ' + (PARTS.length - this.partsGot) + ' MÁS.');
          }
        } else if (this.speed > RAM_SPEED && (e.k === 'drone' || e.k === 'inter' || e.k === 'emis')) {
          // a toda velocidad, la nave es el arma
          this.damage(e, 99);
          this.shake = 7;
        } else {
          if (e.k !== 'sentry' && e.k !== 'boss') e.dead = true;
          this.boomAt(e);
          this.hitPlayer(time);
        }
      }
    }

    // disparos enemigos — el escudo activo los deshace contra la burbuja
    const shieldOn = time < this.shieldUntil;
    for (const s of this.shots) {
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.z += s.vz * dt;
      s.life -= dt;
      const d = Math.hypot(P.x - s.x, P.y - s.y, P.z - s.z);
      if (shieldOn && d < SHIELD_R + (s.big ? 40 : 0)) {
        s.dead = true;
        this.shieldEats++;
        this.shieldHitT = 0.3;
        this.booms.push({ wx: s.x, wy: s.y, wz: s.z, t: 0.32 });
        continue;
      }
      if (d < (s.big ? 60 : 22)) {
        s.dead = true;
        this.hitPlayer(time);
      }
    }

    // tus disparos contra el sector
    for (const b of this.bolts) {
      if (this.boss && !(this.boss.arrive > 0) && this.boltVsBoss(this.boss, b)) continue;
      for (const e of this.ents) {
        if (e.dead || e.k === 'scrap' || e.k === 'part' || e.k === 'pow' || e.k === 'boss' || e.k === 'ring') continue;
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

  // Un disparo tuyo contra el destructor: pega en un punto débil, o el casco
  // se lo traga con una chispa. Devuelve true si el disparo se consumió.
  boltVsBoss(boss, b) {
    for (const pt of boss.parts) {
      if (pt.hp <= 0) continue;
      const [wx, wy, wz] = this.bossToWorld(boss, pt.ox, pt.oy, pt.oz);
      if (Math.hypot(b.x - wx, b.y - wy, b.z - wz) < SD_PART_R[pt.kind]) {
        b.dead = true;
        if (this.bossPartOpen(boss, pt)) this.bossHitPart(boss, pt, 1);
        else this.booms.push({ wx: b.x, wy: b.y, wz: b.z, t: 0.35 });
        return true;
      }
    }
    if (this.insideBoss(boss, b.x, b.y, b.z, 0)) {
      b.dead = true;
      this.booms.push({ wx: b.x, wy: b.y, wz: b.z, t: 0.38 });
      return true;
    }
    return false;
  }

  damage(e, n) {
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
    if (e.k === 'drone' || e.k === 'inter') this.dropPow(e.x, e.y, e.z, 0.35);
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

  shootAtPlayer(e, sp, big) {
    // el fogonazo marca de dónde sale — se ve quién te dispara
    this.booms.push({ wx: e.x, wy: e.y, wz: e.z, t: 0.28, muzzle: true });
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
      life: big ? 12 : 6,
      big,
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

  updateMissiles(dt) {
    for (const m of this.missiles) {
      const t = m.target;
      if (t && !t.dead) {
        // corrige el rumbo hacia el blanco — contra el destructor, hacia su punto débil
        let [tx, ty, tz] = [t.x, t.y, t.z];
        let hitR = t.r + 16;
        if (m.part && m.part.hp > 0) {
          [tx, ty, tz] = this.bossToWorld(t, m.part.ox, m.part.oy, m.part.oz);
          hitR = SD_PART_R[m.part.kind];
        }
        const dx = tx - m.x;
        const dy = ty - m.y;
        const dz = tz - m.z;
        const d = Math.hypot(dx, dy, dz);
        const k = Math.min(1, MISSILE_TURN * dt);
        m.vx += ((dx / d) * MISSILE_SPEED - m.vx) * k;
        m.vy += ((dy / d) * MISSILE_SPEED - m.vy) * k;
        m.vz += ((dz / d) * MISSILE_SPEED - m.vz) * k;
        if (d < hitR) this.detonate(m);
      }
      if (!m.dead && this.boss && !(this.boss.arrive > 0) && this.insideBoss(this.boss, m.x, m.y, m.z, 0)) this.detonate(m);
      m.trail.push([m.x, m.y, m.z]);
      if (m.trail.length > 14) m.trail.shift();
      m.x += m.vx * dt;
      m.y += m.vy * dt;
      m.z += m.vz * dt;
      m.life -= dt;
    }
    this.missiles = this.missiles.filter((m) => !m.dead && m.life > 0);
  }

  // El misil estalla: golpe fuerte al blanco y a todo lo que esté cerca
  detonate(m) {
    m.dead = true;
    this.booms.push({ wx: m.x, wy: m.y, wz: m.z, t: 0, big: true, r: MISSILE_SPLASH });
    this.shake = Math.max(this.shake, 5);
    Sfx.boom();
    const boss = this.boss;
    if (boss) {
      for (const pt of boss.parts) {
        const [wx, wy, wz] = this.bossToWorld(boss, pt.ox, pt.oy, pt.oz);
        if (pt === m.part || Math.hypot(m.x - wx, m.y - wy, m.z - wz) < MISSILE_SPLASH) {
          this.bossHitPart(boss, pt, pt === m.part ? MISSILE_DMG - 1 : 1);
        }
      }
    }
    for (const e of this.ents) {
      if (e.dead || e.k === 'boss' || e.k === 'scrap' || e.k === 'part' || e.k === 'pow') continue;
      const d = Math.hypot(m.x - e.x, m.y - e.y, m.z - e.z);
      if (e === m.target || d < MISSILE_SPLASH + e.r) this.damage(e, e === m.target ? MISSILE_DMG : 2);
    }
  }

  // La cámara hereda la base de la nave con un pelo de retraso — incluida la
  // inclinación, así la pantalla siempre coincide con el stick
  updateCamera(dt) {
    const k = Math.min(1, 8 * dt);
    [this.camF, this.camU, this.camR] = orthoBasis(vmix(this.camF, 1 - k, this.F, k), vmix(this.camU, 1 - k, this.U, k));
    if (this.shake > 0) this.shake = Math.max(0, this.shake - 34 * dt);
  }

  // --- proyección mundo → pantalla ---
  cam() {
    const F = this.camF;
    const U = this.camU;
    const back = CAM_BACK + Math.max(0, this.speed - this.cruise) * 0.09; // con nitro la cámara se queda atrás
    return {
      x: this.pos.x - F.x * back + U.x * CAM_UP,
      y: this.pos.y - F.y * back + U.y * CAM_UP,
      z: this.pos.z - F.z * back + U.z * CAM_UP,
      F,
      U,
      R: this.camR,
    };
  }

  czOf(cm, wx, wy, wz) {
    return (wx - cm.x) * cm.F.x + (wy - cm.y) * cm.F.y + (wz - cm.z) * cm.F.z;
  }

  project(cm, wx, wy, wz) {
    const d = { x: wx - cm.x, y: wy - cm.y, z: wz - cm.z };
    const cz = vdot(d, cm.F);
    if (cz < NEAR) return null;
    const shx = this.shake ? (Math.random() - 0.5) * this.shake : 0;
    const shy = this.shake ? (Math.random() - 0.5) * this.shake : 0;
    return [CX + (vdot(d, cm.R) * FOCAL) / cz + shx, CY - (vdot(d, cm.U) * FOCAL) / cz + shy, cz];
  }

  // Una dirección del cielo (infinitamente lejos): solo gira con la cámara
  projectDir(cm, v) {
    const cz = vdot(v, cm.F);
    if (cz < 0.08) return null;
    return [CX + (vdot(v, cm.R) * FOCAL) / cz, CY - (vdot(v, cm.U) * FOCAL) / cz];
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

    this.drawSky(g, cm, time);
    this.drawStars(g, cm, time);
    // el túnel: al saltar crece; al llegar al nivel 1, se deshace
    const warp = this.phase === 'jump' ? Math.min(1, this.jumpT / (JUMP_TIME * 0.8)) : this.enterT;
    if (warp > 0.02) this.drawWarp(g, cm, warp);
    this.drawDust(g, cm);

    this.label.setVisible(false);
    // la escena de la salva: el sector entero se apaga y solo quedan el
    // destructor, sus cohetes, tus disparos y tú
    const cine = this.boss && this.boss.cine ? this.boss.cineDark || 0 : 0;
    for (const e of this.ents) {
      if (cine > 0 && (e.k === 'boss' || e.k === 'emis')) continue;
      this.drawEnt(g, cm, e, time);
    }
    if (cine > 0) {
      g.fillStyle(0x000000, 0.85 * cine);
      g.fillRect(0, 0, W, H);
      for (const e of this.ents) {
        if (e.k === 'boss' || e.k === 'emis') this.drawEnt(g, cm, e, time);
      }
    }

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

    // misiles: un proyectil de verdad, con aletas, cabeza ardiendo y estela larga
    for (const m of this.missiles) {
      for (let i = 1; i < m.trail.length; i++) {
        const a = m.trail[i - 1];
        const b = m.trail[i];
        g.lineStyle(1 + i * 0.3, INK_HI, (i / m.trail.length) * 0.45);
        this.worldLine(g, cm, a, b);
      }
      const F = vnorm({ x: m.vx, y: m.vy, z: m.vz });
      const U = vnorm(vmix(WORLD_UP, 1, F, -vdot(WORLD_UP, F)));
      this.drawBasisModel(g, cm, MISSILE_MODEL, m, F, U, 1.5, INK_HI, 1, m.life * 9);
      const p = this.project(cm, m.x - F.x * 20, m.y - F.y * 20, m.z - F.z * 20);
      if (p) {
        g.fillStyle(0xf6c98a, 0.9);
        g.fillCircle(p[0], p[1], Math.max(2.5, 1400 / p[2]));
      }
    }

    // disparos enemigos: brasas de óxido grandes y lentas, con su estela —
    // se ven venir y se pueden esquivar
    for (const s of this.shots) {
      const p = this.project(cm, s.x, s.y, s.z);
      if (!p) continue;
      const q = this.project(cm, s.x - s.vx * 0.35, s.y - s.vy * 0.35, s.z - s.vz * 0.35);
      const r = Phaser.Math.Clamp(((s.big ? 48 : 7) * FOCAL) / p[2], s.big ? 6 : 3, s.big ? 70 : 14);
      if (q) {
        g.lineStyle(r * 0.9, RUST, 0.35);
        g.beginPath();
        g.moveTo(p[0], p[1]);
        g.lineTo(q[0], q[1]);
        g.strokePath();
      }
      g.fillStyle(RUST, 0.35);
      g.fillCircle(p[0], p[1], r * 1.7);
      g.fillStyle(RUST_HI, 0.95);
      g.fillCircle(p[0], p[1], r);
      if (s.big) {
        g.fillStyle(0xfff1d6, 0.8);
        g.fillCircle(p[0], p[1], r * 0.45);
      }
    }

    // explosiones: anillos que crecen y fragmentos que vuelan
    for (const bm of this.booms) {
      if (bm.t < 0) continue;
      const p = this.project(cm, bm.wx, bm.wy, bm.wz);
      if (!p) continue;
      const k = FOCAL / p[2];
      if (bm.muzzle) {
        g.fillStyle(RUST_HI, (0.5 - bm.t) * 3.5);
        g.fillCircle(p[0], p[1], Math.max(4, 30 * k));
        continue;
      }
      const r = (4 + bm.t * (bm.r ? bm.r * 2.4 : bm.big ? 260 : 150)) * k;
      if (bm.r) {
        g.fillStyle(0xf6c98a, 0.35 * (1 - bm.t / 0.5));
        g.fillCircle(p[0], p[1], r * 0.8);
      }
      g.lineStyle(bm.r ? 3 : 1.5, bm.big ? INK_HI : RUST, 1 - bm.t / 0.5);
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

    // cerca del agujero, la pantalla entera se tiñe de acreción: no hay
    // duda de DÓNDE estás metido
    const bhProx = Phaser.Math.Clamp(1 - (BH_Y - this.pos.y - BH_KILL) / BH_PULL, 0, 1);
    if (bhProx > 0.02) {
      g.fillStyle(0xe89a5c, bhProx * (0.09 + 0.05 * Math.sin(time * 0.004)));
      g.fillRect(0, 0, W, H);
    }

    this.drawShip(g, cm, time);
    this.drawNav(g, cm);
    this.drawIncoming(g, cm, time);

    // barra de carga del hipersalto, o la vida que le queda al destructor
    if (this.phase === 'charge') {
      g.lineStyle(1.5, INK, 0.8);
      g.strokeRect(CX - 110, 30, 220, 10);
      g.fillStyle(INK_HI, 0.9);
      g.fillRect(CX - 108, 32, 216 * (this.charge / CHARGE_TIME), 6);
    } else if (this.phase === 'boss' && this.boss) {
      let hp = 0;
      let max = 0;
      for (const pt of this.boss.parts) {
        if (pt.kind === 'turret') continue;
        hp += Math.max(0, pt.hp);
        max += pt.max;
      }
      g.lineStyle(1.5, RUST, 0.9);
      g.strokeRect(CX - 160, 30, 320, 10);
      g.fillStyle(RUST_HI, 0.9);
      g.fillRect(CX - 158, 32, 316 * (hp / max), 6);
    }
  }

  // Up and down must always read: a hazy floor below the sector's level
  // plane and the galaxy's band along the horizon. The camera rolls with the
  // ship, so the horizon is a line at any angle — found per pixel as the
  // screen points whose view ray is level.
  drawHorizon(g, cm) {
    const { R, U, F } = cm;
    const n = Math.hypot(R.y, U.y);
    if (n < 0.02) return;
    const s = (p) => ((p[0] - CX) * R.y - (p[1] - CY) * U.y + FOCAL * F.y) / n;
    const band = (lo, hi, color, alpha) => {
      let poly = clipHalf([[0, 0], [W, 0], [W, H], [0, H]], (p) => s(p) - lo);
      if (hi !== undefined) poly = clipHalf(poly, (p) => hi - s(p));
      if (poly.length < 3) return;
      g.fillStyle(color, alpha);
      g.fillPoints(poly.map(([x, y]) => ({ x, y })), true);
    };
    // debajo del plano no hay neblina: hay el resplandor del disco de
    // acreción, y arde más cuanto más bajas
    const prox = Phaser.Math.Clamp(1 - (BH_Y - this.pos.y - BH_KILL) / BH_PULL, 0, 1);
    for (let i = 0; i < 10; i++) band(i * i * 7, undefined, 0x6b4030, (0.14 - i * 0.013) * (0.45 + 1.8 * prox));
    band(-18, 18, 0x3a4452, 0.1);
    band(-6, 6, 0x5a6878, 0.1);
    band(-0.7, 0.7, INK, 0.28);
    for (const b of this.band) {
      const p = this.projectDir(cm, skyDir(b.yaw, b.el));
      if (!p) continue;
      g.fillStyle(INK, b.a);
      g.fillRect(p[0], p[1], b.s, b.s);
    }
  }

  // Cuánto rota la pantalla respecto del "arriba" del sector: el arte del
  // cielo se dibuja derecho y se gira con esto
  skyRoll(cm) {
    return Math.atan2(-cm.R.y, -cm.U.y);
  }

  // Dibuja algo del cielo en su dirección, girado con la cámara
  skyObject(g, cm, yaw, el, reach, paint) {
    const p = this.projectDir(cm, skyDir(yaw, el));
    if (!p || p[0] < -reach || p[0] > W + reach || p[1] < -reach || p[1] > H + reach) return;
    g.save();
    g.translateCanvas(p[0], p[1]);
    g.rotateCanvas(this.skyRoll(cm));
    paint(g);
    g.restore();
  }

  drawSky(g, cm, time) {
    this.drawHorizon(g, cm);
    // nebulosas: manchas apenas visibles que dan fondo al negro
    for (const [yw, el, r, col, al] of [
      [0.25, 0.5, 280, 0x4a3560, 0.06],
      [0.9, 0.14, 300, 0x33506a, 0.05],
      [4.1, 0.1, 260, 0x33506a, 0.04],
      [5.3, 0.33, 220, 0x5e4038, 0.05],
    ]) {
      const p = this.projectDir(cm, skyDir(yw, el));
      if (!p) continue;
      g.fillStyle(col, al);
      g.fillCircle(p[0], p[1], r);
      g.fillStyle(col, al * 0.7);
      g.fillCircle(p[0] + r * 0.4, p[1] - r * 0.25, r * 0.6);
    }
    this.skyObject(g, cm, 5.4, 0.55, 60, (g) => drawIcePlanet(g));
    this.skyObject(g, cm, 4.3, 0.22, 200, (g) => drawRingedPlanet(g));
    this.skyObject(g, cm, 2.04, 0.62, 40, (g) => {
      g.fillStyle(0x474d55, 1);
      g.fillCircle(0, 0, 20);
      g.fillStyle(0x05060a, 0.7);
      g.fillCircle(7, 0, 17);
    });
    this.skyObject(g, cm, 2.4, 0.44, 170, (g) => drawGasGiant(g));
    this.drawHole(g, cm, time);
  }

  // El agujero negro es el SUELO, y está ANCLADO AL MUNDO bajo el centro del
  // sector: no gira con tu vista ni te sigue — tú te mueves sobre él. El
  // disco son anillos fijos en el plano, la sombra es una esfera (igual desde
  // cualquier ángulo) y los chorros son la vertical del mundo.
  drawHole(g, cm, time) {
    const t = time * 0.001;
    const RS = 380; // radio del horizonte de sucesos, en unidades de mundo
    // cuanto más bajas, más arde el disco — el color te dice dónde estás
    const prox = Phaser.Math.Clamp(1 - (BH_Y - this.pos.y - BH_KILL) / BH_PULL, 0, 1);
    // el disco ORBITA: arcos con huecos girando, el anillo interior más
    // rápido que el exterior, como cae de verdad la materia
    for (const [r, col, al, wd] of [
      [760, 0xfff1d6, 0.7, 2.5],
      [950, 0xf6c98a, 0.55, 2],
      [1200, 0xe89a5c, 0.4, 2],
      [1550, RUST, 0.3, 1.5],
      [1980, RUST, 0.2, 1.5],
      [2500, 0x8a5c48, 0.14, 1.5],
    ]) {
      g.lineStyle(wd * (1 + prox), col, Math.min(1, al * (1 + 0.9 * prox)));
      const off = t * (260 / r);
      for (let arc = 0; arc < 9; arc++) {
        const a0 = off + (arc / 9) * Math.PI * 2;
        const span = ((Math.PI * 2) / 9) * 0.7;
        let prev = null;
        for (let i = 0; i <= 3; i++) {
          const a = a0 + (i / 3) * span;
          const pt = [Math.cos(a) * r, BH_Y, Math.sin(a) * r];
          if (prev) this.worldLine(g, cm, prev, pt);
          prev = pt;
        }
      }
    }
    // brasas sueltas orbitando el disco interno
    for (let i = 0; i < 5; i++) {
      const rr = [760, 950, 1200, 950, 760][i];
      const a = t * (350 / rr) + i * 2.4;
      const pp = this.project(cm, Math.cos(a) * rr, BH_Y, Math.sin(a) * rr);
      if (!pp) continue;
      g.fillStyle(0xfff1d6, 0.55 + 0.35 * prox);
      g.fillCircle(pp[0], pp[1], Math.max(1.5, (26 * FOCAL) / pp[2]));
    }
    const p = this.project(cm, 0, BH_Y, 0);
    if (p) {
      const r = (RS * FOCAL) / p[2];
      g.fillStyle(0xe8a060, 0.05);
      g.fillCircle(p[0], p[1], r * 2.6);
      g.fillStyle(0xe8a060, 0.07);
      g.fillCircle(p[0], p[1], r * 1.7);
      g.fillStyle(0x000000, 1);
      g.fillCircle(p[0], p[1], r);
      g.lineStyle(2, 0xfff8ea, 0.6 + 0.3 * Math.sin(t * 3));
      g.strokeCircle(p[0], p[1], r * 1.04);
    }
    // los chorros, con pulsos que viajan hacia afuera; el de arriba es la
    // columna de luz que marca el centro del sector desde cualquier parte
    for (const dir of [-1, 1]) {
      const base = [0, BH_Y + dir * RS * 1.15, 0];
      const tip = [0, BH_Y + dir * RS * 5, 0];
      g.lineStyle(7, 0x8fb0c4, 0.1);
      this.worldLine(g, cm, base, tip);
      g.lineStyle(2.5, 0xb8dbe4, 0.3);
      this.worldLine(g, cm, base, tip);
      for (let i = 0; i < 3; i++) {
        const u = (t * 0.5 + i / 3) % 1;
        const pp = this.project(cm, 0, BH_Y + dir * (RS * 1.15 + u * RS * 3.85), 0);
        if (!pp) continue;
        g.fillStyle(0xeef2f7, 0.8 * (1 - u));
        g.fillCircle(pp[0], pp[1], Math.max(1.5, (RS * 0.1 * (1 - u * 0.6) * FOCAL) / pp[2]));
      }
    }
  }

  drawStars(g, cm, time) {
    for (const m of this.stars) {
      const p = this.projectDir(cm, m.v);
      if (!p || p[0] < -4 || p[0] > W + 4 || p[1] < -4 || p[1] > H + 4) continue;
      let a = m.a;
      if (m.tw) a *= 0.6 + 0.4 * Math.sin(time * 0.001 * m.tw + m.ph);
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

  // El hipersalto de las películas: cada estrella se estira en una línea
  // radial desde el centro de la pantalla, más larga cuanto más al borde
  drawWarp(g, cm, k) {
    for (const m of this.stars) {
      const p = this.projectDir(cm, m.v);
      if (!p) continue;
      const dx = p[0] - CX;
      const dy = p[1] - CY;
      const d = Math.hypot(dx, dy) + 24;
      const len = k * k * d * 2.2;
      g.lineStyle(m.s, INK_HI, Math.min(0.9, m.a + k * 0.5));
      g.beginPath();
      g.moveTo(p[0], p[1]);
      g.lineTo(p[0] + (dx / d) * len, p[1] + (dy / d) * len);
      g.strokePath();
    }
  }

  // El polvo convierte tu velocidad en estelas: se SIENTE volar
  drawDust(g, cm) {
    const L = 560;
    const f = this.forward();
    const trail = 0.016 + (this.speed / TURBO_SPEED) * 0.065;
    for (const m of this.dust) {
      const wx = this.pos.x + Phaser.Math.Wrap(m.x - this.pos.x, -L / 2, L / 2);
      const wy = this.pos.y + Phaser.Math.Wrap(m.y - this.pos.y, -L / 2, L / 2);
      const wz = this.pos.z + Phaser.Math.Wrap(m.z - this.pos.z, -L / 2, L / 2);
      const p1 = this.project(cm, wx, wy, wz);
      const p2 = this.project(cm, wx + f.x * this.speed * trail, wy + f.y * this.speed * trail, wz + f.z * this.speed * trail);
      if (!p1 || !p2) continue;
      const dist = Math.hypot(wx - this.pos.x, wy - this.pos.y, wz - this.pos.z);
      const a = Phaser.Math.Clamp(1 - dist / 420, 0, 1) * 0.5 * (this.speed / TURBO_SPEED + 0.3);
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
    // la estela de lo que se mueve: se ve de dónde viene y hacia dónde va
    if (e.trail && dist < 2200) {
      const n = e.trail.length;
      for (let i = 1; i < n; i++) {
        g.lineStyle(e.k === 'emis' ? 3 : 2, RUST_HI, (i / n) * 0.5);
        this.worldLine(g, cm, e.trail[i - 1], i === n - 1 ? [e.x, e.y, e.z] : e.trail[i]);
      }
    }
    const p = this.project(cm, e.x, e.y, e.z);
    if (!p) return;
    let a = this.fogAlpha(dist);
    if (e.k === 'part') a = Math.max(a, 0.5); // la pieza brilla sola

    if (e.k === 'emis') {
      const F = vnorm({ x: e.vx, y: e.vy, z: e.vz });
      const U = vnorm(vmix(WORLD_UP, 1, F, -vdot(WORLD_UP, F)));
      this.drawBasisModel(g, cm, MISSILE_MODEL, e, F, U, 1.6, e.flashT > 0 ? INK_HI : RUST_HI, 1, e.t * 8);
      g.fillStyle(RUST_HI, 0.5 + 0.4 * Math.sin(e.t * 20));
      g.fillCircle(p[0], p[1], Math.max(3, (16 * FOCAL) / p[2]));
      return;
    }

    // la marca de práctica del tutorial: un aro que respira, nada más
    if (e.k === 'ring') {
      const pr = Math.max(8, (e.r * FOCAL) / p[2]);
      g.lineStyle(2.5, INK_HI, 0.45 + 0.4 * Math.sin(e.t * 4));
      g.strokeCircle(p[0], p[1], pr);
      g.lineStyle(1, INK, 0.3);
      g.strokeCircle(p[0], p[1], pr * 1.3);
      return;
    }

    // el destructor no se apaga con la niebla: es enorme, y su llegada
    // tiene que verse desde lejos
    if (e.k === 'boss') {
      if (e.arrive > 0) {
        // saliendo del hiperespacio: el casco estirado hacia atrás en líneas
        const k = e.arrive / 2.2;
        g.lineStyle(2, INK_HI, 0.9 - k * 0.5);
        for (const [ox, oy] of [[-SD_HALF_W, 0], [SD_HALF_W, 0], [0, SD_RIDGE], [0, -150]]) {
          this.worldLine(
            g, cm,
            this.bossToWorld(e, ox * (0.3 + 0.7 * (1 - k)), oy, SD_NOSE),
            this.bossToWorld(e, ox * (0.3 + 0.7 * (1 - k)), oy, SD_REAR - 5200 * k)
          );
        }
        return;
      }
      this.drawDestroyer(g, cm, e, Math.max(a, 0.6), e.flashT > 0);
      return;
    }

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
    if (e.k === 'drone' || e.k === 'inter') {
      // el ojo de brasa en la nariz y el motor ardiendo atrás: un bicho vivo
      const sn = Math.sin(e.yaw);
      const cs = Math.cos(e.yaw);
      const nose = this.project(cm, e.x + sn * 16 * HUNTER_SCALE, e.y - 4, e.z + cs * 16 * HUNTER_SCALE);
      if (nose) {
        g.fillStyle(RUST_HI, a * (0.6 + 0.4 * Math.sin(e.t * 6)));
        g.fillCircle(nose[0], nose[1], Math.max(1.5, 600 / nose[2]));
      }
      const tail = this.project(cm, e.x - sn * 11 * HUNTER_SCALE, e.y, e.z - cs * 11 * HUNTER_SCALE);
      if (tail) {
        g.fillStyle(0xf6c98a, a * 0.7);
        g.fillCircle(tail[0], tail[1], Math.max(1.5, 800 / tail[2]));
      }
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

  drawDestroyer(g, cm, b, a, flash) {
    this.drawWorldModel(g, cm, DESTROYER_MODEL, b, SD_SCALE, flash ? INK_HI : RUST, a);
    // luces de posición parpadeando por el casco: un objeto VIVO, no un plano
    [[0, -6, SD_NOSE], [-SD_HALF_W, -4, SD_REAR], [SD_HALF_W, -4, SD_REAR], [-130, -168, -340], [130, -168, -340], [0, -48, 80]].forEach(
      ([lx, ly, lz], i) => {
        if (Math.floor(b.t * 1.6 + i * 0.7) % 3 === 0) return;
        const [wx, wy, wz] = this.bossToWorld(b, lx, ly, lz);
        const lp = this.project(cm, wx, wy, wz);
        if (!lp) return;
        g.fillStyle(i < 3 ? RUST_HI : 0xb8dbe4, a * 0.9);
        g.fillCircle(lp[0], lp[1], Math.max(1.5, 1100 / lp[2]));
      }
    );
    // tres motores encendidos en la popa
    for (const ox of [-130, 0, 130]) {
      const [wx, wy, wz] = this.bossToWorld(b, ox, 18, SD_REAR - 6);
      const p = this.project(cm, wx, wy, wz);
      if (!p) continue;
      const r = (34 * SD_SCALE * FOCAL) / p[2];
      g.fillStyle(0xf6c98a, 0.25);
      g.fillCircle(p[0], p[1], r * 1.6);
      g.fillStyle(0xfff1d6, 0.85);
      g.fillCircle(p[0], p[1], r * 0.7);
    }
    const shielded = b.parts.some((q) => q.kind === 'dome' && q.hp > 0);
    const aimed = this.bossAimPart(b, this.F);
    for (const pt of b.parts) {
      if (pt.hp <= 0) continue;
      const [wx, wy, wz] = this.bossToWorld(b, pt.ox, pt.oy, pt.oz);
      const p = this.project(cm, wx, wy, wz);
      if (!p) continue;
      const k = (SD_SCALE * FOCAL) / p[2];
      const hot = pt.flashT > 0 ? INK_HI : RUST_HI;
      // los puntos débiles abiertos llevan mira: ahí es donde se le pega
      if (this.bossPartOpen(b, pt)) {
        const main = pt.kind !== 'turret';
        const r = Math.max(main ? 20 : 12, SD_PART_R[pt.kind] * (FOCAL / p[2]) * 0.8);
        const c = r * 0.4;
        g.lineStyle(main ? 2 : 1.5, main ? INK_HI : RUST_HI, main ? 0.6 + 0.4 * Math.sin(b.t * 6) : 0.45);
        for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
          g.beginPath();
          g.moveTo(p[0] + sx * r, p[1] + sy * (r - c));
          g.lineTo(p[0] + sx * r, p[1] + sy * r);
          g.lineTo(p[0] + sx * (r - c), p[1] + sy * r);
          g.strokePath();
        }
        // la que tienes en la mira muestra cuánto le queda
        if (pt === aimed) {
          g.fillStyle(INK_HI, 0.9);
          for (let i = 0; i < pt.hp; i++) g.fillRect(p[0] - pt.max * 3 + i * 6, p[1] - r - 10, 4, 4);
        }
      }
      if (pt.kind === 'turret') {
        this.drawWorldModel(g, cm, SENTRY_MODEL, { x: wx, y: wy - 12 * SD_SCALE, z: wz, yaw: b.yaw }, 1.1 * SD_SCALE, pt.flashT > 0 ? INK_HI : RUST, a);
        g.fillStyle(hot, a);
        g.fillCircle(p[0], p[1] - 34 * k, Math.max(2, 7 * k));
      } else if (pt.kind === 'dome') {
        // domo de escudo: esfera en tinta, lo que protege el puente
        g.lineStyle(1.5, pt.flashT > 0 ? INK_HI : 0x8fb0c4, 0.9);
        g.strokeCircle(p[0], p[1], 36 * k);
        g.strokeEllipse(p[0], p[1], 72 * k, 26 * k);
        g.fillStyle(0x8fb0c4, 0.12 + 0.08 * Math.sin(b.t * 4));
        g.fillCircle(p[0], p[1], 36 * k);
      } else {
        // el puente: blindado mientras haya domos; expuesto, late en brasa
        const pulse = 0.5 + 0.5 * Math.sin(b.t * (shielded ? 2 : 7));
        if (shielded) {
          g.lineStyle(1.5, 0x8fb0c4, 0.25 + 0.2 * pulse);
          g.strokeCircle(p[0], p[1], 90 * k);
        } else {
          g.fillStyle(hot, 0.45 + 0.45 * pulse);
          g.fillCircle(p[0], p[1], 30 * k);
          g.lineStyle(2, RUST_HI, 0.6 * pulse);
          g.strokeCircle(p[0], p[1], (50 + pulse * 20) * k);
        }
      }
    }
    // el cañón de proa cargando: el aviso para esquivar
    if (b.charging > 0) {
      const [wx, wy, wz] = this.bossToWorld(b, 0, 10, SD_NOSE);
      const p = this.project(cm, wx, wy, wz);
      if (p) {
        const c = 1 - b.charging / 1.8;
        const k = (SD_SCALE * FOCAL) / p[2];
        g.fillStyle(RUST_HI, 0.3 + 0.5 * c);
        g.fillCircle(p[0], p[1], (10 + 40 * c) * k);
        g.lineStyle(2, 0xfff1d6, c);
        g.strokeCircle(p[0], p[1], (60 - 40 * c) * k);
      }
    }
  }

  // Un modelo orientado por una base cualquiera (la nave, los misiles):
  // x del modelo sobre R, -y sobre U, z sobre F; con alabeo visual opcional
  drawBasisModel(g, cm, model, P, F, U, scale, color, alpha, bank) {
    const R = vcross(F, U);
    const cb = Math.cos(bank || 0);
    const sb = Math.sin(bank || 0);
    const pts = model[0].map(([mx0, my0, mz]) => {
      const mx = (mx0 * cb - my0 * sb) * scale;
      const my = (mx0 * sb + my0 * cb) * scale;
      const s = mz * scale;
      return [
        P.x + R.x * mx - U.x * my + F.x * s,
        P.y + R.y * mx - U.y * my + F.y * s,
        P.z + R.z * mx - U.z * my + F.z * s,
      ];
    });
    g.lineStyle(4.5, color, alpha * 0.18);
    for (const [a, b] of model[1]) this.worldLine(g, cm, pts[a], pts[b]);
    g.lineStyle(1.5, color, alpha);
    for (const [a, b] of model[1]) this.worldLine(g, cm, pts[a], pts[b]);
  }

  drawShip(g, cm, time) {
    if (this.phase === 'out') return;
    if (this.phase !== 'jump' && time < this.invulnUntil && Math.floor(time / 60) % 2 === 0) return;
    const f = this.forward();
    // dash: la nave deja copias fantasma — mientras se ven, nada te toca
    if (time < this.dashUntil) {
      for (let i = 1; i <= 3; i++) {
        const gp = { x: this.pos.x - f.x * 22 * i, y: this.pos.y - f.y * 22 * i, z: this.pos.z - f.z * 22 * i };
        this.drawBasisModel(g, cm, SHIP_MODEL, gp, this.F, this.U, 1, INK_HI, 0.4 / i, this.roll);
      }
    }
    this.drawBasisModel(g, cm, SHIP_MODEL, this.pos, this.F, this.U, 1, INK, 1, this.roll);
    // a velocidad de embestida, la proa se enciende
    if (this.speed > RAM_SPEED) {
      const np = this.project(cm, this.pos.x + f.x * 22, this.pos.y + f.y * 22, this.pos.z + f.z * 22);
      if (np) {
        const k = Math.min(1, (this.speed - RAM_SPEED) / 150);
        g.lineStyle(2, INK_HI, 0.5 * k + 0.2 * Math.sin(time * 0.05));
        g.strokeCircle(np[0], np[1], (20 * FOCAL) / np[2]);
        g.fillStyle(INK_HI, 0.18 * k);
        g.fillCircle(np[0], np[1], (20 * FOCAL) / np[2]);
      }
    }
    // el escudo envuelve la nave; el fogonazo vive en la nariz
    const sp0 = this.project(cm, this.pos.x, this.pos.y, this.pos.z);
    if (this.shield && sp0) {
      g.lineStyle(1.5, INK_HI, 0.4 + 0.2 * Math.sin(time * 0.008));
      g.strokeCircle(sp0[0], sp0[1], 30 * (FOCAL / sp0[2]));
    }
    // el escudo ACTIVO: una esfera de energía en el azul de los domos —
    // relleno tenue, meridianos girando y arcos vivos; parpadea al morir
    if (time < this.shieldUntil && sp0) {
      const left = (this.shieldUntil - time) / SHIELD_MS;
      const dying = left < 0.22 && Math.floor(time / 90) % 2 === 0;
      const r = SHIELD_R * 0.85 * (FOCAL / sp0[2]);
      if (!dying) {
        g.fillStyle(0x8fb0c4, 0.1);
        g.fillCircle(sp0[0], sp0[1], r);
        g.lineStyle(1.5, SHIELD_INK, 0.85);
        g.strokeCircle(sp0[0], sp0[1], r);
        g.lineStyle(3.5, 0x8fb0c4, 0.2);
        g.strokeCircle(sp0[0], sp0[1], r * 1.1);
        // los meridianos: la burbuja es una esfera, no un aro
        const sp = time * 0.0021;
        g.lineStyle(1, SHIELD_INK, 0.4);
        g.strokeEllipse(sp0[0], sp0[1], 2 * r * Math.abs(Math.cos(sp)), 2 * r);
        g.strokeEllipse(sp0[0], sp0[1], 2 * r, 2 * r * Math.abs(Math.cos(sp * 0.8 + 1.2)));
        const spin = time * 0.004;
        g.lineStyle(2.5, INK_HI, 0.9);
        for (let i = 0; i < 3; i++) {
          const a0 = spin + (i * Math.PI * 2) / 3;
          g.beginPath();
          g.arc(sp0[0], sp0[1], r, a0, a0 + 0.7);
          g.strokePath();
        }
      }
      // la onda del impacto: se VE que la burbuja se llevó el golpe
      if (this.shieldHitT > 0) {
        const u = 1 - this.shieldHitT / 0.3;
        g.lineStyle(2.5, INK_HI, 0.9 * (1 - u));
        g.strokeCircle(sp0[0], sp0[1], r * (1 + u * 0.55));
      }
    }
    if (this.muzzleT > 0) {
      const mp = this.project(cm, this.pos.x + f.x * 26, this.pos.y + f.y * 26 - 2, this.pos.z + f.z * 26);
      if (mp) {
        g.fillStyle(INK_HI, 0.9);
        g.fillCircle(mp[0], mp[1], Math.max(2, 500 / mp[2]));
      }
    }
    // las toberas encendidas: dos brasas que laten con la velocidad
    const burn = 0.45 + 0.4 * (this.speed / NITRO_MAX) + 0.15 * Math.sin(time * 0.03);
    for (const sgn of [-1, 1]) {
      const mx = 11 * sgn;
      const ep = this.project(
        cm,
        this.pos.x + this.R.x * mx - this.U.x - f.x * 15,
        this.pos.y + this.R.y * mx - this.U.y - f.y * 15,
        this.pos.z + this.R.z * mx - this.U.z - f.z * 15
      );
      if (ep) {
        g.fillStyle(0xf6c98a, burn * 0.35);
        g.fillCircle(ep[0], ep[1], Math.max(2, 900 / ep[2]));
        g.fillStyle(0xfff1d6, burn);
        g.fillCircle(ep[0], ep[1], Math.max(1.2, 420 / ep[2]));
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

  // Lo que viene hacia ti desde fuera de la pantalla se anuncia en el borde,
  // del lado por el que llega
  drawIncoming(g, cm, time) {
    const threats = this.shots.concat(this.ents.filter((e) => e.k === 'emis' || e.k === 'inter'));
    for (const s of threats) {
      const d = { x: this.pos.x - s.x, y: this.pos.y - s.y, z: this.pos.z - s.z };
      const dist = Math.hypot(d.x, d.y, d.z);
      if (dist > 1000 || d.x * s.vx + d.y * s.vy + d.z * s.vz <= 0) continue;
      const p = this.project(cm, s.x, s.y, s.z);
      if (p && p[0] > 30 && p[0] < W - 30 && p[1] > 30 && p[1] < H - 30) continue;
      const o = { x: -d.x, y: -d.y, z: -d.z };
      const ang = Math.atan2(-vdot(o, cm.U), vdot(o, cm.R) || 0.001);
      const ex = CX + Math.cos(ang) * (CX - 28);
      const ey = CY + Math.sin(ang) * (CY - 28);
      const pulse = 0.55 + 0.45 * Math.sin(time * 0.02);
      g.lineStyle(3, RUST_HI, pulse * (1 - dist / 1100));
      g.beginPath();
      g.moveTo(ex - Math.cos(ang + 0.6) * 16, ey - Math.sin(ang + 0.6) * 16);
      g.lineTo(ex, ey);
      g.lineTo(ex - Math.cos(ang - 0.6) * 16, ey - Math.sin(ang - 0.6) * 16);
      g.strokePath();
    }
  }

  // La marca de navegación: hacia la pieza que falta
  drawNav(g, cm) {
    let target = null;
    let label = '';
    if (this.phase === 'play' && this.level === 0) {
      target = this.tut && !this.tut.dead ? this.tut : null;
      if (target) {
        label = { ring: 'MARCA', drone: 'DRON', sentry: 'TORRETA', rock: 'BLANCO' }[target.k] || '';
      }
    } else if (this.phase === 'play') {
      target = this.ents.find((e) => e.k === 'part');
      if (target) label = PARTS[target.idx];
    } else if (this.phase === 'boss' && this.boss) {
      // no al centro del destructor: al punto débil que toca romper
      const b = this.boss;
      let bd = 1e9;
      for (const pt of b.parts) {
        if (pt.kind === 'turret' || !this.bossPartOpen(b, pt)) continue;
        const [x, y, z] = this.bossToWorld(b, pt.ox, pt.oy, pt.oz);
        const d = Math.hypot(x - this.pos.x, y - this.pos.y, z - this.pos.z);
        if (d < bd) {
          bd = d;
          target = { x, y, z };
          label = pt.kind === 'dome' ? 'DOMO DE ESCUDO' : 'PUENTE';
        }
      }
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
      // detrás: la flecha apunta al lado por el que conviene girar
      const d = { x: part.x - cm.x, y: part.y - cm.y, z: part.z - cm.z };
      ang = Math.atan2(-vdot(d, cm.U), vdot(d, cm.R) || 1);
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
    this.hullText.setText('CASCO ' + (GOD ? '∞' : '▸'.repeat(this.hull) + '·'.repeat(HULL_MAX - this.hull)));
    this.missileText.setText('MISILES ' + '▴'.repeat(this.ammo) + '·'.repeat(MISSILE_MAX - this.ammo));
    this.partText.setText(
      this.level === 0 ? 'TUTORIAL'
      : this.level === 1 ? 'NIVEL 0  ' + PARTS.map((p, i) => (i < this.partsGot ? p[0] : '·')).join(' ')
      : 'NIVEL 1'
    );
    // la reserva de turbo, junto a la velocidad
    const g = this.gfx;
    g.lineStyle(1, INK, 0.5);
    g.strokeRect(12, 34, 90, 6);
    g.fillStyle(INK_HI, 0.7);
    g.fillRect(13, 35, 88 * (this.boost / BOOST_MAX), 4);
    // el escudo, recargándose debajo: llena = listo
    const now = this.time.now;
    const shReady = now >= this.shieldReady ? 1 : 1 - (this.shieldReady - now) / (SHIELD_MS + SHIELD_COOLDOWN_MS);
    g.lineStyle(1, INK, 0.4);
    g.strokeRect(12, 44, 90, 4);
    g.fillStyle(INK_HI, shReady >= 1 ? 0.8 : 0.4);
    g.fillRect(13, 45, 88 * Math.max(0, shReady), 2);
    // el próximo misil, recargándose
    if (this.ammo < MISSILE_MAX) {
      g.lineStyle(1, INK, 0.4);
      g.strokeRect(150, H - 8, 120, 4);
      g.fillStyle(INK_HI, 0.7);
      g.fillRect(151, H - 7, 118 * (this.ammoRegen / MISSILE_REGEN), 2);
    }
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
