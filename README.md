# 🎨 DrawTogether — Real-Time Collaborative Canvas

A beautiful shared canvas where two people can draw together in real-time, no matter where they are in the world.

---

## ✦ Features

- **Real-time drawing** — strokes appear on partner's screen instantly via WebSocket
- **Live cursors** — see where your partner is moving in real-time
- **Shareable room links** — share a URL and your friend auto-joins
- **Pen & eraser** tools with 5 brush sizes and 12 colors
- **Undo** your own last stroke, **clear** canvas for everyone
- **Keyboard shortcuts** — `Ctrl+Z` to undo, `p` for pen, `e` for eraser
- Mobile & touch support
- Up to N users per room (designed for 2, works for more)

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn

### 1. Start the Server

```bash
cd server
npm install
npm start
# Server runs on http://localhost:3001
```

For development with auto-reload:
```bash
npm run dev
```

### 2. Start the Client

```bash
cd client
npm install
npm run dev
# Client runs on http://localhost:5173
```

### 3. Open and Share

1. Open `http://localhost:5173` in your browser
2. Click **"Start a Canvas"**, enter your name
3. Click **📋** in the top bar to copy the shareable link
4. Send it to your friend — they click it and join instantly!

---

## 🏗️ Architecture

```
drawtogether/
├── server/              # Node.js + Socket.io backend
│   ├── index.js         # Main server — rooms, events, state
│   └── package.json
│
└── client/              # React + Vite frontend
    ├── src/
    │   ├── App.jsx               # Root — orchestrates phases
    │   ├── socket.js             # Socket.io singleton
    │   ├── hooks/
    │   │   └── useCanvas.js      # All drawing + sync logic
    │   └── components/
    │       ├── HomeScreen.jsx    # Landing / lobby UI
    │       ├── TopBar.jsx        # Status bar with room code
    │       ├── Toolbar.jsx       # Drawing tools panel
    │       └── CanvasArea.jsx    # Canvas + remote cursors
    └── package.json
```

### How It Works

| Event | Direction | Description |
|-------|-----------|-------------|
| `join_room` | client → server | Enter a room, receive canvas state |
| `canvas_state` | server → client | Full stroke list (on join / undo / clear) |
| `stroke_start` | client ↔ peers | New stroke began |
| `stroke_point` | client ↔ peers | Point added (real-time streaming) |
| `stroke_end` | client ↔ peers | Stroke complete, saved to room |
| `cursor_move` | client ↔ peers | Live cursor position |
| `undo` | client → server | Remove sender's last stroke |
| `clear_canvas` | client → server | Wipe room for everyone |
| `room_users` | server → all | Updated user list |

---

## 🌐 Deploying to Production

### Server (e.g. Railway, Render, Fly.io)

```bash
# Set environment variables:
PORT=3001
CLIENT_ORIGIN=https://your-frontend.com
```

Deploy `server/` as a Node.js service.

### Client (e.g. Vercel, Netlify)

```bash
# Set environment variable:
VITE_SERVER_URL=https://your-server.com
```

Build with `npm run build` inside `client/`, deploy the `dist/` folder.

### Scaling Note
The current server uses **in-memory state**. For multi-instance deployments, replace with:
- **Redis adapter** for Socket.io (`@socket.io/redis-adapter`)
- Persist strokes in a database (PostgreSQL / MongoDB)

---

## 🛠️ Tech Stack

| Layer | Tech |
|-------|------|
| Backend | Node.js, Express, Socket.io 4 |
| Frontend | React 18, Vite |
| Real-time | WebSocket (Socket.io) |
| Drawing | HTML5 Canvas API |
| Fonts | DM Serif Display, DM Sans, Caveat |

---

## 📄 License
MIT — build something beautiful together 💕
