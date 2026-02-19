const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");

const app = express();
const server = http.createServer(app);

// ─── Config ────────────────────────────────────────────────────────────────
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";
const PORT = process.env.PORT || 3001;

const io = new Server(server, {
  cors: {
    origin: CLIENT_ORIGIN,
    methods: ["GET", "POST"],
  },
});

app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json());

// ─── In-memory state ────────────────────────────────────────────────────────
// rooms: Map<roomId, { strokes: Stroke[], users: Map<socketId, UserInfo> }>
const rooms = new Map();

function getOrCreateRoom(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, { strokes: [], users: new Map() });
  }
  return rooms.get(roomId);
}

function getRoomInfo(roomId) {
  const room = rooms.get(roomId);
  if (!room) return null;
  return {
    strokeCount: room.strokes.length,
    users: Array.from(room.users.values()),
  };
}

// ─── REST: health check ─────────────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.json({ status: "ok", rooms: rooms.size });
});

// ─── REST: check if room exists ─────────────────────────────────────────────
app.get("/room/:roomId", (req, res) => {
  const exists = rooms.has(req.params.roomId.toUpperCase());
  res.json({ exists });
});

// ─── Socket.io ──────────────────────────────────────────────────────────────
io.on("connection", (socket) => {
  console.log(`[+] Socket connected: ${socket.id}`);

  let currentRoom = null;
  let currentUser = null;

  // ── Join room ────────────────────────────────────────────────────────────
  socket.on("join_room", ({ roomId, userName, color }) => {
    roomId = roomId.toUpperCase();
    currentRoom = roomId;
    currentUser = {
      id: socket.id,
      name: userName,
      color: color || "#e94560",
      joinedAt: Date.now(),
    };

    const room = getOrCreateRoom(roomId);
    room.users.set(socket.id, currentUser);
    socket.join(roomId);

    // Send current canvas state to the newcomer
    socket.emit("canvas_state", { strokes: room.strokes });

    // Notify everyone in room about updated user list
    io.to(roomId).emit("room_users", {
      users: Array.from(room.users.values()),
    });

    // Tell others someone joined
    socket.to(roomId).emit("user_joined", { user: currentUser });

    console.log(`[room:${roomId}] ${userName} joined (${room.users.size} online)`);
  });

  // ── Drawing events (streamed stroke-by-stroke) ───────────────────────────
  // stroke_start: new stroke begins
  socket.on("stroke_start", (data) => {
    if (!currentRoom) return;
    // broadcast to others in real time (not back to sender)
    socket.to(currentRoom).emit("stroke_start", { ...data, author: socket.id });
  });

  // stroke_point: a new point added to current stroke
  socket.on("stroke_point", (data) => {
    if (!currentRoom) return;
    socket.to(currentRoom).emit("stroke_point", { ...data, author: socket.id });
  });

  // stroke_end: stroke is complete — store it
  socket.on("stroke_end", (data) => {
    if (!currentRoom) return;
    const room = rooms.get(currentRoom);
    if (room && data.stroke) {
      room.strokes.push({ ...data.stroke, author: socket.id });
      // broadcast final stroke to others
      socket.to(currentRoom).emit("stroke_end", {
        stroke: { ...data.stroke, author: socket.id },
      });
    }
  });

  // ── Undo ─────────────────────────────────────────────────────────────────
  socket.on("undo", () => {
    if (!currentRoom) return;
    const room = rooms.get(currentRoom);
    if (!room) return;
    // Remove last stroke by this user
    const idx = [...room.strokes].reverse().findIndex((s) => s.author === socket.id);
    if (idx !== -1) {
      const realIdx = room.strokes.length - 1 - idx;
      room.strokes.splice(realIdx, 1);
      io.to(currentRoom).emit("canvas_state", { strokes: room.strokes });
    }
  });

  // ── Clear canvas ─────────────────────────────────────────────────────────
  socket.on("clear_canvas", () => {
    if (!currentRoom) return;
    const room = rooms.get(currentRoom);
    if (room) {
      room.strokes = [];
      io.to(currentRoom).emit("canvas_state", { strokes: [] });
      console.log(`[room:${currentRoom}] Canvas cleared by ${currentUser?.name}`);
    }
  });

  // ── Cursor sharing (optional real-time cursor) ────────────────────────────
  socket.on("cursor_move", (data) => {
    if (!currentRoom) return;
    socket.to(currentRoom).emit("cursor_move", {
      ...data,
      userId: socket.id,
      userName: currentUser?.name,
      color: currentUser?.color,
    });
  });

  // ── Disconnect ────────────────────────────────────────────────────────────
  socket.on("disconnect", () => {
    if (!currentRoom) return;
    const room = rooms.get(currentRoom);
    if (room) {
      room.users.delete(socket.id);
      io.to(currentRoom).emit("room_users", {
        users: Array.from(room.users.values()),
      });
      socket.to(currentRoom).emit("user_left", { user: currentUser });
      console.log(`[-] ${currentUser?.name} left room ${currentRoom} (${room.users.size} remaining)`);

      // Clean up empty rooms after 1 hour (optional memory management)
      if (room.users.size === 0) {
        setTimeout(() => {
          const r = rooms.get(currentRoom);
          if (r && r.users.size === 0) {
            rooms.delete(currentRoom);
            console.log(`[room:${currentRoom}] Cleaned up (empty)`);
          }
        }, 60 * 60 * 1000);
      }
    }
  });
});

// ─── Start ───────────────────────────────────────────────────────────────────
server.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════╗
  ║     DrawTogether Server running      ║
  ║     http://localhost:${PORT}            ║
  ╚══════════════════════════════════════╝
  `);
});
