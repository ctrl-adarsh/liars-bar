import { useState, useEffect } from "react";
import { ref, onValue } from "firebase/database";
import { db } from "../firebase.js";

export default function Leaderboard({ onClose }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onValue(ref(db, "leaderboard"), (snap) => {
      const data = snap.val() || {};
      const sorted = Object.entries(data)
        .map(([uid, v]) => ({ uid, ...v }))
        .sort((a, b) => b.wins - a.wins || b.gamesPlayed - a.gamesPlayed)
        .slice(0, 20);
      setEntries(sorted);
      setLoading(false);
    });
    return unsub;
  }, []);

  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.95)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300, padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 380, background: "#080400", border: "1px solid #451a03", borderRadius: 20, overflow: "hidden", maxHeight: "85vh", display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid #1a0900", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h2 style={{ color: "#d97706", fontSize: 22, fontFamily: "Georgia,serif", fontWeight: 900, margin: 0 }}>🏆 Leaderboard</h2>
            <p style={{ color: "#78350f", fontSize: 11, margin: 0, letterSpacing: 2, textTransform: "uppercase" }}>Global wins</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "1px solid #3b1200", borderRadius: 8, color: "#a16207", fontSize: 18, cursor: "pointer", width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>

        {/* List */}
        <div style={{ overflowY: "auto", flex: 1, padding: "12px 16px" }}>
          {loading ? (
            <p style={{ color: "#451a03", textAlign: "center", fontStyle: "italic", padding: 24 }}>Loading…</p>
          ) : entries.length === 0 ? (
            <p style={{ color: "#451a03", textAlign: "center", fontStyle: "italic", padding: 24 }}>No games played yet. Be the first!</p>
          ) : (
            entries.map((e, i) => (
              <div key={e.uid} style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "12px 14px", borderRadius: 12, marginBottom: 8,
                background: i === 0 ? "rgba(217,119,6,0.12)" : "rgba(59,18,0,0.2)",
                border: `1px solid ${i === 0 ? "#451a03" : "#1c0900"}`,
              }}>
                <span style={{ fontSize: i < 3 ? 22 : 14, minWidth: 28, textAlign: "center", color: "#a16207", fontWeight: 700 }}>
                  {i < 3 ? medals[i] : `#${i + 1}`}
                </span>
                <div style={{ flex: 1 }}>
                  <p style={{ color: i === 0 ? "#fbbf24" : "#d97706", fontWeight: 700, fontSize: 15, margin: 0 }}>{e.name}</p>
                  <p style={{ color: "#78350f", fontSize: 11, margin: 0 }}>{e.gamesPlayed ?? 0} game{e.gamesPlayed !== 1 ? "s" : ""} played</p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ color: "#d97706", fontSize: 22, fontWeight: 900, fontFamily: "Georgia,serif", margin: 0, lineHeight: 1 }}>{e.wins}</p>
                  <p style={{ color: "#78350f", fontSize: 10, margin: 0, textTransform: "uppercase", letterSpacing: 1 }}>wins</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
