# 🃏 Liar's Bar — Russian Roulette Edition

A real-time multiplayer bluffing card game playable by anyone around the world. Built with React, Firebase, and Vite.

![Game](https://img.shields.io/badge/status-live-brightgreen) ![Players](https://img.shields.io/badge/players-2--4-orange) ![Tech](https://img.shields.io/badge/stack-React%20%2B%20Firebase-blue)

---

## How to Play

- 2–4 players join a room using a 4-character code
- Each round has a **target rank** (A, K, or Q)
- On your turn, play 1–3 cards face-down, **claiming** they all match the target rank — even if they don't
- The next player can either **play their own cards** or shout **CALL LIAR**
- If caught lying → you face Russian Roulette
- If the bluff call was wrong → the caller faces Russian Roulette
- First player to empty their hand wins
- ★ Jokers are wild and count as any rank

---

## Features

### Phase 1 — Core Multiplayer
- Room creation with 4-character shareable codes
- Real-time sync via Firebase Realtime Database
- Private hands — each player only sees their own cards
- Full game loop: play cards, call bluff, reveal, roulette, new round

### Phase 2 — Spectators & Polish
- **Spectator mode** — watch any game live without playing
- **Emoji reactions** (👀 😱 💀 🔥 😂 🎰) that float up on all screens simultaneously
- **Presence indicators** — green dot shows who's online
- **Reconnection handling** — disconnected player's turn auto-skips after 30 seconds
- **Host migration** — if the host leaves, another player is promoted automatically
- **Live game log** visible to spectators

### Phase 3 — Going Viral
- **Global leaderboard** — wins tracked across all games
- **Post-game summary** — highlights, bluff moments, per-player stats
- **WhatsApp invite** — pre-filled message with room code and link
- **PWA** — installable on phone home screen, works like a native app

---

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React 18 + Vite |
| Realtime sync | Firebase Realtime Database |
| Auth | Firebase Anonymous Auth |
| Routing | React Router v6 |
| Hosting | Vercel |
| PWA | Service Worker + Web Manifest |

---

## Project Structure

```
src/
├── firebase.js              # Firebase init (reads from env vars)
├── App.jsx                  # Router + auth init
├── main.jsx                 # Entry point
├── lib/
│   ├── game.js              # Pure logic: deck, shuffle, deal, room codes
│   ├── room.js              # All Firebase read/write operations
│   └── presence.js          # Online/offline tracking + host migration
├── pages/
│   ├── Home.jsx             # Create / Join / Watch landing page
│   └── RoomPage.jsx         # Room container — subscribes to Firebase
└── components/
    ├── Lobby.jsx            # Waiting room with player list
    ├── Game.jsx             # Main game board
    ├── Roulette.jsx         # Animated revolver screen
    ├── Spectator.jsx        # Read-only spectator view
    ├── Reactions.jsx        # Floating emoji reactions
    ├── Summary.jsx          # Post-game summary + WhatsApp share
    └── Leaderboard.jsx      # Global wins leaderboard
public/
    ├── sw.js                # Service worker (PWA)
    └── manifest.json        # PWA manifest
```

---

## Local Development

### Prerequisites
- Node.js 18+
- A Firebase project with Realtime Database + Anonymous Auth enabled

### Setup

```bash
git clone https://github.com/ctrl-adarsh/liars-bar.git
cd liars-bar
npm install
```

Create a `.env` file in the root:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_DATABASE_URL=your_database_url
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

```bash
npm run dev
```

**Testing locally with 2 players:** Use Chrome (normal) for player 1 and Chrome Incognito for player 2 — they get separate anonymous auth sessions.

---

## Firebase Setup

1. Go to [console.firebase.google.com](https://console.firebase.google.com) → create a project
2. Enable **Realtime Database** → start in test mode
3. Enable **Authentication** → Anonymous sign-in
4. Go to Project Settings → Your apps → Add web app → copy the config
5. Paste the `firebase.rules.json` contents into Database → Rules → Publish

---

## Deployment

```bash
# Push to GitHub
git add .
git commit -m "deploy"
git push

# Vercel auto-deploys on push
# First time: go to vercel.com → New Project → import repo
```

Add all `VITE_FIREBASE_*` environment variables in **Vercel → Settings → Environment Variables**, then redeploy.

The `vercel.json` rewrite rule ensures React Router works on direct URL loads:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

---

## Firebase Security Rules

Hands are private — each player can only read their own cards. The host can read all hands to deal. Full rules in `firebase.rules.json`.

---

## Data Model

```
/leaderboard/{uid}           → { name, wins, gamesPlayed }

/rooms/{code}/
  meta/                      → phase, curUid, tableRankIdx, bullet, shots, winner, ...
  players/{uid}/             → { name, alive, cardCount }
  hands/{uid}/               → private card array (security rules enforced)
  spectators/{uid}/          → { name, joinedAt }
  presence/{uid}/            → { online, lastSeen }
  reactions/                 → push list of { uid, name, emoji, ts }
  log/                       → push list of { msg, ts }
  moments/                   → push list of { playerUid, playerName, type, detail, ts }
```

---

## License

MIT — build on it, share it, bluff your way through it.
