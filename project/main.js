import { audio } from './audio.js';

const WIDTH = 1080;
const HEIGHT = 1440;
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

const palette = {
  night: '#03192f',
  hudLine: '#f39b19',
  hudBlue: '#00233d',
  pinkTop: '#954a8f',
  sunset1: '#f2b35f',
  sunset2: '#d86d71',
  treeDark: '#2b3d19',
  treeMid: '#49622f',
  treeLight: '#7f9737',
  gold1: '#ffec56',
  gold2: '#ff8e00',
  white: '#f4f6ff',
  blue1: '#1f8ce0',
  blue2: '#0c4e91',
  panel: '#001e3a',
  panelBorder: '#8da5be',
  heart: '#ef4874',
  energy: '#56de61',
  road: '#9f8462',
  fence: '#7c4d2a'
};

const stars = Array.from({ length: 34 }, (_, i) => ({
  x: 90 + ((i * 137) % 900),
  y: 390 + ((i * 89) % 520),
  s: (i % 3) + 1
}));

const LEVEL_IMAGE_PATH = './level.png';
const LEVEL_SEGMENTS = [
  { sy: 0, sh: 341 },
  { sy: 341, sh: 341 },
  { sy: 682, sh: 342 }
];
const LEVEL_SOURCE_SECTION_WIDTH = 1536;
const LEVEL_SOURCE_SECTION_HEIGHT = 341;
const LEVEL_GROUND_SOURCE_Y = 287;
const LEVEL_BAND_Y = 180;
const LEVEL_BAND_HEIGHT = 1050;
const LEVEL_SCALE = LEVEL_BAND_HEIGHT / LEVEL_SOURCE_SECTION_HEIGHT;
const LEVEL_SECTION_WIDTH = Math.round(LEVEL_SOURCE_SECTION_WIDTH * LEVEL_SCALE);
const WORLD_WIDTH = LEVEL_SECTION_WIDTH * LEVEL_SEGMENTS.length;
const SEGMENT_WIDTH = LEVEL_SECTION_WIDTH;
const GROUND_Y = LEVEL_BAND_Y + Math.round(LEVEL_GROUND_SOURCE_Y * LEVEL_SCALE) + 50;
const DEFAULT_TERRAIN_PROFILES = [
  [
    { x: 0, y: 298 },
    { x: 180, y: 298 },
    { x: 360, y: 299 },
    { x: 560, y: 299 },
    { x: 720, y: 304 },
    { x: 860, y: 309 },
    { x: 1040, y: 311 },
    { x: 1240, y: 304 },
    { x: 1400, y: 298 },
    { x: 1536, y: 297 }
  ],
  [
    { x: 0, y: 299 },
    { x: 180, y: 299 },
    { x: 360, y: 300 },
    { x: 540, y: 304 },
    { x: 700, y: 311 },
    { x: 860, y: 314 },
    { x: 1020, y: 312 },
    { x: 1180, y: 305 },
    { x: 1340, y: 298 },
    { x: 1536, y: 295 }
  ],
  [
    { x: 0, y: 297 },
    { x: 220, y: 297 },
    { x: 420, y: 297 },
    { x: 640, y: 299 },
    { x: 840, y: 301 },
    { x: 1020, y: 300 },
    { x: 1220, y: 298 },
    { x: 1380, y: 297 },
    { x: 1536, y: 296 }
  ]
];
const DEFAULT_TERRAIN_SOLID_SPANS = [
  [
    { from: 0, to: 1536 }
  ],
  [
    { from: 0, to: 560 },
    { from: 1120, to: 1536 }
  ],
  [
    { from: 0, to: 1536 }
  ]
];
const TERRAIN_STORAGE_KEY = 'familygame-terrain';

let TERRAIN_PROFILES = DEFAULT_TERRAIN_PROFILES.map((section) => section.map((point) => ({ ...point })));
let TERRAIN_SOLID_SPANS = DEFAULT_TERRAIN_SOLID_SPANS.map((section) => section.map((span) => ({ ...span })));

const DEFAULT_CONFIG = {
  game: {
    title: 'Family Game',
    subtitle: 'Una storia di famiglia',
    totalGems: 10,
    timerSeconds: 238,
    startMessage: 'Corri verso destra e raccogli le stelle'
  },
  characters: [
    { id: 'dad', name: 'Papà', scale: 1.58, bob: 2.8, isPlayer: true },
    { id: 'mom', name: 'Mamma', scale: 1.52, bob: 2.2, isPlayer: false },
    { id: 'kid', name: 'Bimbo', scale: 1.40, bob: 2.6, isPlayer: false },
    { id: 'teen', name: 'Teen', scale: 1.54, bob: 2.3, isPlayer: false }
  ],
  formation: [
    { dx: 0, dy: 0 },
    { dx: 156, dy: 4 },
    { dx: 128, dy: 22 },
    { dx: 172, dy: 6 }
  ],
  collectibles: [
    { section: 0, x: 220, y: 954 },
    { section: 0, x: 520, y: 928 },
    { section: 0, x: 840, y: 982 },
    { section: 0, x: 1260, y: 950 },
    { section: 1, x: 164, y: 936 },
    { section: 1, x: 604, y: 990 },
    { section: 1, x: 1084, y: 958 },
    { section: 2, x: 28, y: 984 },
    { section: 2, x: 628, y: 944 },
    { section: 2, x: 1288, y: 970 }
  ]
};

const characterMeta = {
  dad: { label: 'PAPA', color: '#32b4ea', description: 'Forte e protettivo, sempre pronto all avventura', stats: [6, 5, 4, 4], speed: 1480 },
  mom: { label: 'MAMMA', color: '#ff6f91', description: 'Agile e precisa, tiene tutti sulla strada giusta', stats: [5, 5, 4, 4], speed: 1460 },
  kid: { label: 'FRATELLINO', color: '#56de61', description: 'Leggero e veloce, perfetto per superare i buchi', stats: [4, 5, 4, 4], speed: 1450 },
  teen: { label: 'FRATELLO', color: '#ffbf38', description: 'Equilibrato e pronto a guidare il gruppo', stats: [5, 4, 4, 4], speed: 1455 }
};

let config = structuredClone(DEFAULT_CONFIG);

function spritePaths(name) {
  return {
    right: {
      idle: `./assets/character-sprites/${name}/idle_right.png`,
      walk: Array.from({ length: 5 }, (_, index) => `./assets/character-sprites/${name}/walk_right_${index + 1}.png`),
      jump: Array.from({ length: 3 }, (_, index) => `./assets/character-sprites/${name}/jump_right_${index + 1}.png`)
    },
    left: {
      idle: `./assets/character-sprites/${name}/idle_left.png`,
      walk: Array.from({ length: 5 }, (_, index) => `./assets/character-sprites/${name}/walk_left_${index + 1}.png`),
      jump: Array.from({ length: 3 }, (_, index) => `./assets/character-sprites/${name}/jump_left_${index + 1}.png`)
    }
  };
}

const SPRITE_PATHS = {
  dad: spritePaths('dad'),
  mom: spritePaths('mom'),
  kid: spritePaths('kid'),
  teen: spritePaths('teen')
};

const sprites = Object.fromEntries(
  Object.keys(SPRITE_PATHS).map((name) => [
    name,
    {
      right: { idle: null, walk: [], jump: [] },
      left: { idle: null, walk: [], jump: [] },
      ready: false
    }
  ])
);

const levelImage = new Image();
let levelReady = false;

let lastTime = 0;

const controls = {
  left: false,
  right: false,
  run: false,
  jump: false,
  up: false,
  down: false
};

const game = {
  screen: 'characterSelect',
  selectedOptionIndex: 0,
  selectedCharacter: 'dad',
  score: 0,
  combo: 0,
  comboTimer: 0,
  comboWindow: 2.5,
  comboPulse: 0,
  totalGems: 10,
  completed: false,
  energy: 10,
  timer: 238,
  walkPhase: 0,
  worldWidth: LEVEL_SECTION_WIDTH,
  cameraX: 0,
  currentSection: 0,
  checkpointSection: 0,
  checkpointX: 220,
  jumpLock: false,
  jumpBuffer: 0,
  message: 'Corri verso destra e raccogli le stelle',
  showCenterMessage: false,
  lastCheckpointSoundX: 220,
  family: [],
  collectibles: [],
  floatingTexts: []
};

const PLAYER_WALK_ACCEL = 1200;
const PLAYER_RUN_ACCEL = 1900;
const PLAYER_WALK_MAX_SPEED = 880;
const PLAYER_RUN_MAX_SPEED = 1480;
const PLAYER_DRAG = 0.86;
const AIR_ACCEL = 1500;
const AIR_MAX_SPEED = 2200;
const AIR_DRAG = 0.985;
const FOLLOWER_DRAG = 0.82;
const GRAVITY = 4200;
const JUMP_VELOCITY = 2200;
const JUMP_FORWARD_BOOST = 220;
const COYOTE_TIME = 0.08;
const JUMP_BUFFER_TIME = 0.12;
const FALL_RESET_Y = HEIGHT + 260;
const SECTION_START_X = 220;
const SECTION_END_X = LEVEL_SECTION_WIDTH - 180;

let formation = [
  { key: 'dad', dx: 0, dy: 0, sprite: 'dad', scale: 1.58, speed: 1480, bob: 2.8 },
  { key: 'mom', dx: 156, dy: 4, sprite: 'mom', scale: 1.52, speed: 1460, bob: 2.2 },
  { key: 'kid', dx: 128, dy: 22, sprite: 'kid', scale: 1.40, speed: 1450, bob: 2.6 },
  { key: 'teen', dx: 172, dy: 6, sprite: 'teen', scale: 1.54, speed: 1455, bob: 2.3 }
];

let characterOptions = [
  {
    key: 'dad',
    label: 'PAPA',
    color: '#32b4ea',
    description: 'Forte e protettivo, sempre pronto all avventura',
    stats: [6, 5, 4, 4]
  },
  {
    key: 'mom',
    label: 'MAMMA',
    color: '#ff6f91',
    description: 'Agile e precisa, tiene tutti sulla strada giusta',
    stats: [5, 5, 4, 4]
  },
  {
    key: 'kid',
    label: 'FRATELLINO',
    color: '#56de61',
    description: 'Leggero e veloce, perfetto per superare i buchi',
    stats: [4, 5, 4, 4]
  },
  {
    key: 'teen',
    label: 'FRATELLO',
    color: '#ffbf38',
    description: 'Equilibrato e pronto a guidare il gruppo',
    stats: [5, 4, 4, 4]
  },
  {
    key: 'family',
    label: 'FAMIGLIA',
    color: '#fff4ca',
    description: 'Tutti insieme: il gioco usa l intero gruppo',
    stats: [6, 6, 5, 6]
  }
];

let selectionHitBoxes = [];

function mergeConfig(loadedConfig) {
  if (!loadedConfig) {
    return structuredClone(DEFAULT_CONFIG);
  }
  return {
    game: { ...DEFAULT_CONFIG.game, ...(loadedConfig.game || {}) },
    characters: Array.isArray(loadedConfig.characters) && loadedConfig.characters.length
      ? loadedConfig.characters
      : DEFAULT_CONFIG.characters,
    formation: Array.isArray(loadedConfig.formation) && loadedConfig.formation.length
      ? loadedConfig.formation
      : DEFAULT_CONFIG.formation,
    collectibles: Array.isArray(loadedConfig.collectibles) && loadedConfig.collectibles.length
      ? loadedConfig.collectibles
      : DEFAULT_CONFIG.collectibles
  };
}

async function loadConfig() {
  try {
    const res = await fetch('./assets/config.json', { cache: 'no-store' });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Keep local defaults when the config cannot be fetched.
  }
  return null;
}

function applyConfig(loadedConfig) {
  config = mergeConfig(loadedConfig);
  game.totalGems = Number(config.game.totalGems) || DEFAULT_CONFIG.game.totalGems;
  game.timer = Number(config.game.timerSeconds) || DEFAULT_CONFIG.game.timerSeconds;
  game.message = config.game.startMessage || DEFAULT_CONFIG.game.startMessage;

  formation = config.characters.map((character, index) => {
    const defaultCharacter = DEFAULT_CONFIG.characters[index] || DEFAULT_CONFIG.characters[0];
    const defaultFormation = DEFAULT_CONFIG.formation[index] || DEFAULT_CONFIG.formation[0];
    const placement = config.formation[index] || defaultFormation;
    const meta = characterMeta[character.id] || characterMeta[defaultCharacter.id] || characterMeta.dad;
    return {
      key: character.id || defaultCharacter.id,
      dx: Number(placement.dx) || 0,
      dy: Number(placement.dy) || 0,
      sprite: character.id || defaultCharacter.id,
      scale: Number(character.scale) || defaultCharacter.scale,
      speed: meta.speed,
      bob: Number(character.bob) || defaultCharacter.bob
    };
  });

  characterOptions = config.characters.map((character) => {
    const meta = characterMeta[character.id] || characterMeta.dad;
    return {
      key: character.id,
      label: meta.label || String(character.name || character.id).toUpperCase(),
      color: meta.color,
      description: meta.description,
      stats: meta.stats
    };
  });
  characterOptions.push({
    key: 'family',
    label: 'FAMIGLIA',
    color: '#fff4ca',
    description: 'Tutti insieme: il gioco usa l intero gruppo',
    stats: [6, 6, 5, 6]
  });
}

function pxText(text, x, y, color = palette.white, scale = 1, align = 'left') {
  ctx.save();
  ctx.font = `900 ${48 * scale}px Consolas, monospace`;
  ctx.textAlign = align;
  ctx.textBaseline = 'top';
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(5, 9 * scale);
  ctx.strokeStyle = '#020816';
  ctx.strokeText(text, x, y);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.restore();
}

function pixelRect(x, y, w, h, c) {
  ctx.fillStyle = c;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function cloneTerrainProfiles(profiles) {
  return profiles.map((section) => section.map((point) => ({ x: point.x, y: point.y })));
}

function cloneTerrainSpans(spans) {
  return spans.map((section) => section.map((span) => ({ from: span.from, to: span.to })));
}

function dist2(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

function setControlState(name, pressed) {
  if (!(name in controls)) {
    return;
  }
  controls[name] = pressed;
  if (name === 'jump' && pressed && game.screen !== 'characterSelect') {
    game.jumpBuffer = JUMP_BUFFER_TIME;
  }
  const button = document.querySelector(`#touch-controls [data-control="${name}"]`);
  if (button) {
    button.classList.toggle('active', pressed);
  }
}

function bindTouchControls() {
  const buttons = document.querySelectorAll('#touch-controls [data-control]');
  for (const button of buttons) {
    const name = button.getAttribute('data-control');
    button.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      button.setPointerCapture(event.pointerId);
      setControlState(name, true);
    });
    const release = () => setControlState(name, false);
    button.addEventListener('pointerup', release);
    button.addEventListener('pointercancel', release);
    button.addEventListener('lostpointercapture', release);
    button.addEventListener('contextmenu', (event) => event.preventDefault());
  }
}

function loadImage(path) {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = path;
  });
}

async function loadSpriteState(config) {
  const [idle, walk, jump] = await Promise.all([
    loadImage(config.idle),
    Promise.all(config.walk.map((path) => loadImage(path))),
    Promise.all(config.jump.map((path) => loadImage(path)))
  ]);

  return {
    idle,
    walk: walk.filter(Boolean),
    jump: jump.filter(Boolean)
  };
}

async function loadSprites() {
  const entries = Object.entries(SPRITE_PATHS);
  await Promise.all(entries.map(async ([name, config]) => {
    const [right, left] = await Promise.all([
      loadSpriteState(config.right),
      loadSpriteState(config.left)
    ]);
    sprites[name].right = right;
    sprites[name].left = left;
    sprites[name].ready = Boolean(right.idle || left.idle);
  }));
}

function loadLevelBackground() {
  return new Promise((resolve) => {
    levelImage.onload = () => {
      levelReady = true;
      resolve();
    };
    levelImage.onerror = () => {
      levelReady = false;
      resolve();
    };
    levelImage.src = LEVEL_IMAGE_PATH;
  });
}

function normalizeTerrainData(data) {
  const sections = Array.isArray(data?.terrainProfiles)
    ? data.terrainProfiles
    : Array.isArray(data?.profiles)
      ? data.profiles
      : [];
  const spans = Array.isArray(data?.solidSpans) ? data.solidSpans : Array.isArray(data?.gaps) ? data.gaps : [];

  const normalizedProfiles = Array.from({ length: LEVEL_SEGMENTS.length }, (_, index) => {
    const section = Array.isArray(sections[index]) ? sections[index] : [];
    const points = section.map((point) => ({
      x: clamp(Number(point.x) || 0, 0, LEVEL_SOURCE_SECTION_WIDTH),
      y: clamp(Number(point.y) || LEVEL_GROUND_SOURCE_Y, 0, LEVEL_SOURCE_SECTION_HEIGHT)
    }));
    if (!points.length) {
      return cloneTerrainProfiles([DEFAULT_TERRAIN_PROFILES[index] || DEFAULT_TERRAIN_PROFILES[0]])[0];
    }
    points.sort((a, b) => a.x - b.x);
    if (points[0].x !== 0) {
      points.unshift({ x: 0, y: points[0].y });
    }
    if (points[points.length - 1].x !== LEVEL_SOURCE_SECTION_WIDTH) {
      points.push({ x: LEVEL_SOURCE_SECTION_WIDTH, y: points[points.length - 1].y });
    }
    return points;
  });

  const normalizedSpans = Array.from({ length: LEVEL_SEGMENTS.length }, (_, index) => {
    const section = Array.isArray(spans[index]) ? spans[index] : [];
    const merged = section
      .map((span) => ({
        from: clamp(Number(span.from) || 0, 0, LEVEL_SOURCE_SECTION_WIDTH),
        to: clamp(Number(span.to) || 0, 0, LEVEL_SOURCE_SECTION_WIDTH)
      }))
      .filter((span) => span.to > span.from)
      .sort((a, b) => a.from - b.from);
    const output = [];
    for (const span of merged) {
      const last = output[output.length - 1];
      if (last && span.from <= last.to) {
        last.to = Math.max(last.to, span.to);
      } else {
        output.push({ ...span });
      }
    }
    return output;
  });

  return {
    terrainProfiles: normalizedProfiles,
    solidSpans: normalizedSpans
  };
}

function applyTerrainData(data) {
  const normalized = normalizeTerrainData(data);
  TERRAIN_PROFILES = cloneTerrainProfiles(normalized.terrainProfiles);
  TERRAIN_SOLID_SPANS = cloneTerrainSpans(normalized.solidSpans);
}

async function loadTerrainData() {
  const fromStorage = window.localStorage.getItem(TERRAIN_STORAGE_KEY);
  if (fromStorage) {
    try {
      applyTerrainData(JSON.parse(fromStorage));
      return;
    } catch {
      // Ignore malformed local edits.
    }
  }

  try {
    const response = await fetch('./assets/terrain.json', { cache: 'no-store' });
    if (response.ok) {
      applyTerrainData(await response.json());
      return;
    }
  } catch {
    // Ignore fetch errors and keep defaults.
  }
}

function getSpriteFrame(sprite, member) {
  if (!sprite?.ready) {
    return null;
  }
  const direction = member.facing < 0 ? 'left' : 'right';
  const fallbackDirection = direction === 'left' ? 'right' : 'left';
  const states = sprite[direction]?.idle ? sprite[direction] : sprite[fallbackDirection];
  if (!states) {
    return null;
  }

  if (!member.grounded) {
    const jumpFrames = states.jump.length ? states.jump : [states.idle];
    if (jumpFrames.length === 1) {
      return jumpFrames[0];
    }
    return member.vy < 0 ? jumpFrames[0] : jumpFrames[1] || jumpFrames[0];
  }

  if (Math.abs(member.vx) > 30 && states.walk.length) {
    const phase = game.walkPhase + member.bobPhase;
    const frameIndex = Math.floor(phase * 8) % states.walk.length;
    return states.walk[frameIndex] || states.idle;
  }

  return states.idle;
}

function sampleTerrainSourceY(profile, sourceX) {
  if (!profile.length) {
    return LEVEL_GROUND_SOURCE_Y;
  }
  const clampedX = clamp(sourceX, profile[0].x, profile[profile.length - 1].x);
  for (let i = 1; i < profile.length; i++) {
    const prev = profile[i - 1];
    const next = profile[i];
    if (clampedX <= next.x) {
      const span = next.x - prev.x || 1;
      const ratio = (clampedX - prev.x) / span;
      return prev.y + (next.y - prev.y) * ratio;
    }
  }
  return profile[profile.length - 1].y;
}

function getTerrainSurfaceAt(localX, sectionIndex = game.currentSection) {
  const clampedSection = clamp(sectionIndex, 0, TERRAIN_PROFILES.length - 1);
  const sourceX = localX / LEVEL_SCALE;
  const solidSpan = TERRAIN_SOLID_SPANS[clampedSection] || [];
  const supported = solidSpan.some((span) => sourceX >= span.from && sourceX <= span.to);
  if (!supported) {
    return null;
  }
  const sourceY = sampleTerrainSourceY(TERRAIN_PROFILES[clampedSection], sourceX);
  return LEVEL_BAND_Y + Math.round(sourceY * LEVEL_SCALE);
}

function getTerrainYAt(localX, sectionIndex = game.currentSection) {
  const surfaceY = getTerrainSurfaceAt(localX, sectionIndex);
  return surfaceY ?? (LEVEL_BAND_Y + Math.round(LEVEL_GROUND_SOURCE_Y * LEVEL_SCALE) + 50);
}

function seedCollectibles() {
  game.collectibles = config.collectibles.map((item) => ({
    section: Number(item.section) || 0,
    x: Number(item.x) || 0,
    y: Number(item.y) || 0,
    taken: false
  }));
}

function updateCamera() {
  game.cameraX = clamp(game.family[0].x - WIDTH * 0.34, 0, game.worldWidth - WIDTH);
}

function getActiveFormation() {
  if (game.selectedCharacter === 'family') {
    return formation;
  }
  const selected = formation.find((member) => member.key === game.selectedCharacter) || formation[0];
  return [{ ...selected, dx: 0, dy: 0 }];
}

function createFamilyMember(def, x, sectionIndex, index) {
  return {
    x,
    y: getTerrainYAt(x, sectionIndex),
    vx: 0,
    vy: 0,
    grounded: true,
    coyoteTimer: 0,
    facing: 1,
    sprite: def.sprite,
    scale: def.scale,
    bobPhase: index * 1.3,
    groundOffset: 0
  };
}

function respawnFamilyAtCheckpoint() {
  game.currentSection = game.checkpointSection;
  const checkpointX = game.checkpointX;
  game.family[0].x = checkpointX;
  game.family[0].y = getTerrainYAt(checkpointX, game.currentSection);
  game.family[0].vx = 0;
  game.family[0].vy = 0;
  game.family[0].grounded = true;
  game.family[0].coyoteTimer = 0;
  game.family[0].facing = 1;

  for (let i = 1; i < game.family.length; i++) {
    const member = game.family[i];
    const def = getActiveFormation()[i];
    member.x = checkpointX + def.dx;
    const surface = getTerrainSurfaceAt(member.x, game.currentSection);
    if (surface === null) {
      member.x = checkpointX;
    }
    member.y = getTerrainYAt(member.x, game.currentSection) + (member.groundOffset || 0);
    member.vx = 0;
    member.vy = 0;
    member.grounded = true;
    member.coyoteTimer = 0;
    member.facing = 1;
  }

  updateCamera();
  game.jumpLock = false;
  game.jumpBuffer = 0;
  game.lastCheckpointSoundX = checkpointX;
  game.message = 'Riprova con un salto';
  game.showCenterMessage = true;
}

function placeFamilyAtSectionStart(sectionIndex) {
  const activeFormation = getActiveFormation();
  game.currentSection = sectionIndex;
  game.checkpointSection = sectionIndex;
  game.checkpointX = SECTION_START_X;
  game.family = activeFormation.map((def, index) => createFamilyMember(def, SECTION_START_X + def.dx, sectionIndex, index));
  updateCamera();
}

function resetGame() {
  game.score = 0;
  game.combo = 0;
  game.comboTimer = 0;
  game.comboPulse = 0;
  game.floatingTexts = [];
  game.totalGems = Number(config.game.totalGems) || DEFAULT_CONFIG.game.totalGems;
  game.completed = false;
  game.energy = 10;
  game.timer = Number(config.game.timerSeconds) || DEFAULT_CONFIG.game.timerSeconds;
  game.message = config.game.startMessage || DEFAULT_CONFIG.game.startMessage;
  game.showCenterMessage = false;
  game.lastCheckpointSoundX = SECTION_START_X;
  placeFamilyAtSectionStart(0);
  game.jumpLock = false;
  game.jumpBuffer = 0;
  seedCollectibles();
}

function confirmCharacterSelection() {
  const selected = characterOptions[game.selectedOptionIndex] || characterOptions[0];
  game.selectedCharacter = selected.key;
  game.screen = 'play';
  resetGame();
  lastTime = 0;
}

function moveCharacterSelection(direction) {
  const count = characterOptions.length;
  game.selectedOptionIndex = (game.selectedOptionIndex + direction + count) % count;
}

function drawSky() {
  const blocks = 80;
  for (let i = 0; i < blocks; i++) {
    const y = 145 + i * 12;
    const blend = i / blocks < 0.5 ? palette.sunset2 : palette.sunset1;
    pixelRect(0, y, WIDTH, 12, blend);
  }
  pixelRect(0, 145, WIDTH, 190, palette.pinkTop);
  for (let i = 0; i < 7; i++) {
    pixelRect(50 + i * 130, 300 + ((i % 2) * 45), 170, 26, '#f7b076');
    pixelRect(90 + i * 110, 350 + ((i % 3) * 36), 140, 20, '#ea9277');
  }
}

function drawSkyParallax(cameraX) {
  const blocks = 80;
  for (let i = 0; i < blocks; i++) {
    const y = 145 + i * 12;
    const blend = i / blocks < 0.5 ? palette.sunset2 : palette.sunset1;
    pixelRect(0, y, WIDTH, 12, blend);
  }
  pixelRect(0, 145, WIDTH, 190, palette.pinkTop);
  const cloudShift = -Math.floor(cameraX * 0.06);
  for (let i = 0; i < 7; i++) {
    const x1 = ((((50 + i * 220 + cloudShift) % (WIDTH + 260)) + (WIDTH + 260)) % (WIDTH + 260)) - 130;
    const x2 = ((((90 + i * 190 + cloudShift * 0.8) % (WIDTH + 220)) + (WIDTH + 220)) % (WIDTH + 220)) - 110;
    pixelRect(x1, 300 + ((i % 2) * 45), 170, 26, '#f7b076');
    pixelRect(x2, 350 + ((i % 3) * 36), 140, 20, '#ea9277');
  }
}

function drawHillsAndTown(offsetX = 0) {
  pixelRect(0 + offsetX, 660, WIDTH, 350, '#7b5a6f');
  pixelRect(0 + offsetX, 730, WIDTH, 230, '#6a4f65');
  for (let i = 0; i < 6; i++) {
    const x = 25 + i * 170;
    pixelRect(offsetX + x, 620 + (i % 2) * 30, 95, 130, '#af7558');
    pixelRect(offsetX + x + 6, 626 + (i % 2) * 30, 83, 14, '#8f4738');
    pixelRect(offsetX + x + 14, 662 + (i % 2) * 30, 16, 18, '#3f2942');
    pixelRect(offsetX + x + 50, 662 + (i % 2) * 30, 16, 18, '#3f2942');
  }

  for (let i = 0; i < 20; i++) {
    const x = (i * 53) % WIDTH;
    const h = 120 + ((i * 19) % 90);
    pixelRect(offsetX + x, 800 - h / 5, 50, h, i % 2 ? palette.treeMid : palette.treeDark);
    pixelRect(offsetX + x - 8, 760 - h / 5, 66, 40, palette.treeLight);
  }

  pixelRect(offsetX, 1040, WIDTH, 180, palette.road);
  pixelRect(offsetX, 1220, WIDTH, 60, '#8a6a4e');
  pixelRect(offsetX, 1280, WIDTH, 120, '#2f2a2b');
}

function drawFence(offsetX = 0) {
  for (let i = 0; i < 15; i++) {
    pixelRect(offsetX + 40 + i * 72, 900, 18, 120, palette.fence);
  }
  pixelRect(offsetX + 20, 940, WIDTH - 40, 16, '#8f5f34');
  pixelRect(offsetX + 20, 992, WIDTH - 40, 16, '#6e4528');
}

function drawBigTree(offsetX = 0) {
  const baseX = 750;
  pixelRect(offsetX + baseX + 140, 420, 62, 560, '#69442d');
  for (let i = 0; i < 35; i++) {
    const x = 650 + ((i * 43) % 380);
    const y = 260 + ((i * 31) % 420);
    const c = i % 3 === 0 ? palette.treeLight : i % 3 === 1 ? palette.treeMid : palette.treeDark;
    pixelRect(offsetX + x, y, 110, 70, c);
  }
}

function drawSpriteMember(member, t, cameraX = 0) {
  const sprite = sprites[member.sprite];
  const scale = member.scale;
  const frameImage = getSpriteFrame(sprite, member);
  if (!frameImage) {
    return;
  }
  const sourceWidth = frameImage.width || frameImage.naturalWidth || 1;
  const sourceHeight = frameImage.height || frameImage.naturalHeight || 1;
  const drawX = Math.round(member.x - cameraX - sourceWidth * scale * 0.5);
  const drawY = Math.round(member.y - sourceHeight * scale);

  ctx.save();
  ctx.drawImage(frameImage, drawX, drawY, sourceWidth * scale, sourceHeight * scale);
  ctx.restore();
}

function drawParty(t, cameraX = 0) {
  for (const member of game.family) {
    drawSpriteMember(member, t, cameraX);
  }
}

function drawLampAndSign(offsetX = 0) {
  pixelRect(offsetX + 145, 700, 20, 420, '#2f3944');
  pixelRect(offsetX + 125, 670, 60, 50, '#1f252f');
  pixelRect(offsetX + 136, 686, 38, 30, '#f7da9f');

  pixelRect(offsetX + 800, 760, 170, 370, '#6e4528');
  pixelRect(offsetX + 806, 768, 158, 278, '#8d5a33');
  pxText('A CASA', offsetX + 885, 800, '#ffd888', 0.45, 'center');
  pxText('E DOVE', offsetX + 885, 855, '#ffd888', 0.45, 'center');
  pxText('SIAMO', offsetX + 885, 910, '#ffd888', 0.45, 'center');
  pxText('INSIEME', offsetX + 885, 965, '#ffd888', 0.45, 'center');
  pxText('❤', offsetX + 885, 1020, '#ff5f6f', 0.45, 'center');

  pixelRect(offsetX + 980, 930, 88, 88, '#1f6eb8');
  pxText('→', offsetX + 1022, 946, '#eef7ff', 0.75, 'center');
}

function drawCollectible(item, t, cameraX = 0) {
  if (item.taken) {
    return;
  }
  const pulse = Math.sin(t * 0.008 + item.x * 0.01) * 1.6;
  const x = item.x - cameraX;
  const y = item.y + pulse;
  pixelRect(x - 3, y - 11, 6, 22, '#ffef85');
  pixelRect(x - 11, y - 3, 22, 6, '#ffef85');
  pixelRect(x - 7, y - 7, 14, 14, '#ffb528');
  pixelRect(x - 2, y - 2, 4, 4, '#fff7cb');
}

function drawBar(x, y, w, h, ratio, fill, empty = '#14344d') {
  pixelRect(x, y, w, h, '#06162c');
  pixelRect(x + 4, y + 4, w - 8, h - 8, empty);
  pixelRect(x + 4, y + 4, Math.max(0, Math.round((w - 8) * clamp(ratio, 0, 1))), h - 8, fill);
}

function formatTimer(seconds) {
  const total = Math.max(0, Math.ceil(seconds));
  const minutes = Math.floor(total / 60);
  const rest = String(total % 60).padStart(2, '0');
  return `${minutes}:${rest}`;
}

function getSectionStars(sectionIndex = game.currentSection) {
  return game.collectibles.filter((item) => item.section === sectionIndex);
}

function getHudMessage() {
  if (game.completed) {
    return game.score >= game.totalGems ? 'Tutte le stelle raccolte' : 'Schermata completata';
  }
  if (game.timer <= 0) {
    return 'Tempo terminato';
  }
  return game.message;
}

function drawHUD(t) {
  const sectionStars = getSectionStars();
  const sectionTaken = sectionStars.filter((item) => item.taken).length;

  pixelRect(0, 0, WIDTH, 162, '#020816');
  pixelRect(0, 150, WIDTH, 12, palette.hudLine);

  pxText(`AREA ${game.currentSection + 1}/${LEVEL_SEGMENTS.length}`, 40, 24, '#bfe7ff', 0.98);
  pxText(`QUI ${sectionTaken}/${sectionStars.length}`, 44, 98, '#fff7b8', 0.68);

  pxText(`STELLE ${game.score}/${game.totalGems}`, 388, 24, '#ffe66d', 0.98, 'center');
  pxText(game.completed ? 'COMPLETATO' : 'RACCOGLI', 388, 98, game.completed ? '#8dff8f' : '#ffffff', 0.68, 'center');

  pxText(formatTimer(game.timer), 652, 22, game.timer < 30 ? '#ff7979' : '#ffffff', 1.12, 'center');
  pxText('TEMPO', 652, 102, '#bfe7ff', 0.62, 'center');

  pxText('ENERGIA', 804, 28, '#8dff8f', 0.72);
  drawBar(804, 96, 230, 34, game.energy / 10, palette.energy, '#28422d');

  if (game.combo >= 2) {
    const pulseScale = 0.85 + game.comboPulse * 1.2;
    pxText(`x${game.combo} COMBO`, WIDTH / 2, 168, palette.gold1, pulseScale, 'center');
  }
}

function drawCenterPanel() {
  const message = getHudMessage();
  if (!game.showCenterMessage) {
    return;
  }

  pixelRect(214, 178, 652, 76, '#020816');
  pixelRect(214, 246, 652, 8, palette.hudLine);
  pxText(message.toUpperCase(), WIDTH / 2, 193, game.completed ? '#8dff8f' : '#fff7b8', 0.62, 'center');
}

function drawBottomPanels() {
  const player = game.family[0];
  const distanceRatio = clamp((player.x - SECTION_START_X) / Math.max(1, SECTION_END_X - SECTION_START_X), 0, 1);
  const jumpState = player.grounded ? 'SALTO PRONTO' : 'IN ARIA';
  const nextGoal = game.currentSection < LEVEL_SEGMENTS.length - 1 ? 'RAGGIUNGI IL BORDO DESTRO' : 'RAGGIUNGI IL TRAGUARDO';

  pixelRect(0, 1298, WIDTH, 142, '#020816');
  pixelRect(0, 1298, WIDTH, 12, palette.hudLine);

  pxText(nextGoal, 40, 1328, '#fff7b8', 0.74);
  drawBar(40, 1392, 460, 34, distanceRatio, '#ffbf38', '#3f3142');

  pxText(jumpState, 690, 1328, player.grounded ? '#8dff8f' : '#bfe7ff', 0.76, 'center');
  pxText('SPAZIO SALTA  SHIFT CORRI', 690, 1394, '#ffffff', 0.48, 'center');

  pxText('R RESET', 952, 1328, '#bfe7ff', 0.62, 'center');
  pxText(`PUNTI ${String(game.score * 150).padStart(4, '0')}`, 952, 1394, '#ffe66d', 0.68, 'center');
}

function drawSelectionSprite(spriteKey, x, y, scale = 2.4) {
  const frame = sprites[spriteKey]?.right?.idle;
  if (!frame) {
    return;
  }
  const w = frame.width || frame.naturalWidth || 1;
  const h = frame.height || frame.naturalHeight || 1;
  ctx.drawImage(frame, x - (w * scale) / 2, y - h * scale, w * scale, h * scale);
}

function drawStatRows(option, x, y) {
  const icons = ['♥', '⚔', '◆', '▲'];
  for (let row = 0; row < option.stats.length; row++) {
    pxText(icons[row], x, y + row * 36, row === 0 ? palette.heart : '#fff4ca', 0.44);
    for (let i = 0; i < 6; i++) {
      pixelRect(x + 42 + i * 20, y + 8 + row * 36, 15, 18, i < option.stats[row] ? '#56de61' : '#1c2937');
    }
  }
}

function drawCharacterCard(option, index, x, y, w, h) {
  const selected = index === game.selectedOptionIndex;
  const border = selected ? '#ffe66d' : option.color;
  const fill = selected ? '#14253f' : '#07152a';

  pixelRect(x - 6, y - 6, w + 12, h + 12, border);
  pixelRect(x, y, w, h, '#020816');
  pixelRect(x + 8, y + 8, w - 16, h - 16, fill);
  pxText(option.label, x + w / 2, y + 22, option.color, option.key === 'family' ? 0.56 : 0.5, 'center');

  if (option.key === 'family') {
    drawSelectionSprite('dad', x + 58, y + 258, 1.45);
    drawSelectionSprite('mom', x + 108, y + 260, 1.35);
    drawSelectionSprite('kid', x + 148, y + 260, 1.35);
    drawSelectionSprite('teen', x + 186, y + 260, 1.35);
  } else {
    drawSelectionSprite(option.key, x + w / 2, y + 292, 2.0);
  }

  pixelRect(x + 14, y + 314, w - 28, 150, 'rgba(0, 8, 18, 0.72)');
  drawStatRows(option, x + 26, y + 330);

  if (selected) {
    pxText('▼', x + w / 2, y + h + 12, '#ffe66d', 0.7, 'center');
  }

  selectionHitBoxes[index] = { x, y, w, h };
}

function drawCharacterSelection(t) {
  selectionHitBoxes = [];
  drawSkyParallax(t * 0.04);
  drawHillsAndTown(0);
  pixelRect(0, 0, WIDTH, HEIGHT, 'rgba(1, 6, 16, 0.35)');

  pixelRect(0, 0, WIDTH, 150, '#020816');
  pixelRect(0, 146, WIDTH, 8, palette.hudLine);
  pxText(String(config.game.title || DEFAULT_CONFIG.game.title).toUpperCase(), WIDTH / 2, 24, '#ffe66d', 1.0, 'center');
  pxText(String(config.game.subtitle || DEFAULT_CONFIG.game.subtitle).toUpperCase(), WIDTH / 2, 92, '#9dd3ff', 0.48, 'center');
  pxText('P1', 40, 42, '#32b4ea', 0.86);
  pxText('MAPPA', 930, 42, '#56de61', 0.62, 'center');

  pixelRect(184, 206, 712, 122, '#020816');
  pixelRect(194, 216, 692, 102, '#111927');
  pixelRect(184, 320, 712, 8, palette.hudLine);
  pxText('SCEGLI IL TUO PERSONAGGIO', WIDTH / 2, 238, '#ffe66d', 0.78, 'center');

  const cardW = 188;
  const cardH = 486;
  const gap = 18;
  const startX = Math.round((WIDTH - (cardW * characterOptions.length + gap * (characterOptions.length - 1))) / 2);
  for (let i = 0; i < characterOptions.length; i++) {
    drawCharacterCard(characterOptions[i], i, startX + i * (cardW + gap), 390, cardW, cardH);
  }

  const selected = characterOptions[game.selectedOptionIndex];
  pixelRect(200, 948, 680, 130, '#020816');
  pixelRect(210, 958, 660, 110, '#07152a');
  pixelRect(200, 1070, 680, 8, selected.color);
  pxText(selected.label, WIDTH / 2, 970, selected.color, 0.74, 'center');
  pxText(selected.description.toUpperCase(), WIDTH / 2, 1028, '#ffffff', 0.43, 'center');

  selectionHitBoxes.confirm = { x: 348, y: 1122, w: 384, h: 92 };
  pixelRect(348, 1122, 384, 92, '#0b531f');
  pixelRect(362, 1136, 356, 64, '#168f35');
  pxText('CONFERMA', WIDTH / 2, 1142, '#ffffff', 0.76, 'center');

  pxText('←  →  CAMBIA', 300, 1248, '#ffe66d', 0.54, 'center');
  pxText('INVIO / SPAZIO  GIOCA', 780, 1248, '#9dd3ff', 0.54, 'center');
}

function drawSparkles(t) {
  for (const s of stars) {
    const blink = Math.floor((t + s.x * 9) / 400) % 2;
    if (!blink) {
      continue;
    }
    pixelRect(s.x, s.y, s.s, s.s, '#ffe78c');
  }
}

function drawCollectibleSparkle(item, t, cameraX = 0) {
  const blink = Math.floor((t + item.x * 5) / 260) % 2 === 0;
  if (!blink || item.taken || item.section !== game.currentSection) {
    return;
  }
  pxText('✦', item.x - cameraX - 8, item.y - 22, '#fff0a8', 0.35, 'center');
}

function drawCollectibleLayer(t, cameraX = 0) {
  for (const item of game.collectibles) {
    if (item.section !== game.currentSection) {
      continue;
    }
    drawCollectibleSparkle(item, t, cameraX);
    drawCollectible(item, t, cameraX);
  }
}

function addFloatingText(text, x, y, color = palette.gold1) {
  game.floatingTexts.push({ text, x, y, color, age: 0, duration: 0.85 });
}

function updateFloatingTexts(dt) {
  for (const text of game.floatingTexts) {
    text.age += dt;
    text.y -= 72 * dt;
  }
  game.floatingTexts = game.floatingTexts.filter((text) => text.age < text.duration);
}

function drawFloatingTexts(cameraX = 0) {
  for (const text of game.floatingTexts) {
    const ratio = text.age / text.duration;
    const scale = 0.58 + Math.sin(ratio * Math.PI) * 0.16;
    pxText(text.text, text.x - cameraX, text.y, text.color, scale, 'center');
  }
}

function drawWorld(cameraX, t) {
  if (levelReady && levelImage.naturalWidth) {
    const section = LEVEL_SEGMENTS[game.currentSection];
    const levelBottom = LEVEL_BAND_Y + Math.round(section.sh * LEVEL_SCALE);
    ctx.drawImage(
      levelImage,
      0,
      section.sy,
      LEVEL_SOURCE_SECTION_WIDTH,
      section.sh,
      -cameraX,
      LEVEL_BAND_Y,
      LEVEL_SECTION_WIDTH,
      Math.round(section.sh * LEVEL_SCALE)
    );
    pixelRect(0, levelBottom, WIDTH, Math.max(0, 1312 - levelBottom), '#181b24');
  } else {
    drawSkyParallax(cameraX);
  }

  drawCollectibleLayer(t, cameraX);
  drawParty(t, cameraX);
  drawFloatingTexts(cameraX);
}

function updateGame(dt) {
  if (game.screen === 'characterSelect') {
    return;
  }
  if (game.completed) {
    return;
  }

  game.timer = Math.max(0, game.timer - dt);
  game.energy = Math.max(0, game.energy - dt * 0.03);
  if (game.comboTimer > 0) {
    game.comboTimer = Math.max(0, game.comboTimer - dt);
  } else {
    game.combo = 0;
  }
  game.comboPulse = Math.max(0, game.comboPulse - dt);
  updateFloatingTexts(dt);

  if (game.timer === 0 && !game.completed) {
    game.message = 'Tempo terminato, premi R per riprovare';
    game.showCenterMessage = true;
  }

  const player = game.family[0];
  const inputX = (controls.right ? 1 : 0) - (controls.left ? 1 : 0);
  const jumpRequested = controls.jump || controls.up;
  const groundedBeforeMove = player.grounded;
  const groundAccel = controls.run ? PLAYER_RUN_ACCEL : PLAYER_WALK_ACCEL;
  const groundMaxSpeed = controls.run ? PLAYER_RUN_MAX_SPEED : PLAYER_WALK_MAX_SPEED;
  const accel = groundedBeforeMove ? groundAccel : AIR_ACCEL;
  const maxSpeed = groundedBeforeMove ? groundMaxSpeed : AIR_MAX_SPEED;
  const drag = Math.pow(groundedBeforeMove ? PLAYER_DRAG : AIR_DRAG, dt * 60);

  if (!jumpRequested) {
    game.jumpLock = false;
  }
  game.jumpBuffer = Math.max(0, game.jumpBuffer - dt);
  player.coyoteTimer = Math.max(0, (player.coyoteTimer || 0) - dt);

  player.vx += inputX * accel * dt;
  player.vx = clamp(player.vx, -maxSpeed, maxSpeed);

  player.vx *= drag;

  player.x += player.vx * dt;
  player.x = clamp(player.x, 140, game.worldWidth - 140);
  if (Math.abs(player.vx) > 5) {
    player.facing = player.vx < 0 ? -1 : 1;
  }
  game.walkPhase += dt * (Math.abs(player.vx) / 120 + 0.2);

  updateCamera();

  const playerSurfaceY = getTerrainSurfaceAt(player.x, game.currentSection);
  if (groundedBeforeMove && playerSurfaceY === null && player.vy >= 0) {
    player.coyoteTimer = COYOTE_TIME;
  }

  if (game.jumpBuffer > 0 && (player.grounded || player.coyoteTimer > 0) && !game.jumpLock) {
    for (const member of game.family) {
      if (member.grounded || member === player) {
        member.vy = -JUMP_VELOCITY;
        member.grounded = false;
        member.coyoteTimer = 0;
        member.vx += inputX * JUMP_FORWARD_BOOST;
      }
    }
    game.jumpLock = true;
    game.jumpBuffer = 0;
    audio.jump();
    game.message = 'Salta il vuoto';
    game.showCenterMessage = true;
  }

  const activeFormation = getActiveFormation();
  for (let i = 1; i < game.family.length; i++) {
    const leader = game.family[i - 1];
    const member = game.family[i];
    const def = activeFormation[i];
    const targetX = leader.x + def.dx;
    const dx = targetX - member.x;
    member.vx += clamp(dx, -def.speed, def.speed) * dt * 6;
    member.vx = clamp(member.vx, -def.speed, def.speed);
    member.vx *= Math.pow(FOLLOWER_DRAG, dt * 60);
    member.x += member.vx * dt;
    member.x = clamp(member.x, 140, game.worldWidth - 140);
    member.facing = leader.facing;
  }

  if (player.grounded && player.x >= SECTION_END_X) {
    if (game.currentSection < LEVEL_SEGMENTS.length - 1) {
      placeFamilyAtSectionStart(game.currentSection + 1);
      game.message = `Schermata ${game.currentSection + 1} di ${LEVEL_SEGMENTS.length}`;
      game.showCenterMessage = true;
      return;
    }
    game.completed = true;
    game.message = 'Ultima schermata completata';
    game.showCenterMessage = true;
    audio.win();
    player.x = SECTION_END_X;
    player.vx = 0;
    updateCamera();
  }

  let needsRespawn = false;
  for (const member of game.family) {
    const surfaceY = getTerrainSurfaceAt(member.x, game.currentSection);
    if (surfaceY !== null) {
      member.vy += GRAVITY * dt;
      member.y += member.vy * dt;
      if (member.y >= surfaceY + (member.groundOffset || 0)) {
        member.y = surfaceY + (member.groundOffset || 0);
        member.vy = 0;
        member.grounded = true;
        member.coyoteTimer = 0;
      } else {
        member.grounded = false;
      }
      if (member === player && surfaceY !== null && member.grounded) {
        game.checkpointSection = game.currentSection;
        game.checkpointX = member.x;
        if (Math.abs(member.x - game.lastCheckpointSoundX) > 360) {
          game.lastCheckpointSoundX = member.x;
          audio.checkpoint();
        }
      }
    } else {
      member.grounded = false;
      member.vy += GRAVITY * dt;
      member.y += member.vy * dt;
    }
    if (member.y > FALL_RESET_Y) {
      needsRespawn = true;
    }
  }

  if (needsRespawn) {
    game.energy = Math.max(0, game.energy - 1);
    audio.fall();
    respawnFamilyAtCheckpoint();
    return;
  }

  for (const item of game.collectibles) {
    if (item.taken || item.section !== game.currentSection) {
      continue;
    }
    const pickupOffset = player.scale * 70;
    const pickupRadius = player.scale * 75;
    const playerPickup = { x: player.x, y: player.y - pickupOffset };
    if (dist2(item, playerPickup) < pickupRadius ** 2) {
      item.taken = true;
      game.comboTimer = game.comboWindow;
      game.combo += 1;
      game.comboPulse = 0.22;
      const multiplier = Math.min(game.combo, 5);
      game.score += multiplier;
      addFloatingText(`+1 x${multiplier}`, player.x, player.y - player.scale * 150, palette.gold1);
      game.energy = Math.min(10, game.energy + 1);
      audio.collectStar();
      if (game.score >= game.totalGems) {
        game.completed = true;
        game.message = 'Missione completata';
        game.showCenterMessage = true;
        audio.win();
      }
    }
  }

  if (!game.completed && game.score < game.totalGems && game.timer > 0 && player.grounded) {
    game.message = 'Raccogli le stelle lungo il percorso';
    game.showCenterMessage = false;
  }
}

function renderScene(t) {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  ctx.imageSmoothingEnabled = false;

  if (game.screen === 'characterSelect') {
    drawCharacterSelection(t);
    return;
  }

  drawWorld(game.cameraX, t);
  drawCenterPanel();
  drawSparkles(t);
  drawBottomPanels(t);
  drawHUD(t);
}

function render(t) {
  const dt = lastTime ? Math.min(0.033, (t - lastTime) / 1000) : 0;
  lastTime = t;
  updateGame(dt);
  renderScene(t);
  requestAnimationFrame(render);
}

window.addEventListener('keydown', (e) => {
  const key = e.key.toLowerCase();
  if (game.screen === 'characterSelect') {
    if (key === 'arrowleft' || key === 'a') {
      e.preventDefault();
      moveCharacterSelection(-1);
    } else if (key === 'arrowright' || key === 'd') {
      e.preventDefault();
      moveCharacterSelection(1);
    } else if (key === 'enter' || key === ' ') {
      e.preventDefault();
      confirmCharacterSelection();
    }
    return;
  }

  if (key === 'arrowleft' || key === 'a') {
    e.preventDefault();
    setControlState('left', true);
  } else if (key === 'arrowright' || key === 'd') {
    e.preventDefault();
    setControlState('right', true);
  } else if (key === 'arrowup' || key === 'w' || key === ' ') {
    e.preventDefault();
    setControlState('jump', true);
  } else if (key === 'shift') {
    e.preventDefault();
    setControlState('run', true);
  } else if (key === 'r') {
    resetGame();
    lastTime = 0;
    return;
  }
});

window.addEventListener('keyup', (e) => {
  const key = e.key.toLowerCase();
  if (game.screen === 'characterSelect') {
    return;
  }

  if (key === 'arrowleft' || key === 'a') {
    e.preventDefault();
    setControlState('left', false);
  } else if (key === 'arrowright' || key === 'd') {
    e.preventDefault();
    setControlState('right', false);
  } else if (key === 'arrowup' || key === 'w' || key === ' ') {
    e.preventDefault();
    setControlState('jump', false);
  } else if (key === 'shift') {
    e.preventDefault();
    setControlState('run', false);
  }
});

canvas.addEventListener('pointerdown', (event) => {
  if (game.screen !== 'characterSelect') {
    return;
  }
  const rect = canvas.getBoundingClientRect();
  const x = (event.clientX - rect.left) * (WIDTH / rect.width);
  const y = (event.clientY - rect.top) * (HEIGHT / rect.height);

  for (let i = 0; i < characterOptions.length; i++) {
    const hit = selectionHitBoxes[i];
    if (hit && x >= hit.x && x <= hit.x + hit.w && y >= hit.y && y <= hit.y + hit.h) {
      game.selectedOptionIndex = i;
      return;
    }
  }

  const confirm = selectionHitBoxes.confirm;
  if (confirm && x >= confirm.x && x <= confirm.x + confirm.w && y >= confirm.y && y <= confirm.y + confirm.h) {
    confirmCharacterSelection();
  }
});

Promise.all([loadConfig(), loadSprites(), loadLevelBackground(), loadTerrainData()]).then(([loadedConfig]) => {
  applyConfig(loadedConfig);
  bindTouchControls();
  resetGame();
  requestAnimationFrame(render);
});
