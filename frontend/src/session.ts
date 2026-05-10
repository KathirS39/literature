// sessionStorage is per-tab: each tab is a separate player, but refreshing keeps the same identity
const store = sessionStorage;

const PID_KEY = 'lit_persistentId';
const ROOM_KEY = 'lit_roomCode';

export function getPersistentId(): string {
  let id = store.getItem(PID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    store.setItem(PID_KEY, id);
  }
  return id;
}

export function saveRoomCode(code: string) {
  store.setItem(ROOM_KEY, code);
}

export function clearRoomCode() {
  store.removeItem(ROOM_KEY);
}

export function getSavedRoomCode(): string | null {
  return store.getItem(ROOM_KEY);
}
