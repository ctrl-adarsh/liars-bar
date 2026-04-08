# Liar's Bar — Setup Guide

## Step 1: Firebase Setup (5 minutes)

1. Go to https://console.firebase.google.com
2. Click **"Add project"** → name it `liars-bar` → Continue
3. Disable Google Analytics (not needed) → **Create project**

### Enable Realtime Database
4. Left sidebar → **Build → Realtime Database** → **Create database**
5. Choose a location (pick the closest to you)
6. Select **"Start in test mode"** → Enable

### Enable Anonymous Auth
7. Left sidebar → **Build → Authentication** → **Get started**
8. Sign-in method tab → **Anonymous** → Enable → Save

### Get your config
9. Project settings (gear icon, top left) → **Your apps** → **Add app** → Web (</>)
10. Register app (name: `liars-bar-web`) → Copy the `firebaseConfig` object

### Paste config into `src/firebase.js`
Replace the placeholder values in `src/firebase.js` with your actual config.

### Set Security Rules
11. Realtime Database → **Rules** tab → paste the contents of `firebase.rules.json` → **Publish**

---

## Step 2: Run Locally

```bash
npm install
npm run dev
```

Open http://localhost:5173 — you should see the Liar's Bar home screen.

**Test with 2 tabs:** Open two browser tabs, create a room in one, join with the code in the other.

---

## Step 3: Deploy to Vercel

```bash
# If you haven't already, push to GitHub:
git init
git add .
git commit -m "Liar's Bar multiplayer"
gh repo create liars-bar --public --push --source=.
```

Then:
1. Go to https://vercel.com → New Project
2. Import your `liars-bar` repo
3. Framework: **Vite** (auto-detected)
4. Click **Deploy**

Your game will be live at `your-project.vercel.app` in ~60 seconds.

**Share the link with friends** → they open it, enter their name, paste your room code → done.

---

## File Structure

```
src/
  firebase.js          ← Firebase config (fill in your credentials)
  App.jsx              ← Router + anonymous auth init
  lib/
    game.js            ← Pure game logic (deck, shuffle, deal)
    room.js            ← All Firebase read/write operations
  pages/
    Home.jsx           ← Create / join room landing page
    RoomPage.jsx       ← Room container (subscribes to Firebase)
  components/
    Lobby.jsx          ← Waiting room (player list, start button)
    Game.jsx           ← Main game board (your turn, others' turns, phases)
    Roulette.jsx       ← Animated revolver screen
```

---

## How It Works (Phase 1)

- **Anonymous auth**: Firebase gives each browser a unique UID automatically. No login needed.
- **Room codes**: 4-character codes like `WOLF` map to Firebase paths `rooms/WOLF/`
- **Real-time sync**: All clients subscribe to the room via `onValue()` — any change instantly updates every screen
- **Private hands**: Each player's cards are stored at `rooms/$code/hands/$uid` — only that player (and the host) can read them via Firebase Security Rules
- **Host role**: The first player to create the room is the "host" — they deal cards and can start the game
- **Shareable URL**: Direct link `yourdomain.com/room/WOLF` — friends can join straight from the link

---

## Troubleshooting

**"Room not found"** → Double-check the room code. Codes are case-insensitive but must be exactly 4 characters.

**Cards not loading** → Check your Firebase Security Rules are published correctly. In test mode, all reads/writes are allowed.

**Firebase config errors** → Make sure `databaseURL` in your config ends with `.firebaseio.com` and is not empty.

**Game gets stuck** → If the host disconnects mid-game, the game state may be orphaned. Phase 2 will add host migration.
