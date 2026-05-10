import { useEffect, useRef } from 'react';

export default function GameLog({ log }: { log: string[] }) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [log]);

  return (
    <div className="game-log">
      <h3>Game Log</h3>
      <div className="log-scroll">
        {log.map((entry, i) => (
          <div key={i} className="log-line">{entry}</div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
