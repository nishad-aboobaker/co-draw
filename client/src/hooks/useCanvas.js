import { useRef, useEffect, useCallback, useState } from "react";
import socket from "../socket";

// ── Private Helpers ─────────────────────────────────────────────────────────

function getRelativeCoords(e, canvas) {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  return { x, y };
}

/**
 * Normalizes coordinates to a 0-1 range based on the target dimensions.
 */
function normalizeCoords(coords, width, height) {
  return {
    x: coords.x / width,
    y: coords.y / height
  };
}

/**
 * Denormalizes coordinates from 0-1 range to pixel dimensions.
 */
function denormalizeCoords(normCoords, width, height) {
  return {
    x: normCoords.x * width,
    y: normCoords.y * height
  };
}

// ── Custom Hook ─────────────────────────────────────────────────────────────

export const useCanvas = ({ roomId, userName, userColor }) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null); // Parent observer
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStroke, setCurrentStroke] = useState(null);
  const [remoteCursors, setRemoteCursors] = useState({});
  const [strokes, setStrokes] = useState([]); // All completed strokes

  // ── Setup ResizeObserver ──────────────────────────────────────────────────

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const parent = canvas.parentElement;
    if (!parent) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;

        // Cache the current context state if needed, but since we redraw everything, 
        // we just update attributes.
        const dpr = window.devicePixelRatio || 1;
        canvas.width = width * dpr;
        canvas.height = height * dpr;

        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.scale(dpr, dpr);
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          redrawAll();
        }
      }
    });

    resizeObserver.observe(parent);
    return () => resizeObserver.disconnect();
  }, [strokes]); // Redraw when strokes change or resize happens

  // ── Drawing Core ──────────────────────────────────────────────────────────

  const redrawAll = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { width, height } = canvas.getBoundingClientRect();

    ctx.clearRect(0, 0, width, height);

    strokes.forEach(stroke => {
      drawFullStroke(ctx, stroke, width, height);
    });
  }, [strokes]);

  const drawFullStroke = (ctx, stroke, canvasW, canvasH) => {
    if (!stroke.points || stroke.points.length < 1) return;

    ctx.beginPath();
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.size;

    if (stroke.tool === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
    } else {
      ctx.globalCompositeOperation = "source-over";
    }

    if (stroke.glow) {
      ctx.shadowColor = stroke.color;
      ctx.shadowBlur = stroke.size * 2;
    } else {
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
    }

    const start = denormalizeCoords(stroke.points[0], canvasW, canvasH);
    ctx.moveTo(start.x, start.y);

    for (let i = 1; i < stroke.points.length; i++) {
      const p = denormalizeCoords(stroke.points[i], canvasW, canvasH);
      ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
  };

  const drawSegment = (ctx, from, to, color, size, tool, glow) => {
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
      ctx.shadowBlur = size * 2;
    } else {
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
    }

    ctx.stroke();
  };

  // ── Socket Listeners ──────────────────────────────────────────────────────

  useEffect(() => {
    if (!roomId) return;

    socket.on("canvas_state", ({ strokes: newStrokes }) => {
      setStrokes(newStrokes);
    });

    socket.on("stroke_start", (data) => {
      // For real-time feedback, we could manage local "temp" strokes
      // but let's keep it simple: redraw on stroke_end for history,
      // and maybe real-time point-by-point for smoothness later.
    });

    socket.on("stroke_point", (data) => {
      // Real-time drawing from others
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      const { width, height } = canvas.getBoundingClientRect();

      const from = denormalizeCoords(data.from, width, height);
      const to = denormalizeCoords(data.to, width, height);

      drawSegment(ctx, from, to, data.color, data.size, data.tool, data.glow);

      // Sync pointer with drawing tip
      setRemoteCursors(prev => ({
        ...prev,
        [data.userId || data.id]: {
          ...prev[data.userId || data.id],
          x: to.x,
          y: to.y
        }
      }));
    });

    socket.on("stroke_end", ({ stroke }) => {
      setStrokes(prev => [...prev, stroke]);
    });

    socket.on("cursor_move", (data) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const { width, height } = canvas.getBoundingClientRect();
      const pos = denormalizeCoords(data, width, height);
      const userId = data.userId || data.id;
      setRemoteCursors(prev => ({
        ...prev,
        [userId]: { ...prev[userId], ...data, x: pos.x, y: pos.y }
      }));
    });

    socket.on("user_left", ({ user }) => {
      if (!user) return;
      setRemoteCursors(prev => {
        const next = { ...prev };
        delete next[user.id];
        return next;
      });
    });

    return () => {
      socket.off("canvas_state");
      socket.off("stroke_start");
      socket.off("stroke_point");
      socket.off("stroke_end");
      socket.off("cursor_move");
      socket.off("user_left");
    };
  }, [roomId]);

  // Redraw when strokes change
  useEffect(() => {
    redrawAll();
  }, [strokes, redrawAll]);


  // ── Pointer Handlers ──────────────────────────────────────────────────────

  const startDraw = useCallback((e, color, size, tool, glow) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsDrawing(true);
    const { width, height } = canvas.getBoundingClientRect();
    const pos = getRelativeCoords(e, canvas);
    const normPos = normalizeCoords(pos, width, height);

    const newStroke = {
      color,
      size,
      tool,
      glow,
      points: [normPos]
    };

    setCurrentStroke(newStroke);
    socket.emit("stroke_start", { point: normPos, color, size, tool, glow });
  }, []);

  const moveDraw = useCallback((e, color, size, tool, glow) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const { width, height } = canvas.getBoundingClientRect();
    const pos = getRelativeCoords(e, canvas);
    const normPos = normalizeCoords(pos, width, height);

    // Always send cursor (normalized)
    socket.emit("cursor_move", { x: normPos.x, y: normPos.y });

    if (!isDrawing || !currentStroke) return;

    const lastPointNorm = currentStroke.points[currentStroke.points.length - 1];
    const from = denormalizeCoords(lastPointNorm, width, height);
    const to = pos;

    // Draw locally immediately
    const ctx = canvas.getContext("2d");
    drawSegment(ctx, from, to, color, size, tool, glow);

    // Track for history
    setCurrentStroke(prev => ({
      ...prev,
      points: [...prev.points, normPos]
    }));

    // Emit point
    socket.emit("stroke_point", {
      from: lastPointNorm,
      to: normPos,
      color, size, tool, glow
    });

  }, [isDrawing, currentStroke]);

  const endDraw = useCallback(() => {
    if (!isDrawing || !currentStroke) return;

    setIsDrawing(false);

    // Finalize stroke
    socket.emit("stroke_end", { stroke: currentStroke });
    setStrokes(prev => [...prev, currentStroke]);
    setCurrentStroke(null);
  }, [isDrawing, currentStroke]);

  const undo = useCallback(() => {
    socket.emit("undo", { roomId });
  }, [roomId]);

  const clearCanvas = () => {
    socket.emit("clear_canvas", { roomId });
  };

  return { canvasRef, startDraw, moveDraw, endDraw, undo, clearCanvas, remoteCursors };
};