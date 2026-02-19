import { useRef, useEffect, useCallback, useState } from "react";
import socket from "../socket";

// ── Private Functions ───────────────────────────────────────────────────────

function setCanvasSize(canvas) {
  const { width, height } = canvas.getBoundingClientRect();
  const scale = window.devicePixelRatio;
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.scale(scale, scale);
  }
}

function getRelativeCoords(e, canvas) {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  return { x, y };
}


// ── Custom Hook ─────────────────────────────────────────────────────────────

export const useCanvas = ({ roomId, userName, userColor }) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastPosition, setLastPosition] = useState(null);
  const [remoteCursors, setRemoteCursors] = useState({});
  const [remoteDraws, setRemoteDraws] = useState([]);

  // ── Setup Canvas ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    setCanvasSize(canvas);

    // Handle window resize
    const handleResize = () => {
      setCanvasSize(canvas);
      // Redraw everything
      drawAll(ctx, remoteDraws, []); // Assumes local draw history is empty for this simple case
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [remoteDraws]);


  // ── Draw All History ────────────────────────────────────────────────────
  // Function to draw an array of drawing events (lines)
  const drawAll = (ctx, events) => {
    events.forEach(drawEvent => {
      if (drawEvent.type === 'draw_line' && drawEvent.data.from && drawEvent.data.to) {
        drawLine(ctx, drawEvent.data);
      }
    });
  };

  // Effect to draw remote drawings when they are updated
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas before redrawing
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Redraw based on the history of remote draws
    drawAll(ctx, remoteDraws);

  }, [remoteDraws]);


  // ── Drawing Logic ─────────────────────────────────────────────────────────

  const drawLine = (ctx, { from, to, color, size, tool, glow }) => {
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.strokeStyle = color;
    ctx.lineWidth = size;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (tool === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
    } else {
      ctx.globalCompositeOperation = "source-over";
    }

    if (glow) {
      ctx.shadowColor = color;
      ctx.shadowBlur = size * 2.5;
    } else {
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
    }

    ctx.stroke();
  };

  const handleDraw = (data) => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    drawLine(ctx, data);
  };

  // ── Socket Listeners ──────────────────────────────────────────────────────

  useEffect(() => {
    if (!roomId) return;

    socket.on("draw", handleDraw);
    socket.on("cursor_move", (data) => {
      setRemoteCursors(prev => ({ ...prev, [data.id]: data }));
    });
    socket.on("user_left", ({ id }) => {
      setRemoteCursors(prev => {
        const newCursors = { ...prev };
        delete newCursors[id];
        return newCursors;
      });
    });
    socket.on("draw_history", ({ history }) => {
      setRemoteDraws(history);
    });

    return () => {
      socket.off("draw", handleDraw);
      socket.off("cursor_move");
      socket.off("user_left");
      socket.off("draw_history");
    };

  }, [roomId]);

  // ── Mouse/Pointer Handlers ────────────────────────────────────────────────

  const startDraw = useCallback((e, color, size, tool, glow) => {
    if (!canvasRef.current) return;
    setIsDrawing(true);
    const pos = getRelativeCoords(e, canvasRef.current);
    setLastPosition(pos);
  }, []);

  const moveDraw = useCallback((e, color, size, tool, glow) => {
    if (!canvasRef.current) return;

    // Send cursor position regardless of drawing state
    const cursorData = { ...getRelativeCoords(e, canvasRef.current), id: socket.id, userName, userColor };
    socket.emit("cursor_move", { roomId, ...cursorData });

    if (!isDrawing || !lastPosition) return;

    const to = getRelativeCoords(e, canvasRef.current);
    const from = lastPosition;
    const drawData = { from, to, color, size, tool, glow };

    // Draw locally
    handleDraw(drawData);

    // Send to server
    socket.emit("draw", { roomId, ...drawData });

    setLastPosition(to);

  }, [isDrawing, lastPosition, roomId, userName, userColor]);

  const endDraw = useCallback((e) => {
    setIsDrawing(false);
    setLastPosition(null);
  }, []);

  const undo = useCallback(() => {
    socket.emit("undo", { roomId });
  }, [roomId]);

  const clearCanvas = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    socket.emit("clear_canvas", { roomId });
  };


  return { canvasRef, startDraw, moveDraw, endDraw, undo, clearCanvas, remoteCursors };
};