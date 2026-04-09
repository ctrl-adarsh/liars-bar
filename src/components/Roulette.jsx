import { useState, useRef, useEffect } from "react";
import { CHAMBERS } from "../lib/game.js";

function Revolver({ bulletChamber, currentChamber, rotation, revealed }) {
  const S = 220, cx = 110, cy = 110, ringR = 60, chamR = 18;
  return (
    <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`}>
      <circle cx={cx} cy={cy} r={88} fill="#0c0c0c" stroke="#2a2a2a" strokeWidth="4" />
      <circle cx={cx} cy={cy} r={80} fill="#111" stroke="#1a1a1a" strokeWidth="1" />
      {Array.from({ length: CHAMBERS }, (_, i) => {
        const deg = (i * 60 - 90 + rotation) % 360;
        const rad = (deg * Math.PI) / 180;
        const x = cx + ringR * Math.cos(rad), y = cy + ringR * Math.sin(rad);
        const isCurr = i === currentChamber % CHAMBERS;
        const hasBullet = revealed && i === bulletChamber;
        return (
          <g key={i}>
            <circle cx={x} cy={y} r={chamR}
              fill={hasBullet ? "#7f1d1d" : isCurr ? "#1c0a00" : "#080808"}
              stroke={isCurr ? "#f59e0b" : hasBullet ? "#b91c1c" : "#1a1a1a"}
              strokeWidth={isCurr ? 2.5 : 1.5} />
            {hasBullet && <>
              <circle cx={x} cy={y} r={10} fill="#b91c1c" />
              <circle cx={x} cy={y} r={5} fill="#fca5a5" />
            </>}
            {isCurr && !hasBullet && <circle cx={x} cy={y} r={6} fill="#d97706" opacity={0.9} />}
          </g>
        );
      })}
      <circle cx={cx} cy={cy} r={11} fill="#1f1f1f" stroke="#333" strokeWidth="1.5" />
      <rect x={cx + 74} y={cy - 14} width={44} height={28} rx={6} fill="#090909" stroke="#1a1a1a" strokeWidth="2" />
    </svg>
  );
}

export default function RouletteScreen({
  loserName, reason, bulletChamber, currentChamber,
  onResult, canResolve, spinning, spinTarget,
}) {
  const [phase, setPhase] = useState("ready");
  const [rot, setRot] = useState(0);
  const animRef = useRef(null);
  const hasSpunRef = useRef(false);

  // Watch for spinning + spinTarget — start animation on ALL clients
  useEffect(() => {
    if (!spinning) return;
    if (hasSpunRef.current) return;
    // Wait for spinTarget to arrive (may lag 1 tick behind spinning)
    if (spinTarget == null) return;
    hasSpunRef.current = true;
    runAnimation(spinTarget);
  }); // no dependency array — runs every render, guarded by hasSpunRef

  function runAnimation(target) {
    setPhase("spinning");
    const t0 = Date.now(), dur = 2200;
    (function step() {
      const t = Math.min((Date.now() - t0) / dur, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setRot(eased * target);
      if (t < 1) {
        animRef.current = requestAnimationFrame(step);
      } else {
        setRot(target);
        const bang = currentChamber % CHAMBERS === bulletChamber;
        setPhase(bang ? "bang" : "click");
        if (canResolve) {
          setTimeout(() => onResult(bang), 2800);
        }
      }
    })();
  }

  function handlePull() {
    if (phase !== "ready" || !canResolve) return;
    const fullSpins = (5 + Math.floor(Math.random() * 5)) * 360;
    const chamberOffset = (currentChamber % CHAMBERS) * 60;
    const target = fullSpins + chamberOffset;
    onResult({ type: "pull", spinTarget: target });
  }

  useEffect(() => () => cancelAnimationFrame(animRef.current), []);

  const revealed = phase === "bang" || phase === "click";
  const emptyLeft = CHAMBERS - (currentChamber % CHAMBERS) - 1;

  return (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", padding: 24,
      background: phase === "bang" ? "#1a0000" : "#000",
      transition: "background 1s",
    }}>
      <style>{`@keyframes pulse{0%,100%{opacity:0.2}50%{opacity:1}}`}</style>
      <div style={{ textAlign: "center", maxWidth: 340 }}>
        <p style={{ color: "#9ca3af", fontSize: 11, letterSpacing: 5, textTransform: "uppercase", margin: "0 0 8px" }}>
          ☠ Russian Roulette
        </p>

        {(phase === "ready" || phase === "spinning") && (
          <>
            <h2 style={{ color: "#f87171", fontSize: 26, fontFamily: "Georgia,serif", fontWeight: 900, margin: "0 0 6px" }}>
              {loserName}
            </h2>
            <p style={{ color: "#9ca3af", fontSize: 12, margin: "0 0 20px", lineHeight: 1.5 }}>{reason}</p>
          </>
        )}

        <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
          <Revolver bulletChamber={bulletChamber} currentChamber={currentChamber} rotation={rot} revealed={revealed} />
        </div>

        <p style={{ color: "#9ca3af", fontSize: 12, margin: "0 0 20px" }}>
          Chamber {(currentChamber % CHAMBERS) + 1} of {CHAMBERS}
          {phase === "ready" && emptyLeft > 0 ? ` · ${emptyLeft} empty remaining` : ""}
        </p>

        {phase === "ready" && (
          canResolve ? (
            <button onClick={handlePull} style={{
              padding: "15px 52px", borderRadius: 14,
              background: "#3f0808", border: "2px solid #991b1b", color: "#fecaca",
              fontFamily: "Georgia,serif", fontSize: 18, fontWeight: 900,
              cursor: "pointer", letterSpacing: 3,
              boxShadow: "0 0 30px rgba(153,27,27,0.4)",
            }}>
              PULL TRIGGER
            </button>
          ) : (
            <div>
              <p style={{ color: "#9ca3af", fontSize: 13, fontStyle: "italic", marginBottom: 12 }}>
                Watching {loserName} pull the trigger…
              </p>
              <div style={{ display: "flex", justifyContent: "center", gap: 8 }}>
                {[0,1,2].map(i => (
                  <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: "#7f1d1d",
                    animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />
                ))}
              </div>
            </div>
          )
        )}

        {phase === "spinning" && (
          <p style={{ color: "#9ca3af", fontSize: 13, fontStyle: "italic" }}>…</p>
        )}

        {phase === "bang" && (
          <>
            <div style={{ fontSize: 72, lineHeight: 1, marginBottom: 14 }}>💥</div>
            <h2 style={{ color: "#ef4444", fontSize: 48, fontFamily: "Georgia,serif", margin: "0 0 10px", fontWeight: 900, letterSpacing: 3 }}>BANG!</h2>
            <p style={{ color: "#9ca3af", fontSize: 16 }}>{loserName} is eliminated.</p>
          </>
        )}

        {phase === "click" && (
          <>
            <div style={{ fontSize: 72, lineHeight: 1, marginBottom: 14 }}>😰</div>
            <h2 style={{ color: "#10b981", fontSize: 38, fontFamily: "Georgia,serif", margin: "0 0 10px", fontWeight: 900 }}>*click*</h2>
            <p style={{ color: "#9ca3af", fontSize: 15 }}>{loserName} survives… this time.</p>
            <p style={{ color: "#9ca3af", fontSize: 12, marginTop: 6 }}>
              {emptyLeft} empty {emptyLeft === 1 ? "chamber" : "chambers"} remain.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
