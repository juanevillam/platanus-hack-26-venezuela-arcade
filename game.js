// Space Explorer — Platanus Hack 26: Caracas Arcade Challenge
// Tu nave quedó varada en un sector alienígena. Encuentra las tres piezas del
// hipersalto entre los restos, y vuelve a casa.
//
// Vuelo libre 3D con proyección propia: la nave siempre avanza y el stick
// la dirige, con loops completos; la cámara va pegada a ella. MODO ARCADE
// INFINITO: sin niveles ni final — sobrevive y puntúa. El sector es un
// cilindro con techo (el HUD dice cuánto queda); la Tierra y Saturno son
// cielo, y un agujero negro que tira y traga flota en él; los cazadores aprietan
// con los minutos, hay emboscadas periódicas, torretas de la base flotando
// sobre el disco del agujero (bajar a cazarlas paga powerup seguro), y un
// destructor recurrente que llega del hiperespacio a oscuras — el primero
// con toda la ceremonia, los siguientes al grano — y paga +1500. Morir es
// el único final. Texto en inglés, corto, voz arcade. Wireframe luminoso;
// el óxido marca el peligro.

// Todo va dentro de una IIFE: en el scope global el minificador no puede
// renombrar ni inlinear las constantes y clases de arriba; aquí sí (~3.4 KB).
(() => {


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
// fw=forward dwb=drawBodies bh=drawBlackHole dsk=drawAccretionDisk
// de2=drawEdges LS=lineStyle
// Propiedades: o=pos X=dead Bo=boss Bt=boss2 fA=fireAt lf=life sl=slot
// ci=cine lt=letters or=orbit pz=parts kd=kind sc=score yw=yaw am=ammo
// tn=tone bhx=blackHoleProximity. Tipos (k): A=ace B=boss E=emis G=gun
// R=rock S=sentry W=walk N=wing; piezas (kd): t=turret d=dome b=bridge
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
const YAW_EASE = 13; // 1/s, el giro responde YA
const PITCH_RATE = 2.5; // rad/s de cabeceo
const ROLL_LEVEL = 3.2; // rad/s: 45° de ladeo se corrigen en ~0.25 s
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
const MISSILE_REGEN = 10; // segundos por misil recuperado solo

// --- Enemigos: pocos, grandes, disparos lentos que se pueden esquivar ---
const SHOT_SPEED = 250;

// --- El sector: una esfera de juego alrededor del origen ---
const SECTOR_R = 3000;
// El suelo es la ESTACIÓN: una esfera colosal asomando bajo el sector — no
// infinita, pero a escala de juego siempre está. Su superficie es pared.
const ST_R = 8000; // radio de la estación — chica: SE VE esfera
const ST_CY = 9800; // centro: la superficie queda a y=1800 bajo el origen
function surfY(x, z) {
  const q = ST_R * ST_R - x * x - z * z;
  return q > 0 ? ST_CY - Math.sqrt(q) : 1e9;
}

// EL SECTOR TIENE BORDES: un cilindro de radio BND_R alrededor del centro y
// un techo a y=BND_TOP. Al tocarlos la nave resbala por la pared y gira
// hacia adentro; cerca, la pared se dibuja y el HUD dice cuánto queda.
const BND_R = 6500;
const BND_TOP = -5200;
// El agujero negro está ANCLADO al mundo, a la derecha del arranque: se
// puede ir hasta él y alejarse [x, y, z, radio]. Tira más cuanto más cerca y
// te traga ya DENTRO de la sombra — la caída dura. La Tierra y Saturno son
// cielo, fijos al fondo del lado opuesto (sur y suroeste).
const BH = [2400, -2200, 3600, 420];
const BH_PULL = 2700;
const BH_GRIP = 1500; // aquí ya TE TIENE: el crucero no alcanza — dash o nitro
const BH_KILL = 240;

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

  tn(f0, dur, type, vol, f1, at) {
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
    this.tn(760, 0.07, 'square', 0.09, 320);
  },
  missile() {
    this.tn(520, 0.35, 'sawtooth', 0.14, 90);
    this.noise(0.25, 0.12);
  },
  boom() {
    this.noise(0.3, 0.38);
    this.tn(110, 0.28, 'sawtooth', 0.2, 40);
  },
  hurt() {
    this.noise(0.2, 0.38);
    this.tn(140, 0.3, 'sawtooth', 0.3, 55);
  },
  pickup() {
    this.tn(660, 0.06, 'square', 0.13);
    this.tn(990, 0.09, 'square', 0.13, 0, this.ctx && this.ctx.currentTime + 0.07);
  },
  ammo() {
    this.tn(440, 0.08, 'triangle', 0.16);
    this.tn(880, 0.12, 'triangle', 0.16, 0, this.ctx && this.ctx.currentTime + 0.09);
  },
  part() {
    const t = this.ctx && this.ctx.currentTime;
    [440, 554, 659, 880].forEach((f, i) => this.tn(f, 0.5, 'triangle', 0.15, 0, t + i * 0.09));
  },
  dash() {
    this.tn(140, 0.22, 'triangle', 0.13, 520);
  },
  turn() {
    this.tn(330, 0.3, 'sine', 0.12, 160);
  },
  shieldUp() {
    this.tn(240, 0.28, 'sine', 0.15, 520);
  },
  jump() {
    const t = this.ctx && this.ctx.currentTime;
    [330, 440, 554, 659, 880, 1108].forEach((f, i) => this.tn(f, 0.4, 'triangle', 0.15, 0, t + i * 0.09));
  },
  over() {
    this.tn(160, 1.1, 'sawtooth', 0.18, 55);
  },
};

// --------------------------------------------------------------------------
// Modelos wireframe: [vértices, aristas]. +z es la nariz; -y es arriba.

// La nave: caza esbelto — parabrisas marcado, alas en flecha con winglets,
// timón alto y dos góndolas de motor bajo las alas
const SHIP_MODEL = mdl([0, 0, 26, 0, -3.5, 14, 0, -5.5, 2, 0, -4, -8, 0, -11, -17, 0, 0, -16, -5, -1, 8, 5, -1, 8, -22, 1, -13, 22, 1, -13, -22, -4, -15, 22, -4, -15, 0, 3, -6, -9, 1, -2, 9, 1, -2, -11, 1, -15, 11, 1, -15, -3, -1.5, 19, 3, -1.5, 19], '0112233445350607687985958:9;0<<56<7<6==?7>>@?5@50AA60BB72627');

// Centinela: pirámide vigilante, con ojo
const SENTRY_MODEL = mdl([-22, 14, -22, 22, 14, -22, 22, 14, 22, -22, 14, 22, 0, -26, 0], '01122330041424340213');

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

// La CORBETA: a medio camino entre el ace y el destructor — casco largo,
// puente alto y dos nacelas; ladra ráfagas manteniendo distancia
// El CAMINANTE: cuerpo de caja con hocico — las patas se dibujan aparte,
// animadas de verdad
const WALK_MODEL = mdl([-26, -28, -34, 26, -28, -34, 26, -28, 34, -26, -28, 34, -26, 28, -34, 26, 28, -34, 26, 28, 34, -26, 28, 34, 0, 0, 58], '01122330455667740415263728386878');

// La TORRETA de superficie: pedestal, domo y cañón doble — se LEE torreta
const TURRET_MODEL = mdl([-24, 0, -24, 24, 0, -24, 24, 0, 24, -24, 0, 24, -14, -18, -14, 14, -18, -14, 14, -18, 14, -14, -18, 14, 0, -30, 0, -3, -26, 8, 3, -26, 8, -3, -38, 52, 3, -38, 52], '011223300415263745566774485868789;:<;<');

const GUN_MODEL = mdl([0, -2, 70, -16, -8, 30, 16, -8, 30, -20, 8, 24, 20, 8, 24, -22, 0, -20, 22, 0, -20, -14, -6, -64, 14, -6, -64, -16, 8, -58, 16, 8, -58, 0, -16, -14, 0, -12, -44, -30, 2, -48, 30, 2, -48], '01020304152635465768596:789:798:1;2;;<<7<85==96>>:');

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
  ['t', 90, -14, 150, 2], ['t', -90, -14, 150, 2],
  ['t', 140, -20, -80, 2], ['t', -140, -20, -80, 2],
  ['t', 190, -25, -300, 2], ['t', -190, -25, -300, 2],
  ['d', 110, -185, -340, 6], ['d', -110, -185, -340, 6],
  ['b', 0, -150, -345, 14],
];
const SD_PART_R = { t: 42 * SD_SCALE, d: 46 * SD_SCALE, b: 72 * SD_SCALE };

// Misil: cuerpo largo con cuatro aletas atrás — se tiene que ver como poder
const MISSILE_MODEL = mdl([0, 0, 16, 0, 0, -12, -3, 0, 8, 3, 0, 8, 0, -3, 8, 0, 3, 8, -8, 0, -14, 8, 0, -14, 0, -8, -14, 0, 8, -14, -3, 0, -6, 3, 0, -6, 0, -3, -6, 0, 3, -6], '020304052:3;4<5=:6;7<8=961718191');


// Chatarra: un trozo de casco — placa con borde, puntal y una solapa doblada

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
  LS(g, w, col, al);
  g.strokeCircle(x, y, r);
}
function LS(g, w, c, a) {
  g.lineStyle(w, c, a);
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
  Bo: false,
  tick() {
    if (!this.on || !Sfx.ctx) return;
    const now = Sfx.ctx.currentTime;
    if (this.next < now) this.next = now + 0.05;
    while (this.next < now + 0.4) {
      const t = this.next;
      const st = this.step++;
      if (this.Bo) {
        // EL DESTRUCTOR: ostinato grave que camina por semitonos, quinta
        // encima, un stab menor que cae y un tic seco — la flota ya está aquí
        const s16 = st % 16;
        const root = [36.7, 36.7, 34.6, 38.9][FLR(st / 16) % 4];
        Sfx.tn(root, 0.32, 'sawtooth', 0.1, 0, t);
        Sfx.tn(root * 2, 0.32, 'square', 0.03, 0, t);
        if (s16 % 4 === 0) Sfx.tn(root * 3, 0.6, 'triangle', 0.065, 0, t);
        if (s16 === 8) Sfx.tn(root * 4.76, 0.9, 'sawtooth', 0.05, root * 4, t);
        if (s16 === 12) Sfx.tn(root * 6, 0.5, 'triangle', 0.045, root * 5.6, t);
        if (s16 % 2 === 0) Sfx.noise(0.03, 0.028, t);
        this.next += 0.21;
      } else {
        // CACERÍA: galope en menor (Em → C → D → B), stabs, un destello de
        // tritono y batería marcada — aventura con dientes, nada cozy
        const s16 = st % 16;
        const root = [41.2, 32.7, 36.7, 30.9][FLR(st / 16) % 4];
        if (s16 % 4 !== 3) Sfx.tn(s16 % 4 === 2 ? root * 2 : root, 0.14, 'triangle', 0.1, 0, t);
        if (s16 === 0) Sfx.tn(root * 3, 1.2, 'sawtooth', 0.028, 0, t);
        if (s16 === 4 || s16 === 12) Sfx.tn(root * 4.8, 0.22, 'square', 0.04, 0, t);
        if (s16 === 8) Sfx.tn(root * 5.66, 0.5, 'sine', 0.045, root * 4.9, t);
        if (s16 % 2 === 0) Sfx.noise(0.025, 0.03, t);
        if (s16 % 8 === 4) Sfx.noise(0.09, 0.055, t);
        this.next += 0.19;
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
    if (anyStart()) this.scene.start('game');
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

// Esfera en franjas: cada franja respeta el contorno; la noche entra por la
// derecha. Sin franjas pinta solo la noche, sobre lo que ya haya. Más filas
// cuanto más grande, para que el borde no se vea en escalones.
function drawBandedSphere(g, R, bands, night) {
  const N = MAX(22, FLR(R / 1.5));
  for (let i = 0; i < N; i++) {
    const y0 = -R + (2 * R * i) / N;
    const y1 = y0 + (2 * R) / N;
    const ym = (y0 + y1) / 2;
    const hw = Math.sqrt(MAX(0, R * R - ym * ym));
    if (hw < 2) continue;
    if (bands) fr(g, -hw, y0, hw * 2, y1 - y0 + 1, bands[FLR((i / N) * bands.length)], 1);
    const tx = hw * night;
    fr(g, tx, y0, hw - tx, y1 - y0 + 1, 0x05060a, 0.72);
  }
}

// Saturno, a radio r en pantalla: la mitad de atrás del anillo va detrás
function drawSaturn(g, r) {
  const ring = (from) => {
    for (let k = 0; k < 4; k++) {
      LS(g, MAX(1.5, r * (k === 1 ? 0.05 : 0.025)), [0xe8d4a8, 0xd6b47e, 0xb89462, 0x8a7050][k], 0.6);
      g.beginPath();
      for (let j = 0; j <= 24; j++) {
        const a = from + (j / 24) * PI;
        const x = r * (1.55 + k * 0.18) * COS(a);
        const y = r * (0.32 + k * 0.035) * SIN(a) - x * 0.28;
        if (j === 0) g.moveTo(x, y);
        else g.lineTo(x, y);
      }
      g.strokePath();
    }
  };
  ring(PI);
  sk(g, 0, 0, r * 1.04, r * 0.06 + 2, 0xe8d4a8, 0.12);
  drawBandedSphere(g, r, [0xe6d2a0, 0xc9a86a, 0xd8bb80, 0xb8955a, 0xe0c890, 0xc9a86a, 0xd8bb80], 0.3);
  sk(g, 0, 0, r, 1.5, 0xe8d4a8, 0.5);
  ring(0);
}

// Júpiter: franjas crema y marrón, y la gran mancha roja
function drawJupiter(g, r) {
  sk(g, 0, 0, r * 1.04, r * 0.06 + 2, 0xe0c8a8, 0.12);
  drawBandedSphere(g, r, [0xe8dcc8, 0xc49a6c, 0xe6d6bc, 0xa87a54, 0xdcc4a4, 0xb88a60, 0xe8dcc8, 0xc49a6c, 0xe0d0b8], 0.3);
  fc(g, r * 0.05, r * 0.3, r * 0.15, 0xc0603c, 0.85);
}

// La Tierra: océano, continentes, nubes, la noche entrando por la derecha
function drawEarth(g, r) {
  fc(g, 0, 0, r * 1.1, 0x6fb4e0, 0.12);
  fc(g, 0, 0, r, 0x1f5a92, 1);
  // dos continentes hechos de manchas que se solapan, nubes y los polos
  for (const [x, y, q, c] of [
    [-0.45, -0.35, 0.18, 0],
    [-0.35, -0.15, 0.16, 0],
    [-0.25, 0.15, 0.12, 0],
    [-0.2, 0.35, 0.14, 0],
    [0.15, -0.3, 0.2, 0],
    [0.3, -0.12, 0.18, 0],
    [0.2, 0.15, 0.16, 0],
    [0.1, 0.4, 0.12, 0],
    [0, -0.88, 0.1, 1],
    [0, 0.88, 0.1, 1],
    [0, -0.5, 0.2, 1],
    [-0.05, 0.1, 0.1, 1],
  ])
    fc(g, x * r, y * r, q * r, c ? INK_HI : 0x4f8a4a, c ? 0.45 : 0.9);
  drawBandedSphere(g, r, 0, 0.3);
  sk(g, 0, 0, r, 2, 0x9fd4f0, 0.5);
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
    this.o = { x: 0, y: 0, z: -1600 };
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
    this.am = 3;
    this.ar = 0;

    // cámara: la misma base, suavizada — sigue la nave también de cabeza
    this.camF = { ...this.F };
    this.camU = { ...this.U };
    this.camR = { ...this.R };

    // ARCADE INFINITO: una sola fase — sobrevive y puntúa hasta morir.
    // (Phaser reuses the scene instance across runs)
    this.fz = 'play';
    this.bq = 75; // el primer destructor tarda esto en llegar
    this.bossN = 0;
    this.wvAt = 50; // la primera emboscada da tiempo a respirar
    this.baseAt = 5; // la superficie viene armada casi de entrada
    this.svT = 0; // puntos por sobrevivir
    this.wvN = 0;
    this.ht = 0;
    this.wa = 0;
    this.sc = 0;
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
    this.hRt = 0; // el casco se recompone solo, con calma y sin golpes
    this.mz2 = 0;
    this.Bo = null;
    this.Bt = null; // el refuerzo que llama al perder los escudos

    this.po();
    this.bs();
    this.bu();

    this.flash = this.add.rectangle(CX, CY, W, H, 0xffffff).setAlpha(0).setDepth(10);
    Music.on = true;
    window.__g = this; // handle de debug — quitar antes de enviar
  }

  // Las rocas se siembran alrededor del centro del sector
  po() {
    const rnd = (a, b) => a + RND() * (b - a);
    const rocks = 10;
    for (let i = 0; i < rocks; i++) {
      const p = this.ri(SECTOR_R * 0.95);
      this.en.push({
        k: 'R', x: p[0], y: p[1] * 0.5, z: p[2], r: 42, hp: 2, t: rnd(0, 9), model: ROCK_POOL[FLR(RND() * 4)],
        spin: rnd(-0.5, 0.5), vx: rnd(-16, 16), vy: rnd(-10, 10), vz: rnd(-16, 16), yw: 0,
      });
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
        yw: RND() * PI * 2,
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
    this.altText = this.add.text(12, 30, '', FONT(13, DIM_CSS));
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
    Music.Bo = !!(this.Bo || this.Bt);
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

    const cb = (this.Bo && this.Bo.ci && this.Bo) || (this.Bt && this.Bt.ci && this.Bt);
    const anyB = this.Bo || this.Bt;
    if (this.fz === 'play' && !cb) {
      if (anyB) {
        // la pelea es contra ÉL: apenas entra escolta, y nada más
        this.sd(dt, 1, 16);
      } else {
      // el reloj del arcade: todo aprieta con los minutos
      this.sd(dt, MIN(5, 1 + FLR(this.ep / 50)), MAX(5, 12 - this.ep / 50));
      this.wvAt -= dt;
      if (this.wvAt <= 0) {
        this.wvAt = 45;
        this.wave(MIN(5, 2 + FLR(this.ep / 90)));
      }
      // las torretas de la base, flotando sobre el disco: bajar al jalón a
      // cazarlas paga powerup seguro
      this.baseAt -= dt;
      if (this.baseAt <= 0) {
        this.baseAt = 13;
        if (this.en.filter((e) => e.base).length < 12) {
          if (!this.bgSaid) {
            this.bgSaid = 1;
            this.say('SURFACE GUNS BELOW.');
          }
          for (let i = 0; i < 6; i++) {
            const wk = RND() < 0.4;
            let gx2 = 0;
            let gz2 = 0;
            let gy2 = 0;
            let ok = false;
            for (let tr2 = 0; tr2 < 6 && !ok; tr2++) {
              const ang = RND() * PI * 2;
              gx2 = this.o.x + SIN(ang) * (700 + RND() * 600);
              gz2 = this.o.z + COS(ang) * (700 + RND() * 600);
              const cxx = FLR(gx2 / 700) * 700;
              const czz = FLR(gz2 / 700) * 700;
              const h2 = ((cxx * 1103 + czz * 12793) % 97 + 97) % 97;
              if (h2 >= 48) {
                // celda limpia: al suelo
                gy2 = surfY(gx2, gz2) - (wk ? 175 : 26);
                ok = true;
              } else if (!wk && h2 < 22) {
                // la torreta puede subirse al TECHO de la estructura
                gx2 = cxx + 350;
                gz2 = czz + 350;
                gy2 = surfY(gx2, gz2) - ((h2 < 8 ? 300 : 90) + (h2 % 5) * 70) - 26;
                ok = true;
              }
              // arco o muro en la celda: reintenta — nada nace DENTRO
            }
            if (!ok) continue;
            // dos de cada seis son TUYAS: menos, más frágiles — sin tu
            // ayuda, el frente de abajo se pierde
            const fr = i >= 4 ? 1 : 0;
            this.en.push({
              k: wk ? 'W' : 'S', base: 1, fr,
              x: gx2, y: gy2, z: gz2,
              r: wk ? 80 : 44, hp: fr ? (wk ? 3 : 2) : wk ? 5 : 3,
              t: RND() * 6, yw: RND() * 6.3, fA: 1 + RND() * 2,
            });
          }
        }
      }
      // la regla del ala: un wingman por cada SEIS enemigos en el aire —
      // mínimo uno, tope dos: el ala ayuda, la pelea es tuya
      this.wgAt = (this.wgAt ?? 22) - dt;
      if (this.wgAt <= 0) {
        this.wgAt = 14;
        const airE = this.en.filter((q) => (q.k === 'A' || q.k === 'G') && !q.X).length;
        const want = CLP(FLR(airE / 6) + 1, 1, 2);
        if (this.en.filter((q) => q.k === 'N' && !q.X).length < want) this.wingUp(1);
      }
      // el destructor vuelve siempre — y cada vez con menos ceremonia
      if (!anyB) {
      const was = this.bq;
      this.bq -= dt;
      if (was > 2.5 && this.bq <= 2.5) this.say('MASSIVE SIGNAL.');
      if (this.bq <= 0) {
        this.say('HYPERSPACE RUPTURE.');
        this.spawnBoss();
        this.wingUp(3); // no vas solo: tu ala llega contigo
      }
      }
      }
      // el casco se recompone solo: aguanta 28 s sin golpes
      if (this.hull < HULL_MAX) {
        this.hRt += dt;
        if (this.hRt >= 28) {
          this.hRt = 0;
          this.hull++;
          Sfx.pickup();
        }
      }
      // sobrevivir puntúa solo
      this.svT += dt;
      if (this.svT >= 5) {
        this.svT -= 5;
        this.sc += 25;
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

  // ¿Quién es el enemigo/aliado más cercano a esta unidad?
  foe(e, rng) {
    let best = null;
    let bd = rng;
    for (const q of this.en) {
      if (q.X || q.fr || (q.k !== 'A' && q.k !== 'G' && q.k !== 'S' && q.k !== 'W')) continue;
      const d = HYP(q.x - e.x, q.y - e.y, q.z - e.z);
      if (d < bd) {
        bd = d;
        best = q;
      }
    }
    return best;
  }

  ally(e, rng) {
    let best = null;
    let bd = rng;
    for (const q of this.en) {
      if (q.X || (!q.fr && q.k !== 'N')) continue;
      const d = HYP(q.x - e.x, q.y - e.y, q.z - e.z);
      if (d < bd) {
        bd = d;
        best = q;
      }
    }
    return best;
  }

  // Tu escuadrón: naves azules que cazan enemigos con tus mismas balas
  wingUp(n) {
    for (let i = 0; i < n; i++) {
      if (this.en.filter((q) => q.k === 'N').length >= 2) return;
      const ang = RND() * PI * 2;
      this.en.push({
        k: 'N',
        x: this.o.x + SIN(ang) * 500,
        y: this.o.y - 120,
        z: this.o.z + COS(ang) * 500,
        r: 40, hp: 4, t: 0, yw: 0, fA: 1, or: RND() < 0.5 ? 1 : -1, vx: 0, vy: 0, vz: 0,
      });
    }
  }

  // La emboscada: n naves entran A LA VEZ desde direcciones distintas —
  // el nivel 0 se gana peleando, no solo recogiendo
  wave(n) {
    this.say('AMBUSH.');
    Sfx.turn();
    this.wvN = n;
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * PI * 2 + RND() * 0.8;
      const gun = i === 2 && n >= 4; // las oleadas grandes traen una corbeta
      this.en.push({
        k: gun ? 'G' : 'A',
        x: this.o.x + SIN(ang) * 1500,
        y: this.o.y + (RND() - 0.5) * 600,
        z: this.o.z + COS(ang) * 1500,
        r: gun ? 130 : 22 * HUNTER_SCALE,
        hp: gun ? 8 : 4,
        t: 0,
        yw: 0,
        fA: 2 + RND() * 2,
        or: RND() < 0.5 ? 1 : -1,
        vx: 0, vy: 0, vz: 0,
        wv: 1,
      });
    }
  }

  // Después de un rato, salen a cazarte — y más, con cada pieza a bordo.
  // Con la primera pieza aparecen también interceptores, que embisten.
  sd(dt, max, every) {
    this.droneAt -= dt;
    const alive = this.en.filter((e) => e.k === 'A' || e.k === 'G').length;
    if (this.droneAt > 0 || alive >= max) return;
    this.droneAt = every;
    const ang = RND() * PI * 2;
    const gun = this.ep > 50 && RND() < 0.25;
    this.en.push({
      k: gun ? 'G' : 'A',
      x: this.o.x + SIN(ang) * 1300,
      y: this.o.y + (RND() - 0.5) * 500,
      z: this.o.z + COS(ang) * 1300,
      r: gun ? 130 : 22 * HUNTER_SCALE,
      hp: gun ? 8 : 4,
      t: 0,
      yw: 0,
      fA: 2,
      or: RND() < 0.5 ? 1 : -1,
      vx: 0,
      vy: 0,
      vz: 0,
    });
  }

  // El destructor sale del hiperespacio y bloquea el salto. Llega ANCLADO
  // CERCA DEL CENTRO del sector (la pelea nunca vive contra el borde, que
  // te empuja de vuelta), y al punto del anillo MÁS LEJANO de ti: la
  // entrada y la salva se ven enteras, de lejos, como una escena.
  spawnBoss(mini) {
    // Aparece LEJOS, delante de ti y a TU MISMA ALTURA: lo ves de lado,
    // entero, imponente. No hay anillo: el sector eres tú. El MINI es el
    // refuerzo: escolta sin domos, con menos casco — pero son DOS.
    const f = this.F;
    const h = HYP(f.x, f.z) || 1;
    const bd = mini ? 2400 : this.bossN ? 2200 : 2600;
    const ang = mini ? RND() * PI * 2 : 0;
    const bx = this.o.x + (mini ? SIN(ang) : f.x / h) * bd;
    const bz = this.o.z + (mini ? COS(ang) : f.z / h) * bd;
    const nb = {
      k: 'B',
      x: bx,
      y: MIN(this.o.y, surfY(bx, bz) - 380),
      z: bz,
      r: 520 * SD_SCALE,
      t: 0,
      yw: AT2(this.o.x - bx, this.o.z - bz), // la proa hacia ti
      ha: 8,
      ca: 12,
      ma: 6,
      cg: 0,
      // la entrada: primero el APAGÓN y las letras — y cuando todo está
      // negro, el destructor simplemente ESTÁ, de golpe, con el flash
      hd: 1,
      ci: 1,
      cineT: 0,
      short: mini || this.bossN ? 1 : 0, // el primero con toda la ceremonia
      tpAt: 0,
      salvoAt: 0,
      mini: mini ? 1 : 0,
      pz: SD_PARTS.filter(([kind], i) => !mini || (kind === 'b' || i < 4))
        .map(([kind, ox, oy, oz, hp]) => ({ kd: kind, ox, oy, oz, hp: mini && kind === 'b' ? 8 : hp, max: mini && kind === 'b' ? 8 : hp, fA: 1 + RND() * 3, burst: 0 })),
    };
    if (mini) this.Bt = nb;
    else {
      this.Bo = nb;
      // PEM: mata todo lo que vuela y limpia el cielo de fuego — la
      // escena es SUYA, y tu nave queda al garete
      for (const q of this.en) {
        if (q.k === 'A' || q.k === 'G' || q.k === 'E' || q.k === 'N') {
          q.X = true;
          this.bm(q);
        }
      }
      this.ss.length = 0;
      this.bx.push({ wx: nb.x, wy: nb.y, wz: nb.z, t: 0, big: true, r: 1100 });
      this.say('EMP BLAST.');
    }
    this.en.push(nb);
  }

  // Del casco del destructor al mundo, y de vuelta
  bw(b, ox, oy, oz) {
    const c = COS(b.yw) * SD_SCALE;
    const s = SIN(b.yw) * SD_SCALE;
    return [b.x + ox * c + oz * s, b.y + oy * SD_SCALE, b.z - ox * s + oz * c];
  }
  wb(b, wx, wy, wz) {
    const c = COS(b.yw) / SD_SCALE;
    const s = SIN(b.yw) / SD_SCALE;
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
    if (pt.kd !== 'b') return true;
    return !b.pz.some((q) => q.kd === 'd' && q.hp > 0);
  }

  ba(b, f) {
    let best = null;
    let bestDot = -2;
    for (const pt of b.pz) {
      if (!this.bo(b, pt)) continue;
      const [wx, wy, wz] = this.bw(b, pt.ox, pt.oy, pt.oz);
      const d = HYP(wx - this.o.x, wy - this.o.y, wz - this.o.z) || 1;
      const dot = ((wx - this.o.x) * f.x + (wy - this.o.y) * f.y + (wz - this.o.z) * f.z) / d;
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
    if (pt.kd === 't') {
      this.ad(60);
    } else if (pt.kd === 'd') {
      this.ad(150);
      const domesLeft = b.pz.some((q) => q.kd === 'd' && q.hp > 0);
      this.say(domesLeft ? 'DOME DOWN.' : 'HIT THE BRIDGE.');
      b.tpAt = 0.7; // perder un domo lo hace saltar
      // sin escudos, no pelea limpio: llama a su escolta — ahora son DOS
      if (!domesLeft && !this.Bt && !b.mini && this.bossN >= 1) {
        this.say('IT CALLS FOR BACKUP.');
        this.spawnBoss(1);
      }
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
    if (b.ci) {
      b.cineT += dt;
      const ct = b.cineT;
      const S = b.short ? 0.8 : 1;
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
        if (b.salvoAt <= 0 && this.en.filter((q) => q.k === 'E').length < 6) {
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
          const P = this.o;
          const mk = 0.45 + RND() * 0.3;
          this.en.push({
            k: 'E', x: wx, y: wy, z: wz, r: 22, hp: 1, t: 0, yw: 0,
            vx: COS(ang) * (260 + RND() * 300),
            vy: -(fast ? 260 : (300 + RND() * 180)) * (b.short ? 0.7 : 1),
            vz: SIN(ang) * (260 + RND() * 300),
            rise: (fast ? 0.6 : 2.2 + RND() * 1.2) * (b.short ? 0.6 : 1),
            fast,
            mid: fast ? 0 : 1,
            gx: b.x + (P.x - b.x) * mk + (RND() - 0.5) * 700,
            gy: P.y + (RND() - 0.5) * 300,
            gz: b.z + (P.z - b.z) * mk + (RND() - 0.5) * 700,
            lf: 12,
          });
          if (RND() < 0.35) Sfx.missile();
        }
      }
      if (ct > 6.4 * S) {
        b.ci = 0;
        b.cineDark = 0;
        if (!b.short) this.wgAt = 4; // el ala se reagrupa tras el PEM
      }
      return;
    }

    // si te le acercas demasiado, no pelea contigo cuerpo a cuerpo:
    // desaparece y te castiga desde lejos
    if (!b.tpAt && dist < 420 && this.ep > (b.tpCd || 0)) {
      b.tpCd = this.ep + 20;
      b.tpAt = 1.0;
      this.say('TOO CLOSE — IT CHARGES A JUMP.');
    }
    // cada domo que pierde también lo saca del apuro: salto corto —
    // desaparece, un silencio, y reaparece lejos con salva
    if (b.tpAt > 0) {
      b.tpAt -= dt;
      if (b.tpAt <= 0) {
        for (const e2 of this.en) {
          if (e2.k === 'E') {
            e2.X = true;
            this.bm(e2);
          }
        }
        // tus misiles en vuelo hacia él vuelven al tubo: el salto no roba
        let back = 0;
        for (const m2 of this.ms) {
          if (m2.target === b && !m2.X) {
            m2.X = true;
            back++;
          }
        }
        if (back) {
          this.am = MIN(MISSILE_MAX, this.am + back);
          this.say('MISSILES RECALLED.');
        }
        const ta = RND() * PI * 2;
        b.x = this.o.x + SIN(ta) * 1700;
        b.z = this.o.z + COS(ta) * 1700;
        b.y = MIN(this.o.y, surfY(b.x, b.z) - 380);
        b.yw = AT2(this.o.x - b.x, this.o.z - b.z);
        b.hd = 1;
        b.short = 1;
        b.ci = 1;
        b.cineT = 0;
        b.salvoAt = 0;
        Sfx.jump();
        this.say('IT JUMPED.');
        return;
      }
    }
    for (const pt of b.pz) if (pt.ft) pt.ft -= dt;
    // gira lento para ponerte la proa — más lento que tu órbita, así ganarle
    // la espalda es cuestión de volar. Avanza si te alejas, nunca retrocede,
    // y no se deja arrastrar lejos del centro del sector.
    b.yw += AWR(AT2(dx, dz) - b.yw) * MIN(1, 0.11 * dt);
    const move = dist > 1900 ? 90 : 0;
    b.x += SIN(b.yw) * move * dt;
    b.z += COS(b.yw) * move * dt;
    b.y += SIN(b.t * 0.4) * 6 * dt;

    // torretas: ráfagas de tres, lentas y esquivables — pero son seis
    for (const pt of b.pz) {
      if (pt.kd !== 't' || pt.hp <= 0 || dist > 2600) continue;
      pt.fA -= dt;
      if (pt.burst > 0 && pt.fA <= 0) {
        pt.burst--;
        pt.fA = pt.burst ? 0.2 : 4.6 + RND() * 1.8;
        const [wx, wy, wz] = this.bw(b, pt.ox, pt.oy - 30, pt.oz);
        // el destructor es la policía mala: la mitad de sus ráfagas van
        // contra los carroñeros, no contra ti
        let prey = null;
        if (RND() < 0.5) {
          for (const q of this.en) {
            if ((q.k === 'A' || q.k === 'G') && !q.X && HYP(q.x - wx, q.y - wy, q.z - wz) < 2000) {
              prey = q;
              break;
            }
          }
        }
        if (prey) {
          const pdx = prey.x - wx;
          const pdy = prey.y - wy;
          const pdz = prey.z - wz;
          const pm = HYP(pdx, pdy, pdz) || 1;
          this.bx.push({ wx, wy, wz, t: 0.28, muzzle: true });
          this.ss.push({ x: wx, y: wy, z: wz, vx: (pdx / pm) * SHOT_SPEED, vy: (pdy / pm) * SHOT_SPEED, vz: (pdz / pm) * SHOT_SPEED, lf: 8, sd: 1 });
          if (!this.sdSaid) {
            this.sdSaid = 1;
            this.say('IT HUNTS THEM TOO.');
          }
        } else this.sa({ x: wx, y: wy, z: wz }, SHOT_SPEED);
      } else if (pt.burst === 0 && pt.fA <= 0) pt.burst = 2;
    }

    // el hangar suelta interceptores
    b.ha -= dt;
    if (b.ha <= 0) {
      b.ha = 16;
      if (this.en.filter((e) => e.k === 'A').length < 3) {
        const [wx, wy, wz] = this.bw(b, 0, SD_KEEL + 30, -100);
        this.en.push({ k: 'A', x: wx, y: wy, z: wz, r: 22 * HUNTER_SCALE, hp: 4, t: 0, yw: b.yw, fA: 2, or: 1, vx: 0, vy: 120, vz: 0 });
      }
    }

    // la torre suelta una pareja de misiles que te persiguen
    b.ma -= dt;
    if (b.ma <= 0 && dist < 2600 && this.en.filter((q) => q.k === 'E').length < 4) {
      b.ma = 15;
      for (const side of [-1, 1]) {
        const [wx, wy, wz] = this.bw(b, side * 60, -170, -330);
        const [ox, , oz] = this.bw(b, side * 400, 0, -330);
        const vx = (ox - b.x) * 0.3;
        const vz = (oz - b.z) * 0.3;
        this.en.push({ k: 'E', x: wx, y: wy, z: wz, r: 22, hp: 1, t: 0, yw: 0, vx, vy: -160, vz, lf: 9 });
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
    b.X = true;
    if (this.Bo === b) this.Bo = null;
    if (this.Bt === b) this.Bt = null;
    for (let i = 0; i < 9; i++) {
      const [wx, wy, wz] = this.bw(b, (RND() - 0.5) * 400, (RND() - 0.7) * 150, SD_REAR + RND() * 900);
      this.bx.push({ wx, wy, wz, t: -i * 0.12, big: true });
    }
    this.sy(b.x, b.y, b.z, 24);
    this.sh = 16;
    this.sc += b.mini ? 800 : 1500;
    Sfx.boom();
    this.bossN++;
    this.bq = 50; // el siguiente ya viene (cuando no quede ninguno)
    this.say(b.mini ? 'BACKUP DOWN. +800' : 'DESTROYER DOWN. +1500');
  }

  ad(pts) {
    this.sc += pts * this.mu;
    if (this.mt > 0) this.mu = MIN(5, this.mu + 1);
    else this.mu = 2;
    this.mt = 4;
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
        lf: 0.5 + RND() * 0.3,
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
    const cineB = (this.Bo && this.Bo.ci && this.Bo) || (this.Bt && this.Bt.ci && this.Bt);
    // solo la PRIMERA entrada te quita el mando; en los saltos a mitad de
    // pelea se apaga el sector, pero la nave sigue siendo tuya
    const sceneHold = !!cineB && !cineB.short;
    if (sceneHold) {
      const b = cineB;
      // encuadra 500 POR ENCIMA del casco: el destructor queda en cuadro,
      // y al volver el mando tu rumbo pasa limpio sobre la torre en vez de
      // estamparte contra la proa
      const to = vnorm({ x: b.x - this.o.x, y: b.y - 500 - this.o.y, z: b.z - this.o.z });
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
    if (ABS(upness) > 0.15) {
      const A = upness > 0 ? WORLD_UP : { x: 0, y: 1, z: 0 };
      F = rotAxis(F, A, -ya);
      U = rotAxis(U, A, -ya);
    } else {
      // en picada el vertical degenera: giro sobre el propio eje, con MÁS
      // autoridad — las evasivas nariz abajo responden
      const ya2 = ya * 1.3;
      F = vmix(F, COS(ya2), vcross(F, U), SIN(ya2));
    }
    let R;
    [F, U, R] = orthoBasis(F, U);

    // Con input, el enderezado NO existe. Un ladeo se corrige rápido a un
    // tercio de segundo de soltar; de cabeza (un loop, media vuelta) la
    // nave sigue siendo tuya un segundo entero y vuelve despacio
    this.lvT = !pit && !turn ? (this.lvT || 0) + dt : 0;
    const up = vdot(F, WORLD_UP);
    if (this.lvT > 0.3 && ABS(up) < 0.97) {
      const D = vnorm(vmix(WORLD_UP, 1, F, -up));
      const phi = AT2(vdot(F, vcross(U, D)), vdot(U, D));
      const big = ABS(phi) > 1.1;
      if (!big || this.lvT > 1) {
        const th = Math.sign(phi) * MIN(ABS(phi), (big ? 1.2 : ROLL_LEVEL) * dt);
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
      this.sp += (6 - this.sp) * MIN(1, 4 * dt); // el PEM te dejó al garete
    } else if (held.P1_2 && this.bz > 0) {
      this.bz = MAX(0, this.bz - BOOST_DRAIN * dt);
      this.sp = MIN(NITRO_MAX, this.sp + NITRO_ACCEL * dt);
    } else {
      if (!held.P1_2) this.bz = MIN(BOOST_MAX, this.bz + BOOST_REGEN * dt);
      this.sp += (this.cu - this.sp) * MIN(1, SPEED_EASE * dt);
    }

    // cerca del destructor la pasada se frena sola (salvo con nitro):
    // giras antes, lo pierdes de vista menos, la pelea se queda contigo

    const f = this.fw();
    this.o.x += f.x * this.sp * dt;
    this.o.y += f.y * this.sp * dt;
    this.o.z += f.z * this.sp * dt;

    // los BORDES: pasado el muro o el techo te devuelve a la línea, y el rumbo
    // pierde la componente que empuja hacia afuera y gira — contra el muro de
    // lado, contra el techo de nariz — así ni de frente te quedas trabado
    const P = this.o;
    const hr = HYP(P.x, P.z);
    for (const [over, o, tg] of [
      [hr - BND_R, { x: P.x / hr, y: 0, z: P.z / hr }, this.R],
      [BND_TOP - P.y, { x: 0, y: -1, z: 0 }, this.U],
    ]) {
      if (over <= 0) continue;
      P.x -= o.x * over;
      P.y -= o.y * over;
      P.z -= o.z * over;
      const out = vdot(this.F, o);
      const k = MIN(1, 6 * dt) * out;
      if (out > 0) [this.F, this.U, this.R] = orthoBasis(vmix(vmix(this.F, 1, o, -1.5 * k), 1, tg, k), this.U);
      if (this.ep > this.wa) {
        this.wa = this.ep + 3;
        this.say('SECTOR EDGE.');
      }
    }
    // el agujero negro: cuanto más cerca, más tira — y muy cerca, te traga
    const bdx = BH[0] - P.x;
    const bdy = BH[1] - P.y;
    const bdz = BH[2] - P.z;
    const bhd = HYP(bdx, bdy, bdz);
    this.bhx = CLP(1 - (bhd - BH_KILL) / (BH_PULL - BH_KILL), 0, 1);
    if (bhd < BH_PULL) {
      if (this.ep > (this.rmb || 0)) {
        // el retumbo del vacío, cada vez más presente
        this.rmb = this.ep + 0.8;
        Sfx.tn(26 + this.bhx * 22, 0.9, 'sawtooth', 0.11 * this.bhx, 18);
      }
      const grip = bhd < BH_GRIP;
      // el agarre: un jalón que el crucero no vence — sales con dash o nitro.
      // Y el tiempo se estira: sin nitro la nave se frena, la caída DURA
      if (grip && !held.P1_2) this.sp += (60 - this.sp) * MIN(1, 8 * dt);
      const pull = (grip ? 290 : 650 * this.bhx * this.bhx) * dt / bhd;
      P.x += bdx * pull;
      P.y += bdy * pull;
      P.z += bdz * pull;
      this.sh = MAX(this.sh, grip ? 6 : this.bhx * 4);
      if (this.ep > this.wa) {
        this.wa = this.ep + (grip ? 2.5 : 4);
        this.say(grip ? 'IT HAS YOU — DASH.' : 'BLACK HOLE — BREAK AWAY.');
      }
    }
    // el horizonte de sucesos no negocia: ni el escudo ni el modo prueba
    if (bhd < BH_KILL) this.die();

    // la superficie de la estación es PARED: aviso cerca, muerte al tocarla
    const sdy = surfY(this.o.x, this.o.z) - this.o.y;
    if (sdy < 46) this.die();
    // las torres de la superficie son SÓLIDAS: rozarlas cuesta casco
    if (sdy < 620) {
      const cs = 700;
      const cx0 = FLR(this.o.x / cs) * cs;
      const cz0 = FLR(this.o.z / cs) * cs;
      const hsh = ((cx0 * 1103 + cz0 * 12793) % 97 + 97) % 97;
      if (hsh < 22) {
        const hh = (hsh < 8 ? 300 : 90) + (hsh % 5) * 70;
        const bx0 = cx0 + cs * 0.3;
        const bz0 = cz0 + cs * 0.3;
        const bw2 = cs * 0.4;
        const yb = surfY(bx0 + bw2 / 2, bz0 + bw2 / 2);
        if (
          this.o.y > yb - hh &&
          this.o.x > bx0 && this.o.x < bx0 + bw2 &&
          this.o.z > bz0 && this.o.z < bz0 + bw2
        ) {
          this.hy(time);
          this.o.y = yb - hh - 70; // la torre te escupe hacia arriba
        }
      } else if (hsh >= 22 && hsh < 30) {
        // el travesaño del arco es sólido: o por debajo, o te duele
        const zm = cz0 + cs / 2;
        const hA = 230 + (hsh % 4) * 40;
        const yT = surfY(cx0 + cs / 2, zm) - hA;
        if (
          ABS(this.o.z - zm) < 40 &&
          this.o.x > cx0 + 60 && this.o.x < cx0 + cs - 60 &&
          this.o.y > yT - 20 && this.o.y < yT + 60
        ) {
          this.hy(time);
          this.o.y = yT - 90;
        }
      } else if (hsh >= 42 && hsh < 48) {
        // el muro bajo: por encima o por los lados
        const zm = cz0 + cs / 2;
        const yW = surfY(cx0 + cs / 2, zm);
        if (
          ABS(this.o.z - zm) < 34 &&
          this.o.x > cx0 + 40 && this.o.x < cx0 + cs - 40 &&
          this.o.y > yW - 120
        ) {
          this.hy(time);
          this.o.y = yW - 190;
        }
      }
    }

    // alabeo con el giro
    const bank = this.yv * 0.34;
    this.roll += (bank - this.roll) * MIN(1, 8 * dt);

    // B1: cañón — sale de la nariz, hereda tu velocidad (doble con la mejora)
    if (held.P1_1 && time >= this.fy) {
      this.fy = time + FIRE_MS;
      this.mz2 = 0.05;
      Sfx.fire();
      const sp = BOLT_SPEED + this.sp;
      const R = this.R;
      // contra el destructor, el cañón corrige hacia el punto débil abierto
      // que tengas casi de frente — pegarle es cuestión de apuntar cerca
      let aim = f;
      for (const bb of [this.Bo, this.Bt]) {
        if (!bb || bb.hd) continue;
        const pt = this.ba(bb, f);
        if (pt) {
          const [wx, wy, wz] = this.bw(bb, pt.ox, pt.oy, pt.oz);
          const to = vnorm({ x: wx - this.o.x, y: wy - this.o.y, z: wz - this.o.z });
          if (vdot(to, f) > 0.93) {
            aim = to;
            break;
          }
        }
      }
      if (aim === f) {
        const tg = this.bt(f);
        if (tg && tg.k !== 'B') {
          const dd = HYP(tg.x - this.o.x, tg.y - this.o.y, tg.z - this.o.z) || 1;
          const lead = dd / (BOLT_SPEED + this.sp);
          const to = vnorm({
            x: tg.x + (tg.vx || 0) * lead - this.o.x,
            y: tg.y + (tg.vy || 0) * lead - this.o.y,
            z: tg.z + (tg.vz || 0) * lead - this.o.z,
          });
          // ayuda al que YA apunta bien: cono estrecho (~10°), no imán
          if (vdot(to, f) > 0.985) aim = to;
        }
      }
      for (const off of [-9, 9]) {
        this.bl.push({
          x: this.o.x + f.x * 24 + R.x * off,
          y: this.o.y + f.y * 24 + R.y * off,
          z: this.o.z + f.z * 24 + R.z * off,
          vx: aim.x * sp,
          vy: aim.y * sp,
          vz: aim.z * sp,
          lf: BOLT_LIFE,
        });
      }
    }

    // los misiles vuelven solos, uno cada tanto
    if (this.am < MISSILE_MAX) {
      this.ar += dt;
      if (this.ar >= MISSILE_REGEN) {
        this.ar = 0;
        this.am++;
        Sfx.ammo();
      }
    } else this.ar = 0;

    // B3: misil — busca el blanco más alineado con tu nariz; contra el
    // destructor apunta al punto débil vivo más a tiro
    if (pressed.P1_3 && this.am > 0) {
      this.am--;
      Sfx.missile();
      const target = this.bt(f);
      this.ms.push({
        x: this.o.x + f.x * 26 - this.U.x * 6,
        y: this.o.y + f.y * 26 - this.U.y * 6,
        z: this.o.z + f.z * 26 - this.U.z * 6,
        vx: f.x * MISSILE_SPEED,
        vy: f.y * MISSILE_SPEED,
        vz: f.z * MISSILE_SPEED,
        target,
        part: target && target.k === 'B' ? this.ba(target, f) : null,
        tr: [],
        lf: 5,
      });
    }
  }

  bt(f) {
    let best = null;
    let bestDot = 0.75; // solo lo que ya tienes bastante de frente
    for (const e of this.en) {
      if (e.k === 'N' || e.fr || e.X) continue;
      const dx = e.x - this.o.x;
      const dy = e.y - this.o.y;
      const dz = e.z - this.o.z;
      const d = HYP(dx, dy, dz);
      if (d > (e.k === 'B' ? 2600 : 1700)) continue;
      // el destructor es enorme: cuenta como "de frente" aunque su centro no lo esté
      const dot = (dx * f.x + dy * f.y + dz * f.z) / MAX(d, 1) + (e.k === 'B' ? 0.45 : 0);
      if (dot > bestDot) {
        bestDot = dot;
        best = e;
      }
    }
    return best;
  }

  // La muerte: una sola, para todo lo que mata de un golpe
  die() {
    if (this.fz === 'out' || (this.Bo && this.Bo.ci) || (this.Bt && this.Bt.ci)) return;
    this.fz = 'out';
    this.bx.push({ wx: this.o.x, wy: this.o.y, wz: this.o.z, t: 0, big: true });
    this.sh = 14;
    Sfx.boom();
    this.time.delayedCall(1400, () => this.scene.start('over', { sc: this.sc }));
  }

  hy(time) {
    if (this.fz === 'out' || (this.Bo && this.Bo.ci) || (this.Bt && this.Bt.ci)) return;
    if (time < this.su) {
      // la burbuja se lleva el golpe: se ve dónde pegó
      this.ht = 0.3;
      return;
    }
    if (time < this.iu || time < this.du) return;
    this.iu = time + 2600;
    this.sh = 9;
    Sfx.hurt();
    if (GOD) return; // modo prueba: duele, pero no mata
    this.hull--;
    this.hRt = 0;
    if (this.hull <= 0) this.die();
  }

  // --- el sector ---
  ue(time, dt) {
    const P = this.o;

    for (const e of this.en) {
      e.t += dt;
      if (e.ft) e.ft -= dt;
      const dx = P.x - e.x;
      const dy = P.y - e.y;
      const dz = P.z - e.z;
      const dist = HYP(dx, dy, dz);

      if (e.k === 'A' || e.k === 'G' || e.k === 'N') {
        // vuelan como TÚ: siempre hacia adelante, virando con alabeo. El
        // ACE hace pasadas y rompe cerca; la CORBETA guarda su anillo y
        // ladra ráfagas — grande, lenta, nunca huye.
        const gun2 = e.k === 'G';
        const spd2 = gun2 ? 165 : 320;
        let gx = P.x;
        let gy = P.y;
        let gz = P.z;
        let wt = null;
        if (e.k === 'N') {
          // el wing caza al enemigo más cercano; sin blanco, vuela contigo;
          // pegado al blanco, ROMPE en evasiva como un piloto de verdad
          let td = 1e9;
          for (const q of this.en) {
            if ((q.k === 'A' || q.k === 'G' || q.k === 'E') && !q.X) {
              const d3 = HYP(q.x - e.x, q.y - e.y, q.z - e.z);
              if (d3 < td) {
                td = d3;
                wt = q;
              }
            }
          }
          if (e.fl > 0) {
            e.fl -= dt;
            gx = e.x + this.R.x * 900 * e.or;
            gy = e.y - 300;
            gz = e.z + this.R.z * 900 * e.or;
          } else if (wt && td < 300) {
            e.fl = 1 + RND() * 0.5;
          } else if (wt) {
            gx = wt.x;
            gy = wt.y;
            gz = wt.z;
          } else {
            gx = P.x + this.R.x * 380 * e.or;
            gy = P.y - 100;
            gz = P.z + this.R.z * 380 * e.or;
          }
          // y cada tanto, un misil propio — menos que tú, pero pega
          e.msAt = (e.msAt ?? 8) - dt;
          const mtg = wt || this.Bo || this.Bt;
          if (e.msAt <= 0 && mtg && !mtg.hd) {
            e.msAt = 15;
            const md = HYP(mtg.x - e.x, mtg.y - e.y, mtg.z - e.z) || 1;
            this.ms.push({
              x: e.x, y: e.y, z: e.z,
              vx: ((mtg.x - e.x) / md) * MISSILE_SPEED,
              vy: ((mtg.y - e.y) / md) * MISSILE_SPEED,
              vz: ((mtg.z - e.z) / md) * MISSILE_SPEED,
              target: mtg,
              part: mtg.k === 'B' ? this.ba(mtg, this.F) : null,
              tr: [],
              lf: 5,
            });
            Sfx.missile();
          }
        } else if (gun2) {
          if (dist < 620) {
            gx = e.x - (dx / dist) * 1200;
            gy = e.y - (dy / dist) * 400;
            gz = e.z - (dz / dist) * 1200;
          } else if (dist < 1100) {
            gx = e.x + (dz / dist) * 900 * e.or;
            gz = e.z - (dx / dist) * 900 * e.or;
            gy = P.y;
          }
        } else if (e.fl > 0) {
          e.fl -= dt;
          // huyendo: lejos de ti, con un quiebre lateral
          gx = e.x - (dx / dist) * 1500 + (dz / dist) * 500 * e.or;
          gy = e.y - (dy / dist) * 600;
          gz = e.z - (dz / dist) * 1500 - (dx / dist) * 500 * e.or;
        } else if (dist < 320) {
          // te tuvo demasiado cerca: rompe y ESCAPA — la pasada terminó
          e.fl = 0.7 + RND() * 0.6;
        }
        let m = HYP(e.vx, e.vy, e.vz);
        if (m < 40) {
          e.vx = (dx / dist) * spd2;
          e.vy = (dy / dist) * spd2;
          e.vz = (dz / dist) * spd2;
          m = spd2;
        }
        const ddx = gx - e.x;
        const ddy = gy - e.y;
        const ddz = gz - e.z;
        const dd = HYP(ddx, ddy, ddz) || 1;
        const k2 = MIN(1, (gun2 ? 0.9 : 2.3) * dt);
        const oy = AT2(e.vx, e.vz);
        let nx = e.vx / m + (ddx / dd - e.vx / m) * k2;
        let ny = e.vy / m + (ddy / dd - e.vy / m) * k2;
        let nz = e.vz / m + (ddz / dd - e.vz / m) * k2;
        const nm = HYP(nx, ny, nz) || 1;
        e.vx = (nx / nm) * spd2;
        e.vy = (ny / nm) * spd2;
        e.vz = (nz / nm) * spd2;
        e.x += e.vx * dt;
        e.y += e.vy * dt;
        e.z += e.vz * dt;
        e.yw = AT2(e.vx, e.vz);
        // el alabeo visual sale del propio viraje
        e.bank = (e.bank || 0) + (CLP(AWR(e.yw - oy) * 14, -0.9, 0.9) - (e.bank || 0)) * MIN(1, 6 * dt);
        e.fA -= dt;
        if (e.k === 'N') {
          // dispara TUS balas contra su blanco — sin prisa y con pulso de
          // humano: muchas se van por un lado
          if (wt && e.fA <= 0) {
            const td2 = HYP(wt.x - e.x, wt.y - e.y, wt.z - e.z) || 1;
            if (td2 < 1300) {
              e.fA = 3.4;
              this.bl.push({
                x: e.x, y: e.y, z: e.z,
                vx: ((wt.x - e.x) / td2) * 900 + (RND() - 0.5) * 180,
                vy: ((wt.y - e.y) / td2) * 900 + (RND() - 0.5) * 180,
                vz: ((wt.z - e.z) / td2) * 900 + (RND() - 0.5) * 180,
                lf: 1.6,
                fr: 1,
              });
              Sfx.fire();
            }
          }
        } else if (e.fA <= 0 && dist < (gun2 ? 1500 : 1300)) {
          e.fA = gun2 ? 1.6 : 2.2;
          this.sa(e, SHOT_SPEED);
        }
      } else if (e.k === 'W') {
        // el caminante: pisa la superficie y te sigue por la sombra
        let tx2 = dx;
        let tz2 = dz;
        let tdist = dist;
        if (e.fr) {
          const tg = this.foe(e, 2400);
          if (tg) {
            tx2 = tg.x - e.x;
            tz2 = tg.z - e.z;
            tdist = HYP(tx2, tz2) || 1;
          }
        }
        const hm = HYP(tx2, tz2) || 1;
        e.yw = AT2(tx2, tz2);
        if (tdist > 500) {
          const nx2 = e.x + (tx2 / hm) * 55 * dt;
          const nz2 = e.z + (tz2 / hm) * 55 * dt;
          const ch2 = (((FLR(nx2 / 700) * 700 * 1103 + FLR(nz2 / 700) * 700 * 12793) % 97) + 97) % 97;
          if (ch2 >= 48 || (ch2 >= 22 && ch2 < 42)) {
            e.x = nx2;
            e.z = nz2;
          }
        }
        e.y = surfY(e.x, e.z) - 175; // cuerpo ALTO: por debajo se pasa
        e.fA -= dt;
        if (e.fA <= 0) {
          if (e.fr) {
            const tg = this.foe(e, 1500);
            if (tg) {
              e.fA = 2.6;
              const fd = HYP(tg.x - e.x, tg.y - e.y, tg.z - e.z) || 1;
              this.bl.push({ x: e.x, y: e.y - 20, z: e.z, vx: ((tg.x - e.x) / fd) * 620, vy: ((tg.y - e.y) / fd) * 620, vz: ((tg.z - e.z) / fd) * 620, lf: 2.4, fr: 1 });
            }
          } else if (dist < 1500) {
            e.fA = 2.6;
            const fr2 = RND() < 0.4 ? this.ally(e, 1400) : null;
            if (fr2) {
              const fd = HYP(fr2.x - e.x, fr2.y - e.y, fr2.z - e.z) || 1;
              this.ss.push({ x: e.x, y: e.y - 20, z: e.z, vx: ((fr2.x - e.x) / fd) * SHOT_SPEED, vy: ((fr2.y - e.y) / fd) * SHOT_SPEED, vz: ((fr2.z - e.z) / fd) * SHOT_SPEED, lf: 7 });
            } else this.sa(e, SHOT_SPEED);
          }
        }
        if (dist > 4200) e.X = true;
      } else if (e.k === 'E') {
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
        e.lf -= dt;
        if (e.lf <= 0) {
          e.X = true;
          this.bm(e);
        }
      } else if (e.k === 'B') {
        this.ub(e, dx, dz, dist, dt);
      } else if (e.k === 'S') {
        if (dist > 4200) e.X = true; // quedó atrás: el mundo viaja contigo
        e.yw += 0.5 * dt; // gira, vigilando
        e.y += SIN(e.t * 1.1) * 8 * dt;
        e.fA -= dt;
        if (e.fr) {
          // torreta ALIADA: busca lo enemigo y lo bate con tus balas
          if (e.fA <= 0) {
            const tg = this.foe(e, 1500);
            if (tg) {
              e.fA = 2.4;
              const fd = HYP(tg.x - e.x, tg.y - e.y, tg.z - e.z) || 1;
              this.bl.push({
                x: e.x, y: e.y - 30, z: e.z,
                vx: ((tg.x - e.x) / fd) * 620,
                vy: ((tg.y - e.y) / fd) * 620,
                vz: ((tg.z - e.z) / fd) * 620,
                lf: 2.4,
                fr: 1,
              });
            }
          }
        } else if (e.fA <= 0 && dist < 1600) {
          e.fA = e.base ? 2.1 : 3.2;
          // la enemiga reparte: a veces a ti, a veces a los tuyos
          const fr2 = RND() < 0.5 ? this.ally(e, 1400) : null;
          if (fr2) {
            const fd = HYP(fr2.x - e.x, fr2.y - e.y, fr2.z - e.z) || 1;
            this.bx.push({ wx: e.x, wy: e.y - 26, wz: e.z, t: 0.28, muzzle: true });
            this.ss.push({ x: e.x, y: e.y - 26, z: e.z, vx: ((fr2.x - e.x) / fd) * SHOT_SPEED, vy: ((fr2.y - e.y) / fd) * SHOT_SPEED, vz: ((fr2.z - e.z) / fd) * SHOT_SPEED, lf: 7 });
          } else if (dist < 1000) this.sa(e, SHOT_SPEED);
        }
      } else if (e.k === 'R') {
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
      if (e.vx !== undefined && e.k !== 'R') {
        e.tt = (e.tt || 0) + dt;
        if (e.tt > 0.05) {
          e.tt = 0;
          (e.tr = e.tr || []).push([e.x, e.y, e.z]);
          if (e.tr.length > (e.k === 'E' ? 26 : 12)) e.tr.shift();
        }
      }

      // contacto contigo (el wing es tuyo: se atraviesa)
      if (!e.X && e.k !== 'N' && !e.fr && dist < e.r + 16) {
        if (
          (this.sp > RAM_SPEED || time < this.du || time < this.su) &&
          (e.k === 'A' || e.k === 'G' || e.k === 'E')
        ) {
          // a toda velocidad — o con dash o escudo — la nave es el arma;
          // a la corbeta solo la abolla
          this.damage(e, e.k === 'G' ? 3 : 99);
          this.sh = 7;
        } else if (e.k === 'A' || e.k === 'G') {
          // metal contra metal: el caza estalla y tú pierdes UN casco —
          // morir de un toque contra algo tan pequeño no era justo, y las
          // emboscadas lo convertían en ejecución
          this.damage(e, 99);
          this.hy(time);
        } else {
          if (e.k !== 'S' && e.k !== 'B' && e.k !== 'W') e.X = true;
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
      s.lf -= dt;
      const d = HYP(P.x - s.x, P.y - s.y, P.z - s.z);
      if (shieldOn && d < SHIELD_R + (s.big ? 40 : 0)) {
        s.X = true;
        this.ht = 0.3;
        this.bx.push({ wx: s.x, wy: s.y, wz: s.z, t: 0.32 });
        continue;
      }
      if (d < (s.big ? 60 : 22)) {
        s.X = true;
        this.hy(time);
      }
      if (!s.X) {
        for (const q of this.en) {
          if ((q.k === 'N' || q.fr) && !q.X && HYP(q.x - s.x, q.y - s.y, q.z - s.z) < (q.k === 'W' ? 90 : 50)) {
            s.X = true;
            q.hp--;
            if (q.hp <= 0) {
              q.X = true;
              this.bm(q);
              this.sy(q.x, q.y, q.z, 5);
            } else this.bx.push({ wx: s.x, wy: s.y, wz: s.z, t: 0.32 });
            break;
          }
        }
      }
      if (s.sd && !s.X) {
        for (const q of this.en) {
          if ((q.k === 'A' || q.k === 'G') && !q.X && HYP(q.x - s.x, q.y - s.y, q.z - s.z) < 60) {
            s.X = true;
            this.damage(q, 1);
            break;
          }
        }
      }
    }

    // tus disparos contra el sector
    for (const b of this.bl) {
      let ate = false;
      for (const bb of [this.Bo, this.Bt]) {
        if (bb && !bb.hd && this.boltVsBoss(bb, b)) {
          ate = true;
          break;
        }
      }
      if (ate) continue;
      for (const e of this.en) {
        if (e.X || e.k === 'B' || e.k === 'N' || e.fr) continue;
        const d = HYP(b.x - e.x, b.y - e.y, b.z - e.z);
        if (d < e.r + 10) {
          b.X = true;
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
      s.lf -= dt;
    }
    this.sz = this.sz.filter((s) => s.lf > 0);

    for (const bm of this.bx) bm.t += dt;
    this.en = this.en.filter((e) => !e.X);
    this.ss = this.ss.filter((s) => !s.X && s.lf > 0);
    this.bx = this.bx.filter((b) => b.t < 0.5);
  }

  // Un disparo tuyo contra el destructor: pega en un punto débil, o el casco
  // se lo traga con una chispa. Devuelve true si el disparo se consumió.
  boltVsBoss(boss, b) {
    for (const pt of boss.pz) {
      if (pt.hp <= 0) continue;
      const [wx, wy, wz] = this.bw(boss, pt.ox, pt.oy, pt.oz);
      if (HYP(b.x - wx, b.y - wy, b.z - wz) < SD_PART_R[pt.kd]) {
        b.X = true;
        if (this.bo(boss, pt)) this.bp(boss, pt, 1);
        else this.bx.push({ wx: b.x, wy: b.y, wz: b.z, t: 0.35 });
        return true;
      }
    }
    if (this.ib(boss, b.x, b.y, b.z, 0)) {
      b.X = true;
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
    e.X = true;
    if (e.fr) {
      this.bm(e);
      this.sy(e.x, e.y, e.z, 4);
      Sfx.boom();
      return;
    }
    // la última nave de la emboscada paga SIEMPRE: así se aprende que
    // matarlas es lo que da los poderes
    if (e.wv) {
      e.wv = 0;
      if (--this.wvN <= 0) {
        this.say('WAVE CLEAR.');
        this.ad(100);
      }
    }
    this.bm(e);
    this.sy(e.x, e.y, e.z, 6);
    this.ad(e.k === 'W' ? 120 : e.k === 'S' ? (e.base ? 80 : 40) : e.k === 'R' ? 15 : e.k === 'G' ? 150 : e.k === 'A' ? 60 : 25);
    Sfx.boom();
    if (e.k === 'R' && e.r > 20) {
      for (let i = 0; i < 2; i++) {
        this.en.push({
          k: 'R', x: e.x, y: e.y, z: e.z, r: 18, hp: 1, t: 0, yw: 0, model: ROCK_POOL[FLR(RND() * 4)],
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
    const t = HYP(this.o.x - e.x, this.o.y - e.y, this.o.z - e.z) / sp;
    const f = this.fw();
    const tx = this.o.x + f.x * this.sp * t * 0.7;
    const ty = this.o.y + f.y * this.sp * t * 0.7;
    const tz = this.o.z + f.z * this.sp * t * 0.7;
    const dx = tx - e.x;
    const dy = ty - e.y;
    const dz = tz - e.z;
    const m = HYP(dx, dy, dz);
    this.ss.push({
      x: e.x,
      y: e.y - (e.k === 'S' ? 26 : 0),
      z: e.z,
      vx: (dx / m) * sp,
      vy: (dy / m) * sp,
      vz: (dz / m) * sp,
      lf: big ? 12 : 6,
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
      b.lf -= dt;
    }
    this.bl = this.bl.filter((b) => !b.X && b.lf > 0);
  }

  um(dt) {
    for (const m of this.ms) {
      const t = m.target;
      if (t && !t.X) {
        // corrige el rumbo hacia el blanco — contra el destructor, hacia su punto débil
        let [tx, ty, tz] = [t.x, t.y, t.z];
        let hitR = t.r + 16;
        if (m.part && m.part.hp > 0) {
          [tx, ty, tz] = this.bw(t, m.part.ox, m.part.oy, m.part.oz);
          hitR = SD_PART_R[m.part.kd];
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
      for (const bb of [this.Bo, this.Bt]) {
        if (!m.X && bb && !bb.hd && this.ib(bb, m.x, m.y, m.z, 0)) this.dn(m);
      }
      m.tr.push([m.x, m.y, m.z]);
      if (m.tr.length > 14) m.tr.shift();
      m.x += m.vx * dt;
      m.y += m.vy * dt;
      m.z += m.vz * dt;
      m.lf -= dt;
    }
    this.ms = this.ms.filter((m) => !m.X && m.lf > 0);
  }

  // El misil estalla: golpe fuerte al blanco y a todo lo que esté cerca
  dn(m) {
    m.X = true;
    this.bx.push({ wx: m.x, wy: m.y, wz: m.z, t: 0, big: true, r: MISSILE_SPLASH });
    this.sh = MAX(this.sh, 5);
    Sfx.boom();
    for (const boss of [this.Bo, this.Bt]) {
      if (!boss) continue;
      for (const pt of boss.pz) {
        const [wx, wy, wz] = this.bw(boss, pt.ox, pt.oy, pt.oz);
        if (pt === m.part || HYP(m.x - wx, m.y - wy, m.z - wz) < MISSILE_SPLASH) {
          this.bp(boss, pt, pt === m.part ? MISSILE_DMG - 1 : 1);
        }
      }
    }
    for (const e of this.en) {
      if (e.X || e.k === 'B' || e.k === 'N' || e.fr) continue;
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
      x: this.o.x - F.x * back + U.x * CAM_UP,
      y: this.o.y - F.y * back + U.y * CAM_UP,
      z: this.o.z - F.z * back + U.z * CAM_UP,
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
    const cyw = COS(e.yw || 0);
    const syw = SIN(e.yw || 0);
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
    LS(g, 4.5, color, alpha * 0.18);
    for (const [a, b] of edges) this.wl(g, cm, pts[a], pts[b]);
    LS(g, 1.5, color, alpha);
    for (const [a, b] of edges) this.wl(g, cm, pts[a], pts[b]);
  }

  draw(time) {
    const g = this.gfx;
    g.clear();
    this.cameras.main.setBackgroundColor(0x070709);
    const cm = this.cam();

    this.dk(g, cm, time);
    this.dz(g, cm, time);
    this.de2(g, cm);
    this.dwb(g, cm, time);
    this.dd(g, cm);

    this.label.setVisible(false);
    // la escena de la salva: el sector entero se apaga y solo quedan el
    // destructor, sus cohetes, tus disparos y tú
    const cineB2 = (this.Bo && this.Bo.ci && this.Bo) || (this.Bt && this.Bt.ci && this.Bt);
    const cine = cineB2 ? cineB2.cineDark || 0 : 0;
    for (const e of this.en) {
      if (cine > 0 && (e.k === 'B' || e.k === 'E')) continue;
      this.de(g, cm, e, time);
    }
    if (cine > 0) {
      fr(g, 0, 0, W, H, 0x000000, 0.85 * cine);
      for (const e of this.en) {
        if (e.k === 'B' || e.k === 'E') this.de(g, cm, e, time);
      }
    }

    // cañón: trazos brillantes — blanco el tuyo, azul el de tu equipo
    for (const b of this.bl) {
      const p1 = this.pj(cm, b.x, b.y, b.z);
      const p2 = this.pj(cm, b.x - b.vx * 0.03, b.y - b.vy * 0.03, b.z - b.vz * 0.03);
      if (!p1 || !p2) continue;
      LS(g, 2, b.fr ? BLU : INK_HI, 0.9);
      ln(g, p1[0], p1[1], p2[0], p2[1]);
    }

    // misiles: un proyectil de verdad, con aletas, cabeza ardiendo y estela larga
    for (const m of this.ms) {
      for (let i = 1; i < m.tr.length; i++) {
        const a = m.tr[i - 1];
        const b = m.tr[i];
        LS(g, 1 + i * 0.3, INK_HI, (i / m.tr.length) * 0.45);
        this.wl(g, cm, a, b);
      }
      const F = vnorm({ x: m.vx, y: m.vy, z: m.vz });
      const U = vnorm(vmix(WORLD_UP, 1, F, -vdot(WORLD_UP, F)));
      this.db(g, cm, MISSILE_MODEL, m, F, U, 1.5, INK_HI, 1, m.lf * 9);
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
        LS(g, r * 0.9, RUST, 0.45);
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
      LS(g, 1, INK, s.lf * 1.6);
      ln(g, p1[0], p1[1], p2[0], p2[1]);
    }

    // cerca del agujero, la pantalla entera se tiñe de acreción: no hay
    // duda de DÓNDE estás metido
    if (this.bhx > 0.02) fr(g, 0, 0, W, H, 0xe89a5c, this.bhx * (0.1 + 0.06 * SIN(time * 0.004)));
    this.dj(g, cm, time);
    this.dv(g, cm);
    this.di(g, cm, time);

    // barra de carga del hipersalto, o la vida que le queda al destructor
    if ((this.Bo && !this.Bo.hd) || (this.Bt && !this.Bt.hd)) {
      let hp = 0;
      let max = 0;
      for (const bb of [this.Bo, this.Bt]) {
        if (!bb || bb.hd) continue;
        for (const pt of bb.pz) {
          if (pt.kd === 't') continue;
          hp += MAX(0, pt.hp);
          max += pt.max;
        }
      }
      LS(g, 1.5, RUST, 0.9);
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
    // bajo el horizonte: el resplandor frío de la estación, tenue
    for (let i = 0; i < 10; i++) band(i * i * 7, undefined, 0x2c3a46, 0.1 - i * 0.009);
    band(-18, 18, 0x3a4452, 0.1);
    band(-6, 6, 0x5a6878, 0.1);
    band(-0.7, 0.7, INK, 0.28);
    for (const b of this.band) {
      const p = this.pd(cm, skyDir(b.yw, b.el));
      if (!p) continue;
      fr(g, p[0], p[1], b.s, b.s, INK, b.a);
    }
  }

  // Cuánto rota la pantalla respecto del "arriba" del sector: el arte del
  // cielo se dibuja derecho y se gira con esto
  kr(cm) {
    return AT2(-cm.R.y, -cm.U.y);
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
    // los planetas, fuera del rumbo del agujero negro (que es SOLO suyo):
    // la Tierra al sur, Saturno al suroeste y Júpiter al oeste, entre ellos
    this.so(g, cm, 3.4, 0.3, 46, drawEarth);
    this.so(g, cm, 4.32, 0.14, 64, drawSaturn);
    this.so(g, cm, 5.35, 0.24, 58, drawJupiter);
    this.dl(g, cm, time);
  }

  // Dibuja algo del cielo en su dirección, girado con la cámara
  so(g, cm, yaw, el, r, paint) {
    const p = this.pd(cm, skyDir(yaw, el));
    if (!p || p[0] < -3 * r || p[0] > W + 3 * r || p[1] < -3 * r || p[1] > H + 3 * r) return;
    g.save();
    g.translateCanvas(p[0], p[1]);
    g.rotateCanvas(this.kr(cm));
    paint(g, r);
    g.restore();
  }

  // el agujero negro: su disco en 3D y, encima, la sombra como billete en
  // su punto del mundo, girada con la cámara
  dwb(g, cm, time) {
    const t = time * 0.001;
    this.dsk(g, cm, t);
    const p = this.pj(cm, BH[0], BH[1], BH[2]);
    if (!p) return;
    const r = (BH[3] * FOCAL) / p[2];
    if (p[0] < -3 * r || p[0] > W + 3 * r || p[1] < -3 * r || p[1] > H + 3 * r) return;
    g.save();
    g.translateCanvas(p[0], p[1]);
    g.rotateCanvas(this.kr(cm));
    this.bh(g, r, t);
    g.restore();
  }

  // EL AGUJERO NEGRO, en pantalla: resplandor, la sombra y el anillo de
  // fotones. Cuanto más cerca, más arde todo.
  bh(g, r, t) {
    const q = this.bhx || 0;
    fc(g, 0, 0, r * 3.2, 0xe8a060, 0.04 + 0.05 * q);
    fc(g, 0, 0, r * 1.9, 0xe8a060, 0.07 + 0.08 * q);
    fc(g, 0, 0, r, 0x000000, 1);
    sk(g, 0, 0, r * 1.1, r * 0.16, CRM, 0.12 + 0.1 * q);
    sk(g, 0, 0, r * 1.04, MAX(1.5, r * 0.04), 0xfff8ea, 0.7 + 0.3 * SIN(t * 3));
  }

  // el disco de acreción en 3D, en el punto del agujero y MIRÁNDOTE: su
  // normal apunta a la nave (apenas inclinada, para que se lea 3D), y los
  // anillos caen hacia adentro girando — el remolino que se traga todo
  dsk(g, cm, t) {
    const [x, y, z, RS] = BH;
    const q = this.bhx || 0;
    const P = this.o;
    const n = vnorm(vmix(vnorm({ x: P.x - x, y: P.y - y, z: P.z - z }), 1, WORLD_UP, 0.3));
    const e1 = vnorm(vcross(n, { x: 0.01, y: 1, z: 0 }));
    const e2 = vcross(n, e1);
    const at = (a, r) => [x + (e1.x * COS(a) + e2.x * SIN(a)) * r, y + (e1.y * COS(a) + e2.y * SIN(a)) * r, z + (e1.z * COS(a) + e2.z * SIN(a)) * r];
    for (let i = 0; i < 7; i++) {
      const ph = (i / 7 + t * 0.09) % 1; // 0 afuera → 1 adentro
      const k = 1.5 + 5.5 * (1 - ph);
      LS(g, 1.5 + 2.5 * ph + q * 2, [0x8a5c48, RUST, 0xe89a5c, AMB, CRM][FLR(ph * 5)], MIN(1, (0.15 + 0.6 * ph) * (1 + q) * MIN(1, (1 - ph) * 8)));
      for (let arc = 0; arc < 9; arc++) {
        const a0 = t * (3 / k) + arc * 0.698 + i;
        for (let j = 0; j < 3; j++) this.wl(g, cm, at(a0 + j * 0.16, k * RS), at(a0 + j * 0.16 + 0.16, k * RS));
      }
    }
  }

  // LOS BORDES se ven al acercarse: la pared del cilindro y el techo son
  // mallas ancladas al mundo que aparecen a 1800 de distancia
  de2(g, cm) {
    const P = this.o;
    const hr = HYP(P.x, P.z);
    const aw = 1 - (BND_R - hr) / 1800;
    const y0 = FLR(P.y / 150) * 150;
    const on = (a, y) => [SIN(a) * BND_R, y, COS(a) * BND_R];
    if (aw > 0) {
      LS(g, 1.5, BLU, aw * 0.55);
      const a0 = FLR(AT2(P.x, P.z) * 40) / 40;
      for (let i = -9; i <= 9; i++) {
        this.wl(g, cm, on(a0 + i / 40, MAX(BND_TOP, y0 - 1400)), on(a0 + i / 40, y0 + 1400));
        const yy = y0 + i * 150;
        if (yy >= BND_TOP) for (let j = -9; j < 9; j++) this.wl(g, cm, on(a0 + j / 40, yy), on(a0 + (j + 1) / 40, yy));
      }
    }
    const cw = 1 - (P.y - BND_TOP) / 1800;
    if (cw > 0) {
      LS(g, 1.5, BLU, cw * 0.55);
      const x0 = FLR(P.x / 200) * 200;
      const z0 = FLR(P.z / 200) * 200;
      for (let i = -12; i <= 12; i++) {
        this.wl(g, cm, [x0 + i * 200, BND_TOP, z0 - 2400], [x0 + i * 200, BND_TOP, z0 + 2400]);
        this.wl(g, cm, [x0 - 2400, BND_TOP, z0 + i * 200], [x0 + 2400, BND_TOP, z0 + i * 200]);
      }
    }
  }

  // LA ESTACIÓN: la superficie de la esfera, dibujada como cuadrícula
  // local alrededor tuyo — celdas fijas del MUNDO (no te siguen), con
  // estructuras generadas por hash de celda y luces de posición. Tron abajo.
  dl(g, cm, time) {
    // el LIMBO: el borde curvo de la esfera, que sube y baja contigo — lo
    // que dice que esto es un PLANETA de metal y no un piso con cielo
    const alt = MAX(60, surfY(this.o.x, this.o.z) - this.o.y);
    const dhz = MIN(9500, Math.sqrt(2 * ST_R * alt));
    for (const [wd2, al2] of [[5, 0.1], [1.5, 0.5]]) {
      LS(g, wd2, BLD, al2);
      let prev = null;
      for (let i = 0; i <= 26; i++) {
        const a2 = (i / 26) * PI * 2;
        const lx = this.o.x + SIN(a2) * dhz;
        const lz = this.o.z + COS(a2) * dhz;
        const pt = [lx, surfY(lx, lz), lz];
        if (pt[1] > 8e8) {
          prev = null;
          continue;
        }
        if (prev) this.wl(g, cm, prev, pt);
        prev = pt;
      }
    }
    const cs = 700;
    const cx0 = FLR(this.o.x / cs);
    const cz0 = FLR(this.o.z / cs);
    for (let i = -4; i <= 4; i++) {
      for (let j = -4; j <= 4; j++) {
        const x0 = (cx0 + i) * cs;
        const z0 = (cz0 + j) * cs;
        const y00 = surfY(x0, z0);
        if (y00 > 9e8) continue;
        const al = MAX(0, 1 - HYP(x0 - this.o.x, z0 - this.o.z) / 3200) * 0.5 + 0.06;
        // los dos bordes de la celda: compartidos, forman la malla completa
        LS(g, 1.5, BLD, al);
        this.wl(g, cm, [x0, y00, z0], [x0 + cs, surfY(x0 + cs, z0), z0]);
        this.wl(g, cm, [x0, y00, z0], [x0, surfY(x0, z0 + cs), z0 + cs]);
        // el hash decide qué celda lleva estructura, y de qué altura
        const hsh = ((x0 * 1103 + z0 * 12793) % 97 + 97) % 97;
        if (hsh >= 42 && hsh < 48) {
          // un MURO bajo cruzando la celda: sáltalo o rodéalo
          const zm = z0 + cs / 2;
          const hW = 120;
          LS(g, 1.5, GRY, al * 1.3);
          const yA = surfY(x0 + 40, zm);
          const yB = surfY(x0 + cs - 40, zm);
          this.wl(g, cm, [x0 + 40, yA, zm], [x0 + 40, yA - hW, zm]);
          this.wl(g, cm, [x0 + cs - 40, yB, zm], [x0 + cs - 40, yB - hW, zm]);
          this.wl(g, cm, [x0 + 40, yA - hW, zm], [x0 + cs - 40, yB - hW, zm]);
        }
        if (hsh >= 22 && hsh < 30) {
          // un ARCO: dos pilones y un travesaño — pásale por debajo
          const zm = z0 + cs / 2;
          const yA = surfY(x0 + 90, zm);
          const yB = surfY(x0 + cs - 90, zm);
          const hA = 230 + (hsh % 4) * 40;
          LS(g, 1.5, GRY, al * 1.4);
          this.wl(g, cm, [x0 + 90, yA, zm], [x0 + 90, yA - hA, zm]);
          this.wl(g, cm, [x0 + cs - 90, yB, zm], [x0 + cs - 90, yB - hA, zm]);
          this.wl(g, cm, [x0 + 90, yA - hA, zm], [x0 + cs - 90, yB - hA, zm]);
          this.wl(g, cm, [x0 + 90, yA - hA + 26, zm], [x0 + cs - 90, yB - hA + 26, zm]);
          // la guía azul en el suelo: por AQUÍ se pasa
          LS(g, 2, BLD, al * 1.6);
          this.wl(g, cm, [x0 + 110, yA - 6, zm], [x0 + cs - 110, yB - 6, zm]);
        }
        if (hsh < 22) {
          const hh = (hsh < 8 ? 300 : 90) + (hsh % 5) * 70;
          const bx0 = x0 + cs * 0.3;
          const bz0 = z0 + cs * 0.3;
          const bw2 = cs * 0.4;
          const yb = surfY(bx0 + bw2 / 2, bz0 + bw2 / 2);
          LS(g, 1.5, GRY, al * 1.3);
          for (const [ox, oz] of [[0, 0], [bw2, 0], [bw2, bw2], [0, bw2]]) {
            this.wl(g, cm, [bx0 + ox, yb, bz0 + oz], [bx0 + ox, yb - hh, bz0 + oz]);
          }
          this.wl(g, cm, [bx0, yb - hh, bz0], [bx0 + bw2, yb - hh, bz0]);
          this.wl(g, cm, [bx0 + bw2, yb - hh, bz0], [bx0 + bw2, yb - hh, bz0 + bw2]);
          this.wl(g, cm, [bx0 + bw2, yb - hh, bz0 + bw2], [bx0, yb - hh, bz0 + bw2]);
          this.wl(g, cm, [bx0, yb - hh, bz0 + bw2], [bx0, yb - hh, bz0]);
          // la torre alta lleva luz de posición
          if (hsh < 8 && FLR(time / 500 + hsh) % 3) {
            const lp = this.pj(cm, bx0 + bw2 / 2, yb - hh - 14, bz0 + bw2 / 2);
            if (lp) fc(g, lp[0], lp[1], MAX(1.2, 700 / lp[2]), RUST_HI, al * 1.6);
          }
        }
      }
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
        LS(g, 1, INK, a * 0.5);
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
      const wx = this.o.x + WRP(m.x - this.o.x, -L / 2, L / 2);
      const wy = this.o.y + WRP(m.y - this.o.y, -L / 2, L / 2);
      const wz = this.o.z + WRP(m.z - this.o.z, -L / 2, L / 2);
      const p1 = this.pj(cm, wx, wy, wz);
      const p2 = this.pj(cm, wx + f.x * this.sp * trail, wy + f.y * this.sp * trail, wz + f.z * this.sp * trail);
      if (!p1 || !p2) continue;
      const dist = HYP(wx - this.o.x, wy - this.o.y, wz - this.o.z);
      const a = CLP(1 - dist / 420, 0, 1) * 0.5 * (this.sp / TURBO_SPEED + 0.3);
      if (a <= 0.02) continue;
      LS(g, 1, INK, a);
      ln(g, p1[0], p1[1], p2[0], p2[1]);
    }
  }

  de(g, cm, e, time) {
    const dist = HYP(e.x - this.o.x, e.y - this.o.y, e.z - this.o.z);
    // la estela de lo que se mueve: se ve de dónde viene y hacia dónde va
    if (e.tr && dist < 2200) {
      const n = e.tr.length;
      for (let i = 1; i < n; i++) {
        LS(g, e.k === 'E' ? 3 : 2, RUST_HI, (i / n) * 0.5);
        this.wl(g, cm, e.tr[i - 1], i === n - 1 ? [e.x, e.y, e.z] : e.tr[i]);
      }
    }
    const p = this.pj(cm, e.x, e.y, e.z);
    if (!p) return;
    let a = this.fg(dist);

    if (e.k === 'E') {
      const F = vnorm({ x: e.vx, y: e.vy, z: e.vz });
      const U = vnorm(vmix(WORLD_UP, 1, F, -vdot(WORLD_UP, F)));
      this.db(g, cm, MISSILE_MODEL, e, F, U, 1.6, e.ft > 0 ? INK_HI : RUST_HI, 1, e.t * 8);
      fc(g, p[0], p[1], MAX(3, (16 * FOCAL) / p[2]), RUST_HI, 0.5 + 0.4 * SIN(e.t * 20));
      return;
    }

    // el destructor no se apaga con la niebla: es enorme y tiene que verse
    // desde lejos. Escondido (antes del flash de entrada) no se dibuja.
    if (e.k === 'B') {
      if (!e.hd) this.dr(g, cm, e, MAX(a, 0.6), e.ft > 0);
      return;
    }

    if (a <= 0.03) {
      if ((e.k === 'A' || e.k === 'G' || e.k === 'S') && !e.fr && dist < 3200) {
        fr(g, p[0], p[1], 2.5, 2.5, RUST_HI, 0.6);
      }
      return;
    }

    // el óxido es solo para lo que te ataca; una roca es paisaje que golpea
    const flash = e.ft > 0;
    const color = flash
      ? INK_HI
      : e.k === 'N' || e.fr ? BLU : e.k === 'R' ? GRY : RUST;
    if (e.k === 'R' && !flash) a *= 0.7;

    const model =
      e.k === 'S' ? (e.base ? TURRET_MODEL : SENTRY_MODEL)
      : e.k === 'A' || e.k === 'N' ? SHIP_MODEL : e.k === 'G' ? GUN_MODEL
      : e.k === 'W' ? WALK_MODEL
      : e.model;
    const scale = e.k === 'R' ? e.r / 16 : e.k === 'S' ? 1.6 : e.k === 'A' ? 2.2 : e.k === 'N' ? 2 : e.k === 'G' ? 3 : 1;
    const rot = e.k === 'R' ? e.t * e.spin : e.bank || 0;
    this.dm(g, cm, model, e, scale, color, a, rot);

    if (e.k === 'W') {
      // las patas CAMINAN: dos pares alternando, con rodilla y pie que se
      // levanta — la superficie tiene vida propia
      const cy2 = COS(e.yw);
      const sy3 = SIN(e.yw);
      LS(g, 1.5, e.fr ? BLU : RUST, a);
      for (let i = 0; i < 4; i++) {
        const hx = i < 2 ? -26 : 26;
        const hz = i % 2 ? 22 : -22;
        const ph = e.t * 5 + (i === 0 || i === 3 ? 0 : PI);
        const stz = SIN(ph) * 34;
        const wxh = e.x + (hx * cy2 + hz * sy3) * 1.1;
        const wzh = e.z + (-hx * sy3 + hz * cy2) * 1.1;
        const hipY = e.y + 31; // cadera en el piso del cuerpo
        const wxf = e.x + (hx * 1.7 * cy2 + (hz + stz) * sy3) * 1.1;
        const wzf = e.z + (-hx * 1.7 * sy3 + (hz + stz) * cy2) * 1.1;
        const fy = surfY(wxf, wzf) - MAX(0, SIN(ph + PI / 2)) * 16;
        const kx = (wxh + wxf) / 2;
        const kz = (wzh + wzf) / 2;
        const ky = (hipY + fy) / 2 - 18;
        this.wl(g, cm, [wxh, hipY, wzh], [kx, ky, kz]);
        this.wl(g, cm, [kx, ky, kz], [wxf, fy, wzf]);
      }
      const eye = this.pj(cm, e.x + SIN(e.yw) * 64, e.y, e.z + COS(e.yw) * 64);
      if (eye) fc(g, eye[0], eye[1], MAX(1.5, 700 / eye[2]), e.fr ? BLU : RUST_HI, a * (0.6 + 0.4 * SIN(e.t * 5)));
    }
    if (e.k === 'A' || e.k === 'G') {
      // el ojo de brasa en la nariz: se lee quién te está mirando
      const nr = e.k === 'G' ? 200 : 50;
      const nose = this.pj(cm, e.x + SIN(e.yw) * nr, e.y - 4, e.z + COS(e.yw) * nr);
      if (nose) {
        fc(g, nose[0], nose[1], MAX(1.5, 600 / nose[2]), RUST_HI, a * (0.6 + 0.4 * SIN(e.t * 6)));
      }
    }
    if (e.k === 'S') {
      // el ojo late y su anillo de vigilancia respira — en la tinta de SU
      // bando; el anillo de amenaza es solo de las enemigas
      const pulse = 0.5 + 0.5 * SIN(e.t * 3);
      g.fillStyle(e.fr ? BLU : RUST_HI, a * (0.6 + 0.4 * pulse));
      const eye = this.pj(cm, e.x, e.y - 20, e.z);
      if (eye) g.fillCircle(eye[0], eye[1], MAX(3, 1100 / p[2]));
      if (!e.fr) sk(g, p[0], p[1], (70 + pulse * 10) * (FOCAL / p[2]), 1.5, RUST, a * (0.25 + 0.3 * pulse));
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
    const shielded = b.pz.some((q) => q.kd === 'd' && q.hp > 0);
    const aimed = this.ba(b, this.F);
    for (const pt of b.pz) {
      if (pt.hp <= 0) continue;
      const [wx, wy, wz] = this.bw(b, pt.ox, pt.oy, pt.oz);
      const p = this.pj(cm, wx, wy, wz);
      if (!p) continue;
      const k = (SD_SCALE * FOCAL) / p[2];
      const hot = pt.ft > 0 ? INK_HI : RUST_HI;
      // los puntos débiles abiertos llevan mira: ahí es donde se le pega
      if (this.bo(b, pt)) {
        const main = pt.kd !== 't';
        const r = MAX(main ? 20 : 16, SD_PART_R[pt.kd] * (FOCAL / p[2]) * 0.8);
        const c = r * 0.4;
        LS(g, main ? 2 : 2, main ? INK_HI : RUST_HI, main ? 0.6 + 0.4 * SIN(b.t * 6) : 0.7);
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
      if (pt.kd === 't') {
        this.dm(g, cm, SENTRY_MODEL, { x: wx, y: wy - 12 * SD_SCALE, z: wz, yw: b.yw }, 1.1 * SD_SCALE, pt.ft > 0 ? INK_HI : RUST, a);
        fc(g, p[0], p[1] - 34 * k, MAX(2, 7 * k), hot, a);
      } else if (pt.kd === 'd') {
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
    if (time < this.iu && FLR(time / 95) % 2 === 0) return;
    const f = this.fw();
    // dash: la nave deja copias fantasma — mientras se ven, nada te toca
    if (time < this.du) {
      for (let i = 1; i <= 3; i++) {
        const gp = { x: this.o.x - f.x * 22 * i, y: this.o.y - f.y * 22 * i, z: this.o.z - f.z * 22 * i };
        this.db(g, cm, SHIP_MODEL, gp, this.F, this.U, 1, INK_HI, 0.4 / i, this.roll);
      }
    }
    this.db(g, cm, SHIP_MODEL, this.o, this.F, this.U, 1, INK, 1, this.roll);
    // a velocidad de embestida, la proa se enciende
    if (this.sp > RAM_SPEED) {
      const np = this.pj(cm, this.o.x + f.x * 22, this.o.y + f.y * 22, this.o.z + f.z * 22);
      if (np) {
        const k = MIN(1, (this.sp - RAM_SPEED) / 150);
        sk(g, np[0], np[1], (20 * FOCAL) / np[2], 2, INK_HI, 0.5 * k + 0.2 * SIN(time * 0.05));
        fc(g, np[0], np[1], (20 * FOCAL) / np[2], INK_HI, 0.18 * k);
      }
    }
    // el escudo envuelve la nave; el fogonazo vive en la nariz
    const sp0 = this.pj(cm, this.o.x, this.o.y, this.o.z);
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
        LS(g, 1, BLU, 0.4);
        g.strokeEllipse(sp0[0], sp0[1], 2 * r * ABS(COS(sp)), 2 * r);
        g.strokeEllipse(sp0[0], sp0[1], 2 * r, 2 * r * ABS(COS(sp * 0.8 + 1.2)));
        const spin = time * 0.004;
        LS(g, 2.5, INK_HI, 0.9);
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
      const mp = this.pj(cm, this.o.x + f.x * 26, this.o.y + f.y * 26 - 2, this.o.z + f.z * 26);
      if (mp) {
        fc(g, mp[0], mp[1], MAX(2, 500 / mp[2]), INK_HI, 0.9);
      }
    }
    // estela del motor
    const level = ABS(this.sp) / TURBO_SPEED;
    if (level > 0.05) {
      LS(g, 2, INK_HI, 0.3 + 0.5 * level * (0.6 + 0.4 * SIN(time * 0.04)));
      const tail = 20 + 26 * level;
      this.wl(
        g,
        cm,
        [this.o.x - f.x * 14, this.o.y - f.y * 14 + 1, this.o.z - f.z * 14],
        [this.o.x - f.x * tail, this.o.y - f.y * tail + 1, this.o.z - f.z * tail]
      );
    }
    // retícula: a donde apunta la nariz — y avisa si un misil tiene blanco
    const rp = this.pj(cm, this.o.x + f.x * 620, this.o.y + f.y * 620, this.o.z + f.z * 620);
    if (rp) {
      const locked = this.am > 0 && this.bt(f);
      sk(g, rp[0], rp[1], locked ? 10 : 7, 1.5, locked ? RUST_HI : INK, 0.6);
      fr(g, rp[0] - 1, rp[1] - 1, 2, 2, locked ? RUST_HI : INK, 0.6);
    }
  }

  // Lo que viene hacia ti desde fuera de la pantalla se anuncia en el borde,
  // del lado por el que llega
  di(g, cm, time) {
    // las naves cercanas SIEMPRE se anuncian en el borde — aunque no se
    // estén acercando; los proyectiles, desde más lejos que antes
    let chn = 0;
    const chMax = 2;
    for (const e of this.en) {
      if ((e.k !== 'A' && e.k !== 'G') || e.X) continue;
      if (chn >= chMax) break;
      const d = { x: e.x - this.o.x, y: e.y - this.o.y, z: e.z - this.o.z };
      const dist = HYP(d.x, d.y, d.z);
      if (dist > 1100) continue;
      const p = this.pj(cm, e.x, e.y, e.z);
      if (p && p[0] > 30 && p[0] < W - 30 && p[1] > 30 && p[1] < H - 30) continue;
      chn++;
      const ang = AT2(-vdot(d, cm.U), vdot(d, cm.R) || 0.001);
      const ex = CX + COS(ang) * (CX - 24);
      const ey = CY + SIN(ang) * (CY - 24);
      LS(g, 2, RUST_HI, 0.55);
      ln(g, ex - COS(ang + 0.5) * 11, ey - SIN(ang + 0.5) * 11, ex, ey);
      g.beginPath();
      g.moveTo(ex, ey);
      g.lineTo(ex - COS(ang - 0.5) * 11, ey - SIN(ang - 0.5) * 11);
      g.strokePath();
    }
    const threats = this.ss.concat(this.en.filter((e) => e.k === 'E'));
    for (const s of threats) {
      const d = { x: this.o.x - s.x, y: this.o.y - s.y, z: this.o.z - s.z };
      const dist = HYP(d.x, d.y, d.z);
      if (dist > 1500 || d.x * s.vx + d.y * s.vy + d.z * s.vz <= 0) continue;
      const p = this.pj(cm, s.x, s.y, s.z);
      if (p && p[0] > 30 && p[0] < W - 30 && p[1] > 30 && p[1] < H - 30) continue;
      const o = { x: -d.x, y: -d.y, z: -d.z };
      const ang = AT2(-vdot(o, cm.U), vdot(o, cm.R) || 0.001);
      const ex = CX + COS(ang) * (CX - 28);
      const ey = CY + SIN(ang) * (CY - 28);
      const pulse = 0.55 + 0.45 * SIN(time * 0.02);
      LS(g, 3, RUST_HI, pulse * (1 - dist / 1600));
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
    if (this.Bo || this.Bt) {
      // no al centro del destructor: al punto débil que toca romper
      let bd = 1e9;
      for (const b of [this.Bo, this.Bt]) {
        if (!b || b.hd) continue;
        for (const pt of b.pz) {
          if (pt.kd === 't' || !this.bo(b, pt)) continue;
          const [x, y, z] = this.bw(b, pt.ox, pt.oy, pt.oz);
          const d = HYP(x - this.o.x, y - this.o.y, z - this.o.z);
          if (d < bd) {
            bd = d;
            target = { x, y, z };
            label = pt.kd === 'd' ? 'DOME' : 'BRIDGE';
          }
        }
      }
    }

    if (!target) {
      this.navText.setText('');
      return;
    }
    const part = target;
    const dist = HYP(part.x - this.o.x, part.y - this.o.y, part.z - this.o.z);
    this.navText.setText(label + '  ' + Math.round(dist) + ' M');

    const p = this.pj(cm, part.x, part.y, part.z);
    const margin = 46;
    if (p && p[0] > margin && p[0] < W - margin && p[1] > margin && p[1] < H - margin) {
      // una MIRA, no un cuadrito: esquinas gruesas que respiran
      const r = 22 + 2 * SIN(this.ep * 5);
      const c = r * 0.45;
      LS(g, 2.5, INK_HI, 0.9);
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
      LS(g, wd, INK_HI, al);
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
    // dónde quedan los bordes: altura sobre la estación contra el techo, y
    // cuánto falta para la pared
    const P = this.o;
    this.altText.setText('ALT ' + Math.round(1800 - P.y) + ' / ' + (1800 - BND_TOP) + '\nEDGE ' + Math.round(BND_R - HYP(P.x, P.z)));
    this.scoreText.setText(String(this.sc).padStart(6, '0') + (this.mu > 1 ? '  x' + this.mu : ''));
    this.hullText.setText('HULL ' + (GOD ? '∞' : '▸'.repeat(this.hull) + '·'.repeat(HULL_MAX - this.hull)));
    this.missileText.setText('MSL ' + '▴'.repeat(this.am) + '·'.repeat(MISSILE_MAX - this.am));
    const mm = FLR(this.ep / 60);
    this.partText.setText('T ' + mm + ':' + String(FLR(this.ep % 60)).padStart(2, '0'));
    // el bloque de recursos, junto a las vidas: DASH y SHIELD como barras
    // con nombre — llena = lista; el escudo va en SU azul
    const g = this.gfx;
    LS(g, 1, INK, 0.5);
    g.strokeRect(12, H - 56, 118, 8);
    fr(g, 13, H - 55, 116 * (this.bz / BOOST_MAX), 6, INK_HI, 0.75);
    const now = this.time.now;
    const shReady = now >= this.sw ? 1 : 1 - (this.sw - now) / (SHIELD_MS + SHIELD_COOLDOWN_MS);
    LS(g, 1, INK, 0.5);
    g.strokeRect(12, H - 70, 118, 8);
    fr(g, 13, H - 69, 116 * MAX(0, shReady), 6, BLU, shReady >= 1 ? 0.9 : 0.35);
    // el próximo misil, recargándose bajo su contador
    if (this.am < MISSILE_MAX) {
      LS(g, 1, INK, 0.4);
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
    this.sc = data.sc || 0;
  }

  create() {
    this.events.on('postupdate', clearPressed);
    Music.on = false;
    this.ready = false;
    this.left = false;
    this.qualifies = false;
    Sfx.over();

    this.add.text(CX, CY - 70, 'GAME OVER', FONT(32)).setOrigin(0.5);
    this.add.text(CX, CY + 4, 'SCORE  ' + String(this.sc).padStart(6, '0'), FONT(16)).setOrigin(0.5);

    loadScores().then((scores) => {
      this.qualifies = scores.length < 5 || this.sc > scores[scores.length - 1].s;
      this.time.delayedCall(1200, () => (this.ready = true));
    });
    this.time.delayedCall(9000, () => this.next());
  }

  next() {
    if (this.left) return;
    this.left = true;
    if (this.qualifies && this.sc > 0) this.scene.start('initials', { sc: this.sc });
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
    this.sc = data.sc || 0;
  }

  create() {
    this.events.on('postupdate', clearPressed);
    this.lt = [0, 0, 0];
    this.sl = 0;
    this.saving = false;

    this.add.text(CX, CY - 110, 'TOP 5!', FONT(16)).setOrigin(0.5);
    this.add.text(CX, CY - 78, 'SCORE  ' + String(this.sc).padStart(6, '0'), FONT(15, DIM_CSS)).setOrigin(0.5);
    this.slots = [0, 1, 2].map((i) => this.add.text(CX - 48 + i * 48, CY + 8, 'A', FONT(32)).setOrigin(0.5));
    this.add.text(CX, CY + 88, 'STICK SELECT · B1 OK', FONT(13, DIM_CSS)).setOrigin(0.5).setAlpha(0.8);
  }

  update(time) {
    if (this.saving) return;
    const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (pressed.P1_U) this.lt[this.sl] = (this.lt[this.sl] + 25) % 26;
    if (pressed.P1_D) this.lt[this.sl] = (this.lt[this.sl] + 1) % 26;
    if (pressed.P1_L) this.sl = MAX(0, this.sl - 1);
    if (pressed.P1_R) this.sl = MIN(2, this.sl + 1);
    if (pressed.P1_U || pressed.P1_D) Sfx.pickup();

    if (pressed.P1_1 || pressed.START1) {
      if (this.sl < 2) this.sl++;
      else {
        this.saving = true;
        const name = this.lt.map((l) => A[l]).join('');
        loadScores().then((scores) => {
          scores.push({ n: name, s: this.sc });
          scores.sort((a, b) => b.s - a.s);
          saveScores(scores.slice(0, 5)).then(() => this.scene.start('title'));
        });
      }
    }

    this.slots.forEach((t, i) => {
      t.setText(A[this.lt[i]]);
      t.setAlpha(i === this.sl ? (FLR(time / 300) % 2 ? 1 : 0.35) : 0.8);
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
})();
