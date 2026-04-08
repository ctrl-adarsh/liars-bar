import { useEffect, useState } from "react";
import { ref, onValue } from "firebase/database";
import { db } from "../firebase.js";
import { RANKS, CHAMBERS } from "../lib/game.js";
import Reactions from "./Reactions.jsx";

function PlayerCard({ player, uid, isActive, puid, cardCount }) {
  const isMe = puid === uid;
  const isDead = !player.alive;
  return (
    <div style={{
      borderRadius: 12, padding: "12px 14px",
      border: `1px solid ${isActive ? "#d97706" : "#1a0900"}`,
      background: isActive ? "rgba(217,119,6,0.12)" : "rgba(0,0,0,0.3)",
      opacity: isDead ? 0.4 : 1, transition: "all 0.3s",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <div style={{
          width: 32, height: 32, borderRadius: "50%",
          background: isActive ? "#451a03" : "#1c0900",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: isActive ? "#fbbf24" : "#78350f", fontSize: 13, fontWeight: 700,
        }}>
          {player.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <p style={{ color: isActive ? "#fbbf24" : "#d97706", fontWeight: 700, fontSize: 13, margin: 0 }}>
            {player.name} {isDead && "💀"}
          </p>
          <p style={{ color: "#a16207", fontSize: 11, margin: 0 }}>
            {player.alive ? `${cardCount ?? 0} card${cardCount !== 1 ? "s" : ""}` : "eliminated"}
          </p>
        </div>
        {isActive && !isDead && (
          <div style={{ marginLeft: "auto", width: 8, height: 8, borderRadius: "50%", background: "#d97706", animation: "pulse 1s infinite" }} />
        )}
      </div>
      {/* Card count pips */}
      {player.alive && (
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {Array.from({ length: cardCount ?? 0 }).map((_, i) => (
            <div key={i} style={{ width: 14, height: 20, borderRadius: 3, background: "#1c0900", border: "1px solid #451a03" }} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Spectator({ code, room, uid, name, onExit }) {
  const [log, setLog] = useState([]);

  const { meta, players } = room;
  const tableRank = RANKS[meta.tableRankIdx];
  const lastPlay = meta.lastPlay;
  const playerOrder = meta.playerOrder || [];

  // Subscribe to game log
  useEffect(() => {
    const r = ref(db, `rooms/${code}/log`);
    const unsub = onValue(r, (snap) => {
      const data = snap.val();
      if (!data) return;
      const entries = Object.values(data).sort((a, b) => a.ts - b.ts).slice(-20);
      setLog(entries);
    });
    return unsub;
  }, [code]);

  const spectatorCount = Object.keys(room.spectators || {}).length;

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#000" }}>
      <style>{`@keyframes pulse{0%,100%{opacity:0.3}50%{opacity:1}}`}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderBottom: "1px solid #1a0900" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 10, padding: "3px 8px", borderRadius: 20, background: "rgba(217,119,6,0.15)", border: "1px solid #451a03", color: "#d97706", textTransform: "uppercase", letterSpacing: 2 }}>
            Spectating
          </span>
          <span style={{ color: "#a16207", fontSize: 12, fontFamily: "monospace" }}>{code}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {spectatorCount > 0 && (
            <span style={{ color: "#a16207", fontSize: 11 }}>👁 {spectatorCount}</span>
          )}
          <div style={{ textAlign: "center" }}>
            <p style={{ color: "#a16207", fontSize: 9, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 2px" }}>Rank</p>
            <div style={{ width: 34, height: 46, borderRadius: 6, border: "2px solid #92400e", background: "#0d0d0d", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: "#d97706", fontSize: 15, fontWeight: 900 }}>{tableRank}</span>
            </div>
          </div>
          <button onClick={onExit} style={{ padding: "6px 10px", borderRadius: 7, border: "1px solid #3b1200", background: "transparent", color: "#a16207", fontSize: 12, cursor: "pointer" }}>✕</button>
        </div>
      </div>

      {/* Player grid */}
      <div style={{ padding: "12px 14px", borderBottom: "1px solid #1a0900" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
          {playerOrder.map((puid) => {
            const p = players[puid];
            if (!p) return null;
            return (
              <PlayerCard
                key={puid}
                player={p}
                uid={uid}
                puid={puid}
                isActive={meta.curUid === puid}
                cardCount={p.cardCount}
              />
            );
          })}
        </div>
      </div>

      {/* Table */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <div style={{
          borderRadius: 20, border: "4px solid #92400e", padding: 24,
          display: "flex", flexDirection: "column", alignItems: "center", minWidth: 220,
          background: "radial-gradient(ellipse, #14532d 0%, #052e16 100%)",
          boxShadow: "inset 0 0 30px rgba(0,0,0,0.6), 0 8px 32px rgba(0,0,0,0.8)",
          marginBottom: 16,
        }}>
          <p style={{ color: "#4ade80", fontSize: 10, textTransform: "uppercase", letterSpacing: 3, margin: "0 0 12px" }}>Cards on table</p>
          {!lastPlay ? (
            <p style={{ color: "#166534", fontSize: 13, fontStyle: "italic" }}>Empty — waiting for first play</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
              <div style={{ display: "flex", gap: 6 }}>
                {Array.from({ length: lastPlay.count }).map((_, i) => (
                  <div key={i} style={{ width: 32, height: 46, borderRadius: 6, border: "1px solid #3b1200", background: "#0a0500", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ color: "#451a03", fontSize: 14 }}>◆</span>
                  </div>
                ))}
              </div>
              <p style={{ color: "#4ade80", fontSize: 12, margin: 0 }}>
                {lastPlay.playerName} claimed {lastPlay.count}× <strong style={{ color: "#fbbf24" }}>{tableRank}</strong>
              </p>
              {lastPlay.revealed && (
                <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                  {lastPlay.cards?.map((card) => {
                    const red = card.suit === "♥" || card.suit === "♦";
                    return (
                      <div key={card.id} style={{ width: 38, height: 54, borderRadius: 7, background: card.isJoker ? "#3b0764" : "#f5f5f4", border: "2px solid #57534e", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2 }}>
                        {card.isJoker
                          ? <span style={{ fontSize: 18, color: "#c084fc" }}>★</span>
                          : <>
                            <span style={{ fontSize: 11, fontWeight: 900, color: red ? "#dc2626" : "#1c1917" }}>{card.rank}</span>
                            <span style={{ fontSize: 16, color: red ? "#ef4444" : "#292524" }}>{card.suit}</span>
                          </>
                        }
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Phase indicator */}
        <div style={{ textAlign: "center", marginBottom: 8 }}>
          {meta.phase === "turn" && (
            <p style={{ color: "#9ca3af", fontSize: 13, fontStyle: "italic", margin: 0 }}>
              {players[meta.curUid]?.name}'s turn
            </p>
          )}
          {meta.phase === "roulette" && (
            <p style={{ color: "#f87171", fontSize: 13, fontStyle: "italic", margin: 0 }}>
              ☠ Russian Roulette in progress…
            </p>
          )}
          {meta.phase === "reveal" && (
            <p style={{ color: "#fbbf24", fontSize: 13, fontStyle: "italic", margin: 0 }}>
              🃏 Cards being revealed…
            </p>
          )}
          {meta.phase === "win" && (
            <p style={{ color: "#d97706", fontSize: 15, fontWeight: 700, margin: 0 }}>
              🏆 {players[meta.winner]?.name} wins!
            </p>
          )}
        </div>

        {/* Game log */}
        <div style={{ width: "100%", maxWidth: 340, background: "rgba(0,0,0,0.5)", border: "1px solid #1a0900", borderRadius: 10, padding: "10px 12px", maxHeight: 120, overflowY: "auto" }}>
          {log.length === 0
            ? <p style={{ color: "#3b1200", fontSize: 11, fontStyle: "italic", margin: 0, textAlign: "center" }}>Game events will appear here</p>
            : log.map((entry, i) => (
              <p key={i} style={{ color: "#a16207", fontSize: 11, margin: "0 0 3px" }}>{entry.msg}</p>
            ))
          }
        </div>
      </div>

      {/* Revolver status */}
      <div style={{ padding: "8px 16px", borderTop: "1px solid #1a0900", display: "flex", alignItems: "center", gap: 10, background: "rgba(0,0,0,0.6)" }}>
        <span style={{ fontSize: 14 }}>🔫</span>
        <div style={{ display: "flex", gap: 5 }}>
          {Array.from({ length: CHAMBERS }, (_, i) => (
            <div key={i} style={{ width: 12, height: 12, borderRadius: "50%", border: "1px solid #3b1200", background: i < meta.shots ? "rgba(127,29,29,0.7)" : "#0a0a0a" }} />
          ))}
        </div>
        <span style={{ color: "#a16207", fontSize: 11 }}>
          {meta.shots} shot{meta.shots !== 1 ? "s" : ""} fired · {CHAMBERS - meta.shots} remain
        </span>
      </div>

      {/* Reactions */}
      <Reactions code={code} uid={uid} name={name} />
    </div>
  );
}
