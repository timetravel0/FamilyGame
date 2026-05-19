# Family Game Server

Node.js server with SQLite persistence for Family Game terrain data.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
npm start
```

Or for development with auto-reload:
```bash
npm run dev
```

3. Open browser to: `http://localhost:3000`

## Features

- **SQLite Persistence**: Terrain data is saved to `game-data.db`
- **Priority Loading**: SQLite → LocalStorage → terrain.json
- **Dual Save**: Saves to both SQLite and LocalStorage for redundancy
- **REST API**: Full CRUD operations for terrain data

## API Endpoints

### Get Terrain
```
GET /api/terrain
```
Returns terrain data from SQLite database.

### Save Terrain
```
POST /api/terrain
Content-Type: application/json

{
  "terrainProfiles": [...],
  "solidSpans": [...]
}
```
Saves terrain data to SQLite database.

### Delete Terrain
```
DELETE /api/terrain
```
Removes terrain data from SQLite database.

## Data Flow

### Loading Terrain (Priority Order)
1. **SQLite Database** - Primary source
2. **LocalStorage** - Browser cache fallback
3. **assets/terrain.json** - Default terrain file

### Saving Terrain
1. **SQLite Database** - Always saved first
2. **LocalStorage** - Saved as backup

## Database Schema

```sql
CREATE TABLE terrain (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  data TEXT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

## Files

- `server.js` - Express server with SQLite
- `package.json` - Node.js dependencies
- `game-data.db` - SQLite database (auto-created, gitignored)

## Technology Stack

- **Node.js** - Runtime environment
- **Express** - Web framework
- **SQLite3** - Database engine
- **Better-SQLite3** - Synchronous SQLite bindings
