import React from "react";

const PALETTE = [
  "#f8fafc", "#8b5cf6", "#ec4899", "#ef4444",
  "#f59e0b", "#10b981", "#3b82f6", "#6366f1",
  "#0ea5e9", "#d946ef", "#84cc16", "#1e293b",
];
const SIZES = [2, 6, 14, 28, 48];

export default function Toolbar({
  color, setColor,
  size, setSize,
  tool, setTool,
  glow, setGlow,
  onUndo, onClear
}) {
  return (
    <aside className="toolbar-island">
      <style>{`
        .toolbar-island {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 24px;
          padding: 24px 12px;
          width: 72px;
          background: rgba(10, 10, 15, 0.6);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-right: 1px solid rgba(255, 255, 255, 0.08);
          z-index: 40;
          user-select: none;
        }

        .tool-btn {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.03);
          color: #94a3b8;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          font-size: 1.2rem;
        }

        .tool-btn:hover {
          background: rgba(255, 255, 255, 0.08);
          color: white;
          border-color: rgba(255, 255, 255, 0.2);
        }

        .tool-btn.active {
          background: #8b5cf6;
          color: white;
          border-color: #a78bfa;
          box-shadow: 0 0 20px rgba(139, 92, 246, 0.4);
        }

        .section-label {
          font-size: 0.65rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: #475569;
          margin-bottom: -12px;
        }

        .color-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
        }

        .swatch {
          width: 20px;
          height: 20px;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
          border: 2px solid transparent;
        }

        .swatch:hover {
          transform: scale(1.2);
        }

        .swatch.active {
          transform: scale(1.3);
          border-color: white;
          box-shadow: 0 0 10px currentColor;
        }

        .size-picker {
          display: flex;
          flex-direction: column;
          gap: 12px;
          align-items: center;
        }

        .size-dot {
          background: #94a3b8;
          border-radius: 50%;
          cursor: pointer;
          transition: all 0.2s;
          opacity: 0.3;
        }

        .size-dot:hover {
          opacity: 0.6;
        }

        .size-dot.active {
          background: #8b5cf6;
          opacity: 1;
          box-shadow: 0 0 10px #8b5cf6;
        }

        .action-btn {
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(255, 255, 255, 0.05);
          background: transparent;
          color: #64748b;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .action-btn:hover {
          background: rgba(255, 255, 255, 0.05);
          color: white;
        }

        .action-btn.danger:hover {
          background: rgba(239, 68, 68, 0.15);
          color: #ef4444;
          border-color: rgba(239, 68, 68, 0.2);
        }
        .neon-toggle {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 24px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          cursor: pointer;
          position: relative;
          border: 1px solid rgba(255, 255, 255, 0.1);
          transition: all 0.3s;
        }

        .neon-toggle.active {
          background: rgba(236, 72, 153, 0.2);
          border-color: #ec4899;
          box-shadow: 0 0 10px rgba(236, 72, 153, 0.4);
        }

        .neon-thumb {
          width: 16px;
          height: 16px;
          background: #94a3b8;
          border-radius: 50%;
          transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          transform: translateX(-10px);
        }

        .neon-toggle.active .neon-thumb {
          background: #ec4899;
          transform: translateX(10px);
          box-shadow: 0 0 10px #ec4899;
        }
      `}</style>

      <span className="section-label">Main</span>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <button
          className={`tool-btn ${tool === 'pen' ? 'active' : ''}`}
          onClick={() => setTool('pen')}
          title="Pen Tool"
        >
          🖋️
        </button>
        <button
          className={`tool-btn ${tool === 'eraser' ? 'active' : ''}`}
          onClick={() => setTool('eraser')}
          title="Eraser Tool"
        >
          🧽
        </button>
      </div>

      <span className="section-label">Shapes</span>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <button
          className={`tool-btn ${tool === 'line' ? 'active' : ''}`}
          onClick={() => setTool('line')}
          title="Line Tool"
        >
          📏
        </button>
        <button
          className={`tool-btn ${tool === 'rect' ? 'active' : ''}`}
          onClick={() => setTool('rect')}
          title="Rectangle Tool"
        >
          ⬛
        </button>
        <button
          className={`tool-btn ${tool === 'circle' ? 'active' : ''}`}
          onClick={() => setTool('circle')}
          title="Circle Tool"
        >
          ⭕
        </button>
      </div>

      <span className="section-label">FX</span>
      <div
        className={`neon-toggle ${glow ? 'active' : ''}`}
        onClick={() => setGlow(!glow)}
        title="Toggle Neon Glow"
      >
        <div className="neon-thumb" />
      </div>

      <span className="section-label">Colors</span>
      <div className="color-grid">
        {PALETTE.map((c) => (
          <div
            key={c}
            className={`swatch ${color === c ? 'active' : ''}`}
            style={{ background: c, color: c }}
            onClick={() => setColor(c)}
          />
        ))}
      </div>

      <span className="section-label">Size</span>
      <div className="size-picker">
        {SIZES.map((s) => (
          <div
            key={s}
            className={`size-dot ${size === s ? 'active' : ''}`}
            style={{ width: Math.max(s / 2, 6), height: Math.max(s / 2, 6) }}
            onClick={() => setSize(s)}
          />
        ))}
      </div>

      <div style={{ flex: 1 }} />

      <button className="action-btn" onClick={onUndo} title="Undo (Cmd+Z)">
        ↩️
      </button>
      <button className="action-btn danger" onClick={onClear} title="Clear Everything">
        🗑️
      </button>
    </aside>
  );
}
