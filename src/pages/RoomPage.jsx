import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { auth } from "../firebase.js";
import { subscribeRoom, subscribeHand } from "../lib/room.js";
import { initPresence, subscribePresence, skipDisconnectedTurn, migrateHostIfNeeded } from "../lib/presence.js";
import Lobby from "../components/Lobby.jsx";
import Game from "../components/Game.jsx";
import Spectator from "../components/Spectator.jsx";

const SKIP_AFTER_MS = 30000;

export default function RoomPage() {
  const { code } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isSpectateMode = searchParams.get("spectate") === "1";

  const uid = auth.currentUser?.uid;

  const [room, setRoom] = useState(null);
  const [myHand, setMyHand] = useState([]);
  const [presence, setPresence] = useState({});
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const skipTimerRef = useRef(null);
  const lastCurUidRef = useRef(null);

  // Subscribe to room + hand + presence
  useEffect(() => {
    if (!uid || !code) return;

    const unsubRoom = subscribeRoom(code, (data) => {
      if (!data) { setNotFound(true); setLoading(false); return; }
      setRoom(data);
      setLoading(false);
    });

    const unsubHand = subscribeHand(code, uid, setMyHand);
    const unsubPresence = subscribePresence(code, setPresence);

    // Register presence (players and spectators)
    const cleanupPresence = initPresence(code, uid);

    return () => {
      unsubRoom();
      unsubHand();
      unsubPresence();
      cleanupPresence();
    };
  }, [code, uid]);

  // Reconnection watchdog — skip turn after 30s of disconnect
  useEffect(() => {
    if (!room || !presence || room.meta?.status !== "playing") return;

    const curUid = room.meta?.curUid;
    if (!curUid) return;

    // Reset timer when turn changes
    if (curUid !== lastCurUidRef.current) {
      lastCurUidRef.current = curUid;
      if (skipTimerRef.current) clearTimeout(skipTimerRef.current);
    }

    const curPresence = presence[curUid];
    if (!curPresence || curPresence.online) return; // online, no action needed

    const offlineFor = Date.now() - (curPresence.lastSeen || 0);
    const remaining = SKIP_AFTER_MS - offlineFor;

    if (remaining <= 0) {
      // Already timed out — skip immediately
      skipDisconnectedTurn(code, curUid);
      if (curUid === room.meta?.host) migrateHostIfNeeded(code, curUid);
    } else {
      // Set a timer to skip when time is up
      if (skipTimerRef.current) clearTimeout(skipTimerRef.current);
      skipTimerRef.current = setTimeout(() => {
        skipDisconnectedTurn(code, curUid);
        if (curUid === room.meta?.host) migrateHostIfNeeded(code, curUid);
      }, remaining);
    }

    return () => { if (skipTimerRef.current) clearTimeout(skipTimerRef.current); };
  }, [room?.meta?.curUid, presence]);

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#000" }}>
      <p style={{ color: "#a16207", fontFamily: "Georgia,serif" }}>Entering the bar…</p>
    </div>
  );

  if (notFound) return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#000", gap: 16 }}>
      <p style={{ color: "#f87171", fontFamily: "Georgia,serif", fontSize: 20 }}>Room not found</p>
      <button onClick={() => navigate("/")} style={{ padding: "10px 28px", borderRadius: 10, border: "1px solid #451a03", background: "transparent", color: "#d97706", cursor: "pointer", fontSize: 14 }}>← Back</button>
    </div>
  );

  if (!room) return null;

  const { meta, players } = room;
  const isHost = meta.host === uid;
  const amPlayer = !!players?.[uid];
  const amSpectator = !!room.spectators?.[uid];
  const myName = players?.[uid]?.name || room.spectators?.[uid]?.name || "Spectator";

  // Route spectators to their view
  if (isSpectateMode || (amSpectator && !amPlayer)) {
    return (
      <Spectator
        code={code}
        room={room}
        uid={uid}
        name={myName}
        onExit={() => navigate("/")}
      />
    );
  }

  if (!amPlayer) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#000" }}>
      <p style={{ color: "#f87171" }}>You're not in this room. <button onClick={() => navigate("/")} style={{ color: "#d97706", background: "none", border: "none", cursor: "pointer" }}>Go back</button></p>
    </div>
  );

  if (meta.status === "lobby") {
    return <Lobby code={code} room={room} uid={uid} isHost={isHost} presence={presence} />;
  }

  return (
    <Game
      code={code}
      room={room}
      myHand={myHand}
      uid={uid}
      isHost={isHost}
      presence={presence}
      onExit={() => navigate("/")}
    />
  );
}
