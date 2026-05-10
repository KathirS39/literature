import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import socket from '../socket';

export default function Landing() {
  const navigate = useNavigate();
  const [createName, setCreateName] = useState('');
  const [joinName, setJoinName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const onCreated = ({ code }: { code: string }) => navigate(`/lobby/${code}`);
    const onJoined = ({ code }: { code: string }) => navigate(`/lobby/${code}`);
    const onError = ({ message }: { message: string }) => setError(message);

    socket.on('room-created', onCreated);
    socket.on('room-joined', onJoined);
    socket.on('error', onError);
    return () => {
      socket.off('room-created', onCreated);
      socket.off('room-joined', onJoined);
      socket.off('error', onError);
    };
  }, [navigate]);

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!createName.trim()) return setError('Enter your name');
    socket.emit('create-room', { name: createName.trim() });
  }

  function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!joinName.trim()) return setError('Enter your name');
    if (!joinCode.trim()) return setError('Enter a room code');
    socket.emit('join-room', { code: joinCode.trim().toUpperCase(), name: joinName.trim() });
  }

  return (
    <div className="landing">
      <div className="landing-header">
        <h1>Literature</h1>
        <p className="tagline">The card game for 6 players</p>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="landing-cards">
        <div className="landing-card">
          <h2>Create Room</h2>
          <p>Start a new game and invite 5 friends</p>
          <form onSubmit={handleCreate}>
            <input
              placeholder="Your name"
              value={createName}
              onChange={e => setCreateName(e.target.value)}
              maxLength={20}
              autoFocus
            />
            <button type="submit" className="btn-primary">Create Room</button>
          </form>
        </div>

        <div className="landing-divider">or</div>

        <div className="landing-card">
          <h2>Join Room</h2>
          <p>Enter a code shared by a friend</p>
          <form onSubmit={handleJoin}>
            <input
              placeholder="Your name"
              value={joinName}
              onChange={e => setJoinName(e.target.value)}
              maxLength={20}
            />
            <input
              placeholder="Room code (e.g. AB12CD)"
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
              maxLength={6}
            />
            <button type="submit" className="btn-primary">Join Room</button>
          </form>
        </div>
      </div>
    </div>
  );
}
