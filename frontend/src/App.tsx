import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import socket from './socket';
import { getPersistentId, getSavedRoomCode, clearRoomCode } from './session';
import Landing from './pages/Landing';
import Lobby from './pages/Lobby';
import Game from './pages/Game';
import './App.css';

function RejoinHandler() {
  const navigate = useNavigate();

  useEffect(() => {
    function tryRejoin() {
      const roomCode = getSavedRoomCode();
      if (!roomCode) return;
      socket.emit('rejoin-room', { persistentId: getPersistentId(), roomCode });
    }

    const onRejoined = ({ code, status }: { code: string; status: string }) => {
      if (status === 'playing') navigate(`/game/${code}`);
      else navigate(`/lobby/${code}`);
    };

    const onRejoinFailed = () => {
      clearRoomCode();
    };

    socket.on('room-rejoined', onRejoined);
    socket.on('rejoin-failed', onRejoinFailed);
    socket.on('connect', tryRejoin);

    // Try immediately if already connected
    if (socket.connected) tryRejoin();

    return () => {
      socket.off('room-rejoined', onRejoined);
      socket.off('rejoin-failed', onRejoinFailed);
      socket.off('connect', tryRejoin);
    };
  }, [navigate]);

  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <RejoinHandler />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/lobby/:code" element={<Lobby />} />
        <Route path="/game/:code" element={<Game />} />
      </Routes>
    </BrowserRouter>
  );
}
