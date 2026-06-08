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

const GAME_SCREENS = {
  TITLE_SCREEN:     'titleScreen',
  CHARACTER_SELECT: 'characterSelect',
  PLAYING:          'playing',
  PAUSED:           'paused',
  GAMEOVER:         'gameover',
  WIN:              'win'
};

const stars = Array.from({ length: 34 }, (_, i) => ({
  x: 90 + ((i * 137) % 900),
  y: 390 + ((i * 89) % 520),
  s: (i % 3) + 1
}));

const LEVEL_IMAGE_PATH = './level.png';
const DEFAULT_LEVEL_SEGMENTS = [
  { sy: 0, sh: 341 },
  { sy: 341, sh: 341 },
  { sy: 682, sh: 342 }
];
let LEVEL_SEGMENTS = DEFAULT_LEVEL_SEGMENTS.map((segment) => ({ ...segment }));
const LEVEL_SOURCE_SECTION_WIDTH = 1536;
let LEVEL_SOURCE_SECTION_HEIGHT = 341;
const LEVEL_GROUND_SOURCE_Y = 287;
const LEVEL_BAND_Y = 180;
const DEFAULT_LEVEL_BAND_HEIGHT = 1050;
let LEVEL_BAND_HEIGHT = DEFAULT_LEVEL_BAND_HEIGHT;
let LEVEL_SCALE = LEVEL_BAND_HEIGHT / LEVEL_SOURCE_SECTION_HEIGHT;
let LEVEL_SECTION_WIDTH = Math.round(LEVEL_SOURCE_SECTION_WIDTH * LEVEL_SCALE);
let WORLD_WIDTH = LEVEL_SECTION_WIDTH * LEVEL_SEGMENTS.length;
const SEGMENT_WIDTH = LEVEL_SECTION_WIDTH;
let GROUND_Y = LEVEL_BAND_Y + Math.round(LEVEL_GROUND_SOURCE_Y * LEVEL_SCALE) + 50;
const LEVEL_EDGE_SOLID_GRACE = 220;
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
    startMessage: 'Corri verso destra e raccogli le stelle',
    startLives: 3,
    comboWindow: 2.5,
    energyDepletionRate: 0.03,
    energyRecoveryPerGem: 1,
    energyLossOnFall: 1,
    winBonusMultiplier: 10,
    scoreMultiplier: 150,
    pickupOffsetMultiplier: 70,
    pickupRadiusMultiplier: 75,
    floatingTextOffsetMultiplier: 150
  },
  physics: {
    player: {
      walkAccel: 1200,
      runAccel: 1900,
      walkMaxSpeed: 880,
      runMaxSpeed: 1480,
      drag: 0.86,
      airAccel: 1500,
      airMaxSpeed: 2000,
      airDrag: 0.985,
      gravity: 4200,
      jumpVelocity: 2200,
      jumpForwardBoost: 220,
      coyoteTime: 0.08,
      jumpBufferTime: 0.12,
      fallResetYOffset: 260
    },
    follower: {
      drag: 0.82
    }
  },
  display: {
    width: 1080,
    height: 1440,
    sectionStartX: 220,
    sectionEndXOffset: 180,
    overlayFadeSpeed: 4,
    overlayMaxAlpha: 0.78
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
  enemies: {
    perSection: [2, 1, 2]
  },
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
  dad: { speed: 1480 },
  mom: { speed: 1460 },
  kid: { speed: 1450 },
  teen: { speed: 1455 }
};

let config = structuredClone(DEFAULT_CONFIG);
let levelDefinitions = [];
let loadedTerrainData = null;

function cloneCollectibles(items, flipX = false) {
  return items.map((item) => ({
    section: Number(item.section) || 0,
    x: flipX ? LEVEL_SOURCE_SECTION_WIDTH - (Number(item.x) || 0) : Number(item.x) || 0,
    y: Number(item.y) || 0,
    taken: false
  }));
}

function normalizeLevelSegments(segments, fallbackSegments) {
  const source = Array.isArray(segments) && segments.length ? segments : fallbackSegments;
  return source.map((segment) => ({
    sy: Math.max(0, Math.floor(Number(segment.sy) || 0)),
    sh: Math.max(1, Math.floor(Number(segment.sh) || 1))
  }));
}

function padLevelSections(sections, count, fallbackSectionFactory) {
  const output = Array.isArray(sections) ? sections.map((section) => section) : [];
  while (output.length < count) {
    const seed = output[output.length - 1] || fallbackSectionFactory(output.length);
    output.push(Array.isArray(seed) ? seed.map((point) => ({ ...point })) : seed);
  }
  return output.slice(0, count);
}

function normalizeLevelEntry(entry, fallback, index) {
  const sourceCollectibles = Array.isArray(entry?.collectibles) && entry.collectibles.length
    ? entry.collectibles
    : fallback.collectibles;
  const segments = normalizeLevelSegments(entry?.segments, fallback.segments);
  const stripPaths = Array.isArray(entry?.stripPaths) && entry.stripPaths.length
    ? entry.stripPaths
    : fallback.stripPaths;
  const terrainProfiles = padLevelSections(
    Array.isArray(entry?.terrainProfiles) && entry.terrainProfiles.length
      ? entry.terrainProfiles
      : fallback.terrainProfiles,
    segments.length,
    (sectionIndex) => fallback.terrainProfiles[Math.min(sectionIndex, fallback.terrainProfiles.length - 1)]
  );
  const solidSpans = padLevelSections(
    Array.isArray(entry?.solidSpans) && entry.solidSpans.length
      ? entry.solidSpans
      : fallback.solidSpans,
    segments.length,
    (sectionIndex) => fallback.solidSpans[Math.min(sectionIndex, fallback.solidSpans.length - 1)]
  );
  return {
    id: entry?.id || `level-${index + 1}`,
    title: entry?.title || `Livello ${index + 1}`,
    subtitle: entry?.subtitle || (index === 0 ? 'Prima serie di schermate' : 'Nuova serie di schermate'),
    stripPaths,
    backgroundPath: stripPaths[0] || entry?.backgroundPath || fallback.backgroundPath || LEVEL_IMAGE_PATH,
    bandHeight: Number(entry?.bandHeight) || fallback.bandHeight || DEFAULT_LEVEL_BAND_HEIGHT,
    segments,
    terrainProfiles: cloneTerrainProfiles(terrainProfiles),
    solidSpans: cloneTerrainSpans(solidSpans),
    collectibles: cloneCollectibles(sourceCollectibles, Boolean(entry?.mirrorCollectibles)),
    enemyCounts: Array.isArray(entry?.enemyCounts) && entry.enemyCounts.length
      ? entry.enemyCounts.map((value) => Math.max(0, Math.floor(Number(value) || 0)))
      : (fallback.enemyCounts || []).slice(),
    startMessage: entry?.startMessage || (index === 0 ? DEFAULT_CONFIG.game.startMessage : 'Secondo livello: continua verso destra'),
  };
}

function buildLevelDefinitions(loadedConfig) {
  const defaultSegments = DEFAULT_LEVEL_SEGMENTS.map((segment) => ({ ...segment }));
  const terrainLevels = Array.isArray(loadedTerrainData?.levels) && loadedTerrainData.levels.length
    ? loadedTerrainData.levels
    : null;
  const terrainFallbackForIndex = (index) => {
    if (terrainLevels?.[index]) {
      return terrainLevels[index];
    }
    const first = terrainLevels?.[0];
    return first || {
      terrainProfiles: cloneTerrainProfiles(TERRAIN_PROFILES),
      solidSpans: cloneTerrainSpans(TERRAIN_SOLID_SPANS),
      sourceSectionHeight: LEVEL_SOURCE_SECTION_HEIGHT
    };
  };
  const fallbackLevel = {
    backgroundPath: LEVEL_IMAGE_PATH,
    stripPaths: [
      './level_strip_0.png',
      './level_strip_1.png',
      './level_strip_2.png'
    ],
    bandHeight: DEFAULT_LEVEL_BAND_HEIGHT,
    segments: defaultSegments,
    terrainProfiles: terrainFallbackForIndex(0).terrainProfiles,
    solidSpans: terrainFallbackForIndex(0).solidSpans,
    collectibles: Array.isArray(loadedConfig?.collectibles) && loadedConfig.collectibles.length
      ? loadedConfig.collectibles
      : DEFAULT_CONFIG.collectibles,
    enemyCounts: Array.isArray(loadedConfig?.enemies?.perSection) && loadedConfig.enemies.perSection.length
      ? loadedConfig.enemies.perSection
      : DEFAULT_CONFIG.enemies.perSection
  };

  const explicitLevels = Array.isArray(loadedConfig?.levels) && loadedConfig.levels.length
    ? loadedConfig.levels
    : null;

  if (explicitLevels) {
    return explicitLevels.map((entry, index) => normalizeLevelEntry(entry, fallbackLevel, index));
  }

  return [
    normalizeLevelEntry({
      id: 'level-1',
      title: 'Livello 1',
      subtitle: 'Prima serie di schermate',
      backgroundPath: LEVEL_IMAGE_PATH,
      stripPaths: [
        './level_strip_0.png',
        './level_strip_1.png',
        './level_strip_2.png'
      ],
      bandHeight: DEFAULT_LEVEL_BAND_HEIGHT,
      segments: defaultSegments,
      terrainProfiles: terrainFallbackForIndex(0).terrainProfiles,
      solidSpans: terrainFallbackForIndex(0).solidSpans,
      collectibles: fallbackLevel.collectibles,
      enemyCounts: fallbackLevel.enemyCounts,
      startMessage: DEFAULT_CONFIG.game.startMessage
    }, fallbackLevel, 0),
    normalizeLevelEntry({
      id: 'level-2',
      title: 'Livello 2',
      subtitle: 'Seconda serie di schermate',
      backgroundPath: './level2_strip_0.png',
      stripPaths: [
        './level2_strip_0.png',
        './level2_strip_1.png',
        './level2_strip_2.png',
        './level2_strip_3.png'
      ],
      bandHeight: DEFAULT_LEVEL_BAND_HEIGHT,
      segments: [
        { sy: 0, sh: 256 },
        { sy: 256, sh: 256 },
        { sy: 512, sh: 256 },
        { sy: 768, sh: 256 }
      ],
      terrainProfiles: terrainFallbackForIndex(1).terrainProfiles,
      solidSpans: terrainFallbackForIndex(1).solidSpans,
      collectibles: fallbackLevel.collectibles,
      enemyCounts: fallbackLevel.enemyCounts,
      mirrorCollectibles: true,
      startMessage: 'Secondo livello: continua verso destra'
    }, fallbackLevel, 1)
  ];
}

function spritePaths(name) {
  return {
    right: {
      idle: `./assets/character-sprites/${name}/idle_right.png`,
      // Walk animation: 5 frames for smooth movement
      walk: Array.from({ length: 5 }, (_, index) => `./assets/character-sprites/${name}/walk_right_${index + 1}.png`),
      jump: Array.from({ length: 3 }, (_, index) => `./assets/character-sprites/${name}/jump_right_${index + 1}.png`)
    },
    left: {
      idle: `./assets/character-sprites/${name}/idle_left.png`,
      // Walk animation: 5 frames (same as right for consistency)
      walk: Array.from({ length: 5 }, (_, index) => `./assets/character-sprites/${name}/walk_left_${index + 1}.png`),
      jump: Array.from({ length: 3 }, (_, index) => `./assets/character-sprites/${name}/jump_left_${index + 1}.png`)
    }
  };
}

function enemySpritePaths(name) {
  return {
    right: {
      idle: `./assets/character-sprites/${name}/idle_right.png`,
      walk: Array.from({ length: 3 }, (_, index) => `./assets/character-sprites/${name}/walk_right_${index + 1}.png`),
      jump: Array.from({ length: 3 }, (_, index) => `./assets/character-sprites/${name}/jump_right_${index + 1}.png`)
    },
    left: {
      idle: `./assets/character-sprites/${name}/idle_left.png`,
      walk: Array.from({ length: 3 }, (_, index) => `./assets/character-sprites/${name}/walk_left_${index + 1}.png`),
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

const ENEMY_SPRITE_PATHS = {
  banditi: enemySpritePaths('banditi'),
  uomini_in_giacca: enemySpritePaths('uomini_in_giacca'),
  ragazzini_bulli: enemySpritePaths('ragazzini_bulli')
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

const enemySprites = Object.fromEntries(
  Object.keys(ENEMY_SPRITE_PATHS).map((name) => [
    name,
    {
      right: { idle: null, walk: [], jump: [] },
      left: { idle: null, walk: [], jump: [] },
      ready: false
    }
  ])
);

const ENEMY_TYPES = [
  {
    key: 'banditi',
    label: 'Banditi',
    sprite: 'banditi',
    scale: 1.34,
    bob: 2.0,
    speed: 330,
    aggroRange: 900,
    hitRadius: 90,
    attackWindup: 0.22,
    attackDuration: 0.42,
    attackCooldown: 0.55,
    attackImpactAt: 0.17,
    attackKnockback: 620
  },
  {
    key: 'uomini_in_giacca',
    label: 'Uomini in Giacca',
    sprite: 'uomini_in_giacca',
    scale: 1.45,
    bob: 1.8,
    speed: 280,
    aggroRange: 840,
    hitRadius: 98,
    attackWindup: 0.42,
    attackDuration: 0.66,
    attackCooldown: 0.95,
    attackImpactAt: 0.34,
    attackKnockback: 840
  },
  {
    key: 'ragazzini_bulli',
    label: 'Ragazzini Bulli',
    sprite: 'ragazzini_bulli',
    scale: 1.28,
    bob: 2.2,
    speed: 360,
    aggroRange: 780,
    hitRadius: 84,
    attackWindup: 0.16,
    attackDuration: 0.34,
    attackCooldown: 0.42,
    attackImpactAt: 0.11,
    attackKnockback: 560
  }
];

const levelBackgrounds = new Map();

let lastTime = 0;

const controls = {
  left: false,
  right: false,
  run: false,
  jump: false,
  up: false,
  down: false,
  ability: false
};

// Abilità uniche per personaggio. cooldown 0 = abilità contestuale (legata al salto/caduta)
const ABILITIES = {
  dad:  { name: 'SPINTA',  cooldown: 3.5, color: '#32b4ea', hint: 'Onda d urto: stordisce i nemici vicini' },
  mom:  { name: 'DOPPIO SALTO', cooldown: 0, color: '#ff6f91', hint: 'Premi salto di nuovo a mezz aria' },
  kid:  { name: 'PLANATA', cooldown: 0, color: '#56de61', hint: 'Tieni premuto abilità per planare' },
  teen: { name: 'SCATTO',  cooldown: 1.6, color: '#ffbf38', hint: 'Scatto orizzontale veloce' }
};
const GLIDE_MAX_FALL = 360;     // velocità di caduta massima durante la planata del Bimbo
const DASH_SPEED_MULT = 1.7;    // moltiplicatore velocità durante lo scatto del Teen
const DASH_DURATION = 0.18;

const game = {
  screen: GAME_SCREENS.TITLE_SCREEN,
  prevScreen:      null,
  winBonus:        0,
  gemsCollected:   0,
  gameOverReason:  '',
  overlayAlpha:    0,
  overlayTimer:    0,
  selectedOptionIndex: 0,
  selectedCharacter: 'dad',
  score: 0,
  combo: 0,
  comboTimer: 0,
  comboWindow: 2.5,
  comboPulse: 0,
  totalGems: 10,
  completed: false,
  lives: 3,
  energy: 10,
  timer: 238,
  walkPhase: 0,
  worldWidth: LEVEL_SECTION_WIDTH,
  cameraX: 0,
  currentLevelIndex: 0,
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
  particles: [],
  enemies: [],
  enemyHitCooldown: 0,
  abilityCooldown: 0,
  doubleJumpUsed: false,
  dashTimer: 0,
  shockwave: null
};

// Physics constants (computed from config in applyConfig)
let PLAYER_WALK_ACCEL = 1200;
let PLAYER_RUN_ACCEL = 1900;
let PLAYER_WALK_MAX_SPEED = 880;
let PLAYER_RUN_MAX_SPEED = 1480;
let PLAYER_DRAG = 0.86;
let AIR_ACCEL = 1500;
let AIR_MAX_SPEED = 2000;
let AIR_DRAG = 0.985;
let FOLLOWER_DRAG = 0.82;
let GRAVITY = 4200;
let JUMP_VELOCITY = 2200;
let JUMP_FORWARD_BOOST = 220;
let COYOTE_TIME = 0.08;
let JUMP_BUFFER_TIME = 0.12;
let FALL_RESET_Y_OFFSET = 260;
let FALL_RESET_Y = HEIGHT + 260; // Default, updated in applyConfig
let SECTION_START_X = 220;
let SECTION_END_X_OFFSET = 180;
let SECTION_END_X = LEVEL_SECTION_WIDTH - 180; // Default, updated in applyConfig
let SECTION_END_VISUAL_X = LEVEL_SECTION_WIDTH - 180;
let OVERLAY_FADE_SPEED = 4;
let OVERLAY_MAX_ALPHA = 0.78;

let formation = [];

let characterOptions = [];

let selectionHitBoxes = [];

function mergeConfig(loadedConfig) {
  if (!loadedConfig) {
    return structuredClone(DEFAULT_CONFIG);
  }
  return {
    game: { ...DEFAULT_CONFIG.game, ...(loadedConfig.game || {}) },
    physics: {
      player: { ...DEFAULT_CONFIG.physics.player, ...(loadedConfig.physics?.player || {}) },
      follower: { ...DEFAULT_CONFIG.physics.follower, ...(loadedConfig.physics?.follower || {}) }
    },
    display: { ...DEFAULT_CONFIG.display, ...(loadedConfig.display || {}) },
    characters: Array.isArray(loadedConfig.characters) && loadedConfig.characters.length
      ? loadedConfig.characters
      : DEFAULT_CONFIG.characters,
    formation: Array.isArray(loadedConfig.formation) && loadedConfig.formation.length
      ? loadedConfig.formation
      : DEFAULT_CONFIG.formation,
    enemies: {
      perSection: Array.isArray(loadedConfig.enemies?.perSection) && loadedConfig.enemies.perSection.length
        ? loadedConfig.enemies.perSection
        : DEFAULT_CONFIG.enemies.perSection
    },
    levels: Array.isArray(loadedConfig.levels) && loadedConfig.levels.length
      ? loadedConfig.levels
      : null,
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
  game.totalGems = levelDefinitions.reduce((total, level) => total + (level.collectibles?.length || 0), 0) || Number(config.game.totalGems) || DEFAULT_CONFIG.game.totalGems;
  game.lives = Number(config.game.startLives) || DEFAULT_CONFIG.game.startLives;
  game.timer = Number(config.game.timerSeconds) || DEFAULT_CONFIG.game.timerSeconds;
  game.message = config.game.startMessage || DEFAULT_CONFIG.game.startMessage;
  game.comboWindow = Number(config.game.comboWindow) || DEFAULT_CONFIG.game.comboWindow;
  game.energyDepletionRate = Number(config.game.energyDepletionRate) || DEFAULT_CONFIG.game.energyDepletionRate;
  game.energyRecoveryPerGem = Number(config.game.energyRecoveryPerGem) || DEFAULT_CONFIG.game.energyRecoveryPerGem;
  game.energyLossOnFall = Number(config.game.energyLossOnFall) || DEFAULT_CONFIG.game.energyLossOnFall;
  game.winBonusMultiplier = Number(config.game.winBonusMultiplier) || DEFAULT_CONFIG.game.winBonusMultiplier;
  game.scoreMultiplier = Number(config.game.scoreMultiplier) || DEFAULT_CONFIG.game.scoreMultiplier;
  game.pickupOffsetMultiplier = Number(config.game.pickupOffsetMultiplier) || DEFAULT_CONFIG.game.pickupOffsetMultiplier;
  game.pickupRadiusMultiplier = Number(config.game.pickupRadiusMultiplier) || DEFAULT_CONFIG.game.pickupRadiusMultiplier;
  game.floatingTextOffsetMultiplier = Number(config.game.floatingTextOffsetMultiplier) || DEFAULT_CONFIG.game.floatingTextOffsetMultiplier;

  // Applica fisica player
  PLAYER_WALK_ACCEL = Number(config.physics.player.walkAccel) || DEFAULT_CONFIG.physics.player.walkAccel;
  PLAYER_RUN_ACCEL = Number(config.physics.player.runAccel) || DEFAULT_CONFIG.physics.player.runAccel;
  PLAYER_WALK_MAX_SPEED = Number(config.physics.player.walkMaxSpeed) || DEFAULT_CONFIG.physics.player.walkMaxSpeed;
  PLAYER_RUN_MAX_SPEED = Number(config.physics.player.runMaxSpeed) || DEFAULT_CONFIG.physics.player.runMaxSpeed;
  PLAYER_DRAG = Number(config.physics.player.drag) || DEFAULT_CONFIG.physics.player.drag;
  AIR_ACCEL = Number(config.physics.player.airAccel) || DEFAULT_CONFIG.physics.player.airAccel;
  AIR_MAX_SPEED = Number(config.physics.player.airMaxSpeed) || DEFAULT_CONFIG.physics.player.airMaxSpeed;
  AIR_DRAG = Number(config.physics.player.airDrag) || DEFAULT_CONFIG.physics.player.airDrag;
  GRAVITY = Number(config.physics.player.gravity) || DEFAULT_CONFIG.physics.player.gravity;
  JUMP_VELOCITY = Number(config.physics.player.jumpVelocity) || DEFAULT_CONFIG.physics.player.jumpVelocity;
  JUMP_FORWARD_BOOST = Number(config.physics.player.jumpForwardBoost) || DEFAULT_CONFIG.physics.player.jumpForwardBoost;
  COYOTE_TIME = Number(config.physics.player.coyoteTime) || DEFAULT_CONFIG.physics.player.coyoteTime;
  JUMP_BUFFER_TIME = Number(config.physics.player.jumpBufferTime) || DEFAULT_CONFIG.physics.player.jumpBufferTime;
  FALL_RESET_Y_OFFSET = Number(config.physics.player.fallResetYOffset) || DEFAULT_CONFIG.physics.player.fallResetYOffset;
  FALL_RESET_Y = HEIGHT + FALL_RESET_Y_OFFSET;

  // Applica fisica follower
  FOLLOWER_DRAG = Number(config.physics.follower.drag) || DEFAULT_CONFIG.physics.follower.drag;

  // Applica display
  SECTION_START_X = Number(config.display.sectionStartX) || DEFAULT_CONFIG.display.sectionStartX;
  SECTION_END_X_OFFSET = Number(config.display.sectionEndXOffset) || DEFAULT_CONFIG.display.sectionEndXOffset;
  SECTION_END_X = LEVEL_SECTION_WIDTH - SECTION_END_X_OFFSET;
  SECTION_END_VISUAL_X = SECTION_END_X;
  OVERLAY_FADE_SPEED = Number(config.display.overlayFadeSpeed) || DEFAULT_CONFIG.display.overlayFadeSpeed;
  OVERLAY_MAX_ALPHA = Number(config.display.overlayMaxAlpha) || DEFAULT_CONFIG.display.overlayMaxAlpha;

  formation = config.characters.map((character, index) => {
    const defaultFormation = DEFAULT_CONFIG.formation[index] || DEFAULT_CONFIG.formation[0];
    const placement = config.formation[index] || defaultFormation;
    return {
      key: character.id,
      dx: Number(placement.dx) || 0,
      dy: Number(placement.dy) || 0,
      sprite: character.id,
      scale: Number(character.scale) || 1.5,
      speed: Number(character.speed) || 1450,
      bob: Number(character.bob) || 2.5
    };
  });

  characterOptions = config.characters.map((character) => ({
    key: character.id,
    label: character.label || String(character.name || character.id).toUpperCase(),
    color: character.color || '#ffffff',
    description: character.description || '',
    stats: character.stats || [5, 5, 5, 5]
  }));
  characterOptions.push({
    key: 'family',
    label: 'FAMIGLIA',
    color: '#fff4ca',
    description: 'Tutti insieme: il gioco usa l intero gruppo',
    stats: [6, 6, 5, 6]
  });

  levelDefinitions = buildLevelDefinitions(config);
  game.levelCount = levelDefinitions.length;
  game.totalGems = levelDefinitions.reduce((total, level) => total + (level.collectibles?.length || 0), 0) || Number(config.game.totalGems) || DEFAULT_CONFIG.game.totalGems;
  game.currentLevelIndex = clamp(game.currentLevelIndex || 0, 0, Math.max(0, levelDefinitions.length - 1));
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

function approach(value, target, delta) {
  if (value < target) {
    return Math.min(value + delta, target);
  }
  return Math.max(value - delta, target);
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
  if (name === 'jump' && pressed && game.screen !== GAME_SCREENS.CHARACTER_SELECT) {
    game.jumpBuffer = JUMP_BUFFER_TIME;
  }
  if (name === 'ability' && pressed) {
    triggerAbility();
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
      if (audio.init) audio.init(); // Initialize audio on first touch
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

function bindPauseButton() {
  const btn = document.getElementById('pause-btn');
  if (!btn) return;
  btn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    if (audio.init) audio.init(); // Initialize audio on first touch
    btn.setPointerCapture(e.pointerId);
    if (game.screen === GAME_SCREENS.PLAYING) {
      setGameScreen(GAME_SCREENS.PAUSED);
    } else if (game.screen === GAME_SCREENS.PAUSED) {
      setGameScreen(GAME_SCREENS.PLAYING);
    }
  });
}

function bindRestartButton() {
  const btn = document.getElementById('restart-btn');
  if (!btn) return;
  btn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    if (audio.init) audio.init(); // Initialize audio on first touch
    btn.setPointerCapture(e.pointerId);
    if (game.screen === GAME_SCREENS.GAMEOVER || game.screen === GAME_SCREENS.WIN) {
      setGameScreen(GAME_SCREENS.CHARACTER_SELECT);
    }
  });
}

function bindSwitchButton() {
  const btn = document.getElementById('switch-btn');
  if (!btn) return;
  btn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    if (audio.init) audio.init();
    btn.setPointerCapture(e.pointerId);
    cycleActiveCharacter(1);
  });
  btn.addEventListener('contextmenu', (e) => e.preventDefault());
}

function updateRestartButtonVisibility() {
  const btn = document.getElementById('restart-btn');
  if (!btn) return;
  const shouldShow = game.screen === GAME_SCREENS.GAMEOVER || game.screen === GAME_SCREENS.WIN;
  btn.style.display = shouldShow ? 'block' : 'none';
  
  // Show/hide pause button based on game state
  const pauseBtn = document.getElementById('pause-btn');
  if (pauseBtn) {
    pauseBtn.style.display = shouldShow ? 'none' : 'block';
  }

  // Il pulsante "cambia personaggio" serve solo in modalità famiglia durante il gioco
  const switchBtn = document.getElementById('switch-btn');
  if (switchBtn) {
    const showSwitch = game.screen === GAME_SCREENS.PLAYING && game.family.length > 1;
    switchBtn.style.display = showSwitch ? 'block' : 'none';
  }
}

const SPRITE_OVERRIDES_KEY = 'familygame-sprites';

function getSpriteOverride(path) {
  try {
    const raw = window.localStorage.getItem(SPRITE_OVERRIDES_KEY);
    if (!raw) return null;
    return JSON.parse(raw)[path] ?? null;
  } catch { return null; }
}

function loadImage(path) {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = getSpriteOverride(path) || path;
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

async function loadEnemySprites() {
  const entries = Object.entries(ENEMY_SPRITE_PATHS);
  await Promise.all(entries.map(async ([name, config]) => {
    const [right, left] = await Promise.all([
      loadSpriteState(config.right),
      loadSpriteState(config.left)
    ]);
    enemySprites[name].right = right;
    enemySprites[name].left = left;
    enemySprites[name].ready = Boolean(right.idle || left.idle);
  }));
}

async function loadLevelBackgrounds() {
  levelBackgrounds.clear();
  await Promise.all(levelDefinitions.map(async (level) => {
    const stripImages = await Promise.all((level.stripPaths || []).map((path) => loadImage(path)));
    const ready = stripImages.some((image) => Boolean(image?.naturalWidth));
    levelBackgrounds.set(level.id, {
      stripImages,
      ready
    });
  }));
}

function normalizeTerrainSectionData(data, fallbackProfiles, fallbackSpans, sourceHeight = LEVEL_SOURCE_SECTION_HEIGHT) {
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
      y: clamp(Number(point.y) || sourceHeight, 0, sourceHeight)
    }));
    if (!points.length) {
      return cloneTerrainProfiles([fallbackProfiles[index] || fallbackProfiles[0]])[0];
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

function normalizeTerrainData(data) {
  if (Array.isArray(data?.levels) && data.levels.length) {
    return {
      levels: data.levels.map((level, index) => {
        const sourceHeight = Number(level?.sourceSectionHeight) || Number(level?.segments?.[0]?.sh) || LEVEL_SOURCE_SECTION_HEIGHT;
        const fallbackProfiles = cloneTerrainProfiles(DEFAULT_TERRAIN_PROFILES);
        const fallbackSpans = cloneTerrainSpans(DEFAULT_TERRAIN_SOLID_SPANS);
        const normalized = normalizeTerrainSectionData(level, fallbackProfiles, fallbackSpans, sourceHeight);
        return {
          id: level?.id || `level-${index + 1}`,
          backgroundPath: level?.backgroundPath || null,
          sourceSectionHeight: sourceHeight,
          terrainProfiles: normalized.terrainProfiles,
          solidSpans: normalized.solidSpans
        };
      })
    };
  }

  const fallbackProfiles = cloneTerrainProfiles(DEFAULT_TERRAIN_PROFILES);
  const fallbackSpans = cloneTerrainSpans(DEFAULT_TERRAIN_SOLID_SPANS);
  const normalized = normalizeTerrainSectionData(data, fallbackProfiles, fallbackSpans, LEVEL_SOURCE_SECTION_HEIGHT);
  return {
    terrainProfiles: normalized.terrainProfiles,
    solidSpans: normalized.solidSpans
  };
}

function applyTerrainData(data) {
  const normalized = normalizeTerrainData(data);
  loadedTerrainData = normalized;
  if (Array.isArray(normalized.levels) && normalized.levels.length) {
    TERRAIN_PROFILES = cloneTerrainProfiles(normalized.levels[0].terrainProfiles);
    TERRAIN_SOLID_SPANS = cloneTerrainSpans(normalized.levels[0].solidSpans);
    return;
  }
  TERRAIN_PROFILES = cloneTerrainProfiles(normalized.terrainProfiles);
  TERRAIN_SOLID_SPANS = cloneTerrainSpans(normalized.solidSpans);
}

async function loadTerrainData() {
  // Priority 1: Try loading from SQLite via API
  try {
    const response = await fetch('/api/terrain', { cache: 'no-store' });
    if (response.ok) {
      const terrainData = await response.json();
      if (terrainData) {
        applyTerrainData(terrainData);
        console.log('Terrain loaded from SQLite');
        return;
      }
    }
  } catch (error) {
    // SQLite API not available, fall through to localStorage
    console.log('SQLite not available, falling back to localStorage');
  }

  // Priority 2: Try loading from localStorage
  const fromStorage = window.localStorage.getItem(TERRAIN_STORAGE_KEY);
  if (fromStorage) {
    try {
      applyTerrainData(JSON.parse(fromStorage));
      console.log('Terrain loaded from localStorage');
      return;
    } catch {
      // Ignore malformed local edits.
    }
  }

  // Priority 3: Fallback to terrain.json asset file
  try {
    const response = await fetch('./assets/terrain.json', { cache: 'no-store' });
    if (response.ok) {
      applyTerrainData(await response.json());
      console.log('Terrain loaded from assets/terrain.json');
      return;
    }
  } catch {
    // Ignore fetch errors and keep defaults.
  }

  console.log('Using default terrain');
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

  if (member.action === 'attack') {
    return states.jump[0] || states.walk[0] || states.idle;
  }

  if (Math.abs(member.vx) > 30 && states.walk.length) {
    const phase = game.walkPhase + member.bobPhase;
    // Use walk.length dynamically so animation works with any number of frames
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
    if (sourceX >= LEVEL_SOURCE_SECTION_WIDTH - LEVEL_EDGE_SOLID_GRACE) {
      const sourceY = sampleTerrainSourceY(TERRAIN_PROFILES[clampedSection], LEVEL_SOURCE_SECTION_WIDTH - 1);
      return LEVEL_BAND_Y + Math.round(sourceY * LEVEL_SCALE);
    }
    return null;
  }
  const sourceY = sampleTerrainSourceY(TERRAIN_PROFILES[clampedSection], sourceX);
  return LEVEL_BAND_Y + Math.round(sourceY * LEVEL_SCALE);
}

function getTerrainYAt(localX, sectionIndex = game.currentSection) {
  const surfaceY = getTerrainSurfaceAt(localX, sectionIndex);
  return surfaceY ?? (LEVEL_BAND_Y + Math.round(LEVEL_GROUND_SOURCE_Y * LEVEL_SCALE) + 50);
}

function getCurrentLevelDefinition(levelIndex = game.currentLevelIndex) {
  return levelDefinitions[clamp(levelIndex, 0, Math.max(0, levelDefinitions.length - 1))] || null;
}

function applyLevelLayout(level) {
  if (!level) {
    return;
  }
  LEVEL_BAND_HEIGHT = Number(level.bandHeight) || DEFAULT_LEVEL_BAND_HEIGHT;
  LEVEL_SEGMENTS = normalizeLevelSegments(level.segments, DEFAULT_LEVEL_SEGMENTS);
  LEVEL_SOURCE_SECTION_HEIGHT = LEVEL_SEGMENTS[0]?.sh || 341;
  LEVEL_SCALE = LEVEL_BAND_HEIGHT / LEVEL_SOURCE_SECTION_HEIGHT;
  LEVEL_SECTION_WIDTH = Math.round(LEVEL_SOURCE_SECTION_WIDTH * LEVEL_SCALE);
  WORLD_WIDTH = LEVEL_SECTION_WIDTH * LEVEL_SEGMENTS.length;
  GROUND_Y = LEVEL_BAND_Y + Math.round(LEVEL_GROUND_SOURCE_Y * LEVEL_SCALE) + 50;
  SECTION_END_X = LEVEL_SECTION_WIDTH - SECTION_END_X_OFFSET;
  SECTION_END_VISUAL_X = SECTION_END_X;
  game.worldWidth = WORLD_WIDTH;
}

function applyLevelTerrain(level) {
  if (!level) {
    return;
  }
  TERRAIN_PROFILES = cloneTerrainProfiles(level.terrainProfiles || DEFAULT_TERRAIN_PROFILES);
  TERRAIN_SOLID_SPANS = cloneTerrainSpans(level.solidSpans || DEFAULT_TERRAIN_SOLID_SPANS);
}

function seedCollectibles() {
  const level = getCurrentLevelDefinition();
  game.collectibles = (level?.collectibles || config.collectibles).map((item) => ({
    section: Number(item.section) || 0,
    x: Number(item.x) || 0,
    y: Number(item.y) || 0,
    taken: false
  }));
}

function randomRange(min, max) {
  return min + Math.random() * Math.max(0, max - min);
}

function findEnemySpawnX(sectionIndex, minDistanceFromStart = 900) {
  const safeMinX = Math.max(minDistanceFromStart, 0);
  const safeMaxX = Math.max(safeMinX, SECTION_END_X - 60);
  for (let attempt = 0; attempt < 80; attempt++) {
    const candidateX = randomRange(safeMinX, safeMaxX);
    if (getTerrainSurfaceAt(candidateX, sectionIndex) !== null) {
      return candidateX;
    }
  }

  for (let x = safeMinX; x <= safeMaxX; x += 8) {
    if (getTerrainSurfaceAt(x, sectionIndex) !== null) {
      return x;
    }
  }

  return safeMaxX;
}

function seedEnemies() {
  const level = getCurrentLevelDefinition();
  const enemyCounts = level?.enemyCounts || config.enemies?.perSection || DEFAULT_CONFIG.enemies.perSection;
  const perSection = Array.from({ length: LEVEL_SEGMENTS.length }, (_, index) => {
    const value = enemyCounts?.[index];
    const fallback = DEFAULT_CONFIG.enemies.perSection[index] ?? 0;
    return Number.isFinite(Number(value)) ? Math.max(0, Math.floor(Number(value))) : fallback;
  });

  const enemies = [];
  for (let section = 0; section < perSection.length; section++) {
    for (let i = 0; i < perSection[section]; i++) {
      const type = ENEMY_TYPES[Math.floor(Math.random() * ENEMY_TYPES.length)];
      const x = findEnemySpawnX(section, 900);
      const dir = Math.random() < 0.5 ? -1 : 1;
      const speedBase = type.speed + section * 18 + i * 10;
      enemies.push({
        section,
        x,
        y: getTerrainYAt(x, section),
        vx: 0,
        dir,
        facing: dir,
        speed: speedBase,
        sprite: type.sprite,
        scale: type.scale,
        bobPhase: Math.random() * 6,
        grounded: true,
        type: type.key,
        typeLabel: type.label,
        attackWindup: type.attackWindup,
        attackDuration: type.attackDuration,
        attackCooldownMax: type.attackCooldown,
        attackImpactAt: type.attackImpactAt,
        attackKnockback: type.attackKnockback,
        aggroRange: type.aggroRange,
        patrolMin: Math.max(900, x - 320),
        patrolMax: Math.min(SECTION_END_X, x + 320),
        hitRadius: type.hitRadius,
        attackRange: type.hitRadius + 54,
        attackCooldown: 0,
        attackTimer: 0,
        attackLock: false,
        damageDealt: false,
        action: 'idle',
        defeated: false,
        stunTimer: 0
      });
    }
  }

  game.enemies = enemies;
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

// Personaggio attualmente controllato (sempre in testa al gruppo)
function getActiveKey() {
  return game.family[0]?.sprite || game.selectedCharacter;
}

// Cicla quale membro della famiglia è controllato (solo in modalità "famiglia")
function cycleActiveCharacter(direction = 1) {
  if (game.screen !== GAME_SCREENS.PLAYING || game.family.length <= 1) {
    return;
  }
  if (direction >= 0) {
    game.family.push(game.family.shift());   // il prossimo passa in testa
  } else {
    game.family.unshift(game.family.pop());
  }
  game.doubleJumpUsed = false;
  game.jumpLock = false;
  game.dashTimer = 0;
  const leader = game.family[0];
  const opt = characterOptions.find((o) => o.key === leader.sprite);
  spawnText(leader.x, leader.y - 150, (opt?.label || leader.sprite).toUpperCase(), opt?.color || '#fff4d6', 0.95);
  if (audio.checkpoint) audio.checkpoint();
}

function doShockwave(player) {
  const radius = 380;
  game.shockwave = { x: player.x, y: player.y - 70, age: 0, maxAge: 0.45, radius, color: ABILITIES.dad.color };
  spawnText(player.x, player.y - 150, 'SPINTA!', ABILITIES.dad.color, 0.95);
  for (const enemy of game.enemies) {
    if (enemy.defeated || enemy.section !== game.currentSection) {
      continue;
    }
    if (Math.abs(enemy.x - player.x) < radius) {
      enemy.stunTimer = 2.2;
      enemy.attackTimer = 0;
      enemy.attackCooldown = 0;
      enemy.damageDealt = false;
      const kdir = Math.sign(enemy.x - player.x) || 1;
      enemy.vx = kdir * 1000;
      spawnText(enemy.x, enemy.y - 90, 'STUN', '#bfe7ff', 0.7);
    }
  }
  if (audio.fall) audio.fall();
}

// Attiva l'abilità del personaggio controllato (chiamata sul fronte di pressione)
function triggerAbility() {
  if (game.screen !== GAME_SCREENS.PLAYING) {
    return;
  }
  const player = game.family[0];
  if (!player) {
    return;
  }
  const key = getActiveKey();

  if (key === 'dad') {
    if (game.abilityCooldown > 0) return;
    doShockwave(player);
    game.abilityCooldown = ABILITIES.dad.cooldown;
  } else if (key === 'teen') {
    if (game.abilityCooldown > 0) return;
    const dir = player.facing || 1;
    player.vx = dir * PLAYER_RUN_MAX_SPEED * DASH_SPEED_MULT;
    game.dashTimer = DASH_DURATION;
    game.abilityCooldown = ABILITIES.teen.cooldown;
    spawnText(player.x, player.y - 150, 'SCATTO!', ABILITIES.teen.color, 0.9);
    if (audio.jump) audio.jump();
  } else if (key === 'mom') {
    // Doppio salto: solo a mezz aria e non ancora usato
    if (!player.grounded && !game.doubleJumpUsed) {
      player.vy = -JUMP_VELOCITY * 0.92;
      game.doubleJumpUsed = true;
      for (const m of game.family) {
        if (m !== player && !m.grounded) m.vy = -JUMP_VELOCITY * 0.85;
      }
      spawnText(player.x, player.y - 130, '✦ SALTO', ABILITIES.mom.color, 0.85);
      if (audio.jump) audio.jump();
    }
  }
  // 'kid' (PLANATA) è gestita nel loop di gravità finché controls.ability è premuto
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

function loadLevelState(levelIndex, sectionIndex = 0) {
  const level = getCurrentLevelDefinition(levelIndex);
  if (!level) {
    return;
  }
  game.currentLevelIndex = clamp(levelIndex, 0, Math.max(0, levelDefinitions.length - 1));
  applyLevelLayout(level);
  applyLevelTerrain(level);
  game.currentSection = sectionIndex;
  game.checkpointSection = sectionIndex;
  game.checkpointX = SECTION_START_X;
  game.levelTitle = level.title;
  game.levelSubtitle = level.subtitle;
  game.message = level.startMessage || config.game.startMessage || DEFAULT_CONFIG.game.startMessage;
  game.levelBackgroundPath = level.backgroundPath || LEVEL_IMAGE_PATH;
  placeFamilyAtSectionStart(sectionIndex);
  seedCollectibles();
  seedEnemies();
}

function advanceToNextLevel() {
  const nextLevelIndex = game.currentLevelIndex + 1;
  if (nextLevelIndex >= levelDefinitions.length) {
    game.completed = true;
    setGameScreen(GAME_SCREENS.WIN);
    return false;
  }

  loadLevelState(nextLevelIndex, 0);
  game.showCenterMessage = true;
  game.message = `${game.levelTitle} iniziato`;
  spawnText(game.cameraX + WIDTH / 2, HEIGHT / 2, 'NUOVO LIVELLO!', palette.energy, 1.1);
  return true;
}

function setGameScreen(newScreen) {
  game.prevScreen = game.screen;
  game.screen = newScreen;
  game.overlayAlpha = 0;
  game.overlayTimer = 0;

  switch (newScreen) {
    case GAME_SCREENS.TITLE_SCREEN:
      game.overlayAlpha = 0;
      break;
    case GAME_SCREENS.WIN:
      game.winBonus = Math.round(game.timer) * game.winBonusMultiplier;
      audio.win();
      break;
    case GAME_SCREENS.CHARACTER_SELECT:
      game.score = 0;
      game.gemsCollected = 0;
      game.lives = Number(config.game.startLives) || DEFAULT_CONFIG.game.startLives;
      game.completed = false;
      game.overlayAlpha = 0;
      break;
    case GAME_SCREENS.PLAYING:
      if (game.prevScreen === GAME_SCREENS.CHARACTER_SELECT) {
        resetGame();
        lastTime = 0;
      }
      break;
  }

  // Update button visibility based on new screen state
  updateRestartButtonVisibility();
}

function resetGame() {
  game.score = 0;
  game.gemsCollected = 0;
  game.winBonus = 0;
  game.gameOverReason = '';
  game.combo = 0;
  game.comboTimer = 0;
  game.comboPulse = 0;
  game.particles = [];
  game.enemies = [];
  game.enemyHitCooldown = 0;
  game.abilityCooldown = 0;
  game.doubleJumpUsed = false;
  game.dashTimer = 0;
  game.shockwave = null;
  controls.ability = false;
  game.totalGems = Number(config.game.totalGems) || DEFAULT_CONFIG.game.totalGems;
  game.completed = false;
  game.lives = Number(config.game.startLives) || DEFAULT_CONFIG.game.startLives;
  game.energy = 10;
  game.timer = Number(config.game.timerSeconds) || DEFAULT_CONFIG.game.timerSeconds;
  game.message = config.game.startMessage || DEFAULT_CONFIG.game.startMessage;
  game.showCenterMessage = false;
  game.lastCheckpointSoundX = SECTION_START_X;
  game.currentLevelIndex = 0;
  loadLevelState(0, 0);
  game.jumpLock = false;
  game.jumpBuffer = 0;
}

function confirmCharacterSelection() {
  if (audio.init) audio.init(); // Initialize audio on first interaction
  const selected = characterOptions[game.selectedOptionIndex] || characterOptions[0];
  game.selectedCharacter = selected.key;
  setGameScreen(GAME_SCREENS.PLAYING);
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

function drawSpriteMember(member, t, cameraX = 0, spriteAtlas = sprites) {
  const sprite = spriteAtlas[member.sprite];
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
  // Indicatore sul personaggio controllato (solo in modalità famiglia)
  if (game.family.length > 1) {
    const leader = game.family[0];
    const opt = characterOptions.find((o) => o.key === leader.sprite);
    const color = opt?.color || '#ffd23f';
    const bob = Math.sin(t * 0.006) * 6;
    const x = leader.x - cameraX;
    const y = leader.y - leader.scale * 150 - 36 + bob;
    ctx.save();
    ctx.fillStyle = color;
    ctx.strokeStyle = '#020816';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(x - 18, y);
    ctx.lineTo(x + 18, y);
    ctx.lineTo(x, y + 22);
    ctx.closePath();
    ctx.stroke();
    ctx.fill();
    ctx.restore();
  }
}

function drawShockwave(cameraX = 0) {
  const sw = game.shockwave;
  if (!sw) {
    return;
  }
  const progress = sw.age / sw.maxAge;
  const r = sw.radius * progress;
  ctx.save();
  ctx.globalAlpha = Math.max(0, 1 - progress);
  ctx.strokeStyle = sw.color;
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.arc(sw.x - cameraX, sw.y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#ffffff';
  ctx.globalAlpha = Math.max(0, 0.8 - progress);
  ctx.beginPath();
  ctx.arc(sw.x - cameraX, sw.y, r * 0.7, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
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
    return game.gemsCollected >= game.totalGems ? 'Tutte le stelle raccolte' : 'Schermata completata';
  }
  if (game.timer <= 0) {
    return 'Tempo terminato';
  }
  return game.message;
}

function drawHUD(t) {
  const levelCount = Math.max(1, game.levelCount || levelDefinitions.length || 1);
  const currentLevel = game.currentLevelIndex + 1;

  pixelRect(0, 0, WIDTH, 162, '#020816');
  pixelRect(0, 150, WIDTH, 12, palette.hudLine);

  pxText(`LIVELLO ${currentLevel}/${levelCount}`, 40, 24, '#bfe7ff', 0.98);
  pxText(`AREA ${game.currentSection + 1}/${LEVEL_SEGMENTS.length}`, 40, 98, '#fff7b8', 0.68);

  pxText(`STELLE ${game.gemsCollected}/${game.totalGems}`, 388, 24, '#ffe66d', 0.98, 'center');
  pxText(game.completed ? 'COMPLETATO' : 'RACCOGLI', 388, 98, game.completed ? '#8dff8f' : '#ffffff', 0.68, 'center');

  pxText(formatTimer(game.timer), 652, 22, game.timer < 30 ? '#ff7979' : '#ffffff', 1.12, 'center');
  pxText('TEMPO', 652, 102, '#bfe7ff', 0.62, 'center');

  pxText('VITE', 804, 28, '#ff6b8a', 0.72);
  for (let i = 0; i < game.lives; i++) {
    pxText('♥', 804 + i * 38, 86, palette.heart, 0.95, 'center');
  }

  if (game.combo >= 2) {
    const pulseScale = 0.85 + game.comboPulse * 1.2;
    pxText(`×${game.combo} COMBO`, WIDTH / 2, 168, palette.gold1, pulseScale, 'center');
  }

  drawAbilityIndicator();
}

function drawAbilityIndicator() {
  const key = getActiveKey();
  const ab = ABILITIES[key];
  if (!ab) {
    return;
  }
  const w = 168;
  const h = 96;
  const x = WIDTH - w - 12;
  const y = 172;
  const hasCooldown = ab.cooldown > 0;
  const ready = !hasCooldown || game.abilityCooldown <= 0;

  pixelRect(x, y, w, h, '#020816');
  pixelRect(x + 4, y + 4, w - 8, 8, ab.color);
  pxText(ab.name, x + w / 2, y + 18, ready ? ab.color : '#6a7b90', 0.5, 'center');

  if (hasCooldown) {
    const ratio = ready ? 1 : 1 - game.abilityCooldown / ab.cooldown;
    drawBar(x + 14, y + 50, w - 28, 22, ratio, ready ? ab.color : '#3a78c0');
    pxText(ready ? 'PRONTO' : '...', x + w / 2, y + 74, ready ? '#8dff8f' : '#9fb6cf', 0.36, 'center');
  } else {
    pxText('SEMPRE PRONTO', x + w / 2, y + 56, '#8dff8f', 0.34, 'center');
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
  const scoreDisplay = game.score * game.scoreMultiplier;
  const distanceRatio = clamp((player.x - SECTION_START_X) / Math.max(1, SECTION_END_VISUAL_X - SECTION_START_X), 0, 1);
  pxText(`PUNTI ${String(scoreDisplay).padStart(4, '0')}`, 952, 1394, '#ffe66d', 0.68, 'center');
  const jumpState = player.grounded ? 'SALTO PRONTO' : 'IN ARIA';
  const isLastSectionOfLevel = game.currentSection >= LEVEL_SEGMENTS.length - 1;
  const nextGoal = isLastSectionOfLevel
    ? (game.currentLevelIndex < (game.levelCount || levelDefinitions.length) - 1 ? 'COMPLETA IL LIVELLO' : 'RAGGIUNGI IL TRAGUARDO')
    : 'RAGGIUNGI IL BORDO DESTRO';

  pixelRect(0, 1298, WIDTH, 142, '#020816');
  pixelRect(0, 1298, WIDTH, 12, palette.hudLine);

  pxText(nextGoal, 40, 1328, '#fff7b8', 0.74);
  drawBar(40, 1392, 460, 34, distanceRatio, '#ffbf38', '#3f3142');

  pxText(jumpState, 690, 1328, player.grounded ? '#8dff8f' : '#bfe7ff', 0.76, 'center');
  pxText('SPAZIO SALTA  SHIFT CORRI', 690, 1394, '#ffffff', 0.48, 'center');

  pxText('R RESET', 952, 1328, '#bfe7ff', 0.62, 'center');
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

function drawTitleScreen(t) {
  // Draw background sky
  drawSkyParallax(t * 0.03);
  drawHillsAndTown(0);

  // Dark overlay
  const alpha = 0.6 + Math.sin(t * 0.003) * 0.1;
  pixelRect(0, 0, WIDTH, HEIGHT, `rgba(0, 0, 0, ${alpha})`);

  const cx = WIDTH / 2;

  // Title with glow effect
  const titlePulse = 1 + Math.sin(t * 0.004) * 0.05;
  
  // Title shadow
  pxText('FAMILY GAME', cx + 4, 384, '#000000', 2.2 * titlePulse, 'center');
  // Main title
  pxText('FAMILY GAME', cx, 380, palette.gold1, 2.2 * titlePulse, 'center');
  
  // Subtitle
  pxText('Una storia di famiglia', cx, 520, '#ffffff', 1.1, 'center');

  // Decorative line
  pixelRect(cx - 280, 580, 560, 4, palette.gold1);
  pixelRect(cx - 200, 590, 400, 2, '#ffe66d');

  // Instructions box
  pixelRect(cx - 320, 700, 640, 340, '#020816');
  pixelRect(cx - 320, 696, 640, 8, palette.gold1);
  pixelRect(cx - 320, 1032, 640, 8, palette.gold1);

  // Instructions text
  pxText('COME GIOCARE', cx, 750, '#ffe66d', 0.9, 'center');
  
  pxText('◀ ▶  Muovi a sinistra/destra', cx, 830, '#bfe7ff', 0.72, 'center');
  pxText('▲  o  SPAZIO  —  Salta', cx, 900, '#bfe7ff', 0.72, 'center');
  pxText('⚡  o  SHIFT  —  Corri', cx, 970, '#bfe7ff', 0.72, 'center');
  pxText('ESC  —  Pausa', cx, 1040, '#bfe7ff', 0.72, 'center');

  // Start prompt with blinking effect
  const blinkAlpha = 0.5 + Math.sin(t * 0.006) * 0.5;
  if (blinkAlpha > 0.3) {
    pixelRect(cx - 240, 1140, 480, 80, `rgba(26, 160, 80, ${blinkAlpha * 0.3})`);
    pxText('TOCCA PER INIZIARE', cx, 1180, '#8dff8f', 0.95 * titlePulse, 'center');
  }

  // Version info
  pxText('v1.0', cx, 1380, '#4a5568', 0.5, 'center');
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
  pxText(selected.label, WIDTH / 2, 968, selected.color, 0.72, 'center');
  pxText(selected.description.toUpperCase(), WIDTH / 2, 1012, '#ffffff', 0.4, 'center');
  const selAbility = ABILITIES[selected.key];
  if (selAbility) {
    pxText(`ABILITA: ${selAbility.name}`, WIDTH / 2, 1046, selAbility.color, 0.42, 'center');
  } else {
    pxText('CAMBIA EROE CON Q/E - OGNUNO HA LA SUA ABILITA', WIDTH / 2, 1046, '#ffe66d', 0.34, 'center');
  }

  selectionHitBoxes.confirm = { x: 348, y: 1122, w: 384, h: 92 };
  pixelRect(348, 1122, 384, 92, '#0b531f');
  pixelRect(362, 1136, 356, 64, '#168f35');
  pxText('CONFERMA', WIDTH / 2, 1142, '#ffffff', 0.76, 'center');

  pxText('←  →  CAMBIA', 300, 1248, '#ffe66d', 0.54, 'center');
  pxText('INVIO / SPAZIO  GIOCA', 780, 1248, '#9dd3ff', 0.54, 'center');
  pxText('IN GIOCO:  F ABILITA   Q/E CAMBIA EROE', WIDTH / 2, 1306, '#b78bff', 0.44, 'center');
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

function spawnText(x, y, text, color = palette.gold1, scale = 0.7) {
  game.particles.push({ x, y, text, color, vy: -180, life: 1.2, maxLife: 1.2, scale });
}

function updateParticles(dt) {
  for (const p of game.particles) {
    p.y += p.vy * dt;
    p.life -= dt;
  }
  game.particles = game.particles.filter((p) => p.life > 0);
}

function drawParticles(cameraX = 0) {
  ctx.save();
  for (const p of game.particles) {
    const alpha = p.life / p.maxLife;
    ctx.globalAlpha = alpha;
    pxText(p.text, p.x - cameraX, p.y, p.color, p.scale, 'center');
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawEnemy(enemy, cameraX = 0) {
  if (enemy.defeated || enemy.section !== game.currentSection) {
    return;
  }
  drawSpriteMember(enemy, 0, cameraX, enemySprites);
}

function drawEnemies(cameraX = 0) {
  for (const enemy of game.enemies) {
    if (enemy.defeated) {
      continue;
    }
    drawEnemy(enemy, cameraX);
    if (enemy.stunTimer > 0) {
      const t = performance.now();
      const cx = enemy.x - cameraX;
      const cy = enemy.y - Math.max(118, (enemy.scale || 1) * 132) - 18;
      for (let i = 0; i < 3; i++) {
        const a = t * 0.006 + (i * Math.PI * 2) / 3;
        pxText('✦', cx + Math.cos(a) * 26, cy + Math.sin(a) * 10, '#bfe7ff', 0.42, 'center');
      }
    }
  }
}

function updateEnemies(dt, player) {
  game.enemyHitCooldown = Math.max(0, game.enemyHitCooldown - dt);

  for (const enemy of game.enemies) {
    if (enemy.defeated || enemy.section !== game.currentSection) {
      continue;
    }

    const dx = player.x - enemy.x;
    const playerClose = Math.abs(dx) < enemy.aggroRange;
    const desiredDir = Math.sign(dx || enemy.dir || 1);
    const surfaceY = getTerrainSurfaceAt(enemy.x, enemy.section);
    const enemyHeight = Math.max(118, (enemy.scale || 1) * 132);
    const enemyTop = enemy.y - enemyHeight;
    const stompY = enemyTop + enemyHeight * 0.22;
    const horizontalOverlap = Math.abs(dx) < Math.max(52, (enemy.scale || 1) * 58);

    if (horizontalOverlap && player.vy >= 0) {
      const playerWasAbove = (player.prevY ?? player.y) <= stompY;
      const playerIsLandingOnTop = player.y >= stompY - 24 && player.y <= stompY + 30;
      if (playerWasAbove && playerIsLandingOnTop) {
        enemy.defeated = true;
        player.vy = -JUMP_VELOCITY * 0.55;
        player.grounded = false;
        game.score += 2;
        spawnText(enemy.x, enemy.y - 100, 'KO!', palette.gold1, 0.9);
        audio.collectStar();
        continue;
      }
    }

    // Nemico stordito dall'onda d'urto del Papà: passivo, scivola e non attacca
    if (enemy.stunTimer > 0) {
      enemy.stunTimer = Math.max(0, enemy.stunTimer - dt);
      enemy.action = 'idle';
      enemy.x = clamp(enemy.x + enemy.vx * dt, 140, game.worldWidth - 140);
      enemy.vx *= Math.pow(0.86, dt * 60);
      const stunSurfaceY = getTerrainSurfaceAt(enemy.x, enemy.section);
      if (stunSurfaceY !== null) {
        enemy.y = stunSurfaceY;
        enemy.grounded = true;
      }
      continue;
    }

    const tryStompOrDamage = () => {
      const hitRadius = enemy.attackRange || enemy.hitRadius;
      const canHit = game.enemyHitCooldown <= 0 && dist2(enemy, player) < hitRadius ** 2;
      if (!canHit) {
        return false;
      }

      const playerWasAbove = (player.prevY ?? player.y) <= enemy.y - 26;
      const playerIsLandingOnTop = player.y <= enemy.y + 30;
      const stomped = player.vy >= 0 && playerWasAbove && playerIsLandingOnTop;
      if (stomped) {
        enemy.defeated = true;
        player.vy = -JUMP_VELOCITY * 0.55;
        player.grounded = false;
        game.score += 2;
        spawnText(enemy.x, enemy.y - 100, 'KO!', palette.gold1, 0.9);
        audio.collectStar();
        return true;
      }

      enemy.damageDealt = true;
      game.enemyHitCooldown = 1.0;
      game.lives -= 1;
      player.vx += (enemy.facing || enemy.dir || 1) * (enemy.attackKnockback || 650);
      player.vy = -720;
      player.grounded = false;
      spawnText(player.x, player.y - 100, 'OOPS!', palette.heart);
      audio.fall();
      if (game.lives <= 0) {
        game.gameOverReason = 'lives';
        setGameScreen(GAME_SCREENS.GAMEOVER);
        return true;
      }
      return true;
    };

    if (enemy.attackTimer > 0) {
      enemy.attackTimer = Math.max(0, enemy.attackTimer - dt);
      enemy.vx = 0;
      enemy.action = 'attack';
      enemy.facing = desiredDir;

      if (!enemy.damageDealt && enemy.attackTimer <= enemy.attackImpactAt) {
        if (tryStompOrDamage()) {
          if (enemy.defeated) {
            continue;
          }
          if (game.screen !== GAME_SCREENS.PLAYING) {
            return;
          }
        }
      }

      if (enemy.attackTimer <= 0) {
        enemy.attackCooldown = enemy.attackCooldownMax;
        enemy.damageDealt = false;
        enemy.action = 'idle';
      }
      continue;
    }

    if (enemy.attackCooldown > 0) {
      enemy.attackCooldown = Math.max(0, enemy.attackCooldown - dt);
      enemy.vx = 0;
      enemy.action = 'idle';
      enemy.facing = desiredDir;
      if (surfaceY !== null) {
        enemy.y = surfaceY;
        enemy.grounded = true;
      }
      continue;
    }

    const lookAheadX = enemy.x + enemy.dir * 70;
    const hasGroundAhead = getTerrainSurfaceAt(lookAheadX, enemy.section) !== null;

    if (!hasGroundAhead) {
      enemy.dir *= -1;
    } else if (playerClose) {
      enemy.dir = desiredDir;
    } else if (enemy.x <= enemy.patrolMin) {
      enemy.dir = 1;
    } else if (enemy.x >= enemy.patrolMax) {
      enemy.dir = -1;
    }
    enemy.facing = enemy.dir;

    const targetSpeed = enemy.dir * enemy.speed * (playerClose ? 1.18 : 0.72);
    enemy.vx += (targetSpeed - enemy.vx) * Math.min(1, dt * 6);
    enemy.x = clamp(enemy.x + enemy.vx * dt, 140, game.worldWidth - 140);

    const nextSurfaceY = getTerrainSurfaceAt(enemy.x, enemy.section);
    if (nextSurfaceY !== null) {
      enemy.y = nextSurfaceY;
      enemy.grounded = true;
    } else {
      enemy.x -= enemy.vx * dt;
      enemy.vx = 0;
      enemy.dir *= -1;
      enemy.facing = enemy.dir;
      enemy.grounded = false;
    }

    if (playerClose && dist2(enemy, player) < (enemy.attackRange || enemy.hitRadius) ** 2) {
      enemy.attackTimer = enemy.attackDuration;
      enemy.damageDealt = false;
      enemy.vx = 0;
      enemy.action = 'attack';
      enemy.facing = desiredDir;
      player.vx *= 0.35;
    }
  }
}

function drawWorld(cameraX, t) {
  const level = getCurrentLevelDefinition();
  const levelAsset = level ? levelBackgrounds.get(level.id) : null;
  if (levelAsset?.ready) {
    const section = LEVEL_SEGMENTS[game.currentSection];
    const levelBottom = LEVEL_BAND_Y + Math.round(section.sh * LEVEL_SCALE);
    const stripImage = levelAsset.stripImages?.[game.currentSection];
    if (stripImage?.naturalWidth) {
      ctx.drawImage(
        stripImage,
        -cameraX,
        LEVEL_BAND_Y,
        LEVEL_SECTION_WIDTH,
        Math.round(section.sh * LEVEL_SCALE)
      );
    }
    pixelRect(0, levelBottom, WIDTH, Math.max(0, 1312 - levelBottom), '#181b24');
  } else {
    drawSkyParallax(cameraX);
  }

  drawCollectibleLayer(t, cameraX);
  drawParty(t, cameraX);
  drawEnemies(cameraX);
  drawShockwave(cameraX);
  drawParticles(cameraX);
}

function updateGame(dt) {
  // Aggiorna overlayAlpha per stati con overlay
  if (game.screen !== GAME_SCREENS.PLAYING &&
      game.screen !== GAME_SCREENS.CHARACTER_SELECT) {
    game.overlayTimer += dt;
    game.overlayAlpha = Math.min(1, game.overlayTimer * OVERLAY_FADE_SPEED);
  }
  // Freeze fisica per stati non-PLAYING
  if (game.screen !== GAME_SCREENS.PLAYING) {
    return;
  }
  if (game.completed) {
    return;
  }

  game.timer = Math.max(0, game.timer - dt);
  game.abilityCooldown = Math.max(0, game.abilityCooldown - dt);
  if (game.dashTimer > 0) game.dashTimer = Math.max(0, game.dashTimer - dt);
  if (game.shockwave) {
    game.shockwave.age += dt;
    if (game.shockwave.age >= game.shockwave.maxAge) game.shockwave = null;
  }
  if (game.comboTimer > 0) {
    game.comboTimer = Math.max(0, game.comboTimer - dt);
  } else {
    game.combo = 0;
  }
  game.comboPulse = Math.max(0, game.comboPulse - dt);
  updateParticles(dt);

  if (game.timer <= 0 && !game.completed) {
    game.gameOverReason = 'timer';
    setGameScreen(GAME_SCREENS.GAMEOVER);
    return;
  }

  const player = game.family[0];
  player.prevY = player.y;
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

  const targetSpeed = inputX * maxSpeed;
  if (inputX !== 0) {
    player.vx = approach(player.vx, targetSpeed, accel * dt);
  } else {
    player.vx *= drag;
  }
  player.vx = clamp(player.vx, -maxSpeed, maxSpeed);

  // Scatto del Teen: mantiene una velocità oltre il limite normale per la durata dello scatto
  if (game.dashTimer > 0) {
    player.vx = (player.facing || 1) * PLAYER_RUN_MAX_SPEED * DASH_SPEED_MULT;
  }

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

  if (player.grounded && player.x >= SECTION_END_VISUAL_X) {
    if (game.currentSection < LEVEL_SEGMENTS.length - 1) {
      placeFamilyAtSectionStart(game.currentSection + 1);
      game.message = `Schermata ${game.currentSection + 1} di ${LEVEL_SEGMENTS.length}`;
      game.showCenterMessage = true;
      spawnText(game.cameraX + WIDTH / 2, HEIGHT / 2, 'AVANTI!', palette.energy, 1.2);
      return;
    }
    if (advanceToNextLevel()) {
      return;
    }
    game.completed = true;
    setGameScreen(GAME_SCREENS.WIN);
    return;
  }

  // Planata del Bimbo: tieni premuto abilità mentre cadi per limitare la velocità di discesa
  const gliding = getActiveKey() === 'kid' && controls.ability && !player.grounded && player.vy > 0;

  let needsRespawn = false;
  for (const member of game.family) {
    const surfaceY = getTerrainSurfaceAt(member.x, game.currentSection);
    if (surfaceY !== null) {
      member.vy += GRAVITY * dt;
      if (gliding && member === player && member.vy > GLIDE_MAX_FALL) {
        member.vy = GLIDE_MAX_FALL;
      }
      member.y += member.vy * dt;
      if (member.y >= surfaceY + (member.groundOffset || 0)) {
        member.y = surfaceY + (member.groundOffset || 0);
        member.vy = 0;
        member.grounded = true;
        member.coyoteTimer = 0;
        if (member === player) {
          game.doubleJumpUsed = false;
        }
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
      if (gliding && member === player && member.vy > GLIDE_MAX_FALL) {
        member.vy = GLIDE_MAX_FALL;
      }
      member.y += member.vy * dt;
    }
    if (member.y > FALL_RESET_Y) {
      needsRespawn = true;
    }
  }

  updateEnemies(dt, player);
  if (game.screen !== GAME_SCREENS.PLAYING) {
    return;
  }

  if (needsRespawn) {
    game.lives -= 1;
    spawnText(player.x, player.y - 100, 'OOPS!', palette.heart);
    audio.fall();
    if (game.lives <= 0) {
      game.gameOverReason = 'lives';
      setGameScreen(GAME_SCREENS.GAMEOVER);
      return;
    }
    respawnFamilyAtCheckpoint();
    return;
  }

  for (const item of game.collectibles) {
    if (item.taken || item.section !== game.currentSection) {
      continue;
    }
    const pickupOffset = player.scale * game.pickupOffsetMultiplier;
    const pickupRadius = player.scale * game.pickupRadiusMultiplier;
    const playerPickup = { x: player.x, y: player.y - pickupOffset };
    if (dist2(item, playerPickup) < pickupRadius ** 2) {
      item.taken = true;
      game.gemsCollected += 1;          // ← conta stelle fisiche
      game.comboTimer = game.comboWindow;
      game.combo += 1;
      game.comboPulse = 0.22;
      const multiplier = Math.min(game.combo, 5);
      game.score += multiplier;         // ← punteggio con bonus combo
      spawnText(player.x, player.y - 120, `+${multiplier}`, palette.gold1);
      if (game.combo >= 2) {
        spawnText(player.x, player.y - 200, `×${game.combo} COMBO!`, palette.gold2);
      }
      game.energy = Math.min(10, game.energy + game.energyRecoveryPerGem); // Legacy, no longer used
      audio.collectStar();
      if (game.gemsCollected >= game.totalGems) {   // ← condizione su stelle fisiche
        game.completed = true;
        setGameScreen(GAME_SCREENS.WIN);
        return;
      }
    }
  }

  if (!game.completed && game.gemsCollected < game.totalGems && game.timer > 0 && player.grounded) {
    game.message = 'Raccogli le stelle lungo il percorso';
    game.showCenterMessage = false;
  }
}

function drawOverlay(alpha, color = '#000000') {
  ctx.save();
  ctx.globalAlpha = alpha * 0.78;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawPauseOverlay() {
  drawOverlay(game.overlayAlpha, '#000818');
  const cx = WIDTH / 2;

  pixelRect(cx - 340, 540, 680, 360, '#020816');
  pixelRect(cx - 340, 536, 680, 8, palette.hudLine);
  pixelRect(cx - 340, 892, 680, 8, palette.hudLine);

  pxText('IN PAUSA', cx, 580, '#bfe7ff', 1.6, 'center');

  pxText(`STELLE  ${game.gemsCollected}/${game.totalGems}`, cx, 710, palette.gold1, 0.8, 'center');
  pxText(`TEMPO   ${formatTimer(game.timer)}`, cx, 780, '#ffffff', 0.8, 'center');
  const finalWinBonusDisplay = game.score * game.scoreMultiplier;
  pxText(String(finalWinBonusDisplay).padStart(5, '0'), cx, 850, '#ffe66d', 0.8, 'center');

  pixelRect(cx - 320, 930, 640, 130, '#07152a');
  pxText('ESC — RIPRENDI', cx, 950, '#8dff8f', 0.72, 'center');
  pxText('R — MENU PRINCIPALE', cx, 1018, '#ff9f9f', 0.72, 'center');
}

function drawGameOverOverlay(t) {
  drawOverlay(game.overlayAlpha, '#1a0000');
  const cx = WIDTH / 2;

  const pulse = 0.9 + Math.sin(t * 0.004) * 0.08;
  pxText('GAME OVER', cx, 480, palette.heart, 2.0 * pulse, 'center');

  const reason = game.gameOverReason === 'timer'
    ? 'IL TEMPO È SCADUTO'
    : game.gameOverReason === 'lives'
    ? 'HAI ESAURITO LE VITE'
    : 'GAME OVER';
  pxText(reason, cx, 660, '#ff9f9f', 0.78, 'center');

  pixelRect(cx - 300, 740, 600, 340, '#020816');
  pixelRect(cx - 300, 736, 600, 8, palette.heart);
  pixelRect(cx - 300, 1072, 600, 8, palette.heart);

  pxText('STELLE RACCOLTE', cx, 770, '#bfe7ff', 0.64, 'center');
  pxText(`${game.gemsCollected} / ${game.totalGems}`, cx, 830, palette.gold1, 1.1, 'center');

  pxText('PUNTEGGIO', cx, 920, '#bfe7ff', 0.64, 'center');
  const winBonusDisplay = game.score * game.scoreMultiplier;
  pxText(String(winBonusDisplay).padStart(5, '0'), cx, 980, '#ffe66d', 1.1, 'center');

  pixelRect(cx - 280, 1110, 560, 100, '#3d0a0a');
  pixelRect(cx - 268, 1122, 536, 76, '#7a1212');
  pxText('R — RIGIOCA', cx, 1138, '#ffffff', 0.82, 'center');
}

function drawWinOverlay(t) {
  drawOverlay(game.overlayAlpha, '#001208');
  const cx = WIDTH / 2;

  const pulse = 0.95 + Math.sin(t * 0.005) * 0.06;
  pxText('MISSIONE', cx, 390, palette.gold1, 1.7 * pulse, 'center');
  pxText('COMPLETATA!', cx, 510, palette.energy, 1.5 * pulse, 'center');

  pixelRect(cx - 340, 640, 680, 460, '#020816');
  pixelRect(cx - 340, 636, 680, 8, palette.energy);
  pixelRect(cx - 340, 1092, 680, 8, palette.energy);

  pxText('STELLE',       cx - 260, 672, '#bfe7ff', 0.64);
  pxText(`${game.gemsCollected}/${game.totalGems}`, cx + 80, 672, palette.gold1, 0.9);

  pxText('PUNTEGGIO',    cx - 260, 752, '#bfe7ff', 0.64);
  const gameOverScoreDisplay = game.score * game.scoreMultiplier;
  pxText(String(gameOverScoreDisplay).padStart(5, '0'), cx + 80, 752, '#ffe66d', 0.9);

  pxText('BONUS TEMPO',  cx - 260, 832, '#bfe7ff', 0.64);
  pxText(`+${String(game.winBonus).padStart(4, '0')}`, cx + 80, 832, palette.energy, 0.9);

  pixelRect(cx - 300, 930, 600, 4, '#334455');

  const totalScore = game.score * game.scoreMultiplier + game.winBonus;
  pxText('TOTALE',       cx - 260, 960, '#ffffff', 0.8);
  pxText(String(totalScore).padStart(6, '0'), cx + 80, 960, palette.gold2, 1.0);

  // Rating 1-3 stelle basato su gemsCollected
  const starRating = game.gemsCollected >= game.totalGems ? 3
    : game.gemsCollected >= Math.ceil(game.totalGems * 0.7) ? 2
    : 1;
  for (let i = 0; i < 3; i++) {
    pxText('★', cx - 80 + i * 76, 1020, i < starRating ? palette.gold1 : '#334455', 0.9, 'center');
  }

  pixelRect(cx - 280, 1120, 560, 100, '#0b3018');
  pixelRect(cx - 268, 1132, 536, 76, '#168f35');
  pxText('R — GIOCA ANCORA', cx, 1148, '#ffffff', 0.76, 'center');
}

function renderScene(t) {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  ctx.imageSmoothingEnabled = false;

  switch (game.screen) {
    case GAME_SCREENS.TITLE_SCREEN:
      drawTitleScreen(t);
      break;

    case GAME_SCREENS.CHARACTER_SELECT:
      drawCharacterSelection(t);
      break;

    case GAME_SCREENS.PLAYING:
      drawWorld(game.cameraX, t);
      drawCenterPanel();
      drawSparkles(t);
      drawBottomPanels();
      drawHUD(t);
      break;

    case GAME_SCREENS.PAUSED:
      drawWorld(game.cameraX, t);
      drawCenterPanel();
      drawSparkles(t);
      drawBottomPanels();
      drawHUD(t);
      drawPauseOverlay();
      break;

    case GAME_SCREENS.GAMEOVER:
      drawWorld(game.cameraX, t);
      drawHUD(t);
      drawGameOverOverlay(t);
      break;

    case GAME_SCREENS.WIN:
      drawWorld(game.cameraX, t);
      drawHUD(t);
      drawWinOverlay(t);
      break;
  }
}

function render(t) {
  const dt = lastTime ? Math.min(0.033, (t - lastTime) / 1000) : 0;
  lastTime = t;
  updateGame(dt);
  renderScene(t);
  requestAnimationFrame(render);
}

window.addEventListener('keydown', (e) => {
  if (audio.init) audio.init(); // Initialize audio on first keypress
  const key = e.key.toLowerCase();
  
  // Handle title screen - any key starts the game
  if (game.screen === GAME_SCREENS.TITLE_SCREEN) {
    e.preventDefault();
    setGameScreen(GAME_SCREENS.CHARACTER_SELECT);
    return;
  }
  
  if (game.screen === GAME_SCREENS.CHARACTER_SELECT) {
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

  if (game.screen === GAME_SCREENS.PAUSED) {
    if (key === 'escape') {
      e.preventDefault();
      setGameScreen(GAME_SCREENS.PLAYING);
    } else if (key === 'r') {
      e.preventDefault();
      setGameScreen(GAME_SCREENS.CHARACTER_SELECT);
    }
    return;
  }

  if (game.screen === GAME_SCREENS.GAMEOVER) {
    if (key === 'r') {
      e.preventDefault();
      setGameScreen(GAME_SCREENS.CHARACTER_SELECT);
    }
    return;
  }

  if (game.screen === GAME_SCREENS.WIN) {
    if (key === 'r') {
      e.preventDefault();
      setGameScreen(GAME_SCREENS.CHARACTER_SELECT);
    }
    return;
  }

  if (key === 'escape') {
    e.preventDefault();
    setGameScreen(GAME_SCREENS.PAUSED);
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
  } else if (key === 'f' || key === 'k') {
    e.preventDefault();
    if (!e.repeat) setControlState('ability', true);
  } else if (key === 'e' || key === 'tab') {
    e.preventDefault();
    if (!e.repeat) cycleActiveCharacter(1);
  } else if (key === 'q') {
    e.preventDefault();
    if (!e.repeat) cycleActiveCharacter(-1);
  } else if (key === 'r') {
    resetGame();
    lastTime = 0;
    return;
  }
});

window.addEventListener('keyup', (e) => {
  const key = e.key.toLowerCase();
  if (game.screen === GAME_SCREENS.CHARACTER_SELECT) {
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
  } else if (key === 'f' || key === 'k') {
    e.preventDefault();
    setControlState('ability', false);
  }
});

canvas.addEventListener('pointerdown', (event) => {
  if (audio.init) audio.init(); // Initialize audio on first interaction
  
  // Handle title screen - tap to start
  if (game.screen === GAME_SCREENS.TITLE_SCREEN) {
    event.preventDefault();
    setGameScreen(GAME_SCREENS.CHARACTER_SELECT);
    return;
  }
  
  if (game.screen !== GAME_SCREENS.CHARACTER_SELECT) {
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

Promise.all([loadConfig(), loadSprites(), loadEnemySprites(), loadTerrainData()]).then(async ([loadedConfig]) => {
  applyConfig(loadedConfig);
  await loadLevelBackgrounds();
  bindTouchControls();
  bindPauseButton();
  bindRestartButton();
  bindSwitchButton();
  resetGame();
  requestAnimationFrame(render);
});
