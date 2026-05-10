import { io } from 'socket.io-client';

// In production the frontend is served by the same server, so no URL needed.
// In dev, connect explicitly to the backend port.
const socket = io(import.meta.env.DEV ? 'http://localhost:3001' : '/', { autoConnect: true });
export default socket;
