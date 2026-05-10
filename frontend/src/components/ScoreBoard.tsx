import { HALF_SUITS, HALF_SUIT_LABELS } from '../types';

interface Props {
  scores: { A: number; B: number };
  declaredSets: Record<string, 'A' | 'B'>;
}

export default function ScoreBoard({ scores, declaredSets }: Props) {
  return (
    <div className="scoreboard">
      <div className="score-tally">
        <span className="score-a">A: {scores.A}</span>
        <span className="score-sep">|</span>
        <span className="score-b">B: {scores.B}</span>
      </div>
      <div className="halfsuit-grid">
        {HALF_SUITS.map(hs => {
          const claimedBy = declaredSets[hs];
          return (
            <div
              key={hs}
              className={`halfsuit-cell ${claimedBy ? `claimed-${claimedBy.toLowerCase()}` : 'unclaimed'}`}
            >
              {HALF_SUIT_LABELS[hs]}
              {claimedBy && <span className="claim-tag">{claimedBy}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
