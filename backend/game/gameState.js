const { buildDeck, deal } = require('./deck');
const { canAsk, validateDeclaration } = require('./rules');

const HALF_SUITS = [
  'low-spades', 'high-spades',
  'low-hearts', 'high-hearts',
  'low-diamonds', 'high-diamonds',
  'low-clubs', 'high-clubs',
  'eights',
];

const SUIT_SYMBOLS = { spades: '♠', hearts: '♥', diamonds: '♦', clubs: '♣', red: '(Red)', black: '(Black)' };
const HALF_SUIT_LABELS = {
  'low-spades': 'Low ♠', 'high-spades': 'High ♠',
  'low-hearts': 'Low ♥', 'high-hearts': 'High ♥',
  'low-diamonds': 'Low ♦', 'high-diamonds': 'High ♦',
  'low-clubs': 'Low ♣', 'high-clubs': 'High ♣',
  'eights': '8s & Jokers',
};

function generateCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

class Room {
  constructor(hostId, hostName) {
    this.id = generateCode();
    this.hostId = hostId;
    this.players = [{ id: hostId, name: hostName, team: null, hand: [], cardCount: 0 }];
    this.status = 'lobby';
    this.currentTurn = null;
    this.scores = { A: 0, B: 0 };
    this.declaredSets = {};
    this.gameLog = [];
  }

  addPlayer(id, name) {
    if (this.players.length >= 6) return { error: 'Room is full' };
    if (this.status !== 'lobby') return { error: 'Game already in progress' };
    if (this.players.find(p => p.name === name)) return { error: 'That name is already taken' };
    this.players.push({ id, name, team: null, hand: [], cardCount: 0 });
    return { ok: true };
  }

  removePlayer(id) {
    this.players = this.players.filter(p => p.id !== id);
  }

  assignTeam(playerId, team) {
    const player = this.players.find(p => p.id === playerId);
    if (!player) return { error: 'Player not found' };
    player.team = team;
    return { ok: true };
  }

  startGame() {
    if (this.players.length !== 6) return { error: 'Need exactly 6 players to start' };
    if (this.players.some(p => !p.team)) return { error: 'All players must be assigned a team' };
    const teamA = this.players.filter(p => p.team === 'A');
    const teamB = this.players.filter(p => p.team === 'B');
    if (teamA.length !== 3 || teamB.length !== 3) return { error: 'Each team must have exactly 3 players' };

    const hands = deal(buildDeck(), 6);
    this.players.forEach((p, i) => {
      p.hand = hands[i];
      p.cardCount = 9;
    });
    this.status = 'playing';
    this.currentTurn = this.players[0].id;
    this.gameLog.push('Cards dealt — game started!');
    return { ok: true };
  }

  processAsk(askerId, targetId, card) {
    if (this.currentTurn !== askerId) return { error: 'Not your turn' };
    const asker = this.players.find(p => p.id === askerId);
    const target = this.players.find(p => p.id === targetId);
    if (!asker || !target) return { error: 'Player not found' };
    if (asker.cardCount === 0) return { error: 'You have no cards and cannot ask' };

    const check = canAsk(asker, target, card);
    if (!check.ok) return { error: check.reason };

    const targetHasCard = target.hand.some(c => c.rank === card.rank && c.suit === card.suit);
    const symbol = `${card.rank}${SUIT_SYMBOLS[card.suit]}`;

    if (targetHasCard) {
      target.hand = target.hand.filter(c => !(c.rank === card.rank && c.suit === card.suit));
      target.cardCount = target.hand.length;
      asker.hand.push(card);
      asker.cardCount = asker.hand.length;
      this.gameLog.push(`${asker.name} asked ${target.name} for ${symbol} — Got it!`);
      return { hit: true };
    } else {
      this.gameLog.push(`${asker.name} asked ${target.name} for ${symbol} — Miss!`);
      this.currentTurn = targetId;
      return { hit: false };
    }
  }

  processDeclaration(declarerId, halfSuit, mapping) {
    if (this.currentTurn !== declarerId) return { error: 'Not your turn' };
    if (this.declaredSets[halfSuit]) return { error: 'That set has already been claimed' };

    const declarer = this.players.find(p => p.id === declarerId);
    if (!declarer) return { error: 'Player not found' };

    const correct = validateDeclaration(halfSuit, mapping, this.players);
    const winningTeam = correct ? declarer.team : (declarer.team === 'A' ? 'B' : 'A');

    this.declaredSets[halfSuit] = winningTeam;
    this.scores[winningTeam]++;

    const label = HALF_SUIT_LABELS[halfSuit];
    if (correct) {
      this.gameLog.push(`${declarer.name} correctly declared ${label}! Team ${winningTeam} scores.`);
    } else {
      this.gameLog.push(`${declarer.name} declared ${label} incorrectly. Team ${winningTeam} gets the point.`);
    }

    if (Object.keys(this.declaredSets).length === 9) {
      this.status = 'finished';
      if (this.scores.A > this.scores.B) {
        this.gameLog.push(`Game over! Team A wins ${this.scores.A}–${this.scores.B}!`);
      } else if (this.scores.B > this.scores.A) {
        this.gameLog.push(`Game over! Team B wins ${this.scores.B}–${this.scores.A}!`);
      } else {
        this.gameLog.push(`Game over! It's a tie ${this.scores.A}–${this.scores.B}!`);
      }
    }

    return { ok: true, correct, winningTeam };
  }

  passTurn(playerId) {
    if (this.currentTurn !== playerId) return { error: 'Not your turn' };
    const player = this.players.find(p => p.id === playerId);
    if (!player) return { error: 'Player not found' };
    if (player.cardCount > 0) return { error: 'You can only pass when you have no cards' };

    this.gameLog.push(`${player.name} passed (no cards).`);
    const idx = this.players.findIndex(p => p.id === playerId);
    this.currentTurn = this.players[(idx + 1) % this.players.length].id;
    return { ok: true };
  }

  toClientState(forPlayerId) {
    return {
      id: this.id,
      hostId: this.hostId,
      status: this.status,
      currentTurn: this.currentTurn,
      scores: this.scores,
      declaredSets: this.declaredSets,
      gameLog: this.gameLog,
      players: this.players.map(p => ({
        id: p.id,
        name: p.name,
        team: p.team,
        cardCount: p.cardCount,
        hand: p.id === forPlayerId ? p.hand : undefined,
      })),
    };
  }
}

module.exports = { Room, HALF_SUITS };
