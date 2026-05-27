'use strict';

// Run this on the server PC to manually add games to the history:
//   node add-game.js

const fs   = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'data', 'history.json');

const records = [
  {
    ts:        Date.now(),
    players:   ['Dan', 'Albie'],
    winner:    'Dan',
    fieldSize: 2,
  },
  {
    ts:        Date.now() + 1,
    players:   ['Albie', 'Dan', 'Edwards'],
    winner:    'Albie',
    fieldSize: 3,
  },
];

let history = [];
try { history = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch (e) {}

records.forEach(r => history.push(r));
fs.writeFileSync(DATA_FILE, JSON.stringify(history, null, 2));

records.forEach(r => console.log('Added:', JSON.stringify(r)));
console.log(`History now has ${history.length} record(s).`);
