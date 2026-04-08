// ─── Pure game logic (no Firebase, no React) ───────────────────────────────────

export const RANKS = ["A", "K", "Q"];
const SUITS = ["♠", "♥", "♦", "♣"];
const CHAMBERS = 6;

export { CHAMBERS };

export function buildDeck() {
  const d = [];
  for (let i = 0; i < 6; i++)
    for (const r of RANKS)
      d.push({ rank: r, suit: SUITS[i % 4], id: `${r}${i}` });
  d.push({ rank: "★", suit: "", id: "J1", isJoker: true });
  d.push({ rank: "★", suit: "", id: "J2", isJoker: true });
  return d;
}

export function shuffle(a) {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

export function dealHands(uids) {
  const deck = shuffle(buildDeck());
  const hands = {};
  uids.forEach((uid, i) => {
    hands[uid] = deck.slice(i * 5, (i + 1) * 5);
  });
  return hands;
}

export function generateCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export function wasLying(cards, tableRank) {
  return cards.some((c) => !c.isJoker && c.rank !== tableRank);
}
