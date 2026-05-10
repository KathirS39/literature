const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { Room } = require('./game/gameState');
const { buildDeck } = require('./game/deck');

// Startup verification
const _deck = buildDeck();
console.log(`Deck: ${_deck.length} cards | Eights set: ${_deck.filter(c => c.halfSuit === 'eights').map(c => c.rank + '-' + c.suit).join(', ')}`);

const path = require('path');

const app = express();
const server = http.createServer(app);

const FRONTEND_DIST = path.join(__dirname, '../frontend/dist');
const isProd = process.env.NODE_ENV === 'production';

const io = new Server(server, {
  cors: isProd ? false : { origin: 'http://localhost:5173', methods: ['GET', 'POST'] },
});

if (isProd) {
  app.use(express.static(FRONTEND_DIST));
  app.get('/{*splat}', (_req, res) => res.sendFile(path.join(FRONTEND_DIST, 'index.html')));
}

const PORT = process.env.PORT || 3001;
const rooms = new Map();

function broadcastRoomUpdate(room) {
  for (const player of room.players) {
    const sock = io.sockets.sockets.get(player.id);
    if (sock) sock.emit('room-update', room.toClientState(player.id));
  }
}

io.on('connection', (socket) => {
  console.log('connected:', socket.id);

  socket.on('create-room', ({ name, persistentId }) => {
    if (!name || !name.trim()) return socket.emit('error', { message: 'Name is required' });
    const room = new Room(socket.id, name.trim(), persistentId);
    rooms.set(room.id, room);
    socket.join(room.id);
    socket.data.roomId = room.id;
    socket.emit('room-created', { code: room.id });
    broadcastRoomUpdate(room);
  });

  socket.on('join-room', ({ code, name, persistentId }) => {
    if (!name || !name.trim()) return socket.emit('error', { message: 'Name is required' });
    const room = rooms.get((code || '').toUpperCase());
    if (!room) return socket.emit('error', { message: 'Room not found — check the code and try again' });
    const result = room.addPlayer(socket.id, name.trim(), persistentId);
    if (result.error) return socket.emit('error', { message: result.error });
    socket.join(room.id);
    socket.data.roomId = room.id;
    socket.emit('room-joined', { code: room.id });
    broadcastRoomUpdate(room);
  });

  socket.on('rejoin-room', ({ persistentId, roomCode }) => {
    const room = rooms.get((roomCode || '').toUpperCase());
    if (!room) return socket.emit('rejoin-failed', { message: 'Room not found — the server may have restarted' });
    const result = room.rejoinPlayer(persistentId, socket.id);
    if (result.error) return socket.emit('rejoin-failed', { message: result.error });
    socket.join(room.id);
    socket.data.roomId = room.id;
    socket.emit('room-rejoined', { code: room.id, status: result.status });
    broadcastRoomUpdate(room);
  });

  socket.on('assign-team', ({ playerId, team }) => {
    const room = rooms.get(socket.data.roomId);
    if (!room) return socket.emit('error', { message: 'Room not found' });
    if (room.hostId !== socket.id) return socket.emit('error', { message: 'Only the host can assign teams' });
    const result = room.assignTeam(playerId, team);
    if (result.error) return socket.emit('error', { message: result.error });
    broadcastRoomUpdate(room);
  });

  socket.on('start-game', () => {
    const room = rooms.get(socket.data.roomId);
    if (!room) return socket.emit('error', { message: 'Room not found' });
    if (room.hostId !== socket.id) return socket.emit('error', { message: 'Only the host can start the game' });
    const result = room.startGame();
    if (result.error) return socket.emit('error', { message: result.error });
    broadcastRoomUpdate(room);
  });

  socket.on('initiate-ask', ({ targetId }) => {
    const room = rooms.get(socket.data.roomId);
    if (!room) return socket.emit('error', { message: 'Room not found' });
    const result = room.initiateAsk(socket.id, targetId);
    if (result.error) return socket.emit('error', { message: result.error });
    broadcastRoomUpdate(room);
  });

  socket.on('respond-card', ({ card }) => {
    const room = rooms.get(socket.data.roomId);
    if (!room) return socket.emit('error', { message: 'Room not found' });
    const result = room.respondCard(socket.id, card);
    if (result.error) return socket.emit('error', { message: result.error });
    broadcastRoomUpdate(room);
  });

  socket.on('deny-ask', () => {
    const room = rooms.get(socket.data.roomId);
    if (!room) return socket.emit('error', { message: 'Room not found' });
    const result = room.denyAsk(socket.id);
    if (result.error) return socket.emit('error', { message: result.error });
    broadcastRoomUpdate(room);
  });

  socket.on('transfer-card', ({ toId, card }) => {
    const room = rooms.get(socket.data.roomId);
    if (!room) return socket.emit('error', { message: 'Room not found' });
    const result = room.transferCard(socket.id, toId, card);
    if (result.error) return socket.emit('error', { message: result.error });
    broadcastRoomUpdate(room);
  });

  socket.on('declare-set', ({ halfSuit, mapping }) => {
    const room = rooms.get(socket.data.roomId);
    if (!room) return socket.emit('error', { message: 'Room not found' });
    const result = room.processDeclaration(socket.id, halfSuit, mapping);
    if (result.error) return socket.emit('error', { message: result.error });
    broadcastRoomUpdate(room);
  });

  socket.on('pass-turn', () => {
    const room = rooms.get(socket.data.roomId);
    if (!room) return socket.emit('error', { message: 'Room not found' });
    const result = room.passTurn(socket.id);
    if (result.error) return socket.emit('error', { message: result.error });
    broadcastRoomUpdate(room);
  });

  socket.on('choose-turn', ({ targetPlayerId }) => {
    const room = rooms.get(socket.data.roomId);
    if (!room) return socket.emit('error', { message: 'Room not found' });
    const result = room.chooseTurn(socket.id, targetPlayerId);
    if (result.error) return socket.emit('error', { message: result.error });
    broadcastRoomUpdate(room);
  });

  socket.on('set-turn', ({ targetPlayerId }) => {
    const room = rooms.get(socket.data.roomId);
    if (!room) return socket.emit('error', { message: 'Room not found' });
    const result = room.setTurn(socket.id, targetPlayerId);
    if (result.error) return socket.emit('error', { message: result.error });
    broadcastRoomUpdate(room);
  });

  socket.on('get-room', () => {
    const room = rooms.get(socket.data.roomId);
    if (!room) return socket.emit('error', { message: 'Room not found' });
    socket.emit('room-update', room.toClientState(socket.id));
  });

  socket.on('disconnect', () => {
    console.log('disconnected:', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Literature server running on http://localhost:${PORT}`);
});
