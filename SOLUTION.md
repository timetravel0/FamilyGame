# Famiglia in Avventura — Documentazione della Soluzione

## Indice

1. [Panoramica del Progetto](#panoramica-del-progetto)
2. [Struttura dei File](#struttura-dei-file)
3. [Tema Visivo (Purple Arcade)](#tema-visivo-purple-arcade)
4. [Editor del Terreno e degli Sprite](#editor-del-terreno-e-degli-sprite)
5. [Sistema di Override degli Sprite](#sistema-di-override-degli-sprite)
6. [PixelEditor — Editor Pixel per Pixel](#pixeleditor--editor-pixel-per-pixel)
7. [Cambio Personaggio](#cambio-personaggio)
8. [Abilità Uniche per Personaggio](#abilità-uniche-per-personaggio)
9. [Riferimento Completo dei Controlli](#riferimento-completo-dei-controlli)
10. [Server e Persistenza dei Dati](#server-e-persistenza-dei-dati)
11. [Architettura Tecnica](#architettura-tecnica)

---

## Panoramica del Progetto

**Famiglia in Avventura** è un platform side-scroller a scorrimento orizzontale su canvas HTML5, in italiano, con protagonista una famiglia di quattro personaggi. Il giocatore guida la famiglia verso destra raccogliendo stelle, evitando o stordendo i nemici, e passando da un personaggio all'altro per sfruttare le rispettive abilità speciali.

Il progetto gira su un server Node.js/Express con un database SQLite per la persistenza dei dati di terreno e degli sprite personalizzati.

### Caratteristiche principali

- Canvas portrait **1080 × 1440 px** che si adatta a qualsiasi schermo
- Quattro personaggi giocabili (**Papà, Mamma, Bimbo, Teen**), ciascuno con un'abilità unica
- **Editor del terreno** integrato con strumenti di disegno e un pannello sprite completo
- **Override degli sprite**: sostituisci qualsiasi immagine di gioco caricando un PNG oppure disegnando pixel per pixel
- Tema visivo **Purple Arcade** ispirato ai giochi arcade giapponesi anni '90
- Controlli touch per dispositivi mobili + tastiera per desktop

---

## Struttura dei File

```
FamilyGame/
├── project/
│   ├── index.html              # Shell del gioco: layout, stile, controlli touch
│   ├── main.js                 # Logica di gioco (canvas 2D, loop, fisica, HUD)
│   ├── audio.js                # Gestione audio
│   ├── terrain-editor.html     # Shell dell'editor: layout a due pannelli
│   ├── terrain-editor.js       # Logica editor terreno + editor sprite
│   ├── server.js               # Server Express + API SQLite
│   ├── package.json
│   ├── game-data.db            # Database SQLite (generato automaticamente)
│   └── assets/
│       ├── config.json         # Configurazione fisica e livelli
│       ├── character-sprites/  # Sprite PNG per personaggi e nemici
│       │   ├── dad/            # idle_left/right, walk_left/right_1-5, jump_left/right_1-3
│       │   ├── mom/
│       │   ├── kid/
│       │   ├── teen/
│       │   ├── banditi/
│       │   ├── uomini_in_giacca/
│       │   └── ragazzini_bulli/
│       └── character-sprites.json
├── SOLUTION.md                 # Questo file
└── README.md
```

---

## Tema Visivo (Purple Arcade)

### Font

Caricati da Google Fonts tramite `<link rel="preconnect">` per prestazioni ottimali:

| Font | Utilizzo |
|------|---------|
| **Press Start 2P** | Titoli, UI del gioco, pulsanti editor, HUD |
| **Baloo 2** | Testo descrittivo, etichette, paragrafi |

### Token CSS (Custom Properties)

Definiti in `:root` su entrambi i file HTML:

```css
:root {
  --ink:     #2a2140;   /* testo scuro su sfondi chiari */
  --cream:   #fff4d6;   /* testo principale (bianco caldo) */
  --gold:    #ffd23f;   /* accenti dorati, titolo */
  --rose:    #ff5b78;   /* pericolo, pulsante restart */
  --panel:   #241a3a;   /* pannelli secondari */
  --panel-2: #2f234d;   /* pannelli terziari */
  --line:    #4a3a78;   /* bordi, separatori */
  --accent:  #ffb43d;   /* accento arancio-dorato */
  --good:    #67d96b;   /* conferma, successo */
}
```

### Sfondo del Body

```css
background: radial-gradient(1200px 600px at 50% -10%,
  #2a2150 0%, #160f2c 55%, #0e0a1f 100%);
```

Una griglia di puntini bianchi semitrasparenti (opacità 6%) crea la texture dell'arcade:

```css
body::before {
  background-image: radial-gradient(circle, #fff 1px, transparent 1.4px);
  background-size: 26px 26px;
  opacity: .06;
}
```

### Cornice del Canvas (`#frame`)

```css
#frame {
  aspect-ratio: 1080 / 1440;
  border: 4px solid #120e26;
  box-shadow:
    0 0 0 4px #2c2350,           /* anello viola esterno */
    0 18px 40px rgba(0,0,0,.55), /* ombra profonda */
    inset 0 0 0 2px rgba(255,255,255,.04); /* lucentezza interna */
}
```

### Effetti CRT

Due `<div>` assoluti sovrapposti al canvas (z-index 5):

- **`#scanlines`**: righe orizzontali semitrasparenti ogni 4px via `repeating-linear-gradient`, `mix-blend-mode: multiply`
- **`#vignette`**: scurita ai bordi via `box-shadow: inset 0 0 80px rgba(0,0,0,.4)`

### Layout Responsivo

```css
.wrap {
  max-width: min(480px, calc((100vh - 110px) * 1080 / 1440));
}
```

La formula mantiene il canvas portrait sempre visibile con spazio per la titlebar e i controlli touch. Su schermi bassi (`max-height: 560px`) la titlebar scompare e il padding si riduce.

---

## Editor del Terreno e degli Sprite

L'editor si apre da `terrain-editor.html` (link **Editor** nell'angolo del canvas di gioco).

### Layout a Due Tab

La topbar contiene due tab principali:

| Tab | Contenuto |
|-----|-----------|
| **Terreno** (`#tab-terrain`) | Editor del profilo del terreno per livello/sezione |
| **Sprite** (`#tab-sprites`) | Galleria e pixel-editor degli sprite di gioco |

La funzione `switchMainTab(tab)` mostra/nasconde i pannelli aggiungendo la classe `.panel-hidden`.

### Tab Terreno

- Selettore livello (`Livello 1` / `Livello 2`)
- Per livello: selettore di sezione e modalità (**Sposta**, **Aggiungi punto**, **Rimuovi punto**, **Solido/Vuoto**)
- Legenda punti di controllo
- Salvataggio via `POST /api/terrain` e localStorage come fallback

### Tab Sprite

Struttura a griglia `320px | 1fr`:

```
┌─────────────────────┬─────────────────────────────────────┐
│  Galleria           │  Editor                             │
│  ─────────────────  │  ─────────────────────────────────  │
│  [Personaggi]       │  Intestazione: nome + pulsanti      │
│  [Nemici]           │  Canvas pixel + sidebar strumenti   │
│  [Sfondi]           │  Azioni: Salva / Upload / Scarica   │
│                     │                                     │
│  Sub-tab entità     │                                     │
│  Griglia card       │                                     │
└─────────────────────┴─────────────────────────────────────┘
```

#### Categorie del catalogo sprite

```javascript
const SPRITE_CATALOG = {
  characters: [
    { id: 'dad',  label: 'Papà',  color: '#32b4ea', walkCount: 5 },
    { id: 'mom',  label: 'Mamma', color: '#ff6f91', walkCount: 5 },
    { id: 'kid',  label: 'Bimbo', color: '#56de61', walkCount: 3 },
    { id: 'teen', label: 'Teen',  color: '#ffbf38', walkCount: 5 }
  ],
  enemies: [
    { id: 'banditi',           label: 'Banditi',           walkCount: 3 },
    { id: 'uomini_in_giacca',  label: 'Uomini in Giacca',  walkCount: 3 },
    { id: 'ragazzini_bulli',   label: 'Ragazzini Bulli',   walkCount: 3 }
  ],
  backgrounds: [
    { id: 'level_strip_0', label: 'L1 Strip 1', path: './level_strip_0.png' },
    // ... 7 strip totali per i due livelli
  ]
};
```

Ogni personaggio/nemico genera automaticamente frame per: `idle_left`, `idle_right`, `walk_left_1..N`, `walk_right_1..N`, `jump_left_1..3`, `jump_right_1..3`.

Le card con override attivo mostrano un bordo verde (classe `.overridden`).

---

## Sistema di Override degli Sprite

Gli sprite di gioco possono essere sostituiti senza modificare i file sorgente.

### Chiave di storage

```
localStorage: 'familygame-sprites'  →  { "path/to/sprite.png": "data:image/png;base64,..." }
SQLite:        tabella sprites, id = 1
```

### Flusso di caricamento in `main.js`

```javascript
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
    image.src = getSpriteOverride(path) || path;  // override se presente
  });
}
```

### Flusso di persistenza nell'editor

1. All'avvio dell'editor: `GET /api/sprites` → se risponde con dati li carica, altrimenti usa localStorage
2. Al salvataggio di uno sprite: aggiorna `spriteState.overrides[path]`, poi `POST /api/sprites` e localStorage
3. Al reset: rimuove la chiave dall'oggetto overrides e salva

---

## PixelEditor — Editor Pixel per Pixel

Classe `PixelEditor` in `terrain-editor.js`. Usa due canvas interni:

| Canvas | Risoluzione | Scopo |
|--------|------------|-------|
| **source** | dimensioni originali dell'immagine | contiene i pixel effettivi |
| **display** (DOM `#pe-canvas`) | source × zoom | visualizzazione ingrandita |

### Calcolo automatico dello zoom

```javascript
_recalcZoom() {
  const maxW = container.clientWidth  - 16;
  const maxH = container.clientHeight - 16;
  this.zoom = Math.max(1, Math.min(
    Math.floor(maxW / this.w),
    Math.floor(maxH / this.h),
    16
  ));
}
```

Sprite piccoli (es. 48×64 px) vengono mostrati a zoom 7× o più; sfondi grandi a 1×.

### Strumenti disponibili

| Tasto | Strumento | Funzione |
|-------|---------|---------|
| `P` | **Matita** | Disegna un pixel (o linea Bresenham durante il trascinamento) |
| `E` | **Gomma** | Cancella pixel (imposta alpha = 0) |
| `F` | **Riempi** | BFS flood fill dal pixel cliccato |
| `I` | **Contagocce** | Preleva il colore del pixel sotto il cursore |

### Undo / Redo

Stack di `ImageData` (massimo 50 stati per direzione). `Ctrl+Z` = undo, `Ctrl+Y` o `Ctrl+Shift+Z` = redo. Pulsanti anche nella barra dell'editor.

### Griglia di pixel

Quando zoom ≥ 4 viene disegnata una griglia semitrasparente sui bordi dei pixel; quando zoom < 4 viene omessa per non appesantire la visualizzazione.

### Sfondo a scacchiera

La trasparenza (alpha < 255) è visualizzata con una scacchiera grigio chiaro/scuro da 8×8 px, come i classici editor grafici.

---

## Cambio Personaggio

### Meccanica

L'array `game.family[]` contiene sempre tutti i membri della famiglia. **`game.family[0]` è sempre il personaggio controllato**; gli altri lo seguono come follower con fisica semplificata.

Per cambiare personaggio si ruota l'array invece di tenere un puntatore separato:

```javascript
function cycleActiveCharacter(direction = 1) {
  if (direction >= 0) {
    game.family.push(game.family.shift());   // porta il secondo in testa
  } else {
    game.family.unshift(game.family.pop());  // porta l'ultimo in testa
  }
  // reset stato abilità per il nuovo leader
  game.doubleJumpUsed = false;
  game.jumpLock = false;
  game.dashTimer = 0;
  // mostra nome del nuovo leader
  spawnText(leader.x, leader.y - 150, leader.label.toUpperCase(), leader.color, 0.95);
}
```

Questo approccio rende inutile toccare il resto del codice: tutto ciò che usa `game.family[0]` funziona automaticamente.

### Indicatore visivo

Un triangolo pieno arancione sopra il personaggio corrente indica il leader:

```javascript
// Triangolo indicatore leader (drawParty)
ctx.fillStyle = ABILITIES[getActiveKey()]?.color || '#ffd23f';
ctx.beginPath();
ctx.moveTo(cx,      headY - 18);
ctx.lineTo(cx - 12, headY - 34);
ctx.lineTo(cx + 12, headY - 34);
ctx.closePath();
ctx.fill();
```

### Controlli cambio personaggio

| Input | Azione |
|-------|--------|
| `E` / `Tab` | Prossimo personaggio (avanti) |
| `Q` | Personaggio precedente (indietro) |
| Pulsante `⇄` (touch) | Prossimo personaggio |

---

## Abilità Uniche per Personaggio

Ogni personaggio ha un'abilità distinta attivabile con il tasto `F` (tastiera) o il pulsante `★` (touch).

### Tabella abilità

| Personaggio | Abilità | Cooldown | Meccanica |
|-------------|---------|----------|-----------|
| **Papà** (dad) | SPINTA | 3.5 s | Onda d'urto circolare (raggio 380 px): stordisce tutti i nemici entro portata per 2.2 s con knockback |
| **Mamma** (mom) | DOPPIO SALTO | nessuno | Secondo salto mentre si è in aria e non ancora usato; attiva anche i follower in aria |
| **Bimbo** (kid) | PLANATA | nessuno | Tieni premuto `F`/`★` durante la caduta per limitare la velocità verticale a 360 px/s |
| **Teen** (teen) | SCATTO | 1.6 s | Impulso orizzontale istantaneo a 1.7× la velocità massima di corsa, dura 0.18 s |

### Shockwave (Papà)

```javascript
function doShockwave(player) {
  const radius = 380;
  game.shockwave = { x: player.x, y: player.y - 70, age: 0, maxAge: 0.45, radius };
  for (const enemy of game.enemies) {
    if (Math.abs(enemy.x - player.x) < radius) {
      enemy.stunTimer = 2.2;          // stordisce
      const kdir = Math.sign(enemy.x - player.x) || 1;
      enemy.vx = kdir * 1000;         // knockback
    }
  }
}
```

L'onda è disegnata come cerchio espandente che svanisce:

```javascript
function drawShockwave(cameraX) {
  const { x, y, age, maxAge, radius } = game.shockwave;
  const progress = age / maxAge;
  const r = radius * progress;
  const alpha = 1 - progress;
  ctx.strokeStyle = `rgba(50, 180, 234, ${alpha * 0.8})`;
  ctx.lineWidth = 6 * (1 - progress * 0.6);
  ctx.arc(x - cameraX, y, r, 0, Math.PI * 2);
  ctx.stroke();
}
```

I nemici storditi mostrano stelle ✦ rotanti sopra la testa.

### HUD Abilità

In basso a destra è presente un pannello HUD (168×96 px) con:
- Nome dell'abilità attiva nel colore del personaggio corrente
- Barra del cooldown (verde quando pronta, blu/grigia durante il raffreddamento)
- Hint testuale

---

## Riferimento Completo dei Controlli

### Tastiera

| Tasto | Funzione |
|-------|---------|
| `←` / `A` | Cammina a sinistra |
| `→` / `D` | Cammina a destra |
| `↑` / `W` / `Spazio` | Salta |
| `Shift` | Corri |
| `F` / `K` | Attiva abilità speciale |
| `E` / `Tab` | Prossimo personaggio |
| `Q` | Personaggio precedente |
| `Esc` / `P` | Pausa / Riprendi |
| `Enter` | Conferma selezione nei menu |

### Touch (dispositivi mobili)

La barra dei controlli appare solo su dispositivi con `pointer: coarse`:

| Pulsante | Funzione |
|---------|---------|
| `◀` | Cammina a sinistra |
| `▶` | Cammina a destra |
| `▲ SALTA` | Salta |
| `★` | Abilità speciale |
| `⚡` | Corri |
| `⇄` | Cambia personaggio |
| `⏸` | Pausa |
| `↺` | Ricomincia (visibile solo in Game Over) |

---

## Server e Persistenza dei Dati

### Stack

- **Node.js** + **Express 4**
- **better-sqlite3** (o `sqlite3` nel package legacy) per la persistenza

### Avvio

```bash
cd project
npm install
node server.js
# → http://localhost:3000
```

### API REST

| Metodo | Endpoint | Descrizione |
|--------|---------|-------------|
| `GET` | `/api/terrain` | Legge dati terreno da SQLite (null se assente) |
| `POST` | `/api/terrain` | Salva/aggiorna dati terreno (upsert id=1) |
| `DELETE` | `/api/terrain` | Cancella dati terreno (torna ai default) |
| `GET` | `/api/sprites` | Legge overrides sprite da SQLite |
| `POST` | `/api/sprites` | Salva/aggiorna overrides sprite |

### Schema SQLite

```sql
CREATE TABLE terrain (
  id         INTEGER PRIMARY KEY CHECK (id = 1),
  data       TEXT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sprites (
  id         INTEGER PRIMARY KEY CHECK (id = 1),
  data       TEXT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

Entrambe le tabelle usano il pattern "singleton" (`id = 1`), così c'è sempre al massimo un record.

### Strategia di fallback

```
Server disponibile?
  Sì → legge/scrive da SQLite via API REST
  No → legge/scrive da localStorage del browser
```

Il client controlla la risposta del server e, in caso di errore di rete, cade silenziosamente su localStorage.

---

## Architettura Tecnica

### Loop di gioco (`main.js`)

```
requestAnimationFrame
  └── gameLoop(timestamp)
        ├── calcola dt (delta time, max 0.1 s)
        ├── switch(game.screen)
        │     ├── TITLE_SCREEN    → updateTitleScreen()
        │     ├── CHARACTER_SELECT → updateCharacterSelect()
        │     ├── PLAYING         → updateGame(dt)
        │     ├── PAUSED          → (solo input)
        │     ├── GAMEOVER        → (solo input)
        │     └── WIN             → updateWin(dt)
        └── draw()
              ├── drawBackground()
              ├── drawWorld()   → terrain + collectibles + enemies + shockwave + party
              └── drawHUD()     → vite, energia, timer, score, abilità
```

### Fisica del personaggio

- **Grounded**: accelerazione `PLAYER_WALK_ACCEL` (1200) / `PLAYER_RUN_ACCEL` (1900), drag `PLAYER_DRAG` (0.86)
- **In aria**: `AIR_ACCEL` (1500), `AIR_DRAG` (0.985), gravità `GRAVITY` (4200)
- **Coyote time**: 0.08 s (si può ancora saltare poco dopo aver lasciato il bordo)
- **Jump buffer**: 0.12 s (il salto viene registrato anche se premuto leggermente prima di toccare terra)

### Terreno

Il profilo del terreno è una spline lineare a tratti (`terrainProfiles`) con punti di controllo `{x, y}` in coordinate sorgente (1536 px). Al momento del rendering viene scalato con `LEVEL_SCALE = LEVEL_BAND_HEIGHT / sourceSectionHeight`.

La solidità del terreno (se il personaggio può attraversarlo) è definita da `solidSpans`: array di `{from, to}` in coordinate x sorgente.

### Sprite e animazioni

Ogni personaggio ha sprite separati per direzione e frame di animazione. La funzione `loadImage(path)` restituisce una Promise; tutti gli sprite vengono caricati all'avvio in parallelo. Il sistema di override intercetta `loadImage()` sostituendo il `src` con il data URL dall'override se presente.

L'animazione seleziona il frame in base a `game.walkPhase` (incrementato proporzionalmente alla velocità orizzontale) e allo stato del personaggio (`idle`, `walk`, `jump`).
