const WIDTH = 1080;
const HEIGHT = 1920;
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

function pxText(text, x, y, color = palette.white, scale = 1, align = 'left') {
  ctx.save();
  ctx.font = `${48 * scale}px monospace`;
  ctx.textAlign = align;
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#0a1536';
  ctx.fillText(text, x + 4, y + 4);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.restore();
}

function pixelRect(x, y, w, h, c) {
  ctx.fillStyle = c;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function drawSky() {
  const blocks = 80;
  for (let i = 0; i < blocks; i++) {
    const t = i / blocks;
    const y = 145 + i * 12;
    const blend = t < 0.5 ? palette.sunset2 : palette.sunset1;
    pixelRect(0, y, WIDTH, 12, blend);
  }
  pixelRect(0, 145, WIDTH, 190, palette.pinkTop);
  for (let i = 0; i < 7; i++) {
    pixelRect(50 + i * 130, 300 + ((i % 2) * 45), 170, 26, '#f7b076');
    pixelRect(90 + i * 110, 350 + ((i % 3) * 36), 140, 20, '#ea9277');
  }
}

function drawHillsAndTown() {
  pixelRect(0, 660, WIDTH, 350, '#7b5a6f');
  pixelRect(0, 730, WIDTH, 230, '#6a4f65');
  for (let i = 0; i < 6; i++) {
    const x = 25 + i * 170;
    pixelRect(x, 620 + (i % 2) * 30, 95, 130, '#af7558');
    pixelRect(x + 6, 626 + (i % 2) * 30, 83, 14, '#8f4738');
    pixelRect(x + 14, 662 + (i % 2) * 30, 16, 18, '#3f2942');
    pixelRect(x + 50, 662 + (i % 2) * 30, 16, 18, '#3f2942');
  }

  for (let i = 0; i < 20; i++) {
    const x = (i * 53) % WIDTH;
    const h = 120 + ((i * 19) % 90);
    pixelRect(x, 800 - h / 5, 50, h, i % 2 ? palette.treeMid : palette.treeDark);
    pixelRect(x - 8, 760 - h / 5, 66, 40, palette.treeLight);
  }

  pixelRect(0, 1040, WIDTH, 180, palette.road);
  pixelRect(0, 1220, WIDTH, 60, '#8a6a4e');
  pixelRect(0, 1280, WIDTH, 120, '#2f2a2b');
}

function drawFence() {
  for (let i = 0; i < 15; i++) {
    pixelRect(40 + i * 72, 900, 18, 120, palette.fence);
  }
  pixelRect(20, 940, WIDTH - 40, 16, '#8f5f34');
  pixelRect(20, 992, WIDTH - 40, 16, '#6e4528');
}

function drawBigTree() {
  const baseX = 750;
  pixelRect(baseX + 140, 420, 62, 560, '#69442d');
  for (let i = 0; i < 35; i++) {
    const x = 650 + ((i * 43) % 380);
    const y = 260 + ((i * 31) % 420);
    const c = i % 3 === 0 ? palette.treeLight : i % 3 === 1 ? palette.treeMid : palette.treeDark;
    pixelRect(x, y, 110, 70, c);
  }
}

function drawCharacter(x, y, shirt, skin, bounce = 0, tall = 0) {
  const by = y + bounce;
  pixelRect(x + 22, by + 350 - tall, 26, 80 + tall, '#2a2f4a');
  pixelRect(x + 78, by + 350 - tall, 26, 80 + tall, '#2a2f4a');
  pixelRect(x + 8, by + 200 - tall, 110, 160, shirt);
  pixelRect(x + 0, by + 220 - tall, 18, 100, shirt);
  pixelRect(x + 118, by + 220 - tall, 18, 100, shirt);
  pixelRect(x + 24, by + 140 - tall, 78, 70, skin);
  pixelRect(x + 22, by + 110 - tall, 84, 40, '#3a241c');
  pixelRect(x + 36, by + 160 - tall, 14, 8, '#1a1b22');
  pixelRect(x + 76, by + 160 - tall, 14, 8, '#1a1b22');
  pixelRect(x + 38, by + 182 - tall, 48, 8, '#f8d6bf');
  pixelRect(x + 22, by + 430 - tall, 34, 18, '#f8f8f4');
  pixelRect(x + 74, by + 430 - tall, 34, 18, '#f8f8f4');
}

function drawParty(t) {
  const bob = Math.round(Math.sin(t * 0.003) * 3);
  drawCharacter(250, 920, '#296ab0', '#d98b59', bob, 20);
  drawCharacter(430, 925, '#8f8d90', '#e6ab86', -bob, 10);
  drawCharacter(560, 980, '#1f4f98', '#dda878', bob, -20);
  drawCharacter(700, 940, '#e8e7e1', '#d68f68', -bob, 0);

  pixelRect(614, 1118 + bob, 64, 10, '#f6f2df');
  pxText('CAMPIONI', 575, 1022 + bob, '#f2f4ff', 0.32);
}

function drawLampAndSign() {
  pixelRect(145, 700, 20, 420, '#2f3944');
  pixelRect(125, 670, 60, 50, '#1f252f');
  pixelRect(136, 686, 38, 30, '#f7da9f');

  pixelRect(800, 760, 170, 370, '#6e4528');
  pixelRect(806, 768, 158, 278, '#8d5a33');
  pxText('A CASA', 885, 800, '#ffd888', 0.45, 'center');
  pxText('E DOVE', 885, 855, '#ffd888', 0.45, 'center');
  pxText('SIAMO', 885, 910, '#ffd888', 0.45, 'center');
  pxText('INSIEME', 885, 965, '#ffd888', 0.45, 'center');
  pxText('❤', 885, 1020, '#ff5f6f', 0.45, 'center');

  pixelRect(980, 930, 88, 88, '#1f6eb8');
  pxText('→', 1022, 946, '#eef7ff', 0.75, 'center');
}

function drawHUD(t) {
  pixelRect(0, 0, WIDTH, 145, palette.hudLine);
  pixelRect(8, 8, WIDTH - 16, 129, palette.hudBlue);

  pixelRect(28, 30, 100, 100, '#144d73');
  pixelRect(38, 45, 76, 76, '#b06f4d');

  pxText('P1', 145, 36, '#32b4ea', 0.9);
  pxText('❤ x05', 146, 82, '#ffe4ef', 0.72);
  for (let i = 0; i < 6; i++) {
    pixelRect(146 + i * 26, 112, 18, 18, i < 5 ? '#6bec6a' : '#2a5f2f');
  }

  const shimmer = (Math.sin(t * 0.008) + 1) * 0.5;
  pxText('FAMIGLIA', 475, 26, shimmer > 0.5 ? '#ffd53d' : '#ffaf21', 1.15, 'center');
  pxText('in AVVENTURA!', 477, 80, '#9dd3ff', 0.8, 'center');

  pxText('★ x120', 760, 32, '#fff4ca', 0.74);
  pxText('🪙 x386', 760, 72, '#fff4ca', 0.74);
  pxText('⏱ 238', 760, 112, '#fff4ca', 0.74);
  pxText('MAPPA', 945, 24, '#35a7df', 0.62);
  pixelRect(906, 50, 150, 80, '#0b2f3a');
  pixelRect(916, 58, 26, 22, '#4bc56f');
  pixelRect(956, 80, 46, 8, '#4bc56f');
  pixelRect(996, 58, 8, 42, '#4bc56f');
  pixelRect(1030, 90, 20, 8, '#4bc56f');

  const blink = Math.floor(t / 340) % 2 === 0;
  if (blink) {
    pixelRect(688, 56, 10, 10, palette.heart);
    pixelRect(706, 44, 10, 10, palette.heart);
    pixelRect(716, 66, 10, 10, palette.heart);
  }
}

function drawCenterPanel() {
  pxText('LIVELLO', WIDTH / 2, 300, palette.gold1, 1.7, 'center');
  pxText('COMPLETATO!', WIDTH / 2, 430, palette.gold1, 1.7, 'center');

  pixelRect(260, 580, 560, 72, '#1e5c9b');
  pixelRect(270, 588, 540, 56, '#2076c8');
  pxText('★', 285, 594, '#ffe454', 0.68);
  pxText('LA GIORNATA PERFETTA', WIDTH / 2, 594, '#e7f4ff', 0.65, 'center');
  pxText('★', 770, 594, '#ffe454', 0.68);
}

function drawBottomPanels(t) {
  pixelRect(110, 1360, 860, 260, palette.panel);
  pixelRect(106, 1356, 868, 268, palette.panelBorder);
  pxText('★ OBIETTIVO RAGGIUNTO!', 150, 1410, '#ffdf3a', 0.78);
  pxText('Hai creato un ricordo', 150, 1482, palette.white, 0.74);
  pxText('indimenticabile!', 150, 1540, palette.white, 0.74);
  pixelRect(805, 1480, 96, 96, '#506686');
  pixelRect(825, 1502, 56, 44, '#3f4d63');
  if (Math.floor(t / 280) % 2 === 0) {
    pxText('✦', 883, 1482, '#ffdb45', 0.7);
  }

  pixelRect(28, 1670, 1024, 110, '#001b34');
  pixelRect(24, 1666, 1032, 118, palette.panelBorder);
  pxText('VITE', 80, 1702, '#ef4e76', 0.75);
  pxText('❤❤❤❤❤', 170, 1698, palette.heart, 0.72);
  pxText('ENERGIA', 370, 1702, '#59d766', 0.75);
  for (let i = 0; i < 10; i++) {
    pixelRect(520 + i * 26, 1710, 20, 30, i < 9 ? palette.energy : '#2b5c2f');
  }
  pxText('PUNTI 015240', 785, 1702, '#2ca9e9', 0.75);
}

function drawSparkles(t) {
  for (const s of stars) {
    const blink = Math.floor((t + s.x * 9) / 400) % 2;
    if (!blink) continue;
    pixelRect(s.x, s.y, s.s, s.s, '#ffe78c');
  }
}

function render(t) {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  ctx.imageSmoothingEnabled = false;

  drawSky();
  drawHillsAndTown();
  drawBigTree();
  drawFence();
  drawLampAndSign();
  drawCenterPanel();
  drawParty(t);
  drawSparkles(t);
  drawBottomPanels(t);
  drawHUD(t);

  requestAnimationFrame(render);
}

window.addEventListener('keydown', (e) => {
  if (e.key.toLowerCase() === 'r') {
    stars.reverse();
  }
});

requestAnimationFrame(render);
