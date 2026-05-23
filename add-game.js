'use strict';

// Run this on the server PC to manually add a game to the history:
//   node add-game.js

const fs   = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'data', 'history.json');

const record = {
  ts:        Date.now(),
  players:   ['Albie', 'Dan', 'Edwards'],
  winner:    'Albie',
  fieldSize: 3,
};

let history = [];
try { history = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch (e) {}

history.push(record);
fs.writeFileSync(DATA_FILE, JSON.stringify(history, null, 2));

console.log('Added:', JSON.stringify(record, null, 2));
console.log(`History now has ${history.length} record(s).`);
