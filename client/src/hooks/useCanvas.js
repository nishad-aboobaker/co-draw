import { useRef, useEffect, useCallback, useState } from "react";
import socket from "../socket";

/**
 * useCanvas
 * Encapsulates all drawing logic and real-time sync via Socket.io.
 */
export function useCanvas({ roomId, userName, userColor }) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const lastPos = useRef(null);
  const currentStroke = useRef(null);
  const allStrokes = useRef([]);            // ground truth: committed strokes
  const remoteStrokes = useRef({});         // in-progress strokes from peers: { socketId: Stroke }
  const dprRef = useRef(window.devicePixelRatio || 1);
  const [remoteCursors, setRemoteCursors] = useState({});

  // ─── Canvas helpers ────────────────────────────────────────────────────────
  const getPos = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    // Return rounded CSS coordinates
    return {
      x: Math.round(e.clientX - rect.left),
      y: Math.round(e.clientY - rect.top),
    };
  }, []);

  const applyStroke = useCallback((ctx, stroke) => {
    if (!stroke || stroke.points.length < 2) return;
    const dpr = dprRef.current;
    ctx.save();

    // MATHEMATICAL LOCK: Reset transform to match buffer scale
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Neon Glow FX
    if (stroke.glow && stroke.tool !== "eraser") {
      ctx.shadowBlur = 15; // Set in CSS units
      ctx.shadowColor = stroke.color;
    }

    ctx.beginPath();
    ctx.strokeStyle = stroke.tool === "eraser" ? "#0a0a0f" : stroke.color;
    ctx.lineWidth = stroke.tool === "eraser" ? stroke.size * 3 : stroke.size;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.globalCompositeOperation =
      stroke.tool === "eraser" ? "destination-out" : "source-over";

    const start = stroke.points[0];
    const end = stroke.points[stroke.points.length - 1];

    if (stroke.tool === "line") {
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
    } else if (stroke.tool === "rect") {
      ctx.strokeRect(start.x, start.y, end.x - start.x, end.y - start.y);
    } else if (stroke.tool === "circle") {
      const radius = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
      ctx.arc(start.x, start.y, radius, 0, Math.PI * 2);
    } else {
      // Default: Pen / Eraser
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
    }

    ctx.stroke();
    ctx.restore();
  }, []);

  const redrawAll = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = dprRef.current;

    // Use requestAnimationFrame for smooth visuals
    requestAnimationFrame(() => {
      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Clear the viewport in CSS units
      ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
      ctx.restore();

      // 1. Committed strokes from ground truth
      allStrokes.current.forEach((s) => applyStroke(ctx, s));

      // 2. In-progress remote strokes
      Object.values(remoteStrokes.current).forEach((s) => applyStroke(ctx, s));

      // 3. Local in-progress stroke
      if (currentStroke.current) {
        applyStroke(ctx, currentStroke.current);
      }
    });
  }, [applyStroke]);

  // draw a live segment (local) without full redraw
  const drawSegment = useCallback((from, to, color, size, tool, glow) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = dprRef.current;
    ctx.save();

    // Reset transform for local segments
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (glow && tool !== "eraser") {
      ctx.shadowBlur = 15;
      ctx.shadowColor = color;
    }

    ctx.beginPath();
    ctx.strokeStyle = tool === "eraser" ? "#0a0a0f" : color;
    ctx.lineWidth = tool === "eraser" ? size * 3 : size;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.globalCompositeOperation =
      tool === "eraser" ? "destination-out" : "source-over";

    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    ctx.restore();
  }, []);

  // ─── Local pointer events ──────────────────────────────────────────────────
  const startDraw = useCallback(
    (e, color, size, tool, glow) => {
      // Guard: already drawing
      if (drawing.current) return;

      // Pointer Capture: ensure stroke isn't lost if cursor moves off canvas
      if (e.target.setPointerCapture) {
        e.target.setPointerCapture(e.pointerId);
      }

      drawing.current = true;
      const pos = getPos(e);
      lastPos.current = pos;
      const strokeId = `${socket.id}-${Date.now()}`;
      currentStroke.current = { id: strokeId, color, size, tool, glow, points: [pos], author: socket.id };
      socket.emit("stroke_start", { strokeId, color, size, tool, glow, startPoint: pos });
    },
    [getPos]
  );

  const moveDraw = useCallback(
    (e, color, size, tool, glow) => {
      if (!drawing.current || !currentStroke.current) return;

      const pos = getPos(e);

      const isShape = ["line", "rect", "circle"].includes(tool);

      if (isShape) {
        // Shape Preview: Points = [start, current]
        currentStroke.current.points = [currentStroke.current.points[0], pos];
        redrawAll();
      } else {
        // Pen / Eraser logic: Points list
        currentStroke.current.points.push(pos);
        drawSegment(lastPos.current, pos, color, size, tool, glow);
        lastPos.current = pos;
      }

      // THROTTLE SOCKET EMISSIONS ONLY
      const lastPoint = currentStroke.current.points[currentStroke.current.points.length - (isShape ? 1 : 2)];
      const dist = Math.sqrt(Math.pow(pos.x - lastPoint.x, 2) + Math.pow(pos.y - lastPoint.y, 2));

      // Always sync cursor for smooth partner experience
      socket.emit("cursor_move", { x: pos.x, y: pos.y });

      // Only sync point if moved significantly (2px)
      if (dist >= 2 || isShape) {
        socket.emit("stroke_point", {
          strokeId: currentStroke.current.id,
          point: pos,
        });
      }
    },
    [getPos, drawSegment, redrawAll]
  );

  const endDraw = useCallback(() => {
    if (!drawing.current || !currentStroke.current) return;
    drawing.current = false;
    allStrokes.current.push(currentStroke.current);
    socket.emit("stroke_end", { stroke: currentStroke.current });
    currentStroke.current = null;
    redrawAll(); // Final sync redraw
  }, [redrawAll]);

  // ─── Actions ───────────────────────────────────────────────────────────────
  const undo = useCallback(() => {
    const myStrokes = allStrokes.current.filter(
      (s) => s.author === socket.id || !s.author
    );
    if (myStrokes.length === 0) return;
    socket.emit("undo");
  }, []);

  const clearCanvas = useCallback(() => {
    socket.emit("clear_canvas");
  }, []);

  // ─── Socket event handlers ─────────────────────────────────────────────────
  useEffect(() => {
    if (!roomId) return;

    // Receive full canvas state (on join or after undo/clear)
    const onCanvasState = ({ strokes }) => {
      allStrokes.current = strokes;
      remoteStrokes.current = {};
      redrawAll();
    };

    // Remote stroke started
    const onStrokeStart = ({ strokeId, color, size, tool, glow, startPoint, author }) => {
      if (author === socket.id) return; // IGNORE SELF
      remoteStrokes.current[author] = { id: strokeId, color, size, tool, glow, points: [startPoint], author };
    };

    // Remote stroke point added
    const onStrokePoint = ({ strokeId, point, author }) => {
      if (author === socket.id) return; // IGNORE SELF
      const rs = remoteStrokes.current[author];
      if (!rs || rs.id !== strokeId) return;

      const isShape = ["line", "rect", "circle"].includes(rs.tool);

      if (isShape) {
        rs.points = [rs.points[0], point];
        redrawAll();
      } else {
        rs.points.push(point);
        // draw only the new segment for perf
        if (rs.points.length >= 2) {
          const prev = rs.points[rs.points.length - 2];
          drawSegment(prev, point, rs.color, rs.size, rs.tool, rs.glow);
        }
      }
    };

    // Remote stroke ended → move to committed
    const onStrokeEnd = ({ stroke }) => {
      if (stroke.author === socket.id) return; // IGNORE SELF
      delete remoteStrokes.current[stroke.author];
      allStrokes.current.push(stroke);
      redrawAll();
    };

    // Remote cursor
    const onCursorMove = ({ userId, userName, color, x, y }) => {
      setRemoteCursors((prev) => ({ ...prev, [userId]: { userName, color, x, y, ts: Date.now() } }));
    };

    socket.on("canvas_state", onCanvasState);
    socket.on("stroke_start", onStrokeStart);
    socket.on("stroke_point", onStrokePoint);
    socket.on("stroke_end", onStrokeEnd);
    socket.on("cursor_move", onCursorMove);

    return () => {
      socket.off("canvas_state", onCanvasState);
      socket.off("stroke_start", onStrokeStart);
      socket.off("stroke_point", onStrokePoint);
      socket.off("stroke_end", onStrokeEnd);
      socket.off("cursor_move", onCursorMove);
    };
  }, [roomId, redrawAll, drawSegment]);

  // Fade out stale cursors
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setRemoteCursors((prev) => {
        const updated = { ...prev };
        let changed = false;
        for (const id in updated) {
          if (now - updated[id].ts > 5000) {
            delete updated[id];
            changed = true;
          }
        }
        return changed ? updated : prev;
      });
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Resize canvas with High-DPI support using ResizeObserver
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    const resize = (entries) => {
      const entry = entries[0];
      if (!entry) return;

      const dpr = window.devicePixelRatio || 1;
      const { width, height } = entry.contentRect;

      if (width === 0 || height === 0) return;

      // Update the DPR Ref to keep drawing logic in sync
      dprRef.current = dpr;

      // Lock buffer to physical pixels
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      // Trigger redraw to fill the new buffer
      redrawAll();
    };

    const observer = new ResizeObserver(resize);
    observer.observe(parent);

    return () => observer.disconnect();
  }, [redrawAll]);

  return { canvasRef, startDraw, moveDraw, endDraw, undo, clearCanvas, remoteCursors };
}
