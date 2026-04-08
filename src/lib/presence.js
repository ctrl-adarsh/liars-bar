import { ref, set, get, update, onValue, onDisconnect } from "firebase/database";
import { db } from "../firebase.js";

// Call once when a player/spectator mounts. Returns a cleanup fn.
export function initPresence(code, uid) {
  const presRef = ref(db, `rooms/${code}/presence/${uid}`);
  set(presRef, { online: true, lastSeen: Date.now() });
  onDisconnect(presRef).set({ online: false, lastSeen: Date.now() });
  return () => set(presRef, { online: false, lastSeen: Date.now() });
}

export function subscribePresence(code, callback) {
  const r = ref(db, `rooms/${code}/presence`);
  const unsub = onValue(r, (snap) => callback(snap.val() || {}));
  return unsub;
}

// Skip the disconnected player's turn (called by any connected client after 30s)
export async function skipDisconnectedTurn(code, timedOutUid) {
  const snap = await get(ref(db, `rooms/${code}`));
  const room = snap.val();
  if (!room) return;
  const { meta } = room;

  // Guard: only act if it's still that player's turn and skip not already done
  if (meta.curUid !== timedOutUid) return;
  if (meta.skipToken === timedOutUid) return;

  const order = meta.playerOrder || [];
  const curIdx = order.indexOf(timedOutUid);
  const presence = room.presence || {};

  // Find next alive online player
  let nextUid = null;
  for (let i = 1; i <= order.length; i++) {
    const candidate = order[(curIdx + i) % order.length];
    if (candidate === timedOutUid) continue;
    if (!room.players[candidate]?.alive) continue;
    nextUid = candidate;
    break;
  }

  if (!nextUid) return;

  await update(ref(db), {
    [`rooms/${code}/meta/curUid`]: nextUid,
    [`rooms/${code}/meta/skipToken`]: timedOutUid, // prevent duplicate skips
  });
}

// Migrate host to next online player if host disconnects
export async function migrateHostIfNeeded(code, offlineUid) {
  const snap = await get(ref(db, `rooms/${code}`));
  const room = snap.val();
  if (!room) return;
  const { meta } = room;

  if (meta.host !== offlineUid) return; // not the host, nothing to do
  if (meta.hostMigratedFrom === offlineUid) return; // already migrated

  const presence = room.presence || {};
  const order = meta.playerOrder || [];

  for (const uid of order) {
    if (uid === offlineUid) continue;
    if (!room.players[uid]?.alive) continue;
    if (presence[uid]?.online !== true) continue;
    await update(ref(db, `rooms/${code}/meta`), {
      host: uid,
      hostMigratedFrom: offlineUid,
    });
    return;
  }
}
