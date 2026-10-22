'use strict';

/* =========================================================================
   SOILITARY — A Lone Soldier's Harvest
   A small farming game built on the 16x16 Farm RPG asset pack.
   ========================================================================= */

const TILE = 16;
const VIEW_W = 480;
const VIEW_H = 272;
const MAP_W = 80;
const MAP_H = 56;
const WORLD_W = MAP_W * TILE;
const WORLD_H = MAP_H * TILE;
const DAY_START = 6 * 60;
const DAY_END = 26 * 60;
const TIME_SPEED = 3; // in-game minutes per real second
const SAVE_KEY = 'soilitary_save_v1';
const SOUND_KEY = 'soilitary_sound_v1';
const TERRAIN = { GRASS: 0, WATER: 1, MOUNTAIN: 2, BRIDGE: 3 };
const VILLAGE_X = 790; // first step onto the far bank of the river

/* ------------------------------------------------------------------ map -- */

const HOUSE = {
  id: 'grandma',
  name: 'Nhà của bà',
  x: 32, y: 16, w: 80, h: 112,
  door: { x: 72, y: 130 },
  tint: null,
  npcId: null,
};
const BARN = { x: 416, y: 16, w: 80, h: 96 };
const SHOP_CHEST = { x: 128, y: 128, w: 16, h: 16, kind: 'shop' };
const SELL_CHEST = { x: 160, y: 128, w: 16, h: 16, kind: 'sell' };
const PEN = {
  x: 400, y: 160, w: 208, h: 160,
  inner: { x: 416, y: 176, w: 176, h: 144 },
  gate: { x: 400, y: 224, w: 16, h: 32 },
};

/* The old farm stays as the player remembers it. The rest of the valley is
   rebuilt from a seed every time a new season begins. */
const VILLAGE_LOTS = [
  { id: 'lan',    name: 'Nhà bà Lan',      role: 'Người giữ lửa làng', x: 832,  y: 32,  tint: '#c07a52', npcId: 'lan' },
  { id: 'nam',    name: 'Xưởng bác Nam',   role: 'Thợ mộc',            x: 1088, y: 32,  tint: '#5e925f', npcId: 'nam' },
  { id: 'thu',    name: 'Nhà cô Thư',      role: 'Cô giáo',            x: 896,  y: 288, tint: '#b06a86', npcId: 'thu' },
  { id: 'thanh',  name: 'Nhà ông Thành',   role: 'Cựu binh',           x: 1120, y: 304, tint: '#c5a35d', npcId: 'thanh' },
];

let PATH_RECTS = [];
let TREES = [];
let HOUSES = [];
let NPCS = [];
let terrainGrid = new Uint8Array(MAP_W * MAP_H);
let waterTiles = [];
let mountainTiles = [];
let bridgeTiles = [];
let shoreTiles = [];
let groundDecor = [];
let FARM_SOLIDS = [];
let worldSeed = 0x5f3759df;
let activeHouse = 'grandma';
let transitioning = false;

/* --------------------------------------------------------------- people -- */

const NPC_DEFS = [
  {
    id: 'mara', name: 'Mara', role: 'Em gái · Người giữ vườn', color: '#d98a5b',
    x: 136, y: 212, homeX: 136, homeY: 212, radius: 16, houseId: null,
    bio: 'Em gái của Elian. Cô giữ lại căn nhà, con gà vàng và cả những lá thư chưa gửi.',
    lines: [
      'Anh ra đồng sớm thế? Em để ấm trà trên bếp. Đừng uống vội, bỏng đấy.',
      'Dạo này anh ngủ được hơn rồi. Em nghe thấy tiếng anh hát lúc tưới cây. Đừng chối.',
      'Hội mùa năm nay em sẽ treo đèn ở cổng. Anh chỉ cần có mặt, không cần làm gì cả.',
    ],
    quest: { item: 'strawberry', count: 3, title: 'Bánh dâu cho ngày hội', desc: 'Mang cho Mara 3 quả dâu tây để cô chuẩn bị bánh.', reward: { coins: 80, feed: 2 }, thanks: 'Đủ rồi! Em sẽ làm chiếc bánh to nhất làng. Phần anh là miếng có nhiều dâu nhất.' },
  },
  {
    id: 'rook', name: 'Rook', role: 'Người bạn cũ · Cựu binh', color: '#7f9071',
    x: 296, y: 120, homeX: 296, homeY: 120, radius: 16, houseId: null,
    bio: 'Người cùng đơn vị với Elian. Giờ anh sửa hàng rào, uống trà và cố học cách không canh gác mỗi đêm.',
    lines: [
      'Mày vẫn đi ngủ với giày à? Ở đây không có còi báo động đâu, người lính.',
      'Tao sửa lại cánh cổng chuồng. Con bò nhìn tao như thể tao nợ nó tiền.',
      'Một mùa nữa thôi. Rồi tao sẽ dạy mày câu cá. Không phải câu cá để sống, chỉ để ngồi thôi.',
    ],
    quest: { item: 'milk', count: 1, title: 'Một bình sữa nóng', desc: 'Rook muốn một bình sữa để pha trà sữa cho cả hai.', reward: { coins: 90, ration: 1 }, thanks: 'Được. Trà sữa của tao không ngon như của bà mày, nhưng ít nhất nó không có vị thuốc súng.' },
  },
  {
    id: 'bao', name: 'Bác Bảo', role: 'Lái buôn · Bến sông', color: '#b78c4f',
    x: 1028, y: 208, homeX: 1028, homeY: 208, radius: 26, houseId: null,
    bio: 'Người lái buôn đi khắp các thung lũng. Bác biết giá mọi thứ, trừ giá của một buổi chiều yên tĩnh.',
    lines: [
      'Hàng mới về! Không có thuốc súng, chỉ có hạt giống và mấy câu chuyện dọc đường.',
      'Cái cầu này do bác Bảo đóng đinh từng tấm ván đấy. Đi nhẹ thôi, cầu còn biết đau.',
      'Làng Mây ít người nhưng giàu chuyện. Ở lại lâu sẽ thấy mình cũng thành một câu chuyện.',
    ],
    quest: null,
  },
  {
    id: 'ti', name: 'Tí', role: 'Trẻ chăn trâu · Hồ Sen', color: '#d9b45b',
    x: 552, y: 664, homeX: 552, homeY: 664, radius: 30, houseId: null,
    bio: 'Cậu bé thả trâu ven hồ. Cậu tin rằng dưới đáy hồ có một con cá biết nói.',
    lines: [
      'Chú ơi, chú có thấy con cá nào biết nói không? Cháu hỏi mãi mà nó chỉ bơi đi.',
      'Bà Lan bảo nước hồ mát lành vì có mạch từ núi chảy xuống. Cháu thử uống rồi, chỉ thấy hơi lạnh thôi.',
      'Ngày hội cháu được thả đèn. Chú có đến không? Có đèn to lắm!',
    ],
    quest: { item: 'egg', count: 1, title: 'Quả trứng cho con cá', desc: 'Tí tin rằng một quả trứng sẽ dụ con cá biết nói nổi lên.', reward: { coins: 30, morale: 4 }, thanks: 'Con cá vẫn không nói. Nhưng cháu giữ vỏ trứng rồi. Đẹp mà.' },
  },
  {
    id: 'lan', name: 'Bà Lan', role: 'Người giữ lửa làng', color: '#b97853',
    x: 320, y: 204, houseId: 'lan',
    bio: 'Bà từng giữ bếp lửa chung của làng trong những năm chiến tranh. Bà biết mọi người đã đi đâu và ai sẽ trở về.',
    lines: [
      'Vào đi cháu. Lửa vẫn còn tro nóng. Ở làng này, bếp không bao giờ tắt hẳn.',
      'Bà nhớ hồi cháu còn nhỏ, cháu sợ tiếng sấm. Bây giờ cháu lại sợ những ngày yên tĩnh, phải không?',
      'Mùa hội này bà sẽ nấu một nồi lớn. Cháu mang củ cải đến, bà đổi cho hạt giống tốt.',
    ],
    quest: { item: 'turnip', count: 2, title: 'Nồi canh của bà Lan', desc: 'Bà Lan cần 2 củ cải cho nồi canh ngày hội.', reward: { coins: 70, seeds: { potato: 2 } }, thanks: 'Củ cải tròn và chắc. Bà sẽ để phần nhiều rau cho cháu. Người lính cần ăn rau.' },
  },
  {
    id: 'nam', name: 'Bác Nam', role: 'Thợ mộc', color: '#7f8e59',
    x: 320, y: 204, houseId: 'nam',
    bio: 'Thợ mộc của làng. Bác đóng quan tài, cũi và cả những chiếc cầu để người ta có thể đi tiếp.',
    lines: [
      'Cái bàn này bác đóng từ gỗ cây sồi sau nhà. Nó không hoàn hảo, nhưng nó đứng vững.',
      'Cháu về làng được ba tuần rồi. Bác đếm từng ngày, vì bác đóng cổng cho nhà cháu.',
      'Làm mộc giống làm người: phải biết chỗ nào cần đục, chỗ nào cần giữ nguyên.',
    ],
    quest: { item: 'potato', count: 2, title: 'Bữa trưa của thợ mộc', desc: 'Bác Nam cần 2 củ khoai để nấu bữa trưa trong xưởng.', reward: { coins: 110, feed: 3 }, thanks: 'Khoai này nướng lên thì thơm. Bác để cháu một củ, coi như tiền công sửa cổng.' },
  },
  {
    id: 'thu', name: 'Cô Thư', role: 'Cô giáo', color: '#a86c63',
    x: 320, y: 204, houseId: 'thu',
    bio: 'Cô mở lớp học trong căn nhà nhỏ. Sách vở của cô cũ hơn chiến tranh, nhưng chữ vẫn còn sáng.',
    lines: [
      'Cháu có biết đọc không? Bà cháu từng kể cháu thích nghe truyện trước khi ngủ.',
      'Bọn trẻ hỏi chiến tranh là gì. Cô nói đó là một câu chuyện dài mà người lớn phải học cách kết thúc.',
      'Ngày hội cô sẽ cho bọn trẻ vẽ lại ngôi làng. Cháu có muốn góp một bức không?',
    ],
    quest: { item: 'egg', count: 2, title: 'Bữa sáng cho lớp học', desc: 'Cô Thư cần 2 quả trứng cho bữa sáng của học trò.', reward: { coins: 65, seeds: { strawberry: 3 } }, thanks: 'Bọn trẻ sẽ vui lắm. Cô sẽ kể chúng nghe về người lính trồng dâu.' },
  },
  {
    id: 'thanh', name: 'Ông Thành', role: 'Cựu binh · Người kể chuyện', color: '#9a875d',
    x: 320, y: 204, houseId: 'thanh',
    bio: 'Ông Thành đã đi qua hai cuộc chiến và trở về với một chiếc hộp đầy thư. Ông ngồi bên cửa sổ, đợi hoàng hôn.',
    lines: [
      'Tôi và ông cháu từng đứng cùng một chiến hào. Ông ấy kể về cháu rất nhiều.',
      'Người ta nói thời gian chữa lành. Không đúng. Thời gian chỉ cho ta một chỗ để ngồi xuống và thở.',
      'Ngày hội năm nay tôi sẽ kể chuyện cho bọn trẻ. Chuyện thật, nhưng có kết thúc tốt.',
    ],
    quest: { item: 'onion', count: 1, title: 'Một củ hành cho bữa tối', desc: 'Ông Thành muốn một củ hành tím để nấu món canh của người lính cũ.', reward: { coins: 130, morale: 6 }, thanks: 'Mùi hành làm tôi nhớ nhà. Cảm ơn cháu. Bữa tối nay sẽ ấm hơn.' },
  },
];

const INTERIOR_STYLES = {
  grandma: { wall: '#29331f', wallLine: '#334026', floor: '#6b472b', floorAlt: '#765031', trim: '#4f321f', name: 'NHÀ CỦA BÀ', accent: '#d9a441' },
  lan:     { wall: '#422d22', wallLine: '#54382a', floor: '#6a452a', floorAlt: '#764e31', trim: '#4a2c1c', name: 'NHÀ BÀ LAN', accent: '#e0a05a' },
  nam:     { wall: '#2b332c', wallLine: '#354039', floor: '#5d4028', floorAlt: '#68492f', trim: '#3a281b', name: 'XƯỞNG BÁC NAM', accent: '#9eb06d' },
  thu:     { wall: '#3c282c', wallLine: '#4b3238', floor: '#66442c', floorAlt: '#724e33', trim: '#432a1e', name: 'NHÀ CÔ THƯ', accent: '#d18c80' },
  thanh:   { wall: '#30302a', wallLine: '#3d3d35', floor: '#5b402a', floorAlt: '#664a32', trim: '#3c2a1e', name: 'NHÀ ÔNG THÀNH', accent: '#c8b477' },
};

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
  { id: 'village',  text: 'Qua cầu, ghé thăm làng Mây',  stat: 'village',   target: 1,   reward: { coins: 70, seeds: { turnip: 2 } } },
  { id: 'friends3', text: 'Kết thân với 3 người dân làng', stat: 'friends', target: 3,   reward: { coins: 120, ration: 1 } },
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

/* =========================================================================
   WORLD GENERATION — the old farm, then a seeded valley around it
   ========================================================================= */

function makeRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function tileIndex(tx, ty) { return ty * MAP_W + tx; }
function getTerrain(tx, ty) {
  if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) return TERRAIN.MOUNTAIN;
  return terrainGrid[tileIndex(tx, ty)];
}
function setTerrain(tx, ty, type) {
  if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) return;
  terrainGrid[tileIndex(tx, ty)] = type;
}
function terrainAtPixel(x, y) {
  return getTerrain(Math.floor(x / TILE), Math.floor(y / TILE));
}
function isTerrainSolidAtPixel(x, y) {
  const t = terrainAtPixel(x, y);
  return t === TERRAIN.WATER || t === TERRAIN.MOUNTAIN;
}
function terrainBlockedRect(x, y, w, h) {
  for (let sy = y + 2; sy < y + h; sy += 12) {
    for (let sx = x + 2; sx < x + w; sx += 12) {
      if (isTerrainSolidAtPixel(sx, sy)) return true;
    }
  }
  return false;
}

function buildWorld(seed) {
  worldSeed = (seed >>> 0) || 0x5f3759df;
  const rnd = makeRng(worldSeed);
  terrainGrid.fill(TERRAIN.GRASS);
  waterTiles = [];
  mountainTiles = [];
  bridgeTiles = [];
  shoreTiles = [];
  TREES = [];
  groundDecor = [];

  /* --- river: a slow seam of blue between the farm and the village ------- */
  const phase = rnd() * Math.PI * 2;
  for (let ty = 0; ty < MAP_H; ty++) {
    const sway = Math.round(Math.sin(ty * 0.23 + phase) * 1.4);
    const center = 45 + sway + (rnd() < 0.18 ? (rnd() < 0.5 ? -1 : 1) : 0);
    const width = 3 + (rnd() < 0.13 ? 1 : 0);
    for (let dx = -1; dx < width - 1; dx++) {
      setTerrain(center + dx, ty, TERRAIN.WATER);
    }
  }

  /* --- a quiet lake in the southern meadow ------------------------------ */
  const lakeCx = 22, lakeCy = 44, lakeRx = 7, lakeRy = 6;
  for (let y = lakeCy - lakeRy - 2; y <= lakeCy + lakeRy + 2; y++) {
    for (let x = lakeCx - lakeRx - 2; x <= lakeCx + lakeRx + 2; x++) {
      const nx = (x - lakeCx) / lakeRx;
      const ny = (y - lakeCy) / lakeRy;
      const wobble = (rnd() - 0.5) * 0.18;
      if (nx * nx + ny * ny < 1 + wobble) setTerrain(x, y, TERRAIN.WATER);
    }
  }
  // a tiny grass island, with room for one tree
  setTerrain(22, 43, TERRAIN.GRASS);
  setTerrain(22, 44, TERRAIN.GRASS);
  setTerrain(23, 43, TERRAIN.GRASS);

  /* --- mountain country at the edges ------------------------------------ */
  function paintMountain(cx, cy, rx, ry) {
    for (let y = Math.floor(cy - ry - 2); y <= Math.ceil(cy + ry + 2); y++) {
      for (let x = Math.floor(cx - rx - 2); x <= Math.ceil(cx + rx + 2); x++) {
        if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) continue;
        const nx = (x - cx) / rx;
        const ny = (y - cy) / ry;
        if (nx * nx + ny * ny < 0.82 + rnd() * 0.32) {
          if (getTerrain(x, y) !== TERRAIN.WATER) setTerrain(x, y, TERRAIN.MOUNTAIN);
        }
      }
    }
  }
  paintMountain(79, 11, 3.8, 21);   // eastern wall
  paintMountain(76, 2, 4.5, 3.5);   // north-east shoulder
  paintMountain(49, 55, 17, 3.2);   // southern ridge, beneath the lake meadow
  paintMountain(8, 51, 6.5, 6);     // south-west cliffs
  paintMountain(69, 51, 9, 4);      // south-east ridge

  /* --- houses and the paths that lead home ------------------------------ */
  const jitter = () => (rnd() < 0.5 ? 0 : 16);
  const villageHouses = VILLAGE_LOTS.map(lot => {
    let x = lot.x;
    if (lot.id === 'lan' || lot.id === 'nam' || lot.id === 'thu') x += jitter();
    if (lot.id === 'thanh') x -= jitter();
    return {
      id: lot.id,
      name: lot.name,
      role: lot.role,
      x, y: lot.y, w: 80, h: 112,
      door: { x: x + 40, y: lot.y + 114 },
      tint: lot.tint,
      npcId: lot.npcId,
    };
  });
  HOUSES = [HOUSE, ...villageHouses];

  PATH_RECTS = [
    { x: 64, y: 144, w: 544, h: 16, kind: 'road' },        // the old farm road
    { x: 64, y: 128, w: 16, h: 32, kind: 'path' },         // grandmother's door
    { x: 384, y: 160, w: 16, h: 96, kind: 'path' },        // road to the pen
    { x: 160, y: 160, w: 16, h: 32, kind: 'path' },        // field branch
    { x: 608, y: 144, w: WORLD_W - 608, h: 16, kind: 'road' }, // over the bridge
    { x: 992, y: 176, w: 208, h: 96, kind: 'plaza' },      // village square
    { x: 384, y: 256, w: 16, h: 336, kind: 'trail' },      // trail south
    { x: 384, y: 592, w: 112, h: 16, kind: 'trail' },      // to the lake
    { x: 368, y: 592, w: 32, h: 64, kind: 'dock' },        // out over the water
  ];

  for (const h of villageHouses) {
    if (h.door.y > 160) {
      PATH_RECTS.push({
        x: h.door.x - 8,
        y: 160,
        w: 16,
        h: h.door.y + 32 - 160,
        kind: 'path',
      });
    }
  }

  // Keep houses out of the water and the mountains.
  for (const h of HOUSES) {
    for (let ty = Math.floor((h.y - 8) / TILE); ty <= Math.floor((h.y + h.h + 24) / TILE); ty++) {
      for (let tx = Math.floor((h.x - 8) / TILE); tx <= Math.floor((h.x + h.w + 8) / TILE); tx++) {
        if (getTerrain(tx, ty) === TERRAIN.MOUNTAIN) setTerrain(tx, ty, TERRAIN.GRASS);
      }
    }
  }

  // Clear a generous doorway apron for every house.
  for (const h of HOUSES) {
    for (let ty = Math.floor((h.y + h.h - 4) / TILE); ty <= Math.floor((h.door.y + 44) / TILE); ty++) {
      for (let tx = Math.floor((h.door.x - 24) / TILE); tx <= Math.floor((h.door.x + 24) / TILE); tx++) {
        if (getTerrain(tx, ty) === TERRAIN.MOUNTAIN) setTerrain(tx, ty, TERRAIN.GRASS);
      }
    }
  }

  // A bridge — every plank was placed by someone who wanted the two banks
  // to belong to the same village.
  for (const r of PATH_RECTS) {
    for (let y = Math.floor(r.y / TILE); y < Math.ceil((r.y + r.h) / TILE); y++) {
      for (let x = Math.floor(r.x / TILE); x < Math.ceil((r.x + r.w) / TILE); x++) {
        if (getTerrain(x, y) === TERRAIN.WATER) setTerrain(x, y, TERRAIN.BRIDGE);
        if (getTerrain(x, y) === TERRAIN.MOUNTAIN) setTerrain(x, y, TERRAIN.GRASS);
      }
    }
  }

  // Water and mountain tiles become collision runs.
  buildTerrainSolids();

  // Collect water for the animated glints and shores for the sand line.
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      const t = getTerrain(x, y);
      if (t === TERRAIN.WATER) waterTiles.push({ x, y });
      if (t === TERRAIN.MOUNTAIN) mountainTiles.push({ x, y });
      if (t === TERRAIN.BRIDGE) bridgeTiles.push({ x, y });
      if (t === TERRAIN.GRASS) {
        const near = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => getTerrain(x + dx, y + dy) === TERRAIN.WATER);
        if (near) shoreTiles.push({ x, y });
      }
    }
  }

  /* --- trees ------------------------------------------------------------ */
  const coreTrees = [
    { kind: 'medium', x: 48, y: 248 },
    { kind: 'sapling', x: 64, y: 336 },
    { kind: 'medium', x: 336, y: 80 },
    { kind: 'sapling', x: 352, y: 96 },
    { kind: 'sapling', x: 552, y: 80 },
  ];
  for (const t of coreTrees) tryAddTree(t.x, t.y, t.kind, rnd);

  // Edge forest. These frames the map and make the valley feel older than us.
  for (let x = 16; x < WORLD_W - 16; x += 42) {
    if (rnd() < 0.72) tryAddTree(x, WORLD_H - 48 - rnd() * 12, rnd() < 0.35 ? 'medium' : 'large', rnd);
    if (rnd() < 0.48) tryAddTree(x, 16 + rnd() * 10, rnd() < 0.5 ? 'medium' : 'sapling', rnd);
  }
  for (let y = 180; y < WORLD_H - 64; y += 54) {
    if (rnd() < 0.77) tryAddTree(8 + rnd() * 6, y, rnd() < 0.4 ? 'medium' : 'large', rnd);
    if (rnd() < 0.68) tryAddTree(WORLD_W - 48 + rnd() * 8, y, rnd() < 0.5 ? 'large' : 'medium', rnd);
  }

  // Wild groves across the new country. Each map gets a different arrangement.
  for (let i = 0; i < 24; i++) {
    const cx = 40 + rnd() * (WORLD_W - 80);
    const cy = 40 + rnd() * (WORLD_H - 80);
    if (cx < 650 && cy < 440) continue;
    const count = 3 + Math.floor(rnd() * 6);
    for (let j = 0; j < count; j++) {
      const x = cx + (rnd() - 0.5) * 130;
      const y = cy + (rnd() - 0.5) * 90;
      if (rnd() < 0.5) tryAddTree(x, y, rnd() < 0.3 ? 'sapling' : 'large', rnd);
      else tryAddTree(x + 20, y + 18, rnd() < 0.45 ? 'medium' : 'large', rnd);
    }
  }

  // A lone sapling on the lake island, if the generated island still exists.
  if (getTerrain(22, 43) === TERRAIN.GRASS) {
    TREES.push({ kind: 'sapling', x: 22 * TILE, y: 43 * TILE });
  }

  treeSeedExtraDecor(rnd);

  NPCS = NPC_DEFS.map(def => ({
    ...def,
    x: def.x,
    y: def.y,
    dir: 'down',
    animTime: rnd() * 4,
    moving: false,
    target: null,
    timer: 1 + rnd() * 3,
  }));

  FARM_SOLIDS = getSolids();
  FARM_SOLIDS.push(
    { x: 1064, y: 204, w: 32, h: 20 }, // well
    { x: 1120, y: 197, w: 60, h: 20 }, // stall counter
  );
}

function buildTerrainSolids() {
  TERRAIN_SOLIDS = [];
  const blocked = (t) => t === TERRAIN.WATER || t === TERRAIN.MOUNTAIN;
  for (let y = 0; y < MAP_H; y++) {
    let start = -1;
    for (let x = 0; x <= MAP_W; x++) {
      const isBlocked = x < MAP_W && blocked(getTerrain(x, y));
      if (isBlocked && start < 0) start = x;
      if (!isBlocked && start >= 0) {
        TERRAIN_SOLIDS.push({ x: start * TILE, y: y * TILE, w: (x - start) * TILE, h: TILE });
        start = -1;
      }
    }
  }
}

let TERRAIN_SOLIDS = [];

function nearHouse(x, y, margin = 8) {
  return HOUSES.some(h => x >= h.x - margin && x <= h.x + h.w + margin && y >= h.y - margin && y <= h.y + h.h + margin);
}

function treeFootprint(kind) {
  if (kind === 'large') return { w: 40, h: 48 };
  if (kind === 'medium') return { w: 32, h: 48 };
  if (kind === 'sapling') return { w: 16, h: 16 };
  return { w: 16, h: 16 };
}

function tryAddTree(x, y, kind, rnd) {
  const fp = treeFootprint(kind);
  x = Math.round(x);
  y = Math.round(y);
  if (x < 8 || y < 8 || x + fp.w > WORLD_W - 8 || y + fp.h > WORLD_H - 8) return false;
  if (terrainBlockedRect(x, y, fp.w, fp.h)) return false;
  if (nearHouse(x, y, 14)) return false;
  const samples = [
    [x + fp.w / 2, y + fp.h - 8],
    [x + fp.w / 2, y + 6],
    [x + 5, y + fp.h - 6],
    [x + fp.w - 5, y + fp.h - 6],
  ];
  if (samples.some(([sx, sy]) => isPathAt(sx, sy))) return false;
  // Keep trunks completely off the road and bridge decks. The canopy may
  // overhang, but the player should never meet an invisible wall on a path.
  if (kind !== 'sapling') {
    const trunk = {
      x: x + (kind === 'large' ? 16 : 12),
      y: y + 40,
      w: 8,
      h: 8,
    };
    if (PATH_RECTS.some(r => rectsOverlap(trunk, r))) return false;
  }
  if (rectsOverlap(
    { x, y, w: fp.w, h: fp.h },
    { x: PEN.x - 8, y: PEN.y - 8, w: PEN.w + 16, h: PEN.h + 16 }
  )) return false;
  if (rectsOverlap(
    { x, y, w: fp.w, h: fp.h },
    { x: BARN.x - 8, y: BARN.y - 8, w: BARN.w + 16, h: BARN.h + 16 }
  )) return false;
  for (const def of NPC_DEFS) {
    if (!def.houseId && dist(x + fp.w / 2, y + fp.h - 8, def.homeX, def.homeY) < 34) return false;
  }
  for (const t of TREES) {
    if (dist(x + fp.w / 2, y + fp.h - 8, t.x + 20, t.y + 40) < 16) return false;
  }
  TREES.push({ kind, x, y });
  return true;
}

function treeSeedExtraDecor(rnd) {
  // A few deliberate silhouettes around the farm so the old place still
  // feels hand-composed rather than merely generated.
  if (rnd() < 0.8) tryAddTree(536, 456, 'large', rnd);
  if (rnd() < 0.8) tryAddTree(592, 488, 'medium', rnd);
  if (rnd() < 0.7) tryAddTree(680, 400, 'sapling', rnd);
  for (let i = 0; i < 70; i++) {
    const x = 20 + rnd() * (WORLD_W - 40);
    const y = 20 + rnd() * (WORLD_H - 40);
    if (terrainAtPixel(x, y) !== TERRAIN.GRASS || isPathAt(x, y) || nearHouse(x, y, 24)) continue;
    if (x < 640 && y < 420) continue;
    groundDecor.push({
      type: rnd() < 0.28 ? 'rock' : (rnd() < 0.55 ? 'flower' : 'tuft'),
      x, y,
      color: rnd() < 0.5 ? '#f0c36a' : (rnd() < 0.5 ? '#f0e6c8' : '#d97a6b'),
    });
  }
}

/* ----------------------------------------------------------------- state -- */

function newState() {
  return {
    version: 1,
    seed: (Math.random() * 0x7fffffff) >>> 0,
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
    npcQuests: {},
    friendship: {},
    npcGiftDay: {},
    stats: { tilled: 3, planted: 0, watered: 0, harvested: 0, fed: 0, earned: 0, sold: 0, village: 0, friends: 0 },
    dayStart: { coins: 120, harvested: 0, fed: 0 },
    upgrades: { irrigation: false, compost: false, lamp: false },
    player: { x: 72, y: 148, dir: 'down', animTime: 0, moving: false },
    housePlayer: { x: 240, y: 216, dir: 'up', animTime: 0, moving: false },
    flags: { introSeen: false, firstPlant: false, firstWater: false, firstHarvest: false, warmedToday: false, villageSeen: false, lakeSeen: false, bridgeSeen: false },
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
    s.npcQuests = { ...(data.npcQuests || {}) };
    s.friendship = { ...(data.friendship || {}) };
    s.npcGiftDay = { ...(data.npcGiftDay || {}) };
    s.seed = Number.isFinite(Number(data.seed)) ? (Number(data.seed) >>> 0) : base.seed;
    s.crops = Array.isArray(data.crops) ? data.crops : [];
    s.tilled = Array.isArray(data.tilled) ? data.tilled : base.tilled;
    s.animals = Array.isArray(data.animals) && data.animals.length ? data.animals : base.animals;
    s.lettersUnlocked = Array.isArray(data.lettersUnlocked) ? data.lettersUnlocked : [1];
    s.lettersRead = Array.isArray(data.lettersRead) ? data.lettersRead : [];
    s.claimedObjectives = Array.isArray(data.claimedObjectives) ? data.claimedObjectives : [];
    s.stats.friends = Object.keys(s.friendship).filter(id => (s.friendship[id] || 0) > 0).length;
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
let sellMerchant = false;
let lastPromptText = '';

function toast(message, kind = '') {
  const node = document.createElement('div');
  node.className = `toast ${kind}`.trim();
  node.dataset.toast = String(++toastId);
  node.textContent = message;
  while (els.toast.children.length >= 3) els.toast.firstElementChild.remove();
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
  els.hud.classList.toggle('is-house', scene === 'house');
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
  if (reward.morale) parts.push(`+${reward.morale} tinh thần`);
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
  if (reward.morale) state.morale = clamp(state.morale + reward.morale, 0, 100);
  if (reward.seeds) {
    for (const [key, n] of Object.entries(reward.seeds)) {
      state.inventory.seeds[key] = (state.inventory.seeds[key] || 0) + n;
    }
  }
}

/* ------------------------------------------------------------ title/flow -- */

function showTitle() {
  scene = 'title';
  document.getElementById('game-frame').classList.remove('is-house');
  els.title.classList.remove('is-hidden');
  els.hud.classList.add('is-hidden');
  els.btnContinue.disabled = !hasSave();
  closeModal();
  snapCameraToPlayer();
}

function hideTitle() {
  els.title.classList.add('is-hidden');
  els.hud.classList.remove('is-hidden');
  pulseSceneFade(320);
}

function startNewGame() {
  initAudio();
  state = newState();
  activeHouse = 'grandma';
  transitioning = false;
  buildWorld(state.seed);
  initGround();
  initFireflies();
  scene = 'farm';
  document.getElementById('game-frame').classList.remove('is-house');
  pendingEnding = false;
  hideTitle();
  snapCameraToPlayer();
  updateHUD();
  updateHotbar();
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
  activeHouse = 'grandma';
  transitioning = false;
  buildWorld(state.seed);
  initGround();
  initFireflies();
  scene = state.day > 12 ? 'ending' : 'farm';
  document.getElementById('game-frame').classList.remove('is-house');
  hideTitle();
  snapCameraToPlayer();
  updateHUD();
  updateHotbar();
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
    <p>Con sông vẫn chảy phía đông. Qua cây cầu là <strong>Làng Mây</strong> — nơi bà từng giữ lửa, nơi Rook sửa cầu, và nơi những người hàng xóm vẫn nhớ tên anh.</p>
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
      <li>Qua cây cầu phía đông là làng Mây. Gõ cửa nhà dân, trò chuyện và giúp họ để mở thêm chuyện.</li>
      <li>Tặng nông sản cho dân làng mỗi ngày để tăng tình cảm. Hồ Sen ở phía tây nam là một nơi đáng ghé.</li>
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

function openSell(merchant = false) {
  sellMerchant = merchant;
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
    title: sellMerchant ? 'BẾN SÔNG BÁC BẢO' : 'KHO GỬI HÀNG',
    kicker: `${sellMerchant ? 'BÁC BẢO MUA NÔNG SẢN' : 'BÁN NÔNG SẢN'} · XU HIỆN CÓ ◈ ${state.coins}`,
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
  const tabs = tabRow([['quests', 'NHIỆM VỤ'], ['village', 'DÂN LÀNG'], ['letters', 'THƯ'], ['manual', 'HƯỚNG DẪN']], tab, 'data-journal-tab');
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
  } else if (tab === 'village') {
    const met = Object.keys(state.friendship).filter(id => (state.friendship[id] || 0) > 0).length;
    body = `
      <p class="muted small" style="margin-bottom:10px">Qua cây cầu phía đông là làng Mây. Nơi đây có ${NPCS.length} người đang sống, làm việc và chờ ngày hội. Trò chuyện với họ để mở thêm những mẩu chuyện nhỏ.</p>
      <div class="villager-list">
        ${NPCS.map(npc => {
          const friendship = npcFriendship(npc);
          const quest = npc.quest;
          const done = quest && state.npcQuests[npc.id];
          const ready = npcQuestReady(npc);
          const stateText = done ? 'ĐÃ GIÚP' : (ready ? 'SẴN SÀNG GIÚP' : (quest ? `CẦN ${quest.count} ${npcItemName(quest.item).toUpperCase()}` : 'CHUYỆN TRÒ'));
          return `<div class="villager-row">
            <div class="villager-avatar" style="background:${npc.color}">${npc.name.slice(0, 1)}</div>
            <div class="villager-main">
              <div class="villager-name">${npc.name}</div>
              <div class="villager-role">${npc.role}</div>
            </div>
            <div class="villager-state">${stateText}<span class="hearts">${npcHearts(npc)}</span></div>
          </div>`;
        }).join('')}
      </div>
      <p class="muted small" style="margin-top:10px">Đã gặp ${met}/${NPCS.length} người dân làng. Tặng quà hoặc giúp việc sẽ làm tình cảm thêm sâu.</p>`;
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

/* ---------------------------------------------------------- village / NPC -- */

function npcFriendship(npc) {
  return state.friendship[npc.id] || 0;
}

function npcHearts(npc) {
  const hearts = clamp(Math.round(npcFriendship(npc)), 0, 5);
  return '♥'.repeat(hearts) + '♡'.repeat(5 - hearts);
}

function npcItemName(key) {
  return CROPS[key]?.name || PRODUCTS[key]?.name || key;
}

function npcLine(npc) {
  const index = clamp(Math.floor((state.day - 1) / 4), 0, npc.lines.length - 1);
  return npc.lines[index];
}

function npcQuestReady(npc) {
  return !!(npc.quest && !state.npcQuests[npc.id] &&
    (state.inventory.produce[npc.quest.item] || 0) >= npc.quest.count);
}

function syncFriendshipStats() {
  state.stats.friends = Object.keys(state.friendship)
    .filter(id => (state.friendship[id] || 0) > 0).length;
}

function openNPCDialogue(npc) {
  if (!npc) return;
  const firstMeeting = !state.friendship[npc.id];
  if (firstMeeting) {
    state.friendship[npc.id] = 1;
    syncFriendshipStats();
    saveGame(true);
    checkObjectives();
  }
  const quest = npc.quest;
  const questDone = !!(quest && state.npcQuests[npc.id]);
  const ready = npcQuestReady(npc);
  const have = quest ? (state.inventory.produce[quest.item] || 0) : 0;
  let questHtml = '';
  if (quest) {
    questHtml = `<div class="npc-quest ${questDone ? 'done' : ''}">
      <div class="q-head">
        <span>${questDone ? '✓ ' + quest.title : 'VIỆC CỦA ' + npc.name.toUpperCase()}</span>
        <span>${questDone ? 'ĐÃ GIÚP' : `${Math.min(have, quest.count)}/${quest.count} ${npcItemName(quest.item)}`}</span>
      </div>
      <div class="q-body">${questDone ? quest.thanks : quest.desc}</div>
    </div>`;
  }
  const giftAvailable = Object.values(state.inventory.produce).some(n => n > 0);
  const giftUsed = state.npcGiftDay[npc.id] === state.day;
  const body = `
    <div class="npc-dialog">
      <div class="npc-meta">
        <span>${npc.role}</span>
        <span class="npc-hearts">${npcHearts(npc)}</span>
        ${firstMeeting ? '<span>· LẦN ĐẦU GẶP</span>' : ''}
      </div>
      <p class="npc-line">“${npcLine(npc)}”</p>
      <p class="muted small" style="margin:0">${npc.bio}</p>
      ${questHtml}
    </div>`;
  const buttons = [];
  if (quest && !questDone) {
    buttons.push(ready
      ? `<button class="pixel-btn primary" data-npc-give="${npc.id}">TRAO ${quest.count} ${npcItemName(quest.item).toUpperCase()}</button>`
      : `<button class="pixel-btn" disabled>CẦN ${quest.count} ${npcItemName(quest.item).toUpperCase()}</button>`);
  }
  if (giftAvailable) {
    buttons.push(`<button class="pixel-btn" data-npc-gift="${npc.id}" ${giftUsed ? 'disabled' : ''}>${giftUsed ? 'ĐÃ TẶNG HÔM NAY' : 'TẶNG MỘT NÔNG SẢN'}</button>`);
  }
  if (npc.id === 'bao') {
    buttons.push(`<button class="pixel-btn" data-npc-shop="1">HỎI GIÁ NÔNG SẢN</button>`);
  }
  buttons.push(`<button class="pixel-btn ghost" data-mact="close">TẠM BIỆT</button>`);
  openModal(modalShell({
    title: npc.name.toUpperCase(),
    kicker: `${npc.role.toUpperCase()} · LÀNG MÂY`,
    body,
    cls: 'narrow npc-modal',
    foot: buttons.join(''),
  }), '[data-mact="close"]');
  sfx('open');
}

function giveGiftToNPC(npc) {
  if (!npc) return;
  if (state.npcGiftDay[npc.id] === state.day) {
    toast(`${npc.name} đã nhận quà hôm nay.`, '');
    return;
  }
  const item = Object.keys(state.inventory.produce)
    .find(key => (state.inventory.produce[key] || 0) > 0);
  if (!item) {
    toast('Bạn không có nông sản nào để tặng.', 'warn');
    return;
  }
  state.inventory.produce[item] -= 1;
  state.friendship[npc.id] = clamp(npcFriendship(npc) + 1, 0, 5);
  state.npcGiftDay[npc.id] = state.day;
  state.morale = clamp(state.morale + 2, 0, 100);
  syncFriendshipStats();
  sfx('coin');
  toast(`Bạn tặng ${npc.name} một ${npcItemName(item).toLowerCase()}. Tình cảm +1, tinh thần +2.`, 'good');
  checkObjectives();
  updateHUD();
  saveGame(true);
  openNPCDialogue(npc);
}

function completeNPCQuest(npc) {
  if (!npc || !npc.quest || state.npcQuests[npc.id]) return;
  const q = npc.quest;
  if ((state.inventory.produce[q.item] || 0) < q.count) {
    toast(`Bạn cần ${q.count} ${npcItemName(q.item).toLowerCase()}.`, 'warn');
    sfx('error');
    openNPCDialogue(npc);
    return;
  }
  state.inventory.produce[q.item] -= q.count;
  state.npcQuests[npc.id] = 'done';
  state.friendship[npc.id] = clamp(npcFriendship(npc) + 2, 0, 5);
  state.morale = clamp(state.morale + 2, 0, 100);
  applyReward(q.reward);
  syncFriendshipStats();
  sfx('quest');
  toast(`ĐÃ GIÚP ${npc.name.toUpperCase()} · ${rewardText(q.reward)}`, 'gold');
  checkObjectives();
  updateHUD();
  saveGame(true);
  openNPCDialogue(npc);
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
  const friends = Object.keys(state.friendship).filter(id => (state.friendship[id] || 0) > 0).length;
  return state.coins + state.stats.harvested * 20 + Math.round(state.morale) * 3 + state.lettersRead.length * 12 +
    friends * 35 + (state.flags.villageSeen ? 40 : 0);
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
  document.getElementById('game-frame').classList.remove('is-house');
  els.hud.classList.add('is-hidden');
  const rank = endingRank();
  const titles = {
    S: 'MÙA MÀNG CỦA NGƯỜI TRỞ VỀ',
    A: 'MỘT MÙA ĐÁNG NHỚ',
    B: 'MẦM XANH ĐÃ LÊN',
    C: 'KHỞI ĐẦU LẠI TỪ ĐẤT',
  };
  const texts = {
    S: 'Bạn đã biến mảnh đất ngủ quên thành một nơi có tiếng cười. Rook mang rượu, Mara mang bánh, bà Lan thắp đèn, và con gà vàng vẫn cãi nhau với mọi người. Bạn không còn là người lính đang tìm đường về nữa. Bạn đã về.',
    A: 'Mùa màng không hoàn hảo, nhưng nó đủ để gọi là nhà. Bạn đã học cách chờ cây lớn, cách cho đi, và cách ngủ một giấc không mơ thấy chiến tranh.',
    B: 'Bạn đã trồng được những thứ đầu tiên. Đất không phụ người kiên nhẫn. Ngày hội đã qua, nhưng mùa sau vẫn còn.',
    C: 'Một mùa ngắn, nhiều thử thách. Nhưng bạn đã ở lại. Đôi khi chỉ cần ở lại là đủ để mọi thứ bắt đầu.',
  };
  const met = Object.keys(state.friendship).filter(id => (state.friendship[id] || 0) > 0).length;
  const villageEpilogue = met >= 6
    ? 'Làng Mây đã nhận bạn là người của làng. Qua cầu, đèn vẫn sáng, và bàn ăn dài luôn có một chỗ trống chờ bạn.'
    : met >= 3
      ? 'Bạn đã biết tên một nửa ngôi làng. Ở bên kia cầu, có những người sẽ nhớ tiếng bước chân của bạn.'
      : 'Bạn vẫn còn những cánh cửa chưa gõ. Làng Mây ở đó, kiên nhẫn như con sông.';
  const body = `
    <div class="ending-wrap">
      <div class="ending-kicker">BÁO CÁO CUỐI MÙA · 12 NGÀY</div>
      <div class="ending-rank">${rank}</div>
      <div class="ending-title">${titles[rank]}</div>
      <p class="ending-text">${texts[rank]}</p>
      <p class="ending-text muted" style="margin-top:8px">${villageEpilogue}</p>
      <div class="report-grid" style="margin-top:14px">
        <div class="report-cell"><div class="k">Xu</div><div class="v">◈ ${state.coins}</div></div>
        <div class="report-cell"><div class="k">Thu hoạch</div><div class="v">${state.stats.harvested}</div></div>
        <div class="report-cell"><div class="k">Bạn làng</div><div class="v">${met}/${NPCS.length}</div></div>
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
  const btn = e.target.closest('[data-mact], [data-shop-tab], [data-journal-tab], [data-buy-seed], [data-buy-supply], [data-buy-animal], [data-buy-upgrade], [data-sell], [data-letter], [data-npc-give], [data-npc-gift], [data-npc-shop]');
  if (!btn) return;

  if (btn.dataset.shopTab) { sfx('click'); renderShop(btn.dataset.shopTab); return; }
  if (btn.dataset.journalTab) { sfx('click'); renderJournal(btn.dataset.journalTab); return; }
  if (btn.dataset.buySeed) { buySeed(btn.dataset.buySeed); return; }
  if (btn.dataset.buySupply) { buySupply(btn.dataset.buySupply); return; }
  if (btn.dataset.buyAnimal) { buyAnimal(btn.dataset.buyAnimal); return; }
  if (btn.dataset.buyUpgrade) { buyUpgrade(btn.dataset.buyUpgrade); return; }
  if (btn.dataset.sell) { sellProduce(btn.dataset.sell); return; }
  if (btn.dataset.letter) { openLetter(Number(btn.dataset.letter), 'journal'); return; }
  if (btn.dataset.npcGive) { completeNPCQuest(NPCS.find(n => n.id === btn.dataset.npcGive)); return; }
  if (btn.dataset.npcGift) { giveGiftToNPC(NPCS.find(n => n.id === btn.dataset.npcGift)); return; }
  if (btn.dataset.npcShop) { openSell(true); return; }

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
  { x: 0, y: 0, w: 480, h: 112 },
  { x: 0, y: 0, w: 28, h: 272 },
  { x: 452, y: 0, w: 28, h: 272 },
  { x: 0, y: 250, w: 480, h: 22 },
  { x: 48, y: 136, w: 36, h: 68 },   // bed
  { x: 108, y: 148, w: 96, h: 64 },  // table + chairs
  { x: 376, y: 88, w: 52, h: 80 },   // fireplace
  { x: 96, y: 196, w: 32, h: 36 },   // dresser
];

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function getSolids() {
  const solids = [
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
  for (const h of HOUSES) {
    solids.push({ x: h.x, y: h.y, w: h.w, h: h.h });
  }
  for (const s of TERRAIN_SOLIDS) solids.push(s);
  for (const t of TREES) {
    if (t.kind === 'large') solids.push({ x: t.x + 16, y: t.y + 40, w: 8, h: 8 });
    else if (t.kind === 'medium') solids.push({ x: t.x + 12, y: t.y + 40, w: 8, h: 8 });
  }
  return solids;
}

function playerBox(p) {
  return { x: p.x - 5, y: p.y - 4, w: 10, h: 4 };
}

function collidesAt(x, y) {
  if (scene === 'house') {
    if (x < 28 || x > 452 || y < 116 || y > 246) return true;
    const box = { x: x - 5, y: y - 4, w: 10, h: 4 };
    return HOUSE_SOLIDS.some(s => rectsOverlap(box, s));
  }
  if (x < 8 || x > WORLD_W - 8 || y < 12 || y > WORLD_H - 2) return true;
  const box = { x: x - 5, y: y - 4, w: 10, h: 4 };
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

function houseById(id) {
  return HOUSES.find(h => h.id === id) || HOUSE;
}

function currentHouse() {
  return houseById(activeHouse);
}

function findNearbyHouse() {
  const p = getActivePlayer();
  let best = null;
  let bestD = Infinity;
  for (const h of HOUSES) {
    const d = dist(p.x, p.y, h.door.x, h.door.y);
    if (d < 30 && d < bestD) {
      best = h;
      bestD = d;
    }
  }
  return best;
}

function nearHouseDoor() {
  return !!findNearbyHouse();
}

function findNearbyNPC() {
  if (scene !== 'farm') return null;
  const p = getActivePlayer();
  let best = null;
  let bestD = Infinity;
  for (const npc of NPCS) {
    if (npc.houseId) continue;
    const d = dist(p.x, p.y, npc.x, npc.y);
    if (d < 34 && d < bestD) {
      best = npc;
      bestD = d;
    }
  }
  return best;
}

function findIndoorNPC() {
  if (scene !== 'house') return null;
  const npc = NPCS.find(n => n.houseId === activeHouse);
  if (!npc) return null;
  const p = getActivePlayer();
  return dist(p.x, p.y, npc.x, npc.y) < 34 ? npc : null;
}

function nearChest(chest) {
  const p = getActivePlayer();
  return dist(p.x, p.y, chest.x + 8, chest.y + 8) < 23;
}

function nearHouseBed() {
  const p = getActivePlayer();
  return dist(p.x, p.y, 68, 168) < 34;
}
function nearHouseTable() {
  const p = getActivePlayer();
  return dist(p.x, p.y, 154, 184) < 36;
}
function nearFireplace() {
  const p = getActivePlayer();
  return dist(p.x, p.y, 402, 138) < 38;
}
function nearHouseExit() {
  const p = getActivePlayer();
  return dist(p.x, p.y, 240, 248) < 28;
}

function getActionInfo() {
  if (scene === 'house') {
    const npc = findIndoorNPC();
    if (npc) return { label: `Nói chuyện với ${npc.name}`, action: 'npc', npc };
    if (nearHouseBed()) return { label: 'Đi ngủ', action: 'sleep' };
    if (nearHouseTable()) return { label: 'Đọc thư bên bàn', action: 'table' };
    if (nearFireplace()) return { label: state.flags.warmedToday ? 'Sưởi ấm (đã sưởi hôm nay)' : 'Sưởi ấm bên lò', action: 'fire' };
    if (nearHouseExit()) return { label: 'Ra ngoài', action: 'exit' };
    return null;
  }

  const house = findNearbyHouse();
  if (house) return { label: `Vào ${house.name}`, action: 'enter-house', house };
  if (nearChest(SHOP_CHEST)) return { label: 'Mở hòm tiếp tế', action: 'shop' };
  if (nearChest(SELL_CHEST)) return { label: 'Gửi hàng đi bán', action: 'sell' };

  const npc = findNearbyNPC();
  if (npc) {
    const questReady = npc.quest && !state.npcQuests[npc.id] &&
      (state.inventory.produce[npc.quest.item] || 0) >= npc.quest.count;
    return {
      label: questReady ? `Trao ${npc.quest.count} ${CROPS[npc.quest.item]?.name.toLowerCase() || npc.quest.item} cho ${npc.name}` : `Nói chuyện với ${npc.name}`,
      action: 'npc',
      npc,
    };
  }

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

function pulseSceneFade(duration = 320) {
  const fade = document.getElementById('scene-fade');
  if (!fade) return;
  fade.classList.add('is-active');
  setTimeout(() => fade.classList.remove('is-active'), duration);
}

function transitionScene(fn) {
  if (transitioning) return;
  transitioning = true;
  const fade = document.getElementById('scene-fade');
  if (fade) fade.classList.add('is-active');
  setTimeout(() => {
    fn();
    setTimeout(() => {
      if (fade) fade.classList.remove('is-active');
      transitioning = false;
    }, 120);
  }, 210);
}

function enterHouse(house = HOUSE) {
  if (transitioning) return;
  const target = house || HOUSE;
  sfx('open');
  transitionScene(() => {
    activeHouse = target.id || 'grandma';
    scene = 'house';
    document.getElementById('game-frame').classList.add('is-house');
    state.housePlayer.x = 240;
    state.housePlayer.y = 216;
    state.housePlayer.dir = 'up';
    state.housePlayer.moving = false;
    cam.x = 0;
    cam.y = 0;
    updateHUD();
    updatePrompt();
    saveGame(true);
  });
}

function exitHouse() {
  if (transitioning) return;
  const h = currentHouse();
  const px = h.door.x;
  const py = h.door.y + 20;
  sfx('open');
  transitionScene(() => {
    scene = 'farm';
    document.getElementById('game-frame').classList.remove('is-house');
    activeHouse = 'grandma';
    state.player.x = px;
    state.player.y = py;
    state.player.dir = 'down';
    state.player.moving = false;
    snapCameraToPlayer();
    updateHUD();
    updatePrompt();
    saveGame(true);
  });
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
  if (modalOpen || transitioning || (scene !== 'farm' && scene !== 'house')) return;
  initAudio();

  if (scene === 'house') {
    const npc = findIndoorNPC();
    if (npc) { sfx('click'); openNPCDialogue(npc); return; }
    if (nearHouseBed()) { sfx('click'); openSleepConfirm(false); return; }
    if (nearHouseTable()) { sfx('click'); openJournal('letters'); return; }
    if (nearFireplace()) { warmByFire(); return; }
    if (nearHouseExit()) { exitHouse(); return; }
    toast('Không có gì để làm ở đây.');
    return;
  }

  const house = findNearbyHouse();
  if (house) { enterHouse(house); return; }
  if (nearChest(SHOP_CHEST)) { openShop('seeds'); return; }
  if (nearChest(SELL_CHEST)) { openSell(); return; }

  const npc = findNearbyNPC();
  if (npc) { sfx('click'); openNPCDialogue(npc); return; }

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
  const rnd = makeRng((worldSeed ^ 0x9e3779b9) >>> 0);

  // plain grass tile from the tileset (column 9, row 2)
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      g.drawImage(IMG.grass, 9 * 16, 2 * 16, 16, 16, x * 16, y * 16, 16, 16);
    }
  }

  // soft irregular patches keep the large meadow from becoming a green grid
  for (let i = 0; i < 160; i++) {
    const x = Math.floor(rnd() * WORLD_W);
    const y = Math.floor(rnd() * WORLD_H);
    if (terrainAtPixel(x, y) !== TERRAIN.GRASS || isPathAt(x, y)) continue;
    g.fillStyle = rnd() > 0.55 ? 'rgba(109, 154, 73, 0.12)' : 'rgba(191, 212, 107, 0.07)';
    g.beginPath();
    g.ellipse(x, y, 14 + rnd() * 24, 7 + rnd() * 13, rnd() * 3, 0, Math.PI * 2);
    g.fill();
  }

  // sand rims first; the blue is laid over the middle of each water tile.
  for (const t of shoreTiles) {
    const x = t.x * TILE;
    const y = t.y * TILE;
    g.fillStyle = '#c2aa78';
    g.fillRect(x, y, TILE, TILE);
    g.fillStyle = '#d2bd8b';
    g.fillRect(x + 1, y + 1, TILE - 2, 2);
    g.fillStyle = 'rgba(122, 95, 54, 0.22)';
    g.fillRect(x, y + TILE - 2, TILE, 2);
  }

  // water
  for (const t of waterTiles) {
    const x = t.x * TILE;
    const y = t.y * TILE;
    const northWater = getTerrain(t.x, t.y - 1) === TERRAIN.WATER || getTerrain(t.x, t.y - 1) === TERRAIN.BRIDGE;
    const westWater = getTerrain(t.x - 1, t.y) === TERRAIN.WATER || getTerrain(t.x - 1, t.y) === TERRAIN.BRIDGE;
    g.fillStyle = northWater ? '#2f6971' : '#3d7d80';
    g.fillRect(x, y, TILE, TILE);
    g.fillStyle = '#275a64';
    g.fillRect(x, y + 10, TILE, 6);
    if (!northWater) {
      g.fillStyle = '#76a79e';
      g.fillRect(x + 1, y, TILE - 2, 1);
      g.fillRect(x + 3, y + 1, 7, 1);
    }
    if (!westWater) {
      g.fillStyle = '#5f948d';
      g.fillRect(x, y + 2, 1, TILE - 5);
    }
    g.fillStyle = 'rgba(162, 214, 207, 0.55)';
    const wx = x + 3 + ((t.x * 7 + t.y * 3) % 7);
    const wy = y + 4 + ((t.x * 5 + t.y * 11) % 6);
    g.fillRect(wx, wy, 6, 1);
    g.fillRect(wx + 2, wy + 2, 4, 1);
    g.fillStyle = 'rgba(20, 65, 70, 0.4)';
    g.fillRect(x + 10, y + 12, 4, 1);
  }

  // mountain tiles: dark heath, exposed stone, snow on the top edge
  for (const t of mountainTiles) {
    const x = t.x * TILE;
    const y = t.y * TILE;
    const top = getTerrain(t.x, t.y - 1) !== TERRAIN.MOUNTAIN;
    const westEdge = getTerrain(t.x - 1, t.y) !== TERRAIN.MOUNTAIN;
    g.fillStyle = '#4d554c';
    g.fillRect(x, y, TILE, TILE);
    g.fillStyle = '#3a4139';
    g.fillRect(x, y + 11, TILE, 5);
    g.fillStyle = '#697065';
    g.fillRect(x + 2, y + 3, 5, 2);
    g.fillRect(x + 10, y + 7, 4, 2);
    g.fillStyle = '#2f352e';
    g.fillRect(x + 1, y + 1, 1, 2);
    g.fillRect(x + 8, y + 12, 5, 1);
    if (westEdge) {
      g.fillStyle = '#2f352e';
      g.fillRect(x, y, 2, TILE);
      g.fillStyle = '#70796c';
      g.fillRect(x + 2, y + 2, 2, 12);
      g.fillStyle = '#424b41';
      g.fillRect(x + 4, y + 6, 1, 5);
      g.fillStyle = '#586451';
      g.fillRect(x + 2, y + 14, 4, 2);
    }
    if (top) {
      g.fillStyle = '#d6dccd';
      g.fillRect(x + 1, y, 6, 2);
      g.fillStyle = '#b9c2b5';
      g.fillRect(x + 4, y + 2, 5, 1);
      g.fillRect(x + 10, y + 1, 3, 1);
      g.fillStyle = '#8e978b';
      g.fillRect(x + 7, y, 2, 1);
    }
    if (rnd() < 0.2) {
      g.fillStyle = '#8b8f80';
      g.fillRect(x + 9, y + 4, 2, 1);
    }
    if (rnd() < 0.13) {
      g.fillStyle = '#7d8577';
      g.fillRect(x + 5, y + 10, 3, 2);
      g.fillStyle = '#3b423b';
      g.fillRect(x + 5, y + 12, 3, 1);
    }
  }

  // the mountain range, painted as a backdrop above the playable ground
  for (const peak of MOUNTAIN_PEAKS) drawMountainPeak(g, peak, rnd);

  // a few pines cling to the cliff, softening the wall of stone
  for (const [tx, ty] of [[76, 4], [76, 11], [77, 19], [76, 27], [77, 35]]) {
    if (getTerrain(tx, ty) !== TERRAIN.MOUNTAIN) continue;
    drawPine(g, tx * TILE + 8, ty * TILE + 14, rnd);
  }

  // paths and the village square
  for (const r of PATH_RECTS) {
    const plaza = r.kind === 'plaza';
    const trail = r.kind === 'trail';
    for (let y = Math.floor(r.y / TILE); y < Math.ceil((r.y + r.h) / TILE); y++) {
      for (let x = Math.floor(r.x / TILE); x < Math.ceil((r.x + r.w) / TILE); x++) {
        if (getTerrain(x, y) === TERRAIN.BRIDGE) continue;
        if (getTerrain(x, y) === TERRAIN.WATER || getTerrain(x, y) === TERRAIN.MOUNTAIN) continue;
        const px = x * TILE;
        const py = y * TILE;
        if (plaza) {
          g.fillStyle = (x + y) % 2 ? '#938c76' : '#a39c84';
          g.fillRect(px, py, TILE, TILE);
          g.fillStyle = 'rgba(80, 76, 61, 0.42)';
          g.fillRect(px + 1, py + 15, TILE - 2, 1);
          g.fillRect(px + 15, py + 2, 1, 13);
          g.fillStyle = 'rgba(233, 224, 191, 0.16)';
          g.fillRect(px + 3, py + 4, 5, 2);
        } else {
          g.fillStyle = trail ? '#a98c5f' : '#b59768';
          g.fillRect(px, py, TILE, TILE);
          g.fillStyle = trail ? '#94784f' : '#96784f';
          g.fillRect(px, py + 15, TILE, 1);
          g.fillStyle = 'rgba(111, 88, 55, 0.5)';
          g.fillRect(px + 2, py + 5, 2, 1);
          g.fillRect(px + 9, py + 11, 3, 1);
          g.fillStyle = 'rgba(217, 190, 137, 0.35)';
          g.fillRect(px + 5, py + 2, 2, 1);
        }
      }
    }
  }

  // the village well and the merchant's open stall
  g.fillStyle = 'rgba(34, 38, 30, 0.25)';
  g.beginPath();
  g.ellipse(1080, 225, 20, 7, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#585c51';
  g.fillRect(1065, 212, 30, 12);
  g.fillStyle = '#8f927f';
  g.fillRect(1068, 207, 24, 8);
  g.fillStyle = '#b0b19a';
  g.fillRect(1070, 207, 20, 2);
  g.fillStyle = '#2d5a62';
  g.fillRect(1073, 210, 14, 4);
  g.fillStyle = '#24474e';
  g.fillRect(1075, 211, 10, 2);
  g.fillStyle = '#5d4029';
  g.fillRect(1064, 196, 3, 18);
  g.fillRect(1092, 196, 3, 18);
  g.fillStyle = '#8a6842';
  g.fillRect(1062, 193, 36, 3);
  g.fillStyle = '#4e3320';
  g.fillRect(1079, 196, 2, 10);
  g.fillStyle = '#b58b53';
  g.fillRect(1077, 205, 6, 4);
  g.fillStyle = '#3f2b1b';
  g.fillRect(1120, 200, 60, 5);
  g.fillStyle = '#8b6038';
  g.fillRect(1120, 197, 60, 4);
  g.fillStyle = '#4e3320';
  g.fillRect(1124, 205, 3, 12);
  g.fillRect(1174, 205, 3, 12);
  g.fillStyle = '#9a7448';
  g.fillRect(1130, 204, 13, 8);
  g.fillRect(1148, 204, 13, 8);
  g.fillStyle = '#d9a441';
  g.fillRect(1132, 203, 3, 2);
  g.fillRect(1137, 203, 3, 2);
  g.fillStyle = '#c96b4f';
  g.fillRect(1150, 203, 2, 2);
  g.fillRect(1155, 203, 2, 2);
  g.fillStyle = '#f1e7c8';
  g.fillRect(1166, 204, 8, 5);
  g.fillStyle = '#b8a97e';
  g.fillRect(1166, 205, 8, 1);
  // flower planters at the square's corners
  for (const [px, py] of [[1002, 184], [1180, 184], [1002, 250], [1180, 250]]) {
    g.fillStyle = '#5d4029';
    g.fillRect(px, py, 16, 7);
    g.fillStyle = '#8a6842';
    g.fillRect(px + 1, py, 14, 2);
    g.fillStyle = '#527d3d';
    g.fillRect(px + 2, py - 3, 2, 4);
    g.fillRect(px + 7, py - 4, 2, 5);
    g.fillRect(px + 12, py - 2, 2, 3);
    g.fillStyle = '#d97a6b';
    g.fillRect(px + 1, py - 4, 2, 2);
    g.fillStyle = '#f0c36a';
    g.fillRect(px + 6, py - 5, 2, 2);
    g.fillStyle = '#f1e7c8';
    g.fillRect(px + 11, py - 3, 2, 2);
  }
  // a low bench beside the well
  g.fillStyle = '#4e3320';
  g.fillRect(1104, 248, 32, 4);
  g.fillStyle = '#9a7448';
  g.fillRect(1102, 245, 36, 4);
  g.fillStyle = '#6c492d';
  g.fillRect(1106, 249, 3, 5);
  g.fillRect(1131, 249, 3, 5);

  // the bridge over the river
  for (const t of bridgeTiles) {
    const x = t.x * TILE;
    const y = t.y * TILE;
    g.fillStyle = '#8b6038';
    g.fillRect(x, y, TILE, TILE);
    g.fillStyle = '#a77946';
    g.fillRect(x + 1, y + 1, TILE - 2, 2);
    g.fillStyle = '#6d492d';
    for (let i = 0; i < 3; i++) g.fillRect(x + 2 + i * 5, y + 5, 1, 9);
    g.fillStyle = '#c0955b';
    g.fillRect(x, y + 3, TILE, 1);
    g.fillRect(x, y + 13, TILE, 1);
    const northBridge = getTerrain(t.x, t.y - 1) === TERRAIN.BRIDGE;
    const southBridge = getTerrain(t.x, t.y + 1) === TERRAIN.BRIDGE;
    if (!northBridge) {
      g.fillStyle = '#4e3320';
      g.fillRect(x, y - 2, TILE, 2);
      g.fillStyle = '#b98a55';
      g.fillRect(x + 1, y - 2, 2, 2);
      g.fillRect(x + 13, y - 2, 2, 2);
    }
    if (!southBridge) {
      g.fillStyle = '#4e3320';
      g.fillRect(x, y + TILE, TILE, 2);
    }
  }

  // grass and wildflowers (skipping paths, water, buildings and the pen)
  for (let i = 0; i < 1900; i++) {
    const x = Math.floor(rnd() * (WORLD_W - 4)) + 2;
    const y = Math.floor(rnd() * (WORLD_H - 6)) + 3;
    if (isPathAt(x, y) || terrainAtPixel(x, y) !== TERRAIN.GRASS) continue;
    if (nearHouse(x, y, 2)) continue;
    if (x >= PEN.x && x < PEN.x + PEN.w && y >= PEN.y && y < PEN.y + PEN.h) continue;
    g.fillStyle = rnd() > 0.5 ? '#68a94a' : '#8acb60';
    g.fillRect(x, y, 1, 2);
    g.fillRect(x + 2, y + 1, 1, 2);
    if (rnd() > 0.55) g.fillRect(x + 1, y - 1, 1, 1);
  }
  for (let i = 0; i < 240; i++) {
    const x = Math.floor(rnd() * (WORLD_W - 4)) + 2;
    const y = Math.floor(rnd() * (WORLD_H - 6)) + 4;
    if (isPathAt(x, y) || terrainAtPixel(x, y) !== TERRAIN.GRASS) continue;
    if (nearHouse(x, y, 2)) continue;
    g.fillStyle = '#527d3d';
    g.fillRect(x, y + 1, 1, 2);
    const color = rnd() > 0.7 ? '#f0e6c8' : (rnd() > 0.5 ? '#f0c36a' : '#d97a6b');
    g.fillStyle = color;
    g.fillRect(x - 1, y, 1, 1);
    g.fillRect(x + 1, y, 1, 1);
    g.fillRect(x, y - 1, 1, 1);
    g.fillRect(x, y + 1, 1, 1);
  }

  // generated wild props
  for (const d of groundDecor) {
    if (d.type === 'rock') {
      g.fillStyle = 'rgba(44, 49, 38, 0.25)';
      g.fillRect(d.x + 1, d.y + 3, 5, 2);
      g.fillStyle = '#757d67';
      g.fillRect(d.x, d.y, 5, 3);
      g.fillStyle = '#9aa18a';
      g.fillRect(d.x + 1, d.y, 3, 1);
    } else if (d.type === 'flower') {
      g.fillStyle = '#527d3d';
      g.fillRect(d.x, d.y + 1, 1, 3);
      g.fillStyle = d.color;
      g.fillRect(d.x - 1, d.y, 1, 1);
      g.fillRect(d.x + 1, d.y, 1, 1);
      g.fillRect(d.x, d.y - 1, 1, 1);
    }
  }

  // reeds and lilies at the water's edge
  for (const t of shoreTiles) {
    if (rnd() > 0.36) continue;
    const x = t.x * TILE + 3 + rnd() * 9;
    const y = t.y * TILE + 5 + rnd() * 7;
    if (isPathAt(x, y) || nearHouse(x, y, 4)) continue;
    g.strokeStyle = '#557d43';
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(x, y + 7);
    g.lineTo(x + 1, y);
    g.moveTo(x + 2, y + 7);
    g.lineTo(x + 4, y + 2);
    g.stroke();
    g.fillStyle = '#b98a5a';
    g.fillRect(x + 1, y + 1, 1, 2);
  }
  for (let i = 0; i < 34; i++) {
    const tx = 17 + Math.floor(rnd() * 11);
    const ty = 39 + Math.floor(rnd() * 10);
    if (getTerrain(tx, ty) !== TERRAIN.WATER) continue;
    const x = tx * TILE + 3 + rnd() * 7;
    const y = ty * TILE + 4 + rnd() * 7;
    g.fillStyle = 'rgba(44, 93, 63, 0.85)';
    g.beginPath();
    g.ellipse(x, y, 4, 2, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#86a96a';
    g.fillRect(x - 1, y - 1, 2, 1);
    if (rnd() > 0.7) {
      g.fillStyle = '#f0c36a';
      g.fillRect(x + 1, y - 2, 2, 2);
    }
  }

  // the lake dock
  for (const side of [365, 400]) {
    g.fillStyle = '#4e3320';
    g.fillRect(side, 604, 3, 54);
    g.fillStyle = '#8a6842';
    for (let i = 0; i < 7; i++) g.fillRect(side, 608 + i * 8, 3, 2);
    g.fillStyle = '#b98a55';
    g.fillRect(side, 604, 3, 2);
  }
  g.fillStyle = '#4e3320';
  g.fillRect(366, 655, 36, 3);
  g.fillStyle = '#a57645';
  g.fillRect(368, 654, 32, 1);
  g.fillStyle = '#2f6971';
  // little rowboat with a pair of oars
  g.fillStyle = '#332313';
  g.fillRect(408, 637, 24, 7);
  g.fillStyle = '#7e5734';
  g.fillRect(410, 639, 20, 4);
  g.fillStyle = '#b98a55';
  g.fillRect(414, 638, 12, 1);
  g.fillStyle = '#c9b98e';
  g.fillRect(410, 636, 2, 1);
  g.fillRect(428, 636, 2, 1);
  g.fillStyle = '#4d3521';
  g.fillRect(412, 643, 16, 1);
  g.fillStyle = '#d0b080';
  g.fillRect(423, 634, 13, 1);
  g.fillRect(423, 635, 1, 5);
  g.fillStyle = '#9a7448';
  g.fillRect(414, 640, 3, 2);

  // the lake sign at the fork in the trail
  g.fillStyle = '#5d4029';
  g.fillRect(342, 585, 3, 14);
  g.fillStyle = '#8a6842';
  g.fillRect(330, 575, 30, 12);
  g.fillStyle = '#4e3320';
  g.fillRect(330, 575, 30, 1);
  g.fillRect(330, 586, 30, 1);
  g.fillStyle = '#f0c36a';
  g.font = 'bold 8px "VT323", "Courier New", monospace';
  g.fillText('HỒ SEN', 334, 584);
  g.fillStyle = '#9ec7b2';
  g.fillRect(334, 578, 5, 1);
  g.fillRect(336, 580, 3, 1);

  // the old field sign
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

  // the village sign, where the bridge meets the far bank
  g.fillStyle = '#5d4029';
  g.fillRect(810, 114, 4, 28);
  g.fillStyle = '#8a6842';
  g.fillRect(795, 112, 44, 15);
  g.fillStyle = '#4e3320';
  g.fillRect(795, 112, 44, 1);
  g.fillRect(795, 126, 44, 1);
  g.fillStyle = '#f0c36a';
  g.font = 'bold 9px "VT323", "Courier New", monospace';
  g.fillText('LÀNG MÂY', 800, 123);

  // many path stones make the road feel walked-on
  for (let i = 0; i < 80; i++) {
    const x = Math.floor(rnd() * (WORLD_W - 8)) + 2;
    const y = Math.floor(rnd() * (WORLD_H - 8)) + 2;
    if (!isPathAt(x, y) || terrainAtPixel(x, y) !== TERRAIN.GRASS) continue;
    g.fillStyle = rnd() > 0.5 ? '#7d745d' : '#9b9479';
    g.fillRect(x, y, 3, 2);
  }

  // pen interior gets a faint worn patch
  g.fillStyle = 'rgba(110, 92, 57, 0.12)';
  g.fillRect(PEN.inner.x, PEN.inner.y, PEN.inner.w, PEN.inner.h);
}

const MOUNTAIN_PEAKS = [
  { x: 1216, y: -28, w: 108, h: 162 },
  { x: -34, y: 648, w: 184, h: 198 },
  { x: 774, y: 766, w: 220, h: 138 },
  { x: 954, y: 786, w: 210, h: 128 },
];

function drawMountainPeak(g, p, rnd) {
  const { x, y, w, h } = p;
  g.save();
  g.beginPath();
  g.moveTo(x, y + h);
  g.lineTo(x + w * 0.15, y + h * 0.64);
  g.lineTo(x + w * 0.28, y + h * 0.72);
  g.lineTo(x + w * 0.44, y + h * 0.12);
  g.lineTo(x + w * 0.55, y + h * 0.48);
  g.lineTo(x + w * 0.68, y + h * 0.28);
  g.lineTo(x + w * 0.82, y + h * 0.69);
  g.lineTo(x + w, y + h * 0.57);
  g.lineTo(x + w, y + h);
  g.closePath();
  g.fillStyle = '#4a544b';
  g.fill();
  g.fillStyle = '#657066';
  g.beginPath();
  g.moveTo(x + w * 0.44, y + h * 0.12);
  g.lineTo(x + w * 0.55, y + h * 0.48);
  g.lineTo(x + w * 0.68, y + h * 0.28);
  g.lineTo(x + w * 0.82, y + h * 0.69);
  g.lineTo(x + w, y + h * 0.57);
  g.lineTo(x + w, y + h);
  g.lineTo(x + w * 0.44, y + h);
  g.closePath();
  g.fill();
  g.fillStyle = '#687469';
  g.fillRect(x + w * 0.31, y + h * 0.73, w * 0.2, 2);
  g.fillRect(x + w * 0.58, y + h * 0.62, w * 0.13, 2);
  g.fillRect(x + w * 0.72, y + h * 0.79, w * 0.18, 2);
  g.fillStyle = '#3d473e';
  g.fillRect(x + w * 0.36, y + h * 0.82, w * 0.24, 2);
  g.fillRect(x + w * 0.63, y + h * 0.9, w * 0.27, 2);
  g.strokeStyle = 'rgba(41, 48, 41, 0.55)';
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(x + w * 0.44, y + h * 0.12);
  g.lineTo(x + w * 0.42, y + h * 0.44);
  g.lineTo(x + w * 0.38, y + h * 0.66);
  g.moveTo(x + w * 0.68, y + h * 0.28);
  g.lineTo(x + w * 0.64, y + h * 0.5);
  g.lineTo(x + w * 0.7, y + h * 0.8);
  g.stroke();
  g.fillStyle = '#e2e7da';
  g.beginPath();
  g.moveTo(x + w * 0.44, y + h * 0.12);
  g.lineTo(x + w * 0.49, y + h * 0.27);
  g.lineTo(x + w * 0.53, y + h * 0.2);
  g.lineTo(x + w * 0.58, y + h * 0.38);
  g.lineTo(x + w * 0.63, y + h * 0.27);
  g.lineTo(x + w * 0.68, y + h * 0.28);
  g.lineTo(x + w * 0.72, y + h * 0.43);
  g.lineTo(x + w * 0.67, y + h * 0.44);
  g.lineTo(x + w * 0.62, y + h * 0.36);
  g.lineTo(x + w * 0.57, y + h * 0.45);
  g.lineTo(x + w * 0.51, y + h * 0.31);
  g.lineTo(x + w * 0.46, y + h * 0.37);
  g.closePath();
  g.fill();
  g.fillStyle = 'rgba(230, 235, 223, 0.55)';
  g.fillRect(x + w * 0.49, y + h * 0.29, w * 0.06, 2);
  g.fillRect(x + w * 0.55, y + h * 0.33, w * 0.08, 1);
  g.fillStyle = 'rgba(29, 35, 30, 0.24)';
  g.fillRect(x + w * 0.3, y + h * 0.75, w * 0.5, 4);
  g.restore();
}

function drawPine(g, x, y, rnd) {
  g.save();
  g.fillStyle = 'rgba(20, 28, 20, 0.22)';
  g.beginPath();
  g.ellipse(x, y + 1, 7, 3, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#4b3221';
  g.fillRect(x - 1, y - 7, 2, 8);
  const layers = [[-14, 13, 9], [-20, 11, 7], [-25, 8, 5]];
  for (const [oy, half, height] of layers) {
    g.fillStyle = '#2f5c3b';
    g.beginPath();
    g.moveTo(x, y + oy - height);
    g.lineTo(x - half, y + oy + 3);
    g.lineTo(x + half, y + oy + 3);
    g.closePath();
    g.fill();
    g.fillStyle = '#45734a';
    g.beginPath();
    g.moveTo(x, y + oy - height + 1);
    g.lineTo(x - half + 2, y + oy + 1);
    g.lineTo(x + half - 2, y + oy + 1);
    g.closePath();
    g.fill();
    if (rnd() > 0.35) {
      g.fillStyle = 'rgba(226, 231, 218, 0.8)';
      g.fillRect(x - 3, y + oy - height + 2, 6, 2);
    }
  }
  g.restore();
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

const HOUSE_SPRITE_CACHE = new Map();

function houseSprite(house) {
  if (!house.tint) return IMG.house;
  if (HOUSE_SPRITE_CACHE.has(house.id)) return HOUSE_SPRITE_CACHE.get(house.id);
  const c = document.createElement('canvas');
  c.width = 80;
  c.height = 112;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.drawImage(IMG.house, 144, 0, 80, 112, 0, 0, 80, 112);
  g.globalCompositeOperation = 'source-atop';
  g.globalAlpha = 0.46;
  g.fillStyle = house.tint;
  g.fillRect(0, 0, 80, 58);
  g.globalAlpha = 0.08;
  g.fillRect(0, 58, 80, 54);
  g.globalAlpha = 0.7;
  g.fillRect(0, 53, 80, 2);
  g.globalCompositeOperation = 'source-over';
  // window boxes make each cottage feel lived in
  g.fillStyle = '#6a4a2d';
  g.fillRect(16, 72, 20, 3);
  g.fillRect(48, 72, 20, 3);
  g.fillStyle = '#d9a441';
  g.fillRect(18, 69, 2, 2);
  g.fillRect(22, 68, 2, 3);
  g.fillRect(50, 69, 2, 2);
  g.fillRect(55, 68, 2, 3);
  g.fillStyle = 'rgba(47, 36, 22, 0.45)';
  g.fillRect(0, 56, 80, 2);
  HOUSE_SPRITE_CACHE.set(house.id, c);
  return c;
}

function drawHouse(house, cx, cy) {
  const h = house || HOUSE;
  const x = h.x - cx;
  const y = h.y - cy;
  drawShadow(x + 40, y + h.h - 4, 35, 4, 0.2);
  const sprite = houseSprite(h);
  if (h.tint) ctx.drawImage(sprite, x, y, 80, 112);
  else ctx.drawImage(sprite, 144, 0, 80, 112, x, y, 80, 112);
  // doorstep
  ctx.fillStyle = '#8f7048';
  ctx.fillRect(x + 35, y + 108, 10, 5);
  ctx.fillStyle = '#b59768';
  ctx.fillRect(x + 36, y + 109, 8, 2);
  if (h.id !== 'grandma') {
    // a small hanging plaque beside the door
    ctx.fillStyle = '#3f2b1b';
    ctx.fillRect(x + 12, y + 94, 19, 10);
    ctx.fillStyle = h.tint || '#b58b53';
    ctx.fillRect(x + 13, y + 95, 17, 8);
    ctx.fillStyle = '#46351f';
    ctx.fillRect(x + 15, y + 99, 13, 2);
    ctx.fillStyle = '#f0c36a';
    ctx.fillRect(x + 20, y + 97, 3, 2);
    // striped awning above the door
    ctx.fillStyle = h.tint || '#9a7448';
    ctx.fillRect(x + 31, y + 92, 18, 3);
    ctx.fillStyle = 'rgba(241, 231, 200, 0.65)';
    ctx.fillRect(x + 35, y + 92, 3, 3);
    ctx.fillRect(x + 42, y + 92, 3, 3);
  }
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

const NPC_SHEET_CACHE = new Map();

function tintedPlayerSheet(set, key, color) {
  const cacheKey = `${key}:${color}`;
  if (NPC_SHEET_CACHE.has(cacheKey)) return NPC_SHEET_CACHE.get(cacheKey);
  const c = document.createElement('canvas');
  c.width = set.width;
  c.height = set.height;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.drawImage(set, 0, 0);
  g.globalCompositeOperation = 'source-atop';
  g.globalAlpha = 0.25;
  g.fillStyle = color;
  g.fillRect(0, 0, c.width, c.height);
  g.globalAlpha = 0.14;
  g.fillStyle = '#fff5d6';
  g.fillRect(0, 0, c.width, c.height * 0.45);
  NPC_SHEET_CACHE.set(cacheKey, c);
  return c;
}

function drawNPC(npc, cx, cy, indoor = false) {
  const row = npc.dir === 'down' ? 0 : npc.dir === 'up' ? 1 : 2;
  const flip = npc.dir === 'left';
  const set = npc.moving ? IMG.player_walk : IMG.player_idle;
  const tinted = tintedPlayerSheet(set, npc.moving ? 'walk' : 'idle', npc.color);
  const frames = npc.moving ? 6 : 4;
  const speed = npc.moving ? 10 : 3;
  const frame = Math.floor(npc.animTime * speed) % frames;
  const dx = Math.round(npc.x - 16 - cx);
  const dy = Math.round(npc.y - 30 - cy);

  drawShadow(npc.x - cx, npc.y - 1 - cy, 7, 3, 0.22);
  ctx.save();
  if (flip) {
    ctx.translate(dx + 32, dy);
    ctx.scale(-1, 1);
    ctx.drawImage(tinted, frame * 32, row * 32, 32, 32, 0, 0, 32, 32);
  } else {
    ctx.drawImage(tinted, frame * 32, row * 32, 32, 32, dx, dy, 32, 32);
  }
  ctx.restore();

  const p = getActivePlayer();
  if (indoor || (scene === 'farm' && dist(p.x, p.y, npc.x, npc.y) < 170)) {
    const label = npc.name;
    ctx.save();
    ctx.font = 'bold 9px "VT323", "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const tw = Math.ceil(ctx.measureText(label).width);
    const nx = Math.round(npc.x - cx);
    const ny = Math.round(npc.y - 46 - cy);
    ctx.fillStyle = 'rgba(9, 12, 6, 0.82)';
    ctx.fillRect(nx - tw / 2 - 4, ny - 7, tw + 8, 14);
    ctx.fillStyle = 'rgba(241, 231, 200, 0.26)';
    ctx.fillRect(nx - tw / 2 - 4, ny - 7, tw + 8, 1);
    ctx.fillStyle = '#f1e7c8';
    ctx.fillText(label, nx, ny + 1);
    const q = npc.quest;
    if (q && !state.npcQuests[npc.id]) {
      const ready = (state.inventory.produce[q.item] || 0) >= q.count;
      ctx.fillStyle = ready ? '#f0c36a' : '#9ec7b2';
      ctx.font = 'bold 11px "VT323", "Courier New", monospace';
      ctx.fillText(ready ? '!' : '?', nx + tw / 2 + 9, ny - 7);
    }
    ctx.restore();
  }
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

  for (const h of HOUSES) {
    if (h.x + h.w < cx || h.x > cx + VIEW_W || h.y + h.h < cy || h.y > cy + VIEW_H + 30) continue;
    list.push({ y: h.y + h.h, draw: () => drawHouse(h, cx, cy) });
  }
  list.push({ y: BARN.y + BARN.h, draw: () => drawBarn(cx, cy) });
  list.push({ y: SHOP_CHEST.y + 16, draw: () => drawChest(SHOP_CHEST, cx, cy) });
  list.push({ y: SELL_CHEST.y + 16, draw: () => drawChest(SELL_CHEST, cx, cy) });

  for (const npc of NPCS) {
    if (npc.houseId) continue;
    if (npc.x < cx - 48 || npc.x > cx + VIEW_W + 48 || npc.y < cy - 64 || npc.y > cy + VIEW_H + 32) continue;
    list.push({ y: npc.y, draw: () => drawNPC(npc, cx, cy, false) });
  }

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
    for (const house of HOUSES) {
      const hx = house.door.x - cx;
      const hy = house.door.y - 24 - cy;
      if (hx < -80 || hx > VIEW_W + 80 || hy < -80 || hy > VIEW_H + 80) continue;
      const glow = ctx.createRadialGradient(hx, hy, 2, hx, hy, house.id === 'grandma' ? 34 : 30);
      glow.addColorStop(0, `rgba(255, 196, 92, ${house.id === 'grandma' ? 0.22 : 0.16})`);
      glow.addColorStop(1, 'rgba(255, 196, 92, 0)');
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = glow;
      ctx.fillRect(hx - 40, hy - 40, 80, 80);
      ctx.restore();
      // warm window pixels
      ctx.fillStyle = 'rgba(255, 206, 111, 0.8)';
      ctx.fillRect(house.x - cx + 52, house.y - cy + 62, 3, 4);
      ctx.fillRect(house.x - cx + 64, house.y - cy + 62, 3, 4);
    }
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

function drawWaterGlints(cx, cy) {
  if (!waterTiles.length) return;
  const now = performance.now() / 1000;
  ctx.save();
  ctx.fillStyle = 'rgba(190, 231, 220, 0.36)';
  for (const t of waterTiles) {
    const x = t.x * TILE - cx;
    const y = t.y * TILE - cy;
    if (x < -16 || x > VIEW_W || y < -16 || y > VIEW_H) continue;
    const phase = (t.x * 13 + t.y * 17) % 29;
    const glint = (now * 0.55 + phase * 0.12) % 1;
    if (glint > 0.14) continue;
    const ox = 3 + ((t.x * 3 + t.y * 5) % 8);
    const oy = 5 + ((t.x * 7 + t.y * 2) % 6);
    ctx.fillRect(x + ox, y + oy, 4, 1);
    ctx.fillRect(x + ox + 2, y + oy + 2, 3, 1);
  }
  ctx.restore();
}

function drawFurniturePiece(sx, sy, sw, sh, dx, dy, scale = 2) {
  ctx.drawImage(IMG.interior, sx, sy, sw, sh, dx, dy, sw * scale, sh * scale);
}

function renderFarm() {
  const cx = Math.round(cam.x);
  const cy = Math.round(cam.y);
  if (groundCanvas) {
    ctx.drawImage(groundCanvas, cx, cy, VIEW_W, VIEW_H, 0, 0, VIEW_W, VIEW_H);
  }
  drawWaterGlints(cx, cy);
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

function drawInteriorWallProps() {
  const key = activeHouse;
  if (key === 'lan') {
    // bundles of herbs and peppers hanging above the hearth
    for (const [x, y, color] of [[42, 52, '#6f8d4c'], [56, 46, '#d97a6b'], [70, 54, '#6f8d4c']]) {
      ctx.fillStyle = '#6c492d';
      ctx.fillRect(x, y - 10, 1, 12);
      ctx.fillStyle = color;
      ctx.fillRect(x - 3, y, 3, 8);
      ctx.fillRect(x + 1, y + 2, 3, 7);
      ctx.fillStyle = '#8dac65';
      ctx.fillRect(x - 2, y + 1, 2, 3);
    }
    // a little ceramic bowl on the wall shelf
    ctx.fillStyle = '#6a4a2d';
    ctx.fillRect(78, 72, 23, 3);
    ctx.fillStyle = '#b9c2b5';
    ctx.fillRect(82, 66, 12, 6);
    ctx.fillStyle = '#e0a05a';
    ctx.fillRect(85, 66, 6, 2);
  } else if (key === 'thu') {
    // a small chalkboard for the village class
    ctx.fillStyle = '#3c2a1e';
    ctx.fillRect(36, 44, 58, 36);
    ctx.fillStyle = '#263a32';
    ctx.fillRect(39, 47, 52, 30);
    ctx.fillStyle = 'rgba(241, 231, 200, 0.7)';
    ctx.fillRect(45, 54, 16, 1);
    ctx.fillRect(45, 58, 22, 1);
    ctx.fillRect(45, 64, 12, 1);
    ctx.fillStyle = '#d9a441';
    ctx.fillRect(65, 63, 4, 4);
    ctx.fillStyle = 'rgba(241, 231, 200, 0.35)';
    ctx.fillRect(75, 52, 9, 1);
  } else if (key === 'grandma') {
    // the photograph above the old dresser
    ctx.fillStyle = '#4b3221';
    ctx.fillRect(42, 46, 31, 25);
    ctx.fillStyle = '#d8cba8';
    ctx.fillRect(45, 49, 25, 19);
    ctx.fillStyle = '#7f9071';
    ctx.fillRect(50, 55, 7, 10);
    ctx.fillStyle = '#b97853';
    ctx.fillRect(59, 57, 6, 8);
    ctx.fillStyle = '#2b332c';
    ctx.fillRect(50, 55, 7, 2);
    ctx.fillRect(59, 57, 6, 2);
    ctx.fillStyle = '#d9a441';
    ctx.fillRect(49, 51, 2, 2);
    ctx.fillRect(62, 51, 2, 2);
  }
}

function drawWorkbenchProp(x, y) {
  ctx.fillStyle = 'rgba(15, 10, 6, 0.32)';
  ctx.fillRect(x + 3, y + 24, 52, 6);
  ctx.fillStyle = '#4b3221';
  ctx.fillRect(x + 4, y + 10, 4, 17);
  ctx.fillRect(x + 48, y + 10, 4, 17);
  ctx.fillStyle = '#8a6842';
  ctx.fillRect(x, y + 7, 56, 5);
  ctx.fillStyle = '#b98a55';
  ctx.fillRect(x + 2, y + 7, 52, 2);
  ctx.fillStyle = '#6a4a2d';
  ctx.fillRect(x + 8, y + 13, 18, 8);
  ctx.fillStyle = '#c8b477';
  ctx.fillRect(x + 30, y + 10, 15, 2);
  ctx.fillRect(x + 33, y + 6, 9, 2);
  ctx.fillStyle = '#9a7448';
  ctx.fillRect(x + 43, y + 1, 3, 7);
  ctx.fillStyle = '#b9c2b5';
  ctx.fillRect(x + 44, y - 2, 7, 3);
  ctx.fillStyle = '#d9a441';
  ctx.fillRect(x + 30, y + 15, 4, 2);
}

function drawSchoolDeskProp(x, y) {
  ctx.fillStyle = 'rgba(15, 10, 6, 0.28)';
  ctx.fillRect(x + 2, y + 22, 38, 5);
  ctx.fillStyle = '#4b3221';
  ctx.fillRect(x + 4, y + 10, 3, 15);
  ctx.fillRect(x + 31, y + 10, 3, 15);
  ctx.fillStyle = '#8a6842';
  ctx.fillRect(x, y + 7, 38, 5);
  ctx.fillStyle = '#b98a55';
  ctx.fillRect(x + 2, y + 7, 34, 2);
  ctx.fillStyle = '#36506b';
  ctx.fillRect(x + 6, y + 2, 13, 5);
  ctx.fillStyle = '#d8cba8';
  ctx.fillRect(x + 7, y + 2, 11, 1);
  ctx.fillStyle = '#a5533f';
  ctx.fillRect(x + 21, y + 4, 9, 3);
  ctx.fillStyle = '#f1e7c8';
  ctx.fillRect(x + 23, y + 4, 5, 1);
}

function drawArmchairProp(x, y) {
  ctx.fillStyle = 'rgba(15, 10, 6, 0.3)';
  ctx.fillRect(x + 2, y + 26, 34, 6);
  ctx.fillStyle = '#5d4029';
  ctx.fillRect(x, y + 8, 38, 22);
  ctx.fillStyle = '#8a6842';
  ctx.fillRect(x + 3, y + 4, 32, 8);
  ctx.fillStyle = '#b98a55';
  ctx.fillRect(x + 5, y + 5, 28, 2);
  ctx.fillStyle = '#3f2b1b';
  ctx.fillRect(x + 7, y + 13, 24, 12);
  ctx.fillStyle = '#9a7448';
  ctx.fillRect(x + 4, y + 20, 4, 8);
  ctx.fillRect(x + 30, y + 20, 4, 8);
  ctx.fillStyle = '#c8b477';
  ctx.fillRect(x + 13, y + 1, 2, 3);
}

function drawLanBasketProp(x, y) {
  ctx.fillStyle = '#6a4a2d';
  ctx.fillRect(x, y + 7, 24, 10);
  ctx.fillStyle = '#9a7448';
  ctx.fillRect(x + 1, y + 6, 22, 2);
  ctx.fillStyle = '#5d4029';
  for (let i = 0; i < 4; i++) ctx.fillRect(x + 3 + i * 5, y + 8, 1, 7);
  ctx.fillStyle = '#d97a6b';
  ctx.fillRect(x + 5, y + 3, 4, 4);
  ctx.fillRect(x + 12, y + 1, 4, 6);
  ctx.fillStyle = '#6f8d4c';
  ctx.fillRect(x + 8, y + 1, 2, 5);
  ctx.fillRect(x + 16, y + 2, 2, 4);
}

function drawTeaTableProp(x, y) {
  ctx.fillStyle = 'rgba(15, 10, 6, 0.28)';
  ctx.fillRect(x + 1, y + 13, 22, 4);
  ctx.fillStyle = '#5d4029';
  ctx.fillRect(x + 6, y + 7, 3, 9);
  ctx.fillRect(x + 17, y + 7, 3, 9);
  ctx.fillStyle = '#8a6842';
  ctx.fillRect(x, y + 4, 26, 4);
  ctx.fillStyle = '#b98a55';
  ctx.fillRect(x + 2, y + 4, 22, 1);
  ctx.fillStyle = '#b9c2b5';
  ctx.fillRect(x + 7, y, 6, 4);
  ctx.fillStyle = '#d9a441';
  ctx.fillRect(x + 9, y + 1, 2, 2);
  ctx.fillStyle = '#f1e7c8';
  ctx.fillRect(x + 18, y + 1, 4, 3);
}

function renderHouse() {
  const style = INTERIOR_STYLES[activeHouse] || INTERIOR_STYLES.grandma;
  const house = currentHouse();
  // wall
  ctx.fillStyle = style.wall;
  ctx.fillRect(0, 0, VIEW_W, 112);
  ctx.fillStyle = style.wallLine;
  for (let x = 0; x < VIEW_W; x += 16) ctx.fillRect(x, 0, 1, 112);
  ctx.fillStyle = style.trim;
  ctx.fillRect(0, 104, VIEW_W, 8);
  ctx.fillStyle = '#12180d';
  ctx.fillRect(0, 0, VIEW_W, 7);
  ctx.fillStyle = 'rgba(255, 214, 151, 0.045)';
  ctx.fillRect(0, 48, VIEW_W, 1);

  // floor
  ctx.fillStyle = style.floor;
  ctx.fillRect(0, 112, VIEW_W, VIEW_H - 112);
  for (let y = 112; y < VIEW_H; y += 16) {
    ctx.fillStyle = (Math.floor(y / 16) % 2 === 0) ? style.floorAlt : style.floor;
    ctx.fillRect(0, y, VIEW_W, 16);
    ctx.fillStyle = style.trim;
    ctx.fillRect(0, y, VIEW_W, 1);
    for (let x = (y / 16) % 2 ? 24 : 0; x < VIEW_W; x += 48) {
      ctx.fillStyle = 'rgba(45, 28, 16, 0.45)';
      ctx.fillRect(x, y + 1, 1, 15);
    }
    if (y % 32 === 0) {
      ctx.fillStyle = 'rgba(255, 205, 135, 0.04)';
      ctx.fillRect(0, y + 2, VIEW_W, 1);
    }
  }
  ctx.fillStyle = 'rgba(12, 9, 5, 0.28)';
  ctx.fillRect(0, 112, VIEW_W, 3);

  // rug
  drawFurniturePiece(0, 82, 48, 30, 196, 186, 2);

  // wall decor
  drawFurniturePiece(16, 47, 48, 17, 176, 28, 2);  // window and curtains
  drawFurniturePiece(18, 1, 12, 15, 300, 30, 2);    // framed picture
  drawFurniturePiece(1, 18, 13, 13, 340, 30, 2);    // clock
  drawFurniturePiece(34, 0, 11, 16, 112, 66, 2);    // potted tree
  ctx.fillStyle = '#6a4a2d';
  ctx.fillRect(104, 80, 32, 3);
  ctx.fillStyle = '#3c2a1a';
  ctx.fillRect(104, 83, 32, 1);
  drawInteriorWallProps();
  // warm nameplate over the room
  ctx.save();
  ctx.fillStyle = 'rgba(14, 18, 10, 0.72)';
  ctx.fillRect(182, 11, 116, 15);
  ctx.fillStyle = style.accent;
  ctx.fillRect(182, 11, 116, 1);
  ctx.fillRect(182, 25, 116, 1);
  ctx.fillStyle = style.accent;
  ctx.font = 'bold 9px "VT323", "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(style.name, 240, 19);
  ctx.restore();

  // door + threshold
  ctx.fillStyle = 'rgba(16, 11, 6, 0.5)';
  ctx.fillRect(220, 222, 40, 48);
  drawFurniturePiece(144, 19, 16, 23, 224, 224, 2);
  ctx.fillStyle = style.trim;
  ctx.fillRect(222, 219, 36, 3);
  ctx.fillStyle = house.id === 'grandma' ? '#d9a441' : '#9ec7b2';
  ctx.fillRect(237, 239, 5, 2);
  ctx.fillRect(238, 241, 3, 5);

  // fireplace glow
  const flicker = 0.16 + Math.sin(performance.now() / 130) * 0.025;
  const glow = ctx.createRadialGradient(402, 132, 2, 402, 132, 74);
  glow.addColorStop(0, `rgba(255, 172, 74, ${flicker})`);
  glow.addColorStop(1, 'rgba(255, 150, 50, 0)');
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = glow;
  ctx.fillRect(326, 58, 154, 156);
  ctx.restore();

  const p = state.housePlayer;
  const npc = NPCS.find(n => n.houseId === activeHouse);
  const drawables = [
    { y: 168, draw: () => drawFurniturePiece(115, 8, 26, 40, 376, 88, 2) }, // fireplace
    { y: 194, draw: () => drawFurniturePiece(2, 125, 11, 18, 104, 158, 2) }, // chair
    { y: 202, draw: () => drawFurniturePiece(68, 120, 24, 23, 128, 156, 2) }, // table
    { y: 194, draw: () => drawFurniturePiece(2, 125, 11, 18, 176, 158, 2) }, // chair
    { y: 204, draw: () => drawFurniturePiece(87, 8, 18, 34, 48, 136, 2) },  // bed
    { y: 232, draw: () => drawFurniturePiece(96, 120, 16, 18, 96, 196, 2) }, // dresser
  ];
  if (activeHouse === 'lan') drawables.push({ y: 189, draw: () => drawLanBasketProp(246, 172) });
  if (activeHouse === 'nam') drawables.push({ y: 151, draw: () => drawWorkbenchProp(244, 124) });
  if (activeHouse === 'thu') drawables.push({ y: 150, draw: () => drawSchoolDeskProp(245, 128) });
  if (activeHouse === 'thanh') {
    drawables.push({ y: 156, draw: () => drawArmchairProp(250, 126) });
    drawables.push({ y: 190, draw: () => drawTeaTableProp(292, 174) });
  }
  if (activeHouse === 'grandma') {
    drawables.push({ y: 156, draw: () => drawArmchairProp(250, 126) });
    drawables.push({ y: 190, draw: () => drawTeaTableProp(292, 174) });
  }
  if (npc) drawables.push({ y: npc.y, draw: () => drawNPC(npc, 0, 0, true) });
  drawables.push({ y: p.y, draw: () => drawPlayerSprite(p, 0, 0) });
  drawables.sort((a, b) => a.y - b.y);
  for (const d of drawables) d.draw();

  // letter on the table if unread
  if (state.lettersUnlocked.some(d => !state.lettersRead.includes(d))) {
    ctx.fillStyle = '#f1e7c8';
    ctx.fillRect(151, 166, 10, 5);
    ctx.fillStyle = '#b8a97e';
    ctx.fillRect(151, 167, 10, 1);
    ctx.fillStyle = '#d9a441';
    ctx.fillRect(155, 168, 2, 2);
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
  if (transitioning || (scene !== 'farm' && scene !== 'house')) return;
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

function npcCanWalk(x, y) {
  if (x < 16 || y < 16 || x > WORLD_W - 16 || y > WORLD_H - 12) return false;
  const terrain = terrainAtPixel(x, y);
  if (terrain === TERRAIN.WATER || terrain === TERRAIN.MOUNTAIN) return false;
  const box = { x: x - 4, y: y - 6, w: 8, h: 6 };
  return !FARM_SOLIDS.some(s => rectsOverlap(box, s));
}

function updateNPCs(dt) {
  for (const npc of NPCS) {
    npc.animTime += dt;
    if (npc.houseId) continue;
    if (npc.moving) {
      if (!npc.target) {
        npc.moving = false;
        npc.timer = 1 + Math.random() * 3;
        continue;
      }
      const dx = npc.target.x - npc.x;
      const dy = npc.target.y - npc.y;
      const d = Math.hypot(dx, dy);
      const step = 15 * dt;
      if (d <= step || d < 0.6) {
        npc.x = npc.target.x;
        npc.y = npc.target.y;
        npc.moving = false;
        npc.target = null;
        npc.timer = 1.2 + Math.random() * 3.6;
        continue;
      }
      const nx = npc.x + (dx / d) * step;
      const ny = npc.y + (dy / d) * step;
      if (npcCanWalk(nx, npc.y)) npc.x = nx; else { npc.moving = false; npc.target = null; npc.timer = 1; }
      if (npcCanWalk(npc.x, ny)) npc.y = ny; else { npc.moving = false; npc.target = null; npc.timer = 1; }
      if (Math.abs(dx) > Math.abs(dy)) npc.dir = dx < 0 ? 'left' : 'right';
      else npc.dir = dy < 0 ? 'up' : 'down';
      continue;
    }
    npc.timer -= dt;
    if (npc.timer > 0) continue;
    for (let attempt = 0; attempt < 5; attempt++) {
      const angle = Math.random() * Math.PI * 2;
      const range = npc.radius || 18;
      const tx = npc.homeX + Math.cos(angle) * range * Math.random();
      const ty = npc.homeY + Math.sin(angle) * range * Math.random() * 0.55;
      if (npcCanWalk(tx, ty)) {
        npc.target = { x: tx, y: ty };
        npc.moving = true;
        break;
      }
    }
    if (!npc.moving) npc.timer = 1.5;
  }
}

function checkStoryTriggers() {
  if (modalOpen || transitioning || scene !== 'farm') return;
  const p = state.player;
  if (!state.flags.villageSeen && p.x > VILLAGE_X && p.y > 110 && p.y < 210) {
    state.flags.villageSeen = true;
    state.stats.village = 1;
    checkObjectives();
    saveGame(true);
    const body = `
      <p>Qua cầu là <strong>Làng Mây</strong> — một thung lũng nhỏ nép giữa sông và núi. Người ta vẫn để đèn ngoài hiên cho những ai về muộn.</p>
      <p>Bà Lan giữ lửa ở căn nhà đầu làng. Bác Nam sửa cầu. Cô Thư mở lớp học. Ông Thành ngồi bên cửa sổ, kể chuyện cho bọn trẻ. Và ở bến sông, bác Bảo vẫn đợi những chuyến hàng không bao giờ đến muộn.</p>
      <p class="muted">Bạn có thể gõ cửa bất kỳ ngôi nhà nào. Dân làng có việc cần giúp, và họ cũng có chuyện để kể.</p>
      <div class="report-quote">“Ở làng này, bếp không bao giờ tắt hẳn.” — Bà Lan</div>`;
    openModal(modalShell({
      title: 'LÀNG MÂY',
      kicker: 'BÊN KIA CÂY CẦU · MỘT THUNG LŨNG KHÁC',
      body,
      cls: 'narrow',
      foot: `<button class="pixel-btn primary" data-mact="close">ĐI TIẾP</button>`,
    }), '[data-mact="close"]');
    sfx('quest');
    return;
  }
  if (!state.flags.lakeSeen && dist(p.x, p.y, 352, 700) < 140) {
    state.flags.lakeSeen = true;
    state.morale = clamp(state.morale + 3, 0, 100);
    saveGame(true);
    updateHUD();
    toast('Hồ Sen · Nước lạnh và trong. Bạn ngồi một lúc bên bờ hồ. Tinh thần +3.', 'good');
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
    updateNPCs(dt);
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
  updateNPCs(dt);
  updateAnimals(dt);
  updateTime(dt);
  if (modalOpen) return;
  checkStoryTriggers();
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
    state = newState();
    activeHouse = 'grandma';
    buildWorld(state.seed);
    initGround();
    buildHotbar();
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




