'use strict';

// Run this on the server PC to remove all games involving a player from the history:
//   node remove-player.js "Canfield"

const fs   = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'data', 'history.json');

const target = process.argv[2];
if (!target) {
  console.error('Usage: node remove-player.js "<player name>"');
  process.exit(1);
}

let history = [];
try { history = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch (e) {}

const before = history.length;
history = history.filter(record => !record.players.includes(target));
const removed = before - history.length;

fs.writeFileSync(DATA_FILE, JSON.stringify(history, null, 2));

console.log(`Removed ${removed} game(s) involving "${target}".`);
console.log(`History now has ${history.length} record(s).`);
