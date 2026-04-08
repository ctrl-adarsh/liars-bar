import { useEffect, useState } from "react";
import { ref, onValue } from "firebase/database";
import { db } from "../firebase.js";

const MOMENT_ICONS = {
  caught: "😈",
  survived: "😰",
  wrongBluff: "😇",
  lastCard: "🃏",
  eliminated: "💥",
};

const MOMENT_LABELS = {
  caught: "caught lying",
  survived: "survived the trigger",
  wrongBluff: "called a wrong bluff",
  lastCard: "played their last card",
  eliminated: "was eliminated",
};

export default function Summary({ code, room, uid, onPlayAgain, onExit }) {
  const [moments, setMoments] = useState([]);
  const [showAll, setShowAll] = useState(false);

  const { meta, players } = room;
  const winner = players?.[meta.winner];
  const iWon = meta.winner === uid;
  const allPlayers = Object.entries(players || {}).map(([id, p]) => ({ id, ...p }));

  useEffect(() => {
    const unsub = onValue(ref(db, `rooms/${code}/moments`), (snap) => {
      const data = snap.val();
      if (!data) return;
      setMoments(Object.values(data).sort((a, b) => a.ts - b.ts));
    });
    return unsub;
  }, [code]);

  // Pick the "funniest" moments — prioritise survived > caught > wrongBluff
  const highlights = [
    ...moments.filter((m) => m.type === "survived"),
    ...moments.filter((m) => m.type === "wrongBluff"),
    ...moments.filter((m) => m.type === "caught"),
  ].slice(0, 3);

  const shareText = `🃏 Just played Liar's Bar!\n${winner?.name} won!\nCome play: ${window.location.origin}`;
  const waUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "radial-gradient(ellipse at 50% 30%, #1a0800, #000)", overflowY: "auto" }}>
      {/* Winner hero */}
      <div style={{ textAlign: "center", padding: "40px 24px 24px" }}>
        <div style={{ fontSize: 72, marginBottom: 12, lineHeight: 1 }}>🏆</div>
        <h2 style={{ color: "#d97706", fontSize: 38, fontFamily: "Georgia,serif", fontWeight: 900, margin: "0 0 6px" }}>{winner?.name}</h2>
        <p style={{ color: iWon ? "#34d399" : "#a16207", fontSize: 16, margin: "0 0 28px" }}>
          {iWon ? "You won the night! 🎉" : "wins the night"}
        </p>

        {/* Share to WhatsApp */}
        <a href={waUrl} target="_blank" rel="noopener noreferrer" style={{
          display: "inline-flex", alignItems: "center", gap: 10,
          padding: "13px 28px", borderRadius: 14, textDecoration: "none",
          background: "#128c1e", border: "none", color: "#fff",
          fontWeight: 700, fontSize: 15, marginBottom: 12,
          boxShadow: "0 4px 20px rgba(18,140,30,0.35)",
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          Share on WhatsApp
        </a>
      </div>

      {/* Highlight moments */}
      {highlights.length > 0 && (
        <div style={{ padding: "0 20px 20px" }}>
          <p style={{ color: "#78350f", fontSize: 10, textTransform: "uppercase", letterSpacing: 3, margin: "0 0 12px", textAlign: "center" }}>
            ✨ Highlights
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {highlights.map((m, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "12px 16px", borderRadius: 12,
                background: "rgba(59,18,0,0.3)", border: "1px solid #1c0900",
              }}>
                <span style={{ fontSize: 24 }}>{MOMENT_ICONS[m.type] || "🃏"}</span>
                <p style={{ color: "#d97706", fontSize: 14, margin: 0, lineHeight: 1.4 }}>
                  <strong style={{ color: "#fbbf24" }}>{m.playerName}</strong>{" "}
                  <span style={{ color: "#a16207" }}>{MOMENT_LABELS[m.type] || m.type}</span>
                  {m.detail ? <span style={{ color: "#78350f" }}> — {m.detail}</span> : ""}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Full game log */}
      <div style={{ padding: "0 20px 20px" }}>
        <button onClick={() => setShowAll(!showAll)} style={{ background: "none", border: "1px solid #1c0900", borderRadius: 8, color: "#78350f", fontSize: 12, cursor: "pointer", padding: "7px 16px", marginBottom: 10 }}>
          {showAll ? "Hide" : "Show"} full game log
        </button>
        {showAll && (
          <div style={{ background: "rgba(0,0,0,0.5)", border: "1px solid #1a0900", borderRadius: 10, padding: "10px 14px", maxHeight: 180, overflowY: "auto" }}>
            {moments.map((m, i) => (
              <p key={i} style={{ color: "#78350f", fontSize: 11, margin: "0 0 3px" }}>
                {MOMENT_ICONS[m.type] || "·"} {m.playerName} {MOMENT_LABELS[m.type] || m.type}
              </p>
            ))}
          </div>
        )}
      </div>

      {/* Player stats */}
      <div style={{ padding: "0 20px 20px" }}>
        <p style={{ color: "#78350f", fontSize: 10, textTransform: "uppercase", letterSpacing: 3, margin: "0 0 12px", textAlign: "center" }}>Players</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {allPlayers.map((p) => {
            const isWinner = p.id === meta.winner;
            const playerMoments = moments.filter((m) => m.playerUid === p.id);
            const survived = playerMoments.filter((m) => m.type === "survived").length;
            const caught = playerMoments.filter((m) => m.type === "caught").length;
            return (
              <div key={p.id} style={{
                borderRadius: 12, padding: "12px 14px",
                background: isWinner ? "rgba(217,119,6,0.12)" : "rgba(0,0,0,0.3)",
                border: `1px solid ${isWinner ? "#d97706" : "#1c0900"}`,
              }}>
                <p style={{ color: isWinner ? "#fbbf24" : "#d97706", fontWeight: 700, fontSize: 14, margin: "0 0 6px" }}>
                  {isWinner ? "🏆 " : p.alive ? "" : "💀 "}{p.name}
                </p>
                <p style={{ color: "#78350f", fontSize: 11, margin: "0 0 2px" }}>😰 Survived: {survived}×</p>
                <p style={{ color: "#78350f", fontSize: 11, margin: 0 }}>😈 Caught lying: {caught}×</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div style={{ padding: "0 20px 40px", display: "flex", flexDirection: "column", gap: 10 }}>
        <button onClick={onPlayAgain} style={{
          width: "100%", padding: 15, borderRadius: 14, fontWeight: 900, fontSize: 16, letterSpacing: 2,
          border: "2px solid #d97706", background: "linear-gradient(135deg, #b45309, #7c2d12)",
          color: "#fef3c7", cursor: "pointer",
        }}>
          PLAY AGAIN
        </button>
        <button onClick={onExit} style={{
          width: "100%", padding: 13, borderRadius: 14, fontWeight: 700, fontSize: 15,
          border: "1px solid #3b1200", background: "transparent", color: "#a16207", cursor: "pointer",
        }}>
          Back to menu
        </button>
      </div>
    </div>
  );
}
