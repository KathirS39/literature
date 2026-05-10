export interface Card {
  rank: string;
  suit: 'spades' | 'hearts' | 'diamonds' | 'clubs' | 'red' | 'black';
  halfSuit: string;
}

export interface Player {
  id: string;
  name: string;
  team: 'A' | 'B' | null;
  cardCount: number;
  hand?: Card[];
}

export interface PendingAsk {
  askerId: string;
  targetId: string;
}

export interface Room {
  id: string;
  hostId: string;
  status: 'lobby' | 'playing' | 'finished';
  currentTurn: string | null;
  pendingAsk: PendingAsk | null;
  scores: { A: number; B: number };
  declaredSets: Record<string, 'A' | 'B'>;
  gameLog: string[];
  players: Player[];
}

export const HALF_SUITS = [
  'low-spades', 'high-spades',
  'low-hearts', 'high-hearts',
  'low-diamonds', 'high-diamonds',
  'low-clubs', 'high-clubs',
  'eights',
] as const;

export type HalfSuit = (typeof HALF_SUITS)[number];

export const SUIT_SYMBOLS: Record<string, string> = {
  spades: '♠',
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  red: '★',
  black: '★',
};

export const HALF_SUIT_LABELS: Record<string, string> = {
  'low-spades': 'Low ♠',
  'high-spades': 'High ♠',
  'low-hearts': 'Low ♥',
  'high-hearts': 'High ♥',
  'low-diamonds': 'Low ♦',
  'high-diamonds': 'High ♦',
  'low-clubs': 'Low ♣',
  'high-clubs': 'High ♣',
  'eights': '8s & Jokers',
};

const LOW_RANKS = ['2', '3', '4', '5', '6', '7'];
const HIGH_RANKS = ['9', '10', 'J', 'Q', 'K', 'A'];

export function getCardsInHalfSuit(halfSuit: string): Card[] {
  if (halfSuit === 'eights') {
    const suits: Array<'spades' | 'hearts' | 'diamonds' | 'clubs'> = ['spades', 'hearts', 'diamonds', 'clubs'];
    return [
      ...suits.map(suit => ({ rank: '8', suit, halfSuit: 'eights' } satisfies Card)),
      { rank: 'JK', suit: 'red', halfSuit: 'eights' },
      { rank: 'JK', suit: 'black', halfSuit: 'eights' },
    ];
  }
  const dashIdx = halfSuit.indexOf('-');
  const level = halfSuit.slice(0, dashIdx) as 'low' | 'high';
  const suit = halfSuit.slice(dashIdx + 1) as 'spades' | 'hearts' | 'diamonds' | 'clubs';
  const ranks = level === 'low' ? LOW_RANKS : HIGH_RANKS;
  return ranks.map(rank => ({ rank, suit, halfSuit }));
}

export function isRedSuit(suit: string) {
  return suit === 'hearts' || suit === 'diamonds' || suit === 'red';
}
