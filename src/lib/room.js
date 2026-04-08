import { ref, set, get, update, push, onValue, runTransaction } from "firebase/database";
import { db } from "../firebase.js";
import { dealHands, generateCode, wasLying, RANKS } from "./game.js";

function logEvent(code, msg) {
  const r = push(ref(db, `rooms/${code}/log`));
  return set(r, { msg, ts: Date.now() });
}


function logMoment(code, playerUid, playerName, type, detail = "") {
  const r = push(ref(db, `rooms/${code}/moments`));
  return set(r, { playerUid, playerName, type, detail, ts: Date.now() });
}

async function updateLeaderboard(uid, name, won) {
  const r = ref(db, `leaderboard/${uid}`);
  await runTransaction(r, (current) => {
    if (!current) return { name, wins: won ? 1 : 0, gamesPlayed: 1 };
    return {
      name,
      wins: (current.wins || 0) + (won ? 1 : 0),
      gamesPlayed: (current.gamesPlayed || 0) + 1,
    };
  });
}

export async function createRoom(hostUid, hostName) {
  let code, attempts = 0;
  while (attempts < 10) {
    code = generateCode();
    const snap = await get(ref(db, `rooms/${code}/meta`));
    if (!snap.exists()) break;
    attempts++;
  }
  await set(ref(db, `rooms/${code}`), {
    meta: {
      host: hostUid, status: "lobby", phase: "waiting",
      tableRankIdx: Math.floor(Math.random() * 3),
      curUid: null, lastPlay: null, revealData: null,
      bullet: Math.floor(Math.random() * 6), shots: 0,
      winner: null, playerOrder: [hostUid], createdAt: Date.now(),
    },
    players: { [hostUid]: { name: hostName, alive: true, cardCount: 0 } },
  });
  return code;
}

export async function joinRoom(code, uid, name) {
  const snap = await get(ref(db, `rooms/${code}`));
  if (!snap.exists()) throw new Error("Room not found. Check the code and try again.");
  const room = snap.val();
  if (room.meta.status !== "lobby") throw new Error("This game has already started.");
  const playerCount = Object.keys(room.players || {}).length;
  if (playerCount >= 4) throw new Error("Room is full (max 4 players).");
  if (room.players?.[uid]) return room;
  await update(ref(db), {
    [`rooms/${code}/players/${uid}`]: { name, alive: true, cardCount: 0 },
    [`rooms/${code}/meta/playerOrder`]: [...(room.meta.playerOrder || []), uid],
  });
  return snap.val();
}

export async function joinAsSpectator(code, uid, name) {
  const snap = await get(ref(db, `rooms/${code}`));
  if (!snap.exists()) throw new Error("Room not found. Check the code and try again.");
  await update(ref(db), {
    [`rooms/${code}/spectators/${uid}`]: { name, joinedAt: Date.now() },
  });
  return snap.val();
}

export async function startGame(code) {
  const snap = await get(ref(db, `rooms/${code}`));
  const room = snap.val();
  const order = room.meta.playerOrder;
  const hands = dealHands(order);
  const updates = {};
  order.forEach((uid) => {
    updates[`rooms/${code}/hands/${uid}`] = hands[uid];
    updates[`rooms/${code}/players/${uid}/cardCount`] = hands[uid].length;
    updates[`rooms/${code}/players/${uid}/alive`] = true;
  });
  const rankIdx = Math.floor(Math.random() * 3);
  updates[`rooms/${code}/meta/status`] = "playing";
  updates[`rooms/${code}/meta/phase`] = "turn";
  updates[`rooms/${code}/meta/curUid`] = order[0];
  updates[`rooms/${code}/meta/lastPlay`] = null;
  updates[`rooms/${code}/meta/revealData`] = null;
  updates[`rooms/${code}/meta/tableRankIdx`] = rankIdx;
  updates[`rooms/${code}/meta/bullet`] = Math.floor(Math.random() * 6);
  updates[`rooms/${code}/meta/shots`] = 0;
  updates[`rooms/${code}/meta/winner`] = null;
  await update(ref(db), updates);
  await logEvent(code, `🎮 Game started! Target: ${RANKS[rankIdx]}`);
}

export async function playCards(code, uid, cards) {
  const [handSnap, roomSnap] = await Promise.all([
    get(ref(db, `rooms/${code}/hands/${uid}`)),
    get(ref(db, `rooms/${code}`)),
  ]);
  const currentHand = handSnap.val() || [];
  const cardIds = new Set(cards.map((c) => c.id));
  const newHand = currentHand.filter((c) => !cardIds.has(c.id));
  const room = roomSnap.val();
  const { meta, players } = room;
  const order = meta.playerOrder;
  const curIdx = order.indexOf(uid);
  const nextUid = order[(curIdx + 1) % order.length];
  const isEmpty = newHand.length === 0;
  const tableRank = RANKS[meta.tableRankIdx];
  await update(ref(db), {
    [`rooms/${code}/hands/${uid}`]: newHand,
    [`rooms/${code}/players/${uid}/cardCount`]: newHand.length,
    [`rooms/${code}/meta/lastPlay`]: { uid, playerName: players[uid].name, count: cards.length, cards, revealed: false },
    [`rooms/${code}/meta/curUid`]: nextUid,
    [`rooms/${code}/meta/phase`]: isEmpty ? "winPending" : "turn",
  });
  await logEvent(code, `${players[uid].name} played ${cards.length}× ${tableRank}${isEmpty ? " (last cards!)" : ""}`);
}

export async function callBluff(code, callerUid) {
  const snap = await get(ref(db, `rooms/${code}`));
  const room = snap.val();
  const { meta, players } = room;
  const tableRank = RANKS[meta.tableRankIdx];
  const lying = wasLying(meta.lastPlay.cards, tableRank);
  const loserUid = lying ? meta.lastPlay.uid : callerUid;
  await update(ref(db), {
    [`rooms/${code}/meta/phase`]: "reveal",
    [`rooms/${code}/meta/lastPlay/revealed`]: true,
    [`rooms/${code}/meta/revealData`]: {
      wasLying: lying, loserUid, callerUid,
      accusedUid: meta.lastPlay.uid,
      callerName: players[callerUid].name,
      accusedName: players[meta.lastPlay.uid].name,
      winIfInnocent: meta.phase === "winPending" && !lying,
      accusedIsWinner: meta.phase === "winPending" && !lying ? meta.lastPlay.uid : null,
    },
  });
  if (lying) {
    await logMoment(code, meta.lastPlay.uid, players[meta.lastPlay.uid].name, "caught",
      `claimed ${meta.lastPlay.count}× ${tableRank}`);
  } else {
    await logMoment(code, callerUid, players[callerUid].name, "wrongBluff",
      `accused ${players[meta.lastPlay.uid].name}`);
  }
  await logEvent(code, lying
    ? `😈 ${players[callerUid].name} caught ${players[meta.lastPlay.uid].name} lying!`
    : `😇 ${players[callerUid].name} wrong — ${players[meta.lastPlay.uid].name} was honest!`
  );
}

export async function acceptWin(code, winnerUid) {
  const snap = await get(ref(db, `rooms/${code}/players/${winnerUid}`));
  const player = snap.val();
  await update(ref(db), {
    [`rooms/${code}/meta/winner`]: winnerUid,
    [`rooms/${code}/meta/status`]: "finished",
    [`rooms/${code}/meta/phase`]: "win",
  });
  await logEvent(code, `🏆 ${player?.name} wins!`);
  const roomSnap = await get(ref(db, `rooms/${code}`));
  const roomData = roomSnap.val();
  if (roomData?.meta?.playerOrder) {
    await Promise.all(
      roomData.meta.playerOrder.map((puid) =>
        updateLeaderboard(puid, roomData.players[puid]?.name || "Player", puid === winnerUid)
      )
    );
  }
}

export async function proceedToRoulette(code) {
  await update(ref(db, `rooms/${code}/meta`), { phase: "roulette" });
  await logEvent(code, "☠ Russian Roulette begins…");
}

export async function startSpin(code, spinTarget) {
  await update(ref(db, `rooms/${code}/meta`), { phase: "roulette_spinning", spinTarget });
}

export async function resolveRoulette(code, isBang) {
  const snap = await get(ref(db, `rooms/${code}`));
  const room = snap.val();
  const { meta, players } = room;
  const { revealData } = meta;
  const shots = meta.shots + 1;
  const updates = { [`rooms/${code}/meta/shots`]: shots };

  if (revealData.winIfInnocent) {
    updates[`rooms/${code}/meta/winner`] = revealData.accusedUid;
    updates[`rooms/${code}/meta/status`] = "finished";
    updates[`rooms/${code}/meta/phase`] = "win";
    await update(ref(db), updates);
    await logEvent(code, `🏆 ${players[revealData.accusedUid]?.name} wins!`);
    return;
  }

  if (isBang) {
    updates[`rooms/${code}/players/${revealData.loserUid}/alive`] = false;
    await logMoment(code, revealData.loserUid, players[revealData.loserUid]?.name, "eliminated");
    await logEvent(code, `💥 ${players[revealData.loserUid]?.name} eliminated!`);
  } else {
    await logMoment(code, revealData.loserUid, players[revealData.loserUid]?.name, "survived");
    await logEvent(code, `😰 ${players[revealData.loserUid]?.name} survived… this time.`);
  }

  const updatedAlive = meta.playerOrder.filter(
    (uid) => players[uid].alive && !(isBang && uid === revealData.loserUid)
  );

  if (updatedAlive.length === 1) {
    updates[`rooms/${code}/meta/winner`] = updatedAlive[0];
    updates[`rooms/${code}/meta/status`] = "finished";
    updates[`rooms/${code}/meta/phase`] = "win";
    await update(ref(db), updates);
    await logEvent(code, `🏆 ${players[updatedAlive[0]]?.name} wins!`);
    // Update leaderboard for all original players
    await Promise.all(
      meta.playerOrder.map((puid) =>
        updateLeaderboard(puid, players[puid]?.name || "Player", puid === updatedAlive[0])
      )
    );
    return;
  }

  const newHands = dealHands(updatedAlive);
  const newRankIdx = (meta.tableRankIdx + 1) % 3;
  const loserAliveIdx = updatedAlive.indexOf(revealData.loserUid);
  const newCurUid = updatedAlive[Math.max(loserAliveIdx, 0) % updatedAlive.length];

  updatedAlive.forEach((uid) => {
    updates[`rooms/${code}/hands/${uid}`] = newHands[uid];
    updates[`rooms/${code}/players/${uid}/cardCount`] = newHands[uid].length;
  });

  updates[`rooms/${code}/meta/phase`] = "turn";
  updates[`rooms/${code}/meta/tableRankIdx`] = newRankIdx;
  updates[`rooms/${code}/meta/curUid`] = newCurUid;
  updates[`rooms/${code}/meta/lastPlay`] = null;
  updates[`rooms/${code}/meta/revealData`] = null;
  updates[`rooms/${code}/meta/playerOrder`] = updatedAlive;
  updates[`rooms/${code}/meta/bullet`] = Math.floor(Math.random() * 6);
  updates[`rooms/${code}/meta/spinTarget`] = null;
  await update(ref(db), updates);
  await logEvent(code, `🔄 New round! Target: ${RANKS[newRankIdx]}`);
}

export function subscribeRoom(code, callback) {
  const unsub = onValue(ref(db, `rooms/${code}`), (snap) => callback(snap.val()));
  return unsub;
}

export function subscribeHand(code, uid, callback) {
  const unsub = onValue(ref(db, `rooms/${code}/hands/${uid}`), (snap) => callback(snap.val() || []));
  return unsub;
}
