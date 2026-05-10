function canAsk(asker, target, card) {
  if (asker.team === target.team) return { ok: false, reason: 'Cannot ask a teammate' };
  const holdsHalfSuit = asker.hand.some(c => c.halfSuit === card.halfSuit);
  if (!holdsHalfSuit) return { ok: false, reason: 'You must hold a card from that half-suit to ask for one' };
  const alreadyHolds = asker.hand.some(c => c.rank === card.rank && c.suit === card.suit);
  if (alreadyHolds) return { ok: false, reason: 'You already hold that card' };
  return { ok: true };
}

function validateDeclaration(halfSuit, mapping, players) {
  for (const [cardKey, playerId] of Object.entries(mapping)) {
    const [rank, ...suitParts] = cardKey.split('-');
    const suit = suitParts.join('-');
    const player = players.find(p => p.id === playerId);
    if (!player) return false;
    const hasCard = player.hand.some(c => c.rank === rank && c.suit === suit);
    if (!hasCard) return false;
  }
  return true;
}

module.exports = { canAsk, validateDeclaration };
