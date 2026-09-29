// Space Explorer — Platanus Hack 26: Caracas Arcade Challenge
// Tu nave quedó varada en un sector alienígena. Encuentra las tres piezas del
// hipersalto entre los restos, y vuelve a casa.
//
// Vuelo libre 3D con proyección propia: la nave siempre avanza y el stick
// la dirige, con loops completos; la cámara va pegada a ella. MODO ARCADE
// INFINITO: sin niveles ni final — sobrevive y puntúa. El mundo no tiene
// bordes (todo se siembra y recicla alrededor tuyo), los cazadores aprietan
// con los minutos, hay emboscadas periódicas, torretas de la base flotando
// sobre el disco del agujero (bajar a cazarlas paga powerup seguro), y un
// destructor recurrente que llega del hiperespacio a oscuras — el primero
// con toda la ceremonia, los siguientes al grano — y paga +1500. Morir es
// el único final. Texto en inglés, corto, voz arcade. Wireframe luminoso;
// el óxido marca el peligro.


// DICCIONARIO DE NOMBRES CORTOS — el minificador (SWC) no acorta nombres
// top-level ni PROPIEDADES, así que estos se acortaron a mano. Métodos:
// pj=project pd=projectDir wl=worldLine sg=strokeEdges bw=bossToWorld
// wb=worldToBoss bo=bossPartOpen ba=bossAimPart bp=bossHitPart ib=insideBoss
// db=drawBasisModel dm=drawWorldModel de=drawEnt dr=drawDestroyer
// so=skyObject sd=spawnDrones sa=shootAtPlayer bt=bestTarget up=updatePlayer
// ue=updateEnts ux=updateBolts um=updateMissiles uc=updateCamera uh=updateHud
// ub=updateBoss bs=buildStars bu=buildHud po=populate ri=randIn sj=startJump
// kb=killBoss hy=hitPlayer ad=addScore dp=dropPow sy=spray bm=boomAt
// dn=detonate fg=fogAlpha kr=skyRoll dh=drawHorizon dl=drawHole dk=drawSky
// dz=drawStars dd=drawDust dw=drawWarp dj=drawShip dv=drawNav di=drawIncoming
// fw=forward
// Estado: sp=speed cu=cruise fz=phase en=ents sh=shake bx=booms tr=trail
// ft=flashT bz=boost hd=hidden ss=shots bl=bolts ms=missiles sz=shards
// sn=stars yv=yawVel pv=pitchVel su=shieldUntil sw=shieldReady ht=shieldHitT
// ea=shieldEats iu=invulnUntil du=dashUntil fy=fireReadyAt ar=ammoRegen
// sq=scrapRun tl=twinUntil mz2=muzzleT mt=multT mu=mult cg=charging ch=charge
// pg=partsGot ep=elapsed pa=paused jg=jumping jt=jumpT ts=tutStep tu=tutWait
// bq=bossAt kA=skipArm wa=bhWarnAt et=enterT ha=hangarAt ca=cannonAt
// ma=missileAt
// Alias cortos: SWC no acorta nombres top-level ni Math.* — esto sí cuenta
const SIN = Math.sin;
const COS = Math.cos;
const HYP = Math.hypot;
const RND = Math.random;
const MIN = Math.min;
const MAX = Math.max;
const FLR = Math.floor;
const ABS = Math.abs;
const AT2 = Math.atan2;
const PI = Math.PI;
const CLP = Phaser.Math.Clamp;
const WRP = Phaser.Math.Wrap;
const AWR = Phaser.Math.Angle.Wrap;

// Modelos comprimidos: vértices planos de a 3, y las aristas como un string
// (cada char es un índice + 48) — el minificador no comprime arrays de pares
function mdl(flat, es) {
  const V = [];
  for (let i = 0; i < flat.length; i += 3) V.push(flat.slice(i, i + 3));
  const E = [];
  for (let i = 0; i < es.length; i += 2) E.push([es.charCodeAt(i) - 48, es.charCodeAt(i + 1) - 48]);
  return [V, E];
}

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

// MODO PRUEBA: vidas infinitas para depurar — APAGADO: tres vidas de verdad
const GOD = false;

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
const AMB = 0xf6c98a; // ámbar del disco
const CRM = 0xfff1d6; // crema caliente
const BLU = 0xb8dbe4; // azul: escudo y recursos TUYOS
const BLD = 0x8fb0c4; // azul apagado
const GRY = 0x8a9099; // gris de escombro: paisaje, no equipo

const MAGNET_R = 240; // lo recogible viene hacia ti
const FIRE_MS = 160;
const BOLT_SPEED = 980;
const BOLT_LIFE = 1.9;
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
const SECTOR_R = 3000;
// El suelo es un agujero negro: siempre debajo de ti. Bajar lo acerca; a
// BH_PULL de distancia empieza a tirar, y a BH_KILL te tragó.
const BH_Y = 3600;
const BH_PULL = 1800;
const BH_GRIP = 1150; // aquí ya TE TIENE: el crucero no alcanza — dash o nitro
const BH_KILL = 900;

const HULL_MAX = 4;
const SCORE_KEY = 'space-explorer:scores';

// Las cuatro piezas del hipersalto

const HINT_MAIN = 'B1 FIRE · B2 DASH · B3 MISSILE · B4/B6 SHIELD';

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
  return (
    window.platanusArcadeStorage || {
      async get(key) {
        try {
          const raw = localStorage.getItem(key);
          return raw === null ? { found: false } : { found: true, value: JSON.parse(raw) };
        } catch {
          return { found: false };
        }
      },
      async set(key, value) {
        try {
          localStorage.setItem(key, JSON.stringify(value));
        } catch {}
      },
    }
  );
}

// Top 5 con forma validada: el storage sobrevive entre versiones
async function loadScores() {
  const res = await getStorage().get(SCORE_KEY);
  if (!res.found || !res.value || !Array.isArray(res.value.scores)) return [];
  return res.value.scores
    .filter((s) => s && typeof s.n === 'string' && typeof s.s === 'number')
    .map((s) => ({ n: s.n.slice(0, 3).toUpperCase(), s: FLR(s.s) }))
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

  noise(dur, vol, at) {
    if (!this.ctx) return;
    const t = at || this.ctx.currentTime;
    const len = FLR(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (RND() * 2 - 1) * (1 - i / len);
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
    this.noise(0.3, 0.14);
    this.tone(160, 0.35, 'sine', 0.14, 50);
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
const SHIP_MODEL = mdl([0, 0, 26, 0, -3.5, 14, 0, -5.5, 2, 0, -4, -8, 0, -11, -17, 0, 0, -16, -5, -1, 8, 5, -1, 8, -22, 1, -13, 22, 1, -13, -22, -4, -15, 22, -4, -15, 0, 3, -6, -9, 1, -2, 9, 1, -2, -11, 1, -15, 11, 1, -15, -3, -1.5, 19, 3, -1.5, 19], '0112233445350607687985958:9;0<<56<7<6==?7>>@?5@50AA60BB72627');

// Centinela: pirámide vigilante, con ojo
const SENTRY_MODEL = mdl([-22, 14, -22, 22, 14, -22, 22, 14, 22, -22, 14, 22, 0, -26, 0], '01122330041424340213');

// Dron cazador: alas quebradas en codo con garras hacia adelante — una
// silueta agresiva que no se confunde con la tuya
const DRONE_MODEL = mdl([0, 0, 18, 0, -6, 4, 0, -3, -8, 0, 0, -12, -6, 0, 2, 6, 0, 2, -18, 1, -6, 18, 1, -6, -24, 0, 8, 24, 0, 8, -18, -8, -9, 18, -8, -9, 0, 5, -4], '01122304054657637368796:7;0<<34<5<');
const HUNTER_SCALE = 3; // cazadores e interceptores: grandes, fáciles de seguir

// Mina: octaedro



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
    if (ABS(HYP(a[0] - b[0], a[1] - b[1], a[2] - b[2]) - 2) < 0.01) ICO_EDGES.push([i, j]);
  }
}
// El pool: CUATRO formas de roca generadas una vez y compartidas por
// todas — una instancia, muchas repeticiones
function makeRockModel() {
  const k = 16 / HYP(1, ICO_PHI);
  return [
    ICO_VERTS.map(([x, y, z]) => {
      const j = (0.68 + RND() * 0.5) * k;
      return [x * j, y * j * 0.8, z * j];
    }),
    ICO_EDGES,
  ];
}

const ROCK_POOL = [makeRockModel(), makeRockModel(), makeRockModel(), makeRockModel()];

// Interceptor: aguja con cuchillas hacia adelante, canards junto a la nariz
// y una aleta dorsal — un dardo con filo
const INTER_MODEL = mdl([0, 0, 24, 0, -4, -4, 0, 4, -4, -4, 0, -4, 4, 0, -4, 0, 0, -14, -15, 0, 7, 15, 0, 7, -9, -1, 14, 9, -1, 14, 0, -8, -12], '010203041525354536654775088309941::5');

// El destructor: una cuña de casi mil unidades con su torre de mando atrás.
// Local: x derecha, y abajo, z hacia la proa.
const SD_SCALE = 1.6; // todo el destructor, a esta escala
const SD_NOSE = 560;
const SD_REAR = -400;
const SD_HALF_W = 300; // media manga en la popa
const SD_RIDGE = -80; // altura del lomo en la popa
const SD_KEEL = 70;
const DESTROYER_MODEL = mdl([0, 0, 560, -300, 0, -400, 300, 0, -400, 0, -80, -400, 0, 70, -400, -280, 24, -400, 280, 24, -400, 0, -45, 80, -80, -70, -250, 80, -70, -250, 80, -70, -400, -80, -70, -400, -60, -150, -290, 60, -150, -290, 60, -150, -400, -60, -150, -400, -130, -165, -340, 130, -165, -340, -150, -40, -400, 150, -40, -400, -36, -30, 420, 36, -30, 420, -56, -56, -250, 56, -56, -250, -60, 38, 60, 60, 38, 60, -60, 44, -120, 60, 44, -120, -110, -180, -340, 110, -180, -340, -150, -6, 180, 150, -6, 180, -95, -142, -338, 95, -142, -338, -70, -110, -272, 70, -110, -272, 70, -110, -400, -70, -110, -400], '010207730413231526546405060B0C899::;;8<==>>??<8<9=:>;?@A<@=ADFEGDEHIIKKJJH<L=M0NN10OO2PQRSSTTUUR');
// Puntos débiles: torretas en la cubierta, dos domos de escudo sobre el puente,
// y el puente mismo, que solo recibe daño con los domos caídos
const SD_PARTS = [
  ['turret', 90, -14, 150, 2], ['turret', -90, -14, 150, 2],
  ['turret', 140, -20, -80, 2], ['turret', -140, -20, -80, 2],
  ['turret', 190, -25, -300, 2], ['turret', -190, -25, -300, 2],
  ['dome', 110, -185, -340, 6], ['dome', -110, -185, -340, 6],
  ['bridge', 0, -150, -345, 14],
];
const SD_PART_R = { turret: 42 * SD_SCALE, dome: 46 * SD_SCALE, bridge: 72 * SD_SCALE };

// Misil: cuerpo largo con cuatro aletas atrás — se tiene que ver como poder
const MISSILE_MODEL = mdl([0, 0, 16, 0, 0, -12, -3, 0, 8, 3, 0, 8, 0, -3, 8, 0, 3, 8, -8, 0, -14, 8, 0, -14, 0, -8, -14, 0, 8, -14, -3, 0, -6, 3, 0, -6, 0, -3, -6, 0, 3, -6], '020304052:3;4<5=:6;7<8=961718191');

// Mejoras: escudo (anillo), reparación (cruz), cañón doble (dos rayas)
const POW_MODELS = {
  shield: mdl([0, -10, 0, 9, 0, 0, 0, 10, 0, -9, 0, 0, 0, 0, 0], '01122330'),
  hull: mdl([0, -9, 0, 0, 9, 0, -9, 0, 0, 9, 0, 0], '0123'),
  twin: mdl([-5, -9, 0, -5, 9, 0, 5, -9, 0, 5, 9, 0], '0123'),
  missile: mdl([0, -12, 0, 0, 10, 0, -6, 10, 0, 6, 10, 0, -3, -6, 0, 3, -6, 0], '0112130405'),
};
const POW_NAMES = { shield: 'SHIELD +1', hull: 'HULL +1', twin: 'TWIN SHOT', missile: '+2 MISSILES' };

// Chatarra: un trozo de casco — placa con borde, puntal y una solapa doblada
const SCRAP_MODEL = mdl([-8, -6, 0, 7, -7, 0, 9, 4, 0, -6, 6, 0, 13, 8, -6, -2, 11, -6, -8, -6, -4, 7, -7, -4], '0112233024455306176702');

const FONT = (size, color) => ({
  fontFamily: 'monospace',
  fontSize: size + 'px',
  color: color || INK_CSS,
});


// Trazos de dos llamadas, en una: cada par pesa
function fc(g, x, y, r, col, al) {
  g.fillStyle(col, al);
  g.fillCircle(x, y, r);
}
function fr(g, x, y, w, h, col, al) {
  g.fillStyle(col, al);
  g.fillRect(x, y, w, h);
}
function sk(g, x, y, r, w, col, al) {
  g.lineStyle(w, col, al);
  g.strokeCircle(x, y, r);
}
function ln(g, ax, ay, bx, by) {
  g.beginPath();
  g.moveTo(ax, ay);
  g.lineTo(bx, by);
  g.strokePath();
}

const Music = {
  next: 0,
  step: 0,
  on: false,
  boss: false,
  tick() {
    if (!this.on || !Sfx.ctx) return;
    const now = Sfx.ctx.currentTime;
    if (this.next < now) this.next = now + 0.05;
    while (this.next < now + 0.4) {
      const t = this.next;
      const st = this.step++;
      if (this.boss) {
        // EL DESTRUCTOR: dos graves que se rozan a un semitono y una
        // campana baja — una flota entrando al sistema
        const s8 = st % 8;
        Sfx.tone([36.7, 36.7, 38.9, 36.7][s8 % 4], 0.55, 'sawtooth', 0.085, 0, t);
        Sfx.tone(73.4, 0.55, 'triangle', 0.055, 0, t);
        if (s8 === 0 || s8 === 3) Sfx.tone(110, 1, 'triangle', 0.06, 0, t);
        if (s8 === 6) Sfx.tone(58.3, 1, 'sawtooth', 0.07, 0, t);
        this.next += 0.34;
      } else {
        // el vacío: un dron en quintas que respira y, cada tanto, una
        // estrella que suena — sombrío, no alegre
        const s16 = st % 16;
        Sfx.tone(55, 1.5, 'triangle', 0.065, 0, t);
        Sfx.tone(82.4, 1.5, 'sine', 0.045, 0, t);
        if (s16 === 4) Sfx.tone(220, 2.4, 'sine', 0.03, 164.8, t);
        if (s16 === 12) Sfx.tone([330, 392, 294][FLR(st / 16) % 3], 2.6, 'sine', 0.028, 0, t);
        this.next += 0.7;
      }
    }
  },
};

// --------------------------------------------------------------------------
// El título, mínimo a propósito: los bytes son para el JUEGO. Nombre, la
// nave girando, controles, top 5, y nada más.
class Title extends Phaser.Scene {
  constructor() {
    super('title');
  }

  create() {
    this.events.on('postupdate', clearPressed);
    Music.on = false;
    this.add.text(CX, 96, 'S P A C E  E X P L O R E R', FONT(36)).setOrigin(0.5);
    this.add.text(160, 360, 'STICK\nB1\nB2\nB3\nB4/B6\nSTART', FONT(14)).setOrigin(1, 0).setAlign('right').setLineSpacing(13);
    this.add
      .text(
        180, 360,
        'STEER\nFIRE\nDASH\nMISSILE\nSHIELD\nPAUSE',
        FONT(13, DIM_CSS)
      )
      .setLineSpacing(14);
    this.add.text(596, 360, 'TOP 5', FONT(14));
    this.scoreText = this.add.text(596, 386, '', FONT(14, DIM_CSS)).setLineSpacing(9);
    loadScores().then((scores) => {
      if (!scores.length || !this.scene.isActive()) return;
      this.scoreText.setText(
        scores.map((s, i) => `${i + 1}  ${s.n.padEnd(3)}  ${String(s.s).padStart(6, '0')}`).join('\n')
      );
    });
    this.press = this.add.text(CX, H - 52, 'PRESS START', FONT(16)).setOrigin(0.5);
  }

  update(time) {
    this.press.setAlpha(FLR(time / 600) % 2 ? 1 : 0.25);
    if (anyStart()) this.scene.start('game', { level: 0 });
  }
}

// --- vectores {x,y,z} ---
const vdot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
const vcross = (a, b) => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x });
const vmix = (a, sa, b, sb) => ({ x: a.x * sa + b.x * sb, y: a.y * sa + b.y * sb, z: a.z * sa + b.z * sb });
const vnorm = (a) => {
  const m = HYP(a.x, a.y, a.z) || 1;
  return { x: a.x / m, y: a.y / m, z: a.z / m };
};
const WORLD_UP = { x: 0, y: -1, z: 0 };
// Rota v un ángulo alrededor del eje unitario A (Rodrigues)
function rotAxis(v, A, ang) {
  const c = COS(ang);
  const s = SIN(ang);
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
const skyDir = (yaw, el) => ({ x: SIN(yaw) * COS(el), y: -SIN(el), z: COS(yaw) * COS(el) });

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
    const hw = Math.sqrt(MAX(0, R * R - ym * ym));
    if (hw < 2) continue;
    fr(g, -hw, y0, hw * 2, y1 - y0 + 1, bands[FLR((i / N) * bands.length)], 1);
    const tx = hw * night;
    fr(g, tx, y0, hw - tx, y1 - y0 + 1, 0x05060a, 0.72);
  }
}

function drawGasGiant(g) {
  const R = 150;
  sk(g, 0, 0, R + 4, 6, 0x6a89a0, 0.14);
  sk(g, 0, 0, R + 1, 2, BLD, 0.3);
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
        const a = from + (j / 20) * PI;
        const x = R * (1.55 + k * 0.18) * COS(a);
        const y = R * (0.32 + k * 0.035) * SIN(a) - x * 0.28;
        if (j === 0) g.moveTo(x, y);
        else g.lineTo(x, y);
      }
      g.strokePath();
    }
  };
  ring(PI);
  sk(g, 0, 0, R + 3, 4, 0xc97b5a, 0.12);
  drawBandedSphere(g, R, [0x8a4a36, 0x6b3a2c, 0x9a5a40, 0x7a4432, 0x5a3024, 0x8a4a36], 0.25);
  ring(0);
}

function drawIcePlanet(g) {
  const R = 30;
  sk(g, 0, 0, R + 2, 3, BLU, 0.18);
  drawBandedSphere(g, R, [0x9fc2cc, 0x8fb4c0, 0xb4d4dc, 0x86aab6], 0.1);
}

// --------------------------------------------------------------------------
class Game extends Phaser.Scene {
  constructor() {
    super('game');
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
    this.yv = 0;
    this.pv = 0;
    this.cu = 220;
    this.sp = this.cu;
    this.bz = BOOST_MAX;
    this.roll = 0; // alabeo solo visual, al girar
    this.su = 0;
    this.sw = 0;
    this.du = 0;
    this.fy = 0;
    this.iu = 0;
    this.hull = HULL_MAX;
    this.ammo = 3;
    this.ar = 0;
    this.sq = 0;
    this.sqSaid = 0;

    // cámara: la misma base, suavizada — sigue la nave también de cabeza
    this.camF = { ...this.F };
    this.camU = { ...this.U };
    this.camR = { ...this.R };

    // ARCADE INFINITO: una sola fase — sobrevive y puntúa hasta morir.
    // (Phaser reuses the scene instance across runs)
    this.fz = 'play';
    this.bq = 75; // el primer destructor tarda esto en llegar
    this.bossN = 0;
    this.wvAt = 32; // emboscadas periódicas
    this.baseAt = 55; // torretas de la base, sobre el disco
    this.svT = 0; // puntos por sobrevivir
    this.wvN = 0;
    this.ht = 0;
    this.wa = 0;
    this.score = 0;
    this.ep = 0;
    this.droneAt = 10; // al principio te dejan orientarte
    this.sh = 0;

    this.en = [];
    this.bl = [];
    this.ms = [];
    this.ss = [];
    this.bx = [];
    this.sz = []; // fragmentos de explosión

    // arcade extra
    this.pa = false;
    this.mu = 1; // multiplicador de combo
    this.mt = 0;
    this.shield = false;
    this.tl = 0;
    this.mz2 = 0;
    this.boss = null;

    this.po();
    this.bs();
    this.bu();

    this.flash = this.add.rectangle(CX, CY, W, H, 0xffffff).setAlpha(0).setDepth(10);
    Music.on = true;
    window.__g = this; // handle de debug — quitar antes de enviar
  }

  // El mundo se siembra alrededor TUYO y se recicla contigo: no hay
  // bordes — el sector eres tú
  po() {
    const rnd = (a, b) => a + RND() * (b - a);
    const rocks = 10;
    const scraps = 12;
    for (let i = 0; i < rocks; i++) {
      const p = this.ri(SECTOR_R * 0.95);
      this.en.push({
        k: 'rock', x: p[0], y: p[1] * 0.5, z: p[2], r: 42, hp: 2, t: rnd(0, 9), model: ROCK_POOL[FLR(RND() * 4)],
        spin: rnd(-0.5, 0.5), vx: rnd(-16, 16), vy: rnd(-10, 10), vz: rnd(-16, 16), yaw: 0,
      });
    }
    for (let i = 0; i < scraps; i++) {
      const p = this.ri(SECTOR_R * 0.9);
      this.en.push({ k: 'scrap', x: p[0], y: p[1] * 0.5, z: p[2], r: 16, t: rnd(0, 6), yaw: 0 });
    }
  }

  ri(r) {
    const ang = RND() * PI * 2;
    const rr = 300 + RND() * (r - 300);
    return [SIN(ang) * rr, (RND() - 0.5) * 2 * r * 0.5, COS(ang) * rr];
  }

  // Estrellas: puntos fijos del mundo, envueltos en una caja alrededor tuyo
  bs() {
    // Stars sit at infinity: they only turn with the view and never slide
    // past, so the one thing moving through the sector is you
    this.sn = [];
    for (let i = 0; i < 320; i++) {
      const v = vnorm({ x: RND() - 0.5, y: RND() - 0.5, z: RND() - 0.5 });
      this.sn.push({
        v,
        s: RND() < 0.1 ? 3 : RND() < 0.4 ? 2 : 1,
        a: 0.25 + RND() * 0.45,
        tw: RND() < 0.25 ? 1 + RND() * 2 : 0, // parpadeo
        ph: RND() * 6.3,
      });
    }
    // the galaxy's band: dense faint stars hugging the horizon
    this.band = [];
    for (let i = 0; i < 260; i++) {
      const u = RND() + RND() + RND() - 1.5;
      this.band.push({
        yaw: RND() * PI * 2,
        el: (u * 26) / FOCAL,
        s: RND() < 0.2 ? 2 : 1,
        a: 0.2 + RND() * 0.45,
      });
    }
    // el polvo: motas cercanas que convierten la velocidad en estelas —
    // son la referencia principal de hacia dónde te mueves
    this.dust = [];
    for (let i = 0; i < 96; i++) {
      this.dust.push({
        x: (RND() - 0.5) * 560,
        y: (RND() - 0.5) * 560,
        z: (RND() - 0.5) * 560,
      });
    }
  }

  bu() {
    this.velText = this.add.text(12, 10, '', FONT(15)).setAlpha(0.9);
    this.scoreText = this.add.text(W - 12, 10, '', FONT(15)).setOrigin(1, 0).setAlpha(0.9);
    this.partText = this.add.text(W - 12, H - 28, '', FONT(15, DIM_CSS)).setOrigin(1, 0);
    this.hullText = this.add.text(12, H - 30, '', FONT(17));
    this.missileText = this.add.text(168, H - 30, '', FONT(17));
    this.add.text(136, H - 52, 'DASH', FONT(10, DIM_CSS)).setOrigin(0, 0.5);
    this.add.text(136, H - 66, 'SHIELD', FONT(10, DIM_CSS)).setOrigin(0, 0.5);
    this.navText = this.add.text(CX, 64, '', FONT(16)).setOrigin(0.5).setAlpha(0.95);
    this.label = this.add.text(0, 0, '', FONT(14)).setOrigin(0.5).setVisible(false);
    this.notice = this.add.text(CX, 168, '', FONT(16)).setOrigin(0.5).setAlpha(0);
    this.hint = this.add.text(CX, H - 58, HINT_MAIN, FONT(13, DIM_CSS)).setOrigin(0.5).setAlpha(0.6);
    this.time.delayedCall(9000, () => this.tweens.add({ targets: this.hint, alpha: 0, duration: 800 }));
    // etiqueta del escudo, junto a su barra

    this.say('SURVIVE. SCORE.');
  }

  say(msg) {
    this.notice.setText(msg).setAlpha(1);
    this.tweens.add({ targets: this.notice, alpha: 0, delay: 2000, duration: 700 });
  }

  // --- flujo ---
  update(time, delta) {
    const dt = MIN(delta, 50) / 1000;
    this.ep += dt;
    Music.boss = !!this.boss;
    Music.tick();

    // pausa: START congela el sector
    if (pressed.START1 && this.fz !== 'out') {
      this.pa = !this.pa;
      this.tweens.killTweensOf(this.notice);
      this.notice.setText(this.pa ? 'PAUSED' : '').setAlpha(this.pa ? 1 : 0);
    }
    if (this.pa) return;

    // el combo se enfría
    this.mt -= dt;
    if (this.mt <= 0) this.mu = 1;
    this.mz2 -= dt;
    this.ht = MAX(0, this.ht - dt);

    const cine = this.boss && this.boss.cine;
    if (this.fz === 'play' && !cine) {
      if (this.boss) {
        // la pelea es contra ÉL: apenas entra escolta, y nada más
        this.sd(dt, 1, 16);
      } else {
      // el reloj del arcade: todo aprieta con los minutos
      this.sd(dt, MIN(6, 1 + FLR(this.ep / 40)), MAX(4.5, 11 - this.ep / 40));
      this.wvAt -= dt;
      if (this.wvAt <= 0) {
        this.wvAt = 34;
        this.wave(MIN(6, 2 + FLR(this.ep / 70)));
      }
      // las torretas de la base, flotando sobre el disco: bajar al jalón a
      // cazarlas paga powerup seguro
      this.baseAt -= dt;
      if (this.baseAt <= 0) {
        this.baseAt = 55;
        if (this.en.filter((e) => e.base).length < 4) {
          this.say('TURRET RING BELOW.');
          for (let i = 0; i < 3; i++) {
            const ang = RND() * PI * 2;
            this.en.push({
              k: 'sentry', base: 1,
              x: this.pos.x + SIN(ang) * (700 + RND() * 500),
              y: 1500 + RND() * 250,
              z: this.pos.z + COS(ang) * (700 + RND() * 500),
              r: 44, hp: 3, t: RND() * 6, yaw: RND() * 6.3, fireAt: 1,
            });
          }
        }
      }
      // el destructor vuelve siempre — y cada vez con menos ceremonia
      const was = this.bq;
      this.bq -= dt;
      if (was > 2.5 && this.bq <= 2.5) this.say('MASSIVE SIGNAL.');
      if (this.bq <= 0) {
        this.say('HYPERSPACE RUPTURE.');
        this.spawnBoss();
      }
      }
      // sobrevivir puntúa solo
      this.svT += dt;
      if (this.svT >= 5) {
        this.svT -= 5;
        this.score += 25;
      }
    }

    if (this.fz !== 'out') this.up(time, dt);
    this.ue(time, dt);
    this.ux(dt);
    this.um(dt, time);
    this.uc(dt);
    this.draw(time);
    this.uh();
  }

  // La emboscada: n naves entran A LA VEZ desde direcciones distintas —
  // el nivel 0 se gana peleando, no solo recogiendo
  wave(n) {
    this.say('AMBUSH.');
    Sfx.turn();
    this.wvN = n;
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * PI * 2 + RND() * 0.8;
      const inter = i === 2 && n >= 4; // un solo embestidor, y no en la primera
      this.en.push({
        k: inter ? 'inter' : 'drone',
        x: this.pos.x + SIN(ang) * 1500,
        y: this.pos.y + (RND() - 0.5) * 600,
        z: this.pos.z + COS(ang) * 1500,
        r: 22 * HUNTER_SCALE,
        hp: inter ? 2 : 3,
        t: 0,
        yaw: 0,
        fireAt: 2 + RND() * 2,
        orbit: RND() < 0.5 ? 1 : -1,
        vx: 0, vy: 0, vz: 0,
        wv: 1,
      });
    }
  }

  // Después de un rato, salen a cazarte — y más, con cada pieza a bordo.
  // Con la primera pieza aparecen también interceptores, que embisten.
  sd(dt, max, every) {
    this.droneAt -= dt;
    const alive = this.en.filter((e) => e.k === 'drone' || e.k === 'inter').length;
    if (this.droneAt > 0 || alive >= max) return;
    this.droneAt = every;
    const ang = RND() * PI * 2;
    const inter = this.ep > 60 && RND() < 0.4;
    this.en.push({
      k: inter ? 'inter' : 'drone',
      x: this.pos.x + SIN(ang) * 1300,
      y: this.pos.y + (RND() - 0.5) * 500,
      z: this.pos.z + COS(ang) * 1300,
      r: 22 * HUNTER_SCALE,
      hp: inter ? 2 : 3,
      t: 0,
      yaw: 0,
      fireAt: 2,
      orbit: RND() < 0.5 ? 1 : -1,
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
    // Aparece LEJOS, delante de ti y a TU MISMA ALTURA: lo ves de lado,
    // entero, imponente. No hay anillo: el sector eres tú.
    const f = this.F;
    const h = HYP(f.x, f.z) || 1;
    const bd = this.bossN ? 2200 : 2600;
    const bx = this.pos.x + (f.x / h) * bd;
    const bz = this.pos.z + (f.z / h) * bd;
    this.boss = {
      k: 'boss',
      x: bx,
      y: CLP(this.pos.y, -500, 500),
      z: bz,
      r: 520 * SD_SCALE,
      t: 0,
      yaw: AT2(this.pos.x - bx, this.pos.z - bz), // la proa hacia ti
      ha: 8,
      ca: 12,
      ma: 6,
      cg: 0,
      // la entrada: primero el APAGÓN y las letras — y cuando todo está
      // negro, el destructor simplemente ESTÁ, de golpe, con el flash
      hd: 1,
      cine: 1,
      cineT: 0,
      short: this.bossN ? 1 : 0, // el primero con toda la ceremonia; después, al grano
      tpAt: 0,
      salvoAt: 0,
      parts: SD_PARTS.map(([kind, ox, oy, oz, hp]) => ({ kind, ox, oy, oz, hp, max: hp, fireAt: 1 + RND() * 3, burst: 0 })),
    };
    this.en.push(this.boss);
  }

  // Del casco del destructor al mundo, y de vuelta
  bw(b, ox, oy, oz) {
    const c = COS(b.yaw) * SD_SCALE;
    const s = SIN(b.yaw) * SD_SCALE;
    return [b.x + ox * c + oz * s, b.y + oy * SD_SCALE, b.z - ox * s + oz * c];
  }
  wb(b, wx, wy, wz) {
    const c = COS(b.yaw) / SD_SCALE;
    const s = SIN(b.yaw) / SD_SCALE;
    const dx = wx - b.x;
    const dz = wz - b.z;
    return [dx * c - dz * s, (wy - b.y) / SD_SCALE, dx * s + dz * c];
  }

  // ¿Está este punto dentro del casco o de la torre?
  ib(b, wx, wy, wz, pad) {
    const [lx, ly, lz] = this.wb(b, wx, wy, wz);
    if (lz > SD_NOSE + pad || lz < SD_REAR - pad) return false;
    const k = (SD_NOSE - lz) / (SD_NOSE - SD_REAR);
    if (ABS(lx) < SD_HALF_W * k + pad && ly > SD_RIDGE * k - pad && ly < SD_KEEL * k + pad) return true;
    return ABS(lx) < 90 + pad && ly > -175 - pad && ly < -60 && lz < -240 + pad;
  }

  // Un punto débil puede recibir daño si está vivo y, en el caso del puente,
  // si ya cayeron los dos domos que lo escudan
  bo(b, pt) {
    if (pt.hp <= 0) return false;
    if (pt.kind !== 'bridge') return true;
    return !b.parts.some((q) => q.kind === 'dome' && q.hp > 0);
  }

  ba(b, f) {
    let best = null;
    let bestDot = -2;
    for (const pt of b.parts) {
      if (!this.bo(b, pt)) continue;
      const [wx, wy, wz] = this.bw(b, pt.ox, pt.oy, pt.oz);
      const d = HYP(wx - this.pos.x, wy - this.pos.y, wz - this.pos.z) || 1;
      const dot = ((wx - this.pos.x) * f.x + (wy - this.pos.y) * f.y + (wz - this.pos.z) * f.z) / d;
      if (dot > bestDot) {
        bestDot = dot;
        best = pt;
      }
    }
    return best;
  }

  // Daño a una pieza del destructor. Cae el puente, cae el destructor.
  bp(b, pt, n) {
    if (!this.bo(b, pt)) return;
    pt.hp -= n;
    b.ft = 0.06;
    pt.ft = 0.1;
    const [wx, wy, wz] = this.bw(b, pt.ox, pt.oy, pt.oz);
    if (pt.hp > 0) {
      this.bx.push({ wx, wy, wz, t: 0.3 });
      return;
    }
    this.bx.push({ wx, wy, wz, t: 0, big: true });
    this.sy(wx, wy, wz, 8);
    Sfx.boom();
    if (pt.kind === 'turret') {
      this.ad(60);
      this.dp(wx, wy, wz, 0.6);
    } else if (pt.kind === 'dome') {
      this.ad(150);
      this.say(b.parts.some((q) => q.kind === 'dome' && q.hp > 0) ? 'DOME DOWN.' : 'HIT THE BRIDGE.');
      b.tpAt = 0.7; // perder un domo lo hace saltar a otro punto del anillo
    } else {
      this.kb(b);
    }
  }

  ub(b, dx, dz, dist, dt) {
    // La escena (entrada, y cada teletransporte en versión corta): el
    // sector se APAGA con las letras contando qué pasa, el destructor
    // aparece DE GOLPE en el negro con el flash, y suelta una lluvia de
    // cohetes que sube alto, se abre en direcciones distintas y después
    // se curva hacia ti mientras vuelve la luz.
    if (b.cine) {
      b.cineT += dt;
      const ct = b.cineT;
      const S = b.short ? 0.5 : 1;
      b.cineDark = ct < 1.2 * S ? ct / (1.2 * S) : ct < 4.4 * S ? 1 : MAX(0, 1 - (ct - 4.4 * S) / (1.8 * S));
      if (b.hd && ct >= 1.2 * S) {
        b.hd = 0;
        this.flash.setAlpha(0.7);
        this.tweens.add({ targets: this.flash, alpha: 0, duration: 700 });
        this.sh = 12;
        Sfx.boom();
        this.say(b.short ? "IT'S BACK." : 'DESTROYER AHEAD.');
      }
      if (!b.hd && ct > 1.5 * S && ct < 4.1 * S) {
        b.salvoAt -= dt;
        if (b.salvoAt <= 0) {
          b.salvoAt = 0.26;
          if (!b.salvoSaid && !b.short) {
            b.salvoSaid = 1;
            this.say('SALVO INBOUND.');
          }
          // la salva se abre en espiral (ángulo áureo), sube LENTA con su
          // columna de estela — y uno de cada cuatro es un dardo: sube poco
          // y se lanza rapidísimo, para esquivarlo en el último segundo
          const n = (b.sN = (b.sN || 0) + 1);
          const ang = n * 2.4;
          const fast = n % 4 === 3;
          const [wx, wy, wz] = this.bw(b, (RND() - 0.5) * 160, -175, -330);
          const P = this.pos;
          const mk = 0.45 + RND() * 0.3;
          this.en.push({
            k: 'emis', x: wx, y: wy, z: wz, r: 22, hp: 1, t: 0, yaw: 0,
            vx: COS(ang) * (260 + RND() * 300),
            vy: -(fast ? 260 : (300 + RND() * 180)) * (b.short ? 0.7 : 1),
            vz: SIN(ang) * (260 + RND() * 300),
            rise: (fast ? 0.6 : 2.2 + RND() * 1.2) * (b.short ? 0.6 : 1),
            fast,
            mid: fast ? 0 : 1,
            gx: b.x + (P.x - b.x) * mk + (RND() - 0.5) * 700,
            gy: P.y + (RND() - 0.5) * 300,
            gz: b.z + (P.z - b.z) * mk + (RND() - 0.5) * 700,
            life: 18,
          });
          if (RND() < 0.35) Sfx.missile();
        }
      }
      if (ct > 6.4 * S) {
        b.cine = 0;
        b.cineDark = 0;
      }
      return;
    }

    // cada domo que pierde lo saca del apuro: salto corto a otro punto del
    // anillo — desaparece, letras, y reaparece al otro lado con salva
    if (b.tpAt > 0) {
      b.tpAt -= dt;
      if (b.tpAt <= 0) {
        for (const e2 of this.en) {
          if (e2.k === 'emis') {
            e2.dead = true;
            this.bm(e2);
          }
        }
        const ta = RND() * PI * 2;
        b.x = this.pos.x + SIN(ta) * 1700;
        b.z = this.pos.z + COS(ta) * 1700;
        b.y = CLP(this.pos.y, -400, 400);
        b.yaw = AT2(this.pos.x - b.x, this.pos.z - b.z);
        b.hd = 1;
        b.short = 1;
        b.cine = 1;
        b.cineT = 0;
        b.salvoAt = 0;
        Sfx.jump();
        this.say('IT JUMPED.');
        return;
      }
    }
    for (const pt of b.parts) if (pt.ft) pt.ft -= dt;
    // gira lento para ponerte la proa — más lento que tu órbita, así ganarle
    // la espalda es cuestión de volar. Avanza si te alejas, nunca retrocede,
    // y no se deja arrastrar lejos del centro del sector.
    b.yaw += AWR(AT2(dx, dz) - b.yaw) * MIN(1, 0.11 * dt);
    const move = dist > 1900 ? 90 : 0;
    b.x += SIN(b.yaw) * move * dt;
    b.z += COS(b.yaw) * move * dt;
    b.y += SIN(b.t * 0.4) * 6 * dt;

    // torretas: ráfagas de tres, lentas y esquivables — pero son seis
    for (const pt of b.parts) {
      if (pt.kind !== 'turret' || pt.hp <= 0 || dist > 2600) continue;
      pt.fireAt -= dt;
      if (pt.burst > 0 && pt.fireAt <= 0) {
        pt.burst--;
        pt.fireAt = pt.burst ? 0.2 : 4.6 + RND() * 1.8;
        const [wx, wy, wz] = this.bw(b, pt.ox, pt.oy - 30, pt.oz);
        this.sa({ x: wx, y: wy, z: wz }, SHOT_SPEED);
      } else if (pt.burst === 0 && pt.fireAt <= 0) pt.burst = 2;
    }

    // el hangar suelta interceptores
    b.ha -= dt;
    if (b.ha <= 0) {
      b.ha = 16;
      if (this.en.filter((e) => e.k === 'inter').length < 4) {
        const [wx, wy, wz] = this.bw(b, 0, SD_KEEL + 30, -100);
        this.en.push({ k: 'inter', x: wx, y: wy, z: wz, r: 22 * HUNTER_SCALE, hp: 2, t: 0, yaw: b.yaw, vx: 0, vy: 120, vz: 0 });
      }
    }

    // la torre suelta una pareja de misiles que te persiguen
    b.ma -= dt;
    if (b.ma <= 0 && dist < 2600) {
      b.ma = 12;
      for (const side of [-1, 1]) {
        const [wx, wy, wz] = this.bw(b, side * 60, -170, -330);
        const [ox, , oz] = this.bw(b, side * 400, 0, -330);
        const vx = (ox - b.x) * 0.3;
        const vz = (oz - b.z) * 0.3;
        this.en.push({ k: 'emis', x: wx, y: wy, z: wz, r: 22, hp: 1, t: 0, yaw: 0, vx, vy: -160, vz, life: 9 });
      }
      Sfx.missile();
    }

    // el cañón de proa: carga a la vista y suelta una esfera enorme y lenta
    if (b.cg > 0) {
      b.cg -= dt;
      if (b.cg <= 0) {
        const [wx, wy, wz] = this.bw(b, 0, 10, SD_NOSE);
        this.sa({ x: wx, y: wy, z: wz }, 190, true);
        this.sh = 6;
        Sfx.missile();
      }
    } else {
      b.ca -= dt;
      if (b.ca <= 0 && dist < 2800) {
        b.ca = 14;
        b.cg = 1.8;
      }
    }
  }

  kb(b) {
    b.dead = true;
    this.boss = null;
    for (let i = 0; i < 9; i++) {
      const [wx, wy, wz] = this.bw(b, (RND() - 0.5) * 400, (RND() - 0.7) * 150, SD_REAR + RND() * 900);
      this.bx.push({ wx, wy, wz, t: -i * 0.12, big: true });
    }
    this.sy(b.x, b.y, b.z, 24);
    this.sh = 16;
    this.score += 1500;
    Sfx.boom();
    this.bossN++;
    this.bq = 50; // el siguiente ya viene
    this.say('DESTROYER DOWN. +1500');
  }

  ad(pts) {
    this.score += pts * this.mu;
    if (this.mt > 0) this.mu = MIN(5, this.mu + 1);
    else this.mu = 2;
    this.mt = 4;
  }

  dp(x, y, z, chance) {
    if (RND() > chance) return;
    const subs = ['shield', 'hull', 'hull', 'twin', 'missile', 'missile'];
    this.en.push({
      k: 'pow',
      sub: subs[FLR(RND() * subs.length)],
      x, y, z,
      r: 20,
      t: 0,
      yaw: 0,
      life: 14,
    });
  }

  sy(x, y, z, n) {
    for (let i = 0; i < n; i++) {
      const a1 = RND() * PI * 2;
      const a2 = (RND() - 0.5) * PI;
      const sp = 120 + RND() * 240;
      this.sz.push({
        x, y, z,
        vx: SIN(a1) * COS(a2) * sp,
        vy: SIN(a2) * sp,
        vz: COS(a1) * COS(a2) * sp,
        life: 0.5 + RND() * 0.3,
      });
    }
  }

  // --- la nave: tuya, libre ---
  fw() {
    return this.F;
  }

  up(time, dt) {
    // la entrada del destructor es una escena: motores al mínimo, sin dash
    // ni nitro, y la nave se NIVELA Y ENCUADRA al destructor sola — lo ves
    // de lado, entero, y recuperas el mando cuando la luz vuelve
    const sceneHold = this.boss && this.boss.cine;
    if (sceneHold) {
      const b = this.boss;
      // encuadra 500 POR ENCIMA del casco: el destructor queda en cuadro,
      // y al volver el mando tu rumbo pasa limpio sobre la torre en vez de
      // estamparte contra la proa
      const to = vnorm({ x: b.x - this.pos.x, y: b.y - 500 - this.pos.y, z: b.z - this.pos.z });
      const k = MIN(1, 2.2 * dt);
      const [F, U, R] = orthoBasis(vmix(this.F, 1 - k, to, k), vmix(this.U, 1 - k, WORLD_UP, k));
      this.F = F;
      this.U = U;
      this.R = R;
      this.yv = 0;
      this.pv = 0;
    }

    const turn = sceneHold ? 0 : (held.P1_R ? 1 : 0) - (held.P1_L ? 1 : 0);
    const pit = sceneHold ? 0 : (held.P1_U ? 1 : 0) - (held.P1_D ? 1 : 0); // arriba = nariz arriba

    // B4/B6: el escudo se QUEDA — hasta que lo apagues tú con otro toque,
    // o hasta que se consuma solo; apagarlo temprano recarga antes
    if (pressed.P1_4 || pressed.P1_6) {
      if (time < this.su) {
        this.su = time;
        this.sw = time + SHIELD_COOLDOWN_MS;
      } else if (time >= this.sw) {
        this.su = time + SHIELD_MS;
        this.sw = time + SHIELD_MS + SHIELD_COOLDOWN_MS;
        Sfx.shieldUp();
      }
    }

    // cabeceo sobre el ala de la nave: arriba es arriba de la pantalla aun de cabeza
    this.yv += (turn * YAW_RATE - this.yv) * MIN(1, YAW_EASE * dt);
    this.pv += (pit * PITCH_RATE - this.pv) * MIN(1, YAW_EASE * dt);
    const pa = this.pv * dt;
    const ya = this.yv * dt;
    let F = vmix(this.F, COS(pa), this.U, SIN(pa));
    let U = vmix(this.U, COS(pa), this.F, -SIN(pa));
    // Turning happens around the sector's vertical while the ship is roughly
    // upright (or inverted), like a banked aircraft: the view pans and never
    // rolls, so the sky stays put. Near vertical there is no sensible
    // "vertical", so it falls back to the ship's own axis.
    const upness = vdot(U, WORLD_UP);
    if (ABS(upness) > 0.25) {
      const A = upness > 0 ? WORLD_UP : { x: 0, y: 1, z: 0 };
      F = rotAxis(F, A, -ya);
      U = rotAxis(U, A, -ya);
    } else F = vmix(F, COS(ya), vcross(F, U), SIN(ya));
    let R;
    [F, U, R] = orthoBasis(F, U);

    // Stick suelto: la nave rota SOLO sobre su eje hasta quedar derecha.
    // No baja la nariz ni cambia el rumbo — sigue volando a donde apuntaba.
    if (!pit) {
      const up = vdot(F, WORLD_UP);
      if (ABS(up) < 0.97) {
        const D = vnorm(vmix(WORLD_UP, 1, F, -up));
        const phi = AT2(vdot(F, vcross(U, D)), vdot(U, D));
        const th = Math.sign(phi) * MIN(ABS(phi), ROLL_LEVEL * dt);
        [F, U, R] = orthoBasis(F, vmix(U, COS(th), R, SIN(th)));
      }
    }
    this.F = F;
    this.U = U;
    this.R = R;

    // B2: cada toque es un dash — un tirón hacia adelante, intocable un
    // instante. Mantenido es nitro: la nave acelera sin parar mientras dure la
    // reserva, y a esa velocidad embistes a los cazadores.
    if (!sceneHold && pressed.P1_2 && this.bz >= DASH_COST) {
      this.bz -= DASH_COST;
      this.sp = MAX(this.sp, this.cu) + DASH_KICK;
      this.du = time + DASH_INVULN_MS;
      Sfx.dash();
    }
    if (sceneHold) {
      this.bz = MIN(BOOST_MAX, this.bz + BOOST_REGEN * dt);
      this.sp += (25 - this.sp) * MIN(1, 4 * dt);
    } else if (held.P1_2 && this.bz > 0) {
      this.bz = MAX(0, this.bz - BOOST_DRAIN * dt);
      this.sp = MIN(NITRO_MAX, this.sp + NITRO_ACCEL * dt);
    } else {
      if (!held.P1_2) this.bz = MIN(BOOST_MAX, this.bz + BOOST_REGEN * dt);
      this.sp += (this.cu - this.sp) * MIN(1, SPEED_EASE * dt);
    }

    // cerca del destructor la pasada se frena sola (salvo con nitro):
    // giras antes, lo pierdes de vista menos, la pelea se queda contigo
    if (this.boss && !sceneHold && !held.P1_2 && this.sp > 190) {
      const bd2 = HYP(this.boss.x - this.pos.x, this.boss.y - this.pos.y, this.boss.z - this.pos.z);
      if (bd2 < 700) this.sp += (190 - this.sp) * MIN(1, 1 * dt);
    }

    const f = this.fw();
    this.pos.x += f.x * this.sp * dt;
    this.pos.y += f.y * this.sp * dt;
    this.pos.z += f.z * this.sp * dt;

    // el borde del sector te devuelve, suave — pero hacia abajo no hay borde:
    // abajo está el agujero negro, y él pone el límite

    // el agujero negro: cuanto más bajas, más tira — y muy abajo, te traga
    const bhd = BH_Y - this.pos.y;
    if (bhd < BH_GRIP) {
      // el agarre: un jalón que el crucero no vence — sales con dash o nitro
      this.pos.y += 400 * dt;
      this.sh = MAX(this.sh, 6);
      if (this.ep > this.wa) {
        this.wa = this.ep + 2.5;
        this.say('IT HAS YOU — DASH.');
      }
    } else if (bhd < BH_PULL) {
      const k = 1 - bhd / BH_PULL;
      this.pos.y += k * k * 620 * dt;
      this.sh = MAX(this.sh, k * 4);
      if (this.ep > this.wa) {
        this.wa = this.ep + 4;
        this.say('BLACK HOLE — CLIMB.');
      }
    }
    // el horizonte de sucesos no negocia: ni el escudo ni el modo prueba
    if (bhd < BH_KILL) this.die();

    // alabeo con el giro
    const bank = this.yv * 0.34;
    this.roll += (bank - this.roll) * MIN(1, 8 * dt);

    // B1: cañón — sale de la nariz, hereda tu velocidad (doble con la mejora)
    if (held.P1_1 && time >= this.fy) {
      this.fy = time + FIRE_MS;
      this.mz2 = 0.05;
      Sfx.fire();
      const sp = BOLT_SPEED + this.sp;
      const twin = time < this.tl;
      const R = this.R;
      // contra el destructor, el cañón corrige hacia el punto débil abierto
      // que tengas casi de frente — pegarle es cuestión de apuntar cerca
      let aim = f;
      if (this.boss) {
        const pt = this.ba(this.boss, f);
        if (pt) {
          const [wx, wy, wz] = this.bw(this.boss, pt.ox, pt.oy, pt.oz);
          const to = vnorm({ x: wx - this.pos.x, y: wy - this.pos.y, z: wz - this.pos.z });
          if (vdot(to, f) > 0.96) aim = to;
        }
      }
      for (const off of twin ? [-9, 9] : [0]) {
        this.bl.push({
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
      this.ar += dt;
      if (this.ar >= MISSILE_REGEN) {
        this.ar = 0;
        this.ammo++;
        Sfx.ammo();
      }
    } else this.ar = 0;

    // B3: misil — busca el blanco más alineado con tu nariz; contra el
    // destructor apunta al punto débil vivo más a tiro
    if (pressed.P1_3 && this.ammo > 0) {
      this.ammo--;
      Sfx.missile();
      const target = this.bt(f);
      this.ms.push({
        x: this.pos.x + f.x * 26 - this.U.x * 6,
        y: this.pos.y + f.y * 26 - this.U.y * 6,
        z: this.pos.z + f.z * 26 - this.U.z * 6,
        vx: f.x * MISSILE_SPEED,
        vy: f.y * MISSILE_SPEED,
        vz: f.z * MISSILE_SPEED,
        target,
        part: target && target.k === 'boss' ? this.ba(target, f) : null,
        tr: [],
        life: 5,
      });
    }
  }

  bt(f) {
    let best = null;
    let bestDot = 0.75; // solo lo que ya tienes bastante de frente
    for (const e of this.en) {
      if (e.k === 'scrap' || e.k === 'pow' || e.dead) continue;
      const dx = e.x - this.pos.x;
      const dy = e.y - this.pos.y;
      const dz = e.z - this.pos.z;
      const d = HYP(dx, dy, dz);
      if (d > (e.k === 'boss' ? 2600 : 1700)) continue;
      // el destructor es enorme: cuenta como "de frente" aunque su centro no lo esté
      const dot = (dx * f.x + dy * f.y + dz * f.z) / MAX(d, 1) + (e.k === 'boss' ? 0.45 : 0);
      if (dot > bestDot) {
        bestDot = dot;
        best = e;
      }
    }
    return best;
  }

  // La muerte: una sola, para todo lo que mata de un golpe
  die() {
    if (this.fz === 'out' || (this.boss && this.boss.cine)) return;
    this.fz = 'out';
    this.bx.push({ wx: this.pos.x, wy: this.pos.y, wz: this.pos.z, t: 0, big: true });
    this.sh = 14;
    Sfx.boom();
    this.time.delayedCall(1400, () => this.scene.start('over', { win: false, score: this.score }));
  }

  hy(time) {
    if (this.fz === 'out' || (this.boss && this.boss.cine)) return;
    if (time < this.su) {
      // la burbuja se lleva el golpe: se ve dónde pegó
      this.ht = 0.3;
      return;
    }
    if (time < this.iu || time < this.du) return;
    this.iu = time + 2000;
    this.sh = 9;
    Sfx.hurt();
    if (this.shield) {
      // el escudo se lleva el golpe
      this.shield = false;
      return;
    }
    if (GOD) return; // modo prueba: duele, pero no mata
    this.hull--;
    if (this.hull <= 0) this.die();
  }

  // --- el sector ---
  ue(time, dt) {
    const P = this.pos;

    for (const e of this.en) {
      e.t += dt;
      if (e.ft) e.ft -= dt;
      const dx = P.x - e.x;
      const dy = P.y - e.y;
      const dz = P.z - e.z;
      const dist = HYP(dx, dy, dz);

      if (e.k === 'drone') {
        // se acerca y te orbita a distancia de tiro: perseguirlo es pilotar
        const want = 460;
        const radial = CLP((dist - want) / 200, -1, 1) * 240;
        const tx = dz / dist;
        const tz = -dx / dist;
        e.vx += ((dx / dist) * radial + tx * e.orbit * 170 - e.vx) * MIN(1, 1.5 * dt);
        e.vy += ((dy / dist) * radial - e.vy) * MIN(1, 1.5 * dt);
        e.vz += ((dz / dist) * radial + tz * e.orbit * 170 - e.vz) * MIN(1, 1.5 * dt);
        e.x += e.vx * dt;
        e.y += e.vy * dt;
        e.z += e.vz * dt;
        e.yaw = AT2(dx, dz);
        e.fireAt -= dt;
        if (e.fireAt <= 0 && dist < 1000) {
          e.fireAt = DRONE_FIRE;
          this.sa(e, SHOT_SPEED);
        }
      } else if (e.k === 'inter') {
        // el interceptor toma carrerilla, embiste y pasa de largo
        if (dist > 420 || e.t < 0.5) {
          const k = MIN(1, 2.2 * dt);
          e.vx += ((dx / dist) * 430 - e.vx) * k;
          e.vy += ((dy / dist) * 430 - e.vy) * k;
          e.vz += ((dz / dist) * 430 - e.vz) * k;
        }
        e.x += e.vx * dt;
        e.y += e.vy * dt;
        e.z += e.vz * dt;
        e.yaw = AT2(e.vx, e.vz);
      } else if (e.k === 'emis') {
        // misil del destructor: te sigue, pero gira mal — un giro cerrado,
        // el escudo o el nitro lo dejan atrás; también se puede derribar.
        // Los de la salva primero SUBEN en columna y luego se curvan a ti.
        if (e.rise > 0) {
          e.rise -= dt;
        } else {
          // el dardo va al doble de velocidad pero gira peor: te roza y
          // vuelve a intentarlo. Los de la cortina caen primero a su punto
          // del corredor, y desde ahí sí te buscan.
          let tx = dx;
          let ty = dy;
          let tz = dz;
          let dd = dist;
          if (e.mid) {
            tx = e.gx - e.x;
            ty = e.gy - e.y;
            tz = e.gz - e.z;
            dd = HYP(tx, ty, tz) || 1;
            if (dd < 180) e.mid = 0;
          }
          const spd = e.fast ? 640 : 300;
          const k = MIN(1, (e.fast ? 0.55 : 0.9) * dt);
          e.vx += ((tx / dd) * spd - e.vx) * k;
          e.vy += ((ty / dd) * spd - e.vy) * k;
          e.vz += ((tz / dd) * spd - e.vz) * k;
        }
        e.x += e.vx * dt;
        e.y += e.vy * dt;
        e.z += e.vz * dt;
        e.life -= dt;
        if (e.life <= 0) {
          e.dead = true;
          this.bm(e);
        }
      } else if (e.k === 'boss') {
        this.ub(e, dx, dz, dist, dt);
      } else if (e.k === 'pow') {
        e.life -= dt;
        if (e.life <= 0) e.dead = true;
      } else if (e.k === 'sentry') {
        if (dist > 4200) e.dead = true; // quedó atrás: el mundo viaja contigo
        e.yaw += 0.5 * dt; // gira, vigilando
        e.y += SIN(e.t * 1.1) * 8 * dt;
        e.fireAt -= dt;
        if (dist < 1000 && e.fireAt <= 0) {
          e.fireAt = 3.2;
          this.sa(e, SHOT_SPEED);
        }
      } else if (e.k === 'rock') {
        e.x += e.vx * dt;
        e.y += e.vy * dt;
        e.z += e.vz * dt;
        if (dist > 2600) {
          const ang = RND() * PI * 2;
          e.x = P.x + SIN(ang) * 1600;
          e.y = P.y + (RND() - 0.5) * 900;
          e.z = P.z + COS(ang) * 1600;
        }
      }

      // lo que se mueve deja estela: se lee hacia dónde va
      if (e.vx !== undefined && e.k !== 'rock') {
        e.tt = (e.tt || 0) + dt;
        if (e.tt > 0.05) {
          e.tt = 0;
          (e.tr = e.tr || []).push([e.x, e.y, e.z]);
          if (e.tr.length > (e.k === 'emis' ? 26 : 12)) e.tr.shift();
        }
      }

      // la chatarra lejana se recicla delante de ti — mundo sin bordes
      if (e.k === 'scrap' && dist > 3400) {
        const ang2 = RND() * PI * 2;
        e.x = P.x + SIN(ang2) * (900 + RND() * 1200);
        e.y = P.y + (RND() - 0.5) * 900;
        e.z = P.z + COS(ang2) * (900 + RND() * 1200);
      }
      // lo recogible viene hacia ti cuando pasas cerca
      if ((e.k === 'scrap' || e.k === 'pow') && dist < MAGNET_R) {
        const pull = (560 * dt) / dist;
        e.x += dx * pull;
        e.y += dy * pull;
        e.z += dz * pull;
      }

      // contra el destructor chocas con su casco, no con una esfera — y
      // estrellarse contra un kilómetro de acero no se sobrevive: ni el
      // escudo ni el modo prueba te salvan de esa
      if (e.k === 'boss') {
        // primero el AVISO — rozar el casco grita PULL UP.; morir queda
        // para incrustarse de verdad, no para pasar cerca
        if (!e.hd && this.ib(e, P.x, P.y, P.z, 150)) {
          if (this.ib(e, P.x, P.y, P.z, 16)) this.die();
          else {
            this.sh = MAX(this.sh, 5);
            if (this.ep > this.wa) {
              this.wa = this.ep + 1.5;
              this.say('PULL UP.');
            }
          }
        }
        continue;
      }

      // contacto contigo
      if (!e.dead && dist < e.r + 16) {
        if (e.k === 'scrap') {
          e.dead = true;
          this.score += 10;
          this.sq++;
          if (this.sq >= SCRAP_PER_MISSILE && this.ammo < MISSILE_MAX) {
            this.sq = 0;
            this.ammo++;
            this.say('+1 MISSILE.');
            Sfx.ammo();
          } else {
            if (!this.sqSaid) {
              this.sqSaid = 1;
              this.say('SCRAP +10 — 3 MAKE A MISSILE.');
            }
            Sfx.pickup();
          }
        } else if (e.k === 'pow') {
          e.dead = true;
          Sfx.ammo();
          this.say(POW_NAMES[e.sub]);
          if (e.sub === 'shield') this.shield = true;
          else if (e.sub === 'hull') this.hull = MIN(HULL_MAX, this.hull + 1);
          else if (e.sub === 'missile') this.ammo = MIN(MISSILE_MAX, this.ammo + 2);
          else this.tl = time + 12000;
        } else if (
          (this.sp > RAM_SPEED || time < this.du || time < this.su) &&
          (e.k === 'drone' || e.k === 'inter' || e.k === 'emis')
        ) {
          // a toda velocidad — o con dash o escudo — la nave es el arma
          this.damage(e, 99);
          this.sh = 7;
        } else if (e.k === 'drone' || e.k === 'inter') {
          // metal contra metal: el caza estalla y tú pierdes UN casco —
          // morir de un toque contra algo tan pequeño no era justo, y las
          // emboscadas lo convertían en ejecución
          this.damage(e, 99);
          this.hy(time);
        } else {
          if (e.k !== 'sentry' && e.k !== 'boss') e.dead = true;
          this.bm(e);
          this.hy(time);
        }
      }
    }

    // disparos enemigos — el escudo activo los deshace contra la burbuja
    const shieldOn = time < this.su;
    for (const s of this.ss) {
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.z += s.vz * dt;
      s.life -= dt;
      const d = HYP(P.x - s.x, P.y - s.y, P.z - s.z);
      if (shieldOn && d < SHIELD_R + (s.big ? 40 : 0)) {
        s.dead = true;
        this.ht = 0.3;
        this.bx.push({ wx: s.x, wy: s.y, wz: s.z, t: 0.32 });
        continue;
      }
      if (d < (s.big ? 60 : 22)) {
        s.dead = true;
        this.hy(time);
      }
    }

    // tus disparos contra el sector
    for (const b of this.bl) {
      if (this.boss && !this.boss.hd && this.boltVsBoss(this.boss, b)) continue;
      for (const e of this.en) {
        if (e.dead || e.k === 'scrap' || e.k === 'pow' || e.k === 'boss') continue;
        const d = HYP(b.x - e.x, b.y - e.y, b.z - e.z);
        if (d < e.r + 10) {
          b.dead = true;
          this.damage(e, 1, b.x, b.y, b.z);
          break;
        }
      }
    }

    // los fragmentos vuelan y se apagan
    for (const s of this.sz) {
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.z += s.vz * dt;
      s.life -= dt;
    }
    this.sz = this.sz.filter((s) => s.life > 0);

    for (const bm of this.bx) bm.t += dt;
    this.en = this.en.filter((e) => !e.dead);
    this.ss = this.ss.filter((s) => !s.dead && s.life > 0);
    this.bx = this.bx.filter((b) => b.t < 0.5);
  }

  // Un disparo tuyo contra el destructor: pega en un punto débil, o el casco
  // se lo traga con una chispa. Devuelve true si el disparo se consumió.
  boltVsBoss(boss, b) {
    for (const pt of boss.parts) {
      if (pt.hp <= 0) continue;
      const [wx, wy, wz] = this.bw(boss, pt.ox, pt.oy, pt.oz);
      if (HYP(b.x - wx, b.y - wy, b.z - wz) < SD_PART_R[pt.kind]) {
        b.dead = true;
        if (this.bo(boss, pt)) this.bp(boss, pt, 1);
        else this.bx.push({ wx: b.x, wy: b.y, wz: b.z, t: 0.35 });
        return true;
      }
    }
    if (this.ib(boss, b.x, b.y, b.z, 0)) {
      b.dead = true;
      this.bx.push({ wx: b.x, wy: b.y, wz: b.z, t: 0.38 });
      return true;
    }
    return false;
  }

  damage(e, n) {
    e.hp -= n;
    e.ft = 0.08;
    if (e.hp > 0) {
      this.bx.push({ wx: e.x, wy: e.y, wz: e.z, t: 0.3 });
      return;
    }
    e.dead = true;
    // la última nave de la emboscada paga SIEMPRE: así se aprende que
    // matarlas es lo que da los poderes
    if (e.wv) {
      e.wv = 0;
      if (--this.wvN <= 0) {
        this.say('WAVE CLEAR.');
        this.ad(100);
        this.dp(e.x, e.y, e.z, 1);
      }
    }
    this.bm(e);
    this.sy(e.x, e.y, e.z, 6);
    this.ad(e.k === 'sentry' ? 40 : e.k === 'rock' ? 15 : 25);
    if (e.k === 'drone' || e.k === 'inter') this.dp(e.x, e.y, e.z, 0.35);
    Sfx.boom();
    if (e.k === 'rock' && e.r > 20) {
      for (let i = 0; i < 2; i++) {
        this.en.push({
          k: 'rock', x: e.x, y: e.y, z: e.z, r: 18, hp: 1, t: 0, yaw: 0, model: ROCK_POOL[FLR(RND() * 4)],
          spin: (RND() - 0.5) * 3,
          vx: (RND() - 0.5) * 120,
          vy: (RND() - 0.5) * 80,
          vz: (RND() - 0.5) * 120,
        });
      }
    }
  }

  sa(e, sp, big) {
    // el fogonazo marca de dónde sale — se ve quién te dispara
    this.bx.push({ wx: e.x, wy: e.y, wz: e.z, t: 0.28, muzzle: true });
    // apunta a donde VAS a estar, no a donde estás
    const t = HYP(this.pos.x - e.x, this.pos.y - e.y, this.pos.z - e.z) / sp;
    const f = this.fw();
    const tx = this.pos.x + f.x * this.sp * t * 0.7;
    const ty = this.pos.y + f.y * this.sp * t * 0.7;
    const tz = this.pos.z + f.z * this.sp * t * 0.7;
    const dx = tx - e.x;
    const dy = ty - e.y;
    const dz = tz - e.z;
    const m = HYP(dx, dy, dz);
    this.ss.push({
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

  bm(e) {
    this.bx.push({ wx: e.x, wy: e.y, wz: e.z, t: 0 });
  }

  ux(dt) {
    for (const b of this.bl) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.z += b.vz * dt;
      b.life -= dt;
    }
    this.bl = this.bl.filter((b) => !b.dead && b.life > 0);
  }

  um(dt) {
    for (const m of this.ms) {
      const t = m.target;
      if (t && !t.dead) {
        // corrige el rumbo hacia el blanco — contra el destructor, hacia su punto débil
        let [tx, ty, tz] = [t.x, t.y, t.z];
        let hitR = t.r + 16;
        if (m.part && m.part.hp > 0) {
          [tx, ty, tz] = this.bw(t, m.part.ox, m.part.oy, m.part.oz);
          hitR = SD_PART_R[m.part.kind];
        }
        const dx = tx - m.x;
        const dy = ty - m.y;
        const dz = tz - m.z;
        const d = HYP(dx, dy, dz);
        const k = MIN(1, MISSILE_TURN * dt);
        m.vx += ((dx / d) * MISSILE_SPEED - m.vx) * k;
        m.vy += ((dy / d) * MISSILE_SPEED - m.vy) * k;
        m.vz += ((dz / d) * MISSILE_SPEED - m.vz) * k;
        if (d < hitR) this.dn(m);
      }
      if (!m.dead && this.boss && !this.boss.hd && this.ib(this.boss, m.x, m.y, m.z, 0)) this.dn(m);
      m.tr.push([m.x, m.y, m.z]);
      if (m.tr.length > 14) m.tr.shift();
      m.x += m.vx * dt;
      m.y += m.vy * dt;
      m.z += m.vz * dt;
      m.life -= dt;
    }
    this.ms = this.ms.filter((m) => !m.dead && m.life > 0);
  }

  // El misil estalla: golpe fuerte al blanco y a todo lo que esté cerca
  dn(m) {
    m.dead = true;
    this.bx.push({ wx: m.x, wy: m.y, wz: m.z, t: 0, big: true, r: MISSILE_SPLASH });
    this.sh = MAX(this.sh, 5);
    Sfx.boom();
    const boss = this.boss;
    if (boss) {
      for (const pt of boss.parts) {
        const [wx, wy, wz] = this.bw(boss, pt.ox, pt.oy, pt.oz);
        if (pt === m.part || HYP(m.x - wx, m.y - wy, m.z - wz) < MISSILE_SPLASH) {
          this.bp(boss, pt, pt === m.part ? MISSILE_DMG - 1 : 1);
        }
      }
    }
    for (const e of this.en) {
      if (e.dead || e.k === 'boss' || e.k === 'scrap' || e.k === 'pow') continue;
      const d = HYP(m.x - e.x, m.y - e.y, m.z - e.z);
      if (e === m.target || d < MISSILE_SPLASH + e.r) this.damage(e, e === m.target ? MISSILE_DMG : 2);
    }
  }

  // La cámara hereda la base de la nave con un pelo de retraso — incluida la
  // inclinación, así la pantalla siempre coincide con el stick
  uc(dt) {
    const k = MIN(1, 8 * dt);
    [this.camF, this.camU, this.camR] = orthoBasis(vmix(this.camF, 1 - k, this.F, k), vmix(this.camU, 1 - k, this.U, k));
    if (this.sh > 0) this.sh = MAX(0, this.sh - 34 * dt);
  }

  // --- proyección mundo → pantalla ---
  cam() {
    const F = this.camF;
    const U = this.camU;
    const back = CAM_BACK + MAX(0, this.sp - this.cu) * 0.09; // con nitro la cámara se queda atrás
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

  pj(cm, wx, wy, wz) {
    const d = { x: wx - cm.x, y: wy - cm.y, z: wz - cm.z };
    const cz = vdot(d, cm.F);
    if (cz < NEAR) return null;
    const shx = this.sh ? (RND() - 0.5) * this.sh : 0;
    const shy = this.sh ? (RND() - 0.5) * this.sh : 0;
    return [CX + (vdot(d, cm.R) * FOCAL) / cz + shx, CY - (vdot(d, cm.U) * FOCAL) / cz + shy, cz];
  }

  // Una dirección del cielo (infinitamente lejos): solo gira con la cámara
  pd(cm, v) {
    const cz = vdot(v, cm.F);
    if (cz < 0.08) return null;
    return [CX + (vdot(v, cm.R) * FOCAL) / cz, CY - (vdot(v, cm.U) * FOCAL) / cz];
  }

  wl(g, cm, a, b) {
    let pa = this.pj(cm, a[0], a[1], a[2]);
    let pb = this.pj(cm, b[0], b[1], b[2]);
    if (!pa && !pb) return;
    if (!pa || !pb) {
      const [va, vb] = pa ? [a, b] : [b, a];
      const cza = this.czOf(cm, va[0], va[1], va[2]);
      const czb = this.czOf(cm, vb[0], vb[1], vb[2]);
      const t = (cza - NEAR - 0.01) / (cza - czb);
      const mx = va[0] + (vb[0] - va[0]) * t;
      const my = va[1] + (vb[1] - va[1]) * t;
      const mz = va[2] + (vb[2] - va[2]) * t;
      pa = this.pj(cm, va[0], va[1], va[2]);
      pb = this.pj(cm, mx, my, mz);
      if (!pa || !pb) return;
    }
    ln(g, pa[0], pa[1], pb[0], pb[1]);
  }

  fg(dist) {
    return CLP(1.25 - dist / 2600, 0, 1);
  }

  // Modelo 3D anclado al mundo, con yaw propio y roll/pitch opcionales
  dm(g, cm, model, e, scale, color, baseAlpha, extraRoll, pitch) {
    const [verts, edges] = model;
    const cyw = COS(e.yaw || 0);
    const syw = SIN(e.yaw || 0);
    const cr = COS(extraRoll || 0);
    const sr = SIN(extraRoll || 0);
    const cp = COS(pitch || 0);
    const sp = SIN(pitch || 0);
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
    this.sg(g, cm, pts, edges, color, baseAlpha);
  }

  // dos pasadas: un halo ancho y tenue bajo la línea viva — luz, no alambre
  sg(g, cm, pts, edges, color, alpha) {
    g.lineStyle(4.5, color, alpha * 0.18);
    for (const [a, b] of edges) this.wl(g, cm, pts[a], pts[b]);
    g.lineStyle(1.5, color, alpha);
    for (const [a, b] of edges) this.wl(g, cm, pts[a], pts[b]);
  }

  draw(time) {
    const g = this.gfx;
    g.clear();
    this.cameras.main.setBackgroundColor(0x070709);
    const cm = this.cam();

    this.dk(g, cm, time);
    this.dz(g, cm, time);
    this.dd(g, cm);

    this.label.setVisible(false);
    // la escena de la salva: el sector entero se apaga y solo quedan el
    // destructor, sus cohetes, tus disparos y tú
    const cine = this.boss && this.boss.cine ? this.boss.cineDark || 0 : 0;
    for (const e of this.en) {
      if (cine > 0 && (e.k === 'boss' || e.k === 'emis')) continue;
      this.de(g, cm, e, time);
    }
    if (cine > 0) {
      fr(g, 0, 0, W, H, 0x000000, 0.85 * cine);
      for (const e of this.en) {
        if (e.k === 'boss' || e.k === 'emis') this.de(g, cm, e, time);
      }
    }

    // cañón: trazos brillantes
    for (const b of this.bl) {
      const p1 = this.pj(cm, b.x, b.y, b.z);
      const p2 = this.pj(cm, b.x - b.vx * 0.03, b.y - b.vy * 0.03, b.z - b.vz * 0.03);
      if (!p1 || !p2) continue;
      g.lineStyle(2, INK_HI, 0.9);
      ln(g, p1[0], p1[1], p2[0], p2[1]);
    }

    // misiles: un proyectil de verdad, con aletas, cabeza ardiendo y estela larga
    for (const m of this.ms) {
      for (let i = 1; i < m.tr.length; i++) {
        const a = m.tr[i - 1];
        const b = m.tr[i];
        g.lineStyle(1 + i * 0.3, INK_HI, (i / m.tr.length) * 0.45);
        this.wl(g, cm, a, b);
      }
      const F = vnorm({ x: m.vx, y: m.vy, z: m.vz });
      const U = vnorm(vmix(WORLD_UP, 1, F, -vdot(WORLD_UP, F)));
      this.db(g, cm, MISSILE_MODEL, m, F, U, 1.5, INK_HI, 1, m.life * 9);
      const p = this.pj(cm, m.x - F.x * 20, m.y - F.y * 20, m.z - F.z * 20);
      if (p) {
        fc(g, p[0], p[1], MAX(2.5, 1400 / p[2]), AMB, 0.9);
      }
    }

    // disparos enemigos: brasas de óxido grandes y lentas, con su estela —
    // se ven venir y se pueden esquivar
    for (const s of this.ss) {
      const p = this.pj(cm, s.x, s.y, s.z);
      if (!p) continue;
      const q = this.pj(cm, s.x - s.vx * 0.35, s.y - s.vy * 0.35, s.z - s.vz * 0.35);
      const r = CLP(((s.big ? 48 : 7) * FOCAL) / p[2], s.big ? 6 : 3, s.big ? 70 : 14);
      if (q) {
        g.lineStyle(r * 0.9, RUST, 0.45);
        ln(g, p[0], p[1], q[0], q[1]);
      }
      // núcleo BLANCO siempre: una brasa se pierde contra el resplandor del
      // disco; un núcleo ardiente no
      fc(g, p[0], p[1], r * 1.8, RUST, 0.4);
      fc(g, p[0], p[1], r, RUST_HI, 0.95);
      fc(g, p[0], p[1], r * 0.45, CRM, 0.9);
    }

    // explosiones: anillos que crecen y fragmentos que vuelan
    for (const bm of this.bx) {
      if (bm.t < 0) continue;
      const p = this.pj(cm, bm.wx, bm.wy, bm.wz);
      if (!p) continue;
      const k = FOCAL / p[2];
      if (bm.muzzle) {
        fc(g, p[0], p[1], MAX(4, 30 * k), RUST_HI, (0.5 - bm.t) * 3.5);
        continue;
      }
      const r = (4 + bm.t * (bm.r ? bm.r * 2.4 : bm.big ? 260 : 150)) * k;
      if (bm.r) {
        fc(g, p[0], p[1], r * 0.8, AMB, 0.35 * (1 - bm.t / 0.5));
      }
      sk(g, p[0], p[1], r, bm.r ? 3 : 1.5, bm.big ? INK_HI : RUST, 1 - bm.t / 0.5);
    }
    for (const s of this.sz) {
      const p1 = this.pj(cm, s.x, s.y, s.z);
      const p2 = this.pj(cm, s.x - s.vx * 0.05, s.y - s.vy * 0.05, s.z - s.vz * 0.05);
      if (!p1 || !p2) continue;
      g.lineStyle(1, INK, s.life * 1.6);
      ln(g, p1[0], p1[1], p2[0], p2[1]);
    }

    // cerca del agujero, la pantalla entera se tiñe de acreción: no hay
    // duda de DÓNDE estás metido
    const bhProx = CLP(1 - (BH_Y - this.pos.y - BH_KILL) / BH_PULL, 0, 1);
    if (bhProx > 0.02) {
      fr(g, 0, 0, W, H, 0xe89a5c, bhProx * (0.09 + 0.05 * SIN(time * 0.004)));
    }

    this.dj(g, cm, time);
    this.dv(g, cm);
    this.di(g, cm, time);

    // barra de carga del hipersalto, o la vida que le queda al destructor
    if (this.boss && !this.boss.hd) {
      let hp = 0;
      let max = 0;
      for (const pt of this.boss.parts) {
        if (pt.kind === 'turret') continue;
        hp += MAX(0, pt.hp);
        max += pt.max;
      }
      g.lineStyle(1.5, RUST, 0.9);
      g.strokeRect(CX - 160, 30, 320, 10);
      fr(g, CX - 158, 32, 316 * (hp / max), 6, RUST_HI, 0.9);
    }
  }

  // Up and down must always read: a hazy floor below the sector's level
  // plane and the galaxy's band along the horizon. The camera rolls with the
  // ship, so the horizon is a line at any angle — found per pixel as the
  // screen points whose view ray is level.
  dh(g, cm) {
    const { R, U, F } = cm;
    const n = HYP(R.y, U.y);
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
    // acreción — TENUE de lejos, para que el óxido enemigo no se pierda
    // contra él, y encendido solo cuando de verdad estás bajando
    const prox = CLP(1 - (BH_Y - this.pos.y - BH_KILL) / BH_PULL, 0, 1);
    for (let i = 0; i < 10; i++) band(i * i * 7, undefined, 0x6b4030, (0.11 - i * 0.01) * (0.2 + 2.4 * prox));
    band(-18, 18, 0x3a4452, 0.1);
    band(-6, 6, 0x5a6878, 0.1);
    band(-0.7, 0.7, INK, 0.28);
    for (const b of this.band) {
      const p = this.pd(cm, skyDir(b.yaw, b.el));
      if (!p) continue;
      fr(g, p[0], p[1], b.s, b.s, INK, b.a);
    }
  }

  // Cuánto rota la pantalla respecto del "arriba" del sector: el arte del
  // cielo se dibuja derecho y se gira con esto
  kr(cm) {
    return AT2(-cm.R.y, -cm.U.y);
  }

  // Dibuja algo del cielo en su dirección, girado con la cámara
  so(g, cm, yaw, el, reach, paint) {
    const p = this.pd(cm, skyDir(yaw, el));
    if (!p || p[0] < -reach || p[0] > W + reach || p[1] < -reach || p[1] > H + reach) return;
    g.save();
    g.translateCanvas(p[0], p[1]);
    g.rotateCanvas(this.kr(cm));
    paint(g);
    g.restore();
  }

  dk(g, cm, time) {
    this.dh(g, cm);
    // nebulosas: manchas apenas visibles que dan fondo al negro
    for (const [yw, el, r, col, al] of [
      [0.25, 0.5, 280, 0x4a3560, 0.06],
      [0.9, 0.14, 300, 0x33506a, 0.05],
      [4.1, 0.1, 260, 0x33506a, 0.04],
      [5.3, 0.33, 220, 0x5e4038, 0.05],
    ]) {
      const p = this.pd(cm, skyDir(yw, el));
      if (!p) continue;
      fc(g, p[0], p[1], r, col, al);
      fc(g, p[0] + r * 0.4, p[1] - r * 0.25, r * 0.6, col, al * 0.7);
    }
    this.so(g, cm, 5.4, 0.55, 60, (g) => drawIcePlanet(g));
    this.so(g, cm, 4.3, 0.22, 200, (g) => drawRingedPlanet(g));
    this.so(g, cm, 2.04, 0.62, 40, (g) => {
      fc(g, 0, 0, 20, 0x474d55, 1);
      fc(g, 7, 0, 17, 0x05060a, 0.7);
    });
    this.so(g, cm, 2.4, 0.44, 170, (g) => drawGasGiant(g));
    this.dl(g, cm, time);
  }

  // El agujero negro es el SUELO, y está ANCLADO AL MUNDO bajo el centro del
  // sector: no gira con tu vista ni te sigue — tú te mueves sobre él. El
  // disco son anillos fijos en el plano, la sombra es una esfera (igual desde
  // cualquier ángulo) y los chorros son la vertical del mundo.
  dl(g, cm, time) {
    const t = time * 0.001;
    const RS = 380; // radio del horizonte de sucesos, en unidades de mundo
    // cuanto más bajas, más arde el disco — el color te dice dónde estás
    const prox = CLP(1 - (BH_Y - this.pos.y - BH_KILL) / BH_PULL, 0, 1);
    // el disco ORBITA: arcos con huecos girando, el anillo interior más
    // rápido que el exterior, como cae de verdad la materia
    for (const [r, col, al, wd] of [
      [760, CRM, 0.7, 2.5],
      [950, AMB, 0.55, 2],
      [1200, 0xe89a5c, 0.4, 2],
      [1550, RUST, 0.3, 1.5],
      [1980, RUST, 0.2, 1.5],
      [2500, 0x8a5c48, 0.14, 1.5],
    ]) {
      g.lineStyle(wd * (1 + prox), col, MIN(1, al * (1 + 0.9 * prox)));
      const off = t * (260 / r);
      for (let arc = 0; arc < 9; arc++) {
        const a0 = off + (arc / 9) * PI * 2;
        const span = ((PI * 2) / 9) * 0.7;
        let prev = null;
        for (let i = 0; i <= 3; i++) {
          const a = a0 + (i / 3) * span;
          const pt = [this.pos.x + COS(a) * r, BH_Y, this.pos.z + SIN(a) * r];
          if (prev) this.wl(g, cm, prev, pt);
          prev = pt;
        }
      }
    }
    // brasas sueltas orbitando el disco interno
    for (let i = 0; i < 5; i++) {
      const rr = [760, 950, 1200, 950, 760][i];
      const a = t * (350 / rr) + i * 2.4;
      const pp = this.pj(cm, this.pos.x + COS(a) * rr, BH_Y, this.pos.z + SIN(a) * rr);
      if (!pp) continue;
      fc(g, pp[0], pp[1], MAX(1.5, (26 * FOCAL) / pp[2]), CRM, 0.55 + 0.35 * prox);
    }
    const p = this.pj(cm, this.pos.x, BH_Y, this.pos.z);
    if (p) {
      const r = (RS * FOCAL) / p[2];
      fc(g, p[0], p[1], r * 2.6, 0xe8a060, 0.05);
      fc(g, p[0], p[1], r * 1.7, 0xe8a060, 0.07);
      fc(g, p[0], p[1], r, 0x000000, 1);
      sk(g, p[0], p[1], r * 1.04, 2, 0xfff8ea, 0.6 + 0.3 * SIN(t * 3));
    }
    // los chorros, con pulsos que viajan hacia afuera; el de arriba es la
    // columna de luz que marca el centro del sector desde cualquier parte
    for (const dir of [-1, 1]) {
      const base = [this.pos.x, BH_Y + dir * RS * 1.15, this.pos.z];
      const tip = [this.pos.x, BH_Y + dir * RS * 5, this.pos.z];
      g.lineStyle(7, BLD, 0.1);
      this.wl(g, cm, base, tip);
      g.lineStyle(2.5, BLU, 0.3);
      this.wl(g, cm, base, tip);
    }
  }

  dz(g, cm, time) {
    for (const m of this.sn) {
      const p = this.pd(cm, m.v);
      if (!p || p[0] < -4 || p[0] > W + 4 || p[1] < -4 || p[1] > H + 4) continue;
      let a = m.a;
      if (m.tw) a *= 0.6 + 0.4 * SIN(time * 0.001 * m.tw + m.ph);
      fr(g, p[0], p[1], m.s, m.s, INK, a);
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
  dd(g, cm) {
    const L = 560;
    const f = this.fw();
    const trail = 0.016 + (this.sp / TURBO_SPEED) * 0.065;
    for (const m of this.dust) {
      const wx = this.pos.x + WRP(m.x - this.pos.x, -L / 2, L / 2);
      const wy = this.pos.y + WRP(m.y - this.pos.y, -L / 2, L / 2);
      const wz = this.pos.z + WRP(m.z - this.pos.z, -L / 2, L / 2);
      const p1 = this.pj(cm, wx, wy, wz);
      const p2 = this.pj(cm, wx + f.x * this.sp * trail, wy + f.y * this.sp * trail, wz + f.z * this.sp * trail);
      if (!p1 || !p2) continue;
      const dist = HYP(wx - this.pos.x, wy - this.pos.y, wz - this.pos.z);
      const a = CLP(1 - dist / 420, 0, 1) * 0.5 * (this.sp / TURBO_SPEED + 0.3);
      if (a <= 0.02) continue;
      g.lineStyle(1, INK, a);
      ln(g, p1[0], p1[1], p2[0], p2[1]);
    }
  }

  de(g, cm, e, time) {
    const dist = HYP(e.x - this.pos.x, e.y - this.pos.y, e.z - this.pos.z);
    // la estela de lo que se mueve: se ve de dónde viene y hacia dónde va
    if (e.tr && dist < 2200) {
      const n = e.tr.length;
      for (let i = 1; i < n; i++) {
        g.lineStyle(e.k === 'emis' ? 3 : 2, RUST_HI, (i / n) * 0.5);
        this.wl(g, cm, e.tr[i - 1], i === n - 1 ? [e.x, e.y, e.z] : e.tr[i]);
      }
    }
    const p = this.pj(cm, e.x, e.y, e.z);
    if (!p) return;
    let a = this.fg(dist);

    if (e.k === 'emis') {
      const F = vnorm({ x: e.vx, y: e.vy, z: e.vz });
      const U = vnorm(vmix(WORLD_UP, 1, F, -vdot(WORLD_UP, F)));
      this.db(g, cm, MISSILE_MODEL, e, F, U, 1.6, e.ft > 0 ? INK_HI : RUST_HI, 1, e.t * 8);
      fc(g, p[0], p[1], MAX(3, (16 * FOCAL) / p[2]), RUST_HI, 0.5 + 0.4 * SIN(e.t * 20));
      return;
    }

    // el destructor no se apaga con la niebla: es enorme y tiene que verse
    // desde lejos. Escondido (antes del flash de entrada) no se dibuja.
    if (e.k === 'boss') {
      if (!e.hd) this.dr(g, cm, e, MAX(a, 0.6), e.ft > 0);
      return;
    }

    if (a <= 0.03) {
      if ((e.k === 'drone' || e.k === 'inter' || e.k === 'sentry') && dist < 3200) {
        fr(g, p[0], p[1], 2.5, 2.5, RUST_HI, 0.6);
      }
      return;
    }

    // el óxido es solo para lo que te ataca; una roca es paisaje que golpea
    const flash = e.ft > 0;
    const color = flash
      ? INK_HI
      : e.k === 'pow' ? BLU : e.k === 'scrap' ? BLD : e.k === 'rock' ? GRY : RUST;
    if (e.k === 'rock' && !flash) a *= 0.7;

    const model =
      e.k === 'sentry' ? SENTRY_MODEL : e.k === 'drone' ? DRONE_MODEL : e.k === 'inter' ? INTER_MODEL
      : e.k === 'pow' ? POW_MODELS[e.sub] : e.k === 'rock' ? e.model : SCRAP_MODEL;
    const scale = e.k === 'rock' ? e.r / 16 : e.k === 'sentry' ? 1.6
      : e.k === 'drone' || e.k === 'inter' ? HUNTER_SCALE : 1;
    const rot = e.k === 'rock' ? e.t * e.spin : e.k === 'scrap' || e.k === 'pow' ? e.t * 1.1 : 0;
    this.dm(g, cm, model, e, scale, color, a, rot);

    if (e.k === 'drone' || e.k === 'inter') {
      // el ojo de brasa en la nariz: se lee quién te está mirando
      const nose = this.pj(
        cm,
        e.x + SIN(e.yaw) * 16 * HUNTER_SCALE,
        e.y - 4,
        e.z + COS(e.yaw) * 16 * HUNTER_SCALE
      );
      if (nose) {
        fc(g, nose[0], nose[1], MAX(1.5, 600 / nose[2]), RUST_HI, a * (0.6 + 0.4 * SIN(e.t * 6)));
      }
    }
    if (e.k === 'sentry') {
      // el ojo late y su anillo de vigilancia respira: se ve venir de lejos
      const pulse = 0.5 + 0.5 * SIN(e.t * 3);
      g.fillStyle(RUST_HI, a * (0.6 + 0.4 * pulse));
      const eye = this.pj(cm, e.x, e.y - 20, e.z);
      if (eye) g.fillCircle(eye[0], eye[1], MAX(3, 1100 / p[2]));
      sk(g, p[0], p[1], (70 + pulse * 10) * (FOCAL / p[2]), 1.5, RUST, a * (0.25 + 0.3 * pulse));
    }
  }

  dr(g, cm, b, a, flash) {
    this.dm(g, cm, DESTROYER_MODEL, b, SD_SCALE, flash ? INK_HI : RUST, a);
    // luces de posición parpadeando por el casco: un objeto VIVO, no un plano
    [[0, -6, SD_NOSE], [-SD_HALF_W, -4, SD_REAR], [SD_HALF_W, -4, SD_REAR], [-130, -168, -340], [130, -168, -340], [0, -48, 80]].forEach(
      ([lx, ly, lz], i) => {
        if (FLR(b.t * 1.6 + i * 0.7) % 3 === 0) return;
        const [wx, wy, wz] = this.bw(b, lx, ly, lz);
        const lp = this.pj(cm, wx, wy, wz);
        if (!lp) return;
        fc(g, lp[0], lp[1], MAX(1.5, 1100 / lp[2]), i < 3 ? RUST_HI : BLU, a * 0.9);
      }
    );
    // tres motores encendidos en la popa
    for (const ox of [-130, 0, 130]) {
      const [wx, wy, wz] = this.bw(b, ox, 18, SD_REAR - 6);
      const p = this.pj(cm, wx, wy, wz);
      if (!p) continue;
      const r = (34 * SD_SCALE * FOCAL) / p[2];
      fc(g, p[0], p[1], r * 1.6, AMB, 0.25);
      fc(g, p[0], p[1], r * 0.7, CRM, 0.85);
    }
    const shielded = b.parts.some((q) => q.kind === 'dome' && q.hp > 0);
    const aimed = this.ba(b, this.F);
    for (const pt of b.parts) {
      if (pt.hp <= 0) continue;
      const [wx, wy, wz] = this.bw(b, pt.ox, pt.oy, pt.oz);
      const p = this.pj(cm, wx, wy, wz);
      if (!p) continue;
      const k = (SD_SCALE * FOCAL) / p[2];
      const hot = pt.ft > 0 ? INK_HI : RUST_HI;
      // los puntos débiles abiertos llevan mira: ahí es donde se le pega
      if (this.bo(b, pt)) {
        const main = pt.kind !== 'turret';
        const r = MAX(main ? 20 : 12, SD_PART_R[pt.kind] * (FOCAL / p[2]) * 0.8);
        const c = r * 0.4;
        g.lineStyle(main ? 2 : 1.5, main ? INK_HI : RUST_HI, main ? 0.6 + 0.4 * SIN(b.t * 6) : 0.45);
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
        this.dm(g, cm, SENTRY_MODEL, { x: wx, y: wy - 12 * SD_SCALE, z: wz, yaw: b.yaw }, 1.1 * SD_SCALE, pt.ft > 0 ? INK_HI : RUST, a);
        fc(g, p[0], p[1] - 34 * k, MAX(2, 7 * k), hot, a);
      } else if (pt.kind === 'dome') {
        // domo de escudo: esfera en tinta, lo que protege el puente
        sk(g, p[0], p[1], 36 * k, 1.5, pt.ft > 0 ? INK_HI : BLD, 0.9);
        g.strokeEllipse(p[0], p[1], 72 * k, 26 * k);
        fc(g, p[0], p[1], 36 * k, BLD, 0.12 + 0.08 * SIN(b.t * 4));
      } else {
        // el puente: blindado mientras haya domos; expuesto, late en brasa
        const pulse = 0.5 + 0.5 * SIN(b.t * (shielded ? 2 : 7));
        if (shielded) {
          sk(g, p[0], p[1], 90 * k, 1.5, BLD, 0.25 + 0.2 * pulse);
        } else {
          fc(g, p[0], p[1], 30 * k, hot, 0.45 + 0.45 * pulse);
          sk(g, p[0], p[1], (50 + pulse * 20) * k, 2, RUST_HI, 0.6 * pulse);
        }
      }
    }
    // el cañón de proa cargando: el aviso para esquivar
    if (b.cg > 0) {
      const [wx, wy, wz] = this.bw(b, 0, 10, SD_NOSE);
      const p = this.pj(cm, wx, wy, wz);
      if (p) {
        const c = 1 - b.cg / 1.8;
        const k = (SD_SCALE * FOCAL) / p[2];
        fc(g, p[0], p[1], (10 + 40 * c) * k, RUST_HI, 0.3 + 0.5 * c);
        sk(g, p[0], p[1], (60 - 40 * c) * k, 2, CRM, c);
      }
    }
  }

  // Un modelo orientado por una base cualquiera (la nave, los misiles):
  // x del modelo sobre R, -y sobre U, z sobre F; con alabeo visual opcional
  db(g, cm, model, P, F, U, scale, color, alpha, bank) {
    const R = vcross(F, U);
    const cb = COS(bank || 0);
    const sb = SIN(bank || 0);
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
    this.sg(g, cm, pts, model[1], color, alpha);
  }

  dj(g, cm, time) {
    if (this.fz === 'out') return;
    if (time < this.iu && FLR(time / 60) % 2 === 0) return;
    const f = this.fw();
    // dash: la nave deja copias fantasma — mientras se ven, nada te toca
    if (time < this.du) {
      for (let i = 1; i <= 3; i++) {
        const gp = { x: this.pos.x - f.x * 22 * i, y: this.pos.y - f.y * 22 * i, z: this.pos.z - f.z * 22 * i };
        this.db(g, cm, SHIP_MODEL, gp, this.F, this.U, 1, INK_HI, 0.4 / i, this.roll);
      }
    }
    this.db(g, cm, SHIP_MODEL, this.pos, this.F, this.U, 1, INK, 1, this.roll);
    // a velocidad de embestida, la proa se enciende
    if (this.sp > RAM_SPEED) {
      const np = this.pj(cm, this.pos.x + f.x * 22, this.pos.y + f.y * 22, this.pos.z + f.z * 22);
      if (np) {
        const k = MIN(1, (this.sp - RAM_SPEED) / 150);
        sk(g, np[0], np[1], (20 * FOCAL) / np[2], 2, INK_HI, 0.5 * k + 0.2 * SIN(time * 0.05));
        fc(g, np[0], np[1], (20 * FOCAL) / np[2], INK_HI, 0.18 * k);
      }
    }
    // el escudo envuelve la nave; el fogonazo vive en la nariz
    const sp0 = this.pj(cm, this.pos.x, this.pos.y, this.pos.z);
    if (this.shield && sp0) {
      sk(g, sp0[0], sp0[1], 30 * (FOCAL / sp0[2]), 1.5, INK_HI, 0.4 + 0.2 * SIN(time * 0.008));
    }
    // el escudo ACTIVO: una esfera de energía en el azul de los domos —
    // relleno tenue, meridianos girando y arcos vivos; parpadea al morir
    if (time < this.su && sp0) {
      const left = (this.su - time) / SHIELD_MS;
      const dying = left < 0.22 && FLR(time / 90) % 2 === 0;
      const r = SHIELD_R * 0.85 * (FOCAL / sp0[2]);
      if (!dying) {
        fc(g, sp0[0], sp0[1], r, BLD, 0.1);
        sk(g, sp0[0], sp0[1], r, 1.5, BLU, 0.85);
        sk(g, sp0[0], sp0[1], r * 1.1, 3.5, BLD, 0.2);
        // los meridianos: la burbuja es una esfera, no un aro
        const sp = time * 0.0021;
        g.lineStyle(1, BLU, 0.4);
        g.strokeEllipse(sp0[0], sp0[1], 2 * r * ABS(COS(sp)), 2 * r);
        g.strokeEllipse(sp0[0], sp0[1], 2 * r, 2 * r * ABS(COS(sp * 0.8 + 1.2)));
        const spin = time * 0.004;
        g.lineStyle(2.5, INK_HI, 0.9);
        for (let i = 0; i < 3; i++) {
          const a0 = spin + (i * PI * 2) / 3;
          g.beginPath();
          g.arc(sp0[0], sp0[1], r, a0, a0 + 0.7);
          g.strokePath();
        }
      }
      // la onda del impacto: se VE que la burbuja se llevó el golpe
      if (this.ht > 0) {
        const u = 1 - this.ht / 0.3;
        sk(g, sp0[0], sp0[1], r * (1 + u * 0.55), 2.5, INK_HI, 0.9 * (1 - u));
      }
    }
    if (this.mz2 > 0) {
      const mp = this.pj(cm, this.pos.x + f.x * 26, this.pos.y + f.y * 26 - 2, this.pos.z + f.z * 26);
      if (mp) {
        fc(g, mp[0], mp[1], MAX(2, 500 / mp[2]), INK_HI, 0.9);
      }
    }
    // estela del motor
    const level = ABS(this.sp) / TURBO_SPEED;
    if (level > 0.05) {
      g.lineStyle(2, INK_HI, 0.3 + 0.5 * level * (0.6 + 0.4 * SIN(time * 0.04)));
      const tail = 20 + 26 * level;
      this.wl(
        g,
        cm,
        [this.pos.x - f.x * 14, this.pos.y - f.y * 14 + 1, this.pos.z - f.z * 14],
        [this.pos.x - f.x * tail, this.pos.y - f.y * tail + 1, this.pos.z - f.z * tail]
      );
    }
    // retícula: a donde apunta la nariz — y avisa si un misil tiene blanco
    const rp = this.pj(cm, this.pos.x + f.x * 620, this.pos.y + f.y * 620, this.pos.z + f.z * 620);
    if (rp) {
      const locked = this.ammo > 0 && this.bt(f);
      sk(g, rp[0], rp[1], locked ? 10 : 7, 1.5, locked ? RUST_HI : INK, 0.6);
      fr(g, rp[0] - 1, rp[1] - 1, 2, 2, locked ? RUST_HI : INK, 0.6);
    }
  }

  // Lo que viene hacia ti desde fuera de la pantalla se anuncia en el borde,
  // del lado por el que llega
  di(g, cm, time) {
    // las naves cercanas SIEMPRE se anuncian en el borde — aunque no se
    // estén acercando; los proyectiles, desde más lejos que antes
    for (const e of this.en) {
      if ((e.k !== 'drone' && e.k !== 'inter') || e.dead) continue;
      const d = { x: e.x - this.pos.x, y: e.y - this.pos.y, z: e.z - this.pos.z };
      const dist = HYP(d.x, d.y, d.z);
      if (dist > 1900) continue;
      const p = this.pj(cm, e.x, e.y, e.z);
      if (p && p[0] > 30 && p[0] < W - 30 && p[1] > 30 && p[1] < H - 30) continue;
      const ang = AT2(-vdot(d, cm.U), vdot(d, cm.R) || 0.001);
      const ex = CX + COS(ang) * (CX - 24);
      const ey = CY + SIN(ang) * (CY - 24);
      g.lineStyle(2, RUST_HI, 0.55);
      ln(g, ex - COS(ang + 0.5) * 11, ey - SIN(ang + 0.5) * 11, ex, ey);
      g.beginPath();
      g.moveTo(ex, ey);
      g.lineTo(ex - COS(ang - 0.5) * 11, ey - SIN(ang - 0.5) * 11);
      g.strokePath();
    }
    const threats = this.ss.concat(this.en.filter((e) => e.k === 'emis' || e.k === 'inter'));
    for (const s of threats) {
      const d = { x: this.pos.x - s.x, y: this.pos.y - s.y, z: this.pos.z - s.z };
      const dist = HYP(d.x, d.y, d.z);
      if (dist > 1500 || d.x * s.vx + d.y * s.vy + d.z * s.vz <= 0) continue;
      const p = this.pj(cm, s.x, s.y, s.z);
      if (p && p[0] > 30 && p[0] < W - 30 && p[1] > 30 && p[1] < H - 30) continue;
      const o = { x: -d.x, y: -d.y, z: -d.z };
      const ang = AT2(-vdot(o, cm.U), vdot(o, cm.R) || 0.001);
      const ex = CX + COS(ang) * (CX - 28);
      const ey = CY + SIN(ang) * (CY - 28);
      const pulse = 0.55 + 0.45 * SIN(time * 0.02);
      g.lineStyle(3, RUST_HI, pulse * (1 - dist / 1600));
      g.beginPath();
      g.moveTo(ex - COS(ang + 0.6) * 16, ey - SIN(ang + 0.6) * 16);
      g.lineTo(ex, ey);
      g.lineTo(ex - COS(ang - 0.6) * 16, ey - SIN(ang - 0.6) * 16);
      g.strokePath();
    }
  }

  // La marca de navegación: hacia la pieza que falta
  dv(g, cm) {
    let target = null;
    let label = '';
    if (!this.boss) {
      let bd = 1e9;
      for (const e of this.en) {
        if (e.k !== 'pow' || e.dead) continue;
        const d = HYP(e.x - this.pos.x, e.y - this.pos.y, e.z - this.pos.z);
        if (d < bd) {
          bd = d;
          target = e;
          label = 'POWER';
        }
      }
    } else if (this.boss) {
      // no al centro del destructor: al punto débil que toca romper
      const b = this.boss;
      let bd = 1e9;
      for (const pt of b.parts) {
        if (pt.kind === 'turret' || !this.bo(b, pt)) continue;
        const [x, y, z] = this.bw(b, pt.ox, pt.oy, pt.oz);
        const d = HYP(x - this.pos.x, y - this.pos.y, z - this.pos.z);
        if (d < bd) {
          bd = d;
          target = { x, y, z };
          label = pt.kind === 'dome' ? 'DOME' : 'BRIDGE';
        }
      }
    }

    if (!target) {
      this.navText.setText('');
      return;
    }
    const part = target;
    const dist = HYP(part.x - this.pos.x, part.y - this.pos.y, part.z - this.pos.z);
    this.navText.setText(label + '  ' + Math.round(dist) + ' M');

    const p = this.pj(cm, part.x, part.y, part.z);
    const margin = 46;
    if (p && p[0] > margin && p[0] < W - margin && p[1] > margin && p[1] < H - margin) {
      // una MIRA, no un cuadrito: esquinas gruesas que respiran
      const r = 22 + 2 * SIN(this.ep * 5);
      const c = r * 0.45;
      g.lineStyle(2.5, INK_HI, 0.9);
      for (const [sx, sy2] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
        g.beginPath();
        g.moveTo(p[0] + sx * r, p[1] + sy2 * (r - c));
        g.lineTo(p[0] + sx * r, p[1] + sy2 * r);
        g.lineTo(p[0] + sx * (r - c), p[1] + sy2 * r);
        g.strokePath();
      }
      return;
    }
    let ang;
    if (p) ang = AT2(p[1] - CY, p[0] - CX);
    else {
      // detrás: la flecha apunta al lado por el que conviene girar
      const d = { x: part.x - cm.x, y: part.y - cm.y, z: part.z - cm.z };
      ang = AT2(-vdot(d, cm.U), vdot(d, cm.R) || 1);
    }
    const ex = CX + COS(ang) * (CX - 60);
    const ey = CY + SIN(ang) * (CY - 60);
    // flecha grande con halo: se ve aunque el sector esté lleno de cosas
    for (const [wd, al, sc] of [[7, 0.25, 1.3], [2.5, 0.95, 1]]) {
      g.lineStyle(wd, INK_HI, al);
      g.beginPath();
      g.moveTo(ex + COS(ang) * 20 * sc, ey + SIN(ang) * 20 * sc);
      g.lineTo(ex + COS(ang + 2.5) * 14 * sc, ey + SIN(ang + 2.5) * 14 * sc);
      g.lineTo(ex + COS(ang - 2.5) * 14 * sc, ey + SIN(ang - 2.5) * 14 * sc);
      g.closePath();
      g.strokePath();
    }
  }

  uh() {
    this.velText.setText('SPD ' + String(ABS(Math.round(this.sp))).padStart(3, '0'));
    this.scoreText.setText(String(this.score).padStart(6, '0') + (this.mu > 1 ? '  x' + this.mu : ''));
    this.hullText.setText('HULL ' + (GOD ? '∞' : '▸'.repeat(this.hull) + '·'.repeat(HULL_MAX - this.hull)));
    this.missileText.setText('MSL ' + '▴'.repeat(this.ammo) + '·'.repeat(MISSILE_MAX - this.ammo));
    const mm = FLR(this.ep / 60);
    this.partText.setText('T ' + mm + ':' + String(FLR(this.ep % 60)).padStart(2, '0'));
    // el bloque de recursos, junto a las vidas: DASH y SHIELD como barras
    // con nombre — llena = lista; el escudo va en SU azul
    const g = this.gfx;
    g.lineStyle(1, INK, 0.5);
    g.strokeRect(12, H - 56, 118, 8);
    fr(g, 13, H - 55, 116 * (this.bz / BOOST_MAX), 6, INK_HI, 0.75);
    const now = this.time.now;
    const shReady = now >= this.sw ? 1 : 1 - (this.sw - now) / (SHIELD_MS + SHIELD_COOLDOWN_MS);
    g.lineStyle(1, INK, 0.5);
    g.strokeRect(12, H - 70, 118, 8);
    fr(g, 13, H - 69, 116 * MAX(0, shReady), 6, BLU, shReady >= 1 ? 0.9 : 0.35);
    // el próximo misil, recargándose bajo su contador
    if (this.ammo < MISSILE_MAX) {
      g.lineStyle(1, INK, 0.4);
      g.strokeRect(169, H - 8, 118, 4);
      fr(g, 170, H - 7, 116 * (this.ar / MISSILE_REGEN), 2, INK_HI, 0.7);
    }
  }
}

// --------------------------------------------------------------------------
class Over extends Phaser.Scene {
  constructor() {
    super('over');
  }

  init(data) {
    this.score = data.score || 0;
  }

  create() {
    this.events.on('postupdate', clearPressed);
    Music.on = false;
    this.ready = false;
    this.left = false;
    this.qualifies = false;
    Sfx.over();

    this.add.text(CX, CY - 70, 'GAME OVER', FONT(32)).setOrigin(0.5);
    this.add.text(CX, CY + 4, 'SCORE  ' + String(this.score).padStart(6, '0'), FONT(16)).setOrigin(0.5);

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

    this.add.text(CX, CY - 110, 'TOP 5!', FONT(16)).setOrigin(0.5);
    this.add.text(CX, CY - 78, 'SCORE  ' + String(this.score).padStart(6, '0'), FONT(15, DIM_CSS)).setOrigin(0.5);
    this.slots = [0, 1, 2].map((i) => this.add.text(CX - 48 + i * 48, CY + 8, 'A', FONT(32)).setOrigin(0.5));
    this.add.text(CX, CY + 88, 'STICK SELECT · B1 OK', FONT(13, DIM_CSS)).setOrigin(0.5).setAlpha(0.8);
  }

  update(time) {
    if (this.saving) return;
    const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (pressed.P1_U) this.letters[this.slot] = (this.letters[this.slot] + 25) % 26;
    if (pressed.P1_D) this.letters[this.slot] = (this.letters[this.slot] + 1) % 26;
    if (pressed.P1_L) this.slot = MAX(0, this.slot - 1);
    if (pressed.P1_R) this.slot = MIN(2, this.slot + 1);
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
      t.setAlpha(i === this.slot ? (FLR(time / 300) % 2 ? 1 : 0.35) : 0.8);
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
