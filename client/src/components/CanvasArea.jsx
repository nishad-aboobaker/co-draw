import React from "react";

export default function CanvasArea({
  canvasRef,
  remoteCursors,
  tool,
  roomId,
  isAlone,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
}) {
  return (
    <div className="canvas-container">
      <style>{`
        .canvas-container {
          flex: 1;
          position: relative;
          overflow: hidden;
          background: #0a0a0f;
          min-width: 0;
          /* Subtle Dark Grid */
          background-image: 
            linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
          background-size: 40px 40px;
        }

        .remote-pointer {
          position: absolute;
          pointer-events: none;
          z-index: 100;
          transition: left 0.05s linear, top 0.05s linear;
        }

        .cursor-glow {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: white;
          box-shadow: 0 0 15px 4px currentColor;
          position: relative;
        }

        .cursor-label {
          position: absolute;
          top: 14px;
          left: 10px;
          background: rgba(15, 23, 42, 0.8);
          backdrop-filter: blur(4px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: white;
          font-size: 10px;
          font-weight: 600;
          padding: 2px 8px;
          border-radius: 6px;
          white-space: nowrap;
          font-family: 'Inter', sans-serif;
        }

        .waiting-overlay {
          position: absolute;
          bottom: 32px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(139, 92, 246, 0.1);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(139, 92, 246, 0.2);
          border-radius: 20px;
          padding: 12px 32px;
          display: flex;
          align-items: center;
          gap: 16px;
          animation: float 4s ease-in-out infinite;
        }

        @keyframes float {
          0%, 100% { transform: translate(-50%, 0); }
          50% { transform: translate(-50%, -10px); }
        }

        .waiting-text {
          font-size: 0.9rem;
          color: #94a3b8;
          font-weight: 500;
        }

        .highlight-code {
          color: #8b5cf6;
          font-family: monospace;
          letter-spacing: 2px;
          font-weight: 800;
        }
      `}</style>

      {/* Drawing Space */}
      <canvas
        ref={canvasRef}
        style={{
          width: "100%",
          height: "100%",
          cursor: tool === "eraser" ? "cell" : "crosshair",
          touchAction: "none",
          display: "block",
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onPointerLeave={onPointerUp}
      />

      {/* Remote Cursors */}
      {Object.entries(remoteCursors).map(([id, cursor]) => (
        <div
          key={id}
          className="remote-pointer"
          style={{ left: cursor.x, top: cursor.y, color: cursor.color }}
        >
          <div className="cursor-glow" />
          <div className="cursor-label" style={{ borderLeft: `3px solid ${cursor.color}` }}>
            {cursor.userName}
          </div>
        </div>
      ))}

      {/* Empty State Hint */}
      {isAlone && (
        <div className="waiting-overlay">
          <span style={{ fontSize: '1.2rem' }}>🤝</span>
          <p className="waiting-text">
            Invite a friend with code <span className="highlight-code">{roomId}</span>
          </p>
        </div>
      )}
    </div>
  );
}
