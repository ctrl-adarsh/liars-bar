import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { auth } from "../firebase.js";
import { subscribeRoom, subscribeHand, joinRoom, joinAsSpectator } from "../lib/room.js";
import { initPresence, subscribePresence, skipDisconnectedTurn, migrateHostIfNeeded } from "../lib/presence.js";
import Lobby from "../components/Lobby.jsx";
import Game from "../components/Game.jsx";
import Spectator from "../components/Spectator.jsx";

const SKIP_AFTER_MS = 30000;


function JoinPrompt({ code, uid, isSpectateMode, room, onExit }) {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  const gameStarted = room?.meta?.status !== "lobby";
  const isFull = Object.keys(room?.players || {}).length >= 4;
  // If game started or room full and not spectate mode → force spectate
  const mustSpectate = isSpectateMode || gameStarted || isFull;

  async function handleJoin() {
    if (!name.trim() || status === "loading") return;
    setStatus("loading"); setError("");
    try {
      if (mustSpectate) {
        await joinAsSpectator(code, uid, name.trim());
        navigate(`/room/${code}?watch=1`);
      } else {
        await joinRoom(code, uid, name.trim());
        navigate(`/room/${code}`);
      }
    } catch (e) {
      setError(e.message);
      setStatus("idle");
    }
  }

  return (
    <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:24, background:"radial-gradient(ellipse at 50% 40%, #1a0800, #000)" }}>
      <div style={{ width:"100%", maxWidth:340 }}>
        <div style={{ textAlign:"center", marginBottom:28 }}>
          <h1 style={{ color:"#d97706", fontSize:42, fontFamily:"Georgia,serif", fontWeight:900, margin:"0 0 4px" }}>🃏 Liar's Bar</h1>
          <p style={{ color:"#a16207", fontSize:11, letterSpacing:5, textTransform:"uppercase", margin:0 }}>
            {mustSpectate ? "Join as spectator" : "You've been invited"}
          </p>
        </div>

        <div style={{ background:"rgba(92,44,0,0.15)", border:"1px solid #451a03", borderRadius:20, padding:24 }}>
          <div style={{ textAlign:"center", marginBottom:20 }}>
            <p style={{ color:"#78350f", fontSize:11, margin:"0 0 6px" }}>Room</p>
            <p style={{ color:"#fbbf24", fontSize:36, fontFamily:"Georgia,serif", fontWeight:900, letterSpacing:8, margin:0 }}>{code}</p>
          </div>

          {mustSpectate && (
            <div style={{ background:"rgba(0,0,0,0.3)", border:"1px solid #1c0900", borderRadius:10, padding:"10px 14px", marginBottom:16, textAlign:"center" }}>
              <p style={{ color:"#a16207", fontSize:12, margin:0 }}>
                {gameStarted ? "Game already in progress — you'll join as a spectator 👁" : "Room is full — you'll join as a spectator 👁"}
              </p>
            </div>
          )}

          <label style={{ color:"#a16207", fontSize:10, textTransform:"uppercase", letterSpacing:3, display:"block", marginBottom:6 }}>Your name</label>
          <input
            value={name} onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name"
            onKeyDown={(e) => e.key === "Enter" && handleJoin()}
            style={{ width:"100%", padding:"11px 14px", borderRadius:9, border:"1px solid #451a03", background:"#060200", color:"#fbbf24", fontSize:14, outline:"none", boxSizing:"border-box", marginBottom:14 }}
          />

          {error && <p style={{ color:"#f87171", fontSize:12, margin:"0 0 12px", textAlign:"center" }}>⚠️ {error}</p>}

          <button onClick={handleJoin} disabled={!name.trim() || status === "loading"}
            style={{ width:"100%", padding:14, borderRadius:12, fontWeight:900, fontSize:16, letterSpacing:2,
              border:`2px solid ${name.trim() ? "#d97706" : "#1c0900"}`,
              background: name.trim() ? "linear-gradient(135deg, #b45309, #7c2d12)" : "#0a0400",
              color: name.trim() ? "#fef3c7" : "#a16207",
              cursor: name.trim() ? "pointer" : "not-allowed",
              boxShadow: name.trim() ? "0 4px 24px rgba(180,83,9,0.3)" : "none",
            }}>
            {status === "loading" ? "Joining…" : mustSpectate ? "WATCH GAME" : "JOIN GAME"}
          </button>
        </div>

        <button onClick={onExit} style={{ display:"block", margin:"16px auto 0", background:"none", border:"none", color:"#78350f", fontSize:13, cursor:"pointer" }}>
          ← Back to home
        </button>
      </div>
    </div>
  );
}

export default function RoomPage() {
  const { code } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isSpectateMode = searchParams.get("spectate") === "1" || searchParams.get("watch") === "1";

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

  // If game already started and this uid isn't a player → auto-spectate
  const gameStarted = meta.status !== "lobby";
  if (gameStarted && !amPlayer) {
    return (
      <Spectator code={code} room={room} uid={uid}
        name={room.spectators?.[uid]?.name || "Spectator"}
        onExit={() => navigate("/")} />
    );
  }

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
