'use strict';

// ---------------------------------------------------------------------------
// Game01 — 301 / 501 / 701 x01 game logic
// ---------------------------------------------------------------------------
class Game01 {
  constructor({ startScore, players, doubleIn = false, doubleOut = true }) {
    this._options = { startScore, players: players.slice(), doubleIn, doubleOut };
    this._snapshots = [];
    this._state = {
      startScore,
      doubleIn,
      doubleOut,
      players: players.map(name => ({
        name,
        score: startScore,
        hasStarted: !doubleIn,   // false only when doubleIn=true
      })),
      currentPlayerIndex: 0,
      currentTurn: { darts: [], dartCount: 0 },
      history: [],   // completed turns, newest first (max 9)
      winner: null,
      phase: 'playing',   // 'playing' | 'won'
    };
  }

  // ---- accessors ----
  get state() { return this._state; }
  get currentPlayerIndex() { return this._state.currentPlayerIndex; }
  get currentPlayer() { return this._state.players[this._state.currentPlayerIndex]; }
  get canUndo() { return this._snapshots.length > 0; }

  // ---- main throw ----
  throwDart(segment) {
    const s = this._state;
    if (s.phase === 'won') return { valid: false, bust: false, win: false, skipped: false };

    // Snapshot BEFORE any mutation
    this._snapshots.push(JSON.stringify(s));

    const player = s.players[s.currentPlayerIndex];
    const isDouble = segment.zone === 'double' || segment.zone === 'dbull';

    // --- doubleIn gate ---
    if (s.doubleIn && !player.hasStarted) {
      if (!isDouble) {
        // Dart thrown but scores nothing
        s.currentTurn.darts.push({ segment, counted: false, bust: false, win: false });
        s.currentTurn.dartCount++;
        if (s.currentTurn.dartCount >= 3) this._advanceTurn(false);
        return { valid: true, bust: false, win: false, skipped: true };
      }
      player.hasStarted = true;
    }

    // --- score calculation ---
    const newScore = player.score - segment.score;
    let bust = false;
    let win  = false;

    if (s.doubleOut) {
      if (newScore < 0 || newScore === 1 || (newScore === 0 && !isDouble)) {
        bust = true;
      } else if (newScore === 0 && isDouble) {
        win = true;
      }
    } else {
      if (newScore < 0) {
        bust = true;
      } else if (newScore === 0) {
        win = true;
      }
    }

    if (!bust) {
      player.score = newScore;
    }

    s.currentTurn.darts.push({ segment, counted: !bust, bust, win });
    s.currentTurn.dartCount++;

    if (win) {
      s.winner = s.currentPlayerIndex;
      s.phase  = 'won';
      this._advanceTurn(false);   // record the winning turn in history
      return { valid: true, bust: false, win: true, skipped: false };
    }

    if (bust) {
      this._advanceTurn(true);
      return { valid: true, bust: true, win: false, skipped: false };
    }

    if (s.currentTurn.dartCount >= 3) {
      this._advanceTurn(false);
    }

    return { valid: true, bust: false, win: false, skipped: false };
  }

  // ---- undo ----
  undo() {
    if (!this._snapshots.length) return false;
    this._state = JSON.parse(this._snapshots.pop());
    return true;
  }

  // ---- skip turn (only when at least one dart has been thrown this turn) ----
  skipTurn() {
    const s = this._state;
    if (s.phase === 'won') return false;
    if (s.currentTurn.dartCount > 0) {
      this._snapshots.push(JSON.stringify(s));
      this._advanceTurn(false);
      return true;
    }
    return false;
  }

  // ---- internal turn advance ----
  _advanceTurn(wasBust) {
    const s = this._state;
    const entry = {
      playerIndex: s.currentPlayerIndex,
      playerName:  s.players[s.currentPlayerIndex].name,
      darts:       s.currentTurn.darts.slice(),
      wasBust,
    };
    s.history.unshift(entry);
    if (s.history.length > 9) s.history.length = 9;

    if (s.phase !== 'won') {
      s.currentPlayerIndex = (s.currentPlayerIndex + 1) % s.players.length;
    }
    s.currentTurn = { darts: [], dartCount: 0 };
  }

  // ---- serialise / restore ----
  toJSON() {
    return {
      type: 'Game01',
      options: this._options,
      state: this._state,
      snapshots: this._snapshots,
    };
  }

  static restore(saved) {
    const g = new Game01(saved.options);
    g._state = saved.state;
    g._snapshots = saved.snapshots || [];
    return g;
  }
}


// ---------------------------------------------------------------------------
// GameCricket — Cricket game logic
// ---------------------------------------------------------------------------
const CRICKET_NUMBERS = [20, 19, 18, 17, 16, 15, 25];

class GameCricket {
  static get CRICKET_NUMBERS() { return CRICKET_NUMBERS; }

  constructor({ players }) {
    this._options = { players: players.slice() };
    this._snapshots = [];

    const emptyMarks = () => {
      const m = {};
      CRICKET_NUMBERS.forEach(n => { m[n] = 0; });
      return m;
    };

    this._state = {
      players: players.map(name => ({
        name,
        marks: emptyMarks(),
        score: 0,
      })),
      currentPlayerIndex: 0,
      currentTurn: { darts: [], dartCount: 0 },
      history: [],
      totalTurns: 0,
      winner: null,
      phase: 'playing',
    };
  }

  // ---- accessors ----
  get state() { return this._state; }
  get currentPlayerIndex() { return this._state.currentPlayerIndex; }
  get currentPlayer() { return this._state.players[this._state.currentPlayerIndex]; }
  get canUndo() { return this._snapshots.length > 0; }

  // ---- main throw ----
  throwDart(segment) {
    const s = this._state;
    if (s.phase === 'won') return { valid: false, number: null, pointsScored: 0, win: false };

    // Snapshot BEFORE any mutation
    this._snapshots.push(JSON.stringify(s));

    const pi = s.currentPlayerIndex;
    const player = s.players[pi];

    // Normalise bull zones to 25
    let n = segment.number;
    if (segment.zone === 'bull' || segment.zone === 'dbull') n = 25;

    const isCricketNumber = CRICKET_NUMBERS.includes(n);
    let pointsScored = 0;

    if (isCricketNumber) {
      const prevMarks = player.marks[n];
      player.marks[n] += segment.multiplier;
      const newMarks   = player.marks[n];

      // Only score the marks that cross above the 3-mark threshold
      const marksOver3Before = Math.max(0, prevMarks - 3);
      const marksOver3After  = Math.max(0, newMarks  - 3);
      const scoringMarks     = marksOver3After - marksOver3Before;

      // Only score if number is still open for at least one opponent
      const opponentOpen = s.players.some((p, i) => i !== pi && p.marks[n] < 3);
      if (opponentOpen && scoringMarks > 0) {
        pointsScored = scoringMarks * n;
        player.score += pointsScored;
      }
    }

    s.currentTurn.darts.push({ segment, number: isCricketNumber ? n : null, pointsScored });
    s.currentTurn.dartCount++;

    const win = this._checkWinner();
    if (win) {
      s.winner = s.currentPlayerIndex;
      s.phase  = 'won';
      this._advanceTurn(false);
      return { valid: true, number: isCricketNumber ? n : null, pointsScored, win: true };
    }

    if (s.currentTurn.dartCount >= 3) {
      this._advanceTurn(false);
    }

    return { valid: true, number: isCricketNumber ? n : null, pointsScored, win: false };
  }

  // ---- undo ----
  undo() {
    if (!this._snapshots.length) return false;
    this._state = JSON.parse(this._snapshots.pop());
    return true;
  }

  // ---- skip turn ----
  skipTurn() {
    const s = this._state;
    if (s.phase === 'won') return false;
    if (s.currentTurn.dartCount > 0) {
      this._snapshots.push(JSON.stringify(s));
      this._advanceTurn(false);
      return true;
    }
    return false;
  }

  // ---- internal ----
  _advanceTurn(wasBust) {
    const s = this._state;
    const entry = {
      playerIndex: s.currentPlayerIndex,
      playerName:  s.players[s.currentPlayerIndex].name,
      darts:       s.currentTurn.darts.slice(),
      wasBust,
    };
    s.history.unshift(entry);
    if (s.history.length > 9) s.history.length = 9;
    s.totalTurns = (s.totalTurns || 0) + 1;

    if (s.phase !== 'won') {
      s.currentPlayerIndex = (s.currentPlayerIndex + 1) % s.players.length;
    }
    s.currentTurn = { darts: [], dartCount: 0 };
  }

  _checkWinner() {
    const s  = this._state;
    const pi = s.currentPlayerIndex;
    const player = s.players[pi];

    // All cricket numbers must be closed by this player
    const allClosed = CRICKET_NUMBERS.every(n => player.marks[n] >= 3);
    if (!allClosed) return false;

    // Score must be >= every opponent's score
    const topOpponent = s.players
      .filter((_, i) => i !== pi)
      .reduce((max, p) => Math.max(max, p.score), 0);
    return player.score >= topOpponent;
  }

  isClosedGlobally(number) {
    return this._state.players.every(p => p.marks[number] >= 3);
  }

  // ---- serialise / restore ----
  toJSON() {
    return {
      type: 'GameCricket',
      options: this._options,
      state: this._state,
      snapshots: this._snapshots,
    };
  }

  static restore(saved) {
    const g = new GameCricket(saved.options);
    g._state = saved.state;
    g._snapshots = saved.snapshots || [];
    return g;
  }

  // ---- display helpers ----
  static marksDisplay(count) {
    if (count <= 0) return '';
    if (count === 1) return '/';
    if (count === 2) return 'X';
    return '⊗';   // 3+
  }
}


// ---------------------------------------------------------------------------
// GameCutthroatCricket — Cutthroat Cricket variant
// Same marks/closing rules but scoring goes AGAINST opponents instead of for self.
// Win condition: all numbers closed AND lowest score.
// ---------------------------------------------------------------------------
class GameCutthroatCricket extends GameCricket {
  constructor({ players }) {
    super({ players });
  }

  throwDart(segment) {
    const s = this._state;
    if (s.phase === 'won') return { valid: false, number: null, pointsScored: 0, win: false };

    this._snapshots.push(JSON.stringify(s));

    const pi = s.currentPlayerIndex;
    const player = s.players[pi];

    let n = segment.number;
    if (segment.zone === 'bull' || segment.zone === 'dbull') n = 25;

    const isCricketNumber = CRICKET_NUMBERS.includes(n);
    let pointsScored = 0;

    if (isCricketNumber) {
      const prevMarks = player.marks[n];
      player.marks[n] += segment.multiplier;
      const newMarks = player.marks[n];

      const marksOver3Before = Math.max(0, prevMarks - 3);
      const marksOver3After  = Math.max(0, newMarks  - 3);
      const scoringMarks     = marksOver3After - marksOver3Before;

      // Add points to each opponent who hasn't closed this number
      if (scoringMarks > 0) {
        const pts = scoringMarks * n;
        const openOpponents = s.players.filter((p, i) => i !== pi && p.marks[n] < 3);
        if (openOpponents.length > 0) {
          openOpponents.forEach(opp => { opp.score += pts; });
          pointsScored = pts;
        }
      }
    }

    s.currentTurn.darts.push({ segment, number: isCricketNumber ? n : null, pointsScored });
    s.currentTurn.dartCount++;

    const win = this._checkWinner();
    if (win) {
      s.winner = s.currentPlayerIndex;
      s.phase  = 'won';
      this._advanceTurn(false);
      return { valid: true, number: isCricketNumber ? n : null, pointsScored, win: true };
    }

    if (s.currentTurn.dartCount >= 3) {
      this._advanceTurn(false);
    }

    return { valid: true, number: isCricketNumber ? n : null, pointsScored, win: false };
  }

  _checkWinner() {
    const s  = this._state;
    const pi = s.currentPlayerIndex;
    const player = s.players[pi];

    const allClosed = CRICKET_NUMBERS.every(n => player.marks[n] >= 3);
    if (!allClosed) return false;

    // Win when all numbers closed AND this player has the lowest (or tied) score
    const myScore = player.score;
    return s.players.every(p => p === player || p.score >= myScore);
  }

  toJSON() {
    return {
      type: 'GameCutthroatCricket',
      options: this._options,
      state: this._state,
      snapshots: this._snapshots,
    };
  }

  static restore(saved) {
    const g = new GameCutthroatCricket(saved.options);
    g._state = saved.state;
    g._snapshots = saved.snapshots || [];
    return g;
  }
}
