'use strict';

/* =========================================================================
   SOILITARY — A Lone Soldier's Harvest
   A small farming game built on the 16x16 Farm RPG asset pack.
   ========================================================================= */

const TILE = 16;
const VIEW_W = 480;
const VIEW_H = 272;
const MAP_W = 40;
const MAP_H = 26;
const WORLD_W = MAP_W * TILE;
const WORLD_H = MAP_H * TILE;
const DAY_START = 6 * 60;
const DAY_END = 26 * 60;
const TIME_SPEED = 3; // in-game minutes per real second
const SAVE_KEY = 'soilitary_save_v1';
const SOUND_KEY = 'soilitary_sound_v1';

/* ------------------------------------------------------------------ map -- */

const HOUSE = { x: 32, y: 16, w: 80, h: 112, door: { x: 72, y: 130 } };
const BARN = { x: 416, y: 16, w: 80, h: 96 };
const SHOP_CHEST = { x: 128, y: 128, w: 16, h: 16, kind: 'shop' };
const SELL_CHEST = { x: 160, y: 128, w: 16, h: 16, kind: 'sell' };
const PEN = {
  x: 400, y: 160, w: 208, h: 160,
  inner: { x: 416, y: 176, w: 176, h: 144 },
  gate: { x: 400, y: 224, w: 16, h: 32 },
};

const PATH_RECTS = [
  { x: 64, y: 144, w: 544, h: 16 },  // main farm road
  { x: 64, y: 128, w: 16, h: 32 },   // house door
  { x: 384, y: 160, w: 16, h: 96 },  // road to pen gate
  { x: 160, y: 160, w: 16, h: 32 },  // field branch
];

const TREES = [
  // top border
  { kind: 'large', x: 0, y: 0 },
  { kind: 'large', x: 120, y: 0 },
  { kind: 'medium', x: 176, y: 0 },
  { kind: 'large', x: 232, y: 0 },
  { kind: 'sapling', x: 288, y: 0 },
  { kind: 'large', x: 320, y: 0 },
  { kind: 'large', x: 512, y: 0 },
  { kind: 'large', x: 568, y: 0 },
  { kind: 'medium', x: 600, y: 0 },
  // left border
  { kind: 'large', x: 0, y: 64 },
  { kind: 'large', x: 0, y: 128 },
  { kind: 'large', x: 0, y: 192 },
  { kind: 'large', x: 0, y: 256 },
  { kind: 'medium', x: 0, y: 320 },
  { kind: 'large', x: 0, y: 368 },
  // bottom border
  { kind: 'large', x: 32, y: 368 },
  { kind: 'large', x: 88, y: 368 },
  { kind: 'large', x: 144, y: 368 },
  { kind: 'large', x: 200, y: 368 },
  { kind: 'large', x: 256, y: 368 },
  { kind: 'large', x: 312, y: 368 },
  { kind: 'large', x: 368, y: 368 },
  { kind: 'large', x: 424, y: 368 },
  { kind: 'large', x: 480, y: 368 },
  { kind: 'large', x: 536, y: 368 },
  { kind: 'large', x: 592, y: 368 },
  // right border / lower right
  { kind: 'large', x: 600, y: 320 },
  { kind: 'large', x: 600, y: 368 },
  // small interior clusters
  { kind: 'medium', x: 48, y: 248 },
  { kind: 'sapling', x: 64, y: 336 },
  { kind: 'medium', x: 336, y: 80 },
  { kind: 'sapling', x: 352, y: 96 },
  { kind: 'sapling', x: 552, y: 80 },
];

/* --------------------------------------------------------------- configs -- */

const CROPS = {
  strawberry: { key: 'strawberry', name: 'Dâu tây', short: 'Dâu', row: 1, growDays: 2, seedCost: 10, sell: 22, color: '#d95b5b' },
  turnip:     { key: 'turnip',     name: 'Củ cải', short: 'Cải', row: 3, growDays: 3, seedCost: 8,  sell: 30, color: '#e8e0c7' },
  potato:     { key: 'potato',     name: 'Khoai tây', short: 'Khoai', row: 5, growDays: 4, seedCost: 18, sell: 48, color: '#b98a5a' },
  onion:      { key: 'onion',      name: 'Hành tím', short: 'Hành', row: 7, growDays: 5, seedCost: 25, sell: 70, color: '#c98a4a' },
};
const SEED_ORDER = ['strawberry', 'turnip', 'potato', 'onion'];

const PRODUCTS = {
  egg:  { key: 'egg',  name: 'Trứng', sell: 18, color: '#f0e6c8' },
  milk: { key: 'milk', name: 'Sữa',   sell: 50, color: '#e8e0c7' },
};

const ANIMAL_TYPES = {
  chicken: { name: 'Gà', cost: 120, product: 'egg', speed: 13, size: 16 },
  cow:     { name: 'Bò', cost: 350, product: 'milk', speed: 9, size: 32 },
  chick:   { name: 'Gà con', cost: 60, product: null, speed: 11, size: 16 },
};

const ANIMAL_NAMES = {
  chicken: ['Gà Mái', 'Gà Vàng', 'Gà Nâu', 'Gà Trống', 'Gà Mơ'],
  cow: ['Bò Nâu', 'Bò Sữa', 'Bò Đốm', 'Bò Vàng'],
  chick: ['Gà Con', 'Mầm', 'Hạt Mít', 'Bắp'],
};

const UPGRADES = {
  irrigation: { key: 'irrigation', name: 'Bình tưới đôi', cost: 180, desc: 'Tưới nước cho cả 4 ô kề bên.' },
  compost:    { key: 'compost',    name: 'Ủ phân hữu cơ', cost: 220, desc: 'Mỗi lần thu hoạch thêm +1 nông sản.' },
  lamp:       { key: 'lamp',       name: 'Đèn bão', cost: 150, desc: 'Tăng năng lượng tối đa lên 120.' },
};

const WEATHERS = {
  clear:    { key: 'clear',    label: '☀ Nắng' },
  rain:     { key: 'rain',     label: '☂ Mưa' },
  overcast: { key: 'overcast', label: '☁ Dịu' },
};

const OBJECTIVES = [
  { id: 'plant3',   text: 'Gieo 3 hạt giống',            stat: 'planted',   target: 3,   reward: { coins: 20, seeds: { strawberry: 2 } } },
  { id: 'water3',   text: 'Tưới 3 cây',                  stat: 'watered',   target: 3,   reward: { coins: 15, feed: 2 } },
  { id: 'till5',    text: 'Cuốc 5 ô đất',                stat: 'tilled',    target: 5,   reward: { coins: 25, seeds: { turnip: 2 } } },
  { id: 'harvest8', text: 'Thu hoạch 8 nông sản',        stat: 'harvested', target: 8,   reward: { coins: 60, feed: 2 } },
  { id: 'feed3',    text: 'Cho vật nuôi ăn 3 lần',       stat: 'fed',       target: 3,   reward: { coins: 40, ration: 1 } },
  { id: 'earn300',  text: 'Kiếm 300 xu từ chợ',          stat: 'earned',    target: 300, reward: { coins: 60, seeds: { potato: 2 } } },
  { id: 'day7',     text: 'Sống đến ngày 7',             stat: 'day',       target: 7,   reward: { coins: 100, seeds: { onion: 1 } } },
];

const LETTERS = [
  {
    day: 1, from: 'Mara', subject: 'Căn nhà vẫn còn mùi gỗ cũ',
    body: [
      'Anh à,',
      'Em để hạt giống ở hòm trước cửa. Con gà vàng vẫn còn đó, chỉ là nó không còn ai để cãi nhau mỗi sáng.',
      'Anh đừng quên ăn. Nghe nói người lính hay quên chuyện đó.',
    ],
  },
  {
    day: 2, from: 'Rook', subject: 'Không còn ở chiến tuyến nữa',
    body: [
      'Người lính,',
      'Mày không còn ở chiến tuyến nữa. Ở đó người ta trồng cây, không phải đào hào.',
      'Tao nghe nói mày cuốc đất từ sáng. Tốt. Nhưng nhớ ngủ.',
    ],
  },
  {
    day: 3, from: 'Mara', subject: 'Con gà vàng lại đẻ trứng',
    body: [
      'Anh à,',
      'Con gà vàng lại đẻ trứng. Nó vẫn kén ăn như hồi bà còn sống.',
      'Em gửi kèm một ít thức ăn. Đừng cho nó ăn hết trong một ngày.',
    ],
  },
  {
    day: 4, from: 'Rook', subject: 'Tiếp tế',
    body: [
      'Người lính,',
      'Tiếp tế đến. Không phải quân nhu, chỉ là hạt giống. Nhưng cũng là tiếp tế.',
      'Mày có thể bắt đầu tin vào chuyện mình đang làm được rồi đấy.',
    ],
  },
  {
    day: 5, from: 'Mara', subject: 'Anh ngủ ngoài vườn à?',
    body: [
      'Anh à,',
      'Em nghe nói anh ngủ ngoài vườn. Vào nhà đi. Cái giường vẫn còn đó, không có ai chiếm đâu.',
      'Em để đèn ở bàn. Đừng quên tắt.',
    ],
  },
  {
    day: 6, from: 'Rook', subject: 'Biết khi nào nên dừng',
    body: [
      'Người lính,',
      'Một người lính giỏi biết khi nào nên dừng. Cây cũng vậy. Mày tưới quá nhiều cũng chết.',
      'Tao sẽ ghé vào ngày hội. Đừng làm hỏng mùa màng.',
    ],
  },
  {
    day: 7, from: 'Mara', subject: 'Nửa mùa rồi',
    body: [
      'Anh à,',
      'Nửa mùa rồi. Anh có thấy mình khác không? Em thì thấy tiếng anh ít gắt hơn trước.',
      'Em vẫn giữ chỗ cho anh ở bàn ăn.',
    ],
  },
  {
    day: 8, from: 'Rook', subject: 'Đừng làm hỏng mùa màng',
    body: [
      'Người lính,',
      'Tao sẽ ghé vào ngày hội. Mang theo một chai rượu cũ và ít chuyện để kể.',
      'Mày chỉ cần lo phần cây cối. Phần còn lại để tao.',
    ],
  },
  {
    day: 9, from: 'Mara', subject: 'Chiếc khăn cũ',
    body: [
      'Anh à,',
      'Em gửi cho anh chiếc khăn cũ. Lau mồ hôi, đừng lau nước mắt.',
      'Ngày mai em sẽ mang bánh đến. Anh nhớ dọn bàn.',
    ],
  },
  {
    day: 10, from: 'Rook', subject: 'Chiến tranh kết thúc khi...',
    body: [
      'Người lính,',
      'Chiến tranh không kết thúc vào ngày ký hiệp định. Nó kết thúc khi mày trồng được thứ gì đó và tin rằng nó sẽ lớn.',
      'Mày đang làm được. Tao thấy rồi.',
    ],
  },
  {
    day: 11, from: 'Mara', subject: 'Ngày mai là hội',
    body: [
      'Anh à,',
      'Ngày mai là hội. Em sẽ mang bánh, còn Rook sẽ mang rượu. Anh chỉ cần mở cửa.',
      'À, và mặc áo sạch. Em biết anh vẫn còn chiếc áo lính trong tủ.',
    ],
  },
  {
    day: 12, from: 'Rook', subject: 'Báo cáo đi, người lính',
    body: [
      'Người lính,',
      'Báo cáo đi. Không phải bằng súng, bằng mùa màng.',
      'Tao không cần biết mày kiếm được bao nhiêu. Tao chỉ cần biết mày còn muốn ở lại.',
      'Và tao nghĩ mày đã có câu trả lời.',
    ],
  },
];

/* ----------------------------------------------------------------- state -- */

function newState() {
  return {
    version: 1,
    day: 1,
    time: DAY_START,
    weather: 'clear',
    coins: 120,
    energy: 100,
    maxEnergy: 100,
    morale: 50,
    inventory: {
      seeds: { strawberry: 4, turnip: 2, potato: 0, onion: 0 },
      produce: { strawberry: 0, turnip: 0, potato: 0, onion: 0, egg: 0, milk: 0 },
      feed: 3,
      ration: 2,
    },
    selectedSeed: 'strawberry',
    crops: [],
    tilled: ['10,12', '11,12', '12,12'],
    animals: [
      { id: 'a1', type: 'chicken', variant: 'red',    name: 'Gà Mái',  x: 448, y: 220, dir: 'right', animTime: 0, target: null, moving: false, timer: 1.2, fed: false, productReady: false, hearts: 2, pettedToday: false },
      { id: 'a2', type: 'chicken', variant: 'blonde', name: 'Gà Vàng', x: 500, y: 260, dir: 'left',  animTime: 0, target: null, moving: false, timer: 2.4, fed: false, productReady: false, hearts: 2, pettedToday: false },
      { id: 'a3', type: 'cow',     variant: 'female', name: 'Bò Nâu',  x: 540, y: 220, dir: 'right', animTime: 0, target: null, moving: false, timer: 1.8, fed: false, productReady: false, hearts: 2, pettedToday: false },
      { id: 'a4', type: 'chick',   variant: 'yellow', name: 'Gà Con',  x: 470, y: 280, dir: 'right', animTime: 0, target: null, moving: false, timer: 3.0, fed: false, productReady: false, hearts: 2, pettedToday: false },
    ],
    lettersUnlocked: [1],
    lettersRead: [],
    claimedObjectives: [],
    stats: { tilled: 3, planted: 0, watered: 0, harvested: 0, fed: 0, earned: 0, sold: 0 },
    dayStart: { coins: 120, harvested: 0, fed: 0 },
    upgrades: { irrigation: false, compost: false, lamp: false },
    player: { x: 72, y: 148, dir: 'down', animTime: 0, moving: false },
    housePlayer: { x: 240, y: 232, dir: 'up', animTime: 0, moving: false },
    flags: { introSeen: false, firstPlant: false, firstWater: false, firstHarvest: false, warmedToday: false },
    savedAt: 0,
  };
}

let state = newState();
let scene = 'title';
let cam = { x: 0, y: 0 };
let modalOpen = false;
let pendingEnding = false;
let lastFrame = 0;
let hudTimer = 0;
let autosaveTimer = 0;
let titlePreviewTime = 18 * 60 + 20;
let toastId = 0;
let targetInfo = null;
let rainDrops = [];
let fireflies = [];
let particles = [];
let floatTexts = [];
let shake = 0;
let flash = 0;

const keys = Object.create(null);
const joystick = { active: false, x: 0, y: 0, pointerId: null };

/* ------------------------------------------------------------- dom refs -- */

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

const els = {
  hud: document.getElementById('hud'),
  title: document.getElementById('title-screen'),
  loading: document.getElementById('loading-screen'),
  loadingFill: document.getElementById('loading-fill'),
  modal: document.getElementById('modal-root'),
  toast: document.getElementById('toast-root'),
  dayLabel: document.getElementById('day-label'),
  weatherLabel: document.getElementById('weather-label'),
  clockLabel: document.getElementById('clock-label'),
  dayFill: document.getElementById('day-fill'),
  coinsLabel: document.getElementById('coins-label'),
  energyLabel: document.getElementById('energy-label'),
  energyFill: document.getElementById('energy-fill'),
  moraleLabel: document.getElementById('morale-label'),
  moraleFill: document.getElementById('morale-fill'),
  objectiveText: document.getElementById('objective-text'),
  objectiveCount: document.getElementById('objective-count'),
  prompt: document.getElementById('prompt'),
  promptText: document.getElementById('prompt-text'),
  hotbar: document.getElementById('hotbar'),
  btnContinue: document.getElementById('btn-continue'),
  btnSound: document.getElementById('btn-sound'),
  btnJournal: document.getElementById('btn-journal'),
  btnEat: document.getElementById('btn-eat'),
  btnPause: document.getElementById('btn-pause'),
  joystick: document.getElementById('joystick'),
  joystickKnob: document.getElementById('joystick-knob'),
  touchAction: document.getElementById('touch-action'),
  touchEat: document.getElementById('touch-eat'),
};

/* ---------------------------------------------------------------- assets -- */

const ASSETS = {
  player_idle: 'assets/player_idle.png',
  player_walk: 'assets/player_walk.png',
  grass: 'assets/grass.png',
  house: 'assets/house.png',
  interior: 'assets/interior.png',
  crops: 'assets/crops.png',
  trees: 'assets/trees.png',
  fence: 'assets/fence.png',
  road: 'assets/road.png',
  chest: 'assets/chest.png',
  cow_female: 'assets/cow_female.png',
  cow_male: 'assets/cow_male.png',
  chicken_red: 'assets/chicken_red.png',
  chicken_blonde: 'assets/chicken_blonde.png',
  chicken_baby: 'assets/chicken_baby.png',
};

const IMG = {};
let assetsLoaded = 0;
let assetsTotal = Object.keys(ASSETS).length;
let groundCanvas = null;

function loadAssets() {
  return Promise.all(Object.entries(ASSETS).map(([key, src]) => new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      IMG[key] = img;
      assetsLoaded++;
      if (els.loadingFill) els.loadingFill.style.width = `${Math.round((assetsLoaded / assetsTotal) * 100)}%`;
      resolve();
    };
    img.onerror = () => reject(new Error(`Could not load ${src}`));
    img.src = src;
  })));
}

/* ----------------------------------------------------------------- audio -- */

const audio = {
  ctx: null,
  master: null,
  enabled: true,
  musicTimer: null,
  step: 0,
};

try {
  audio.enabled = localStorage.getItem(SOUND_KEY) !== 'off';
} catch (_) { /* ignore */ }

function initAudio() {
  if (!audio.ctx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    audio.ctx = new Ctx();
    audio.master = audio.ctx.createGain();
    audio.master.gain.value = 0.55;
    audio.master.connect(audio.ctx.destination);
  }
  if (audio.ctx.state === 'suspended') audio.ctx.resume();
  if (audio.enabled) startMusic();
}

function beep(freq, dur, type = 'square', vol = 0.035, slide = 0) {
  if (!audio.enabled || !audio.ctx) return;
  const t = audio.ctx.currentTime;
  const o = audio.ctx.createOscillator();
  const g = audio.ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(Math.max(30, freq), t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g);
  g.connect(audio.master);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function noiseSfx(dur = 0.08, freq = 1200, vol = 0.025, highpass = false) {
  if (!audio.enabled || !audio.ctx) return;
  const ctxA = audio.ctx;
  const t = ctxA.currentTime;
  const len = Math.max(1, Math.floor(ctxA.sampleRate * dur));
  const buffer = ctxA.createBuffer(1, len, ctxA.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const src = ctxA.createBufferSource();
  src.buffer = buffer;
  const filter = ctxA.createBiquadFilter();
  filter.type = highpass ? 'highpass' : 'lowpass';
  filter.frequency.value = freq;
  filter.Q.value = 0.7;
  const g = ctxA.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(filter);
  filter.connect(g);
  g.connect(audio.master);
  src.start(t);
  src.stop(t + dur);
}

function sfx(name) {
  if (!audio.enabled) return;
  initAudio();
  switch (name) {
    case 'click': beep(520, 0.035, 'square', 0.02, -140); break;
    case 'till': noiseSfx(0.09, 900, 0.035); beep(110, 0.08, 'square', 0.018, -30); break;
    case 'water': noiseSfx(0.16, 2400, 0.025, true); beep(760, 0.08, 'sine', 0.012, 260); break;
    case 'plant': beep(660, 0.06, 'triangle', 0.03, 120); break;
    case 'harvest': beep(523, 0.06, 'triangle', 0.03); setTimeout(() => beep(659, 0.06, 'triangle', 0.03), 55); setTimeout(() => beep(784, 0.09, 'triangle', 0.03), 110); break;
    case 'coin': beep(880, 0.05, 'square', 0.025); setTimeout(() => beep(1320, 0.08, 'square', 0.02), 55); break;
    case 'quest': beep(392, 0.08, 'triangle', 0.03); setTimeout(() => beep(523, 0.08, 'triangle', 0.03), 90); setTimeout(() => beep(784, 0.14, 'triangle', 0.03), 180); break;
    case 'error': beep(140, 0.1, 'sawtooth', 0.025, -40); break;
    case 'chicken': beep(900, 0.05, 'square', 0.018, 300); setTimeout(() => beep(700, 0.06, 'square', 0.015, -100), 70); break;
    case 'cow': beep(120, 0.22, 'sawtooth', 0.018, -30); break;
    case 'sleep': beep(392, 0.16, 'sine', 0.025, -80); setTimeout(() => beep(261, 0.22, 'sine', 0.022, -60), 140); break;
    case 'open': beep(440, 0.05, 'triangle', 0.02, 120); break;
    case 'close': beep(440, 0.05, 'triangle', 0.02, -120); break;
    case 'level': beep(523, 0.09, 'triangle', 0.03); setTimeout(() => beep(659, 0.09, 'triangle', 0.03), 80); setTimeout(() => beep(1046, 0.18, 'triangle', 0.03), 160); break;
    default: break;
  }
}

function startMusic() {
  if (!audio.enabled || !audio.ctx || audio.musicTimer) return;
  const melody = [
    261.63, 329.63, 392.00, 523.25,
    392.00, 329.63, 293.66, 261.63,
    220.00, 261.63, 329.63, 392.00,
    329.63, 293.66, 261.63, 196.00,
  ];
  const bass = [130.81, 130.81, 146.83, 146.83, 110.00, 110.00, 123.47, 123.47];
  audio.musicTimer = setInterval(() => {
    if (!audio.enabled || !audio.ctx) return;
    const step = audio.step % melody.length;
    beep(melody[step], 0.28, 'triangle', 0.012);
    if (step % 2 === 0) beep(bass[Math.floor(step / 2) % bass.length], 0.48, 'sine', 0.009);
    audio.step++;
  }, 430);
}

function stopMusic() {
  if (audio.musicTimer) {
    clearInterval(audio.musicTimer);
    audio.musicTimer = null;
  }
}

function updateSoundButton() {
  if (els.btnSound) els.btnSound.textContent = audio.enabled ? '♪ ÂM THANH: BẬT' : '× ÂM THANH: TẮT';
}

function toggleSound() {
  audio.enabled = !audio.enabled;
  try { localStorage.setItem(SOUND_KEY, audio.enabled ? 'on' : 'off'); } catch (_) { /* ignore */ }
  if (audio.enabled) {
    initAudio();
    startMusic();
    sfx('click');
  } else {
    stopMusic();
  }
  updateSoundButton();
}

/* --------------------------------------------------------------- helpers -- */

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function dist(x1, y1, x2, y2) { return Math.hypot(x1 - x2, y1 - y2); }
function tileKey(tx, ty) { return `${tx},${ty}`; }
function parseTile(key) { const [x, y] = key.split(',').map(Number); return { x, y }; }
function formatTime(min) {
  const h = Math.floor(min / 60) % 24;
  const m = Math.floor(min % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
function formatDay(n) { return String(n).padStart(2, '0'); }
function clone(obj) { return JSON.parse(JSON.stringify(obj)); }
function isPathAt(x, y) {
  return PATH_RECTS.some(r => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h);
}
function isNightTime() { return state.time >= 19 * 60 || state.time < 6 * 60; }
function getActivePlayer() { return scene === 'house' ? state.housePlayer : state.player; }
function cropStage(crop) {
  return Math.min(5, Math.floor((crop.growth / CROPS[crop.type].growDays) * 5));
}
function getCropAt(tx, ty) {
  return state.crops.find(c => c.tx === tx && c.ty === ty) || null;
}
function isTilled(tx, ty) { return state.tilled.includes(tileKey(tx, ty)); }
function addTilled(tx, ty) {
  const key = tileKey(tx, ty);
  if (!state.tilled.includes(key)) state.tilled.push(key);
}
function removeTilled(tx, ty) {
  state.tilled = state.tilled.filter(k => k !== tileKey(tx, ty));
}
function hasSave() {
  try { return !!localStorage.getItem(SAVE_KEY); } catch (_) { return false; }
}
function saveGame(silent = true) {
  if (!state) return;
  state.savedAt = Date.now();
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    if (!silent) toast('Đã lưu mùa màng.', 'good');
  } catch (_) {
    if (!silent) toast('Không thể lưu trò chơi.', 'warn');
  }
}
function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || data.version !== 1) return null;
    const base = newState();
    const s = { ...base, ...data };
    s.inventory = { ...base.inventory, ...(data.inventory || {}) };
    s.inventory.seeds = { ...base.inventory.seeds, ...((data.inventory && data.inventory.seeds) || {}) };
    s.inventory.produce = { ...base.inventory.produce, ...((data.inventory && data.inventory.produce) || {}) };
    s.stats = { ...base.stats, ...(data.stats || {}) };
    s.dayStart = data.dayStart
      ? { ...base.dayStart, ...data.dayStart }
      : { coins: s.coins, harvested: s.stats.harvested || 0, fed: s.stats.fed || 0 };
    s.upgrades = { ...base.upgrades, ...(data.upgrades || {}) };
    s.player = { ...base.player, ...(data.player || {}) };
    s.housePlayer = { ...base.housePlayer, ...(data.housePlayer || {}) };
    s.flags = { ...base.flags, ...(data.flags || {}) };
    s.crops = Array.isArray(data.crops) ? data.crops : [];
    s.tilled = Array.isArray(data.tilled) ? data.tilled : base.tilled;
    s.animals = Array.isArray(data.animals) && data.animals.length ? data.animals : base.animals;
    s.lettersUnlocked = Array.isArray(data.lettersUnlocked) ? data.lettersUnlocked : [1];
    s.lettersRead = Array.isArray(data.lettersRead) ? data.lettersRead : [];
    s.claimedObjectives = Array.isArray(data.claimedObjectives) ? data.claimedObjectives : [];
    return s;
  } catch (_) {
    return null;
  }
}

/* =========================================================================
   UI — toast, modals, HUD, hotbar, shop, journal, reports
   ========================================================================= */

let shopTab = 'seeds';
let journalTab = 'quests';
let letterReturnTo = 'journal';
let lastPromptText = '';

function toast(message, kind = '') {
  const node = document.createElement('div');
  node.className = `toast ${kind}`.trim();
  node.dataset.toast = String(++toastId);
  node.textContent = message;
  els.toast.appendChild(node);
  setTimeout(() => {
    if (node.parentNode) node.parentNode.removeChild(node);
  }, 3100);
}

function openModal(html, focusSelector = null) {
  modalOpen = true;
  for (const k of Object.keys(keys)) keys[k] = false;
  joystick.active = false;
  joystick.x = 0;
  joystick.y = 0;
  resetJoystickVisual();
  els.modal.innerHTML = html;
  els.modal.classList.remove('is-hidden');
  if (els.prompt) els.prompt.classList.add('is-hidden');
  if (focusSelector) {
    setTimeout(() => {
      const el = els.modal.querySelector(focusSelector);
      if (el) el.focus();
    }, 30);
  }
}

function closeModal() {
  modalOpen = false;
  els.modal.classList.add('is-hidden');
  els.modal.innerHTML = '';
  lastPromptText = '';
}

function modalShell({ title, kicker = '', body = '', foot = '', cls = '', tabs = '', hideClose = false }) {
  return `
    <div class="modal ${cls}">
      <div class="modal-head">
        <div>
          <div class="modal-title">${title}</div>
          ${kicker ? `<span class="modal-kicker">${kicker}</span>` : ''}
        </div>
        ${hideClose ? '' : `<button class="modal-close" data-mact="close" aria-label="Đóng">✕</button>`}
      </div>
      ${tabs}
      <div class="modal-body">${body}</div>
      ${foot ? `<div class="modal-foot">${foot}</div>` : ''}
    </div>`;
}

function tabRow(items, active, attr) {
  return `<div class="tab-row">${items.map(([key, label]) =>
    `<button class="tab-btn ${key === active ? 'active' : ''}" ${attr}="${key}">${label}</button>`
  ).join('')}</div>`;
}

/* ----------------------------------------------------------------- icons -- */

const ICON_CACHE = new Map();

function makeIcon(key, size, draw) {
  if (ICON_CACHE.has(key)) return ICON_CACHE.get(key);
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  draw(g, size);
  const url = c.toDataURL();
  ICON_CACHE.set(key, url);
  return url;
}

function iconForCrop(type) {
  const crop = CROPS[type];
  return makeIcon(`crop:${type}`, 48, (g, s) => {
    g.drawImage(IMG.crops, 8 * 16, crop.row * 16, 16, 16, 4, 4, s - 8, s - 8);
  });
}

function iconForSeed(type) {
  const crop = CROPS[type];
  return makeIcon(`seed:${type}`, 48, (g, s) => {
    g.drawImage(IMG.crops, 7 * 16, crop.row * 16, 16, 16, 4, 4, s - 8, s - 8);
  });
}

function iconForAnimal(type) {
  return makeIcon(`animal:${type}`, 48, (g, s) => {
    if (type === 'cow') {
      g.drawImage(IMG.cow_female, 0, 0, 32, 32, 4, 4, s - 8, s - 8);
    } else if (type === 'chick') {
      g.drawImage(IMG.chicken_baby, 0, 0, 16, 16, 8, 8, s - 16, s - 16);
    } else {
      g.drawImage(IMG.chicken_red, 0, 0, 16, 16, 8, 8, s - 16, s - 16);
    }
  });
}

function iconForFeed() {
  return makeIcon('feed', 48, (g, s) => {
    g.fillStyle = '#d9a441';
    for (let i = 0; i < 4; i++) {
      const x = 8 + i * 8;
      g.fillRect(x, 8 + (i % 2) * 2, 2, 26);
      g.fillRect(x + 2, 10 + (i % 2) * 2, 2, 4);
    }
    g.fillStyle = '#b45f3c';
    g.fillRect(6, 28, 36, 5);
    g.fillStyle = '#f0c36a';
    g.fillRect(6, 28, 36, 2);
  });
}

function iconForRation() {
  return makeIcon('ration', 48, (g, s) => {
    g.fillStyle = '#6e7b3f';
    g.fillRect(9, 12, 30, 26);
    g.fillStyle = '#9aab60';
    g.fillRect(11, 14, 26, 9);
    g.fillStyle = '#3e4726';
    g.fillRect(14, 28, 18, 3);
    g.fillRect(14, 33, 12, 2);
    g.fillStyle = '#d9a441';
    g.fillRect(22, 8, 4, 6);
  });
}

/* ----------------------------------------------------------------- HUD --- */

function buildHotbar() {
  if (!els.hotbar) return;
  els.hotbar.innerHTML = SEED_ORDER.map((key, i) => {
    const crop = CROPS[key];
    return `<button class="slot" data-seed="${key}" title="${crop.name}">
      <span class="key">${i + 1}</span>
      <img class="slot-icon" src="${iconForCrop(key)}" alt="" />
      <span class="count" data-count="${key}">0</span>
      <span class="slot-label">${crop.short}</span>
    </button>`;
  }).join('') + `<button class="slot feed-slot" data-feed="1" title="Thức ăn">
      <span class="key">5</span>
      <span class="slot-icon feed"></span>
      <span class="count" data-count="feed">0</span>
      <span class="slot-label">Thức ăn</span>
    </button>`;

  els.hotbar.addEventListener('click', (e) => {
    const slot = e.target.closest('.slot');
    if (!slot) return;
    initAudio();
    if (slot.dataset.seed) {
      selectSeed(slot.dataset.seed);
    } else {
      sfx('click');
      toast(`Thức ăn còn ${state.inventory.feed}. Đứng gần vật nuôi và nhấn E để cho ăn.`);
    }
  });
}

function selectSeed(key) {
  if (!CROPS[key]) return;
  state.selectedSeed = key;
  sfx('click');
  updateHotbar();
  toast(`Đã chọn hạt ${CROPS[key].name.toLowerCase()}.`);
}

function updateHotbar() {
  if (!els.hotbar || !state) return;
  els.hotbar.querySelectorAll('.slot[data-seed]').forEach(slot => {
    const key = slot.dataset.seed;
    slot.classList.toggle('active', key === state.selectedSeed);
    const count = slot.querySelector('.count');
    if (count) count.textContent = String(state.inventory.seeds[key] || 0);
    slot.classList.toggle('empty', (state.inventory.seeds[key] || 0) <= 0);
  });
  const feedCount = els.hotbar.querySelector('[data-count="feed"]');
  if (feedCount) feedCount.textContent = String(state.inventory.feed || 0);
  els.hotbar.querySelector('.feed-slot')?.classList.toggle('empty', (state.inventory.feed || 0) <= 0);
}

function updateHUD() {
  if (!state) return;
  const weather = WEATHERS[state.weather] || WEATHERS.clear;
  els.dayLabel.textContent = `NGÀY ${formatDay(state.day)}`;
  els.weatherLabel.textContent = weather.label;
  els.clockLabel.textContent = formatTime(state.time);
  const dayProgress = clamp((state.time - DAY_START) / (DAY_END - DAY_START), 0, 1);
  els.dayFill.style.width = `${Math.round(dayProgress * 100)}%`;
  els.coinsLabel.textContent = String(state.coins);
  els.energyLabel.textContent = String(Math.max(0, Math.round(state.energy)));
  els.energyFill.style.width = `${clamp(state.energy / state.maxEnergy, 0, 1) * 100}%`;
  els.moraleLabel.textContent = String(Math.round(state.morale));
  els.moraleFill.style.width = `${clamp(state.morale / 100, 0, 1) * 100}%`;

  const current = OBJECTIVES.find(o => !state.claimedObjectives.includes(o.id));
  if (current) {
    const value = current.stat === 'day' ? state.day : (state.stats[current.stat] || 0);
    els.objectiveText.textContent = current.text;
    els.objectiveCount.textContent = `${Math.min(value, current.target)}/${current.target}`;
  } else {
    els.objectiveText.textContent = 'Mùa màng đã viên mãn';
    els.objectiveCount.textContent = `${OBJECTIVES.length}/${OBJECTIVES.length}`;
  }
  els.btnContinue.disabled = !hasSave();
  updateHotbar();
}

function updatePrompt() {
  if (!state || modalOpen || (scene !== 'farm' && scene !== 'house')) {
    if (!els.prompt.classList.contains('is-hidden')) els.prompt.classList.add('is-hidden');
    targetInfo = null;
    return;
  }
  const info = getActionInfo();
  targetInfo = info;
  if (!info) {
    els.prompt.classList.add('is-hidden');
    lastPromptText = '';
    return;
  }
  if (info.label !== lastPromptText) {
    els.promptText.textContent = info.label;
    lastPromptText = info.label;
  }
  els.prompt.classList.remove('is-hidden');
  els.prompt.classList.toggle('locked', info.locked === true);
}

/* --------------------------------------------------------------- rewards -- */

function rewardText(reward) {
  const parts = [];
  if (reward.coins) parts.push(`+${reward.coins} xu`);
  if (reward.feed) parts.push(`+${reward.feed} thức ăn`);
  if (reward.ration) parts.push(`+${reward.ration} khẩu phần`);
  if (reward.seeds) {
    for (const [key, n] of Object.entries(reward.seeds)) parts.push(`+${n} hạt ${CROPS[key].name.toLowerCase()}`);
  }
  return parts.join(' · ');
}

function applyReward(reward) {
  if (!reward) return;
  if (reward.coins) state.coins += reward.coins;
  if (reward.feed) state.inventory.feed += reward.feed;
  if (reward.ration) state.inventory.ration += reward.ration;
  if (reward.seeds) {
    for (const [key, n] of Object.entries(reward.seeds)) {
      state.inventory.seeds[key] = (state.inventory.seeds[key] || 0) + n;
    }
  }
}

/* ------------------------------------------------------------ title/flow -- */

function showTitle() {
  scene = 'title';
  els.title.classList.remove('is-hidden');
  els.hud.classList.add('is-hidden');
  els.btnContinue.disabled = !hasSave();
  closeModal();
  snapCameraToPlayer();
}

function hideTitle() {
  els.title.classList.add('is-hidden');
  els.hud.classList.remove('is-hidden');
}

function startNewGame() {
  initAudio();
  state = newState();
  scene = 'farm';
  pendingEnding = false;
  hideTitle();
  snapCameraToPlayer();
  updateHUD();
  saveGame(true);
  openIntro();
  sfx('open');
}

function continueGame() {
  const loaded = loadGame();
  if (!loaded) {
    toast('Không tìm thấy bản lưu. Hãy bắt đầu mùa mới.', 'warn');
    return;
  }
  initAudio();
  state = loaded;
  scene = state.day > 12 ? 'ending' : 'farm';
  hideTitle();
  snapCameraToPlayer();
  updateHUD();
  if (state.day > 12) {
    openEnding();
  } else {
    toast(`Chào mừng trở lại, ngày ${state.day}.`, 'good');
  }
  sfx('open');
}

function openIntro() {
  const body = `
    <p><strong>TRUNG SĨ ELIAN VALE</strong> trở về sau chiến tranh.</p>
    <p>Căn nhà của bà ngoại vẫn đứng đó: mái ngói đỏ, hàng rào gãy, và một cánh đồng đã ngủ quên. Chỉ còn <em>12 ngày</em> nữa là hội mùa.</p>
    <p>Anh có một cái cuốc, một ít hạt giống, và một con gà không chịu im.</p>
    <div class="report-quote">“Ở đây người ta trồng cây, không phải đào hào.” — Rook</div>
    <div class="howto-grid" style="margin-top:12px">
      <div class="howto-item"><span class="kbd">WASD</span><span>Di chuyển</span></div>
      <div class="howto-item"><span class="kbd">E</span><span>Hành động</span></div>
      <div class="howto-item"><span class="kbd">1–4</span><span>Chọn hạt giống</span></div>
      <div class="howto-item"><span class="kbd">J</span><span>Nhật ký / thư</span></div>
      <div class="howto-item"><span class="kbd">R</span><span>Ăn khẩu phần</span></div>
      <div class="howto-item"><span class="kbd">ESC</span><span>Tạm dừng</span></div>
    </div>`;
  openModal(modalShell({
    title: 'MỘT MÙA MỚI',
    kicker: '12 NGÀY · MỘT MẢNH VƯỜN · MỘT NGƯỜI LÍNH',
    body,
    foot: `<button class="pixel-btn primary" data-mact="intro-start">RA ĐỒNG</button>`,
  }), '[data-mact="intro-start"]');
}

function openHowTo() {
  const body = `
    <div class="howto-grid">
      <div class="howto-item"><span class="kbd">WASD / ↑↓←→</span><span>Di chuyển quanh vườn</span></div>
      <div class="howto-item"><span class="kbd">E / SPACE</span><span>Hành động ở ô trước mặt</span></div>
      <div class="howto-item"><span class="kbd">1–4</span><span>Chọn loại hạt giống</span></div>
      <div class="howto-item"><span class="kbd">J</span><span>Mở nhật ký, thư, hướng dẫn</span></div>
      <div class="howto-item"><span class="kbd">R</span><span>Ăn khẩu phần, hồi năng lượng</span></div>
      <div class="howto-item"><span class="kbd">M</span><span>Bật / tắt âm thanh</span></div>
    </div>
    <p style="margin-top:12px"><strong>Vòng lặp chính:</strong> cuốc đất → gieo hạt → tưới nước → ngủ qua đêm → thu hoạch → bán ở kho gửi hàng.</p>
    <ul class="tip-list">
      <li>Cây chỉ lớn khi được tưới nước. Mưa sẽ tưới giúp cả ruộng.</li>
      <li>Cho vật nuôi ăn trước khi ngủ; hôm sau chúng sẽ cho trứng hoặc sữa.</li>
      <li>Về nhà, đến bên giường và nhấn E để kết thúc ngày.</li>
      <li>Đọc thư ở bàn trong nhà để tăng tinh thần. Tinh thần cao giúp thu hoạch thêm.</li>
      <li>Hòm tiếp tế bán hạt giống, thức ăn và vật nuôi. Kho gửi hàng mua nông sản.</li>
      <li>Đừng để quá 2 giờ sáng. Người lính cũng cần ngủ.</li>
    </ul>`;
  openModal(modalShell({
    title: 'HƯỚNG DẪN',
    kicker: 'FIELD MANUAL · SOILITARY',
    body,
    foot: `<button class="pixel-btn primary" data-mact="close">ĐÃ HIỂU</button>`,
  }), '[data-mact="close"]');
}

function openPause() {
  const body = `
    <p class="muted small">Tạm dừng không làm thời gian trôi.</p>
    <div class="howto-grid" style="margin-top:8px">
      <div class="howto-item"><span class="kbd">WASD</span><span>Di chuyển</span></div>
      <div class="howto-item"><span class="kbd">E</span><span>Hành động</span></div>
      <div class="howto-item"><span class="kbd">1–4</span><span>Chọn hạt</span></div>
      <div class="howto-item"><span class="kbd">J</span><span>Nhật ký</span></div>
      <div class="howto-item"><span class="kbd">R</span><span>Ăn khẩu phần</span></div>
      <div class="howto-item"><span class="kbd">M</span><span>Âm thanh</span></div>
    </div>`;
  openModal(modalShell({
    title: 'TẠM DỪNG',
    kicker: `NGÀY ${formatDay(state.day)} · ${formatTime(state.time)}`,
    body,
    cls: 'narrow',
    foot: `
      <button class="pixel-btn primary" data-mact="pause-resume">TIẾP TỤC</button>
      <button class="pixel-btn" data-mact="pause-save">LƯU</button>
      <button class="pixel-btn ghost" data-mact="pause-title">VỀ TRANG CHỦ</button>`,
  }), '[data-mact="pause-resume"]');
}

function goTitle() {
  saveGame(true);
  showTitle();
}

/* ----------------------------------------------------------------- shop --- */

function openShop(tab = 'seeds') {
  shopTab = tab;
  renderShop(tab);
  sfx('open');
}

function renderShop(tab) {
  shopTab = tab;
  const tabs = tabRow([['seeds', 'HẠT GIỐNG'], ['supplies', 'VẬT TƯ'], ['animals', 'VẬT NUÔI'], ['upgrades', 'NÂNG CẤP']], tab, 'data-shop-tab');
  let rows = '';

  if (tab === 'seeds') {
    rows = SEED_ORDER.map(key => {
      const c = CROPS[key];
      const can = state.coins >= c.seedCost;
      return `<div class="shop-row">
        <div class="shop-icon"><img src="${iconForCrop(key)}" alt="" style="width:30px;height:30px;image-rendering:pixelated" /></div>
        <div class="shop-info">
          <div class="shop-name">${c.name} <span class="shop-seed-tag">HẠT</span></div>
          <div class="shop-desc">${c.growDays} ngày · bán ${c.sell} xu · đang có ${state.inventory.seeds[key] || 0}</div>
        </div>
        <div class="shop-price">◈ ${c.seedCost}</div>
        <button class="shop-buy" data-buy-seed="${key}" ${can ? '' : 'disabled'}>MUA</button>
      </div>`;
    }).join('');
  } else if (tab === 'supplies') {
    rows = `
      <div class="shop-row">
        <div class="shop-icon"><img src="${iconForFeed()}" alt="" style="width:30px;height:30px;image-rendering:pixelated" /></div>
        <div class="shop-info"><div class="shop-name">Thức ăn</div><div class="shop-desc">Một phần ăn cho gà hoặc bò. Đang có ${state.inventory.feed}.</div></div>
        <div class="shop-price">◈ 6</div>
        <button class="shop-buy" data-buy-supply="feed" ${state.coins >= 6 ? '' : 'disabled'}>MUA</button>
      </div>
      <div class="shop-row">
        <div class="shop-icon"><img src="${iconForRation()}" alt="" style="width:30px;height:30px;image-rendering:pixelated" /></div>
        <div class="shop-info"><div class="shop-name">Khẩu phần</div><div class="shop-desc">Hồi 25 năng lượng. Đang có ${state.inventory.ration}.</div></div>
        <div class="shop-price">◈ 15</div>
        <button class="shop-buy" data-buy-supply="ration" ${state.coins >= 15 ? '' : 'disabled'}>MUA</button>
      </div>`;
  } else if (tab === 'animals') {
    rows = ['chicken', 'cow', 'chick'].map(type => {
      const a = ANIMAL_TYPES[type];
      const can = state.coins >= a.cost && state.animals.length < 8;
      const product = a.product ? `cho ${PRODUCTS[a.product].name.toLowerCase()}` : 'làm bạn nhỏ';
      return `<div class="shop-row">
        <div class="shop-icon"><img src="${iconForAnimal(type)}" alt="" style="width:32px;height:32px;image-rendering:pixelated" /></div>
        <div class="shop-info"><div class="shop-name">${a.name}</div><div class="shop-desc">${product} · chuồng ${state.animals.length}/8</div></div>
        <div class="shop-price">◈ ${a.cost}</div>
        <button class="shop-buy" data-buy-animal="${type}" ${can ? '' : 'disabled'}>MUA</button>
      </div>`;
    }).join('');
  } else {
    rows = Object.values(UPGRADES).map(u => {
      const owned = state.upgrades[u.key];
      return `<div class="shop-row">
        <div class="shop-icon" style="font-family:var(--pixel-font);font-size:14px;color:var(--wheat)">▲</div>
        <div class="shop-info"><div class="shop-name">${u.name}</div><div class="shop-desc">${u.desc}</div></div>
        <div class="shop-price">◈ ${u.cost}</div>
        <button class="shop-buy" ${owned ? 'disabled' : ''} data-buy-upgrade="${u.key}">${owned ? 'ĐÃ MUA' : 'MUA'}</button>
      </div>`;
    }).join('');
  }

  const body = `<div class="shop-list">${rows}</div>`;
  openModal(modalShell({
    title: 'HÒM TIẾP TẾ',
    kicker: `SUPPLY DROP · XU HIỆN CÓ ◈ ${state.coins}`,
    body,
    tabs,
    cls: 'wide',
    foot: `<button class="pixel-btn" data-mact="close">ĐÓNG</button>`,
  }), '[data-mact="close"]');
}

/* ------------------------------------------------------------------ sell -- */

function sellTotal() {
  let total = 0;
  for (const [key, qty] of Object.entries(state.inventory.produce)) {
    if (qty <= 0) continue;
    const price = PRODUCTS[key] ? PRODUCTS[key].sell : (CROPS[key] ? CROPS[key].sell : 0);
    total += price * qty;
  }
  return total;
}

function openSell() {
  renderSell();
  sfx('open');
}

function renderSell() {
  const keys = Object.keys(state.inventory.produce).filter(k => state.inventory.produce[k] > 0);
  let body = '';
  if (!keys.length) {
    body = `<p class="muted">Kho đang trống. Hãy thu hoạch nông sản hoặc chờ vật nuôi cho sản phẩm.</p>`;
  } else {
    const rows = keys.map(key => {
      const qty = state.inventory.produce[key];
      const unit = PRODUCTS[key] ? PRODUCTS[key].sell : CROPS[key].sell;
      const name = PRODUCTS[key] ? PRODUCTS[key].name : CROPS[key].name;
      return `<div class="inv-row">
        <span>${name} <b>×${qty}</b> <span class="muted">· ${unit} xu/cái</span></span>
        <span style="display:flex;gap:5px;align-items:center">
          <span class="shop-price">◈ ${qty * unit}</span>
          <button class="shop-buy" data-sell="${key}">BÁN</button>
        </span>
      </div>`;
    }).join('');
    body = `<div class="inv-grid" style="grid-template-columns:1fr">${rows}</div>
      <div class="total-row"><span>TỔNG CỘNG</span><strong>◈ ${sellTotal()}</strong></div>`;
  }
  openModal(modalShell({
    title: 'KHO GỬI HÀNG',
    kicker: `BÁN NÔNG SẢN · XU HIỆN CÓ ◈ ${state.coins}`,
    body,
    cls: 'wide',
    foot: `
      ${keys.length ? `<button class="pixel-btn primary" data-mact="sell-all">BÁN TẤT CẢ</button>` : ''}
      <button class="pixel-btn" data-mact="close">ĐÓNG</button>`,
  }), '[data-mact="close"]');
}

/* --------------------------------------------------------------- journal -- */

function openJournal(tab = 'quests') {
  journalTab = tab;
  renderJournal(tab);
  sfx('open');
}

function renderJournal(tab) {
  journalTab = tab;
  const tabs = tabRow([['quests', 'NHIỆM VỤ'], ['letters', 'THƯ'], ['manual', 'HƯỚNG DẪN']], tab, 'data-journal-tab');
  let body = '';

  if (tab === 'quests') {
    body = `<div class="quest-list">${OBJECTIVES.map(o => {
      const done = state.claimedObjectives.includes(o.id);
      const value = o.stat === 'day' ? state.day : (state.stats[o.stat] || 0);
      const pct = clamp(value / o.target, 0, 1) * 100;
      return `<div class="quest-row ${done ? 'done' : ''}">
        <div class="quest-mark">${done ? '✓' : ''}</div>
        <div class="quest-main">
          <div class="quest-name">${o.text}</div>
          <div class="quest-progress"><i style="width:${pct}%"></i></div>
        </div>
        <div style="text-align:right">
          <div class="quest-count">${Math.min(value, o.target)}/${o.target}</div>
          <div class="quest-reward">${done ? 'ĐÃ NHẬN' : rewardText(o.reward)}</div>
        </div>
      </div>`;
    }).join('')}</div>`;
  } else if (tab === 'letters') {
    body = `<div class="letter-grid">${LETTERS.map(l => {
      const unlocked = state.lettersUnlocked.includes(l.day);
      const unread = unlocked && !state.lettersRead.includes(l.day);
      return `<button class="letter-row ${unlocked ? '' : 'locked'}" ${unlocked ? `data-letter="${l.day}"` : 'disabled'}>
        <span class="letter-num">${String(l.day).padStart(2, '0')}</span>
        <span class="letter-main">
          <span class="letter-subject">${unlocked ? l.subject : 'Chưa mở'}</span>
          <span class="letter-from">${unlocked ? `Từ ${l.from}` : 'Một lá thư đang chờ'}</span>
        </span>
        ${unread ? '<span class="letter-unread"></span>' : ''}
      </button>`;
    }).join('')}</div>`;
  } else {
    body = `
      <div class="howto-grid">
        <div class="howto-item"><span class="kbd">WASD</span><span>Di chuyển</span></div>
        <div class="howto-item"><span class="kbd">E</span><span>Hành động</span></div>
        <div class="howto-item"><span class="kbd">1–4</span><span>Chọn hạt</span></div>
        <div class="howto-item"><span class="kbd">J</span><span>Nhật ký</span></div>
        <div class="howto-item"><span class="kbd">R</span><span>Ăn khẩu phần</span></div>
        <div class="howto-item"><span class="kbd">ESC</span><span>Tạm dừng</span></div>
      </div>
      <ul class="tip-list">
        <li>Tưới nước mỗi ngày để cây lớn. Mưa tưới giúp cả ruộng.</li>
        <li>Cho vật nuôi ăn trước khi ngủ. Hôm sau chúng sẽ cho sản phẩm.</li>
        <li>Thu hoạch khi cây có đốm sáng vàng.</li>
        <li>Bán nông sản ở kho gửi hàng cạnh nhà.</li>
        <li>Đọc thư để tăng tinh thần. Tinh thần cao có thể cho thêm nông sản.</li>
      </ul>`;
  }

  openModal(modalShell({
    title: 'NHẬT KÝ MÙA MÀNG',
    kicker: `NGÀY ${formatDay(state.day)} · ${state.lettersRead.length}/${LETTERS.length} LÁ THƯ ĐÃ ĐỌC`,
    body,
    tabs,
    cls: 'wide',
    foot: `<button class="pixel-btn" data-mact="close">ĐÓNG</button>`,
  }), '[data-mact="close"]');
}

function openLetter(day, returnTo = 'journal') {
  const letter = LETTERS.find(l => l.day === day);
  if (!letter) return;
  letterReturnTo = returnTo;
  const firstRead = !state.lettersRead.includes(day);
  if (firstRead) {
    state.lettersRead.push(day);
    state.morale = clamp(state.morale + 5, 0, 100);
    saveGame(true);
    updateHUD();
  }
  sfx('open');
  const html = `
    <div class="paper-modal">
      <div class="paper-head">
        <span class="paper-title">THƯ · NGÀY ${String(day).padStart(2, '0')}</span>
        <span class="paper-date">TỪ ${letter.from.toUpperCase()}</span>
      </div>
      <div class="paper-body">
        <p><strong>${letter.subject}</strong></p>
        ${letter.body.map(p => `<p>${p}</p>`).join('')}
        <p class="paper-sign">— ${letter.from}</p>
      </div>
      <div class="paper-foot">
        <button class="paper-btn" data-mact="close-letter">GẤP LẠI</button>
      </div>
    </div>`;
  openModal(html, '[data-mact="close-letter"]');
  if (firstRead) toast('Đọc thư mới · Tinh thần +5', 'good');
}

/* --------------------------------------------------------------- reports -- */

function openSleepConfirm(auto = false) {
  const body = `
    <p>Kết thúc <strong>ngày ${state.day}</strong>?</p>
    <p class="muted">Cây đã tưới sẽ lớn thêm một chút. Vật nuôi đã cho ăn sẽ sản xuất. Năng lượng sẽ được hồi đầy.</p>
    <div class="report-quote">“Một người lính giỏi biết khi nào nên dừng.” — Rook</div>`;
  openModal(modalShell({
    title: auto ? 'ĐÃ KHUYA' : 'ĐI NGỦ',
    kicker: `${formatTime(state.time)} · NGÀY ${formatDay(state.day)}`,
    body,
    cls: 'narrow',
    foot: `
      <button class="pixel-btn primary" data-mact="sleep-yes">NGỦ</button>
      <button class="pixel-btn" data-mact="close">Ở LẠI</button>`,
  }), '[data-mact="sleep-yes"]');
}

function openDayReport(summary) {
  const letter = LETTERS.find(l => l.day === state.day);
  const letterLine = letter ? `<div class="report-quote"><strong>Thư mới từ ${letter.from}:</strong> ${letter.subject}</div>` : '';
  const coinText = `${summary.coins >= 0 ? '+' : ''}${summary.coins} xu`;
  const body = `
    <div class="report-medal" style="width:auto;height:auto;padding:6px 12px;font-size:12px;letter-spacing:1px">BÁO CÁO NGÀY ${formatDay(state.day - 1)}</div>
    <div class="report-grid">
      <div class="report-cell"><div class="k">Lãi trong ngày</div><div class="v">${coinText}</div></div>
      <div class="report-cell"><div class="k">Thu hoạch</div><div class="v">${summary.harvested} nông sản</div></div>
      <div class="report-cell"><div class="k">Đã cho ăn</div><div class="v">${summary.fed} lần</div></div>
      <div class="report-cell"><div class="k">Tinh thần</div><div class="v">${Math.round(state.morale)}/100</div></div>
    </div>
    <p>Ngày <strong>${state.day}</strong> bắt đầu. Thời tiết: <em>${WEATHERS[state.weather].label}</em>.</p>
    ${letterLine}
    <p class="muted small">${pendingEnding ? 'Mùa màng đã khép lại. Hãy xem báo cáo cuối mùa.' : 'Bạn có thể đọc thư đầy đủ trong nhật ký.'}</p>`;
  openModal(modalShell({
    title: `NGÀY ${formatDay(state.day)}`,
    kicker: pendingEnding ? 'MÙA MÀNG KHÉP LẠI' : 'BÁO CÁO SAU MỘT ĐÊM',
    body,
    cls: 'narrow',
    foot: `<button class="pixel-btn primary" data-mact="report-continue">${pendingEnding ? 'XEM KẾT THÚC' : 'SANG NGÀY MỚI'}</button>`,
  }), '[data-mact="report-continue"]');
}

function endingScore() {
  return state.coins + state.stats.harvested * 20 + Math.round(state.morale) * 3 + state.lettersRead.length * 12;
}

function endingRank() {
  const score = endingScore();
  if (score >= 2800) return 'S';
  if (score >= 1900) return 'A';
  if (score >= 1200) return 'B';
  return 'C';
}

function openEnding() {
  scene = 'ending';
  els.hud.classList.add('is-hidden');
  const rank = endingRank();
  const titles = {
    S: 'MÙA MÀNG CỦA NGƯỜI TRỞ VỀ',
    A: 'MỘT MÙA ĐÁNG NHỚ',
    B: 'MẦM XANH ĐÃ LÊN',
    C: 'KHỞI ĐẦU LẠI TỪ ĐẤT',
  };
  const texts = {
    S: 'Bạn đã biến mảnh đất ngủ quên thành một nơi có tiếng cười. Rook mang rượu, Mara mang bánh, và con gà vàng vẫn cãi nhau với mọi người. Bạn không còn là người lính đang tìm đường về nữa. Bạn đã về.',
    A: 'Mùa màng không hoàn hảo, nhưng nó đủ để gọi là nhà. Bạn đã học cách chờ cây lớn, cách cho đi, và cách ngủ một giấc không mơ thấy chiến tranh.',
    B: 'Bạn đã trồng được những thứ đầu tiên. Đất không phụ người kiên nhẫn. Ngày hội đã qua, nhưng mùa sau vẫn còn.',
    C: 'Một mùa ngắn, nhiều thử thách. Nhưng bạn đã ở lại. Đôi khi chỉ cần ở lại là đủ để mọi thứ bắt đầu.',
  };
  const body = `
    <div class="ending-wrap">
      <div class="ending-kicker">BÁO CÁO CUỐI MÙA · 12 NGÀY</div>
      <div class="ending-rank">${rank}</div>
      <div class="ending-title">${titles[rank]}</div>
      <p class="ending-text">${texts[rank]}</p>
      <div class="report-grid" style="margin-top:14px">
        <div class="report-cell"><div class="k">Xu</div><div class="v">◈ ${state.coins}</div></div>
        <div class="report-cell"><div class="k">Thu hoạch</div><div class="v">${state.stats.harvested}</div></div>
        <div class="report-cell"><div class="k">Vật nuôi</div><div class="v">${state.animals.length}</div></div>
        <div class="report-cell"><div class="k">Thư đã đọc</div><div class="v">${state.lettersRead.length}/12</div></div>
      </div>
    </div>`;
  openModal(modalShell({
    title: 'KẾT THÚC',
    kicker: `ĐIỂM MÙA MÀNG · ${endingScore()}`,
    body,
    cls: 'wide ending-modal',
    hideClose: true,
    foot: `
      <button class="pixel-btn primary" data-mact="ending-restart">CHƠI LẠI</button>
      <button class="pixel-btn" data-mact="ending-title">TRANG CHỦ</button>`,
  }), '[data-mact="ending-restart"]');
}

/* --------------------------------------------------------- modal routing -- */

function findProductPrice(key) {
  return PRODUCTS[key] ? PRODUCTS[key].sell : (CROPS[key] ? CROPS[key].sell : 0);
}

function findProductName(key) {
  return PRODUCTS[key] ? PRODUCTS[key].name : (CROPS[key] ? CROPS[key].name : key);
}

function sellProduce(key) {
  const qty = state.inventory.produce[key] || 0;
  if (qty <= 0) return;
  const unit = findProductPrice(key);
  const total = qty * unit;
  state.inventory.produce[key] = 0;
  state.coins += total;
  state.stats.earned = (state.stats.earned || 0) + total;
  state.stats.sold = (state.stats.sold || 0) + qty;
  sfx('coin');
  toast(`Đã bán ${qty} ${findProductName(key)} · +${total} xu`, 'gold');
  checkObjectives();
  updateHUD();
  saveGame(true);
  renderSell();
}

function buySeed(key) {
  const crop = CROPS[key];
  if (!crop || state.coins < crop.seedCost) {
    sfx('error');
    return;
  }
  state.coins -= crop.seedCost;
  state.inventory.seeds[key] = (state.inventory.seeds[key] || 0) + 1;
  sfx('coin');
  toast(`Đã mua 1 hạt ${crop.name.toLowerCase()}.`, 'good');
  updateHUD();
  saveGame(true);
  renderShop('seeds');
}

function buySupply(kind) {
  const price = kind === 'feed' ? 6 : 15;
  if (state.coins < price) {
    sfx('error');
    return;
  }
  state.coins -= price;
  if (kind === 'feed') state.inventory.feed += 1;
  else state.inventory.ration += 1;
  sfx('coin');
  toast(`Đã mua ${kind === 'feed' ? 'thức ăn' : 'khẩu phần'}.`, 'good');
  updateHUD();
  saveGame(true);
  renderShop('supplies');
}

function buyAnimal(type) {
  const cfg = ANIMAL_TYPES[type];
  if (!cfg) return;
  if (state.animals.length >= 8) {
    sfx('error');
    toast('Chuồng đã đầy.', 'warn');
    return;
  }
  if (state.coins < cfg.cost) {
    sfx('error');
    return;
  }
  state.coins -= cfg.cost;
  const names = ANIMAL_NAMES[type] || ['Bạn nhỏ'];
  const name = names[Math.floor(Math.random() * names.length)];
  const variants = type === 'cow' ? ['female', 'male'] : type === 'chicken' ? ['red', 'blonde'] : ['yellow'];
  state.animals.push({
    id: `a${Date.now()}`,
    type,
    variant: variants[Math.floor(Math.random() * variants.length)],
    name,
    x: 430 + Math.random() * 150,
    y: 190 + Math.random() * 110,
    dir: 'right',
    animTime: 0,
    target: null,
    moving: false,
    timer: 1 + Math.random() * 2,
    fed: false,
    productReady: false,
    hearts: 1,
    pettedToday: false,
  });
  sfx('level');
  toast(`${name} đã về chuồng.`, 'good');
  updateHUD();
  saveGame(true);
  renderShop('animals');
}

function buyUpgrade(key) {
  const u = UPGRADES[key];
  if (!u || state.upgrades[key]) return;
  if (state.coins < u.cost) {
    sfx('error');
    return;
  }
  state.coins -= u.cost;
  state.upgrades[key] = true;
  if (key === 'lamp') {
    state.maxEnergy = 120;
    state.energy = Math.min(state.maxEnergy, state.energy + 20);
  }
  sfx('level');
  toast(`Đã mua ${u.name}.`, 'gold');
  updateHUD();
  saveGame(true);
  renderShop('upgrades');
}

els.modal.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-mact], [data-shop-tab], [data-journal-tab], [data-buy-seed], [data-buy-supply], [data-buy-animal], [data-buy-upgrade], [data-sell], [data-letter]');
  if (!btn) return;

  if (btn.dataset.shopTab) { sfx('click'); renderShop(btn.dataset.shopTab); return; }
  if (btn.dataset.journalTab) { sfx('click'); renderJournal(btn.dataset.journalTab); return; }
  if (btn.dataset.buySeed) { buySeed(btn.dataset.buySeed); return; }
  if (btn.dataset.buySupply) { buySupply(btn.dataset.buySupply); return; }
  if (btn.dataset.buyAnimal) { buyAnimal(btn.dataset.buyAnimal); return; }
  if (btn.dataset.buyUpgrade) { buyUpgrade(btn.dataset.buyUpgrade); return; }
  if (btn.dataset.sell) { sellProduce(btn.dataset.sell); return; }
  if (btn.dataset.letter) { openLetter(Number(btn.dataset.letter), 'journal'); return; }

  const act = btn.dataset.mact;
  switch (act) {
    case 'close':
      sfx('close');
      closeModal();
      break;
    case 'intro-start':
      closeModal();
      state.flags.introSeen = true;
      saveGame(true);
      toast('Đi tới ô đất trước mặt và nhấn E để gieo hạt.', 'good');
      break;
    case 'close-letter':
      sfx('close');
      if (letterReturnTo === 'journal') openJournal('letters');
      else closeModal();
      break;
    case 'pause-resume':
      closeModal();
      break;
    case 'pause-save':
      saveGame(false);
      break;
    case 'pause-title':
      closeModal();
      goTitle();
      break;
    case 'sleep-yes':
      closeModal();
      advanceDay(false);
      break;
    case 'report-continue':
      closeModal();
      if (pendingEnding) openEnding();
      break;
    case 'sell-all': {
      let total = 0;
      let count = 0;
      for (const key of Object.keys(state.inventory.produce)) {
        const qty = state.inventory.produce[key] || 0;
        if (qty <= 0) continue;
        total += qty * findProductPrice(key);
        count += qty;
        state.inventory.produce[key] = 0;
      }
      if (total > 0) {
        state.coins += total;
        state.stats.earned += total;
        state.stats.sold += count;
        sfx('coin');
        toast(`Đã bán ${count} nông sản · +${total} xu`, 'gold');
        checkObjectives();
        updateHUD();
        saveGame(true);
      }
      renderSell();
      break;
    }
    case 'ending-restart':
      closeModal();
      startNewGame();
      break;
    case 'ending-title':
      closeModal();
      goTitle();
      break;
    default:
      break;
  }
});

/* =========================================================================
   WORLD LOGIC — movement, actions, day cycle
   ========================================================================= */

const HOUSE_SOLIDS = [
  { x: 0, y: 0, w: 480, h: 96 },
  { x: 0, y: 0, w: 24, h: 272 },
  { x: 456, y: 0, w: 24, h: 272 },
  { x: 0, y: 248, w: 480, h: 24 },
  { x: 60, y: 96, w: 32, h: 32 },
  { x: 260, y: 128, w: 32, h: 32 },
  { x: 380, y: 48, w: 32, h: 48 },
  { x: 140, y: 80, w: 16, h: 16 },
];

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function getSolids() {
  const solids = [
    { x: HOUSE.x, y: HOUSE.y, w: HOUSE.w, h: HOUSE.h },
    { x: BARN.x, y: BARN.y, w: BARN.w, h: BARN.h },
    { x: SHOP_CHEST.x, y: SHOP_CHEST.y, w: SHOP_CHEST.w, h: SHOP_CHEST.h },
    { x: SELL_CHEST.x, y: SELL_CHEST.y, w: SELL_CHEST.w, h: SELL_CHEST.h },
    // pen fence
    { x: PEN.x, y: PEN.y, w: PEN.w, h: 8 },
    { x: PEN.x, y: PEN.y + PEN.h, w: PEN.w, h: 8 },
    { x: PEN.x, y: PEN.y, w: 8, h: PEN.gate.y - PEN.y },
    { x: PEN.x, y: PEN.gate.y + PEN.gate.h, w: 8, h: (PEN.y + PEN.h) - (PEN.gate.y + PEN.gate.h) },
    { x: PEN.x + PEN.w - 16, y: PEN.y, w: 16, h: PEN.h },
  ];
  for (const t of TREES) {
    if (t.kind === 'large') solids.push({ x: t.x + 16, y: t.y + 40, w: 8, h: 8 });
    else if (t.kind === 'medium') solids.push({ x: t.x + 12, y: t.y + 40, w: 8, h: 8 });
  }
  return solids;
}

const FARM_SOLIDS = getSolids();

function playerBox(p) {
  return { x: p.x - 5, y: p.y - 7, w: 10, h: 7 };
}

function collidesAt(x, y) {
  if (scene === 'house') {
    if (x < 28 || x > 452 || y < 102 || y > 244) return true;
    const box = { x: x - 5, y: y - 7, w: 10, h: 7 };
    return HOUSE_SOLIDS.some(s => rectsOverlap(box, s));
  }
  if (x < 8 || x > WORLD_W - 8 || y < 12 || y > WORLD_H - 2) return true;
  const box = { x: x - 5, y: y - 7, w: 10, h: 7 };
  return FARM_SOLIDS.some(s => rectsOverlap(box, s));
}

function snapCameraToPlayer() {
  if (scene === 'house' || scene === 'title') {
    cam.x = 0;
    cam.y = 0;
    return;
  }
  const p = getActivePlayer();
  cam.x = clamp(p.x - VIEW_W / 2, 0, WORLD_W - VIEW_W);
  cam.y = clamp(p.y - VIEW_H / 2, 0, WORLD_H - VIEW_H);
}

function updateCamera(dt) {
  if (scene === 'house') {
    cam.x = 0;
    cam.y = 0;
    return;
  }
  const p = getActivePlayer();
  const tx = clamp(p.x - VIEW_W / 2, 0, WORLD_W - VIEW_W);
  const ty = clamp(p.y - VIEW_H / 2, 0, WORLD_H - VIEW_H);
  const k = Math.min(1, dt * 9);
  cam.x += (tx - cam.x) * k;
  cam.y += (ty - cam.y) * k;
}

function getTargetTile() {
  const p = getActivePlayer();
  const off = p.dir === 'down' ? { x: 0, y: 12 }
    : p.dir === 'up' ? { x: 0, y: -10 }
    : p.dir === 'left' ? { x: -12, y: 2 }
    : { x: 12, y: 2 };
  const tx = Math.floor((p.x + off.x) / TILE);
  const ty = Math.floor((p.y + off.y) / TILE);
  return { tx, ty, x: tx * TILE, y: ty * TILE };
}

function isPenTile(tx, ty) {
  const x = tx * TILE + 8;
  const y = ty * TILE + 8;
  return x >= PEN.x && x < PEN.x + PEN.w && y >= PEN.y && y < PEN.y + PEN.h;
}

function canTill(tx, ty) {
  if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) return false;
  if (isTilled(tx, ty) || getCropAt(tx, ty)) return false;
  const cx = tx * TILE + 8;
  const cy = ty * TILE + 8;
  if (isPathAt(cx, cy)) return false;
  if (isPenTile(tx, ty)) return false;
  const box = { x: tx * TILE + 1, y: ty * TILE + 1, w: TILE - 2, h: TILE - 2 };
  if (FARM_SOLIDS.some(s => rectsOverlap(box, s))) return false;
  return true;
}

function findNearbyAnimal() {
  const p = getActivePlayer();
  let best = null;
  let bestD = Infinity;
  for (const a of state.animals) {
    const range = a.type === 'cow' ? 30 : 22;
    const d = dist(p.x, p.y, a.x, a.y);
    if (d < range && d < bestD) {
      best = a;
      bestD = d;
    }
  }
  return best;
}

function nearHouseDoor() {
  const p = getActivePlayer();
  return dist(p.x, p.y, HOUSE.door.x, HOUSE.door.y) < 25;
}

function nearChest(chest) {
  const p = getActivePlayer();
  return dist(p.x, p.y, chest.x + 8, chest.y + 8) < 23;
}

function nearHouseBed() {
  const p = getActivePlayer();
  return dist(p.x, p.y, 76, 112) < 31;
}
function nearHouseTable() {
  const p = getActivePlayer();
  return dist(p.x, p.y, 276, 144) < 31;
}
function nearFireplace() {
  const p = getActivePlayer();
  return dist(p.x, p.y, 396, 72) < 38;
}
function nearHouseExit() {
  const p = getActivePlayer();
  return dist(p.x, p.y, 240, 240) < 30;
}

function getActionInfo() {
  if (scene === 'house') {
    if (nearHouseBed()) return { label: 'Đi ngủ', action: 'sleep' };
    if (nearHouseTable()) return { label: 'Đọc thư bên bàn', action: 'table' };
    if (nearFireplace()) return { label: state.flags.warmedToday ? 'Sưởi ấm (đã sưởi hôm nay)' : 'Sưởi ấm bên lò', action: 'fire' };
    if (nearHouseExit()) return { label: 'Ra ngoài', action: 'exit' };
    return null;
  }

  if (nearHouseDoor()) return { label: 'Vào nhà', action: 'enter-house' };
  if (nearChest(SHOP_CHEST)) return { label: 'Mở hòm tiếp tế', action: 'shop' };
  if (nearChest(SELL_CHEST)) return { label: 'Gửi hàng đi bán', action: 'sell' };

  const animal = findNearbyAnimal();
  if (animal) {
    const product = ANIMAL_TYPES[animal.type].product;
    if (animal.productReady && product) {
      return { label: `Thu ${product === 'egg' ? 'trứng' : 'sữa'} từ ${animal.name}`, action: 'collect', animal };
    }
    if (!animal.fed) return { label: `Cho ${animal.name} ăn`, action: 'feed', animal };
    if (!animal.pettedToday) return { label: `Vuốt ve ${animal.name}`, action: 'pet', animal };
    return { label: `${animal.name} đang nghỉ`, action: 'rest', animal };
  }

  const t = getTargetTile();
  const crop = getCropAt(t.tx, t.ty);
  if (crop) {
    const stage = cropStage(crop);
    if (stage >= 5) return { label: `Thu hoạch ${CROPS[crop.type].name}`, action: 'harvest', crop };
    if (!crop.watered) return { label: 'Tưới nước', action: 'water', crop };
    return { label: 'Cây đang lớn · ngủ để qua ngày', action: 'wait', crop };
  }

  if (isTilled(t.tx, t.ty)) {
    const seeds = state.inventory.seeds[state.selectedSeed] || 0;
    if (seeds <= 0) return { label: 'Cần hạt giống', action: 'no-seed', locked: true };
    return { label: `Gieo ${CROPS[state.selectedSeed].name}`, action: 'plant' };
  }

  if (canTill(t.tx, t.ty)) return { label: 'Cuốc đất', action: 'till' };
  return null;
}

function spendEnergy(n) {
  if (state.energy < n) {
    toast('Bạn đã kiệt sức. Ăn một khẩu phần hoặc về nhà ngủ.', 'warn');
    sfx('error');
    return false;
  }
  state.energy -= n;
  if (state.energy < 0) state.energy = 0;
  updateHUD();
  return true;
}

function tillTile(t) {
  if (!canTill(t.tx, t.ty)) {
    toast('Không thể cuốc ở đây.', 'warn');
    sfx('error');
    return;
  }
  if (!spendEnergy(4)) return;
  addTilled(t.tx, t.ty);
  state.stats.tilled = (state.stats.tilled || 0) + 1;
  sfx('till');
  spawnParticles(t.x + 8, t.y + 10, '#8a6842', 7);
  if (!state.flags.firstTill) {
    state.flags.firstTill = true;
    toast('Đất đã sẵn sàng. Chọn hạt ở thanh dưới và nhấn E để gieo.', 'good');
  }
  checkObjectives();
  updateHUD();
}

function plantTile(t) {
  if (!isTilled(t.tx, t.ty) || getCropAt(t.tx, t.ty)) {
    toast('Ô này chưa sẵn sàng để gieo.', 'warn');
    sfx('error');
    return;
  }
  const type = state.selectedSeed;
  const seeds = state.inventory.seeds[type] || 0;
  if (seeds <= 0) {
    toast(`Bạn không còn hạt ${CROPS[type].name.toLowerCase()}. Mua thêm ở hòm tiếp tế.`, 'warn');
    sfx('error');
    return;
  }
  if (!spendEnergy(1)) return;
  state.inventory.seeds[type] = seeds - 1;
  state.crops.push({ tx: t.tx, ty: t.ty, type, growth: 0, watered: false });
  state.stats.planted = (state.stats.planted || 0) + 1;
  sfx('plant');
  spawnParticles(t.x + 8, t.y + 12, CROPS[type].color, 5);
  if (!state.flags.firstPlant) {
    state.flags.firstPlant = true;
    toast('Đã gieo hạt. Tưới nước cho cây, rồi về nhà ngủ để qua ngày.', 'good');
  }
  checkObjectives();
  updateHUD();
}

function waterTile(t) {
  const crop = getCropAt(t.tx, t.ty);
  if (!crop) return;
  if (crop.watered) {
    toast('Cây này đã được tưới hôm nay.', 'warn');
    return;
  }
  if (!spendEnergy(1)) return;
  crop.watered = true;
  state.stats.watered = (state.stats.watered || 0) + 1;
  sfx('water');
  spawnParticles(t.x + 8, t.y + 8, '#8ec7d8', 8);
  if (state.upgrades.irrigation) {
    const neighbors = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (const [dx, dy] of neighbors) {
      const other = getCropAt(t.tx + dx, t.ty + dy);
      if (other) other.watered = true;
    }
  }
  if (!state.flags.firstWater) {
    state.flags.firstWater = true;
    toast('Cây sẽ lớn sau khi bạn ngủ. Tưới nước mỗi ngày để cây không ngừng lớn.', 'good');
  }
  checkObjectives();
  updateHUD();
}

function harvestTile(t) {
  const crop = getCropAt(t.tx, t.ty);
  if (!crop) return;
  if (cropStage(crop) < 5) {
    toast('Cây chưa chín. Hãy tưới nước và ngủ thêm.', 'warn');
    return;
  }
  if (!spendEnergy(1)) return;
  const cfg = CROPS[crop.type];
  let amount = 2;
  if (state.upgrades.compost) amount += 1;
  if (state.morale >= 60 && Math.random() < 0.35) amount += 1;
  state.inventory.produce[crop.type] = (state.inventory.produce[crop.type] || 0) + amount;
  state.stats.harvested = (state.stats.harvested || 0) + amount;
  state.morale = clamp(state.morale + 2, 0, 100);
  state.crops = state.crops.filter(c => c !== crop);
  sfx('harvest');
  spawnParticles(t.x + 8, t.y + 8, cfg.color, 9);
  floatText(t.x + 8, t.y - 2, `+${amount} ${cfg.name}`, '#f0c36a');
  if (!state.flags.firstHarvest) {
    state.flags.firstHarvest = true;
    toast('Thu hoạch xong. Mang nông sản tới kho gửi hàng cạnh nhà để bán.', 'good');
  }
  checkObjectives();
  updateHUD();
}

function interactAnimal(a) {
  const cfg = ANIMAL_TYPES[a.type];
  if (a.productReady && cfg.product) {
    const product = PRODUCTS[cfg.product];
    state.inventory.produce[cfg.product] = (state.inventory.produce[cfg.product] || 0) + 1;
    a.productReady = false;
    state.morale = clamp(state.morale + 2, 0, 100);
    sfx('coin');
    spawnParticles(a.x, a.y - 10, product.color, 7);
    floatText(a.x, a.y - 28, `+1 ${product.name}`, '#f0c36a');
    toast(`Đã lấy 1 ${product.name.toLowerCase()} từ ${a.name}.`, 'good');
    updateHUD();
    return;
  }
  if (!a.fed) {
    if (state.inventory.feed <= 0) {
      toast('Bạn cần thức ăn. Mua ở hòm tiếp tế.', 'warn');
      sfx('error');
      return;
    }
    state.inventory.feed -= 1;
    a.fed = true;
    a.hearts = Math.min(5, a.hearts + 0.25);
    state.stats.fed = (state.stats.fed || 0) + 1;
    state.morale = clamp(state.morale + 1, 0, 100);
    sfx(a.type === 'cow' ? 'cow' : 'chicken');
    spawnParticles(a.x, a.y - 8, '#d9a441', 6);
    floatText(a.x, a.y - 26, 'Đã cho ăn', '#f0c36a');
    toast(`${a.name} đã ăn. Hôm sau sẽ có sản phẩm.`, 'good');
    checkObjectives();
    updateHUD();
    return;
  }
  if (!a.pettedToday) {
    a.pettedToday = true;
    a.hearts = Math.min(5, a.hearts + 0.1);
    state.morale = clamp(state.morale + 1, 0, 100);
    sfx('click');
    floatText(a.x, a.y - 26, '+1 tinh thần', '#f0c36a');
    toast(`Bạn vuốt ve ${a.name}. Tinh thần +1.`, 'good');
    updateHUD();
    return;
  }
  toast(`${a.name} đang nghỉ ngơi.`, '');
}

function enterHouse() {
  scene = 'house';
  state.housePlayer.x = 240;
  state.housePlayer.y = 232;
  state.housePlayer.dir = 'up';
  state.housePlayer.moving = false;
  cam.x = 0;
  cam.y = 0;
  sfx('open');
  toast('Trong nhà. Đến bên giường và nhấn E để ngủ.');
}

function exitHouse() {
  scene = 'farm';
  state.player.x = 72;
  state.player.y = 150;
  state.player.dir = 'down';
  state.player.moving = false;
  snapCameraToPlayer();
  sfx('open');
}

function warmByFire() {
  if (state.flags.warmedToday) {
    toast('Bạn đã sưởi ấm hôm nay. Lò vẫn còn ấm.', '');
    return;
  }
  state.flags.warmedToday = true;
  state.morale = clamp(state.morale + 2, 0, 100);
  sfx('click');
  toast('Bạn ngồi bên lò một lúc. Tinh thần +2.', 'good');
  updateHUD();
}

function doAction() {
  if (modalOpen || (scene !== 'farm' && scene !== 'house')) return;
  initAudio();

  if (scene === 'house') {
    if (nearHouseBed()) { sfx('click'); openSleepConfirm(false); return; }
    if (nearHouseTable()) { sfx('click'); openJournal('letters'); return; }
    if (nearFireplace()) { warmByFire(); return; }
    if (nearHouseExit()) { exitHouse(); return; }
    toast('Không có gì để làm ở đây.');
    return;
  }

  if (nearHouseDoor()) { enterHouse(); return; }
  if (nearChest(SHOP_CHEST)) { openShop('seeds'); return; }
  if (nearChest(SELL_CHEST)) { openSell(); return; }

  const animal = findNearbyAnimal();
  if (animal) { interactAnimal(animal); return; }

  const t = getTargetTile();
  const crop = getCropAt(t.tx, t.ty);
  if (crop) {
    const stage = cropStage(crop);
    if (stage >= 5) harvestTile(t);
    else if (!crop.watered) waterTile(t);
    else toast('Cây đang lớn. Về nhà ngủ để qua ngày.', '');
    return;
  }
  if (isTilled(t.tx, t.ty)) { plantTile(t); return; }
  if (canTill(t.tx, t.ty)) { tillTile(t); return; }

  toast('Không có gì để làm ở đây.');
}

function eatRation() {
  if (modalOpen || (scene !== 'farm' && scene !== 'house')) return;
  if (state.inventory.ration <= 0) {
    toast('Bạn đã hết khẩu phần. Mua thêm ở hòm tiếp tế.', 'warn');
    sfx('error');
    return;
  }
  if (state.energy >= state.maxEnergy) {
    toast('Năng lượng đã đầy.', '');
    return;
  }
  state.inventory.ration -= 1;
  state.energy = Math.min(state.maxEnergy, state.energy + 25);
  state.morale = clamp(state.morale + 1, 0, 100);
  sfx('plant');
  toast('Bạn ăn một khẩu phần. Năng lượng +25.', 'good');
  updateHUD();
}

function checkObjectives() {
  let changed = false;
  for (const objective of OBJECTIVES) {
    if (state.claimedObjectives.includes(objective.id)) continue;
    const value = objective.stat === 'day' ? state.day : (state.stats[objective.stat] || 0);
    if (value >= objective.target) {
      state.claimedObjectives.push(objective.id);
      applyReward(objective.reward);
      changed = true;
      sfx('quest');
      toast(`NHIỆM VỤ HOÀN THÀNH: ${objective.text} · ${rewardText(objective.reward)}`, 'gold');
    }
  }
  if (changed) {
    updateHUD();
    saveGame(true);
  }
}

function rollWeather() {
  const r = Math.random();
  if (r < 0.64) return 'clear';
  if (r < 0.89) return 'rain';
  return 'overcast';
}

function advanceDay(auto = false) {
  if (modalOpen) closeModal();
  const before = state.dayStart || {
    coins: state.coins,
    harvested: state.stats.harvested || 0,
    fed: state.stats.fed || 0,
  };

  // crops grow overnight if watered
  for (const crop of state.crops) {
    if (crop.watered) crop.growth += 1;
    crop.watered = false;
  }

  // animals produce if fed
  for (const a of state.animals) {
    const cfg = ANIMAL_TYPES[a.type];
    if (a.fed && cfg.product) {
      a.productReady = true;
      a.hearts = Math.min(5, a.hearts + 0.35);
    } else if (!a.fed) {
      a.hearts = Math.max(0, a.hearts - 0.1);
    }
    a.fed = false;
    a.pettedToday = false;
  }

  state.morale = clamp(state.morale + (auto ? -5 : 4), 0, 100);
  state.day += 1;
  state.time = DAY_START;
  state.weather = rollWeather();
  state.energy = state.maxEnergy;
  state.flags.warmedToday = false;

  let supplyNote = '';
  if (state.day <= 12 && !state.lettersUnlocked.includes(state.day)) {
    state.lettersUnlocked.push(state.day);
  }

  if (state.day === 4 || state.day === 7 || state.day === 10) {
    const seedKeys = SEED_ORDER.filter(k => k !== 'strawberry');
    const reward = {
      feed: 1,
      seeds: {
        [seedKeys[Math.floor(Math.random() * seedKeys.length)]]: 2,
      },
    };
    applyReward(reward);
    supplyNote = `Tiếp tế đến: ${rewardText(reward)}`;
  }

  if (state.weather === 'rain') {
    for (const crop of state.crops) crop.watered = true;
    supplyNote = supplyNote ? `${supplyNote} · Mưa tưới toàn bộ ruộng.` : 'Mưa tưới toàn bộ ruộng.';
  }

  pendingEnding = state.day > 12;
  checkObjectives();
  const summary = {
    coins: state.coins - before.coins,
    harvested: (state.stats.harvested || 0) - before.harvested,
    fed: (state.stats.fed || 0) - before.fed,
  };
  state.dayStart = {
    coins: state.coins,
    harvested: state.stats.harvested || 0,
    fed: state.stats.fed || 0,
  };
  updateHUD();
  saveGame(true);
  sfx('sleep');

  openDayReport(summary);
  if (supplyNote) setTimeout(() => toast(supplyNote, 'gold'), 350);
}

/* =========================================================================
   RENDERING
   ========================================================================= */

function initGround() {
  groundCanvas = document.createElement('canvas');
  groundCanvas.width = WORLD_W;
  groundCanvas.height = WORLD_H;
  const g = groundCanvas.getContext('2d');
  g.imageSmoothingEnabled = false;

  // plain grass tile from the tileset (column 9, row 2)
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      g.drawImage(IMG.grass, 9 * 16, 2 * 16, 16, 16, x * 16, y * 16, 16, 16);
    }
  }

  let seed = 0x5f3759df;
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  // grass tufts
  for (let i = 0; i < 620; i++) {
    const x = Math.floor(rnd() * WORLD_W);
    const y = Math.floor(rnd() * WORLD_H);
    if (isPathAt(x, y)) continue;
    const px = Math.floor(x / 16) * 16;
    const py = Math.floor(y / 16) * 16;
    if (px >= PEN.x && px < PEN.x + PEN.w && py >= PEN.y && py < PEN.y + PEN.h) continue;
    g.fillStyle = rnd() > 0.5 ? '#68a94a' : '#8acb60';
    g.fillRect(x, y, 1, 2);
    g.fillRect(x + 2, y + 1, 1, 2);
    if (rnd() > 0.55) g.fillRect(x + 1, y - 1, 1, 1);
  }

  // small wildflowers
  for (let i = 0; i < 110; i++) {
    const x = Math.floor(rnd() * (WORLD_W - 4)) + 2;
    const y = Math.floor(rnd() * (WORLD_H - 6)) + 4;
    if (isPathAt(x, y)) continue;
    if (x >= PEN.x && x < PEN.x + PEN.w && y >= PEN.y && y < PEN.y + PEN.h) continue;
    g.fillStyle = '#527d3d';
    g.fillRect(x, y + 1, 1, 2);
    const color = rnd() > 0.7 ? '#f0e6c8' : (rnd() > 0.5 ? '#f0c36a' : '#d97a6b');
    g.fillStyle = color;
    g.fillRect(x - 1, y, 1, 1);
    g.fillRect(x + 1, y, 1, 1);
    g.fillRect(x, y - 1, 1, 1);
    g.fillRect(x, y + 1, 1, 1);
  }

  // paths
  for (const r of PATH_RECTS) {
    g.fillStyle = '#b59768';
    g.fillRect(r.x, r.y, r.w, r.h);
    g.fillStyle = '#96784f';
    g.fillRect(r.x, r.y, r.w, 1);
    g.fillRect(r.x, r.y + r.h - 1, r.w, 1);
    g.fillRect(r.x, r.y, 1, r.h);
    g.fillRect(r.x + r.w - 1, r.y, 1, r.h);
    // dirt speckles
    for (let i = 0; i < Math.floor(r.w * r.h / 45); i++) {
      const sx = r.x + 2 + Math.floor(rnd() * (r.w - 4));
      const sy = r.y + 2 + Math.floor(rnd() * (r.h - 4));
      g.fillStyle = rnd() > 0.5 ? '#a68559' : '#c4a778';
      g.fillRect(sx, sy, 1, 1);
    }
  }

  // a few path stones
  const stones = [
    [84, 148], [146, 151], [232, 147], [318, 150], [460, 146], [510, 151],
    [390, 190], [390, 220], [390, 248],
  ];
  for (const [sx, sy] of stones) {
    g.fillStyle = '#7d745d';
    g.fillRect(sx, sy, 4, 3);
    g.fillStyle = '#9b9479';
    g.fillRect(sx + 1, sy, 2, 1);
  }

  // field sign
  g.fillStyle = '#5d4029';
  g.fillRect(122, 184, 3, 17);
  g.fillStyle = '#8a6842';
  g.fillRect(110, 174, 27, 12);
  g.fillStyle = '#5d4029';
  g.fillRect(110, 174, 27, 1);
  g.fillRect(110, 185, 27, 1);
  g.fillStyle = '#d9a441';
  g.fillRect(115, 178, 3, 3);
  g.fillRect(121, 178, 3, 3);
  g.fillRect(127, 178, 3, 3);
  g.fillStyle = '#c7b98f';
  g.fillRect(114, 182, 18, 1);

  // pen interior gets a faint worn patch
  g.fillStyle = 'rgba(110, 92, 57, 0.12)';
  g.fillRect(PEN.inner.x, PEN.inner.y, PEN.inner.w, PEN.inner.h);
}

function drawShadow(x, y, w, h, alpha = 0.18) {
  ctx.save();
  ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
  ctx.beginPath();
  ctx.ellipse(x, y, w, h, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawTargetHighlight(cx, cy) {
  if (scene !== 'farm' || modalOpen || !targetInfo) return;
  const t = getTargetTile();
  const x = t.tx * TILE - cx;
  const y = t.ty * TILE - cy;
  const locked = targetInfo.locked;
  ctx.save();
  ctx.fillStyle = locked ? 'rgba(201, 107, 79, 0.10)' : 'rgba(240, 195, 106, 0.08)';
  ctx.fillRect(x, y, 16, 16);
  ctx.strokeStyle = locked ? 'rgba(201, 107, 79, 0.8)' : 'rgba(240, 195, 106, 0.85)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, 15, 15);
  ctx.fillStyle = locked ? '#c96b4f' : '#f0c36a';
  const c = 3;
  ctx.fillRect(x - 1, y - 1, c, 1);
  ctx.fillRect(x - 1, y - 1, 1, c);
  ctx.fillRect(x + 16 - c + 1, y - 1, c, 1);
  ctx.fillRect(x + 16, y - 1, 1, c);
  ctx.fillRect(x - 1, y + 16, c, 1);
  ctx.fillRect(x - 1, y + 16 - c + 1, 1, c);
  ctx.fillRect(x + 16 - c + 1, y + 16, c, 1);
  ctx.fillRect(x + 16, y + 16 - c + 1, 1, c);
  ctx.restore();
}

function drawTilled(cx, cy) {
  if (!state.tilled.length) return;
  for (const key of state.tilled) {
    const { x: tx, y: ty } = parseTile(key);
    if (tx * TILE < cx - 16 || tx * TILE > cx + VIEW_W || ty * TILE < cy - 16 || ty * TILE > cy + VIEW_H) continue;
    const x = tx * TILE - cx;
    const y = ty * TILE - cy;
    const crop = getCropAt(tx, ty);
    const watered = crop && crop.watered;
    ctx.fillStyle = watered ? '#55381f' : '#775534';
    ctx.fillRect(x + 1, y + 2, 14, 12);
    ctx.fillStyle = watered ? '#3f2818' : '#5d4027';
    ctx.fillRect(x + 1, y + 12, 14, 2);
    ctx.fillStyle = watered ? '#674729' : '#8a6842';
    ctx.fillRect(x + 3, y + 5, 10, 1);
    ctx.fillRect(x + 3, y + 8, 10, 1);
    if (!crop) {
      ctx.fillStyle = '#573f28';
      ctx.fillRect(x + 5, y + 10, 2, 1);
      ctx.fillRect(x + 10, y + 6, 1, 1);
    }
    if (watered) {
      ctx.fillStyle = 'rgba(142, 199, 216, 0.5)';
      ctx.fillRect(x + 12, y + 4, 1, 1);
      ctx.fillRect(x + 3, y + 9, 1, 1);
    }
  }
}

function drawCrop(crop, cx, cy) {
  const stage = cropStage(crop);
  const cfg = CROPS[crop.type];
  const x = crop.tx * TILE - cx;
  const y = crop.ty * TILE - cy;
  ctx.drawImage(IMG.crops, stage * 16, cfg.row * 16, 16, 16, x, y, 16, 16);
  if (stage >= 5) {
    const t = performance.now() / 380 + crop.tx * 0.7 + crop.ty;
    const sparkleY = y - 2 + Math.round(Math.sin(t) * 1);
    ctx.fillStyle = '#f0c36a';
    ctx.fillRect(x + 7, sparkleY, 2, 1);
    ctx.fillRect(x + 8, sparkleY - 1, 1, 3);
    ctx.fillStyle = 'rgba(240, 195, 106, 0.35)';
    ctx.fillRect(x + 6, sparkleY + 2, 4, 1);
  }
}

function drawTree(tree, cx, cy) {
  const src = tree.kind === 'large' ? { x: 96, y: 0, w: 40, h: 48 }
    : tree.kind === 'medium' ? { x: 64, y: 0, w: 32, h: 48 }
    : tree.kind === 'sapling' ? { x: 48, y: 32, w: 16, h: 16 }
    : { x: 16, y: 32, w: 16, h: 16 };
  const x = tree.x - cx;
  const y = tree.y - cy;
  drawShadow(x + src.w / 2, y + src.h - 3, src.w * 0.32, 4, 0.16);
  ctx.drawImage(IMG.trees, src.x, src.y, src.w, src.h, x, y, src.w, src.h);
}

function drawHouse(cx, cy) {
  const x = HOUSE.x - cx;
  const y = HOUSE.y - cy;
  drawShadow(x + 40, y + HOUSE.h - 4, 35, 4, 0.2);
  ctx.drawImage(IMG.house, 144, 0, 80, 112, x, y, 80, 112);
  // doorstep
  ctx.fillStyle = '#8f7048';
  ctx.fillRect(x + 36, y + 105, 8, 4);
  ctx.fillStyle = '#b59768';
  ctx.fillRect(x + 37, y + 106, 6, 2);
}

function drawBarn(cx, cy) {
  const x = BARN.x - cx;
  const y = BARN.y - cy;
  drawShadow(x + 40, y + BARN.h - 3, 34, 4, 0.18);
  ctx.drawImage(IMG.house, 0, 0, 80, 96, x, y, 80, 96);
}

function drawChest(chest, cx, cy) {
  const x = chest.x - cx;
  const y = chest.y - cy;
  drawShadow(x + 8, y + 15, 8, 2, 0.18);
  const frameY = chest.kind === 'sell' ? 16 : 0;
  ctx.drawImage(IMG.chest, 0, frameY, 16, 16, x, y, 16, 16);
  ctx.fillStyle = chest.kind === 'sell' ? '#f0c36a' : '#9ec7b2';
  ctx.fillRect(x + 6, y - 5, 4, 1);
  ctx.fillRect(x + 7, y - 4, 2, 3);
}

function drawFencePiece(x, y, srcX, srcY, cx, cy) {
  ctx.drawImage(IMG.fence, srcX * 16, srcY * 16, 16, 16, x - cx, y - cy, 16, 16);
}

function drawFence(cx, cy) {
  // top and bottom rails
  for (let i = 0; i < 13; i++) {
    const sx = i === 0 ? 0 : i === 12 ? 2 : 1;
    drawFencePiece(PEN.x + i * 16, PEN.y, sx, 0, cx, cy);
    drawFencePiece(PEN.x + i * 16, PEN.y + PEN.h, sx, 2, cx, cy);
  }
  // left side, with a gate gap
  for (let i = 1; i < 9; i++) {
    const y = PEN.y + i * 16;
    if (y >= PEN.gate.y && y < PEN.gate.y + PEN.gate.h) continue;
    drawFencePiece(PEN.x, y, 0, 1, cx, cy);
  }
  // right side
  for (let i = 1; i < 9; i++) {
    drawFencePiece(PEN.x + PEN.w - 16, PEN.y + i * 16, 2, 1, cx, cy);
  }
  // gate posts
  drawFencePiece(PEN.x, PEN.gate.y - 8, 0, 1, cx, cy);
  drawFencePiece(PEN.x, PEN.gate.y + PEN.gate.h - 8, 0, 1, cx, cy);
}

function drawAnimal(a, cx, cy) {
  const isCow = a.type === 'cow';
  const isChick = a.type === 'chick';
  const sprite = isCow ? (a.variant === 'male' ? IMG.cow_male : IMG.cow_female)
    : isChick ? IMG.chicken_baby
    : a.variant === 'blonde' ? IMG.chicken_blonde : IMG.chicken_red;

  let row = 0;
  if (isCow) {
    if (a.dir === 'down') row = 1;
    else if (a.dir === 'up') row = 2;
    else row = 0;
  } else {
    row = 0;
  }
  const flip = a.dir === 'left';
  const frames = 4;
  const frame = Math.floor(a.animTime * (a.moving ? 6 : 3)) % frames;
  const w = isCow ? 32 : 16;
  const h = isCow ? 32 : 16;
  const dx = a.x - (isCow ? 16 : 8) - cx;
  const dy = a.y - (isCow ? 26 : 13) - cy;

  drawShadow(a.x - cx, a.y - 2 - cy, isCow ? 13 : 6, isCow ? 4 : 2.5, 0.18);

  ctx.save();
  if (flip) {
    ctx.translate(dx + w, dy);
    ctx.scale(-1, 1);
    ctx.drawImage(sprite, frame * w, row * h, w, h, 0, 0, w, h);
  } else {
    ctx.drawImage(sprite, frame * w, row * h, w, h, dx, dy, w, h);
  }
  ctx.restore();

  if (a.productReady && !isChick) {
    const ix = a.x - cx;
    const iy = a.y - (isCow ? 34 : 22) - cy;
    ctx.fillStyle = '#f0c36a';
    ctx.fillRect(ix - 1, iy, 2, 5);
    ctx.fillRect(ix - 1, iy + 6, 2, 2);
    ctx.fillStyle = 'rgba(10, 12, 6, 0.35)';
    ctx.fillRect(ix - 2, iy + 1, 1, 4);
  }
}

function drawPlayerSprite(p, cx, cy) {
  const row = p.dir === 'down' ? 0 : p.dir === 'up' ? 1 : 2;
  const flip = p.dir === 'left';
  const set = p.moving ? IMG.player_walk : IMG.player_idle;
  const frames = p.moving ? 6 : 4;
  const speed = p.moving ? 10 : 4;
  const frame = Math.floor(p.animTime * speed) % frames;
  const dx = Math.round(p.x - 16 - cx);
  const dy = Math.round(p.y - 30 - cy);

  drawShadow(p.x - cx, p.y - 1 - cy, 7, 3, 0.22);
  ctx.save();
  if (flip) {
    ctx.translate(dx + 32, dy);
    ctx.scale(-1, 1);
    ctx.drawImage(set, frame * 32, row * 32, 32, 32, 0, 0, 32, 32);
  } else {
    ctx.drawImage(set, frame * 32, row * 32, 32, 32, dx, dy, 32, 32);
  }
  ctx.restore();
}

function getDrawables(cx, cy) {
  const list = [];

  for (const tree of TREES) {
    if (tree.x + 48 < cx || tree.x > cx + VIEW_W || tree.y + 48 < cy || tree.y > cy + VIEW_H) continue;
    list.push({ y: tree.y + (tree.kind === 'sapling' ? 16 : 48), draw: () => drawTree(tree, cx, cy) });
  }

  for (const crop of state.crops) {
    const x = crop.tx * TILE;
    const y = crop.ty * TILE;
    if (x < cx - 16 || x > cx + VIEW_W || y < cy - 16 || y > cy + VIEW_H) continue;
    list.push({ y: y + 16, draw: () => drawCrop(crop, cx, cy) });
  }

  list.push({ y: HOUSE.y + HOUSE.h, draw: () => drawHouse(cx, cy) });
  list.push({ y: BARN.y + BARN.h, draw: () => drawBarn(cx, cy) });
  list.push({ y: SHOP_CHEST.y + 16, draw: () => drawChest(SHOP_CHEST, cx, cy) });
  list.push({ y: SELL_CHEST.y + 16, draw: () => drawChest(SELL_CHEST, cx, cy) });

  // fence in depth order
  for (let i = 0; i < 13; i++) {
    const x = PEN.x + i * 16;
    const sx = i === 0 ? 0 : i === 12 ? 2 : 1;
    list.push({ y: PEN.y + 16, draw: () => drawFencePiece(x, PEN.y, sx, 0, cx, cy) });
    list.push({ y: PEN.y + PEN.h + 16, draw: () => drawFencePiece(x, PEN.y + PEN.h, sx, 2, cx, cy) });
  }
  for (let i = 1; i < 9; i++) {
    const y = PEN.y + i * 16;
    if (!(y >= PEN.gate.y && y < PEN.gate.y + PEN.gate.h)) {
      list.push({ y: y + 16, draw: () => drawFencePiece(PEN.x, y, 0, 1, cx, cy) });
    }
    list.push({ y: y + 16, draw: () => drawFencePiece(PEN.x + PEN.w - 16, y, 2, 1, cx, cy) });
  }
  list.push({ y: PEN.gate.y + 8, draw: () => drawFencePiece(PEN.x, PEN.gate.y - 8, 0, 1, cx, cy) });
  list.push({ y: PEN.gate.y + PEN.gate.h + 8, draw: () => drawFencePiece(PEN.x, PEN.gate.y + PEN.gate.h - 8, 0, 1, cx, cy) });

  for (const a of state.animals) {
    list.push({ y: a.y, draw: () => drawAnimal(a, cx, cy) });
  }

  const p = getActivePlayer();
  list.push({ y: p.y, draw: () => drawPlayerSprite(p, cx, cy) });

  return list.sort((a, b) => a.y - b.y);
}

function timeTintColor() {
  const t = scene === 'title' ? titlePreviewTime : scene === 'ending' ? 19 * 60 + 20 : state.time;
  const stops = [
    { t: 360, c: [255, 168, 92], a: 0.10 },
    { t: 480, c: [255, 255, 255], a: 0.0 },
    { t: 1020, c: [255, 255, 255], a: 0.0 },
    { t: 1140, c: [235, 130, 70], a: 0.11 },
    { t: 1260, c: [30, 40, 80], a: 0.22 },
    { t: 1560, c: [10, 15, 35], a: 0.38 },
  ];
  let a = stops[0];
  let b = stops[stops.length - 1];
  for (let i = 0; i < stops.length - 1; i++) {
    if (t >= stops[i].t && t <= stops[i + 1].t) {
      a = stops[i];
      b = stops[i + 1];
      break;
    }
  }
  const span = b.t - a.t || 1;
  const k = clamp((t - a.t) / span, 0, 1);
  return {
    color: `rgb(${Math.round(a.c[0] + (b.c[0] - a.c[0]) * k)}, ${Math.round(a.c[1] + (b.c[1] - a.c[1]) * k)}, ${Math.round(a.c[2] + (b.c[2] - a.c[2]) * k)})`,
    alpha: a.a + (b.a - a.a) * k,
  };
}

function drawFarmLight(cx, cy) {
  const tint = timeTintColor();
  if (tint.alpha > 0.01) {
    ctx.save();
    ctx.globalAlpha = tint.alpha;
    ctx.fillStyle = tint.color;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.restore();
  }

  const time = scene === 'title' ? titlePreviewTime : state.time;
  if (time >= 17 * 60 || time < 6 * 60) {
    const hx = HOUSE.door.x - cx;
    const hy = HOUSE.door.y - 24 - cy;
    const glow = ctx.createRadialGradient(hx, hy, 2, hx, hy, 34);
    glow.addColorStop(0, 'rgba(255, 196, 92, 0.22)');
    glow.addColorStop(1, 'rgba(255, 196, 92, 0)');
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = glow;
    ctx.fillRect(hx - 40, hy - 40, 80, 80);
    ctx.restore();
    // warm window pixels
    ctx.fillStyle = 'rgba(255, 206, 111, 0.8)';
    ctx.fillRect(HOUSE.x - cx + 52, HOUSE.y - cy + 62, 3, 4);
    ctx.fillRect(HOUSE.x - cx + 64, HOUSE.y - cy + 62, 3, 4);
  }

  if (state.weather === 'overcast' && scene === 'farm') {
    ctx.fillStyle = 'rgba(120, 130, 115, 0.08)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }
}

function drawRain() {
  if (state.weather !== 'rain' || scene !== 'farm') return;
  ctx.save();
  ctx.strokeStyle = 'rgba(185, 220, 225, 0.42)';
  ctx.lineWidth = 1;
  for (const d of rainDrops) {
    ctx.beginPath();
    ctx.moveTo(Math.round(d.x), Math.round(d.y));
    ctx.lineTo(Math.round(d.x) + 1, Math.round(d.y + d.len));
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(30, 55, 62, 0.10)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.restore();
}

function drawFireflies() {
  if (!isNightTime() && scene !== 'title' && scene !== 'ending') return;
  const now = performance.now() / 900;
  ctx.save();
  for (const f of fireflies) {
    const x = f.x - cam.x + Math.sin(now + f.phase) * 4;
    const y = f.y - cam.y + Math.cos(now * 0.7 + f.phase) * 3;
    const a = 0.35 + 0.35 * Math.sin(now * 2 + f.phase);
    ctx.globalAlpha = a;
    ctx.fillStyle = '#f6dc84';
    ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
    if (a > 0.55) {
      ctx.fillStyle = 'rgba(246, 220, 132, 0.22)';
      ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, 3, 3);
    }
  }
  ctx.restore();
}

function drawParticles(cx, cy) {
  ctx.save();
  for (const p of particles) {
    const a = clamp(p.life / p.maxLife, 0, 1);
    ctx.globalAlpha = a;
    ctx.fillStyle = p.color;
    ctx.fillRect(Math.round(p.x - cx), Math.round(p.y - cy), p.size, p.size);
  }
  ctx.restore();
}

function drawFloatTexts(cx, cy) {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 11px "VT323", "Courier New", monospace';
  for (const f of floatTexts) {
    const a = clamp(f.life / f.maxLife, 0, 1);
    ctx.globalAlpha = a;
    const x = Math.round(f.x - cx);
    const y = Math.round(f.y - cy);
    ctx.fillStyle = 'rgba(8, 10, 5, 0.75)';
    ctx.fillText(f.text, x + 1, y + 1);
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, x, y);
  }
  ctx.restore();
}

function drawEndingMotes() {
  if (scene !== 'ending') return;
  const now = performance.now() / 1200;
  ctx.save();
  for (let i = 0; i < 18; i++) {
    const x = (i * 97 + Math.sin(now + i) * 12) % VIEW_W;
    const y = (i * 53 + Math.cos(now * 0.8 + i) * 8) % (VIEW_H * 0.7);
    ctx.globalAlpha = 0.25 + 0.2 * Math.sin(now * 2 + i);
    ctx.fillStyle = '#f0c36a';
    ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
  }
  ctx.restore();
}

function renderFarm() {
  const cx = Math.round(cam.x);
  const cy = Math.round(cam.y);
  if (groundCanvas) {
    ctx.drawImage(groundCanvas, cx, cy, VIEW_W, VIEW_H, 0, 0, VIEW_W, VIEW_H);
  }
  drawTilled(cx, cy);
  drawTargetHighlight(cx, cy);

  const drawables = getDrawables(cx, cy);
  for (const d of drawables) d.draw();

  drawFarmLight(cx, cy);
  drawRain();
  drawFireflies();
  drawEndingMotes();
  drawParticles(cx, cy);
  drawFloatTexts(cx, cy);
}

function renderHouse() {
  // wall
  ctx.fillStyle = '#29331f';
  ctx.fillRect(0, 0, VIEW_W, 96);
  ctx.fillStyle = '#334026';
  for (let x = 0; x < VIEW_W; x += 16) ctx.fillRect(x, 0, 1, 96);
  ctx.fillStyle = '#1b2314';
  ctx.fillRect(0, 88, VIEW_W, 8);
  ctx.fillStyle = '#12180d';
  ctx.fillRect(0, 0, VIEW_W, 7);

  // floor
  ctx.fillStyle = '#6b472b';
  ctx.fillRect(0, 96, VIEW_W, VIEW_H - 96);
  for (let y = 96; y < VIEW_H; y += 16) {
    ctx.fillStyle = (Math.floor(y / 16) % 2 === 0) ? '#765031' : '#6b472b';
    ctx.fillRect(0, y, VIEW_W, 16);
    ctx.fillStyle = '#4f321f';
    ctx.fillRect(0, y, VIEW_W, 1);
    for (let x = (y / 16) % 2 ? 24 : 0; x < VIEW_W; x += 48) {
      ctx.fillStyle = 'rgba(50, 32, 18, 0.55)';
      ctx.fillRect(x, y + 1, 1, 15);
    }
    if (y % 32 === 0) {
      ctx.fillStyle = 'rgba(255, 205, 135, 0.035)';
      ctx.fillRect(0, y + 2, VIEW_W, 1);
    }
  }

  // rug
  ctx.drawImage(IMG.interior, 0, 64, 64, 48, 200, 164, 64, 48);

  // wall decor
  ctx.drawImage(IMG.interior, 0, 32, 32, 32, 176, 18, 32, 32); // window
  ctx.drawImage(IMG.interior, 16, 0, 16, 16, 300, 24, 16, 16); // picture
  ctx.drawImage(IMG.interior, 0, 0, 16, 16, 100, 52, 16, 16); // plant
  ctx.drawImage(IMG.interior, 0, 16, 16, 16, 120, 24, 16, 16); // clock

  // door
  ctx.drawImage(IMG.interior, 144, 0, 32, 32, 224, 224, 32, 32);

  // fireplace glow
  const flicker = 0.16 + Math.sin(performance.now() / 130) * 0.025;
  const glow = ctx.createRadialGradient(396, 80, 2, 396, 80, 64);
  glow.addColorStop(0, `rgba(255, 172, 74, ${flicker})`);
  glow.addColorStop(1, 'rgba(255, 150, 50, 0)');
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = glow;
  ctx.fillRect(320, 12, 160, 150);
  ctx.restore();

  const p = state.housePlayer;
  const drawables = [
    { y: 96, draw: () => ctx.drawImage(IMG.interior, 112, 0, 32, 48, 380, 48, 32, 48) },
    { y: 96, draw: () => ctx.drawImage(IMG.interior, 96, 128, 16, 16, 140, 80, 16, 16) },
    { y: 128, draw: () => ctx.drawImage(IMG.interior, 80, 0, 32, 32, 60, 96, 32, 32) },
    { y: 148, draw: () => ctx.drawImage(IMG.interior, 16, 112, 16, 16, 236, 132, 16, 16) },
    { y: 148, draw: () => ctx.drawImage(IMG.interior, 32, 112, 16, 16, 296, 132, 16, 16) },
    { y: 160, draw: () => ctx.drawImage(IMG.interior, 64, 112, 32, 32, 260, 128, 32, 32) },
    { y: p.y, draw: () => drawPlayerSprite(p, 0, 0) },
  ].sort((a, b) => a.y - b.y);
  for (const d of drawables) d.draw();

  // letter on table if unread
  if (state.lettersUnlocked.some(d => !state.lettersRead.includes(d))) {
    ctx.fillStyle = '#f1e7c8';
    ctx.fillRect(272, 136, 9, 5);
    ctx.fillStyle = '#b8a97e';
    ctx.fillRect(272, 137, 9, 1);
  }

  // warm interior light
  ctx.fillStyle = 'rgba(255, 180, 105, 0.045)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  drawParticles(0, 0);
  drawFloatTexts(0, 0);
}

function render() {
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  ctx.imageSmoothingEnabled = false;
  if (scene === 'house') {
    renderHouse();
  } else {
    renderFarm();
  }
}

/* =========================================================================
   UPDATE, INPUT, BOOT
   ========================================================================= */

function resetJoystickVisual() {
  joystick.active = false;
  joystick.x = 0;
  joystick.y = 0;
  joystick.pointerId = null;
  if (els.joystickKnob) els.joystickKnob.style.transform = 'translate(0px, 0px)';
}

function floatText(x, y, text, color = '#f0c36a') {
  floatTexts.push({ x, y, text, color, life: 1, maxLife: 1 });
}

function spawnParticles(x, y, color, count = 6) {
  for (let i = 0; i < count; i++) {
    particles.push({
      x: x + (Math.random() - 0.5) * 6,
      y: y + (Math.random() - 0.5) * 4,
      vx: (Math.random() - 0.5) * 24,
      vy: -12 - Math.random() * 24,
      life: 0.45 + Math.random() * 0.4,
      maxLife: 0.85,
      color,
      size: Math.random() > 0.5 ? 2 : 1,
    });
  }
}

function initRain() {
  rainDrops = Array.from({ length: 90 }, () => ({
    x: Math.random() * VIEW_W,
    y: Math.random() * VIEW_H,
    len: 3 + Math.random() * 5,
    speed: 150 + Math.random() * 100,
  }));
}

function initFireflies() {
  fireflies = Array.from({ length: 24 }, () => ({
    x: Math.random() * WORLD_W,
    y: 80 + Math.random() * (WORLD_H - 160),
    phase: Math.random() * Math.PI * 2,
  }));
}

function updateRain(dt) {
  if (state.weather !== 'rain' || scene !== 'farm') return;
  for (const d of rainDrops) {
    d.y += d.speed * dt;
    d.x += 12 * dt;
    if (d.y > VIEW_H + 6) {
      d.y = -8;
      d.x = Math.random() * VIEW_W;
    }
    if (d.x > VIEW_W + 4) d.x = -4;
  }
}

function updateParticles(dt) {
  for (const p of particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 62 * dt;
    p.life -= dt;
  }
  particles = particles.filter(p => p.life > 0);
  for (const f of floatTexts) {
    f.y -= 16 * dt;
    f.life -= dt;
  }
  floatTexts = floatTexts.filter(f => f.life > 0);
}

function updatePlayer(dt) {
  if (scene !== 'farm' && scene !== 'house') return;
  const p = getActivePlayer();
  let dx = 0;
  let dy = 0;
  if (keys.KeyW || keys.ArrowUp) dy -= 1;
  if (keys.KeyS || keys.ArrowDown) dy += 1;
  if (keys.KeyA || keys.ArrowLeft) dx -= 1;
  if (keys.KeyD || keys.ArrowRight) dx += 1;
  if (joystick.active) {
    dx += joystick.x;
    dy += joystick.y;
  }
  if (Math.abs(dx) < 0.12) dx = 0;
  if (Math.abs(dy) < 0.12) dy = 0;

  let len = Math.hypot(dx, dy);
  if (len > 1) {
    dx /= len;
    dy /= len;
    len = 1;
  }

  if (len > 0.05) {
    p.moving = true;
    if (Math.abs(dx) > Math.abs(dy)) p.dir = dx < 0 ? 'left' : 'right';
    else p.dir = dy < 0 ? 'up' : 'down';

    const speed = scene === 'house' ? 58 : 63;
    const nx = p.x + dx * speed * dt;
    if (!collidesAt(nx, p.y)) p.x = nx;
    const ny = p.y + dy * speed * dt;
    if (!collidesAt(p.x, ny)) p.y = ny;
    p.animTime += dt;
  } else {
    p.moving = false;
    p.animTime += dt * 0.55;
  }
}

function updateAnimals(dt) {
  const bx = PEN.inner.x + 8;
  const by = PEN.inner.y + 8;
  const bw = PEN.inner.w - 16;
  const bh = PEN.inner.h - 16;

  for (const a of state.animals) {
    a.animTime += dt;
    if (!a.moving) {
      a.timer -= dt;
      if (a.timer <= 0) {
        a.target = {
          x: bx + Math.random() * bw,
          y: by + Math.random() * bh,
        };
        a.moving = true;
      }
      continue;
    }
    if (!a.target) {
      a.moving = false;
      a.timer = 1 + Math.random() * 2;
      continue;
    }
    const dx = a.target.x - a.x;
    const dy = a.target.y - a.y;
    const d = Math.hypot(dx, dy);
    const speed = ANIMAL_TYPES[a.type] ? ANIMAL_TYPES[a.type].speed : 10;
    const step = speed * dt;
    if (d <= step || d < 0.5) {
      a.x = clamp(a.target.x, bx, bx + bw);
      a.y = clamp(a.target.y, by, by + bh);
      a.moving = false;
      a.target = null;
      a.timer = 1.2 + Math.random() * 3.2;
      continue;
    }
    a.x += (dx / d) * step;
    a.y += (dy / d) * step;
    if (Math.abs(dx) > Math.abs(dy)) a.dir = dx < 0 ? 'left' : 'right';
    else a.dir = dy < 0 ? 'up' : 'down';
  }
}

function updateTime(dt) {
  state.time += dt * TIME_SPEED;
  if (state.time >= DAY_END) {
    state.time = DAY_END;
    advanceDay(true);
    return;
  }
  hudTimer += dt;
  if (hudTimer >= 0.18) {
    hudTimer = 0;
    updateHUD();
  }
  autosaveTimer += dt;
  if (autosaveTimer >= 28) {
    autosaveTimer = 0;
    saveGame(true);
  }
}

function update(dt) {
  if (scene === 'title') {
    updateAnimals(dt);
    updateParticles(dt);
    return;
  }
  if (scene === 'ending') {
    updateAnimals(dt);
    updateParticles(dt);
    return;
  }
  if (modalOpen) return;

  updatePlayer(dt);
  updateAnimals(dt);
  updateTime(dt);
  if (modalOpen) return;
  updateCamera(dt);
  updateRain(dt);
  updateParticles(dt);
  updatePrompt();
}

function loop(ts) {
  if (!lastFrame) lastFrame = ts;
  const dt = Math.min(0.05, Math.max(0, (ts - lastFrame) / 1000));
  lastFrame = ts;
  update(dt);
  render();
  requestAnimationFrame(loop);
}

/* ----------------------------------------------------------------- input -- */

const MOVE_CODES = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);

function cycleSeed() {
  const i = SEED_ORDER.indexOf(state.selectedSeed);
  selectSeed(SEED_ORDER[(i + 1) % SEED_ORDER.length]);
}

function handleKeyDown(e) {
  if (MOVE_CODES.has(e.code)) {
    keys[e.code] = true;
    e.preventDefault();
  }

  if (e.code === 'Escape') {
    e.preventDefault();
    if (scene === 'ending') return;
    if (modalOpen) {
      closeModal();
      sfx('close');
    } else if (scene === 'farm' || scene === 'house') {
      openPause();
    }
    return;
  }

  if (modalOpen) return;

  if (scene === 'title') {
    if (e.code === 'Enter' || e.code === 'Space') {
      e.preventDefault();
      initAudio();
      if (hasSave()) continueGame();
      else startNewGame();
    }
    return;
  }
  if (scene === 'ending') return;

  if (e.code === 'KeyE' || e.code === 'Space') {
    e.preventDefault();
    if (!e.repeat) doAction();
    return;
  }
  if (e.code === 'KeyJ') {
    e.preventDefault();
    openJournal(journalTab || 'quests');
    return;
  }
  if (e.code === 'KeyR') {
    e.preventDefault();
    eatRation();
    return;
  }
  if (e.code === 'KeyM') {
    toggleSound();
    return;
  }
  if (e.code === 'KeyQ') {
    cycleSeed();
    return;
  }
  if (e.code === 'Digit1') { selectSeed(SEED_ORDER[0]); return; }
  if (e.code === 'Digit2') { selectSeed(SEED_ORDER[1]); return; }
  if (e.code === 'Digit3') { selectSeed(SEED_ORDER[2]); return; }
  if (e.code === 'Digit4') { selectSeed(SEED_ORDER[3]); return; }
  if (e.code === 'Digit5') {
    sfx('click');
    toast(`Thức ăn còn ${state.inventory.feed}. Nhấn E gần vật nuôi để cho ăn.`);
  }
}

function handleKeyUp(e) {
  if (MOVE_CODES.has(e.code)) {
    keys[e.code] = false;
    e.preventDefault();
  }
}

function setupJoystick() {
  const base = els.joystick;
  const knob = els.joystickKnob;
  if (!base || !knob) return;
  let rect = null;
  let max = 32;

  const move = (e) => {
    if (!rect) return;
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = e.clientX - cx;
    let dy = e.clientY - cy;
    const len = Math.hypot(dx, dy);
    if (len > max) {
      dx = (dx / len) * max;
      dy = (dy / len) * max;
    }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    joystick.x = dx / max;
    joystick.y = dy / max;
  };

  base.addEventListener('pointerdown', (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    e.preventDefault();
    initAudio();
    rect = base.getBoundingClientRect();
    max = Math.max(18, rect.width / 2 - 17);
    joystick.active = true;
    joystick.pointerId = e.pointerId;
    try { base.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }
    move(e);
  }, { passive: false });

  base.addEventListener('pointermove', (e) => {
    if (!joystick.active || e.pointerId !== joystick.pointerId) return;
    e.preventDefault();
    move(e);
  }, { passive: false });

  const end = (e) => {
    if (e.pointerId !== joystick.pointerId) return;
    resetJoystickVisual();
  };
  base.addEventListener('pointerup', end);
  base.addEventListener('pointercancel', end);
  base.addEventListener('lostpointercapture', () => resetJoystickVisual());
}

function bindEvents() {
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);
  window.addEventListener('blur', () => {
    for (const k of Object.keys(keys)) keys[k] = false;
    resetJoystickVisual();
  });

  document.querySelectorAll('[data-menu]').forEach(btn => {
    btn.addEventListener('click', () => {
      initAudio();
      sfx('click');
      const action = btn.dataset.menu;
      if (action === 'new') startNewGame();
      else if (action === 'continue') continueGame();
      else if (action === 'howto') openHowTo();
    });
  });

  els.btnSound?.addEventListener('click', () => {
    initAudio();
    toggleSound();
  });
  els.btnJournal?.addEventListener('click', () => { sfx('click'); openJournal(); });
  els.btnEat?.addEventListener('click', () => eatRation());
  els.btnPause?.addEventListener('click', () => { sfx('click'); openPause(); });
  els.touchAction?.addEventListener('click', () => doAction());
  els.touchEat?.addEventListener('click', () => eatRation());

  setupJoystick();

  canvas.addEventListener('pointerdown', () => initAudio(), { once: true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && (scene === 'farm' || scene === 'house')) saveGame(true);
  });
  window.addEventListener('beforeunload', () => {
    if (scene === 'farm' || scene === 'house') saveGame(true);
  });

  document.addEventListener('contextmenu', (e) => {
    if (e.target === canvas) e.preventDefault();
  });
}

/* ------------------------------------------------------------------ boot -- */

async function boot() {
  try {
    await loadAssets();
    initGround();
    buildHotbar();
    state = newState();
    scene = 'title';
    snapCameraToPlayer();
    updateHUD();
    updateSoundButton();
    updateHotbar();
    initRain();
    initFireflies();
    bindEvents();
    els.btnContinue.disabled = !hasSave();
    els.hud.classList.add('is-hidden');
    setTimeout(() => els.loading.classList.add('is-hidden'), 260);
    lastFrame = 0;
    requestAnimationFrame(loop);
  } catch (err) {
    console.error(err);
    if (els.loading) {
      els.loading.innerHTML = `<div class="loading-box"><div class="loading-title">LỖI TẢI</div><div class="loading-sub">Không thể tải tài nguyên trò chơi. Hãy kiểm tra thư mục assets.</div></div>`;
    }
  }
}

boot();




