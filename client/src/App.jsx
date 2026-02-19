import React, { useState, useEffect, useCallback, useRef } from "react";
import socket from "./socket";
import HomeScreen from "./components/HomeScreen";
import TopBar from "./components/TopBar";
import Toolbar from "./components/Toolbar";
import CanvasArea from "./components/CanvasArea";
import { useCanvas } from "./hooks/useCanvas";

export default function App() {
  const [phase, setPhase] = useState("home"); // home | canvas
  const [session, setSession] = useState(null); // { roomId, userName, userColor }
  const [users, setUsers] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState("disconnected");
  const [copied, setCopied] = useState(false);

  // Drawing tool state
  const [tool, setTool] = useState("pen");
  const [color, setColor] = useState("#e94560");
  const [size, setSize] = useState(5);
  const [glow, setGlow] = useState(false);

  const { canvasRef, startDraw, moveDraw, endDraw, undo, clearCanvas, remoteCursors } =
    useCanvas({ roomId: session?.roomId, userName: session?.userName, userColor: session?.userColor });

  // ── Enter canvas ────────────────────────────────────────────────────────────
  const handleEnterCanvas = useCallback(({ roomId, userName, userColor }) => {
    setSession({ roomId, userName, userColor });
    setPhase("canvas");
  }, []);

  // ── Socket lifecycle ────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "canvas" || !session) return;

    socket.connect();

    socket.on("connect", () => {
      setConnectionStatus("connected");
      socket.emit("join_room", {
        roomId: session.roomId,
        userName: session.userName,
        color: session.userColor,
      });
    });

    socket.on("disconnect", () => setConnectionStatus("disconnected"));
    socket.on("connect_error", () => setConnectionStatus("error"));

    socket.on("room_users", ({ users }) => setUsers(users));

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("connect_error");
      socket.off("room_users");
      socket.disconnect();
    };
  }, [phase, session]);

  // ── Copy room code ──────────────────────────────────────────────────────────
  const handleCopyCode = useCallback(() => {
    if (!session) return;
    // Copy shareable URL with room code pre-filled
    const url = `${window.location.origin}?room=${session.roomId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    });
  }, [session]);



  // ── Pointer handlers that inject tool state ─────────────────────────────────
  const handlePointerDown = (e) => startDraw(e, color, size, tool, glow);
  const handlePointerMove = (e) => moveDraw(e, color, size, tool, glow);
  const handlePointerUp = (e) => endDraw(e);

  // ── Keyboard shortcuts ──────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === "INPUT") return;
      if ((e.metaKey || e.ctrlKey) && e.key === "z") { e.preventDefault(); undo(); }
      if (e.key === "e") setTool("eraser");
      if (e.key === "p") setTool("pen");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo]);


  if (phase === "home") return <HomeScreen onEnterCanvas={handleEnterCanvas} />;

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <TopBar
        roomId={session.roomId}
        users={users}
        connectionStatus={connectionStatus}
        onCopyCode={handleCopyCode}
        copied={copied}
      />
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <Toolbar
          tool={tool} setTool={setTool}
          color={color} setColor={setColor}
          size={size} setSize={setSize}
          glow={glow} setGlow={setGlow}
          onUndo={undo}
          onClear={clearCanvas}
        />
        <main style={{ flex: 1, overflow: "hidden", position: "relative" }}>
        <CanvasArea
          canvasRef={canvasRef}
          remoteCursors={remoteCursors}
          tool={tool}
          roomId={session.roomId}
          isAlone={users.length <= 1}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        />
        </main>
      </div>
    </div>
  );
}
