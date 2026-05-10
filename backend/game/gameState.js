const { buildDeck, deal } = require('./deck');
const { validateDeclaration } = require('./rules');

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
  constructor(hostId, hostName, hostPersistentId) {
    this.id = generateCode();
    this.hostId = hostId;
    this.hostPersistentId = hostPersistentId;
    this.players = [{ id: hostId, persistentId: hostPersistentId, name: hostName, team: null, hand: [], cardCount: 0 }];
    this.status = 'lobby';
    this.currentTurn = null;
    this.pendingAsk = null;        // { askerId, targetId } while waiting for response
    this.pendingTurnChoice = null; // { team: 'A'|'B' } — that team picks who goes next
    this.scores = { A: 0, B: 0 };
    this.declaredSets = {};
    this.gameLog = [];
  }

  addPlayer(id, name, persistentId) {
    if (this.players.length >= 6) return { error: 'Room is full' };
    if (this.status !== 'lobby') return { error: 'Game already in progress' };
    if (this.players.find(p => p.name === name)) return { error: 'That name is already taken' };
    this.players.push({ id, persistentId, name, team: null, hand: [], cardCount: 0 });
    return { ok: true };
  }

  rejoinPlayer(persistentId, newSocketId) {
    const player = this.players.find(p => p.persistentId === persistentId);
    if (!player) return { error: 'You are not in this room' };

    const oldId = player.id;
    player.id = newSocketId;

    // Keep host and turn references in sync
    if (this.hostPersistentId === persistentId) this.hostId = newSocketId;
    if (this.currentTurn === oldId) this.currentTurn = newSocketId;
    if (this.pendingAsk?.askerId === oldId) this.pendingAsk.askerId = newSocketId;
    if (this.pendingAsk?.targetId === oldId) this.pendingAsk.targetId = newSocketId;

    return { ok: true, status: this.status };
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
    this.gameLog.push('Cards dealt — game started! Verbally ask your opponents for cards.');
    return { ok: true };
  }

  // Step 1: active player picks who they are verbally asking
  initiateAsk(askerId, targetId) {
    if (this.currentTurn !== askerId) return { error: 'Not your turn' };
    if (this.pendingAsk) return { error: 'Already waiting for a response' };
    const asker = this.players.find(p => p.id === askerId);
    const target = this.players.find(p => p.id === targetId);
    if (!asker || !target) return { error: 'Player not found' };
    if (asker.team === target.team) return { error: 'Cannot ask a teammate' };
    if (asker.cardCount === 0) return { error: 'You have no cards and cannot ask' };

    this.pendingAsk = { askerId, targetId };
    this.gameLog.push(`${asker.name} is asking ${target.name} for a card...`);
    return { ok: true };
  }

  // Step 2a: target player clicks a card to give it
  respondCard(responderId, card) {
    if (!this.pendingAsk) return { error: 'No pending ask' };
    if (this.pendingAsk.targetId !== responderId) return { error: 'You are not the one being asked' };

    const asker = this.players.find(p => p.id === this.pendingAsk.askerId);
    const target = this.players.find(p => p.id === responderId);
    if (!asker || !target) return { error: 'Player not found' };

    const hasCard = target.hand.some(c => c.rank === card.rank && c.suit === card.suit);
    if (!hasCard) return { error: "You don't have that card" };

    target.hand = target.hand.filter(c => !(c.rank === card.rank && c.suit === card.suit));
    target.cardCount = target.hand.length;
    asker.hand.push(card);
    asker.cardCount = asker.hand.length;

    const symbol = `${card.rank}${SUIT_SYMBOLS[card.suit]}`;
    this.gameLog.push(`${target.name} gave ${symbol} to ${asker.name}!`);
    this.pendingAsk = null;
    return { ok: true };
  }

  // Step 2b: target player clicks "No" — they don't have it
  denyAsk(responderId) {
    if (!this.pendingAsk) return { error: 'No pending ask' };
    if (this.pendingAsk.targetId !== responderId) return { error: 'You are not the one being asked' };

    const asker = this.players.find(p => p.id === this.pendingAsk.askerId);
    const target = this.players.find(p => p.id === responderId);

    this.gameLog.push(`${target.name} said No to ${asker.name} — Miss! ${target.name}'s turn.`);
    this.currentTurn = responderId;
    this.pendingAsk = null;
    return { ok: true };
  }

  // Override: any player sends any card from their hand to any other player, no turn effect
  transferCard(fromId, toId, card) {
    if (this.status !== 'playing') return { error: 'Game is not in progress' };
    const from = this.players.find(p => p.id === fromId);
    const to = this.players.find(p => p.id === toId);
    if (!from || !to) return { error: 'Player not found' };
    if (fromId === toId) return { error: 'Cannot send a card to yourself' };

    const hasCard = from.hand.some(c => c.rank === card.rank && c.suit === card.suit);
    if (!hasCard) return { error: "You don't have that card" };

    from.hand = from.hand.filter(c => !(c.rank === card.rank && c.suit === card.suit));
    from.cardCount = from.hand.length;
    to.hand.push(card);
    to.cardCount = to.hand.length;

    const symbol = `${card.rank}${SUIT_SYMBOLS[card.suit]}`;
    this.gameLog.push(`[Override] ${from.name} sent ${symbol} to ${to.name}.`);
    return { ok: true };
  }

  processDeclaration(declarerId, halfSuit, mapping) {
    if (this.currentTurn !== declarerId) return { error: 'Not your turn' };
    if (this.pendingAsk) return { error: 'Cannot declare while waiting for a response' };
    if (this.declaredSets[halfSuit]) return { error: 'That set has already been claimed' };

    const declarer = this.players.find(p => p.id === declarerId);
    if (!declarer) return { error: 'Player not found' };

    const holdsCard = declarer.hand.some(c => c.halfSuit === halfSuit);
    if (!holdsCard) return { error: 'You must hold at least one card from this set to declare it' };

    const correct = validateDeclaration(halfSuit, mapping, this.players);
    const winningTeam = correct ? declarer.team : (declarer.team === 'A' ? 'B' : 'A');

    this.declaredSets[halfSuit] = winningTeam;
    this.scores[winningTeam]++;

    const label = HALF_SUIT_LABELS[halfSuit];
    if (correct) {
      this.gameLog.push(`${declarer.name} correctly declared ${label}! Team ${winningTeam} scores.`);
    } else {
      this.gameLog.push(`${declarer.name} declared ${label} incorrectly. Team ${winningTeam} gets the point — Team ${winningTeam} picks who goes next.`);
    }

    // Remove all cards from the declared set from every player's hand
    for (const player of this.players) {
      player.hand = player.hand.filter(c => c.halfSuit !== halfSuit);
      player.cardCount = player.hand.length;
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
    } else if (!correct) {
      // Wrong declaration: opposing team picks who goes next
      this.currentTurn = null;
      this.pendingTurnChoice = { team: winningTeam };
    }

    return { ok: true, correct, winningTeam };
  }

  chooseTurn(chooserId, targetPlayerId) {
    if (!this.pendingTurnChoice) return { error: 'No turn choice pending' };
    const chooser = this.players.find(p => p.id === chooserId);
    if (!chooser) return { error: 'Player not found' };
    if (chooser.team !== this.pendingTurnChoice.team) return { error: 'Only the winning team can choose who goes next' };
    const target = this.players.find(p => p.id === targetPlayerId);
    if (!target) return { error: 'Target player not found' };
    if (target.team !== this.pendingTurnChoice.team) return { error: 'Must choose a player from your own team' };

    this.currentTurn = targetPlayerId;
    this.pendingTurnChoice = null;
    this.gameLog.push(`${target.name} will go next for Team ${target.team}.`);
    return { ok: true };
  }

  setTurn(hostId, targetPlayerId) {
    if (this.hostId !== hostId) return { error: 'Only the host can override the turn' };
    if (this.status !== 'playing') return { error: 'Game is not in progress' };
    const target = this.players.find(p => p.id === targetPlayerId);
    if (!target) return { error: 'Player not found' };
    this.currentTurn = targetPlayerId;
    this.pendingAsk = null;
    this.gameLog.push(`[Host] Turn set to ${target.name}.`);
    return { ok: true };
  }

  passTurn(playerId) {
    if (this.currentTurn !== playerId) return { error: 'Not your turn' };
    if (this.pendingAsk) return { error: 'Cannot pass while waiting for a response' };
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
      pendingAsk: this.pendingAsk,
      pendingTurnChoice: this.pendingTurnChoice,
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
