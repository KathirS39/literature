const RANKS_LOW = ['2', '3', '4', '5', '6', '7'];
const RANKS_HIGH = ['9', '10', 'J', 'Q', 'K', 'A'];
const SUITS = ['spades', 'hearts', 'diamonds', 'clubs'];

function buildDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS_LOW) {
      deck.push({ rank, suit, halfSuit: `low-${suit}` });
    }
    for (const rank of RANKS_HIGH) {
      deck.push({ rank, suit, halfSuit: `high-${suit}` });
    }
    deck.push({ rank: '8', suit, halfSuit: 'eights' });
  }
  // Red and Black Jokers complete the eights set
  deck.push({ rank: 'JK', suit: 'red', halfSuit: 'eights' });
  deck.push({ rank: 'JK', suit: 'black', halfSuit: 'eights' });
  return deck; // 54 cards: 6×8 half-suits + 6 eights
}

function shuffle(deck) {
  const d = [...deck];
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

function deal(deck, numPlayers) {
  const shuffled = shuffle(deck);
  const hands = Array.from({ length: numPlayers }, () => []);
  shuffled.forEach((card, i) => hands[i % numPlayers].push(card));
  return hands;
}

module.exports = { buildDeck, deal };
