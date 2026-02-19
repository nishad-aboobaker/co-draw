import React, { useState, useEffect } from "react";

const USER_COLORS = ["#8b5cf6", "#ec4899", "#3b82f6", "#10b981", "#f59e0b", "#6366f1"];

export default function HomeScreen({ onEnterCanvas }) {
  const [mode, setMode] = useState("home"); // home | create | join
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [selectedColor, setSelectedColor] = useState(USER_COLORS[0]);
  const [error, setError] = useState("");

  // AUTO-JOIN FLOW: Check for room code in URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const room = params.get("room");
    if (room) {
      setCode(room.toUpperCase());
      setMode("join");
    }
  }, []);

  const handleCreate = () => {
    if (!name.trim()) return;
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    onEnterCanvas({ roomId, userName: name.trim(), userColor: selectedColor });
  };

  const handleJoin = () => {
    if (!name.trim() || !code.trim()) return;
    onEnterCanvas({
      roomId: code.trim().toUpperCase(),
      userName: name.trim(),
      userColor: selectedColor,
    });
  };

  return (
    <div className="home-container">
      <style>{`
        .home-container {
          min-height: 100vh;
          background: #0a0a0f;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
          padding: 20px;
        }

        .bg-glow {
          position: absolute;
          width: 500px;
          height: 500px;
          border-radius: 50%;
          filter: blur(80px);
          z-index: 0;
          opacity: 0.15;
          animation: pulse 10s infinite alternate;
        }

        @keyframes pulse {
          0% { transform: scale(1) translate(0, 0); }
          100% { transform: scale(1.2) translate(10%, 10%); }
        }

        .glass-card {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 32px;
          padding: 40px;
          width: 440px;
          min-width: 440px;
          max-width: 90vw;
          position: relative;
          z-index: 10;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          text-align: center;
          box-sizing: border-box;
          flex-shrink: 0;
        }

        .hero-title {
          font-family: 'Montserrat', sans-serif;
          font-weight: 800;
          font-size: 3.5rem;
          margin-bottom: 8px;
          background: linear-gradient(135deg, #f8fafc 0%, #94a3b8 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          letter-spacing: -2px;
        }

        .hero-subtitle {
          color: #94a3b8;
          font-size: 1.1rem;
          margin-bottom: 40px;
          font-weight: 300;
        }

        .input-group {
          margin-bottom: 24px;
          text-align: left;
        }

        .input-label {
          display: block;
          font-size: 0.8rem;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: #64748b;
          margin-bottom: 8px;
          font-weight: 600;
        }

        .modern-input {
          width: 100%;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 14px 18px;
          color: white;
          font-size: 1rem;
          outline: none;
          transition: all 0.2s;
        }

        .modern-input:focus {
          border-color: #8b5cf6;
          background: rgba(255, 255, 255, 0.08);
          box-shadow: 0 0 0 4px rgba(139, 92, 246, 0.15);
        }

        .btn-primary {
          width: 100%;
          background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
          color: white;
          border: none;
          border-radius: 14px;
          padding: 16px;
          font-size: 1.1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
          box-shadow: 0 10px 20px -5px rgba(139, 92, 246, 0.4);
        }

        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 15px 30px -5px rgba(139, 92, 246, 0.6);
        }

        .btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        .btn-outline {
          width: 100%;
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #cbd5e1;
          border-radius: 14px;
          padding: 16px;
          font-size: 1rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          margin-top: 12px;
        }

        .btn-outline:hover {
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(255, 255, 255, 0.2);
          color: white;
        }

        .color-dot {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          cursor: pointer;
          transition: all 0.2s;
          border: 2px solid transparent;
        }

        .color-dot.active {
          transform: scale(1.2);
          border-color: white;
          box-shadow: 0 0 15px currentColor;
        }
      `}</style>

      {/* Background Blobs */}
      <div className="bg-glow" style={{ background: '#8b5cf6', top: '-10%', left: '-5%' }} />
      <div className="bg-glow" style={{ background: '#ec4899', bottom: '-10%', right: '-5%' }} />

      <div className="glass-card">
        <h1 className="hero-title">D/T</h1>
        <p className="hero-subtitle">DrawTogether — Sync your strokes.</p>

        {mode === "home" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <button className="btn-primary" onClick={() => setMode("create")}>
              Create New Canvas
            </button>
            <button className="btn-outline" onClick={() => setMode("join")}>
              Join with Code
            </button>
          </div>
        ) : (
          <div>
            <div className="input-group">
              <label className="input-label">Artist Name</label>
              <input
                className="modern-input"
                placeholder="How should others see you?"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>

            {mode === "join" && (
              <div className="input-group">
                <label className="input-label">Room Code</label>
                <input
                  className="modern-input"
                  style={{ letterSpacing: 4, textAlign: "center", fontWeight: 700 }}
                  placeholder="CODE"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  maxLength={6}
                />
              </div>
            )}

            <div className="input-group">
              <label className="input-label">Your Signature Color</label>
              <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 12 }}>
                {USER_COLORS.map((c) => (
                  <div
                    key={c}
                    className={`color-dot ${selectedColor === c ? 'active' : ''}`}
                    style={{ background: c, color: c }}
                    onClick={() => setSelectedColor(c)}
                  />
                ))}
              </div>
            </div>

            <div style={{ display: "flex", gap: 12, marginTop: 40 }}>
              <button className="btn-outline" style={{ flex: 1, marginTop: 0 }} onClick={() => setMode("home")}>
                Back
              </button>
              <button
                className="btn-primary"
                style={{ flex: 2 }}
                onClick={mode === "create" ? handleCreate : handleJoin}
                disabled={!name.trim() || (mode === "join" && code.length < 5)}
              >
                {mode === "create" ? "Begin" : "Join"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
