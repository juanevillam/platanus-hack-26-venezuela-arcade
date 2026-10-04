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
// tn=tone bhx=blackHoleProximity. Tipos (k), NÚMEROS ordenados para
// comparar por rango: 1=ace 2=gun 3=emis 4=wing 5=sentry 6=walk 7=boss 8=rock
// (k<3: naves enemigas; k<4: + misiles; k<5: + ala); piezas (kd): 0=turret 1=dome 2=bridge
// Segunda pasada (Q*/Z*/J*, métodos incluidos): Qa=ctx Qb=short Qc=part
// Qd=target Qe=notice Qf=damage Qg=next Qh=noise Qi=burst Qj=hull Qk=boom
// Ql=roll Qm=base Qn=mini Qo=bank Qp=flash Qq=label Qr=rise Qs=left Qt=dust
// Qu=band Qv=slots Qw=press Qx=ready Qy=saving Qz=missile Q0=big Q1=muzzle
// Q2=cineT Q3=pickup Q4=scoreText Q5=salvoAt Q6=qualifies Q7=droneAt
// Q8=cineDark Q9=missileText Za=baseAt Zb=bossN Zc=navText Zd=tpAt
// Ze=spawnBoss Zf=salvoSaid Zg=partText Zh=hullText Zi=bhx Zj=wgAt
// Zk=velText Zl=altText Zm=wvAt Zn=msAt Zo=camU Zp=camF Zq=camR Zr=wingUp
// Zs=sdSaid Zt=bgSaid Zu=boltVsBoss Zv=shieldUp Zw=spin Zx=model Zy=say
// Zz=fire Z0=dash Z1=jump Z2=turn Z3=hurt Z4=ammo Z5=over Z6=tick Z7=wave
// Z8=foe Z9=ally Ja=draw Jb=cam Jc=die Jd=dwb Je=dsk Jf=bnk Jg=tpCd Jh=hRt
// Ji=svT Jj=mz2 Jk=lvT Jl=rmb Jr=rollLeft Js=rollSide Jp=loopLeft Jt=lastDashTap Jw=inManeuver
// Tercera pasada, a UNA letra (los más usados; la de la izquierda gana
// sobre las listas de arriba): A=vx B=vz C=vy D=en E=yw G=Bo H=sp I=Bt J=wl
// K=Qa L=fr M=hp N=lf O=tn P=fA Q=pj S=sh T=sc V=bw W=Zy Y=tr Z=kd b=ep
// d=hd f=ci g=ft h=Q0 i=sl j=pz m=or p=Pj q=ss u=bz w=bx. Los métodos
// grandes leen `this` como `me` (parámetro por defecto o `let [me] =
// [this]`: desestructurado para que el minificador no lo vuelva a
// inlinear), y la nave como `Po`.
// Estado: sp=speed cu=cruise fz=phase en=ents sh=shake bx=booms tr=trail
// ft=flashT bz=boost hd=hidden ss=shots bl=bolts ms=missiles sz=shards
// sn=stars yv=yawVel pv=pitchVel su=shieldUntil sw=shieldReady ht=shieldHitT
// ea=shieldEats iu=invulnUntil du=dashUntil fy=fireReadyAt ar=ammoRegen
// sq=scrapRun tl=twinUntil mz2=muzzleT mt=multT mu=mult cg=charging ch=charge
// pg=partsGot ep=elapsed pa=paused jg=jumping jt=jumpT ts=tutStep tu=tutWait
// bq=bossAt kA=skipArm wa=bhWarnAt et=enterT ha=hangarAt ca=cannonAt
// ma=missileAt
// Alias cortos: SWC no acorta nombres top-level ni Math.* — esto sí cuenta
let SIN = Math.sin;
let COS = Math.cos;
let HYP = Math.hypot;
let RND = Math.random;
let MIN = Math.min;
let MAX = Math.max;
let FLR = Math.floor;
let ABS = Math.abs;
let AT2 = Math.atan2;
let PI = Math.PI;
let CLP = Phaser.Math.Clamp;
let PS = Phaser.Scene;
let WRP = Phaser.Math.Wrap;
let AWR = Phaser.Math.Angle.Wrap;
let RD = Math.round;
let RH = () => RND() - 0.5; // azar centrado en cero
let SQ = Math.sqrt;
let D3 = (a, b) => HYP(a.x - b.x, a.y - b.y, a.z - b.z);
// la velocidad de a hacia b, a rapidez sp
let VT = (a, b, sp, d = D3(b, a) || 1) => ({ A: ((b.x - a.x) / d) * sp, C: ((b.y - a.y) / d) * sp, B: ((b.z - a.z) / d) * sp });

// Modelos comprimidos: vértices planos de a 3, y las aristas como un string
// (cada char es un índice + 48) — el minificador no comprime arrays de pares
let mdl = (flat, es) => {
  let V = [];
  for (let i = 0; i < flat.length; i += 3) V.push(flat.slice(i, i + 3));
  let E = [];
  for (let i = 0; i < es.length; i += 2) E.push([es.charCodeAt(i) - 48, es.charCodeAt(i + 1) - 48]);
  return [V, E];
};

// --- Resolución nativa 800x600: líneas y texto nítidos ---
let W = 800;
let H = 600;
let CX = W / 2;
let CY = H / 2;

// --- Proyección (cámara de persecución) ---
let NEAR = 14;
let CAM_BACK = 104;
let CAM_UP = 32;

// --- Paleta: neutros de marca + óxido hostil ---
// La paleta, DESESTRUCTURADA a propósito: como let suelto el minificador
// pega el hex (8 chars) en cada uso; así queda una variable de una letra
// RUST: peligro
// RUST_HI: peligro, variante clara (disparos, ojos)
// AMB: ámbar del disco
// CRM: crema caliente
// BLU: azul: escudo y recursos TUYOS
// BLD: azul apagado
// GRY: gris de escombro: paisaje, no equipo
let [INK, INK_HI, RUST, RUST_HI, AMB, CRM, BLU, BLD, GRY, SAW, TRI, SQR, FOCAL, SD_SCALE, MISSILE_SPEED, SHOT_SPEED, BND_TOP, BND_R, CELL] = [
  0xf5f5f5, 0xeef2f7, 0xa65240, 0xc97b5a, 0xf6c98a, 0xfff1d6, 0xb8dbe4, 0x8fb0c4, 0x8a9099,
  'sawtooth',
  'triangle',
  'square',
  420, 1.6, 560, 250, -5200, 6500, 700,
];
// Números con nombre que se usan mucho van en la misma desestructuración:
// FOCAL = 420
// SD_SCALE = 1.6 — todo el destructor, a esta escala
// MISSILE_SPEED = 560
// SHOT_SPEED = 250
// BND_TOP = -5200
// BND_R = 6500
// CELL = 700 — el lado de una celda de la superficie de la estación
// El hash de una celda de la superficie (por su esquina): decide qué
// estructura lleva — el mismo en colisión, dibujo y spawn
let HSH = (x0, z0) => (((x0 * 1103 + z0 * 12793) % 97) + 97) % 97;
let INK_CSS = '#eef2f7';
let DIM_CSS = '#8a9099';

// MODO PRUEBA (sin muerte): nada te mata — ni golpes, ni el suelo, ni el
// agujero negro (de él se sale con nitro). Para recorrer todas las fases.
// Apagado por defecto; lo enciende y apaga en CUALQUIER momento el código
// secreto de abajo. El HUD lo delata con 'HULL ∞', y una partida jugada con
// él no entra al ranking.
// El código: la secuencia de controles, cada uno por su letra — U D L R es
// el stick, 1–6 son B1–B6. Por defecto, el Konami de la máquina:
// ↑ ↑ ↓ ↓ ← → ← → B2 B1

// --- Vuelo: la nave SIEMPRE avanza; el stick dirige, el turbo se recarga.
// Arriba/abajo cabecea sin tope: mantenlo y das la vuelta completa. La cámara
// va pegada a la nave, así que izquierda es izquierda aun de cabeza. ---
let YAW_RATE = 2.4; // rad/s tope
let YAW_EASE = 13; // 1/s, el giro responde YA
let PITCH_RATE = 2.5; // rad/s de cabeceo
let CRUISE = 235; // crucero constante — la nave NUNCA se detiene
let TURBO_SPEED = 470; // referencia de "rápido" para estelas y cámara
let NITRO_MAX = 760; // manteniendo B2 la nave acelera sin parar hasta aquí
let NITRO_ACCEL = 260; // unidades/s²
let SPEED_EASE = 3; // 1/s de vuelta al crucero
let BOOST_MAX = 100;
let BOOST_DRAIN = 16; // por segundo de nitro — la reserva da ~6 s seguidos
let BOOST_REGEN = 28; // por segundo de recarga
let DASH_COST = 16; // cada toque de B2: un dash, intocable un instante
let DASH_KICK = 260;
let DASH_INVULN_MS = 450;
let RAM_SPEED = 430; // por encima, embistes a los cazadores y los destrozas
// B4/B6: ESCUDO — una burbuja que come todo lo que te llega mientras dura.
// La respuesta a las ráfagas del destructor: levantarlo en el momento justo.
let SHIELD_MS = 2600;
let SHIELD_COOLDOWN_MS = 4000;
let SHIELD_R = 52; // radio en mundo dentro del que la burbuja come disparos

let MAGNET_R = 240; // lo recogible viene hacia ti
let FIRE_MS = 160;
let BOLT_SPEED = 980;
let BOLT_LIFE = 3.2; // ~3800 de alcance: se pelea desde lejos
let MISSILE_TURN = 3.4; // 1/s de corrección hacia el blanco
let MISSILE_MAX = 5;
let MISSILE_DMG = 4;
let MISSILE_SPLASH = 150; // todo lo que esté cerca del impacto también cae
let MISSILE_REGEN = 10; // segundos por misil recuperado solo

// --- Enemigos: pocos, grandes, disparos lentos que se pueden esquivar ---

// --- El sector: una esfera de juego alrededor del origen ---
let SECTOR_R = 3000;
// El suelo es la ESTACIÓN: una esfera colosal asomando bajo el sector — no
// infinita, pero a escala de juego siempre está. Su superficie es pared.
let ST_R = 8000; // radio de la estación — chica: SE VE esfera
let ST_CY = 9800; // centro: la superficie queda a y=1800 bajo el origen
let surfY = (x, z) => {
  let q = ST_R * ST_R - x * x - z * z;
  return q > 0 ? ST_CY - SQ(q) : 1e9;
};

// EL SECTOR TIENE BORDES: un cilindro de radio BND_R alrededor del centro y
// un techo a y=BND_TOP. Al tocarlos la nave resbala por la pared y gira
// hacia adentro; cerca, la pared se dibuja y el HUD dice cuánto queda.
// El agujero negro está ANCLADO al mundo, a la derecha del arranque: se
// puede ir hasta él y alejarse [x, y, z, radio]. Tira más cuanto más cerca y
// te traga ya DENTRO de la sombra — la caída dura. La Tierra y Saturno son
// cielo, fijos al fondo del lado opuesto (sur y suroeste).
let BH = [2400, -2200, 3600, 420];
let BHO = { x: BH[0], y: BH[1], z: BH[2] };
// Los SECTORES: cada 2 minutos uno nuevo, con nombre, bono y otra mezcla —
// desde el 2 llegan kamikazes y francotiradores; en el 3, minas, élites y tormentas
let TIPS = [
  'LURE SHIPS INTO THE BLACK HOLE',
  'SHOOT A MINE - IT TAKES THE PACK',
  'FLY THROUGH GATES FOR FULL BOOST',
  'NEAR MISSES FEED OVERDRIVE',
  'FIVE GATES IN A ROW: OVERDRIVE',
  'NO HULL LOST: PERFECT SECTOR',
  'GRAVITY SURGE: KEEP CLEAR - OR LURE THEM IN',
];
// tres sectores con nombre venezolano (en ASCII: la fuente del gabinete no se
// arriesga); pasado el tercero vuelven con numeral
let SEC = ['AVILA', 'CATATUMBO', 'SALTO ANGEL'];
let BH_PULL = 2700;
let BH_GRIP = 1500; // aquí ya TE TIENE: el crucero no alcanza — dash o nitro
let BH_KILL = 240;

let HULL_MAX = 5;
let SCORE_KEY = 'space-explorer:scores';

// Las cuatro piezas del hipersalto


// --------------------------------------------------------------------------
// Arcade cabinet button → keyboard key mapping.
// DO NOT modify this mapping — it matches the real arcade cabinet wiring.
// To add local testing shortcuts, append extra keys to any array.
let CABINET_KEYS = {
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

let KEY_TO_ARCADE = {};
for (let [code, keys] of Object.entries(CABINET_KEYS)) {
  for (let key of keys) {
    KEY_TO_ARCADE[key.length === 1 ? key.toLowerCase() : key] = code;
  }
}

let held = Object.create(null);
let pressed = Object.create(null); // por flanco, se limpia cada frame

window.addEventListener('keydown', (e) => {
  let code = KEY_TO_ARCADE[e.key.length === 1 ? e.key.toLowerCase() : e.key];
  if (code && !held[code]) {
    held[code] = true;
    pressed[code] = true;
    Sfx.init(); // el audio solo puede arrancar con un gesto
  }
});
window.addEventListener('keyup', (e) => {
  let code = KEY_TO_ARCADE[e.key.length === 1 ? e.key.toLowerCase() : e.key];
  if (code) held[code] = false;
});

let clearPressed = () => {
  for (let k in pressed) pressed[k] = false;
};

let anyStart = () => {
  return pressed.START1 || pressed.START2 || pressed.P1_1;
};

// --- Persistencia (puente arcade, con localStorage de respaldo) ---
let getStorage = () => {
  return (
    window.platanusArcadeStorage || {
      async get(key) {
        try {
          let raw = localStorage.getItem(key);
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
};

// Top 3 con forma validada: el storage sobrevive entre versiones
// Si el puente del gabinete falla, se juega igual: tabla vacía, y guardar
// no bloquea la vuelta al título
async function loadScores() {
  let res;
  try {
    res = await getStorage().get(SCORE_KEY);
  } catch {
    return [];
  }
  if (!res || !res.found || !res.value || !Array.isArray(res.value.scores)) return [];
  return res.value.scores
    .filter((s) => s && typeof s.n === 'string' && typeof s.s === 'number')
    .map((s) => ({ n: s.n.slice(0, 3).toUpperCase(), s: FLR(s.s) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, 3);
}

async function saveScores(scores) {
  try {
    await getStorage().set(SCORE_KEY, { v: 1, scores });
  } catch {}
}

// --------------------------------------------------------------------------
// Audio: solo efectos puntuales, sintetizados. La música llega al final.
let Sfx = {
  K: null,
  out: null,

  init() {
    let [me] = [this];
    if (me.K) {
      if (me.K.state === 'suspended') me.K.resume();
      return;
    }
    let AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    me.K = new AC();
    me.out = me.K.createGain();
    me.out.gain.value = 0.45;
    me.out.connect(me.K.destination);
  },

  O(f0, dur, type, vol, f1, at, me = this) {
    if (!me.K) return;
    let t = (at || me.K.currentTime) + 0.001;
    let osc = me.K.createOscillator();
    let g = me.K.createGain();
    osc.type = type || SQR;
    osc.frequency.setValueAtTime(f0, t);
    if (f1) osc.frequency.linearRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(vol || 0.2, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(g);
    g.connect(me.out);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  },

  Qh(dur, vol, at, me = this) {
    if (!me.K) return;
    let t = at || me.K.currentTime;
    let len = FLR(me.K.sampleRate * dur);
    let buf = me.K.createBuffer(1, len, me.K.sampleRate);
    let d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (RND() * 2 - 1) * (1 - i / len);
    let src = me.K.createBufferSource();
    let g = me.K.createGain();
    src.buffer = buf;
    g.gain.value = vol;
    src.connect(g);
    g.connect(me.out);
    src.start(t);
  },

  Zz() {
    Sfx.O(760, 0.07, SQR, 0.09, 320);
  },
  Qz() {
    Sfx.O(520, 0.35, SAW, 0.14, 90);
    Sfx.Qh(0.25, 0.12);
  },
  Qk() {
    Sfx.Qh(0.3, 0.38);
    Sfx.O(110, 0.28, SAW, 0.2, 40);
  },
  Z3() {
    Sfx.Qh(0.2, 0.38);
    Sfx.O(140, 0.3, SAW, 0.3, 55);
  },
  Q3() {
    Sfx.O(660, 0.06, SQR, 0.13);
    Sfx.O(990, 0.09, SQR, 0.13, 0, Sfx.K && Sfx.K.currentTime + 0.07);
  },
  Z4() {
    Sfx.O(440, 0.08, TRI, 0.16);
    Sfx.O(880, 0.12, TRI, 0.16, 0, Sfx.K && Sfx.K.currentTime + 0.09);
  },
  Qc() {
    let t = Sfx.K && Sfx.K.currentTime;
    [440, 554, 659, 880].forEach((f, i) => Sfx.O(f, 0.5, TRI, 0.15, 0, t + i * 0.09));
  },
  Z0() {
    Sfx.O(140, 0.22, TRI, 0.13, 520);
  },
  Z2() {
    Sfx.O(330, 0.3, 'sine', 0.12, 160);
  },
  Zv() {
    Sfx.O(240, 0.28, 'sine', 0.15, 520);
  },
  Z1() {
    let t = Sfx.K && Sfx.K.currentTime;
    [330, 440, 554, 659, 880, 1108].forEach((f, i) => Sfx.O(f, 0.4, TRI, 0.15, 0, t + i * 0.09));
  },
  Z5() {
    Sfx.O(160, 1.1, SAW, 0.18, 55);
  },
};

// --------------------------------------------------------------------------
// Modelos wireframe: [vértices, aristas]. +z es la nariz; -y es arriba.

// La nave: caza esbelto — parabrisas marcado, alas en flecha con winglets,
// timón alto y dos góndolas de motor bajo las alas
let SHIP_MODEL = mdl([0, 0, 26, 0, -3.5, 14, 0, -5.5, 2, 0, -4, -8, 0, -11, -17, 0, 0, -16, -5, -1, 8, 5, -1, 8, -22, 1, -13, 22, 1, -13, -22, -4, -15, 22, -4, -15, 0, 3, -6, -9, 1, -2, 9, 1, -2, -11, 1, -15, 11, 1, -15, -3, -1.5, 19, 3, -1.5, 19], '0112233445350607687985958:9;0<<56<7<6==?7>>@?5@50AA60BB72627');

// Centinela: pirámide vigilante, con ojo
let SENTRY_MODEL = mdl([-22, 14, -22, 22, 14, -22, 22, 14, 22, -22, 14, 22, 0, -26, 0], '01122330041424340213');

let HUNTER_SCALE = 3; // cazadores e interceptores: grandes, fáciles de seguir

// Mina: octaedro



// Asteroide: icosaedro con cada vértice desplazado — cada roca es única,
// facetada como piedra en vez de un contorno plano
let ICO_PHI = (1 + SQ(5)) / 2;
let ICO_VERTS = [
  [-1, ICO_PHI, 0], [1, ICO_PHI, 0], [-1, -ICO_PHI, 0], [1, -ICO_PHI, 0],
  [0, -1, ICO_PHI], [0, 1, ICO_PHI], [0, -1, -ICO_PHI], [0, 1, -ICO_PHI],
  [ICO_PHI, 0, -1], [ICO_PHI, 0, 1], [-ICO_PHI, 0, -1], [-ICO_PHI, 0, 1],
];
let ICO_EDGES = [];
for (let i = 0; i < 12; i++) {
  for (let j = i + 1; j < 12; j++) {
    let [a, b] = [ICO_VERTS[i], ICO_VERTS[j]];
    if (ABS(HYP(a[0] - b[0], a[1] - b[1], a[2] - b[2]) - 2) < 0.01) ICO_EDGES.push([i, j]);
  }
}
// El pool: CUATRO formas de roca generadas una vez y compartidas por
// todas — una instancia, muchas repeticiones
let makeRockModel = () => {
  let k = 16 / HYP(1, ICO_PHI);
  return [
    ICO_VERTS.map(([x, y, z]) => {
      let j = (0.68 + RND() * 0.5) * k;
      return [x * j, y * j * 0.8, z * j];
    }),
    ICO_EDGES,
  ];
};

let ROCK_POOL = [makeRockModel(), makeRockModel(), makeRockModel(), makeRockModel()];

// La CORBETA: a medio camino entre el ace y el destructor — casco largo,
// puente alto y dos nacelas; ladra ráfagas manteniendo distancia
// El CAMINANTE: cuerpo de caja con hocico — las patas se dibujan aparte,
// animadas de verdad
let WALK_MODEL = mdl([-26, -28, -34, 26, -28, -34, 26, -28, 34, -26, -28, 34, -26, 28, -34, 26, 28, -34, 26, 28, 34, -26, 28, 34, 0, 0, 58], '01122330455667740415263728386878');

// La TORRETA de superficie: pedestal, domo y cañón doble — se LEE torreta
let TURRET_MODEL = mdl([-24, 0, -24, 24, 0, -24, 24, 0, 24, -24, 0, 24, -14, -18, -14, 14, -18, -14, 14, -18, 14, -14, -18, 14, 0, -30, 0, -3, -26, 8, 3, -26, 8, -3, -38, 52, 3, -38, 52], '011223300415263745566774485868789;:<;<');

let GUN_MODEL = mdl([0, -2, 70, -16, -8, 30, 16, -8, 30, -20, 8, 24, 20, 8, 24, -22, 0, -20, 22, 0, -20, -14, -6, -64, 14, -6, -64, -16, 8, -58, 16, 8, -58, 0, -16, -14, 0, -12, -44, -30, 2, -48, 30, 2, -48], '01020304152635465768596:789:798:1;2;;<<7<85==96>>:');

// El destructor: una cuña de casi mil unidades con su torre de mando atrás.
// Local: x derecha, y abajo, z hacia la proa.
let SD_NOSE = 560;
let SD_REAR = -400;
let SD_HALF_W = 300; // media manga en la popa
let SD_RIDGE = -80; // altura del lomo en la popa
let SD_KEEL = 70;
let DESTROYER_MODEL = mdl([0, 0, 560, -300, 0, -400, 300, 0, -400, 0, -80, -400, 0, 70, -400, -280, 24, -400, 280, 24, -400, 0, -45, 80, -80, -70, -250, 80, -70, -250, 80, -70, -400, -80, -70, -400, -60, -150, -290, 60, -150, -290, 60, -150, -400, -60, -150, -400, -130, -165, -340, 130, -165, -340, -150, -40, -400, 150, -40, -400, -36, -30, 420, 36, -30, 420, -56, -56, -250, 56, -56, -250, -60, 38, 60, 60, 38, 60, -60, 44, -120, 60, 44, -120, -110, -180, -340, 110, -180, -340, -150, -6, 180, 150, -6, 180, -95, -142, -338, 95, -142, -338, -70, -110, -272, 70, -110, -272, 70, -110, -400, -70, -110, -400], '010207730413231526546405060B0C899::;;8<==>>??<8<9=:>;?@A<@=ADFEGDEHIIKKJJH<L=M0NN10OO2PQRSSTTUUR');
// Puntos débiles: torretas en la cubierta, dos domos de escudo sobre el puente,
// y el puente mismo, que solo recibe daño con los domos caídos
let SD_PARTS = [
  [0, 90, -14, 150, 2], [0, -90, -14, 150, 2],
  [0, 140, -20, -80, 2], [0, -140, -20, -80, 2],
  [0, 190, -25, -300, 2], [0, -190, -25, -300, 2],
  [1, 110, -185, -340, 6], [1, -110, -185, -340, 6],
  [2, 0, -150, -345, 14],
];
let SD_PART_R = [42 * SD_SCALE, 46 * SD_SCALE, 72 * SD_SCALE]; // por kd

// Misil: cuerpo largo con cuatro aletas atrás — se tiene que ver como poder
let MISSILE_MODEL = mdl([0, 0, 16, 0, 0, -12, -3, 0, 8, 3, 0, 8, 0, -3, 8, 0, 3, 8, -8, 0, -14, 8, 0, -14, 0, -8, -14, 0, 8, -14, -3, 0, -6, 3, 0, -6, 0, -3, -6, 0, 3, -6], '020304052:3;4<5=:6;7<8=961718191');


// Chatarra: un trozo de casco — placa con borde, puntal y una solapa doblada

let FONT = (size, color) => ({
  fontFamily: 'monospace',
  fontSize: size + 'px',
  color: color || INK_CSS,
});


// El único Graphics del juego (lo crea la escena de juego): los trazos de
// abajo dibujan ahí sin recibirlo en cada llamada
let GF;

// Un texto del HUD o de un menú: fuente, color y origen en una llamada
let TX = (sc, x, y, s, z, c, o) => sc.add.text(x, y, s, FONT(z, c)).setOrigin(o || 0);

// Trazos de dos llamadas, en una: cada par pesa
let fc = (x, y, r, col, al) => {
  GF.fillStyle(col, al);
  GF.fillCircle(x, y, r);
};
let fr = (x, y, w, h, col, al) => {
  GF.fillStyle(col, al);
  GF.fillRect(x, y, w, h);
};
let sk = (x, y, r, w, col, al) => {
  LS(w, col, al);
  GF.strokeCircle(x, y, r);
};
let LS = (w, c, a) => {
  GF.lineStyle(w, c, a);
};
// una polilínea abierta: PL(x1, y1, x2, y2, …) — un segmento es el caso de dos
let PL = (...c) => {
  GF.beginPath();
  GF.moveTo(c[0], c[1]);
  for (let i = 2; i < c.length; i += 2) GF.lineTo(c[i], c[i + 1]);
  GF.strokePath();
};
let ln = PL;
// los mismos trazos, en un punto de pantalla [x, y] ya proyectado
let fcp = (p, r, col, al) => fc(p[0], p[1], r, col, al);
let skp = (p, r, w, col, al) => sk(p[0], p[1], r, w, col, al);
let lnp = (a, b) => ln(a[0], a[1], b[0], b[1]);

let Music = {
  Qg: 0,
  step: 0,
  on: false,
  G: false,
  Z6(me = this) {
    if (!me.on || !Sfx.K) return;
    let now = Sfx.K.currentTime;
    if (me.Qg < now) me.Qg = now + 0.05;
    while (me.Qg < now + 0.4) {
      let t = me.Qg;
      let st = me.step++;
      if (me.G) {
        // EL DESTRUCTOR: ostinato grave que camina por semitonos, quinta
        // encima, un stab menor que cae y un tic seco — la flota ya está aquí
        let s16 = st % 16;
        let root = [36.7, 36.7, 34.6, 38.9][FLR(st / 16) % 4];
        Sfx.O(root, 0.32, SAW, 0.1, 0, t);
        Sfx.O(root * 2, 0.32, SQR, 0.03, 0, t);
        if (s16 % 4 === 0) Sfx.O(root * 3, 0.6, TRI, 0.065, 0, t);
        if (s16 === 8) Sfx.O(root * 4.76, 0.9, SAW, 0.05, root * 4, t);
        if (s16 === 12) Sfx.O(root * 6, 0.5, TRI, 0.045, root * 5.6, t);
        if (s16 % 2 === 0) Sfx.Qh(0.03, 0.028, t);
        me.Qg += 0.21 * (Music.Sp || 1);
      } else {
        // CACERÍA: galope en menor (Em → C → D → B), stabs, un destello de
        // tritono y batería marcada — aventura con dientes, nada cozy
        let s16 = st % 16;
        let root = [41.2, 32.7, 36.7, 30.9][FLR(st / 16) % 4];
        if (s16 % 4 !== 3) Sfx.O(s16 % 4 === 2 ? root * 2 : root, 0.14, TRI, 0.1, 0, t);
        if (s16 === 0) Sfx.O(root * 3, 1.2, SAW, 0.028, 0, t);
        if (s16 === 4 || s16 === 12) Sfx.O(root * 4.8, 0.22, SQR, 0.04, 0, t);
        if (s16 === 8) Sfx.O(root * 5.66, 0.5, 'sine', 0.045, root * 4.9, t);
        if (s16 % 2 === 0) Sfx.Qh(0.025, 0.03, t);
        if (s16 % 8 === 4) Sfx.Qh(0.09, 0.055, t);
        me.Qg += 0.19 * (Music.Sp || 1);
      }
    }
  },
};

// --------------------------------------------------------------------------
// El título, mínimo a propósito: los bytes son para el JUEGO. Nombre, la
// nave girando, controles, top 3, y nada más.
class Title extends PS {

  create() {
    let [me] = [this];
    Music.on = false;
    GF = me.add.graphics(); // el remolino de la portada, detrás de todo
    TX(me, CX, 96, 'S P A C E  E X P L O R E R', 36, 0, 0.5);
    TX(me, 160, 330, 'STICK\nB1\nB2\nB3\nB4/B6\nB5\nSTART', 14).setOrigin(1, 0).setAlign('right').setLineSpacing(13);
    TX(me, 180, 330, 'STEER - HOLD UP/DOWN: LOOP\nFIRE\nDASH - 2X: ROLL/LOOP/U-TURN - HOLD: NITRO\nMISSILE - HOLD: LOCK 4, RELEASE: SALVO\nSHIELD ON/OFF\nOVERDRIVE WHEN FULL\nPAUSE', 13, DIM_CSS).setLineSpacing(14);
    TX(me, 596, 360, 'TOP 3', 14);
    me.Q4 = TX(me, 596, 386, '', 14, DIM_CSS).setLineSpacing(9);
    loadScores().then((scores) => {
      if (!scores.length || !me.scene.isActive()) return;
      me.Q4.setText(
        scores.map((s, i) => `${i + 1}  ${s.n.padEnd(3)}  ${String(s.s).padStart(6, '0')}`).join('\n')
      );
    });
    me.Qw = TX(me, CX, H - 52, 'PRESS START', 16, 0, 0.5);
    me.Tp = TX(me, CX, H - 24, '', 12, DIM_CSS, 0.5);
    TX(me, CX, 128, 'HECHO EN BARQUISIMETO, VENEZUELA, POR JUANEVILLAM', 12, DIM_CSS, 0.5);
  }

  update(time) {
    // la portada: el agujero negro, con sus anillos cayendo en remolino
    GF.clear();
    for (let i = 0; i < 7; i++) {
      let ph = (i / 7 + time * 0.00008) % 1;
      let r = 30 + 110 * (1 - ph);
      LS(1 + 2 * ph, [0x8a5c48, RUST, 0xe89a5c, AMB, CRM][FLR(ph * 5)], (0.2 + 0.6 * ph) * MIN(1, (1 - ph) * 8));
      for (let j = 0; j < 9; j++) {
        let a = (time * 0.084) / r + j * 0.698 + i;
        PL(CX + COS(a) * r * 1.9, 225 + SIN(a) * r * 0.5, CX + COS(a + 0.25) * r * 1.9, 225 + SIN(a + 0.25) * r * 0.5, CX + COS(a + 0.5) * r * 1.9, 225 + SIN(a + 0.5) * r * 0.5);
      }
    }
    fc(CX, 225, 24, 0, 1);
    sk(CX, 225, 26, 2, 0xfff8ea, 0.7);
    // los consejos, uno cada 3 s: lo que no se adivina solo
    this.Tp.setText(TIPS[FLR(time / 3000) % 7]);
    this.Qw.setAlpha(FLR(time / 600) % 2 ? 1 : 0.25);
    if (anyStart()) this.scene.start('G');
  }
}

// --- vectores {x,y,z} ---
let vdot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
let vcross = (a, b) => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x });
let vmix = (a, sa, b, sb) => ({ x: a.x * sa + b.x * sb, y: a.y * sa + b.y * sb, z: a.z * sa + b.z * sb });
let vnorm = (a) => {
  let m = HYP(a.x, a.y, a.z) || 1;
  return { x: a.x / m, y: a.y / m, z: a.z / m };
};
let WORLD_UP = { x: 0, y: -1, z: 0 };
// Rota v un ángulo alrededor del eje unitario A (Rodrigues)
let rotAxis = (v, A, ang) => {
  let c = COS(ang);
  let s = SIN(ang);
  let k = vdot(A, v) * (1 - c);
  let x = vcross(A, v);
  return { x: v.x * c + x.x * s + A.x * k, y: v.y * c + x.y * s + A.y * k, z: v.z * c + x.z * s + A.z * k };
};

// Re-ortonormaliza una base (F, U) → [F, U, R], para que los errores de
// redondeo de rotar cada frame nunca la deformen
let orthoBasis = (F, U) => {
  let f = vnorm(F);
  let u = vnorm(vmix(U, 1, f, -vdot(U, f)));
  return [f, u, vcross(f, u)];
};

// Dirección del cielo: rumbo en el plano del sector y elevación sobre él
let skyDir = (yaw, el) => ({ x: SIN(yaw) * COS(el), y: -SIN(el), z: COS(yaw) * COS(el) });

// Recorta un polígono de pantalla al lado f(p) >= 0 de una recta
let clipHalf = (poly, f) => {
  let out = [];
  for (let i = 0; i < poly.length; i++) {
    let a = poly[i];
    let b = poly[(i + 1) % poly.length];
    let fa = f(a);
    let fb = f(b);
    if (fa >= 0) out.push(a);
    if (fa >= 0 !== fb >= 0) {
      let t = fa / (fa - fb);
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
  }
  return out;
};

// --- El cielo, pintado en coordenadas locales (0,0 al centro) ---

// Esfera en franjas: cada franja respeta el contorno; la noche entra por la
// derecha. Sin franjas pinta solo la noche, sobre lo que ya haya. Más filas
// cuanto más grande, para que el borde no se vea en escalones.
let drawBandedSphere = (R, bands, night) => {
  let N = MAX(22, FLR(R / 1.5));
  for (let i = 0; i < N; i++) {
    let y0 = -R + (2 * R * i) / N;
    let y1 = y0 + (2 * R) / N;
    let ym = (y0 + y1) / 2;
    let hw = SQ(MAX(0, R * R - ym * ym));
    if (hw < 2) continue;
    if (bands) fr(-hw, y0, hw * 2, y1 - y0 + 1, bands[FLR((i / N) * bands.length)], 1);
    let tx = hw * night;
    fr(tx, y0, hw - tx, y1 - y0 + 1, 0x05060a, 0.72);
  }
};

// Saturno, a radio r en pantalla: la mitad de atrás del anillo va detrás
let drawSaturn = (r) => {
  let ring = (from) => {
    for (let k = 0; k < 4; k++) {
      LS(MAX(1.5, r * (k === 1 ? 0.05 : 0.025)), [0xe8d4a8, 0xd6b47e, 0xb89462, 0x8a7050][k], 0.6);
      GF.beginPath();
      for (let j = 0; j <= 24; j++) {
        let a = from + (j / 24) * PI;
        let x = r * (1.55 + k * 0.18) * COS(a);
        let y = r * (0.32 + k * 0.035) * SIN(a) - x * 0.28;
        if (j === 0) GF.moveTo(x, y);
        else GF.lineTo(x, y);
      }
      GF.strokePath();
    }
  };
  ring(PI);
  sk(0, 0, r * 1.04, r * 0.06 + 2, 0xe8d4a8, 0.12);
  drawBandedSphere(r, [0xe6d2a0, 0xc9a86a, 0xd8bb80, 0xb8955a, 0xe0c890, 0xc9a86a, 0xd8bb80], 0.3);
  sk(0, 0, r, 1.5, 0xe8d4a8, 0.5);
  ring(0);
};

// Júpiter: franjas crema y marrón, y la gran mancha roja
let drawJupiter = (r) => {
  sk(0, 0, r * 1.04, r * 0.06 + 2, 0xe0c8a8, 0.12);
  drawBandedSphere(r, [0xe8dcc8, 0xc49a6c, 0xe6d6bc, 0xa87a54, 0xdcc4a4, 0xb88a60, 0xe8dcc8, 0xc49a6c, 0xe0d0b8], 0.3);
  fc(r * 0.05, r * 0.3, r * 0.15, 0xc0603c, 0.85);
};

// La Tierra: océano, continentes, nubes, la noche entrando por la derecha
let drawEarth = (r) => {
  fc(0, 0, r * 1.1, 0x6fb4e0, 0.12);
  fc(0, 0, r, 0x1f5a92, 1);
  // dos continentes hechos de manchas que se solapan, nubes y los polos
  for (let [x, y, q, c] of [
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
    fc(x * r, y * r, q * r, c ? INK_HI : 0x4f8a4a, c ? 0.45 : 0.9);
  drawBandedSphere(r, 0, 0.3);
  sk(0, 0, r, 2, 0x9fd4f0, 0.5);
};

// --------------------------------------------------------------------------
class Game extends PS {

  create() {
    let [me] = [this];
    GF = me.gfx = me.add.graphics();

    // la nave, en coordenadas de MUNDO (y positivo = hacia abajo). Su actitud
    // es una base: F nariz, U techo, R ala derecha.
    me.o = { x: 0, y: 0, z: -1600 };
    me.F = { x: 0, y: 0, z: 1 };
    me.U = { x: 0, y: -1, z: 0 };
    me.R = { x: 1, y: 0, z: 0 };
    me.yv = 0;
    me.pv = 0;
    me.Jr = me.Jp = me.Jt = 0;
    me.cu = 220;
    me.H = me.cu;
    me.u = BOOST_MAX;
    me.Ql = 0; // alabeo solo visual, al girar
    me.su = 0;
    me.sw = 0;
    me.du = 0;
    me.fy = 0;
    me.iu = 0;
    me.Qj = HULL_MAX;
    me.am = MISSILE_MAX;
    me.ar = 0;

    // cámara: la misma base, suavizada — sigue la nave también de cabeza
    me.Zp = { ...me.F };
    me.Zo = { ...me.U };
    me.Zq = { ...me.R };

    // ARCADE INFINITO: una sola fase — sobrevive y puntúa hasta morir.
    // (Phaser reuses the scene instance across runs)
    me.fz = 'play';
    me.bq = 75; // el primer destructor tarda esto en llegar
    me.Zb = 0;
    me.Zm = 50; // la primera emboscada da tiempo a respirar
    me.Za = 5; // la superficie viene armada casi de entrada
    me.Ji = 0; // puntos por sobrevivir
    me.wvN = 0;
    me.ht = 0;
    me.wa = 0;
    me.T = 0;
    me.Kc = me.Sl = me.Hs = 0; // derribos, cámara lenta, golpe seco
    me.Bc = me.Se = 1; // mejor combo, sector
    me.St = 120;
    me.Od = me.Ou = me.Gc = 0; // overdrive: carga y fin; anillos en cadena
    me.Gt = null;
    me.Gs = 8;
    me.Xh = 10000; // cada 10000 puntos, un casco de vuelta
    me.Ks = me.Kt = 0; // racha de derribos
    me.Sv = me.Cg = 0; // puntaje mostrado (cuenta hacia el real); derribos del sector
    me.Lh = me.Lf = 0; // B3 mantenido: cuánto, y cuándo fija el siguiente
    me.Lk = []; // los blancos fijados
    // relojes de los eventos, y los avisos de "primera vez", de cero en cada partida
    me.Gw = 60;
    me.Ms = 10;
    me.Gd = 40;
    me.Gm = me.Pf = me.Kw = me.Sw = me.Mw = me.Of = 0;
    me.Hi = null; // el récord a batir, cuando llegue del almacenamiento
    loadScores().then((s) => (me.Hi = s.length ? s[0].s : null));
    me.b = 0;
    me.Q7 = 10; // al principio te dejan orientarte
    me.S = 0;

    me.D = [];
    me.bl = [];
    me.ms = [];
    me.q = [];
    me.w = [];
    me.sz = []; // fragmentos de explosión

    // arcade extra
    me.pa = false;
    me.mu = 1; // multiplicador de combo
    me.mt = 0;
    me.Jh = 0; // el casco se recompone solo, con calma y sin golpes
    me.Jj = 0;
    me.G = null;
    me.I = null; // el refuerzo que llama al perder los escudos

    me.po();
    me.bs();
    me.bu();

    me.Qp = me.add.rectangle(CX, CY, W, H, 0xffffff).setAlpha(0).setDepth(10);
    Music.on = true;
  }

  // Las rocas se siembran alrededor del centro del sector
  po() {
    let rnd = (a, b) => a + RND() * (b - a);
    let rocks = 10;
    for (let i = 0; i < rocks; i++) {
      let p = this.ri(SECTOR_R * 0.95);
      this.D.push({
        k: 8, x: p[0], y: p[1] * 0.5, z: p[2], r: 42, M: 2, t: rnd(0, 9), Zx: ROCK_POOL[FLR(RND() * 4)],
        Zw: rnd(-0.5, 0.5), A: rnd(-16, 16), C: rnd(-10, 10), B: rnd(-16, 16), E: 0,
      });
    }
  }

  ri(r) {
    let ang = RND() * PI * 2;
    let rr = 300 + RND() * (r - 300);
    return [SIN(ang) * rr, RH() * 2 * r * 0.5, COS(ang) * rr];
  }

  // Estrellas: puntos fijos del mundo, envueltos en una caja alrededor tuyo
  bs(me = this) {
    // Stars sit at infinity: they only turn with the view and never slide
    // past, so the one thing moving through the sector is you
    me.sn = [];
    for (let i = 0; i < 320; i++) {
      let v = vnorm({ x: RND() - 0.5, y: RND() - 0.5, z: RND() - 0.5 });
      me.sn.push({
        v,
        s: RND() < 0.1 ? 3 : RND() < 0.4 ? 2 : 1,
        a: 0.25 + RND() * 0.45,
        tw: RND() < 0.25 ? 1 + RND() * 2 : 0, // parpadeo
        ph: RND() * 6.3,
      });
    }
    // the galaxy's band: dense faint stars hugging the horizon
    me.Qu = [];
    for (let i = 0; i < 260; i++) {
      let u = RND() + RND() + RND() - 1.5;
      me.Qu.push({
        E: RND() * PI * 2,
        el: (u * 26) / FOCAL,
        s: RND() < 0.2 ? 2 : 1,
        a: 0.2 + RND() * 0.45,
      });
    }
    // el polvo: motas cercanas que convierten la velocidad en estelas —
    // son la referencia principal de hacia dónde te mueves
    me.Qt = [];
    for (let i = 0; i < 96; i++) {
      me.Qt.push({
        x: RH() * 560,
        y: RH() * 560,
        z: RH() * 560,
      });
    }
  }

  bu(me = this) {
    me.Zk = TX(me, 12, 10, '', 15).setAlpha(0.9);
    me.Zl = TX(me, 12, 30, '', 13, DIM_CSS);
    me.Q4 = TX(me, W - 12, 10, '', 15).setOrigin(1, 0).setAlpha(0.9);
    me.Zg = TX(me, W - 12, H - 28, '', 15, DIM_CSS).setOrigin(1, 0);
    me.Zh = TX(me, 12, H - 30, '', 17);
    me.Q9 = TX(me, 168, H - 30, '', 17);
    TX(me, 136, H - 52, 'DASH', 10, DIM_CSS).setOrigin(0, 0.5);
    TX(me, 136, H - 66, 'SHIELD', 10, DIM_CSS).setOrigin(0, 0.5);
    TX(me, 136, H - 80, 'OVERDRIVE', 10, DIM_CSS).setOrigin(0, 0.5);
    me.Zc = TX(me, CX, 64, '', 16, 0, 0.5).setAlpha(0.95);
    me.Qq = TX(me, 0, 0, '', 14, 0, 0.5).setVisible(false);
    me.Qe = TX(me, CX, 168, '', 16, 0, 0.5).setAlpha(0).setAlign('center');
    // etiqueta del escudo, junto a su barra

    // los textos que salen del mundo: un pequeño grupo que se recicla
    me.Pq = [0, 1, 2, 3, 4, 5].map(() => TX(me, 0, 0, '', 14, 0, 0.5).setAlpha(0));
    me.Pi = 0;
    me.W('SURVIVE. SCORE.');
  }

  W(msg) {
    this.Qe.setText(msg).setAlpha(1);
    this.tweens.add({ targets: this.Qe, alpha: 0, delay: 2000, duration: 700 });
  }

  // --- flujo ---
  update(time, delta) {
    let [me] = [this];
    // pausa: START congela TODO — la lógica, el reloj de la partida, los
    // temporizadores (escudo, dash, cadencia), las animaciones y la música.
    // El juego corre con su propio reloj: el real menos lo que duró la pausa
    if (pressed.START1 && me.fz !== 'out') {
      me.pa = !me.pa;
      me.time.paused = me.pa;
      me.pa ? me.tweens.pauseAll() : me.tweens.resumeAll();
      me.tweens.killTweensOf(me.Qe);
      me.Qe.setText(me.pa ? 'PAUSED\nSECTOR ' + me.Se + '  ' + me.Kc + ' DOWN  BEST x' + me.Bc : '').setAlpha(me.pa ? 1 : 0);
    }
    if (me.pa) {
      me.pO = (me.pO || 0) + delta;
      return;
    }
    me.vt = time -= me.pO || 0;
    // cámara lenta (cae el destructor) y un golpe seco al derribar una nave
    let rd = MIN(delta, 50) / 1000;
    me.Sl -= rd;
    me.Hs -= rd;
    let dt = rd * (me.Sl > 0 ? 0.3 : me.Hs > 0 ? 0.1 : 1);
    me.b += dt;
    for (let o of me.Pq) o.Tp += rd;
    // el arcade de siempre: casco extra por puntos, y el récord cae en vivo
    if (me.T >= me.Xh) {
      me.Xh += 10000;
      me.Qj = MIN(HULL_MAX, me.Qj + 1);
      me.W('HULL UP.');
      Sfx.Q3();
    }
    if (me.Hi && me.T > me.Hi) me.W('NEW HIGH SCORE.', (me.Hi = null));
    // con UN casco, la alarma: pitido cada 1.2 s y el marco rojo
    if (me.Qj === 1 && (me.Lw = (me.Lw || 0) - dt) <= 0) {
      me.Lw = 1.2;
      Sfx.O(880, 0.12, SQR, 0.05);
    }
    // cada 2 minutos, un sector nuevo: bono por sobrevivirlo y su nombre
    // y su RETO: derribar 6 + 2·sector naves antes del siguiente — paga fuerte
    if ((me.St -= dt) <= 0) {
      me.St = 120;
      me.T += 300 * me.Se++ + (me.Pf ? 0 : 2000);
      me.W('SECTOR ' + me.Se + ' - ' + SEC[(me.Se - 1) % 3] + (me.Se > 3 ? ' ' + 'I'.repeat(1 + FLR((me.Se - 1) / 3)) : '') + (me.Pf ? '' : '\nPERFECT +2000') + '\nDOWN ' + (6 + 2 * me.Se) + ' SHIPS');
      me.Cg = me.Pf = 0;
      me.Qp.setAlpha(0.35);
      me.tweens.add({ targets: me.Qp, alpha: 0, duration: 700 });
      Sfx.Z1();
    }
    Music.G = !!(me.G || me.I);
    Music.Sp = 1 - 0.07 * MIN(3, me.Se - 1); // cada sector, la música aprieta
    me.Gx = (me.Gm -= dt) > 0 ? 1.8 : 1; // multiplicador del alcance del agujero
    Music.Z6();

    // el combo se enfría
    me.mt -= dt;
    if (me.mt <= 0) me.mu = 1;
    me.Jj -= dt;
    me.ht = MAX(0, me.ht - dt);

    let cb = (me.G && me.G.f && me.G) || (me.I && me.I.f && me.I);
    let anyB = me.G || me.I;
    if (me.fz === 'play' && !cb) {
      if (anyB) {
        // la pelea es contra ÉL: apenas entra escolta, y nada más
        me.sd(dt, 1, 16);
      } else {
      // el reloj del arcade: todo aprieta con los minutos
      me.sd(dt, MIN(5, 1 + FLR(me.b / 50)), MAX(5, 12 - me.b / 50));
      me.Zm -= dt;
      if (me.Zm <= 0) {
        me.Zm = 45;
        me.Z7(MIN(5, 2 + FLR(me.b / 90)));
      }
      let Po = me.o;
      let F = me.F;
      let R = me.R;
      // el agujero RESPIRA: cada ~70 s, 5 s tirando con casi el doble de alcance
      if ((me.Gw -= dt) <= 0) {
        me.Gw = me.Se > 2 ? 35 : 70;
        me.Gm = 5;
        me.W('GRAVITY SURGE - KEEP CLEAR.');
        Sfx.O(70, 2, SAW, 0.15, 30);
      }
      // desde el sector 3, TORMENTAS de meteoritos que vienen de frente
      if (me.Se > 2 && (me.Ms -= dt) <= 0) {
        me.Ms = 35;
        me.W('METEOR STORM.');
        for (let i = 0; i < 14; i++) {
          let d = 2000 + RND() * 900;
          let v = 300 + RND() * 200;
          me.D.push({
            k: 8, Mt: 1, r: 40, M: 2, t: 0, E: 0, Zx: ROCK_POOL[i % 4], Zw: RH() * 2,
            x: Po.x + F.x * d + R.x * RH() * 1600, y: Po.y + F.y * d + RH() * 1000, z: Po.z + F.z * d + R.z * RH() * 1600,
            A: -F.x * v, C: -F.y * v, B: -F.z * v,
          });
        }
      }
      // la nave DORADA: rara y veloz, cruza de lado — derríbala: +1000 y
      // misiles llenos. Se va en 8 s
      if ((me.Gd -= dt) <= 0) {
        me.Gd = 45 + RND() * 30;
        me.W('GOLD RUNNER.');
        me.D.push({
          k: 10, r: 50, M: 3, t: 0, E: 0,
          x: Po.x + R.x * 1800 + F.x * 1300, y: Po.y - 150, z: Po.z + R.z * 1800 + F.z * 1300,
          A: -R.x * 560, C: 0, B: -R.z * 560,
        });
      }
      // las torretas de la base, flotando sobre el disco: bajar al jalón a
      // cazarlas paga powerup seguro
      me.Za -= dt;
      if (me.Za <= 0) {
        me.Za = 13;
        if (me.D.filter((e) => e.Qm).length < 12) {
          if (!me.Zt) {
            me.Zt = 1;
            me.W('SURFACE GUNS BELOW.');
          }
          for (let i = 0; i < 6; i++) {
            let wk = RND() < 0.4;
            let gx2 = 0;
            let gz2 = 0;
            let gy2 = 0;
            let ok = false;
            for (let tr2 = 0; tr2 < 6 && !ok; tr2++) {
              let ang = RND() * PI * 2;
              gx2 = me.o.x + SIN(ang) * (700 + RND() * 600);
              gz2 = me.o.z + COS(ang) * (700 + RND() * 600);
              let cxx = FLR(gx2 / CELL) * CELL;
              let czz = FLR(gz2 / CELL) * CELL;
              let h2 = HSH(cxx, czz);
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
              // arco o muro en la celda: reintenta — nada nace DENTRO. Y nada
              // nace ENCIMA de otro: cada techo tiene un solo sitio
              if (ok && (HYP(gx2, gz2) > BND_R - 300 || me.D.some((q) => !q.X && (q.k === 5 || q.k === 6) && HYP(q.x - gx2, q.z - gz2) < 220))) ok = false;
            }
            if (!ok) continue;
            // UNA de cada seis es TUYA, y nunca más de tres vivas: las
            // enemigas caen y las tuyas se quedan, así que sin tope el frente
            // de abajo terminaba azul. Menos, más frágiles — la pelea es tuya
            let fr = i > 4 && me.D.filter((q) => q.Qm && q.L).length < 3 ? 1 : 0;
            me.D.push({
              k: wk ? 6 : 5, Qm: 1, L: fr,
              x: gx2, y: gy2, z: gz2,
              r: wk ? 80 : 44, M: fr ? (wk ? 3 : 2) : wk ? 5 : 3,
              t: RND() * 6, E: RND() * 6.3, P: 1 + RND() * 2,
            });
          }
        }
      }
      // la regla del ala: UNO por cada CUATRO enemigos en el aire — con
      // menos de cuatro vuelas solo; tope tres. El ala ayuda, la pelea es tuya
      me.Zj = (me.Zj ?? 22) - dt;
      if (me.Zj <= 0) {
        me.Zj = 14;
        let airE = me.D.filter((q) => q.k < 3 && !q.X).length;
        let want = MIN(3, FLR(airE / 4));
        if (me.D.filter((q) => q.k === 4 && !q.X).length < want) me.Zr(1);
      }
      // el destructor vuelve siempre — y cada vez con menos ceremonia
      if (!anyB) {
      let was = me.bq;
      me.bq -= dt;
      if (was > 2.5 && me.bq <= 2.5) me.W('MASSIVE SIGNAL.');
      if (me.bq <= 0) {
        me.W('HYPERSPACE RUPTURE.');
        me.Ze();
        me.Zr(1); // no vas solo: un ala llega contigo
      }
      }
      }
      // el casco se recompone solo: aguanta 28 s sin golpes
      if (me.Qj < HULL_MAX) {
        me.Jh += dt;
        if (me.Jh >= 28) {
          me.Jh = 0;
          me.Qj++;
          Sfx.Q3();
        }
      }
      // sobrevivir puntúa solo
      me.Ji += dt;
      if (me.Ji >= 5) {
        me.Ji -= 5;
        me.T += 25;
      }
    }

    if (me.fz !== 'out') me.up(time, dt);
    me.ue(time, dt);
    me.ux(dt);
    me.um(dt, time);
    me.uc(dt);
    me.Ja(time);
    me.uh();
  }

  // ¿Quién es el enemigo/aliado más cercano a esta unidad?
  Z8(e, rng) {
    let best = null;
    let bd = rng;
    for (let q of this.D) {
      if (q.X || q.L || (q.k !== 1 && q.k !== 2 && q.k !== 5 && q.k !== 6)) continue;
      let d = D3(q, e);
      if (d < bd) {
        bd = d;
        best = q;
      }
    }
    return best;
  }

  Z9(e, rng) {
    let best = null;
    let bd = rng;
    for (let q of this.D) {
      if (q.X || (!q.L && q.k !== 4)) continue;
      let d = D3(q, e);
      if (d < bd) {
        bd = d;
        best = q;
      }
    }
    return best;
  }

  // Tu escuadrón: naves azules que cazan enemigos con tus mismas balas
  Zr(n) {
    let Po = this.o;
    for (let i = 0; i < n; i++) {
      if (this.D.filter((q) => q.k === 4).length >= 3) return;
      let ang = RND() * PI * 2;
      this.D.push({
        k: 4,
        x: Po.x + SIN(ang) * 500,
        y: Po.y - 120,
        z: Po.z + COS(ang) * 500,
        r: 40, M: 4, t: 0, E: 0, P: 1, m: RND() < 0.5 ? 1 : -1, A: 0, C: 0, B: 0,
      });
    }
  }

  // La emboscada: n naves entran A LA VEZ desde direcciones distintas —
  // el nivel 0 se gana peleando, no solo recogiendo
  Z7(n) {
    let Po = this.o;
    // desde el sector 2 la emboscada llega en ESCUADRA: una V que viene de
    // un solo lado, ya lanzada contra ti
    let v = this.Se > 1;
    let a0 = RND() * PI * 2;
    this.W(v ? 'SQUADRON.' : 'AMBUSH.');
    Sfx.Z2();
    this.wvN = n;
    for (let i = 0; i < n; i++) {
      let ang = v ? a0 : (i / n) * PI * 2 + RND() * 0.8;
      let sd = v ? (i % 2 ? -150 : 150) * ((i + 1) >> 1) : 0;
      let d = 1500 + (v ? ((i + 1) >> 1) * 160 : 0);
      let gun = i === 2 && n >= 4; // las oleadas grandes traen una corbeta
      this.D.push({
        k: gun ? 2 : 1,
        x: Po.x + SIN(ang) * d + COS(ang) * sd,
        y: Po.y + (v ? 0 : RH() * 600),
        z: Po.z + COS(ang) * d - SIN(ang) * sd,
        r: gun ? 130 : 22 * HUNTER_SCALE,
        M: gun ? 8 : 4,
        t: 0,
        E: 0,
        P: 2 + RND() * 2,
        m: RND() < 0.5 ? 1 : -1,
        A: v ? -SIN(ang) * 320 : 0,
        C: 0,
        B: v ? -COS(ang) * 320 : 0,
        wv: 1,
      });
    }
  }

  // Después de un rato, salen a cazarte — y más, con cada pieza a bordo.
  // Con la primera pieza aparecen también interceptores, que embisten.
  sd(dt, max, every) {
    let [me] = [this];
    let Po = me.o;
    me.Q7 -= dt;
    let alive = me.D.filter((e) => e.k < 3).length;
    if (me.Q7 > 0 || alive >= max) return;
    me.Q7 = every;
    let ang = RND() * PI * 2;
    let r = RND();
    let kz = me.Se > 1 && r < 0.35;
    let sn = !kz && me.Se > 1 && r < 0.6;
    let gun = sn || (me.b > 50 && r > 0.75);
    let el = me.Se > 2 && !kz && !gun && r < 0.8; // ÉLITE: más casco, fuego rápido
    if (kz) Sfx.O(900, 0.6, SAW, 0.05, 300);
    if (kz && !me.Kw) me.W('KAMIKAZES INBOUND.', (me.Kw = 1));
    if (sn && !me.Sw) me.W('SNIPERS - KEEP MOVING.', (me.Sw = 1));
    me.D.push({
      k: gun ? 2 : 1,
      Kz: kz,
      Sn: sn,
      Et: el,
      x: Po.x + SIN(ang) * 1300,
      y: Po.y + RH() * 500,
      z: Po.z + COS(ang) * 1300,
      r: sn ? 70 : gun ? 130 : (kz ? 16 : 22) * HUNTER_SCALE,
      M: sn ? 3 : gun ? 8 : kz ? 1 : el ? 7 : 4,
      t: 0,
      E: 0,
      P: sn ? 4 : kz ? 1e9 : 2,
      m: RND() < 0.5 ? 1 : -1,
      A: 0,
      C: 0,
      B: 0,
    });
  }

  // El destructor sale del hiperespacio y bloquea el salto. Llega ANCLADO
  // CERCA DEL CENTRO del sector (la pelea nunca vive contra el borde, que
  // te empuja de vuelta), y al punto del anillo MÁS LEJANO de ti: la
  // entrada y la salva se ven enteras, de lejos, como una escena.
  Ze(mini, me = this) {
    let Po = me.o;
    // Aparece LEJOS, delante de ti y a TU MISMA ALTURA: lo ves de lado,
    // entero, imponente. No hay anillo: el sector eres tú. El MINI es el
    // refuerzo: escolta sin domos, con menos casco — pero son DOS.
    let f = me.F;
    let h = HYP(f.x, f.z) || 1;
    let bd = mini ? 2400 : me.Zb ? 2200 : 2600;
    let ang = mini ? RND() * PI * 2 : 0;
    let bx = Po.x + (mini ? SIN(ang) : f.x / h) * bd;
    let bz = Po.z + (mini ? COS(ang) : f.z / h) * bd;
    // nunca tras el borde: se acota ANTES de medir el suelo bajo él
    let bk = MIN(1, (BND_R - 1000) / HYP(bx, bz));
    bx *= bk;
    bz *= bk;
    let nb = {
      k: 7,
      x: bx,
      y: MIN(Po.y, surfY(bx, bz) - 380),
      z: bz,
      r: 520 * SD_SCALE,
      t: 0,
      E: AT2(Po.x - bx, Po.z - bz), // la proa hacia ti
      ha: 8,
      ca: 12,
      ma: 6,
      cg: 0,
      // la entrada: primero el APAGÓN y las letras — y cuando todo está
      // negro, el destructor simplemente ESTÁ, de golpe, con el flash
      d: 1,
      f: 1,
      Q2: 0,
      Qb: mini || me.Zb ? 1 : 0, // el primero con toda la ceremonia
      Zd: 0,
      Q5: 0,
      Qn: mini ? 1 : 0,
      j: SD_PARTS.filter(([kind], i) => !mini || (kind === 2 || i < 4))
        .map(([kind, ox, oy, oz, hp]) => {
          // cada regreso vuelve con medio casco más
          hp = mini && kind === 2 ? 8 : RD(hp * (1 + me.Zb / 2));
          return { Z: kind, ox, oy, oz, M: hp, max: hp, P: 1 + RND() * 3, Qi: 0 };
        }),
    };
    if (mini) me.I = nb;
    else {
      me.G = nb;
      // PEM: mata todo lo que vuela y limpia el cielo de fuego — la
      // escena es SUYA, y tu nave queda al garete
      for (let q of me.D) {
        if (q.k < 5) {
          q.X = true;
          me.bm(q);
        }
      }
      me.q.length = 0;
      me.XB(nb, 0, { h: true, r: 1100 });
      me.W('EMP BLAST.');
    }
    me.D.push(nb);
  }

  // Del casco del destructor al mundo, y de vuelta
  V(b, ox, oy, oz) {
    let c = COS(b.E) * SD_SCALE;
    let s = SIN(b.E) * SD_SCALE;
    return [b.x + ox * c + oz * s, b.y + oy * SD_SCALE, b.z - ox * s + oz * c];
  }
  wb(b, wx, wy, wz) {
    let c = COS(b.E) / SD_SCALE;
    let s = SIN(b.E) / SD_SCALE;
    let dx = wx - b.x;
    let dz = wz - b.z;
    return [dx * c - dz * s, (wy - b.y) / SD_SCALE, dx * s + dz * c];
  }

  // ¿Está este punto dentro del casco o de la torre?
  ib(b, wx, wy, wz, pad) {
    let [lx, ly, lz] = this.wb(b, wx, wy, wz);
    if (lz > SD_NOSE + pad || lz < SD_REAR - pad) return false;
    let k = (SD_NOSE - lz) / (SD_NOSE - SD_REAR);
    if (ABS(lx) < SD_HALF_W * k + pad && ly > SD_RIDGE * k - pad && ly < SD_KEEL * k + pad) return true;
    return ABS(lx) < 90 + pad && ly > -175 - pad && ly < -60 && lz < -240 + pad;
  }

  // Un punto débil puede recibir daño si está vivo y, en el caso del puente,
  // si ya cayeron los dos domos que lo escudan
  bo(b, pt) {
    if (pt.M <= 0) return false;
    if (pt.Z !== 2) return true;
    return !b.j.some((q) => q.Z === 1 && q.M > 0);
  }

  ba(b, f) {
    let Po = this.o;
    let best = null;
    let bestDot = -2;
    for (let pt of b.j) {
      if (!this.bo(b, pt)) continue;
      let [wx, wy, wz] = this.V(b, pt.ox, pt.oy, pt.oz);
      let d = HYP(wx - Po.x, wy - Po.y, wz - Po.z) || 1;
      let dot = ((wx - Po.x) * f.x + (wy - Po.y) * f.y + (wz - Po.z) * f.z) / d;
      if (dot > bestDot) {
        bestDot = dot;
        best = pt;
      }
    }
    return best;
  }

  // Daño a una pieza del destructor. Cae el puente, cae el destructor.
  bp(b, pt, n, me = this) {
    if (!me.bo(b, pt)) return;
    pt.M -= n;
    b.g = 0.06;
    pt.g = 0.1;
    let [wx, wy, wz] = me.V(b, pt.ox, pt.oy, pt.oz);
    if (pt.M > 0) {
      me.w.push({ wx, wy, wz, t: 0.3 });
      return;
    }
    me.w.push({ wx, wy, wz, t: 0, h: true });
    me.sy(wx, wy, wz, 8);
    Sfx.Qk();
    if (pt.Z === 0) {
      me.ad(60);
    } else if (pt.Z === 1) {
      me.ad(150);
      let domesLeft = b.j.some((q) => q.Z === 1 && q.M > 0);
      me.W(domesLeft ? 'DOME DOWN.' : 'HIT THE BRIDGE.');
      b.Zd = 0.7; // perder un domo lo hace saltar
      // sin escudos, no pelea limpio: llama a su escolta — ahora son DOS
      if (!domesLeft && !me.I && !b.Qn && me.Zb >= 1) {
        me.W('IT CALLS FOR BACKUP.');
        me.Ze(1);
      }
    } else {
      me.kb(b);
    }
  }

  ub(b, dx, dz, dist, dt, me = this) {
    let Po = me.o;
    // La escena (entrada, y cada teletransporte en versión corta): el
    // sector se APAGA con las letras contando qué pasa, el destructor
    // aparece DE GOLPE en el negro con el flash, y suelta una lluvia de
    // cohetes que sube alto, se abre en direcciones distintas y después
    // se curva hacia ti mientras vuelve la luz.
    if (b.f) {
      b.Q2 += dt;
      let ct = b.Q2;
      let S = b.Qb ? 0.8 : 1;
      b.Q8 = ct < 1.2 * S ? ct / (1.2 * S) : ct < 4.4 * S ? 1 : MAX(0, 1 - (ct - 4.4 * S) / (1.8 * S));
      if (b.d && ct >= 1.2 * S) {
        b.d = 0;
        me.Qp.setAlpha(0.7);
        me.tweens.add({ targets: me.Qp, alpha: 0, duration: 700 });
        me.S = 12;
        Sfx.Qk();
        me.W(b.Qb ? "IT'S BACK." : 'DESTROYER AHEAD.');
      }
      if (!b.d && ct > 1.5 * S && ct < 4.1 * S) {
        b.Q5 -= dt;
        if (b.Q5 <= 0 && me.D.filter((q) => q.k === 3).length < 6) {
          b.Q5 = 0.26;
          if (!b.Zf && !b.Qb) {
            b.Zf = 1;
            me.W('SALVO INBOUND.');
          }
          // la salva se abre en espiral (ángulo áureo), sube LENTA con su
          // columna de estela — y uno de cada cuatro es un dardo: sube poco
          // y se lanza rapidísimo, para esquivarlo en el último segundo
          let n = (b.sN = (b.sN || 0) + 1);
          let ang = n * 2.4;
          let fast = n % 4 === 3;
          let [wx, wy, wz] = me.V(b, RH() * 160, -175, -330);
          let P = Po;
          let mk = 0.45 + RND() * 0.3;
          me.D.push({
            k: 3, x: wx, y: wy, z: wz, r: 22, M: 1, t: 0, E: 0,
            A: COS(ang) * (260 + RND() * 300),
            C: -(fast ? 260 : (300 + RND() * 180)) * (b.Qb ? 0.7 : 1),
            B: SIN(ang) * (260 + RND() * 300),
            Qr: (fast ? 0.6 : 2.2 + RND() * 1.2) * (b.Qb ? 0.6 : 1),
            fast,
            mid: fast ? 0 : 1,
            gx: b.x + (P.x - b.x) * mk + RH() * 700,
            gy: P.y + RH() * 300,
            gz: b.z + (P.z - b.z) * mk + RH() * 700,
            N: 12,
          });
          if (RND() < 0.35) Sfx.Qz();
        }
      }
      if (ct > 6.4 * S) {
        b.f = 0;
        b.Q8 = 0;
        if (!b.Qb) me.Zj = 4; // el ala se reagrupa tras el PEM
      }
      return;
    }

    // si te le acercas demasiado, no pelea contigo cuerpo a cuerpo:
    // desaparece y te castiga desde lejos
    if (!b.Zd && dist < 420 && me.b > (b.Jg || 0)) {
      b.Jg = me.b + 20;
      b.Zd = 1.0;
      me.W('TOO CLOSE - IT CHARGES A JUMP.');
    }
    // cada domo que pierde también lo saca del apuro: salto corto —
    // desaparece, un silencio, y reaparece lejos con salva
    if (b.Zd > 0) {
      b.Zd -= dt;
      if (b.Zd <= 0) {
        for (let e2 of me.D) {
          if (e2.k === 3) {
            e2.X = true;
            me.bm(e2);
          }
        }
        // tus misiles en vuelo hacia él vuelven al tubo: el salto no roba
        let back = 0;
        for (let m2 of me.ms) {
          if (m2.Qd === b && !m2.X) {
            m2.X = true;
            back++;
          }
        }
        if (back) {
          me.am = MIN(MISSILE_MAX, me.am + back);
          me.W('MISSILES RECALLED.');
        }
        // salta hacia ADENTRO del sector (hacia el centro, con juego): cerca
        // del borde, un rumbo al azar lo dejaba tras el muro
        let ta = AT2(-Po.x, -Po.z) + RH() * 1.4;
        b.x = Po.x + SIN(ta) * 1700;
        b.z = Po.z + COS(ta) * 1700;
        b.y = MIN(Po.y, surfY(b.x, b.z) - 380);
        b.E = AT2(Po.x - b.x, Po.z - b.z);
        b.d = 1;
        b.Qb = 1;
        b.f = 1;
        b.Q2 = 0;
        b.Q5 = 0;
        Sfx.Z1();
        me.W('IT JUMPED.');
        return;
      }
    }
    for (let pt of b.j) if (pt.g) pt.g -= dt;
    // gira lento para ponerte la proa — más lento que tu órbita, así ganarle
    // la espalda es cuestión de volar. Avanza si te alejas, nunca retrocede,
    // y no se deja arrastrar lejos del centro del sector.
    b.E += AWR(AT2(dx, dz) - b.E) * MIN(1, 0.11 * dt);
    let move = dist > 1900 ? 90 : 0;
    b.x += SIN(b.E) * move * dt;
    b.z += COS(b.E) * move * dt;
    b.y += SIN(b.t * 0.4) * 6 * dt;

    // torretas: ráfagas de tres, lentas y esquivables — pero son seis
    for (let pt of b.j) {
      if (pt.Z !== 0 || pt.M <= 0 || dist > 2600) continue;
      pt.P -= dt;
      if (pt.Qi > 0 && pt.P <= 0) {
        pt.Qi--;
        pt.P = pt.Qi ? 0.2 : 4.6 + RND() * 1.8;
        let [wx, wy, wz] = me.V(b, pt.ox, pt.oy - 30, pt.oz);
        // el destructor es la policía mala: la mitad de sus ráfagas van
        // contra los carroñeros, no contra ti
        let prey = null;
        if (RND() < 0.5) {
          for (let q of me.D) {
            if (q.k < 3 && !q.X && HYP(q.x - wx, q.y - wy, q.z - wz) < 2000) {
              prey = q;
              break;
            }
          }
        }
        if (prey) {
          let pdx = prey.x - wx;
          let pdy = prey.y - wy;
          let pdz = prey.z - wz;
          let pm = HYP(pdx, pdy, pdz) || 1;
          me.w.push({ wx, wy, wz, t: 0.28, Q1: true });
          me.q.push({ x: wx, y: wy, z: wz, A: (pdx / pm) * SHOT_SPEED, C: (pdy / pm) * SHOT_SPEED, B: (pdz / pm) * SHOT_SPEED, N: 8, sd: 1 });
          if (!me.Zs) {
            me.Zs = 1;
            me.W('IT HUNTS THEM TOO.');
          }
        } else me.sa({ x: wx, y: wy, z: wz }, SHOT_SPEED);
      } else if (pt.Qi === 0 && pt.P <= 0) pt.Qi = 2;
    }

    // el hangar suelta interceptores
    b.ha -= dt;
    if (b.ha <= 0) {
      b.ha = 16;
      if (me.D.filter((e) => e.k === 1).length < 3) {
        let [wx, wy, wz] = me.V(b, 0, SD_KEEL + 30, -100);
        me.D.push({ k: 1, x: wx, y: wy, z: wz, r: 22 * HUNTER_SCALE, M: 4, t: 0, E: b.E, P: 2, m: 1, A: 0, C: 120, B: 0 });
      }
    }

    // la torre suelta una pareja de misiles que te persiguen
    b.ma -= dt;
    if (b.ma <= 0 && dist < 2600 && me.D.filter((q) => q.k === 3).length < 4) {
      b.ma = 15;
      for (let side of [-1, 1]) {
        let [wx, wy, wz] = me.V(b, side * 60, -170, -330);
        let [ox, , oz] = me.V(b, side * 400, 0, -330);
        let vx = (ox - b.x) * 0.3;
        let vz = (oz - b.z) * 0.3;
        me.D.push({ k: 3, x: wx, y: wy, z: wz, r: 22, M: 1, t: 0, E: 0, A: vx, C: -160, B: vz, N: 9 });
      }
      Sfx.Qz();
    }

    // el cañón de proa: carga a la vista y suelta una esfera enorme y lenta
    if (b.cg > 0) {
      b.cg -= dt;
      if (b.cg <= 0) {
        let [wx, wy, wz] = me.V(b, 0, 10, SD_NOSE);
        me.sa({ x: wx, y: wy, z: wz }, 190, true);
        me.S = 6;
        Sfx.Qz();
      }
    } else {
      b.ca -= dt;
      if (b.ca <= 0 && dist < 2800) {
        b.ca = 14;
        b.cg = 1.8;
      }
    }
  }

  kb(b, me = this) {
    b.X = true;
    if (me.G === b) me.G = null;
    if (me.I === b) me.I = null;
    for (let i = 0; i < 9; i++) {
      let [wx, wy, wz] = me.V(b, RH() * 400, (RND() - 0.7) * 150, SD_REAR + RND() * 900);
      me.w.push({ wx, wy, wz, t: -i * 0.12, h: true });
    }
    me.sy(b.x, b.y, b.z, 24);
    me.S = 16;
    me.Sl = 1.2;
    // su muerte es una ONDA: arrasa las naves enemigas que tenga cerca
    for (let q of me.D) if (q.k < 4 && !q.X && D3(q, b) < 2500) me.Qf(q, 99);
    me.T += b.Qn ? 800 : 1500;
    Sfx.Qk();
    me.Zb++;
    me.bq = 50; // el siguiente ya viene (cuando no quede ninguno)
    me.W(b.Qn ? 'BACKUP DOWN. +800' : 'DESTROYER DOWN. +1500');
  }

  ad(pts, p, lb, me = this) {
    let v = pts * me.mu;
    me.T += v;
    if (p) {
      me.PU(p, (lb || '') + '+' + v);
      // lo que se gana peleando carga el OVERDRIVE
      me.Od = MIN(100, me.Od + 8);
      if (me.Od >= 100 && !me.Of) me.W('OVERDRIVE READY - PRESS B5.', (me.Of = 1));
    }
    let was = me.mu;
    if (me.mt > 0) me.mu = MIN(5, me.mu + 1);
    else me.mu = 2;
    // al llegar a ×5 el combo se anuncia, y en ×5 aguanta 6 s en vez de 4
    if (me.mu > 4 && was < 5) me.W('MAX COMBO x5');
    me.mt = me.mu > 4 ? 6 : 4;
    me.Bc = MAX(me.Bc, me.mu);
  }

  // un texto que sale del mundo ('+120', 'CLOSE +50'): sube y se apaga
  PU(p, s) {
    let o = this.Pq[this.Pi++ % 6];
    o.setText(s).setAlpha(1);
    o.Wp = { x: p.x, y: p.y, z: p.z };
    o.Tp = 0;
  }

  sy(x, y, z, n) {
    for (let i = 0; i < n; i++) {
      let a1 = RND() * PI * 2;
      let a2 = RH() * PI;
      let sp = 120 + RND() * 240;
      this.sz.push({
        x, y, z,
        A: SIN(a1) * COS(a2) * sp,
        C: SIN(a2) * sp,
        B: COS(a1) * COS(a2) * sp,
        N: 0.5 + RND() * 0.3,
      });
    }
  }

  // --- la nave: tuya, libre ---
  fw() {
    return this.F;
  }

  up(time, dt, me = this) {
    let Po = me.o;
    // la entrada del destructor es una escena: motores al mínimo, sin dash
    // ni nitro, y la nave se NIVELA Y ENCUADRA al destructor sola — lo ves
    // de lado, entero, y recuperas el mando cuando la luz vuelve
    let cineB = (me.G && me.G.f && me.G) || (me.I && me.I.f && me.I);
    // solo la PRIMERA entrada te quita el mando; en los saltos a mitad de
    // pelea se apaga el sector, pero la nave sigue siendo tuya
    let sceneHold = !!cineB && !cineB.Qb;
    if (sceneHold) {
      let b = cineB;
      // encuadra 500 POR ENCIMA del casco: el destructor queda en cuadro,
      // y al volver el mando tu rumbo pasa limpio sobre la torre en vez de
      // estamparte contra la proa
      let to = vnorm({ x: b.x - Po.x, y: b.y - 500 - Po.y, z: b.z - Po.z });
      let k = MIN(1, 2.2 * dt);
      let [F, U, R] = orthoBasis(vmix(me.F, 1 - k, to, k), vmix(me.U, 1 - k, WORLD_UP, k));
      me.F = F;
      me.U = U;
      me.R = R;
      me.yv = 0;
      me.pv = 0;
    }

    let turn = sceneHold ? 0 : (held.P1_R ? 1 : 0) - (held.P1_L ? 1 : 0);
    let pit = sceneHold ? 0 : (held.P1_U ? 1 : 0) - (held.P1_D ? 1 : 0); // arriba = nariz arriba

    // B5: OVERDRIVE — seis segundos de fuego cuádruple, intocable
    if (pressed.P1_5 && me.Od >= 100 && !sceneHold) {
      me.Od = me.Of = 0;
      me.Ou = me.iu = time + 6000;
      me.W('OVERDRIVE!');
      me.q.length = 0; // encenderlo barre el fuego enemigo del aire
      Sfx.Z1();
    }

    // B4/B6: el escudo se QUEDA — hasta que lo apagues tú con otro toque,
    // o hasta que se consuma solo; apagarlo temprano recarga antes
    if (pressed.P1_4 || pressed.P1_6) {
      if (time < me.su) {
        me.su = time;
        me.sw = time + SHIELD_COOLDOWN_MS;
      } else if (time >= me.sw) {
        me.su = time + SHIELD_MS;
        me.sw = time + SHIELD_MS + SHIELD_COOLDOWN_MS;
        Sfx.Zv();
      }
    }

    // HORIZONTE BLOQUEADO: arriba/abajo cabecea sobre el ala, sin tope — un
    // loop dura lo que mantengas el stick, y al soltar la nave se queda donde
    // la dejaste, de cabeza incluido. Izquierda/derecha cambia el rumbo
    // alrededor del vertical del mapa (derecha es derecha en pantalla aun de
    // cabeza), así las alas nunca se ladean y no hay nada que enderezar. Aun
    // en picada casi vertical: girar sobre el techo ahí y re-alinear al salir
    // daba un salto de 50–70° en un frame. Solo en plena maniobra se gira
    // sobre el techo.
    me.yv += (turn * YAW_RATE - me.yv) * MIN(1, YAW_EASE * dt);
    me.pv += (pit * PITCH_RATE - me.pv) * MIN(1, YAW_EASE * dt);
    let mv = (me.Jw = me.Jr || me.Jp);
    let pa = mv ? 0 : me.pv * dt;
    let ya = mv ? 0 : me.yv * dt;
    let F = vmix(me.F, COS(pa), me.U, SIN(pa));
    let U = vmix(me.U, COS(pa), me.F, -SIN(pa));
    let hz = (f) => vmix(WORLD_UP, 1, f, -vdot(WORLD_UP, f));
    let c = hz(F);
    if (HYP(c.x, c.y, c.z) > 1e-4 && !mv) {
      let s = vdot(U, c) < 0 ? -1 : 1;
      F = rotAxis(F, { x: 0, y: -s, z: 0 }, -ya);
      U = vmix(vnorm(hz(F)), s, F, 0);
    } else F = rotAxis(F, U, -ya);
    let R;
    [F, U, R] = orthoBasis(F, U);
    // Maniobras (doble B2): TONEL — una vuelta
    // entera sobre la nariz y un paso hacia ese lado; LOOP completo; MEDIA
    // VUELTA — medio tonel y medio loop hacia el suelo, sales derecho en
    // sentido contrario. Primero el giro, luego el cabeceo.
    if (me.Jr) {
      let th = Math.sign(me.Jr) * MIN(ABS(me.Jr), 13 * dt);
      me.Jr -= th;
      [F, U, R] = orthoBasis(F, vmix(U, COS(th), R, SIN(th)));
      Object.assign(Po, vmix(Po, 1, me.Js, th * 45));
    } else if (me.Jp) {
      let th = MIN(me.Jp, 4.5 * dt);
      me.Jp -= th;
      [F, U, R] = orthoBasis(vmix(F, COS(th), U, SIN(th)), vmix(U, COS(th), F, -SIN(th)));
    }
    me.F = F;
    me.U = U;
    me.R = R;

    // B2: cada toque es un dash — un tirón hacia adelante, intocable un
    // instante. Mantenido es nitro: la nave acelera sin parar mientras dure la
    // reserva, y a esa velocidad embistes a los cazadores.
    if (!sceneHold && pressed.P1_2 && me.u >= DASH_COST) {
      me.u -= DASH_COST;
      me.H = MAX(me.H, me.cu) + DASH_KICK;
      me.du = time + DASH_INVULN_MS;
      // DOBLE toque: maniobra — sin dirección o con lado, tonel; con
      // arriba, loop; con abajo, media vuelta. Un toque es solo el dash.
      if (time - me.Jt < 320) {
        me.Jp = pit > 0 ? 6.283 : pit ? 3.1416 : 0;
        me.Jr = pit < 0 ? (turn || 1) * 3.1416 : pit ? 0 : (turn || 1) * 6.283;
        me.Js = vmix(me.R, pit ? 0 : 1, me.R, 0);
      }
      me.Jt = time;
      Sfx.Z0();
    }
    if (sceneHold) {
      me.u = MIN(BOOST_MAX, me.u + BOOST_REGEN * dt);
      me.H += (6 - me.H) * MIN(1, 4 * dt); // el PEM te dejó al garete
    } else if (held.P1_2 && me.u > 0) {
      me.u = MAX(0, me.u - BOOST_DRAIN * dt);
      me.H = MIN(NITRO_MAX, me.H + NITRO_ACCEL * dt);
    } else {
      if (!held.P1_2) me.u = MIN(BOOST_MAX, me.u + BOOST_REGEN * dt);
      me.H += (me.cu - me.H) * MIN(1, SPEED_EASE * dt);
    }

    // cerca del destructor la pasada se frena sola (salvo con nitro):
    // giras antes, lo pierdes de vista menos, la pelea se queda contigo

    let f = me.fw();
    Po.x += f.x * me.H * dt;
    Po.y += f.y * me.H * dt;
    Po.z += f.z * me.H * dt;

    // los BORDES: pasado el muro o el techo te devuelve a la línea, y el rumbo
    // pierde la componente que empuja hacia afuera y gira — contra el muro de
    // lado, contra el techo de nariz — así ni de frente te quedas trabado
    let P = Po;
    let hr = HYP(P.x, P.z);
    for (let [over, o, tg] of [
      [hr - BND_R, { x: P.x / hr, y: 0, z: P.z / hr }, me.R],
      [BND_TOP - P.y, { x: 0, y: -1, z: 0 }, me.U],
    ]) {
      if (over <= 0) continue;
      P.x -= o.x * over;
      P.y -= o.y * over;
      P.z -= o.z * over;
      let out = vdot(me.F, o);
      let k = MIN(1, 6 * dt) * out;
      if (out > 0) [me.F, me.U, me.R] = orthoBasis(vmix(vmix(me.F, 1, o, -1.5 * k), 1, tg, k), me.U);
      if (me.b > me.wa) {
        me.wa = me.b + 3;
        me.W('SECTOR EDGE.');
      }
    }
    // el agujero negro: cuanto más cerca, más tira — y muy cerca, te traga
    let bdx = BH[0] - P.x;
    let bdy = BH[1] - P.y;
    let bdz = BH[2] - P.z;
    let bhd = HYP(bdx, bdy, bdz);
    me.Zi = CLP(1 - (bhd - BH_KILL) / (BH_PULL * me.Gx - BH_KILL), 0, 1);
    // el reloj del disco corre según lo cerca que estés: lejos, lento
    me.Jf = CLP(1 - bhd / 9000, 0, 1);
    me.bT = (me.bT || 0) + dt * (0.25 + 2.2 * me.Jf * me.Jf);
    if (bhd < BH_PULL * me.Gx) {
      if (me.b > (me.Jl || 0)) {
        // el retumbo del vacío, cada vez más presente
        me.Jl = me.b + 0.8;
        Sfx.O(26 + me.Zi * 22, 0.9, SAW, 0.11 * me.Zi, 18);
      }
      let grip = bhd < BH_GRIP;
      // el agarre: un jalón que el crucero no vence — sales con dash o nitro.
      // Y el tiempo se estira: sin nitro la nave se frena, la caída DURA
      if (grip && !held.P1_2) me.H += (60 - me.H) * MIN(1, 8 * dt);
      let pull = (grip ? 290 : 650 * me.Zi * me.Zi) * dt / bhd;
      P.x += bdx * pull;
      P.y += bdy * pull;
      P.z += bdz * pull;
      me.S = MAX(me.S, grip ? 6 : me.Zi * 4);
      if (me.b > me.wa) {
        me.wa = me.b + (grip ? 2.5 : 4);
        me.W(grip ? 'IT HAS YOU - DASH.' : 'BLACK HOLE - BREAK AWAY.');
      }
    }
    // el horizonte de sucesos no negocia: ni el escudo ni el modo prueba
    if (bhd < BH_KILL) me.Jc();

    // la superficie de la estación es PARED: aviso cerca, muerte al tocarla
    let sdy = surfY(Po.x, Po.z) - Po.y;
    if (sdy < 46) me.Jc();
    // las torres de la superficie son SÓLIDAS: rozarlas cuesta casco
    if (sdy < 620) {
      let cs = CELL;
      let cx0 = FLR(Po.x / cs) * cs;
      let cz0 = FLR(Po.z / cs) * cs;
      let hsh = HSH(cx0, cz0);
      if (hsh < 22) {
        let hh = (hsh < 8 ? 300 : 90) + (hsh % 5) * 70;
        let bx0 = cx0 + cs * 0.3;
        let bz0 = cz0 + cs * 0.3;
        let bw2 = cs * 0.4;
        let yb = surfY(bx0 + bw2 / 2, bz0 + bw2 / 2);
        if (
          Po.y > yb - hh &&
          Po.x > bx0 && Po.x < bx0 + bw2 &&
          Po.z > bz0 && Po.z < bz0 + bw2
        ) {
          me.hy(time);
          Po.y = yb - hh - 70; // la torre te escupe hacia arriba
        }
      } else if (hsh >= 22 && hsh < 30) {
        // el travesaño del arco es sólido: o por debajo, o te duele
        let zm = cz0 + cs / 2;
        let hA = 230 + (hsh % 4) * 40;
        let yT = surfY(cx0 + cs / 2, zm) - hA;
        if (
          ABS(Po.z - zm) < 40 &&
          Po.x > cx0 + 60 && Po.x < cx0 + cs - 60 &&
          Po.y > yT - 20 && Po.y < yT + 60
        ) {
          me.hy(time);
          Po.y = yT - 90;
        }
      } else if (hsh >= 42 && hsh < 48) {
        // el muro bajo: por encima o por los lados
        let zm = cz0 + cs / 2;
        let yW = surfY(cx0 + cs / 2, zm);
        if (
          ABS(Po.z - zm) < 34 &&
          Po.x > cx0 + 40 && Po.x < cx0 + cs - 40 &&
          Po.y > yW - 120
        ) {
          me.hy(time);
          Po.y = yW - 190;
        }
      }
    }

    // los ANILLOS: aparecen delante de ti; crúzalos por dentro — puntos,
    // turbo lleno y el siguiente, más lejos. Pasar por fuera corta la cadena
    let G = me.Gt;
    if (G) {
      let rx = Po.x - G.x;
      let ry = Po.y - G.y;
      let rz = Po.z - G.z;
      let gd = HYP(rx, ry, rz);
      if (rx * G.n.x + ry * G.n.y + rz * G.n.z > 0 || gd > 4000) {
        me.Gt = null;
        if (gd < 120) {
          me.ad(100 * ++me.Gc, G, 'GATE ');
          if (me.Gc === 5) me.Od = 100; // cinco seguidos: OVERDRIVE lleno
          me.u = BOOST_MAX;
          me.Gs = 0;
          Sfx.Q3();
        } else me.Gc = 0;
      }
    } else if ((me.Gs -= dt) <= 0) {
      me.Gs = 16;
      let d = 1200 + RND() * 400;
      // dentro del CÍRCULO del sector (radio útil 5800), nunca tras el borde
      let x = Po.x + me.F.x * d + me.R.x * RH() * 600;
      let z = Po.z + me.F.z * d + me.R.z * RH() * 600;
      let k = MIN(1, 5800 / (HYP(x, z) || 1));
      x *= k;
      z *= k;
      let y = CLP(Po.y + me.F.y * d + RH() * 400, BND_TOP + 300, surfY(x, z) - 300);
      // si el borde lo corrió hacia adentro, el anillo se gira hacia ti:
      // siempre se puede cruzar
      let n = k < 1 ? vnorm({ x: x - Po.x, y: y - Po.y, z: z - Po.z }) : me.F;
      let e1 = k < 1 ? vnorm(vcross(n, WORLD_UP)) : me.R;
      me.Gt = { x, y, z, n, e1, e2: vcross(n, e1) };
    }

    // alabeo con el giro
    let bank = me.yv * 0.34;
    me.Ql += (bank - me.Ql) * MIN(1, 8 * dt);

    // B1: cañón — sale de la nariz, hereda tu velocidad (doble con la mejora)
    // mientras dura la escena del destructor no se dispara: es SU momento
    if (held.P1_1 && time >= me.fy && !cineB) {
      me.fy = time + (time < me.Ou ? 70 : FIRE_MS);
      me.Jj = 0.05;
      Sfx.Zz();
      let sp = BOLT_SPEED + me.H;
      let R = me.R;
      // contra el destructor, el cañón corrige hacia el punto débil abierto
      // que tengas casi de frente — pegarle es cuestión de apuntar cerca
      let aim = f;
      for (let bb of [me.G, me.I]) {
        if (!bb || bb.d) continue;
        let pt = me.ba(bb, f);
        if (pt) {
          let [wx, wy, wz] = me.V(bb, pt.ox, pt.oy, pt.oz);
          let to = vnorm({ x: wx - Po.x, y: wy - Po.y, z: wz - Po.z });
          if (vdot(to, f) > 0.93) {
            aim = to;
            break;
          }
        }
      }
      if (aim === f) {
        let tg = me.bt(f);
        if (tg && tg.k !== 7) {
          let dd = D3(tg, Po) || 1;
          let lead = dd / (BOLT_SPEED + me.H);
          let to = vnorm({
            x: tg.x + (tg.A || 0) * lead - Po.x,
            y: tg.y + (tg.C || 0) * lead - Po.y,
            z: tg.z + (tg.B || 0) * lead - Po.z,
          });
          // ayuda al que YA apunta bien: cono estrecho (~10°), no imán
          if (vdot(to, f) > 0.985) aim = to;
        }
      }
      for (let off of time < me.Ou ? [-20, -7, 7, 20] : [-9, 9]) {
        me.bl.push({
          x: Po.x + f.x * 24 + R.x * off,
          y: Po.y + f.y * 24 + R.y * off,
          z: Po.z + f.z * 24 + R.z * off,
          A: aim.x * sp,
          C: aim.y * sp,
          B: aim.z * sp,
          N: BOLT_LIFE,
        });
      }
    }

    // los misiles vuelven solos, uno cada tanto
    if (me.am < MISSILE_MAX) {
      me.ar += dt;
      if (me.ar >= MISSILE_REGEN) {
        me.ar = 0;
        me.am++;
        Sfx.Z4();
      }
    } else me.ar = 0;

    // B3: misil — TOCAR lanza uno al blanco más alineado con tu nariz;
    // MANTENER fija hasta 4 blancos (uno cada 0.25 s) y al SOLTAR sale la
    // salva, uno a cada uno. Contra el destructor, al punto débil vivo
    if (held.P1_3 && me.am > 0 && !cineB) {
      me.Lh += dt;
      if (me.Lh > 0.4 && me.Lk.length < MIN(4, me.am) && (me.Lf -= dt) <= 0) {
        me.Lf = 0.25;
        let t = me.bt(f, me.Lk);
        if (t) {
          me.Lk.push(t);
          Sfx.O(1400, 0.06, SQR, 0.05);
        }
      }
    } else if (me.Lh) {
      let ts = me.Lh > 0.4 ? me.Lk.filter((t) => !t.X) : [me.bt(f)];
      for (let target of ts.length ? ts : [null]) {
        if (me.am <= 0 || cineB) break;
        me.am--;
        me.ms.push({
          x: Po.x + f.x * 26 - me.U.x * 6,
          y: Po.y + f.y * 26 - me.U.y * 6,
          z: Po.z + f.z * 26 - me.U.z * 6,
          A: f.x * MISSILE_SPEED,
          C: f.y * MISSILE_SPEED,
          B: f.z * MISSILE_SPEED,
          Qd: target,
          Qc: target && target.k === 7 ? me.ba(target, f) : null,
          Y: [],
          N: 7,
        });
      }
      Sfx.Qz();
      me.Lh = me.Lf = 0;
      me.Lk = [];
    }
  }

  bt(f, ex) {
    let Po = this.o;
    let best = null;
    let bestDot = 0.75; // solo lo que ya tienes bastante de frente
    for (let e of this.D) {
      if (e.k === 4 || e.L || e.X || (ex && ex.includes(e))) continue;
      let dx = e.x - Po.x;
      let dy = e.y - Po.y;
      let dz = e.z - Po.z;
      let d = HYP(dx, dy, dz);
      if (d > (e.k === 7 ? 3600 : 2800)) continue;
      // el destructor es enorme: cuenta como "de frente" aunque su centro no lo esté
      let dot = (dx * f.x + dy * f.y + dz * f.z) / MAX(d, 1) + (e.k === 7 ? 0.45 : 0);
      if (dot > bestDot) {
        bestDot = dot;
        best = e;
      }
    }
    return best;
  }

  // La muerte: una sola, para todo lo que mata de un golpe
  Jc(me = this) {
    if (me.fz === 'out' || (me.G && me.G.f) || (me.I && me.I.f)) return;
    me.fz = 'out';
    me.Sl = 1.3; // la propia muerte, en cámara lenta
    me.XB(me.o, 0, { h: true });
    me.S = 14;
    Sfx.Qk();
    me.time.delayedCall(1400, () => me.scene.start('O', { T: me.T, Sd: [me.Kc, me.Bc, FLR(me.b), me.Se] }));
  }

  hy(time, me = this) {
    if (me.fz === 'out' || (me.G && me.G.f) || (me.I && me.I.f)) return;
    if (time < me.su) {
      // la burbuja se lleva el golpe: se ve dónde pegó
      me.ht = 0.3;
      return;
    }
    if (time < me.iu || time < me.du) return;
    me.iu = time + 2600;
    me.S = 9;
    Sfx.Z3();
    // el golpe se ve: chispas de tu casco y un destello
    me.sy(me.o.x, me.o.y, me.o.z, 8);
    me.Qp.setAlpha(0.25);
    me.tweens.add({ targets: me.Qp, alpha: 0, duration: 300 });
    me.Qj--;
    me.Pf = 1; // este sector ya no es perfecto
    me.Jh = 0;
    if (me.Qj <= 0) me.Jc();
  }

  // --- el sector ---
  ue(time, dt, me = this) {
    let P = me.o;

    for (let e of me.D) {
      e.t += dt;
      if (e.g) e.g -= dt;
      // NADA vive tras el borde: lo que aparece, deriva o SALTA afuera —
      // el destructor incluido — vuelve adentro, a su radio del muro
      let eh = HYP(e.x, e.z);
      let el = BND_R - 150 - e.r;
      if (eh > el) {
        e.x *= el / eh;
        e.z *= el / eh;
      }
      let dx = P.x - e.x;
      let dy = P.y - e.y;
      let dz = P.z - e.z;
      let dist = HYP(dx, dy, dz);
      // el agujero negro los traga también: atráelos y caen — y pagan
      if (e.k < 5 || e.k > 7) {
        let bd = D3(e, BHO);
        if (bd < BH_PULL * me.Gx) {
          let f = ((1 - bd / BH_PULL / me.Gx) ** 2 * 900 * dt) / bd;
          e.x += (BHO.x - e.x) * f;
          e.y += (BHO.y - e.y) * f;
          e.z += (BHO.z - e.z) * f;
          if (bd < 420) {
            e.X = true;
            me.bm(e);
            if (e.k < 3) me.ad(200, e, 'SWALLOWED ');
            continue;
          }
        }
      }

      if (e.k === 1 || e.k === 2 || e.k === 4) {
        // vuelan como TÚ: siempre hacia adelante, virando con alabeo. El
        // ACE hace pasadas y rompe cerca; la CORBETA guarda su anillo y
        // ladra ráfagas — grande, lenta, nunca huye.
        let gun2 = e.k === 2;
        let spd2 = gun2 ? 165 : e.Kz ? 470 : 320; // el kamikaze va a fondo
        let gx = P.x;
        let gy = P.y;
        let gz = P.z;
        let wt = null;
        if (e.k === 4) {
          // el wing caza al enemigo más cercano; sin blanco, vuela contigo;
          // pegado al blanco, ROMPE en evasiva como un piloto de verdad
          let td = 1e9;
          for (let q of me.D) {
            if (q.k < 4 && !q.X) {
              let d3 = D3(q, e);
              if (d3 < td) {
                td = d3;
                wt = q;
              }
            }
          }
          if (e.fl > 0) {
            e.fl -= dt;
            gx = e.x + me.R.x * 900 * e.m;
            gy = e.y - 300;
            gz = e.z + me.R.z * 900 * e.m;
          } else if (wt && td < 300) {
            e.fl = 1 + RND() * 0.5;
          } else if (wt) {
            gx = wt.x;
            gy = wt.y;
            gz = wt.z;
          } else {
            gx = P.x + me.R.x * 380 * e.m;
            gy = P.y - 100;
            gz = P.z + me.R.z * 380 * e.m;
          }
          // y cada tanto, un misil propio — solo contra el destructor: las
          // naves se las dejan a ti
          e.Zn = (e.Zn ?? 8) - dt;
          let mtg = me.G || me.I;
          if (e.Zn <= 0 && mtg && !mtg.d) {
            e.Zn = 15;
            me.ms.push({
              x: e.x, y: e.y, z: e.z,
              ...VT(e, mtg, MISSILE_SPEED),
              Qd: mtg,
              Qc: mtg.k === 7 ? me.ba(mtg, me.F) : null,
              Y: [],
              N: 5,
            });
            Sfx.Qz();
          }
        } else if (e.Sn) {
          // el francotirador guarda 2000 de ti, derivando de lado
          let w = (dist - 2000) / dist;
          gx = e.x + dx * w + (dz / dist) * 600 * e.m;
          gy = e.y + dy * w;
          gz = e.z + dz * w - (dx / dist) * 600 * e.m;
        } else if (gun2) {
          // desde el sector 3 la corbeta siembra MINAS a su paso
          if (me.Se > 2 && (e.Mn = (e.Mn || 5) - dt) <= 0) {
            e.Mn = 6;
            if (!me.Mw) me.W('MINES - SHOOT THEM.', (me.Mw = 1));
            me.D.push({ k: 9, x: e.x, y: e.y, z: e.z, r: 30, M: 1, t: 0, E: 0 });
          }
          if (dist < 620) {
            gx = e.x - (dx / dist) * 1200;
            gy = e.y - (dy / dist) * 400;
            gz = e.z - (dz / dist) * 1200;
          } else if (dist < 1100) {
            gx = e.x + (dz / dist) * 900 * e.m;
            gz = e.z - (dx / dist) * 900 * e.m;
            gy = P.y;
          }
        } else if (e.fl > 0) {
          e.fl -= dt;
          // huyendo: lejos de ti, con un quiebre lateral
          gx = e.x - (dx / dist) * 1500 + (dz / dist) * 500 * e.m;
          gy = e.y - (dy / dist) * 600;
          gz = e.z - (dz / dist) * 1500 - (dx / dist) * 500 * e.m;
        } else if (!e.Kz && (dist < 650 || (dist < 1000 && (me.F.x * dx + me.F.y * dy + me.F.z * dz) / dist < -0.93))) {
          // se sabe presa: si te tiene cerca, o si está en tu mira, rompe y
          // se aleja — no se deja atropellar
          e.fl = 1.2 + RND() * 0.8;
        }
        let m = HYP(e.A, e.C, e.B);
        if (m < 40) {
          e.A = (dx / dist) * spd2;
          e.C = (dy / dist) * spd2;
          e.B = (dz / dist) * spd2;
          m = spd2;
        }
        let ddx = gx - e.x;
        let ddy = gy - e.y;
        let ddz = gz - e.z;
        let dd = HYP(ddx, ddy, ddz) || 1;
        let k2 = MIN(1, (gun2 ? 0.9 : e.Kz ? 1.5 : e.fl > 0 ? 3.6 : 2.3) * dt);
        let oy = AT2(e.A, e.B);
        let nx = e.A / m + (ddx / dd - e.A / m) * k2;
        let ny = e.C / m + (ddy / dd - e.C / m) * k2;
        let nz = e.B / m + (ddz / dd - e.B / m) * k2;
        let nm = HYP(nx, ny, nz) || 1;
        e.A = (nx / nm) * spd2;
        e.C = (ny / nm) * spd2;
        e.B = (nz / nm) * spd2;
        e.x += e.A * dt;
        e.y += e.C * dt;
        e.z += e.B * dt;
        e.E = AT2(e.A, e.B);
        // el alabeo visual sale del propio viraje
        e.Qo = (e.Qo || 0) + (CLP(AWR(e.E - oy) * 14, -0.9, 0.9) - (e.Qo || 0)) * MIN(1, 6 * dt);
        e.P -= dt;
        if (e.k === 4) {
          // dispara TUS balas contra su blanco — sin prisa y con pulso de
          // humano: muchas se van por un lado
          if (wt && e.P <= 0) {
            let td2 = D3(wt, e) || 1;
            if (td2 < 1300) {
              e.P = 3.4;
              me.bl.push({
                x: e.x, y: e.y, z: e.z,
                A: ((wt.x - e.x) / td2) * 900 + RH() * 180,
                C: ((wt.y - e.y) / td2) * 900 + RH() * 180,
                B: ((wt.z - e.z) / td2) * 900 + RH() * 180,
                N: 1.6,
                L: 1,
              });
              Sfx.Zz();
            }
          }
        } else if (e.Sn) {
          // la línea roja te sigue y se CONGELA 0.4 s antes del disparo —
          // muévete — y el rayo es instantáneo
          e.Bf -= dt;
          if (e.P > 0.4) e.Am = { x: P.x, y: P.y, z: P.z };
          if (e.P < 1.6 && !e.Ch && dist < 3400) {
            e.Ch = 1;
            Sfx.O(200, 1.4, SQR, 0.04, 900);
          }
          if (e.P <= 0) {
            e.P = 4;
            e.Bf = 0.15;
            e.Ch = 0;
            let v = vnorm({ x: e.Am.x - e.x, y: e.Am.y - e.y, z: e.Am.z - e.z });
            let tt = dx * v.x + dy * v.y + dz * v.z;
            if (tt > 0 && tt < 3400 && HYP(dx - v.x * tt, dy - v.y * tt, dz - v.z * tt) < 40) {
              // con el escudo arriba el rayo REBOTA y lo mata a él
              if (time < me.su) {
                me.Qf(e, 99);
                me.ad(300, e, 'REFLECTED ');
              } else me.hy(time);
            }
            Sfx.Qz();
          }
        } else if (e.P <= 0 && dist < (gun2 ? 1500 : 1300)) {
          e.P = gun2 ? 1.6 : e.Et ? 1.1 : 2.2;
          me.sa(e, SHOT_SPEED);
        }
      } else if (e.k === 6) {
        // el caminante: pisa la superficie y te sigue por la sombra
        let tx2 = dx;
        let tz2 = dz;
        let tdist = dist;
        if (e.L) {
          let tg = me.Z8(e, 2400);
          if (tg) {
            tx2 = tg.x - e.x;
            tz2 = tg.z - e.z;
            tdist = HYP(tx2, tz2) || 1;
          }
        }
        let hm = HYP(tx2, tz2) || 1;
        e.E = AT2(tx2, tz2);
        if (tdist > 500) {
          let nx2 = e.x + (tx2 / hm) * 55 * dt;
          let nz2 = e.z + (tz2 / hm) * 55 * dt;
          let ch2 = HSH(FLR(nx2 / CELL) * CELL, FLR(nz2 / CELL) * CELL);
          if (ch2 >= 48 || (ch2 >= 22 && ch2 < 42)) {
            e.x = nx2;
            e.z = nz2;
          }
        }
        e.y = surfY(e.x, e.z) - 200; // cuerpo chico y ALTO: por debajo se pasa
        e.P -= dt;
        if (e.P <= 0) {
          if (e.L) {
            let tg = me.Z8(e, 1500);
            if (tg) {
              e.P = 2.6;
              me.bl.push({ x: e.x, y: e.y - 20, z: e.z, ...VT(e, tg, 620), N: 2.4, L: 1 });
            }
          } else if (dist < 1500) {
            e.P = 2.6;
            let fr2 = RND() < 0.4 ? me.Z9(e, 1400) : null;
            if (fr2) {
              me.q.push({ x: e.x, y: e.y - 20, z: e.z, ...VT(e, fr2, SHOT_SPEED), N: 7, ow: e });
            } else me.sa(e, SHOT_SPEED);
          }
        }
        if (dist > 4200) e.X = true;
      } else if (e.k === 3) {
        // misil del destructor: te sigue, pero gira mal — un giro cerrado,
        // el escudo o el nitro lo dejan atrás; también se puede derribar.
        // Los de la salva primero SUBEN en columna y luego se curvan a ti.
        if (e.Qr > 0) {
          e.Qr -= dt;
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
          let spd = e.fast ? 640 : 300;
          let k = MIN(1, (e.fast ? 0.55 : 0.9) * dt);
          e.A += ((tx / dd) * spd - e.A) * k;
          e.C += ((ty / dd) * spd - e.C) * k;
          e.B += ((tz / dd) * spd - e.B) * k;
        }
        e.x += e.A * dt;
        e.y += e.C * dt;
        e.z += e.B * dt;
        e.N -= dt;
        if (e.N <= 0) {
          e.X = true;
          me.bm(e);
        }
      } else if (e.k === 7) {
        me.ub(e, dx, dz, dist, dt);
      } else if (e.k === 5) {
        if (dist > 4200) e.X = true; // quedó atrás: el mundo viaja contigo
        e.E += 0.5 * dt; // gira, vigilando
        e.y += SIN(e.t * 1.1) * 8 * dt;
        e.P -= dt;
        if (e.L) {
          // torreta ALIADA: busca lo enemigo y lo bate con tus balas
          if (e.P <= 0) {
            let tg = me.Z8(e, 1500);
            if (tg) {
              e.P = 2.4;
              me.bl.push({
                x: e.x, y: e.y - 30, z: e.z,
                ...VT(e, tg, 620),
                N: 2.4,
                L: 1,
              });
            }
          }
        } else if (e.P <= 0 && dist < 1600) {
          e.P = e.Qm ? 2.1 : 3.2;
          // la enemiga reparte: a veces a ti, a veces a los tuyos
          let fr2 = RND() < 0.5 ? me.Z9(e, 1400) : null;
          if (fr2) {
            me.w.push({ wx: e.x, wy: e.y - 26, wz: e.z, t: 0.28, Q1: true });
            me.q.push({ x: e.x, y: e.y - 26, z: e.z, ...VT(e, fr2, SHOT_SPEED), N: 7, ow: e });
          } else if (dist < 1000) me.sa(e, SHOT_SPEED);
        }
      } else if (e.k === 9) {
        // la mina: cerca de ti revienta — y con los años se apaga sola
        if (dist < 120) {
          e.X = true;
          me.XB(e, 0, { h: true });
          me.hy(time);
        }
        if (e.t > 40) e.X = true;
      } else if (e.k > 7) {
        e.x += e.A * dt;
        e.y += e.C * dt;
        e.z += e.B * dt;
        e.E = AT2(e.A, e.B);
        if (e.Mt || e.k > 8) {
          if (e.t > (e.Mt ? 14 : 8)) e.X = true;
        } else if (dist > 2600) {
          let ang = RND() * PI * 2;
          e.x = P.x + SIN(ang) * 1600;
          e.y = P.y + RH() * 900;
          e.z = P.z + COS(ang) * 1600;
        }
      }

      // lo que se mueve deja estela: se lee hacia dónde va
      if (e.A !== undefined && e.k !== 8) {
        e.tt = (e.tt || 0) + dt;
        if (e.tt > 0.05) {
          e.tt = 0;
          (e.Y = e.Y || []).push([e.x, e.y, e.z]);
          if (e.Y.length > (e.k === 3 ? 26 : 12)) e.Y.shift();
        }
      }

      // contacto contigo (el wing es tuyo: se atraviesa)
      if (!e.X && e.k !== 4 && e.k < 10 && !e.L && dist < e.r + 16) {
        if (
          (me.H > RAM_SPEED || time < me.du || time < me.su) &&
          e.k < 4
        ) {
          // a toda velocidad — o con dash o escudo — la nave es el arma;
          // a la corbeta solo la abolla
          me.Qf(e, e.k === 2 ? 3 : 99);
          me.S = 7;
        } else if (e.k < 3) {
          // metal contra metal: el caza estalla y tú pierdes UN casco —
          // morir de un toque contra algo tan pequeño no era justo, y las
          // emboscadas lo convertían en ejecución. El kamikaze que te
          // alcanza NO paga: ganó él
          if (e.Kz) {
            e.X = true;
            me.bm(e);
          } else me.Qf(e, 99);
          me.hy(time);
        } else {
          if (e.k < 5 || e.k > 7) e.X = true;
          me.bm(e);
          me.hy(time);
        }
      }
    }

    // disparos enemigos — el escudo activo los deshace contra la burbuja
    let shieldOn = time < me.su;
    for (let s of me.q) {
      s.x += s.A * dt;
      s.y += s.C * dt;
      s.z += s.B * dt;
      s.N -= dt;
      // muerto el que disparó, su disparo se apaga en el aire: nada que
      // vuele hacia ti sin dueño
      if (s.ow && s.ow.X) {
        s.X = true;
        me.XB(s, 0.32);
        continue;
      }
      let d = D3(P, s);
      if (shieldOn && d < SHIELD_R + (s.h ? 40 : 0)) {
        s.X = true;
        me.ht = 0.3;
        me.XB(s, 0.32);
        continue;
      }
      if (d < (s.h ? 60 : 22)) {
        s.X = true;
        me.Rv = s.ow; // quien te pegó: derribarlo es REVANCHA
        me.hy(time);
      } else if (d < (s.Md ?? 1e9)) s.Md = d;
      // el ROCE: pasó cerca sin tocarte — paga y sube el combo
      else if (s.Md < 90 && !s.Nm) {
        s.Nm = 1;
        me.ad(50, s, 'CLOSE ');
        Sfx.O(1200, 0.15, TRI, 0.05, 300);
        me.Sl = MAX(me.Sl, 0.3); // un respiro de tiempo bala
      }
      if (!s.X) {
        for (let q of me.D) {
          if ((q.k === 4 || q.L) && !q.X && D3(q, s) < (q.k === 6 ? 90 : 50)) {
            s.X = true;
            q.M--;
            if (q.M <= 0) {
              q.X = true;
              me.bm(q);
              me.sy(q.x, q.y, q.z, 5);
              if (q.k === 4) me.W('WINGMAN DOWN.');
            } else me.XB(s, 0.32, { L: 1 });
            break;
          }
        }
      }
      if (s.sd && !s.X) {
        for (let q of me.D) {
          if (q.k < 3 && !q.X && D3(q, s) < 60) {
            s.X = true;
            me.Qf(q, 1);
            break;
          }
        }
      }
    }

    // tus disparos contra el sector
    for (let b of me.bl) {
      let ate = false;
      for (let bb of [me.G, me.I]) {
        if (bb && !bb.d && me.Zu(bb, b)) {
          ate = true;
          break;
        }
      }
      if (ate) continue;
      for (let e of me.D) {
        if (e.X || e.k === 7 || e.k === 4 || e.L) continue;
        let d = D3(b, e);
        if (d < e.r + 10) {
          b.X = true;
          me.Qf(e, 1, b.x, b.y, b.z);
          // derribo con TUS balas desde más de 2400: tiro largo
          if (e.X && e.k < 3 && !b.L && D3(e, me.o) > 2400) me.ad(100, e, 'LONG SHOT ');
          break;
        }
      }
    }

    // los fragmentos vuelan y se apagan
    for (let s of me.sz) {
      s.x += s.A * dt;
      s.y += s.C * dt;
      s.z += s.B * dt;
      s.N -= dt;
    }
    me.sz = me.sz.filter((s) => s.N > 0);

    for (let bm of me.w) bm.t += dt;
    me.D = me.D.filter((e) => !e.X);
    me.q = me.q.filter((s) => !s.X && s.N > 0);
    me.w = me.w.filter((b) => b.t < 0.5);
  }

  // Un disparo tuyo contra el destructor: pega en un punto débil, o el casco
  // se lo traga con una chispa. Devuelve true si el disparo se consumió.
  Zu(boss, b, me = this) {
    for (let pt of boss.j) {
      if (pt.M <= 0) continue;
      let [wx, wy, wz] = me.V(boss, pt.ox, pt.oy, pt.oz);
      if (HYP(b.x - wx, b.y - wy, b.z - wz) < SD_PART_R[pt.Z]) {
        b.X = true;
        if (me.bo(boss, pt)) me.bp(boss, pt, 1);
        else me.XB(b, 0.35);
        return true;
      }
    }
    if (me.ib(boss, b.x, b.y, b.z, 0)) {
      b.X = true;
      me.XB(b, 0.38);
      return true;
    }
    return false;
  }

  Qf(e, n) {
    let [me] = [this];
    e.M -= n;
    e.g = 0.08;
    if (e.M > 0) {
      me.XB(e, 0.3);
      return;
    }
    e.X = true;
    if (e.L) {
      me.bm(e);
      me.sy(e.x, e.y, e.z, 4);
      Sfx.Qk();
      return;
    }
    // la última nave de la emboscada paga SIEMPRE: así se aprende que
    // matarlas es lo que da los poderes
    if (e.wv) {
      e.wv = 0;
      if (--me.wvN <= 0) {
        me.W('WAVE CLEAR.');
        me.ad(100);
      }
    }
    me.bm(e);
    me.sy(e.x, e.y, e.z, 6);
    // una mina o un kamikaze derribados revientan en cadena: lo que esté
    // cerca cae con ellos — en un enjambre, uno bien puesto limpia el cielo
    if (e.k === 9 || e.Kz) {
      let br = e.Kz ? 200 : 260;
      me.XB(e, 0, { h: true, r: br });
      for (let q of me.D) if (!q.X && q.k !== 7 && q.k !== 4 && !q.L && D3(q, e) < br) me.Qf(q, 99);
    }
    me.ad(e.k > 9 ? 1000 : e.k === 6 ? 120 : e.k === 5 ? (e.Qm ? 80 : 40) : e.k === 8 ? 15 : e.k === 2 ? 150 : e.k === 1 ? 60 : 25, e);
    if (e.k > 9) {
      // la dorada: misiles y OVERDRIVE llenos
      me.am = MISSILE_MAX;
      me.Od = 100;
    }
    if (e.k < 3) {
      me.Kc++;
      me.Hs = 0.05;
      if (e === me.Rv) {
        me.Rv = 0;
        me.ad(200, e, 'REVENGE ');
      }
      if (++me.Cg === 6 + 2 * me.Se) {
        me.T += 1000 * me.Se;
        me.W('SECTOR CHALLENGE +' + 1000 * me.Se);
      }
      // la racha: derribos a menos de 2 s uno de otro
      me.Ks = me.b - me.Kt < 2 ? me.Ks + 1 : 1;
      me.Kt = me.b;
      if (me.Ks > 1) {
        me.T += 100 * me.Ks;
        me.W(['DOUBLE KILL.', 'TRIPLE KILL.', 'RAMPAGE.'][MIN(3, me.Ks) - 2] + ' +' + 100 * me.Ks);
      }
    }
    Sfx.Qk();
    if (e.k === 8 && e.r > 20) {
      for (let i = 0; i < 2; i++) {
        me.D.push({
          k: 8, x: e.x, y: e.y, z: e.z, r: 18, M: 1, t: 0, E: 0, Zx: ROCK_POOL[FLR(RND() * 4)],
          Zw: RH() * 3,
          A: RH() * 120,
          C: RH() * 80,
          B: RH() * 120,
        });
      }
    }
  }

  sa(e, sp, big, me = this) {
    let Po = me.o;
    // el fogonazo marca de dónde sale — se ve quién te dispara
    me.XB(e, 0.28, { Q1: true });
    // apunta a donde VAS a estar, no a donde estás
    let t = D3(Po, e) / sp;
    let f = me.fw();
    let tx = Po.x + f.x * me.H * t * 0.7;
    let ty = Po.y + f.y * me.H * t * 0.7;
    let tz = Po.z + f.z * me.H * t * 0.7;
    let dx = tx - e.x;
    let dy = ty - e.y;
    let dz = tz - e.z;
    let m = HYP(dx, dy, dz);
    me.q.push({
      x: e.x,
      y: e.y - (e.k === 5 ? 26 : 0),
      z: e.z,
      A: (dx / m) * sp,
      C: (dy / m) * sp,
      B: (dz / m) * sp,
      N: big ? 12 : 6,
      h: big,
      ow: e,
    });
  }

  bm(e) {
    this.XB(e, 0, { L: e.k === 4 || e.L });
  }

  // una explosión, un destello o un fogonazo en el punto p
  XB(p, t, o) {
    this.w.push({ wx: p.x, wy: p.y, wz: p.z, t, ...o });
  }

  ux(dt) {
    for (let b of this.bl) {
      b.x += b.A * dt;
      b.y += b.C * dt;
      b.z += b.B * dt;
      b.N -= dt;
    }
    this.bl = this.bl.filter((b) => !b.X && b.N > 0);
  }

  um(dt) {
    let [me] = [this];
    for (let m of me.ms) {
      let t = m.Qd;
      if (t && !t.X) {
        // corrige el rumbo hacia el blanco — contra el destructor, hacia su punto débil
        let [tx, ty, tz] = [t.x, t.y, t.z];
        let hitR = t.r + 16;
        if (m.Qc && m.Qc.M > 0) {
          [tx, ty, tz] = me.V(t, m.Qc.ox, m.Qc.oy, m.Qc.oz);
          hitR = SD_PART_R[m.Qc.Z];
        }
        let dx = tx - m.x;
        let dy = ty - m.y;
        let dz = tz - m.z;
        let d = HYP(dx, dy, dz);
        let k = MIN(1, MISSILE_TURN * dt);
        m.A += ((dx / d) * MISSILE_SPEED - m.A) * k;
        m.C += ((dy / d) * MISSILE_SPEED - m.C) * k;
        m.B += ((dz / d) * MISSILE_SPEED - m.B) * k;
        if (d < hitR) me.dn(m);
      }
      for (let bb of [me.G, me.I]) {
        if (!m.X && bb && !bb.d && me.ib(bb, m.x, m.y, m.z, 0)) me.dn(m);
      }
      m.Y.push([m.x, m.y, m.z]);
      if (m.Y.length > 14) m.Y.shift();
      m.x += m.A * dt;
      m.y += m.C * dt;
      m.z += m.B * dt;
      m.N -= dt;
    }
    me.ms = me.ms.filter((m) => !m.X && m.N > 0);
  }

  // El misil estalla: golpe fuerte al blanco y a todo lo que esté cerca
  dn(m, me = this) {
    m.X = true;
    me.XB(m, 0, { h: true, r: MISSILE_SPLASH });
    me.S = MAX(me.S, 5);
    Sfx.Qk();
    for (let boss of [me.G, me.I]) {
      if (!boss) continue;
      for (let pt of boss.j) {
        let [wx, wy, wz] = me.V(boss, pt.ox, pt.oy, pt.oz);
        if (pt === m.Qc || HYP(m.x - wx, m.y - wy, m.z - wz) < MISSILE_SPLASH) {
          me.bp(boss, pt, pt === m.Qc ? MISSILE_DMG - 1 : 1);
        }
      }
    }
    for (let e of me.D) {
      if (e.X || e.k === 7 || e.k === 4 || e.L) continue;
      let d = D3(m, e);
      if (e === m.Qd || d < MISSILE_SPLASH + e.r) me.Qf(e, e === m.Qd ? MISSILE_DMG : 2);
    }
  }

  // La cámara hereda la base de la nave con un pelo de retraso — incluida la
  // inclinación, así la pantalla siempre coincide con el stick
  uc(dt, me = this) {
    // en plena maniobra la cámara va PEGADA a la nave: si se arrastrara,
    // el tonel terminaría y la pantalla seguiría asentándose un rato
    let k = me.Jw ? 1 : MIN(1, 8 * dt);
    [me.Zp, me.Zo, me.Zq] = orthoBasis(vmix(me.Zp, 1 - k, me.F, k), vmix(me.Zo, 1 - k, me.U, k));
    if (me.S > 0) me.S = MAX(0, me.S - 34 * dt);
  }

  // --- proyección mundo → pantalla ---
  Jb(me = this) {
    let Po = me.o;
    let F = me.Zp;
    let U = me.Zo;
    let back = CAM_BACK + MAX(0, me.H - me.cu) * 0.09; // con nitro la cámara se queda atrás
    return {
      x: Po.x - F.x * back + U.x * CAM_UP,
      y: Po.y - F.y * back + U.y * CAM_UP,
      z: Po.z - F.z * back + U.z * CAM_UP,
      F,
      U,
      R: me.Zq,
    };
  }

  czOf(wx, wy, wz) {
    let cm = this.cm;
    return (wx - cm.x) * cm.F.x + (wy - cm.y) * cm.F.y + (wz - cm.z) * cm.F.z;
  }

  Q(wx, wy, wz, me = this) {
    let cm = me.cm;
    let d = { x: wx - cm.x, y: wy - cm.y, z: wz - cm.z };
    let cz = vdot(d, cm.F);
    if (cz < NEAR) return null;
    let shx = me.S ? RH() * me.S : 0;
    let shy = me.S ? RH() * me.S : 0;
    return [CX + (vdot(d, cm.R) * FOCAL) / cz + shx, CY - (vdot(d, cm.U) * FOCAL) / cz + shy, cz];
  }

  // Una dirección del cielo (infinitamente lejos): solo gira con la cámara
  // proyecta un punto dado como {x, y, z} o como [x, y, z]
  p(v) {
    return v.x === undefined ? this.Q(v[0], v[1], v[2]) : this.Q(v.x, v.y, v.z);
  }

  pd(v) {
    let cm = this.cm;
    let cz = vdot(v, cm.F);
    if (cz < 0.08) return null;
    return [CX + (vdot(v, cm.R) * FOCAL) / cz, CY - (vdot(v, cm.U) * FOCAL) / cz];
  }

  J(a, b, me = this) {
    let g = me.gfx;
    let pa = me.p(a);
    let pb = me.p(b);
    if (!pa && !pb) return;
    if (!pa || !pb) {
      let [va, vb] = pa ? [a, b] : [b, a];
      let cza = me.czOf(va[0], va[1], va[2]);
      let czb = me.czOf(vb[0], vb[1], vb[2]);
      let t = (cza - NEAR - 0.01) / (cza - czb);
      let mx = va[0] + (vb[0] - va[0]) * t;
      let my = va[1] + (vb[1] - va[1]) * t;
      let mz = va[2] + (vb[2] - va[2]) * t;
      pa = me.p(va);
      pb = me.Q(mx, my, mz);
      if (!pa || !pb) return;
    }
    lnp(pa, pb);
  }

  fg(dist) {
    return CLP(1.25 - dist / 2600, 0, 1);
  }

  // Modelo 3D anclado al mundo, con yaw propio y roll/pitch opcionales
  dm(model, e, scale, color, baseAlpha, extraRoll, pitch) {
    let [verts, edges] = model;
    let cyw = COS(e.E || 0);
    let syw = SIN(e.E || 0);
    let cr = COS(extraRoll || 0);
    let sr = SIN(extraRoll || 0);
    let cp = COS(pitch || 0);
    let sp = SIN(pitch || 0);
    let pts = [];
    for (let [mx0, my0, mz0] of verts) {
      let mx = mx0 * cr - my0 * sr;
      let my = mx0 * sr + my0 * cr;
      let mz = mz0;
      let my2 = my * cp - mz * sp;
      mz = my * sp + mz * cp;
      my = my2;
      let wx = e.x + (mx * cyw + mz * syw) * scale;
      let wy = e.y + my * scale;
      let wz = e.z + (-mx * syw + mz * cyw) * scale;
      pts.push([wx, wy, wz]);
    }
    this.sg(pts, edges, color, baseAlpha);
  }

  // dos pasadas: un halo ancho y tenue bajo la línea viva — luz, no alambre
  sg(pts, edges, color, alpha) {
    LS(4.5, color, alpha * 0.18);
    for (let [a, b] of edges) this.J(pts[a], pts[b]);
    LS(1.5, color, alpha);
    for (let [a, b] of edges) this.J(pts[a], pts[b]);
  }

  Ja(time, me = this) {
    let g = me.gfx;
    g.clear();
    me.cameras.main.setBackgroundColor(0x070709);
    let cm = me.Jb();
    me.cm = cm; // la cámara del frame: pj/pd/wl la leen de aquí

    me.dk(time);
    me.dz(time);
    fr(0, 0, W, H, [0, 0x1f3a4a, 0x4a1f2a][(me.Se - 1) % 3], 0.08);
    for (let o of me.Pq) {
      let p = o.Wp && o.Tp < 1 && me.p(o.Wp);
      p ? o.setPosition(p[0], p[1] - o.Tp * 50).setAlpha(1 - o.Tp) : o.setAlpha(0);
    }
    me.de2();
    me.Jd(time);
    me.dd();

    me.Qq.setVisible(false);
    // la escena de la salva: el sector entero se apaga y solo quedan el
    // destructor, sus cohetes, tus disparos y tú
    let cineB2 = (me.G && me.G.f && me.G) || (me.I && me.I.f && me.I);
    let cine = cineB2 ? cineB2.Q8 || 0 : 0;
    for (let e of me.D) {
      if (cine > 0 && (e.k === 7 || e.k === 3)) continue;
      me.de(e, time);
    }
    if (cine > 0) {
      fr(0, 0, W, H, 0x000000, 0.85 * cine);
      for (let e of me.D) {
        if (e.k === 7 || e.k === 3) me.de(e, time);
      }
    }

    // cañón: trazos brillantes — blanco el tuyo, azul el de tu equipo
    for (let b of me.bl) {
      let p1 = me.p(b);
      let p2 = me.Q(b.x - b.A * 0.03, b.y - b.C * 0.03, b.z - b.B * 0.03);
      if (!p1 || !p2) continue;
      LS(2, b.L ? BLU : INK_HI, 0.9);
      lnp(p1, p2);
    }

    // misiles: un proyectil de verdad, con aletas, cabeza ardiendo y estela larga
    for (let m of me.ms) {
      for (let i = 1; i < m.Y.length; i++) {
        let a = m.Y[i - 1];
        let b = m.Y[i];
        LS(1 + i * 0.3, INK_HI, (i / m.Y.length) * 0.45);
        me.J(a, b);
      }
      let F = vnorm({ x: m.A, y: m.C, z: m.B });
      let U = vnorm(vmix(WORLD_UP, 1, F, -vdot(WORLD_UP, F)));
      me.db(MISSILE_MODEL, m, F, U, 1.5, INK_HI, 1, m.N * 9);
      let p = me.Q(m.x - F.x * 20, m.y - F.y * 20, m.z - F.z * 20);
      if (p) {
        fcp(p, MAX(2.5, 1400 / p[2]), AMB, 0.9);
      }
    }

    // disparos enemigos: brasas de óxido grandes y lentas, con su estela —
    // se ven venir y se pueden esquivar
    for (let s of me.q) {
      let p = me.p(s);
      if (!p) continue;
      let q = me.Q(s.x - s.A * 0.35, s.y - s.C * 0.35, s.z - s.B * 0.35);
      let r = CLP(((s.h ? 48 : 7) * FOCAL) / p[2], s.h ? 6 : 3, s.h ? 70 : 14);
      if (q) {
        LS(r * 0.9, RUST, 0.45);
        lnp(p, q);
      }
      // núcleo BLANCO siempre: una brasa se pierde contra el resplandor del
      // disco; un núcleo ardiente no
      fcp(p, r * 1.8, RUST, 0.4);
      fcp(p, r, RUST_HI, 0.95);
      fcp(p, r * 0.45, CRM, 0.9);
    }

    // explosiones: anillos que crecen y fragmentos que vuelan
    for (let bm of me.w) {
      if (bm.t < 0) continue;
      let p = me.Q(bm.wx, bm.wy, bm.wz);
      if (!p) continue;
      let k = FOCAL / p[2];
      if (bm.Q1) {
        fcp(p, MAX(4, 30 * k), RUST_HI, (0.5 - bm.t) * 3.5);
        continue;
      }
      let r = (4 + bm.t * (bm.r ? bm.r * 2.4 : bm.h ? 260 : 150)) * k;
      if (bm.r) {
        fcp(p, r * 0.8, AMB, 0.35 * (1 - bm.t / 0.5));
      }
      skp(p, r, bm.r ? 3 : 1.5, bm.h ? INK_HI : bm.L ? BLU : RUST, 1 - bm.t / 0.5);
    }
    for (let s of me.sz) {
      let p1 = me.p(s);
      let p2 = me.Q(s.x - s.A * 0.05, s.y - s.C * 0.05, s.z - s.B * 0.05);
      if (!p1 || !p2) continue;
      LS(1, INK, s.N * 1.6);
      lnp(p1, p2);
    }

    // cerca del agujero, la pantalla entera se tiñe de acreción: no hay
    // duda de DÓNDE estás metido
    if (me.Zi > 0.02) fr(0, 0, W, H, 0xe89a5c, me.Zi * (0.1 + 0.06 * SIN(time * 0.004)));
    let G = me.Gt;
    if (G) {
      // el anillo: dos aros que respiran, en la tinta del jugador
      LS(3, INK_HI, 0.55 + 0.35 * SIN(time * 0.008));
      for (let rr of [120, 100])
        for (let i = 0; i < 20; i++) {
          let at = (a) => [G.x + (G.e1.x * COS(a) + G.e2.x * SIN(a)) * rr, G.y + (G.e1.y * COS(a) + G.e2.y * SIN(a)) * rr, G.z + (G.e1.z * COS(a) + G.e2.z * SIN(a)) * rr];
          me.J(at(i * 0.314), at(i * 0.314 + 0.314));
        }
    }
    if (me.Ou > me.vt) fr(0, 0, W, H, BLU, 0.07 + 0.04 * SIN(time * 0.02));
    if (me.Gx > 1) fr(0, 0, W, H, 0xe89a5c, 0.05 + 0.04 * SIN(time * 0.01));
    if (me.Qj === 1) {
      LS(14, RUST, 0.25 + 0.2 * SIN(time * 0.01));
      GF.strokeRect(0, 0, W, H);
    }
    // los blancos fijados por B3: una caja sobre cada uno
    LS(2, RUST_HI, 0.9);
    for (let t of me.Lk) {
      let p = !t.X && me.p(t);
      if (p) GF.strokeRect(p[0] - 16, p[1] - 16, 32, 32);
    }
    me.dj(time);
    me.dv();
    me.di(time);

    // barra de carga del hipersalto, o la vida que le queda al destructor
    if ((me.G && !me.G.d) || (me.I && !me.I.d)) {
      let hp = 0;
      let max = 0;
      for (let bb of [me.G, me.I]) {
        if (!bb || bb.d) continue;
        for (let pt of bb.j) {
          if (pt.Z === 0) continue;
          hp += MAX(0, pt.M);
          max += pt.max;
        }
      }
      LS(1.5, RUST, 0.9);
      g.strokeRect(CX - 160, 30, 320, 10);
      fr(CX - 158, 32, 316 * (hp / max), 6, RUST_HI, 0.9);
    }
  }

  // Up and down must always read: a hazy floor below the sector's level
  // plane and the galaxy's band along the horizon. The camera rolls with the
  // ship, so the horizon is a line at any angle — found per pixel as the
  // screen points whose view ray is level.
  dh() {
    let cm = this.cm;
    let { R, U, F } = cm;
    let n = HYP(R.y, U.y);
    if (n < 0.02) return;
    let s = (p) => ((p[0] - CX) * R.y - (p[1] - CY) * U.y + FOCAL * F.y) / n;
    let band = (lo, hi, color, alpha) => {
      let poly = clipHalf([[0, 0], [W, 0], [W, H], [0, H]], (p) => s(p) - lo);
      if (hi !== undefined) poly = clipHalf(poly, (p) => hi - s(p));
      if (poly.length < 3) return;
      GF.fillStyle(color, alpha);
      GF.fillPoints(poly.map(([x, y]) => ({ x, y })), true);
    };
    // bajo el horizonte: el resplandor frío de la estación, tenue
    for (let i = 0; i < 10; i++) band(i * i * 7, undefined, 0x2c3a46, 0.1 - i * 0.009);
    band(-18, 18, 0x3a4452, 0.1);
    band(-6, 6, 0x5a6878, 0.1);
    band(-0.7, 0.7, INK, 0.28);
    for (let b of this.Qu) {
      let p = this.pd(skyDir(b.E, b.el));
      if (!p) continue;
      fr(p[0], p[1], b.s, b.s, INK, b.a);
    }
  }

  // Cuánto rota la pantalla respecto del "arriba" del sector: el arte del
  // cielo se dibuja derecho y se gira con esto
  kr() {
    let cm = this.cm;
    return AT2(-cm.R.y, -cm.U.y);
  }

  dk(time, me = this) {
    me.dh();
    // nebulosas: manchas apenas visibles que dan fondo al negro
    for (let [yw, el, r, col, al] of [
      [0.25, 0.5, 280, 0x4a3560, 0.06],
      [0.9, 0.14, 300, 0x33506a, 0.05],
      [4.1, 0.1, 260, 0x33506a, 0.04],
      [5.3, 0.33, 220, 0x5e4038, 0.05],
    ]) {
      let p = me.pd(skyDir(yw, el));
      if (!p) continue;
      fcp(p, r, col, al);
      fc(p[0] + r * 0.4, p[1] - r * 0.25, r * 0.6, col, al * 0.7);
    }
    // los planetas, fuera del rumbo del agujero negro (que es SOLO suyo):
    // la Tierra al sur, Saturno al suroeste y Júpiter al este, en el hueco
    // entre la Tierra y el agujero
    me.so(3.4, 0.3, 46, drawEarth);
    me.so(4.32, 0.14, 64, drawSaturn);
    me.so(1.9, 0.24, 58, drawJupiter);
    me.dl(time);
  }

  // Dibuja algo del cielo en su dirección, girado con la cámara
  so(yaw, el, r, paint) {
    let p = this.pd(skyDir(yaw, el));
    if (!p || p[0] < -3 * r || p[0] > W + 3 * r || p[1] < -3 * r || p[1] > H + 3 * r) return;
    GF.save();
    GF.translateCanvas(p[0], p[1]);
    GF.rotateCanvas(this.kr());
    paint(r);
    GF.restore();
  }

  // el agujero negro: su disco en 3D y, encima, la sombra como billete en
  // su punto del mundo, girada con la cámara
  Jd(time) {
    let t = time * 0.001;
    this.Je();
    let p = this.p(BH);
    if (!p) return;
    let r = (BH[3] * FOCAL) / p[2];
    if (p[0] < -3 * r || p[0] > W + 3 * r || p[1] < -3 * r || p[1] > H + 3 * r) return;
    GF.save();
    GF.translateCanvas(p[0], p[1]);
    GF.rotateCanvas(this.kr());
    this.bh(r, t);
    GF.restore();
  }

  // EL AGUJERO NEGRO, en pantalla: resplandor, la sombra y el anillo de
  // fotones. Cuanto más cerca, más arde todo.
  bh(r, t) {
    let q = this.Zi || 0;
    fc(0, 0, r * 3.2, 0xe8a060, 0.04 + 0.05 * q);
    fc(0, 0, r * 1.9, 0xe8a060, 0.07 + 0.08 * q);
    fc(0, 0, r, 0x000000, 1);
    sk(0, 0, r * 1.1, r * 0.16, CRM, 0.12 + 0.1 * q);
    sk(0, 0, r * 1.04, MAX(1.5, r * 0.04), 0xfff8ea, 0.7 + 0.3 * SIN(t * 3));
  }

  // el disco de acreción en 3D, en el punto del agujero y MIRÁNDOTE: su
  // normal apunta a la nave, inclinada ~48° para que se lea como un plato
  // en perspectiva, y los anillos caen hacia adentro girando — el remolino
  // que se traga todo. La DISTANCIA se siente: lejos gira lento y el trazo
  // es fino; cerca gira rápido y arde grueso
  Je(me = this) {
    let [x, y, z, RS] = BH;
    let q = me.Zi || 0;
    let P = me.o;
    let t = me.bT || 0;
    let nk = me.Jf || 0;
    let n = vnorm(vmix(vnorm({ x: P.x - x, y: P.y - y, z: P.z - z }), 1, WORLD_UP, 1.1));
    let e1 = vnorm(vcross(n, { x: 0.01, y: 1, z: 0 }));
    let e2 = vcross(n, e1);
    let at = (a, r) => [x + (e1.x * COS(a) + e2.x * SIN(a)) * r, y + (e1.y * COS(a) + e2.y * SIN(a)) * r, z + (e1.z * COS(a) + e2.z * SIN(a)) * r];
    for (let i = 0; i < 7; i++) {
      let ph = (i / 7 + t * 0.09) % 1; // 0 afuera → 1 adentro
      let k = 1.5 + 5.5 * (1 - ph);
      LS((1.5 + 2.5 * ph) * (0.4 + nk) + q * 2, [0x8a5c48, RUST, 0xe89a5c, AMB, CRM][FLR(ph * 5)], MIN(1, (0.15 + 0.6 * ph) * (1 + q) * MIN(1, (1 - ph) * 8)));
      for (let arc = 0; arc < 9; arc++) {
        let a0 = t * (3 / k) + arc * 0.698 + i;
        for (let j = 0; j < 3; j++) me.J(at(a0 + j * 0.16, k * RS), at(a0 + j * 0.16 + 0.16, k * RS));
      }
    }
  }

  // LOS BORDES se ven al acercarse: la pared del cilindro y el techo son
  // mallas ancladas al mundo que aparecen a 1800 de distancia
  de2(me = this) {
    let P = me.o;
    let hr = HYP(P.x, P.z);
    let aw = 1 - (BND_R - hr) / 1800;
    let y0 = FLR(P.y / 150) * 150;
    let on = (a, y) => [SIN(a) * BND_R, y, COS(a) * BND_R];
    if (aw > 0) {
      LS(1.5, BLU, aw * 0.55);
      let a0 = FLR(AT2(P.x, P.z) * 40) / 40;
      for (let i = -9; i <= 9; i++) {
        me.J(on(a0 + i / 40, MAX(BND_TOP, y0 - 1400)), on(a0 + i / 40, y0 + 1400));
        let yy = y0 + i * 150;
        if (yy >= BND_TOP) for (let j = -9; j < 9; j++) me.J(on(a0 + j / 40, yy), on(a0 + (j + 1) / 40, yy));
      }
    }
    let cw = 1 - (P.y - BND_TOP) / 1800;
    if (cw > 0) {
      LS(1.5, BLU, cw * 0.55);
      let x0 = FLR(P.x / 200) * 200;
      let z0 = FLR(P.z / 200) * 200;
      for (let i = -12; i <= 12; i++) {
        me.J([x0 + i * 200, BND_TOP, z0 - 2400], [x0 + i * 200, BND_TOP, z0 + 2400]);
        me.J([x0 - 2400, BND_TOP, z0 + i * 200], [x0 + 2400, BND_TOP, z0 + i * 200]);
      }
    }
  }

  // LA ESTACIÓN: la superficie de la esfera, dibujada como cuadrícula
  // local alrededor tuyo — celdas fijas del MUNDO (no te siguen), con
  // estructuras generadas por hash de celda y luces de posición. Tron abajo.
  dl(time, me = this) {
    let Po = me.o;
    // el LIMBO: el borde curvo de la esfera, que sube y baja contigo — lo
    // que dice que esto es un PLANETA de metal y no un piso con cielo
    let alt = MAX(60, surfY(Po.x, Po.z) - Po.y);
    let dhz = MIN(9500, SQ(2 * ST_R * alt));
    for (let [wd2, al2] of [[5, 0.1], [1.5, 0.5]]) {
      LS(wd2, BLD, al2);
      let prev = null;
      for (let i = 0; i <= 26; i++) {
        let a2 = (i / 26) * PI * 2;
        let lx = Po.x + SIN(a2) * dhz;
        let lz = Po.z + COS(a2) * dhz;
        let pt = [lx, surfY(lx, lz), lz];
        if (pt[1] > 8e8) {
          prev = null;
          continue;
        }
        if (prev) me.J(prev, pt);
        prev = pt;
      }
    }
    let cs = CELL;
    let cx0 = FLR(Po.x / cs);
    let cz0 = FLR(Po.z / cs);
    for (let i = -4; i <= 4; i++) {
      for (let j = -4; j <= 4; j++) {
        let x0 = (cx0 + i) * cs;
        let z0 = (cz0 + j) * cs;
        let y00 = surfY(x0, z0);
        if (y00 > 9e8) continue;
        let al = MAX(0, 1 - HYP(x0 - Po.x, z0 - Po.z) / 3200) * 0.5 + 0.06;
        // los dos bordes de la celda: compartidos, forman la malla completa
        LS(1.5, BLD, al);
        me.J([x0, y00, z0], [x0 + cs, surfY(x0 + cs, z0), z0]);
        me.J([x0, y00, z0], [x0, surfY(x0, z0 + cs), z0 + cs]);
        // el hash decide qué celda lleva estructura, y de qué altura
        let hsh = HSH(x0, z0);
        if (hsh >= 42 && hsh < 48) {
          // un MURO bajo cruzando la celda: sáltalo o rodéalo
          let zm = z0 + cs / 2;
          let hW = 120;
          LS(1.5, GRY, al * 1.3);
          let yA = surfY(x0 + 40, zm);
          let yB = surfY(x0 + cs - 40, zm);
          me.J([x0 + 40, yA, zm], [x0 + 40, yA - hW, zm]);
          me.J([x0 + cs - 40, yB, zm], [x0 + cs - 40, yB - hW, zm]);
          me.J([x0 + 40, yA - hW, zm], [x0 + cs - 40, yB - hW, zm]);
        }
        if (hsh >= 22 && hsh < 30) {
          // un ARCO: dos pilones y un travesaño — pásale por debajo
          let zm = z0 + cs / 2;
          let yA = surfY(x0 + 90, zm);
          let yB = surfY(x0 + cs - 90, zm);
          let hA = 230 + (hsh % 4) * 40;
          LS(1.5, GRY, al * 1.4);
          me.J([x0 + 90, yA, zm], [x0 + 90, yA - hA, zm]);
          me.J([x0 + cs - 90, yB, zm], [x0 + cs - 90, yB - hA, zm]);
          me.J([x0 + 90, yA - hA, zm], [x0 + cs - 90, yB - hA, zm]);
          me.J([x0 + 90, yA - hA + 26, zm], [x0 + cs - 90, yB - hA + 26, zm]);
          // la guía azul en el suelo: por AQUÍ se pasa
          LS(2, BLD, al * 1.6);
          me.J([x0 + 110, yA - 6, zm], [x0 + cs - 110, yB - 6, zm]);
        }
        if (hsh < 22) {
          let hh = (hsh < 8 ? 300 : 90) + (hsh % 5) * 70;
          let bx0 = x0 + cs * 0.3;
          let bz0 = z0 + cs * 0.3;
          let bw2 = cs * 0.4;
          let yb = surfY(bx0 + bw2 / 2, bz0 + bw2 / 2);
          LS(1.5, GRY, al * 1.3);
          for (let [ox, oz] of [[0, 0], [bw2, 0], [bw2, bw2], [0, bw2]]) {
            me.J([bx0 + ox, yb, bz0 + oz], [bx0 + ox, yb - hh, bz0 + oz]);
          }
          me.J([bx0, yb - hh, bz0], [bx0 + bw2, yb - hh, bz0]);
          me.J([bx0 + bw2, yb - hh, bz0], [bx0 + bw2, yb - hh, bz0 + bw2]);
          me.J([bx0 + bw2, yb - hh, bz0 + bw2], [bx0, yb - hh, bz0 + bw2]);
          me.J([bx0, yb - hh, bz0 + bw2], [bx0, yb - hh, bz0]);
          // la torre alta lleva luz de posición
          if (hsh < 8 && FLR(time / 500 + hsh) % 3) {
            let lp = me.Q(bx0 + bw2 / 2, yb - hh - 14, bz0 + bw2 / 2);
            if (lp) fcp(lp, MAX(1.2, 700 / lp[2]), RUST_HI, al * 1.6);
          }
        }
      }
    }
  }

  dz(time) {
    for (let m of this.sn) {
      let p = this.pd(m.v);
      if (!p || p[0] < -4 || p[0] > W + 4 || p[1] < -4 || p[1] > H + 4) continue;
      let a = m.a;
      if (m.tw) a *= 0.6 + 0.4 * SIN(time * 0.001 * m.tw + m.ph);
      fr(p[0], p[1], m.s, m.s, INK, a);
      if (m.s === 3) {
        // las grandes destellan en cruz
        LS(1, INK, a * 0.5);
        PL(p[0] - 4, p[1] + 1, p[0] + 6, p[1] + 1);
        PL(p[0] + 1, p[1] - 4, p[0] + 1, p[1] + 6);
      }
    }
  }

  // El polvo convierte tu velocidad en estelas: se SIENTE volar
  dd(me = this) {
    let Po = me.o;
    let L = 560;
    let f = me.fw();
    let trail = 0.016 + (me.H / TURBO_SPEED) * 0.065;
    for (let m of me.Qt) {
      let wx = Po.x + WRP(m.x - Po.x, -L / 2, L / 2);
      let wy = Po.y + WRP(m.y - Po.y, -L / 2, L / 2);
      let wz = Po.z + WRP(m.z - Po.z, -L / 2, L / 2);
      let p1 = me.Q(wx, wy, wz);
      let p2 = me.Q(wx + f.x * me.H * trail, wy + f.y * me.H * trail, wz + f.z * me.H * trail);
      if (!p1 || !p2) continue;
      let dist = HYP(wx - Po.x, wy - Po.y, wz - Po.z);
      let a = CLP(1 - dist / 420, 0, 1) * 0.5 * (me.H / TURBO_SPEED + 0.3);
      if (a <= 0.02) continue;
      LS(1, INK, a);
      lnp(p1, p2);
    }
  }

  de(e, time, me = this) {
    let dist = D3(e, me.o);
    // la estela de lo que se mueve: se ve de dónde viene y hacia dónde va —
    // en la tinta de SU bando: nada aliado deja óxido
    if (e.Y && dist < 2200) {
      let n = e.Y.length;
      for (let i = 1; i < n; i++) {
        LS(e.k === 3 ? 3 : 2, e.k === 4 || e.L ? BLU : e.k > 9 ? AMB : RUST_HI, (i / n) * 0.5);
        me.J(e.Y[i - 1], i === n - 1 ? [e.x, e.y, e.z] : e.Y[i]);
      }
    }
    // el rayo del francotirador: aviso que engorda, y el destello del tiro
    if (e.Sn && e.Am && (e.P < 1.6 || e.Bf > 0)) {
      let v = vnorm({ x: e.Am.x - e.x, y: e.Am.y - e.y, z: e.Am.z - e.z });
      LS(e.Bf > 0 ? 5 : 1 + (1.6 - e.P) * 1.5, e.Bf > 0 ? INK_HI : RUST_HI, e.Bf > 0 ? 1 : 0.3 + (1.6 - e.P) * 0.4);
      me.J([e.x, e.y, e.z], [e.x + v.x * 3400, e.y + v.y * 3400, e.z + v.z * 3400]);
    }
    let p = me.p(e);
    if (!p) return;
    let a = me.fg(dist);
    // el kamikaze late en rojo: se ve venir
    if (e.Kz) skp(p, MAX(8, (60 * FOCAL) / p[2]) * (1 + 0.2 * SIN(e.t * 14)), 2, RUST_HI, 0.8);
    if (e.k === 9) {
      // la mina: un rombo cuyo núcleo parpadea más rápido si estás cerca
      let r = MAX(4, (34 * FOCAL) / p[2]);
      LS(2, RUST_HI, MAX(a, 0.4));
      PL(p[0], p[1] - r, p[0] + r, p[1], p[0], p[1] + r, p[0] - r, p[1], p[0], p[1] - r);
      if (SIN(e.t * (dist < 500 ? 30 : 8)) > 0) fcp(p, r * 0.45, RUST_HI, 0.9);
      return;
    }

    if (e.k === 3) {
      let F = vnorm({ x: e.A, y: e.C, z: e.B });
      let U = vnorm(vmix(WORLD_UP, 1, F, -vdot(WORLD_UP, F)));
      me.db(MISSILE_MODEL, e, F, U, 1.6, e.g > 0 ? INK_HI : RUST_HI, 1, e.t * 8);
      fcp(p, MAX(3, (16 * FOCAL) / p[2]), RUST_HI, 0.5 + 0.4 * SIN(e.t * 20));
      return;
    }

    // el destructor no se apaga con la niebla: es enorme y tiene que verse
    // desde lejos. Escondido (antes del flash de entrada) no se dibuja.
    if (e.k === 7) {
      if (!e.d) me.dr(e, MAX(a, 0.6), e.g > 0);
      return;
    }

    if (a <= 0.03) {
      if ((e.k === 1 || e.k === 2 || e.k === 5) && !e.L && dist < 3200) {
        fr(p[0], p[1], 2.5, 2.5, RUST_HI, 0.6);
      }
      return;
    }

    // el óxido es solo para lo que te ataca; una roca es paisaje que golpea
    let flash = e.g > 0;
    let color = flash
      ? INK_HI
      : e.k === 4 || e.L ? BLU : e.k === 8 ? GRY : e.k > 9 ? AMB : e.Et ? RUST_HI : RUST;
    if (e.k === 8 && !flash) a *= 0.7;

    let model =
      e.k === 5 ? (e.Qm ? TURRET_MODEL : SENTRY_MODEL)
      : e.k === 1 || e.k === 4 || e.k > 9 ? SHIP_MODEL : e.k === 2 ? GUN_MODEL
      : e.k === 6 ? WALK_MODEL
      : e.Zx;
    let scale = e.k === 8 ? e.r / 16 : e.k === 5 ? 1.6 : e.k === 1 ? 2.2 : e.k === 4 ? 2 : e.k === 2 ? 3 : e.k === 6 ? 1 : 2.4;
    let rot = e.k === 8 ? e.t * e.Zw : e.Qo || 0;
    me.dm(model, e, scale, color, a, rot);

    if (e.k === 6) {
      // las patas CAMINAN: dos pares alternando, con rodilla y pie que se
      // levanta — la superficie tiene vida propia
      let cy2 = COS(e.E);
      let sy3 = SIN(e.E);
      LS(1.5, e.L ? BLU : RUST, a);
      for (let i = 0; i < 4; i++) {
        let hx = i < 2 ? -26 : 26;
        let hz = i % 2 ? 22 : -22;
        let ph = e.t * 5 + (i === 0 || i === 3 ? 0 : PI);
        let stz = SIN(ph) * 34;
        let wxh = e.x + (hx * cy2 + hz * sy3) * 1.1;
        let wzh = e.z + (-hx * sy3 + hz * cy2) * 1.1;
        let hipY = e.y + 31; // cadera en el piso del cuerpo
        let wxf = e.x + (hx * 1.7 * cy2 + (hz + stz) * sy3) * 1.1;
        let wzf = e.z + (-hx * 1.7 * sy3 + (hz + stz) * cy2) * 1.1;
        let fy = surfY(wxf, wzf) - MAX(0, SIN(ph + PI / 2)) * 16;
        let kx = (wxh + wxf) / 2;
        let kz = (wzh + wzf) / 2;
        let ky = (hipY + fy) / 2 - 18;
        // rodilla hacia ATRÁS, como los de Star Wars
        me.J([wxh, hipY, wzh], [kx - sy3 * 34, ky, kz - cy2 * 34]);
        me.J([kx - sy3 * 34, ky, kz - cy2 * 34], [wxf, fy, wzf]);
      }
      let eye = me.Q(e.x + SIN(e.E) * 64, e.y, e.z + COS(e.E) * 64);
      if (eye) fcp(eye, MAX(1.5, 700 / eye[2]), e.L ? BLU : RUST_HI, a * (0.6 + 0.4 * SIN(e.t * 5)));
    }
    if (e.k < 3) {
      // el ojo de brasa en la nariz: se lee quién te está mirando
      let nr = e.k === 2 ? 200 : 50;
      let nose = me.Q(e.x + SIN(e.E) * nr, e.y - 4, e.z + COS(e.E) * nr);
      if (nose) {
        fcp(nose, MAX(1.5, 600 / nose[2]), RUST_HI, a * (0.6 + 0.4 * SIN(e.t * 6)));
      }
    }
    if (e.k === 5) {
      // el ojo late y su anillo de vigilancia respira — en la tinta de SU
      // bando; el anillo de amenaza es solo de las enemigas
      let pulse = 0.5 + 0.5 * SIN(e.t * 3);
      GF.fillStyle(e.L ? BLU : RUST_HI, a * (0.6 + 0.4 * pulse));
      let eye = me.Q(e.x, e.y - 20, e.z);
      if (eye) GF.fillCircle(eye[0], eye[1], MAX(3, 1100 / p[2]));
      if (!e.L) skp(p, (70 + pulse * 10) * (FOCAL / p[2]), 1.5, RUST, a * (0.25 + 0.3 * pulse));
    }
  }

  dr(b, a, flash, me = this) {
    me.dm(DESTROYER_MODEL, b, SD_SCALE, flash ? INK_HI : RUST, a);
    // luces de posición parpadeando por el casco: un objeto VIVO, no un plano
    [[0, -6, SD_NOSE], [-SD_HALF_W, -4, SD_REAR], [SD_HALF_W, -4, SD_REAR], [-130, -168, -340], [130, -168, -340], [0, -48, 80]].forEach(
      ([lx, ly, lz], i) => {
        if (FLR(b.t * 1.6 + i * 0.7) % 3 === 0) return;
        let [wx, wy, wz] = me.V(b, lx, ly, lz);
        let lp = me.Q(wx, wy, wz);
        if (!lp) return;
        fcp(lp, MAX(1.5, 1100 / lp[2]), i < 3 ? RUST_HI : BLU, a * 0.9);
      }
    );
    // tres motores encendidos en la popa
    for (let ox of [-130, 0, 130]) {
      let [wx, wy, wz] = me.V(b, ox, 18, SD_REAR - 6);
      let p = me.Q(wx, wy, wz);
      if (!p) continue;
      let r = (34 * SD_SCALE * FOCAL) / p[2];
      fcp(p, r * 1.6, AMB, 0.25);
      fcp(p, r * 0.7, CRM, 0.85);
    }
    let shielded = b.j.some((q) => q.Z === 1 && q.M > 0);
    let aimed = me.ba(b, me.F);
    for (let pt of b.j) {
      if (pt.M <= 0) continue;
      let [wx, wy, wz] = me.V(b, pt.ox, pt.oy, pt.oz);
      let p = me.Q(wx, wy, wz);
      if (!p) continue;
      let k = (SD_SCALE * FOCAL) / p[2];
      let hot = pt.g > 0 ? INK_HI : RUST_HI;
      // los puntos débiles abiertos llevan mira: ahí es donde se le pega
      if (me.bo(b, pt)) {
        let main = pt.Z !== 0;
        let r = MAX(main ? 20 : 16, SD_PART_R[pt.Z] * (FOCAL / p[2]) * 0.8);
        let c = r * 0.4;
        LS(main ? 2 : 2, main ? INK_HI : RUST_HI, main ? 0.6 + 0.4 * SIN(b.t * 6) : 0.7);
        for (let [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
          PL(p[0] + sx * r, p[1] + sy * (r - c), p[0] + sx * r, p[1] + sy * r, p[0] + sx * (r - c), p[1] + sy * r);
        }
        // la que tienes en la mira muestra cuánto le queda
        if (pt === aimed) {
          GF.fillStyle(INK_HI, 0.9);
          for (let i = 0; i < pt.M; i++) GF.fillRect(p[0] - pt.max * 3 + i * 6, p[1] - r - 10, 4, 4);
        }
      }
      if (pt.Z === 0) {
        me.dm(SENTRY_MODEL, { x: wx, y: wy - 12 * SD_SCALE, z: wz, E: b.E }, 1.1 * SD_SCALE, pt.g > 0 ? INK_HI : RUST, a);
        fc(p[0], p[1] - 34 * k, MAX(2, 7 * k), hot, a);
      } else if (pt.Z === 1) {
        // domo de escudo: esfera en tinta, lo que protege el puente
        skp(p, 36 * k, 1.5, pt.g > 0 ? INK_HI : BLD, 0.9);
        GF.strokeEllipse(p[0], p[1], 72 * k, 26 * k);
        fcp(p, 36 * k, BLD, 0.12 + 0.08 * SIN(b.t * 4));
      } else {
        // el puente: blindado mientras haya domos; expuesto, late en brasa
        let pulse = 0.5 + 0.5 * SIN(b.t * (shielded ? 2 : 7));
        if (shielded) {
          skp(p, 90 * k, 1.5, BLD, 0.25 + 0.2 * pulse);
        } else {
          fcp(p, 30 * k, hot, 0.45 + 0.45 * pulse);
          skp(p, (50 + pulse * 20) * k, 2, RUST_HI, 0.6 * pulse);
        }
      }
    }
    // el cañón de proa cargando: el aviso para esquivar
    if (b.cg > 0) {
      let [wx, wy, wz] = me.V(b, 0, 10, SD_NOSE);
      let p = me.Q(wx, wy, wz);
      if (p) {
        let c = 1 - b.cg / 1.8;
        let k = (SD_SCALE * FOCAL) / p[2];
        fcp(p, (10 + 40 * c) * k, RUST_HI, 0.3 + 0.5 * c);
        skp(p, (60 - 40 * c) * k, 2, CRM, c);
      }
    }
  }

  // Un modelo orientado por una base cualquiera (la nave, los misiles):
  // x del modelo sobre R, -y sobre U, z sobre F; con alabeo visual opcional
  db(model, P, F, U, scale, color, alpha, bank) {
    let R = vcross(F, U);
    let cb = COS(bank || 0);
    let sb = SIN(bank || 0);
    let pts = model[0].map(([mx0, my0, mz]) => {
      let mx = (mx0 * cb - my0 * sb) * scale;
      let my = (mx0 * sb + my0 * cb) * scale;
      let s = mz * scale;
      return [
        P.x + R.x * mx - U.x * my + F.x * s,
        P.y + R.y * mx - U.y * my + F.y * s,
        P.z + R.z * mx - U.z * my + F.z * s,
      ];
    });
    this.sg(pts, model[1], color, alpha);
  }

  dj(time, me = this) {
    let Po = me.o;
    if (me.fz === 'out') return;
    if (time < me.iu && FLR(time / 95) % 2 === 0) return;
    let f = me.fw();
    // dash: la nave deja copias fantasma — mientras se ven, nada te toca
    if (time < me.du) {
      for (let i = 1; i <= 3; i++) {
        let gp = { x: Po.x - f.x * 22 * i, y: Po.y - f.y * 22 * i, z: Po.z - f.z * 22 * i };
        me.db(SHIP_MODEL, gp, me.F, me.U, 1, INK_HI, 0.4 / i, me.Ql);
      }
    }
    me.db(SHIP_MODEL, Po, me.F, me.U, 1, INK, 1, me.Ql);
    // a velocidad de embestida, la proa se enciende
    if (me.H > RAM_SPEED) {
      let np = me.Q(Po.x + f.x * 22, Po.y + f.y * 22, Po.z + f.z * 22);
      if (np) {
        let k = MIN(1, (me.H - RAM_SPEED) / 150);
        skp(np, (20 * FOCAL) / np[2], 2, INK_HI, 0.5 * k + 0.2 * SIN(time * 0.05));
        fcp(np, (20 * FOCAL) / np[2], INK_HI, 0.18 * k);
      }
    }
    // el escudo envuelve la nave; el fogonazo vive en la nariz
    let sp0 = me.p(Po);
    // el escudo ACTIVO: una esfera de energía en el azul de los domos —
    // relleno tenue, meridianos girando y arcos vivos; parpadea al morir
    if (time < me.su && sp0) {
      let left = (me.su - time) / SHIELD_MS;
      let dying = left < 0.22 && FLR(time / 90) % 2 === 0;
      let r = SHIELD_R * 0.85 * (FOCAL / sp0[2]);
      if (!dying) {
        fcp(sp0, r, BLD, 0.1);
        skp(sp0, r, 1.5, BLU, 0.85);
        skp(sp0, r * 1.1, 3.5, BLD, 0.2);
        // los meridianos: la burbuja es una esfera, no un aro
        let sp = time * 0.0021;
        LS(1, BLU, 0.4);
        GF.strokeEllipse(sp0[0], sp0[1], 2 * r * ABS(COS(sp)), 2 * r);
        GF.strokeEllipse(sp0[0], sp0[1], 2 * r, 2 * r * ABS(COS(sp * 0.8 + 1.2)));
        let spin = time * 0.004;
        LS(2.5, INK_HI, 0.9);
        for (let i = 0; i < 3; i++) {
          let a0 = spin + (i * PI * 2) / 3;
          GF.beginPath();
          GF.arc(sp0[0], sp0[1], r, a0, a0 + 0.7);
          GF.strokePath();
        }
      }
      // la onda del impacto: se VE que la burbuja se llevó el golpe
      if (me.ht > 0) {
        let u = 1 - me.ht / 0.3;
        skp(sp0, r * (1 + u * 0.55), 2.5, INK_HI, 0.9 * (1 - u));
      }
    }
    if (me.Jj > 0) {
      let mp = me.Q(Po.x + f.x * 26, Po.y + f.y * 26 - 2, Po.z + f.z * 26);
      if (mp) {
        fcp(mp, MAX(2, 500 / mp[2]), INK_HI, 0.9);
      }
    }
    // estela del motor
    let level = ABS(me.H) / TURBO_SPEED;
    if (level > 0.05) {
      LS(2, INK_HI, 0.3 + 0.5 * level * (0.6 + 0.4 * SIN(time * 0.04)));
      let tail = 20 + 26 * level;
      me.J(
        [Po.x - f.x * 14, Po.y - f.y * 14 + 1, Po.z - f.z * 14],
        [Po.x - f.x * tail, Po.y - f.y * tail + 1, Po.z - f.z * tail]
      );
    }
    // retícula: a donde apunta la nariz — y avisa si un misil tiene blanco
    let rp = me.Q(Po.x + f.x * 620, Po.y + f.y * 620, Po.z + f.z * 620);
    if (rp) {
      let locked = me.am > 0 && me.bt(f);
      skp(rp, locked ? 10 : 7, 1.5, locked ? RUST_HI : INK, 0.6);
      fr(rp[0] - 1, rp[1] - 1, 2, 2, locked ? RUST_HI : INK, 0.6);
    }
  }

  // Lo que viene hacia ti desde fuera de la pantalla se anuncia en el borde,
  // del lado por el que llega
  di(time, me = this) {
    let cm = me.cm;
    let Po = me.o;
    // las naves cercanas SIEMPRE se anuncian en el borde — aunque no se
    // estén acercando; los proyectiles, desde más lejos que antes
    let chn = 0;
    let chMax = 2;
    for (let e of me.D) {
      if (e.k > 2 || e.X) continue;
      if (chn >= chMax) break;
      let d = { x: e.x - Po.x, y: e.y - Po.y, z: e.z - Po.z };
      let dist = HYP(d.x, d.y, d.z);
      if (dist > 1100) continue;
      let p = me.p(e);
      if (p && p[0] > 30 && p[0] < W - 30 && p[1] > 30 && p[1] < H - 30) continue;
      chn++;
      let ang = AT2(-vdot(d, cm.U), vdot(d, cm.R) || 0.001);
      let ex = CX + COS(ang) * (CX - 24);
      let ey = CY + SIN(ang) * (CY - 24);
      LS(2, RUST_HI, 0.55);
      PL(ex - COS(ang + 0.5) * 11, ey - SIN(ang + 0.5) * 11, ex, ey, ex - COS(ang - 0.5) * 11, ey - SIN(ang - 0.5) * 11);
    }
    let threats = me.q.concat(me.D.filter((e) => e.k === 3));
    for (let s of threats) {
      let d = { x: Po.x - s.x, y: Po.y - s.y, z: Po.z - s.z };
      let dist = HYP(d.x, d.y, d.z);
      if (dist > 1500 || d.x * s.A + d.y * s.C + d.z * s.B <= 0) continue;
      let p = me.p(s);
      if (p && p[0] > 30 && p[0] < W - 30 && p[1] > 30 && p[1] < H - 30) continue;
      let o = { x: -d.x, y: -d.y, z: -d.z };
      let ang = AT2(-vdot(o, cm.U), vdot(o, cm.R) || 0.001);
      let ex = CX + COS(ang) * (CX - 28);
      let ey = CY + SIN(ang) * (CY - 28);
      let pulse = 0.55 + 0.45 * SIN(time * 0.02);
      LS(3, RUST_HI, pulse * (1 - dist / 1600));
      PL(ex - COS(ang + 0.6) * 16, ey - SIN(ang + 0.6) * 16, ex, ey, ex - COS(ang - 0.6) * 16, ey - SIN(ang - 0.6) * 16);
    }
  }

  // La marca de navegación: hacia la pieza que falta
  dv(me = this) {
    let cm = me.cm;
    let Po = me.o;
    let target = null;
    let label = '';
    if (me.G || me.I) {
      // no al centro del destructor: al punto débil que toca romper
      let bd = 1e9;
      for (let b of [me.G, me.I]) {
        if (!b || b.d) continue;
        for (let pt of b.j) {
          if (pt.Z === 0 || !me.bo(b, pt)) continue;
          let [x, y, z] = me.V(b, pt.ox, pt.oy, pt.oz);
          let d = HYP(x - Po.x, y - Po.y, z - Po.z);
          if (d < bd) {
            bd = d;
            target = { x, y, z };
            label = pt.Z === 1 ? 'DOME' : 'BRIDGE';
          }
        }
      }
    }

    if (!target) {
      me.Zc.setText('');
      return;
    }
    let part = target;
    let dist = D3(part, Po);
    me.Zc.setText(label + '  ' + RD(dist) + ' M');

    let p = me.p(part);
    let margin = 46;
    if (p && p[0] > margin && p[0] < W - margin && p[1] > margin && p[1] < H - margin) {
      // una MIRA, no un cuadrito: esquinas gruesas que respiran
      let r = 22 + 2 * SIN(me.b * 5);
      let c = r * 0.45;
      LS(2.5, INK_HI, 0.9);
      for (let [sx, sy2] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
        PL(p[0] + sx * r, p[1] + sy2 * (r - c), p[0] + sx * r, p[1] + sy2 * r, p[0] + sx * (r - c), p[1] + sy2 * r);
      }
      return;
    }
    let ang;
    if (p) ang = AT2(p[1] - CY, p[0] - CX);
    else {
      // detrás: la flecha apunta al lado por el que conviene girar
      let d = { x: part.x - cm.x, y: part.y - cm.y, z: part.z - cm.z };
      ang = AT2(-vdot(d, cm.U), vdot(d, cm.R) || 1);
    }
    let ex = CX + COS(ang) * (CX - 60);
    let ey = CY + SIN(ang) * (CY - 60);
    // flecha grande con halo: se ve aunque el sector esté lleno de cosas
    for (let [wd, al, sc] of [[7, 0.25, 1.3], [2.5, 0.95, 1]]) {
      LS(wd, INK_HI, al);
      let tip = [ex + COS(ang) * 20 * sc, ey + SIN(ang) * 20 * sc];
      PL(...tip, ex + COS(ang + 2.5) * 14 * sc, ey + SIN(ang + 2.5) * 14 * sc, ex + COS(ang - 2.5) * 14 * sc, ey + SIN(ang - 2.5) * 14 * sc, ...tip);
    }
  }

  uh(me = this) {
    me.Zk.setText('SPD ' + String(ABS(RD(me.H))).padStart(3, '0'));
    // dónde quedan los bordes: altura sobre la estación contra el techo, y
    // cuánto falta para la pared
    let P = me.o;
    me.Zl.setText('ALT ' + RD(1800 - P.y) + ' / ' + (1800 - BND_TOP) + '\nEDGE ' + RD(BND_R - HYP(P.x, P.z)));
    me.Sv += CLP((me.T - me.Sv) * 0.2, 1, 1e9) * (me.Sv < me.T);
    me.Q4.setText(String(RD(me.Sv)).padStart(6, '0') + (me.mu > 1 ? '  x' + me.mu : ''));
    // el combo se enfría: lo que le queda, bajo el puntaje
    if (me.mu > 1) fr(W - 12 - 27 * me.mt, 30, 27 * me.mt, 3, INK_HI, 0.6);
    me.Zh.setText('HULL ' + '>'.repeat(me.Qj) + '.'.repeat(HULL_MAX - me.Qj));
    me.Q9.setText('MSL ' + '^'.repeat(me.am) + '.'.repeat(MISSILE_MAX - me.am));
    let mm = FLR(me.b / 60);
    me.Zg.setText('S' + me.Se + '  T ' + mm + ':' + String(FLR(me.b % 60)).padStart(2, '0'));
    // el bloque de recursos, junto a las vidas: DASH y SHIELD como barras
    // con nombre — llena = lista; el escudo va en SU azul
    let g = me.gfx;
    LS(1, INK, 0.5);
    g.strokeRect(12, H - 56, 118, 8);
    fr(13, H - 55, 116 * (me.u / BOOST_MAX), 6, INK_HI, 0.75);
    let now = me.vt;
    let shReady = now >= me.sw ? 1 : 1 - (me.sw - now) / (SHIELD_MS + SHIELD_COOLDOWN_MS);
    LS(1, INK, 0.5);
    g.strokeRect(12, H - 70, 118, 8);
    fr(13, H - 69, 116 * MAX(0, shReady), 6, BLU, shReady >= 1 ? 0.9 : 0.35);
    // OVERDRIVE: se carga peleando; llena, late — y encendida, se vacía
    let on = me.Ou > now;
    LS(1, INK, 0.5);
    g.strokeRect(12, H - 84, 118, 8);
    fr(13, H - 83, 116 * (on ? (me.Ou - now) / 6000 : me.Od / 100), 6, on || me.Od >= 100 ? BLU : INK_HI, me.Od >= 100 ? 0.6 + 0.4 * SIN(me.b * 10) : 0.7);
    // el próximo misil, recargándose bajo su contador
    if (me.am < MISSILE_MAX) {
      LS(1, INK, 0.4);
      g.strokeRect(169, H - 8, 118, 4);
      fr(170, H - 7, 116 * (me.ar / MISSILE_REGEN), 2, INK_HI, 0.7);
    }
  }
}

// --------------------------------------------------------------------------
class Over extends PS {

  init(data) {
    this.T = data.T || 0;
    this.Sd = data.Sd || [0, 1, 0, 1];
  }

  create() {
    let [me] = [this];
    let T = me.T;
    let [k, c, s, se] = me.Sd;
    Music.on = false;
    // la partida, en números — y un rango para querer otra
    TX(me, CX, CY - 130, 'RANK ' + (T >= 20000 ? 'S' : T >= 10000 ? 'A' : T >= 4000 ? 'B' : 'C'), 20, 0, 0.5);
    TX(me, CX, CY + 36, 'SHIPS DOWNED  ' + k + '\nBEST COMBO  x' + c + '\nTIME  ' + FLR(s / 60) + ':' + String(s % 60).padStart(2, '0') + '\nSECTOR  ' + se, 13, DIM_CSS, 0.5)
      .setOrigin(0.5, 0)
      .setAlign('center')
      .setLineSpacing(6);
    me.Qx = false;
    me.Qs = false;
    me.Q6 = false;
    Sfx.Z5();

    TX(me, CX, CY - 70, 'GAME OVER', 32, 0, 0.5);
    TX(me, CX, CY + 4, 'SCORE  ' + String(me.T).padStart(6, '0'), 16, 0, 0.5);

    loadScores().then((scores) => {
      me.Q6 = (scores.length < 3 || me.T > scores[scores.length - 1].s);
      me.time.delayedCall(1200, () => (me.Qx = true));
    });
    me.time.delayedCall(9000, () => me.Qg());
  }

  Qg() {
    let [me] = [this];
    if (me.Qs) return;
    me.Qs = true;
    if (me.Q6 && me.T > 0) me.scene.start('I', { T: me.T });
    else me.scene.start('T');
  }

  update() {
    if (this.Qx && anyStart()) this.Qg();
  }
}

// --------------------------------------------------------------------------
class Initials extends PS {

  init(data) {
    this.T = data.T || 0;
  }

  create() {
    let [me] = [this];
    me.lt = [0, 0, 0];
    me.i = 0;
    me.Qy = false;

    TX(me, CX, CY - 110, 'TOP 3!', 16, 0, 0.5);
    TX(me, CX, CY - 78, 'SCORE  ' + String(me.T).padStart(6, '0'), 15, DIM_CSS, 0.5);
    me.Qv = [0, 1, 2].map((i) => TX(me, CX - 48 + i * 48, CY + 8, 'A', 32, 0, 0.5));
    TX(me, CX, CY + 88, 'STICK SELECT  B1 OK', 13, DIM_CSS, 0.5).setAlpha(0.8);
  }

  update(time) {
    let [me] = [this];
    if (me.Qy) return;
    let A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (pressed.P1_U) me.lt[me.i] = (me.lt[me.i] + 25) % 26;
    if (pressed.P1_D) me.lt[me.i] = (me.lt[me.i] + 1) % 26;
    if (pressed.P1_L) me.i = MAX(0, me.i - 1);
    if (pressed.P1_R) me.i = MIN(2, me.i + 1);
    if (pressed.P1_U || pressed.P1_D) Sfx.Q3();

    if (pressed.P1_1 || pressed.START1) {
      if (me.i < 2) me.i++;
      else {
        me.Qy = true;
        let name = me.lt.map((l) => A[l]).join('');
        loadScores().then((scores) => {
          scores.push({ n: name, s: me.T });
          scores.sort((a, b) => b.s - a.s);
          saveScores(scores.slice(0, 3)).then(() => me.scene.start('T'));
        });
      }
    }

    me.Qv.forEach((t, i) => {
      t.setText(A[me.lt[i]]);
      t.setAlpha(i === me.i ? (FLR(time / 300) % 2 ? 1 : 0.35) : 0.8);
    });
  }
}

// --------------------------------------------------------------------------
let config = {
  type: Phaser.AUTO,
  width: W,
  height: H,
  parent: 'game-root',
  backgroundColor: '#070709',
  antialias: true,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  // cada escena nace con su clave: sin un constructor por clase
  scene: [new Title('T'), new Game('G'), new Over('O'), new Initials('I')],
};

// los toques por flanco se limpian UNA vez por frame, tras todas las escenas
new Phaser.Game(config).events.on('poststep', clearPressed);
})();
