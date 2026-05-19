const SOURCE_SECTION_WIDTH = 1536;
const STORAGE_KEY = 'familygame-terrain';
const CONFIG_PATH = './assets/config.json';
const LEVEL_CONFIGS = [
  {
    id: 'level-1',
    title: 'Livello 1',
    subtitle: 'Prima serie di schermate',
    backgroundPath: './level.png',
    stripPaths: ['./level_strip_0.png', './level_strip_1.png', './level_strip_2.png'],
    sourceSectionHeight: 341,
    segments: [
      { sy: 0, sh: 341 },
      { sy: 341, sh: 341 },
      { sy: 682, sh: 342 }
    ]
  },
  {
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
    sourceSectionHeight: 256,
    segments: [
      { sy: 0, sh: 256 },
      { sy: 256, sh: 256 },
      { sy: 512, sh: 256 },
      { sy: 768, sh: 256 }
    ]
  }
];

const DEFAULT_LEVEL_DATA = [
  {
    terrainProfiles: [
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
    ],
    solidSpans: [
      [{ from: 0, to: 1536 }],
      [
        { from: 0, to: 560 },
        { from: 1120, to: 1536 }
      ],
      [{ from: 0, to: 1536 }]
    ]
  },
  {
    terrainProfiles: [
      [
        { x: 0, y: 210 },
        { x: 160, y: 210 },
        { x: 340, y: 209 },
        { x: 520, y: 208 },
        { x: 760, y: 214 },
        { x: 980, y: 218 },
        { x: 1210, y: 216 },
        { x: 1400, y: 212 },
        { x: 1536, y: 210 }
      ],
      [
        { x: 0, y: 212 },
        { x: 220, y: 212 },
        { x: 400, y: 214 },
        { x: 620, y: 218 },
        { x: 840, y: 219 },
        { x: 1040, y: 216 },
        { x: 1230, y: 213 },
        { x: 1536, y: 211 }
      ],
      [
        { x: 0, y: 213 },
        { x: 180, y: 213 },
        { x: 400, y: 214 },
        { x: 620, y: 216 },
        { x: 840, y: 219 },
        { x: 1040, y: 221 },
        { x: 1230, y: 217 },
        { x: 1536, y: 212 }
      ],
      [
        { x: 0, y: 214 },
        { x: 220, y: 214 },
        { x: 460, y: 213 },
        { x: 700, y: 214 },
        { x: 940, y: 216 },
        { x: 1180, y: 215 },
        { x: 1380, y: 213 },
        { x: 1536, y: 212 }
      ]
    ],
    solidSpans: [
      [{ from: 0, to: 1536 }],
      [{ from: 0, to: 1536 }],
      [{ from: 0, to: 1536 }],
      [{ from: 0, to: 1536 }]
    ]
  }
];

const bgImages = LEVEL_CONFIGS.map(() => []);

const canvases = [];
const ctxs = [];
const elements = {
  sections: document.getElementById('sections'),
  status: document.getElementById('status'),
  terrain: document.getElementById('mode-terrain'),
  gap: document.getElementById('mode-gap'),
  erase: document.getElementById('mode-erase'),
  saveLocal: document.getElementById('save-local'),
  download: document.getElementById('download'),
  copy: document.getElementById('copy'),
  reset: document.getElementById('reset'),
  import: document.getElementById('import'),
  levelButtons: LEVEL_CONFIGS.map((_, index) => document.getElementById(`level-${index}`))
};

const state = {
  mode: 'terrain',
  activeLevelIndex: 0,
  levels: [],
  drag: null,
  lastJson: '',
  dirty: false
};

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function loadImage(path) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = path;
  });
}

async function loadBackgroundImages(levelIndex) {
  const level = LEVEL_CONFIGS[levelIndex];
  const paths = Array.isArray(level.stripPaths) && level.stripPaths.length
    ? level.stripPaths
    : [level.backgroundPath];
  const images = [];
  for (const path of paths) {
    images.push(await loadImage(path));
  }
  bgImages[levelIndex] = images;
}

async function loadEditorConfig() {
  try {
    const response = await fetch(CONFIG_PATH, { cache: 'no-store' });
    if (!response.ok) {
      return null;
    }
    return await response.json();
  } catch {
    return null;
  }
}

function applyConfigStripPaths(config) {
  const levels = Array.isArray(config?.levels) ? config.levels : [];
  for (let i = 0; i < LEVEL_CONFIGS.length; i++) {
    const configLevel = levels[i];
    const stripPaths = Array.isArray(configLevel?.stripPaths) && configLevel.stripPaths.length
      ? configLevel.stripPaths
      : LEVEL_CONFIGS[i].stripPaths;
    LEVEL_CONFIGS[i].stripPaths = stripPaths;
  }
}

function sectionCountFor(levelIndex) {
  return LEVEL_CONFIGS[levelIndex].segments.length;
}

function levelHeight(levelIndex, sectionIndex) {
  return LEVEL_CONFIGS[levelIndex].segments[sectionIndex]?.sh || LEVEL_CONFIGS[levelIndex].sourceSectionHeight;
}

function makeDefaultLevelData(levelIndex) {
  const template = DEFAULT_LEVEL_DATA[levelIndex] || DEFAULT_LEVEL_DATA[0];
  const sectionCount = sectionCountFor(levelIndex);
  const terrainProfiles = [];
  const solidSpans = [];
  for (let i = 0; i < sectionCount; i++) {
    const templateIndex = Math.min(i, template.terrainProfiles.length - 1);
    terrainProfiles.push(deepClone(template.terrainProfiles[templateIndex]));
    solidSpans.push(deepClone(template.solidSpans[Math.min(i, template.solidSpans.length - 1)]));
  }
  return {
    ...deepClone(LEVEL_CONFIGS[levelIndex]),
    terrainProfiles,
    solidSpans
  };
}

function normalizePoints(points, maxY) {
  const cleaned = (Array.isArray(points) ? points : [])
    .map((point) => ({
      x: clamp(Number(point.x) || 0, 0, SOURCE_SECTION_WIDTH),
      y: clamp(Number(point.y) || 0, 0, maxY)
    }))
    .sort((a, b) => a.x - b.x);

  if (!cleaned.length) {
    return [];
  }
  if (cleaned[0].x !== 0) {
    cleaned.unshift({ x: 0, y: cleaned[0].y });
  }
  if (cleaned[cleaned.length - 1].x !== SOURCE_SECTION_WIDTH) {
    cleaned.push({ x: SOURCE_SECTION_WIDTH, y: cleaned[cleaned.length - 1].y });
  }
  return cleaned;
}

function normalizeSpans(spans) {
  const merged = (Array.isArray(spans) ? spans : [])
    .map((span) => ({
      from: clamp(Number(span.from) || 0, 0, SOURCE_SECTION_WIDTH),
      to: clamp(Number(span.to) || 0, 0, SOURCE_SECTION_WIDTH)
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
}

function invertSpans(spans) {
  const output = [];
  let cursor = 0;
  for (const span of spans) {
    if (span.from > cursor) {
      output.push({ from: cursor, to: span.from });
    }
    cursor = Math.max(cursor, span.to);
  }
  if (cursor < SOURCE_SECTION_WIDTH) {
    output.push({ from: cursor, to: SOURCE_SECTION_WIDTH });
  }
  return output;
}

function pointsToSamples(points, maxY, step = 8) {
  const count = Math.floor(SOURCE_SECTION_WIDTH / step) + 1;
  const samples = new Array(count).fill(maxY * 0.84);
  const sorted = normalizePoints(points, maxY);
  if (!sorted.length) {
    return samples;
  }
  for (let i = 0; i < count; i++) {
    const x = i * step;
    let left = sorted[0];
    let right = sorted[sorted.length - 1];
    for (let j = 1; j < sorted.length; j++) {
      if (x <= sorted[j].x) {
        left = sorted[j - 1];
        right = sorted[j];
        break;
      }
    }
    const span = Math.max(1, right.x - left.x);
    const t = clamp((x - left.x) / span, 0, 1);
    samples[i] = lerp(left.y, right.y, t);
  }
  return samples;
}

function samplesToPoints(samples, maxY, step = 8) {
  const points = samples.map((sample, index) => ({
    x: index * step,
    y: Math.round(clamp(sample, 0, maxY))
  }));
  points[points.length - 1].x = SOURCE_SECTION_WIDTH;
  return points;
}

function normalizeLevelData(input, levelIndex) {
  const fallback = makeDefaultLevelData(levelIndex);
  const config = LEVEL_CONFIGS[levelIndex];
  const sectionCount = config.segments.length;
  const normalized = {
    id: input?.id || config.id,
    title: input?.title || config.title,
    subtitle: input?.subtitle || config.subtitle,
    backgroundPath: input?.backgroundPath || config.backgroundPath,
    sourceSectionHeight: Number(input?.sourceSectionHeight) || config.sourceSectionHeight,
    segments: deepClone(input?.segments?.length ? input.segments : config.segments),
    terrainProfiles: [],
    solidSpans: []
  };

  for (let i = 0; i < sectionCount; i++) {
    const maxY = normalized.segments[i]?.sh || normalized.sourceSectionHeight;
    const profilePoints = input?.terrainProfiles?.[i] || fallback.terrainProfiles[Math.min(i, fallback.terrainProfiles.length - 1)];
    const spans = input?.solidSpans?.[i] || fallback.solidSpans[Math.min(i, fallback.solidSpans.length - 1)];
    normalized.terrainProfiles.push(normalizePoints(profilePoints, maxY));
    normalized.solidSpans.push(normalizeSpans(spans));
  }

  return normalized;
}

function normalizeTerrainData(data) {
  if (Array.isArray(data?.levels) && data.levels.length) {
    return {
      levels: LEVEL_CONFIGS.map((_, index) => normalizeLevelData(data.levels[index], index))
    };
  }

  return {
    levels: LEVEL_CONFIGS.map((_, index) => {
      if (index === 0 && (data?.terrainProfiles || data?.solidSpans)) {
        return normalizeLevelData(data, index);
      }
      return makeDefaultLevelData(index);
    })
  };
}

function buildData() {
  return {
    version: 2,
    sourceSectionWidth: SOURCE_SECTION_WIDTH,
    levels: state.levels.map((level, levelIndex) => ({
      id: level.id,
      title: level.title,
      subtitle: level.subtitle,
      backgroundPath: level.backgroundPath,
      sourceSectionHeight: level.sourceSectionHeight,
      segments: deepClone(level.segments),
      terrainProfiles: state.levels[levelIndex].terrainSamples.map((samples, sectionIndex) =>
        samplesToPoints(samples, levelHeight(levelIndex, sectionIndex))
      ),
      solidSpans: deepClone(level.solidSpans)
    }))
  };
}

function setStatus(text) {
  elements.status.textContent = text;
}

function setMode(mode) {
  state.mode = mode;
  elements.terrain.classList.toggle('active', mode === 'terrain');
  elements.gap.classList.toggle('active', mode === 'gap');
  elements.erase.classList.toggle('active', mode === 'erase');
  const labels = {
    terrain: 'Disegna terreno',
    gap: 'Crea buco',
    erase: 'Ripara buco'
  };
  setStatus(labels[mode] || mode);
}

function setActiveLevel(levelIndex) {
  state.activeLevelIndex = levelIndex;
  elements.levelButtons.forEach((button, index) => button.classList.toggle('active', index === levelIndex));
  syncLevelView();
}

function buildLevelCanvas(levelIndex, sectionIndex) {
  const level = state.levels[levelIndex];
  const section = level.segments[sectionIndex];
  const wrapper = document.createElement('div');
  wrapper.className = 'section';

  const head = document.createElement('div');
  head.className = 'section-head';
  const title = document.createElement('h2');
  title.textContent = `${level.title} - Strip ${sectionIndex + 1}`;
  const subtitle = document.createElement('small');
  subtitle.textContent = `${level.subtitle} | ${section.sh}px`;
  head.appendChild(title);
  head.appendChild(subtitle);

  const canvas = document.createElement('canvas');
  canvas.width = SOURCE_SECTION_WIDTH;
  canvas.height = section.sh;
  canvas.dataset.level = String(levelIndex);
  canvas.dataset.section = String(sectionIndex);

  wrapper.appendChild(head);
  wrapper.appendChild(canvas);
  return { wrapper, canvas };
}

function rebuildCanvases() {
  elements.sections.innerHTML = '';
  canvases.length = 0;
  ctxs.length = 0;

  const levelIndex = state.activeLevelIndex;
  const level = state.levels[levelIndex];
  for (let i = 0; i < level.segments.length; i++) {
    const { wrapper, canvas } = buildLevelCanvas(levelIndex, i);
    elements.sections.appendChild(wrapper);
    canvases.push(canvas);
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctxs.push(ctx);
    installCanvasEvents(canvas);
  }
}

function drawActiveLevel() {
  const levelIndex = state.activeLevelIndex;
  const level = state.levels[levelIndex];
  for (let i = 0; i < level.segments.length; i++) {
    drawSection(levelIndex, i);
  }
}

function getCanvasPoint(event, canvas) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: clamp(((event.clientX - rect.left) / rect.width) * canvas.width, 0, canvas.width),
    y: clamp(((event.clientY - rect.top) / rect.height) * canvas.height, 0, canvas.height)
  };
}

function paintTerrain(levelIndex, sectionIndex, x, y, lastX = null, lastY = null) {
  const level = state.levels[levelIndex];
  const maxY = levelHeight(levelIndex, sectionIndex);
  const samples = level.terrainSamples[sectionIndex];
  const idx = clamp(Math.round(x / 8), 0, samples.length - 1);
  if (lastX === null || lastY === null) {
    samples[idx] = clamp(y, 0, maxY);
    return;
  }
  const lastIdx = clamp(Math.round(lastX / 8), 0, samples.length - 1);
  const steps = Math.max(1, Math.abs(idx - lastIdx));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const sampleIndex = Math.round(lerp(lastIdx, idx, t));
    const sampleY = lerp(lastY, y, t);
    samples[sampleIndex] = clamp(sampleY, 0, maxY);
  }
}

function addGap(levelIndex, sectionIndex, fromX, toX) {
  const spans = state.levels[levelIndex].solidSpans[sectionIndex];
  const gap = {
    from: clamp(Math.min(fromX, toX), 0, SOURCE_SECTION_WIDTH),
    to: clamp(Math.max(fromX, toX), 0, SOURCE_SECTION_WIDTH)
  };
  if (gap.to - gap.from < 12) {
    gap.to = Math.min(SOURCE_SECTION_WIDTH, gap.from + 32);
  }

  const next = [];
  for (const span of spans) {
    if (gap.to <= span.from || gap.from >= span.to) {
      next.push(span);
      continue;
    }
    if (gap.from > span.from) {
      next.push({ from: span.from, to: gap.from });
    }
    if (gap.to < span.to) {
      next.push({ from: gap.to, to: span.to });
    }
  }
  state.levels[levelIndex].solidSpans[sectionIndex] = normalizeSpans(next);
}

function addSolidRange(levelIndex, sectionIndex, fromX, toX) {
  const spans = state.levels[levelIndex].solidSpans[sectionIndex];
  const solid = {
    from: clamp(Math.min(fromX, toX), 0, SOURCE_SECTION_WIDTH),
    to: clamp(Math.max(fromX, toX), 0, SOURCE_SECTION_WIDTH)
  };
  if (solid.to - solid.from < 12) {
    solid.to = Math.min(SOURCE_SECTION_WIDTH, solid.from + 32);
  }

  const next = [];
  let inserted = false;
  for (const span of spans) {
    if (solid.to < span.from - 1) {
      if (!inserted) {
        next.push({ ...solid });
        inserted = true;
      }
      next.push(span);
      continue;
    }
    if (solid.from > span.to + 1) {
      next.push(span);
      continue;
    }
    solid.from = Math.min(solid.from, span.from);
    solid.to = Math.max(solid.to, span.to);
  }
  if (!inserted) {
    next.push({ ...solid });
  }
  state.levels[levelIndex].solidSpans[sectionIndex] = normalizeSpans(next);
}

function drawBackground(ctx, levelIndex, sectionIndex) {
  const images = bgImages[levelIndex] || [];
  const image = images[sectionIndex];
  const section = LEVEL_CONFIGS[levelIndex].segments[sectionIndex];
  if (!image || !image.complete || !image.naturalWidth) {
    ctx.fillStyle = '#10253f';
    ctx.fillRect(0, 0, SOURCE_SECTION_WIDTH, section.sh);
    return;
  }

  if (images.length > 1) {
    ctx.drawImage(image, 0, 0, SOURCE_SECTION_WIDTH, section.sh);
    return;
  }

  ctx.drawImage(
    image,
    0,
    section.sy,
    SOURCE_SECTION_WIDTH,
    section.sh,
    0,
    0,
    SOURCE_SECTION_WIDTH,
    section.sh
  );
}

function drawSolidTerrain(ctx, samples, spans, sectionHeight) {
  ctx.save();
  ctx.fillStyle = 'rgba(44, 204, 104, 0.18)';
  ctx.strokeStyle = 'rgba(68, 211, 106, 0.9)';
  ctx.lineWidth = 4;

  for (const span of spans) {
    const start = clamp(Math.floor(span.from / 8), 0, samples.length - 1);
    const end = clamp(Math.ceil(span.to / 8), start + 1, samples.length - 1);
    ctx.beginPath();
    ctx.moveTo(start * 8, sectionHeight);
    for (let i = start; i <= end; i++) {
      ctx.lineTo(i * 8, samples[i]);
    }
    ctx.lineTo(end * 8, sectionHeight);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

function drawGapRegions(ctx, spans, sectionHeight) {
  for (const span of spans) {
    const x = Math.round(span.from);
    const width = Math.max(1, Math.round(span.to - span.from));
    ctx.fillStyle = 'rgba(255, 93, 115, 0.28)';
    ctx.fillRect(x, 0, width, sectionHeight);
    ctx.fillStyle = 'rgba(255, 93, 115, 0.75)';
    ctx.fillRect(x, sectionHeight - 14, width, 14);
  }
}

function drawTerrainLine(ctx, samples) {
  ctx.save();
  ctx.strokeStyle = '#44d36a';
  ctx.lineWidth = 4;
  ctx.beginPath();
  for (let i = 0; i < samples.length; i++) {
    const x = i * 8;
    const y = samples[i];
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.stroke();

  for (let i = 0; i < samples.length; i += 4) {
    const x = i * 8;
    const y = samples[i];
    ctx.fillStyle = i % 8 === 0 ? '#ffb528' : '#f4f6ff';
    ctx.fillRect(Math.round(x - 2), Math.round(y - 2), 4, 4);
  }
  ctx.restore();
}

function drawSection(levelIndex, sectionIndex) {
  const ctx = ctxs[sectionIndex];
  const level = state.levels[levelIndex];
  const section = level.segments[sectionIndex];
  const samples = level.terrainSamples[sectionIndex];
  const spans = level.solidSpans[sectionIndex];
  const gaps = invertSpans(spans);

  ctx.clearRect(0, 0, SOURCE_SECTION_WIDTH, section.sh);
  drawBackground(ctx, levelIndex, sectionIndex);
  drawSolidTerrain(ctx, samples, spans, section.sh);
  drawGapRegions(ctx, gaps, section.sh);
  drawTerrainLine(ctx, samples);

  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.fillRect(12, 12, 320, 42);
  ctx.fillStyle = '#f4f6ff';
  ctx.font = '18px monospace';
  ctx.fillText(
    `${level.title} | strip ${sectionIndex + 1}/${level.segments.length} | solidi ${spans.length} | buchi ${gaps.length}`,
    24,
    35
  );
  ctx.font = '16px monospace';
  ctx.fillStyle = '#9dd3ff';
  const hint =
    state.mode === 'terrain'
      ? 'Disegna il terreno'
      : state.mode === 'gap'
        ? 'Trascina per aprire un buco'
        : 'Trascina per chiudere un buco';
  ctx.fillText(hint, 24, 58);
  ctx.restore();
}

function syncLevelView() {
  rebuildCanvases();
  drawActiveLevel();
}

function buildData() {
  return {
    version: 2,
    sourceSectionWidth: SOURCE_SECTION_WIDTH,
    levels: state.levels.map((level, levelIndex) => ({
      id: level.id,
      title: level.title,
      subtitle: level.subtitle,
      backgroundPath: level.backgroundPath,
      sourceSectionHeight: level.sourceSectionHeight,
      segments: deepClone(level.segments),
      terrainProfiles: level.terrainSamples.map((samples, sectionIndex) =>
        samplesToPoints(samples, levelHeight(levelIndex, sectionIndex))
      ),
      solidSpans: deepClone(level.solidSpans)
    }))
  };
}

async function saveToSQLiteAndLocalStorage() {
  const data = buildData();
  const json = JSON.stringify(data, null, 2);

  try {
    const response = await fetch('/api/terrain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: json
    });
    if (response.ok) {
      setStatus('Salvato in SQLite + localStorage');
    }
  } catch {
    setStatus('SQLite non disponibile, salvo solo in localStorage');
  }

  window.localStorage.setItem(STORAGE_KEY, json);
  state.lastJson = json;
  state.dirty = false;
}

function downloadJson() {
  const json = JSON.stringify(buildData(), null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'terrain.json';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
  setStatus('JSON esportato');
}

async function copyJson() {
  const json = JSON.stringify(buildData(), null, 2);
  await navigator.clipboard.writeText(json);
  setStatus('JSON copiato');
}

async function loadTerrainFromSource(data) {
  const normalized = normalizeTerrainData(data);
  state.levels = normalized.levels.map((level, index) => ({
    ...LEVEL_CONFIGS[index],
    ...level,
    terrainSamples: level.terrainProfiles.map((points, sectionIndex) =>
      pointsToSamples(points, levelHeight(index, sectionIndex))
    )
  }));
  state.lastJson = JSON.stringify(buildData(), null, 2);
  state.dirty = false;
  syncLevelView();
}

async function loadInitialTerrain() {
  try {
    const response = await fetch('/api/terrain', { cache: 'no-store' });
    if (response.ok) {
      const data = await response.json();
    if (data) {
      await loadTerrainFromSource(data);
      setStatus('Caricato da SQLite');
      return;
      }
    }
  } catch {
    // fall through to localStorage
  }

  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      await loadTerrainFromSource(JSON.parse(saved));
      setStatus('Caricato da localStorage');
      return;
    } catch {
      // fall through
    }
  }

  try {
    const response = await fetch('./assets/terrain.json', { cache: 'no-store' });
    if (response.ok) {
      await loadTerrainFromSource(await response.json());
      setStatus('Caricato da assets/terrain.json');
      return;
    }
  } catch {
    // fall through
  }

  await loadTerrainFromSource({ levels: DEFAULT_LEVEL_DATA });
  setStatus('Caricato da valori predefiniti');
}

function pointerToSectionAction(event, canvas) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: clamp(((event.clientX - rect.left) / rect.width) * canvas.width, 0, canvas.width),
    y: clamp(((event.clientY - rect.top) / rect.height) * canvas.height, 0, canvas.height)
  };
}

function installCanvasEvents(canvas) {
  const levelIndex = Number(canvas.dataset.level || 0);
  const sectionIndex = Number(canvas.dataset.section || 0);

  canvas.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    canvas.setPointerCapture(event.pointerId);
    const { x, y } = pointerToSectionAction(event, canvas);
    state.drag = {
      levelIndex,
      sectionIndex,
      pointerId: event.pointerId,
      mode: state.mode,
      startX: x,
      lastX: x,
      lastY: y
    };
    if (state.mode === 'terrain') {
      paintTerrain(levelIndex, sectionIndex, x, y);
      state.dirty = true;
      drawActiveLevel();
    }
  });

  canvas.addEventListener('pointermove', (event) => {
    if (!state.drag || state.drag.pointerId !== event.pointerId) {
      return;
    }
    event.preventDefault();
    const { x, y } = pointerToSectionAction(event, canvas);
    if (state.drag.mode === 'terrain') {
      paintTerrain(levelIndex, sectionIndex, x, y, state.drag.lastX, state.drag.lastY);
      state.drag.lastX = x;
      state.drag.lastY = y;
      state.dirty = true;
      drawActiveLevel();
    }
  });

  canvas.addEventListener('pointerup', (event) => {
    if (!state.drag || state.drag.pointerId !== event.pointerId) {
      return;
    }
    event.preventDefault();
    const { x } = pointerToSectionAction(event, canvas);
    if (state.drag.mode === 'gap') {
      addGap(levelIndex, sectionIndex, state.drag.startX, x);
      state.dirty = true;
      drawActiveLevel();
    } else if (state.drag.mode === 'erase') {
      addSolidRange(levelIndex, sectionIndex, state.drag.startX, x);
      state.dirty = true;
      drawActiveLevel();
    }
    state.drag = null;
  });

  canvas.addEventListener('pointercancel', () => {
    state.drag = null;
  });
}

async function resetAll() {
  try {
    await fetch('/api/terrain', { method: 'DELETE' });
  } catch {
    // ignore
  }
  window.localStorage.removeItem(STORAGE_KEY);
  await loadTerrainFromSource({ levels: DEFAULT_LEVEL_DATA });
  setStatus('Ripristinato ai valori predefiniti');
}

elements.terrain.addEventListener('click', () => setMode('terrain'));
elements.gap.addEventListener('click', () => setMode('gap'));
elements.erase.addEventListener('click', () => setMode('erase'));
elements.saveLocal.addEventListener('click', () => {
  saveToSQLiteAndLocalStorage().catch(() => setStatus('Salvataggio non disponibile'));
});
elements.download.addEventListener('click', downloadJson);
elements.copy.addEventListener('click', () => {
  copyJson().catch(() => setStatus('Copia non disponibile'));
});
elements.reset.addEventListener('click', () => {
  resetAll().catch(() => setStatus('Reset non disponibile'));
});
elements.import.addEventListener('change', async () => {
  const file = elements.import.files?.[0];
  if (!file) {
    return;
  }
  const text = await file.text();
  await loadTerrainFromSource(JSON.parse(text));
  setStatus('Importato da file');
});

elements.levelButtons.forEach((button, index) => {
  button.addEventListener('click', () => setActiveLevel(index));
});

async function init() {
  const config = await loadEditorConfig();
  if (config) {
    applyConfigStripPaths(config);
  }

  for (let i = 0; i < LEVEL_CONFIGS.length; i++) {
    await loadBackgroundImages(i);
  }

  await loadInitialTerrain();
  setMode('terrain');
  setActiveLevel(0);
  syncLevelView();
}

init();
