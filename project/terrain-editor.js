const SOURCE_SECTION_WIDTH = 1536;
const SOURCE_SECTION_HEIGHT = 341;
const SAMPLE_STEP = 8;
const SECTION_COUNT = 3;
const STORAGE_KEY = 'familygame-terrain';

const DEFAULT_TERRAIN_DATA = {
  sourceSectionWidth: SOURCE_SECTION_WIDTH,
  sourceSectionHeight: SOURCE_SECTION_HEIGHT,
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
};

const bg = new Image();
bg.src = './level.png';
bg.onload = () => renderAll();
bg.onerror = () => renderAll();

const canvases = [...document.querySelectorAll('canvas[data-section]')];
const ctxs = canvases.map((canvas) => {
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  return ctx;
});

const els = {
  terrain: document.getElementById('mode-terrain'),
  gap: document.getElementById('mode-gap'),
  erase: document.getElementById('mode-erase'),
  saveLocal: document.getElementById('save-local'),
  download: document.getElementById('download'),
  copy: document.getElementById('copy'),
  reset: document.getElementById('reset'),
  import: document.getElementById('import'),
  status: document.getElementById('status')
};

const state = {
  mode: 'terrain',
  activeSection: 0,
  terrainSamples: [],
  solidSpans: [],
  dirty: false,
  drag: null,
  lastJson: ''
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

function sectionSampleCount() {
  return Math.floor(SOURCE_SECTION_WIDTH / SAMPLE_STEP) + 1;
}

function pointsToSamples(points, fallbackY) {
  const samples = new Array(sectionSampleCount()).fill(fallbackY);
  const sorted = [...points].sort((a, b) => a.x - b.x);
  if (!sorted.length) {
    return samples;
  }
  if (sorted[0].x > 0) {
    sorted.unshift({ x: 0, y: sorted[0].y });
  }
  if (sorted[sorted.length - 1].x < SOURCE_SECTION_WIDTH) {
    sorted.push({ x: SOURCE_SECTION_WIDTH, y: sorted[sorted.length - 1].y });
  }
  for (let i = 0; i < samples.length; i++) {
    const x = i * SAMPLE_STEP;
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

function samplesToPoints(samples) {
  const points = [];
  for (let i = 0; i < samples.length; i++) {
    points.push({
      x: i * SAMPLE_STEP,
      y: Math.round(clamp(samples[i], 0, SOURCE_SECTION_HEIGHT))
    });
  }
  points[points.length - 1].x = SOURCE_SECTION_WIDTH;
  return points;
}

function normalizeSpans(spans) {
  const merged = spans
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
  return output.filter((span) => span.to > span.from);
}

function normalizeTerrainData(data) {
  const terrainProfiles = Array.from({ length: SECTION_COUNT }, (_, index) => {
    const points = Array.isArray(data?.terrainProfiles?.[index]) ? data.terrainProfiles[index] : [];
    const cleaned = points
      .map((point) => ({
        x: clamp(Number(point.x) || 0, 0, SOURCE_SECTION_WIDTH),
        y: clamp(Number(point.y) || 0, 0, SOURCE_SECTION_HEIGHT)
      }))
      .sort((a, b) => a.x - b.x);
    if (!cleaned.length) {
      return deepClone(DEFAULT_TERRAIN_DATA.terrainProfiles[index]);
    }
    if (cleaned[0].x !== 0) {
      cleaned.unshift({ x: 0, y: cleaned[0].y });
    }
    if (cleaned[cleaned.length - 1].x !== SOURCE_SECTION_WIDTH) {
      cleaned.push({ x: SOURCE_SECTION_WIDTH, y: cleaned[cleaned.length - 1].y });
    }
    return cleaned;
  });

  const solidSpans = Array.from({ length: SECTION_COUNT }, (_, index) =>
    normalizeSpans(Array.isArray(data?.solidSpans?.[index]) ? data.solidSpans[index] : [])
  );

  return { terrainProfiles, solidSpans };
}

function buildData() {
  return {
    sourceSectionWidth: SOURCE_SECTION_WIDTH,
    sourceSectionHeight: SOURCE_SECTION_HEIGHT,
    terrainProfiles: state.terrainSamples.map((samples) => samplesToPoints(samples)),
    solidSpans: deepClone(state.solidSpans)
  };
}

function setStatus(text) {
  els.status.textContent = text;
}

function setMode(mode) {
  state.mode = mode;
  els.terrain.classList.toggle('active', mode === 'terrain');
  els.gap.classList.toggle('active', mode === 'gap');
  els.erase.classList.toggle('active', mode === 'erase');
  const labels = {
    terrain: 'Disegna terreno',
    gap: 'Crea buco',
    erase: 'Ripara buco'
  };
  setStatus(labels[mode] || mode);
}

function getCanvasPoint(event, canvas) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: clamp(((event.clientX - rect.left) / rect.width) * canvas.width, 0, canvas.width),
    y: clamp(((event.clientY - rect.top) / rect.height) * canvas.height, 0, canvas.height)
  };
}

function sectionFromCanvas(canvas) {
  return Number(canvas.dataset.section || 0);
}

function paintTerrain(sectionIndex, x, y, lastX = null, lastY = null) {
  const samples = state.terrainSamples[sectionIndex];
  const idx = clamp(Math.round(x / SAMPLE_STEP), 0, samples.length - 1);
  if (lastX === null || lastY === null) {
    samples[idx] = y;
    return;
  }
  const lastIdx = clamp(Math.round(lastX / SAMPLE_STEP), 0, samples.length - 1);
  const steps = Math.max(1, Math.abs(idx - lastIdx));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const sampleIndex = Math.round(lerp(lastIdx, idx, t));
    const sampleY = lerp(lastY, y, t);
    samples[sampleIndex] = sampleY;
  }
}

function addGap(sectionIndex, fromX, toX) {
  const spans = state.solidSpans[sectionIndex];
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
  state.solidSpans[sectionIndex] = normalizeSpans(next);
}

function addSolidRange(sectionIndex, fromX, toX) {
  const spans = state.solidSpans[sectionIndex];
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
  state.solidSpans[sectionIndex] = normalizeSpans(next);
}

function clearSection(sectionIndex) {
  state.terrainSamples[sectionIndex] = pointsToSamples(
    DEFAULT_TERRAIN_DATA.terrainProfiles[sectionIndex],
    SOURCE_SECTION_HEIGHT * 0.84
  );
  state.solidSpans[sectionIndex] = deepClone(DEFAULT_TERRAIN_DATA.solidSpans[sectionIndex]);
  state.dirty = true;
  renderAll();
}

function clearAll() {
  state.terrainSamples = DEFAULT_TERRAIN_DATA.terrainProfiles.map((points) =>
    pointsToSamples(points, SOURCE_SECTION_HEIGHT * 0.84)
  );
  state.solidSpans = deepClone(DEFAULT_TERRAIN_DATA.solidSpans);
  state.dirty = true;
  renderAll();
}

function drawBackground(ctx, index) {
  if (!bg.complete) {
    ctx.fillStyle = '#10253f';
    ctx.fillRect(0, 0, SOURCE_SECTION_WIDTH, SOURCE_SECTION_HEIGHT);
    return;
  }
  ctx.drawImage(
    bg,
    0,
    [0, 341, 682][index],
    SOURCE_SECTION_WIDTH,
    index === 2 ? 342 : 341,
    0,
    0,
    SOURCE_SECTION_WIDTH,
    SOURCE_SECTION_HEIGHT
  );
}

function drawSolidTerrain(ctx, samples, spans) {
  ctx.save();
  ctx.fillStyle = 'rgba(44, 204, 104, 0.18)';
  ctx.strokeStyle = 'rgba(68, 211, 106, 0.9)';
  ctx.lineWidth = 4;

  for (const span of spans) {
    const start = clamp(Math.floor(span.from / SAMPLE_STEP), 0, samples.length - 1);
    const end = clamp(Math.ceil(span.to / SAMPLE_STEP), start + 1, samples.length - 1);
    ctx.beginPath();
    ctx.moveTo(start * SAMPLE_STEP, SOURCE_SECTION_HEIGHT);
    for (let i = start; i <= end; i++) {
      ctx.lineTo(i * SAMPLE_STEP, samples[i]);
    }
    ctx.lineTo(end * SAMPLE_STEP, SOURCE_SECTION_HEIGHT);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

function drawGapRegions(ctx, spans) {
  for (const span of spans) {
    const x = Math.round(span.from);
    const width = Math.max(1, Math.round(span.to - span.from));
    ctx.fillStyle = 'rgba(255, 93, 115, 0.28)';
    ctx.fillRect(x, 0, width, SOURCE_SECTION_HEIGHT);
    ctx.fillStyle = 'rgba(255, 93, 115, 0.75)';
    ctx.fillRect(x, SOURCE_SECTION_HEIGHT - 14, width, 14);
  }
}

function drawTerrainLine(ctx, samples) {
  ctx.save();
  ctx.strokeStyle = '#44d36a';
  ctx.lineWidth = 4;
  ctx.beginPath();
  for (let i = 0; i < samples.length; i++) {
    const x = i * SAMPLE_STEP;
    const y = samples[i];
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.stroke();

  for (let i = 0; i < samples.length; i += 4) {
    const x = i * SAMPLE_STEP;
    const y = samples[i];
    ctx.fillStyle = i % 8 === 0 ? '#ffb528' : '#f4f6ff';
    ctx.fillRect(Math.round(x - 2), Math.round(y - 2), 4, 4);
  }
  ctx.restore();
}

function drawSection(index) {
  const ctx = ctxs[index];
  ctx.clearRect(0, 0, SOURCE_SECTION_WIDTH, SOURCE_SECTION_HEIGHT);
  drawBackground(ctx, index);
  const gaps = invertSpans(state.solidSpans[index]);
  drawSolidTerrain(ctx, state.terrainSamples[index], state.solidSpans[index]);
  drawGapRegions(ctx, gaps);
  drawTerrainLine(ctx, state.terrainSamples[index]);

  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.fillRect(12, 12, 264, 34);
  ctx.fillStyle = '#f4f6ff';
  ctx.font = '18px monospace';
  ctx.fillText(
    `${state.mode.toUpperCase()} | solidi ${state.solidSpans[index].length} | buchi ${gaps.length}`,
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

function renderAll() {
  for (let i = 0; i < SECTION_COUNT; i++) {
    drawSection(i);
  }
}

function setLocalStorageFromState() {
  const data = buildData();
  const json = JSON.stringify(data, null, 2);
  window.localStorage.setItem(STORAGE_KEY, json);
  state.lastJson = json;
  state.dirty = false;
  setStatus('Salvato nel gioco');
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
  state.terrainSamples = normalized.terrainProfiles.map((points) =>
    pointsToSamples(points, SOURCE_SECTION_HEIGHT * 0.84)
  );
  state.solidSpans = normalized.solidSpans.map((spans) => deepClone(spans));
  state.dirty = false;
  state.lastJson = JSON.stringify(buildData(), null, 2);
  renderAll();
}

async function loadInitialTerrain() {
  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      await loadTerrainFromSource(JSON.parse(saved));
      setStatus('Caricato da localStorage');
      return;
    } catch {
      // fall through to asset/defaults
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

  await loadTerrainFromSource(DEFAULT_TERRAIN_DATA);
  setStatus('Caricato da valori predefiniti');
}

function pointerToSectionAction(event, canvas) {
  const sectionIndex = sectionFromCanvas(canvas);
  const point = getCanvasPoint(event, canvas);
  const sourceX = clamp(point.x, 0, SOURCE_SECTION_WIDTH);
  const sourceY = clamp(point.y, 0, SOURCE_SECTION_HEIGHT);
  return { sectionIndex, sourceX, sourceY };
}

function installCanvasEvents(canvas) {
  const sectionIndex = sectionFromCanvas(canvas);
  canvas.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    canvas.setPointerCapture(event.pointerId);
    const { sourceX, sourceY } = pointerToSectionAction(event, canvas);
    state.drag = {
      sectionIndex,
      pointerId: event.pointerId,
      mode: state.mode,
      startX: sourceX,
      lastX: sourceX,
      lastY: sourceY
    };
    if (state.mode === 'terrain') {
      paintTerrain(sectionIndex, sourceX, sourceY);
      state.dirty = true;
      renderAll();
    }
  });

  canvas.addEventListener('pointermove', (event) => {
    if (!state.drag || state.drag.pointerId !== event.pointerId) {
      return;
    }
    event.preventDefault();
    const { sourceX, sourceY } = pointerToSectionAction(event, canvas);
    if (state.drag.mode === 'terrain') {
      paintTerrain(sectionIndex, sourceX, sourceY, state.drag.lastX, state.drag.lastY);
      state.drag.lastX = sourceX;
      state.drag.lastY = sourceY;
      state.dirty = true;
      renderAll();
    }
  });

  canvas.addEventListener('pointerup', (event) => {
    if (!state.drag || state.drag.pointerId !== event.pointerId) {
      return;
    }
    event.preventDefault();
    const { sourceX } = pointerToSectionAction(event, canvas);
    if (state.drag.mode === 'gap') {
      addGap(sectionIndex, state.drag.startX, sourceX);
      state.dirty = true;
      renderAll();
    } else if (state.drag.mode === 'erase') {
      addSolidRange(sectionIndex, state.drag.startX, sourceX);
      state.dirty = true;
      renderAll();
    }
    state.drag = null;
  });

  canvas.addEventListener('pointercancel', () => {
    state.drag = null;
  });
}

els.terrain.addEventListener('click', () => setMode('terrain'));
els.gap.addEventListener('click', () => setMode('gap'));
els.erase.addEventListener('click', () => setMode('erase'));
els.saveLocal.addEventListener('click', setLocalStorageFromState);
els.download.addEventListener('click', downloadJson);
els.copy.addEventListener('click', () => {
  copyJson().catch(() => setStatus('Copia non disponibile'));
});
els.reset.addEventListener('click', () => {
  window.localStorage.removeItem(STORAGE_KEY);
  clearAll();
  setStatus('Ripristinato ai valori predefiniti');
});
els.import.addEventListener('change', async () => {
  const file = els.import.files?.[0];
  if (!file) {
    return;
  }
  const text = await file.text();
  await loadTerrainFromSource(JSON.parse(text));
  setStatus('Importato da file');
});

for (const canvas of canvases) {
  installCanvasEvents(canvas);
}

setMode('terrain');
loadInitialTerrain().then(() => {
  renderAll();
});
