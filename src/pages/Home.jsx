import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase.js";
import { createRoom, joinRoom, joinAsSpectator } from "../lib/room.js";
import Leaderboard from "../components/Leaderboard.jsx";
import { useEffect, useState as useStateExtra } from "react";

const inp = {
  padding: "11px 14px", borderRadius: 9, border: "1px solid #451a03",
  background: "#060200", color: "#fbbf24", fontSize: 14, outline: "none",
  width: "100%", boxSizing: "border-box",
};

const btnStyle = (active) => ({
  width: "100%", padding: 14, borderRadius: 12, fontWeight: 900,
  fontSize: 16, letterSpacing: 2, border: `2px solid ${active ? "#d97706" : "#1c0900"}`,
  background: active ? "linear-gradient(135deg, #b45309, #7c2d12)" : "#0a0400",
  color: active ? "#fef3c7" : "#a16207",
  cursor: active ? "pointer" : "not-allowed",
  boxShadow: active ? "0 4px 24px rgba(180,83,9,0.3)" : "none",
});

const tabStyle = (active) => ({
  flex: 1, padding: "10px 0", borderRadius: 9, fontWeight: 700, fontSize: 13,
  border: "none", cursor: "pointer",
  background: active ? "#451a03" : "transparent",
  color: active ? "#fbbf24" : "#a16207",
});

export default function Home() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(null);

  useEffect(() => {
    const handler = (e) => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  function handleInstall() {
    if (!installPrompt) return;
    installPrompt.prompt();
    installPrompt.userChoice.then(() => setInstallPrompt(null));
  }
  const [code, setCode] = useState("");
  const [tab, setTab] = useState("create"); // create | join | spectate
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  const uid = auth.currentUser?.uid;

  async function handleCreate() {
    if (!name.trim() || status === "loading") return;
    setStatus("loading"); setError("");
    try {
      const roomCode = await createRoom(uid, name.trim());
      navigate(`/room/${roomCode}`);
    } catch (e) { setError(e.message); setStatus("idle"); }
  }

  async function handleJoin() {
    if (!name.trim() || code.length < 4 || status === "loading") return;
    setStatus("loading"); setError("");
    try {
      await joinRoom(code.trim().toUpperCase(), uid, name.trim());
      navigate(`/room/${code.trim().toUpperCase()}`);
    } catch (e) { setError(e.message); setStatus("idle"); }
  }

  async function handleSpectate() {
    if (!name.trim() || code.length < 4 || status === "loading") return;
    setStatus("loading"); setError("");
    try {
      await joinAsSpectator(code.trim().toUpperCase(), uid, name.trim());
      navigate(`/room/${code.trim().toUpperCase()}?spectate=1`);
    } catch (e) { setError(e.message); setStatus("idle"); }
  }

  const needsCode = tab === "join" || tab === "spectate";
  const canGo = name.trim() && (!needsCode || code.length === 4) && status !== "loading";

  function handleGo() {
    if (tab === "create") handleCreate();
    else if (tab === "join") handleJoin();
    else handleSpectate();
  }

  const btnLabel = status === "loading" ? "…"
    : tab === "create" ? "CREATE ROOM"
    : tab === "join" ? "JOIN ROOM"
    : "SPECTATE";

  return (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", padding: 24,
      background: "radial-gradient(ellipse at 50% 40%, #1a0800, #000)",
    }}>
      <div style={{ width: "100%", maxWidth: 360 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <h1 style={{ color: "#d97706", fontSize: 48, fontFamily: "Georgia,serif", fontWeight: 900, margin: "0 0 4px", textShadow: "0 0 40px rgba(217,119,6,0.4)" }}>
            🃏 Liar's Bar
          </h1>
          <p style={{ color: "#a16207", fontSize: 11, letterSpacing: 6, textTransform: "uppercase", margin: 0 }}>
            Russian Roulette Edition
          </p>
        </div>

        <div style={{ background: "rgba(92,44,0,0.15)", border: "1px solid #451a03", borderRadius: 20, padding: 24 }}>
          <div style={{ marginBottom: 18 }}>
            <label style={{ color: "#a16207", fontSize: 10, textTransform: "uppercase", letterSpacing: 3, display: "block", marginBottom: 6 }}>Your name</label>
            <input style={inp} value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              onKeyDown={(e) => e.key === "Enter" && handleGo()} />
          </div>

          {/* 3-tab switcher */}
          <div style={{ display: "flex", gap: 4, background: "#0a0400", borderRadius: 10, padding: 4, marginBottom: 18 }}>
            <button style={tabStyle(tab === "create")} onClick={() => setTab("create")}>Create</button>
            <button style={tabStyle(tab === "join")} onClick={() => setTab("join")}>Join</button>
            <button style={tabStyle(tab === "spectate")} onClick={() => setTab("spectate")}>Watch</button>
          </div>

          {needsCode && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ color: "#a16207", fontSize: 10, textTransform: "uppercase", letterSpacing: 3, display: "block", marginBottom: 6 }}>
                Room code
              </label>
              <input
                style={{ ...inp, textTransform: "uppercase", letterSpacing: 8, fontSize: 22, fontFamily: "Georgia,serif", textAlign: "center" }}
                value={code} onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 4))}
                placeholder="ABCD" maxLength={4}
                onKeyDown={(e) => e.key === "Enter" && handleGo()}
              />
              {tab === "spectate" && (
                <p style={{ color: "#78350f", fontSize: 11, marginTop: 6, textAlign: "center" }}>
                  👁 You'll watch the game without playing
                </p>
              )}
            </div>
          )}

          {error && <p style={{ color: "#f87171", fontSize: 12, margin: "0 0 12px", textAlign: "center" }}>⚠️ {error}</p>}

          <button onClick={handleGo} disabled={!canGo} style={btnStyle(canGo)}>
            {btnLabel}
          </button>
        </div>

        {/* Leaderboard + Install buttons */}
        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <button onClick={() => setShowLeaderboard(true)} style={{
            flex: 1, padding: "11px 0", borderRadius: 10, border: "1px solid #451a03",
            background: "transparent", color: "#d97706", fontSize: 13, fontWeight: 700, cursor: "pointer",
          }}>
            🏆 Leaderboard
          </button>
          {installPrompt && (
            <button onClick={handleInstall} style={{
              flex: 1, padding: "11px 0", borderRadius: 10, border: "1px solid #1c0900",
              background: "transparent", color: "#a16207", fontSize: 13, fontWeight: 700, cursor: "pointer",
            }}>
              📲 Install App
            </button>
          )}
        </div>

        <div style={{ marginTop: 16, color: "#78350f", fontSize: 12, lineHeight: 1.9, textAlign: "center" }}>
          <p style={{ color: "#b45309", margin: "0 0 4px", fontWeight: 700 }}>How to play</p>
          <p style={{ margin: 0 }}>2–4 players · Play cards claiming they match the rank · Get caught lying → pull the trigger · First to empty their hand wins · ★ Jokers are wild</p>
        </div>
      </div>
      {showLeaderboard && <Leaderboard onClose={() => setShowLeaderboard(false)} />}
    </div>
  );
}
