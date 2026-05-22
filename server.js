'use strict';

const express    = require('express');
const https      = require('https');
const http       = require('http');
const fs         = require('fs');
const path       = require('path');
const os         = require('os');
const { execFileSync } = require('child_process');

const app        = express();
const PORT       = 3180;
const DATA_DIR   = path.join(__dirname, 'data');
const DATA_FILE  = path.join(DATA_DIR, 'history.json');
const CERT_DIR   = path.join(__dirname, 'certs');
const CERT_FILE  = path.join(CERT_DIR, 'cert.pem');
const KEY_FILE   = path.join(CERT_DIR, 'key.pem');

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

// ---------------------------------------------------------------------------
// Self-signed certificate — generated once, stored in certs/
// Includes the machine's LAN IP in the SAN so Chrome accepts it.
// ---------------------------------------------------------------------------
function getLanIP() {
  for (const nets of Object.values(os.networkInterfaces())) {
    for (const net of nets) {
      if (net.family === 'IPv4' && !net.internal) return net.address;
    }
  }
  return '127.0.0.1';
}

function generateCert(ip) {
  if (!fs.existsSync(CERT_DIR)) fs.mkdirSync(CERT_DIR);
  execFileSync('openssl', [
    'req', '-x509', '-newkey', 'rsa:2048', '-sha256',
    '-days', '3650', '-nodes',
    '-keyout', KEY_FILE,
    '-out',    CERT_FILE,
    '-subj',   '/CN=dartslive-scorer',
    '-addext', `subjectAltName=IP:${ip},IP:127.0.0.1,DNS:localhost`,
  ]);
  console.log(`Certificate generated for IP: ${ip}`);
}

const lanIP = getLanIP();

if (!fs.existsSync(CERT_FILE) || !fs.existsSync(KEY_FILE)) {
  generateCert(lanIP);
}

const httpsOptions = {
  key:  fs.readFileSync(KEY_FILE),
  cert: fs.readFileSync(CERT_FILE),
};

// HTTP on 3181 → redirect to HTTPS 3180 (handles stale bookmarks)
http.createServer((req, res) => {
  const host = (req.headers.host || '').replace(/:.*/, '');
  res.writeHead(301, { Location: `https://${host}:${PORT}${req.url}` });
  res.end();
}).listen(3181, '0.0.0.0');

https.createServer(httpsOptions, app).listen(PORT, '0.0.0.0', () => {
  console.log(`Dartslive scorer running at https://localhost:${PORT}`);
  console.log(`Network access:             https://${lanIP}:${PORT}`);
  console.log(`\nFirst visit: click Advanced → Proceed to accept the self-signed certificate.`);
  console.log(`Old http:// bookmarks on port 3181 will redirect automatically.\n`);
});
