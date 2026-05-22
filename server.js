const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const DATA_DIR  = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'history.json');

app.use(express.json());
app.use(express.static(__dirname));

if (!fs.existsSync(DATA_DIR))  fs.mkdirSync(DATA_DIR);
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '[]');

app.get('/api/history', (req, res) => {
  try {
    res.json(JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')));
  } catch (e) {
    res.json([]);
  }
});

app.post('/api/history', (req, res) => {
  try {
    const history = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    history.push(req.body);
    fs.writeFileSync(DATA_FILE, JSON.stringify(history, null, 2));
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Dartslive scorer running at http://localhost:${PORT}`);
  console.log(`Network access: http://192.168.1.199:${PORT}`);
});
