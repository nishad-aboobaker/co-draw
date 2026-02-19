import React from "react";

export default function TopBar({ roomId, users, connectionStatus, onCopyCode, copied }) {
  const isConnected = connectionStatus === "connected";
  const isMultiple = users.length > 1;

  return (
    <header className="topbar-glass">
      <style>{`
        .topbar-glass {
          height: 64px;
          display: flex;
          align-items: center;
          padding: 0 24px;
          gap: 20px;
          background: rgba(10, 10, 15, 0.8);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          position: relative;
          z-index: 50;
        }

        .logo-text {
          font-family: 'Montserrat', sans-serif;
          font-weight: 800;
          font-size: 1.2rem;
          background: linear-gradient(135deg, #fff 0%, #94a3b8 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          letter-spacing: -0.5px;
        }

        .status-pill {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 14px;
          border-radius: 99px;
          font-size: 0.75rem;
          font-weight: 600;
          letter-spacing: 0.02em;
          text-transform: uppercase;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.06);
          transition: all 0.3s;
        }

        .status-pill.online {
          border-color: rgba(16, 185, 129, 0.2);
          color: #10b981;
          background: rgba(16, 185, 129, 0.05);
        }

        .status-pill.waiting {
          border-color: rgba(245, 158, 11, 0.2);
          color: #f59e0b;
          background: rgba(245, 158, 11, 0.05);
        }

        .status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: currentColor;
          box-shadow: 0 0 10px currentColor;
        }

        .user-avatar-group {
          display: flex;
          align-items: center;
          margin-right: 8px;
        }

        .user-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: 2px solid #0a0a0f;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.8rem;
          font-weight: 700;
          color: white;
          margin-left: -10px;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
          position: relative;
        }

        .user-avatar:first-child {
          margin-left: 0;
        }

        .room-btn {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: white;
          padding: 8px 16px;
          border-radius: 12px;
          font-family: 'Inter', sans-serif;
          font-weight: 500;
          font-size: 0.9rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 10px;
          transition: all 0.2s;
        }

        .room-btn:hover {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(255, 255, 255, 0.2);
          transform: translateY(-1px);
        }

        .room-btn:active {
          transform: translateY(0);
          background: rgba(255, 255, 255, 0.12);
        }

        .room-btn.copied {
          border-color: #10b981;
          background: rgba(16, 185, 129, 0.1);
        }

        .room-code {
          font-family: monospace;
          letter-spacing: 2px;
          font-weight: 700;
          color: #8b5cf6;
        }
      `}</style>

      <div className="logo-text">DRAW/TOGETHER</div>

      <div style={{ flex: 1 }} />

      <div className={`status-pill ${isConnected ? (isMultiple ? 'online' : 'waiting') : ''}`}>
        <div className="status-dot" />
        {isConnected ? (isMultiple ? 'Live Collaboration' : 'Waiting for Partner') : 'Reconnecting...'}
      </div>

      <div className="user-avatar-group">
        {users.map((u, i) => (
          <div
            key={u.id || i}
            className="user-avatar"
            style={{ background: u.color || '#8b5cf6' }}
            title={u.name}
          >
            {u.name?.[0].toUpperCase()}
          </div>
        ))}
      </div>

      <button className={`room-btn ${copied ? 'copied' : ''}`} onClick={onCopyCode}>
        <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>ROOM</span>
        <span className="room-code">{roomId}</span>
        <span style={{ marginLeft: 4, transform: copied ? 'scale(1.2)' : 'none', transition: 'all 0.2s' }}>
          {copied ? '✅' : '🔗'}
        </span>
      </button>
    </header>
  );
}
