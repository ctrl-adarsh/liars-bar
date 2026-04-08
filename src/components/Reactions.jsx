import { useState, useEffect, useRef } from "react";
import { ref, push, set, onValue } from "firebase/database";
import { db } from "../firebase.js";

const EMOJIS = ["👀", "😱", "💀", "🔥", "😂", "🎰"];

export function sendReaction(code, uid, name, emoji) {
  const r = push(ref(db, `rooms/${code}/reactions`));
  return set(r, { uid, name, emoji, ts: Date.now() });
}

export default function Reactions({ code, uid, name }) {
  const [floating, setFloating] = useState([]);
  const seenRef = useRef(new Set());

  useEffect(() => {
    const r = ref(db, `rooms/${code}/reactions`);
    const unsub = onValue(r, (snap) => {
      const data = snap.val();
      if (!data) return;
      const now = Date.now();
      Object.entries(data).forEach(([key, val]) => {
        if (seenRef.current.has(key)) return;
        if (now - val.ts > 6000) return; // ignore stale
        seenRef.current.add(key);
        const left = 8 + Math.random() * 75;
        const id = key;
        setFloating((prev) => [...prev.slice(-10), { id, emoji: val.emoji, name: val.name, left }]);
        setTimeout(() => setFloating((prev) => prev.filter((f) => f.id !== id)), 3200);
      });
    });
    return unsub;
  }, [code]);

  function send(emoji) {
    sendReaction(code, uid, name, emoji);
  }

  return (
    <>
      {/* Floating toasts */}
      <div style={{ position: "fixed", bottom: 90, left: 0, right: 0, pointerEvents: "none", zIndex: 50, overflow: "hidden", height: 260 }}>
        <style>{`
          @keyframes floatUp {
            0%   { transform: translateY(0);     opacity: 1; }
            80%  { transform: translateY(-180px); opacity: 0.9; }
            100% { transform: translateY(-220px); opacity: 0; }
          }
        `}</style>
        {floating.map((f) => (
          <div key={f.id} style={{
            position: "absolute", bottom: 0, left: `${f.left}%`,
            animation: "floatUp 3.2s ease-out forwards",
            textAlign: "center", lineHeight: 1,
          }}>
            <div style={{ fontSize: 28 }}>{f.emoji}</div>
            <div style={{ fontSize: 10, color: "#9ca3af", whiteSpace: "nowrap", marginTop: 2 }}>{f.name}</div>
          </div>
        ))}
      </div>

      {/* Emoji bar */}
      <div style={{
        display: "flex", justifyContent: "center", gap: 6,
        padding: "8px 12px", borderTop: "1px solid #1a0900",
        background: "rgba(0,0,0,0.5)",
      }}>
        {EMOJIS.map((e) => (
          <button key={e} onClick={() => send(e)} style={{
            background: "none", border: "1px solid #3b1200",
            borderRadius: 8, padding: "5px 7px", fontSize: 20,
            cursor: "pointer", transition: "transform 0.1s, border-color 0.1s",
          }}
            onMouseDown={(ev) => ev.currentTarget.style.transform = "scale(0.82)"}
            onMouseUp={(ev) => ev.currentTarget.style.transform = "scale(1)"}
            onMouseLeave={(ev) => ev.currentTarget.style.transform = "scale(1)"}
          >
            {e}
          </button>
        ))}
      </div>
    </>
  );
}
