import { useState } from "react";
import { startGame } from "../lib/room.js";
import Reactions from "./Reactions.jsx";

export default function Lobby({ code, room, uid, isHost, presence }) {
  const [starting, setStarting] = useState(false);
  const [copied, setCopied] = useState(false);

  const { meta, players } = room;
  const playerList = (meta.playerOrder || []).map((id) => ({ id, ...players[id] })).filter(Boolean);
  const spectators = Object.entries(room.spectators || {}).map(([id, s]) => ({ id, ...s }));
  const canStart = isHost && playerList.length >= 2;
  const shareUrl = `${window.location.origin}/room/${code}`;
  const watchUrl = `${window.location.origin}/room/${code}?watch=1`;
  const myName = players[uid]?.name || "Player";

  async function handleStart() {
    if (!canStart || starting) return;
    setStarting(true);
    try { await startGame(code); }
    catch (e) { console.error(e); setStarting(false); }
  }

  function copyCode() {
    navigator.clipboard.writeText(code).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }

  async function shareInvite(asSpectator = false) {
    const url = asSpectator ? watchUrl : shareUrl;
    const text = asSpectator
      ? `👀 Watch my Liar's Bar game live!\nRoom code: ${code}\n${url}`
      : `🃏 Join my Liar's Bar game!\nRoom code: ${code}\n${url}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: "Liar's Bar", text, url });
        return;
      } catch (e) {
        if (e.name === "AbortError") return;
      }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  }

  function isOnline(puid) {
    return presence?.[puid]?.online === true;
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, background: "radial-gradient(ellipse at 50% 40%, #1a0800, #000)" }}>
      <div style={{ width: "100%", maxWidth: 380 }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <h1 style={{ color: "#d97706", fontSize: 38, fontFamily: "Georgia,serif", fontWeight: 900, margin: "0 0 4px" }}>🃏 Liar's Bar</h1>
          <p style={{ color: "#a16207", fontSize: 11, letterSpacing: 5, textTransform: "uppercase", margin: 0 }}>The bar is open</p>
        </div>

        {/* Room code + share */}
        <div style={{ background: "rgba(92,44,0,0.15)", border: "1px solid #451a03", borderRadius: 20, padding: 22, marginBottom: 14 }}>
          <p style={{ color: "#a16207", fontSize: 10, textTransform: "uppercase", letterSpacing: 3, margin: "0 0 10px" }}>Room code</p>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <span style={{ fontSize: 40, fontFamily: "Georgia,serif", fontWeight: 900, color: "#fbbf24", letterSpacing: 10, lineHeight: 1 }}>{code}</span>
            <button onClick={copyCode} style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #451a03", background: copied ? "rgba(21,128,61,0.2)" : "transparent", color: copied ? "#34d399" : "#d97706", cursor: "pointer", fontSize: 12, fontWeight: 700, transition: "all 0.2s" }}>
              {copied ? "✓ Copied!" : "Copy code"}
            </button>
          </div>

          <p style={{ color: "#78350f", fontSize: 10, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 8px" }}>Invite friends</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <button onClick={() => shareInvite(false)} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "12px 16px",
              borderRadius: 12, border: "2px solid #d97706",
              background: "linear-gradient(135deg, #b45309, #7c2d12)",
              color: "#fef3c7", fontWeight: 700, fontSize: 14, cursor: "pointer",
              boxShadow: "0 4px 16px rgba(180,83,9,0.3)",
            }}>
              <span style={{ fontSize: 20 }}>🃏</span>
              <div style={{ textAlign: "left", flex: 1 }}>
                <div>Invite to Play</div>
                <div style={{ fontSize: 11, fontWeight: 400, color: "#fcd34d", marginTop: 1 }}>They join as a player</div>
              </div>
              <span style={{ fontSize: 18 }}>↗</span>
            </button>

            <button onClick={() => shareInvite(true)} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "12px 16px",
              borderRadius: 12, border: "1px solid #15803d",
              background: "rgba(21,128,61,0.15)",
              color: "#34d399", fontWeight: 700, fontSize: 14, cursor: "pointer",
            }}>
              <span style={{ fontSize: 20 }}>👁</span>
              <div style={{ textAlign: "left", flex: 1 }}>
                <div>Invite to Watch</div>
                <div style={{ fontSize: 11, fontWeight: 400, color: "#86efac", marginTop: 1 }}>They join as a spectator</div>
              </div>
              <span style={{ fontSize: 18 }}>↗</span>
            </button>
          </div>
        </div>

        {/* Players */}
        <div style={{ background: "rgba(92,44,0,0.1)", border: "1px solid #3b1200", borderRadius: 16, padding: 16, marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <p style={{ color: "#a16207", fontSize: 10, textTransform: "uppercase", letterSpacing: 3, margin: 0 }}>Players ({playerList.length}/4)</p>
            {playerList.length < 2 && <p style={{ color: "#78350f", fontSize: 11, margin: 0 }}>Need {2 - playerList.length} more</p>}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {playerList.map((p) => {
              const isMe = p.id === uid;
              const online = isOnline(p.id);
              const isThisHost = p.id === meta.host;
              return (
                <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, background: isMe ? "rgba(217,119,6,0.12)" : "rgba(59,18,0,0.2)", border: `1px solid ${isMe ? "#451a03" : "#1c0900"}` }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: isMe ? "#451a03" : "#1c0900", display: "flex", alignItems: "center", justifyContent: "center", color: isMe ? "#fbbf24" : "#a16207", fontSize: 13, fontWeight: 700 }}>
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ color: isMe ? "#fbbf24" : "#d97706", fontWeight: 700, fontSize: 14, margin: 0 }}>
                      {p.name} {isMe && <span style={{ color: "#a16207", fontWeight: 400, fontSize: 11 }}>(you)</span>}
                    </p>
                    {isThisHost && <p style={{ color: "#a16207", fontSize: 11, margin: 0 }}>host</p>}
                  </div>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: online ? "#22c55e" : "#374151", transition: "background 0.3s" }} />
                </div>
              );
            })}

            {Array.from({ length: 4 - playerList.length }).map((_, i) => (
              <div key={`empty-${i}`} style={{ padding: "10px 14px", borderRadius: 10, border: "1px dashed #1c0900", display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", border: "1px dashed #1c0900" }} />
                <p style={{ color: "#3b1200", fontSize: 13, margin: 0, fontStyle: "italic" }}>Waiting for player…</p>
              </div>
            ))}
          </div>
        </div>

        {/* Spectators */}
        {spectators.length > 0 && (
          <div style={{ background: "rgba(0,0,0,0.2)", border: "1px solid #1c0900", borderRadius: 12, padding: "10px 14px", marginBottom: 14 }}>
            <p style={{ color: "#78350f", fontSize: 10, textTransform: "uppercase", letterSpacing: 3, margin: "0 0 8px" }}>
              👁 Spectators ({spectators.length})
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {spectators.map((s) => (
                <span key={s.id} style={{ fontSize: 12, padding: "3px 10px", borderRadius: 20, background: "rgba(59,18,0,0.3)", border: "1px solid #1c0900", color: "#78350f" }}>
                  {s.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Start button */}
        {isHost ? (
          <button onClick={handleStart} disabled={!canStart || starting} style={{
            width: "100%", padding: 16, borderRadius: 14, fontWeight: 900, fontSize: 18, letterSpacing: 2,
            border: `2px solid ${canStart ? "#d97706" : "#1c0900"}`,
            background: canStart ? "linear-gradient(135deg, #b45309, #7c2d12)" : "#0a0400",
            color: canStart ? "#fef3c7" : "#a16207",
            cursor: canStart ? "pointer" : "not-allowed",
            boxShadow: canStart ? "0 4px 24px rgba(180,83,9,0.35)" : "none",
          }}>
            {starting ? "Dealing…" : canStart ? "START GAME" : `Need ${2 - playerList.length} more player${2 - playerList.length !== 1 ? "s" : ""}`}
          </button>
        ) : (
          <div style={{ textAlign: "center", padding: 16 }}>
            <p style={{ color: "#a16207", fontSize: 13, fontStyle: "italic", margin: "0 0 10px" }}>
              Waiting for {players[meta.host]?.name || "host"} to start…
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: 6 }}>
              {[0,1,2].map((i) => <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: "#a16207", animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />)}
            </div>
          </div>
        )}
      </div>

      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0 }}>
        <Reactions code={code} uid={uid} name={myName} />
      </div>

      <style>{`@keyframes pulse{0%,100%{opacity:0.2}50%{opacity:1}}`}</style>
    </div>
  );
}
