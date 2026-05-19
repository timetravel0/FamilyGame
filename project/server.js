const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'game-data.db');

// Middleware
app.use(express.json());
app.use(express.static(__dirname));

// Initialize SQLite database
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database');
    // Create terrain table if not exists
    db.run(`
      CREATE TABLE IF NOT EXISTS terrain (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        data TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) {
        console.error('Error creating table:', err.message);
      } else {
        console.log('Terrain table ready');
      }
    });
  }
});

// API: Get terrain data (priority: SQLite → LocalStorage fallback handled by client)
app.get('/api/terrain', (req, res) => {
  db.get('SELECT data FROM terrain WHERE id = 1', [], (err, row) => {
    if (err) {
      console.error('Error reading terrain:', err.message);
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (row) {
      try {
        const terrainData = JSON.parse(row.data);
        res.json(terrainData);
      } catch (parseError) {
        console.error('Error parsing terrain data:', parseError);
        res.status(500).json({ error: 'Invalid terrain data' });
      }
    } else {
      // No terrain data in SQLite
      res.json(null);
    }
  });
});

// API: Save terrain data to SQLite
app.post('/api/terrain', (req, res) => {
  const terrainData = req.body;
  
  if (!terrainData || typeof terrainData !== 'object') {
    return res.status(400).json({ error: 'Invalid terrain data' });
  }

  const jsonData = JSON.stringify(terrainData);

  // Upsert terrain data (id = 1)
  db.run(
    `INSERT INTO terrain (id, data, updated_at) 
     VALUES (1, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(id) DO UPDATE SET data = ?, updated_at = CURRENT_TIMESTAMP`,
    [jsonData, jsonData],
    function(err) {
      if (err) {
        console.error('Error saving terrain:', err.message);
        return res.status(500).json({ error: 'Failed to save terrain' });
      }
      
      console.log('Terrain saved to SQLite');
      res.json({ success: true, timestamp: new Date().toISOString() });
    }
  );
});

// API: Delete terrain data from SQLite
app.delete('/api/terrain', (req, res) => {
  db.run('DELETE FROM terrain WHERE id = 1', [], function(err) {
    if (err) {
      console.error('Error deleting terrain:', err.message);
      return res.status(500).json({ error: 'Failed to delete terrain' });
    }
    
    console.log('Terrain deleted from SQLite');
    res.json({ success: true });
  });
});

// Serve index.html for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🎮 Family Game Server running on http://localhost:${PORT}`);
  console.log(`📊 SQLite database: ${DB_PATH}\n`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err.message);
    }
    console.log('Database connection closed');
    process.exit(0);
  });
});
