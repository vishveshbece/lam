// App.jsx
import React, { useState, useEffect, useRef } from "react";
import { BrowserRouter, Routes, Route, Link, useNavigate, useLocation } from "react-router-dom";

/* ---------- UUIDs (final) ---------- */
const BASE_SERVICE = "0000aaaa-0000-1000-8000-00805f9b34fb";
const BASE_CHAR    = "0000aaab-0000-1000-8000-00805f9b34fb";
const ARM_SERVICE     = "0000bbbb-0000-1000-8000-00805f9b34fb";
const ARM_ANGLES_CHAR = "0000bbbc-0000-1000-8000-00805f9b34fb";

/* ---------- Limits ---------- */
const ARM_LIMITS = [
  { min: 0,   max: 180, label: "Base Rot" }, // M1
  { min: 100, max: 180, label: "Shoulder" }, // M2
  { min: 0,   max: 90,  label: "Elbow" },    // M3
  { min: 0,   max: 180, label: "Wrist V" },  // M4
  { min: 0,   max: 180, label: "Wrist R" },  // M5
];
const DEFAULT_ARM_ANGLES = [90, 120, 45, 90, 90];

/* ---------- ICONS (SVG) ---------- */
const Icons = {
  Arm: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="5" r="3"/><line x1="12" y1="8" x2="12" y2="13"/><line x1="12" y1="13" x2="7" y2="18"/><line x1="12" y1="13" x2="17" y2="18"/></svg>,
  Base: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 12h-8"/><path d="M12 8v8"/></svg>,
  Link: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>,
  Up: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>,
  Down: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>,
  Left: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>,
  Right: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>,
};

/* ---------- BLE hook ---------- */
function useBleState() {
  const [armCharAngles, setArmCharAngles] = useState(null);
  const [baseChar, setBaseChar] = useState(null);

  const connectArm = async () => {
    try {
      const device = await navigator.bluetooth.requestDevice({ 
        filters: [{ services: [ARM_SERVICE] }] 
      });
      const server = await device.gatt.connect();
      const svc = await server.getPrimaryService(ARM_SERVICE);
      const char = await svc.getCharacteristic(ARM_ANGLES_CHAR);
      setArmCharAngles(char);
      return char;
    } catch (e) {
      console.error("connectArm:", e);
      throw e;
    }
  };

  const connectBase = async () => {
    try {
      const device = await navigator.bluetooth.requestDevice({ 
        filters: [{ services: [BASE_SERVICE] }] 
      });
      const server = await device.gatt.connect();
      const svc = await server.getPrimaryService(BASE_SERVICE);
      const char = await svc.getCharacteristic(BASE_CHAR);
      setBaseChar(char);
      return char;
    } catch (e) {
      console.error("connectBase:", e);
      throw e;
    }
  };

  return { armCharAngles, baseChar, connectArm, connectBase };
}

/* ---------- COMPONENTS ---------- */

function StatusBadge({ connected, label }) {
  return (
    <div className={`status-badge ${connected ? 'active' : ''}`}>
      <div className="dot"></div>
      <span className="badge-label">{label}</span>
    </div>
  );
}

function ConnectionPage({ ble }) {
  const navigate = useNavigate();
  
  const handleConnect = async (type) => {
    try {
      if(type === 'arm') await ble.connectArm();
      if(type === 'base') await ble.connectBase();
    } catch (e) {
      alert(`${type.toUpperCase()} connection failed or cancelled`);
    }
  };

  return (
    <div className="page-container fade-in">
      <div className="hero-section">
        <h1 className="glitch-text" data-text="SYSTEM LINK">SYSTEM LINK</h1>
        <p className="subtitle">Initialize Bluetooth Protocols</p>
      </div>

      <div className="card-grid">
        {/* Arm Card */}
        <div className={`tech-card ${ble.armCharAngles ? 'connected' : ''}`}>
          <div className="card-header">
            <Icons.Arm />
            <h3>Manipulator Arm</h3>
          </div>
          <div className="card-body">
            <p>5-Axis control for precision handling.</p>
            <div className="status-indicator">
              Status: <span className={ble.armCharAngles ? "text-success" : "text-dim"}>
                {ble.armCharAngles ? "ONLINE" : "OFFLINE"}
              </span>
            </div>
          </div>
          <div className="card-actions">
            {!ble.armCharAngles ? (
              <button className="btn btn-primary" onClick={() => handleConnect('arm')}>
                <Icons.Link /> Connect
              </button>
            ) : (
               <button className="btn btn-secondary" onClick={() => navigate("/arm")}>
                Open Controls &rarr;
              </button>
            )}
          </div>
        </div>

        {/* Base Card */}
        <div className={`tech-card ${ble.baseChar ? 'connected' : ''}`}>
          <div className="card-header">
            <Icons.Base />
            <h3>Rover Base</h3>
          </div>
          <div className="card-body">
            <p>Omnidirectional movement & rotation.</p>
            <div className="status-indicator">
              Status: <span className={ble.baseChar ? "text-success" : "text-dim"}>
                {ble.baseChar ? "ONLINE" : "OFFLINE"}
              </span>
            </div>
          </div>
          <div className="card-actions">
            {!ble.baseChar ? (
              <button className="btn btn-primary" onClick={() => handleConnect('base')}>
                <Icons.Link /> Connect
              </button>
            ) : (
              <button className="btn btn-secondary" onClick={() => navigate("/base")}>
                Open Controls &rarr;
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ArmPage({ ble }) {
  const [angles, setAngles] = useState(DEFAULT_ARM_ANGLES.slice());

  const clamp = (val, idx) => {
    const l = ARM_LIMITS[idx];
    let v = Math.round(Number(val));
    if (v < l.min) v = l.min;
    if (v > l.max) v = l.max;
    return v;
  };

  const sendArmAngles = async (arr) => {
    if (!ble.armCharAngles) return;
    try {
      const u8 = new Uint8Array(5);
      for (let i = 0; i < 5; ++i) u8[i] = clamp(arr[i], i);
      await ble.armCharAngles.writeValue(u8);
    } catch (e) {
      console.error("sendArmAngles:", e);
    }
  };

  const onAngleChange = (index, value) => {
    const v = clamp(value, index);
    const next = angles.slice();
    next[index] = v;
    setAngles(next);
    sendArmAngles(next);
  };

  // Sync on mount
  useEffect(() => { 
    if (ble.armCharAngles) sendArmAngles(angles); 
  }, [ble.armCharAngles]);

  return (
    <div className="page-container fade-in">
      <div className="header-row">
        <h2>Manual Override</h2>
        {!ble.armCharAngles && <div className="badge-error">DISCONNECTED</div>}
      </div>

      <div className="sliders-container">
        {angles.map((a, i) => {
          const { min, max, label } = ARM_LIMITS[i];
          const percent = ((a - min) / (max - min)) * 100;
          
          return (
            <div key={i} className="slider-card">
              <div className="slider-info">
                <span className="slider-label">M{i + 1} // {label}</span>
                <span className="slider-value">{a}°</span>
              </div>
              <div className="range-wrapper">
                <input 
                  type="range" 
                  min={min} 
                  max={max} 
                  value={a} 
                  onChange={(e) => onAngleChange(i, e.target.value)} 
                  className="cyber-range"
                  style={{ background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${percent}%, #334155 ${percent}%, #334155 100%)` }}
                />
              </div>
              <div className="slider-meta">
                <span>{min}°</span>
                <span>{max}°</span>
              </div>
            </div>
          );
        })}
      </div>
      
      {!ble.armCharAngles && (
        <div className="overlay-warning">
          <p>Connection Lost</p>
          <button className="btn btn-primary" onClick={() => ble.connectArm()}>Reconnect</button>
        </div>
      )}
    </div>
  );
}

function BasePage({ ble }) {
  // Command throttling
  const lastSentCmdRef = useRef(null);
  const lastSendTimeRef = useRef(0);
  const [activeButton, setActiveButton] = useState(null);

  const sendCmd = async (cmd) => {
    // Don't send the same command repeatedly
    if (lastSentCmdRef.current === cmd) return;
    
    // Throttle sending frequency
    const now = Date.now();
    if (now - lastSendTimeRef.current < 50) return;
    
    if (!ble.baseChar) return;
    
    try {
      await ble.baseChar.writeValue(new Uint8Array([cmd]));
      lastSentCmdRef.current = cmd;
      lastSendTimeRef.current = now;
    } catch (e) { 
      console.error("Send command error:", e);
      lastSentCmdRef.current = null;
    }
  };

  const handleButtonPress = (cmd, buttonName) => {
    setActiveButton(buttonName);
    sendCmd(cmd);
  };

  const handleButtonRelease = () => {
    setActiveButton(null);
    sendCmd(0); // Stop command
  };

  // Add keyboard controls
  useEffect(() => {
    const handleKeyDown = (e) => {
      switch(e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          e.preventDefault();
          handleButtonPress(1, 'forward');
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          e.preventDefault();
          handleButtonPress(2, 'backward');
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          e.preventDefault();
          handleButtonPress(3, 'left');
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          e.preventDefault();
          handleButtonPress(4, 'right');
          break;
        case 'q':
        case 'Q':
          e.preventDefault();
          handleButtonPress(5, 'rotateLeft');
          break;
        case 'e':
        case 'E':
          e.preventDefault();
          handleButtonPress(6, 'rotateRight');
          break;
      }
    };

    const handleKeyUp = (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'W', 's', 'S', 'a', 'A', 'd', 'D', 'q', 'Q', 'e', 'E'].includes(e.key)) {
        e.preventDefault();
        handleButtonRelease();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  return (
    <div className="page-container fade-in">
      <div className="header-row">
        <h2>Teleoperation</h2>
        {!ble.baseChar && <div className="badge-error">DISCONNECTED</div>}
      </div>

      <div className="button-controls-layout">
        {/* Movement Controls */}
        <div className="control-section">
          <h3>Movement</h3>
          <div className="dpad-container">
            <div className="dpad-row">
              <button 
                className={`control-btn direction-btn up-btn ${activeButton === 'forward' ? 'active' : ''}`}
                onPointerDown={() => handleButtonPress(1, 'forward')}
                onPointerUp={handleButtonRelease}
                onPointerLeave={handleButtonRelease}
              >
                <Icons.Up />
              </button>
            </div>
            <div className="dpad-row">
              <button 
                className={`control-btn direction-btn left-btn ${activeButton === 'left' ? 'active' : ''}`}
                onPointerDown={() => handleButtonPress(3, 'left')}
                onPointerUp={handleButtonRelease}
                onPointerLeave={handleButtonRelease}
              >
                <Icons.Left />
              </button>
              <div className="center-spacer"></div>
              <button 
                className={`control-btn direction-btn right-btn ${activeButton === 'right' ? 'active' : ''}`}
                onPointerDown={() => handleButtonPress(4, 'right')}
                onPointerUp={handleButtonRelease}
                onPointerLeave={handleButtonRelease}
              >
                <Icons.Right />
              </button>
            </div>
            <div className="dpad-row">
              <button 
                className={`control-btn direction-btn down-btn ${activeButton === 'backward' ? 'active' : ''}`}
                onPointerDown={() => handleButtonPress(2, 'backward')}
                onPointerUp={handleButtonRelease}
                onPointerLeave={handleButtonRelease}
              >
                <Icons.Down />
              </button>
            </div>
          </div>
          <div className="instruction">Click or use Arrow Keys/WASD</div>
        </div>

        {/* Rotation Controls */}
        <div className="control-section">
          <h3>Rotation</h3>
          <div className="rotate-group">
            <button 
              className={`control-btn rotate-btn ${activeButton === 'rotateLeft' ? 'active' : ''}`}
              onPointerDown={() => handleButtonPress(5, 'rotateLeft')}
              onPointerUp={handleButtonRelease}
              onPointerLeave={handleButtonRelease}
            >
              ↺
            </button>
            <button 
              className={`control-btn rotate-btn ${activeButton === 'rotateRight' ? 'active' : ''}`}
              onPointerDown={() => handleButtonPress(6, 'rotateRight')}
              onPointerUp={handleButtonRelease}
              onPointerLeave={handleButtonRelease}
            >
              ↻
            </button>
          </div>
          <div className="instruction">Hold Q/E keys</div>
        </div>

        {/* Stop Button */}
        <div className="control-section">
          <h3>Emergency Stop</h3>
          <button 
            className="control-btn stop-btn"
            onClick={() => {
              setActiveButton(null);
              sendCmd(0);
            }}
          >
            STOP
          </button>
          <div className="instruction">Spacebar or click</div>
        </div>
      </div>

      {/* Keyboard Shortcuts Help */}
      <div className="keyboard-help">
        <h4>Keyboard Shortcuts:</h4>
        <div className="shortcut-grid">
          <div className="shortcut-item">
            <span className="key">W / ↑</span>
            <span className="action">Forward</span>
          </div>
          <div className="shortcut-item">
            <span className="key">S / ↓</span>
            <span className="action">Backward</span>
          </div>
          <div className="shortcut-item">
            <span className="key">A / ←</span>
            <span className="action">Left</span>
          </div>
          <div className="shortcut-item">
            <span className="key">D / →</span>
            <span className="action">Right</span>
          </div>
          <div className="shortcut-item">
            <span className="key">Q</span>
            <span className="action">Rotate Left</span>
          </div>
          <div className="shortcut-item">
            <span className="key">E</span>
            <span className="action">Rotate Right</span>
          </div>
          <div className="shortcut-item">
            <span className="key">Space</span>
            <span className="action">Stop</span>
          </div>
        </div>
      </div>
      
      {!ble.baseChar && (
        <div className="overlay-warning">
          <p>Uplink Lost</p>
          <button className="btn btn-primary" onClick={() => ble.connectBase()}>Reconnect</button>
        </div>
      )}
    </div>
  );
}

/* ---------- MAIN LAYOUT ---------- */
function Layout({ ble, children }) {
  const location = useLocation();
  
  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">
          <div className="brand-icon">🤖</div>
          <span className="brand-text">ROBO<span className="text-primary">CORE</span></span>
        </div>
        <nav className="nav-links">
          <Link to="/" className={location.pathname === '/' ? 'active' : ''}>HUB</Link>
          <Link to="/arm" className={location.pathname === '/arm' ? 'active' : ''}>ARM</Link>
          <Link to="/base" className={location.pathname === '/base' ? 'active' : ''}>BASE</Link>
        </nav>
        <div className="connection-status">
          <StatusBadge connected={ble.armCharAngles} label="ARM" />
          <StatusBadge connected={ble.baseChar} label="BASE" />
        </div>
      </header>
      <main className="main-content">
        {children}
      </main>
      
      <style>{`
        :root {
          --bg: #0f172a;
          --surface: #1e293b;
          --surface-light: #334155;
          --primary: #3b82f6;
          --primary-glow: rgba(59, 130, 246, 0.5);
          --accent: #06b6d4;
          --success: #10b981;
          --danger: #ef4444;
          --text: #f8fafc;
          --text-dim: #94a3b8;
          --font-main: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        }

        * { box-sizing: border-box; }
        
        body {
          margin: 0;
          background-color: var(--bg);
          color: var(--text);
          font-family: var(--font-main);
          overflow-x: hidden;
          -webkit-tap-highlight-color: transparent;
        }

        .app-shell { display: flex; flex-direction: column; min-height: 100vh; background-image: radial-gradient(circle at 50% 0%, #1e293b 0%, #0f172a 70%); }
        
        .app-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 24px; height: 70px;
          background: rgba(15, 23, 42, 0.85);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid rgba(255,255,255,0.05);
          position: sticky; top: 0; z-index: 50;
        }
        
        .main-content { flex: 1; padding: 20px; max-width: 1000px; margin: 0 auto; width: 100%; position: relative; }
        
        h1, h2, h3, h4 { margin: 0; letter-spacing: -0.02em; }
        .glitch-text { font-size: 2.5rem; font-weight: 800; background: linear-gradient(to right, #fff, #94a3b8); -webkit-background-clip: text; color: transparent; }
        .subtitle { color: var(--text-dim); margin-top: 8px; font-size: 1.1rem; }
        .text-primary { color: var(--primary); }
        .text-success { color: var(--success); text-shadow: 0 0 10px rgba(16,185,129,0.4); }
        .text-dim { color: var(--text-dim); }

        .brand { display: flex; align-items: center; gap: 10px; font-weight: 700; font-size: 1.2rem; }
        .nav-links { display: flex; gap: 10px; background: rgba(0,0,0,0.3); padding: 4px; border-radius: 20px; }
        .nav-links a {
          text-decoration: none; color: var(--text-dim); font-weight: 600; font-size: 0.9rem;
          padding: 8px 16px; border-radius: 16px; transition: all 0.2s;
        }
        .nav-links a.active { background: var(--surface-light); color: #fff; box-shadow: 0 2px 10px rgba(0,0,0,0.2); }
        
        .connection-status { display: flex; gap: 8px; }

        .status-badge { display: flex; align-items: center; gap: 6px; font-size: 0.75rem; font-weight: 700; background: var(--surface); padding: 6px 12px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05); }
        .status-badge .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--danger); transition: 0.3s; }
        .status-badge.active { border-color: rgba(16,185,129,0.3); background: rgba(16,185,129,0.1); }
        .status-badge.active .dot { background: var(--success); box-shadow: 0 0 8px var(--success); }

        .card-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; margin-top: 40px; }
        .tech-card {
          background: var(--surface); border-radius: 16px; padding: 24px;
          border: 1px solid rgba(255,255,255,0.05); position: relative; overflow: hidden;
          transition: transform 0.3s, box-shadow 0.3s;
        }
        .tech-card:hover { transform: translateY(-4px); box-shadow: 0 10px 30px rgba(0,0,0,0.3); }
        .tech-card.connected { border-color: var(--primary); box-shadow: 0 0 20px rgba(59,130,246,0.1); }
        .card-header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; color: var(--primary); }
        .card-header h3 { color: #fff; font-size: 1.2rem; }
        .card-body p { color: var(--text-dim); font-size: 0.9rem; line-height: 1.5; margin-bottom: 20px; }
        .status-indicator { font-size: 0.85rem; font-weight: 600; background: rgba(0,0,0,0.2); padding: 8px; border-radius: 6px; display: inline-block; }

        .btn { border: none; padding: 14px 24px; border-radius: 8px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: 0.2s; font-size: 1rem; }
        .btn-primary { background: var(--primary); color: #fff; box-shadow: 0 4px 12px rgba(59,130,246,0.3); }
        .btn-primary:active { transform: translateY(1px); }
        .btn-secondary { background: var(--surface-light); color: #fff; }

        /* Button Controls Styles */
        .button-controls-layout {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 30px;
          margin-top: 30px;
        }

        .control-section {
          background: var(--surface);
          padding: 24px;
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,0.05);
          text-align: center;
        }

        .control-section h3 {
          margin-bottom: 20px;
          color: var(--text-dim);
          font-size: 1rem;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .control-btn {
          border: none;
          background: var(--surface-light);
          color: var(--text);
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          -webkit-user-select: none;
          user-select: none;
        }

        .control-btn.active {
          background: var(--primary);
          color: white;
          box-shadow: 0 0 20px var(--primary-glow);
          transform: scale(0.95);
        }

        .control-btn:active {
          transform: scale(0.95);
        }

        /* D-Pad Styles */
        .dpad-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }

        .dpad-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .direction-btn {
          width: 80px;
          height: 80px;
          border-radius: 12px;
          font-size: 1.5rem;
        }

        .up-btn { border-radius: 12px 12px 4px 4px; }
        .down-btn { border-radius: 4px 4px 12px 12px; }
        .left-btn { border-radius: 12px 4px 4px 12px; }
        .right-btn { border-radius: 4px 12px 12px 4px; }

        .center-spacer {
          width: 80px;
          height: 80px;
        }

        /* Rotation Buttons */
        .rotate-group {
          display: flex;
          gap: 20px;
          justify-content: center;
        }

        .rotate-btn {
          width: 100px;
          height: 100px;
          border-radius: 50%;
          font-size: 2rem;
          font-weight: bold;
        }

        /* Stop Button */
        .stop-btn {
          width: 120px;
          height: 120px;
          border-radius: 50%;
          background: var(--danger);
          color: white;
          font-size: 1.2rem;
          font-weight: bold;
          margin: 0 auto;
        }

        .stop-btn:hover {
          background: #dc2626;
          box-shadow: 0 0 20px rgba(239, 68, 68, 0.4);
        }

        /* Keyboard Help */
        .keyboard-help {
          margin-top: 40px;
          background: var(--surface);
          padding: 20px;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.05);
        }

        .keyboard-help h4 {
          margin-bottom: 16px;
          color: var(--text-dim);
          text-align: center;
        }

        .shortcut-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 12px;
        }

        .shortcut-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 12px;
          background: rgba(0,0,0,0.2);
          border-radius: 6px;
        }

        .key {
          background: var(--surface-light);
          padding: 4px 8px;
          border-radius: 4px;
          font-family: monospace;
          font-size: 0.8rem;
          font-weight: 600;
        }

        .action {
          color: var(--text-dim);
          font-size: 0.9rem;
        }

        .instruction {
          font-size: 0.8rem;
          color: var(--text-dim);
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-top: 12px;
        }

        .sliders-container { margin-top: 30px; display: grid; gap: 16px; }
        .slider-card { background: var(--surface); padding: 16px 20px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05); }
        .slider-info { display: flex; justify-content: space-between; margin-bottom: 12px; font-weight: 600; font-size: 0.9rem; }
        .slider-value { color: var(--primary); font-family: monospace; font-size: 1.1rem; }
        .range-wrapper { height: 30px; display: flex; align-items: center; }
        .cyber-range {
          -webkit-appearance: none; width: 100%; height: 8px; border-radius: 4px; outline: none; transition: 0.2s;
        }
        .cyber-range::-webkit-slider-thumb {
          -webkit-appearance: none; appearance: none; width: 24px; height: 24px; border-radius: 50%; 
          background: #fff; border: 2px solid var(--primary); cursor: pointer; box-shadow: 0 0 10px var(--primary); transition: 0.2s;
        }
        .slider-meta { display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--text-dim); margin-top: 8px; }

        .fade-in { animation: fadeIn 0.4s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .overlay-warning {
          position: absolute; inset: 0; background: rgba(15,23,42,0.85); backdrop-filter: blur(4px);
          display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 10;
        }
        .overlay-warning p { font-size: 1.5rem; font-weight: 700; margin-bottom: 20px; color: var(--danger); }
        .badge-error { background: var(--danger); color: white; padding: 4px 8px; border-radius: 4px; font-size: 0.7rem; font-weight: 700; margin-left: 10px; }
        .header-row { display: flex; align-items: center; margin-bottom: 20px; }

        @media (max-width: 768px) {
          .app-header { padding: 0 16px; height: 60px; }
          .brand-text { display: none; }
          .brand-icon { font-size: 1.5rem; }
          
          .nav-links { gap: 4px; }
          .nav-links a { font-size: 0.8rem; padding: 6px 12px; }
          
          .status-badge .badge-label { display: none; }
          .status-badge { padding: 6px; border-radius: 50%; }
          .status-badge .dot { width: 10px; height: 10px; }
          
          .glitch-text { font-size: 1.8rem; }
          .card-grid { grid-template-columns: 1fr; margin-top: 20px; }
          
          .button-controls-layout {
            grid-template-columns: 1fr;
            gap: 20px;
          }
          
          .direction-btn {
            width: 70px;
            height: 70px;
          }
          
          .center-spacer {
            width: 70px;
            height: 70px;
          }
          
          .rotate-btn {
            width: 80px;
            height: 80px;
            font-size: 1.5rem;
          }
          
          .stop-btn {
            width: 100px;
            height: 100px;
            font-size: 1rem;
          }
          
          .shortcut-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          
          .tech-card { padding: 20px; }
        }
        
        @media (max-width: 380px) {
          .nav-links a { padding: 6px 8px; font-size: 0.75rem; }
          
          .direction-btn {
            width: 60px;
            height: 60px;
          }
          
          .center-spacer {
            width: 60px;
            height: 60px;
          }
        }
      `}</style>
    </div>
  );
}

/* ---------- App ---------- */
export default function App() {
  const ble = useBleState();
  return (
    <BrowserRouter>
      <Layout ble={ble}>
        <Routes>
          <Route path="/" element={<ConnectionPage ble={ble} />} />
          <Route path="/arm" element={<ArmPage ble={ble} />} />
          <Route path="/base" element={<BasePage ble={ble} />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}