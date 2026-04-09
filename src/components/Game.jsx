import { useState } from "react";
import { RANKS, CHAMBERS } from "../lib/game.js";
import {
  playCards, callBluff, acceptWin,
  proceedToRoulette, resolveRoulette, startSpin,
} from "../lib/room.js";
import RouletteScreen from "./Roulette.jsx";
import Reactions from "./Reactions.jsx";
import Summary from "./Summary.jsx";

// ─── Card ──────────────────────────────────────────────────────────────────────
function Card({ card, selected, onClick, small, faceDown }) {
  const red = card?.suit === "♥" || card?.suit === "♦";
  const w = small ? 40 : 54, h = small ? 56 : 76;

  if (faceDown) {
    return (
      <div style={{
        width: w, height: h, borderRadius: 8, flexShrink: 0,
        border: "2px solid #92400e",
        background: "linear-gradient(135deg, #1c0a00, #451a03)",
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "2px 2px 6px rgba(0,0,0,0.6)",
      }}>
        <span style={{ color: "#78350f", fontSize: small ? 16 : 20 }}>◆</span>
      </div>
    );
  }

  return (
    <div onClick={onClick} style={{
      width: w, height: h, borderRadius: 8, flexShrink: 0, userSelect: "none",
      border: `2px solid ${selected ? "#fbbf24" : "#57534e"}`,
      background: card.isJoker ? "#3b0764" : "#f5f5f4",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2,
      cursor: onClick ? "pointer" : "default", transition: "transform 0.15s",
      transform: selected ? "translateY(-10px)" : "none",
      boxShadow: selected ? "0 0 0 3px #f59e0b, 0 4px 12px rgba(0,0,0,0.5)" : "2px 2px 6px rgba(0,0,0,0.5)",
    }}>
      {card.isJoker
        ? <span style={{ fontSize: small ? 18 : 24, color: "#c084fc" }}>★</span>
        : <>
          <span style={{ fontSize: small ? 11 : 14, fontWeight: 900, color: red ? "#dc2626" : "#1c1917" }}>{card.rank}</span>
          <span style={{ fontSize: small ? 15 : 20, color: red ? "#ef4444" : "#292524" }}>{card.suit}</span>
        </>
      }
    </div>
  );
}

// ─── Exit confirm ──────────────────────────────────────────────────────────────
function ExitConfirm({ onConfirm, onCancel }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 300, background: "#080400", border: "1px solid #7c2d12", borderRadius: 18, padding: 28, textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🚪</div>
        <p style={{ color: "#d97706", fontWeight: 700, fontSize: 17, margin: "0 0 8px", fontFamily: "Georgia,serif" }}>Exit game?</p>
        <p style={{ color: "#6b7280", fontSize: 13, margin: "0 0 22px", lineHeight: 1.5 }}>You'll leave this room. Others can keep playing.</p>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onCancel} style={{ flex: 1, padding: 12, borderRadius: 10, fontWeight: 700, fontSize: 14, border: "1px solid #3b1200", background: "transparent", color: "#78350f", cursor: "pointer" }}>Cancel</button>
          <button onClick={onConfirm} style={{ flex: 1, padding: 12, borderRadius: 10, fontWeight: 700, fontSize: 14, border: "2px solid #991b1b", background: "rgba(153,27,27,0.25)", color: "#f87171", cursor: "pointer" }}>Exit</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Game ─────────────────────────────────────────────────────────────────
export default function Game({ code, room, myHand, uid, isHost, presence, onExit }) {
  const [selected, setSelected] = useState([]);
  const [busy, setBusy] = useState(false);
  const [showExit, setShowExit] = useState(false);

  const { meta, players } = room;
  const tableRank = RANKS[meta.tableRankIdx];
  const isMyTurn = meta.curUid === uid;
  const lastPlay = meta.lastPlay;
  const lastPlayedBy = lastPlay ? players[lastPlay.uid] : null;
  const canCallBluff = isMyTurn && lastPlay && lastPlay.uid !== uid;
  const isBluffing = selected.length > 0 && selected.some((c) => !c.isJoker && c.rank !== tableRank);
  const playerOrder = meta.playerOrder || [];
  const myPlayer = players[uid];

  function toggleCard(card) {
    setSelected((prev) => {
      if (prev.find((c) => c.id === card.id)) return prev.filter((c) => c.id !== card.id);
      if (prev.length >= 3) return prev;
      return [...prev, card];
    });
  }

  async function doPlayCards() {
    if (!selected.length || busy || !isMyTurn) return;
    setBusy(true);
    setSelected([]);
    try { await playCards(code, uid, selected); }
    catch (e) { console.error(e); }
    finally { setBusy(false); }
  }

  async function doCallBluff() {
    if (busy || !isMyTurn) return;
    setBusy(true);
    try { await callBluff(code, uid); }
    catch (e) { console.error(e); }
    finally { setBusy(false); }
  }

  async function doAcceptWin() {
    if (busy) return;
    setBusy(true);
    try { await acceptWin(code, lastPlay.uid); }
    catch (e) { console.error(e); }
    finally { setBusy(false); }
  }

  async function doRoulette() {
    if (busy) return;
    setBusy(true);
    try { await proceedToRoulette(code); }
    catch (e) { console.error(e); }
    finally { setBusy(false); }
  }

  async function handleRouletteResult(isBang) {
    try { await resolveRoulette(code, isBang); }
    catch (e) { console.error(e); }
  }

  // ── Phase: Roulette ──────────────────────────────────────────────────────────
  if ((meta.phase === "roulette" || meta.phase === "roulette_spinning") && meta.revealData) {
    const { revealData } = meta;
    const loser = players[revealData.loserUid];
    const iAmLoser = revealData.loserUid === uid;
    const canPull = iAmLoser || isHost;

    async function handleRouletteAction(action) {
      if (action && typeof action === "object" && action.type === "pull") {
        await startSpin(code, action.spinTarget);
      } else {
        await handleRouletteResult(action);
      }
    }

    return (
      <RouletteScreen
        loserName={loser?.name || "?"}
        reason={revealData.wasLying
          ? `Caught lying — not all ${tableRank}s`
          : `Called a bluff incorrectly — ${revealData.accusedName} was honest`}
        bulletChamber={meta.bullet}
        currentChamber={meta.shots}
        onResult={handleRouletteAction}
        canResolve={canPull}
        spinning={meta.phase === "roulette_spinning"}
        spinTarget={meta.spinTarget || null}
      />
    );
  }

  // ── Phase: Win ───────────────────────────────────────────────────────────────
  if (meta.phase === "win" || meta.status === "finished") {
    return (
      <Summary
        code={code}
        room={room}
        uid={uid}
        onPlayAgain={onExit}
        onExit={onExit}
      />
    );
  }

  // ── Phase: Reveal ────────────────────────────────────────────────────────────
  if (meta.phase === "reveal" && meta.revealData) {
    const { revealData } = meta;
    const loser = players[revealData.loserUid];
    const iAmLoser = revealData.loserUid === uid;
    const iAmHost = isHost;
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "radial-gradient(ellipse, #0a0200, #000)", padding: 24 }}>
        <div style={{ textAlign: "center", maxWidth: 360 }}>
          <p style={{ color: "#4b5563", fontSize: 11, letterSpacing: 4, textTransform: "uppercase", margin: "0 0 6px" }}>Cards Revealed</p>
          <p style={{ color: "#9ca3af", fontSize: 13, margin: "0 0 24px" }}>
            {revealData.callerName} called {revealData.accusedName}'s bluff
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap", marginBottom: 24 }}>
            {(lastPlay?.cards || []).map((card) => <Card key={card.id} card={card} />)}
          </div>
          <div style={{
            borderRadius: 14, padding: "18px 20px", marginBottom: 24,
            border: `2px solid ${revealData.wasLying ? "#7f1d1d" : "#14532d"}`,
            background: revealData.wasLying ? "rgba(127,29,29,0.2)" : "rgba(20,83,45,0.2)",
          }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>{revealData.wasLying ? "😈" : "😇"}</div>
            <p style={{ color: revealData.wasLying ? "#f87171" : "#34d399", fontWeight: 700, fontSize: 17, margin: "0 0 6px" }}>
              {revealData.wasLying ? `${revealData.accusedName} was LYING!` : `${revealData.accusedName} was honest!`}
            </p>
            <p style={{ color: "#6b7280", fontSize: 13, margin: 0 }}>
              {revealData.wasLying ? `Cards weren't all ${tableRank}s` : `All cards were valid ${tableRank}s or jokers`}
            </p>
          </div>
          <div style={{ background: "rgba(127,29,29,0.15)", border: "1px solid #450a0a", borderRadius: 12, padding: "14px 18px", marginBottom: 20 }}>
            <p style={{ color: "#9ca3af", fontSize: 13, margin: "0 0 2px" }}>Facing the revolver:</p>
            <p style={{ color: "#f87171", fontWeight: 900, fontSize: 20, fontFamily: "Georgia,serif", margin: 0 }}>{loser?.name}</p>
          </div>
          {/* Only the loser (or host as fallback) proceeds to pull the trigger */}
          {(iAmLoser || (iAmHost && !revealData.loserUid)) ? (
            <button onClick={doRoulette} disabled={busy} style={{
              width: "100%", padding: 14, borderRadius: 12,
              background: "#3f0808", border: "2px solid #991b1b", color: "#fecaca",
              fontFamily: "Georgia,serif", fontSize: 16, fontWeight: 900, cursor: "pointer", letterSpacing: 2,
            }}>
              {iAmLoser ? "PULL THE TRIGGER →" : "PROCEED →"}
            </button>
          ) : (
            <p style={{ color: "#374151", fontSize: 13, fontStyle: "italic" }}>
              Waiting for {loser?.name} to pull the trigger…
            </p>
          )}
        </div>
      </div>
    );
  }

  // ── Phase: winPending ────────────────────────────────────────────────────────
  if (meta.phase === "winPending" && isMyTurn && lastPlay && lastPlay.uid !== uid) {
    const prevPlayer = players[lastPlay.uid];
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "radial-gradient(ellipse, #0a0800, #000)", padding: 24 }}>
        <div style={{ textAlign: "center", maxWidth: 340 }}>
          <div style={{ fontSize: 52, marginBottom: 12 }}>🃏</div>
          <h2 style={{ color: "#fbbf24", fontSize: 26, fontFamily: "Georgia,serif", fontWeight: 900, margin: "0 0 6px" }}>{prevPlayer?.name}</h2>
          <p style={{ color: "#6b7280", fontSize: 14, margin: "0 0 4px" }}>played their last cards, claiming:</p>
          <p style={{ color: "#d97706", fontSize: 28, fontWeight: 900, fontFamily: "Georgia,serif", margin: "0 0 28px" }}>
            {lastPlay.count}× {tableRank}
          </p>
          <p style={{ color: "#9ca3af", fontSize: 13, margin: "0 0 14px" }}>{myPlayer?.name} — what do you do?</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <button onClick={doAcceptWin} disabled={busy} style={{
              padding: 14, borderRadius: 12, fontWeight: 900, fontSize: 15,
              border: "2px solid #15803d", background: "rgba(21,128,61,0.2)", color: "#34d399", cursor: "pointer",
            }}>✓ Accept — {prevPlayer?.name} wins!</button>
            <button onClick={doCallBluff} disabled={busy} style={{
              padding: 14, borderRadius: 12, fontWeight: 900, fontSize: 15,
              border: "2px solid #991b1b", background: "rgba(153,27,27,0.2)", color: "#f87171", cursor: "pointer",
            }}>😤 CALL LIAR!</button>
          </div>
        </div>
      </div>
    );
  }

  // ── Phase: turn (main game board) ─────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#000" }}>
      {showExit && <ExitConfirm onConfirm={onExit} onCancel={() => setShowExit(false)} />}

      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderBottom: "1px solid #1a0900", overflowX: "auto" }}>
        {playerOrder.map((puid) => {
          const p = players[puid];
          if (!p) return null;
          const isActive = meta.curUid === puid;
          const isDead = !p.alive;
          return (
            <div key={puid} style={{
              flexShrink: 0, borderRadius: 10, padding: "6px 10px",
              border: `1px solid ${isActive ? "#d97706" : "#3b1200"}`,
              background: isActive ? "rgba(217,119,6,0.15)" : "transparent",
              opacity: isDead ? 0.3 : 1,
            }}>
              <p style={{ color: isActive ? "#fbbf24" : "#78350f", fontSize: 11, fontWeight: 700, margin: 0, whiteSpace: "nowrap" }}>
                {p.name}{puid === uid ? " (you)" : ""}{isDead ? " 💀" : ""}
              </p>
              <p style={{ color: "#3b1200", fontSize: 10, margin: 0 }}>
                {p.alive ? `${p.cardCount} card${p.cardCount !== 1 ? "s" : ""}` : "out"}
              </p>
            </div>
          );
        })}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <div style={{ textAlign: "center" }}>
            <p style={{ color: "#3b1200", fontSize: 9, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 2px" }}>Rank</p>
            <div style={{ width: 36, height: 50, borderRadius: 6, border: "2px solid #92400e", background: "#0d0d0d", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: "#d97706", fontSize: 16, fontWeight: 900 }}>{tableRank}</span>
            </div>
          </div>
          <button onClick={() => setShowExit(true)} style={{ padding: "6px 10px", borderRadius: 7, border: "1px solid #3b1200", background: "transparent", color: "#3b1200", fontSize: 12, cursor: "pointer" }}>✕</button>
        </div>
      </div>

      {/* Table */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <div style={{
          borderRadius: 20, border: "4px solid #92400e", padding: 24,
          display: "flex", flexDirection: "column", alignItems: "center", minWidth: 220,
          background: "radial-gradient(ellipse, #14532d 0%, #052e16 100%)",
          boxShadow: "inset 0 0 30px rgba(0,0,0,0.6), 0 8px 32px rgba(0,0,0,0.8)",
          marginBottom: 20,
        }}>
          <p style={{ color: "#166534", fontSize: 10, textTransform: "uppercase", letterSpacing: 3, margin: "0 0 12px" }}>Cards on table</p>
          {!lastPlay ? (
            <p style={{ color: "#14532d", fontSize: 13, fontStyle: "italic" }}>Empty — play first</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
              <div style={{ display: "flex", gap: 6 }}>
                {Array.from({ length: lastPlay.count }).map((_, i) => (
                  <Card key={i} card={{ rank: "", suit: "", id: `pile-${i}` }} faceDown small />
                ))}
              </div>
              <p style={{ color: "#22c55e", fontSize: 12, margin: 0 }}>
                {lastPlay.playerName} claimed {lastPlay.count}× <strong style={{ color: "#fbbf24" }}>{tableRank}</strong>
              </p>
            </div>
          )}
        </div>

        {/* Call bluff (shown when it's my turn and there's a previous play) */}
        {canCallBluff && (
          <button onClick={doCallBluff} disabled={busy} style={{
            padding: "13px 28px", borderRadius: 12, fontWeight: 900, fontSize: 15,
            border: "2px solid #991b1b", background: "rgba(153,27,27,0.2)", color: "#f87171",
            cursor: busy ? "not-allowed" : "pointer",
            boxShadow: "0 0 15px rgba(220,38,38,0.25)",
          }}>
            😤 CALL LIAR!
          </button>
        )}

        {/* Waiting message */}
        {!isMyTurn && meta.phase === "turn" && (
          <div style={{ textAlign: "center", marginTop: 8 }}>
            <p style={{ color: "#374151", fontSize: 13, fontStyle: "italic", margin: "0 0 4px" }}>
              Waiting for {players[meta.curUid]?.name}…
            </p>
          </div>
        )}
      </div>

      {/* Hand panel (only shown on your turn) */}
      {isMyTurn && meta.phase === "turn" && myPlayer?.alive && (
        <div style={{ borderTop: "1px solid #1a0900", padding: 16, background: "rgba(0,0,0,0.6)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div>
              <p style={{ color: "#78350f", fontSize: 10, textTransform: "uppercase", letterSpacing: 3, margin: 0 }}>Your turn</p>
              <p style={{ color: "#d97706", fontWeight: 700, fontSize: 16, fontFamily: "Georgia,serif", margin: 0 }}>
                {myPlayer?.name}
              </p>
            </div>
            <p style={{ color: "#374151", fontSize: 11 }}>Select 1–3 cards</p>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", marginBottom: 12 }}>
            {myHand.map((card) => (
              <Card key={card.id} card={card}
                selected={!!selected.find((c) => c.id === card.id)}
                onClick={() => toggleCard(card)}
                small />
            ))}
            {myHand.length === 0 && <p style={{ color: "#3b1200", fontStyle: "italic", fontSize: 13 }}>No cards in hand</p>}
          </div>

          {selected.length > 0 && (
            <p style={{
              textAlign: "center", fontSize: 12, marginBottom: 10,
              color: isBluffing ? "#f87171" : "#34d399",
            }}>
              {isBluffing ? "⚠️ Bluffing!" : "✓ Telling the truth"}
            </p>
          )}

          <button onClick={doPlayCards} disabled={!selected.length || busy} style={{
            width: "100%", padding: 13, borderRadius: 12, fontWeight: 900, fontSize: 15,
            border: `2px solid ${selected.length ? "#d97706" : "#1c0900"}`,
            background: selected.length ? "linear-gradient(135deg, #b45309, #7c2d12)" : "#0a0400",
            color: selected.length ? "#fef3c7" : "#451a03",
            cursor: selected.length && !busy ? "pointer" : "not-allowed",
            boxShadow: selected.length ? "0 4px 20px rgba(180,83,9,0.3)" : "none",
          }}>
            {selected.length ? `Play ${selected.length} card${selected.length !== 1 ? "s" : ""} as ${tableRank}` : "Select cards to play"}
          </button>
        </div>
      )}

      {/* Gun status */}
      <div style={{ padding: "8px 16px", borderTop: "1px solid #1a0900", display: "flex", alignItems: "center", gap: 10, background: "rgba(0,0,0,0.7)" }}>
        <span style={{ fontSize: 14 }}>🔫</span>
        <div style={{ display: "flex", gap: 5 }}>
          {Array.from({ length: CHAMBERS }, (_, i) => (
            <div key={i} style={{ width: 12, height: 12, borderRadius: "50%", border: "1px solid #3b1200", background: i < meta.shots ? "rgba(127,29,29,0.7)" : "#0a0a0a" }} />
          ))}
        </div>
        <span style={{ color: "#3b1200", fontSize: 11 }}>
          {meta.shots} shot{meta.shots !== 1 ? "s" : ""} fired · {CHAMBERS - meta.shots} remain
        </span>
      </div>
    </div>
  );
}
